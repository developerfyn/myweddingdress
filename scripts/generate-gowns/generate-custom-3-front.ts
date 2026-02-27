#!/usr/bin/env npx tsx

/**
 * Generate 3 custom wedding gowns - FRONT VIEW ONLY for try-on
 */

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';
import { GOWN_NAMES, getStyleTags } from './config.ts';

// Environment validation
const FAL_KEY = process.env.FAL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!FAL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Configure clients
fal.config({ credentials: FAL_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CRITICAL: Front view prompt for try-on compatibility
const BASE_PROMPT = `Professional bridal catalog photography. FRONT VIEW ONLY. The model is standing directly facing the camera, looking straight ahead at the viewer. Full frontal view showing the complete dress from neckline to floor. The model's body is centered and facing forward, not turned to the side. Pure white/ivory wedding dress on a fashion model in a minimalist photography studio with soft grey textured backdrop. Professional window lighting, soft romantic mood, magazine quality editorial photography, vogue bridal style. IMPORTANT: Direct front-facing view, model looking at camera, showing the front of the dress clearly for virtual try-on purposes.`;

// IDs of old gowns to delete
const OLD_GOWN_IDS = [
  'c816505d-e55b-49bd-84f5-91a1aaa2f855',
  '98d21cc4-0fbf-4ddb-aa79-ee31b7624960',
  '80c95d68-fd77-423d-bfa6-e84de00fd370',
];

const OLD_STORAGE_PATHS = [
  'strapless/c816505d-e55b-49bd-84f5-91a1aaa2f855.png',
  'strapless/98d21cc4-0fbf-4ddb-aa79-ee31b7624960.png',
  'strapless/80c95d68-fd77-423d-bfa6-e84de00fd370.png',
];

// 3 Custom gowns with FRONT VIEW emphasis
const CUSTOM_GOWNS = [
  {
    name: '', // Will be randomly assigned
    neckline: 'strapless',
    necklineId: '', // Will be fetched
    silhouette: 'Ball Gown',
    sleeveStyle: 'Sleeveless',
    trainLength: 'Chapel',
    fabric: 'Organza',
    aesthetic: 'Whimsical',
    prompt: `${BASE_PROMPT} Wedding dress details: classic strapless straight-across neckline clearly visible from the front, dramatic ball gown silhouette with fitted bodice and voluminous full skirt visible from front view, sleeveless design with bare shoulders, chapel train visible behind, crisp sheer organza with heavily pleated structured volume creating architectural fan-like texture throughout the skirt, whimsical fairy-tale style with dramatic sculptural pleating cascading in waves. FRONT VIEW - model facing camera directly.`,
  },
  {
    name: '',
    neckline: 'strapless',
    necklineId: '',
    silhouette: 'Sheath',
    sleeveStyle: 'Sleeveless',
    trainLength: 'Court',
    fabric: 'Satin',
    aesthetic: 'Modern',
    prompt: `${BASE_PROMPT} Wedding dress details: strapless neckline with straight across cut and subtle pleated wrap detail at the bodice visible from front, sleek sheath column silhouette following the body line in a modern fitted design shown from the front, sleeveless with bare shoulders, court train behind, luxurious duchess satin with luminous sheen and smooth finish, contemporary modern minimalist design with clean lines. The bodice features architectural pleated wrapping with sheer illusion panel inserts visible from front view. FRONT VIEW - model standing straight facing the camera.`,
  },
  {
    name: '',
    neckline: 'strapless',
    necklineId: '',
    silhouette: 'Ball Gown',
    sleeveStyle: 'Sleeveless',
    trainLength: 'Cathedral',
    fabric: 'Mikado',
    aesthetic: 'Romantic',
    prompt: `${BASE_PROMPT} Wedding dress details: strapless straight-across neckline with delicate floral applique accents at the bodice edge shown from front, dramatic ball gown silhouette with fitted corset bodice and full structured skirt visible from the front view, sleeveless design with bare shoulders, cathedral train extending behind, structured mikado silk with beautiful sheen, romantic style with scattered dimensional floral appliques cascading down the front of the skirt and train. Classic ball gown silhouette with three-dimensional fabric flowers on front. FRONT VIEW - model facing directly toward camera.`,
  },
];

async function deleteOldGowns() {
  console.log('Deleting old gowns...');
  
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('gowns')
    .remove(OLD_STORAGE_PATHS);
  
  if (storageError) {
    console.error('  Warning: Storage deletion error:', storageError.message);
  } else {
    console.log('  ✓ Deleted from storage');
  }
  
  // Delete from database
  const { error: dbError } = await supabase
    .from('gowns')
    .delete()
    .in('id', OLD_GOWN_IDS);
  
  if (dbError) {
    console.error('  Warning: Database deletion error:', dbError.message);
  } else {
    console.log('  ✓ Deleted from database');
  }
}

async function fetchNecklineId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from('necklines')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch neckline ID for ${slug}`);
  }

  return data.id;
}

function getRandomName(usedNames: Set<string>): string {
  let name: string;
  do {
    name = GOWN_NAMES[Math.floor(Math.random() * GOWN_NAMES.length)];
  } while (usedNames.has(name) && usedNames.size < GOWN_NAMES.length);
  return name;
}

async function generateGown(gownConfig: typeof CUSTOM_GOWNS[0], index: number, usedNames: Set<string>) {
  const gownId = crypto.randomUUID();
  const name = getRandomName(usedNames);
  usedNames.add(name);

  console.log(`\n[${index + 1}/3] Generating: ${name} (FRONT VIEW)`);
  console.log(`  Attributes:`);
  console.log(`    Neckline: ${gownConfig.neckline}`);
  console.log(`    Silhouette: ${gownConfig.silhouette}`);
  console.log(`    Sleeve: ${gownConfig.sleeveStyle}`);
  console.log(`    Train: ${gownConfig.trainLength}`);
  console.log(`    Fabric: ${gownConfig.fabric}`);
  console.log(`    Aesthetic: ${gownConfig.aesthetic}`);

  try {
    // Generate image via Flux Pro
    console.log(`  Generating image...`);
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: gownConfig.prompt,
        image_size: { width: 768, height: 1024 },
        guidance_scale: 3.5,
        num_images: 1,
        safety_tolerance: '2',
        output_format: 'png',
      } as any,
      logs: false,
    });

    const imageUrl = (result.data as any).images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    // Download image
    console.log(`  Downloading image...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const storagePath = `${gownConfig.neckline}/${gownId}.png`;
    console.log(`  Uploading to storage: ${storagePath}`);
    const { error: uploadError } = await supabase.storage
      .from('gowns')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gowns')
      .getPublicUrl(storagePath);

    // Get style tags
    const styleTags = getStyleTags(
      gownConfig.fabric,
      gownConfig.aesthetic,
      gownConfig.silhouette
    );

    // Insert into database
    console.log(`  Inserting into database...`);
    const { error: insertError } = await supabase
      .from('gowns')
      .insert({
        id: gownId,
        name: name,
        neckline_id: gownConfig.necklineId,
        image_url: urlData.publicUrl,
        image_path: storagePath,
        style_tags: styleTags,
        silhouette: gownConfig.silhouette,
        sleeve_style: gownConfig.sleeveStyle,
        train_length: gownConfig.trainLength,
        fabric: gownConfig.fabric,
        aesthetic: gownConfig.aesthetic,
        ai_prompt: gownConfig.prompt,
        is_pro: false,
      });

    if (insertError) {
      await supabase.storage.from('gowns').remove([storagePath]);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log(`  ✓ Success! Gown ID: ${gownId}`);
    return { success: true, gownId, name };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function main() {
  console.log('🎀 Regenerating 3 Custom Wedding Gowns (FRONT VIEW)');
  console.log('===================================================\n');

  // Delete old gowns first
  await deleteOldGowns();
  console.log('');

  // Fetch neckline ID
  console.log('Fetching neckline ID for "strapless"...');
  const necklineId = await fetchNecklineId('strapless');
  console.log(`✓ Neckline ID: ${necklineId}\n`);

  // Set neckline ID for all gowns
  CUSTOM_GOWNS.forEach(gown => gown.necklineId = necklineId);

  // Generate all 3 gowns
  const usedNames = new Set<string>();
  const results = [];

  for (let i = 0; i < CUSTOM_GOWNS.length; i++) {
    const result = await generateGown(CUSTOM_GOWNS[i], i, usedNames);
    results.push(result);
    
    // Rate limiting: wait 2 seconds between requests
    if (i < CUSTOM_GOWNS.length - 1) {
      console.log(`\n  Waiting 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Generation Complete (FRONT VIEW)');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✓ Successful: ${successful.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`  - ${r.name} (${r.gownId})`));
  }
  
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length}`);
    failed.forEach(r => console.log(`  - ${r.error}`));
  }
  
  console.log('='.repeat(50));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
