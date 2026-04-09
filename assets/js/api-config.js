// 公链端点与限流：TronGrid API Key（meta wt-tron-api-key）、429/503 重试、ETH 多节点回退
var TRON_GRID = 'https://api.trongrid.io';
var ETH_RPC = 'https://rpc.ankr.com/eth';
var WW_ETH_RPC_URLS = [
  'https://rpc.ankr.com/eth',
  'https://eth.llamarpc.com',
  'https://cloudflare-eth.com'
];

function wwReadTronApiKey() {
  try {
    var m = document.querySelector && document.querySelector('meta[name="wt-tron-api-key"]');
    var c = m && m.getAttribute('content');
    return (c && String(c).trim()) || '';
  } catch (e) {
    return '';
  }
}

function wwTronHeaders(extra) {
  var h = {};
  if (extra && typeof extra === 'object') {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k) && extra[k] != null) h[k] = extra[k];
    }
  }
  var key = wwReadTronApiKey();
  if (key) h['TRON-PRO-API-KEY'] = key;
  return h;
}

function wwMergeHeaders(a, b) {
  var out = {};
  if (a && typeof a === 'object' && !(typeof Headers !== 'undefined' && a instanceof Headers)) {
    for (var k in a) {
      if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    }
  }
  if (b && typeof b === 'object') {
    for (var k2 in b) {
      if (Object.prototype.hasOwnProperty.call(b, k2) && b[k2] != null) out[k2] = b[k2];
    }
  }
  return out;
}

function wwUrlLooksTronGrid(url) {
  return /trongrid\.io/i.test(String(url));
}

/** 当前 Tron HTTP API 根地址（无末尾 /）。 */
function wwTronGridBase() {
  var b = (typeof TRON_GRID === 'string' && TRON_GRID) ? String(TRON_GRID).replace(/\/$/, '') : '';
  return b || 'https://api.trongrid.io';
}

/**
 * 对 ETH JSON-RPC 依次 POST；遇网络错误、429、502、503 时换下一个 RPC。
 */
async function wwFetchEthJsonRpc(bodyObj, init) {
  init = init || {};
  var urls =
    typeof WW_ETH_RPC_URLS !== 'undefined' && WW_ETH_RPC_URLS.length
      ? WW_ETH_RPC_URLS.slice()
      : typeof ETH_RPC !== 'undefined' && ETH_RPC
        ? [ETH_RPC]
        : [];
  if (!urls.length) urls = ['https://rpc.ankr.com/eth'];
  var mergedBase = wwMergeHeaders({ 'Content-Type': 'application/json' }, init.headers || {});
  var lastErr;
  for (var i = 0; i < urls.length; i++) {
    try {
      var res = await fetch(urls[i], {
        method: 'POST',
        headers: mergedBase,
        body: JSON.stringify(bodyObj)
      });
      var st = res.status;
      if ((st === 429 || st === 503 || st === 502) && i < urls.length - 1) continue;
      return res;
    } catch (e) {
      lastErr = e;
      if (i < urls.length - 1) continue;
      throw e;
    }
  }
  if (lastErr) throw lastErr;
  throw new Error('wwFetchEthJsonRpc: no RPC URL');
}

/**
 * 对公网 API 的 fetch：遇 429/503 指数退避重试；TronGrid 请求自动附带 API Key（若已配置）。
 */
async function wwFetchRetry(input, init, maxAttempts) {
  init = init || {};
  maxAttempts = maxAttempts || 4;
  var url = String(input);
  var base = {};
  for (var pk in init) {
    if (Object.prototype.hasOwnProperty.call(init, pk) && pk !== 'headers') base[pk] = init[pk];
  }
  var headers = wwMergeHeaders(init.headers || {}, wwUrlLooksTronGrid(url) ? wwTronHeaders() : {});
  var attempt = 0;
  var lastRes;
  while (attempt < maxAttempts) {
    attempt++;
    lastRes = await fetch(input, Object.assign({}, base, { headers: headers }));
    var st = lastRes.status;
    if (st !== 429 && st !== 503) return lastRes;
    if (attempt >= maxAttempts) break;
    var ms = Math.min(10000, 450 * Math.pow(2, attempt - 1) + Math.random() * 600);
    await new Promise(function (r) { setTimeout(r, ms); });
  }
  return lastRes;
}

