import React, { useState, useRef, useEffect } from 'react';
import AuthModal from './AuthModal';
import { logout, UserResponse } from '../services/auth';

interface Props {
  user: UserResponse | null;
  onUserChange: (user: UserResponse | null) => void;
}

const LoginButton: React.FC<Props> = ({ user, onUserChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    onUserChange(null);
    setShowDropdown(false);
  };

  const handleSuccess = (u: UserResponse) => {
    onUserChange(u);
    setShowModal(false);
  };

  if (user) {
    const initial = (user.first_name?.[0] || user.username[0]).toUpperCase();
    return (
      <>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="clay-button p-1.5 bg-white outline-none flex items-center gap-2 pr-4"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-sm select-none">
              {initial}
            </div>
            <span className="text-xs font-black text-purple-700/80 tracking-wide">
              {user.first_name || user.username}
            </span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 clay-puffy-sm bg-white p-4 min-w-[180px] z-50">
              <p className="text-[11px] font-black text-purple-900/80 mb-0.5 truncate">
                {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
              </p>
              <p className="text-[10px] text-zinc-400 mb-4 truncate">{user.email}</p>
              <button
                onClick={handleLogout}
                className="clay-button w-full px-4 py-2 text-[10px] font-black text-red-400 uppercase tracking-widest outline-none"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="clay-button px-6 py-2.5 bg-white outline-none flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Sign In</span>
      </button>

      {showModal && (
        <AuthModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
    </>
  );
};

export default LoginButton;
