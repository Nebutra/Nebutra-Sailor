/**
 * Upload validation utilities
 */

import { logger } from "@nebutra/logger";
import { z } from "zod";
import type { ValidationRules } from "./types.js";

const DEFAULT_RULES: ValidationRules = {
  maxSize: 100 * 1024 * 1024, // 100MB default
  allowedTypes: ["*/*"], // Allow all by default
  blockedExtensions: [
    // Executable files
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js", // Note: JavaScript can be dangerous depending on context
    ".jar",
    ".zip", // Often used to distribute executables
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    // Scripts
    ".sh",
    ".bash",
    ".zsh",
    ".ksh",
    ".csh",
    ".ps1",
    ".psm1",
    ".psd1",
    ".msi",
    ".dll",
    ".so",
    ".dylib",
  ],
};

/**
 * Validation error details
 */
export interface ValidationError {
  code: "size_exceeded" | "type_not_allowed" | "extension_blocked" | "invalid_image";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validate file before upload
 */
export function validateUpload(
  filename: string,
  fileSize: number,
  mimeType: string,
  rules: Partial<ValidationRules> = {},
): ValidationError | null {
  const mergedRules: ValidationRules = {
    ...DEFAULT_RULES,
    ...rules,
  };

  // Check file size
  if (fileSize > mergedRules.maxSize) {
    const maxSizeMB = Math.round(mergedRules.maxSize / (1024 * 1024));
    const fileSizeMB = Math.round(fileSize / (1024 * 1024));
    return {
      code: "size_exceeded",
      message: `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      details: { maxSize: mergedRules.maxSize, fileSize },
    };
  }

  // Check MIME type
  if (mergedRules.allowedTypes.length > 0 && !mergedRules.allowedTypes.includes("*/*")) {
    const isAllowed = mergedRules.allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const [category] = type.split("/");
        const [fileMimeCategory] = mimeType.split("/");
        return fileMimeCategory === category;
      }
      return type === mimeType;
    });

    if (!isAllowed) {
      return {
        code: "type_not_allowed",
        message: `MIME type '${mimeType}' is not allowed. Allowed types: ${mergedRules.allowedTypes.join(", ")}`,
        details: { mimeType, allowedTypes: mergedRules.allowedTypes },
      };
    }
  }

  // Check file extension
  const ext = filename.toLowerCase().split(".").pop();
  if (ext && mergedRules.blockedExtensions.includes(`.${ext}`)) {
    return {
      code: "extension_blocked",
      message: `File extension '.${ext}' is not allowed`,
      details: { extension: ext },
    };
  }

  return null;
}

/**
 * Image validation schema
 */
const ImageDimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  dimensions: { width: number; height: number },
  maxDimensions?: { maxWidth: number; maxHeight: number },
): ValidationError | null {
  try {
    ImageDimensionsSchema.parse(dimensions);
  } catch (error) {
    return {
      code: "invalid_image",
      message: "Invalid image dimensions",
      details: { error: String(error) },
    };
  }

  if (maxDimensions) {
    if (dimensions.width > maxDimensions.maxWidth) {
      return {
        code: "invalid_image",
        message: `Image width (${dimensions.width}px) exceeds maximum (${maxDimensions.maxWidth}px)`,
        details: { width: dimensions.width, maxWidth: maxDimensions.maxWidth },
      };
    }

    if (dimensions.height > maxDimensions.maxHeight) {
      return {
        code: "invalid_image",
        message: `Image height (${dimensions.height}px) exceeds maximum (${maxDimensions.maxHeight}px)`,
        details: { height: dimensions.height, maxHeight: maxDimensions.maxHeight },
      };
    }
  }

  return null;
}

/**
 * Create validation rules for images
 */
export function createImageValidationRules(options?: {
  maxSize?: number;
  maxWidth?: number;
  maxHeight?: number;
}): ValidationRules {
  return {
    maxSize: options?.maxSize ?? 10 * 1024 * 1024, // 10MB default for images
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    blockedExtensions: DEFAULT_RULES.blockedExtensions,
    imageDimensions: {
      maxWidth: options?.maxWidth ?? 4096,
      maxHeight: options?.maxHeight ?? 4096,
    },
  };
}

/**
 * Create validation rules for documents
 */
export function createDocumentValidationRules(options?: { maxSize?: number }): ValidationRules {
  return {
    maxSize: options?.maxSize ?? 50 * 1024 * 1024, // 50MB default for documents
    allowedTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ],
    blockedExtensions: DEFAULT_RULES.blockedExtensions,
  };
}

/**
 * Log validation error
 */
export function logValidationError(error: ValidationError, filename: string): void {
  logger.warn(`Upload validation failed: ${error.message}`, {
    code: error.code,
    filename,
    details: error.details,
  });
}
