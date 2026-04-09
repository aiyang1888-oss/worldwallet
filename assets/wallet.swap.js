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
    return !!(metaByCoinId(fromId) && metaByCoinId(toId));
  }

  /**
   * @returns {Promise<{ amountOutHuman: string, bestFee: number }|null>}
   */
  async function quoteEvmBestAmountOut(fromId, toId, amountInStr, rpcUrl) {
    var ethers = getEthers();
    var a = metaByCoinId(fromId);
    var b = metaByCoinId(toId);
    if (!ethers || !a || !b) return null;
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
        } catch (_e) {}
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

  window.wwSwapModule = {
    quoteEvmBestAmountOut: quoteEvmBestAmountOut,
    isEvmSwapPair: isEvmSwapPair,
    metaByCoinId: metaByCoinId
  };
})();
