#!/usr/bin/env npx tsx

/**
 * Test 3 scenes: Fitting Room, Beach Sunset, Grand Ballroom
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

const NEGATIVE_PROMPT = 'blur, distort, low quality, exaggerated movement, face morphing, face change, cartoon, anime, disfigured, deformed, stiff, robotic, multiple people, white background, studio background, gray background';

const SCENES = [
  {
    name: 'fitting-room',
    image: '/Users/fyn/Downloads/998a7eef-4e99-4451-821b-13200d324d62.png',
    prompt: `The woman in the image is standing in a warm, elegant bridal fitting room. She performs a slow, graceful 360-degree turn in place, showcasing every angle of her dress. The dress fabric flows and catches the light as she turns.

The setting is a luxurious bridal boutique with soft curtains, a large ornate mirror visible in the background, warm ambient lighting, and plush carpet. The mood is intimate and personal, like a private bridal appointment.

Her expression is natural and joyful — a genuine smile, like she just found her dress. The camera is static and steady, framing her full body and dress.`,
    output: 'marketing-assets/scene-fitting-room.mp4'
  },
  {
    name: 'beach-sunset',
    image: '/Users/fyn/Downloads/7bee3b84-2ee8-440f-a893-69f26931ec83.png',
    prompt: `The woman in the image is standing on a beautiful beach at sunset. She performs a graceful slow spin, her elegant wedding dress flowing dramatically in the ocean breeze. Her hair moves softly with the wind.

The setting is a pristine beach at golden hour with warm orange and pink sunset colors reflecting on the water. Gentle waves lap at the shore behind her. The sky is painted with beautiful sunset hues.

Her expression is serene and dreamy, enjoying the romantic moment. The camera is static, capturing her full body and the stunning ocean sunset backdrop.`,
    output: 'marketing-assets/scene-beach-sunset.mp4'
  },
  {
    name: 'grand-ballroom',
    image: '/Users/fyn/Downloads/f2172f81-1c4f-423f-83fa-4e3a6717c7f1.png',
    prompt: `The woman in the image is standing in a magnificent grand ballroom. She performs an elegant slow waltz-like spin, her luxurious wedding dress sweeping gracefully across the polished marble floor. The dress catches the light from crystal chandeliers above.

The setting is an opulent ballroom with sparkling crystal chandeliers, tall marble columns, gold accents, and large arched windows. The atmosphere is regal and luxurious, like a fairy tale palace.

Her expression is elegant and poised, like royalty at a grand ball. The camera is static, capturing her full body and the breathtaking ballroom surroundings.`,
    output: 'marketing-assets/scene-grand-ballroom.mp4'
  }
];

async function generateVideo(scene: typeof SCENES[0]) {
  console.log(`\n🎬 Generating: ${scene.name}`);
  console.log('='.repeat(40));

  // Upload image
  console.log('📤 Uploading image...');
  const imageBuffer = fs.readFileSync(scene.image);
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
  console.log('🎥 Generating 3 Scene Videos');
  console.log('============================');
  console.log('1. Fitting Room (blue floral mini)');
  console.log('2. Beach Sunset (white floral ball gown)');
  console.log('3. Grand Ballroom (white satin ball gown)');

  for (const scene of SCENES) {
    await generateVideo(scene);
  }

  console.log('\n============================');
  console.log('🎉 All 3 videos complete!');
  console.log('Check marketing-assets/ folder');
}

main().catch(console.error);
