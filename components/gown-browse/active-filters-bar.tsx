'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GownFilterState } from '@/hooks/use-gown-filters';
import type { Neckline } from '@/lib/gowns';

interface ActiveFiltersBarProps {
  filters: GownFilterState;
  necklines: Neckline[];
  onRemoveFilterValue: (key: keyof GownFilterState, value: string) => void;
  onClearAll: () => void;
}

const FILTER_LABELS: Record<keyof GownFilterState, string> = {
  necklineSlug: 'Neckline',
  silhouette: 'Silhouette',
  sleeveStyle: 'Sleeve',
  trainLength: 'Train',
  fabric: 'Fabric',
  aesthetic: 'Aesthetic',
  styleTags: 'Tags',
  isPro: 'Pro',
};

interface FilterBadge {
  key: keyof GownFilterState;
  value: string;
  displayValue: string;
}

export function ActiveFiltersBar({
  filters,
  necklines,
  onRemoveFilterValue,
  onClearAll,
}: ActiveFiltersBarProps) {
  // Build flat list of all filter badges
  const filterBadges: FilterBadge[] = [];

  Object.entries(filters).forEach(([key, value]) => {
    const filterKey = key as keyof GownFilterState;

    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      // Multi-select: create badge for each value
      value.forEach((v) => {
        let displayValue = v;
        // Look up neckline name for necklineSlug
        if (filterKey === 'necklineSlug') {
          const neckline = necklines.find((n) => n.slug === v);
          displayValue = neckline?.name || v;
        }
        filterBadges.push({
          key: filterKey,
          value: v,
          displayValue: displayValue,
        });
      });
    } else if (typeof value === 'string') {
      // Single-select
      filterBadges.push({
        key: filterKey,
        value: value,
        displayValue: value,
      });
    }
  });

  if (filterBadges.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {filterBadges.map((badge, index) => (
        <Badge
          key={`${badge.key}-${badge.value}-${index}`}
          variant="secondary"
          className="gap-1.5 pr-1 cursor-pointer hover:bg-secondary/80"
          onClick={() => onRemoveFilterValue(badge.key, badge.value)}
        >
          <span className="text-muted-foreground">{FILTER_LABELS[badge.key]}:</span>
          <span>{badge.displayValue}</span>
          <X className="w-3 h-3 ml-0.5" />
        </Badge>
      ))}
      {filterBadges.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
