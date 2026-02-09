'use client';

import Image from 'next/image';
import { X, Heart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Gown } from '@/lib/gowns';

interface GownDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gown: Gown | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onTryOn: () => void;
}

export function GownDetailModal({
  isOpen,
  onClose,
  gown,
  isFavorite,
  onToggleFavorite,
  onTryOn,
}: GownDetailModalProps) {
  if (!isOpen || !gown) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Image */}
          <div className="relative w-full md:w-1/2 bg-secondary flex-shrink-0 flex items-center justify-center p-6 pt-14">
            <Image
              src={gown.image_url || '/placeholder.svg'}
              alt={gown.name}
              width={400}
              height={600}
              className="object-contain max-h-[75vh] w-auto rounded-lg"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Details */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex-1">
              <h2 className="font-serif text-2xl text-foreground mb-2">
                {gown.name}
              </h2>

              {/* Attributes */}
              <div className="space-y-2 text-sm text-muted-foreground">
                {gown.neckline?.name && (
                  <p>
                    <span className="text-foreground font-medium">Neckline:</span>{' '}
                    {gown.neckline.name}
                  </p>
                )}
                {gown.silhouette && (
                  <p>
                    <span className="text-foreground font-medium">Silhouette:</span>{' '}
                    {gown.silhouette}
                  </p>
                )}
                {gown.sleeve_style && (
                  <p>
                    <span className="text-foreground font-medium">Sleeve:</span>{' '}
                    {gown.sleeve_style}
                  </p>
                )}
                {gown.train_length && (
                  <p>
                    <span className="text-foreground font-medium">Train:</span>{' '}
                    {gown.train_length}
                  </p>
                )}
                {gown.fabric && (
                  <p>
                    <span className="text-foreground font-medium">Fabric:</span>{' '}
                    {gown.fabric}
                  </p>
                )}
                {gown.aesthetic && (
                  <p>
                    <span className="text-foreground font-medium">Style:</span>{' '}
                    {gown.aesthetic}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onToggleFavorite}
                className={cn(
                  'p-3 rounded-xl transition-colors',
                  isFavorite
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                )}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={cn('w-5 h-5', isFavorite && 'fill-current')} />
              </button>
              <button
                onClick={onTryOn}
                className={cn(
                  'flex-1 py-3 rounded-xl font-medium',
                  'bg-gradient-to-r from-[#FF6B9D] to-[#C86DD7] text-white',
                  'flex items-center justify-center gap-2',
                  'hover:opacity-90 transition-opacity'
                )}
              >
                <Sparkles className="w-5 h-5" />
                Try On This Gown
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
