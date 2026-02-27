#!/usr/bin/env npx tsx

/**
 * Generate 5 diverse models in light clothing for try-on
 */

import { fal } from '@fal-ai/client';
import * as fs from 'fs';
import * as path from 'path';

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('Missing FAL_KEY');
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

const OUTPUT_DIR = 'marketing-assets/tryon-models';

const MODELS = [
  {
    name: 'model-caucasian-blonde',
    prompt: `Fashion photography, full body shot from head to feet, beautiful 25 year old Caucasian female model with long blonde hair, tall with healthy athletic feminine figure, natural makeup, standing pose facing camera directly, arms relaxed at sides, soft diffused studio lighting, clean neutral light gray seamless background, professional fashion photography, 8k resolution, photorealistic,

wearing a simple white fitted tank top and beige casual shorts, minimal jewelry, barefoot or simple nude heels, clean and simple look perfect for clothing try-on, no patterns or logos on clothing`,
  },
  {
    name: 'model-asian-dark-hair',
    prompt: `Fashion photography, full body shot from head to feet, beautiful 25 year old East Asian female model with long straight dark hair, tall with healthy athletic feminine figure, natural makeup, standing pose at slight angle to camera, soft diffused studio lighting, clean neutral light gray seamless background, professional fashion photography, 8k resolution, photorealistic,

wearing a simple cream colored fitted tank top and light beige casual shorts, minimal jewelry, barefoot or simple nude heels, clean and simple look perfect for clothing try-on, no patterns or logos on clothing`,
  },
  {
    name: 'model-black-curly-hair',
    prompt: `Fashion photography, full body shot from head to feet, beautiful 25 year old Black African female model with natural curly dark hair, tall with healthy athletic feminine figure, natural makeup, standing pose facing camera directly, confident posture, soft diffused studio lighting, clean neutral light gray seamless background, professional fashion photography, 8k resolution, photorealistic,

wearing a simple light gray fitted tank top and white casual shorts, minimal jewelry, barefoot or simple nude heels, clean and simple look perfect for clothing try-on, no patterns or logos on clothing`,
  },
  {
    name: 'model-latina-brunette',
    prompt: `Fashion photography, full body shot from head to feet, beautiful 25 year old Latina Hispanic female model with long brunette wavy hair, tall with healthy athletic feminine figure, natural makeup, standing pose facing camera directly, relaxed natural posture, soft diffused studio lighting, clean neutral light gray seamless background, professional fashion photography, 8k resolution, photorealistic,

wearing a simple white fitted tank top and cream colored casual shorts, minimal jewelry, barefoot or simple nude heels, clean and simple look perfect for clothing try-on, no patterns or logos on clothing`,
  },
  {
    name: 'model-south-asian',
    prompt: `Fashion photography, full body shot from head to feet, beautiful 25 year old South Asian Indian female model with long dark flowing hair, tall with healthy athletic feminine figure, natural makeup, standing pose facing camera, relaxed elegant posture, soft diffused studio lighting, clean neutral light gray seamless background, professional fashion photography, 8k resolution, photorealistic,

wearing a simple beige fitted tank top and light tan casual shorts, minimal jewelry, barefoot or simple nude heels, clean and simple look perfect for clothing try-on, no patterns or logos on clothing`,
  },
];

async function generateModel(model: typeof MODELS[0], index: number) {
  console.log(`\n🎨 [${index + 1}/5] Generating: ${model.name}`);
  console.log('='.repeat(40));

  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: model.prompt,
      image_size: { width: 768, height: 1152 },
      guidance_scale: 3.5,
      num_images: 1,
      safety_tolerance: '2',
      output_format: 'png',
    } as any,
    logs: false,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✓ Generated in ${duration}s`);

  const imageUrl = (result.data as any).images?.[0]?.url;
  if (!imageUrl) {
    console.error('No image URL in response');
    return;
  }

  // Download
  const response = await fetch(imageUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`📥 Downloaded (${(buffer.length / 1024).toFixed(0)} KB)`);

  // Save
  const outputPath = path.resolve(OUTPUT_DIR, `${model.name}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Saved: ${outputPath}`);
}

async function main() {
  console.log('👗 Generating 5 Try-On Models');
  console.log('=============================');
  console.log('Light clothing for better AI try-on results\n');

  for (let i = 0; i < MODELS.length; i++) {
    await generateModel(MODELS[i], i);
  }

  console.log('\n=============================');
  console.log('🎉 All 5 models generated!');
  console.log(`Check: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
