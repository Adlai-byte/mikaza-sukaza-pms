import { QueryClient } from '@tanstack/react-query';

// Advanced cache configuration
export const CACHE_CONFIG = {
  // Cache times in milliseconds
  ULTRA_LONG: 24 * 60 * 60 * 1000, // 24 hours for static data
  LONG: 60 * 60 * 1000, // 1 hour for semi-static data
  MEDIUM: 30 * 60 * 1000, // 30 minutes for dynamic data
  SHORT: 5 * 60 * 1000, // 5 minutes for frequently changing data
  IMMEDIATE: 1 * 60 * 1000, // 1 minute for real-time data

  // Garbage collection times
  GC_ULTRA_LONG: 48 * 60 * 60 * 1000, // 48 hours
  GC_LONG: 24 * 60 * 60 * 1000, // 24 hours
  GC_MEDIUM: 2 * 60 * 60 * 1000, // 2 hours
  GC_SHORT: 30 * 60 * 1000, // 30 minutes
} as const;

// Simple localStorage-based persistence with quota management
const createSimplePersister = () => {
  const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB limit (increased from 4MB)
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

  return {
    persistClient: async (persistedClient: any) => {
      try {
        // Add timestamp to each cached entry
        const timestampedClient = {
          cachedAt: Date.now(),
          queries: persistedClient
        };

        const serialized = JSON.stringify(timestampedClient);

        // Check if cache is too large
        if (serialized.length > MAX_CACHE_SIZE) {
          console.warn('⚠️ Cache too large, clearing to prevent quota errors');
          localStorage.removeItem('mikaza-query-cache');
          return;
        }

        localStorage.setItem('mikaza-query-cache', serialized);
      } catch (error) {
        // Handle quota exceeded error
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('⚠️ LocalStorage quota exceeded, clearing cache');
          localStorage.removeItem('mikaza-query-cache');
        } else {
          console.warn('Failed to persist query cache:', error);
        }
      }
    },
    restoreClient: async () => {
      try {
        const cached = localStorage.getItem('mikaza-query-cache');
        if (!cached) return undefined;

        const parsed = JSON.parse(cached);

        // Check if cache has expired
        const cacheAge = Date.now() - (parsed.cachedAt || 0);
        if (cacheAge > CACHE_TTL) {
          console.log('⏰ Cache expired, clearing old data');
          localStorage.removeItem('mikaza-query-cache');
          return undefined;
        }

        console.log(`✅ Restored cache (age: ${Math.round(cacheAge / 60000)} minutes)`);
        return parsed.queries;
      } catch (error) {
        console.warn('Failed to restore query cache:', error);
        // Clear corrupted cache
        localStorage.removeItem('mikaza-query-cache');
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        localStorage.removeItem('mikaza-query-cache');
      } catch (error) {
        console.warn('Failed to remove query cache:', error);
      }
    },
  };
};

// Advanced query client with simplified persistence
export const createOptimizedQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE_CONFIG.MEDIUM,
        gcTime: CACHE_CONFIG.GC_MEDIUM,
        retry: (failureCount, error: any) => {
          if (error?.status === 404 || error?.status === 403) return false;
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        networkMode: 'online',
        structuralSharing: true,
        placeholderData: (previousData) => previousData,
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        networkMode: 'online',
      },
    },
  });

  // Set up simple persistence
  if (typeof window !== 'undefined') {
    const persister = createSimplePersister();

    // Restore cache on initialization
    persister.restoreClient().then((persistedState) => {
      if (persistedState) {
        queryClient.setQueryData(['cached-state'], persistedState);
      }
    });

    // Persist cache periodically (with selective persistence to reduce size)
    setInterval(() => {
      const state = queryClient.getQueryCache().getAll();
      const persistableQueries = state
        .filter(query => {
          const queryKey = query.queryKey;
          const firstKey = queryKey[0] as string;

          // Only persist list queries, not detail queries
          // Exclude queries with 'detail', 'edit', or specific IDs
          const isListQuery = ['properties', 'users', 'amenities', 'rules'].includes(firstKey);
          const isDetailQuery = queryKey.length > 1 && (
            queryKey.includes('detail') ||
            queryKey.includes('edit') ||
            queryKey.includes('propertyEdit') ||
            typeof queryKey[1] === 'string' && queryKey[1].includes('-') // UUID pattern
          );

          return isListQuery && !isDetailQuery;
        })
        .map(query => ({
          queryKey: query.queryKey,
          data: query.state.data,
          dataUpdatedAt: query.state.dataUpdatedAt,
        }));

      if (persistableQueries.length > 0) {
        // Calculate cache size before persisting
        const timestampedClient = {
          cachedAt: Date.now(),
          queries: persistableQueries
        };
        const serialized = JSON.stringify(timestampedClient);
        const cacheSizeMB = (serialized.length / (1024 * 1024)).toFixed(2);

        console.log(`💾 Persisting ${persistableQueries.length} list queries | Cache size: ${cacheSizeMB} MB / 10 MB`);
        persister.persistClient(persistableQueries);
      }
    }, 30 * 1000); // Every 30 seconds
  }

  return queryClient;
};

