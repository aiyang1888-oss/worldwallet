/* 占位 Service Worker：本地开发/冒烟测试避免 404；生产可替换为真实缓存策略 */
self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});
