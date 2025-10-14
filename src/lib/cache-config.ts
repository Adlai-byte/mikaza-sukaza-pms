/**
 * Optimized Cache Configuration for Property Management System
 * Data-type specific caching strategies for optimal performance
 */

export const CACHE_CONFIG = {
  // Static data (rarely changes - amenities, rules, static lookups)
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
    description: 'For amenities, rules, and other static reference data',
  },

  // List views (properties list, users list - moderate update frequency)
  LIST: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    description: 'For list views that update occasionally',
  },

  // Detail views (single property, single user - may update during editing)
  DETAIL: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    description: 'For detail views that might be actively edited',
  },

  // Critical data (financial, bookings - needs to be fresh)
  CRITICAL: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 30 * 60 * 1000, // 30 minutes
    description: 'For financial data, bookings, and other critical information',
  },

  // Real-time data (use Supabase subscriptions instead of polling)
  REALTIME: {
    staleTime: 0, // Always stale, rely on subscriptions
    gcTime: 5 * 60 * 1000, // 5 minutes
    description: 'For data with realtime subscriptions, cache briefly',
  },

  // Images and media (static assets, cache aggressively)
  MEDIA: {
    staleTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    gcTime: 30 * 24 * 60 * 60 * 1000, // 30 days
    description: 'For images and media files',
  },
} as const;

/**
 * Cache configuration by resource type
 * Maps specific resources to their cache strategy
 */
export const RESOURCE_CACHE_MAP = {
  // Properties
  'properties-list': CACHE_CONFIG.LIST,
  'properties-detail': CACHE_CONFIG.DETAIL,
  'properties-images': CACHE_CONFIG.MEDIA,

  // Users
  'users-list': CACHE_CONFIG.LIST,
  'users-detail': CACHE_CONFIG.DETAIL,

  // Financial
  'financial-entries': CACHE_CONFIG.CRITICAL,
  'financial-summary': CACHE_CONFIG.CRITICAL,

  // Bookings
  'bookings': CACHE_CONFIG.CRITICAL,
  'bookings-calendar': CACHE_CONFIG.CRITICAL,

  // Static data
  'amenities': CACHE_CONFIG.STATIC,
  'rules': CACHE_CONFIG.STATIC,

  // Activity logs
  'activity-logs': CACHE_CONFIG.DETAIL,

  // Notes
  'notes': CACHE_CONFIG.DETAIL,
} as const;

/**
 * Get cache configuration for a specific query key
 * @param queryKey - React Query key array
 * @returns Cache configuration object
 */
export function getCacheConfig(queryKey: readonly unknown[]): {
  staleTime: number;
  gcTime: number;
} {
  const [resource, type] = queryKey;

  // Build lookup key
  const lookupKey = type === 'list' || type === 'detail'
    ? `${resource}-${type}`
    : String(resource);

  // Get specific config or default to DETAIL
  const config = RESOURCE_CACHE_MAP[lookupKey as keyof typeof RESOURCE_CACHE_MAP] || CACHE_CONFIG.DETAIL;

  return {
    staleTime: config.staleTime,
    gcTime: config.gcTime,
  };
}

/**
 * Cache invalidation dependency graph
 * When a resource changes, automatically invalidate related resources
 */
export const CACHE_INVALIDATION_RULES = {
  // When a property is updated
  'properties-update': [
    ['properties', 'list'], // Invalidate properties list
    ['properties', 'detail'], // Invalidate all property details
    ['bookings'], // Invalidate bookings (capacity may have changed)
    ['financial-entries'], // Invalidate financial data
  ],

  // When a booking is created/updated
  'bookings-update': [
    ['bookings'], // Invalidate bookings
    ['bookings-calendar'], // Invalidate calendar view
    ['properties', 'detail'], // Property availability changed
    ['financial-entries'], // Financial impact
  ],

  // When a user is updated
  'users-update': [
    ['users', 'list'], // Invalidate users list
    ['users', 'detail'], // Invalidate user details
    ['properties', 'list'], // Owner info may have changed
  ],

  // When financial entry is added
  'financial-update': [
    ['financial-entries'], // Invalidate financial entries
    ['financial-summary'], // Invalidate summary
    ['properties', 'detail'], // Financial status changed
  ],

  // When amenities/rules are updated
  'static-data-update': [
    ['amenities'],
    ['rules'],
    ['properties', 'detail'], // Properties reference these
  ],
} as const;

/**
 * Retry configuration based on error type
 */
export const RETRY_CONFIG = {
  // Don't retry on client errors (4xx)
  shouldRetry: (failureCount: number, error: any) => {
    if (error?.status >= 400 && error?.status < 500) {
      // Client errors - don't retry
      return false;
    }
    if (error?.status === 404 || error?.status === 403) {
      // Not found or forbidden - don't retry
      return false;
    }
    // Retry up to 3 times for server errors or network issues
    return failureCount < 3;
  },

  // Exponential backoff with max 30 seconds
  retryDelay: (attemptIndex: number) => {
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  },
} as const;

/**
 * Network mode configuration
 */
export const NETWORK_CONFIG = {
  // Query network mode
  queries: {
    networkMode: 'online' as const,
    refetchOnWindowFocus: false, // Don't refetch on window focus (too aggressive)
    refetchOnMount: true, // Refetch on component mount if stale
    refetchOnReconnect: true, // Refetch when internet reconnects
  },

  // Mutation network mode
  mutations: {
    networkMode: 'online' as const,
    retry: 2, // Retry mutations twice
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
  },
} as const;

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Cache hit ratio (should be > 70%)
  MIN_CACHE_HIT_RATIO: 0.7,

  // Response time thresholds (milliseconds)
  FAST_RESPONSE: 100, // Cached response
  ACCEPTABLE_RESPONSE: 1000, // Network response
  SLOW_RESPONSE: 3000, // Slow network

  // Memory usage (MB)
  MAX_CACHE_SIZE: 50, // Maximum cache size in memory

  // Prefetch limits
  MAX_PREFETCH_QUEUE: 5, // Maximum items to prefetch at once
  MIN_PREFETCH_CONFIDENCE: 0.85, // Minimum confidence for prefetching
} as const;

/**
 * Cache warming configuration
 * Resources to pre-load on application start
 */
export const CACHE_WARMING_CONFIG = {
  // Critical resources to load immediately on login
  critical: [
    { queryKey: ['properties', 'list'], priority: 1 },
    { queryKey: ['amenities'], priority: 1 },
    { queryKey: ['rules'], priority: 1 },
  ],

  // Important resources to load in background
  important: [
    { queryKey: ['users', 'list'], priority: 2 },
    { queryKey: ['bookings-calendar'], priority: 2 },
  ],

  // Nice-to-have resources (load during idle time)
  optional: [
    { queryKey: ['financial-summary'], priority: 3 },
    { queryKey: ['activity-logs'], priority: 3 },
  ],
} as const;

// Export everything as a single config object for convenience
export const CACHING_STRATEGY = {
  config: CACHE_CONFIG,
  resourceMap: RESOURCE_CACHE_MAP,
  invalidationRules: CACHE_INVALIDATION_RULES,
  retry: RETRY_CONFIG,
  network: NETWORK_CONFIG,
  performance: PERFORMANCE_THRESHOLDS,
  warming: CACHE_WARMING_CONFIG,
  getCacheConfig,
} as const;
