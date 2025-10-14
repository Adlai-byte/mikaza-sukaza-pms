/**
 * Simplified Cache Manager for Property Management System
 * Removes redundant localStorage persistence, relies on React Query + Service Worker
 */

import { QueryClient } from '@tanstack/react-query';
import { CACHE_CONFIG, RETRY_CONFIG, NETWORK_CONFIG, getCacheConfig } from './cache-config';

/**
 * Create optimized query client with simplified caching
 * - React Query handles memory cache
 * - Service Worker handles offline persistence
 * - No redundant localStorage layer
 */
export const createOptimizedQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Default to DETAIL cache config (10 min stale, 1 hour GC)
        staleTime: CACHE_CONFIG.DETAIL.staleTime,
        gcTime: CACHE_CONFIG.DETAIL.gcTime,

        // Network and retry configuration
        retry: RETRY_CONFIG.shouldRetry,
        retryDelay: RETRY_CONFIG.retryDelay,
        ...NETWORK_CONFIG.queries,

        // Performance optimizations
        structuralSharing: true, // Share unchanged data between re-renders
        placeholderData: (previousData) => previousData, // Show old data while fetching new
      },
      mutations: {
        ...NETWORK_CONFIG.mutations,
      },
    },
  });

  // Add custom query cache event listeners for monitoring
  if (process.env.NODE_ENV === 'development') {
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'added') {
        console.log('📝 Query added to cache:', event.query.queryKey);
      }
      if (event.type === 'removed') {
        console.log('🗑️ Query removed from cache:', event.query.queryKey);
      }
      if (event.type === 'updated' && event.action.type === 'success') {
        console.log('✅ Query updated:', event.query.queryKey);
      }
      if (event.type === 'updated' && event.action.type === 'error') {
        console.error('❌ Query error:', event.query.queryKey, event.action.error);
      }
    });
  }

  return queryClient;
};

/**
 * Optimistic update helpers
 */
export const OptimisticUpdates = {
  /**
   * Optimistically update a property in the list
   */
  updateProperty: (queryClient: QueryClient, propertyId: string, updates: any) => {
    const queryKey = ['properties', 'list'];

    // Cancel any outgoing refetches
    queryClient.cancelQueries({ queryKey });

    // Snapshot the previous value
    const previousData = queryClient.getQueryData(queryKey);

    // Optimistically update to the new value
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map((property: any) =>
        property.property_id === propertyId
          ? { ...property, ...updates, updated_at: new Date().toISOString() }
          : property
      );
    });

    // Also update the detail cache if it exists
    const detailQueryKey = ['properties', 'detail', propertyId];
    const detailData = queryClient.getQueryData(detailQueryKey);
    if (detailData) {
      queryClient.setQueryData(detailQueryKey, (oldData: any) => ({
        ...oldData,
        ...updates,
        updated_at: new Date().toISOString(),
      }));
    }

    // Return rollback function
    return () => {
      queryClient.setQueryData(queryKey, previousData);
      if (detailData) {
        queryClient.setQueryData(detailQueryKey, detailData);
      }
    };
  },

  /**
   * Optimistically add a new property to the list
   */
  addProperty: (queryClient: QueryClient, newProperty: any) => {
    const queryKey = ['properties', 'list'];

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return [newProperty];
      return [newProperty, ...oldData];
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Optimistically remove a property from the list
   */
  removeProperty: (queryClient: QueryClient, propertyId: string) => {
    const queryKey = ['properties', 'list'];

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;
      return oldData.filter((property: any) => property.property_id !== propertyId);
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Optimistically update a user
   */
  updateUser: (queryClient: QueryClient, userId: string, updates: any) => {
    const queryKey = ['users', 'list'];

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map((user: any) =>
        user.user_id === userId
          ? { ...user, ...updates, updated_at: new Date().toISOString() }
          : user
      );
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Optimistically update a booking
   */
  updateBooking: (queryClient: QueryClient, bookingId: string, updates: any) => {
    const queryKey = ['bookings'];

    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map((booking: any) =>
        booking.booking_id === bookingId
          ? { ...booking, ...updates }
          : booking
      );
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },

  /**
   * Generic optimistic update for any list
   */
  updateItem: (
    queryClient: QueryClient,
    queryKey: string[],
    itemId: string,
    updates: any,
    idField: string = 'id'
  ) => {
    queryClient.cancelQueries({ queryKey });
    const previousData = queryClient.getQueryData(queryKey);

    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData || !Array.isArray(oldData)) return oldData;

      return oldData.map((item: any) =>
        item[idField] === itemId ? { ...item, ...updates } : item
      );
    });

    return () => queryClient.setQueryData(queryKey, previousData);
  },
};

/**
 * Background sync manager for offline support
 * Simplified to work with Service Worker
 */
export class BackgroundSyncManager {
  private queryClient: QueryClient;
  private syncQueue: Array<{ queryKey: string[]; action: 'refetch' | 'invalidate' }> = [];
  private isOnline = navigator.onLine;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('🌐 Connection restored, processing sync queue...');
      this.isOnline = true;
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost, queueing operations...');
      this.isOnline = false;
    });
  }

  queueSync(queryKey: string[], action: 'refetch' | 'invalidate' = 'refetch') {
    if (this.isOnline) {
      this.executeSync(queryKey, action);
    } else {
      this.syncQueue.push({ queryKey, action });
      console.log(`📋 Queued ${action} for:`, queryKey);
    }
  }

  private async executeSync(queryKey: string[], action: 'refetch' | 'invalidate') {
    try {
      if (action === 'refetch') {
        await this.queryClient.refetchQueries({ queryKey });
      } else {
        await this.queryClient.invalidateQueries({ queryKey });
      }
      console.log(`✅ Synced ${action}:`, queryKey);
    } catch (error) {
      console.warn('⚠️ Background sync failed:', error);
    }
  }

  private async processSyncQueue() {
    console.log(`📝 Processing ${this.syncQueue.length} queued operations...`);

    while (this.syncQueue.length > 0 && this.isOnline) {
      const { queryKey, action } = this.syncQueue.shift()!;
      await this.executeSync(queryKey, action);
    }

    console.log('✅ Sync queue processed');
  }

  getQueueSize(): number {
    return this.syncQueue.length;
  }
}

