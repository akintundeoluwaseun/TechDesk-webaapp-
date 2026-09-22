// The smallest service worker that makes Monitor installable.
//
// A browser only offers "Install" when a page has a manifest AND a service
// worker with a fetch handler. This is that, and deliberately little else.
//
// Monitor is a window onto HQ: everything it shows was fetched a minute ago
// and is worth nothing tomorrow. So it caches the shell only -- enough to
// open and say "no connection" instead of showing the browser's error page
// -- and never caches an answer from the server. A cached branch summary is
// a lie about a shop, and the whole point of this app is to be right about
// what is happening now.
const SHELL = "techdesk-monitor-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["./", "./index.html"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // Never the backend. See above.
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html"))),
  );
});
