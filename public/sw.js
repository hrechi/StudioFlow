/*
 * ReFrame service worker: offline mode of the PWA (registered in production by
 * src/components/pwa/pwa-register.tsx).
 *
 *  - Pages (navigations): network first. Public pages that loaded are saved, so they
 *    still open offline. Private areas (dashboard, client space, login) are never
 *    stored on the device; offline they show /offline.
 *  - Build files (/_next/static, hashed): cache first, they never change.
 *  - Images and icons: shown from the cache, refreshed in the background.
 *  - API calls, Server Actions and in-app navigations (RSC) always go to the network;
 *    Next.js (experimental.useOffline) retries those once the connection is back.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v2";
const SHELL = `reframe-shell-${VERSION}`;
const PAGES = `reframe-pages-${VERSION}`;
const ASSETS = `reframe-assets-${VERSION}`;
const IMAGES = `reframe-images-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 30;
const MAX_IMAGES = 150;

const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/logo-reframe-white.svg",
  "/logo-reframe-black.svg",
];

const PRIVATE_PATHS = ["/dashboard", "/espace-client", "/login", "/register", "/deconnexion", "/api"];
const isPrivate = (path) => PRIVATE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(PRECACHE);
      // The offline page also needs its CSS/JS: cache the build files it links to.
      const html = await (await cache.match(OFFLINE_URL)).text();
      const files = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
      const assets = await caches.open(ASSETS);
      await Promise.all([...new Set(files)].map((f) => assets.add(f).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, PAGES, ASSETS, IMAGES];
      for (const key of await caches.keys()) {
        if (key.startsWith("reframe-") && !keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

// Saved public pages show the signed-in user's name in the header: the app asks to forget
// them on sign-in / sign-out (pwa-register.tsx), so a shared device never shows the
// previous user offline.
self.addEventListener("message", (event) => {
  if (event.data === "CLEAR_PAGES") event.waitUntil(caches.delete(PAGES));
});

async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && !isPrivate(url.pathname)) {
      const copy = response.clone();
      caches.open(PAGES).then((c) => c.put(request, copy).then(() => trim(PAGES, MAX_PAGES)));
    }
    return response;
  } catch {
    if (!isPrivate(url.pathname)) {
      const saved = await caches.match(request, { cacheName: PAGES });
      if (saved) return saved;
    }
    return (await caches.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const copy = response.clone();
    caches.open(ASSETS).then((c) => c.put(request, copy));
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(IMAGES).then((c) => c.put(request, copy).then(() => trim(IMAGES, MAX_IMAGES)));
      }
      return response;
    })
    .catch(() => cached ?? Response.error());
  return cached ?? network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // In-app navigations and prefetches (React Server Components payloads): network only.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
