/**
 * WorldWallet 公链类型知识库
 * — 收录常见地址形态（EVM / UTXO / Tron / Solana / Cosmos…）与 EVM 主网 chainId 清单，
 *   供地址识别、UI 展示与后续多链接入共用。
 */
(function (global) {
  'use strict';

  /** @type {number} 知识库版本，迭代时递增 */
  global.WW_CHAIN_KNOWLEDGE_VERSION = 1;

  /**
   * 地址族枚举（教学/检索用，非运行时强类型）
   * @type {Array<{key:string,nameZh:string,nameEn:string,note?:string}>}
   */
  global.WW_ADDRESS_FAMILY_INDEX = [
    { key: 'wan_yu', nameZh: '万语 / 应用内', nameEn: 'WorldToken in-app' },
    { key: 'evm', nameZh: 'EVM 兼容', nameEn: 'EVM-compatible (same 0x on many chains)' },
    { key: 'move_32b', nameZh: 'Move 系（Sui / Aptos 等）', nameEn: 'Move-family 32-byte hex' },
    { key: 'tron', nameZh: 'Tron', nameEn: 'TRON' },
    { key: 'bitcoin_utxo', nameZh: 'Bitcoin 系 UTXO', nameEn: 'Bitcoin / Litecoin / Dogecoin UTXO' },
    { key: 'solana', nameZh: 'Solana', nameEn: 'Solana' },
    { key: 'cosmos_bech32', nameZh: 'Cosmos 系 Bech32', nameEn: 'Cosmos SDK chains' },
    { key: 'xrp', nameZh: 'XRP Ledger', nameEn: 'Ripple' },
    { key: 'cardano', nameZh: 'Cardano', nameEn: 'Cardano' },
    { key: 'ton', nameZh: 'TON', nameEn: 'The Open Network' },
    { key: 'starknet', nameZh: 'Starknet', nameEn: 'Starknet' },
    { key: 'unknown', nameZh: '未识别', nameEn: 'Unknown format' }
  ];

  /**
   * 常见 EVM 主网（chainId）；同一 0x 地址在多链可复用，转账时务必选对网络。
   * 数据可随业务继续扩充。
   * @type {Array<{chainId:number,slug:string,symbol:string,nameZh:string,nameEn:string}>}
   */
  global.WW_EVM_NETWORKS = [
    { chainId: 1, slug: 'ethereum', symbol: 'ETH', nameZh: '以太坊主网', nameEn: 'Ethereum Mainnet' },
    { chainId: 10, slug: 'optimism', symbol: 'ETH', nameZh: 'Optimism', nameEn: 'Optimism' },
    { chainId: 25, slug: 'cronos', symbol: 'CRO', nameZh: 'Cronos', nameEn: 'Cronos Mainnet' },
    { chainId: 56, slug: 'bsc', symbol: 'BNB', nameZh: 'BNB Chain (BSC)', nameEn: 'BNB Smart Chain' },
    { chainId: 100, slug: 'gnosis', symbol: 'xDAI', nameZh: 'Gnosis Chain', nameEn: 'Gnosis' },
    { chainId: 122, slug: 'fuse', symbol: 'FUSE', nameZh: 'Fuse', nameEn: 'Fuse Mainnet' },
    { chainId: 137, slug: 'polygon', symbol: 'POL', nameZh: 'Polygon PoS', nameEn: 'Polygon' },
    { chainId: 169, slug: 'manta-pacific', symbol: 'ETH', nameZh: 'Manta Pacific', nameEn: 'Manta Pacific' },
    { chainId: 204, slug: 'opbnb', symbol: 'BNB', nameZh: 'opBNB', nameEn: 'opBNB Mainnet' },
    { chainId: 250, slug: 'fantom', symbol: 'FTM', nameZh: 'Fantom', nameEn: 'Fantom Opera' },
    { chainId: 288, slug: 'boba', symbol: 'ETH', nameZh: 'Boba Network', nameEn: 'Boba Network' },
    { chainId: 324, slug: 'zksync-era', symbol: 'ETH', nameZh: 'zkSync Era', nameEn: 'zkSync Era' },
    { chainId: 1088, slug: 'metis', symbol: 'METIS', nameZh: 'Metis', nameEn: 'Metis Andromeda' },
    { chainId: 1101, slug: 'polygon-zkevm', symbol: 'ETH', nameZh: 'Polygon zkEVM', nameEn: 'Polygon zkEVM' },
    { chainId: 1284, slug: 'moonbeam', symbol: 'GLMR', nameZh: 'Moonbeam', nameEn: 'Moonbeam' },
    { chainId: 1285, slug: 'moonriver', symbol: 'MOVR', nameZh: 'Moonriver', nameEn: 'Moonriver' },
    { chainId: 1329, slug: 'sei-evm', symbol: 'SEI', nameZh: 'Sei EVM', nameEn: 'Sei Network' },
    { chainId: 5000, slug: 'mantle', symbol: 'MNT', nameZh: 'Mantle', nameEn: 'Mantle' },
    { chainId: 7700, slug: 'canto', symbol: 'CANTO', nameZh: 'Canto', nameEn: 'Canto' },
    { chainId: 8453, slug: 'base', symbol: 'ETH', nameZh: 'Base', nameEn: 'Base' },
    { chainId: 9001, slug: 'evmos', symbol: 'EVMOS', nameZh: 'Evmos', nameEn: 'Evmos' },
    { chainId: 42161, slug: 'arbitrum-one', symbol: 'ETH', nameZh: 'Arbitrum One', nameEn: 'Arbitrum One' },
    { chainId: 42170, slug: 'arbitrum-nova', symbol: 'ETH', nameZh: 'Arbitrum Nova', nameEn: 'Arbitrum Nova' },
    { chainId: 42220, slug: 'celo', symbol: 'CELO', nameZh: 'Celo', nameEn: 'Celo Mainnet' },
    { chainId: 43114, slug: 'avalanche', symbol: 'AVAX', nameZh: 'Avalanche C-Chain', nameEn: 'Avalanche C-Chain' },
    { chainId: 534352, slug: 'scroll', symbol: 'ETH', nameZh: 'Scroll', nameEn: 'Scroll' },
    { chainId: 59144, slug: 'linea', symbol: 'ETH', nameZh: 'Linea', nameEn: 'Linea' },
    { chainId: 81457, slug: 'blast', symbol: 'ETH', nameZh: 'Blast', nameEn: 'Blast' },
    { chainId: 7777777, slug: 'zora', symbol: 'ETH', nameZh: 'Zora', nameEn: 'Zora' },
    { chainId: 1313161554, slug: 'aurora', symbol: 'ETH', nameZh: 'Aurora', nameEn: 'Aurora' },
    { chainId: 1666600000, slug: 'harmony-shard-0', symbol: 'ONE', nameZh: 'Harmony 分片 0', nameEn: 'Harmony Shard 0' }
  ];

  function _wanYuLike(s) {
    var t = String(s || '').trim();
    if (!t) return false;
    if (t.indexOf('·') >= 0) return true;
    if (/^\d{8}-[\s\S]{10}-\d{8}$/.test(t)) return true;
    return /^\d{8}-[\u4e00-\u9fff]{10}-\d{8}$/.test(t);
  }

  function _isBase58SolanaShape(a) {
    if (a.length < 43 || a.length > 44) return false;
    if (/^T[1-9A-HJ-NP-Za-km-z]/.test(a)) return false;
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(a);
  }

  /**
   * 根据收款字符串推断公链/地址族（启发式，非链上校验）。
   * @param {string} addr
   * @returns {{family:string,kind:string,icon:string,labelZh:string,labelEn:string,detailZh?:string,chainId?:null|number}|null}
   */
  function wwClassifyPublicAddress(addr) {
    var a = String(addr || '').trim();
    if (!a) return null;

    if (_wanYuLike(a)) {
      return {
        family: 'wan_yu',
        kind: 'native',
        icon: '🌍',
        labelZh: 'WorldToken 万语地址',
        labelEn: 'WorldToken address',
        detailZh: '应用内一语化地址'
      };
    }

    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) {
      return {
        family: 'tron',
        kind: 'tron',
        icon: '🔴',
        labelZh: 'TRX · Tron 链',
        labelEn: 'TRON',
        detailZh: '波场网络地址'
      };
    }

    if (/^0x[a-fA-F0-9]{64}$/i.test(a)) {
      return {
        family: 'move_32b',
        kind: 'move',
        icon: '🟣',
        labelZh: 'Move 系链地址（Sui / Aptos 等）',
        labelEn: 'Move-family address',
        detailZh: '0x + 64 位十六进制，请在对应用链使用'
      };
    }

    if (/^0x[a-fA-F0-9]{40}$/i.test(a)) {
      return {
        family: 'evm',
        kind: 'evm',
        icon: '🔷',
        labelZh: 'EVM 兼容地址（多链通用 0x）',
        labelEn: 'EVM-compatible 0x',
        detailZh: '与以太坊、BSC、Polygon、Arbitrum、Base 等共用同一账户形态；到账取决于所选网络',
        chainId: null
      };
    }

    if (/^0x/i.test(a) && !/^0x[a-fA-F0-9]{40}$/i.test(a) && !/^0x[a-fA-F0-9]{64}$/i.test(a)) {
      return {
        family: 'evm',
        kind: 'evm_partial',
        icon: '🔷',
        labelZh: 'EVM 地址（不完整或待校验）',
        labelEn: 'EVM address (incomplete)',
        detailZh: '标准 EVM 地址应为 0x + 40 位十六进制'
      };
    }

    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,}$/.test(a) && (a.startsWith('bc1') ? a.length >= 14 : a.length >= 26)) {
      if (/^bc1p/i.test(a)) {
        return {
          family: 'bitcoin_utxo',
          kind: 'btc_taproot',
          icon: '🟠',
          labelZh: 'BTC · Bitcoin（Taproot bc1p）',
          labelEn: 'Bitcoin Taproot',
          detailZh: 'UTXO 地址'
        };
      }
      if (/^bc1/i.test(a)) {
        return {
          family: 'bitcoin_utxo',
          kind: 'btc_bech32',
          icon: '🟠',
          labelZh: 'BTC · Bitcoin（SegWit bc1）',
          labelEn: 'Bitcoin SegWit',
          detailZh: 'UTXO 地址'
        };
      }
      return {
        family: 'bitcoin_utxo',
        kind: 'btc_legacy',
        icon: '🟠',
        labelZh: 'BTC · Bitcoin（Legacy / P2SH）',
        labelEn: 'Bitcoin Legacy',
        detailZh: '以 1 或 3 开头的 UTXO 地址'
      };
    }

    if (/^ltc1[a-z0-9]{20,}$/i.test(a) || /^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a)) {
      return {
        family: 'bitcoin_utxo',
        kind: 'ltc',
        icon: '🥈',
        labelZh: 'LTC · Litecoin',
        labelEn: 'Litecoin',
        detailZh: '莱特币 UTXO 地址'
      };
    }

    if (/^D[5-9A-HJ-NP-Za-km-z]{33}$/.test(a)) {
      return {
        family: 'bitcoin_utxo',
        kind: 'doge',
        icon: '🐕',
        labelZh: 'DOGE · Dogecoin',
        labelEn: 'Dogecoin',
        detailZh: '狗狗币 UTXO 地址'
      };
    }

    if (/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(a)) {
      return {
        family: 'xrp',
        kind: 'xrp',
        icon: '💧',
        labelZh: 'XRP · XRP Ledger',
        labelEn: 'XRP Ledger',
        detailZh: '瑞波经典地址'
      };
    }

    if (/^cosmos1[0-9a-z]{38,45}$/i.test(a)) {
      return {
        family: 'cosmos_bech32',
        kind: 'cosmos',
        icon: '⚛️',
        labelZh: 'Cosmos 系 Bech32（如 ATOM）',
        labelEn: 'Cosmos SDK bech32',
        detailZh: 'cosmos1… 开头'
      };
    }

    if (/^addr1[0-9a-z]{50,110}$/i.test(a)) {
      return {
        family: 'cardano',
        kind: 'ada',
        icon: '🔵',
        labelZh: 'ADA · Cardano',
        labelEn: 'Cardano',
        detailZh: 'addr1… Shelley 地址'
      };
    }

    if (/^[UE]Q[A-Za-z0-9_-]{40,}$/.test(a) && a.length >= 46) {
      return {
        family: 'ton',
        kind: 'ton',
        icon: '💎',
        labelZh: 'TON · The Open Network',
        labelEn: 'TON',
        detailZh: '友好型可弹跳地址'
      };
    }

    if (/^0x[a-fA-F0-9]{62,128}$/i.test(a) && !/^0x[a-fA-F0-9]{40}$/i.test(a) && !/^0x[a-fA-F0-9]{64}$/i.test(a)) {
      return {
        family: 'starknet',
        kind: 'starknet',
        icon: '🐺',
        labelZh: 'Starknet 地址',
        labelEn: 'Starknet',
        detailZh: '长十六进制合约/账户地址'
      };
    }

    if (_isBase58SolanaShape(a)) {
      return {
        family: 'solana',
        kind: 'sol',
        icon: '🟢',
        labelZh: 'SOL · Solana',
        labelEn: 'Solana',
        detailZh: 'Base58 公钥地址'
      };
    }

    return {
      family: 'unknown',
      kind: 'unknown',
      icon: '❓',
      labelZh: '未识别地址格式',
      labelEn: 'Unrecognized format',
      detailZh: '请核对收款方与网络是否一致'
    };
  }

  global.wwClassifyPublicAddress = wwClassifyPublicAddress;

  /** @param {number} chainId */
  global.wwGetEvmNetworkByChainId = function (chainId) {
    var id = Number(chainId);
    if (!isFinite(id)) return null;
    var list = global.WW_EVM_NETWORKS || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].chainId === id) return list[i];
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
