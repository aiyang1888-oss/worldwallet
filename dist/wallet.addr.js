// wallet.addr.js — 地址系统：多语言/渲染/复制
// 「万语」为展示/收款协议层字符串（ADDR_WORDS、wallet_* 键）；修改中段用字或前后缀不改变 ww_wallet 内 BIP39 助记词与 TRX/ETH/BTC 公链地址。

var __wanYuInitLock = false;

/** 万语地址初始化调试：initAddrWords 调用次数（仅日志） */
var __wanYuInitAddrWordsCallCount = 0;
/** 防止重复生成：已成功载入或生成 10 字 + 前后缀后设为 true */
var __wanYuAddrInitialized = false;
/** 防止 initAddrWords 重入（嵌套调用竞态） */
var _lock = false;

/** 优先 localStorage（避免页面占位符 38294651/92847361 覆盖已持久化的 8 位前后缀） */
function _wanYuP8FromDomOrStorage(el, key, fallback8) {
  try {
    var ls = localStorage.getItem(key);
    if (ls) {
      var d = String(ls).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
      if (d.length === 8) return d;
    }
  } catch (e) {}
  var t = '';
  try {
    if (el && el.textContent) t = String(el.textContent).replace(/\D/g, '');
  } catch (e2) {}
  if (t.length >= 8) return t.substring(0, 8);
  return fallback8;
}

/** 链上身份种子：同一助记词/钱包派生的链上地址组合不变，则万语默认展示不变 */
function _wwWanYuSeedStr() {
  try {
    var w = typeof REAL_WALLET !== 'undefined' && REAL_WALLET ? REAL_WALLET : null;
    if (!w) {
      var raw = localStorage.getItem('ww_wallet');
      if (raw) w = JSON.parse(raw);
    }
    /* 创建流程：助记词已派生链上地址但尚未验证/落盘 ww_wallet 时，TEMP_WALLET 为唯一身份（与 wwGetChainViewWallet 一致） */
    if (
      (!w || !(w.trxAddress || w.ethAddress || w.btcAddress)) &&
      typeof window !== 'undefined' &&
      window.TEMP_WALLET &&
      (window.TEMP_WALLET.trxAddress || window.TEMP_WALLET.ethAddress || window.TEMP_WALLET.btcAddress)
    ) {
      w = window.TEMP_WALLET;
    }
    if (!w) return '';
    return String(w.trxAddress || '') + '\0' + String(w.ethAddress || '') + '\0' + String(w.btcAddress || '');
  } catch (_e) {
    return '';
  }
}

function updateRealAddr() {
  if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
  if (currentLang === 'en' && REAL_WALLET && REAL_WALLET.ethAddress) {
    const sa = document.getElementById('settingsAddr');
    if (sa) {
      sa.textContent = REAL_WALLET.ethAddress;
      sa.style.cssText = 'font-size:12px;color:var(--text-muted);line-height:1.7;word-break:break-all;text-align:center';
      try {
        sa.setAttribute('data-ww-copy', REAL_WALLET.ethAddress);
        sa.setAttribute('title', '点击复制完整地址');
      } catch (_sa) {}
    }
  }
  if (typeof updateHomeChainStrip === 'function') updateHomeChainStrip();
}

