'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

const heroImages = [
  { src: '/hero-bride.jpg', alt: 'Bride in elegant A-line wedding dress' },
  { src: '/dresses/aline-1.jpg', alt: 'Bride in classic A-line gown' },
  { src: '/dresses/aline-2.jpg', alt: 'Bride in romantic A-line dress' },
  { src: '/dresses/ballgown-1.jpg', alt: 'Bride in stunning ball gown' },
  { src: '/dresses/mermaid-1.jpg', alt: 'Bride in beautiful mermaid dress' },
  { src: '/dresses/sheath-1.jpg', alt: 'Bride in elegant sheath dress' },
  { src: '/dresses/boho-1.jpg', alt: 'Bride in bohemian wedding dress' },
  { src: '/dresses/tea-1.jpg', alt: 'Bride in charming tea length dress' },
  { src: '/tryon-result.jpg', alt: 'Bride in designer wedding gown' },
];

export function HeroCarousel() {
  const [rotation, setRotation] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const imageCount = heroImages.length;
  const anglePerImage = 360 / imageCount;
  const radius = 280; // Distance from center

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setRotation((prev) => prev - 0.3); // Slow continuous rotation
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div
      className="relative w-full h-[500px] flex items-center justify-center"
      style={{ perspective: '1200px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      ref={containerRef}
    >
      {/* Glassmorphism backdrop */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
      </div>

      {/* 3D Carousel */}
      <div
        className="relative w-[200px] h-[300px]"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: isHovered ? 'transform 0.5s ease-out' : 'none',
        }}
      >
        {heroImages.map((image, index) => {
          const angle = index * anglePerImage;
          return (
            <div
              key={index}
              className="absolute w-[200px] h-[300px] rounded-2xl overflow-hidden"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
              }}
            >
              {/* Glassmorphism card */}
              <div className="relative w-full h-full group">
                {/* Glass border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/10 to-white/30 p-[2px]">
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/20 backdrop-blur-md">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Glass overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />

                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-60" />
                  </div>
                </div>

                {/* Reflection/glow effect */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-50 -z-10" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Center focus glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-pink-500/30 to-purple-500/30 rounded-full blur-3xl" />
      </div>

      {/* Floating particles effect - using static positions to avoid hydration mismatch */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { top: '25%', left: '15%', duration: '2.5s' },
          { top: '45%', left: '85%', duration: '3.2s' },
          { top: '70%', left: '25%', duration: '2.8s' },
          { top: '35%', left: '65%', duration: '3.5s' },
          { top: '60%', left: '45%', duration: '2.3s' },
          { top: '20%', left: '75%', duration: '3.0s' },
        ].map((particle, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/30 animate-pulse"
            style={{
              top: particle.top,
              left: particle.left,
              animationDelay: `${i * 0.5}s`,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      {/* Interactive hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm text-white/70">
        Hover to pause
      </div>
    </div>
  );
}
