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
