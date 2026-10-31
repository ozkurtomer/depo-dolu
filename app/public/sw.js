// Depo Dolu service worker: uygulama kabuğunu çevrimdışı açılabilir yapar.
//
// Çevrimdışı politika:
// - Sayfalar (HTML) önce ağdan istenir; ağ yoksa önbellekteki son sürüm açılır.
// - Derlenmiş dosyalar (adlarında hash olan js/css, yazı tipleri, simgeler) önbellekten gelir.
// - Fiyat verisi (raw.githubusercontent.com) BURADA önbelleklenmez. Uygulama son başarılı
//   veriyi kendisi saklar ve çevrimdışıyken "son kaydedilen fiyatlar" uyarısıyla gösterir;
//   eski fiyat hiçbir zaman güncelmiş gibi sunulmaz.
const CACHE = 'depodolu-shell-v1';
const SHELL = ['./', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('depodolu-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js') || url.pathname.includes('/data/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('./')) ?? Response.error()),
    );
    return;
  }

  // Adında hash olan derleme dosyaları hiç değişmez: önbellekten. Diğerleri (simge, manifest,
  // widget) önbellekten hızlıca açılır ama arkada tazelenir.
  const hashed = /-[A-Z0-9]{8,}\.(js|css|woff2?)$/i.test(url.pathname) || url.pathname.includes('/media/');
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached && hashed) return cached;
      const network = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => { }));
        return cached;
      }
      return network;
    }),
  );
});
