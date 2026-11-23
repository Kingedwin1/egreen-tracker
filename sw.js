// Egom service worker: works offline for the app shell, and shows push notifications.
const CACHE = "egom-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/badge-96.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// The page: network first (so updates show at once), the saved copy when offline.
// Everything else from this site: saved copy first. Other sites (Supabase, fonts, OCR): untouched.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return res; })
      .catch(() => caches.match("/").then((r) => r || caches.match("/index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});

// Push: { title, body, url, tag }
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  const title = d.title || "Egom";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "",
    icon: "/icon-192.png",
    badge: "/badge-96.png",
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/", location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(location.origin)) { c.navigate(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
