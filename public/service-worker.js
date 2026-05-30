// Teacher Timer service worker
// Strategy:
//   - HTML navigations: network-first, falling back to cached shell (so
//     deployed updates propagate but offline still loads the app).
//   - Static assets (hashed JS/CSS/img): cache-first (immutable URLs).
//   - Cross-origin requests: pass through, never intercept.

const CACHE = "teacher-timer-cache-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const acceptsHtml =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (acceptsHtml) {
    // Network-first for HTML so deploys propagate.
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return resp;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match("./index.html") || caches.match("./"))
        )
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200 && resp.type === "basic") {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return resp;
          })
          .catch(() => cached)
    )
  );
});