function updateAddr() {
  /* ADDR_WORDS 在 wallet.runtime.js 定义；wallet.ui.js 若早于 addr/runtime 调 loadWallet→updateAddr 会抛错并吞掉，导致万语永不刷新 */
  if (typeof ADDR_WORDS === 'undefined') return;
  const a = ADDR_SAMPLES[currentLang]||ADDR_SAMPLES.zh;
  const isEn = currentLang==='en';
  // 只经 ensureNativeAddrInitialized 统一初始化，不在此处重新 initAddrWords()
  try {
    if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized();
  } catch (_e) {}
  if (ADDR_WORDS.length > 0) renderAddrWords();
  // 获取完整万语地址
  const nativeAddr = getNativeAddr();
  const shortAddr = nativeAddr.length > 16 ? nativeAddr.substring(0,8)+'...'+nativeAddr.slice(-4) : nativeAddr;
  // 首页芯片（中间段金色随机展示，见 renderHomeAddrChip）
  if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
  // QR 二维码区大字显示（万语规范：8数字-10汉字-8数字，单行展示）
  const qp1 = document.getElementById('qrPart1');
  const qp2 = document.getElementById('qrPart2');
  if(qp1 && !isEn) {
    qp1.textContent = nativeAddr;
    qp1.style.fontSize='12px';
    qp1.style.letterSpacing='0';
    try {
      qp1.setAttribute('data-ww-copy', nativeAddr);
      qp1.setAttribute('title', '点击复制万语地址');
    } catch (_q1) {}
  }
  if(qp2 && !isEn) qp2.style.display = 'none';
  // swoosh 转账动画
  const sfp1 = _safeEl('swooshFromPart1');
  const sfp2 = _safeEl('swooshFromPart2');
  if(sfp1 && !isEn) { sfp1.textContent = nativeAddr; sfp1.style.fontSize='12px'; sfp1.style.letterSpacing='0'; }
  if(sfp2 && !isEn) sfp2.style.display = 'none';
  // 转账成功页
  const suc1 = _safeEl('successFromPart1');
  const suc2 = _safeEl('successFromPart2');
  const sucLab = _safeEl('successFromSenderLabel');
  if(suc1 && !isEn) { suc1.textContent = nativeAddr; suc1.style.fontSize='12px'; }
  if(suc2 && !isEn) suc2.style.display = 'none';
  if (sucLab && typeof wwFormatAddrChip === 'function') {
    sucLab.textContent = wwFormatAddrChip(getNativeAddr());
  }
  // 地址页
  const m=_safeEl('addrMain');
  const n=(_safeEl('addrNum') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* addrNum fallback */;
  if(m) m.textContent = isEn ? CHAIN_ADDR : a.main;
  if(n) n.style.display = isEn?'none':'block';
  if(n&&!isEn) n.textContent = a.num;
  // QR弹窗同步
  const qm=document.getElementById('qrAddrMain');
  if(qm) {
    qm.textContent = isEn ? CHAIN_ADDR : nativeAddr;
    try {
      var _qc = isEn ? CHAIN_ADDR : nativeAddr;
      if (_qc) {
        qm.setAttribute('data-ww-copy', _qc);
        qm.setAttribute('title', '点击复制地址');
      } else {
        qm.removeAttribute('data-ww-copy');
        qm.removeAttribute('title');
      }
    } catch (_q2) {}
  }
  // 二维码区「保存二维码」按钮文案（随界面语言）
  const saveQrBtn = document.getElementById('saveReceiveQrBtn');
  if (saveQrBtn) {
    saveQrBtn.textContent = currentLang === 'en' ? 'Save QR' : '保存二维码';
    saveQrBtn.title = currentLang === 'en' ? 'Save QR code as a PNG image' : '将二维码保存为 PNG 图片';
  }
  // 更新二维码显示内容
  updateQRDisplay();
  // 同步礼金UI
  if(typeof updateGiftUI==='function') updateGiftUI();
  updateHomeChainStrip();
}

function randDigits(n) {
  let s = '';
  for(let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
}

/** 万语地址持久化：刷新/切页后必须与首次生成一致（须含前后缀，否则 tryLoad 会失败并每次随机） */
function persistWanYuAddrToStorage() {
  try {
    var slots = ADDR_WORDS.map(function (w) {
      return { word: w.word, lang: w.lang || 'zh', custom: !!w.custom };
    });
    localStorage.setItem('wallet_addr_words', JSON.stringify(slots));
    var preEl = document.getElementById('addrPrefix');
    var sufEl = document.getElementById('addrSuffix');
    if (preEl) {
      var prefix = String(preEl.textContent || '')
        .replace(/\D/g, '')
        .substring(0, 8)
        .padStart(8, '0');
      if (prefix.length === 8) localStorage.setItem('wallet_prefix', prefix);
    }
    if (sufEl) {
      var suffix = String(sufEl.textContent || '')
        .replace(/\D/g, '')
        .substring(0, 8)
        .padStart(8, '0');
      if (suffix.length === 8) localStorage.setItem('wallet_suffix', suffix);
    }
    if (typeof getNativeAddr === 'function' && ADDR_WORDS.length === 10) {
      try {
        localStorage.setItem('wallet_native_addr', getNativeAddr());
      } catch (_na) {}
    }
    var fp = _wwWanYuSeedStr();
    if (fp) localStorage.setItem('ww_wan_yu_wallet_fp', fp);
  } catch (e) {
    console.error('[WanYuAddr]', e);
  }
}

function tryLoadWanYuAddrFromStorage() {
  try {
    if (typeof ADDR_WORDS === 'undefined') return false;
    var seed = _wwWanYuSeedStr();
    try {
      var fpSt = localStorage.getItem('ww_wan_yu_wallet_fp') || '';
      if (seed && fpSt && seed !== fpSt) {
        ['wallet_addr_words', 'wallet_prefix', 'wallet_suffix', 'wallet_native_addr'].forEach(function (k) {
          try {
            localStorage.removeItem(k);
          } catch (_x) {}
        });
        try {
          if (seed) localStorage.setItem('ww_wan_yu_wallet_fp', seed);
        } catch (_fp2) {}
      }
      /* 已有链上种子但从未写入 ww_wan_yu_wallet_fp（此前无 TEMP/REAL 身份时随机占位）：与当前钱包不一致则丢弃 */
      if (seed && !fpSt && (localStorage.getItem('wallet_addr_words') || localStorage.getItem('wallet_native_addr'))) {
        ['wallet_addr_words', 'wallet_prefix', 'wallet_suffix', 'wallet_native_addr'].forEach(function (k) {
          try {
            localStorage.removeItem(k);
          } catch (_x2) {}
        });
      }
    } catch (_fp) {}

    var prefix = localStorage.getItem('wallet_prefix');
    var suffix = localStorage.getItem('wallet_suffix');
    var wj = localStorage.getItem('wallet_addr_words');
    var rawFull = localStorage.getItem('wallet_native_addr');

    if ((!prefix || !suffix) && rawFull && String(rawFull).indexOf('-') >= 0) {
      var parts0 = String(rawFull).split('-');
      if (parts0.length === 3) {
        prefix = prefix || String(parts0[0]).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
        suffix = suffix || String(parts0[2]).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
      }
    }

    var parsed = null;
    if (wj) {
      try {
        parsed = JSON.parse(wj);
      } catch (parseErr) {
        console.warn('[WanYuAddr] wallet_addr_words JSON.parse 失败:', parseErr);
      }
    }

    if (!parsed || !Array.isArray(parsed) || parsed.length !== 10) {
      if (rawFull && String(rawFull).indexOf('-') >= 0) {
        var segs = String(rawFull).split('-');
        if (segs.length === 3) {
          var mid = segs[1] || '';
          var chars = Array.from(mid);
          if (chars.length === 10) {
            ADDR_WORDS.length = 0;
            for (var c = 0; c < 10; c++) {
              ADDR_WORDS.push({ word: chars[c], lang: 'zh', custom: false });
            }
          }
        }
      }
      if (ADDR_WORDS.length !== 10) return false;
    } else {
      ADDR_WORDS.length = 0;
      for (var i = 0; i < 10; i++) {
        var item = parsed[i];
        if (typeof item === 'string') {
          ADDR_WORDS.push({ word: item, lang: 'zh', custom: false });
        } else if (item && typeof item.word === 'string') {
          ADDR_WORDS.push({ word: item.word, lang: item.lang || 'zh', custom: !!item.custom });
        } else {
          ADDR_WORDS.length = 0;
          return false;
        }
      }
    }

    if (!prefix || !suffix) {
      var d = seed ? _wwDerivePrefixSuffixFromSeed(seed) : null;
      if (d) {
        prefix = prefix || d.prefix;
        suffix = suffix || d.suffix;
      }
    }
    if (!prefix || !suffix) return false;
    prefix = String(prefix)
      .replace(/\D/g, '')
      .substring(0, 8)
      .padStart(8, '0');
    suffix = String(suffix)
      .replace(/\D/g, '')
      .substring(0, 8)
      .padStart(8, '0');

    var preEl = document.getElementById('addrPrefix');
    var sufEl = document.getElementById('addrSuffix');
    if (preEl) preEl.textContent = prefix;
    if (sufEl) sufEl.textContent = suffix;
    return true;
  } catch (e) {
    console.warn('[WanYuAddr] tryLoadWanYuAddrFromStorage 异常:', e);
    return false;
  }
}

function syncNativeAddrDisplaysToAllViews() {
  setTimeout(function () {
    const addr = getNativeAddr();
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
    const qp1 = document.getElementById('qrPart1');
    const qp2 = document.getElementById('qrPart2');
    if (qp1) {
      const prefix = document.getElementById('addrPrefix')?.textContent || '';
      const suffix = document.getElementById('addrSuffix')?.textContent || '';
      let html = `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${prefix}</span><span style="color:var(--text-muted);font-size:11px">-</span>`;
      ADDR_WORDS.forEach(function (w) {
        if (w.custom) {
          html += `<span style="color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)">${w.word}</span>`;
        } else {
          html += `<span style="color:#8888bb;font-size:13px">${w.word}</span>`;
        }
      });
      html += `<span style="color:var(--text-muted);font-size:11px">-</span><span style="color:var(--text-muted);font-family:monospace;font-size:11px">${suffix}</span>`;
      qp1.innerHTML = html;
    }
    if (qp2) qp2.style.display = 'none';
    const qm = document.getElementById('qrAddrMain');
    if (qm) { qm.textContent = addr; qm.style.cssText = 'font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1a1a1a;text-align:center;display:block;margin-bottom:4px'; }
    const sfp1 = _safeEl('swooshFromPart1');
    const sfp2 = _safeEl('swooshFromPart2');
    if (sfp1) { sfp1.textContent = addr; sfp1.style.cssText = 'font-size:10px;font-weight:700;color:#f0d070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
    if (sfp2) sfp2.style.display = 'none';
    const suc1 = _safeEl('successFromPart1');
    const suc2 = _safeEl('successFromPart2');
    if (suc1) { suc1.textContent = addr; suc1.style.cssText = 'font-size:10px;font-weight:700;color:#f0d070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
    if (suc2) suc2.style.display = 'none';
  }, 50);
}

/** 钱包就绪后调用：内存为空则从 localStorage 恢复或生成并落盘（只生成一次） */
function ensureNativeAddrInitialized() {
  if (typeof ADDR_WORDS === 'undefined') return;
  /* 半初始化（1–9 槽）时若早退会导致万语永不生成；清空后重走 initAddrWords */
  if (ADDR_WORDS.length > 0 && ADDR_WORDS.length !== 10) {
    try {
      ADDR_WORDS.length = 0;
    } catch (_c) {}
  }
  if (ADDR_WORDS.length > 0) return;
  initAddrWords();
}

/**
 * 创建流程：先有链上身份前可能用空种子占过万语槽；TEMP→REAL 后须按新种子重算，否则 ensureNativeAddrInitialized 会因 ADDR_WORDS 非空直接 return。
 */
function wwClearWanYuAddrCacheForWalletChange() {
  try {
    if (typeof ADDR_WORDS === 'undefined') return;
    var seed = '';
    try {
      seed = _wwWanYuSeedStr();
    } catch (_e) {}
    var fpSt = '';
    try {
      fpSt = localStorage.getItem('ww_wan_yu_wallet_fp') || '';
    } catch (_e2) {}
    if (seed && (!fpSt || fpSt !== seed)) {
      ADDR_WORDS.length = 0;
      __wanYuAddrInitialized = false;
      try {
        ['wallet_addr_words', 'wallet_prefix', 'wallet_suffix', 'wallet_native_addr'].forEach(function (k) {
          try {
            localStorage.removeItem(k);
          } catch (_x) {}
        });
      } catch (_ls) {}
    }
  } catch (_er) {}
}
try {
  window.wwClearWanYuAddrCacheForWalletChange = wwClearWanYuAddrCacheForWalletChange;
} catch (_w) {}

// 万语地址中段：10 个随机字符（每字独立抽取），语言与当前界面语言一致（中文=随机汉字）；不使用 WW_WORDS_EXTRA 等地名词库
// SINGLE_CHARS.* 在 wallet.ui.js 中定义，此处仅作脚本解析顺序兜底
var WW_ZH_ADDR_CHAR_FALLBACK =
  '龙凤虎鹤福寿禄喜财春夏秋冬金木水火土山川云月星日风雨雪天地人和日月星斗甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥东南西北' +
  '等的个多咕咚得到来更中一二三四五六七八九十百千万千大小国人心正开平安乐吉祥如意';

function _wwDerivePrefixSuffixFromSeed(seedStr) {
  var rng = _wwSeedRng(String(seedStr || '') + '|pfxSfx');
  var pre = '';
  var suf = '';
  var i;
  for (i = 0; i < 8; i++) pre += String(Math.floor(rng() * 10));
  for (i = 0; i < 8; i++) suf += String(Math.floor(rng() * 10));
  return { prefix: pre, suffix: suf };
}

function _wwRandMidCharSeeded(rng, midLang) {
  var key = midLang || 'zh';
  if (key === 'en') key = 'zh';
  var pool =
    typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS[key] && SINGLE_CHARS[key].length
      ? SINGLE_CHARS[key]
      : null;
  if (!pool || !pool.length) {
    var fb = WW_ZH_ADDR_CHAR_FALLBACK;
    return fb[Math.floor(rng() * fb.length)];
  }
  return pool[Math.floor(rng() * pool.length)];
}

function randWanYuZhChar() {
  const pool = (typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS.zh && SINGLE_CHARS.zh.length)
    ? SINGLE_CHARS.zh
    : WW_ZH_ADDR_CHAR_FALLBACK;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 当前 UI 语言 → 万语中段字符集键（英语界面仍生成万语备份数据时用简体汉字池） */
function _wanYuMidLangKey() {
  var l = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'zh';
  if (l === 'en') return 'zh';
  return l;
}

/** 万语中段单字：按语言从 SINGLE_CHARS 各抽 1 个；无独立词表时拉丁语族用 a–z，乌尔都语近似用阿拉伯字母池 */
function randWanYuMidCharForLang(langKey) {
  var key = langKey || 'zh';
  if (key === 'zh') return randWanYuZhChar();
  if (typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS[key] && SINGLE_CHARS[key].length)
    return SINGLE_CHARS[key][Math.floor(Math.random() * SINGLE_CHARS[key].length)];
  if (key === 'id' || key === 'ms' || key === 'sw') {
    var lat = (typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS.nl) ? SINGLE_CHARS.nl : 'abcdefghijklmnopqrstuvwxyz';
    return lat[Math.floor(Math.random() * lat.length)];
  }
  if (key === 'ur' && typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS.ar && SINGLE_CHARS.ar.length)
    return SINGLE_CHARS.ar[Math.floor(Math.random() * SINGLE_CHARS.ar.length)];
  return randWanYuZhChar();
}

function randWord(lang) {
  // 先查 SINGLE_CHARS（单字），再查 WW_WORDS_EXTRA（词库），再fallback到zh
  const chars = SINGLE_CHARS[lang];
  if(chars && chars.length > 0) return chars[Math.floor(Math.random()*chars.length)];
  const extra = WW_WORDS_EXTRA[lang];
  if(extra && extra.length > 0) {
    const w = extra[Math.floor(Math.random()*extra.length)];
    return w.substring(0, 4); // 词库取前4字作为地址词
  }
  return SINGLE_CHARS.zh[Math.floor(Math.random()*SINGLE_CHARS.zh.length)];
}

function randLang() {
  // 使用所有支持的语言（LANG_INFO + WW_WORDS_EXTRA）
  const allLangs = [...new Set([
    ...Object.keys(SAMPLE_KEYS),
    ...Object.keys(WW_WORDS_EXTRA)
  ])].filter(l => l !== 'en' && l !== 'zh-TW' && l !== 'zh-HK');
  return allLangs[Math.floor(Math.random()*allLangs.length)];
}

function _wwEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _wwSeedRng(seedStr) {
  var s = 2166136261;
  var i = 0;
  for (; i < seedStr.length; i++) s = Math.imul(s ^ seedStr.charCodeAt(i), 16777619);
  return function next() {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000000) / 10000000;
  };
}

function _wwNavigatorLangBucket() {
  var raw = '';
  try {
    if (navigator.languages && navigator.languages.length) raw = String(navigator.languages[0] || '');
    else if (navigator.language) raw = String(navigator.language);
  } catch (e) {}
  raw = raw.toLowerCase();
  if (raw.startsWith('zh')) return 'zh';
  if (raw.startsWith('ja')) return 'ja';
  if (raw.startsWith('ko')) return 'ko';
  if (raw.startsWith('ar')) return 'ar';
  if (raw.startsWith('ru')) return 'ru';
  if (raw.startsWith('hi')) return 'hi';
  if (raw.startsWith('th')) return 'th';
  if (raw.startsWith('vi')) return 'vi';
  if (raw.startsWith('en')) return 'en';
  return 'en';
}

function _wwGoldMiddleTenFromNavigator(seedStr) {
  var rnd = _wwSeedRng(String(seedStr || '') + '|navGoldMid');
  var bucket = _wwNavigatorLangBucket();
  if (bucket === 'en') {
    var out = [];
    var i;
    for (i = 0; i < 10; i++) out.push(EN_HOME_MID_WORDS[Math.floor(rnd() * EN_HOME_MID_WORDS.length)]);
    return out.join('\u00b7');
  }
  var map = { zh: SINGLE_CHARS.zh, ja: SINGLE_CHARS.ja, ko: SINGLE_CHARS.ko, ar: SINGLE_CHARS.ar, ru: SINGLE_CHARS.ru, hi: SINGLE_CHARS.hi, th: SINGLE_CHARS.th, vi: SINGLE_CHARS.vi };
  var chars = map[bucket] || SINGLE_CHARS.zh;
  var s = '';
  var j;
  for (j = 0; j < 10; j++) s += chars[Math.floor(rnd() * chars.length)];
  return s;
}

function renderHomeAddrChip() {
  if (typeof ADDR_WORDS === 'undefined') return;
  var chip = document.getElementById('homeAddrChip');
  var settingsAddrEl = document.getElementById('settingsAddr');
  if (!chip && !settingsAddrEl) return;
  var rwView =
    typeof window.wwGetChainViewWallet === 'function'
      ? window.wwGetChainViewWallet()
      : typeof REAL_WALLET !== 'undefined'
        ? REAL_WALLET
        : null;
  var isEn = typeof currentLang !== 'undefined' && currentLang === 'en';
  var goldStyle = 'color:#C8A84B;font-weight:700;letter-spacing:0.5px;';
  var dimStyle = 'color:rgba(255,255,255,0.45);font-size:10px;';
  var baseChipStyle =
    'font-size:11px;letter-spacing:0.5px;color:#C8A84B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(100%,260px);text-align:center;display:block';
  if (isEn) {
    var seed = (typeof getNativeAddr === 'function' ? getNativeAddr() : '') + '|' + ((rwView && rwView.trxAddress) ? rwView.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : ''));
    var midGold = _wwGoldMiddleTenFromNavigator(seed);
    var ca = String((rwView && rwView.trxAddress) ? rwView.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '--'));
    var innerEn = '';
    if (ca.length > 14 && ca !== '--') {
      var pre = ca.slice(0, 5);
      var suf = ca.slice(-5);
      innerEn =
        '<span style="' +
        dimStyle +
        '">' +
        _wwEsc(pre) +
        '</span><span style="' +
        goldStyle +
        '">' +
        _wwEsc(midGold) +
        '</span><span style="' +
        dimStyle +
        '">' +
        _wwEsc(suf) +
        '</span>';
    } else {
      innerEn = '<span style="' + goldStyle + '">' + _wwEsc(midGold) + '</span>';
    }
    if (chip) {
      chip.innerHTML = innerEn;
      chip.style.cssText = baseChipStyle;
      try {
        chip.setAttribute('data-ww-copy', typeof getNativeAddr === 'function' ? getNativeAddr() : '');
        chip.setAttribute('title', '点击复制地址');
      } catch (_c1) {}
    }
    if (settingsAddrEl && rwView && rwView.ethAddress) {
      settingsAddrEl.textContent = rwView.ethAddress;
      settingsAddrEl.style.cssText =
        'font-size:12px;color:var(--text-muted);line-height:1.7;word-break:break-all;text-align:center';
      try {
        settingsAddrEl.setAttribute('data-ww-copy', rwView.ethAddress);
        settingsAddrEl.setAttribute('title', '点击复制完整地址');
      } catch (_c2) {}
    }
    try {
      if (chip && chip.innerHTML) document.documentElement.classList.remove('ww-addr-pending');
    } catch (_wpen) {}
    return;
  }
  try {
    if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized();
  } catch (_ena) {}
  var prefix = _wanYuP8FromDomOrStorage(document.getElementById('addrPrefix'), 'wallet_prefix', '38294651');
  var suffix = _wanYuP8FromDomOrStorage(document.getElementById('addrSuffix'), 'wallet_suffix', '92847361');
  var midGold = ADDR_WORDS.length ? ADDR_WORDS.map(function (w) { return w.word; }).join('') : '';
  /* 万语中段未就绪时勿留空芯片：CSS html.ww-addr-pending 会对 #homeAddrChip 设 visibility:hidden，易表现为「地址消失」 */
  if (!midGold && rwView && (rwView.trxAddress || rwView.ethAddress)) {
    var trxFb = String(rwView.trxAddress || rwView.ethAddress || '');
    var fbTxt =
      typeof wwFormatAddrChip === 'function'
        ? wwFormatAddrChip(trxFb)
        : trxFb.length > 12
          ? trxFb.slice(0, 5) + '…' + trxFb.slice(-4)
          : trxFb;
    var innerFb = '<span style="' + goldStyle + '">' + _wwEsc(fbTxt) + '</span>';
    if (chip) {
      chip.innerHTML = innerFb;
      chip.style.cssText = baseChipStyle;
      try {
        chip.setAttribute('data-ww-copy', trxFb);
        chip.setAttribute('title', '点击复制链上地址');
      } catch (_cfb) {}
    }
    if (settingsAddrEl) {
      settingsAddrEl.innerHTML = innerFb;
      settingsAddrEl.style.cssText =
        baseChipStyle + ';max-width:100%;white-space:normal;word-break:break-word;line-height:1.65;padding:4px 0';
      try {
        settingsAddrEl.setAttribute('data-ww-copy', trxFb);
        settingsAddrEl.setAttribute('title', '点击复制链上地址');
      } catch (_cfs) {}
    }
    try {
      document.documentElement.classList.remove('ww-addr-pending');
    } catch (_wpfb) {}
    return;
  }
  var innerZh =
    '<span style="' +
    dimStyle +
    '">' +
    _wwEsc(prefix) +
    '</span><span style="' +
    dimStyle +
    '">-</span><span style="' +
    goldStyle +
    '">' +
    _wwEsc(midGold) +
    '</span><span style="' +
    dimStyle +
    '">-</span><span style="' +
    dimStyle +
    '">' +
    _wwEsc(suffix) +
    '</span>';
  if (chip) {
    chip.innerHTML = innerZh;
    chip.style.cssText = baseChipStyle;
    try {
      chip.setAttribute('data-ww-copy', typeof getNativeAddr === 'function' ? getNativeAddr() : '');
      chip.setAttribute('title', '点击复制万语地址');
    } catch (_cz) {}
  }
  if (settingsAddrEl) {
    settingsAddrEl.innerHTML = innerZh;
    settingsAddrEl.style.cssText =
      baseChipStyle + ';max-width:100%;white-space:normal;word-break:break-word;line-height:1.65;padding:4px 0';
    try {
      settingsAddrEl.setAttribute('data-ww-copy', typeof getNativeAddr === 'function' ? getNativeAddr() : '');
      settingsAddrEl.setAttribute('title', '点击复制万语地址');
    } catch (_cs) {}
  }
  try {
    if (chip && (chip.innerHTML || '').replace(/<[^>]*>/g, '').trim().length > 0) {
      document.documentElement.classList.remove('ww-addr-pending');
    }
  } catch (_wpzh) {}
}

function initAddrWords() {
  if (_lock) return;
  _lock = true;
  try {
    __wanYuInitAddrWordsCallCount++;
    console.log('[WanYuAddr] initAddrWords 调用次数:', __wanYuInitAddrWordsCallCount, {
      addrWordsLen: typeof ADDR_WORDS !== 'undefined' ? ADDR_WORDS.length : -1,
      alreadyInit: __wanYuAddrInitialized
    });
    try {
      var _fpNow = _wwWanYuSeedStr();
      var _fpWas = localStorage.getItem('ww_wan_yu_wallet_fp') || '';
      /* 身份从无到有、或切换钱包：须重算万语（仅旧逻辑要求两指纹均非空会漏掉 TEMP 就绪后的首次绑定） */
      if (_fpNow !== _fpWas) {
        __wanYuAddrInitialized = false;
        ADDR_WORDS.length = 0;
      }
    } catch (_memFp) {}
    if (__wanYuAddrInitialized && ADDR_WORDS.length === 10) {
      renderAddrWords();
      return;
    }
    if (tryLoadWanYuAddrFromStorage()) {
      __wanYuAddrInitialized = true;
      renderAddrWords();
      persistWanYuAddrToStorage();
      try { if (typeof updateAddr === 'function') updateAddr(); } catch (_u) {}
      return;
    }
    ADDR_WORDS.length = 0;
    var seed = _wwWanYuSeedStr();
    if (seed) {
      var rngMid = _wwSeedRng(seed + '|mid10');
      var midLang = _wanYuMidLangKey();
      var ii;
      for (ii = 0; ii < 10; ii++) {
        ADDR_WORDS.push({ word: _wwRandMidCharSeeded(rngMid, midLang), lang: midLang, custom: false });
      }
      var ps = _wwDerivePrefixSuffixFromSeed(seed);
      var preEl = document.getElementById('addrPrefix');
      var sufEl = document.getElementById('addrSuffix');
      if (preEl) preEl.textContent = ps.prefix;
      if (sufEl) sufEl.textContent = ps.suffix;
    } else {
      var midLang2 = _wanYuMidLangKey();
      var i;
      for (i = 0; i < 10; i++) {
        ADDR_WORDS.push({ word: randWanYuMidCharForLang(midLang2), lang: midLang2, custom: false });
      }
      var preEl2 = document.getElementById('addrPrefix');
      var sufEl2 = document.getElementById('addrSuffix');
      if (preEl2) preEl2.textContent = randDigits(8);
      if (sufEl2) sufEl2.textContent = randDigits(8);
    }
    renderAddrWords();
    persistWanYuAddrToStorage();
    try { if (typeof updateAddr === 'function') updateAddr(); } catch (_u2) {}
    __wanYuAddrInitialized = true;
    try {
      document.documentElement.classList.remove('ww-addr-pending');
    } catch (_ap) {}
  } finally {
    _lock = false;
  }
}

function renderAddrWords() {
  const container = document.getElementById('addrWords');
  if(!container) return;
  const pre = document.getElementById('addrPrefix');
  const suf = document.getElementById('addrSuffix');
  if(pre) pre.textContent = (pre.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  if(suf) suf.textContent = (suf.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  container.innerHTML = '';
  ADDR_WORDS.forEach(function (w) {
    const s = document.createElement('span');
    s.textContent = w.word;
    container.appendChild(s);
  });
  const m = document.getElementById('addrMain');
  if (m) m.textContent = ADDR_WORDS.map(w => w.word).join('');
  const qp1 = document.getElementById('qrPart1');
  if(qp1 && ADDR_WORDS.length) {
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    qp1.innerHTML = '';
    const preSpan = document.createElement('span');
    preSpan.textContent = prefix;
    preSpan.style.cssText = 'color:var(--text-muted);font-family:monospace;font-size:11px';
    qp1.appendChild(preSpan);

    const dashSpan = document.createElement('span');
    dashSpan.textContent = '-';
    dashSpan.style.cssText = 'color:var(--text-muted);font-size:11px';
    qp1.appendChild(dashSpan);

    ADDR_WORDS.forEach(w => {
      const span = document.createElement('span');
      span.textContent = w.word;
      span.style.cssText = w.custom
        ? 'color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)'
        : 'color:#8888bb;font-size:13px';
      qp1.appendChild(span);
    });

    const dashSpan2 = document.createElement('span');
    dashSpan2.textContent = '-';
    dashSpan2.style.cssText = 'color:var(--text-muted);font-size:11px';
    qp1.appendChild(dashSpan2);

    const sufSpan = document.createElement('span');
    sufSpan.textContent = suffix;
    sufSpan.style.cssText = 'color:var(--text-muted);font-family:monospace;font-size:11px';
    qp1.appendChild(sufSpan);
    try {
      var _naQ = typeof getNativeAddr === 'function' ? getNativeAddr() : '';
      if (_naQ) {
        qp1.setAttribute('data-ww-copy', _naQ);
        qp1.setAttribute('title', '点击复制万语地址');
      }
    } catch (_rq) {}
  }
}

function _wanYuRandomMiddleTenString() {
  var midLang = _wanYuMidLangKey();
  var s = '';
  var i;
  for (i = 0; i < 10; i++) s += randWanYuMidCharForLang(midLang);
  return s;
}

function closeWanYuCustomize() {
  var ov = document.getElementById('wanYuCustomizeOverlay');
  if (ov) ov.classList.remove('show');
}

function wanYuCustomizeRandomMidFill() {
  var elIn = document.getElementById('wanYuCustomizeMidInput');
  var err = document.getElementById('wanYuCustomizeErr');
  if (elIn) elIn.value = _wanYuRandomMiddleTenString();
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  try {
    if (typeof tapHaptic === 'function') tapHaptic(8);
  } catch (_h) {}
}

function wanYuCustomizeSubmit() {
  var elIn = document.getElementById('wanYuCustomizeMidInput');
  var err = document.getElementById('wanYuCustomizeErr');
  var trimmed = elIn ? String(elIn.value).trim() : '';
  var midLang = _wanYuMidLangKey();
  var preEl = document.getElementById('addrPrefix');
  var sufEl = document.getElementById('addrSuffix');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  try {
    localStorage.removeItem('wallet_native_addr');
  } catch (_r) {}
  if (trimmed.length === 0) {
    var ri;
    for (ri = 0; ri < 10; ri++) {
      ADDR_WORDS[ri] = { word: randWanYuMidCharForLang(midLang), lang: midLang, custom: false };
    }
  } else {
    var chars = Array.from(trimmed);
    if (chars.length !== 10) {
      if (err) {
        err.textContent = '中间段须恰好 10 个字符（当前 ' + chars.length + ' 个）';
        err.style.display = 'block';
      }
      try {
        if (typeof tapHaptic === 'function') tapHaptic(20);
      } catch (_h2) {}
      return;
    }
    var ii;
    for (ii = 0; ii < 10; ii++) {
      ADDR_WORDS[ii] = {
        word: chars[ii],
        lang: (ADDR_WORDS[ii] && ADDR_WORDS[ii].lang) || midLang,
        custom: true
      };
    }
  }
  var newPre = randDigits(8);
  var newSuf = randDigits(8);
  if (preEl) preEl.textContent = newPre;
  if (sufEl) sufEl.textContent = newSuf;
  renderAddrWords();
  persistWanYuAddrToStorage();
  try {
    if (typeof updateAddr === 'function') updateAddr();
  } catch (_u) {}
  try {
    if (typeof syncNativeAddrDisplaysToAllViews === 'function') syncNativeAddrDisplaysToAllViews();
  } catch (_s) {}
  closeWanYuCustomize();
  try {
    if (typeof showToast === 'function') showToast('万语地址已更新', 'success');
  } catch (_t) {}
  try {
    if (typeof tapHaptic === 'function') tapHaptic(14);
  } catch (_h3) {}
}

function openCustomizeAddr() {
  try {
    if (typeof ensureNativeAddrInitialized === 'function') ensureNativeAddrInitialized();
  } catch (_e) {}
  if (!ADDR_WORDS || ADDR_WORDS.length !== 10) {
    console.warn('[WanYuAddr] openCustomizeAddr: ADDR_WORDS not ready');
    try {
      if (typeof showToast === 'function') showToast('地址尚未就绪，请稍后重试', 'error');
    } catch (_t) {}
    return;
  }
  var elIn = document.getElementById('wanYuCustomizeMidInput');
  var err = document.getElementById('wanYuCustomizeErr');
  var ov = document.getElementById('wanYuCustomizeOverlay');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
  }
  if (elIn) {
    elIn.value = ADDR_WORDS.map(function (w) {
      return w.word;
    }).join('');
  }
  if (ov) {
    ov.classList.add('show');
    try {
      if (elIn) elIn.focus();
    } catch (_f) {}
  }
  try {
    if (typeof tapHaptic === 'function') tapHaptic(12);
  } catch (_h) {}
}

function openWordEditor(idx) {
  var slot = typeof idx === 'number' ? idx : parseInt(String(idx), 10);
  if (slot !== slot || slot < 0 || slot > 9 || !ADDR_WORDS || ADDR_WORDS.length !== 10 || !ADDR_WORDS[slot]) {
    console.warn('[WanYuAddr] openWordEditor: invalid index', idx);
    return;
  }
  idx = slot;
  const w = ADDR_WORDS[idx];
  const info = LANG_INFO[w.lang] || {flag:'🌍', name:'?'};

  const input = window.prompt(
    `第 ${idx+1} 个字（当前：${info.flag} "${w.word}"）\n\n输入新词（直接输入），或留空随机\n\n可用语言：${Object.entries(LANG_INFO).filter(([l])=>l!=='en').map(([l,i])=>i.flag+l).join(' ')}`,
    w.custom ? w.word : ''
  );
  if (input === null) return;
  var trimmed = String(input).trim();
  if (trimmed.length === 0) {
    ADDR_WORDS[idx] = { word: randWanYuMidCharForLang(w.lang || 'zh'), lang: w.lang || 'zh', custom: false };
    renderAddrWords();
    persistWanYuAddrToStorage();
    try { if (typeof updateAddr === 'function') updateAddr(); } catch (_e) {}
    return;
  }
  if (trimmed.length > 4) {
    alert('max 4');
    return;
  }
  ADDR_WORDS[idx] = {word: trimmed, lang: w.lang, custom: true};
  renderAddrWords();
  persistWanYuAddrToStorage();
  try {
    if (typeof updateAddr === 'function') updateAddr();
  } catch (_e2) {}
}

/** 同步复制（与 click 同栈，避免 Clipboard API 异步导致手势失效；浅色主题下仍可靠触发成功 UI） */
function wwCopyTextSync(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = String(text || '');
    ta.readOnly = true;
    ta.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;padding:0;border:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      ta.setSelectionRange(0, ta.value.length);
    } catch (_r) {}
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_e) {
    return false;
  }
}

/** HTML 文本节点转义（用于 innerHTML 片段） */
function wwEscHtml(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

/** data-* 属性值转义 */


function wwShortChainForStrip(addr) {
  if (!addr || addr === '--') return '—';
  var t = String(addr).trim();
  if (t.length <= 12) return t;
  return t.slice(0, 5) + '…' + t.slice(-4);
}

/** 首页链上缩写行：短标签 + 点击复制完整链上地址 */
function wwCopyableShortChainHtml(fullAddr) {
  var f = String(fullAddr || '').trim();
  if (!f || f === '--') return '—';
  var short = wwShortChainForStrip(f);
  return (
    '<span data-ww-copy="' +
    wwEscAttr(f) +
    '" title="点击复制完整地址" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px">' +
    wwEscHtml(short) +
    '</span>'
  );
}

function wwCopyAddressWithToast(fullText) {
  var t = String(fullText || '').trim();
  if (!t) {
    try {
      if (typeof showToast === 'function') showToast('没有可复制内容', 'warning');
    } catch (_e) {}
    return;
  }
  try {
    if (typeof tapHaptic === 'function') tapHaptic(8);
  } catch (_h) {}
  var done = function () {
    try {
      if (typeof showToast === 'function') showToast('已复制地址', 'success', 2200);
    } catch (_t) {}
  };
  if (typeof wwCopyTextSync === 'function' && wwCopyTextSync(t)) {
    done();
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done).catch(function () {
      if (typeof wwCopyTextSync === 'function' && wwCopyTextSync(t)) done();
      else
        try {
          if (typeof showToast === 'function') showToast('复制失败，请长按手动复制', 'error');
        } catch (_e2) {}
    });
    return;
  }
  try {
    if (typeof showToast === 'function') showToast('复制失败，请长按手动复制', 'error');
  } catch (_e3) {}
}

/** 整行展示完整链上地址时：点击复制同一段文本 */
function wwSetLineElementAddrCopyable(el, text) {
  if (!el) return;
  var t = String(text || '').trim();
  if (!t || t === '--') {
    try {
      el.removeAttribute('data-ww-copy');
      el.removeAttribute('title');
    } catch (_r) {}
    el.textContent = t || '--';
    return;
  }
  el.textContent = t;
  el.setAttribute('data-ww-copy', t);
  el.setAttribute('title', '点击复制完整地址');
}

function wwSetConfirmRecipientCopyable(el, fullAddr) {
  if (!el) return;
  var addr = String(fullAddr || '').trim();
  if (!addr) {
    el.textContent = '';
    try {
      el.removeAttribute('data-ww-copy');
    } catch (_x) {}
    return;
  }
  var show = addr.length > 20 ? addr.slice(0, 20) + '...' : addr;
  el.innerHTML =
    '<span data-ww-copy="' +
    wwEscAttr(addr) +
    '" title="点击复制完整地址" style="cursor:pointer;text-decoration:underline dotted">' +
    wwEscHtml(show) +
    '</span>';
}

/** 成功页等：缩写展示 + 复制完整地址 */
function wwSetAddrBadgeCopyable(el, fullAddr) {
  if (!el) return;
  var full = String(fullAddr || '').trim();
  if (!full) {
    el.textContent = '—';
    try {
      el.removeAttribute('data-ww-copy');
    } catch (_x) {}
    return;
  }
  var disp = typeof wwFormatAddrChip === 'function' ? wwFormatAddrChip(full) : full;
  el.innerHTML =
    '<span data-ww-copy="' +
    wwEscAttr(full) +
    '" title="点击复制完整地址" style="cursor:pointer">' +
    wwEscHtml(disp) +
    '</span>';
}

(function wwInitCopyAddressDelegation() {
  if (window._wwCopyAddrDelegation) return;
  window._wwCopyAddrDelegation = true;
  try {
    if (!document.getElementById('ww-copy-addr-style')) {
      var st = document.createElement('style');
      st.id = 'ww-copy-addr-style';
      st.textContent =
        '[data-ww-copy]{cursor:pointer;-webkit-tap-highlight-color:rgba(200,168,75,0.18)}[data-ww-copy]:active{opacity:0.92}';
      document.head.appendChild(st);
    }
  } catch (_st) {}
  document.addEventListener(
    'click',
    function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('[data-ww-copy]') : null;
      if (!el) return;
      var raw = el.getAttribute('data-ww-copy');
      if (raw == null || raw === '') return;
      ev.preventDefault();
      ev.stopPropagation();
      wwCopyAddressWithToast(raw);
    },
    true
  );
})();

