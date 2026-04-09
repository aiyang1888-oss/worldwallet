/* Service Worker：BUILD 戳与 wallet.runtime.js 中 WW_APP_CACHE_NAME 对齐以便清理旧缓存 */
/* worldtoken-v202604091300 */
var WW_APP_CACHE_NAME = 'worldtoken-static-v202604091300';
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(WW_APP_CACHE_NAME).then(function () {
      return self.skipWaiting();
    })
  );
});
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            if (k.indexOf('worldtoken-') === 0 && k !== WW_APP_CACHE_NAME) return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
