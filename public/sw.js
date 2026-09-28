// Service worker do Orbit: cache para funcionar offline. Sem dependência (nada de Workbox).
//
// Ao mudar este arquivo, suba o número da versão abaixo (orbit-v1 -> orbit-v2, etc.):
// o nome do cache muda, o `activate` apaga o cache antigo e todo mundo recebe os arquivos novos.
// Esquecer de subir a versão faz o service worker continuar servindo arquivos velhos do cache.
const CACHE_NAME = 'orbit-v2'
const FONT_CACHE = 'orbit-fonts-v1'
const FONT_ORIGINS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== FONT_CACHE).map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (FONT_ORIGINS.includes(url.origin)) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE))
    return
  }

  // Outras origens (CDN, etc.): deixa o navegador cuidar, sem interceptar.
  if (url.origin !== self.location.origin) return

  // Vercel Web Analytics (/_vercel/insights/script.js): nome sem hash, o cache first o deixaria velho para sempre
  if (url.pathname.startsWith('/_vercel/')) return

  // Navegação (HTML): network first, cache como reserva offline. Assim a versão nova aparece
  // no primeiro acesso online, e só cai pro cache quando não há rede.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  // Arquivos do build (com hash no nome) e demais estáticos same-origin (ícones, manifest):
  // cache first. O hash muda a cada build, então nunca ficam velhos.
  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    // Offline: tenta a própria URL no cache e, sem isso, cai para a página inicial cacheada
    // (app de página única; qualquer navegação cai no mesmo index.html).
    const cached = await cache.match(request) ?? await cache.match(new URL('./', self.location.origin))
    if (cached) return cached
    throw new Error('offline e sem versão em cache')
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return cached ?? network
}
