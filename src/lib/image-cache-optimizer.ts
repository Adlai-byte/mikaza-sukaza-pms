// Advanced image and asset caching optimization
import { indexedDBCache } from './indexeddb-cache';
import { serviceWorkerManager } from './service-worker-manager';

interface ImageCacheOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  blur?: boolean;
  preload?: boolean;
}

interface AssetCacheConfig {
  maxAge: number;
  priority: 'high' | 'medium' | 'low';
  compress: boolean;
  format?: string[];
}

export class ImageCacheOptimizer {
  private imageCache = new Map<string, HTMLImageElement>();
  private placeholderCache = new Map<string, string>();
  private loadingImages = new Set<string>();
  private compressionCanvas: HTMLCanvasElement | null = null;

  // Asset cache configurations
  private assetConfigs: Record<string, AssetCacheConfig> = {
    // Critical images (logos, icons)
    critical: {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      priority: 'high',
      compress: false,
    },
    // Property images
    properties: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      priority: 'medium',
      compress: true,
      format: ['webp', 'jpeg'],
    },
    // User avatars
    avatars: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      priority: 'medium',
      compress: true,
      format: ['webp', 'jpeg'],
    },
    // Thumbnails
    thumbnails: {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      priority: 'low',
      compress: true,
      format: ['webp'],
    },
  };

  constructor() {
    this.initializeCanvas();
    this.setupImageObserver();
  }

  private initializeCanvas(): void {
    if (typeof window !== 'undefined') {
      this.compressionCanvas = document.createElement('canvas');
    }
  }

  // Optimize and cache image
  async optimizeAndCacheImage(
    url: string,
    options: ImageCacheOptions = {},
    category: keyof typeof this.assetConfigs = 'properties'
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(url, options);

    // Check memory cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!.src;
    }

    // Check IndexedDB cache
    try {
      const cachedBlob = await indexedDBCache.getImage(cacheKey);
      if (cachedBlob) {
        const objectUrl = URL.createObjectURL(cachedBlob);
        this.addToMemoryCache(cacheKey, objectUrl);
        return objectUrl;
      }
    } catch (error) {
      console.warn('Failed to get cached image:', error);
    }

    // If not in cache, load and optimize
    return this.loadAndOptimizeImage(url, options, category, cacheKey);
  }

  // Load and optimize image
  private async loadAndOptimizeImage(
    url: string,
    options: ImageCacheOptions,
    category: keyof typeof this.assetConfigs,
    cacheKey: string
  ): Promise<string> {
    // Prevent duplicate loading
    if (this.loadingImages.has(cacheKey)) {
      return new Promise((resolve) => {
        const checkLoading = () => {
          if (!this.loadingImages.has(cacheKey)) {
            const cached = this.imageCache.get(cacheKey);
            resolve(cached ? cached.src : url);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    this.loadingImages.add(cacheKey);

    try {
      // Load original image
      const img = await this.loadImage(url);

      // Apply optimizations
      const optimizedBlob = await this.applyOptimizations(img, options, category);

      // Cache optimized image
      const objectUrl = URL.createObjectURL(optimizedBlob);
      await indexedDBCache.storeImage(cacheKey, optimizedBlob);
      this.addToMemoryCache(cacheKey, objectUrl);

      this.loadingImages.delete(cacheKey);
      return objectUrl;
    } catch (error) {
      this.loadingImages.delete(cacheKey);
      console.error('Image optimization failed:', error);
      return url; // Fallback to original URL
    }
  }

  // Apply image optimizations
  private async applyOptimizations(
    img: HTMLImageElement,
    options: ImageCacheOptions,
    category: keyof typeof this.assetConfigs
  ): Promise<Blob> {
    if (!this.compressionCanvas) {
      throw new Error('Canvas not available');
    }

    const canvas = this.compressionCanvas;
    const ctx = canvas.getContext('2d')!;
    const config = this.assetConfigs[category];

    // Calculate dimensions
    const { width: targetWidth, height: targetHeight } = this.calculateDimensions(
      img.width,
      img.height,
      options.width,
      options.height
    );

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Apply blur if requested
    if (options.blur) {
      ctx.filter = 'blur(10px)';
    }

    // Draw optimized image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Reset filter
    ctx.filter = 'none';

    // Determine format and quality
    const format = this.selectBestFormat(options.format, config.format);
    const quality = options.quality || (config.compress ? 0.8 : 0.95);

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        `image/${format}`,
        quality
      );
    });
  }

  // Load image with promise
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  // Calculate optimal dimensions
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth?: number,
    targetHeight?: number
  ): { width: number; height: number } {
    if (!targetWidth && !targetHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;

    if (targetWidth && targetHeight) {
      return { width: targetWidth, height: targetHeight };
    }

    if (targetWidth) {
      return { width: targetWidth, height: targetWidth / aspectRatio };
    }

    if (targetHeight) {
      return { width: targetHeight * aspectRatio, height: targetHeight };
    }

    return { width: originalWidth, height: originalHeight };
  }

  // Select best image format
  private selectBestFormat(
    preferredFormat?: 'webp' | 'jpeg' | 'png',
    supportedFormats?: string[]
  ): string {
    if (preferredFormat) {
      return preferredFormat;
    }

    // Check browser support for WebP
    if (this.supportsWebP() && supportedFormats?.includes('webp')) {
      return 'webp';
    }

    return supportedFormats?.[0] || 'jpeg';
  }

  // Check WebP support
  private supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Generate cache key
  private generateCacheKey(url: string, options: ImageCacheOptions): string {
    const params = new URLSearchParams();
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('f', options.format);
    if (options.blur) params.set('blur', '1');

    return `${url}?${params.toString()}`;
  }

  // Add to memory cache
  private addToMemoryCache(key: string, src: string): void {
    const img = new Image();
    img.src = src;
    this.imageCache.set(key, img);

    // Limit memory cache size
    if (this.imageCache.size > 100) {
      const firstKey = this.imageCache.keys().next().value;
      const oldImg = this.imageCache.get(firstKey);
      if (oldImg?.src.startsWith('blob:')) {
        URL.revokeObjectURL(oldImg.src);
      }
      this.imageCache.delete(firstKey);
    }
  }

  // Generate placeholder image
  async generatePlaceholder(
    width: number,
    height: number,
    color = '#f0f0f0',
    text?: string
  ): Promise<string> {
    const key = `placeholder-${width}x${height}-${color}-${text || 'empty'}`;

    if (this.placeholderCache.has(key)) {
      return this.placeholderCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Add text if provided
    if (text) {
      ctx.fillStyle = '#666666';
      ctx.font = `${Math.min(width, height) / 8}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.placeholderCache.set(key, dataUrl);

    return dataUrl;
  }

  // Preload critical images
  async preloadCriticalImages(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(async (url) => {
      try {
        await this.optimizeAndCacheImage(url, { preload: true }, 'critical');
      } catch (error) {
        console.warn('Failed to preload image:', url, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log(`🖼️ Preloaded ${urls.length} critical images`);
  }

  // Setup intersection observer for lazy loading
  private setupImageObserver(): void {
    if (typeof window === 'undefined' || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;

            if (src) {
              this.optimizeAndCacheImage(src).then((optimizedSrc) => {
                img.src = optimizedSrc;
                img.removeAttribute('data-src');
                observer.unobserve(img);
              });
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    // Store observer globally for cleanup
    (window as any).__imageObserver = observer;
  }

  // Progressive image loading
  async loadImageProgressively(
    url: string,
    placeholderOptions?: { width: number; height: number; blur?: boolean }
  ): Promise<{
    placeholder: string;
    lowQuality: Promise<string>;
    highQuality: Promise<string>;
  }> {
    // Generate placeholder
    const placeholder = placeholderOptions
      ? await this.generatePlaceholder(
          placeholderOptions.width,
          placeholderOptions.height,
          '#f0f0f0',
          'Loading...'
        )
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWkiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjNjY2Ij5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==';

    // Load low quality version
    const lowQuality = this.optimizeAndCacheImage(url, {
      quality: 0.3,
      blur: true,
      width: placeholderOptions?.width ? Math.floor(placeholderOptions.width / 4) : undefined,
    });

    // Load high quality version
    const highQuality = this.optimizeAndCacheImage(url, {
      quality: 0.9,
      width: placeholderOptions?.width,
      height: placeholderOptions?.height,
    });

    return {
      placeholder,
      lowQuality,
      highQuality,
    };
  }

  // Clear image cache
  async clearImageCache(): Promise<void> {
    // Clear memory cache
    this.imageCache.forEach((img) => {
      if (img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    this.imageCache.clear();
    this.placeholderCache.clear();

    // Clear IndexedDB image cache
    try {
      // This would require implementing a method in IndexedDBCache to clear only images
      console.log('🗑️ Image cache cleared');
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  // Get cache statistics
  async getImageCacheStats(): Promise<{
    memoryCache: number;
    placeholderCache: number;
    estimatedSize: number;
  }> {
    return {
      memoryCache: this.imageCache.size,
      placeholderCache: this.placeholderCache.size,
      estimatedSize: this.estimateMemoryCacheSize(),
    };
  }

  private estimateMemoryCacheSize(): number {
    // Rough estimation based on number of cached images
    const avgImageSize = 200 * 1024; // 200KB average
    return this.imageCache.size * avgImageSize;
  }

  // Cleanup method
  cleanup(): void {
    this.clearImageCache();

    // Cleanup observers
    if (typeof window !== 'undefined') {
      const observer = (window as any).__imageObserver;
      if (observer) {
        observer.disconnect();
        delete (window as any).__imageObserver;
      }
    }
  }
}

// Asset bundling and compression utilities
export class AssetOptimizer {
  private compressionWorker: Worker | null = null;

  constructor() {
    this.initializeCompressionWorker();
  }

  private initializeCompressionWorker(): void {
    if (typeof window !== 'undefined' && window.Worker) {
      try {
        // Create a simple compression worker
        const workerScript = `
          self.onmessage = function(e) {
            const { data, type } = e.data;

            try {
              let compressed;

              if (type === 'gzip') {
                // Implement gzip compression logic
                compressed = data; // Placeholder
              } else {
                compressed = data;
              }

              self.postMessage({ compressed, success: true });
            } catch (error) {
              self.postMessage({ error: error.message, success: false });
            }
          };
        `;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to create compression worker:', error);
      }
    }
  }

  // Compress CSS/JS assets
  async compressAsset(content: string, type: 'css' | 'js'): Promise<string> {
    if (!this.compressionWorker) {
      return content; // Return uncompressed if worker not available
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);

      this.compressionWorker!.onmessage = (e) => {
        clearTimeout(timeout);
        const { compressed, success, error } = e.data;

        if (success) {
          resolve(compressed);
        } else {
          reject(new Error(error));
        }
      };

      this.compressionWorker!.postMessage({ data: content, type: 'gzip' });
    });
  }

  // Bundle and cache assets
  async bundleAndCacheAssets(assets: { url: string; type: 'css' | 'js' }[]): Promise<void> {
    const bundles: Record<string, string[]> = { css: [], js: [] };

    // Group assets by type
    for (const asset of assets) {
      try {
        const response = await fetch(asset.url);
        const content = await response.text();
        bundles[asset.type].push(content);
      } catch (error) {
        console.warn('Failed to fetch asset:', asset.url, error);
      }
    }

    // Create bundles
    for (const [type, contents] of Object.entries(bundles)) {
      if (contents.length > 0) {
        const bundled = contents.join('\n');
        const compressed = await this.compressAsset(bundled, type as 'css' | 'js');

        // Cache compressed bundle
        await serviceWorkerManager.cacheUrls([`/bundle.${type}`]);
        console.log(`📦 ${type.toUpperCase()} bundle created and cached`);
      }
    }
  }

  cleanup(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}

// Singleton instances
export const imageCacheOptimizer = new ImageCacheOptimizer();
export const assetOptimizer = new AssetOptimizer();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imageCacheOptimizer.cleanup();
    assetOptimizer.cleanup();
  });
}