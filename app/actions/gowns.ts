'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  searchGowns,
  countGowns,
  fetchNecklines,
  type GownFilters,
  type Gown,
  type Neckline,
} from '@/lib/gowns';

export interface FetchGownsResult {
  gowns: Gown[];
  total: number;
  hasMore: boolean;
}

export async function fetchGownsAction(
  filters: GownFilters = {}
): Promise<FetchGownsResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createServerSupabaseClient() as any;

  const limit = filters.limit ?? 24;
  const offset = filters.offset ?? 0;

  const [gowns, total] = await Promise.all([
    searchGowns(supabase, { ...filters, limit, offset }),
    countGowns(supabase, filters),
  ]);

  return {
    gowns,
    total,
    hasMore: offset + gowns.length < total,
  };
}

export async function fetchNecklinesAction(): Promise<Neckline[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createServerSupabaseClient() as any;
  return fetchNecklines(supabase);
}
