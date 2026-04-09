/**
 * DEX 兑换历史：localStorage 持久化（最多 100 条）、搜索、状态补丁
 * 键名与旧版 runtime 内联逻辑一致：ww_swap_history_v1
 */
(function (global) {
  'use strict';

  var KEY = 'ww_swap_history_v1';
  var MAX = 100;

  function _read() {
    try {
      var arr = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (_e) {
      return [];
    }
  }

  function _write(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX)));
    } catch (_e) {}
  }

  function append(payload) {
    var row = Object.assign({}, { savedAt: Date.now(), status: 'recorded' }, payload || {});
    var arr = _read();
    arr.unshift(row);
    _write(arr);
    return row;
  }

  function list() {
    return _read();
  }

  function search(query) {
    var q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q) return _read();
    return _read().filter(function (row) {
      var blob = [
        row.route,
        row.fromSym,
        row.toSym,
        row.fromId,
        row.toId,
        row.amtIn,
        row.estOut,
        row.txHash,
        row.explorerUrl,
        row.status,
        row.note
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }

  function updateByTxHash(txHash, patch) {
    var h = String(txHash || '').trim();
    if (!h) return false;
    var arr = _read();
    var hit = false;
    for (var i = 0; i < arr.length; i++) {
      if (String(arr[i].txHash || '').trim() === h) {
        arr[i] = Object.assign({}, arr[i], patch || {});
        hit = true;
        break;
      }
    }
    if (hit) _write(arr);
    return hit;
  }

  function updateBySavedAt(savedAt, patch) {
    var t = Number(savedAt);
    if (!isFinite(t)) return false;
    var arr = _read();
    var hit = false;
    for (var j = 0; j < arr.length; j++) {
      if (Number(arr[j].savedAt) === t) {
        arr[j] = Object.assign({}, arr[j], patch || {});
        hit = true;
        break;
      }
    }
    if (hit) _write(arr);
    return hit;
  }

  global.WwSwapHistory = {
    KEY: KEY,
    MAX: MAX,
    append: append,
    list: list,
    search: search,
    updateByTxHash: updateByTxHash,
    updateBySavedAt: updateBySavedAt
  };
})(typeof window !== 'undefined' ? window : global);
