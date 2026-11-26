// Egom service worker: opens fast on slow networks, works offline, and shows push notifications.
const CACHE = "egom-v3";
const SHELL = ["/", "/app/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/badge-96.png"];
// Libraries and fonts from other sites that never change under the same address: keep a copy
const KEEP = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const save = (key, res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Libraries and fonts: the saved copy at once, refreshed in the background
  if (KEEP.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => save(req, res)).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;           // Supabase, OCR and the rest: untouched
  if (url.searchParams.has("fresh")) return;            // the app checking for a new version

  // Pages: the newest copy from the internet, but if that takes more than 3 seconds,
  // the saved copy (the download carries on and is saved for next time)
  if (req.mode === "navigate") {
    const key = url.pathname.startsWith("/app") ? "/app/" : url.pathname;
    const net = fetch(req).then((res) => save(key, res));
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const fallback = () => caches.match(key).then((r) => r || caches.match("/app/"));
      const timer = setTimeout(() => fallback().then((r) => { if (r && !done) { done = true; resolve(r); } }), 3000);
      net.then((res) => { if (!done) { done = true; clearTimeout(timer); resolve(res); } })
        .catch(() => fallback().then((r) => { if (!done) { done = true; clearTimeout(timer); resolve(r || Response.error()); } }));
    }));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  // Everything else from this site: saved copy first
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
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
    data: { url: d.url || "/app/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  let path = (e.notification.data && e.notification.data.url) || "/app/";
  if (path === "/" || path.startsWith("/?")) path = "/app" + path;   // older messages pointed at the home page
  const target = new URL(path, location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(location.origin)) { c.navigate(target).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
