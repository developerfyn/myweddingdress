#!/usr/bin/env npx tsx

import { fal } from '@fal-ai/client';
import { createClient } from '@supabase/supabase-js';
import { GOWN_NAMES, getStyleTags } from './config.ts';

const FAL_KEY = process.env.FAL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!FAL_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing environment variables');
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BASE = `Professional bridal catalog photography. FRONT VIEW ONLY. Model standing directly facing camera, looking straight ahead. Full frontal view from head to floor. Body centered, facing forward. Pure white/ivory wedding dress in minimalist studio with soft grey backdrop. Professional lighting, magazine quality. CRITICAL: Direct front-facing view for virtual try-on.`;

const GOWNS = [
  {
    neckline: 'strapless', silhouette: 'Ball Gown', sleeve: 'Sleeveless', train: 'Cathedral', 
    fabric: 'Satin', aesthetic: 'Classic',
    prompt: `${BASE} Strapless straight-across neckline with visible front lace-up corset detail with grommets and ribbon lacing down center front bodice, dramatic ball gown with fitted corset bodice and voluminous full skirt, sleeveless, cathedral train, luxurious satin with crisp structure, classic elegant style with romantic corset detail. FRONT VIEW.`
  },
  {
    neckline: 'off-shoulder', silhouette: 'Mermaid', sleeve: 'Off-Shoulder Drape', train: 'Cathedral',
    fabric: 'Glitter/Sequin', aesthetic: 'Glamorous',
    prompt: `${BASE} Off-shoulder neckline with draped sleeves framing shoulders, mermaid silhouette hugging body and flaring at knee, off-shoulder drape sleeves, cathedral train, glamorous glitter tulle with sparkling sequin embellishments throughout creating dramatic sparkle, sheer elements with beaded vertical lines, red-carpet glamorous style. FRONT VIEW.`
  },
  {
    neckline: 'sweetheart', silhouette: 'A-Line', sleeve: 'Cap Sleeve', train: 'Chapel',
    fabric: 'Mixed', aesthetic: 'Vintage',
    prompt: `${BASE} Sweetheart neckline with delicate cap sleeves, A-line flaring from waist, cap sleeves covering shoulders, chapel train, mixed fabric with intricate gold metallic lace embroidery over tulle creating ornate vintage pattern on bodice and sleeves, champagne/ivory color, vintage-inspired style with ornate embellishments. FRONT VIEW.`
  },
  {
    neckline: 'strapless', silhouette: 'Mermaid', sleeve: 'Sleeveless', train: 'Court',
    fabric: 'Satin', aesthetic: 'Sexy/Bold',
    prompt: `${BASE} Strapless straight neckline, mermaid fitted through hips with structured peplum detail at hip creating architectural silhouette, sleeveless, court train, luxurious satin with luminous sheen, modern sexy style with bold peplum flare and clean lines. FRONT VIEW.`
  },
  {
    neckline: 'strapless', silhouette: 'Sheath', sleeve: 'Sleeveless', train: 'Cathedral',
    fabric: 'Crepe', aesthetic: 'Modern',
    prompt: `${BASE} Strapless straight neckline, sleek sheath column following body line, sleeveless, dramatic cathedral train, modern crepe with flowing attached cape draping from shoulders creating ethereal effect, minimalist modern design with architectural cape detail. FRONT VIEW.`
  },
  {
    neckline: 'off-shoulder', silhouette: 'Sheath', sleeve: 'Off-Shoulder Drape', train: 'Sweep',
    fabric: 'Crepe', aesthetic: 'Modern',
    prompt: `${BASE} Asymmetric one-shoulder neckline with draped fabric across one shoulder, sleek sheath column silhouette, off-shoulder drape on one side, sweep train, modern crepe with clean lines and asymmetric draping detail, contemporary minimalist style. FRONT VIEW.`
  },
  {
    neckline: 'off-shoulder', silhouette: 'Sheath', sleeve: 'Off-Shoulder Drape', train: 'Sweep',
    fabric: 'Satin', aesthetic: 'Modern',
    prompt: `${BASE} Asymmetric one-shoulder neckline with dramatic cape sleeve draping from one shoulder, fitted sheath column, off-shoulder cape drape, sweep train, luxurious satin with flowing cape creating elegant movement, modern sophisticated style in pure white. FRONT VIEW.`
  },
  {
    neckline: 'sweetheart', silhouette: 'Mermaid', sleeve: 'Sleeveless', train: 'Chapel',
    fabric: 'Mixed', aesthetic: 'Romantic',
    prompt: `${BASE} Sweetheart neckline with delicate lace applique bodice, mermaid hugging body flaring at knee, sleeveless, chapel train, mixed fabric with intricate lace bodice and smooth crepe skirt, romantic style with feminine lace details and flowing skirt. FRONT VIEW.`
  },
  {
    neckline: 'strapless', silhouette: 'Sheath', sleeve: 'Sleeveless', train: 'Detachable',
    fabric: 'Glitter/Sequin', aesthetic: 'Glamorous',
    prompt: `${BASE} Strapless straight neckline, fitted sheath column covered in sparkle, sleeveless, detachable overskirt train with champagne satin sash wrap at waist, glamorous glitter tulle with all-over sequin embellishments creating dramatic sparkle, detachable cathedral train overlay. FRONT VIEW.`
  },
];

