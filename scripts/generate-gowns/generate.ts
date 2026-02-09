#!/usr/bin/env npx tsx

/**
 * Wedding Gown Generation Script
 *
 * Generates 500 AI wedding gown images with 6 unique attributes using Flux Pro via fal.ai
 * and uploads them to Supabase Storage + Database
 *
 * Usage:
 *   npm run generate           # Generate all 500 gowns
 *   npm run generate:test      # Generate 1 test image per neckline (10 total)
 *   npm run generate -- --neckline sweetheart  # Generate only sweetheart neckline
 */

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';
import { NECKLINES, GOWN_NAMES, getStyleTags, getRandomElement } from './config.ts';
import { generateAllCombinations, validateCombinations, type GownCombination } from './combinations.ts';
import { generatePrompt, IMAGE_SETTINGS } from './prompts.ts';

// Inline type to avoid type-only import issues with --experimental-strip-types
interface NecklineConfig {
  name: string;
  slug: string;
  count: number;
  promptDescription: string;
  id?: string;
}

// Environment validation
const FAL_KEY = process.env.FAL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!FAL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  if (!FAL_KEY) console.error('  - FAL_KEY');
  if (!SUPABASE_URL) console.error('  - SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_KEY');
  console.error('\nCopy .env.example to .env and fill in your credentials.');
  process.exit(1);
}

// Configure fal.ai client
fal.config({
  credentials: FAL_KEY,
});

// Configure Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Parse command line arguments
const args = process.argv.slice(2);
const isTestMode = args.includes('--test');
const necklineFilter = args.find(arg => arg.startsWith('--neckline='))?.split('=')[1]
  || (args.includes('--neckline') ? args[args.indexOf('--neckline') + 1] : null);

interface NecklineRecord {
  id: string;
  name: string;
  slug: string;
}

interface GenerationResult {
  success: boolean;
  gownId?: string;
  error?: string;
}

/**
 * Fetch neckline IDs from database
 */
async function fetchNecklineIds(): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('necklines')
    .select('id, slug');

  if (error) {
    throw new Error(`Failed to fetch necklines: ${error.message}`);
  }

  const necklineMap = new Map<string, string>();
  for (const neckline of data as NecklineRecord[]) {
    necklineMap.set(neckline.slug, neckline.id);
  }

  return necklineMap;
}

/**
 * Generate a single gown image and upload to Supabase
 */
async function generateGown(
  neckline: NecklineConfig,
  combination: GownCombination,
  index: number,
  usedNames: Set<string>
): Promise<GenerationResult> {
  const gownId = crypto.randomUUID();

  // Generate unique name
  let name: string;
  do {
    name = getRandomElement(GOWN_NAMES);
  } while (usedNames.has(name) && usedNames.size < GOWN_NAMES.length);
  usedNames.add(name);

  // Generate prompt with all 6 attributes
  const promptData = generatePrompt(neckline, combination, index);

  console.log(`  [${index + 1}/${neckline.count}] Generating "${name}"...`);
  console.log(`    Silhouette: ${promptData.silhouette} | Sleeve: ${promptData.sleeveStyle} | Train: ${promptData.trainLength}`);
  console.log(`    Fabric: ${promptData.fabric} | Aesthetic: ${promptData.aesthetic}`);

  try {
    // Generate image via Flux Pro
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: promptData.prompt,
        image_size: {
          width: IMAGE_SETTINGS.width,
          height: IMAGE_SETTINGS.height,
        },
        guidance_scale: IMAGE_SETTINGS.guidance_scale,
        num_images: IMAGE_SETTINGS.num_images,
        safety_tolerance: '2', // Moderate safety
        output_format: IMAGE_SETTINGS.output_format,
      } as any,
      logs: false,
    });

    const imageUrl = (result.data as any).images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const storagePath = `${neckline.slug}/${gownId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('gowns')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gowns')
      .getPublicUrl(storagePath);

    // Determine style tags from attributes
    const styleTags = getStyleTags(
      promptData.fabric,
      promptData.aesthetic,
      promptData.silhouette
    );

    // Insert database record with all 6 attributes
    // Note: is_pro is always false - all gowns are now free, usage limits apply separately
    const { error: insertError } = await supabase
      .from('gowns')
      .insert({
        id: gownId,
        name: `${name}`,
        neckline_id: neckline.id,
        image_url: urlData.publicUrl,
        image_path: storagePath,
        style_tags: styleTags,
        silhouette: promptData.silhouette,
        sleeve_style: promptData.sleeveStyle,
        train_length: promptData.trainLength,
        fabric: promptData.fabric,
        aesthetic: promptData.aesthetic,
        ai_prompt: promptData.prompt,
        is_pro: false,
      });

    if (insertError) {
      // Clean up uploaded image if DB insert fails
      await supabase.storage.from('gowns').remove([storagePath]);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`    ✓ Uploaded: ${storagePath}`);
    return { success: true, gownId };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`    ✗ Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Generate all gowns for a neckline category
 */
