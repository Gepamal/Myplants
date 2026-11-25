// Cache de l'app pour un fonctionnement hors ligne.
// Incrémente VERSION à chaque modification des fichiers pour forcer la mise à jour.
const VERSION = "plantes-v25";
const FICHIERS = ["./", "index.html", "style.css?v=24", "data.js?v=24", "conseils.js?v=24", "app.js?v=24", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Réseau d'abord pour avoir les dernières fiches, cache si hors ligne. La météo n'est jamais mise en cache ici.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    // Les pages HTML sont toujours revalidées, pour que les mises à jour arrivent tout de suite.
    fetch(e.request.mode === "navigate" ? new Request(e.request, { cache: "no-cache" }) : e.request)
      .then((r) => { const copie = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copie)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
