/**
 * File Upload Validation Utility
 * Provides security checks for file uploads to prevent malicious files
 * and ensure only allowed file types and sizes are accepted
 */

// ============================================
// FILE TYPE CONFIGURATIONS
// ============================================

export const ALLOWED_FILE_TYPES = {
  // Images
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Images (JPG, PNG, GIF, WebP, BMP, SVG)',
  },

  // Documents
  DOCUMENT: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Documents (PDF, Word, Excel, Text, CSV)',
  },

  // Videos
  VIDEO: {
    extensions: ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'],
    mimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/webm',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Videos (MP4, MOV, AVI, WMV, FLV, WebM)',
  },

  // Archives
  ARCHIVE: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'Archives (ZIP, RAR, 7Z, TAR, GZ)',
  },

  // Issue Photos (specific to issue management)
  ISSUE_PHOTO: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Issue Photos (JPG, PNG, WebP)',
  },

  // Property Images (specific to property management)
  PROPERTY_IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    description: 'Property Images (JPG, PNG, WebP)',
  },

  // Job Attachments (any reasonable file type)
  JOB_ATTACHMENT: {
    extensions: [
      '.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx',
      '.xls', '.xlsx', '.txt', '.csv'
    ],
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Job Attachments (Images, PDF, Office Documents)',
  },
} as const;

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  file: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

export type FileCategory = keyof typeof ALLOWED_FILE_TYPES;

// ============================================
// DANGEROUS FILE PATTERNS
// ============================================

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.dll', '.so', '.dylib',
  '.app', '.deb', '.rpm', '.msi', '.dmg', '.pkg', '.vbs', '.js',
  '.jar', '.war', '.ear', '.class', '.py', '.rb', '.php', '.asp',
  '.aspx', '.jsp', '.cgi', '.pl', '.scr', '.com', '.pif', '.application',
];

const DANGEROUS_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'text/x-python',
  'text/x-php',
  'application/x-php',
];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]*$/);
  return match ? match[0].toLowerCase() : '';
}

/**
 * Validate file against dangerous patterns
 */
function checkForDangerousFile(file: File): string[] {
  const errors: string[] = [];
  const extension = getFileExtension(file.name);

  // Check dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    errors.push(
      `Dangerous file type detected: ${extension}. Executable files are not allowed for security reasons.`
    );
  }

  // Check dangerous MIME types
  if (DANGEROUS_MIME_TYPES.includes(file.type)) {
    errors.push(
      `Dangerous file type detected: ${file.type}. Executable files are not allowed for security reasons.`
    );
  }

  // Check for double extensions (e.g., .pdf.exe)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const secondToLast = `.${parts[parts.length - 2].toLowerCase()}`;
    if (DANGEROUS_EXTENSIONS.includes(secondToLast)) {
      errors.push(
        `Suspicious file name detected. File appears to have a hidden executable extension.`
      );
    }
  }

  return errors;
}

/**
 * Validate file size
 */
function validateFileSize(file: File, maxSize: number): string | null {
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `File size (${fileSizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`;
  }
  return null;
}

/**
 * Validate file extension
 */
function validateFileExtension(
  file: File,
  allowedExtensions: string[]
): string | null {
  const extension = getFileExtension(file.name);

  if (!extension) {
    return 'File has no extension. Please upload a file with a valid extension.';
  }

  if (!allowedExtensions.includes(extension)) {
    return `File type ${extension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`;
  }

  return null;
}

/**
 * Validate file MIME type
 */
function validateMimeType(
  file: File,
  allowedMimeTypes: string[]
): string | null {
  if (!file.type) {
    return 'File MIME type could not be determined. The file may be corrupted.';
  }

  if (!allowedMimeTypes.includes(file.type)) {
    return `File MIME type ${file.type} is not allowed. This may indicate a file type mismatch.`;
  }

  return null;
}

/**
 * Check for null bytes in filename (directory traversal attack)
 */
function validateFileName(filename: string): string[] {
  const errors: string[] = [];

  // Check for null bytes
  if (filename.includes('\0')) {
    errors.push('File name contains null bytes. This is not allowed.');
  }

  // Check for directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('File name contains path separators. Only simple file names are allowed.');
  }

  // Check for excessively long filenames
  if (filename.length > 255) {
    errors.push('File name is too long. Maximum length is 255 characters.');
  }

  // Check for special characters
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(filename)) {
    errors.push('File name contains invalid characters: < > : " | ? *');
  }

  return errors;
}

