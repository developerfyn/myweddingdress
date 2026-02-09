'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowLeft, Heart, Download, Share2, Sparkles } from 'lucide-react';
import { Dress } from '@/lib/dress-data';
import { cn } from '@/lib/utils';

interface TryOnViewProps {
  isOpen: boolean;
  onClose: () => void;
  dress: Dress | null;
  userPhotos: string[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isSubscribed: boolean;
  onShowPaywall: () => void;
}

const angles = ['Front', 'Side', 'Back'];

export function TryOnView({
  isOpen,
  onClose,
  dress,
  userPhotos,
  isFavorite,
  onToggleFavorite,
  isSubscribed,
  onShowPaywall,
}: TryOnViewProps) {
  const [selectedAngle, setSelectedAngle] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, dress]);

  if (!isOpen || !dress) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        <h2 className="font-serif text-lg text-white">{dress.name}</h2>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart 
              className={cn(
                'w-6 h-6 transition-colors',
                isFavorite ? 'fill-primary text-primary' : 'text-white'
              )} 
            />
          </button>
          <button
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Download"
          >
            <Download className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Try-On Image */}
        <div className="flex-1 relative">
          {isLoading ? (
            <LoadingState />
          ) : (
            <Image
              src="/tryon-result.jpg"
              alt={`Try on ${dress.name}`}
              fill
              className="object-contain"
            />
          )}
        </div>

        {/* Angle Selector */}
        <div className="flex justify-center gap-2 py-4 px-4">
          {angles.map((angle, index) => (
            <button
              key={angle}
              onClick={() => setSelectedAngle(index)}
              className={cn(
                'px-5 py-2 rounded-full text-sm font-sans font-medium transition-all',
                selectedAngle === index
                  ? 'bg-white text-background'
                  : 'bg-secondary text-muted-foreground hover:text-white'
              )}
            >
              {angle}
            </button>
          ))}
        </div>

        {/* User Photos Carousel */}
        {userPhotos.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-muted-foreground text-xs mb-2">Your photos</p>
            <div className="flex gap-2 overflow-x-auto">
              {userPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhoto(index)}
                  className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all',
                    selectedPhoto === index
                      ? 'border-primary'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <Image
                    src={photo || "/placeholder.svg"}
                    alt={`Photo ${index + 1}`}
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex gap-3 px-4 pb-8">
          <button
            className={cn(
              'flex-1 py-4 rounded-xl font-sans font-medium',
              'bg-secondary text-white',
              'flex items-center justify-center gap-2',
              'active:scale-[0.98] transition-transform'
            )}
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
          <button
            className={cn(
              'flex-1 py-4 rounded-xl font-sans font-medium',
              'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
              'flex items-center justify-center gap-2',
              'active:scale-[0.98] transition-transform'
            )}
          >
            <Download className="w-5 h-5" />
            Save to Photos
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background">
      {/* Shimmer Silhouette */}
      <div className="relative w-48 h-80 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-card animate-pulse" />
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          style={{
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>
      
      {/* Loading Text */}
      <div className="mt-8 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        <span className="text-white font-sans animate-pulse">
          Creating your look
          <span className="inline-block animate-bounce">.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
          <span className="inline-block animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
        </span>
      </div>
      
      {/* Floating Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