// Intelligent prefetching manager
export class PrefetchManager {
  private queryClient: QueryClient;
  private prefetchQueue: Set<string> = new Set();
  private prefetchInProgress: Set<string> = new Set();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupIntersectionObserver();
    this.setupRouteBasedPrefetching();
  }

  // Prefetch related data when user hovers over items
  async prefetchOnHover(queryKey: string[], queryFn: () => Promise<any>) {
    const keyString = JSON.stringify(queryKey);

    if (this.prefetchInProgress.has(keyString) || this.queryClient.getQueryData(queryKey)) {
      return; // Already prefetching or data exists
    }

    this.prefetchInProgress.add(keyString);

    try {
      await this.queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: CACHE_CONFIG.MEDIUM,
      });
    } catch (error) {
      console.warn('Prefetch failed:', error);
    } finally {
      this.prefetchInProgress.delete(keyString);
    }
  }

  // Prefetch property details when property list is visible
  async prefetchPropertyDetails(propertyIds: string[]) {
    for (const propertyId of propertyIds) {
      const queryKey = ['properties', 'detail', propertyId];
      const keyString = JSON.stringify(queryKey);

      if (!this.prefetchInProgress.has(keyString) && !this.queryClient.getQueryData(queryKey)) {
        this.prefetchQueue.add(keyString);
      }
    }

    this.processPrefetchQueue();
  }

  // Process prefetch queue with throttling
  private async processPrefetchQueue() {
    const batch = Array.from(this.prefetchQueue).slice(0, 3); // Process 3 at a time

    for (const keyString of batch) {
      this.prefetchQueue.delete(keyString);
      const queryKey = JSON.parse(keyString);

      if (queryKey[0] === 'properties' && queryKey[1] === 'detail') {
        const propertyId = queryKey[2];
        this.prefetchPropertyDetail(propertyId);
      }
    }
  }

  private async prefetchPropertyDetail(propertyId: string) {
    const queryKey = ['properties', 'detail', propertyId];
    const keyString = JSON.stringify(queryKey);

    if (this.prefetchInProgress.has(keyString)) return;

    this.prefetchInProgress.add(keyString);

    try {
      // This would be the actual fetch function for property details
      await this.queryClient.prefetchQuery({
        queryKey,
        queryFn: () => this.fetchPropertyDetails(propertyId),
        staleTime: CACHE_CONFIG.LONG,
      });
    } catch (error) {
      console.warn('Property detail prefetch failed:', error);
    } finally {
      this.prefetchInProgress.delete(keyString);
    }
  }

  // Placeholder for property details fetch - this should match the actual implementation
  private async fetchPropertyDetails(propertyId: string) {
    // This would be implemented with the actual Supabase query
    console.log('Prefetching property details for:', propertyId);
    return { propertyId };
  }

  // Set up intersection observer for viewport-based prefetching
  private setupIntersectionObserver() {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const propertyId = element.dataset.propertyId;

            if (propertyId) {
              this.prefetchPropertyDetail(propertyId);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start prefetching 100px before element enters viewport
        threshold: 0.1,
      }
    );

    // Store observer for cleanup
    (window as any).__prefetchObserver = observer;
  }

  // Prefetch based on route patterns
  private setupRouteBasedPrefetching() {
    if (typeof window === 'undefined') return;

    // Listen for route changes
    const handleRouteChange = () => {
      const path = window.location.pathname;

      // Prefetch users when navigating to properties (might need owner data)
      if (path === '/properties') {
        this.queryClient.prefetchQuery({
          queryKey: ['users', 'list'],
          staleTime: CACHE_CONFIG.LONG,
        });
      }

      // Prefetch amenities and rules when navigating to property edit
      if (path.includes('/properties/') && path.includes('/edit')) {
        this.queryClient.prefetchQuery({
          queryKey: ['amenities'],
          staleTime: CACHE_CONFIG.ULTRA_LONG,
        });
        this.queryClient.prefetchQuery({
          queryKey: ['rules'],
          staleTime: CACHE_CONFIG.ULTRA_LONG,
        });
      }
    };

    // Listen to popstate events
    window.addEventListener('popstate', handleRouteChange);

    // Store cleanup function
    (window as any).__routePrefetchCleanup = () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }

  // Cleanup function
  cleanup() {
    if (typeof window !== 'undefined') {
      const observer = (window as any).__prefetchObserver;
      if (observer) {
        observer.disconnect();
        delete (window as any).__prefetchObserver;
      }

      const cleanup = (window as any).__routePrefetchCleanup;
      if (cleanup) {
        cleanup();
        delete (window as any).__routePrefetchCleanup;
      }
    }
  }
}

