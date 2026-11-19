// Service worker: оболочка страницы работает офлайн.
// Главы (a/*.bin) страница сама кладёт в кэш «audio-v1»; здесь их только отдаём из кэша.
const SHELL = "shell-v1";
const FILES = ["./", "index.html", "m.bin", "app.webmanifest", "motion.js", "cat.jpg",
               "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // главы: из кэша, иначе сеть (кэширует сама страница, с прогрессом)
  if (url.pathname.includes("/a/")) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }

  // оболочка: сразу из кэша, параллельно обновляем из сети
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const key = req.mode === "navigate" ? "./" : req;
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then((r) => {
      if (r.ok) cache.put(key, r.clone());
      return r;
    }).catch(() => hit || Response.error());
    return hit || net;
  })());
});
