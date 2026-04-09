// wallet.tx.js — 交易：转账/余额/价格/历史

/** 转账金额：去逗号、限制上限，非法返回 NaN */
function wwParsePositiveAmount(raw, maxAbs) {
  var n = typeof raw === 'number' ? raw : parseFloat(String(raw == null ? '' : raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return NaN;
  if (maxAbs != null && n > maxAbs) return maxAbs;
  return n;
}

/**
 * 通用异步重试：遇 e.status === 429 时指数退避（1s → 2s → 4s）。
 */
async function callWithRetry(fn, maxRetries, initialDelay) {
  if (typeof fn !== 'function') throw new TypeError('callWithRetry: fn must be a function');
  maxRetries = maxRetries === undefined ? 3 : maxRetries;
  initialDelay = initialDelay === undefined ? 1000 : initialDelay;
  for (var i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e && e.status === 429 && i < maxRetries - 1) {
        var delay = initialDelay * Math.pow(2, i);
        await new Promise(function (resolve) { setTimeout(resolve, delay); });
      } else {
        throw e;
      }
    }
  }
}

/**
 * 公网 fetch：先走 wwFetchRetry（内部 429/503 退避），若仍为 429 则交给 callWithRetry 外层指数退避。
 */
async function wwFetch429Retry(input, init) {
  return callWithRetry(async function () {
    var res = typeof wwFetchRetry === 'function'
      ? await wwFetchRetry(input, init || {})
      : await fetch(input, init || {});
    if (res.status === 429) {
      var err = new Error('Too Many Requests');
      err.status = 429;
      throw err;
    }
    return res;
  });
}


/** 首页 CNY 副标题：优先币安 P2P 出售 USDT 广告列表第 3 档单价（CNY/USDT），失败则用 USD→CNY 参考汇率 */
async function wwResolveCnyPerUsdtForHome() {
  try {
    var binanceBody = {
      asset: 'USDT',
      fiat: 'CNY',
      tradeType: 'SELL',
      page: 1,
      rows: 20,
      payTypes: [],
      publisherType: null,
      merchantCheck: false
    };
    var res =
      typeof wwFetchDnsRetry === 'function'
        ? await wwFetchDnsRetry('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(binanceBody)
          })
        : await fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(binanceBody)
          });
    if (res.ok) {
      var j = await res.json();
      var row = j.data && j.data[2];
      var raw = row && row.adv && row.adv.price;
      var p = raw != null ? parseFloat(String(raw), 10) : NaN;
      if (isFinite(p) && p > 5 && p < 50) {
        return { rate: p, label: '币安U价第三档' };
      }
    }
  } catch (_e) {}
  var fx = window._cnyRate;
  if (fx == null || !isFinite(fx) || Number(fx) <= 0) {
    try {
      var r2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      var d2 = await r2.json();
      var rawCny = d2.rates && d2.rates.CNY;
      fx = rawCny != null && isFinite(Number(rawCny)) && Number(rawCny) > 0 ? Number(rawCny) : 7.2;
      window._cnyRate = fx;
    } catch (_e2) {
      fx = 7.2;
    }
  }
  fx = Number(fx);
  if (!isFinite(fx) || fx <= 0) fx = 7.2;
  return { rate: fx, label: '实时汇率' };
}

/** 与链上查询并行复用同一请求，避免快照与 loadBalances 各打一次 */
var _wwHomeCnyInflight = null;
function wwGetHomeCnyInfo() {
  if (!_wwHomeCnyInflight) {
    _wwHomeCnyInflight = wwResolveCnyPerUsdtForHome().finally(function () {
      _wwHomeCnyInflight = null;
    });
  }
  return _wwHomeCnyInflight;
}


var WW_TX_HISTORY_SNAP_KEY = 'ww_tx_history_snap_v1';

