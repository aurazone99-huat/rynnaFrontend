
import React from 'react';

const Footer: React.FC = () => {
  const logoPath = "https://res.cloudinary.com/dityornjc/image/upload/v1767108617/icon_jkc3ac.jpg";

  return (
    <footer className="bg-white py-16 relative border-t border-white/40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center space-x-4">
          <div className="clay-puffy-sm p-1.5 bg-white">
            <img 
              src={logoPath} 
              alt="Rynna Logo" 
              className="w-6 h-6 rounded-full object-cover"
            />
          </div>
          <span className="text-[11px] font-black tracking-[0.3em] text-zinc-400 uppercase">Rynna Visuals &copy; 2026</span>
        </div>
        
        <div className="flex space-x-12 text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">
          <a href="#" className="hover:text-pink-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-purple-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Process</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
