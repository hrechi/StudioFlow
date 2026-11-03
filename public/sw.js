/*
 * ReFrame service worker: offline mode of the PWA (registered in production by
 * src/components/pwa/pwa-register.tsx).
 *
 *  - Home (/) and /portfolio are always saved on the device (on install, then refreshed
 *    when the app opens online), with their CSS/JS and photos: they open offline even
 *    if the user only reached them through in-app links.
 *  - Other pages (navigations): network first. Public pages that loaded are saved, so
 *    they still open offline. Private areas (dashboard, client space, login) are never
 *    stored on the device; offline they show /offline.
 *  - Build files (/_next/static, hashed): cache first, they never change.
 *  - Images and icons: shown from the cache, refreshed in the background.
 *  - API calls, Server Actions and in-app navigations (RSC) always go to the network;
 *    Next.js (experimental.useOffline) retries those once the connection is back.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v4";
const SHELL = `reframe-shell-${VERSION}`;
const PAGES = `reframe-pages-${VERSION}`;
const ASSETS = `reframe-assets-${VERSION}`;
const IMAGES = `reframe-images-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 30;
const MAX_IMAGES = 150;
// Always available offline, refreshed at most every 10 minutes.
const KEEP_PAGES = ["/", "/portfolio"];
const REFRESH_AFTER_MS = 10 * 60 * 1000;
// Image width saved for the kept pages (the browser picks one of several sizes).
const SAVED_IMAGE_WIDTH = 828;

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

/** Saves the build files and photos an HTML page links to. */
async function saveLinkedFiles(html) {
  const decode = (s) => s.replaceAll("&amp;", "&");
  const files = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  const images = [];
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    const srcset = tag.match(/srcSet="([^"]+)"|srcset="([^"]+)"/i);
    const src = tag.match(/\ssrc="([^"]+)"/);
    let pick = src?.[1];
    if (srcset) {
      // Candidate closest to SAVED_IMAGE_WIDTH ("url 640w, url 828w, …").
      const candidates = decode(srcset[1] ?? srcset[2])
        .split(",")
        .map((c) => c.trim().split(/\s+/))
        .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 }));
      candidates.sort((a, b) => Math.abs(a.w - SAVED_IMAGE_WIDTH) - Math.abs(b.w - SAVED_IMAGE_WIDTH));
      pick = candidates[0]?.u ?? pick;
    }
    if (pick && pick.startsWith("/") && !pick.startsWith("/api/")) images.push(decode(pick));
  }
  const save = async (cacheName, list) => {
    const cache = await caches.open(cacheName);
    await Promise.all(
      [...new Set(list)].map(async (u) => {
        if (!(await cache.match(u))) await cache.add(u).catch(() => {});
      }),
    );
  };
  await Promise.all([save(ASSETS, files), save(IMAGES, images)]);
}

/** Downloads a kept page (with the user's current session) and everything it needs. */
async function savePage(path) {
  try {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok || response.redirected) return;
    const html = await response.clone().text();
    await (await caches.open(PAGES)).put(path, response);
    await saveLinkedFiles(html);
  } catch {
    // Offline or server down: keep the previous copy.
  }
}

async function refreshKeptPages({ force = false } = {}) {
  const cache = await caches.open(PAGES);
  await Promise.all(
    KEEP_PAGES.map(async (path) => {
      const saved = await cache.match(path);
      const age = saved ? Date.now() - new Date(saved.headers.get("date") ?? 0).getTime() : Infinity;
      if (force || !saved || age > REFRESH_AFTER_MS) await savePage(path);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(PRECACHE);
      // The offline page also needs its CSS/JS: cache the build files it links to.
      await saveLinkedFiles(await (await cache.match(OFFLINE_URL)).text());
      await refreshKeptPages({ force: true });
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

async function trim(cacheName, max, keep = []) {
  const cache = await caches.open(cacheName);
  const keys = (await cache.keys()).filter((k) => !keep.includes(new URL(k.url).pathname));
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

self.addEventListener("message", (event) => {
  // The app opened online: make sure the kept pages are there and recent.
  if (event.data === "REFRESH_PAGES") event.waitUntil(refreshKeptPages());
  // Saved pages show the signed-in user's name in the header: on sign-in / sign-out
  // (pwa-register.tsx) forget them and save the kept pages again for the new session,
  // so a shared device never shows the previous user offline.
  if (event.data === "CLEAR_PAGES") {
    event.waitUntil(caches.delete(PAGES).then(() => refreshKeptPages({ force: true })));
  }
});

async function handleNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && !isPrivate(url.pathname)) {
      const copy = response.clone();
      caches
        .open(PAGES)
        .then((c) => c.put(request, copy).then(() => trim(PAGES, MAX_PAGES, KEEP_PAGES)));
    }
    return response;
  } catch {
    if (!isPrivate(url.pathname)) {
      const saved =
        (await caches.match(request, { cacheName: PAGES })) ??
        (await caches.match(url.pathname, { cacheName: PAGES })); // "/?deconnecte=1" → "/"
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

/** Offline: any saved size of the same photo (/_next/image?url=…&w=…). */
async function sameImageOtherSize(request) {
  const url = new URL(request.url);
  const source = url.pathname === "/_next/image" ? url.searchParams.get("url") : null;
  if (!source) return undefined;
  const cache = await caches.open(IMAGES);
  for (const key of await cache.keys()) {
    const k = new URL(key.url);
    if (k.pathname === "/_next/image" && k.searchParams.get("url") === source) return cache.match(key);
  }
  return undefined;
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
    .catch(async () => cached ?? (await sameImageOtherSize(request)) ?? Response.error());
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