/** 与 wwWalletSnapIdForCache 一致，但在 REAL_WALLET 尚未挂载时从 ww_wallet 读取（避免快照/历史永远不匹配） */
function wwGetTxHistoryWid() {
  try {
    if (typeof wwWalletSnapIdForCache === 'function') {
      var w = wwWalletSnapIdForCache();
      if (w) return w;
    }
  } catch (_e) {}
  try {
    var raw = localStorage.getItem('ww_wallet');
    if (!raw) return '';
    var p = JSON.parse(raw);
    return String((p && p.trxAddress) || '') + '|' + String((p && p.ethAddress) || '');
  } catch (_e2) {
    return '';
  }
}

function wwEnsureWalletPublicLoaded() {
  try {
    if (typeof loadWalletPublic === 'function') loadWalletPublic();
    else if (typeof loadWallet === 'function') loadWallet();
  } catch (_e) {}
}

/** 优先 REAL_WALLET，其次 TEMP_WALLET（助记词已生成未验证），再读 localStorage */
function wwResolveTrxAddressForHistory() {
  try {
    if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) {
      var a = String(REAL_WALLET.trxAddress).trim();
      if (a.charAt(0) === 'T' && a.length >= 34) return a;
    }
  } catch (_e) {}
  try {
    if (typeof window !== 'undefined' && window.TEMP_WALLET && window.TEMP_WALLET.trxAddress) {
      var ta = String(window.TEMP_WALLET.trxAddress).trim();
      if (ta.charAt(0) === 'T' && ta.length >= 34) return ta;
    }
  } catch (_et) {}
  try {
    var raw = localStorage.getItem('ww_wallet');
    if (!raw) return '';
    var p = JSON.parse(raw);
    var b = p && p.trxAddress ? String(p.trxAddress).trim() : '';
    if (b.charAt(0) === 'T' && b.length >= 34) return b;
  } catch (_e2) {}
  return '';
}

function wwTryRestoreCachedTxHistory() {
  wwEnsureWalletPublicLoaded();
  if (typeof renderTxHistoryFromCache !== 'function') return false;
  try {
    var raw = localStorage.getItem(WW_TX_HISTORY_SNAP_KEY);
    if (!raw) return false;
    var o = JSON.parse(raw);
    var wid = wwGetTxHistoryWid();
    if (!o || !wid || o.wid !== wid || !Array.isArray(o.txs)) return false;
    window._wwTxHistoryCache = o.txs;
    renderTxHistoryFromCache();
    return true;
  } catch (_e) {
    return false;
  }
}

function wwPersistTxHistorySnap(txs) {
  try {
    var wid = wwGetTxHistoryWid();
    if (!wid) return;
    localStorage.setItem(WW_TX_HISTORY_SNAP_KEY, JSON.stringify({ wid: wid, txs: txs || [] }));
  } catch (_e) {}
}


/** Tron 协议里的地址字段（hex 或已是 Base58）→ Base58，便于与 REAL_WALLET.trxAddress 比较 */
function wwTronProtoAddrToBase58(a) {
  if (a == null || a === '') return '';
  var s = String(a).trim();
  if (s.charAt(0) === 'T' && s.length >= 34) return s;
  var h = s.replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]+$/.test(h)) return s;
  if (h.length === 40) h = '41' + h;
  try {
    if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
      return TronWeb.address.fromHex(h);
    }
  } catch (_e) {}
  return s;
}

var WW_TX_LOCAL_LOG_KEY = 'ww_tx_local_activity_v1';

/** 广播成功后写入本机，链上索引失败时首页仍能显示最近转出 */
function wwAppendLocalTxLog(entry) {
  try {
    if (!entry || !entry.hash) return;
    var wid = typeof wwGetTxHistoryWid === 'function' ? wwGetTxHistoryWid() : '';
    var trxa = typeof wwResolveTrxAddressForHistory === 'function' ? wwResolveTrxAddressForHistory() : '';
    var raw = localStorage.getItem(WW_TX_LOCAL_LOG_KEY);
    var ar = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ar)) ar = [];
    var row = Object.assign(
      {
        wid: wid,
        savedAt: Date.now(),
        trx: trxa
      },
      entry
    );
    ar = ar.filter(function (x) {
      return !(x && x.hash === row.hash && x.wid === row.wid);
    });
    ar.unshift(row);
    if (ar.length > 100) ar = ar.slice(0, 100);
    localStorage.setItem(WW_TX_LOCAL_LOG_KEY, JSON.stringify(ar));
  } catch (_e) {}
}

