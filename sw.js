const CACHE = 'advoca-v1';
const STATIC = ['/', '/index.html', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (!e.request.url.startsWith('http')) return;

  // APIs externas: network only
  if (url.hostname.includes('z-api.io') || url.hostname.includes('emailjs.com') ||
      url.hostname.includes('escavador.com') || url.hostname.includes('onrender.com') ||
      url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Navegação: Network First → Cache → Offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => { caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')).then(r => r || offlinePage()))
    );
    return;
  }

  // Demais: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Advoca.ai', body: 'Nova notificação' };
  e.waitUntil(self.registration.showNotification(data.title || 'Advoca.ai', {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [{ action: 'abrir', title: '📋 Abrir' }, { action: 'fechar', title: 'Fechar' }]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'fechar') return;
  e.waitUntil(clients.matchAll({ type: 'window' }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return clients.openWindow(e.notification.data?.url || '/');
  }));
});

function offlinePage() {
  return new Response(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Advoca.ai — Offline</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#0f1117;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}.logo{font-size:2rem;font-weight:700;color:#00d4ff;margin-bottom:.5rem}.icon{font-size:4rem;margin:1.5rem 0}p{color:#94a3b8;line-height:1.6;max-width:300px}button{margin-top:2rem;padding:.75rem 2rem;background:#1d4ed8;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer}</style>
  </head><body><div class="logo">Advoca.ai</div><div class="icon">📡</div><h1 style="margin-bottom:.75rem">Você está offline</h1><p>Verifique sua conexão com a internet para continuar usando o sistema.</p><button onclick="location.reload()">Tentar novamente</button></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
