'use client';

import Image from 'next/image';
import { Dress } from '@/lib/dress-data';
import { cn } from '@/lib/utils';

interface DressCardProps {
  dress: Dress;
  onClick: (dress: Dress) => void;
}

export function DressCard({ dress, onClick }: DressCardProps) {
  return (
    <button
      onClick={() => onClick(dress)}
      className={cn(
        'relative flex-shrink-0 w-[140px] aspect-[3/4] rounded-2xl overflow-hidden',
        'bg-card transition-transform duration-200 active:scale-95 hover:scale-[1.02]',
        'focus:outline-none focus:ring-2 focus:ring-primary/50'
      )}
    >
      <Image
        src={dress.image || "/placeholder.svg"}
        alt={dress.name}
        fill
        className="object-cover"
        sizes="140px"
      />

      {/* Dress Name */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white text-sm font-serif text-left drop-shadow-md">
          {dress.name}
        </p>
      </div>
    </button>
  );
}
