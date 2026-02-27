/**
 * Photo validation using Google Cloud Vision API
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

interface VisionApiResponse {
  responses: Array<{
    labelAnnotations?: Array<{ description?: string; score?: number }>;
    faceAnnotations?: Array<{ boundingPoly?: { vertices?: Array<{ x?: number; y?: number }> } }>;
    localizedObjectAnnotations?: Array<{
      name?: string;
      score?: number;
      boundingPoly?: {
        normalizedVertices?: Array<{ x?: number; y?: number }>;
      };
    }>;
    error?: { message?: string };
  }>;
}

// Call Vision API with API key
async function callVisionApi(
  imageBase64: string,
  features: Array<{ type: string; maxResults?: number }>
): Promise<VisionApiResponse> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error: ${error}`);
  }

  return response.json();
}

/**
 * Validate a photo for try-on suitability using Google Vision API
 */
export async function validatePhotoForTryOn(
  imageBase64: string
): Promise<PhotoValidationResult> {
  // Call Vision API with all needed features in one request
  const response = await callVisionApi(imageBase64, [
    { type: 'LABEL_DETECTION', maxResults: 20 },
    { type: 'FACE_DETECTION', maxResults: 5 },
    { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
  ]);

  const result = response.responses[0];

  if (result.error) {
    throw new Error(result.error.message || 'Vision API error');
  }

  const labels = result.labelAnnotations || [];
  const faces = result.faceAnnotations || [];
  const objects = result.localizedObjectAnnotations || [];

  // Check for full body indicators
  const labelDescriptions = labels.map((l) => l.description?.toLowerCase() || '');
  const hasPersonLabel = labelDescriptions.some((l) =>
    ['person', 'human', 'woman', 'man', 'people'].includes(l)
  );
  const hasStandingIndicators = labelDescriptions.some((l) =>
    ['standing', 'posing', 'fashion', 'portrait', 'full body'].includes(l)
  );

  // Count people from object detection
  const personObjects = objects.filter(
    (obj) => obj.name?.toLowerCase() === 'person'
  );
  const personCount = personObjects.length;

  // Check if person takes up significant portion of image (indicating full body)
  let hasFullBody = false;
  let confidence = 0;

  if (personObjects.length === 1) {
    const person = personObjects[0];
    const vertices = person.boundingPoly?.normalizedVertices || [];

    if (vertices.length >= 4) {
      const minY = Math.min(...vertices.map((v) => v.y || 0));
      const maxY = Math.max(...vertices.map((v) => v.y || 0));
      const height = maxY - minY;

      // Full body typically spans at least 70% of the image height
      // and the person should start near the top (head visible)
      hasFullBody = height >= 0.65 && minY < 0.15;
      confidence = person.score || 0;
    }
  }

  // Check for face
  const hasFace = faces.length >= 1;

  // Determine if standing (based on labels and full body detection)
  const isStanding = hasFullBody && (hasStandingIndicators || hasPersonLabel);

  // Validate all criteria
  const details = {
    hasFullBody,
    isStanding,
    personCount,
    hasFace,
    confidence,
  };

  // Return specific rejection reasons with helpful tone
  if (personCount === 0) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo of yourself.',
      details,
    };
  }

  if (personCount > 1) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a photo with just yourself.',
      details,
    };
  }

  if (!hasFace) {
    return {
      valid: false,
      reason: 'For best try-on results, please make sure your face is visible.',
      details,
    };
  }

  if (!hasFullBody) {
    return {
      valid: false,
      reason: 'For best try-on results, please upload a full-body photo (head to feet).',
      details,
    };
  }

  if (!isStanding) {
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
  const response = await callVisionApi(imageBase64, [
    { type: 'FACE_DETECTION', maxResults: 5 },
    { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
  ]);

  const result = response.responses[0];
  const faces = result.faceAnnotations || [];
  const objects = result.localizedObjectAnnotations || [];

  const hasPerson = objects.some(
    (obj) => obj.name?.toLowerCase() === 'person'
  );
  const hasFace = faces.length >= 1;

  return { hasPerson, hasFace };
}
