/**
 * 以太坊主网 Uniswap V3 询价（Quoter V1 + 500/3000/10000 fee，与 @uniswap/v3-sdk FeeAmount 一致）。
 * 依赖页面已加载的 ethers UMD（wallet.html 中 lib/ethers.umd.min.js）。
 */
(function () {
  'use strict';

  var QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
  var ADDR = {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
  };
  var FEES = [500, 3000, 10000];
  var QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
  ];

  function getEthers() {
    return typeof window !== 'undefined' && window.ethers ? window.ethers : null;
  }

  function metaByCoinId(id) {
    if (id === 'eth') return { addr: ADDR.WETH, decimals: 18 };
    if (id === 'usdt_eth') return { addr: ADDR.USDT, decimals: 6 };
    if (id === 'usdc') return { addr: ADDR.USDC, decimals: 6 };
    if (id === 'btc') return { addr: ADDR.WBTC, decimals: 8 };
    return null;
  }

  function isEvmSwapPair(fromId, toId) {
    if (!fromId || !toId || String(fromId) === String(toId)) return false;
    return !!(metaByCoinId(fromId) && metaByCoinId(toId));
  }

  /**
   * @returns {Promise<{ amountOutHuman: string, bestFee: number }|null>}
   */
  async function quoteEvmBestAmountOut(fromId, toId, amountInStr, rpcUrl) {
    var ethers = getEthers();
    var a = metaByCoinId(fromId);
    var b = metaByCoinId(toId);
    if (!ethers || !a || !b || fromId === toId) return null;
    var amt = String(amountInStr || '').trim();
    var n = parseFloat(amt);
    if (!isFinite(n) || n <= 0) return null;
    var url = rpcUrl || (typeof ETH_RPC !== 'undefined' && ETH_RPC) || 'https://rpc.ankr.com/eth';
    try {
      var provider = new ethers.providers.StaticJsonRpcProvider(url, 1);
      var contract = new ethers.Contract(QUOTER, QUOTER_ABI, provider);
      var amountInWei = ethers.utils.parseUnits(amt, a.decimals);
      var bestOut = null;
      var bestFee = null;
      for (var i = 0; i < FEES.length; i++) {
        var fee = FEES[i];
        try {
          var out = await contract.callStatic.quoteExactInputSingle(a.addr, b.addr, fee, amountInWei, 0);
          if (!bestOut || out.gt(bestOut)) {
            bestOut = out;
            bestFee = fee;
          }
        } catch (_e) { void _e; }
      }
      if (!bestOut) return null;
      return {
        amountOutHuman: ethers.utils.formatUnits(bestOut, b.decimals),
        bestFee: bestFee
      };
    } catch (_e2) {
      return null;
    }
  }

  /**
   * 链上兑换用：返回 wei 级数量与最优 fee，避免浮点截断。
   * @returns {Promise<{ amountInWei: object, amountOutWei: object, bestFee: number, fromMeta: object, toMeta: object }|null>}
   */
  async function quoteEvmBestAmountOutWei(fromId, toId, amountInStr, rpcUrl) {
    var ethers = getEthers();
    var a = metaByCoinId(fromId);
    var b = metaByCoinId(toId);
    if (!ethers || !a || !b || fromId === toId) return null;
    var amt = String(amountInStr || '').trim();
    var n = parseFloat(amt);
    if (!isFinite(n) || n <= 0) return null;
    var url = rpcUrl || (typeof ETH_RPC !== 'undefined' && ETH_RPC) || 'https://rpc.ankr.com/eth';
    try {
      var provider = new ethers.providers.StaticJsonRpcProvider(url, 1);
      var contract = new ethers.Contract(QUOTER, QUOTER_ABI, provider);
      var amountInWei = ethers.utils.parseUnits(amt, a.decimals);
      var bestOut = null;
      var bestFee = null;
      for (var i = 0; i < FEES.length; i++) {
        var fee = FEES[i];
        try {
          var out = await contract.callStatic.quoteExactInputSingle(a.addr, b.addr, fee, amountInWei, 0);
          if (!bestOut || out.gt(bestOut)) {
            bestOut = out;
            bestFee = fee;
          }
        } catch (_e) { void _e; }
      }
      if (!bestOut) return null;
      return {
        amountInWei: amountInWei,
        amountOutWei: bestOut,
        bestFee: bestFee,
        fromMeta: a,
        toMeta: b
      };
    } catch (_e2) {
      return null;
    }
  }

  window.wwSwapModule = {
    quoteEvmBestAmountOut: quoteEvmBestAmountOut,
    quoteEvmBestAmountOutWei: quoteEvmBestAmountOutWei,
    isEvmSwapPair: isEvmSwapPair,
    metaByCoinId: metaByCoinId,
    /** 报价轮询间隔（毫秒），默认 3000；runtime 的 goTo(page-swap) 会启动 */
    quotePollIntervalMs: 3000
  };
})();

/** 兑换页：CoinGecko 价格 + 链上询价轮询（依赖后载的 loadSwapPrices / calcSwap） */
(function (global) {
  'use strict';
  var _pollId = null;

  global.wwSwapQuotePollStop = function () {
    if (_pollId) {
      clearInterval(_pollId);
      _pollId = null;
    }
  };

  global.wwSwapQuotePollStart = function (ms) {
    global.wwSwapQuotePollStop();
    var interval = Number(ms) || (global.wwSwapModule && global.wwSwapModule.quotePollIntervalMs) || 5000;
    _pollId = setInterval(function () {
      try {
        if (typeof global.loadSwapPrices === 'function') {
          void global.loadSwapPrices();
        } else if (typeof global.calcSwap === 'function') {
          global.calcSwap();
        }
      } catch (_e) { void _e; }
    }, interval);
  };
})(typeof window !== 'undefined' ? window : global);
