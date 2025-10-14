/**
 * Optimized Intelligent Prefetcher (Less Aggressive)
 * Reduced from 10 predictions to 5, higher confidence threshold
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_CONFIG, PERFORMANCE_THRESHOLDS } from './cache-config';

interface PrefetchPrediction {
  resource: string;
  resourceType: 'data' | 'image' | 'page';
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface UserBehavior {
  action: 'view' | 'click' | 'hover';
  target: string;
  timestamp: number;
}

export class OptimizedIntelligentPrefetcher {
  private queryClient: QueryClient;
  private behaviorHistory: UserBehavior[] = [];
  private prefetchQueue: PrefetchPrediction[] = [];
  private isProcessing = false;

  // Increased confidence threshold from 0.75 to 0.85
  private readonly MIN_CONFIDENCE = PERFORMANCE_THRESHOLDS.MIN_PREFETCH_CONFIDENCE;

  // Reduced max queue from 10 to 5
  private readonly MAX_QUEUE_SIZE = PERFORMANCE_THRESHOLDS.MAX_PREFETCH_QUEUE;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupTracking();
    this.startProcessor();
  }

  /**
   * Track user behavior (simplified)
   */
  track(action: 'view' | 'click' | 'hover', target: string) {
    this.behaviorHistory.push({
      action,
      target,
      timestamp: Date.now(),
    });

    // Keep only last 100 actions (reduced from 1000)
    if (this.behaviorHistory.length > 100) {
      this.behaviorHistory = this.behaviorHistory.slice(-100);
    }

    // Generate predictions after each track
    this.generatePredictions();
  }

  /**
   * Generate prefetch predictions (simplified logic)
   */
  private generatePredictions() {
    const predictions: PrefetchPrediction[] = [];
    const currentPath = window.location.pathname;

    // 1. Current page context predictions
    if (currentPath === '/properties') {
      // On properties list, prefetch amenities and rules (likely to filter)
      predictions.push({
        resource: 'amenities',
        resourceType: 'data',
        confidence: 0.90,
        priority: 'high',
        reason: 'Properties list: amenities needed for filtering',
      });

      predictions.push({
        resource: 'rules',
        resourceType: 'data',
        confidence: 0.90,
        priority: 'high',
        reason: 'Properties list: rules needed for filtering',
      });
    }

    if (currentPath.includes('/properties/') && currentPath.includes('/edit')) {
      const propertyId = this.extractPropertyId(currentPath);

      if (propertyId) {
        // On property edit, prefetch images (likely to view photos tab)
        predictions.push({
          resource: `property-images-${propertyId}`,
          resourceType: 'image',
          confidence: 0.88,
          priority: 'high',
          reason: 'Property edit: photos tab frequently accessed',
        });
      }
    }

    // 2. Hover-based predictions (only for high-confidence)
    const recentHovers = this.behaviorHistory
      .filter((b) => b.action === 'hover')
      .slice(-3); // Only last 3 hovers

    recentHovers.forEach((hover) => {
      if (hover.target.includes('/properties/')) {
        const propertyId = this.extractPropertyId(hover.target);
        if (propertyId) {
          predictions.push({
            resource: `property-detail-${propertyId}`,
            resourceType: 'data',
            confidence: 0.87,
            priority: 'medium',
            reason: 'Hover detected on property link',
          });
        }
      }
    });

    // 3. Business hours optimization (only during work hours)
    const now = new Date();
    const hour = now.getHours();
    const isBusinessHours = hour >= 9 && hour <= 17;

    if (isBusinessHours && currentPath === '/') {
      predictions.push({
        resource: 'properties-list',
        resourceType: 'data',
        confidence: 0.86,
        priority: 'medium',
        reason: 'Business hours: properties frequently accessed',
      });
    }

    // Filter by minimum confidence and sort
    const filteredPredictions = predictions
      .filter((p) => p.confidence >= this.MIN_CONFIDENCE)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.MAX_QUEUE_SIZE); // Take top 5 only

    // Update queue (don't duplicate)
    this.prefetchQueue = filteredPredictions.filter(
      (pred) => !this.queryClient.getQueryData(this.getQueryKey(pred.resource))
    );

    if (this.prefetchQueue.length > 0) {
      console.log(
        `🔮 Prefetch queue updated: ${this.prefetchQueue.length} items (${predictions.length} candidates, ${filteredPredictions.length} after filter)`
      );
    }
  }

  /**
   * Process prefetch queue (runs every 10 seconds, reduced from 5)
   */
  private async processQueue() {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Check network conditions
      const connection = (navigator as any).connection;
      const isSlowConnection =
        connection &&
        (connection.effectiveType === 'slow-2g' ||
          connection.effectiveType === '2g');

      // Skip prefetching on slow connections
      if (isSlowConnection) {
        console.log('📶 Slow connection detected, skipping prefetch');
        this.isProcessing = false;
        return;
      }

      // Process only high priority items (reduced from high + medium)
      const highPriority = this.prefetchQueue.filter((p) => p.priority === 'high');

      for (const prediction of highPriority.slice(0, 2)) {
        // Max 2 at a time
        try {
          await this.executePrefetch(prediction);
          console.log(
            `✅ Prefetched: ${prediction.resource} (${(prediction.confidence * 100).toFixed(0)}% confidence)`
          );
        } catch (error) {
          console.warn(`⚠️ Prefetch failed: ${prediction.resource}`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute prefetch for a specific prediction
   */
  private async executePrefetch(prediction: PrefetchPrediction) {
    const queryKey = this.getQueryKey(prediction.resource);
    const queryFn = this.getQueryFn(prediction.resource);

    if (!queryFn) {
      console.warn('No query function for:', prediction.resource);
      return;
    }

    // Check if already cached
    const existingData = this.queryClient.getQueryData(queryKey);
    if (existingData) {
      return; // Already cached, skip
    }

    await this.queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: this.getStaleTime(prediction.resource),
    });
  }

  /**
   * Get query key for a resource
   */
  private getQueryKey(resource: string): string[] {
    if (resource === 'amenities') return ['amenities'];
    if (resource === 'rules') return ['rules'];
    if (resource === 'properties-list') return ['properties', 'list'];

    if (resource.startsWith('property-detail-')) {
      const id = resource.replace('property-detail-', '');
      return ['properties', 'detail', id];
    }

    if (resource.startsWith('property-images-')) {
      const id = resource.replace('property-images-', '');
      return ['properties', 'images', id];
    }

    return [resource];
  }

  /**
   * Get query function for a resource
   */
  private getQueryFn(resource: string): (() => Promise<any>) | null {
    if (resource === 'amenities') {
      return async () => {
        const { data } = await supabase.from('amenities').select('*');
        return data;
      };
    }

    if (resource === 'rules') {
      return async () => {
        const { data } = await supabase.from('rules').select('*');
        return data;
      };
    }

    if (resource === 'properties-list') {
      return async () => {
        const { data } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        return data;
      };
    }

    if (resource.startsWith('property-detail-')) {
      const id = resource.replace('property-detail-', '');
      return async () => {
        const { data } = await supabase
          .from('properties')
          .select('*')
          .eq('property_id', id)
          .single();
        return data;
      };
    }

    if (resource.startsWith('property-images-')) {
      const id = resource.replace('property-images-', '');
      return async () => {
        const { data } = await supabase
          .from('property_images')
          .select('*')
          .eq('property_id', id);
        return data;
      };
    }

    return null;
  }

  /**
   * Get stale time for a resource
   */
  private getStaleTime(resource: string): number {
    if (resource === 'amenities' || resource === 'rules') {
      return CACHE_CONFIG.STATIC.staleTime;
    }
    if (resource === 'properties-list') {
      return CACHE_CONFIG.LIST.staleTime;
    }
    return CACHE_CONFIG.DETAIL.staleTime;
  }

  /**
   * Setup tracking
   */
  private setupTracking() {
    if (typeof window === 'undefined') return;

    // Track page views
    let currentPath = window.location.pathname;
    const trackPageView = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.track('view', newPath);
        currentPath = newPath;
      }
    };

    window.addEventListener('popstate', trackPageView);

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      setTimeout(trackPageView, 0);
    };

    // Track clicks (simplified)
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (link && link.href) {
        this.track('click', link.href);
      }
    });

    // Track hovers with debounce (increased from 500ms to 1000ms)
    let hoverTimeout: NodeJS.Timeout;
    document.addEventListener('mouseover', (event) => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;

        if (link && link.href) {
          this.track('hover', link.href);
        }
      }, 1000); // Increased debounce
    });
  }

  /**
   * Start processor (runs every 10 seconds, reduced from 5)
   */
  private startProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 10000); // Increased from 5000

    // Initial delay increased from 2s to 5s
    setTimeout(() => {
      this.processQueue();
    }, 5000);
  }

  /**
   * Helper to extract property ID from path
   */
  private extractPropertyId(path: string): string | null {
    const match = path.match(/\/properties\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get insights (for debugging)
   */
  getInsights() {
    return {
      behaviorsTracked: this.behaviorHistory.length,
      queueSize: this.prefetchQueue.length,
      isProcessing: this.isProcessing,
      minConfidence: this.MIN_CONFIDENCE,
      maxQueueSize: this.MAX_QUEUE_SIZE,
    };
  }

  /**
   * Clear history and queue
   */
  clear() {
    this.behaviorHistory = [];
    this.prefetchQueue = [];
  }
}

// Singleton instance
let instance: OptimizedIntelligentPrefetcher | null = null;

export const initializeOptimizedPrefetcher = (
  queryClient: QueryClient
): OptimizedIntelligentPrefetcher => {
  instance = new OptimizedIntelligentPrefetcher(queryClient);
  console.log('✅ Optimized prefetcher initialized (less aggressive)');
  return instance;
};

export const getOptimizedPrefetcher = (): OptimizedIntelligentPrefetcher | null => {
  return instance;
};
