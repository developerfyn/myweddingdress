'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Heart, Sparkles } from 'lucide-react';
import { Dress, DressCategory } from '@/lib/dress-data';
import { cn } from '@/lib/utils';

interface DressGridProps {
  categories: DressCategory[];
  onDressClick: (dress: Dress) => void;
  onAddToStudio: (dress: Dress) => void;
  favorites: string[];
  onToggleFavorite: (dressId: string) => void;
  selectedCategory?: string;
  onCategoryChange: (categoryId: string | null) => void;
  // Dev Tools props
  showDressIds?: boolean;
  showImageUrls?: boolean;
}

export function DressGrid({
  categories,
  onDressClick,
  onAddToStudio,
  favorites,
  onToggleFavorite,
  selectedCategory,
  onCategoryChange,
  showDressIds = false,
  showImageUrls = false,
}: DressGridProps) {
  const [hoveredDress, setHoveredDress] = useState<string | null>(null);

  const allDresses = categories.flatMap((cat) => cat.dresses);
  const displayedDresses = selectedCategory
    ? categories.find((cat) => cat.id === selectedCategory)?.dresses || []
    : allDresses;

  return (
    <div className="h-full flex flex-col">
      {/* Category Filter */}
      <div className="flex items-center gap-3 p-6 border-b border-border overflow-x-auto">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            !selectedCategory
              ? 'bg-foreground text-background'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          All Styles
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              selectedCategory === category.id
                ? 'bg-foreground text-background'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Dress Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {displayedDresses.map((dress) => (
            <div
              key={dress.id}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-card cursor-pointer"
              onMouseEnter={() => setHoveredDress(dress.id)}
              onMouseLeave={() => setHoveredDress(null)}
              onClick={() => onDressClick(dress)}
            >
              {/* Image */}
              <Image
                src={dress.image || "/placeholder.svg"}
                alt={dress.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

              {/* Favorite Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(dress.id);
                }}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <Heart
                  className={cn(
                    'w-5 h-5 transition-colors',
                    favorites.includes(dress.id)
                      ? 'fill-primary text-primary'
                      : 'text-white'
                  )}
                />
              </button>

              {/* Debug: Dress ID Badge */}
              {showDressIds && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-orange-500 text-white text-xs font-mono font-bold z-10">
                  #{dress.id}
                </div>
              )}

              {/* Debug: Image URL */}
              {showImageUrls && (
                <div className="absolute top-12 left-2 right-2 px-2 py-1 rounded bg-black/80 text-green-400 text-[10px] font-mono truncate z-10">
                  {dress.image}
                </div>
              )}

              {/* Info & Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-serif text-xl text-white drop-shadow-lg mb-1">
                  {dress.name}
                </p>
                <p className="text-white/70 text-sm capitalize">{dress.category}</p>

                {/* Try On Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToStudio(dress);
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
          ))}
        </div>
      </div>
    </div>
  );
}
