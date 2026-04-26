const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ADMIN_ID: string | null = import.meta.env.VITE_ADMIN_ID || null;

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  admin_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------ //
// Internal helpers                                                     //
// ------------------------------------------------------------------ //

function sanitizeUsername(email: string): string {
  return email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 46);
}

// Throws 'invalid_credentials' on 401, 'login_failed' on other errors.
async function backendLogin(identifier: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password, admin_id: ADMIN_ID }),
  });
  if (res.status === 401) throw new Error('invalid_credentials');
  if (!res.ok) throw new Error('login_failed');
  return res.json();
}

// Retries with suffixed usernames on 409 username conflicts.
async function createBackendUser(
  email: string,
  googleSub: string,
  firstName: string | null,
  lastName: string | null,
): Promise<void> {
  const base = sanitizeUsername(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username,
        email,
        password: googleSub,
        admin_id: ADMIN_ID,
        first_name: firstName,
        last_name: lastName,
      }),
    });
    if (res.ok) return;
    if (res.status !== 409) throw new Error('create_user_failed');
  }
  throw new Error('create_user_failed');
}

// ------------------------------------------------------------------ //
// Public API                                                           //
// ------------------------------------------------------------------ //

export async function login(identifier: string, password: string): Promise<UserResponse> {
  return backendLogin(identifier, password);
}

export async function register(
  username: string,
  email: string,
  password: string,
  firstName: string | null,
  lastName: string | null,
): Promise<void> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username,
      email,
      password,
      admin_id: ADMIN_ID,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  if (res.status === 409) throw new Error('conflict');
  if (!res.ok) throw new Error('register_failed');
}

// Google OAuth: fetch profile → try login → create if new → login.
// Uses Google sub (stable user ID) as the backend password so the
// same account is always resolved without storing any Google token.
export async function googleSignIn(accessToken: string): Promise<UserResponse> {
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) throw new Error('google_profile_failed');

  const { email, sub, given_name, family_name } = await profileRes.json() as {
    email: string;
    sub: string;
    given_name?: string;
    family_name?: string;
  };

  try {
    return await backendLogin(email, sub);
  } catch (err) {
    // Only proceed to account creation on 401 (user not found).
    // Any other error (network, server 5xx) should propagate.
    if (!(err instanceof Error) || err.message !== 'invalid_credentials') throw err;
  }

  await createBackendUser(email, sub, given_name ?? null, family_name ?? null);
  return backendLogin(email, sub);
}

// Extends the session by 30 minutes. Call this on page navigation
// to keep long-lived sessions alive.
export async function refreshSession(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/session`, {
    method: 'PATCH',
    credentials: 'include',
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
}

// Returns the current user from the active session cookie, or null if
// not authenticated / session expired.
export async function getMe(): Promise<UserResponse | null> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
  if (!res.ok) return null;
  return res.json();
}
