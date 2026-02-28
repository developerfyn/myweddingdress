'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

const heroImages = [
  { src: '/dresses/hero-bride.jpg', alt: 'Bride in elegant wedding dress' },
  { src: '/dresses/mermaid-1.jpg', alt: 'Bride in mermaid dress' },
  { src: '/dresses/tea-1.jpg', alt: 'Bride in tea length dress' },
  { src: '/dresses/tryon-result.jpg', alt: 'Bride in designer gown' },
  { src: '/dresses/Mermaid.png', alt: 'Mermaid silhouette dress' },
  { src: '/dresses/Sheath.png', alt: 'Sheath silhouette dress' },
  { src: '/dresses/tryon-ember-small.png', alt: 'Virtual try-on result' },
];

export function HeroCarousel() {
  const [rotation, setRotation] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; rotation: number } | null>(null);

  const imageCount = heroImages.length;
  const anglePerImage = 360 / imageCount;

  // Auto-rotate when not interacting
  useEffect(() => {
    if (isHovered || isTouching) return;

    const interval = setInterval(() => {
      setRotation((prev) => prev - 0.15);
    }, 30);

    return () => clearInterval(interval);
  }, [isHovered, isTouching]);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsTouching(true);
    touchStartRef.current = {
      x: e.touches[0].clientX,
      rotation: rotation,
    };
  }, [rotation]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    // Swipe sensitivity: 1px = 0.5 degrees
    const newRotation = touchStartRef.current.rotation + deltaX * 0.5;
    setRotation(newRotation);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    touchStartRef.current = null;
  }, []);

  return (
    <div
      className="relative w-full h-[350px] sm:h-[400px] md:h-[500px] flex items-center justify-center"
      style={{ perspective: '1200px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      {/* 3D Carousel - responsive sizing */}
      <div
        className="relative w-[100px] h-[150px] sm:w-[120px] sm:h-[180px] md:w-[140px] md:h-[210px]"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${rotation}deg)`,
          transition: isHovered ? 'transform 0.5s ease-out' : 'none',
        }}
      >
        {heroImages.map((image, index) => {
          const angle = index * anglePerImage;
          // Responsive radius: smaller on mobile
          const radiusClass = 'sm:translate-z-[220px] md:translate-z-[280px]';
          return (
            <div
              key={index}
              className="absolute w-[100px] h-[150px] sm:w-[120px] sm:h-[180px] md:w-[140px] md:h-[210px] rounded-2xl overflow-hidden"
              style={{
                transform: `rotateY(${angle}deg) translateZ(var(--carousel-radius, 500px))`,
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                // CSS custom property for responsive radius - larger for more images
                ['--carousel-radius' as string]: 'clamp(350px, 35vw + 150px, 500px)',
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
                      priority={index < 3}
                      loading={index < 3 ? 'eager' : 'lazy'}
                      sizes="(max-width: 640px) 140px, (max-width: 768px) 170px, 200px"
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

      {/* Swipe hint for mobile */}
      {/* <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground sm:hidden">
        Swipe to explore
      </div> */}
    </div>
  );
}
