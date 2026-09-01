// ============================================================================
// Service worker de Millions.
// El anterior no guardaba nada en caché (nunca llamaba cache.put), así que su
// fallback siempre fallaba: cero soporte offline pese a interceptar todo.
// Este sí cachea, y deja pasar sin tocar todo lo que sea datos.
// ============================================================================
const VERSION = "millions-v3";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.json", "/icon.png", "/icon-192.png", "/icon-512-maskable.png", "/icon-192-maskable.png", "/apple-touch-icon.png"])).catch(() => {}));
  self.skipWaiting();
});

// Al activar una versión nueva se tiran las cachés viejas
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Datos y API: nunca se cachean ni se interceptan. Un saldo viejo servido
  // desde caché sería peor que un error de red.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/.netlify/")
  ) return;

  // Assets con hash en el nombre: inmutables, caché primero
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(request).then((hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(ASSETS).then((c) => c.put(request, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  // Navegación y resto del shell: red primero, caché como respaldo offline
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || caches.match("/"))
      )
  );
});
