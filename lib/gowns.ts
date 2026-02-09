import { createClient } from '@supabase/supabase-js';

export interface Neckline {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Gown {
  id: string;
  name: string;
  neckline_id: string;
  image_url: string;
  image_path: string | null;
  style_tags: string[] | null;
  silhouette: string | null;
  sleeve_style: string | null;
  train_length: string | null;
  fabric: string | null;
  aesthetic: string | null;
  is_pro: boolean;
  created_at: string;
  // Joined neckline data
  neckline?: Neckline;
}

export interface GownCategory {
  neckline: Neckline;
  gowns: Gown[];
}

// Filter options for gown search
// Multi-select filters use string arrays
export interface GownFilters {
  necklineSlug?: string[];
  silhouette?: string[];
  sleeveStyle?: string[];
  trainLength?: string[];
  fabric?: string[];
  aesthetic?: string[];
  styleTags?: string[];
  isPro?: boolean;
  limit?: number;
  offset?: number;
}

// Available filter options (matching config.ts)
export const FILTER_OPTIONS = {
  silhouettes: ['A-Line', 'Ball Gown', 'Mermaid', 'Trumpet', 'Sheath', 'Empire', 'Tea-Length', 'Jumpsuit'],
  sleeveStyles: ['Sleeveless', 'Cap Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Long Sleeve', 'Bell Sleeve', 'Off-Shoulder Drape'],
  trainLengths: ['No Train', 'Sweep', 'Court', 'Chapel', 'Cathedral', 'Royal', 'Detachable'],
  fabrics: ['Lace', 'Tulle', 'Satin', 'Silk', 'Chiffon', 'Crepe', 'Organza', 'Mikado', 'Taffeta', 'Glitter/Sequin', 'Mixed'],
  aesthetics: ['Classic', 'Modern', 'Romantic', 'Bohemian', 'Glamorous', 'Vintage', 'Sexy/Bold', 'Modest', 'Whimsical'],
} as const;

/**
 * Fetch all necklines from the database
 */
export async function fetchNecklines(supabase: ReturnType<typeof createClient>): Promise<Neckline[]> {
  const { data, error } = await supabase
    .from('necklines')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching necklines:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all gowns from the database
 */
export async function fetchGowns(supabase: ReturnType<typeof createClient>): Promise<Gown[]> {
  const { data, error } = await supabase
    .from('gowns')
    .select(`
      *,
      neckline:necklines(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gowns:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch gowns by neckline slug
 */
export async function fetchGownsByNeckline(
  supabase: ReturnType<typeof createClient>,
  necklineSlug: string
): Promise<Gown[]> {
  const { data, error } = await supabase
    .from('gowns')
    .select(`
      *,
      neckline:necklines!inner(*)
    `)
    .eq('neckline.slug', necklineSlug)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching gowns by neckline:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch gowns grouped by neckline category
 */
export async function fetchGownCategories(
  supabase: ReturnType<typeof createClient>
): Promise<GownCategory[]> {
  // Fetch necklines
  const necklines = await fetchNecklines(supabase);

  // Fetch all gowns with neckline data
  const { data: gowns, error } = await supabase
    .from('gowns')
    .select(`
      *,
      neckline:necklines(*)
    `)
    .order('name');

  if (error) {
    console.error('Error fetching gowns:', error);
    return [];
  }

  // Group gowns by neckline
  const categories: GownCategory[] = necklines.map(neckline => ({
    neckline,
    gowns: (gowns || []).filter((g: Gown) => g.neckline_id === neckline.id),
  }));

  // Filter out empty categories
  return categories.filter(c => c.gowns.length > 0);
}

/**
 * Fetch a single gown by ID
 */
export async function fetchGownById(
  supabase: ReturnType<typeof createClient>,
  gownId: string
): Promise<Gown | null> {
  const { data, error } = await supabase
    .from('gowns')
    .select(`
      *,
      neckline:necklines(*)
    `)
    .eq('id', gownId)
    .single();

  if (error) {
    console.error('Error fetching gown:', error);
    return null;
  }

  return data;
}

/**
 * Search gowns with multi-dimensional filtering
 * Supports filtering by all 6 attributes plus style tags and pro status
 */
export async function searchGowns(
  supabase: ReturnType<typeof createClient>,
  filters: GownFilters = {}
): Promise<Gown[]> {
  let query = supabase
    .from('gowns')
    .select(`
      *,
      neckline:necklines(*)
    `);

  // Filter by neckline (via join) - multi-select
  if (filters.necklineSlug && filters.necklineSlug.length > 0) {
    // Use inner join with .in() for multiple necklines
    query = supabase
      .from('gowns')
      .select(`
        *,
        neckline:necklines!inner(*)
      `)
      .in('neckline.slug', filters.necklineSlug);
  }

  // Filter by silhouette (multi-select)
  if (filters.silhouette && filters.silhouette.length > 0) {
    query = query.in('silhouette', filters.silhouette);
  }

  // Filter by sleeve style (multi-select)
  if (filters.sleeveStyle && filters.sleeveStyle.length > 0) {
    query = query.in('sleeve_style', filters.sleeveStyle);
  }

  // Filter by train length (multi-select)
  if (filters.trainLength && filters.trainLength.length > 0) {
    query = query.in('train_length', filters.trainLength);
  }

  // Filter by fabric (multi-select)
  if (filters.fabric && filters.fabric.length > 0) {
    query = query.in('fabric', filters.fabric);
  }

  // Filter by aesthetic (multi-select)
  if (filters.aesthetic && filters.aesthetic.length > 0) {
    query = query.in('aesthetic', filters.aesthetic);
  }

  // Filter by style tags (array overlap)
  if (filters.styleTags && filters.styleTags.length > 0) {
    query = query.overlaps('style_tags', filters.styleTags);
  }

  // Filter by pro status
  if (filters.isPro !== undefined) {
    query = query.eq('is_pro', filters.isPro);
  }

  // Apply pagination
  if (filters.offset !== undefined) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }

  // Order by is_pro first (free gowns before PRO), then by name
  const { data, error } = await query
    .order('is_pro', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error searching gowns:', error);
    return [];
  }

  return data || [];
}

/**
 * Get count of gowns matching filters
 */
export async function countGowns(
  supabase: ReturnType<typeof createClient>,
  filters: Omit<GownFilters, 'limit' | 'offset'> = {}
): Promise<number> {
  // If filtering by neckline, we need to use an inner join
  if (filters.necklineSlug && filters.necklineSlug.length > 0) {
    let query = supabase
      .from('gowns')
      .select('id, neckline:necklines!inner(slug)', { count: 'exact', head: true })
      .in('neckline.slug', filters.necklineSlug);

    if (filters.silhouette && filters.silhouette.length > 0) {
      query = query.in('silhouette', filters.silhouette);
    }
    if (filters.sleeveStyle && filters.sleeveStyle.length > 0) {
      query = query.in('sleeve_style', filters.sleeveStyle);
    }
    if (filters.trainLength && filters.trainLength.length > 0) {
      query = query.in('train_length', filters.trainLength);
    }
    if (filters.fabric && filters.fabric.length > 0) {
      query = query.in('fabric', filters.fabric);
    }
    if (filters.aesthetic && filters.aesthetic.length > 0) {
      query = query.in('aesthetic', filters.aesthetic);
    }
    if (filters.styleTags && filters.styleTags.length > 0) {
      query = query.overlaps('style_tags', filters.styleTags);
    }
    if (filters.isPro !== undefined) {
      query = query.eq('is_pro', filters.isPro);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting gowns:', error);
      return 0;
    }

    return count || 0;
  }

  // No neckline filter - simple query
  let query = supabase
    .from('gowns')
    .select('id', { count: 'exact', head: true });

  if (filters.silhouette && filters.silhouette.length > 0) {
    query = query.in('silhouette', filters.silhouette);
  }
  if (filters.sleeveStyle && filters.sleeveStyle.length > 0) {
    query = query.in('sleeve_style', filters.sleeveStyle);
  }
  if (filters.trainLength && filters.trainLength.length > 0) {
    query = query.in('train_length', filters.trainLength);
  }
  if (filters.fabric && filters.fabric.length > 0) {
    query = query.in('fabric', filters.fabric);
  }
  if (filters.aesthetic && filters.aesthetic.length > 0) {
    query = query.in('aesthetic', filters.aesthetic);
  }
  if (filters.styleTags && filters.styleTags.length > 0) {
    query = query.overlaps('style_tags', filters.styleTags);
  }
  if (filters.isPro !== undefined) {
    query = query.eq('is_pro', filters.isPro);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting gowns:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get unique values for each filter dimension
 * Useful for building filter UI dropdowns
 */
export async function getFilterOptions(
  supabase: ReturnType<typeof createClient>
): Promise<{
  silhouettes: string[];
  sleeveStyles: string[];
  trainLengths: string[];
  fabrics: string[];
  aesthetics: string[];
}> {
  // Fetch distinct values from database
  const [silhouettes, sleeveStyles, trainLengths, fabrics, aesthetics] = await Promise.all([
    supabase.from('gowns').select('silhouette').not('silhouette', 'is', null),
    supabase.from('gowns').select('sleeve_style').not('sleeve_style', 'is', null),
    supabase.from('gowns').select('train_length').not('train_length', 'is', null),
    supabase.from('gowns').select('fabric').not('fabric', 'is', null),
    supabase.from('gowns').select('aesthetic').not('aesthetic', 'is', null),
  ]);

  // Extract unique values
  const unique = (data: any[] | null, key: string) =>
    Array.from(new Set((data || []).map(d => d[key]).filter(Boolean))).sort();

  return {
    silhouettes: unique(silhouettes.data, 'silhouette'),
    sleeveStyles: unique(sleeveStyles.data, 'sleeve_style'),
    trainLengths: unique(trainLengths.data, 'train_length'),
    fabrics: unique(fabrics.data, 'fabric'),
    aesthetics: unique(aesthetics.data, 'aesthetic'),
  };
}
