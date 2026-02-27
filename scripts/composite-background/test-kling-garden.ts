#!/usr/bin/env npx tsx

/**
 * Test Kling - Model in flower garden scene
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

const MODEL_IMAGE = '/Users/fyn/Downloads/e5d4deba-2909-48d7-b70b-82483f25c7c5.png';

const GARDEN_PROMPT = `The woman in the image is standing in a beautiful romantic flower garden filled with roses, peonies, and soft greenery. She performs a graceful slow spin, her elegant wedding dress flowing and catching the sunlight as she turns. Her hair moves gently with the movement.

The setting is a lush garden at golden hour with soft warm sunlight filtering through. Pink and white roses surround her, creating a dreamy romantic atmosphere.

Her expression is joyful and serene, like a bride on her wedding day. The camera is static, capturing her full body and the beautiful floral surroundings.`;

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background, gray background';

async function main() {
  console.log('🌸 Kling Flower Garden Test');
  console.log('================================\n');

  // Upload image
  console.log('📤 Uploading model image...');
  const imageBuffer = fs.readFileSync(MODEL_IMAGE);
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  const imageFile = new File([imageBlob], 'model.png', { type: 'image/png' });
  const imageUrl = await fal.storage.upload(imageFile);
  console.log('✓ Uploaded');

  // Call Kling
  console.log('\n🎬 Calling Kling 2.5 Turbo Pro...');
  console.log('   Prompt: Flower garden + graceful spin');
  console.log('   (This takes 2-3 minutes)\n');

  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
    input: {
      prompt: GARDEN_PROMPT,
      image_url: imageUrl,
      duration: '5',
      negative_prompt: NEGATIVE_PROMPT,
      cfg_scale: 0.5,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_QUEUE') {
        console.log('   📋 In queue...');
      } else if (update.status === 'IN_PROGRESS') {
        console.log('   🔄 Processing...');
      }
    },
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Completed in ${duration}s`);

  // Get video URL
  const videoUrl = (result.data as any).video?.url;
  if (!videoUrl) {
    console.error('No video URL in response');
    console.log('Response:', JSON.stringify(result.data, null, 2));
    return;
  }

  // Download video
  console.log('\n📥 Downloading video...');
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

  const outputPath = path.resolve('marketing-assets/model-garden-video.mp4');
  fs.writeFileSync(outputPath, videoBuffer);

  console.log(`✓ Saved to: ${outputPath}`);
  console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n================================');
  console.log('🎉 Done! Check the video.');
}

main().catch(console.error);
