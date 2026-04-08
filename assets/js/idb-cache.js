/**
 * IndexedDB 内存缓存层 - 性能优化 Phase 1
 * 三层缓存策略: Memory → localStorage → IndexedDB
 * 
 * 性能目标:
 * - 缓存命中率: ~95%
 * - localStorage 访问减少: ~70%
 * - 初始加载: -40%
 */

class IDBCache {
  constructor(maxSize = 10) {
    this._cache = new Map();
    this._maxSize = maxSize;
    this._idbReady = this._init();
    this._stats = {
      hits: 0,
      misses: 0,
      writes: 0
    };
  }

  /**
   * 初始化 IDB 缓存
   * 预加载关键数据到内存
   */
  async _init() {
    try {
      // 关键键列表（优先加载）
      const criticalKeys = [
        'ww_wallet',
        'ww_pin_hash',
        'ww_pin_device_salt_v1',
        'ww_idb_migrated_v1'
      ];

      // 并行加载所有关键键
      const promises = criticalKeys.map(key => this._loadFromLS(key));
      const values = await Promise.all(promises);

      // 填充内存缓存
      criticalKeys.forEach((key, idx) => {
        if (values[idx]) {
          this._cache.set(key, values[idx]);
        }
      });

      if (typeof window !== 'undefined' && window.WW_DEBUG) {
        console.log('[IDBCache] Initialized with', this._cache.size, 'keys');
      }
      return true;
    } catch (e) {
      console.error('[IDBCache] Init failed:', e.message);
      return false;
    }
  }

  /**
   * 从 localStorage 加载数据
   */
  _loadFromLS(key) {
    return new Promise((resolve) => {
      try {
        const value = localStorage.getItem(key);
        resolve(value);
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * GET 操作 - 三层缓存策略
   * 1. 内存缓存 (最快)
   * 2. localStorage (同步)
   * 3. IndexedDB (备份)
   */
  async get(key) {
    // 1. 检查内存缓存
    if (this._cache.has(key)) {
      this._stats.hits++;
      return this._cache.get(key);
    }

    // 2. 检查 localStorage
    try {
      const lsValue = localStorage.getItem(key);
      if (lsValue) {
        this._cache.set(key, lsValue);
        this._evictIfNeeded();
        this._stats.hits++;
        return lsValue;
      }
    } catch (e) {
      console.warn('[IDBCache] localStorage access failed:', e.message);
    }

    // 3. 检查 IndexedDB (异步备份)
    try {
      const idbValue = await this._getFromIDB(key);
      if (idbValue) {
        this._cache.set(key, idbValue);
        this._evictIfNeeded();
        this._stats.hits++;
        return idbValue;
      }
    } catch (e) {
      console.warn('[IDBCache] IDB access failed:', e.message);
    }

    // 未找到
    this._stats.misses++;
    return null;
  }

  /**
   * SET 操作 - 双写 + 内存缓存
   */
  async set(key, value) {
    // 1. 内存缓存
    this._cache.set(key, value);
    this._evictIfNeeded();

    // 2. localStorage (同步)
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('[IDBCache] localStorage write failed:', e.message);
    }

    // 3. IndexedDB (异步备份)
    try {
      await this._setInIDB(key, value);
    } catch (e) {
      console.warn('[IDBCache] IDB write failed:', e.message);
    }

    this._stats.writes++;
  }

  /**
   * LRU 缓存驱逐
   * 当缓存超过 maxSize 时，删除最旧的条目
   */
  _evictIfNeeded() {
    if (this._cache.size > this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
  }

  /**
   * 从 IndexedDB 读取（存根 - 实现见 idb-kv.js）
   */
  async _getFromIDB(key) {
    if (typeof wwIdbGet === 'function') {
      return await wwIdbGet(key);
    }
    if (window.wwIdb && typeof window.wwIdb.get === 'function') {
      return await window.wwIdb.get(key);
    }
    return null;
  }

  /**
   * 写入 IndexedDB（存根 - 实现见 idb-kv.js）
   */
  async _setInIDB(key, value) {
    if (typeof wwIdbSet === 'function') {
      await wwIdbSet(key, value);
      return;
    }
    if (window.wwIdb && typeof window.wwIdb.set === 'function') {
      await window.wwIdb.set(key, value);
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    this._cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    const hitRate = total > 0 ? ((this._stats.hits / total) * 100).toFixed(1) : 0;
    return {
      ...this._stats,
      total,
      hitRate: hitRate + '%',
      cacheSize: this._cache.size
    };
  }
}

// 创建全局缓存实例
window.wwIdbCache = new IDBCache();

// 等待 IDB 初始化完成
window.wwIdbCache._idbReady.then(ready => {
  if (ready && typeof window !== 'undefined' && window.WW_DEBUG) {
    console.log('[IDBCache] Ready');
  }
});
