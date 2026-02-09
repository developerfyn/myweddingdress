// Pre-generate 500 unique gown attribute combinations
// Deterministic algorithm ensures reproducible results and no duplicates

import {
  NECKLINES,
  SILHOUETTES,
  SLEEVE_STYLES,
  TRAIN_LENGTHS,
  FABRICS,
  AESTHETICS,
  type AttributeConfig,
} from './config.ts';

export interface GownCombination {
  necklineIndex: number;
  silhouette: AttributeConfig;
  sleeveStyle: AttributeConfig;
  trainLength: AttributeConfig;
  fabric: AttributeConfig;
  aesthetic: AttributeConfig;
}

/**
 * Generate a unique combination key for deduplication
 */
function getCombinationKey(combo: Omit<GownCombination, 'necklineIndex'>): string {
  return [
    combo.silhouette.name,
    combo.sleeveStyle.name,
    combo.trainLength.name,
    combo.fabric.name,
    combo.aesthetic.name,
  ].join('|');
}

/**
 * Generate 50 unique combinations for a given neckline index
 * Uses prime number offsets to maximize variety while remaining deterministic
 */
function generateNecklineCombinations(
  necklineIndex: number,
  usedCombinations: Set<string>
): GownCombination[] {
  const combinations: GownCombination[] = [];
  const targetCount = 50;

  // Prime offsets for each attribute to create variety
  const primes = [2, 3, 5, 7, 11];

  // Starting offsets based on neckline index
  const silhouetteOffset = (necklineIndex * primes[0]) % SILHOUETTES.length;
  const sleeveOffset = (necklineIndex * primes[1]) % SLEEVE_STYLES.length;
  const trainOffset = (necklineIndex * primes[2]) % TRAIN_LENGTHS.length;
  const fabricOffset = (necklineIndex * primes[3]) % FABRICS.length;
  const aestheticOffset = (necklineIndex * primes[4]) % AESTHETICS.length;

  let attempts = 0;
  let index = 0;

  while (combinations.length < targetCount && attempts < 1000) {
    // Calculate indices using different stride patterns
    const silhouetteIdx = (silhouetteOffset + Math.floor(index / 1)) % SILHOUETTES.length;
    const sleeveIdx = (sleeveOffset + Math.floor(index / 2)) % SLEEVE_STYLES.length;
    const trainIdx = (trainOffset + Math.floor(index / 3)) % TRAIN_LENGTHS.length;
    const fabricIdx = (fabricOffset + Math.floor(index / 4)) % FABRICS.length;
    const aestheticIdx = (aestheticOffset + Math.floor(index / 5)) % AESTHETICS.length;

    const combo = {
      silhouette: SILHOUETTES[silhouetteIdx],
      sleeveStyle: SLEEVE_STYLES[sleeveIdx],
      trainLength: TRAIN_LENGTHS[trainIdx],
      fabric: FABRICS[fabricIdx],
      aesthetic: AESTHETICS[aestheticIdx],
    };

    const key = getCombinationKey(combo);

    if (!usedCombinations.has(key)) {
      usedCombinations.add(key);
      combinations.push({
        necklineIndex,
        ...combo,
      });
    }

    index++;
    attempts++;
  }

  // If we still need more combinations, use random selection
  while (combinations.length < targetCount) {
    const combo = {
      silhouette: SILHOUETTES[Math.floor(Math.random() * SILHOUETTES.length)],
      sleeveStyle: SLEEVE_STYLES[Math.floor(Math.random() * SLEEVE_STYLES.length)],
      trainLength: TRAIN_LENGTHS[Math.floor(Math.random() * TRAIN_LENGTHS.length)],
      fabric: FABRICS[Math.floor(Math.random() * FABRICS.length)],
      aesthetic: AESTHETICS[Math.floor(Math.random() * AESTHETICS.length)],
    };

    const key = getCombinationKey(combo);

    if (!usedCombinations.has(key)) {
      usedCombinations.add(key);
      combinations.push({
        necklineIndex,
        ...combo,
      });
    }
  }

  return combinations;
}

/**
 * Generate all 500 unique gown combinations
 * Returns a map of neckline index -> combinations array
 */
export function generateAllCombinations(): Map<number, GownCombination[]> {
  const usedCombinations = new Set<string>();
  const allCombinations = new Map<number, GownCombination[]>();

  for (let necklineIndex = 0; necklineIndex < NECKLINES.length; necklineIndex++) {
    const combinations = generateNecklineCombinations(necklineIndex, usedCombinations);
    allCombinations.set(necklineIndex, combinations);
  }

  return allCombinations;
}

/**
 * Get combinations for a specific neckline
 */
export function getCombinationsForNeckline(
  necklineIndex: number,
  allCombinations: Map<number, GownCombination[]>
): GownCombination[] {
  return allCombinations.get(necklineIndex) || [];
}

/**
 * Validate that we have exactly 500 unique combinations
 */
export function validateCombinations(
  allCombinations: Map<number, GownCombination[]>
): { valid: boolean; totalCount: number; duplicates: number } {
  const seenKeys = new Set<string>();
  let totalCount = 0;
  let duplicates = 0;

  for (const [, combinations] of allCombinations) {
    for (const combo of combinations) {
      totalCount++;
      const key = getCombinationKey(combo);
      if (seenKeys.has(key)) {
        duplicates++;
      } else {
        seenKeys.add(key);
      }
    }
  }

  return {
    valid: totalCount === 500 && duplicates === 0,
    totalCount,
    duplicates,
  };
}

// CLI test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Generating 500 unique gown combinations...\n');

  const combinations = generateAllCombinations();
  const validation = validateCombinations(combinations);

  console.log('Validation Results:');
  console.log(`  Total combinations: ${validation.totalCount}`);
  console.log(`  Duplicates found: ${validation.duplicates}`);
  console.log(`  Valid: ${validation.valid ? '✓' : '✗'}`);

  console.log('\nDistribution by neckline:');
  for (const [necklineIndex, combos] of combinations) {
    console.log(`  ${NECKLINES[necklineIndex].name}: ${combos.length} combinations`);
  }

  console.log('\nSample combinations (first 3 per neckline):');
  for (const [necklineIndex, combos] of combinations) {
    console.log(`\n${NECKLINES[necklineIndex].name}:`);
    for (let i = 0; i < Math.min(3, combos.length); i++) {
      const c = combos[i];
      console.log(`  ${i + 1}. ${c.silhouette.name} | ${c.sleeveStyle.name} | ${c.trainLength.name} | ${c.fabric.name} | ${c.aesthetic.name}`);
    }
  }
}
