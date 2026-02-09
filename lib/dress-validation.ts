/**
 * Server-side dress access validation
 */

import { dressCategories } from '@/lib/dress-data';

export interface DressValidationResult {
  valid: boolean;
  error?: string;
  dress?: {
    id: string;
    name: string;
    isPro: boolean;
  };
}

// Build a lookup map for fast access
const dressMap = new Map<string, { id: string; name: string; isPro: boolean }>();

// Initialize map on module load
for (const category of dressCategories) {
  for (const dress of category.dresses) {
    dressMap.set(dress.id, {
      id: dress.id,
      name: dress.name,
      isPro: dress.isPro,
    });
  }
}

/**
 * Validate that a user can access a specific dress
 */
export function validateDressAccess(
  dressId: string | null | undefined,
  userPlan: string
): DressValidationResult {
  // No dress ID provided - allow (backwards compatibility)
  if (!dressId) {
    return { valid: true };
  }

  // Find the dress
  const dress = dressMap.get(dressId);

  if (!dress) {
    // Dress not found - could be custom/uploaded, allow
    console.log(`[DressValidation] Dress not found: ${dressId}, allowing`);
    return { valid: true };
  }

  // Check if PRO dress and user is on free plan
  if (dress.isPro && userPlan === 'free') {
    return {
      valid: false,
      error: `"${dress.name}" is a PRO dress. Upgrade to access premium designs.`,
      dress,
    };
  }

  return { valid: true, dress };
}

/**
 * Get dress info by ID
 */
export function getDressById(dressId: string): { id: string; name: string; isPro: boolean } | null {
  return dressMap.get(dressId) || null;
}

/**
 * Check if dress exists and is PRO
 */
export function isDressPro(dressId: string): boolean {
  const dress = dressMap.get(dressId);
  return dress?.isPro ?? false;
}
