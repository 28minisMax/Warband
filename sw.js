/* Warband Sheet service worker.
   Bump CACHE whenever you change any cached file so phones pick up the new version. */
var CACHE = "warband-v5";
var ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "favicon-32.png",
  "crimson-pro-latin-400-normal.woff2",
  "crimson-pro-latin-600-normal.woff2",
  "pirata-one-latin-400-normal.woff2",
  "unifrakturcook-latin-700-normal.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: "reload" }); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Pages: try the network first (so updates arrive), but fall back to the saved copy
   when offline or when the network takes more than 4 seconds. */
function networkFirst(req) {
  return caches.open(CACHE).then(function (cache) {
    var timeout = new Promise(function (_, rej) { setTimeout(rej, 4000); });
    return Promise.race([fetch(req), timeout]).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || cache.match("index.html");
      }).then(function (hit) { return hit || Response.error(); });
    });
  });
}

/* Everything else (icons, fonts): serve the saved copy instantly, refresh it in the background. */
function staleWhileRevalidate(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      return hit || net.then(function (res) { return res || Response.error(); });
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(req.mode === "navigate" ? networkFirst(req) : staleWhileRevalidate(req));
});
