/**
 * Service Worker for vacansee-au
 *
 * Provides offline functionality and caching for the room availability app.
 * Caches static assets and API responses for offline access.
 */

const CACHE_VERSION = "1.0.0";
const CACHE_NAME = `vacansee-au-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `vacansee-au-static-v${CACHE_VERSION}`;
const API_CACHE_NAME = `vacansee-au-api-v${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";

// Static assets to cache on install
const STATIC_ASSETS = [
  OFFLINE_PAGE,
  "/manifest.json",
  "/favicon.ico",
  "/apple-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

// Pages to cache on first visit
const CACHED_PAGES = [
  "/",
  "/available-now",
  "/available-soon",
  "/check",
  "/rooms",
  "/graph",
  "/custom-graph",
];

// API endpoints to cache
const API_ENDPOINTS = [
  "/api/schedule",
  "/api/rooms",
  "/api/available-now",
  "/api/available-soon",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching static assets");
        // Cache critical assets with fallback for failures
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err);
              return null;
            }),
          ),
        );
      })
      .then(() => {
        console.log("Service Worker: Static assets cached");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Failed to cache static assets", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  const currentCaches = [STATIC_CACHE_NAME, API_CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("Service Worker: Activated");
        return self.clients.claim();
      }),
  );
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle API requests with stale-while-revalidate strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests with network-first strategy
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
});

/**
 * Handle API requests with stale-while-revalidate strategy
 */
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Always try to fetch from network
  const fetchPromise = fetch(request)
    .then((response) => {
      // Cache successful responses
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // Network failed, return cached response if available
      return cachedResponse;
    });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // If not in cache, fetch from network and cache it
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("Service Worker: Failed to fetch static asset", error);
    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlineResponse = await cache.match(OFFLINE_PAGE);
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    throw error;
  }
}

/**
 * Handle navigation requests with network-first strategy
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Network timeout")), 5000),
      ),
    ]);

    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("Service Worker: Network failed, trying cache", error);

    // If network fails, try to serve from cache
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cached version, return offline page
    const offlineResponse = await cache.match(OFFLINE_PAGE);
    if (offlineResponse) {
      return offlineResponse;
    }

    // Last resort fallback
    return new Response("Offline - Please check your connection", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);

  // Check if it's a static file extension
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
  ];
  const hasStaticExtension = staticExtensions.some((ext) =>
    url.pathname.endsWith(ext),
  );

  // Check if it's a Next.js static asset
  const isNextStatic = url.pathname.startsWith("/_next/static/");

  return hasStaticExtension || isNextStatic;
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync", event.tag);

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  // For example, sync offline form submissions when back online
  console.log("Service Worker: Performing background sync");
}

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push notification received");

  const options = {
    body: event.data ? event.data.text() : "New notification from vacansee-au",
    icon: "/web-app-manifest-192x192.png",
    badge: "/web-app-manifest-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open vacansee-au",
        icon: "/web-app-manifest-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/web-app-manifest-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("vacansee-au", options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