function wwReadLocalTxRowsForWallet() {
  try {
    var wid = typeof wwGetTxHistoryWid === 'function' ? wwGetTxHistoryWid() : '';
    var tr =
      typeof wwResolveTrxAddressForHistory === 'function'
        ? wwResolveTrxAddressForHistory()
        : typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress
          ? String(REAL_WALLET.trxAddress)
          : '';
    var raw = localStorage.getItem(WW_TX_LOCAL_LOG_KEY);
    var ar = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(ar)) return [];
    return ar.filter(function (x) {
      if (!x || !x.hash) return false;
      if (wid && x.wid === wid) return true;
      if (tr && x.trx && String(x.trx) === tr) return true;
      return false;
    });
  } catch (_e) {
    return [];
  }
}

/** 本机活动行 → 列表展示对象（链上转出 或 应用内兑换） */
function wwLocalActivityRowToDisplay(L) {
  if (!L) return null;
  var h = String(L.hash || '');
  if (!h) return null;
  var ts = Number(L.ts || L.savedAt) || Date.now();
  if (L.kind === 'swap' && L.fromId && L.toId) {
    var fn = { usdt: 'USDT', trx: 'TRX', eth: 'ETH', btc: 'BTC' };
    var fromName = fn[L.fromId] || String(L.fromId || '').toUpperCase();
    var toName = fn[L.toId] || String(L.toId || '').toUpperCase();
    var ai = Number(L.amountIn) || 0;
    var ao = Number(L.amountOut) || 0;
    var outStr = L.toId === 'trx' ? ao.toFixed(2) : ao > 1 ? ao.toFixed(4) : ao.toFixed(8);
    return {
      icon: '🔄',
      type: '兑换',
      coin: fromName + ' → ' + toName,
      amount: '-' + ai + ' / +' + outStr,
      addr: '应用内兑换',
      time: new Date(ts).toLocaleDateString('zh-CN'),
      hash: h,
      color: '#C8A84B',
      _ts: ts
    };
  }
  if (L.kind === 'swap_sunswap_other') {
    var amtO = Number(L.amountIn) || 0;
    var rec = String(L.recipientTrx || '').trim();
    return {
      icon: '🔗',
      type: '兑换',
      coin: 'USDT → TRX · 给他人',
      amount: '-' + amtO + ' USDT（SunSwap）',
      addr: rec ? rec + ' · 外链待确认' : 'SunSwap',
      time: new Date(ts).toLocaleDateString('zh-CN'),
      hash: h,
      color: '#C8A84B',
      _ts: ts
    };
  }
  return {
    icon: '📤',
    type: '转出',
    coin: L.coin || '—',
    amount: String(L.amount || '').indexOf('-') === 0 ? L.amount : '-' + String(L.amount || ''),
    addr: L.addr || '',
    time: new Date(ts).toLocaleDateString('zh-CN'),
    hash: h,
    color: '#e05c5c',
    _ts: ts
  };
}

function wwMergeLocalTxActivity(pushTx) {
  wwReadLocalTxRowsForWallet().forEach(function (L) {
    var row = wwLocalActivityRowToDisplay(L);
    if (row) pushTx(row);
  });
}

/**
 * 应用内兑换成功后：写入本机日志（刷新后仍出现）并立即更新首页列表
 */
