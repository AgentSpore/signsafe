// SignSafe service worker — minimal shell cache for offline access.
// BUMP VERSION on every deploy to force stale client SW eviction.
const CACHE = "signsafe-v3";
const SHELL = ["/", "/history", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
      // Tell all open tabs to hard-reload so they pick up the new JS
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          try {
            client.postMessage({ type: "sw-updated" });
          } catch {}
        });
      }),
    ]),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never intercept API requests — they are streaming/dynamic.
  if (url.pathname.startsWith("/api/")) return;
  // Stale-while-revalidate for shell navigation.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then((m) => m || caches.match("/"))),
    );
    return;
  }
});
