// Intelligent prefetching system with ML-driven predictions
import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { indexedDBCache } from './indexeddb-cache';
import { serviceWorkerManager } from './service-worker-manager';
import { imageCacheOptimizer } from './image-cache-optimizer';

interface UserBehavior {
  userId?: string;
  sessionId: string;
  timestamp: number;
  action: 'view' | 'click' | 'hover' | 'scroll' | 'search';
  target: string;
  targetType: 'property' | 'user' | 'page' | 'image';
  context: Record<string, any>;
  duration?: number;
}

interface PrefetchPrediction {
  resource: string;
  resourceType: 'data' | 'image' | 'page';
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  reason: string;
}

interface NavigationPattern {
  from: string;
  to: string;
  frequency: number;
  avgTimeSpent: number;
  lastSeen: number;
}

export class IntelligentPrefetcher {
  private queryClient: QueryClient;
  private behaviorHistory: UserBehavior[] = [];
  private navigationPatterns: Map<string, NavigationPattern> = new Map();
  private prefetchQueue: PrefetchPrediction[] = [];
  private isProcessingQueue = false;
  private sessionId: string;

  // Machine learning model weights (simplified)
  private modelWeights = {
    recentActivity: 0.4,
    navigationPatterns: 0.3,
    timeOfDay: 0.1,
    dayOfWeek: 0.1,
    userType: 0.1,
  };

  // Resource importance scores
  private resourceScores = {
    properties: 1.0,
    users: 0.8,
    images: 0.6,
    amenities: 0.9,
    rules: 0.9,
  };

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.sessionId = this.generateSessionId();
    this.initializePrefetcher();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializePrefetcher(): Promise<void> {
    // Load historical patterns from IndexedDB
    await this.loadNavigationPatterns();

    // Set up behavior tracking
    this.setupBehaviorTracking();

    // Start prefetch processing
    this.startPrefetchProcessor();

    // Set up network-aware prefetching
    this.setupNetworkAwarePrefetching();

    console.log('🧠 Intelligent prefetcher initialized');
  }

  // Track user behavior
  trackBehavior(behavior: Omit<UserBehavior, 'sessionId' | 'timestamp'>): void {
    const fullBehavior: UserBehavior = {
      ...behavior,
      sessionId: this.sessionId,
      timestamp: Date.now(),
    };

    this.behaviorHistory.push(fullBehavior);

    // Keep only recent behavior (last 1000 actions)
    if (this.behaviorHistory.length > 1000) {
      this.behaviorHistory = this.behaviorHistory.slice(-1000);
    }

    // Update navigation patterns
    this.updateNavigationPatterns(fullBehavior);

    // Generate new predictions
    this.generatePrefetchPredictions();

    // Store behavior in IndexedDB for persistence
    this.storeBehaviorHistory();
  }

  // Update navigation patterns
  private updateNavigationPatterns(behavior: UserBehavior): void {
    if (behavior.action === 'view') {
      const currentPath = window.location.pathname;
      const previousBehavior = this.behaviorHistory[this.behaviorHistory.length - 2];

      if (previousBehavior && previousBehavior.action === 'view') {
        const key = `${previousBehavior.target}->${behavior.target}`;
        const existing = this.navigationPatterns.get(key);

        if (existing) {
          existing.frequency += 1;
          existing.avgTimeSpent = (existing.avgTimeSpent + (behavior.timestamp - previousBehavior.timestamp)) / 2;
          existing.lastSeen = Date.now();
        } else {
          this.navigationPatterns.set(key, {
            from: previousBehavior.target,
            to: behavior.target,
            frequency: 1,
            avgTimeSpent: behavior.timestamp - previousBehavior.timestamp,
            lastSeen: Date.now(),
          });
        }
      }
    }
  }

