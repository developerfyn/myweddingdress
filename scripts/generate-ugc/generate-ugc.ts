/**
 * DIY UGC Video Generator
 *
 * Replicates MakeUGC-style workflow using direct APIs:
 * 1. Generate avatar image with Flux
 * 2. Generate lip-sync video with Kling LipSync
 *
 * Cost: ~$0.50-1.50 per video (vs $5-10 on MakeUGC)
 *
 * Usage:
 *   npx ts-node scripts/generate-ugc/generate-ugc.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const FAL_KEY = envContent.match(/FAL_KEY=(.+)/)?.[1]?.trim();

if (!FAL_KEY) {
  throw new Error('FAL_KEY not found in .env.local');
}

const FAL_HEADERS = {
  'Authorization': `Key ${FAL_KEY}`,
  'Content-Type': 'application/json',
};

// ============================================
// PERSONA TEMPLATES (like MakeUGC avatars)
// ============================================

interface Persona {
  name: string;
  description: string;
  imagePrompt: string;
  voice: string; // Voice name for AI Avatar API
  videoPrompt: string; // Description for video generation
}

// Available voices: Aria, Roger, Sarah, Laura, Charlie, George, Callum, River,
// Liam, Charlotte, Alice, Matilda, Will, Jessica, Eric, Chris, Brian, Daniel, Lily, Bill

const PERSONAS: Record<string, Persona> = {
  'bride-casual': {
    name: 'Casual Bride',
    description: 'Friendly bride-to-be sharing her experience',
    imagePrompt: 'Candid iPhone photo of a young woman in her late 20s with natural makeup, wearing a cozy cream sweater, sitting in a bright room. Relaxed friendly expression, looking at camera, natural imperfect skin, not a model. Soft natural lighting, upper body portrait, 9:16 vertical.',
    voice: 'Sarah',
    videoPrompt: 'A friendly young woman talking naturally to camera, casual and relaxed, slight hand gestures, warm expression',
  },
  'bride-elegant': {
    name: 'Elegant Bride',
    description: 'Sophisticated bride sharing tips',
    imagePrompt: 'Portrait photo of an elegant woman in her early 30s with subtle makeup, wearing a white blouse, in a bright modern space. Warm confident smile, natural look, professional but approachable. Soft lighting, upper body, 9:16 vertical.',
    voice: 'Charlotte',
    videoPrompt: 'An elegant woman speaking confidently to camera, poised and warm, subtle gestures, professional demeanor',
  },
  'influencer-young': {
    name: 'Young Influencer',
    description: 'Energetic Gen-Z content creator',
    imagePrompt: 'Selfie-style photo of a young woman early 20s with trendy casual outfit, colorful background. Energetic expression, natural skin, relatable look, slight smile. Ring light lighting, close-up portrait, 9:16 vertical.',
    voice: 'Aria',
    videoPrompt: 'An energetic young woman talking excitedly to camera, expressive face, animated gestures, influencer style',
  },
  'mom-supportive': {
    name: 'Supportive Mom',
    description: 'Mother helping daughter find dress',
    imagePrompt: 'Warm portrait of a woman in her 50s with kind eyes, wearing a nice blouse, in a comfortable home setting. Gentle caring smile, natural aging, authentic look. Soft natural lighting, upper body, 9:16 vertical.',
    voice: 'Laura',
    videoPrompt: 'A warm motherly woman speaking gently to camera, caring expression, soft gestures, reassuring tone',
  },
};

// ============================================
// SCRIPT TEMPLATES
// ============================================

interface ScriptTemplate {
  name: string;
  script: string;
  duration: number; // estimated seconds
}

const SCRIPT_TEMPLATES: Record<string, ScriptTemplate> = {
  'app-intro': {
    name: 'App Introduction',
    script: `Oh my gosh, I just found the coolest app for wedding dress shopping! It's called My Wedding Dress, and you can literally try on hundreds of designer gowns virtually. Just upload your photo and see how different dresses look on YOU. I've already found like five favorites!`,
    duration: 15,
  },
  'problem-solution': {
    name: 'Problem-Solution Hook',
    script: `Struggling to decide which wedding dress style suits you? Same! I was so overwhelmed until I found this app. You upload one photo of yourself, and it shows you wearing any dress from their collection. It's like having a fitting room in your phone!`,
    duration: 12,
  },
  'before-after': {
    name: 'Before/After Transformation',
    script: `Okay so I was skeptical about AI try-on apps, but look at this! That's me in a ball gown, that's me in a mermaid dress, and that's me in an A-line. All from one selfie. This is going to save me so many appointments.`,
    duration: 10,
  },
  'testimonial': {
    name: 'User Testimonial',
    script: `I used My Wedding Dress to narrow down my styles before going to bridal shops. It saved me so much time! I knew exactly what silhouettes worked for my body type. Highly recommend for any bride who's feeling overwhelmed.`,
    duration: 12,
  },
};

// ============================================
// API FUNCTIONS
// ============================================

async function generateAvatarImage(persona: Persona, outputPath: string): Promise<string> {
  console.log(`\n📸 Generating avatar image for: ${persona.name}`);

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: FAL_HEADERS,
    body: JSON.stringify({
      prompt: persona.imagePrompt,
      image_size: 'portrait_4_3',
      num_images: 1,
    }),
  });

  const data = await response.json() as any;

  if (!data.images?.[0]?.url) {
    throw new Error(`Failed to generate image: ${JSON.stringify(data)}`);
  }

  const imageUrl = data.images[0].url;
  console.log(`   ✓ Image generated: ${imageUrl}`);

  // Download the image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(imageBuffer));
  console.log(`   ✓ Saved to: ${outputPath}`);

  return imageUrl;
}

async function generateTalkingVideo(
  imageUrl: string,
  script: string,
  voice: string,
  videoPrompt: string,
  outputPath: string
): Promise<string> {
  console.log(`\n🎬 Generating talking avatar video...`);
  console.log(`   Script: "${script.substring(0, 50)}..."`);
  console.log(`   Voice: ${voice}`);

  // Submit to queue - using fal-ai/ai-avatar/single-text
  const queueResponse = await fetch('https://queue.fal.run/fal-ai/ai-avatar/single-text', {
    method: 'POST',
    headers: FAL_HEADERS,
    body: JSON.stringify({
      image_url: imageUrl,
      text_input: script,
      voice: voice,
      prompt: videoPrompt,
      resolution: '720p',
      num_frames: 129, // ~5 seconds at 24fps, max allowed
    }),
  });

  const queueData = await queueResponse.json() as any;
  const requestId = queueData.request_id;

  if (!requestId) {
    throw new Error(`Failed to queue video: ${JSON.stringify(queueData)}`);
  }

  console.log(`   ✓ Queued with ID: ${requestId}`);

  // Poll for completion
  let status = 'IN_QUEUE';

  while (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/ai-avatar/requests/${requestId}/status`,
      { headers: FAL_HEADERS }
    );
    const statusData = await statusResponse.json() as any;
    status = statusData.status;
    console.log(`   ⏳ Status: ${status}`);
  }

  // Get result
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/ai-avatar/requests/${requestId}`,
    { headers: FAL_HEADERS }
  );
  const result = await resultResponse.json() as any;

  if (!result.video?.url) {
    throw new Error(`Failed to generate video: ${JSON.stringify(result)}`);
  }

  const videoUrl = result.video.url;
  console.log(`   ✓ Video generated: ${videoUrl}`);

  // Download the video
  const videoResponse = await fetch(videoUrl);
  const videoBuffer = await videoResponse.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(videoBuffer));
  console.log(`   ✓ Saved to: ${outputPath}`);

  return videoUrl;
}

// ============================================
// MAIN WORKFLOW
// ============================================

interface UGCOptions {
  persona: string;
  script?: string;
  scriptTemplate?: string;
  customScript?: string;
  outputDir?: string;
  outputName?: string;
}

async function generateUGCVideo(options: UGCOptions): Promise<{ imagePath: string; videoPath: string }> {
  const {
    persona: personaKey,
    scriptTemplate: templateKey,
    customScript,
    outputDir = 'marketing-assets/ugc',
    outputName = `ugc-${Date.now()}`,
  } = options;

  // Validate persona
  const persona = PERSONAS[personaKey];
  if (!persona) {
    throw new Error(`Unknown persona: ${personaKey}. Available: ${Object.keys(PERSONAS).join(', ')}`);
  }

  // Get script
  let script: string;
  let duration: number;

  if (customScript) {
    script = customScript;
    duration = Math.ceil(customScript.length / 15); // Rough estimate: 15 chars per second
  } else if (templateKey) {
    const template = SCRIPT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error(`Unknown template: ${templateKey}. Available: ${Object.keys(SCRIPT_TEMPLATES).join(', ')}`);
    }
    script = template.script;
    duration = template.duration;
  } else {
    throw new Error('Must provide either customScript or scriptTemplate');
  }

  // Create output directory
  const fullOutputDir = path.join(__dirname, '../..', outputDir);
  if (!fs.existsSync(fullOutputDir)) {
    fs.mkdirSync(fullOutputDir, { recursive: true });
  }

  const imagePath = path.join(fullOutputDir, `${outputName}-avatar.jpg`);
  const videoPath = path.join(fullOutputDir, `${outputName}-video.mp4`);

  console.log('\n🚀 Starting UGC Video Generation');
  console.log('================================');
  console.log(`Persona: ${persona.name}`);
  console.log(`Script length: ${script.length} chars (~${duration}s)`);
  console.log(`Output: ${outputDir}/${outputName}`);

  // Step 1: Generate avatar
  const imageUrl = await generateAvatarImage(persona, imagePath);

  // Step 2: Generate talking avatar video
  await generateTalkingVideo(imageUrl, script, persona.voice, persona.videoPrompt, videoPath);

  console.log('\n✅ UGC Video Generation Complete!');
  console.log(`   Avatar: ${imagePath}`);
  console.log(`   Video: ${videoPath}`);

  return { imagePath, videoPath };
}

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
DIY UGC Video Generator
========================

Usage:
  npx ts-node scripts/generate-ugc/generate-ugc.ts --persona <name> --template <name>
  npx ts-node scripts/generate-ugc/generate-ugc.ts --persona <name> --script "Your custom script"

Options:
  --persona    Avatar persona (required)
  --template   Script template name
  --script     Custom script text
  --output     Output filename (without extension)
  --dir        Output directory (default: marketing-assets/ugc)

Available Personas:
${Object.entries(PERSONAS).map(([key, p]) => `  ${key.padEnd(20)} - ${p.description}`).join('\n')}

Available Script Templates:
${Object.entries(SCRIPT_TEMPLATES).map(([key, t]) => `  ${key.padEnd(20)} - ${t.name} (~${t.duration}s)`).join('\n')}

Example:
  npx ts-node scripts/generate-ugc/generate-ugc.ts --persona bride-casual --template app-intro
  npx ts-node scripts/generate-ugc/generate-ugc.ts --persona influencer-young --script "OMG this app is amazing!"
    `);
    return;
  }

  // Parse arguments
  const getArg = (name: string): string | undefined => {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : undefined;
  };

  const persona = getArg('persona');
  const template = getArg('template');
  const script = getArg('script');
  const output = getArg('output');
  const dir = getArg('dir');

  if (!persona) {
    console.error('Error: --persona is required');
    process.exit(1);
  }

  if (!template && !script) {
    console.error('Error: Either --template or --script is required');
    process.exit(1);
  }

  try {
    await generateUGCVideo({
      persona,
      scriptTemplate: template,
      customScript: script,
      outputName: output,
      outputDir: dir,
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { generateUGCVideo, PERSONAS, SCRIPT_TEMPLATES };

// Run CLI
main();
