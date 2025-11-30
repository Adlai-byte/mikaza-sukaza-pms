// IndexedDB cache implementation for offline data storage
export class IndexedDBCache {
  private dbName = 'casa-cache-db';
  private version = 1;
  private db: IDBDatabase | null = null;

  // Store names for different data types
  private stores = {
    properties: 'properties',
    users: 'users',
    images: 'images',
    metadata: 'metadata',
    queries: 'queries',
  } as const;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('🗄️ IndexedDB cache initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(this.stores.properties)) {
          const propertyStore = db.createObjectStore(this.stores.properties, {
            keyPath: 'property_id'
          });
          propertyStore.createIndex('created_at', 'created_at');
          propertyStore.createIndex('updated_at', 'updated_at');
          propertyStore.createIndex('is_active', 'is_active');
        }

        if (!db.objectStoreNames.contains(this.stores.users)) {
          const userStore = db.createObjectStore(this.stores.users, {
            keyPath: 'user_id'
          });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('user_type', 'user_type');
        }

        if (!db.objectStoreNames.contains(this.stores.images)) {
          const imageStore = db.createObjectStore(this.stores.images, {
            keyPath: 'url'
          });
          imageStore.createIndex('property_id', 'property_id');
          imageStore.createIndex('cached_at', 'cached_at');
        }

        if (!db.objectStoreNames.contains(this.stores.metadata)) {
          db.createObjectStore(this.stores.metadata, {
            keyPath: 'key'
          });
        }

        if (!db.objectStoreNames.contains(this.stores.queries)) {
          const queryStore = db.createObjectStore(this.stores.queries, {
            keyPath: 'queryKey'
          });
          queryStore.createIndex('timestamp', 'timestamp');
          queryStore.createIndex('staleTime', 'staleTime');
        }

        console.log('🗄️ IndexedDB stores created/updated');
      };
    });
  }

  // Generic method to store data
  async setItem<T>(storeName: keyof typeof this.stores, key: string, data: T, ttl?: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readwrite');
      const store = transaction.objectStore(this.stores[storeName]);

      const item = {
        [storeName === 'queries' ? 'queryKey' : store.keyPath as string]: key,
        data,
        timestamp: Date.now(),
        ttl: ttl ? Date.now() + ttl : null,
        staleTime: ttl ? Date.now() + ttl : null,
      };

      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to get data
  async getItem<T>(storeName: keyof typeof this.stores, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readonly');
      const store = transaction.objectStore(this.stores[storeName]);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if item has expired
        if (result.ttl && Date.now() > result.ttl) {
          // Remove expired item
          this.removeItem(storeName, key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Remove specific item
  async removeItem(storeName: keyof typeof this.stores, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readwrite');
      const store = transaction.objectStore(this.stores[storeName]);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get all items from a store
  async getAllItems<T>(storeName: keyof typeof this.stores): Promise<T[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.stores[storeName]], 'readonly');
      const store = transaction.objectStore(this.stores[storeName]);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.map((item: any) => item.data);
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Clear expired items
  async clearExpired(): Promise<void> {
    if (!this.db) await this.init();

    const stores = Object.values(this.stores);
    const currentTime = Date.now();

    for (const storeName of stores) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const value = cursor.value;
          if (value.ttl && currentTime > value.ttl) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }

  // Store React Query cache data
  async storeQueryData(queryKey: string, data: any, staleTime: number = 5 * 60 * 1000): Promise<void> {
    await this.setItem('queries', queryKey, data, staleTime);
  }

  // Get React Query cache data
  async getQueryData<T>(queryKey: string): Promise<T | null> {
    return await this.getItem<T>('queries', queryKey);
  }

  // Store property data with relationships
  async storeProperty(property: any): Promise<void> {
    await this.setItem('properties', property.property_id, property, 24 * 60 * 60 * 1000); // 24 hours
  }

  // Get property data
  async getProperty(propertyId: string): Promise<any | null> {
    return await this.getItem('properties', propertyId);
  }

  // Store user data
  async storeUser(user: any): Promise<void> {
    await this.setItem('users', user.user_id, user, 12 * 60 * 60 * 1000); // 12 hours
  }

  // Get user data
  async getUser(userId: string): Promise<any | null> {
    return await this.getItem('users', userId);
  }

  // Store image blob for offline access
  async storeImage(url: string, blob: Blob, propertyId?: string): Promise<void> {
    const imageData = {
      url,
      blob: await this.blobToBase64(blob),
      property_id: propertyId,
      cached_at: Date.now(),
      size: blob.size,
      type: blob.type,
    };

    await this.setItem('images', url, imageData, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  // Get cached image
  async getImage(url: string): Promise<Blob | null> {
    const imageData = await this.getItem<any>('images', url);
    if (!imageData) return null;

    return this.base64ToBlob(imageData.blob, imageData.type);
  }

  // Utility methods
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string, type: string): Blob {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    properties: number;
    users: number;
    images: number;
    queries: number;
    totalSize: number;
  }> {
    if (!this.db) await this.init();

    const stats = {
      properties: 0,
      users: 0,
      images: 0,
      queries: 0,
      totalSize: 0,
    };

    for (const [key, storeName] of Object.entries(this.stores)) {
      if (key === 'metadata') continue;

      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();

      await new Promise<void>((resolve) => {
        countRequest.onsuccess = () => {
          stats[key as keyof typeof stats] = countRequest.result;
          resolve();
        };
      });
    }

    // Estimate total size (rough calculation)
    stats.totalSize = await this.estimateDbSize();

    return stats;
  }

  private async estimateDbSize(): Promise<number> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      } catch (error) {
        console.warn('Failed to estimate storage usage:', error);
      }
    }
    return 0;
  }

  // Clear all cache
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    const stores = Object.values(this.stores);
    for (const storeName of stores) {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('🗄️ IndexedDB cache cleared');
  }
}

// Singleton instance
export const indexedDBCache = new IndexedDBCache();

// Initialize cache on module load
if (typeof window !== 'undefined') {
  indexedDBCache.init().catch(console.error);
}