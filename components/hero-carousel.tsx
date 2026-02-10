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

    </div>
  );
}
