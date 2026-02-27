#!/usr/bin/env npx tsx

/**
 * Background Replacement Test
 * 1. Remove background from model image using BiRefNet
 * 2. Composite onto Paris balcony background
 */

import { fal } from '@fal-ai/client';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) {
  console.error('Missing FAL_KEY');
  process.exit(1);
}

fal.config({ credentials: FAL_KEY });

const MODEL_IMAGE = 'marketing-assets/tryon-bronwyn.png';
const BACKGROUND_IMAGE = 'marketing-assets/PARIS TOWER FROM IG.png';
const OUTPUT_IMAGE = 'marketing-assets/bronwyn-paris-composite.png';

async function main() {
  console.log('🎨 Background Replacement Test');
  console.log('================================\n');

  // Step 1: Read and upload model image to FAL
  console.log('📤 Step 1: Uploading model image to FAL.ai...');
  const modelImagePath = path.resolve(MODEL_IMAGE);
  const modelBuffer = fs.readFileSync(modelImagePath);
  const modelBlob = new Blob([modelBuffer], { type: 'image/png' });
  const modelFile = new File([modelBlob], 'model.png', { type: 'image/png' });
  const modelUrl = await fal.storage.upload(modelFile);
  console.log('✓ Uploaded model image');

  // Step 2: Remove background using BiRefNet
  console.log('\n🔮 Step 2: Removing background with BiRefNet v2...');
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/birefnet/v2', {
    input: {
      image_url: modelUrl,
      model: 'General Use (Light)',
      operating_resolution: '1024x1024',
      output_format: 'png',
      refine_foreground: true,
    },
    logs: false,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✓ Background removed in ${duration}s`);

  const transparentUrl = (result.data as any).image?.url;
  if (!transparentUrl) {
    throw new Error('No output image from BiRefNet');
  }

  // Step 3: Download transparent image
  console.log('\n📥 Step 3: Downloading transparent image...');
  const transparentResponse = await fetch(transparentUrl);
  const transparentBuffer = Buffer.from(await transparentResponse.arrayBuffer());
  console.log(`✓ Downloaded (${(transparentBuffer.length / 1024).toFixed(0)} KB)`);

  // Step 4: Load background and get dimensions
  console.log('\n🖼️ Step 4: Loading background image...');
  const backgroundPath = path.resolve(BACKGROUND_IMAGE);
  const backgroundBuffer = fs.readFileSync(backgroundPath);
  const backgroundMeta = await sharp(backgroundBuffer).metadata();
  console.log(`✓ Background: ${backgroundMeta.width}x${backgroundMeta.height}`);

  // Step 5: Resize transparent model to fit background
  console.log('\n📐 Step 5: Resizing and positioning model...');
  const modelMeta = await sharp(transparentBuffer).metadata();
  console.log(`  Model original: ${modelMeta.width}x${modelMeta.height}`);

  // Calculate scaling to fit model nicely in frame
  // Model should be about 90% of background height, but never wider than background
  const bgWidth = backgroundMeta.width || 800;
  const bgHeight = backgroundMeta.height || 1200;

  let targetHeight = Math.round(bgHeight * 0.90);
  let scaleFactor = targetHeight / (modelMeta.height || 1000);
  let targetWidth = Math.round((modelMeta.width || 700) * scaleFactor);

  // If model is too wide, scale based on width instead
  if (targetWidth > bgWidth * 0.95) {
    targetWidth = Math.round(bgWidth * 0.95);
    scaleFactor = targetWidth / (modelMeta.width || 700);
    targetHeight = Math.round((modelMeta.height || 1000) * scaleFactor);
  }

  const resizedModel = await sharp(transparentBuffer)
    .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  console.log(`✓ Resized model to ${targetWidth}x${targetHeight}`);

  // Step 6: Composite model onto background
  console.log('\n🎭 Step 6: Compositing...');

  // Position: center horizontally, align to bottom
  const left = Math.round((bgWidth - targetWidth) / 2);
  const top = Math.max(0, bgHeight - targetHeight);

  const composite = await sharp(backgroundBuffer)
    .composite([
      {
        input: resizedModel,
        left: left,
        top: top,
      },
    ])
    .png()
    .toBuffer();

  // Step 7: Save output
  const outputPath = path.resolve(OUTPUT_IMAGE);
  fs.writeFileSync(outputPath, composite);
  console.log(`✓ Saved to ${OUTPUT_IMAGE}`);

  console.log('\n================================');
  console.log('🎉 SUCCESS!');
  console.log(`Output: ${outputPath}`);
}

main().catch(console.error);
