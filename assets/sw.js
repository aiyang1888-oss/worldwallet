/* Service Worker：本地开发避免 404；部署脚本仅替换下一行中的 BUILD 戳以刷新缓存 */
/* worldtoken-v202604091200 */
self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});
