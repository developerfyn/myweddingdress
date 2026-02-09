'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { GownCard } from './gown-card';
import type { Gown } from '@/lib/gowns';

interface GownGridProps {
  gowns: Gown[];
  isLoading: boolean;
  favorites: string[];
  onToggleFavorite: (gownId: string) => void;
  onAddToStudio: (gown: Gown) => void;
  onGownClick: (gown: Gown) => void;
  showIds?: boolean;
  showImageUrls?: boolean;
}

export function GownGrid({
  gowns,
  isLoading,
  favorites,
  onToggleFavorite,
  onAddToStudio,
  onGownClick,
  showIds = false,
  showImageUrls = false,
}: GownGridProps) {
  if (isLoading && gowns.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
        {Array.from({ length: 24 }).map((_, i) => (
          <GownCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (gowns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground mb-2">
          No gowns found
        </p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
      {gowns.map((gown) => (
        <GownCard
          key={gown.id}
          gown={gown}
          isFavorite={favorites.includes(gown.id)}
          onToggleFavorite={onToggleFavorite}
          onAddToStudio={onAddToStudio}
          onClick={onGownClick}
          showIds={showIds}
          showImageUrls={showImageUrls}
        />
      ))}
      {isLoading &&
        Array.from({ length: 6 }).map((_, i) => (
          <GownCardSkeleton key={`loading-${i}`} />
        ))}
    </div>
  );
}

function GownCardSkeleton() {
  return (
    <div className="aspect-[3/4] rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
  );
}
