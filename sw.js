// The smallest service worker that makes TechDesk installable.
//
// A browser only offers "Install" when a page has a manifest AND a service
// worker with a fetch handler. This is that, and deliberately little else:
// TechDesk already keeps every record on the device, so there is nothing
// here that needs to cache data or sync in the background, and a cache that
// serves a stale build to a shop is worse than no cache at all.
//
// So it caches the shell, serves the network first, and falls back to the
// cache only when the network is gone -- which is the case this exists for.
const SHELL = "techdesk-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Keep the latest copy of what we fetched, so a shop that loses its
        // connection mid-shift still has the app it was just using.
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});

// Tapping a TechDesk notification brings the app forward -- the open tab if
// there is one, a new one if not -- rather than doing nothing.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) => {
      const open = tabs.find((t) => "focus" in t);
      return open ? open.focus() : self.clients.openWindow("./");
    })
  );
});
