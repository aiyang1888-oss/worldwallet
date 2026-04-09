/**
 * WorldWallet — BIP44 派生路径（唯一来源）
 * 禁止在 UI 或业务层重复定义路径字符串；core/wallet.js 通过 WW_DERIVE_PATHS 引用。
 */
var WW_DERIVE_PATHS = {
  eth: "m/44'/60'/0'/0/0",
  trx: "m/44'/195'/0'/0/0",
  btc: "m/44'/0'/0'/0/0"
};
