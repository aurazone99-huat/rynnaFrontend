import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { login, register, googleSignIn, UserResponse } from '../services/auth';

type View = 'login' | 'register';

interface Props {
  onClose: () => void;
  onSuccess: (user: UserResponse) => void;
}

const inputClass =
  'w-full clay-inset px-4 py-3 text-sm text-zinc-700 bg-transparent outline-none placeholder:text-zinc-400 font-medium';

const AuthModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [view, setView] = useState<View>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchView = (v: View) => {
    setError(null);
    setView(v);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(identifier, password);
      onSuccess(user);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message === 'invalid_credentials'
          ? 'Incorrect email/username or password.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(
        username,
        email,
        regPassword,
        firstName.trim() || null,
        lastName.trim() || null,
      );
      const user = await login(email, regPassword);
      onSuccess(user);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message === 'conflict'
          ? 'Username or email is already taken.'
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError(null);
      try {
        const user = await googleSignIn(tokenResponse.access_token);
        onSuccess(user);
      } catch {
        setError('Google sign in failed. Please try again.');
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google sign in was cancelled.');
      setLoading(false);
    },
  });

  return createPortal(
    <>
      {/* Dark overlay — click to close */}
      <div
        className="fixed inset-0 z-[99] bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Flex wrapper for true centering */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
        {/* Card */}
        <div
          className="clay-puffy bg-white w-full max-w-sm p-8 relative pointer-events-auto"
          style={{ animation: 'pop-out 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 clay-button w-8 h-8 flex items-center justify-center text-zinc-400 outline-none"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>

        {/* Heading */}
        <div className="mb-7">
          <h2 className="text-2xl font-black tracking-tighter text-purple-900/80">
            {view === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[11px] text-zinc-400 font-medium mt-1 uppercase tracking-widest">
            {view === 'login' ? 'Sign in to continue' : 'Join the community'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <p className="text-xs text-red-500 font-semibold">{error}</p>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              ref={firstInputRef}
              type="text"
              placeholder="Email or username"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
            />

            <button
              type="submit"
              disabled={loading}
              className="clay-button w-full py-3 text-xs font-black uppercase tracking-widest text-purple-600 bg-purple-50 outline-none mt-1 disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="text-center text-[11px] text-zinc-400 pt-1">
              No account?{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="font-black text-purple-500 hover:text-purple-700 transition-colors"
              >
                Register
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="flex gap-3">
              <input
                ref={firstInputRef}
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                className={inputClass}
              />
            </div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              pattern="[a-zA-Z0-9_]{3,50}"
              title="3–50 characters, letters, numbers, underscores only"
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={regPassword}
              onChange={e => setRegPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputClass}
            />

            <button
              type="submit"
              disabled={loading}
              className="clay-button w-full py-3 text-xs font-black uppercase tracking-widest text-purple-600 bg-purple-50 outline-none mt-1 disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <p className="text-center text-[11px] text-zinc-400 pt-1">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="font-black text-purple-500 hover:text-purple-700 transition-colors"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>

        {/* Google login */}
        <button
          onClick={() => !loading && googleLogin()}
          disabled={loading}
          className="clay-button w-full py-3 flex items-center justify-center gap-3 bg-white outline-none disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">Continue with Google</span>
        </button>
        </div>
      </div>
    </>,
    document.body,
  );
};

export default AuthModal;
