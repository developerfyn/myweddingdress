#!/usr/bin/env npx tsx

/**
 * Generate 3 custom wedding gowns inspired by reference images
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

// Base prompt template
const BASE_PROMPT = `Professional high-end bridal photography of a wedding dress on a model in a minimalist studio with soft grey textured backdrop. The model is facing slightly toward the camera, showing the complete gown from head to floor with elegant posture. Dramatic window lighting with soft shadows. The dress is pure white/ivory. Professional bridal catalog photography style, soft romantic lighting, sharp focus on dress details, magazine quality, vogue bridal editorial. Full body shot showing the complete silhouette and train.`;

// 3 Custom gowns with inspiration
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
    prompt: `${BASE_PROMPT} The dress features: a classic strapless neckline with straight across cut, dramatic ball gown silhouette with fitted bodice and voluminous full skirt, sleeveless design showing bare shoulders and arms, classic chapel train extending 4-5 feet behind, crisp sheer organza with heavily pleated structured volume creating architectural fan-like texture throughout the skirt, whimsical fairy-tale style with playful enchanting details and dramatic sculptural pleating. The organza creates waves of pleated fabric that cascade dramatically.`,
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
    prompt: `${BASE_PROMPT} The dress features: a classic strapless neckline with straight across cut and subtle pleated wrap detail at the bodice, sleek sheath column silhouette following the natural body line with a modern fitted design, sleeveless design showing bare shoulders and arms, elegant court train extending 3 feet behind, luxurious duchess satin with luminous sheen and smooth finish, contemporary modern minimalist design with clean lines and sophisticated simplicity. The bodice features architectural pleated wrapping with sheer illusion panel inserts.`,
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
    prompt: `${BASE_PROMPT} The dress features: a classic strapless neckline with straight across cut and delicate floral applique accents at the bodice edge, dramatic ball gown silhouette with fitted corset bodice and full structured skirt with subtle pleating at the hip, sleeveless design showing bare shoulders and arms, dramatic cathedral train extending 6-7 feet behind, structured mikado silk with beautiful sheen and crisp finish, romantic style with soft flowing details and scattered dimensional floral appliques cascading down the skirt and train. The dress has an elegant classic ball gown silhouette with three-dimensional fabric flowers.`,
  },
];

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

  console.log(`\n[${index + 1}/3] Generating: ${name}`);
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
  console.log('🎀 Generating 3 Custom Wedding Gowns');
  console.log('=====================================\n');

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
  console.log('📊 Generation Complete');
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
