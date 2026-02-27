#!/usr/bin/env npx tsx

/**
 * Test Kling with background change via prompt
 * See if Kling can change the background directly
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

const MODEL_IMAGE = 'marketing-assets/tryon-bronwyn.png';

const PARIS_PROMPT = `The woman in the image is standing on a romantic Parisian balcony with the iconic Eiffel Tower visible in the background. She sways gently side to side, her hair moving softly in the breeze, touching her hair with one hand. The dress fabric flows gracefully with her movement.

The setting is golden hour in Paris, warm sunlight casting a romantic glow. Ornate iron balcony railing with white roses. The mood is dreamy and romantic, like a fashion editorial in Paris.

Her expression is serene and happy. The camera is static, capturing her full body and the beautiful Paris backdrop.`;

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background';

async function main() {
  console.log('🗼 Kling Paris Balcony Test');
  console.log('================================\n');

  // Upload image
  console.log('📤 Uploading model image...');
  const imagePath = path.resolve(MODEL_IMAGE);
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  const imageFile = new File([imageBlob], 'model.png', { type: 'image/png' });
  const imageUrl = await fal.storage.upload(imageFile);
  console.log('✓ Uploaded');

  // Call Kling
  console.log('\n🎬 Calling Kling 2.5 Turbo Pro...');
  console.log('   Prompt: Paris balcony + gentle sway');
  console.log('   (This takes 2-3 minutes)\n');

  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
    input: {
      prompt: PARIS_PROMPT,
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

  const outputPath = path.resolve('marketing-assets/bronwyn-paris-video.mp4');
  fs.writeFileSync(outputPath, videoBuffer);

  console.log(`✓ Saved to: ${outputPath}`);
  console.log(`   Size: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n================================');
  console.log('🎉 Done! Check the video.');
}

main().catch(console.error);
