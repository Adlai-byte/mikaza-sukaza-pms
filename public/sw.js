// Service Worker for advanced caching strategies
const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `casa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `casa-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `casa-images-${CACHE_VERSION}`;
const API_CACHE = `casa-api-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Static assets to cache immediately
// IMPORTANT: Only cache assets that actually exist
// Vite builds to /assets/ not /static/
const STATIC_ASSETS = [
  '/',
  // Static assets will be cached dynamically as they're loaded
  // This prevents 404 errors during service worker installation
];

// Routes and their caching strategies
const ROUTE_CACHE_STRATEGIES = [
  {
    pattern: /\.(js|css)$/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: STATIC_CACHE,
    maxAge: 24 * 60 * 60 * 1000, // 1 day - JS/CSS should always get latest
  },
  {
    pattern: /\.(woff2?|ttf|eot)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: STATIC_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year for fonts
  },
  {
    pattern: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: IMAGE_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  {
    pattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
  },
  {
    pattern: /\/properties/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: DYNAMIC_CACHE,
    maxAge: 10 * 60 * 1000, // 10 minutes
  },
  {
    pattern: /\/users/,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: DYNAMIC_CACHE,
    maxAge: 15 * 60 * 1000, // 15 minutes
  },
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        // Cache assets individually to avoid failure if any single asset fails
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}:`, err.message);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('✅ Service Worker installed (assets will be cached dynamically)');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to install service worker:', error);
        // Don't fail installation - skip waiting anyway
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('casa-') &&
                cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName !== API_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Find matching cache strategy
  const routeConfig = ROUTE_CACHE_STRATEGIES.find(config =>
    config.pattern.test(request.url)
  );

  if (routeConfig) {
    event.respondWith(
      handleCacheStrategy(request, routeConfig)
    );
  } else {
    // Default strategy for unmatched routes
    event.respondWith(
      handleCacheStrategy(request, {
        strategy: CACHE_STRATEGIES.NETWORK_FIRST,
        cache: DYNAMIC_CACHE,
        maxAge: 5 * 60 * 1000, // 5 minutes
      })
    );
  }
});

// Handle different caching strategies
async function handleCacheStrategy(request, config) {
  const { strategy, cache: cacheName, maxAge } = config;

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request, cacheName, maxAge);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request, cacheName, maxAge);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request, cacheName, maxAge);

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request, cacheName);

    default:
      return networkFirst(request, cacheName, maxAge);
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Check if cached response is still fresh
      const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
      const now = new Date();

      if (now.getTime() - cachedDate.getTime() < maxAge) {
        return cachedResponse;
      }
    }

    // If not in cache or expired, fetch from network
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone the response because it can only be consumed once
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);

    // Fallback to cache if network fails
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback if available
    return getOfflineFallback(request);
  }
}

// Network First strategy
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.warn('Network first failed, falling back to cache:', error);

    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return getOfflineFallback(request);
  }
}

// Stale While Revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Always try to update cache in background
  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn('Background fetch failed:', error);
    });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // If no cached response, wait for network
  return networkPromise || getOfflineFallback(request);
}

// Cache Only strategy
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  return cachedResponse || getOfflineFallback(request);
}

// Offline fallback responses
function getOfflineFallback(request) {
  const url = new URL(request.url);

  // Return different fallbacks based on request type
  if (request.headers.get('accept')?.includes('text/html')) {
    // HTML fallback - offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Casa PMS</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, sans-serif;
              text-align: center;
              padding: 2rem;
              background: #f5f5f5;
            }
            .container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #333; margin-bottom: 1rem; }
            p { color: #666; line-height: 1.5; }
            button {
              background: #007bff;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 1rem;
            }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📴</div>
            <h1>You're Offline</h1>
            <p>It looks like you've lost your internet connection. Don't worry, your cached data is still available.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
          <script>
            // Auto-retry when online
            window.addEventListener('online', () => {
              window.location.reload();
            });
          </script>
        </body>
      </html>
    `, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (request.headers.get('accept')?.includes('application/json')) {
    // JSON fallback
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'Request failed: You are currently offline',
      cached: false
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    // Image fallback - return a placeholder SVG
    const placeholder = `
      <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" font-family="system-ui" font-size="14"
              text-anchor="middle" dy=".3em" fill="#666">
          Image Offline
        </text>
      </svg>
    `;

    return new Response(placeholder, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }

  // Generic fallback
  return new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-properties') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when back online
async function syncOfflineActions() {
  try {
    // Get pending actions from IndexedDB
    // This would integrate with your IndexedDB cache
    console.log('🔄 Syncing offline actions...');

    // Implement your sync logic here
    // For example: sync failed mutations, upload cached images, etc.

    console.log('✅ Offline actions synced');
  } catch (error) {
    console.error('❌ Failed to sync offline actions:', error);
  }
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || 'New notification from Casa & Concierge PMS',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Casa & Concierge PMS', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Handle action buttons
    console.log('Notification action clicked:', event.action);
  } else {
    // Handle notification click
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'CACHE_URLS':
      cacheUrls(payload.urls);
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.ports[0]?.postMessage({ type: 'CACHE_SIZE', size });
      });
      break;

    default:
      console.log('Unknown message type:', type);
  }
});

// Helper functions
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
  console.log('📦 Cached URLs:', urls.length);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('🗑️ All caches cleared');
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const text = await response.text();
        totalSize += new Blob([text]).size;
      }
    }
  }

  return totalSize;
}

console.log('🔧 Service Worker loaded successfully');