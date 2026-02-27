#!/usr/bin/env npx tsx

/**
 * Party Dress Batch 3 - 7 Dresses
 * Based on inspiration images 26-32
 */

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';

const FAL_KEY = process.env.FAL_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FAL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRESSES = [
  {
    name: 'Baroque Champagne Fringe',
    necklineSlug: 'v-neck',
    color: 'Champagne',
    silhouette: 'Mini',
    sleeveStyle: 'Spaghetti Straps',
    trainLength: 'No Train',
    fabric: 'Glitter/Sequin',
    aesthetic: 'Glamorous',
    styleTags: ['glamorous', 'champagne', 'crystal', 'fringe', 'party', 'mini', 'baroque'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning champagne gold mini party dress, delicate spaghetti straps with deep V-neckline, intricate baroque-style crystal and bead embellishments covering the entire bodice in ornate scrollwork patterns, luxurious golden beaded fringe skirt with cascading crystal strands creating movement, form-fitting mini length falling mid-thigh, warm champagne gold color with silver crystal accents, glamorous reception dress style, ultra luxurious couture quality`
  },
  {
    name: 'Pearl Feather Swirl',
    necklineSlug: 'strapless',
    color: 'Ivory/Iridescent',
    silhouette: 'Mini',
    sleeveStyle: 'Strapless',
    trainLength: 'No Train',
    fabric: 'Pearl/Beaded',
    aesthetic: 'Modern',
    styleTags: ['modern', 'pearls', 'feathers', 'iridescent', 'party', 'mini', 'sculptural'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white and iridescent mini party dress, strapless structured bodice, the dress features an extraordinary swirling pattern of white pearls and delicate feathers creating organic flowing curves across the entire garment, iridescent sheen catching the light beautifully, pearls arranged in elegant spiraling patterns, soft white feather accents integrated throughout, form-fitting mini length, sculptural modern design, ultra luxurious couture quality`
  },
  {
    name: 'Pearl Scatter Corset',
    necklineSlug: 'strapless',
    color: 'White',
    silhouette: 'Mini',
    sleeveStyle: 'Strapless',
    trainLength: 'No Train',
    fabric: 'Pearl/Beaded',
    aesthetic: 'Classic',
    styleTags: ['classic', 'corset', 'pearls', 'party', 'mini', 'structured'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white mini party dress with structured corset bodice, strapless design with visible corset boning creating beautiful structured lines, scattered pearl embellishments across the entire dress creating an elegant sparkle effect, pearls of varying sizes arranged in a delicate scattered pattern, form-fitting mini length falling mid-thigh, clean white fabric with lustrous pearl details, classic bridal party style, ultra luxurious couture quality`
  },
  {
    name: 'Tulle Dream Asymmetric',
    necklineSlug: 'strapless',
    color: 'White',
    silhouette: 'Asymmetric',
    sleeveStyle: 'Strapless',
    trainLength: 'No Train',
    fabric: 'Tulle/Pearl',
    aesthetic: 'Romantic',
    styleTags: ['romantic', 'corset', 'pearls', 'tulle', 'asymmetric', 'party', 'dramatic'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white party dress with structured corset bodice, strapless design with elegant pearl embellishments along the neckline creating a beautiful frame, corset boning visible through the bodice, dramatic asymmetric draped tulle skirt flowing from short on one side to longer on the other, soft ethereal tulle creating romantic movement, pearl details scattered across the bodice, elegant bridal reception style, ultra luxurious couture quality`
  },
  {
    name: 'Floral Garden A-Line',
    necklineSlug: 'sweetheart',
    color: 'White',
    silhouette: 'A-Line',
    sleeveStyle: 'Cap Sleeves',
    trainLength: 'No Train',
    fabric: 'Floral Appliqué',
    aesthetic: 'Romantic',
    styleTags: ['romantic', 'floral', '3d-flowers', 'a-line', 'garden', 'elegant', 'high-slit'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white A-line gown with sweetheart neckline and delicate straps, the dress features exquisite 3D floral appliqué with handcrafted fabric flowers cascading down the bodice and flowing onto the skirt, elegant high slit on one side revealing the leg, intricate floral embroidery and dimensional flowers in soft white tones, romantic garden wedding style, flowing A-line silhouette, ultra luxurious couture quality`
  },
  {
    name: 'Floral Vine Ball Gown',
    necklineSlug: 'halter',
    color: 'White',
    silhouette: 'Ball Gown',
    sleeveStyle: 'Halter',
    trainLength: 'Chapel',
    fabric: 'Floral Appliqué',
    aesthetic: 'Romantic',
    styleTags: ['romantic', 'floral', '3d-flowers', 'ball-gown', 'halter', 'dramatic', 'train'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white ball gown with halter neckline and deep V plunge, the dress features magnificent 3D floral vine appliqué with dimensional handcrafted flowers trailing from the bodice down the voluminous skirt, organic flowing floral pattern creating a garden-inspired design, dramatic full ball gown silhouette with chapel length train, intricate floral details with varying flower sizes, romantic fairy tale wedding style, ultra luxurious couture quality`
  },
  {
    name: 'Satin Drape Ball Gown',
    necklineSlug: 'sweetheart',
    color: 'White',
    silhouette: 'Ball Gown',
    sleeveStyle: 'Strapless',
    trainLength: 'Chapel',
    fabric: 'Satin',
    aesthetic: 'Classic',
    styleTags: ['classic', 'satin', 'draped', 'ball-gown', 'elegant', 'high-slit', 'sculptural'],
    prompt: `Fashion editorial photograph, full body shot from head to feet, beautiful 25 year old female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end fashion magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details,

wearing a stunning white satin ball gown with strapless sweetheart neckline, the dress features dramatic sculptural draping with elegant fabric manipulation creating artistic folds and pleats, luxurious heavyweight duchess satin with beautiful sheen, dramatic high slit on one side, voluminous ball gown skirt with architectural draping, timeless classic Hollywood glamour style, clean minimalist elegance with focus on fabric craftsmanship, ultra luxurious couture quality`
  }
];

async function main() {
  console.log('🎉 Generating 7 Party Dresses (Batch 3)');
  console.log('========================================\n');

  // Fetch neckline IDs
  const { data: necklines } = await supabase.from('necklines').select('id, slug');
  const getNecklineId = (slug: string) => necklines?.find(n => n.slug === slug)?.id;

  for (let i = 0; i < DRESSES.length; i++) {
    const dress = DRESSES[i];
    console.log(`[${i + 1}/7] ${dress.name}`);
    console.log(`    Color: ${dress.color} | Style: ${dress.silhouette}`);

    try {
      // Generate image
      console.log('    🎨 Generating...');
      const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
        input: {
          prompt: dress.prompt,
          image_size: { width: 768, height: 1152 },
          guidance_scale: 3.5,
          num_images: 1,
          safety_tolerance: '2',
          output_format: 'png',
        } as any,
        logs: false,
      });

      const imageUrl = (result.data as any).images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL');
      console.log('    ✓ Generated');

      // Download
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      console.log(`    📥 Downloaded (${(imageBuffer.byteLength / 1024).toFixed(0)} KB)`);

      // Upload
      const gownId = crypto.randomUUID();
      const storagePath = `party/${gownId}.png`;

      const { error: uploadError } = await supabase.storage
        .from('gowns')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '31536000',
        });
      if (uploadError) throw uploadError;
      console.log('    ☁️ Uploaded');

      // Get public URL
      const { data: urlData } = supabase.storage.from('gowns').getPublicUrl(storagePath);

      // Insert DB record
      const { error: insertError } = await supabase.from('gowns').insert({
        id: gownId,
        name: dress.name,
        neckline_id: getNecklineId(dress.necklineSlug),
        image_url: urlData.publicUrl,
        image_path: storagePath,
        style_tags: dress.styleTags,
        silhouette: dress.silhouette,
        sleeve_style: dress.sleeveStyle,
        train_length: dress.trainLength,
        fabric: dress.fabric,
        aesthetic: dress.aesthetic,
        ai_prompt: dress.prompt,
        is_pro: false,
      });
      if (insertError) {
        await supabase.storage.from('gowns').remove([storagePath]);
        throw insertError;
      }
      console.log(`    ✅ Done! ID: ${gownId}\n`);

    } catch (error) {
      console.error(`    ❌ Failed: ${error}\n`);
    }
  }

  console.log('========================================');
  console.log('🎉 Batch 3 Complete!');
}

main();
