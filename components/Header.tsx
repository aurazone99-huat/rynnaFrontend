import React from 'react';
import LoginButton from './LoginButton';
import { UserResponse } from '../services/auth';

type TabType = 'home' | 'preorder' | 'orders';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  user: UserResponse | null;
  onUserChange: (user: UserResponse | null) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, user, onUserChange }) => {
  const logoPath = 'https://res.cloudinary.com/dityornjc/image/upload/v1767108617/icon_jkc3ac.jpg';

  const tabs: { id: TabType; label: string; authRequired?: boolean }[] = [
    { id: 'home',     label: 'Home' },
    { id: 'preorder', label: 'Preorder' },
    { id: 'orders',   label: 'Orders', authRequired: true },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/40 backdrop-blur-xl transition-all duration-300 border-b border-white/40">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">

        {/* Left: Logo + Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="clay-puffy-sm p-1.5 bg-white">
              <img
                src={logoPath}
                alt="Rynna Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
            <span className="text-2xl font-black tracking-tighter text-purple-900/80">Rynna</span>
          </div>

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

        {/* Right: Login */}
        <LoginButton user={user} onUserChange={onUserChange} />
      </div>
    </header>
  );
};

export default Header;