function wwRecordInappSwapTxActivity(fromId, toId, amtIn, amtOut) {
  try {
    if (!fromId || !toId || !isFinite(amtIn) || !isFinite(amtOut)) return;
    var wid = typeof wwGetTxHistoryWid === 'function' ? wwGetTxHistoryWid() : '';
    var h = 'inapp-swap-' + (wid || 'w') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
    wwAppendLocalTxLog({
      hash: h,
      kind: 'swap',
      fromId: fromId,
      toId: toId,
      amountIn: amtIn,
      amountOut: amtOut,
      ts: Date.now()
    });
    var display = wwLocalActivityRowToDisplay({
      hash: h,
      kind: 'swap',
      fromId: fromId,
      toId: toId,
      amountIn: amtIn,
      amountOut: amtOut,
      ts: Date.now()
    });
    if (!display || typeof renderTxHistoryFromCache !== 'function') return;
    var forUiRow = {};
    for (var k in display) {
      if (k !== '_ts') forUiRow[k] = display[k];
    }
    var cur = window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache) ? window._wwTxHistoryCache.slice() : [];
    cur = cur.filter(function (r) {
      return r && r.hash !== h;
    });
    cur.unshift(forUiRow);
    window._wwTxHistoryCache = cur;
    renderTxHistoryFromCache();
    if (typeof wwPersistTxHistorySnap === 'function') wwPersistTxHistorySnap(cur);
  } catch (_e) {}
}

/**
 * 「给他人」跳转 SunSwap：记一条本机占位（链上成交后可在 SunSwap/刷新后对照）
 */
function wwRecordSunSwapOtherPlaceholder(amountIn, recipientTrx) {
  try {
    var amt = Number(amountIn);
    var rec = String(recipientTrx || '').trim();
    if (!isFinite(amt) || amt <= 0 || !rec) return;
    var wid = typeof wwGetTxHistoryWid === 'function' ? wwGetTxHistoryWid() : '';
    var h = 'sunswap-other-' + (wid || 'w') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
    wwAppendLocalTxLog({
      hash: h,
      kind: 'swap_sunswap_other',
      fromId: 'usdt',
      toId: 'trx',
      amountIn: amt,
      recipientTrx: rec,
      ts: Date.now()
    });
    var display = wwLocalActivityRowToDisplay({
      hash: h,
      kind: 'swap_sunswap_other',
      amountIn: amt,
      recipientTrx: rec,
      ts: Date.now()
    });
    if (!display || typeof renderTxHistoryFromCache !== 'function') return;
    var forUiRow = {};
    for (var k in display) {
      if (k !== '_ts') forUiRow[k] = display[k];
    }
    var cur = window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache) ? window._wwTxHistoryCache.slice() : [];
    cur = cur.filter(function (r) {
      return r && r.hash !== h;
    });
    cur.unshift(forUiRow);
    window._wwTxHistoryCache = cur;
    renderTxHistoryFromCache();
    if (typeof wwPersistTxHistorySnap === 'function') wwPersistTxHistorySnap(cur);
  } catch (_e) {}
}

async function wwFetchJsonAny(url) {
  try {
    var res = await fetch(String(url), { method: 'GET', mode: 'cors', credentials: 'omit' });
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  }
}

async function wwFetchJsonAnyMirrors(urls) {
  for (var i = 0; i < urls.length; i++) {
    var j = await wwFetchJsonAny(urls[i]);
    if (j) return j;
  }
  return null;
}

/**
 * TronGrid 在浏览器中易被限流或返回空；用 TronScan 开放列表作备用（字段做兼容解析）。
 */
