/**
 * Application-wide constants
 * Centralized location for magic numbers and configuration values
 */

// =============================================================================
// TIME CONSTANTS (in milliseconds unless noted)
// =============================================================================

export const TIME = {
  // Seconds
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// =============================================================================
// STORAGE SIGNED URL EXPIRATION (in seconds - Supabase uses seconds)
// =============================================================================

export const STORAGE_URL_EXPIRATION = {
  // Short-lived URLs (for temporary downloads)
  DOWNLOAD: 60, // 1 minute - for immediate file downloads

  // Medium-lived URLs (for viewing in sessions)
  SESSION: 3600, // 1 hour - for viewing files during a session

  // Long-lived URLs (for documents that need extended access)
  DOCUMENT: 86400, // 24 hours - for documents shared via email/links

  // Extended URLs (for PDFs that might be stored in records)
  PDF_RECORD: 604800, // 7 days - for generated PDF records (check-in/out, reports)

  // Legacy value (DO NOT USE - kept for reference)
  // 315360000 = 10 years - This is too long and poses security risks
  LEGACY_LONG: 315360000,
} as const;

// =============================================================================
// CACHE CONTROL HEADERS (in seconds)
// =============================================================================

export const CACHE_CONTROL = {
  // Images and static media
  MEDIA: '86400', // 24 hours (1 day)

  // Standard uploads
  DEFAULT: '3600', // 1 hour

  // Frequently changing content
  SHORT: '300', // 5 minutes

  // Immutable content (versioned assets)
  IMMUTABLE: '31536000', // 1 year
} as const;

// =============================================================================
// FILE SIZE LIMITS (in bytes)
// =============================================================================

export const FILE_SIZE = {
  // Maximum file sizes
  MAX_IMAGE: 10 * 1024 * 1024, // 10MB
  MAX_DOCUMENT: 25 * 1024 * 1024, // 25MB
  MAX_PDF: 50 * 1024 * 1024, // 50MB
  MAX_VIDEO: 100 * 1024 * 1024, // 100MB

  // Warning thresholds
  LARGE_FILE_WARNING: 5 * 1024 * 1024, // 5MB - Show warning

  // Helper function to format bytes
  formatBytes: (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
} as const;

// =============================================================================
// SESSION & AUTH CONSTANTS
// =============================================================================

export const SESSION = {
  // Session timeout durations
  IDLE_WARNING_TIME: 5 * 60 * 1000, // 5 minutes before session expires, show warning
  IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes of inactivity

  // Token refresh
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // 5 minutes before token expiry, refresh

  // Auto-save intervals
  FORM_AUTOSAVE_INTERVAL: 30 * 1000, // 30 seconds
  STATE_PERSISTENCE_INTERVAL: 60 * 1000, // 1 minute
} as const;

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const UI = {
  // Toast/notification durations
  TOAST_DURATION: {
    SUCCESS: 3000, // 3 seconds
    ERROR: 5000, // 5 seconds
    WARNING: 4000, // 4 seconds
    INFO: 3000, // 3 seconds
  },

  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300, // 300ms for search inputs
    SCROLL: 100, // 100ms for scroll handlers
    RESIZE: 200, // 200ms for resize handlers
    FORM_SAVE: 1000, // 1 second for form auto-save
  },

  // Animation durations
  ANIMATION: {
    FAST: 150, // Fast transitions
    NORMAL: 300, // Normal transitions
    SLOW: 500, // Slow transitions
  },

  // Loading states
  LOADING: {
    SKELETON_DELAY: 500, // Show skeleton after 500ms
    SPINNER_DELAY: 200, // Show spinner after 200ms
    PROGRESS_RESET_DELAY: 2000, // Reset progress indicator after 2s
  },
} as const;

// =============================================================================
// PAGINATION CONSTANTS
// =============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 100, // pixels from bottom to trigger load

  // Common page size options
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
} as const;

// =============================================================================
// API & NETWORK CONSTANTS
// =============================================================================

export const NETWORK = {
  // Request timeouts
  REQUEST_TIMEOUT: 30 * 1000, // 30 seconds
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes for uploads

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second base delay
  RETRY_DELAY_MAX: 30 * 1000, // 30 seconds max delay

  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: 5, // failures before opening
  CIRCUIT_BREAKER_TIMEOUT: 60 * 1000, // 1 minute before retry
} as const;

// =============================================================================
// ERROR TRACKING CONSTANTS
// =============================================================================

export const ERROR_TRACKING = {
  MAX_STORED_ERRORS: 100,
  BATCH_SIZE: 10,
  FLUSH_INTERVAL: 30 * 1000, // 30 seconds
} as const;

// =============================================================================
// DOCUMENT EXPIRATION ALERTS
// =============================================================================

export const DOCUMENT_ALERTS = {
  // Days before expiration to show alerts
  WARNING_DAYS: 30,
  CRITICAL_DAYS: 7,
  EXPIRED_GRACE_DAYS: 0,

  // Badge/notification thresholds
  SHOW_BADGE_THRESHOLD: 0, // Show badge when count > 0
} as const;

// =============================================================================
// CACHE TIME HELPERS (for React Query staleTime/gcTime)
// =============================================================================

export const CACHE_TIME = {
  // Query stale times
  REALTIME: 0, // Immediately stale (rely on subscriptions)
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  STATIC: 24 * 60 * 60 * 1000, // 24 hours

  // Garbage collection times (should be longer than stale times)
  GC_SHORT: 5 * 60 * 1000, // 5 minutes
  GC_MEDIUM: 30 * 60 * 1000, // 30 minutes
  GC_LONG: 2 * 60 * 60 * 1000, // 2 hours
  GC_STATIC: 48 * 60 * 60 * 1000, // 48 hours
} as const;

// =============================================================================
// IMAGE PROCESSING CONSTANTS
// =============================================================================

export const IMAGE = {
  // Compression settings
  JPEG_QUALITY: 0.8,
  WEBP_QUALITY: 0.85,

  // Thumbnail dimensions
  THUMBNAIL_SIZE: 150,
  PREVIEW_SIZE: 400,
  FULL_SIZE: 1200,

  // Max dimensions for upload
  MAX_WIDTH: 4096,
  MAX_HEIGHT: 4096,
} as const;

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION = {
  // String lengths
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_NOTES_LENGTH: 10000,

  // Phone/email patterns
  PHONE_MIN_LENGTH: 7,
  PHONE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 254,
} as const;

// =============================================================================
// EXPORT ALL CONSTANTS
// =============================================================================

export const APP_CONSTANTS = {
  TIME,
  STORAGE_URL_EXPIRATION,
  CACHE_CONTROL,
  FILE_SIZE,
  SESSION,
  UI,
  PAGINATION,
  NETWORK,
  ERROR_TRACKING,
  DOCUMENT_ALERTS,
  CACHE_TIME,
  IMAGE,
  VALIDATION,
} as const;

export default APP_CONSTANTS;
