
import React from 'react';

const Footer: React.FC = () => {
  const logoPath = "https://res.cloudinary.com/dityornjc/image/upload/v1767108617/icon_jkc3ac.jpg";

  return (
    <footer className="bg-white py-8 relative border-t border-white/40">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-3">
        <div className="clay-puffy-sm p-1.5 bg-white">
          <img src={logoPath} alt="Rynna Logo" className="w-5 h-5 rounded-full object-cover" />
        </div>
        <span className="text-[11px] font-black tracking-[0.3em] text-zinc-400 uppercase">Rynna &copy; 2026</span>
      </div>
    </footer>
  );
};

export default Footer;