  // Generate prefetch predictions using multiple factors
  private generatePrefetchPredictions(): void {
    const predictions: PrefetchPrediction[] = [];

    // 1. Pattern-based predictions
    predictions.push(...this.getPatternBasedPredictions());

    // 2. Time-based predictions
    predictions.push(...this.getTimeBasedPredictions());

    // 3. Content-relationship predictions
    predictions.push(...this.getContentRelationshipPredictions());

    // 4. User behavior predictions
    predictions.push(...this.getUserBehaviorPredictions());

    // Sort by confidence and priority
    predictions.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityScore = priorityWeight[b.priority] - priorityWeight[a.priority];
      return priorityScore || b.confidence - a.confidence;
    });

    // Update prefetch queue
    this.prefetchQueue = predictions.slice(0, 20); // Keep top 20 predictions
  }

  // Pattern-based predictions
  private getPatternBasedPredictions(): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];
    const currentPath = window.location.pathname;

    // Find patterns starting from current location
    for (const [key, pattern] of this.navigationPatterns) {
      const [from] = key.split('->');

      if (from === currentPath && pattern.frequency > 2) {
        const confidence = Math.min(0.9, pattern.frequency * 0.1);

        predictions.push({
          resource: pattern.to,
          resourceType: this.inferResourceType(pattern.to),
          confidence,
          priority: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
          estimatedTime: pattern.avgTimeSpent,
          reason: `Navigation pattern: ${pattern.frequency} times visited`,
        });
      }
    }

    return predictions;
  }

  // Time-based predictions
  private getTimeBasedPredictions(): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Business hours behavior
    if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      predictions.push({
        resource: '/properties',
        resourceType: 'page',
        confidence: 0.7,
        priority: 'medium',
        estimatedTime: 5000,
        reason: 'Business hours: Properties page frequently accessed',
      });

      predictions.push({
        resource: 'properties-list',
        resourceType: 'data',
        confidence: 0.8,
        priority: 'high',
        estimatedTime: 2000,
        reason: 'Business hours: Property data frequently needed',
      });
    }

    // Weekend behavior
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      predictions.push({
        resource: '/calendar',
        resourceType: 'page',
        confidence: 0.5,
        priority: 'low',
        estimatedTime: 3000,
        reason: 'Weekend: Calendar checking common',
      });
    }

    return predictions;
  }

  // Content relationship predictions
  private getContentRelationshipPredictions(): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];
    const currentPath = window.location.pathname;

    // If viewing a property, predict related data
    if (currentPath.includes('/properties/') && currentPath.includes('/edit')) {
      const propertyId = this.extractPropertyId(currentPath);

      if (propertyId) {
        predictions.push(
          {
            resource: `property-images-${propertyId}`,
            resourceType: 'image',
            confidence: 0.9,
            priority: 'high',
            estimatedTime: 1000,
            reason: 'Property edit: Images often viewed',
          },
          {
            resource: `property-financial-${propertyId}`,
            resourceType: 'data',
            confidence: 0.7,
            priority: 'medium',
            estimatedTime: 2000,
            reason: 'Property edit: Financial data commonly accessed',
          },
          {
            resource: 'amenities-list',
            resourceType: 'data',
            confidence: 0.8,
            priority: 'medium',
            estimatedTime: 1500,
            reason: 'Property edit: Amenities often needed',
          }
        );
      }
    }

    // If viewing properties list, predict individual property details
    if (currentPath === '/properties') {
      const recentProperties = this.getRecentlyViewedProperties();

      recentProperties.forEach((propertyId, index) => {
        const confidence = Math.max(0.3, 0.8 - index * 0.1);

        predictions.push({
          resource: `property-detail-${propertyId}`,
          resourceType: 'data',
          confidence,
          priority: confidence > 0.6 ? 'medium' : 'low',
          estimatedTime: 2000,
          reason: `Recently viewed property: ${index + 1} visits ago`,
        });
      });
    }

    return predictions;
  }

  // User behavior predictions
  private getUserBehaviorPredictions(): PrefetchPrediction[] {
    const predictions: PrefetchPrediction[] = [];

    // Analyze recent behavior patterns
    const recentBehavior = this.behaviorHistory.slice(-20);
    const actionCounts = recentBehavior.reduce((acc, behavior) => {
      acc[behavior.action] = (acc[behavior.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // If user is frequently hovering, they're likely to click soon
    if (actionCounts.hover > 5) {
      const lastHover = recentBehavior.filter(b => b.action === 'hover').pop();

      if (lastHover) {
        predictions.push({
          resource: lastHover.target,
          resourceType: this.inferResourceType(lastHover.target),
          confidence: 0.6,
          priority: 'medium',
          estimatedTime: 1000,
          reason: 'Frequent hovering detected',
        });
      }
    }

    // If user is scrolling through a list, predict next items
    if (actionCounts.scroll > 3) {
      predictions.push({
        resource: 'next-page-data',
        resourceType: 'data',
        confidence: 0.5,
        priority: 'low',
        estimatedTime: 3000,
        reason: 'Scrolling behavior suggests more content needed',
      });
    }

    return predictions;
  }

  // Process prefetch queue
  private async processPrefetchQueue(): Promise<void> {
    if (this.isProcessingQueue || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Check network conditions
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && connection.effectiveType === 'slow-2g';

      // Process high priority items first
      const highPriorityItems = this.prefetchQueue.filter(p => p.priority === 'high');
      const mediumPriorityItems = this.prefetchQueue.filter(p => p.priority === 'medium');
      const lowPriorityItems = this.prefetchQueue.filter(p => p.priority === 'low');

      // Always process high priority items
      await this.processPredictions(highPriorityItems);

      // Process medium priority if network is good
      if (!isSlowConnection) {
        await this.processPredictions(mediumPriorityItems.slice(0, 5));
      }

      // Process low priority only on fast connections during idle time
      if (!isSlowConnection && navigator.userAgent.indexOf('Chrome') > -1) {
        // Use requestIdleCallback if available
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            this.processPredictions(lowPriorityItems.slice(0, 3));
          });
        }
      }
    } catch (error) {
      console.error('Error processing prefetch queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Process individual predictions
  private async processPredictions(predictions: PrefetchPrediction[]): Promise<void> {
    const processingPromises = predictions.map(async (prediction) => {
      try {
        await this.executePrefetch(prediction);
        console.log(`🔮 Prefetched: ${prediction.resource} (${prediction.confidence.toFixed(2)} confidence)`);
      } catch (error) {
        console.warn(`Failed to prefetch ${prediction.resource}:`, error);
      }
    });

    await Promise.allSettled(processingPromises);
  }

  // Execute specific prefetch
  private async executePrefetch(prediction: PrefetchPrediction): Promise<void> {
    switch (prediction.resourceType) {
      case 'data':
        await this.prefetchData(prediction.resource);
        break;

      case 'image':
        await this.prefetchImage(prediction.resource);
        break;

      case 'page':
        await this.prefetchPage(prediction.resource);
        break;

      default:
        console.warn('Unknown resource type:', prediction.resourceType);
    }
  }

  // Prefetch data using React Query
  private async prefetchData(resource: string): Promise<void> {
    // Map resource names to query keys and functions
    const dataMap: Record<string, { queryKey: string[]; queryFn: () => Promise<any> }> = {
      'properties-list': {
        queryKey: ['properties', 'list'],
        queryFn: async () => {
          const { data } = await supabase.from('properties').select('*').limit(20);
          return data;
        },
      },
      'users-list': {
        queryKey: ['users', 'list'],
        queryFn: async () => {
          const { data } = await supabase.from('users').select('*').limit(20);
          return data;
        },
      },
      'amenities-list': {
        queryKey: ['amenities'],
        queryFn: async () => {
          const { data } = await supabase.from('amenities').select('*');
          return data;
        },
      },
      'rules-list': {
        queryKey: ['rules'],
        queryFn: async () => {
          const { data } = await supabase.from('rules').select('*');
          return data;
        },
      },
    };

    // Handle dynamic resources
    if (resource.startsWith('property-detail-')) {
      const propertyId = resource.replace('property-detail-', '');
      dataMap[resource] = {
        queryKey: ['properties', 'detail', propertyId],
        queryFn: async () => {
          const { data } = await supabase.from('properties').select('*').eq('property_id', propertyId).single();
          return data;
        },
      };
    }

    if (resource.startsWith('property-financial-')) {
      const propertyId = resource.replace('property-financial-', '');
      dataMap[resource] = {
        queryKey: ['properties', 'financial', propertyId],
        queryFn: async () => {
          const { data } = await supabase.from('property_financial_entries').select('*').eq('property_id', propertyId);
          return data;
        },
      };
    }

    const config = dataMap[resource];
    if (config) {
      await this.queryClient.prefetchQuery({
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    }
  }

  // Prefetch images
  private async prefetchImage(resource: string): Promise<void> {
    if (resource.startsWith('property-images-')) {
      const propertyId = resource.replace('property-images-', '');

      // Get property images from database
      const { data: images } = await supabase
        .from('property_images')
        .select('image_url')
        .eq('property_id', propertyId)
        .limit(5);

      if (images) {
        const imageUrls = images.map(img => img.image_url);
        await imageCacheOptimizer.preloadCriticalImages(imageUrls);
      }
    }
  }

  // Prefetch pages
  private async prefetchPage(resource: string): Promise<void> {
    // Use service worker to cache page resources
    await serviceWorkerManager.cacheUrls([resource]);
  }

  // Setup behavior tracking
  private setupBehaviorTracking(): void {
    if (typeof window === 'undefined') return;

    // Track page views
    let currentPath = window.location.pathname;
    const trackPageView = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        this.trackBehavior({
          action: 'view',
          target: newPath,
          targetType: 'page',
          context: { previousPath: currentPath },
        });
        currentPath = newPath;
      }
    };

    // Listen for navigation
    window.addEventListener('popstate', trackPageView);

    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(trackPageView, 0);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(trackPageView, 0);
    };

    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (link) {
        this.trackBehavior({
          action: 'click',
          target: link.href,
          targetType: 'page',
          context: { text: link.textContent?.trim() },
        });
      }
    });

    // Track hovers with debouncing
    let hoverTimeout: NodeJS.Timeout;
    document.addEventListener('mouseover', (event) => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;

        if (link) {
          this.trackBehavior({
            action: 'hover',
            target: link.href,
            targetType: 'page',
            context: { text: link.textContent?.trim() },
          });
        }
      }, 500);
    });

    // Track scrolling
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackBehavior({
          action: 'scroll',
          target: window.location.pathname,
          targetType: 'page',
          context: {
            scrollY: window.scrollY,
            scrollPercent: (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100,
          },
        });
      }, 1000);
    });
  }

  // Start prefetch processor
  private startPrefetchProcessor(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      this.processPrefetchQueue();
    }, 5000);

    // Initial processing
    setTimeout(() => {
      this.processPrefetchQueue();
    }, 2000);
  }

  // Setup network-aware prefetching
  private setupNetworkAwarePrefetching(): void {
    if (typeof window === 'undefined') return;

    // Adjust prefetching based on network conditions
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        const effectiveType = connection.effectiveType;

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          // Reduce prefetching on slow connections
          this.prefetchQueue = this.prefetchQueue.filter(p => p.priority === 'high');
        }

        console.log(`📶 Network changed to ${effectiveType}, adjusted prefetching`);
      });
    }

    // Pause prefetching when device is low on memory
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      if (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit > 0.8) {
        console.log('💾 Low memory detected, reducing prefetching');
        this.prefetchQueue = this.prefetchQueue.filter(p => p.priority === 'high');
      }
    }
  }

  // Utility methods
  private inferResourceType(resource: string): 'data' | 'image' | 'page' {
    if (resource.includes('image') || resource.endsWith('.jpg') || resource.endsWith('.png') || resource.endsWith('.webp')) {
      return 'image';
    }
    if (resource.startsWith('/')) {
      return 'page';
    }
    return 'data';
  }

  private extractPropertyId(path: string): string | null {
    const match = path.match(/\/properties\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private getRecentlyViewedProperties(): string[] {
    return this.behaviorHistory
      .filter(b => b.action === 'view' && b.target.includes('/properties/'))
      .map(b => this.extractPropertyId(b.target))
      .filter(Boolean)
      .slice(-5) as string[];
  }

  // Persistence methods
  private async loadNavigationPatterns(): Promise<void> {
    try {
      const patterns = await indexedDBCache.getItem('metadata', 'navigation-patterns');
      if (patterns) {
        this.navigationPatterns = new Map(Object.entries(patterns));
      }
    } catch (error) {
      console.warn('Failed to load navigation patterns:', error);
    }
  }

  private async storeNavigationPatterns(): Promise<void> {
    try {
      const patternsObj = Object.fromEntries(this.navigationPatterns);
      await indexedDBCache.setItem('metadata', 'navigation-patterns', patternsObj);
    } catch (error) {
      console.warn('Failed to store navigation patterns:', error);
    }
  }

  private async storeBehaviorHistory(): Promise<void> {
    try {
      const recentHistory = this.behaviorHistory.slice(-500); // Store last 500 actions
      await indexedDBCache.setItem('metadata', 'behavior-history', recentHistory);
    } catch (error) {
      console.warn('Failed to store behavior history:', error);
    }
  }

  // Public methods
  async getInsights(): Promise<{
    totalBehaviors: number;
    navigationPatterns: number;
    queuedPrefetches: number;
    topPatterns: Array<{ pattern: string; frequency: number }>;
  }> {
    const topPatterns = Array.from(this.navigationPatterns.entries())
      .sort(([, a], [, b]) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(([pattern, data]) => ({ pattern, frequency: data.frequency }));

    return {
      totalBehaviors: this.behaviorHistory.length,
      navigationPatterns: this.navigationPatterns.size,
      queuedPrefetches: this.prefetchQueue.length,
      topPatterns,
    };
  }

  clearHistory(): void {
    this.behaviorHistory = [];
    this.navigationPatterns.clear();
    this.prefetchQueue = [];
    this.storeNavigationPatterns();
    this.storeBehaviorHistory();
  }

  // Cleanup
  cleanup(): void {
    this.storeNavigationPatterns();
    this.storeBehaviorHistory();
  }
}

// Export singleton
export let intelligentPrefetcher: IntelligentPrefetcher | null = null;

export const initializeIntelligentPrefetcher = (queryClient: QueryClient): IntelligentPrefetcher => {
  intelligentPrefetcher = new IntelligentPrefetcher(queryClient);
  return intelligentPrefetcher;
};

export const getIntelligentPrefetcher = (): IntelligentPrefetcher | null => {
  return intelligentPrefetcher;
};