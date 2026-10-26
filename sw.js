/* v26.37 — Android WebAPK install requires fetch handler */
const CACHE = "rahgir-26.37";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([
    "./", "./index.html", "./manifest.json",
    "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
    "./style.css?v=26.37", "./app.js?v=26.37"
  ]).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
// no-op-capable fetch — required on Android Chrome for "Install app" / WebAPK
self.addEventListener("fetch", (event) => {
  event.respondWith((async () => {
    try {
      const res = await fetch(event.request);
      return res;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        return (await caches.match("./index.html")) || Response.error();
      }
      return Response.error();
    }
  })());
});
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
