
import React, { useEffect, useRef, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import GallerySection from './components/GallerySection';
import SocialSection from './components/SocialSection';
import Footer from './components/Footer';
import PreorderSection from './components/PreorderSection';
import OrdersSection from './components/OrdersSection';
import VerifyEmailPage from './components/VerifyEmailPage';
import { getMe, refreshSession, UserResponse } from './services/auth';

type TabType = 'home' | 'preorder' | 'orders';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [user, setUser] = useState<UserResponse | null>(null);
  const galleryCanvasRef = useRef<HTMLCanvasElement>(null);

  // Email verification token — present when user lands from the email link
  const [verifyToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('token'),
  );
  const [showingVerify, setShowingVerify] = useState(!!verifyToken);

  // Restore session on mount
  useEffect(() => {
    const ctrl = new AbortController();
    getMe(ctrl.signal).then(setUser).catch(() => {});
    return () => ctrl.abort();
  }, []);

  // If user logs out while on an auth-gated tab, fall back to Home.
  useEffect(() => {
    if (!user && activeTab === 'orders') handleTabChange('home');
  }, [user, activeTab]);

  // Refresh the session cookie every 20 minutes while the tab is open,
  // and immediately when the tab becomes visible again (user switched back).
  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      refreshSession().then(ok => { if (!ok) setUser(null); });
    };

    const interval = setInterval(refresh, 20 * 60 * 1000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);
  const particlesRef = useRef<DustParticle[]>([]);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = galleryCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initParticles = () => {
      const p: DustParticle[] = [];
      const particleCount = 70; 
      for (let i = 0; i < particleCount; i++) {
        p.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          size: Math.random() * 1.2 + 0.4,
          opacity: Math.random() * 0.25 + 0.05,
        });
      }
      particlesRef.current = p;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        initParticles();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (showingVerify && verifyToken) {
    return <VerifyEmailPage token={verifyToken} onSuccess={() => setShowingVerify(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] selection:bg-pink-200 select-none">
      <Header activeTab={activeTab} onTabChange={handleTabChange} user={user} onUserChange={setUser} />
      <main className="flex-grow">
        {activeTab === 'preorder' && (
          <PreorderSection user={user} onUserChange={setUser} />
        )}

        {activeTab === 'orders' && user && (
          <OrdersSection user={user} />
        )}

        {activeTab === 'home' && <>
        {/* Section 1: Hero */}
        <section id="hero" className="relative bg-clay-pink overflow-hidden">
          {/* Top Fade - Smooth Entry */}
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/40 to-transparent z-20 pointer-events-none" />
          
          <HeroSection />
          
          {/* Bottom Fade - Merging into Gallery */}
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-clay-lavender via-clay-lavender/40 to-transparent pointer-events-none z-20" />
        </section>

        {/* Section 2: Curated Moments Gallery */}
        <section id="gallery" className="py-32 bg-clay-lavender relative overflow-hidden">
          {/* Section-Specific Dust Particles */}
          <canvas 
            ref={galleryCanvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30"
          />
          
          {/* Symmetrical Internal Glows */}
          <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-clay-pink to-transparent z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-80 bg-gradient-to-t from-clay-mint to-transparent z-10 pointer-events-none" />
          
          {/* Central Radial Ambiance */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)] pointer-events-none z-0" />

          <div className="max-w-7xl mx-auto px-6 relative z-20">
            <div className="mb-20 text-center">
              <div className="inline-block px-6 py-2 bg-white/60 border-2 border-white/80 rounded-full mb-8 backdrop-blur-md shadow-sm">
                <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em]">Cinematic Portfolio</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter text-purple-900/80">Curated Moments</h2>
              <p className="text-purple-700/60 max-w-2xl text-lg md:text-xl leading-relaxed mx-auto font-medium">
                A collection of digital artifacts and visual stories. Each frame is a careful exploration of light, shadow, and character.
              </p>
            </div>
            <GallerySection />
          </div>
        </section>

        {/* Section 3: Social Connections */}
        <section id="connect" className="py-40 bg-clay-mint relative overflow-hidden">
          {/* Top Blend from Gallery */}
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-clay-lavender to-transparent pointer-events-none z-10" />
          
          {/* Center Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle,rgba(16,185,129,0.05)_0%,transparent_70%)] pointer-events-none" />
          
          <div className="relative z-20">
            <SocialSection />
          </div>

          {/* Bottom Blend to Footer */}
          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-white/40 via-white/20 to-transparent pointer-events-none z-10" />
        </section>
        </>}
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <AppContent />
  </GoogleOAuthProvider>
);

export default App;