function copyHomeAddr() {
  const addr = getNativeAddr();
  const btn = document.getElementById('homeCopyAddrBtn');
  const TID = '_wwCopyAddrResetTid';
  const applySuccessUI = () => {
    if (!btn) return;
    if (btn[TID]) clearTimeout(btn[TID]);
    btn.textContent = '已复制';
    btn.classList.add('ww-copy-btn--success');
    btn[TID] = setTimeout(() => {
      btn[TID] = 0;
      btn.textContent = '复制地址';
      btn.classList.remove('ww-copy-btn--success');
    }, 2000);
    try {
      showToast('已复制', 'success', 2200);
    } catch (_t) {}
  };
  if (wwCopyTextSync(addr)) {
    applySuccessUI();
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(addr).then(applySuccessUI).catch(() => {
      if (wwCopyTextSync(addr)) applySuccessUI();
      else {
        try {
          showToast('复制失败，请长按地址手动复制', 'error');
        } catch (_e) {}
      }
    });
    return;
  }
  try {
    showToast('复制失败，请长按地址手动复制', 'error');
  } catch (_e2) {}
}

function openHomeTransfer() {
  tapHaptic(12);
  if (typeof goTo === 'function') goTo('page-transfer');
}

function getNativeAddr() {
  if (typeof ADDR_WORDS === 'undefined') {
    return currentLang === 'en' && typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '';
  }
  if(currentLang === 'en') return CHAIN_ADDR;
  try {
    var snap = localStorage.getItem('wallet_native_addr');
    if (snap && String(snap).split('-').length === 3 && ADDR_WORDS.length === 10) {
      var mid = String(snap).split('-')[1] || '';
      var ok = true;
      for (var i = 0; i < 10; i++) {
        if (!ADDR_WORDS[i] || ADDR_WORDS[i].word !== mid[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return snap;
    }
  } catch (_e) {}
  const prefix = _wanYuP8FromDomOrStorage(document.getElementById('addrPrefix'), 'wallet_prefix', '38294651');
  const suffix = _wanYuP8FromDomOrStorage(document.getElementById('addrSuffix'), 'wallet_suffix', '92847361');
  const words = ADDR_WORDS.length ? ADDR_WORDS.map(w=>w.word).join('') : '';
  return prefix + '-' + words + '-' + suffix;
}

/** 本人万语地址的中间 10 个汉字（规范 8数字-10汉字-8数字 取中间段；旧式「·」分隔取中间段前 10 个汉字） */
function getWanYuAddrMiddleTen() {
  if (typeof getNativeAddr !== 'function') return '';
  if (typeof currentLang !== 'undefined' && currentLang === 'en') return '';
  var addr = String(getNativeAddr());
  var parts = addr.split('-');
  if (parts.length === 3 && /^\d{8}$/.test(String(parts[0]).trim()) && /^\d{8}$/.test(String(parts[2]).trim())) {
    var mid = parts[1] || '';
    return mid.length > 10 ? mid.slice(0, 10) : mid;
  }
  if (addr.indexOf('·') !== -1) {
    var segs = addr.split('·').map(function (s) { return s.trim(); });
    if (segs.length >= 2) {
      var chunk = segs[1] || '';
      var han = chunk.match(/[\u4e00-\u9fff]/g);
      if (han && han.length) return han.slice(0, 10).join('');
      return chunk.slice(0, 10);
    }
  }
  var allHan = addr.match(/[\u4e00-\u9fff]+/g);
  if (allHan && allHan.length) {
    var j = allHan.join('');
    if (j.length <= 10) return j;
    var st = Math.floor((j.length - 10) / 2);
    return j.slice(st, st + 10);
  }
  return '';
}

/** 转账成功页绿色胶囊：统一显示地址缩写，避免与「发出/收到」或中间段汉字被误认为普通文案 */
function wwFormatAddrChip(raw) {
  if (raw == null || raw === '') return '—';
  var s = String(raw).trim();
  if (!s) return '—';
  if (s.startsWith('0x') && s.length >= 12) return s.slice(0, 6) + '…' + s.slice(-4);
  if (s.startsWith('T') && s.length >= 14) return s.slice(0, 5) + '…' + s.slice(-4);
  if (s.startsWith('bc1') || ((s.startsWith('1') || s.startsWith('3')) && s.length > 12))
    return s.slice(0, 5) + '…' + s.slice(-4);
  var parts = s.split('-');
  if (parts.length === 3 && /^\d{8}$/.test(String(parts[0]).trim()) && /^\d{8}$/.test(String(parts[2]).trim())) {
    var pre = String(parts[0]).trim();
    var suf = String(parts[2]).trim();
    return pre.slice(0, 4) + '…' + suf.slice(-4);
  }
  if (s.indexOf('·') !== -1) {
    var seg = s.split('·').map(function (x) { return x.trim(); });
    if (seg.length >= 3) {
      var a = seg[0] || '';
      var c = seg[2] || '';
      if (a.length >= 2 && c.length >= 2) return a.slice(0, 4) + '…' + c.slice(-4);
    }
    if (seg.length >= 1) return (seg[0] || '').slice(0, 6) + (seg[0].length > 6 ? '…' : '');
  }
  if (s.length <= 14) return s;
  return s.slice(0, 8) + '…' + s.slice(-4);
}

function copyNative() {
  const addr = getNativeAddr();
  const btn = document.getElementById('copyNativeBtn');
  const TID = '_wwCopyAddrResetTid';
  const applySuccessUI = () => {
    if (!btn) return;
    if (btn[TID]) clearTimeout(btn[TID]);
    btn.textContent = '已复制';
    btn.classList.add('copied');
    btn[TID] = setTimeout(() => {
      btn[TID] = 0;
      btn.textContent = '📋 复制地址';
      btn.classList.remove('copied');
    }, 2000);
  };
  if (wwCopyTextSync(addr)) {
    applySuccessUI();
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(addr).then(applySuccessUI).catch(() => {
      if (wwCopyTextSync(addr)) applySuccessUI();
      else if (typeof showToast === 'function') showToast('复制失败，请长按地址手动复制', 'error');
    });
    return;
  }
  if (typeof showToast === 'function') showToast('复制失败，请长按地址手动复制', 'error');
}

function copyBoth() {
  const native = getNativeAddr();
  const isEn = currentLang === 'en';
  let text;
  if(isEn) {
    text = `⛓️ 公链地址\nTRX: ${CHAIN_ADDR}\nETH: ${getEthAddr()}\nBTC: ${getBtcAddr()}`;
  } else {
    text = `🌍 万语地址\n${native}\n\n⛓️ 公链地址\nTRX: ${CHAIN_ADDR}\nETH: ${getEthAddr()}\nBTC: ${getBtcAddr()}`;
  }
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn=_safeEl('copyBothBtn');
  btn.innerHTML='✅ 已复制两个地址';
  btn.style.borderColor='var(--green)';btn.style.color='var(--green)';
  setTimeout(()=>{btn.innerHTML='📋 一键复制两个地址（母语 + 公链）';btn.style.borderColor='';btn.style.color='';},2500);
}


function copyQRAddr() {
  const native = getNativeAddr();
  const text = currentLang==='en'
    ? '⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr()
    : '🌍 万语地址\n'+native+'\n\n⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr();
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn = _safeEl('qrCopyBtn');
  if (btn) {
    const TID = '_wwCopyAddrResetTid';
    if (btn[TID]) clearTimeout(btn[TID]);
    btn.innerHTML = '已复制';
    btn.style.color = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    btn[TID] = setTimeout(() => {
      btn[TID] = 0;
      btn.innerHTML = '📋 复制地址';
      btn.style.color = '';
      btn.style.borderColor = '';
    }, 1800);
  }
}

// ══ 万语 ↔ 单一对标 Tron（TRC）地址：系统协议 v1 ══
// 规则：同一万语字符串经规范化后，要么对应当前钱包已绑定的真实 trxAddress（本人收款），
// 要么由确定性算法派生唯一 Tron 地址（全局一致，便于跨客户端解析）。
var WW_SECP256K1_N_HEX = '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';

function wwNormalizeWanYuForTrcBind(s) {
  var t = String(s || '').trim();
  if (!t) return '';
  t = t.replace(/\u00b7/g, '·');
  var hyp = /^(\d{8})-([\s\S]{10})-(\d{8})$/.exec(t);
  if (hyp) return 'H:' + hyp[1] + ':' + hyp[2] + ':' + hyp[3];
  if (t.indexOf('·') >= 0) {
    var p = t.split('·').map(function (x) { return x.trim(); }).filter(Boolean);
    return 'D:' + p.join('|');
  }
  return 'R:' + t;
}

function wwGetOwnWanYuStringForTrcPair() {
  try {
    if (typeof currentLang !== 'undefined' && currentLang === 'en') {
      var snap = localStorage.getItem('wallet_native_addr');
      if (snap && String(snap).indexOf('-') >= 0) return String(snap).trim();
    }
  } catch (_e) {}
  return typeof getNativeAddr === 'function' ? getNativeAddr() : '';
}

function wwDeriveTronBase58FromWanYuNorm(norm) {
  if (!norm || typeof ethers === 'undefined') return '';
  var n = ethers.BigNumber.from(WW_SECP256K1_N_HEX);
  var one = ethers.BigNumber.from(1);
  var i = 0;
  for (i = 0; i < 1024; i++) {
    var msg = 'WorldToken:WanYuOneTrc:v1:' + norm + (i ? ':' + i : '');
    var h = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(msg));
    var bn = ethers.BigNumber.from(h).mod(n.sub(one)).add(one);
    var pkHex = ethers.utils.hexZeroPad(bn.toHexString(), 32);
    try {
      var w = new ethers.Wallet(pkHex);
      var ethHex = w.address;
      if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
        return TronWeb.address.fromHex('41' + ethHex.slice(2));
      }
      return 'T' + ethHex.slice(2, 35);
    } catch (_e2) {
      continue;
    }
  }
  return '';
}

/**
 * 将收款栏输入解析为链上 Tron Base58 地址。
 * - 已是 T 开头合法 Tron 地址：原样返回
 * - 万语：与本人万语一致则返回 REAL_WALLET.trxAddress；否则返回协议派生地址
 */
async function wwResolveWanYuToTronChainAddress(input) {
  var raw = String(input || '').trim();
  if (!raw) return '';
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(raw)) return raw;
  if (typeof wwIsWanYuTransferAddr !== 'function' || !wwIsWanYuTransferAddr(raw)) return '';
  var normIn = wwNormalizeWanYuForTrcBind(raw);
  var own = wwGetOwnWanYuStringForTrcPair();
  if (own && normIn === wwNormalizeWanYuForTrcBind(own)) {
    try {
      if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET && REAL_WALLET.trxAddress) {
        return String(REAL_WALLET.trxAddress).trim();
      }
    } catch (_e) {}
  }
  if (typeof loadTronWeb === 'function') await loadTronWeb();
  return wwDeriveTronBase58FromWanYuNorm(normIn);
}

function wwUpdateTransferPageWanYuTrcHint() {
  var el = document.getElementById('transferWanYuTrcHint');
  var ta = document.getElementById('transferAddr');
  if (!el) return;
  var raw = ta ? String(ta.value || '').trim() : '';
  if (!raw || typeof wwIsWanYuTransferAddr !== 'function' || !wwIsWanYuTransferAddr(raw)) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  el.style.display = 'block';
  el.textContent = '正在解析链上 Tron 地址…';
  if (typeof wwResolveWanYuToTronChainAddress !== 'function') return;
  wwResolveWanYuToTronChainAddress(raw).then(function (t) {
    if (!el.isConnected) return;
    if (!t) {
      el.textContent = typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址';
      return;
    }
    el.textContent = '链上收款（TRC）：' + t.slice(0, 10) + '…' + t.slice(-6);
  }).catch(function () {
    if (el && el.isConnected) el.textContent = typeof WW_MSG_ADDR_WRONG !== 'undefined' ? WW_MSG_ADDR_WRONG : '地址有误，请核对地址';
  });
}