var _wwEthProvider = null;
function wwGetEthProvider() {
  if (_wwEthProvider) return _wwEthProvider;
  if (typeof ethers === 'undefined' || !ethers.providers) {
    _wwEthProvider = null;
    return _wwEthProvider;
  }
  var urls = (typeof WW_ETH_RPC_URLS !== 'undefined' && WW_ETH_RPC_URLS.length) ? WW_ETH_RPC_URLS : [ETH_RPC];
  if (urls.length === 1) {
    _wwEthProvider = new ethers.providers.JsonRpcProvider(urls[0]);
    return _wwEthProvider;
  }
  var configs = urls.map(function (u, i) {
    return {
      provider: new ethers.providers.JsonRpcProvider(u),
      priority: i + 1,
      weight: 1,
      stallTimeout: 1200
    };
  });
  _wwEthProvider = new ethers.providers.FallbackProvider(configs, 1);
  return _wwEthProvider;
}

function wwTronWebOptions() {
  var opt = { fullHost: TRON_GRID };
  var h = wwTronHeaders();
  if (h && Object.keys(h).length) opt.headers = h;
  return opt;
}

/** CoinGecko：直连；非 ok 或异常时再试同源 /api/coingecko-proxy（部署 Vercel/Netlify 时可用）。 */
async function wwFetchCoinGecko(pathOrFullUrl) {
  var full =
    String(pathOrFullUrl || '').indexOf('http') === 0
      ? String(pathOrFullUrl)
      : 'https://api.coingecko.com/api/v3' +
        (String(pathOrFullUrl).charAt(0) === '/' ? pathOrFullUrl : '/' + pathOrFullUrl);
  var r0;
  try {
    r0 = await wwFetchRetry(full, { method: 'GET' });
    if (r0 && r0.ok) return r0;
  } catch (_e) { void _e; }
  try {
    var o = '';
    try {
      o = typeof location !== 'undefined' && location.origin ? location.origin : '';
    } catch (_e2) { void _e2; }
    if (o) {
      var r2 = await wwFetchRetry(o + '/api/coingecko-proxy?u=' + encodeURIComponent(full), { method: 'GET' });
      if (r2 && r2.ok) return r2;
    }
  } catch (_e3) { void _e3; }
  if (r0) return r0;
  return fetch(full, { method: 'GET' });
}

/** CoinGecko JSON：先走 wwFetchCoinGecko（含同源代理回退），缓解浏览器 CORS / 区域封锁。 */
async function wwFetchCoinGeckoJson(fullUrl) {
  var r = await wwFetchCoinGecko(fullUrl);
  if (!r || !r.ok) throw new Error('CoinGecko HTTP ' + (r && r.status));
  return r.json();
}

/** TronGrid v1 账户 JSON：自动附带 API Key、429/503 退避。 */
async function wwFetchTronAccountV1(trxAddr) {
  if (!trxAddr) throw new Error('no trx addr');
  var base = typeof wwTronGridBase === 'function' ? wwTronGridBase() : 'https://api.trongrid.io';
  var url = base + '/v1/accounts/' + encodeURIComponent(trxAddr);
  var res = await wwFetchRetry(url, { method: 'GET' });
  if (res.status === 401 && typeof console !== 'undefined' && console.warn) {
    console.warn('[TronGrid] 401: set meta wt-tron-api-key (see https://www.trongrid.io/)');
  }
  return res;
}

/** 浏览器侧 DNS/间歇性失败：对同一 URL 快速重试数次。 */
async function wwFetchDnsRetry(url, init, attempts) {
  init = init || {};
  attempts = attempts || 3;
  var lastErr;
  for (var i = 0; i < attempts; i++) {
    try {
      var res = await fetch(url, init);
      return res;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(function (r) { setTimeout(r, 400 * (i + 1)); });
    }
  }
  throw lastErr || new Error('fetch failed');
}