async function wwLoadTronscanHistoryFallback(trxAddr, pushTx, seenHash) {
  if (!trxAddr || trxAddr.indexOf('T') !== 0) return;
  var USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  var bases = ['https://apilist.tronscan.org', 'https://apilist.tronscanapi.com'];
  var u20a =
    '/api/token_trc20/transfers?sort=-timestamp&limit=25&start=0&relatedAddress=' +
    encodeURIComponent(trxAddr) +
    '&contract_address=' +
    encodeURIComponent(USDT_CONTRACT);
  var uTrxa =
    '/api/transfer?sort=-timestamp&count=true&limit=30&start=0&token=_&address=' +
    encodeURIComponent(trxAddr);

  var j20 = await wwFetchJsonAnyMirrors(bases.map(function (b) { return b + u20a; }));
  var list20 = (j20 && (j20.token_transfers || j20.data)) || [];
  if (!Array.isArray(list20)) list20 = [];
  for (var i = 0; i < list20.length && i < 20; i++) {
    var row = list20[i];
    var hash = row.transaction_id || row.hash || row.transaction_hash || row.trx_tx_id || '';
    var from = row.from_address || row.from || '';
    var to = row.to_address || row.to || '';
    var q = row.quant != null ? row.quant : row.amount_str != null ? row.amount_str : row.value;
    var tsMs = row.block_ts || row.block_timestamp || row.timestamp || 0;
    var amt = (parseInt(String(q || '0'), 10) / 1e6).toFixed(2);
    if (!hash) continue;
    var isOut = from === trxAddr;
    pushTx({
      icon: isOut ? '📤' : '📥',
      type: isOut ? '转出' : '转入',
      coin: 'USDT',
      amount: (isOut ? '-' : '+') + amt,
      addr: isOut ? to : from,
      time: new Date(tsMs || Date.now()).toLocaleDateString('zh-CN'),
      hash: hash,
      color: isOut ? '#e05c5c' : '#26a17b',
      _ts: tsMs || 0
    });
  }

  var jt = await wwFetchJsonAnyMirrors(bases.map(function (b) { return b + uTrxa; }));
  var listT = (jt && (jt.data || jt.transfers)) || [];
  if (!Array.isArray(listT)) listT = [];
  var added = 0;
  for (var j = 0; j < listT.length && added < 18; j++) {
    var t = listT[j];
    var th = t.transaction_hash || t.hash || t.transactionHash || t.txID || '';
    var fromA = t.transferFromAddress || t.from_address || t.from || '';
    var toA = t.transferToAddress || t.to_address || t.to || '';
    var sun = t.amount != null ? t.amount : t.quant != null ? t.quant : 0;
    var ts2 = t.timestamp || t.block_ts || t.block_timestamp || 0;
    if (!th) continue;
    var isO = fromA === trxAddr;
    var amtT = (parseInt(String(sun || '0'), 10) / 1e6).toFixed(2);
    pushTx({
      icon: isO ? '📤' : '📥',
      type: isO ? '转出' : '转入',
      coin: 'TRX',
      amount: (isO ? '-' : '+') + amtT,
      addr: isO ? toA : fromA,
      time: new Date(ts2 || Date.now()).toLocaleDateString('zh-CN'),
      hash: th,
      color: isO ? '#e05c5c' : '#e84142',
      _ts: ts2 || 0
    });
    added++;
  }
}

