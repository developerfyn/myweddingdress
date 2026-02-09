'use client';

import { Accordion } from '@/components/ui/accordion';
import { FilterSection } from './filter-section';
import { FILTER_OPTIONS } from '@/lib/gowns';
import type { GownFilterState } from '@/hooks/use-gown-filters';

interface FilterPanelProps {
  filters: GownFilterState;
  onToggleFilter: (key: keyof GownFilterState, value: string) => void;
}

export function FilterPanel({ filters, onToggleFilter }: FilterPanelProps) {
  return (
    <div className="w-64 border-r border-border bg-card/30 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Filters</h3>
      </div>
      <Accordion type="multiple" defaultValue={['silhouette']} className="px-4">
        <FilterSection
          id="silhouette"
          title="Silhouette"
          options={FILTER_OPTIONS.silhouettes}
          selectedValues={filters.silhouette || []}
          onToggle={(value) => onToggleFilter('silhouette', value)}
        />
        <FilterSection
          id="sleeve"
          title="Sleeve Style"
          options={FILTER_OPTIONS.sleeveStyles}
          selectedValues={filters.sleeveStyle || []}
          onToggle={(value) => onToggleFilter('sleeveStyle', value)}
        />
        <FilterSection
          id="train"
          title="Train Length"
          options={FILTER_OPTIONS.trainLengths}
          selectedValues={filters.trainLength || []}
          onToggle={(value) => onToggleFilter('trainLength', value)}
        />
        <FilterSection
          id="fabric"
          title="Fabric"
          options={FILTER_OPTIONS.fabrics}
          selectedValues={filters.fabric || []}
          onToggle={(value) => onToggleFilter('fabric', value)}
        />
        <FilterSection
          id="aesthetic"
          title="Aesthetic"
          options={FILTER_OPTIONS.aesthetics}
          selectedValues={filters.aesthetic || []}
          onToggle={(value) => onToggleFilter('aesthetic', value)}
        />
      </Accordion>
    </div>
  );
}
