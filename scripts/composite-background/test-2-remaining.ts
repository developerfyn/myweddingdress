#!/usr/bin/env npx tsx

/**
 * Finish remaining 2 scenes: Cancun, San Juan
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

const MODEL_IMAGE = 'marketing-assets/mod 1/tryon-charlotte.png';

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background, gray background';

const SCENES = [
  {
    name: 'cancun',
    prompt: `The woman in the image is standing on a pristine white sand beach in Cancun, Mexico. She performs a graceful slow spin, her elegant wedding dress flowing dramatically in the Caribbean breeze. Her hair dances in the tropical wind.

The setting is a stunning Caribbean beach with powdery white sand, crystal clear turquoise water, and gentle waves lapping at the shore. Palm trees sway in the background. The sky is bright blue with fluffy white clouds.

Her expression is joyful and carefree, like a tropical paradise dream. The camera is static, capturing her full body and the beautiful Caribbean beach scene.`,
    output: 'marketing-assets/scene-cancun.mp4'
  },
  {
    name: 'san-juan',
    prompt: `The woman in the image is standing on a charming cobblestone street in Old San Juan, Puerto Rico. She performs a graceful slow spin, her elegant wedding dress flowing as she turns. Her hair moves softly.

The setting is the colorful historic streets of Old San Juan with vibrant pastel-colored colonial buildings in pink, yellow, blue, and orange. Wrought iron balconies with flowers. Warm golden hour light illuminates the romantic scene.

Her expression is warm and romantic, enchanted by the colorful surroundings. The camera is static, capturing her full body and the picturesque Puerto Rican streetscape.`,
    output: 'marketing-assets/scene-san-juan.mp4'
  }
];

async function generateVideo(scene: typeof SCENES[0], index: number) {
  console.log(`\n🎬 [${index + 1}/2] Generating: ${scene.name}`);
  console.log('='.repeat(40));

  // Upload image
  console.log('📤 Uploading image...');
  const imageBuffer = fs.readFileSync(MODEL_IMAGE);
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  const imageFile = new File([imageBlob], 'model.png', { type: 'image/png' });
  const imageUrl = await fal.storage.upload(imageFile);
  console.log('✓ Uploaded');

  // Call Kling
  console.log('🔄 Processing with Kling...');
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
    input: {
      prompt: scene.prompt,
      image_url: imageUrl,
      duration: '5',
      negative_prompt: NEGATIVE_PROMPT,
      cfg_scale: 0.5,
    },
    logs: false,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✓ Completed in ${duration}s`);

  // Get video URL
  const videoUrl = (result.data as any).video?.url;
  if (!videoUrl) {
    console.error('No video URL in response');
    return;
  }

  // Download video
  console.log('📥 Downloading...');
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  const outputPath = path.resolve(scene.output);
  fs.writeFileSync(outputPath, videoBuffer);

  console.log(`✓ Saved: ${scene.output} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  console.log('🏖️ Generating remaining 2 videos');
  console.log('=================================');
  console.log('4. Cancun, Mexico');
  console.log('5. San Juan, Puerto Rico');

  for (let i = 0; i < SCENES.length; i++) {
    await generateVideo(SCENES[i], i);
  }

  console.log('\n=================================');
  console.log('🎉 Done!');
}

main().catch(console.error);