async function generateNecklineGowns(
  neckline: NecklineConfig,
  combinations: GownCombination[],
  count: number
): Promise<{ success: number; failed: number }> {
  console.log(`\n📍 ${neckline.name} (${count} gowns)`);

  const usedNames = new Set<string>();
  let success = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    const combination = combinations[i];
    const result = await generateGown(neckline, combination, i, usedNames);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting: wait between requests to avoid hitting API limits
    if (i < count - 1) {
      await sleep(2000); // 2 second delay between images
    }
  }

  console.log(`  Summary: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * Ensure the gowns storage bucket exists
 */
async function ensureStorageBucket(): Promise<void> {
  const { data: buckets } = await supabase.storage.listBuckets();
  const gownsBucket = buckets?.find(b => b.name === 'gowns');

  if (!gownsBucket) {
    console.log('Creating "gowns" storage bucket...');
    const { error } = await supabase.storage.createBucket('gowns', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
    console.log('✓ Bucket created');
  } else {
    console.log('✓ Storage bucket exists');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main generation function
 */
async function main(): Promise<void> {
  console.log('🎀 Wedding Gown Generation Script (500 Gowns)');
  console.log('=============================================');

  if (isTestMode) {
    console.log('Mode: TEST (1 image per neckline)');
  } else if (necklineFilter) {
    console.log(`Mode: Single neckline (${necklineFilter})`);
  } else {
    console.log('Mode: FULL (all 500 gowns)');
  }

  // Generate all combinations upfront
  console.log('\nGenerating unique attribute combinations...');
  const allCombinations = generateAllCombinations();
  const validation = validateCombinations(allCombinations);

  if (!validation.valid) {
    console.error(`Combination validation failed: ${validation.totalCount} combinations, ${validation.duplicates} duplicates`);
    process.exit(1);
  }
  console.log(`✓ Generated ${validation.totalCount} unique combinations`);

  // Ensure storage bucket exists
  await ensureStorageBucket();

  // Fetch neckline IDs from database
  console.log('\nFetching neckline data...');
  const necklineIds = await fetchNecklineIds();

  if (necklineIds.size === 0) {
    console.error('No necklines found in database. Run the migration first:');
    console.error('  supabase db push');
    process.exit(1);
  }

  console.log(`✓ Found ${necklineIds.size} necklines`);

  // Prepare necklines with IDs
  let necklinesToProcess = NECKLINES.map((n, index) => ({
    ...n,
    id: necklineIds.get(n.slug),
    combinations: allCombinations.get(index) || [],
  })).filter(n => n.id); // Only process necklines that exist in DB

  // Filter if specific neckline requested
  if (necklineFilter) {
    necklinesToProcess = necklinesToProcess.filter(
      n => n.slug === necklineFilter || n.name.toLowerCase() === necklineFilter.toLowerCase()
    );

    if (necklinesToProcess.length === 0) {
      console.error(`Neckline "${necklineFilter}" not found. Available:`);
      NECKLINES.forEach(n => console.error(`  - ${n.slug}`));
      process.exit(1);
    }
  }

  // Calculate totals
  const totalCount = isTestMode
    ? necklinesToProcess.length
    : necklinesToProcess.reduce((sum, n) => sum + n.count, 0);

  console.log(`\n🎯 Generating ${totalCount} gown images...`);
  console.log('━'.repeat(50));

  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const neckline of necklinesToProcess) {
    const count = isTestMode ? 1 : neckline.count;
    const { success, failed } = await generateNecklineGowns(
      neckline as NecklineConfig & { id: string },
      neckline.combinations,
      count
    );
    totalSuccess += success;
    totalFailed += failed;
  }

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '━'.repeat(50));
  console.log('📊 Final Results:');
  console.log(`   ✓ Success: ${totalSuccess}`);
  console.log(`   ✗ Failed:  ${totalFailed}`);
  console.log(`   ⏱ Duration: ${duration} minutes`);
  console.log('━'.repeat(50));

  if (totalFailed > 0) {
    console.log('\n⚠️  Some images failed to generate. Re-run the script to retry.');
    process.exit(1);
  }

  console.log('\n✨ All gowns generated successfully!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