/** Tron 全节点 HTTP：gettransactionfromthis / gettransactiontothis（与 v1 REST 互补） */
async function wwLoadTronGridWalletPostHistory(trxAddr, pushTx) {
  if (!trxAddr || trxAddr.indexOf('T') !== 0) return;
  var base = typeof wwTronGridBase === 'function' ? wwTronGridBase() : 'https://api.trongrid.io';
  var paths = ['/wallet/gettransactionfromthis', '/wallet/gettransactiontothis'];
  var postBody = JSON.stringify({ account: { address: trxAddr }, offset: 0, limit: 35 });
  var hdr =
    typeof wwMergeHeaders === 'function'
      ? wwMergeHeaders(
          { 'Content-Type': 'application/json' },
          typeof wwTronHeaders === 'function' ? wwTronHeaders() : {}
        )
      : { 'Content-Type': 'application/json' };

  for (var pi = 0; pi < paths.length; pi++) {
    var url = base + paths[pi];
    try {
      var res =
        typeof wwFetchRetry === 'function'
          ? await wwFetchRetry(url, { method: 'POST', headers: hdr, body: postBody })
          : await fetch(url, { method: 'POST', headers: hdr, body: postBody });
      if (!res || !res.ok) continue;
      var d = await res.json();
      var list = (d && (d.transaction || d.transactions)) || [];
      if (!Array.isArray(list)) continue;
      var seen = 0;
      for (var i = 0; i < list.length && seen < 22; i++) {
        var raw = list[i];
        var ntx = raw && (raw.transaction || raw.tx || raw);
        if (!ntx) continue;
        var contract = ntx.raw_data && ntx.raw_data.contract && ntx.raw_data.contract[0];
        if (!contract || contract.type !== 'TransferContract') continue;
        var val = contract.parameter && contract.parameter.value;
        if (!val) continue;
        var ownerB58 = wwTronProtoAddrToBase58(val.owner_address);
        var toB58 = wwTronProtoAddrToBase58(val.to_address);
        var isOut = ownerB58 === trxAddr;
        var amtN = ((val.amount || 0) / 1e6).toFixed(2);
        var tsMs2 =
          ntx.block_timestamp ||
          raw.block_timestamp ||
          (ntx.raw_data && ntx.raw_data.timestamp) ||
          0;
        var tid = ntx.txID || ntx.txId || ntx.transaction_id || '';
        if (!tid) continue;
        pushTx({
          icon: isOut ? '📤' : '📥',
          type: isOut ? '转出' : '转入',
          coin: 'TRX',
          amount: (isOut ? '-' : '+') + amtN,
          addr: isOut ? toB58 : ownerB58,
          time: new Date(tsMs2 || Date.now()).toLocaleDateString('zh-CN'),
          hash: tid,
          color: isOut ? '#e05c5c' : '#e84142',
          _ts: tsMs2 || 0
        });
        seen++;
      }
    } catch (_pe) {}
  }
}