async function fetchNecklineId(slug: string): Promise<string> {
  const { data } = await supabase.from('necklines').select('id').eq('slug', slug).single();
  return data!.id;
}

function randomName(used: Set<string>): string {
  let n: string;
  do { n = GOWN_NAMES[Math.floor(Math.random() * GOWN_NAMES.length)]; } 
  while (used.has(n) && used.size < GOWN_NAMES.length);
  return n;
}

async function gen(g: typeof GOWNS[0], i: number, used: Set<string>, necklineIds: Map<string, string>) {
  const id = crypto.randomUUID();
  const name = randomName(used);
  used.add(name);

  console.log(`\n[${i+1}/9] ${name} (FRONT VIEW)`);
  console.log(`  ${g.neckline} | ${g.silhouette} | ${g.sleeve} | ${g.train} | ${g.fabric} | ${g.aesthetic}`);

  try {
    console.log(`  Generating...`);
    const r = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: { prompt: g.prompt, image_size: { width: 768, height: 1024 }, 
               guidance_scale: 3.5, num_images: 1, safety_tolerance: '2', output_format: 'png' } as any,
      logs: false,
    });

    const url = (r.data as any).images?.[0]?.url;
    if (!url) throw new Error('No image');

    const imgResp = await fetch(url);
    const buf = await imgResp.arrayBuffer();

    const path = `${g.neckline}/${id}.png`;
    await supabase.storage.from('gowns').upload(path, buf, { contentType: 'image/png', cacheControl: '31536000' });

    const { data: urlData } = supabase.storage.from('gowns').getPublicUrl(path);
    const tags = getStyleTags(g.fabric, g.aesthetic, g.silhouette);

    await supabase.from('gowns').insert({
      id, name, neckline_id: necklineIds.get(g.neckline)!, image_url: urlData.publicUrl,
      image_path: path, style_tags: tags, silhouette: g.silhouette, sleeve_style: g.sleeve,
      train_length: g.train, fabric: g.fabric, aesthetic: g.aesthetic, ai_prompt: g.prompt, is_pro: false,
    });

    console.log(`  ✓ ${id}`);
    return { success: true, name, id };
  } catch (e: any) {
    console.error(`  ✗ ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('🎀 Generating 9 Wedding Gowns (FRONT VIEW)\n');

  // Fetch all neckline IDs
  const necklineIds = new Map<string, string>();
  for (const slug of ['strapless', 'off-shoulder', 'sweetheart']) {
    necklineIds.set(slug, await fetchNecklineId(slug));
  }

  const used = new Set<string>();
  const results = [];

  for (let i = 0; i < GOWNS.length; i++) {
    const r = await gen(GOWNS[i], i, used, necklineIds);
    results.push(r);
    if (i < GOWNS.length - 1) {
      console.log(`\n  Waiting 2s...`);
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Complete');
  const ok = results.filter(r => r.success);
  console.log(`✓ ${ok.length} successful`);
  ok.forEach(r => console.log(`  - ${r.name}`));
  console.log('='.repeat(50));
}

main().catch(e => { console.error(e); process.exit(1); });
