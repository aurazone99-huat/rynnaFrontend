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

// Throws 'invalid_credentials' on 401, 'unverified' on 403, 'login_failed' on other errors.
async function backendLogin(identifier: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ identifier, password, admin_id: ADMIN_ID }),
  });
  if (res.status === 401) throw new Error('invalid_credentials');
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    const detail: string = body.detail ?? '';
    if (detail.toLowerCase().includes('verify')) throw new Error('unverified');
  }
  if (!res.ok) throw new Error('login_failed');
  return res.json();
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

export async function googleSignIn(accessToken: string): Promise<UserResponse> {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, admin_id: ADMIN_ID ?? null }),
  });
  if (!res.ok) throw new Error('google_signin_failed');
  return res.json();
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
export async function getMe(signal?: AbortSignal): Promise<UserResponse | null> {
  const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include', signal });
  if (!res.ok) return null;
  return res.json();
}

export async function verifyEmail(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (res.status === 400) throw new Error('invalid_token');
  if (!res.ok) throw new Error('verify_failed');
}
