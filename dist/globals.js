// globals.js — 全局变量统一定义点
// 所有模块共享的变量在此定义，其他文件直接引用

// ── 钱包状态 ──
var REAL_WALLET = null;       // 当前钱包（公开信息 + 解锁后含私钥）
// 临时创建中钱包：见 core/security.js 的 wwGetTempWallet / wwSetTempWallet（勿挂 window）
var currentMnemonicLength = 12;
var currentLang = 'zh';       // 当前语言，由 detectDeviceLang() 设置
var currentQRChain = 'native';

// ── 地址系统 ──
var ADDR_WORDS = [];          // 10个字槽
var CHAIN_ADDR = '';          // 当前链地址

// ── 词库索引 ──
var EN_WORD_INDEX = {};
var WT_LANG_INDEX = {};

// ── 页面常量 ──
var MAIN_PAGES = ['page-home', 'page-addr', 'page-swap', 'page-settings'];

// ── DOM 缓存 ──
var DOM = {};

/** 缓存常用 DOM 元素，页面加载后调用 */
function cacheDOM() {
  var ids = [
    'keyWordGrid', 'mnemonicLength', 'homeAddrChip',
    'tabBar', 'toastMsg', 'walletLoadingOverlay',
    'totalBalanceDisplay', 'totalBalanceSub',
    'balUsdt',
    'valUsdt',
    'txHistoryList', 'importError'
  ];
  ids.forEach(function(id) {
    DOM[id] = document.getElementById(id);
  });
}
