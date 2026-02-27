#!/usr/bin/env npx tsx

/**
 * Test 5 romantic scenes: Santorini, Tuscany, Banff, Cancun, San Juan
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

const MODEL_IMAGE = '/Users/fyn/Downloads/f2172f81-1c4f-423f-83fa-4e3a6717c7f1.png';

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background, gray background';

const SCENES = [
  {
    name: 'santorini',
    prompt: `The woman in the image is standing on a beautiful terrace in Santorini, Greece. She performs a graceful slow spin, her elegant wedding dress flowing in the gentle Aegean breeze. Her hair moves softly with the wind.

The setting is iconic Santorini with pristine white-washed buildings and blue domed churches cascading down the cliffside. The deep blue Mediterranean Sea sparkles in the background. Golden hour sunlight bathes everything in warm romantic light.

Her expression is blissful and romantic. The camera is static, capturing her full body and the breathtaking Greek island panorama.`,
    output: 'marketing-assets/scene-santorini.mp4'
  },
  {
    name: 'tuscany',
    prompt: `The woman in the image is standing in a beautiful Tuscan vineyard at sunset. She performs a graceful slow spin, her elegant wedding dress flowing as she turns. Her hair moves gently in the warm Italian breeze.

The setting is rolling Tuscan hills with rows of grapevines, cypress trees in the distance, and a warm golden sunset painting the sky in oranges and pinks. The grass sways gently. An old Italian villa is visible in the distance.

Her expression is serene and romantic, enjoying the peaceful Italian countryside. The camera is static, capturing her full body and the stunning Tuscany landscape.`,
    output: 'marketing-assets/scene-tuscany.mp4'
  },
  {
    name: 'banff',
    prompt: `The woman in the image is standing by the shores of a pristine turquoise lake in Banff, Canada. She performs a graceful slow spin, her elegant wedding dress flowing beautifully. Her hair moves gently in the fresh mountain air.

The setting is the stunning Canadian Rockies with majestic snow-capped mountains reflected in the crystal clear turquoise lake. Pine forests line the shores. The water gently ripples. The sky is clear blue with wispy clouds.

Her expression is peaceful and awestruck by nature's beauty. The camera is static, capturing her full body and the magnificent mountain lake scenery.`,
    output: 'marketing-assets/scene-banff.mp4'
  },
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
  console.log(`\n🎬 [${index + 1}/5] Generating: ${scene.name}`);
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
  console.log('🌍 Generating 5 Romantic Scene Videos');
  console.log('=====================================');
  console.log('1. Santorini, Greece');
  console.log('2. Tuscany, Italy');
  console.log('3. Banff, Canada');
  console.log('4. Cancun, Mexico');
  console.log('5. San Juan, Puerto Rico');
  console.log('\nUsing: White satin ball gown model');

  for (let i = 0; i < SCENES.length; i++) {
    await generateVideo(SCENES[i], i);
  }

  console.log('\n=====================================');
  console.log('🎉 All 5 videos complete!');
  console.log('Check marketing-assets/ folder');
}

main().catch(console.error);
