// Prompt templates for generating wedding gown images via Flux Pro
// Now includes all 6 attributes for comprehensive variety

import type { GownCombination } from './combinations.ts';

// Inline types to avoid type-only import issues with --experimental-strip-types
interface NecklineConfig {
  name: string;
  slug: string;
  count: number;
  promptDescription: string;
  id?: string;
}

interface AttributeConfig {
  name: string;
  promptDescription: string;
}

// Base prompt structure for consistent, high-quality wedding dress images
const BASE_PROMPT = `Fashion editorial photograph, full body shot from head to feet showing the entire dress and shoes, beautiful 25 year old Caucasian female model with long flowing hair, tall with healthy athletic feminine figure, natural elegant makeup, standing pose facing camera, soft diffused studio lighting, clean neutral light gray seamless background, high-end bridal magazine editorial style, professional fashion photography, 8k resolution, photorealistic, sharp focus on dress details, must show complete outfit including feet and floor`;

// Model consistency descriptors
const MODEL_DESCRIPTORS = [
  'graceful confident posture',
  'serene elegant expression',
  'classic timeless beauty',
  'poised and sophisticated',
];

export interface GeneratedPrompt {
  prompt: string;
  silhouette: string;
  sleeveStyle: string;
  trainLength: string;
  fabric: string;
  aesthetic: string;
}

/**
 * Get a model descriptor based on index for variety
 */
function getModelDescriptor(index: number): string {
  return MODEL_DESCRIPTORS[index % MODEL_DESCRIPTORS.length];
}

/**
 * Generate a unique prompt for a wedding gown image using all 6 attributes
 */
export function generatePrompt(
  neckline: NecklineConfig,
  combination: GownCombination,
  index: number
): GeneratedPrompt {
  const { silhouette, sleeveStyle, trainLength, fabric, aesthetic } = combination;

  // Build the complete prompt with all 6 attributes
  const prompt = [
    BASE_PROMPT,
    // Neckline
    neckline.promptDescription,
    // Silhouette
    silhouette.promptDescription,
    // Sleeve style
    sleeveStyle.promptDescription,
    // Train length
    trainLength.promptDescription,
    // Fabric
    fabric.promptDescription,
    // Aesthetic/style
    aesthetic.promptDescription,
    // Model and finishing touches
    getModelDescriptor(index),
    'ivory white wedding gown',
    'luxurious bridal fashion',
  ].join(', ');

  return {
    prompt,
    silhouette: silhouette.name,
    sleeveStyle: sleeveStyle.name,
    trainLength: trainLength.name,
    fabric: fabric.name,
    aesthetic: aesthetic.name,
  };
}

/**
 * Generate a test prompt for verification (uses first combination pattern)
 */
export function generateTestPrompt(
  neckline: NecklineConfig,
  combination: GownCombination
): GeneratedPrompt {
  return generatePrompt(neckline, combination, 0);
}

// Negative prompt to avoid common issues (if the model supports it)
export const NEGATIVE_PROMPT = 'blurry, low quality, distorted, deformed, ugly, bad anatomy, bad proportions, duplicate, cropped, out of frame, watermark, signature, text, cartoon, anime, illustration, painting, drawing';

// Image generation settings
export const IMAGE_SETTINGS = {
  width: 768,
  height: 1152, // Taller portrait for guaranteed full-body shots with feet
  num_inference_steps: 28,
  guidance_scale: 3.5,
  num_images: 1,
  enable_safety_checker: true,
  output_format: 'png' as const,
};
