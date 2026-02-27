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

  const prompt = `Analyze this photo for a virtual dress try-on application.
Respond ONLY with a JSON object (no markdown, no explanation) with these exact fields:
{
  "personCount": <number of people in the photo, 0 if none>,
  "hasFace": <true if a face is clearly visible, false otherwise>,
  "hasFullBody": <true if full body from head to at least knees is visible, false otherwise>,
  "isStanding": <true if the person appears to be standing upright, false otherwise>,
  "confidence": <0.0 to 1.0 confidence in the analysis>
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
      personCount: analysis.personCount ?? 0,
      hasFace: analysis.hasFace ?? false,
      hasFullBody: analysis.hasFullBody ?? false,
      isStanding: analysis.isStanding ?? false,
      confidence: analysis.confidence ?? 0.5,
    };
  } catch (parseError) {
    console.error('[Gemini] Failed to parse response:', text);
    // Default to allowing the photo if parsing fails
    return {
      personCount: 1,
      hasFace: true,
      hasFullBody: true,
      isStanding: true,
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
    hasFullBody: analysis.hasFullBody,
    isStanding: analysis.isStanding,
    personCount: analysis.personCount,
    hasFace: analysis.hasFace,
    confidence: analysis.confidence,
  };

  // Return specific rejection reasons with helpful tone
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
      reason: 'For best try-on results, please upload a full-body photo (head to feet).',
      details,
    };
  }

  if (!analysis.isStanding) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo of yourself standing.',
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
