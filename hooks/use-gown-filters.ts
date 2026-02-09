'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { GownFilters } from '@/lib/gowns';

export interface GownFilterState extends Omit<GownFilters, 'limit' | 'offset'> {}

export function useGownFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current filters from URL
  const filters: GownFilterState = useMemo(() => {
    // Helper to parse comma-separated values into array
    const parseArray = (param: string | null): string[] | undefined => {
      if (!param) return undefined;
      const values = param.split(',').map(v => v.trim()).filter(Boolean);
      return values.length > 0 ? values : undefined;
    };

    return {
      necklineSlug: parseArray(searchParams.get('neckline')),
      silhouette: parseArray(searchParams.get('silhouette')),
      sleeveStyle: parseArray(searchParams.get('sleeve')),
      trainLength: parseArray(searchParams.get('train')),
      fabric: parseArray(searchParams.get('fabric')),
      aesthetic: parseArray(searchParams.get('aesthetic')),
      styleTags: parseArray(searchParams.get('tags')),
    };
  }, [searchParams]);

  // Count of active filters (count individual values in arrays)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    Object.entries(filters).forEach(([_, value]) => {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (value !== undefined && value !== null && value !== '') {
        count += 1;
      }
    });
    return count;
  }, [filters]);

  // Map filter keys to URL params
  const paramMap: Record<keyof GownFilterState, string> = {
    necklineSlug: 'neckline',
    silhouette: 'silhouette',
    sleeveStyle: 'sleeve',
    trainLength: 'train',
    fabric: 'fabric',
    aesthetic: 'aesthetic',
    styleTags: 'tags',
    isPro: 'pro',
  };

  // Update URL with new filters
  const setFilters = useCallback(
    (newFilters: Partial<GownFilterState>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newFilters).forEach(([key, value]) => {
        const paramName = paramMap[key as keyof GownFilterState];
        if (paramName) {
          if (value === undefined || value === null) {
            params.delete(paramName);
          } else if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(paramName, value.join(','));
            } else {
              params.delete(paramName);
            }
          } else if (typeof value === 'boolean') {
            params.set(paramName, String(value));
          }
        }
      });

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    },
    [searchParams, pathname, router, paramMap]
  );

  // Set a single filter
  const setFilter = useCallback(
    <K extends keyof GownFilterState>(key: K, value: GownFilterState[K]) => {
      setFilters({ [key]: value });
    },
    [setFilters]
  );

  // Toggle a filter value (adds/removes from array)
  const toggleFilter = useCallback(
    <K extends keyof GownFilterState>(key: K, value: string) => {
      // All filters are now multi-select arrays
      const currentValues = (filters[key] as string[] | undefined) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      setFilter(key, (newValues.length > 0 ? newValues : undefined) as GownFilterState[K]);
    },
    [filters, setFilter]
  );

  // Clear a specific filter
  const clearFilter = useCallback(
    (key: keyof GownFilterState) => {
      setFilter(key, undefined);
    },
    [setFilter]
  );

  // Remove a single value from a filter array
  const removeFilterValue = useCallback(
    (key: keyof GownFilterState, valueToRemove: string) => {
      const currentValues = (filters[key] as string[] | undefined) || [];
      const newValues = currentValues.filter(v => v !== valueToRemove);
      setFilter(key, (newValues.length > 0 ? newValues : undefined) as GownFilterState[typeof key]);
    },
    [filters, setFilter]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  return {
    filters,
    activeFilterCount,
    setFilters,
    setFilter,
    toggleFilter,
    clearFilter,
    removeFilterValue,
    clearAllFilters,
  };
}
