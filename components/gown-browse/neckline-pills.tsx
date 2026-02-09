'use client';

import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Neckline } from '@/lib/gowns';

interface NecklinePillsProps {
  necklines: Neckline[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
}

export function NecklinePills({
  necklines,
  selectedSlugs,
  onToggle,
}: NecklinePillsProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3">Neckline</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-3 pb-3">
          {necklines.map((neckline) => {
            const isSelected = selectedSlugs.includes(neckline.slug);
            return (
              <button
                key={neckline.id}
                onClick={() => onToggle(neckline.slug)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                  isSelected
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {neckline.name}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
