import React, { useEffect, useState } from 'react';
import { verifyEmail } from '../services/auth';

interface Props {
  token: string;
  onSuccess: () => void;
}

const VerifyEmailPage: React.FC<Props> = ({ token, onSuccess }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => {
          window.history.replaceState({}, '', '/');
          onSuccess();
        }, 2000);
      })
      .catch(() => setStatus('error'));
  }, [token, onSuccess]);

  return (
    <div className="min-h-screen bg-clay-mint flex items-center justify-center px-6">
      <div className="clay-puffy bg-white w-full max-w-sm p-10 text-center space-y-5">

        {status === 'loading' && (
          <>
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
            </div>
            <p className="text-sm font-black text-zinc-500 uppercase tracking-widest">Verifying…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-base font-black text-emerald-700 tracking-tight">Email verified!</p>
              <p className="text-xs text-zinc-400 font-medium mt-1">Redirecting you to login…</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
            </div>
            <div>
              <p className="text-base font-black text-red-500 tracking-tight">Invalid or expired link</p>
              <p className="text-xs text-zinc-400 font-medium mt-1">This verification link has already been used or has expired.</p>
            </div>
            <button
              onClick={() => { window.history.replaceState({}, '', '/'); onSuccess(); }}
              className="clay-button px-6 py-2.5 text-xs font-black uppercase tracking-widest text-purple-500 outline-none"
            >
              Go to homepage
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default VerifyEmailPage;
