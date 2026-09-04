// Service worker simples: guarda uma cópia do app para abrir mesmo sem internet
// e é o que permite ao navegador oferecer "Instalar app" / "Adicionar à tela inicial".
// Suba esse número (v3, v4...) sempre que publicar uma atualização importante —
// isso força o navegador a descartar o cache antigo e buscar os arquivos novos.
const CACHE_NAME = 'cacau-qc-v3';
const APP_SHELL = [
  './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Não intercepta chamadas para o backend (Apps Script) — essas sempre precisam ir para a rede.
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        return resp;
      }).catch(() => cached);
    })
  );
});