/**
 * Perform basic image header validation (magic number check)
 */
function validateImageHeader(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null); // Not an image, skip check
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 4);
      let header = '';
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // Check magic numbers for common image formats
      const magicNumbers: Record<string, string[]> = {
        'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', 'ffd8ffe3', 'ffd8ffe8'],
        'image/png': ['89504e47'],
        'image/gif': ['47494638'],
        'image/webp': ['52494646'], // RIFF header
        'image/bmp': ['424d'],
      };

      const expectedHeaders = magicNumbers[file.type];
      if (expectedHeaders && !expectedHeaders.some(h => header.startsWith(h))) {
        resolve(
          `Image file header does not match declared type ${file.type}. File may be corrupted or misidentified.`
        );
      } else {
        resolve(null);
      }
    };

    reader.onerror = () => {
      resolve('Could not read file header for validation.');
    };

    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate a file upload
 *
 * @param file - The file to validate
 * @param category - The file category (IMAGE, DOCUMENT, etc.)
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const result = await validateFile(file, 'ISSUE_PHOTO');
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 *   return;
 * }
 * // Proceed with upload
 * ```
 */
export async function validateFile(
  file: File,
  category: FileCategory
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = ALLOWED_FILE_TYPES[category];
  const extension = getFileExtension(file.name);

  console.log(`🔍 Validating file: ${file.name} (${category})`);

  // 1. Check for dangerous files (highest priority)
  const dangerousErrors = checkForDangerousFile(file);
  errors.push(...dangerousErrors);

  // If dangerous, stop immediately
  if (dangerousErrors.length > 0) {
    console.error('❌ Dangerous file detected:', dangerousErrors);
    return {
      isValid: false,
      errors,
      warnings,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        extension,
      },
    };
  }

  // 2. Validate file name
  const fileNameErrors = validateFileName(file.name);
  errors.push(...fileNameErrors);

  // 3. Validate file size
  const sizeError = validateFileSize(file, config.maxSize);
  if (sizeError) errors.push(sizeError);

  // 4. Validate file extension
  const extensionError = validateFileExtension(file, config.extensions);
  if (extensionError) errors.push(extensionError);

  // 5. Validate MIME type
  const mimeError = validateMimeType(file, config.mimeTypes);
  if (mimeError) warnings.push(mimeError); // Warning, not error (can be spoofed)

  // 6. Validate image header (for images only)
  if (file.type.startsWith('image/')) {
    const headerError = await validateImageHeader(file);
    if (headerError) warnings.push(headerError);
  }

  // 7. Additional warnings

  // Warn about very small files (possible corruption or empty files)
  if (file.size < 100) {
    warnings.push('File is very small (< 100 bytes). It may be corrupted or empty.');
  }

  // Warn about files approaching size limit
  if (file.size > config.maxSize * 0.9) {
    warnings.push(
      'File is close to the maximum size limit. Consider compressing it for faster uploads.'
    );
  }

  const isValid = errors.length === 0;

  if (isValid) {
    console.log('✅ File validation passed');
  } else {
    console.error('❌ File validation failed:', errors);
  }

  if (warnings.length > 0) {
    console.warn('⚠️ File validation warnings:', warnings);
  }

  return {
    isValid,
    errors,
    warnings,
    file: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
    },
  };
}

/**
 * Validate multiple files
 *
 * @param files - Array of files to validate
 * @param category - The file category
 * @returns Array of validation results
 *
 * @example
 * ```typescript
 * const results = await validateFiles(files, 'PROPERTY_IMAGE');
 * const allValid = results.every(r => r.isValid);
 * ```
 */
export async function validateFiles(
  files: File[],
  category: FileCategory
): Promise<FileValidationResult[]> {
  console.log(`🔍 Validating ${files.length} files as ${category}`);

  const results = await Promise.all(
    files.map((file) => validateFile(file, category))
  );

  const validCount = results.filter((r) => r.isValid).length;
  console.log(`✅ ${validCount}/${files.length} files passed validation`);

  return results;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get allowed file types description for UI display
 */
export function getAllowedTypesDescription(category: FileCategory): string {
  return ALLOWED_FILE_TYPES[category].description;
}

/**
 * Get max file size for a category
 */
export function getMaxFileSize(category: FileCategory): number {
  return ALLOWED_FILE_TYPES[category].maxSize;
}
