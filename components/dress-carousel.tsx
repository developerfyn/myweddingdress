'use client';

import { DressCategory, Dress } from '@/lib/dress-data';
import { DressCard } from './dress-card';

interface DressCarouselProps {
  category: DressCategory;
  onDressClick: (dress: Dress) => void;
}

export function DressCarousel({ category, onDressClick }: DressCarouselProps) {
  return (
    <section className="mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-white font-sans font-semibold text-base">
          {category.name} {category.emoji}
        </h2>
        <button className="text-muted-foreground text-sm font-sans hover:text-white transition-colors">
          See All
        </button>
      </div>
      
      {/* Horizontal Carousel */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {category.dresses.map((dress) => (
          <DressCard
            key={dress.id}
            dress={dress}
            onClick={onDressClick}
          />
        ))}
      </div>
    </section>
  );
}
