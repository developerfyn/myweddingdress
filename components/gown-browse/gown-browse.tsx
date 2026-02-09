'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NecklinePills } from './neckline-pills';
import { FilterPanel } from './filter-panel';
import { FilterMobileSheet } from './filter-mobile-sheet';
import { ActiveFiltersBar } from './active-filters-bar';
import { GownGrid } from './gown-grid';
import { useGownFilters } from '@/hooks/use-gown-filters';
import { fetchGownsAction, fetchNecklinesAction } from '@/app/actions/gowns';
import type { Gown, Neckline } from '@/lib/gowns';

interface GownBrowseProps {
  onGownClick: (gown: Gown) => void;
  onAddToStudio: (gown: Gown) => void;
  favorites: string[];
  onToggleFavorite: (gownId: string) => void;
  showIds?: boolean;
  showImageUrls?: boolean;
}

const PAGE_SIZE = 24;

export function GownBrowse({
  onGownClick,
  onAddToStudio,
  favorites,
  onToggleFavorite,
  showIds = false,
  showImageUrls = false,
}: GownBrowseProps) {
  const [gowns, setGowns] = useState<Gown[]>([]);
  const [necklines, setNecklines] = useState<Neckline[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, startLoadingMore] = useTransition();

  const {
    filters,
    activeFilterCount,
    setFilter,
    toggleFilter,
    removeFilterValue,
    clearAllFilters,
  } = useGownFilters();

  const hasSetDefault = useRef(false);

  // Set default neckline to 'bateau' on first mount if none selected
  useEffect(() => {
    if (!hasSetDefault.current && (!filters.necklineSlug || filters.necklineSlug.length === 0)) {
      hasSetDefault.current = true;
      setFilter('necklineSlug', ['bateau']);
    }
  }, [filters.necklineSlug, setFilter]);

  // Fetch necklines on mount
  useEffect(() => {
    fetchNecklinesAction().then(setNecklines);
  }, []);

  // Fetch gowns when filters change
  useEffect(() => {
    setIsLoading(true);
    fetchGownsAction({ ...filters, limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        setGowns(result.gowns);
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [filters]);

  // Load more gowns
  const loadMore = useCallback(() => {
    startLoadingMore(async () => {
      const result = await fetchGownsAction({
        ...filters,
        limit: PAGE_SIZE,
        offset: gowns.length,
      });
      setGowns((prev) => [...prev, ...result.gowns]);
      setHasMore(result.hasMore);
    });
  }, [filters, gowns.length]);

  return (
    <div className="h-full flex">
      {/* Desktop Filter Panel */}
      <div className="hidden lg:block">
        <FilterPanel filters={filters} onToggleFilter={toggleFilter} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Neckline Pills */}
        <div className="p-6 border-b border-border space-y-4">
          {/* Top Row: Results count and Mobile Filter */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  Showing{' '}
                  <span className="font-medium text-foreground">{gowns.length}</span>{' '}
                  of <span className="font-medium text-foreground">{total}</span>{' '}
                  gowns
                </>
              )}
            </p>
            <div className="lg:hidden">
              <FilterMobileSheet
                filters={filters}
                activeFilterCount={activeFilterCount}
                onToggleFilter={toggleFilter}
                onClearAll={clearAllFilters}
              />
            </div>
          </div>

          {/* Neckline Pills */}
          <NecklinePills
            necklines={necklines}
            selectedSlugs={filters.necklineSlug || []}
            onToggle={(slug) => toggleFilter('necklineSlug', slug)}
          />

          {/* Active Filters */}
          <ActiveFiltersBar
            filters={filters}
            necklines={necklines}
            onRemoveFilterValue={removeFilterValue}
            onClearAll={clearAllFilters}
          />
        </div>

        {/* Gown Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <GownGrid
            gowns={gowns}
            isLoading={isLoading}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onAddToStudio={onAddToStudio}
            onGownClick={onGownClick}
            showIds={showIds}
            showImageUrls={showImageUrls}
          />

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="flex justify-center pt-8 pb-4">
              <Button
                variant="outline"
                size="lg"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