async function loadTxHistory() {
  wwEnsureWalletPublicLoaded();
  try {
    if (typeof loadWallet === 'function') loadWallet();
  } catch (_lw) {}

  const el = document.getElementById('txHistoryList');
  if (!el) return;

  var trxAddr = wwResolveTrxAddressForHistory();
  if (!trxAddr) {
    if (typeof txHistoryFriendlyHtml === 'function') {
      el.innerHTML = txHistoryFriendlyHtml(
        '🔑',
        '未读取到 TRON 地址',
        '请确认已创建或导入钱包。若刚打开页面，请稍后重试或刷新后再点「刷新」。'
      );
    }
    return;
  }

  try {
    var _tf = document.getElementById('txHistoryFilter');
    if (_tf) _tf.value = '';
  } catch (_tf0) {}
  var hadTxSnap = typeof wwTryRestoreCachedTxHistory === 'function' && wwTryRestoreCachedTxHistory();
  /* 无本机快照时勿先画「暂无记录」（与静态 HTML 同文案易被误认为未加载）；先显示加载中 */
  if (!hadTxSnap) {
    el.innerHTML =
      '<div class="tx-empty-friendly"><div class="tx-empty-icon" aria-hidden="true">⏳</div><div class="tx-empty-title" style="font-size:14px">正在加载链上记录…</div><div class="tx-empty-hint" style="font-size:11px;margin-top:8px">正在连接 TronGrid / TronScan，请稍候。若超时请点「刷新」。</div></div>';
  }

  try {
    const txs = [];
    var seenHash = {};
    function pushTx(row) {
      var h = String(row.hash || '');
      if (h && seenHash[h]) return;
      if (h) seenHash[h] = 1;
      txs.push(row);
    }

    if (trxAddr) {
      if (typeof loadTronWeb === 'function') await loadTronWeb();

      var _tgBase =
        typeof wwTronGridBase === 'function'
          ? wwTronGridBase()
          : String(typeof TRON_GRID !== 'undefined' && TRON_GRID ? TRON_GRID : '').replace(/\/$/, '') || 'https://api.trongrid.io';

      // USDT TRC20
      const u1 =
        _tgBase +
        '/v1/accounts/' +
        encodeURIComponent(trxAddr) +
        '/transactions/trc20?limit=30&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
      const r1 = await wwFetch429Retry(u1, { method: 'GET' });
      const d1 = r1.ok ? await r1.json() : {};
      if (d1.data && d1.data.length) {
        for (var ti = 0; ti < d1.data.length && ti < 12; ti++) {
          var tx = d1.data[ti];
          var isOut = tx.from === trxAddr;
          var amt = (parseInt(tx.value, 10) / 1e6).toFixed(2);
          var tsMs = tx.block_timestamp || 0;
          pushTx({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'USDT',
            amount: (isOut ? '-' : '+') + amt,
            addr: isOut ? tx.to : tx.from,
            time: new Date(tsMs || Date.now()).toLocaleDateString('zh-CN'),
            hash: tx.transaction_id,
            color: isOut ? '#e05c5c' : '#26a17b',
            _ts: tsMs || 0
          });
        }
      }

      // TRX 原生（多扫几条，避免前几笔全是投票/合约导致空白）
      const u2 =
        _tgBase + '/v1/accounts/' + encodeURIComponent(trxAddr) + '/transactions?limit=50&only_confirmed=true';
      const r2 = await wwFetch429Retry(u2, { method: 'GET' });
      const d2 = r2.ok ? await r2.json() : {};
      if (d2.data && d2.data.length) {
        var addedNative = 0;
        for (var ni = 0; ni < d2.data.length && addedNative < 18; ni++) {
          var ntx = d2.data[ni];
          var contract = ntx.raw_data && ntx.raw_data.contract && ntx.raw_data.contract[0];
          if (!contract || contract.type !== 'TransferContract') continue;
          var val = contract.parameter && contract.parameter.value;
          if (!val) continue;
          var ownerB58 = wwTronProtoAddrToBase58(val.owner_address);
          var toB58 = wwTronProtoAddrToBase58(val.to_address);
          var isOut = ownerB58 === trxAddr;
          var amtN = ((val.amount || 0) / 1e6).toFixed(2);
          var tsMs2 = ntx.block_timestamp || (ntx.raw_data && ntx.raw_data.timestamp) || 0;
          pushTx({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'TRX',
            amount: (isOut ? '-' : '+') + amtN,
            addr: isOut ? toB58 : ownerB58,
            time: new Date(tsMs2 || Date.now()).toLocaleDateString('zh-CN'),
            hash: ntx.txID,
            color: isOut ? '#e05c5c' : '#e84142',
            _ts: tsMs2 || 0
          });
          addedNative++;
        }
      }
    }

    if (trxAddr && trxAddr.indexOf('T') === 0) {
      try {
        await wwLoadTronscanHistoryFallback(trxAddr, pushTx, seenHash);
      } catch (_tsf) {}
      try {
        await wwLoadTronGridWalletPostHistory(trxAddr, pushTx);
      } catch (_wph) {}
    }
    try {
      wwMergeLocalTxActivity(pushTx);
    } catch (_ml) {}

    txs.sort(function (a, b) {
      return (b._ts || 0) - (a._ts || 0);
    });

    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) {}
      var sa = trxAddr.length > 14 ? trxAddr.slice(0, 6) + '…' + trxAddr.slice(-4) : trxAddr;
      if (typeof txHistoryFriendlyHtml === 'function') {
        el.innerHTML = txHistoryFriendlyHtml(
          '📬',
          '暂无交易记录',
          '已向波场网络查询地址 ' +
            sa +
            '。若该地址从未发生 TRX/USDT 转账，或节点暂时未返回数据，这里会为空；你可稍后再点「刷新」。'
        );
      } else if (typeof txHistoryEmptyHtml === 'function') {
        el.innerHTML = txHistoryEmptyHtml();
      }
      wwPersistTxHistorySnap([]);
      return;
    }

    var forUi = txs.map(function (r) {
      var o = {};
      for (var k in r) {
        if (k !== '_ts') o[k] = r[k];
      }
      return o;
    });
    try { window._wwTxHistoryCache = forUi; } catch (_c2) {}
    try { if (typeof wwCheckWhaleTxHistory === 'function') wwCheckWhaleTxHistory(forUi); } catch (_wh) {}
    renderTxHistoryFromCache();
    wwPersistTxHistorySnap(forUi);

  } catch(e) {
    console.error('加载交易记录失败:', e);
    const en = (typeof currentLang !== 'undefined' && currentLang === 'en');
    el.innerHTML = txHistoryFriendlyHtml(
      '📡',
      en ? 'Couldn\'t load activity' : '暂时无法加载记录',
      en ? 'Check your connection and tap Refresh above to try again.' : '请检查网络后点上方「刷新」重试。若网络正常仍无记录，稍等片刻再试。'
    );
  }
}


