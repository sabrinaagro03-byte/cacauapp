// Service worker do Controle de Qualidade do Cacau.
//
// IMPORTANTE — por que essa versão é diferente da anterior:
// A versão antiga servia SEMPRE o app guardado em cache, mesmo quando havia uma
// versão nova publicada. Por isso as atualizações não apareciam no celular.
// Agora usamos a estratégia "rede primeiro, cache como reserva":
//   - Com internet: busca sempre a versão mais recente do servidor.
//   - Sem internet: usa a última cópia salva, para o app continuar funcionando em campo.

const CACHE_NAME = 'cacau-qc-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
  // Ativa a versão nova imediatamente, sem esperar o app ser fechado.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Chamadas ao backend (Apps Script) nunca são cacheadas — sempre vão para a rede.
  if (req.url.includes('script.google.com')) return;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((resp) => {
        // Deu certo online: guarda uma cópia atualizada e entrega a versão nova.
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => {
        // Sem internet: entrega a última cópia salva.
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // Se for uma navegação (abrir o app), cai para o index salvo.
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});
