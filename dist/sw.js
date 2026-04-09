/* Service Worker：本地开发避免 404；部署时脚本会将 worldtoken-v202604090411 后数字替换为 UTC 时间戳以刷新缓存 */
/* worldtoken-v202604090411 */
self.addEventListener('install', function (e) {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});