/**
 * Cache invalidation helper based on dependency rules
 */
export class CacheInvalidationManager {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate related caches based on what changed
   */
  async invalidateRelated(changeType: 'property' | 'booking' | 'user' | 'financial' | 'static') {
    const invalidationMap = {
      property: [
        ['properties', 'list'],
        ['properties', 'detail'],
        ['bookings'],
        ['financial-entries'],
      ],
      booking: [
        ['bookings'],
        ['bookings-calendar'],
        ['properties', 'detail'],
        ['financial-entries'],
      ],
      user: [
        ['users', 'list'],
        ['users', 'detail'],
        ['properties', 'list'],
      ],
      financial: [
        ['financial-entries'],
        ['financial-summary'],
        ['properties', 'detail'],
      ],
      static: [
        ['amenities'],
        ['rules'],
        ['properties', 'detail'],
      ],
    };

    const keysToInvalidate = invalidationMap[changeType] || [];

    console.log(`🔄 Invalidating ${keysToInvalidate.length} related caches for ${changeType} change...`);

    await Promise.all(
      keysToInvalidate.map((queryKey) =>
        this.queryClient.invalidateQueries({ queryKey })
      )
    );

    console.log('✅ Cache invalidation complete');
  }

  /**
   * Invalidate specific query key
   */
  async invalidate(queryKey: string[]) {
    await this.queryClient.invalidateQueries({ queryKey });
  }

  /**
   * Remove specific query from cache
   */
  remove(queryKey: string[]) {
    this.queryClient.removeQueries({ queryKey });
  }

  /**
   * Clear all caches (nuclear option)
   */
  clearAll() {
    this.queryClient.clear();
    console.log('💥 All caches cleared');
  }
}

/**
 * Cache warming helper
 * Pre-loads critical data on application start
 */
export class CacheWarmer {
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Warm cache with critical data on login
   */
  async warmCriticalData(fetchFunctions: {
    properties?: () => Promise<any>;
    amenities?: () => Promise<any>;
    rules?: () => Promise<any>;
  }) {
    console.log('🔥 Warming cache with critical data...');

    const promises = [];

    if (fetchFunctions.properties) {
      promises.push(
        this.queryClient.prefetchQuery({
          queryKey: ['properties', 'list'],
          queryFn: fetchFunctions.properties,
          staleTime: CACHE_CONFIG.LIST.staleTime,
        })
      );
    }

    if (fetchFunctions.amenities) {
      promises.push(
        this.queryClient.prefetchQuery({
          queryKey: ['amenities'],
          queryFn: fetchFunctions.amenities,
          staleTime: CACHE_CONFIG.STATIC.staleTime,
        })
      );
    }

    if (fetchFunctions.rules) {
      promises.push(
        this.queryClient.prefetchQuery({
          queryKey: ['rules'],
          queryFn: fetchFunctions.rules,
          staleTime: CACHE_CONFIG.STATIC.staleTime,
        })
      );
    }

    await Promise.all(promises);
    console.log('✅ Cache warming complete');
  }

  /**
   * Prefetch on hover (for better UX)
   */
  async prefetchOnHover(queryKey: string[], queryFn: () => Promise<any>) {
    const existingData = this.queryClient.getQueryData(queryKey);

    // Don't prefetch if data already exists
    if (existingData) return;

    await this.queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: getCacheConfig(queryKey).staleTime,
    });
  }
}

/**
 * Cache statistics and monitoring
 */
export const getCacheStats = (queryClient: QueryClient) => {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const stats = {
    totalQueries: queries.length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    fetchingQueries: queries.filter((q) => q.state.fetchStatus === 'fetching').length,
    errorQueries: queries.filter((q) => q.state.status === 'error').length,
    successQueries: queries.filter((q) => q.state.status === 'success').length,
    pendingQueries: queries.filter((q) => q.state.status === 'pending').length,
    cacheHitRatio: queries.length > 0
      ? Math.round((queries.filter((q) => q.state.dataUpdateCount > 0).length / queries.length) * 100)
      : 0,
  };

  console.log('📊 Cache Statistics:', stats);
  console.log(`   Cache Hit Ratio: ${stats.cacheHitRatio}% (target: >80%)`);
  return stats;
};

/**
 * Export singleton instances (initialized in App.tsx)
 */
export let backgroundSyncManager: BackgroundSyncManager | null = null;
export let cacheInvalidationManager: CacheInvalidationManager | null = null;
export let cacheWarmer: CacheWarmer | null = null;

export const initializeCacheManagers = (queryClient: QueryClient) => {
  backgroundSyncManager = new BackgroundSyncManager(queryClient);
  cacheInvalidationManager = new CacheInvalidationManager(queryClient);
  cacheWarmer = new CacheWarmer(queryClient);

  console.log('✅ Simplified cache managers initialized');

  return {
    backgroundSyncManager,
    cacheInvalidationManager,
    cacheWarmer,
  };
};

// Export for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).getCacheStats = () => {
    const queryClient = (window as any).__queryClient;
    if (queryClient) {
      return getCacheStats(queryClient);
    }
    console.warn('QueryClient not found on window');
  };
}
