/**
 * Image preprocessing utilities for FASHN Virtual Try-On API
 *
 * The FASHN API adapts output aspect ratio based on input:
 * - Square input → Square output (cuts off long dresses)
 * - Portrait input → Portrait output (shows full-length dresses)
 *
 * This module converts square/landscape person images to portrait
 * orientation by adding padding, ensuring full-length dress visibility.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');

// Target aspect ratio for portrait images (9:16 for full-length gowns with trains)
// This gives maximum vertical space for floor-length dresses
const TARGET_ASPECT_RATIO = 9 / 16; // 0.5625
// Padding color (light gray, similar to studio background)
const PADDING_COLOR = { r: 245, g: 245, b: 245, alpha: 1 };

export interface PreprocessResult {
  image: string; // base64 data URL
  originalWidth: number;
  originalHeight: number;
  newWidth: number;
  newHeight: number;
  wasModified: boolean;
  aspectRatioChange: string;
}

/**
 * Check if an image needs portrait conversion
 * Returns true if the image is square or landscape (width >= height)
 */
export function needsPortraitConversion(width: number, height: number): boolean {
  return width >= height;
}

/**
 * Convert a base64 image to portrait orientation by adding padding
 * This ensures FASHN API outputs portrait results for full-length dress visibility
 *
 * @param base64Image - Base64 data URL (data:image/xxx;base64,...)
 * @returns Preprocessed image as base64 data URL
 */
export async function convertToPortrait(base64Image: string): Promise<PreprocessResult> {
  // Extract base64 data from data URL
  const matches = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }

  const mimeType = matches[1];
  const base64Data = matches[2];
  const inputBuffer = Buffer.from(base64Data, 'base64');

  // Get image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  if (!originalWidth || !originalHeight) {
    throw new Error('Could not determine image dimensions');
  }

  // Check if already portrait (height > width)
  if (originalHeight > originalWidth) {
    return {
      image: base64Image,
      originalWidth,
      originalHeight,
      newWidth: originalWidth,
      newHeight: originalHeight,
      wasModified: false,
      aspectRatioChange: 'none (already portrait)',
    };
  }

  // Calculate new dimensions for 2:3 aspect ratio
  // Keep width, increase height to achieve portrait orientation
  const newWidth = originalWidth;
  const newHeight = Math.round(originalWidth / TARGET_ASPECT_RATIO);

  // Calculate padding (split between top and bottom)
  // More padding at bottom for floor-length gowns with trains
  const totalPadding = newHeight - originalHeight;
  const topPadding = Math.floor(totalPadding * 0.15); // 15% on top
  const bottomPadding = totalPadding - topPadding; // 85% on bottom (for dress train)

  // Process the image with sharp
  const processedBuffer = await sharp(inputBuffer)
    .extend({
      top: topPadding,
      bottom: bottomPadding,
      left: 0,
      right: 0,
      background: PADDING_COLOR,
    })
    .png() // Output as PNG to preserve quality
    .toBuffer();

  // Convert back to base64 data URL
  const processedBase64 = `data:image/png;base64,${processedBuffer.toString('base64')}`;

  return {
    image: processedBase64,
    originalWidth,
    originalHeight,
    newWidth,
    newHeight,
    wasModified: true,
    aspectRatioChange: `${originalWidth}x${originalHeight} → ${newWidth}x${newHeight} (added ${totalPadding}px vertical padding)`,
  };
}

/**
 * Preprocess person image for FASHN Virtual Try-On
 * Converts square/landscape images to portrait for full-length dress results
 */
export async function preprocessPersonImage(base64Image: string): Promise<PreprocessResult> {
  // Handle URL inputs (skip preprocessing)
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    return {
      image: base64Image,
      originalWidth: 0,
      originalHeight: 0,
      newWidth: 0,
      newHeight: 0,
      wasModified: false,
      aspectRatioChange: 'skipped (URL input)',
    };
  }

  return convertToPortrait(base64Image);
}
