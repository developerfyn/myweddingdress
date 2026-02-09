'use client';

import { SlidersHorizontal } from 'lucide-react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { FilterSection } from './filter-section';
import { FILTER_OPTIONS } from '@/lib/gowns';
import type { GownFilterState } from '@/hooks/use-gown-filters';

interface FilterMobileSheetProps {
  filters: GownFilterState;
  activeFilterCount: number;
  onToggleFilter: (key: keyof GownFilterState, value: string) => void;
  onClearAll: () => void;
}

export function FilterMobileSheet({
  filters,
  activeFilterCount,
  onToggleFilter,
  onClearAll,
}: FilterMobileSheetProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <DrawerTitle>Filters</DrawerTitle>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 py-2 max-h-[60vh]">
          <Accordion
            type="multiple"
            defaultValue={['silhouette', 'sleeve', 'train', 'fabric', 'aesthetic']}
          >
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
        <DrawerFooter className="border-t border-border">
          <DrawerClose asChild>
            <Button className="w-full">Show Results</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