/** 防止交易列表 innerHTML 注入 */

function wwTxSanitizeColor(c) {
  var s = String(c || '').trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return s;
  return 'inherit';
}
function wwTxHistoryRowOnClick(ev) {
  if (ev.target && ev.target.closest && ev.target.closest('[data-ww-copy]')) return;
  var t = ev.target;
  var row = t && t.closest ? t.closest('.ww-tx-history-row') : null;
  if (!row) return;
  var coin = String(row.getAttribute('data-coin') || '').toLowerCase();
  var hash = String(row.getAttribute('data-hash') || '');
  if (!hash) return;
  if (hash.indexOf('inapp-swap-') === 0) {
    try {
      if (typeof showToast === 'function') showToast('此为应用内兑换记录，无独立链上交易哈希', 'info', 3200);
    } catch (_e) {}
    return;
  }
  if (hash.indexOf('sunswap-other-') === 0) {
    try {
      if (typeof showToast === 'function') {
        showToast('此为跳转 SunSwap「给他人」的占位记录；实际哈希请在 SunSwap / TronScan 查看，完成后可点「刷新」同步链上', 'info', 4200);
      }
    } catch (_e2) {}
    return;
  }
  var base = coin === 'eth' ? 'https://etherscan.io/tx/' : 'https://tronscan.org/#/transaction/';
  try {
    window.open(base + encodeURIComponent(hash), '_blank', 'noopener,noreferrer');
  } catch (e) {}
}


(function wwEarlyApplyTxSnapFromStorage() {
  try {
    if (typeof wwEnsureWalletPublicLoaded === 'function') wwEnsureWalletPublicLoaded();
    if (typeof renderTxHistoryFromCache !== 'function') return;
    var wid = typeof wwGetTxHistoryWid === 'function' ? wwGetTxHistoryWid() : '';
    if (!wid) return;
    var raw = localStorage.getItem(WW_TX_HISTORY_SNAP_KEY);
    if (!raw) return;
    var o = JSON.parse(raw);
    if (!o || o.wid !== wid || !Array.isArray(o.txs)) return;
    window._wwTxHistoryCache = o.txs;
    renderTxHistoryFromCache();
  } catch (_e) {}
})();

/** 首页与 hash 路由竞态时 goTo 可能早于钱包就绪：在 load 后再拉 1～2 次交易列表 */
(function wwScheduleTxHistoryOnLoad() {
  if (typeof window === 'undefined') return;
  function tick() {
    try {
      if (typeof loadTxHistory !== 'function' || typeof wwResolveTrxAddressForHistory !== 'function') return;
      if (!wwResolveTrxAddressForHistory()) return;
      void loadTxHistory();
    } catch (_e) {}
  }
  window.addEventListener('load', function () {
    setTimeout(tick, 400);
    setTimeout(tick, 2200);
  });
})();
