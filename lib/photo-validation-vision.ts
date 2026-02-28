/**
 * Photo validation using Google Gemini 2.0 Flash API
 * Validates photos for virtual try-on suitability:
 * - Full body visible (head to feet)
 * - Standing pose
 * - Single person only
 * - Face visible
 */

export interface PhotoValidationResult {
  valid: boolean;
  reason?: string;
  details?: {
    isRealPhoto: boolean;
    hasFullBody: boolean;
    isStanding: boolean;
    personCount: number;
    hasFace: boolean;
    confidence: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

interface ValidationAnalysis {
  isRealPhoto: boolean;
  personCount: number;
  hasFace: boolean;
  hasFullBody: boolean;
  isStanding: boolean;
  confidence: number;
}

/**
 * Call Gemini API for image analysis
 */
async function analyzeWithGemini(imageBase64: string): Promise<ValidationAnalysis> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  // Extract mime type from data URL or default to jpeg
  const mimeType = imageBase64.includes('data:')
    ? imageBase64.split(';')[0].split(':')[1]
    : 'image/jpeg';

  const prompt = `Analyze this image for a virtual wedding dress try-on application.

Focus ONLY on the MAIN SUBJECT (the primary person in focus). Ignore people in the background.

Accept:
- Personal photos, professional photos, model photos, influencer photos
- Any upright pose: standing, walking, leaning against something
- Body visible from head to at least mid-thigh (feet don't need to be visible)

Reject ONLY:
- Digital illustrations, drawings, or AI-generated artwork
- Screenshots with app UI or browser chrome
- Sitting or lying down poses

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "isRealPhoto": <true if real photograph of a human, false for illustrations/graphics/UI screenshots>,
  "personCount": <1 if there is a clear main subject in focus, 0 if no person, 2+ only if multiple people are EQUALLY prominent>,
  "hasFace": <true if the main subject's face is visible>,
  "hasFullBody": <true if main subject's body is visible from head to at least mid-thigh>,
  "isStanding": <true if main subject is upright (standing, walking, or leaning are all OK)>,
  "confidence": <0.0 to 1.0>
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gemini] API error:', error);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Gemini API error');
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  }

  try {
    const analysis = JSON.parse(jsonStr) as ValidationAnalysis;
    return {
      isRealPhoto: analysis.isRealPhoto ?? false,
      personCount: analysis.personCount ?? 0,
      hasFace: analysis.hasFace ?? false,
      hasFullBody: analysis.hasFullBody ?? false,
      isStanding: analysis.isStanding ?? false,
      confidence: analysis.confidence ?? 0.5,
    };
  } catch (parseError) {
    console.error('[Gemini] Failed to parse response:', text);
    // Default to rejecting the photo if parsing fails (safer)
    return {
      isRealPhoto: false,
      personCount: 0,
      hasFace: false,
      hasFullBody: false,
      isStanding: false,
      confidence: 0.5,
    };
  }
}

/**
 * Validate a photo for try-on suitability using Gemini 2.0 Flash
 */
export async function validatePhotoForTryOn(
  imageBase64: string
): Promise<PhotoValidationResult> {
  const analysis = await analyzeWithGemini(imageBase64);

  const details = {
    isRealPhoto: analysis.isRealPhoto,
    hasFullBody: analysis.hasFullBody,
    isStanding: analysis.isStanding,
    personCount: analysis.personCount,
    hasFace: analysis.hasFace,
    confidence: analysis.confidence,
  };

  // Return specific rejection reasons with helpful tone
  if (!analysis.isRealPhoto) {
    return {
      valid: false,
      reason: 'Please upload a photo of a real person, not an illustration or graphic.',
      details,
    };
  }

  if (analysis.personCount === 0) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo of yourself.',
      details,
    };
  }

  if (analysis.personCount > 1) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo with just yourself.',
      details,
    };
  }

  if (!analysis.hasFace) {
    return {
      valid: false,
      reason: 'For best try-on results, please make sure your face is visible.',
      details,
    };
  }

  if (!analysis.hasFullBody) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo showing your body from head to at least mid-thigh.',
      details,
    };
  }

  if (!analysis.isStanding) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo where you are standing or walking (not sitting).',
      details,
    };
  }

  return {
    valid: true,
    details,
  };
}

/**
 * Quick validation check - returns true if photo might be valid
 * Used for fast initial filtering before full validation
 */
export async function quickValidatePhoto(
  imageBase64: string
): Promise<{ hasPerson: boolean; hasFace: boolean }> {
  try {
    const analysis = await analyzeWithGemini(imageBase64);
    return {
      hasPerson: analysis.personCount >= 1,
      hasFace: analysis.hasFace,
    };
  } catch {
    // Default to allowing on error
    return { hasPerson: true, hasFace: true };
  }
}
