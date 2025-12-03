// Service Worker registration and management
import { indexedDBCache } from './indexeddb-cache';

// Check if the current hostname is a LAN IP address
function isLanIP(hostname: string): boolean {
  // Match private IPv4 ranges:
  // 10.0.0.0 - 10.255.255.255 (Class A)
  // 172.16.0.0 - 172.31.255.255 (Class B)
  // 192.168.0.0 - 192.168.255.255 (Class C)
  const lanPatterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
    /^192\.168\.\d{1,3}\.\d{1,3}$/,
  ];

  return lanPatterns.some(pattern => pattern.test(hostname));
}

// Check if we're in a secure context that supports service workers
function isSecureContextForServiceWorker(): { isSecure: boolean; reason?: string } {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // HTTPS is always secure
  if (protocol === 'https:') {
    return { isSecure: true };
  }

  // localhost and 127.0.0.1 are secure in development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { isSecure: true };
  }

  // LAN IPs are NOT secure contexts
  if (isLanIP(hostname)) {
    return {
      isSecure: false,
      reason: `LAN IP (${hostname}) is not a secure context. Service workers require HTTPS or localhost. ` +
              `To enable service workers on LAN, you can: ` +
              `1) Use localhost instead of the IP, or ` +
              `2) Set up HTTPS with a local certificate, or ` +
              `3) In Chrome, add the origin to chrome://flags/#unsafely-treat-insecure-origin-as-secure`
    };
  }

  // Other non-secure contexts
  return {
    isSecure: false,
    reason: `Non-secure context (${protocol}//${hostname}). Service workers require HTTPS.`
  };
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline = navigator.onLine;
  private offlineQueue: Array<{ url: string; options: RequestInit; resolve: Function; reject: Function }> = [];
  private isLanEnvironment: boolean = false;

  constructor() {
    this.setupNetworkListeners();
    this.isLanEnvironment = isLanIP(window.location.hostname);
  }

  // Check if service worker is available in this context
  isServiceWorkerAvailable(): boolean {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    const { isSecure } = isSecureContextForServiceWorker();
    return isSecure;
  }

  // Register service worker
  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported in this browser');
      return;
    }

    // Check if we're in a secure context
    const { isSecure, reason } = isSecureContextForServiceWorker();
    if (!isSecure) {
      console.warn(`⚠️ Service Worker registration skipped: ${reason}`);
      console.info('ℹ️ The app will work normally but without offline caching capabilities.');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('🔧 Service Worker registered successfully');

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.showUpdateNotification();
            }
          });
        }
      });

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Unregister service worker
  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      console.log('🔧 Service Worker unregistered');
    }
  }

  // Update service worker
  async update(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
      console.log('🔧 Service Worker update triggered');
    }
  }

  // Network listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Back online');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline');
      this.isOnline = false;
    });
  }

  // Enhanced fetch with offline support
  async enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Check if we're offline
    if (!this.isOnline) {
      // Try to get from IndexedDB cache first
      try {
        const cachedData = await indexedDBCache.getQueryData(url);
        if (cachedData) {
          console.log('📱 Serving from IndexedDB cache:', url);
          return new Response(JSON.stringify(cachedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.warn('Failed to get from IndexedDB:', error);
      }

      // Queue the request for when we're back online
      return new Promise((resolve, reject) => {
        this.offlineQueue.push({ url, options, resolve, reject });

        // Return a placeholder response for now
        reject(new Error('Offline - request queued'));
      });
    }

    try {
      const response = await fetch(url, options);

      // Cache successful GET requests
      if (response.ok && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
        try {
          const responseClone = response.clone();
          const data = await responseClone.json();
          await indexedDBCache.storeQueryData(url, data);
        } catch (error) {
          // Ignore JSON parsing errors for non-JSON responses
        }
      }

      return response;
    } catch (error) {
      // Network error - try cache
      try {
        const cachedData = await indexedDBCache.getQueryData(url);
        if (cachedData) {
          console.log('📱 Serving stale data from cache:', url);
          return new Response(JSON.stringify(cachedData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }

      throw error;
    }
  }

  // Process queued requests when back online
  private async processOfflineQueue(): Promise<void> {
    console.log(`🔄 Processing ${this.offlineQueue.length} queued requests`);

    while (this.offlineQueue.length > 0) {
      const { url, options, resolve, reject } = this.offlineQueue.shift()!;

      try {
        const response = await fetch(url, options);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }
  }

  // Handle messages from service worker
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'CACHE_SIZE':
        console.log('📊 Cache size:', this.formatBytes(data.size));
        break;

      case 'CACHE_UPDATED':
        console.log('📦 Cache updated:', data);
        break;

      default:
        console.log('📨 Message from SW:', event.data);
    }
  }

  // Cache management
  async cacheUrls(urls: string[]): Promise<void> {
    if (this.registration && this.registration.active) {
      this.registration.active.postMessage({
        type: 'CACHE_URLS',
        payload: { urls }
      });
    }
  }

  async clearAllCaches(): Promise<void> {
    if (this.registration && this.registration.active) {
      this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
    }

    // Also clear IndexedDB cache
    await indexedDBCache.clearAll();
  }

  async getCacheSize(): Promise<number> {
    return new Promise((resolve) => {
      if (this.registration && this.registration.active) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_SIZE') {
            resolve(event.data.size);
          }
        };

        this.registration.active.postMessage(
          { type: 'GET_CACHE_SIZE' },
          [messageChannel.port2]
        );
      } else {
        resolve(0);
      }
    });
  }

  // Preload critical resources
  async preloadCriticalResources(): Promise<void> {
    const criticalUrls = [
      '/static/js/bundle.js',
      '/static/css/main.css',
      '/api/properties',
      '/api/users',
    ];

    await this.cacheUrls(criticalUrls);
    console.log('📦 Critical resources preloaded');
  }

  // Background sync
  async requestBackgroundSync(tag: string): Promise<void> {
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.registration.sync.register(tag);
        console.log('🔄 Background sync registered:', tag);
      } catch (error) {
        console.warn('Background sync failed:', error);
      }
    }
  }

  // Push notifications
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration || !('pushManager' in this.registration)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // Add your VAPID public key here
          'YOUR_VAPID_PUBLIC_KEY'
        )
      });

      console.log('🔔 Push notification subscription created');
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // Show update notification
  private showUpdateNotification(): void {
    // You can integrate this with your toast system
    console.log('🔄 New version available');

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Update Available', {
        body: 'A new version of the app is available. Refresh to update.',
        icon: '/icon-192x192.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          { action: 'refresh', title: 'Refresh Now' },
          { action: 'dismiss', title: 'Later' }
        ]
      });
    }
  }

  // Utility functions
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    serviceWorkerCache: number;
    indexedDBCache: any;
    totalSize: number;
  }> {
    const [swCacheSize, idbStats] = await Promise.all([
      this.getCacheSize(),
      indexedDBCache.getCacheStats()
    ]);

    return {
      serviceWorkerCache: swCacheSize,
      indexedDBCache: idbStats,
      totalSize: swCacheSize + idbStats.totalSize
    };
  }

  // Check if app can be installed (PWA)
  isInstallable(): boolean {
    return 'beforeinstallprompt' in window;
  }

  // Trigger PWA install prompt
  async showInstallPrompt(): Promise<boolean> {
    // This would be integrated with the beforeinstallprompt event
    // Implementation depends on your PWA setup
    console.log('📱 Install prompt triggered');
    return false;
  }

  // Check connectivity status
  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Force cache refresh
  async refreshCache(): Promise<void> {
    if (this.registration && this.registration.active) {
      await this.registration.active.postMessage({ type: 'REFRESH_CACHE' });
    }

    // Also clear IndexedDB to force fresh data
    await indexedDBCache.clearExpired();
    console.log('🔄 Cache refreshed');
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Auto-register service worker when module loads
if (typeof window !== 'undefined') {
  serviceWorkerManager.register().catch(console.error);
}