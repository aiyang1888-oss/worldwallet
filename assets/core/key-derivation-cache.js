/**
 * 派生密钥缓存 - 性能优化 Phase 1
 * 目标: 减少 PBKDF2 派生操作（最耗时的密码学操作）
 * 
 * 优化效果:
 * - PBKDF2 完整流程: ~200-300ms
 * - 缓存命中: <1ms
 * - 多次验证 PIN: 减少 ~90%
 * - 缓存时间: 3 分钟
 */

class KeyDerivationCache {
  constructor(ttlMs = 180000) {
    this._cache = new Map();  // key → { key: CryptoKey, time: timestamp }
    this._ttl = ttlMs;  // 默认 3 分钟
    this._stats = {
      derivations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0
    };
  }

  /**
   * 派生密钥（带缓存）
   * @param {string} pin - PIN 码
   * @param {Uint8Array} salt - 盐值
   * @param {Function} deriveFn - 派生函数
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey(pin, salt, deriveFn) {
    const cacheKey = this._getCacheKey(pin, salt);
    const now = Date.now();

    // 检查缓存
    if (this._cache.has(cacheKey)) {
      const cached = this._cache.get(cacheKey);
      if ((now - cached.time) < this._ttl) {
        this._stats.cacheHits++;
        console.log('[KeyDerivationCache] Cache hit');
        return cached.key;
      } else {
        // 过期，删除
        this._cache.delete(cacheKey);
        this._stats.evictions++;
      }
    }

    // 缓存未命中，执行派生
    console.log('[KeyDerivationCache] Cache miss, deriving key...');
    const derivedKey = await deriveFn();

    // 存储到缓存
    this._cache.set(cacheKey, {
      key: derivedKey,
      time: now
    });

    this._stats.derivations++;
    this._stats.cacheMisses++;

    // 防止无限增长（简单 LRU）
    if (this._cache.size > 10) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
      this._stats.evictions++;
    }

    return derivedKey;
  }

  /**
   * 生成缓存键
   * @private
   */
  _getCacheKey(pin, salt) {
    // 创建可复现的缓存键
    const saltStr = Array.from(new Uint8Array(salt))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `${pin}:${saltStr}`;
  }

  /**
   * 清空缓存
   */
  clear() {
    this._cache.clear();
    console.log('[KeyDerivationCache] Cleared');
  }

  /**
   * 清空特定的缓存项（PIN 变更时）
   */
  clearPin(pin) {
    // 删除所有包含此 PIN 的缓存项
    for (const key of this._cache.keys()) {
      if (key.startsWith(pin + ':')) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const total = this._stats.derivations + this._stats.cacheHits;
    const hitRate = total > 0 ? 
      ((this._stats.cacheHits / total) * 100).toFixed(1) : 
      0;
    return {
      ...this._stats,
      total,
      hitRate: hitRate + '%',
      cacheSize: this._cache.size
    };
  }
}

// 创建全局派生密钥缓存实例
window.wwKeyDerivationCache = new KeyDerivationCache(180000);  // 3 分钟 TTL

/**
 * 改进的 deriveKeyFromPin 包装函数
 * 自动使用缓存减少 PBKDF2 运算
 */
async function deriveKeyFromPinOptimized(pin, salt) {
  const deriveFn = async () => {
    // 原始派生逻辑
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey(
      'raw',
      enc.encode(pin),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  return await window.wwKeyDerivationCache.deriveKey(
    pin,
    salt,
    deriveFn
  );
}

// 导出给全局使用
window.deriveKeyFromPinOptimized = deriveKeyFromPinOptimized;