// Optimistic update helpers
export const OptimisticUpdates = {
  // Optimistic property update
  updateProperty: (queryClient: QueryClient, propertyId: string, updates: any) => {
    const queryKey = ['properties', 'list'];

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return oldData.map((property: any) =>
        property.property_id === propertyId
          ? { ...property, ...updates }
          : property
      );
    });
  },

  // Optimistic user update
  updateUser: (queryClient: QueryClient, userId: string, updates: any) => {
    const queryKey = ['users', 'list'];

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;

      return oldData.map((user: any) =>
        user.user_id === userId
          ? { ...user, ...updates }
          : user
      );
    });
  },

  // Optimistic item creation
  addItem: (queryClient: QueryClient, queryKey: string[], newItem: any) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return [newItem];
      return [newItem, ...oldData];
    });
  },

  // Optimistic item deletion
  removeItem: (queryClient: QueryClient, queryKey: string[], itemId: string, idField = 'id') => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      return oldData.filter((item: any) => item[idField] !== itemId);
    });
  },
};

// Background sync manager for offline support
export class BackgroundSyncManager {
  private queryClient: QueryClient;
  private syncQueue: Array<{ queryKey: string[], action: 'refetch' | 'invalidate' }> = [];
  private isOnline = navigator.onLine;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Queue operations when offline
  queueSync(queryKey: string[], action: 'refetch' | 'invalidate' = 'refetch') {
    if (this.isOnline) {
      this.executeSync(queryKey, action);
    } else {
      this.syncQueue.push({ queryKey, action });
    }
  }

  private async executeSync(queryKey: string[], action: 'refetch' | 'invalidate') {
    try {
      if (action === 'refetch') {
        await this.queryClient.refetchQueries({ queryKey });
      } else {
        await this.queryClient.invalidateQueries({ queryKey });
      }
    } catch (error) {
      console.warn('Background sync failed:', error);
    }
  }

  private async processSyncQueue() {
    while (this.syncQueue.length > 0 && this.isOnline) {
      const { queryKey, action } = this.syncQueue.shift()!;
      await this.executeSync(queryKey, action);
    }
  }
}

// Export singleton instances
let prefetchManager: PrefetchManager | null = null;
let backgroundSyncManager: BackgroundSyncManager | null = null;

export const initializeCacheManagers = async (queryClient: QueryClient) => {
  try {
    prefetchManager = new PrefetchManager(queryClient);
    backgroundSyncManager = new BackgroundSyncManager(queryClient);

    // Initialize intelligent prefetcher with dynamic import
    let intelligentPrefetcher = null;
    try {
      const { initializeIntelligentPrefetcher } = await import('./intelligent-prefetcher');
      intelligentPrefetcher = initializeIntelligentPrefetcher(queryClient);
      console.log('✨ Intelligent prefetcher initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize intelligent prefetcher (continuing without it):', error);
      intelligentPrefetcher = null;
    }

    console.log('🎯 Cache managers initialized successfully');
    return { prefetchManager, backgroundSyncManager, intelligentPrefetcher };
  } catch (error) {
    console.error('❌ Failed to initialize cache managers:', error);
    // Return null managers to prevent crashes
    return {
      prefetchManager: null,
      backgroundSyncManager: null,
      intelligentPrefetcher: null
    };
  }
};

export const getCacheManagers = async () => {
  try {
    let intelligentPrefetcher = null;
    try {
      const { getIntelligentPrefetcher } = await import('./intelligent-prefetcher');
      intelligentPrefetcher = getIntelligentPrefetcher();
    } catch (error) {
      console.warn('⚠️ Failed to get intelligent prefetcher (continuing without it):', error);
      intelligentPrefetcher = null;
    }

    return {
      prefetchManager,
      backgroundSyncManager,
      intelligentPrefetcher
    };
  } catch (error) {
    console.error('❌ Failed to get cache managers:', error);
    // Return null managers to prevent crashes
    return {
      prefetchManager: null,
      backgroundSyncManager: null,
      intelligentPrefetcher: null
    };
  }
};
