// WorldToken Service Worker v20260405 - 每次更新版本号强制刷新
const CACHE = 'worldtoken-v202604060729';
const ASSETS = [
  '/wallet.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico'
];

// 安装：缓存新资源
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 激活：删除所有旧版本缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] 删除旧缓存:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// 请求：网络优先，失败才用缓存（wallet.html 始终走网络）
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // wallet.html 永远走网络，不用缓存
  if (e.request.url.includes('wallet.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
