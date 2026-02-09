'use client';

import Image from 'next/image';
import { Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Gown } from '@/lib/gowns';

interface GownCardProps {
  gown: Gown;
  isFavorite: boolean;
  onToggleFavorite: (gownId: string) => void;
  onAddToStudio: (gown: Gown) => void;
  onClick: (gown: Gown) => void;
  showIds?: boolean;
  showImageUrls?: boolean;
}

export function GownCard({
  gown,
  isFavorite,
  onToggleFavorite,
  onAddToStudio,
  onClick,
  showIds = false,
  showImageUrls = false,
}: GownCardProps) {
  return (
    <div
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card cursor-pointer"
      onClick={() => onClick(gown)}
    >
      {/* Image */}
      <Image
        src={gown.image_url || '/placeholder.svg'}
        alt={gown.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(gown.id);
        }}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-colors',
            isFavorite ? 'fill-primary text-primary' : 'text-white'
          )}
        />
      </button>

      {/* Debug: Gown ID Badge */}
      {showIds && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-orange-500 text-white text-xs font-mono font-bold z-10">
          #{gown.id.slice(0, 8)}
        </div>
      )}

      {/* Debug: Image URL */}
      {showImageUrls && (
        <div className="absolute top-12 left-2 right-2 px-2 py-1 rounded bg-black/80 text-green-400 text-[10px] font-mono truncate z-10">
          {gown.image_url}
        </div>
      )}

      {/* Info & Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="font-serif text-xl text-white drop-shadow-lg mb-1">
          {gown.name}
        </p>
        <p className="text-white/70 text-sm">
          {gown.neckline?.name || 'Classic'}
        </p>

        {/* Try On Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToStudio(gown);
          }}
          className={cn(
            'mt-3 w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2',
            'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
            'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
            'transition-all duration-300 hover:opacity-90'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Try On
        </button>
      </div>
    </div>
  );
}
