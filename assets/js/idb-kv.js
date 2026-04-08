/**
 * IndexedDB 键值镜像（与 localStorage 并存，便于迁移与离线容量）
 * 读路径仍以 localStorage 为准；关键键写入时同步镜像到 IDB。
 */
(function (global) {
  var DB_NAME = 'WorldWalletKV';
  var DB_VER = 1;
  var STORE = 'kv';
  var _dbPromise = null;

  function openDb() {
    if (_dbPromise) return _dbPromise;
    if (!global.indexedDB) {
      _dbPromise = Promise.reject(new Error('indexedDB unavailable'));
      return _dbPromise;
    }
    _dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onerror = function () { reject(req.error); };
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
    });
    return _dbPromise;
  }

  function wwIdbSet(key, valueStr) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
        tx.objectStore(STORE).put(valueStr, key);
      });
    });
  }

  function wwIdbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var rq = tx.objectStore(STORE).get(key);
        rq.onsuccess = function () {
          resolve(rq.result != null ? String(rq.result) : null);
        };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }

  function wwIdbMirrorSet(key, valueStr) {
    return wwIdbSet(key, valueStr).catch(function () {});
  }

  /**
   * 一次性把关键 localStorage 项复制到 IDB（幂等）
   */
  function wwMigrateLocalStorageToIdbOnce() {
    if (!global.indexedDB) return Promise.resolve();
    var flag = '';
    try { flag = localStorage.getItem('ww_idb_migrated_v1') || ''; } catch (e) {}
    if (flag === '1') return Promise.resolve();
    var keys = ['ww_wallet', 'ww_pin_hash', 'ww_pin_device_salt_v1', 'ww_hongbaos'];
    return openDb().then(function () {
      var p = Promise.resolve();
      keys.forEach(function (k) {
        p = p.then(function () {
          try {
            var v = localStorage.getItem(k);
            if (v != null) return wwIdbSet(k, v);
          } catch (e) {}
        });
      });
      return p;
    }).then(function () {
      try { localStorage.setItem('ww_idb_migrated_v1', '1'); } catch (e) {}
    }).catch(function () {});
  }

  global.wwIdbSet = wwIdbSet;
  global.wwIdbGet = wwIdbGet;
  global.wwIdbMirrorSet = wwIdbMirrorSet;
  global.wwMigrateLocalStorageToIdbOnce = wwMigrateLocalStorageToIdbOnce;
  global.wwIdb = { get: wwIdbGet, set: wwIdbSet };

  (function patchLocalStorageMirror() {
    try {
      if (!global.localStorage) return;
      var K = { ww_wallet: 1, ww_pin_hash: 1, ww_pin_device_salt_v1: 1, ww_hongbaos: 1 };
      var orig = global.localStorage.setItem.bind(global.localStorage);
      global.localStorage.setItem = function (key, val) {
        orig(key, val);
        if (K[key]) wwIdbMirrorSet(key, String(val));
      };
    } catch (e) {}
  })();
})(typeof window !== 'undefined' ? window : this);
