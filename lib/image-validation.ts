/**
 * Image validation utilities for API routes
 * Validates format, size, and dimensions of uploaded images
 */

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_IMAGE_SIZE = 1000; // 1KB minimum (prevent empty/corrupt images)
const VALID_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MIN_DIMENSION = 256; // Minimum width/height
const MAX_DIMENSION = 4096; // Maximum width/height

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  sizeBytes?: number;
  format?: string;
  width?: number;
  height?: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Parse PNG dimensions from buffer
 */
function parsePngDimensions(buffer: Buffer): ImageDimensions | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  // IHDR chunk starts at byte 8, width at 16, height at 20
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
    return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Parse JPEG dimensions from buffer
 */
function parseJpegDimensions(buffer: Buffer): ImageDimensions | null {
  // JPEG starts with FF D8
  if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF markers (Start of Frame) contain dimensions
    // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
    if (marker >= 0xc0 && marker <= 0xc3) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    // Skip to next marker
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
    } else {
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    }
  }

  return null;
}

/**
 * Parse WebP dimensions from buffer
 */
function parseWebpDimensions(buffer: Buffer): ImageDimensions | null {
  // RIFF....WEBP
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  const chunkType = buffer.toString('ascii', 12, 16);

  if (chunkType === 'VP8 ') {
    // Lossy WebP
    // Frame tag at offset 23, dimensions follow
    if (buffer.length < 30) return null;
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  } else if (chunkType === 'VP8L') {
    // Lossless WebP
    if (buffer.length < 25) return null;
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  } else if (chunkType === 'VP8X') {
    // Extended WebP
    if (buffer.length < 30) return null;
    const width = (buffer.readUIntLE(24, 3) + 1);
    const height = (buffer.readUIntLE(27, 3) + 1);
    return { width, height };
  }

  return null;
}

/**
 * Validate magic bytes match the declared format
 */
function validateMagicBytes(buffer: Buffer, format: string): boolean {
  if (format === 'image/png') {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    return buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
  } else if (format === 'image/jpeg') {
    // JPEG: FF D8 FF
    return buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  } else if (format === 'image/webp') {
    // WebP: RIFF....WEBP
    return buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

/**
 * Get image dimensions from base64 data
 */
export function getImageDimensions(base64: string, format: string): ImageDimensions | null {
  try {
    const base64Data = base64.split(',')[1];
    if (!base64Data) return null;

    // Only decode first 1KB for dimension parsing (headers are at the start)
    const partialBase64 = base64Data.substring(0, 1400); // ~1KB after decoding
    const buffer = Buffer.from(partialBase64, 'base64');

    if (format === 'image/png') {
      return parsePngDimensions(buffer);
    } else if (format === 'image/jpeg') {
      return parseJpegDimensions(buffer);
    } else if (format === 'image/webp') {
      return parseWebpDimensions(buffer);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate a base64-encoded image
 */
export function validateBase64Image(
  base64: string,
  fieldName: string = 'Image'
): ImageValidationResult {
  // Check if it's a data URL
  if (!base64.startsWith('data:')) {
    // Might be a URL, which is fine
    if (base64.startsWith('http://') || base64.startsWith('https://')) {
      return { valid: true };
    }
    return {
      valid: false,
      error: `${fieldName} must be a base64 data URL or HTTP URL`,
    };
  }

  // Extract format from data URL
  const formatMatch = base64.match(/^data:(image\/\w+);base64,/);
  if (!formatMatch) {
    return {
      valid: false,
      error: `${fieldName} has invalid data URL format`,
    };
  }

  const format = formatMatch[1];

  // Check format
  if (!VALID_FORMATS.includes(format)) {
    return {
      valid: false,
      error: `${fieldName} format not supported: ${format}. Use JPEG, PNG, or WebP.`,
    };
  }

  // Calculate size from base64
  const base64Data = base64.split(',')[1];
  if (!base64Data) {
    return {
      valid: false,
      error: `${fieldName} has no data content`,
    };
  }

  // Calculate actual byte size
  const padding = (base64Data.match(/=+$/) || [''])[0].length;
  const sizeBytes = Math.floor((base64Data.length * 3) / 4) - padding;

  // Check minimum size
  if (sizeBytes < MIN_IMAGE_SIZE) {
    return {
      valid: false,
      error: `${fieldName} is too small (${sizeBytes} bytes). Minimum ${MIN_IMAGE_SIZE} bytes.`,
    };
  }

  // Check maximum size
  if (sizeBytes > MAX_IMAGE_SIZE) {
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `${fieldName} is too large (${sizeMB}MB). Maximum 5MB.`,
    };
  }

  // Validate magic bytes match declared format (security check)
  try {
    const headerBase64 = base64Data.substring(0, 20); // First ~15 bytes
    const headerBuffer = Buffer.from(headerBase64, 'base64');
    if (!validateMagicBytes(headerBuffer, format)) {
      return {
        valid: false,
        error: `${fieldName} content does not match declared format (${format}). File may be corrupted or mislabeled.`,
      };
    }
  } catch {
    return {
      valid: false,
      error: `${fieldName} could not be decoded. File may be corrupted.`,
    };
  }

  // Check dimensions (optional but recommended)
  const dimensions = getImageDimensions(base64, format);
  if (dimensions) {
    if (dimensions.width < MIN_DIMENSION || dimensions.height < MIN_DIMENSION) {
      return {
        valid: false,
        error: `${fieldName} dimensions too small (${dimensions.width}x${dimensions.height}). Minimum ${MIN_DIMENSION}x${MIN_DIMENSION}.`,
      };
    }
    if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION) {
      return {
        valid: false,
        error: `${fieldName} dimensions too large (${dimensions.width}x${dimensions.height}). Maximum ${MAX_DIMENSION}x${MAX_DIMENSION}.`,
      };
    }
  }

  return {
    valid: true,
    sizeBytes,
    format,
    width: dimensions?.width,
    height: dimensions?.height,
  };
}

/**
 * Validate multiple images
 */
export function validateImages(
  images: { name: string; data: string }[]
): ImageValidationResult {
  for (const image of images) {
    const result = validateBase64Image(image.data, image.name);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Quick size check without full validation (for logging)
 */
export function getImageSizeKB(base64: string): string {
  if (!base64.includes(',')) {
    return 'unknown';
  }
  const base64Data = base64.split(',')[1];
  const padding = (base64Data.match(/=+$/) || [''])[0].length;
  const sizeBytes = Math.floor((base64Data.length * 3) / 4) - padding;
  return `${(sizeBytes / 1024).toFixed(2)}KB`;
}
