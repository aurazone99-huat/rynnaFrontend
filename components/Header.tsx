import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import LoginButton from './LoginButton';
import AuthModal from './AuthModal';
import { logout, UserResponse } from '../services/auth';

type TabType = 'home' | 'preorder' | 'orders';

interface HeaderProps {
  activeTab:    TabType;
  onTabChange:  (tab: TabType) => void;
  user:         UserResponse | null;
  onUserChange: (user: UserResponse | null) => void;
}

const DIGITAL_URL = 'https://ganknow.com/rynna0809?tab=shop';

const DigitalLink: React.FC<{ className?: string }> = ({ className = '' }) => (
  <a
    href={DIGITAL_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`clay-button px-6 py-2.5 bg-white outline-none flex items-center gap-2 ${className}`}
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
    <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Digital</span>
  </a>
);

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, user, onUserChange }) => {
  const logoPath = 'https://res.cloudinary.com/dityornjc/image/upload/v1767108617/icon_jkc3ac.jpg';

  const tabs: { id: TabType; label: string; authRequired?: boolean }[] = [
    { id: 'home',     label: 'Home' },
    { id: 'preorder', label: 'Merchandise' },
    { id: 'orders',   label: 'Orders', authRequired: true },
  ];

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mobile: auth modal + user dropdown
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu]   = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close drawer on outside click / ESC
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleTabChange = (tab: TabType) => {
    onTabChange(tab);
    setDrawerOpen(false);
  };

  const handleMobileLogout = async () => {
    await logout();
    onUserChange(null);
    setShowUserMenu(false);
  };

  const mobileUserInitial = user ? (user.first_name?.[0] || user.username[0]).toUpperCase() : null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-xl transition-all duration-300 border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">

          {/* ── Desktop layout ───────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer shrink-0">
              <div className="clay-puffy-sm p-1.5 bg-white">
                <img src={logoPath} alt="Rynna Logo" className="w-8 h-8 rounded-full object-cover" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-purple-900/80">Rynna</span>
            </div>

            {/* Tabs */}
            <nav className="flex items-center gap-2">
              {tabs
                .filter(tab => !tab.authRequired || user)
                .map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`clay-button px-6 py-2.5 text-xs font-black uppercase tracking-widest outline-none transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05)]'
                        : 'bg-white text-purple-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </nav>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <DigitalLink />
            <LoginButton user={user} onUserChange={onUserChange} />
          </div>

          {/* ── Mobile layout ────────────────────────────────────── */}
          <div className="flex md:hidden items-center justify-between w-full">

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="clay-button w-10 h-10 flex items-center justify-center text-purple-500 outline-none shrink-0"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            {/* Centered logo */}
            <div className="flex items-center space-x-2 cursor-pointer">
              <img src={logoPath} alt="Rynna Logo" className="w-7 h-7 rounded-full object-cover" />
              <span className="text-xl font-black tracking-tighter text-purple-900/80">Rynna</span>
            </div>

            {/* User icon (right) */}
            {user ? (
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="clay-button w-10 h-10 flex items-center justify-center bg-white outline-none"
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-sm select-none">
                    {mobileUserInitial}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 clay-puffy-sm bg-white p-4 min-w-[180px] z-50">
                    <p className="text-[11px] font-black text-purple-900/80 mb-0.5 truncate">
                      {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
                    </p>
                    <p className="text-[10px] text-zinc-400 mb-4 truncate">{user.email}</p>
                    <button
                      onClick={handleMobileLogout}
                      className="clay-button w-full px-4 py-2 text-[10px] font-black text-red-400 uppercase tracking-widest outline-none"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="clay-button w-10 h-10 flex items-center justify-center bg-white outline-none shrink-0"
                aria-label="Sign in"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
              drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className={`fixed top-0 left-0 h-full w-72 z-[70] bg-white/90 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
              drawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 h-20 border-b border-zinc-100/60 shrink-0">
              <div className="flex items-center gap-2">
                <div className="clay-puffy-sm p-1 bg-white">
                  <img src={logoPath} alt="Rynna Logo" className="w-7 h-7 rounded-full object-cover" />
                </div>
                <span className="text-xl font-black tracking-tighter text-purple-900/80">Rynna</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="clay-button w-9 h-9 flex items-center justify-center text-zinc-400 outline-none"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 1l10 10M11 1L1 11"/>
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-2 px-4 py-6 flex-1">
              {tabs
                .filter(tab => !tab.authRequired || user)
                .map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`clay-button w-full px-5 py-4 text-sm font-black uppercase tracking-widest text-left outline-none transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05)]'
                        : 'bg-white/60 text-purple-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}

              {/* Digital link inside drawer */}
              <a
                href={DIGITAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDrawerOpen(false)}
                className="clay-button w-full px-5 py-4 text-sm font-black uppercase tracking-widest text-left outline-none bg-white/60 text-purple-400 flex items-center gap-3"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                Digital
              </a>
            </nav>
          </div>
        </>,
        document.body,
      )}

      {/* Mobile auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => { onUserChange(u); setShowAuthModal(false); }}
        />
      )}
    </>
  );
};

export default Header;
