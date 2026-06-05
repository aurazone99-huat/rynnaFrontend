
import React, { useState, useRef, useEffect, useCallback } from 'react';

/** 
 * --- Configuration Constants --- 
 */
const REVEAL_SUSTAIN_MS = 250; 
const REVEAL_FADE_MS = 400;    
const DEFAULT_RADIUS = 70;
const RADIUS_LIMITS = { MIN: 10, MAX: 400 };

const PARTICLE_COUNT = 45; 
const ASSET_MUTED = "https://res.cloudinary.com/dityornjc/image/upload/v1767416510/apple_c0xilk.jpg";
const ASSET_VIBRANT = "https://res.cloudinary.com/dityornjc/image/upload/v1767416504/wedding_bpwtba.jpg";

interface TrailPoint {
  x: number;
  y: number;
  radius: number;
  createdAt: number;
}

interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

const HeroSection: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [revealRadius, setRevealRadius] = useState(DEFAULT_RADIUS);
  const [isHovering, setIsHovering] = useState(false);
  const [showRadiusHint, setShowRadiusHint] = useState(false);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dustCanvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<DustParticle[]>([]);
  const requestRef = useRef<number | null>(null);
  const dustRequestRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = ASSET_MUTED;
    img.onload = () => { mutedImgRef.current = img; };
  }, []);

  useEffect(() => {
    const initParticles = () => {
      const p: DustParticle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        p.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.2 + 0.05,
        });
      }
      particlesRef.current = p;
    };
    initParticles();
  }, []);

  const animateDust = useCallback(() => {
    const canvas = dustCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

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

    dustRequestRef.current = requestAnimationFrame(animateDust);
  }, []);

  const updateReveal = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const mutedImg = mutedImgRef.current;

    if (!canvas || !ctx || !mutedImg) {
      requestRef.current = requestAnimationFrame(updateReveal);
      return;
    }

    const now = Date.now();
    trailRef.current = trailRef.current.filter(p => now - p.createdAt < (REVEAL_SUSTAIN_MS + REVEAL_FADE_MS));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.filter = 'grayscale(20%) brightness(55%) contrast(95%) saturate(60%) sepia(40%)';
    ctx.drawImage(mutedImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Pinkish colour wash — shallow overlay
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(255, 228, 230, 0.60)'; // #ffe4e6 — clay-pink
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    trailRef.current.forEach(point => {
      const age = now - point.createdAt;
      let opacity = 1;

      if (age > REVEAL_SUSTAIN_MS) {
        opacity = 1 - (age - REVEAL_SUSTAIN_MS) / REVEAL_FADE_MS;
      }

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.radius);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
      gradient.addColorStop(0.7, `rgba(0, 0, 0, ${opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestRef.current = requestAnimationFrame(updateReveal);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateReveal);
    dustRequestRef.current = requestAnimationFrame(animateDust);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (dustRequestRef.current) cancelAnimationFrame(dustRequestRef.current);
    };
  }, [updateReveal, animateDust]);

  const addTrailPoint = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setMousePos({ x, y });
    trailRef.current.push({ x, y, radius: revealRadius, createdAt: Date.now() });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isHovering) addTrailPoint(e.clientX, e.clientY);
  };

  const handleTouch = (e: React.TouchEvent) => {
    if (isInteractionLocked) {
      e.preventDefault(); 
      const touch = e.touches[0];
      addTrailPoint(touch.clientX, touch.clientY);
      if (!isHovering) setIsHovering(true);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.offsetWidth;
        canvasRef.current.height = containerRef.current.offsetHeight;
      }
      if (dustCanvasRef.current) {
        dustCanvasRef.current.width = window.innerWidth;
        dustCanvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.altKey && e.shiftKey) {
        e.preventDefault();
        setRevealRadius(prev => {
          const delta = e.deltaY > 0 ? -15 : 15;
          return Math.max(RADIUS_LIMITS.MIN, Math.min(RADIUS_LIMITS.MAX, prev + delta));
        });
        setShowRadiusHint(true);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => setShowRadiusHint(false), 1200);
      }
    };
    const container = containerRef.current;
    container?.addEventListener('wheel', handleWheel, { passive: false });
    return () => container?.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="relative min-h-screen w-full pt-32 pb-40 flex flex-col items-center justify-center overflow-hidden">
      
      <canvas 
        ref={dustCanvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20"
      />

      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(244,114,182,0.1)_0%,transparent_80%)] z-0 pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl w-full px-4 md:px-6">
        
        <div className="flex items-center justify-center mb-12">
          <button 
            onClick={() => setIsInteractionLocked(!isInteractionLocked)}
            className={`w-14 h-14 flex items-center justify-center transition-all duration-500 transform active:scale-95 clay-button outline-none ${
              isInteractionLocked 
              ? 'bg-pink-100 text-pink-600 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.05)]' 
              : 'bg-white text-zinc-400'
            }`}
          >
            {isInteractionLocked ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
            )}
          </button>
        </div>

        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={() => !isInteractionLocked && setIsHovering(false)}
          className="relative w-full aspect-[3/4] max-w-sm md:max-w-md mx-auto clay-puffy overflow-hidden cursor-none bg-white group touch-none transition-all duration-1000"
        >
          <img 
            src={ASSET_VIBRANT} 
            alt="Main Piece" 
            className="absolute inset-0 w-full h-full object-cover z-0 scale-[1.05] group-hover:scale-100 transition-transform duration-[6000ms] ease-out"
          />
          
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

          <div 
            className="absolute z-30 pointer-events-none transition-opacity duration-500 hidden md:block"
            style={{
              left: mousePos.x,
              top: mousePos.y,
              transform: `translate(-50%, -50%)`,
              opacity: isHovering ? 1 : 0,
            }}
          >
             <div 
                className="border-4 border-white/40 rounded-full transition-all duration-500 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.5),inset_0_0_20px_rgba(255,255,255,0.2)]"
                style={{
                    width: `${revealRadius * 2.3}px`,
                    height: `${revealRadius * 2.3}px`,
                }}
             >
               <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
             </div>
          </div>

          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50 mix-blend-soft-light" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
