#!/usr/bin/env npx tsx

/**
 * Party/Reception Dress Generation Test Script
 *
 * Generates 1 test party dress image using Flux Pro via fal.ai
 * and uploads to Supabase Storage + Database
 *
 * Usage:
 *   npx tsx scripts/generate-party-dresses/generate-test.ts
 */

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

// Environment validation
const FAL_KEY = process.env.FAL_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FAL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  if (!FAL_KEY) console.error('  - FAL_KEY');
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Configure fal.ai client
fal.config({ credentials: FAL_KEY });

// Configure Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Party dress configuration
const PARTY_DRESS = {
  name: 'Crystal Fringe',
  necklineSlug: 'halter', // Uses existing halter neckline
  color: 'Silver',
  silhouette: 'Mini',
  sleeveStyle: 'Sleeveless',
  trainLength: 'No Train',
  fabric: 'Glitter/Sequin',
  aesthetic: 'Glamorous',
  styleTags: ['glamorous', 'sparkle', 'party', 'reception', 'mini', 'silver'],
};

// Prompt for silver embellished party dress (inspired by image 16)
const PROMPT = `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning silver mini party dress, deep plunging halter V-neckline, sleeveless design, the dress features intricate crystal and bead embellishments in geometric patterns across the bodice, sparkling rhinestone details catching the light, luxurious silver metallic fringe skirt with cascading beaded strands creating movement and shimmer, form-fitting mini length falling mid-thigh, glamorous red-carpet reception dress style, ultra luxurious couture quality, crystal embellishments and sequins creating a dazzling effect`;

const IMAGE_SETTINGS = {
  width: 768,
  height: 1152,
  guidance_scale: 3.5,
  num_images: 1,
  output_format: 'png' as const,
};

async function main() {
  console.log('🎉 Party Dress Generation Test');
  console.log('================================');
  console.log(`Dress: ${PARTY_DRESS.name}`);
  console.log(`Color: ${PARTY_DRESS.color}`);
  console.log(`Style: ${PARTY_DRESS.silhouette} | ${PARTY_DRESS.aesthetic}`);
  console.log('');

  // Fetch halter neckline ID
  console.log('📍 Fetching neckline ID...');
  const { data: necklineData, error: necklineError } = await supabase
    .from('necklines')
    .select('id')
    .eq('slug', PARTY_DRESS.necklineSlug)
    .single();

  if (necklineError || !necklineData) {
    console.error('Failed to fetch neckline:', necklineError?.message);
    process.exit(1);
  }
  console.log(`✓ Neckline ID: ${necklineData.id}`);

  // Generate image via Flux Pro
  console.log('\n🎨 Generating image via Flux Pro...');
  console.log('(This may take 30-60 seconds)');

  const startTime = Date.now();

  try {
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt: PROMPT,
        image_size: {
          width: IMAGE_SETTINGS.width,
          height: IMAGE_SETTINGS.height,
        },
        guidance_scale: IMAGE_SETTINGS.guidance_scale,
        num_images: IMAGE_SETTINGS.num_images,
        safety_tolerance: '2',
        output_format: IMAGE_SETTINGS.output_format,
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_QUEUE') {
          console.log(`  Queue position: ${update.queue_position || 'processing'}`);
        }
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✓ Image generated in ${duration}s`);

    const imageUrl = (result.data as any).images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }
    console.log(`  Preview: ${imageUrl}`);

    // Download image
    console.log('\n📥 Downloading image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    console.log(`✓ Downloaded (${(imageBuffer.byteLength / 1024).toFixed(0)} KB)`);

    // Upload to Supabase Storage
    const gownId = crypto.randomUUID();
    const storagePath = `party/${gownId}.png`;

    console.log('\n☁️ Uploading to Supabase Storage...');
    const { error: uploadError } = await supabase.storage
      .from('gowns')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    console.log(`✓ Uploaded: ${storagePath}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gowns')
      .getPublicUrl(storagePath);

    // Insert database record
    console.log('\n💾 Inserting database record...');
    const { error: insertError } = await supabase
      .from('gowns')
      .insert({
        id: gownId,
        name: PARTY_DRESS.name,
        neckline_id: necklineData.id,
        image_url: urlData.publicUrl,
        image_path: storagePath,
        style_tags: PARTY_DRESS.styleTags,
        silhouette: PARTY_DRESS.silhouette,
        sleeve_style: PARTY_DRESS.sleeveStyle,
        train_length: PARTY_DRESS.trainLength,
        fabric: PARTY_DRESS.fabric,
        aesthetic: PARTY_DRESS.aesthetic,
        ai_prompt: PROMPT,
        is_pro: false,
      });

    if (insertError) {
      // Clean up uploaded image
      await supabase.storage.from('gowns').remove([storagePath]);
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    console.log(`✓ Database record created`);
    console.log('\n================================');
    console.log('🎉 SUCCESS!');
    console.log(`  Gown ID: ${gownId}`);
    console.log(`  Public URL: ${urlData.publicUrl}`);
    console.log('================================');

  } catch (error) {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  }
}

main();
