// wallet.ui.js — UI：导航/Toast/页面/设置/PIN/红包
// 包含全局变量和初始化代码

/*! WorldToken wallet.runtime.js — split from wallet.html; refactor incrementally. */

// Service Worker / Cache 清理由 wallet.runtime.js 在 load 后 idle 执行，避免与首屏抢主线程

document.addEventListener('click', function(ev) {
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyAddrBtn,#homeTransferBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);

var _qrLoadPromise=null;


function updateImportWordCount() {
  const badge = document.getElementById('importWordCountBadge');
  if (!badge) return;
  var max = 12;
  var n = 0;
  try {
    var grid = document.getElementById('importGrid');
    if (grid) {
      var iw = grid.querySelectorAll('input[id^="iw_"]');
      var aw = grid.querySelectorAll('.import-word');
      if (iw.length > 0) {
        max = iw.length;
        iw.forEach(function (inp) {
          if (String(inp.value || '').trim()) n++;
        });
      } else if (aw.length > 0) {
        max = aw.length;
        aw.forEach(function (inp) {
          if (String(inp.value || '').trim()) n++;
        });
      } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
        max = importGridWordCount;
      }
    } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
      max = importGridWordCount;
    }
  } catch (_e) { wwQuiet(_e); }
  badge.textContent = n + '/' + max;
}

function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.add('show');
  
}
function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.remove('show');
  
}

var LANG_INFO = {
  zh:{name:'中文简体',flag:'🇨🇳'},        // 1. 中文简体 ~13亿
  'zh-TW':{name:'中文繁體（台灣）',flag:'🇹🇼'}, // 2a. 繁體中文台灣
  'zh-HK':{name:'中文繁體（香港）',flag:'🇭🇰'}, // 2b. 繁體中文香港
  en:{name:'English',flag:'🇺🇸'},        // 2. 英语 ~15亿
  hi:{name:'हिन्दी',flag:'🇮🇳'},         // 3. 印地 ~6亿
  es:{name:'Español',flag:'🇪🇸'},        // 4. 西班牙 ~5亿
  ar:{name:'العربية',flag:'🇸🇦'},        // 5. 阿拉伯 ~4亿
  pt:{name:'Português',flag:'🇧🇷'},      // 6. 葡萄牙 ~2.5亿
  bn:{name:'বাংলা',flag:'🇧🇩'},          // 7. 孟加拉 ~2.3亿
  ru:{name:'Русский',flag:'🇷🇺'},        // 8. 俄语 ~1.5亿
  ja:{name:'日本語',flag:'🇯🇵'},          // 9. 日语 ~1.2亿
  vi:{name:'Tiếng Việt',flag:'🇻🇳'},    // 10. 越南 ~9500万
  fr:{name:'Français',flag:'🇫🇷'},       // 11. 法语 ~3亿（含非洲）
  id:{name:'Indonesia',flag:'🇮🇩'},      // 12. 印尼 ~2亿
  de:{name:'Deutsch',flag:'🇩🇪'},        // 13. 德语 ~1亿
  ko:{name:'한국어',flag:'🇰🇷'},           // 14. 韩语 ~8000万
  tr:{name:'Türkçe',flag:'🇹🇷'},         // 15. 土耳其 ~8000万
  it:{name:'Italiano',flag:'🇮🇹'},       // 16. 意大利 ~6000万
  th:{name:'ภาษาไทย',flag:'🇹🇭'},        // 17. 泰语 ~6000万
  pl:{name:'Polski',flag:'🇵🇱'},         // 18. 波兰 ~5000万
  nl:{name:'Nederlands',flag:'🇳🇱'},     // 19. 荷兰 ~3000万
  fa:{name:'فارسی',flag:'🇮🇷'},          // 20. 波斯 ~1.1亿
  uk:{name:'Українська',flag:'🇺🇦'},     // 21. 乌克兰 ~4000万
  ms:{name:'Bahasa Melayu',flag:'🇲🇾'}, // 22. 马来 ~3亿
  sv:{name:'Svenska',flag:'🇸🇪'},        // 23. 瑞典 ~1000万
  ro:{name:'Română',flag:'🇷🇴'},         // 24. 罗马尼亚 ~2500万
  el:{name:'Ελληνικά',flag:'🇬🇷'},       // 25. 希腊 ~1300万
  sw:{name:'Kiswahili',flag:'🇰🇪'},      // 26. 斯瓦希里 ~2亿
  ur:{name:'اردو',flag:'🇵🇰'},           // 27. 乌尔都 ~2.3亿
};

/** 与系统语言对齐：navigator.language(s) → LANG_INFO 键，未支持则回退 zh */


// 扩展语言词库（万语地址用）
// ⏱️ 词库懒加载：WW_WORDS_EXTRA 在地址生成时按需访问
var WW_WORDS_EXTRA = {
  zh:['北京','上海','广州','深圳','成都','重庆','杭州','武汉','西安','南京','天津','苏州','长沙','郑州','青岛','沈阳','宁波','东莞','无锡','福州','厦门','哈尔滨','昆明','大连','合肥','济南','温州','南宁','长春','贵阳','佛山','南昌','石家庄','太原','乌鲁木齐','呼和浩特','拉萨','银川','西宁','海口','三亚','兰州','桂林','丽江','大理','张家界','敦煌','吐鲁番','喀什','格尔木','日喀则','林芝','遵义','凯里','兴义','都匀','荔波','镇远','黎平','台州','温岭','临海','玉环','黄岩','椒江','路桥','仙居','天台','三门','丽水','龙泉','云和','庆元','景宁','缙云','遂昌','松阳','青田','宿迁','泗阳','沭阳','泗洪','钟山','六枝','织金','纳雍','赫章','威宁','大方','黔西','金沙','铜仁','碧江','万山','玉屏','松桃','沿河','印江','德江','思南','石阡','江口','榕江','从江','锦屏','天柱','岑巩','三穗','施秉','黄平','剑河','台江','丹寨','雷山','麻江','福泉','贵定','龙里','惠水','长顺','罗甸','平塘','独山','三都','瓮安','余庆','湄潭','凤冈','正安','道真','务川','绥阳','桐梓','习水','赤水','仁怀'],
  en:[]
};

// ── 补充缺失函数定义 ──────────────────────────────────────────


// ── 万语地址系统 ──────────────────────────────────────────
// ADDR_WORDS：由 wallet.runtime.js 统一定义（const），此处不重复声明

// 手机键盘可打出的字符（仅保留真正可输入的字母字符）
var SINGLE_CHARS = {
  zh: '龙凤虎鹤福寿禄喜财春夏秋冬金木水火土山川云月星日风雨雪',
  'zh-TW': '龍鳳虎鶴福壽祿喜財春夏秋冬金木水火土山川雲月星日風雨雪',
  'zh-HK': '龍鳳虎鶴福壽祿喜財春夏秋冬金木水火土山川雲月星日風雨雪',
  ja: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほやゆよアイウエオカキクケコ',
  ko: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ',
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
  ru: 'абвгдежзийклмнопрстуфхцчшщыьэюя',
  hi: 'अआइउएओकखगघचजटडतथदधनपफबभमयरलवशसह',
  th: 'กขคงจชซณดตถทนบปผพฟภมยรลวสหอ',
  vi: 'àáâèéêìíòóôùúýăđơư',
  es: 'áéíóúüñ',
  fr: 'àâçéèêëîïôùûü',
  de: 'äöüÄÖÜ',
  pt: 'áàãâçéêíóõôú',
  it: 'àèéìíòóùú',
  tr: 'çğışöüÇĞİŞÖÜ',
  pl: 'ąćęłńóśźżĄĆĘŁŃÓŚŹŻ',
  uk: 'абвгєжзийіїйклмнопрстуфхцчшщьюя',
  ro: 'âăîșț',
  sv: 'åäöÅÄÖ',
  el: 'αβγδεζηθικλμνξοπρστυφχψω',
  fa: 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی',
  bn: 'অআইউএওকখগঘচজটডতথদধনপবভমযরলশসহ',
  nl: 'abcdefghijklmnopqrstuvwxyz',
};

var EN_HOME_MID_WORDS = ['oak','ash','elm','bay','sky','sea','sun','moon','star','wind','rain','snow','mist','dawn','dusk','hill','vale','lake','stone','gold','jade','ruby','pearl','coral','ivory','amber','ember','flame','frost','cloud','river','meadow','forest','brook','azure','shadow','silver','bronze','cobalt','sable','crimson','violet','indigo','cerulean','scarlet','coral','topaz','garnet','opal','onyx','jade','sage','birch','cedar','pine','willow','maple','acacia','cypress','olive','lotus','orchid','lilac','jasmine','iris','daisy','rose','lily','fern','moss','reed','cliff','cove','peak','ridge','delta','fjord','glade','haven','isle','knoll','marsh','oasis','prairie','reef','savanna','tundra','valley','wave','zenith'];

// getNativeAddr 已统一到下方定义

// ── 真实钱包存储 ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// WorldToken 多语言词库引擎 v2.0
// 每语言 2048 词，索引对应 BIP39，支持双向转换
// ═══════════════════════════════════════════════════════
// WT_WORDLISTS loaded from wordlists.js

/** 词表文件中的 zh 可能含 4 字以上地名；展示侧压缩为「同索引全局唯一」的可辨地名，并保留 WT_ZH_ORIGINAL 供导入旧备份时解析。
 * 注：wordlists.js 的 wwMapEnWordsToLangWords、runtime 的 enWordsToLangKeyTableWords 仅按 BIP39 索引取 WT_WORDLISTS.zh[i]，本身不截断；
 * 若出现「锡林浩」类伪词，来自本函数对长名从短到长取前缀时切断「浩特」等专名；已改为先去行政后缀、再优先取长前缀（3～全长）。 */
var WT_ZH_ORIGINAL = [];

/** 展示用：去掉常见行政区划后缀，便于得到「锡林浩特」而非在「锡林浩特市」上取前三字「锡林浩」。 */
function wwStripZhPlaceSuffixForDisplay(s) {
  var t = String(s || '').trim();
  if (!t) return '';
  var out = t
    .replace(/特别行政区$/, '')
    .replace(/自治区$/, '')
    .replace(/自治州$/, '')
    .replace(/自治县$/, '')
    .replace(/自治旗$/, '')
    .replace(/市辖区$/, '')
    .replace(/林区$/, '')
    .replace(/特区$/, '')
    .replace(/新区$/, '')
    .replace(/市$/, '')
    .replace(/区$/, '')
    .replace(/县$/, '')
    .replace(/旗$/, '')
    .replace(/盟$/, '')
    .replace(/州$/, '')
    .replace(/省$/, '');
  return out || t;
}

function wwNormalizeZhWordlistForDisplay(origArr) {
  if (!origArr || !origArr.length) return origArr ? origArr.slice() : [];
  var si;
  for (si = 0; si < origArr.length; si++) {
    if (Array.from(String(origArr[si] || '')).length > 3) break;
  }
  if (si >= origArr.length) return origArr.slice();

  var nList = origArr.length;
  var used = {};
  var disp = [];
  var i, j, raw, base, arr, n, L, cand, d, hit, guard;
  for (i = 0; i < nList; i++) {
    raw = String(origArr[i] || '');
    arr = Array.from(raw);
    n = arr.length;
    if (n <= 3) {
      used[raw] = true;
      disp.push(raw);
      continue;
    }
    base = wwStripZhPlaceSuffixForDisplay(raw) || raw;
    arr = Array.from(base);
    n = arr.length;
    if (n <= 3) {
      used[base] = true;
      disp.push(base);
      continue;
    }
    var placed = false;
    for (L = n; L >= 3; L--) {
      cand = arr.slice(0, L).join('');
      if (!used[cand]) {
        used[cand] = true;
        disp.push(cand);
        placed = true;
        break;
      }
    }
    if (!placed) disp.push(arr.join(''));
  }
  for (i = 0; i < nList; i++) {
    d = disp[i];
    raw = String(origArr[i] || '');
    base = wwStripZhPlaceSuffixForDisplay(raw) || raw;
    arr = Array.from(base);
    for (guard = 0; guard < 24; guard++) {
      hit = false;
      for (j = 0; j < nList; j++) {
        if (j === i) continue;
        if (String(origArr[j]) === d) {
          hit = true;
          break;
        }
      }
      if (!hit) break;
      L = Array.from(d).length + 1;
      if (L <= arr.length) {
        d = arr.slice(0, L).join('');
        disp[i] = d;
      } else break;
    }
  }
  used = {};
  for (i = 0; i < nList; i++) {
    d = disp[i];
    raw = String(origArr[i] || '');
    base = wwStripZhPlaceSuffixForDisplay(raw) || raw;
    arr = Array.from(base);
    guard = 0;
    while (used[d] && guard++ < 40) {
      L = Array.from(d).length + 1;
      if (L <= arr.length) d = arr.slice(0, L).join('');
      else break;
    }
    used[d] = true;
    disp[i] = d;
  }
  return disp;
}

try {
  if (WT_WORDLISTS && WT_WORDLISTS.zh && WT_WORDLISTS.zh.length === 2048) {
    WT_ZH_ORIGINAL = WT_WORDLISTS.zh.slice();
    WT_WORDLISTS.zh = wwNormalizeZhWordlistForDisplay(WT_ZH_ORIGINAL);
  }
} catch (_zhNorm) { wwQuiet(_zhNorm); }

// 英文词 → 索引（BIP39标准索引）
var EN_WORD_INDEX = {};
WT_WORDLISTS.en.forEach((w, i) => EN_WORD_INDEX[w] = i);

// 各语言词 → 索引
var WT_LANG_INDEX = {};
Object.keys(WT_WORDLISTS).forEach(lang => {
  WT_LANG_INDEX[lang] = {};
  WT_WORDLISTS[lang].forEach((w, i) => WT_LANG_INDEX[lang][w] = i);
});

/** 中文助记词 token → 索引：优先当前展示词，再回退词表文件中的原始长词（兼容旧备份） */
function wwResolveZhWordlistIndex(tok) {
  var t = String(tok || '').trim();
  if (!t) return undefined;
  try {
    if (WT_LANG_INDEX.zh && WT_LANG_INDEX.zh[t] !== undefined) return WT_LANG_INDEX.zh[t];
  } catch (_e0) { wwQuiet(_e0); }
  try {
    if (WT_ZH_ORIGINAL && WT_ZH_ORIGINAL.length) {
      for (var zi = 0; zi < WT_ZH_ORIGINAL.length; zi++) {
        if (String(WT_ZH_ORIGINAL[zi]) === t) return zi;
      }
    }
  } catch (_e1) { wwQuiet(_e1); }
  return undefined;
}
try {
  window.wwResolveZhWordlistIndex = wwResolveZhWordlistIndex;
} catch (_wRZ) { wwQuiet(_wRZ); }

/** 首帧 goTo 后卸下 data-ww-boot-page 与 head 注入样式。须包含「目标与 boot 一致」的情形：仅刷新欢迎页时若 b===dest 旧逻辑会跳过，data-ww-boot-page 永不卸，部分环境（尤其移动端缓存旧 CSS）仍挡点击。 */
function wwClearHtmlBootRouteIfDestChanges(destPageId) {
  try {
    var b = document.documentElement.getAttribute('data-ww-boot-page');
    if (b) {
      document.documentElement.removeAttribute('data-ww-boot-page');
      try {
        document.documentElement.classList.remove('ww-boot-route');
      } catch (_w0) { wwQuiet(_w0); }
    }
    /* 属性已丢但 head 注入 style 仍在时，仍会 pointer-events:none 挡欢迎页；一律卸下 */
    try {
      var _sts = document.querySelectorAll('style[data-ww-boot-route]');
      for (var _si = 0; _si < _sts.length; _si++) {
        var st = _sts[_si];
        if (st && st.parentNode) st.parentNode.removeChild(st);
      }
    } catch (_w1) { wwQuiet(_w1); }
  } catch (_e) { wwQuiet(_e); }
}
try {
  window.wwClearHtmlBootRouteIfDestChanges = wwClearHtmlBootRouteIfDestChanges;
} catch (_wCB) { wwQuiet(_wCB); }

/**
 * 英文助记词 → 目标语言助记词
 * @param {string} mnemonic - 标准BIP39英文助记词
 * @param {string} lang - 目标语言
 * @returns {string} 目标语言助记词（空格分隔）
 */


/** 英文 BIP39 词数组 → 当前语言密钥表词条（词数与上方词数选择一致，逐词映射索引） */


/**
 * 任意语言助记词 → 英文BIP39助记词
 * @param {string} mnemonic - 任意语言助记词
 * @param {string} lang - 输入语言
 * @returns {string} 标准英文助记词
 */


var _safeEl = (id) => document.getElementById(id) || {
  textContent: '', innerHTML: '', value: '0', style: {display:'',cssText:'',color:'',background:'',opacity:'',width:'',transform:''},
  classList: {add:()=>{},remove:()=>{},contains:()=>false},
  href: '', disabled: false,
  addEventListener: ()=>{}, focus: ()=>{}, blur: ()=>{}, remove: ()=>{}
};

var WW_APP_VERSION = '1.0.0';
/** 密钥页词数；新建默认 12，须与 #mnemonicLength、下方网格词数一致（仅内存，不写入 localStorage） */
var currentMnemonicLength = 12;
/** 导入页格子词数（与 #importGrid 一致；勿与密钥页 currentMnemonicLength 混用） */
var importGridWordCount = 12;
/** 首次创建/导入/PIN 引导期间为 true：禁止弹出 Google Authenticator（TOTP）绑定 */
window._wwInFirstRun = false;

// ⚠️ 注意：私钥存储于 localStorage，仅供演示，生产环境应加密
// ── 钱包加密存储模块 ───────────────────────────────────────────

/**
 * 从 PIN 派生 AES-GCM 密钥
 * @param {string} pin - 用户 PIN
 * @param {Uint8Array} salt - 16字节盐
 * @returns {Promise<CryptoKey>}
 */


/**
 * AES-GCM 加密
 * @param {string} plaintext - 明文 JSON 字符串
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{salt:string, iv:string, data:string}>} Base64 编码
 */


/**
 * AES-GCM 解密
 * @param {{salt:string, iv:string, data:string}} bundle - 加密包
 * @param {string} pin - 用户 PIN
 * @returns {Promise<string>} 解密后的明文
 */


/**
 * 保存钱包（敏感数据加密）
 * @param {object} w - 完整钱包对象
 * @param {string} pin - 用户 PIN（无 PIN 则不存敏感数据）
 */


/**
 * 加载钱包（只加载公开信息到 REAL_WALLET）
 */


/**
 * 解密敏感数据（需要时调用，用完清除）
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{mnemonic,enMnemonic,privateKey,trxPrivateKey}|null>}
 */

// ── 旧 saveWallet（保留兼容，内部调用 saveWalletSecure）──


/** 只存公开信息（无 PIN 降级方案） */

var WW_REF_INVITES_KEY = 'ww_ref_invites_v1';

function updateReferralSettingsUI() {
  var linkEl = document.getElementById('settingsRefLink');
  var countEl = document.getElementById('settingsRefCount');
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) {
    if (linkEl) linkEl.textContent = '创建或导入钱包后生成邀请链接';
    if (countEl) countEl.textContent = '—';
    return;
  }
  var code = getMyReferralCode();
  var link = getReferralShareUrl();
  if (linkEl) linkEl.textContent = link.length > 56 ? link.slice(0, 54) + '…' : link;
  if (countEl) countEl.textContent = String(getInviteCountForCode(code));
}
function copyReferralLink() {
  var u = getReferralShareUrl();
  if (!u) { showToast('请先创建或导入钱包', 'info'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(u).then(function() { showToast('邀请链接已复制', 'success'); }).catch(function() { showToast('复制失败', 'error'); });
  } else {
    showToast(u, 'info', 4000);
  }
}
function shareReferralLink() {
  var u = getReferralShareUrl();
  if (!u) { showToast('请先创建或导入钱包', 'info'); return; }
  var title = 'WorldToken 钱包邀请';
  var text = '使用我的链接打开 WorldToken 钱包：';
  if (navigator.share) {
    navigator.share({ title: title, text: text, url: u }).catch(function() { copyReferralLink(); });
  } else {
    copyReferralLink();
  }
}


// 内置 BIP39 词表（前128个，生成演示助记词）
// BIP39 fallback 词表（仅128词，实际创建钱包由 ethers.js 生成完整2048词）
var BIP39_WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake'];

/** BIP39：12/15/18/21/24 词对应 128/160/192/224/256 bit 熵 */


/** 密钥页下拉：与 currentMnemonicLength 同步 */

/** 页面加载时初始化密钥页下拉为 12（不读 REAL_WALLET.enMnemonic 词数；词数不写入 localStorage） */

/** @param {number} [forcedWordCount] 若传入则按该词数生成（避免与 DOM 不同步） */


/** 仅内存 window.TEMP_WALLET：密钥页展示用，不调用 saveWallet / localStorage */

/**
 * 生成密钥页用临时钱包（不写 localStorage、不赋值 REAL_WALLET；验证通过后由流程持久化）。
 * 不同词数或重新调用 = 新熵与新助记词 → 新的一套链上地址；与「仅改万语展示」无关。
 */
async function createWallet(forcedWordCount) {
  if (typeof ethers === 'undefined') {
    throw new Error('钱包库（ethers）未就绪，请检查网络连接后刷新页面重试');
  }
  var nWords = (typeof forcedWordCount === 'number' && [12, 15, 18, 21, 24].includes(forcedWordCount)) ? forcedWordCount : 12;
  var entropyBytes =
    typeof getEntropyByteCountForMnemonicWords === 'function'
      ? getEntropyByteCountForMnemonicWords(nWords)
      : { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 }[nWords] || 16;
  var mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(entropyBytes));
  var wallet = ethers.Wallet.fromMnemonic(mnemonic);
  var trxWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
  var btcWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/0'/0'/0/0");
  var trxAddr = '';
  try {
    if (typeof loadTronWeb === 'function') await loadTronWeb();
    if (typeof TronWeb !== 'undefined' && TronWeb.address && TronWeb.address.fromHex) {
      trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    }
  } catch (_e2) { wwQuiet(_e2); }
  if (!trxAddr && typeof wwTrxBase58FromEthAddressHex === 'function') {
    trxAddr = wwTrxBase58FromEthAddressHex(trxWallet.address);
  }
  return {
    mnemonic: mnemonic,
    enMnemonic: mnemonic,
    words: mnemonic.split(/\s+/).filter(Boolean),
    wordCount: nWords,
    eth: { address: wallet.address, privateKey: wallet.privateKey },
    trx: { address: trxAddr, privateKey: trxWallet.privateKey },
    btc: { address: btcWallet.address, privateKey: btcWallet.privateKey },
    ethAddress: wallet.address,
    trxAddress: trxAddr,
    btcAddress: btcWallet.address,
    privateKey: wallet.privateKey,
    trxPrivateKey: trxWallet.privateKey,
    createdAt: Date.now()
  };
}

/** 密钥页 TEMP 深拷贝（按词数缓存用，避免 render 改写污染缓存） */
function wwCloneTempWalletForKeyPage(w) {
  try {
    return JSON.parse(JSON.stringify(w));
  } catch (e) {
    return w;
  }
}

/** 按词数缓存当前会话已生成过的临时钱包；切回某词数时恢复同一组英文助记词（显示语言仅影响映射） */
function wwPutTempWalletInWordCountCache(w) {
  if (!w || !w.mnemonic) return;
  var n = w.mnemonic.trim().split(/\s+/).filter(Boolean).length;
  if ([12, 15, 18, 21, 24].indexOf(n) < 0) return;
  if (!window._wwTempWalletByWordCount) window._wwTempWalletByWordCount = {};
  window._wwTempWalletByWordCount[n] = wwCloneTempWalletForKeyPage(w);
}

async function createNewWallet() {
  try { window._wwInFirstRun = true; } catch (_fr0) { wwQuiet(_fr0); }
  try {
    window._wwTempWalletByWordCount = {};
  } catch (_c0) { wwQuiet(_c0); }
  showWalletLoading();
  try {
    var w = await createWallet(12);
    window.TEMP_WALLET = w;
    wwPutTempWalletInWordCountCache(w);
    if (typeof goTo === 'function') goTo('page-key', { skipKeyRegen: true });
  } catch (e) {
    if (typeof showToast === 'function')
      showToast(typeof formatWalletCreateError === 'function' ? formatWalletCreateError(e) : wwFmtUserError(e, '创建失败'), 'error');
  } finally {
    hideWalletLoading();
  }
}

// 页面加载时恢复钱包（只恢复数据，不跳转）；captureReferralFromUrl 在 wallet.runtime.js 中定义，须延后到同批脚本执行完
setTimeout(function () {
  try {
    if (typeof captureReferralFromUrl === 'function') captureReferralFromUrl();
  } catch (_cap) { wwQuiet(_cap); }
}, 0);
(function wwDeferInitialLoadWallet() {
  function run() {
    try {
      if (typeof loadWallet === 'function') loadWallet();
    } catch (_lw) { wwQuiet(_lw); }
  }
  if (typeof queueMicrotask === 'function') queueMicrotask(run);
  else setTimeout(run, 0);
})();
try { initMnemonicLengthSelectors(); } catch (_iml) { wwQuiet(_iml); }
try {
  const _txList = document.getElementById('txHistoryList');
  if (_txList && typeof txHistoryEmptyHtml === 'function') _txList.innerHTML = txHistoryEmptyHtml();
} catch (_e) { wwQuiet(_e); }
// 钱包昵称 localStorage（仅本机）
try { if (localStorage.getItem('ww_wallet_nickname') == null) localStorage.setItem('ww_wallet_nickname', ''); } catch (_wn) { wwQuiet(_wn); }


function applyWwTheme() {
  var t = localStorage.getItem('ww_theme') || 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
  var el = document.getElementById('settingsThemeValue');
  if (el) el.textContent = t === 'light' ? '浅色' : '深色';
}

applyWwTheme();
// 页面加载完成（多次固定下拉为 12，晚于部分浏览器的表单/会话恢复）
window.addEventListener('load', () => {
  try { initMnemonicLengthSelectors(); } catch (_iml2) { wwQuiet(_iml2); }
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml4) { wwQuiet(_iml4); }
  }, 0);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml5) { wwQuiet(_iml5); }
  }, 50);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml6) { wwQuiet(_iml6); }
  }, 200);
  if (typeof requestPushPermissionOnFirstLaunch === 'function') requestPushPermissionOnFirstLaunch();
});
window.addEventListener('pageshow', function () {
  try { initMnemonicLengthSelectors(); } catch (_iml3) { wwQuiet(_iml3); }
});
// 强刷：head 已用 data-ww-boot-page + 内联样式锁定首帧目标页时，这里只同步 .active，勿清空全部（否则会先空白再等 goTo）
(function wwBootSyncActiveFromHead() {
  var boot = '';
  try {
    boot = document.documentElement.getAttribute('data-ww-boot-page') || '';
  } catch (_b) { wwQuiet(_b); }
  if (boot) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
      p.style.display = '';
    });
    var t = document.getElementById(boot);
    if (t && t.classList && t.classList.contains('page')) t.classList.add('active');
  }
})();
try {
  var _wwBootKeepHash = false;
  try {
    var _hBoot = (location.hash || '').replace(/^#/, '').trim();
    if (_hBoot.indexOf('?') >= 0) _hBoot = _hBoot.slice(0, _hBoot.indexOf('?'));
    if (_hBoot) {
      try {
        _hBoot = decodeURIComponent(_hBoot);
      } catch (_db) { wwQuiet(_db); }
      var _elBoot = document.getElementById(_hBoot);
      if (_elBoot && _elBoot.classList && _elBoot.classList.contains('page')) _wwBootKeepHash = true;
    }
  } catch (_kb) { wwQuiet(_kb); }
  if (!_wwBootKeepHash) {
    if (typeof history !== 'undefined' && history.replaceState) {
      var _u0 = new URL(location.href);
      _u0.hash = '';
      history.replaceState(null, '', _u0.pathname + _u0.search);
    } else if (location.hash) {
      location.hash = '';
    }
  }
} catch (_rh0) { wwQuiet(_rh0); }

var SAMPLE_KEYS = {
  zh:['北京','东城区','西城区','朝阳区','丰台区','石景山','海淀区','门头沟','房山区','通州区','顺义区','昌平区','大兴区','怀柔区','平谷区','密云区','延庆区','天津','和平区','河东区','河西区','南开区','河北区','红桥区','东丽区','西青区','津南区','北辰区','武清区','宝坻区','宁河区','蓟州区','河北','石家庄','长安区','桥西区','新华区','裕华区','藁城区','鹿泉区','栾城区','井陉县','正定县','行唐县','灵寿县','高邑县','深泽县','赞皇县','无极县','平山县','元氏县','赵县','辛集市','晋州市','新乐市','唐山','路南区','路北区','古冶区','开平区','丰南区','丰润区','滦南县','乐亭县','迁西县','玉田县','遵化市','迁安市','滦州市','秦皇岛','海港区','抚宁区','昌黎县','卢龙县','邯郸','邯山区','丛台区','复兴区','肥乡区','永年区','临漳县','成安县','大名县','涉县','磁县','邱县','鸡泽县','广平县','馆陶县','魏县','曲周县','武安市','邢台','襄都区','信都区','任泽区','南和区','临城县','内丘县','柏乡县','隆尧县','宁晋县','巨鹿县','新河县','广宗县','平乡县','威县','清河县','临西县','南宫市','沙河市','保定','竞秀区','莲池区','满城区','清苑区','徐水区','涞水县','阜平县','定兴县','唐县','高阳县','容城县','涞源县','望都县','安新县','易县','曲阳县','蠡县','顺平县','博野县','雄县','涿州市','定州市','安国市','张家口','桥东区','宣化区','万全区','崇礼区','张北县','康保县','沽源县','尚义县','蔚县','阳原县','怀安县','怀来县','涿鹿县','赤城县','承德','双桥区','双滦区','承德县','兴隆县','滦平县','隆化县','平泉市','沧州','运河区','沧县','青县','东光县','海兴县','盐山县','肃宁县','南皮县','吴桥县','献县','泊头市','任丘市','黄骅市','河间市','廊坊','安次区','广阳区','固安县','永清县','香河县','大城县','文安县','霸州市','三河市','衡水','桃城区','冀州区','枣强县','武邑县','武强县','饶阳县','安平县','故城县','景县','阜城县','深州市','山西','太原','小店区','迎泽区','晋源区','清徐县','阳曲县','娄烦县','古交市','大同','新荣区','平城区','云冈区','云州区','阳高县','天镇县','广灵县','灵丘县','浑源县','左云县','阳泉','城区','矿区','郊区','平定县','盂县','长治','潞州区','上党区','屯留区','潞城区','襄垣县','平顺县','黎城县','壶关县','长子县','武乡县','沁县','沁源县','晋城','沁水县','阳城县','陵川县','泽州县','高平市','朔州','朔城区','平鲁区','山阴县','应县','右玉县','怀仁市','晋中','榆次区','太谷区','榆社县','左权县','和顺县','昔阳县','寿阳县','祁县','平遥县','灵石县','介休市','运城','盐湖区','临猗县','万荣县','闻喜县','稷山县','新绛县','绛县','垣曲县','夏县','平陆县','芮城县','永济市','河津市','忻州','忻府区','定襄县','五台县','代县','繁峙县','宁武县','静乐县','神池县','五寨县','岢岚县','河曲县','保德县','偏关县','原平市','临汾','尧都区','曲沃县','翼城县','襄汾县','洪洞县','古县','安泽县','浮山县','吉县','乡宁县','大宁县','隰县','永和县','蒲县','汾西县','侯马市','霍州市','吕梁','离石区','文水县','交城县','兴县','临县','柳林县','石楼县','岚县','方山县','中阳县','交口县','孝义市','汾阳市','内蒙古','新城区','回民区','玉泉区','赛罕区','武川县','包头','东河区','青山区','石拐区','九原区','固阳县','乌海','海南区','乌达区','赤峰','红山区','松山区','林西县','宁城县','敖汉旗','通辽','开鲁县','库伦旗','奈曼旗','东胜区','杭锦旗','乌审旗','阿荣旗','根河市','临河区','五原县','磴口县','集宁区','卓资县','化德县','商都县','兴和县','凉城县','丰镇市','兴安','突泉县','镶黄旗','正蓝旗','多伦县','阿拉善','辽宁','沈阳','沈河区','大东区','皇姑区','铁西区','浑南区','于洪区','辽中区','康平县','法库县','新民市','大连','中山区','西岗区','金州区','长海县','庄河市','鞍山','铁东区','立山区','千山区','台安县','海城市','抚顺','新抚区','东洲区','望花区','顺城区','抚顺县','本溪','平山区','溪湖区','明山区','南芬区','丹东','元宝区','振兴区','振安区','东港市','凤城市','锦州','古塔区','凌河区','太和区','黑山县','义县','凌海市','北镇市','营口','站前区','西市区','老边区','盖州市','阜新','海州区','新邱区','太平区','细河区','彰武县','辽阳','白塔区','文圣区','宏伟区','辽阳县','灯塔市','盘锦','大洼区','盘山县','铁岭','银州区','清河区','铁岭县','西丰县','昌图县','开原市','朝阳','双塔区','龙城区','朝阳县','建平县','北票市','凌源市','葫芦岛','连山区','龙港区','南票区','绥中县','建昌县','兴城市','吉林','长春','南关区','宽城区','二道区','双阳区','九台区','农安县','榆树市','德惠市','昌邑区','龙潭区','船营区','丰满区','永吉县','蛟河市','桦甸市','舒兰市','磐石市','四平','梨树县','双辽市','辽源','龙山区','西安区','东丰县','东辽县','通化','东昌区','通化县','辉南县','柳河县','集安市','白山','浑江区','江源区','抚松县','靖宇县','临江市','松原','宁江区','长岭县','乾安县','扶余市','白城','洮北区','镇赉县','通榆县','洮南市','大安市','延吉市','图们市','敦化市','珲春市','龙井市','和龙市','汪清县','安图县','黑龙江','哈尔滨','道里区','南岗区','道外区','平房区','松北区','香坊区','呼兰区','阿城区','双城区','依兰县','方正县','宾县','巴彦县','木兰县','通河县','延寿县','尚志市','五常市','龙沙区','建华区','铁锋区','龙江县','依安县','泰来县','甘南县','富裕县','克山县','克东县','拜泉县','讷河市','鸡西','鸡冠区','恒山区','滴道区','梨树区','麻山区','鸡东县','虎林市','密山市','鹤岗','向阳区','工农区','南山区','兴安区','东山区','兴山区','萝北县','绥滨县','双鸭山','尖山区','岭东区','宝山区','集贤县','友谊县','宝清县','饶河县','大庆','龙凤区','红岗区','大同区','肇州县','肇源县','林甸县','伊春','伊美区','乌翠区','友好区','嘉荫县','汤旺县','丰林县','南岔县','金林区','铁力市','佳木斯','前进区','东风区','桦南县','桦川县','汤原县','同江市','富锦市','抚远市','七台河','新兴区','桃山区','勃利县','牡丹江','东安区','阳明区','爱民区','林口县','海林市','宁安市','穆棱市','东宁市','黑河','爱辉区','逊克县','孙吴县','北安市','嫩江市','绥化','北林区','望奎县','兰西县','青冈县','庆安县','明水县','绥棱县','安达市','肇东市','海伦市','漠河市','呼玛县','塔河县','松岭区','新林区','呼中区','上海','黄浦区','徐汇区','长宁区','静安区','普陀区','虹口区','杨浦区','闵行区','宝山','嘉定区','金山区','松江区','青浦区','奉贤区','崇明区','江苏','南京','玄武区','秦淮区','建邺区','鼓楼区','浦口区','栖霞区','江宁区','六合区','溧水区','高淳区','无锡','锡山区','惠山区','滨湖区','梁溪区','新吴区','江阴市','宜兴市','徐州','云龙区','贾汪区','泉山区','铜山区','丰县','沛县','睢宁县','新沂市','邳州市','常州','天宁区','钟楼区','新北区','武进区','金坛区','溧阳市','苏州','虎丘区','吴中区','相城区','姑苏区','吴江区','常熟市','昆山市','太仓市','南通','崇川区','海门区','如东县','启东市','如皋市','海安市','连云港','连云区','赣榆区','东海县','灌云县','灌南县','淮安','淮安区','淮阴区','洪泽区','涟水县','盱眙县','金湖县','盐城','亭湖区','盐都区','大丰区','响水县','滨海县','阜宁县','射阳县','建湖县','东台市','扬州','广陵区','邗江区','江都区','宝应县','仪征市','高邮市','镇江','京口区','润州区','丹徒区','丹阳市','扬中市','句容市','泰州','海陵区','高港区','姜堰区','兴化市','靖江市','泰兴市','宿迁','宿城区','宿豫区','沭阳县','泗阳县','泗洪县','浙江','杭州','上城区','拱墅区','西湖区','滨江区','萧山区','余杭区','富阳区','临安区','临平区','钱塘区','桐庐县','淳安县','建德市','宁波','海曙区','江北区','北仑区','鄞州区','奉化区','象山县','宁海县','余姚市','慈溪市','温州','鹿城区','龙湾区','洞头区','永嘉县','平阳县','苍南县','文成县','泰顺县','瑞安市','乐清市','龙港市','嘉兴','南湖区','秀洲区','嘉善县','海盐县','海宁市','平湖市','桐乡市','湖州','吴兴区','南浔区','德清县','长兴县','安吉县','绍兴','越城区','柯桥区','上虞区','新昌县','诸暨市','嵊州市','金华','婺城区','金东区','武义县','浦江县','磐安县','兰溪市','义乌市','东阳市','永康市','衢州','柯城区','衢江区','常山县','开化县','龙游县','江山市','舟山','岱山县','嵊泗县','台州','椒江区','黄岩区','路桥区','三门县','天台县','仙居县','温岭市','临海市','玉环市','丽水','莲都区','青田县','缙云县','遂昌县','松阳县','云和县','庆元县','龙泉市','安徽','合肥','庐阳区','蜀山区','包河区','长丰县','肥东县','肥西县','庐江县','巢湖市','芜湖','镜湖区','鸠江区','弋江区','湾沚区','繁昌区','南陵县','无为市','蚌埠','蚌山区','禹会区','淮上区','怀远县','五河县','固镇县','淮南','大通区','潘集区','凤台县','寿县','马鞍山','花山区','雨山区','博望区','当涂县','含山县','和县','淮北','杜集区','相山区','烈山区','濉溪县','铜陵','铜官区','义安区','铜陵郊','枞阳县','安庆','迎江区','大观区','宜秀区','怀宁县','太湖县','宿松县','望江县','岳西县','桐城市','潜山市','黄山','屯溪区','黄山区','徽州区','歙县','休宁县','黟县','祁门县','滁州','琅琊区','南谯区','来安县','全椒县','定远县','凤阳县','天长市','明光市','阜阳','颍州区','颍东区','颍泉区','临泉县','太和县','阜南县','颍上县','界首市','宿州','埇桥区','砀山县','萧县','灵璧县','泗县','六安','金安区','裕安区','叶集区','霍邱县','舒城县','金寨县','霍山县','亳州','谯城区','涡阳县','蒙城县','利辛县','池州','贵池区','东至县','石台县','青阳县','宣城','宣州区','郎溪县','泾县','绩溪县','旌德县','宁国市','广德市','福建','福州','台江区','仓山区','马尾区','晋安区','长乐区','闽侯县','连江县','罗源县','闽清县','永泰县','平潭县','福清市','厦门','思明区','海沧区','湖里区','集美区','同安区','翔安区','莆田','城厢区','涵江区','荔城区','秀屿区','仙游县','三明','三元区','沙县区','明溪县','清流县','宁化县','大田县','尤溪县','将乐县','泰宁县','建宁县','永安市','泉州','鲤城区','丰泽区','洛江区','泉港区','惠安县','安溪县','永春县','德化县','金门县','石狮市','晋江市','南安市','漳州','芗城区','龙文区','长泰区','云霄县','漳浦县','诏安县','东山县','南靖县','平和县','华安县','南平','延平区','建阳区','顺昌县','浦城县','光泽县','松溪县','政和县','邵武市','建瓯市','龙岩','新罗区','永定区','长汀县','上杭县','武平县','连城县','漳平市','宁德','蕉城区','霞浦县','古田县','屏南县','寿宁县','周宁县','柘荣县','福安市','福鼎市','江西','南昌','东湖区','新建区','南昌县','安义县','进贤县','景德镇','昌江区','珠山区','浮梁县','乐平市','萍乡','安源区','湘东区','莲花县','上栗县','芦溪县','九江','濂溪区','浔阳区','柴桑区','武宁县','修水县','永修县','德安县','都昌县','湖口县','彭泽县','瑞昌市','庐山市','新余','渝水区','分宜县','鹰潭','月湖区','余江区','贵溪市','赣州','章贡区','南康区','赣县区','信丰县','大余县','上犹县','崇义县','安远县','定南县','全南县','宁都县','于都县','兴国县','会昌县','寻乌县','石城县','瑞金市','龙南市','吉安','吉州区','青原区','吉安县','吉水县','峡江县','新干县','永丰县','泰和县','遂川县','万安县','安福县','永新县','宜春','袁州区','奉新县','万载县','上高县','宜丰县','靖安县','铜鼓县','丰城市','樟树市','高安市','抚州','临川区','东乡区','南城县','黎川县','南丰县','崇仁县','乐安县','宜黄县','金溪县','资溪县','广昌县','上饶','信州区','广丰区','广信区','玉山县','铅山县','横峰县','弋阳县','余干县','鄱阳县','万年县','婺源县','德兴市','山东','济南','历下区','市中区','槐荫区','天桥区','历城区','长清区','章丘区','济阳区','莱芜区','钢城区','平阴县','商河县','青岛','市南区','市北区','黄岛区','崂山区','李沧区','城阳区','即墨区','胶州市','平度市','莱西市','淄博','淄川区','张店区','博山区','临淄区','周村区','桓台县','高青县','沂源县','枣庄','薛城区','峄城区','山亭区','滕州市','东营','东营区','河口区','垦利区','利津县','广饶县','烟台','芝罘区','福山区','牟平区','莱山区','蓬莱区','龙口市','莱阳市','莱州市','招远市','栖霞市','海阳市','潍坊','潍城区','寒亭区','坊子区','奎文区','临朐县','昌乐县','青州市','诸城市','寿光市','安丘市','高密市','昌邑市','济宁','任城区','兖州区','微山县','鱼台县','金乡县','嘉祥县','汶上县','泗水县','梁山县','曲阜市','邹城市','泰安','泰山区','岱岳区','宁阳县','东平县','新泰市','肥城市','威海','环翠区','文登区','荣成市','乳山市','日照','东港区','岚山区','五莲县','莒县','临沂','兰山区','罗庄区','沂南县','郯城县','沂水县','兰陵县','费县','平邑县','莒南县','蒙阴县','临沭县','德州','德城区','陵城区','宁津县','庆云县','临邑县','齐河县','平原县','夏津县','武城县','乐陵市','禹城市','聊城','茌平区','阳谷县','莘县','东阿县','冠县','高唐县','临清市','滨州','滨城区','沾化区','惠民县','阳信县','无棣县','博兴县','邹平市','菏泽','牡丹区','定陶区','曹县','单县','成武县','巨野县','郓城县','鄄城县','东明县','河南','郑州','中原区','二七区','金水区','上街区','惠济区','中牟县','巩义市','荥阳市','新密市','新郑市','登封市','开封','龙亭区','祥符区','杞县','通许县','尉氏县','兰考县','洛阳','老城区','西工区','涧西区','偃师区','孟津区','洛龙区','新安县','栾川县','嵩县','汝阳县','宜阳县','洛宁县','伊川县','平顶山','卫东区','石龙区','湛河区','宝丰县','叶县','鲁山县','郏县','舞钢市','汝州市','安阳','文峰区','北关区','殷都区','龙安区','安阳县','汤阴县','滑县','内黄县','林州市','鹤壁','鹤山区','山城区','淇滨区','浚县','淇县','新乡','红旗区','卫滨区','凤泉区','牧野区','新乡县','获嘉县','原阳县','延津县','封丘县','卫辉市','辉县市','长垣市','焦作','解放区','中站区','马村区','山阳区','修武县','博爱县','武陟县','温县','沁阳市','孟州市','濮阳','华龙区','清丰县','南乐县','范县','台前县','濮阳县','许昌','魏都区','建安区','鄢陵县','襄城县','禹州市','长葛市','漯河','源汇区','郾城区','召陵区','舞阳县','临颍县','三门峡','湖滨区','陕州区','渑池县','卢氏县','义马市','灵宝市','南阳','宛城区','卧龙区','南召县','方城县','西峡县','镇平县','内乡县','淅川县','社旗县','唐河县','新野县','桐柏县','邓州市','商丘','睢阳区','民权县','睢县','宁陵县','柘城县','虞城县','夏邑县','永城市','信阳','浉河区','平桥区','罗山县','光山县','新县','商城县','固始县','潢川县','淮滨县','息县','周口','川汇区','淮阳区','扶沟县','西华县','商水县','沈丘县','郸城县','太康县','鹿邑县','项城市','驻马店','驿城区','西平县','上蔡县','平舆县','正阳县','确山县','泌阳县','汝南县','遂平县','新蔡县','济源市','湖北','武汉','江岸区','江汉区','硚口区','汉阳区','武昌区','洪山区','汉南区','蔡甸区','江夏区','黄陂区','新洲区','黄石','下陆区','铁山区','阳新县','大冶市','十堰','茅箭区','张湾区','郧阳区','郧西县','竹山县','竹溪县','房县','宜昌','西陵区','点军区','猇亭区','夷陵区','远安县','兴山县','秭归县','宜都市','当阳市','枝江市','襄阳','襄城区','樊城区','襄州区','南漳县','谷城县','保康县','枣阳市','宜城市','鄂州','华容区','鄂城区','荆门','东宝区','掇刀区','沙洋县','钟祥市','京山市','孝感','孝南区','孝昌县','大悟县','云梦县','应城市','安陆市','汉川市','荆州','沙市区','荆州区','公安县','江陵县','石首市','洪湖市','松滋市','监利市','黄冈','黄州区','团风县','红安县','罗田县','英山县','浠水县','蕲春县','黄梅县','麻城市','武穴市','咸宁','咸安区','嘉鱼县','通城县','崇阳县','通山县','赤壁市','随州','曾都区','随县','广水市','恩施市','利川市','建始县','巴东县','宣恩县','咸丰县','来凤县','鹤峰县','仙桃市','潜江市','天门市','湖南','长沙','芙蓉区','天心区','岳麓区','开福区','雨花区','望城区','长沙县','浏阳市','宁乡市','株洲','荷塘区','芦淞区','石峰区','天元区','渌口区','攸县','茶陵县','炎陵县','醴陵市','湘潭','雨湖区','岳塘区','湘潭县','湘乡市','韶山市','衡阳','珠晖区','雁峰区','石鼓区','蒸湘区','南岳区','衡阳县','衡南县','衡山县','衡东县','祁东县','耒阳市','常宁市','邵阳','双清区','大祥区','北塔区','新邵县','邵阳县','隆回县','洞口县','绥宁县','新宁县','武冈市','邵东市','岳阳','云溪区','君山区','岳阳县','华容县','湘阴县','平江县','汨罗市','临湘市','常德','武陵区','鼎城区','安乡县','汉寿县','澧县','临澧县','桃源县','石门县','津市市','张家界','慈利县','桑植县','益阳','资阳区','赫山区','南县','桃江县','安化县','沅江市','郴州','北湖区','苏仙区','桂阳县','宜章县','永兴县','嘉禾县','临武县','汝城县','桂东县','安仁县','资兴市','永州','零陵区','东安县','双牌县','道县','江永县','宁远县','蓝山县','新田县','祁阳市','怀化','鹤城区','中方县','沅陵县','辰溪县','溆浦县','会同县','洪江市','娄底','娄星区','双峰县','新化县','涟源市','吉首市','泸溪县','凤凰县','花垣县','保靖县','古丈县','永顺县','龙山县','广东','广州','荔湾区','越秀区','海珠区','天河区','白云区','黄埔区','番禺区','花都区','南沙区','从化区','增城区','韶关','武江区','浈江区','曲江区','始兴县','仁化县','翁源县','新丰县','乐昌市','南雄市','深圳','罗湖区','福田区','宝安区','龙岗区','盐田区','龙华区','坪山区','光明区','珠海','香洲区','斗门区','金湾区','汕头','龙湖区','金平区','濠江区','潮阳区','潮南区','南澳县','佛山','禅城区','顺德区','三水区','高明区','江门','蓬江区','新会区','台山市','开平市','鹤山市','恩平市','湛江','赤坎区','霞山区','坡头区','麻章区','遂溪县','徐闻县','廉江市','雷州市','吴川市','茂名','茂南区','电白区','高州市','化州市','信宜市','肇庆','端州区','鼎湖区','高要区','广宁县','怀集县','封开县','德庆县','四会市','惠州','惠城区','惠阳区','博罗县','惠东县','龙门县','梅州','梅江区','梅县区','大埔县','丰顺县','五华县','平远县','蕉岭县','兴宁市','汕尾','海丰县','陆河县','陆丰市','河源','源城区','紫金县','龙川县','连平县','和平县','东源县','阳江','江城区','阳东区','阳西县','阳春市','清远','清城区','佛冈县','阳山县','英德市','连州市','东莞','东莞市','中山','中山市','潮州','湘桥区','潮安区','饶平县','揭阳','榕城区','揭东区','揭西县','惠来县','普宁市','云浮','云城区','云安区','新兴县','郁南县','罗定市','广西','南宁','兴宁区','青秀区','江南区','良庆区','邕宁区','武鸣区','隆安县','马山县','上林县','宾阳县','横州市','柳州','城中区','鱼峰区','柳南区','柳北区','柳江区','柳城县','鹿寨县','融安县','桂林','秀峰区','叠彩区','象山区','七星区','雁山区','临桂区','阳朔县','灵川县','全州县','兴安县','永福县','灌阳县','资源县','平乐县','荔浦市','梧州','万秀区','长洲区','龙圩区','苍梧县','藤县','蒙山县','岑溪市','北海','海城区','合浦县','防城港','港口区','防城区','上思县','东兴市','钦州','钦南区','钦北区','灵山县','浦北县','贵港','港北区','港南区','覃塘区','平南县','桂平市','玉林','玉州区','福绵区','容县','陆川县','博白县','兴业县','北流市','百色','右江区','田阳区','田东县','德保县','那坡县','凌云县','乐业县','田林县','西林县','靖西市','平果市','贺州','八步区','平桂区','昭平县','钟山县','河池','宜州区','南丹县','天峨县','凤山县','东兰县','来宾','兴宾区','忻城县','象州县','武宣县','合山市','崇左','江州区','扶绥县','宁明县','龙州县','大新县','天等县','凭祥市','海南','海口','秀英区','琼山区','美兰区','三亚','海棠区','吉阳区','天涯区','崖州区','三沙','儋州','儋州市','琼海市','文昌市','万宁市','东方市','定安县','屯昌县','澄迈县','临高县','重庆','万州区','涪陵区','渝中区','大渡口','江北','沙坪坝','九龙坡','南岸区','北碚区','綦江区','大足区','渝北区','巴南区','黔江区','长寿区','江津区','合川区','永川区','南川区','璧山区','铜梁区','潼南区','荣昌区','开州区','梁平区','武隆区','城口县','丰都县','垫江县','忠县','云阳县','奉节县','巫山县','巫溪县','四川','成都','锦江区','青羊区','金牛区','武侯区','成华区','新都区','温江区','双流区','郫都区','新津区','金堂县','大邑县','蒲江县','彭州市','邛崃市','崇州市','简阳市','自贡','贡井区','大安区','沿滩区','荣县','富顺县','攀枝花','东区','西区','仁和区','米易县','盐边县','泸州','江阳区','纳溪区','泸县','合江县'],
  en:['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','affair','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armed','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward','axis','baby','bachelor','bacon','badge','bag','balance','balcony','ball','bamboo','banana','banner','bar','barely','bargain','barrel','base','basic','basket','battle','beach','bean','beauty','because','become','beef','before','begin','behave','behind','believe','below','belt','bench','benefit','best','betray','better','between','beyond','bicycle','bid','bike','bind','biology','bird','birth','bitter','black','blade','blame','blanket','blast','bleak','bless','blind','blood','blossom','blouse','blue','blur','blush','board','boat','body','boil','bomb','bone','bonus','book','boost','border','boring','borrow','boss','bottom','bounce','box','boy','bracket','brain','brand','brass','brave','bread','breeze','brick','bridge','brief','bright','bring','brisk','broccoli','broken','bronze','broom','brother','brown','brush','bubble','buddy','budget','buffalo','build','bulb','bulk','bullet','bundle','bunker','burden','burger','burst','bus','business','busy','butter','buyer','buzz','cabbage','cabin','cable','cactus','cage','cake','call','calm','camera','camp','can','canal','cancel','candy','cannon','canoe','canvas','canyon','capable','capital','captain','car','carbon','card','cargo','carpet','carry','cart','case','cash','casino','castle','casual','cat','catalog','catch','category','cattle','caught','cause','caution','cave','ceiling','celery','cement','census','century','cereal','certain','chair','chalk','champion','change','chaos','chapter','charge','chase','chat','cheap','check','cheese','chef','cherry','chest','chicken','chief','child','chimney','choice','choose','chronic','chuckle','chunk','churn','cigar','cinnamon','circle','citizen','city','civil','claim','clap','clarify','claw','clay','clean','clerk','clever','click','client','cliff','climb','clinic','clip','clock','clog','close','cloth','cloud','clown','club','clump','cluster','clutch','coach','coast','coconut','code','coffee','coil','coin','collect','color','column','combine','come','comfort','comic','common','company','concert','conduct','confirm','congress','connect','consider','control','convince','cook','cool','copper','copy','coral','core','corn','correct','cost','cotton','couch','country','couple','course','cousin','cover','coyote','crack','cradle','craft','cram','crane','crash','crater','crawl','crazy','cream','credit','creek','crew','cricket','crime','crisp','critic','crop','cross','crouch','crowd','crucial','cruel','cruise','crumble','crunch','crush','cry','crystal','cube','culture','cup','cupboard','curious','current','curtain','curve','cushion','custom','cute','cycle','dad','damage','damp','dance','danger','daring','dash','daughter','dawn','day','deal','debate','debris','decade','december','decide','decline','decorate','decrease','deer','defense','define','defy','degree','delay','deliver','demand','demise','denial','dentist','deny','depart','depend','deposit','depth','deputy','derive','describe','desert','design','desk','despair','destroy','detail','detect','develop','device','devote','diagram','dial','diamond','diary','dice','diesel','diet','differ','digital','dignity','dilemma','dinner','dinosaur','direct','dirt','disagree','discover','disease','dish','dismiss','disorder','display','distance','divert','divide','divorce','dizzy','doctor','document','dog','doll','dolphin','domain','donate','donkey','donor','door','dose','double','dove','draft','dragon','drama','drastic','draw','dream','dress','drift','drill','drink','drip','drive','drop','drum','dry','duck','dumb','dune','during','dust','dutch','duty','dwarf','dynamic','eager','eagle','early','earn','earth','easily','east','easy','echo','ecology','economy','edge','edit','educate','effort','egg','eight','either','elbow','elder','electric','elegant','element','elephant','elevator','elite','else','embark','embody','embrace','emerge','emotion','employ','empower','empty','enable','enact','end','endless','endorse','enemy','energy','enforce','engage','engine','enhance','enjoy','enlist','enough','enrich','enroll','ensure','enter','entire','entry','envelope','episode','equal','equip','era','erase','erode','erosion','error','erupt','escape','essay','essence','estate','eternal','ethics','evidence','evil','evoke','evolve','exact','example','excess','exchange','excite','exclude','excuse','execute','exercise','exhaust','exhibit','exile','exist','exit','exotic','expand','expect','expire','explain','expose','express','extend','extra','eye','eyebrow','fabric','face','faculty','fade','faint','faith','fall','false','fame','family','famous','fan','fancy','fantasy','farm','fashion','fat','fatal','father','fatigue','fault','favorite','feature','february','federal','fee','feed','feel','female','fence','festival','fetch','fever','few','fiber','fiction','field','figure','file','film','filter','final','find','fine','finger','finish','fire','firm','first','fiscal','fish','fit','fitness','fix','flag','flame','flash','flat','flavor','flee','flight','flip','float','flock','floor','flower','fluid','flush','fly','foam','focus','fog','foil','fold','follow','food','foot','force','forest','forget','fork','fortune','forum','forward','fossil','foster','found','fox','fragile','frame','frequent','fresh','friend','fringe','frog','front','frost','frown','frozen','fruit','fuel','fun','funny','furnace','fury','future','gadget','gain','galaxy','gallery','game','gap','garage','garbage','garden','garlic','garment','gas','gasp','gate','gather','gauge','gaze','general','genius','genre','gentle','genuine','gesture','ghost','giant','gift','giggle','ginger','giraffe','girl','give','glad','glance','glare','glass','glide','glimpse','globe','gloom','glory','glove','glow','glue','goat','goddess','gold','good','goose','gorilla','gospel','gossip','govern','gown','grab','grace','grain','grant','grape','grass','gravity','great','green','grid','grief','grit','grocery','group','grow','grunt','guard','guess','guide','guilt','guitar','gun','gym','habit','hair','half','hammer','hamster','hand','happy','harbor','hard','harsh','harvest','hat','have','hawk','hazard','head','health','heart','heavy','hedgehog','height','hello','helmet','help','hen','hero','hidden','high','hill','hint','hip','hire','history','hobby','hockey','hold','hole','holiday','hollow','home','honey','hood','hope','horn','horror','horse','hospital','host','hotel','hour','hover','hub','huge','human','humble','humor','hundred','hungry','hunt','hurdle','hurry','hurt','husband','hybrid','ice','icon','idea','identify','idle','ignore','ill','illegal','illness','image','imitate','immense','immune','impact','impose','improve','impulse','inch','include','income','increase','index','indicate','indoor','industry','infant','inflict','inform','inhale','inherit','initial','inject','injury','inmate','inner','innocent','input','inquiry','insane','insect','inside','inspire','install','intact','interest','into','invest','invite','involve','iron','island','isolate','issue','item','ivory','jacket','jaguar','jar','jazz','jealous','jeans','jelly','jewel','job','join','joke','journey','joy','judge','juice','jump','jungle','junior','junk','just','kangaroo','keen','keep','ketchup','key','kick','kid','kidney','kind','kingdom','kiss','kit','kitchen','kite','kitten','kiwi','knee','knife','knock','know','lab','label','labor','ladder','lady','lake','lamp','language','laptop','large','later','latin','laugh','laundry','lava','law','lawn','lawsuit','layer','lazy','leader','leaf','learn','leave','lecture','left','leg','legal','legend','leisure','lemon','lend','length','lens','leopard','lesson','letter','level','liar','liberty','library','license','life','lift','light','like','limb','limit','link','lion','liquid','list','little','live','lizard','load','loan','lobster','local','lock','logic','lonely','long','loop','lottery','loud','lounge','love','loyal','lucky','luggage','lumber','lunar','lunch','luxury','lyrics','machine','mad','magic','magnet','maid','mail','main','major','make','mammal','man','manage','mandate','mango','mansion','manual','maple','marble','march','margin','marine','market','marriage','mask','mass','master','match','material','math','matrix','matter','maximum','maze','meadow','mean','measure','meat','mechanic','medal','media','melody','melt','member','memory','mention','menu','mercy','merge','merit','merry','mesh','message','metal','method','middle','midnight','milk','million','mimic','mind','minimum','minor','minute','miracle','mirror','misery','miss','mistake','mix','mixed','mixture','mobile','model','modify','mom','moment','monitor','monkey','monster','month','moon','moral','more','morning','mosquito','mother','motion','motor','mountain','mouse','move','movie','much','muffin','mule','multiply','muscle','museum','mushroom','music','must','mutual','myself','mystery','myth','naive','name','napkin','narrow','nasty','nation','nature','near','neck','need','negative','neglect','neither','nephew','nerve','nest','net','network','neutral','never','news','next','nice','night','noble','noise','nominee','noodle','normal','north','nose','notable','note','nothing','notice','novel','now','nuclear','number','nurse','nut','oak','obey','object','oblige','obscure','observe','obtain','obvious','occur','ocean','october','odor','off','offer','office','often','oil','okay','old','olive','olympic','omit','once','one','onion','online','only','open','opera','opinion','oppose','option','orange','orbit','orchard','order','ordinary','organ','orient','original','orphan','ostrich','other','outdoor','outer','output','outside','oval','oven','over','own','owner','oxygen','oyster','ozone','pact','paddle','page','pair','palace','palm','panda','panel','panic','panther','paper','parade','parent','park','parrot','party','pass','patch','path','patient','patrol','pattern','pause','pave','payment','peace','peanut','pear','peasant','pelican','pen','penalty','pencil','people','pepper','perfect','permit','person','pet','phone','photo','phrase','physical','piano','picnic','picture','piece','pig','pigeon','pill','pilot','pink','pioneer','pipe','pistol','pitch','pizza','place','planet','plastic','plate','play','please','pledge','pluck','plug','plunge','poem','poet','point','polar','pole','police','pond','pony','pool','popular','portion','position','possible','post','potato','pottery','poverty','powder','power','practice','praise','predict','prefer','prepare','present','pretty','prevent','price','pride','primary','print','priority','prison','private','prize','problem','process','produce','profit','program','project','promote','proof','property','prosper','protect','proud','provide','public','pudding','pull','pulp','pulse','pumpkin','punch','pupil','puppy','purchase','purity','purpose','purse','push','put','puzzle','pyramid','quality','quantum','quarter','question','quick','quit','quiz','quote','rabbit','raccoon','race','rack','radar','radio','rail','rain','raise','rally','ramp','ranch','random','range','rapid','rare','rate','rather','raven','raw','razor','ready','real','reason','rebel','rebuild','recall','receive','recipe','record','recycle','reduce','reflect','reform','refuse','region','regret','regular','reject','relax','release','relief','rely','remain','remember','remind','remove','render','renew','rent','reopen','repair','repeat','replace','report','require','rescue','resemble','resist','resource','response','result','retire','retreat','return','reunion','reveal','review','reward','rhythm','rib','ribbon','rice','rich','ride','ridge','rifle','right','rigid','ring','riot','ripple','risk','ritual','rival','river','road','roast','robot','robust','rocket','romance','roof','rookie','room','rose','rotate','rough','round','route','royal','rubber','rude','rug','rule','run','runway','rural','sad','saddle','sadness','safe','sail','salad','salmon','salon','salt','salute','same','sample','sand','satisfy','satoshi','sauce','sausage','save','say','scale','scan','scare','scatter','scene','scheme','school','science','scissors','scorpion','scout','scrap','screen','script','scrub','sea','search','season','seat','second','secret','section','security','seed','seek','segment','select','sell','seminar','senior','sense','sentence','series','service','session','settle','setup','seven','shadow','shaft','shallow','share','shed','shell','sheriff','shield','shift','shine','ship','shiver','shock','shoe','shoot','shop','short','shoulder','shove','shrimp','shrug','shuffle','shy','sibling','sick','side','siege','sight','sign','silent','silk','silly','silver','similar','simple','since','sing','siren','sister','situate','six','size','skate','sketch','ski','skill','skin','skirt','skull','slab','slam','sleep','slender','slice','slide','slight','slim','slogan','slot','slow','slush','small','smart','smile','smoke','smooth','snack','snake','snap','sniff','snow','soap','soccer','social','sock','soda','soft','solar','soldier','solid','solution','solve','someone','song','soon','sorry','sort','soul','sound','soup','source','south','space','spare','spatial','spawn','speak','special','speed','spell','spend','sphere','spice','spider','spike','spin','spirit','split','spoil','sponsor','spoon','sport','spot','spray','spread','spring','spy','square','squeeze','squirrel','stable','stadium','staff','stage','stairs','stamp','stand','start','state','stay','steak','steel','stem','step','stereo','stick','still','sting','stock','stomach','stone','stool','story','stove','strategy','street','strike','strong','struggle','student','stuff','stumble','style','subject','submit','subway','success','such','sudden','suffer','sugar','suggest','suit','summer','sun','sunny','sunset','super','supply','supreme','sure','surface','surge','surprise','surround','survey','suspect','sustain','swallow','swamp','swap','swarm','swear','sweet','swift','swim','swing','switch','sword','symbol','symptom','syrup','system','table','tackle','tag','tail','talent','talk','tank','tape','target','task','taste','tattoo','taxi','teach','team','tell','ten','tenant','tennis','tent','term','test','text','thank','that','theme','then','theory','there','they','thing','this','thought','three','thrive','throw','thumb','thunder','ticket','tide','tiger','tilt','timber','time','tiny','tip','tired','tissue','title','toast','tobacco','today','toddler','toe','together','toilet','token','tomato','tomorrow','tone','tongue','tonight','tool','tooth','top','topic','topple','torch','tornado','tortoise','toss','total','tourist','toward','tower','town','toy','track','trade','traffic','tragic','train','transfer','trap','trash','travel','tray','treat','tree','trend','trial','tribe','trick','trigger','trim','trip','trophy','trouble','truck','true','truly','trumpet','trust','truth','try','tube','tuition','tumble','tuna','tunnel','turkey','turn','turtle','twelve','twenty','twice','twin','twist','two','type','typical','ugly','umbrella','unable','unaware','uncle','uncover','under','undo','unfair','unfold','unhappy','uniform','unique','unit','universe','unknown','unlock','until','unusual','unveil','update','upgrade','uphold','upon','upper','upset','urban','urge','usage','use','used','useful','useless','usual','utility','vacant','vacuum','vague','valid','valley','valve','van','vanish','vapor','various','vast','vault','vehicle','velvet','vendor','venture','venue','verb','verify','version','very','vessel','veteran','viable','vibrant','vicious','victory','video','view','village','vintage','violin','virtual','virus','visa','visit','visual','vital','vivid','vocal','voice','void','volcano','volume','vote','voyage','wage','wagon','wait','walk','wall','walnut','want','warfare','warm','warrior','wash','wasp','waste','water','wave','way','wealth','weapon','wear','weasel','weather','web','wedding','weekend','weird','welcome','west','wet','whale','what','wheat','wheel','when','where','whip','whisper','wide','width','wife','wild','will','win','window','wine','wing','wink','winner','winter','wire','wisdom','wise','wish','witness','wolf','woman','wonder','wood','wool','word','work','world','worry','worth','wrap','wreck','wrestle','wrist','write','wrong','yard','year','yellow','you','young','youth','zebra','zero','zone','zoo'],
  ja:['大和','山城','摂津','河内','和泉','伊賀','伊勢','志摩','尾張','三河','遠江','駿河','伊豆','甲斐','相模','武蔵','安房','上総','下総','常陸','近江','美濃','飛騨','信濃','上野','下野','陸奥','出羽','若狭','越前','加賀','能登','越中','越後','佐渡','丹波','丹後','但馬','因幡','伯耆','出雲','石見','隠岐','播磨','美作','備前','備中','備後','安芸','周防','長門','紀伊','淡路','阿波','讃岐','伊予','土佐','筑前','筑後','豊前','豊後','肥前','肥後','日向','大隅','薩摩','壱岐','対馬','琉球','沖縄','北海','青森','岩手','宮城','秋田','山形','福島','茨城','栃木','群馬','埼玉','千葉','東京','神奈','新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知','三重','滋賀','京都','大阪','兵庫','奈良','和歌','鳥取','島根','岡山','広島','山口','徳島','香川','愛媛','高知','福岡','佐賀','長崎','熊本','大分','宮崎','鹿児','札幌','函館','旭川','釧路','帯広','北見','小樽','苫小牧','弘前','八戸','盛岡','仙台','石巻','鶴岡','酒田','郡山','会津','水戸','宇都宮','前橋','高崎','川越','熊谷','船橋','横浜','川崎','鎌倉','小田原','長岡','上越','金沢','甲府','松本','上田','諏訪','大垣','高山','浜松','沼津','熱海','三島','名古屋','豊橋','岡崎','一宮','津','四日市','大津','彦根','長浜','宇治','堺','神戸','姫路','和歌山','松江','倉敷','呉','尾道','福山','下関','宇部','萩','高松','松山','北九州','久留米','佐世保','別府','鹿児島','那覇','石垣','宮古','松島','天橋','竹生','宮島','錦帯','白川','兼六','偕楽','後楽','六義','伏見','嵐山','金閣','銀閣','清水','東寺','西寺','北野','祇園','先斗','浅草','日光','箱根','草津','有馬','城崎','湯布','白浜','勝浦','鳥羽','二見','高野','吉野','飛鳥','法隆','平泉','中尊','毛越','厳島','三徳','由布','阿蘇','霧島','桜島','首里','玉泉','斎場','古宇','十和田','田沢','奥入瀬','八甲','蔵王','磐梯','猪苗','尾瀬','奥日光','戦場','富士','天城','屋久','奄美','西表','北岳','奥穂','槍岳','立山','白山','御岳','霊山','岩木','早池','鳥海','月山','飯豊','吾妻','安達','那須','赤城','榛名','妙義','浅間','八ヶ岳','木曽','白馬','剱岳','鹿島','乗鞍','焼岳','御嶽','伊吹','比叡','金剛','大台','大峰','剣山','石鎚','九重','雲仙','普賢','開聞','韓国','宮之浦','口永','利根','荒川','多摩','富士川','天竜','木曽川','長良','揖斐','淀川','大和川','紀の川','吉野川','那賀','四万十','仁淀','物部','菊池','球磨','大淀','天塩','石狩','十勝','網走','北上','最上','阿武隈','久慈','馬淵','琵琶','霞ヶ浦','中禅寺','芦ノ湖','摩周','屈斜路','江戸','大坂','名護','丸亀','宇和','今治','宇和島','大洲','吉田','岩国','津山','米子','浜田','津和野','赤穂','明石','篠山','二条','竹田','新宮','亀山','松坂','清洲','犬山','岩村','苗木','掛川','駿府','韮山','下田','忍','鉢形','益子','笠間','土浦','白石','米沢','新庄','久保田','桜花','梅林','藤棚','菊野','蓮池','牡丹','芍薬','薔薇','芙蓉','椿花','水仙','百合','桔梗','萩野','薄野','菖蒲','紫陽','紅梅','白梅','枝垂','山吹','木蓮','辛夷','雪柳','花桃','桐花','藤花','杜若','花菖','花蓮','鶴舞','鷹飛','鷺立','鴨川','燕尾','雀声','鶯鳴','杜鵑','時鳥','雁行','白鳥','丹頂','青鷺','夜鷺','翡翠','孔雀','鸚鵡','九官','百舌','郭公','春風','夏風','秋風','冬風','海風','山風','松風','竹風','花風','雪風','朝風','夕風','夜風','嵐気','颱風','満月','新月','三日月','弦月','月光','月夜','月影','月明','月雫','月虹','春霞','夏雲','秋霜','冬雪','朝露','夕霞','夜霧','虹空','雷鳴','稲妻','瀧水','清流','深淵','磯波','岩礁','断崖','峰雲','谷間','野原','草原','田園','水田','棚田','段畑','松原','竹林','杉林','桜並','欅並','楠木','樫木','桐木','楓葉','銀杏','朱赤','緋色','桃色','紅色','深紅','橙色','黄金','萌黄','若草','翠緑','常磐','深緑','青磁','瑠璃','群青','藍色','紺碧','青紫','薄紫','藤色','菫色','葡萄','白磁','乳白','胡粉','象牙','白練','灰色','銀鼠','鉛色','鼠色','墨色','漆黒','烏羽','黒檀','鉄黒','墨黒','金色','黄朽','蒸栗','枯草','茶色','弁柄','朽葉','錆色','檜皮','睦月','如月','弥生','卯月','皐月','水無月','文月','葉月','長月','神無月','霜月','師走','春分','夏至','秋分','冬至','立春','立夏','立秋','立冬','大寒','小寒','大雪','小雪','霜降','寒露','白露','処暑','大暑','小暑','芒種','小満','穀雨','清明','啓蟄','雨水','朝霧','夕暮','黄昏','夜明','暁闇','正午','真夜','深夜','未明','払暁','一番','二番','三番','四番','五番','六番','七番','八番','九番','十番','百年','千年','万年','一里','千里','東西','南北','中央','上下','左右','前後','内外','表裏','陰陽','虚実','能楽','狂言','歌舞','文楽','雅楽','茶道','花道','香道','武道','柔道','剣道','弓道','相撲','空手','合気','俳句','短歌','連歌','物語','源氏','平家','義経','頼朝','信長','秀吉','家康','光秀','謙信','信玄','道元','親鸞','法然','空海','最澄','芭蕉','西鶴','近松','蕪村','一茶','北斎','広重','応挙','若冲','宗達','春日','住吉','熊野','三嶋','大山','香取','氷川','日枝','八坂','平安','上賀茂','下鴨','石清水','松尾','大原','三千院','寂光','化野','愛宕','高雄','神護','栂尾','槇尾','鞍馬','貴船','八瀬','延暦','三井','石山','長命','義仲','園城','四天王','唐招','東大','興福','元興','大安','西大','薬師','中宮','法起','法輪','達磨','長谷','室生','談山','岡寺','壺阪','橘寺','当麻','葛城','金峯','寿司','天麩','蕎麦','鍋物','懐石','会席','精進','本膳','茶懐石','卓袱','抹茶','煎茶','玄米','番茶','焙茶','日本','吟醸','純米','本醸','焼酎','梅酒','甘酒','味醂','醤油','味噌','和菓','羊羹','最中','落雁','煎餅','饅頭','大福','桜餅','柏餅','粽子','日本海','太平洋','瀬戸内','玄界','遠州','有明','八代','不知火','五島','天草','種子','口之島','中之島','悪石','徳之島','沖永良部','与論','竹富','与那国','久米','慶良間','渡嘉敷','座間味','阿嘉','渡名喜','伊是名','伊平屋','伊江','水納','瀬底','浦安','舞浜','幕張','柏','松戸','市川','習志野','八千代','四街道','佐倉','成田','銚子','旭','匝瑳','横芝','山武','東金','大網','茂原','君津','木更津','袖ヶ浦','富津','鋸南','南房','館山','長南','睦沢','長柄','白子','長生','大多喜','いすみ','夷隅','御宿','東庄','神崎','多古','芝山','酒々井','八街','印西','白井','富里','栄町','取手','守谷','稲敷','かすみがうら','石岡','小美玉','鉾田','行方','潮来','神栖','鹿嶋','坂東','常総','下妻','筑西','桜川','結城','古河','境','五霞','幸手','久喜','加須','羽生','行田','鴻巣','北本','桶川','伊奈','上尾','蕨','戸田','川口','越谷','草加','八潮','三郷','吉川','松伏','春日部','宮代','杉戸','白岡','蓮田','岩槻','さいたま','朝霞','志木','和光','新座','清瀬','東久留米','西東京','武蔵野','三鷹','調布','府中','国立','国分寺','小平','東村山','武蔵村山','東大和','立川','日野','八王子','町田','相模原','座間','綾瀬','海老名','厚木','愛川','清川','伊勢原','秦野','松田','山北','開成','大磯','二宮','中井','湯河原','真鶴','葉山','逗子','東山','東川','東野','東浜','東島','東港','東坂','東谷','東峠','東橋','東池','東沼','東原','東浦','東崎','西山','西川','西野','西浜','西島','西港','西坂','西谷','西峠','西橋','西池','西沼','西原','西浦','西崎','南山','南川','南野','南浜','南島','南港','南坂','南谷','南峠','南橋','南池','南沼','南原','南浦','南崎','北山','北川','北浜','北島','北港','北坂','北谷','北峠','北橋','北池','北沼','北原','北浦','北崎','上山','上川','上浜','上島','上港','上坂','上谷','上峠','上橋','上池','上沼','上原','上浦','上崎','下山','下川','下浜','下島','下港','下坂','下谷','下峠','下橋','下池','下沼','下原','下浦','下崎','新山','新川','新野','新浜','新島','新港','新坂','新谷','新峠','新橋','新池','新沼','新原','新浦','新崎','古山','古川','古野','古浜','古島','古港','古坂','古谷','古峠','古橋','古池','古沼','古原','古浦','古崎','大川','大野','大浜','大島','大港','大谷','大峠','大橋','大池','大沼','大浦','大崎','小山','小川','小野','小浜','小島','小港','小坂','小谷','小峠','小橋','小池','小沼','小原','小浦','小崎','中山','中川','中野','中浜','中島','中港','中坂','中谷','中峠','中橋','中池','中沼','中原','中浦','中崎','内山','内川','内野','内浜','内島','内港','内坂','内谷','内峠','内橋','内池','内沼','内原','内浦','内崎','外山','外川','外野','外浜','外島','外港','外坂','外谷','外峠','外橋','外池','外沼','外原','外浦','外崎','前山','前川','前野','前浜','前島','前港','前坂','前谷','前峠','前池','前沼','前原','前浦','前崎','後山','後川','後野','後浜','後島','後港','後坂','後谷','後峠','後橋','後池','後沼','後原','後浦','後崎','赤山','赤海','赤川','赤空','赤雲','赤風','赤雨','赤雪','赤花','赤木','赤葉','赤草','赤波','赤霧','赤月','青山','青海','青川','青空','青雲','青風','青雨','青雪','青花','青木','青葉','青草','青波','青霧','青月','白海','白空','白雲','白風','白雨','白雪','白花','白木','白葉','白草','白波','白霧','白月','黒山','黒海','黒川','黒空','黒雲','黒風','黒雨','黒雪','黒花','黒木','黒葉','黒草','黒波','黒霧','黒月','黄山','黄海','黄川','黄空','黄雲','黄風','黄雨','黄雪','黄花','黄木','黄葉','黄草','黄波','黄霧','黄月','緑山','緑海','緑川','緑空','緑雲','緑風','緑雨','緑雪','緑花','緑木','緑葉','緑草','緑波','緑霧','緑月','紫山','紫海','紫川','紫空','紫雲','紫風','紫雨','紫雪','紫花','紫木','紫葉','紫草','紫波','紫霧','紫月','橙山','橙海','橙川','橙空','橙雲','橙風','橙雨','橙雪','橙花','橙木','橙葉','橙草','橙波','橙霧','橙月','桃山','桃海','桃川','桃空','桃雲','桃風','桃雨','桃雪','桃花','桃木','桃葉','桃草','桃波','桃霧','桃月','茶山','茶海','茶川','茶空','茶雲','茶風','茶雨','茶雪','茶花','茶木','茶葉','茶草','茶波','茶霧','茶月','金山','金海','金川','金空','金雲','金風','金雨','金雪','金花','金木','金葉','金草','金波','金霧','金月','銀山','銀海','銀川','銀空','銀雲','銀風','銀雨','銀雪','銀花','銀木','銀葉','銀草','銀波','銀霧','銀月','灰山','灰海','灰川','灰空','灰雲','灰風','灰雨','灰雪','灰花','灰木','灰葉','灰草','灰波','灰霧','灰月','紺山','紺海','紺川','紺空','紺雲','紺風','紺雨','紺雪','紺花','紺木','紺葉','紺草','紺波','紺霧','紺月','朱山','朱海','朱川','朱空','朱雲','朱風','朱雨','朱雪','朱花','朱木','朱葉','朱草','朱波','朱霧','朱月','春雨','春霜','春雪','春雲','春空','春光','春闇','春霧','春霙','春霰','春露','春氷','春炎','夏雨','夏霞','夏霜','夏雪','夏空','夏光','夏闇','夏霧','夏霙','夏霰','夏露','夏氷','夏炎','秋雨','秋霞','秋雪','秋雲','秋空','秋光','秋闇','秋霧','秋霙','秋霰','秋露','秋氷','秋炎','冬雨','冬霞','冬霜','冬雲','冬空','冬光','冬闇','冬霧','冬霙','冬霰','冬露','冬氷','冬炎','一本','一丁','一条','一丸','一崎','一浦','一野','一原','一島','一山','一川','一谷','一坂','一橋','一町','二本','二丁','二丸','二崎','二浦','二野','二原','二島','二山','二川','二谷','二坂','二橋','二町','三本','三丁','三条','三丸','三崎','三浦','三野','三原','三山','三川','三谷','三坂','三橋','三町','四本','四丁','四条','四丸','四崎','四浦','四野','四原','四島','四山','四川','四谷','四坂','四橋','四町','五本','五丁','五条','五丸','五崎','五浦','五野','五原','五山','五川','五谷','五坂','五橋','五町','六本','六丁','六条','六丸','六崎','六浦','六野','六原','六島','六山','六川','六谷','六坂','六橋','六町','七本','七丁','七条','七丸','七崎','七浦','七野','七原','七島','七山','七川','七谷','七坂','七橋','七町','八本','八丁','八条','八丸','八崎','八浦','八野','八原','八島','八山','八川','八谷','八橋','八町','九本','九丁','九条','九丸','九崎','九浦','九野','九原','九島','九山','九川','九谷','九坂','九橋','九町','十本','十丁','十条','十丸','十崎','十浦','十野','十原','十島','十山','十川','十谷','十坂','十橋','十町','百本','百丁','百条','百丸','百崎','百浦','百野','百原','百島','百山','百川','百谷','百坂','百橋','百町','千本','千丁','千条','千丸','千崎','千浦','千野','千原','千島','千山','千川','千谷','千坂','千橋','千町','明川','明山','明海','明野','明空','明光','明影','明風','明雲','明雨','明雪','明霜','明露','明霧','明炎','明冰','明土','明砂','明岩','暗川','暗山','暗海','暗野','暗空','暗光','暗影','暗風','暗雲','暗雨','暗雪','暗霜','暗露','暗霧','暗炎','暗冰','暗石','暗土','暗砂','暗岩','清山','清海','清野','清空','清光','清影','清風','清雲','清雨','清雪','清霜','清露','清霧','清炎','清冰','清石','清土','清砂','清岩','濁川','濁山','濁海','濁野','濁空','濁光','濁影','濁風','濁雲','濁雨','濁雪','濁霜','濁露','濁霧','濁炎','濁冰','濁石','濁土','濁砂','濁岩','深川','深山','深海','深野','深空','深光','深影','深風','深雲','深雨','深雪','深霜','深露','深霧','深炎','深冰','深石','深土','深砂','深岩','浅川','浅山','浅海','浅野','浅空','浅光','浅影','浅風','浅雲','浅雨','浅雪','浅霜','浅露','浅霧','浅炎','浅冰','浅石','浅土','浅砂','浅岩','広川','広山','広海','広野','広空','広光','広影','広風','広雲','広雨','広雪','広霜','広露','広霧','広炎','広冰','広石','広土','広砂','広岩','狭川','狭山','狭海','狭野','狭空','狭光','狭影','狭風','狭雲','狭雨','狭雪','狭霜','狭露','狭霧','狭炎','狭冰','狭石','狭土','狭砂','狭岩','高川','高海','高空','高光','高影','高風','高雲','高雨','高雪','高霜','高露','高霧','高炎','高冰','高石','高土','高砂','高岩','低川','低山','低海','低野','低空','低光','低影','低風','低雲','低雨','低雪','低霜','低露','低霧','低炎','低冰','低石','低土','低砂','低岩','長川','長山','長海','長空','長光','長影','長風','長雲','長雨','長雪','長霜','長露','長霧','長炎','長冰','長石','長土','長砂','長岩','短川','短山','短海','短野','短空','短光','短影','短風','短雲','短雨','短雪','短霜','短露','短霧','短炎','短冰','短石','短土','短砂','短岩','大海','大空','大光','大影','大風','大雲','大雨','大霜','大露','大霧','大炎','大冰','大石','大土','大砂','大岩','小海','小空','小光','小影','小風','小雲','小雨','小霜','小露','小霧','小炎','小冰','小石','小土','小砂','小岩','古海','古空','古光','古影','古風','古雲','古雨','古雪','古霜','古露','古霧','古炎','古冰','古石','古土','古砂','古岩','新海','新空','新光','新影','新風','新雲','新雨','新雪','新霜','新露','新霧','新炎','新冰','新石','新土','新砂','新岩','老川','老山','老海','老野','老空','老光','老影','老風','老雲','老雨','老雪','老霜','老露','老霧','老炎','老冰','老石','老土','老砂','老岩','若川','若山','若海','若野','若空','若光','若影','若風','若雲','若雨','若雪','若霜','若露','若霧','若炎','若冰','若石','若土','若砂','若岩','強川','強山','強海','強野','強空','強光','強影','強風','強雲','強雨','強雪','強霜','強露','強霧','強炎','強冰','強石','強土','強砂','強岩','弱川','弱山','弱海','弱野','弱空','弱光','弱影','弱風','弱雲','弱雨','弱雪','弱霜','弱露','弱霧','弱炎','弱冰','弱石','弱土','弱砂','弱岩','神宮','神殿','神院','神堂','神門','神塔','神橋','神道','神路','神坂','神丘','神浦','神岬','神峰','神谷','神沢','神森','神林','神原','仏宮','仏殿','仏院','仏堂','仏門','仏塔','仏橋','仏道','仏路','仏坂','仏丘','仏浦','仏崎','仏岬','仏峰','仏谷','仏沢','仏森','仏林','仏原','龍宮','龍殿','龍院','龍堂','龍門','龍塔','龍橋','龍道','龍路','龍坂','龍丘','龍浦','龍崎','龍岬','龍峰','龍谷','龍沢','龍森','龍林','龍原','鳳宮','鳳殿','鳳院','鳳堂','鳳門','鳳塔','鳳橋','鳳道','鳳路','鳳坂','鳳丘','鳳浦','鳳崎','鳳岬','鳳峰','鳳谷','鳳沢','鳳森','鳳林','鳳原','虎宮','虎殿','虎院','虎堂','虎門','虎塔','虎橋','虎道','虎路','虎坂','虎丘','虎浦','虎崎','虎岬','虎峰','虎谷','虎沢','虎森','虎林','虎原','鷹宮','鷹殿','鷹院','鷹堂','鷹門','鷹塔','鷹橋','鷹道','鷹路','鷹坂','鷹丘','鷹浦','鷹崎','鷹岬','中国','アメリカ','インド','ロシア','ブラジル','ドイツ','イギリス','フランス','イタリア','カナダ','オーストラリア','スペイン','メキシコ','インドネシア','オランダ','サウジアラビア','トルコ','スイス','スウェーデン','ベルギー','アルゼンチン','ノルウェー','オーストリア','アラブ首長国','イスラエル','シンガポール','香港','台湾','タイ','マレーシア','フィリピン','ベトナム','パキスタン','バングラデシュ','エジプト','ナイジェリア','南アフリカ','ケニア','エチオピア','モロッコ','アルジェリア','イラン','イラク','シリア','ヨルダン','クウェート','カタール','オマーン','イエメン','アフガニスタン','スリランカ','ネパール','ミャンマー','カンボジア','モンゴル','カザフスタン','ウズベキスタン','ウクライナ','ポーランド','チェコ','ハンガリー','ルーマニア','ギリシャ','ポルトガル','フィンランド','デンマーク','アイルランド','ニュージーランド','チリ','コロンビア','ペルー','ベネズエラ','キューバ','タンザニア','ガーナ','ルワンダ','アンゴラ','ジンバブエ','ナミビア','モザンビーク','マダガスカル','カメルーン','コンゴ','セネガル','北京','ワシントン','ニューデリー','モスクワ','ブラジリア','ベルリン','ロンドン','パリ','ローマ','オタワ','ソウル','キャンベラ','マドリード','メキシコシティ','ジャカルタ','アムステルダム','リヤド','アンカラ','ベルン','ワルシャワ','ストックホルム','ブリュッセル','ブエノスアイレス','オスロ','ウィーン','アブダビ','エルサレム','台北','バンコク','クアラルンプール','マニラ','ハノイ','イスラマバード','ダッカ','カイロ','ナイロビ','アディスアベバ','テヘラン','バグダッド','ダマスカス','アンマン','ドーハ','マスカット','カブール','コロンボ','カトマンズ','ウランバートル','タシュケント','キエフ','プラハ','ブダペスト','アテネ','リスボン','ヘルシンキ','ダブリン','ウェリントン','サンティアゴ','ボゴタ','リマ','ハバナ','キガリ','ルアンダ','広東','浙江','江蘇','山東','河南','湖北','湖南','河北','福建','遼寧','黒龍江','吉林','安徽','江西','山西','陝西','雲南','貴州','広西','内モンゴル','チベット','新疆','甘粛','寧夏','海南','マカオ','カリフォルニア','テキサス','フロリダ','イリノイ','ペンシルベニア','オハイオ','ジョージア','ミシガン','シベリア','ウラル','コーカサス','マハーラーシュトラ','ウッタル・プラデーシュ','タミル・ナードゥ','カルナータカ','西ベンガル','サンパウロ州','リオデジャネイロ州','ミナスジェライス','バイーア','パラナ','上海','広州','深セン','成都','武漢','西安','杭州','南京','蘇州','青島','大連','厦門','昆明','ハルビン','鄭州','済南','長沙','瀋陽','ニューヨーク','ロサンゼルス','シカゴ','ヒューストン','ダラス','フィラデルフィア','トロント','バンクーバー','モントリオール','マンチェスター','エジンバラ','マルセイユ','リヨン','ボルドー','ハンブルク','ミュンヘン','フランクフルト','ミラノ','ナポリ','フィレンツェ','ベネチア','バルセロナ','チューリッヒ','ジュネーブ','サンクトペテルブルク','ノボシビルスク','ムンバイ','バンガロール','ハイデラバード','チェンナイ','コルカタ','ジャイプル','釜山','シドニー','メルボルン','サンパウロ','リオデジャネイロ','カサブランカ','ドバイ','イスタンブール','カラチ','ラゴス','ヨハネスブルク','ホーチミン','ヤンゴン','地名0275','地名0276','地名0277','地名0278','地名0279','地名0280','地名0281','地名0282','地名0283','地名0284','地名0285','地名0286','地名0287','地名0288','地名0289','地名0290','地名0291','地名0292','地名0293','地名0294','地名0295','地名0296','地名0297','地名0298','地名0299','地名0300','地名0301','地名0302','地名0303','地名0304','地名0305','地名0306','地名0307','地名0308','地名0309','地名0310','地名0311','地名0312','地名0313','地名0314','地名0315','地名0316','地名0317','地名0318','地名0319','地名0320','地名0321','地名0322','地名0323','地名0324','地名0325','地名0326','地名0327','地名0328','地名0329','地名0330','地名0331','地名0332','地名0333','地名0334','地名0335','地名0336','地名0337','地名0338','地名0339','地名0340','地名0341','地名0342','地名0343','地名0344','地名0345','地名0346','地名0347','地名0348','地名0349','地名0350','地名0351','地名0352','地名0353','地名0354','地名0355','地名0356','地名0357','地名0358','地名0359','地名0360','地名0361','地名0362','地名0363','地名0364','地名0365','地名0366','地名0367','地名0368','地名0369','地名0370','地名0371','地名0372','地名0373','地名0374','地名0375','地名0376','地名0377','地名0378','地名0379','地名0380','地名0381','地名0382','地名0383','地名0384','地名0385','地名0386','地名0387','地名0388','地名0389','地名0390','地名0391','地名0392','地名0393','地名0394','地名0395','地名0396','地名0397','地名0398','地名0399','地名0400','地名0401','地名0402','地名0403','地名0404','地名0405','地名0406','地名0407','地名0408','地名0409','地名0410','地名0411','地名0412','地名0413','地名0414','地名0415','地名0416','地名0417','地名0418','地名0419','地名0420','地名0421','地名0422','地名0423','地名0424','地名0425','地名0426','地名0427','地名0428','地名0429','地名0430','地名0431','地名0432','地名0433','地名0434','地名0435','地名0436','地名0437','地名0438','地名0439','地名0440','地名0441','地名0442','地名0443','地名0444','地名0445','地名0446','地名0447','地名0448','地名0449','地名0450','地名0451','地名0452','地名0453','地名0454','地名0455','地名0456','地名0457','地名0458','地名0459','地名0460','地名0461','地名0462','地名0463','地名0464','地名0465','地名0466','地名0467','地名0468','地名0469','地名0470','地名0471','地名0472','地名0473','地名0474','地名0475','地名0476','地名0477','地名0478','地名0479','地名0480','地名0481','地名0482','地名0483','地名0484','地名0485','地名0486','地名0487','地名0488','地名0489','地名0490','地名0491','地名0492','地名0493','地名0494','地名0495','地名0496','地名0497','地名0498','地名0499','地名0500','地名0501','地名0502','地名0503','地名0504','地名0505','地名0506','地名0507','地名0508','地名0509','地名0510','地名0511','地名0512','地名0513','地名0514','地名0515','地名0516','地名0517','地名0518','地名0519','地名0520','地名0521','地名0522','地名0523','地名0524','地名0525','地名0526','地名0527','地名0528','地名0529','地名0530','地名0531','地名0532','地名0533','地名0534','地名0535','地名0536','地名0537','地名0538','地名0539','地名0540','地名0541','地名0542','地名0543','地名0544','地名0545','地名0546','地名0547','地名0548','地名0549','地名0550','地名0551','地名0552','地名0553','地名0554','地名0555','地名0556','地名0557','地名0558','地名0559','地名0560','地名0561','地名0562','地名0563','地名0564','地名0565','地名0566','地名0567','地名0568','地名0569','地名0570','地名0571','地名0572','地名0573','地名0574','地名0575','地名0576','地名0577','地名0578','地名0579','地名0580','地名0581','地名0582','地名0583','地名0584','地名0585','地名0586','地名0587','地名0588','地名0589','地名0590','地名0591','地名0592','地名0593','地名0594','地名0595','地名0596','地名0597','地名0598','地名0599','地名0600','地名0601','地名0602','地名0603','地名0604','地名0605','地名0606','地名0607','地名0608','地名0609','地名0610','地名0611','地名0612','地名0613','地名0614','地名0615','地名0616','地名0617','地名0618','地名0619','地名0620','地名0621','地名0622','地名0623','地名0624','地名0625','地名0626','地名0627','地名0628','地名0629','地名0630','地名0631','地名0632','地名0633','地名0634','地名0635','地名0636','地名0637','地名0638','地名0639','地名0640','地名0641','地名0642','地名0643','地名0644','地名0645','地名0646','地名0647','地名0648','地名0649','地名0650','地名0651','地名0652','地名0653','地名0654','地名0655','地名0656','地名0657','地名0658','地名0659','地名0660','地名0661','地名0662','地名0663','地名0664','地名0665','地名0666','地名0667','地名0668','地名0669','地名0670','地名0671','地名0672','地名0673','地名0674','地名0675','地名0676','地名0677','地名0678','地名0679','地名0680','地名0681','地名0682','地名0683','地名0684','地名0685','地名0686','地名0687','地名0688','地名0689','地名0690','地名0691','地名0692','地名0693','地名0694','地名0695','地名0696','地名0697','地名0698','地名0699','地名0700','地名0701','地名0702','地名0703','地名0704','地名0705','地名0706','地名0707','地名0708','地名0709','地名0710','地名0711','地名0712','地名0713','地名0714','地名0715','地名0716','地名0717','地名0718','地名0719','地名0720','地名0721','地名0722','地名0723','地名0724','地名0725','地名0726','地名0727','地名0728','地名0729','地名0730','地名0731','地名0732','地名0733','地名0734','地名0735','地名0736','地名0737','地名0738','地名0739','地名0740','地名0741','地名0742','地名0743','地名0744','地名0745','地名0746','地名0747','地名0748','地名0749','地名0750','地名0751','地名0752','地名0753','地名0754','地名0755','地名0756','地名0757','地名0758','地名0759','地名0760','地名0761','地名0762','地名0763','地名0764','地名0765','地名0766','地名0767','地名0768','地名0769','地名0770','地名0771','地名0772','地名0773','地名0774','地名0775','地名0776','地名0777','地名0778','地名0779','地名0780','地名0781','地名0782','地名0783','地名0784','地名0785','地名0786','地名0787','地名0788','地名0789','地名0790','地名0791','地名0792','地名0793','地名0794','地名0795','地名0796','地名0797','地名0798','地名0799','地名0800','地名0801','地名0802','地名0803','地名0804','地名0805','地名0806','地名0807','地名0808','地名0809','地名0810','地名0811','地名0812','地名0813','地名0814','地名0815','地名0816','地名0817','地名0818','地名0819','地名0820','地名0821','地名0822','地名0823','地名0824','地名0825','地名0826','地名0827','地名0828','地名0829','地名0830','地名0831','地名0832','地名0833','地名0834','地名0835','地名0836','地名0837','地名0838','地名0839','地名0840','地名0841','地名0842','地名0843','地名0844','地名0845','地名0846','地名0847','地名0848','地名0849','地名0850','地名0851','地名0852','地名0853','地名0854','地名0855','地名0856','地名0857','地名0858','地名0859','地名0860','地名0861','地名0862','地名0863','地名0864','地名0865','地名0866','地名0867','地名0868','地名0869','地名0870','地名0871','地名0872','地名0873','地名0874','地名0875','地名0876','地名0877','地名0878','地名0879','地名0880','地名0881','地名0882','地名0883','地名0884','地名0885','地名0886','地名0887','地名0888','地名0889','地名0890','地名0891','地名0892','地名0893','地名0894','地名0895','地名0896','地名0897','地名0898','地名0899','地名0900','地名0901','地名0902','地名0903','地名0904','地名0905','地名0906','地名0907','地名0908','地名0909','地名0910','地名0911','地名0912','地名0913','地名0914','地名0915','地名0916','地名0917','地名0918','地名0919','地名0920','地名0921','地名0922','地名0923','地名0924','地名0925','地名0926','地名0927','地名0928','地名0929','地名0930','地名0931','地名0932','地名0933','地名0934','地名0935','地名0936','地名0937','地名0938','地名0939','地名0940','地名0941','地名0942','地名0943','地名0944','地名0945','地名0946','地名0947','地名0948','地名0949','地名0950','地名0951','地名0952','地名0953','地名0954','地名0955','地名0956','地名0957','地名0958','地名0959','地名0960','地名0961','地名0962','地名0963','地名0964','地名0965','地名0966','地名0967','地名0968','地名0969','地名0970','地名0971','地名0972','地名0973','地名0974','地名0975','地名0976','地名0977','地名0978','地名0979','地名0980','地名0981','地名0982','地名0983','地名0984','地名0985','地名0986','地名0987','地名0988','地名0989','地名0990','地名0991','地名0992','地名0993','地名0994','地名0995','地名0996','地名0997','地名0998','地名0999','地名1000','地名1001','地名1002','地名1003','地名1004','地名1005','地名1006','地名1007','地名1008','地名1009','地名1010','地名1011','地名1012','地名1013','地名1014','地名1015','地名1016','地名1017','地名1018','地名1019','地名1020','地名1021','地名1022','地名1023','地名1024','地名1025','地名1026','地名1027','地名1028','地名1029','地名1030','地名1031','地名1032','地名1033','地名1034','地名1035','地名1036','地名1037','地名1038','地名1039','地名1040','地名1041','地名1042','地名1043','地名1044','地名1045','地名1046','地名1047','地名1048','地名1049','地名1050','地名1051','地名1052','地名1053','地名1054','地名1055','地名1056','地名1057','地名1058','地名1059','地名1060','地名1061','地名1062','地名1063','地名1064','地名1065','地名1066','地名1067','地名1068','地名1069','地名1070','地名1071','地名1072','地名1073','地名1074','地名1075','地名1076','地名1077','地名1078','地名1079','地名1080','地名1081','地名1082','地名1083','地名1084','地名1085','地名1086','地名1087','地名1088','地名1089','地名1090','地名1091','地名1092','地名1093','地名1094','地名1095','地名1096','地名1097','地名1098','地名1099','地名1100','地名1101','地名1102','地名1103','地名1104','地名1105','地名1106','地名1107','地名1108','地名1109','地名1110','地名1111','地名1112','地名1113','地名1114','地名1115','地名1116','地名1117','地名1118','地名1119','地名1120','地名1121','地名1122','地名1123','地名1124','地名1125','地名1126','地名1127','地名1128','地名1129','地名1130','地名1131','地名1132','地名1133','地名1134','地名1135','地名1136','地名1137','地名1138','地名1139','地名1140','地名1141','地名1142','地名1143','地名1144','地名1145','地名1146','地名1147','地名1148','地名1149','地名1150','地名1151','地名1152','地名1153','地名1154','地名1155','地名1156','地名1157','地名1158','地名1159','地名1160','地名1161','地名1162','地名1163','地名1164','地名1165','地名1166','地名1167','地名1168','地名1169','地名1170','地名1171','地名1172','地名1173','地名1174','地名1175','地名1176','地名1177','地名1178','地名1179','地名1180','地名1181','地名1182','地名1183','地名1184','地名1185','地名1186','地名1187','地名1188','地名1189','地名1190','地名1191','地名1192','地名1193','地名1194','地名1195','地名1196','地名1197','地名1198','地名1199','地名1200','地名1201','地名1202','地名1203','地名1204','地名1205','地名1206','地名1207','地名1208','地名1209','地名1210','地名1211','地名1212','地名1213','地名1214','地名1215','地名1216','地名1217','地名1218','地名1219','地名1220','地名1221','地名1222','地名1223','地名1224','地名1225','地名1226','地名1227','地名1228','地名1229','地名1230','地名1231','地名1232','地名1233','地名1234','地名1235','地名1236','地名1237','地名1238','地名1239','地名1240','地名1241','地名1242','地名1243','地名1244','地名1245','地名1246','地名1247','地名1248','地名1249','地名1250','地名1251','地名1252','地名1253','地名1254','地名1255','地名1256','地名1257','地名1258','地名1259','地名1260','地名1261','地名1262','地名1263','地名1264','地名1265','地名1266','地名1267','地名1268','地名1269','地名1270','地名1271','地名1272','地名1273','地名1274','地名1275','地名1276','地名1277','地名1278','地名1279','地名1280','地名1281','地名1282','地名1283','地名1284','地名1285','地名1286','地名1287','地名1288','地名1289','地名1290','地名1291','地名1292','地名1293','地名1294','地名1295','地名1296','地名1297','地名1298','地名1299','地名1300','地名1301','地名1302','地名1303','地名1304','地名1305','地名1306','地名1307','地名1308','地名1309','地名1310','地名1311','地名1312','地名1313','地名1314','地名1315','地名1316','地名1317','地名1318','地名1319','地名1320','地名1321','地名1322','地名1323','地名1324','地名1325','地名1326','地名1327','地名1328','地名1329','地名1330','地名1331','地名1332','地名1333','地名1334','地名1335','地名1336','地名1337','地名1338','地名1339','地名1340','地名1341','地名1342','地名1343','地名1344','地名1345','地名1346','地名1347','地名1348','地名1349','地名1350','地名1351','地名1352','地名1353','地名1354','地名1355','地名1356','地名1357','地名1358','地名1359','地名1360','地名1361','地名1362','地名1363','地名1364','地名1365','地名1366','地名1367','地名1368','地名1369','地名1370','地名1371','地名1372','地名1373','地名1374','地名1375','地名1376','地名1377','地名1378','地名1379','地名1380','地名1381','地名1382','地名1383','地名1384','地名1385','地名1386','地名1387','地名1388','地名1389','地名1390','地名1391','地名1392','地名1393','地名1394','地名1395','地名1396','地名1397','地名1398','地名1399','地名1400','地名1401','地名1402','地名1403','地名1404','地名1405','地名1406','地名1407','地名1408','地名1409','地名1410','地名1411','地名1412','地名1413','地名1414','地名1415','地名1416','地名1417','地名1418','地名1419','地名1420','地名1421','地名1422','地名1423','地名1424','地名1425','地名1426','地名1427','地名1428','地名1429','地名1430','地名1431','地名1432','地名1433','地名1434','地名1435','地名1436','地名1437','地名1438','地名1439','地名1440','地名1441','地名1442','地名1443','地名1444','地名1445','地名1446','地名1447','地名1448','地名1449','地名1450','地名1451','地名1452','地名1453','地名1454','地名1455','地名1456','地名1457','地名1458','地名1459','地名1460','地名1461','地名1462','地名1463','地名1464','地名1465','地名1466','地名1467','地名1468','地名1469','地名1470','地名1471','地名1472','地名1473','地名1474','地名1475','地名1476','地名1477','地名1478','地名1479','地名1480','地名1481','地名1482','地名1483','地名1484','地名1485','地名1486','地名1487','地名1488','地名1489','地名1490','地名1491','地名1492','地名1493','地名1494','地名1495','地名1496','地名1497','地名1498','地名1499','地名1500','地名1501','地名1502','地名1503','地名1504','地名1505','地名1506','地名1507','地名1508','地名1509','地名1510','地名1511','地名1512','地名1513','地名1514','地名1515','地名1516','地名1517','地名1518','地名1519','地名1520','地名1521','地名1522','地名1523','地名1524','地名1525','地名1526','地名1527','地名1528','地名1529','地名1530','地名1531','地名1532','地名1533','地名1534','地名1535','地名1536','地名1537','地名1538','地名1539','地名1540','地名1541','地名1542','地名1543','地名1544','地名1545','地名1546','地名1547','地名1548','地名1549','地名1550','地名1551','地名1552','地名1553','地名1554','地名1555','地名1556','地名1557','地名1558','地名1559','地名1560','地名1561','地名1562','地名1563','地名1564','地名1565','地名1566','地名1567','地名1568','地名1569','地名1570','地名1571','地名1572','地名1573','地名1574','地名1575','地名1576','地名1577','地名1578','地名1579','地名1580','地名1581','地名1582','地名1583','地名1584','地名1585','地名1586','地名1587','地名1588','地名1589','地名1590','地名1591','地名1592','地名1593','地名1594','地名1595','地名1596','地名1597','地名1598','地名1599','地名1600','地名1601','地名1602','地名1603','地名1604','地名1605','地名1606','地名1607','地名1608','地名1609','地名1610','地名1611','地名1612','地名1613','地名1614','地名1615','地名1616','地名1617','地名1618','地名1619','地名1620','地名1621','地名1622','地名1623','地名1624','地名1625','地名1626','地名1627','地名1628','地名1629','地名1630','地名1631','地名1632','地名1633','地名1634','地名1635','地名1636','地名1637','地名1638','地名1639','地名1640','地名1641','地名1642','地名1643','地名1644','地名1645','地名1646','地名1647','地名1648','地名1649','地名1650','地名1651','地名1652','地名1653','地名1654','地名1655','地名1656','地名1657','地名1658','地名1659','地名1660','地名1661','地名1662','地名1663','地名1664','地名1665','地名1666','地名1667','地名1668','地名1669','地名1670','地名1671','地名1672','地名1673','地名1674','地名1675','地名1676','地名1677','地名1678','地名1679','地名1680','地名1681','地名1682','地名1683','地名1684','地名1685','地名1686','地名1687','地名1688','地名1689','地名1690','地名1691','地名1692','地名1693','地名1694','地名1695','地名1696','地名1697','地名1698','地名1699','地名1700','地名1701','地名1702','地名1703','地名1704','地名1705','地名1706','地名1707','地名1708','地名1709','地名1710','地名1711','地名1712','地名1713','地名1714','地名1715','地名1716','地名1717','地名1718','地名1719','地名1720','地名1721','地名1722','地名1723','地名1724','地名1725','地名1726','地名1727','地名1728','地名1729','地名1730','地名1731','地名1732','地名1733','地名1734','地名1735','地名1736','地名1737','地名1738','地名1739','地名1740','地名1741','地名1742','地名1743','地名1744','地名1745','地名1746','地名1747','地名1748','地名1749','地名1750','地名1751','地名1752','地名1753','地名1754','地名1755','地名1756','地名1757','地名1758','地名1759','地名1760','地名1761','地名1762','地名1763','地名1764','地名1765','地名1766','地名1767','地名1768','地名1769','地名1770','地名1771','地名1772','地名1773','地名1774','地名1775','地名1776','地名1777','地名1778','地名1779','地名1780','地名1781','地名1782','地名1783','地名1784','地名1785','地名1786','地名1787','地名1788','地名1789','地名1790','地名1791','地名1792','地名1793','地名1794','地名1795','地名1796','地名1797','地名1798','地名1799','地名1800','地名1801','地名1802','地名1803','地名1804','地名1805','地名1806','地名1807','地名1808','地名1809','地名1810','地名1811','地名1812','地名1813','地名1814','地名1815','地名1816','地名1817','地名1818','地名1819','地名1820','地名1821','地名1822','地名1823','地名1824','地名1825','地名1826','地名1827','地名1828','地名1829','地名1830','地名1831','地名1832','地名1833','地名1834','地名1835','地名1836','地名1837','地名1838','地名1839','地名1840','地名1841','地名1842','地名1843','地名1844','地名1845','地名1846','地名1847','地名1848','地名1849','地名1850','地名1851','地名1852','地名1853','地名1854','地名1855','地名1856','地名1857','地名1858','地名1859','地名1860','地名1861','地名1862','地名1863','地名1864','地名1865','地名1866','地名1867','地名1868','地名1869','地名1870','地名1871','地名1872','地名1873','地名1874','地名1875','地名1876','地名1877','地名1878','地名1879','地名1880','地名1881','地名1882','地名1883','地名1884','地名1885','地名1886','地名1887','地名1888','地名1889','地名1890','地名1891','地名1892','地名1893','地名1894','地名1895','地名1896','地名1897','地名1898','地名1899','地名1900','地名1901','地名1902','地名1903','地名1904','地名1905','地名1906','地名1907','地名1908','地名1909','地名1910','地名1911','地名1912','地名1913','地名1914','地名1915','地名1916','地名1917','地名1918','地名1919','地名1920','地名1921','地名1922','地名1923','地名1924','地名1925','地名1926','地名1927','地名1928','地名1929','地名1930','地名1931','地名1932','地名1933','地名1934','地名1935','地名1936','地名1937','地名1938','地名1939','地名1940','地名1941','地名1942','地名1943','地名1944','地名1945','地名1946','地名1947','地名1948','地名1949','地名1950','地名1951','地名1952','地名1953','地名1954','地名1955','地名1956','地名1957','地名1958','地名1959','地名1960','地名1961','地名1962','地名1963','地名1964','地名1965','地名1966','地名1967','地名1968','地名1969','地名1970','地名1971','地名1972','地名1973','地名1974','地名1975','地名1976','地名1977','地名1978','地名1979','地名1980','地名1981','地名1982','地名1983','地名1984','地名1985','地名1986','地名1987','地名1988','地名1989','地名1990','地名1991','地名1992','地名1993','地名1994','地名1995','地名1996','地名1997','地名1998','地名1999','地名2000','地名2001','地名2002','地名2003','地名2004','地名2005','地名2006','地名2007','地名2008','地名2009','地名2010','地名2011','地名2012','地名2013','地名2014','地名2015','地名2016','地名2017','地名2018','地名2019','地名2020','地名2021','地名2022','地名2023','地名2024','地名2025','地名2026','地名2027','地名2028','地名2029','地名2030','地名2031','地名2032','地名2033','地名2034','地名2035','地名2036','地名2037','地名2038','地名2039','地名2040','地名2041','地名2042','地名2043','地名2044','地名2045','地名2046','地名2047','地名2048'],
  ko:['한양','개성','경주','부여','공주','강화','평양','금강','설악','지리','한라','백두','가야','신라','백제','고구려','발해','고려','조선','대한','서울','부산','인천','대구','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주','수원','성남','용인','부천','안산','안양','남양주','화성','평택','의정부','시흥','파주','김포','광명','이천','양주','고양','구리','오산','하남','의왕','군포','양평','동두천','가평','포천','연천','여주','과천','춘천','원주','강릉','동해','태백','속초','삼척','홍천','횡성','영월','평창','정선','철원','화천','양구','인제','고성','양양','청주','충주','제천','보은','옥천','영동','진천','괴산','음성','단양','천안','보령','아산','서산','논산','계룡','당진','금산','서천','청양','홍성','예산','태안','전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안','목포','여수','순천','나주','광양','담양','곡성','구례','고흥','보성','화순','장흥','강진','해남','영암','무안','함평','영광','장성','완도','진도','신안','포항','김천','안동','구미','영주','영천','상주','문경','경산','군위','의성','청송','영양','영덕','청도','고령','성주','칠곡','예천','봉화','울진','창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','남해','하동','산청','함양','거창','합천','서귀포','한라산','백두산','설악산','지리산','내장산','가야산','덕유산','오대산','태백산','소백산','북한산','관악산','도봉산','수락산','청계산','남산','인왕산','아차산','용마산','망우산','치악산','방태산','계방산','점봉산','대관령','한계령','미시령','진부령','죽령','추풍령','팔공산','비슬산','금오산','황악산','속리산','월악산','주흘산','조령산','희양산','구병산','민주지산','삼도봉','황학산','천태산','서대산','계룡산','마니산','감악산','화악산','명성산','한강','낙동강','섬진강','영산강','임진강','북한강','남한강','소양강','홍천강','인북천','내린천','오대천','평창강','주천강','동강','조양강','달천','가흥천','남강','황강','밀양강','형산강','태화강','회야강','송정천','수영강','온천천','동천','좌천','서해','독도','울릉','남해도','교동','영종','용유','덕적','자월','이작','승봉','대이작','소이작','백령','대청','소청','연평','대연평','소연평','우도','마라도','비양도','가파도','차귀도','형제섬','범섬','문섬','성산','협재','함덕','곽지','이호','경복궁','창덕궁','창경궁','덕수궁','경희궁','종묘','사직','남대문','동대문','광화문','불국사','석굴암','해인사','통도사','송광사','선암사','대흥사','화엄사','법주사','마곡사','수원성','남한산성','북한산성','행주산성','공산성','부소산성','금성산성','진주성','동래성','판소리','탈춤','농악','사물놀이','강강술래','줄다리기','씨름','태권도','택견','궁도','한복','한옥','한식','한지','한글','훈민정음','팔만대장경','직지심경','조선왕조실록','도자기','청자','백자','분청사기','나전칠기','매듭공예','자수','제기','연날리기','팽이','설날','추석','단오','칠석','백중','동지','입춘','대보름','유두','봄날','여름날','가을날','겨울날','새벽','아침','점심','저녁','밤','한낮','정월','이월','삼월','사월','오월','유월','칠월','팔월','구월','시월','동짓달','섣달','개천절','광복절','삼일절','현충일','한글날','어린이날','빨간','파란','하얀','검은','노란','초록','주황','보라','분홍','갈색','회색','은빛','금빛','청색','남색','하늘','연두','자주','크림','베이지','진빨','연빨','진파','연파','진초','연초','진노','연노','진보','연보','강변','바닷가','산기슭','계곡','폭포','고원','평원','늪지','갯벌','모래밭','솔숲','대숲','억새밭','들판','목장','과수원','논밭','언덕','절벽','동굴','봄비','여름비','가을바람','겨울눈','아침이슬','저녁노을','무지개','번개','천둥','안개','맑음','흐림','비바람','눈보라','서리','이슬','해무','안개꽃','소나기','장마','무궁화','진달래','철쭉','개나리','벚꽃','매화','국화','연꽃','해바라기','장미','소나무','대나무','은행나무','단풍나무','느티나무','버드나무','자작나무','참나무','오동나무','배나무','감나무','사과나무','복숭아나무','포도나무','살구나무','자두나무','앵두나무','산수유','모과나무','회화나무','호랑이','독수리','학','사슴','곰','여우','토끼','비둘기','제비','참새','잉어','연어','송어','고래','돌고래','거북이','두루미','황새','원앙','봉황','까치','까마귀','딱따구리','뻐꾸기','소쩍새','올빼미','부엉이','솔개','매','황조롱이','비빔밥','불고기','김치','삼겹살','냉면','갈비탕','된장찌개','순두부','청국장','잡채','떡볶이','순대','튀김','전','해물파전','김치전','녹두전','막걸리','소주','동동주','약식','식혜','수정과','오미자차','쌍화차','생강차','대추차','유자차','녹차','옥수수차','동쪽','서쪽','남쪽','북쪽','중앙','위쪽','아래','안쪽','바깥','앞쪽','뒤쪽','오른','왼쪽','근처','멀리','동해안','서해안','남해안','내륙','해안','하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열','스물','서른','마흔','쉰','예순','일흔','여든','아흔','백','천','단군','주몽','온조','혁거세','수로','광개토','장수왕','을지문덕','연개소문','계백','김유신','문무왕','원효','의상','설총','최치원','왕건','서희','강감찬','윤관','이성계','정도전','한석봉','이이','이황','신사임당','이순신','권율','유성룡','정약용','김정호','박지원','홍길동','춘향','심청','흥부','놀부','도깨비','선녀','가을봄','나들이','소풍길','오솔길','둘레길','해파랑길','남파랑길','서해랑길','강변길','산책로','성북','성동','성서','동작','동대','서대','서초','서빙','서울숲','청라','송도','청계','광화','여의','잠실','강남','강북','강서','강동','마포','은평','노원','도봉','종로','중구','용산','광진','중랑','동산','동도','동항','동역','동호','동평','동원','동봉','동령','동포','동만','동곶','서강','서도','서항','서역','서호','서평','서원','서봉','서령','서포','서만','서곶','남도','남항','남역','남천','남호','남평','남봉','남령','남포','남만','남곶','북산','북강','북해','북도','북항','북역','북천','북호','북평','북원','북봉','북령','북포','북만','북곶','상산','상강','상해','상도','상항','상역','상천','상호','상평','상원','상봉','상령','상포','상만','상곶','하산','하강','하해','하도','하항','하역','하천','하호','하평','하원','하봉','하령','하포','하만','하곶','신산','신강','신해','신도','신항','신역','신천','신호','신평','신원','신봉','신령','신포','신만','신곶','구산','구강','구해','구도','구항','구역','구천','구호','구평','구원','구봉','구령','구포','구만','구곶','대산','대강','대해','대도','대항','대역','대천','대호','대평','대원','대봉','대령','대포','대만','대곶','소산','소강','소해','소도','소항','소역','소천','소호','소평','소원','소봉','소령','소포','소만','소곶','중산','중강','중해','중도','중항','중역','중천','중호','중평','중원','중봉','중령','중포','중만','중곶','내산','내강','내해','내도','내항','내역','내천','내호','내평','내원','내봉','내령','내포','내만','내곶','외산','외강','외해','외도','외항','외역','외천','외호','외평','외원','외봉','외령','외포','외만','외곶','전산','전강','전해','전도','전항','전역','전천','전호','전평','전원','전봉','전령','전포','전만','전곶','후산','후강','후해','후도','후항','후역','후천','후호','후평','후원','후봉','후령','후포','후만','후곶','붉은빛','푸른빛','흰빛','검은빛','노란빛','초록빛','보라빛','주황빛','분홍빛','갈색빛','금빛빛','은빛빛','회색빛','남색빛','하늘빛','봄산','가을산','여름산','겨울산','봄바다','가을바다','여름바다','겨울바다','봄강','가을강','여름강','겨울강','봄하늘','가을하늘','여름하늘','겨울하늘','봄구름','가을구름','여름구름','겨울구름','봄바람','여름바람','겨울바람','가을비','겨울비','봄눈','가을눈','여름눈','봄꽃','가을꽃','여름꽃','겨울꽃','봄나무','가을나무','여름나무','겨울나무','봄잎','가을잎','여름잎','겨울잎','봄풀','가을풀','여름풀','겨울풀','봄물결','가을물결','여름물결','겨울물결','봄안개','가을안개','여름안개','겨울안개','봄달','가을달','여름달','겨울달','일동','일서','일남','일북','일도','일시','일군','일구','일읍','일면','일리','일가','일로','일길','이동','이서','이남','이북','이도','이시','이군','이구','이읍','이면','이리','이가','이로','이길','삼동','삼서','삼남','삼북','삼도','삼시','삼군','삼구','삼읍','삼면','삼리','삼가','삼로','삼길','사동','사서','사남','사북','사도','사시','사군','사구','사읍','사면','사리','사가','사로','사길','오동','오서','오남','오북','오도','오시','오군','오구','오읍','오면','오리','오가','오로','오길','육동','육서','육남','육북','육도','육시','육군','육구','육읍','육면','육리','육가','육로','육길','칠동','칠서','칠남','칠북','칠도','칠시','칠군','칠구','칠읍','칠면','칠리','칠가','칠로','칠길','팔동','팔서','팔남','팔북','팔도','팔시','팔군','팔구','팔읍','팔면','팔리','팔가','팔로','팔길','구동','구서','구남','구북','구시','구군','구구','구읍','구면','구가','구로','구길','십동','십서','십남','십북','십도','십시','십군','십구','십읍','십면','십리','십가','십로','십길','백동','백서','백남','백북','백도','백시','백군','백구','백읍','백면','백리','백가','백로','백길','천동','천서','천남','천북','천도','천시','천군','천구','천읍','천면','천리','천가','천로','천길','넓하','넓바','넓산','넓강','넓들','넓숲','넓마','넓도','넓나','넓세','높하','높바','높산','높강','높들','높숲','높마','높도','높나','높세','깊하','깊바','깊산','깊강','깊들','깊숲','깊마','깊도','깊나','깊세','맑하','맑바','맑산','맑강','맑들','맑숲','맑마','맑도','맑나','맑세','밝하','밝바','밝산','밝강','밝들','밝숲','밝마','밝도','밝나','밝세','새로하','새로바','새로산','새로강','새로들','새로숲','새로마','새로도','새로나','새로세','오래하','오래바','오래산','오래강','오래들','오래숲','오래마','오래도','오래나','오래세','아름다하','아름다바','아름다산','아름다강','아름다들','아름다숲','아름다마','아름다도','아름다나','아름다세','푸하','푸바','푸산','푸강','푸들','푸숲','푸마','푸도','푸나','푸세','붉하','붉바','붉산','붉강','붉들','붉숲','붉마','붉도','붉나','붉세','금바다','금하늘','금구름','금바람','금비','금눈','금꽃','금나무','금돌','금흙','금모래','금물','금불','은산','은강','은바다','은하늘','은구름','은바람','은비','은눈','은꽃','은나무','은돌','은흙','은모래','은물','은불','동바다','동하늘','동구름','동바람','동비','동눈','동꽃','동나무','동돌','동흙','동모래','동물','동불','철산','철강','철바다','철하늘','철구름','철바람','철비','철눈','철꽃','철나무','철돌','철흙','철모래','철물','철불','옥산','옥강','옥바다','옥하늘','옥구름','옥바람','옥비','옥눈','옥꽃','옥나무','옥돌','옥흙','옥모래','옥물','옥불','진산','진강','진바다','진하늘','진구름','진바람','진비','진눈','진꽃','진나무','진돌','진흙','진모래','진물','진불','보산','보강','보바다','보하늘','보구름','보바람','보비','보눈','보꽃','보나무','보돌','보흙','보모래','보물','보불','명산','명강','명바다','명하늘','명구름','명바람','명비','명눈','명꽃','명나무','명돌','명흙','명모래','명물','명불','청산','청강','청바다','청하늘','청구름','청바람','청비','청눈','청꽃','청나무','청돌','청흙','청모래','청물','청불','백산','백강','백바다','백하늘','백구름','백바람','백비','백눈','백꽃','백나무','백돌','백흙','백모래','백물','백불','흑산','흑강','흑바다','흑하늘','흑구름','흑바람','흑비','흑눈','흑꽃','흑나무','흑돌','흑흙','흑모래','흑물','흑불','적산','적강','적바다','적하늘','적구름','적바람','적비','적눈','적꽃','적나무','적돌','적흙','적모래','적물','적불','황산','황바다','황하늘','황구름','황바람','황비','황눈','황꽃','황나무','황돌','황흙','황모래','황물','황불','녹산','녹강','녹바다','녹하늘','녹구름','녹바람','녹비','녹눈','녹꽃','녹나무','녹돌','녹흙','녹모래','녹물','녹불','자산','자강','자바다','자하늘','자구름','자바람','자비','자눈','자꽃','자나무','자돌','자흙','자모래','자물','자불','봄길','봄마을','봄고을','봄나라','봄땅','봄들','여름길','여름마을','여름고을','여름나라','여름땅','여름들','가을길','가을마을','가을고을','가을나라','가을땅','가을들','겨울길','겨울마을','겨울고을','겨울나라','겨울땅','겨울들','아침길','아침마을','아침고을','아침나라','아침땅','아침하늘','아침바다','아침강','아침산','아침들','낮길','낮마을','낮고을','낮나라','낮땅','낮하늘','낮바다','낮강','낮산','낮들','저녁길','저녁마을','저녁고을','저녁나라','저녁땅','저녁하늘','저녁바다','저녁강','저녁산','저녁들','밤길','밤마을','밤고을','밤나라','밤땅','밤하늘','밤바다','밤강','밤산','밤들','새벽길','새벽마을','새벽고을','새벽나라','새벽땅','새벽하늘','새벽바다','새벽강','새벽산','새벽들','황혼길','황혼마을','황혼고을','황혼나라','황혼땅','황혼하늘','황혼바다','황혼강','황혼산','황혼들','큰강길','큰산길','큰바길','큰하길','큰숲길','큰들길','큰마길','큰고길','큰나길','큰세길','작은강길','작은산길','작은바길','작은하길','작은숲길','작은들길','작은마길','작은고길','작은나길','작은세길','높은강길','높은산길','높은바길','높은하길','높은숲길','높은들길','높은마길','높은고길','높은나길','높은세길','낮은강길','낮은산길','낮은바길','낮은하길','낮은숲길','낮은들길','낮은마길','낮은고길','낮은나길','낮은세길','긴강길','긴산길','긴바길','긴하길','긴숲길','긴들길','긴마길','긴고길','긴나길','긴세길','짧은강길','짧은산길','짧은바길','짧은하길','짧은숲길','짧은들길','짧은마길','짧은고길','짧은나길','짧은세길','넓은강길','넓은산길','넓은바길','넓은하길','넓은숲길','넓은들길','넓은마길','넓은고길','넓은나길','넓은세길','좁은강길','좁은산길','좁은바길','좁은하길','좁은숲길','좁은들길','좁은마길','좁은고길','좁은나길','좁은세길','밝은강길','밝은산길','밝은바길','밝은하길','밝은숲길','밝은들길','밝은마길','밝은고길','밝은나길','밝은세길','어두운강길','어두운산길','어두운바길','어두운하길','어두운숲길','어두운들길','어두운마길','어두운고길','어두운나길','어두운세길','가락','금천','기장','달성','마산','안성','일봉','일령','일악','일산','일강','일천','일호','일포','일만','일항','일진','일곡','일암','이봉','이령','이악','이산','이강','이포','이만','이항','이진','이곡','이암','삼봉','삼령','삼악','삼산','삼강','삼천','삼호','삼포','삼만','삼항','삼진','삼곡','삼암','사봉','사령','사악','사산','사강','사호','사포','사만','사항','사진','사곡','사암','오봉','오령','오악','오강','오천','오호','오포','오만','오항','오진','오곡','오암','육봉','육령','육악','육산','육강','육천','육호','육포','육만','육항','육진','육곡','육암','칠봉','칠령','칠악','칠산','칠강','칠천','칠호','칠포','칠만','칠항','칠진','칠암','팔봉','팔령','팔악','팔산','팔강','팔천','팔호','팔포','팔만','팔항','팔진','팔곡','팔암','구악','구진','구곡','구암','십봉','십령','십악','십산','십강','십천','십호','십포','십만','십항','십진','십곡','십암','백봉','백악','백천','백호','백포','백만','백항','백진','백곡','백암','천봉','천령','천악','천산','천강','천천','천호','천포','천만','천항','천진','천곡','천암','만봉','만령','만악','만산','만강','만천','만호','만포','만만','만도','만항','만진','만곡','만암','만동','맑+봄','맑+여름','맑+가을','맑+겨울','맑+아침','맑+저녁','맑+달빛','맑+햇살','맑+바람결','맑+물소리','맑+새소리','맑+꽃향기','맑+풀내음','맑+흙냄새','맑+불빛','높+봄','높+여름','높+가을','높+겨울','높+아침','높+저녁','높+달빛','높+햇살','높+바람결','높+물소리','높+새소리','높+꽃향기','높+풀내음','높+흙냄새','높+불빛','깊+봄','깊+여름','깊+가을','깊+겨울','깊+아침','깊+저녁','깊+달빛','깊+햇살','깊+바람결','깊+물소리','깊+새소리','깊+꽃향기','깊+풀내음','깊+흙냄새','깊+불빛','넓+봄','넓+여름','넓+가을','넓+겨울','넓+아침','넓+저녁','넓+달빛','넓+햇살','넓+바람결','넓+물소리','넓+새소리','넓+꽃향기','넓+풀내음','넓+흙냄새','넓+불빛','푸른봄','푸른여름','푸른가을','푸른겨울','푸른아침','푸른저녁','푸른달빛','푸른햇살','푸른바람결','푸른물소리','푸른새소리','푸른꽃향기','푸른풀내음','푸른흙냄새','푸른불빛','붉+봄','붉+여름','붉+가을','붉+겨울','붉+아침','붉+저녁','붉+달빛','붉+햇살','붉+바람결','붉+물소리','붉+새소리','붉+꽃향기','붉+풀내음','붉+흙냄새','붉+불빛','흰봄','흰여름','흰가을','흰겨울','흰아침','흰저녁','흰달빛','흰햇살','흰바람결','흰물소리','흰새소리','흰꽃향기','흰풀내음','흰흙냄새','흰불빛','검+봄','검+여름','검+가을','검+겨울','검+아침','검+저녁','검+달빛','검+햇살','검+바람결','검+물소리','검+새소리','검+꽃향기','검+풀내음','검+흙냄새','검+불빛','밝+봄','밝+여름','밝+가을','밝+겨울','밝+아침','밝+저녁','밝+달빛','밝+햇살','밝+바람결','밝+물소리','밝+새소리','밝+꽃향기','밝+풀내음','밝+흙냄새','밝+불빛','어두운봄','어두운여름','어두운가을','어두운겨울','어두운아침','어두운저녁','어두운달빛','어두운햇살','어두운바람결','어두운물소리','어두운새소리','어두운꽃향기','어두운풀내음','어두운흙냄새','어두운불빛','큰봄','큰여름','큰가을','큰겨울','큰아침','큰저녁','큰달빛','큰햇살','큰바람결','큰물소리','큰새소리','큰꽃향기','큰풀내음','큰흙냄새','큰불빛','작+봄','작+여름','작+가을','작+겨울','작+아침','작+저녁','작+달빛','작+햇살','작+바람결','작+물소리','작+새소리','작+꽃향기','작+풀내음','작+흙냄새','작+불빛','긴봄','긴여름','긴가을','긴겨울','긴아침','긴저녁','긴달빛','긴햇살','긴바람결','긴물소리','긴새소리','긴꽃향기','긴풀내음','긴흙냄새','긴불빛','짧+봄','짧+여름','짧+가을','짧+겨울','짧+아침','짧+저녁','짧+달빛','짧+햇살','짧+바람결','짧+물소리','짧+새소리','짧+꽃향기','짧+풀내음','짧+흙냄새','짧+불빛','새로운봄','새로운여름','새로운가을','새로운겨울','새로운아침','새로운저녁','새로운달빛','새로운햇살','새로운바람결','새로운물소리','새로운새소리','새로운꽃향기','새로운풀내음','새로운흙냄새','새로운불빛','가거도','가덕도','각시탈','간월도','강도','거문도','거북섬','경포대','고군산','곰소만','관매도','광안리','구봉도','국화도','굴업도','귀포','근흥','기도','기점소악도','꽃지','낙가산','낙도','남이섬','내연산','녹동','눌차도','다물도','달마산','당진포','대난지도','대부도','대이작도','덕적도','도덕섬','도초도','독거도','돌산도','동검도','두륜산','둔황','마안도','망월산','중국','미국','인도','러시아','브라질','일본','독일','영국','프랑스','이탈리아','캐나다','한국','호주','스페인','멕시코','인도네시아','네덜란드','사우디아라비아','터키','스위스','스웨덴','벨기에','아르헨티나','노르웨이','오스트리아','아랍에미리트','이스라엘','싱가포르','홍콩','태국','말레이시아','필리핀','베트남','파키스탄','방글라데시','이집트','나이지리아','남아프리카','케냐','에티오피아','모로코','알제리','이란','이라크','시리아','요르단','쿠웨이트','카타르','예멘','아프가니스탄','스리랑카','네팔','미얀마','캄보디아','몽골','카자흐스탄','우즈베키스탄','우크라이나','폴란드','체코','헝가리','루마니아','그리스','포르투갈','핀란드','덴마크','아일랜드','뉴질랜드','칠레','콜롬비아','페루','베네수엘라','쿠바','탄자니아','가나','르완다','앙골라','짐바브웨','나미비아','모잠비크','마다가스카르','카메룬','콩고','세네갈','베이징','워싱턴','뉴델리','모스크바','브라질리아','도쿄','베를린','런던','파리','로마','오타와','캔버라','마드리드','멕시코시티','자카르타','암스테르담','리야드','앙카라','베른','바르샤바','스톡홀름','브뤼셀','부에노스아이레스','오슬로','빈','아부다비','예루살렘','타이베이','방콕','쿠알라룸푸르','마닐라','하노이','이슬라마바드','다카','카이로','나이로비','아디스아바바','테헤란','바그다드','다마스쿠스','암만','도하','무스카트','카불','콜롬보','카트만두','울란바토르','타슈켄트','키이우','프라하','부다페스트','아테네','리스본','헬싱키','더블린','웰링턴','산티아고','보고타','리마','아바나','키갈리','루안다','광둥','쓰촨','저장','장쑤','산둥','허난','후베이','후난','허베이','푸젠','랴오닝','헤이룽장','지린','안후이','장시','산시','섬서','윈난','구이저우','광시','내몽골','티베트','신장','간쑤','칭하이','닝샤','하이난','마카오','캘리포니아','텍사스','플로리다','일리노이','펜실베이니아','오하이오','조지아','미시간','시베리아','우랄','캅카스','마하라슈트라','우타르프라데시','타밀나두','카르나타카','서벵골','상파울루주','리우데자네이루주','미나스제라이스','바이아','파라나','상하이','광저우','선전','청두','우한','시안','항저우','난징','쑤저우','칭다오','다롄','샤먼','쿤밍','하얼빈','정저우','지난','창사','선양','뉴욕','로스앤젤레스','시카고','휴스턴','댈러스','필라델피아','토론토','밴쿠버','몬트리올','맨체스터','에든버러','마르세유','리옹','보르도','함부르크','뮌헨','프랑크푸르트','밀라노','나폴리','피렌체','베네치아','바르셀로나','취리히','제네바','상트페테르부르크','노보시비르스크','뭄바이','방갈로르','하이데라바드','첸나이','콜카타','자이푸르','오사카','요코하마','나고야','교토','고베','후쿠오카','시드니','멜버른','상파울루','리우데자네이루','카사블랑카','두바이','이스탄불','카라치','라고스','요하네스버그','호치민','양곤','지명0275','지명0276','지명0277','지명0278','지명0279','지명0280','지명0281','지명0282','지명0283','지명0284','지명0285','지명0286','지명0287','지명0288','지명0289','지명0290','지명0291','지명0292','지명0293','지명0294','지명0295','지명0296','지명0297','지명0298','지명0299','지명0300','지명0301','지명0302','지명0303','지명0304','지명0305','지명0306','지명0307','지명0308','지명0309','지명0310','지명0311','지명0312','지명0313','지명0314','지명0315','지명0316','지명0317','지명0318','지명0319','지명0320','지명0321','지명0322','지명0323','지명0324','지명0325','지명0326','지명0327','지명0328','지명0329','지명0330','지명0331','지명0332','지명0333','지명0334','지명0335','지명0336','지명0337','지명0338','지명0339','지명0340','지명0341','지명0342','지명0343','지명0344','지명0345','지명0346','지명0347','지명0348','지명0349','지명0350','지명0351','지명0352','지명0353','지명0354','지명0355','지명0356','지명0357','지명0358','지명0359','지명0360','지명0361','지명0362','지명0363','지명0364','지명0365','지명0366','지명0367','지명0368','지명0369','지명0370','지명0371','지명0372','지명0373','지명0374','지명0375','지명0376','지명0377','지명0378','지명0379','지명0380','지명0381','지명0382','지명0383','지명0384','지명0385','지명0386','지명0387','지명0388','지명0389','지명0390','지명0391','지명0392','지명0393','지명0394','지명0395','지명0396','지명0397','지명0398','지명0399','지명0400','지명0401','지명0402','지명0403','지명0404','지명0405','지명0406','지명0407','지명0408','지명0409','지명0410','지명0411','지명0412','지명0413','지명0414','지명0415','지명0416','지명0417','지명0418','지명0419','지명0420','지명0421','지명0422','지명0423','지명0424','지명0425','지명0426','지명0427','지명0428','지명0429','지명0430','지명0431','지명0432','지명0433','지명0434','지명0435','지명0436','지명0437','지명0438','지명0439','지명0440','지명0441','지명0442','지명0443','지명0444','지명0445','지명0446','지명0447','지명0448','지명0449','지명0450','지명0451','지명0452','지명0453','지명0454','지명0455','지명0456','지명0457','지명0458','지명0459','지명0460','지명0461','지명0462','지명0463','지명0464','지명0465','지명0466','지명0467','지명0468','지명0469','지명0470','지명0471','지명0472','지명0473','지명0474','지명0475','지명0476','지명0477','지명0478','지명0479','지명0480','지명0481','지명0482','지명0483','지명0484','지명0485','지명0486','지명0487','지명0488','지명0489','지명0490','지명0491','지명0492','지명0493','지명0494','지명0495','지명0496','지명0497','지명0498','지명0499','지명0500','지명0501','지명0502','지명0503','지명0504','지명0505','지명0506','지명0507','지명0508','지명0509','지명0510','지명0511','지명0512','지명0513','지명0514','지명0515','지명0516','지명0517','지명0518','지명0519','지명0520','지명0521','지명0522','지명0523','지명0524','지명0525','지명0526','지명0527','지명0528','지명0529','지명0530','지명0531','지명0532','지명0533','지명0534','지명0535','지명0536','지명0537','지명0538','지명0539','지명0540','지명0541','지명0542','지명0543','지명0544','지명0545','지명0546','지명0547','지명0548','지명0549','지명0550','지명0551','지명0552','지명0553','지명0554','지명0555','지명0556','지명0557','지명0558','지명0559','지명0560','지명0561','지명0562','지명0563','지명0564','지명0565','지명0566','지명0567','지명0568','지명0569','지명0570','지명0571','지명0572','지명0573','지명0574','지명0575','지명0576','지명0577','지명0578','지명0579','지명0580','지명0581','지명0582','지명0583','지명0584','지명0585','지명0586','지명0587','지명0588','지명0589','지명0590','지명0591','지명0592','지명0593','지명0594','지명0595','지명0596','지명0597','지명0598','지명0599','지명0600','지명0601','지명0602','지명0603','지명0604','지명0605','지명0606','지명0607','지명0608','지명0609','지명0610','지명0611','지명0612','지명0613','지명0614','지명0615','지명0616','지명0617','지명0618','지명0619','지명0620','지명0621','지명0622','지명0623','지명0624','지명0625','지명0626','지명0627','지명0628','지명0629','지명0630','지명0631','지명0632','지명0633','지명0634','지명0635','지명0636','지명0637','지명0638','지명0639','지명0640','지명0641','지명0642','지명0643','지명0644','지명0645','지명0646','지명0647','지명0648','지명0649','지명0650','지명0651','지명0652','지명0653','지명0654','지명0655','지명0656','지명0657','지명0658','지명0659','지명0660','지명0661','지명0662','지명0663','지명0664','지명0665','지명0666','지명0667','지명0668','지명0669','지명0670','지명0671','지명0672','지명0673','지명0674','지명0675','지명0676','지명0677','지명0678','지명0679','지명0680','지명0681','지명0682','지명0683','지명0684','지명0685','지명0686','지명0687','지명0688','지명0689','지명0690','지명0691','지명0692','지명0693','지명0694','지명0695','지명0696','지명0697','지명0698','지명0699','지명0700','지명0701','지명0702','지명0703','지명0704','지명0705','지명0706','지명0707','지명0708','지명0709','지명0710','지명0711','지명0712','지명0713','지명0714','지명0715','지명0716','지명0717','지명0718','지명0719','지명0720','지명0721','지명0722','지명0723','지명0724','지명0725','지명0726','지명0727','지명0728','지명0729','지명0730','지명0731','지명0732','지명0733','지명0734','지명0735','지명0736','지명0737','지명0738','지명0739','지명0740','지명0741','지명0742','지명0743','지명0744','지명0745','지명0746','지명0747','지명0748','지명0749','지명0750','지명0751','지명0752','지명0753','지명0754','지명0755','지명0756','지명0757','지명0758','지명0759','지명0760','지명0761','지명0762','지명0763','지명0764','지명0765','지명0766','지명0767','지명0768','지명0769','지명0770','지명0771','지명0772','지명0773','지명0774','지명0775','지명0776','지명0777','지명0778','지명0779','지명0780','지명0781','지명0782','지명0783','지명0784','지명0785','지명0786','지명0787','지명0788','지명0789','지명0790','지명0791','지명0792','지명0793','지명0794','지명0795','지명0796','지명0797','지명0798','지명0799','지명0800','지명0801','지명0802','지명0803','지명0804','지명0805','지명0806','지명0807','지명0808','지명0809','지명0810','지명0811','지명0812','지명0813','지명0814','지명0815','지명0816','지명0817','지명0818','지명0819','지명0820','지명0821','지명0822','지명0823','지명0824','지명0825','지명0826','지명0827','지명0828','지명0829','지명0830','지명0831','지명0832','지명0833','지명0834','지명0835','지명0836','지명0837','지명0838','지명0839','지명0840','지명0841','지명0842','지명0843','지명0844','지명0845','지명0846','지명0847','지명0848','지명0849','지명0850','지명0851','지명0852','지명0853','지명0854','지명0855','지명0856','지명0857','지명0858','지명0859','지명0860','지명0861','지명0862','지명0863','지명0864','지명0865','지명0866','지명0867','지명0868','지명0869','지명0870','지명0871','지명0872','지명0873','지명0874','지명0875','지명0876','지명0877','지명0878','지명0879','지명0880','지명0881','지명0882','지명0883','지명0884','지명0885','지명0886','지명0887','지명0888','지명0889','지명0890','지명0891','지명0892','지명0893','지명0894','지명0895','지명0896','지명0897','지명0898','지명0899','지명0900','지명0901','지명0902','지명0903','지명0904','지명0905','지명0906','지명0907','지명0908','지명0909','지명0910','지명0911','지명0912','지명0913','지명0914','지명0915','지명0916','지명0917','지명0918','지명0919','지명0920','지명0921','지명0922','지명0923','지명0924','지명0925','지명0926','지명0927','지명0928','지명0929','지명0930','지명0931','지명0932','지명0933','지명0934','지명0935','지명0936','지명0937','지명0938','지명0939','지명0940','지명0941','지명0942','지명0943','지명0944','지명0945','지명0946','지명0947','지명0948','지명0949','지명0950','지명0951','지명0952','지명0953','지명0954','지명0955','지명0956','지명0957','지명0958','지명0959','지명0960','지명0961','지명0962','지명0963','지명0964','지명0965','지명0966','지명0967','지명0968','지명0969','지명0970','지명0971','지명0972','지명0973','지명0974','지명0975','지명0976','지명0977','지명0978','지명0979','지명0980','지명0981','지명0982','지명0983','지명0984','지명0985','지명0986','지명0987','지명0988','지명0989','지명0990','지명0991','지명0992','지명0993','지명0994','지명0995','지명0996','지명0997','지명0998','지명0999','지명1000','지명1001','지명1002','지명1003','지명1004','지명1005','지명1006','지명1007','지명1008','지명1009','지명1010','지명1011','지명1012','지명1013','지명1014','지명1015','지명1016','지명1017','지명1018','지명1019','지명1020','지명1021','지명1022','지명1023','지명1024','지명1025','지명1026','지명1027','지명1028','지명1029','지명1030','지명1031','지명1032','지명1033','지명1034','지명1035','지명1036','지명1037','지명1038','지명1039','지명1040','지명1041','지명1042','지명1043','지명1044','지명1045','지명1046','지명1047','지명1048','지명1049','지명1050','지명1051','지명1052','지명1053','지명1054','지명1055','지명1056','지명1057','지명1058','지명1059','지명1060','지명1061','지명1062','지명1063','지명1064','지명1065','지명1066','지명1067','지명1068','지명1069','지명1070','지명1071','지명1072','지명1073','지명1074','지명1075','지명1076','지명1077','지명1078','지명1079','지명1080','지명1081','지명1082','지명1083','지명1084','지명1085','지명1086','지명1087','지명1088','지명1089','지명1090','지명1091','지명1092','지명1093','지명1094','지명1095','지명1096','지명1097','지명1098','지명1099','지명1100','지명1101','지명1102','지명1103','지명1104','지명1105','지명1106','지명1107','지명1108','지명1109','지명1110','지명1111','지명1112','지명1113','지명1114','지명1115','지명1116','지명1117','지명1118','지명1119','지명1120','지명1121','지명1122','지명1123','지명1124','지명1125','지명1126','지명1127','지명1128','지명1129','지명1130','지명1131','지명1132','지명1133','지명1134','지명1135','지명1136','지명1137','지명1138','지명1139','지명1140','지명1141','지명1142','지명1143','지명1144','지명1145','지명1146','지명1147','지명1148','지명1149','지명1150','지명1151','지명1152','지명1153','지명1154','지명1155','지명1156','지명1157','지명1158','지명1159','지명1160','지명1161','지명1162','지명1163','지명1164','지명1165','지명1166','지명1167','지명1168','지명1169','지명1170','지명1171','지명1172','지명1173','지명1174','지명1175','지명1176','지명1177','지명1178','지명1179','지명1180','지명1181','지명1182','지명1183','지명1184','지명1185','지명1186','지명1187','지명1188','지명1189','지명1190','지명1191','지명1192','지명1193','지명1194','지명1195','지명1196','지명1197','지명1198','지명1199','지명1200','지명1201','지명1202','지명1203','지명1204','지명1205','지명1206','지명1207','지명1208','지명1209','지명1210','지명1211','지명1212','지명1213','지명1214','지명1215','지명1216','지명1217','지명1218','지명1219','지명1220','지명1221','지명1222','지명1223','지명1224','지명1225','지명1226','지명1227','지명1228','지명1229','지명1230','지명1231','지명1232','지명1233','지명1234','지명1235','지명1236','지명1237','지명1238','지명1239','지명1240','지명1241','지명1242','지명1243','지명1244','지명1245','지명1246','지명1247','지명1248','지명1249','지명1250','지명1251','지명1252','지명1253','지명1254','지명1255','지명1256','지명1257','지명1258','지명1259','지명1260','지명1261','지명1262','지명1263','지명1264','지명1265','지명1266','지명1267','지명1268','지명1269','지명1270','지명1271','지명1272','지명1273','지명1274','지명1275','지명1276','지명1277','지명1278','지명1279','지명1280','지명1281','지명1282','지명1283','지명1284','지명1285','지명1286','지명1287','지명1288','지명1289','지명1290','지명1291','지명1292','지명1293','지명1294','지명1295','지명1296','지명1297','지명1298','지명1299','지명1300','지명1301','지명1302','지명1303','지명1304','지명1305','지명1306','지명1307','지명1308','지명1309','지명1310','지명1311','지명1312','지명1313','지명1314','지명1315','지명1316','지명1317','지명1318','지명1319','지명1320','지명1321','지명1322','지명1323','지명1324','지명1325','지명1326','지명1327','지명1328','지명1329','지명1330','지명1331','지명1332','지명1333','지명1334','지명1335','지명1336','지명1337','지명1338','지명1339','지명1340','지명1341','지명1342','지명1343','지명1344','지명1345','지명1346','지명1347','지명1348','지명1349','지명1350','지명1351','지명1352','지명1353','지명1354','지명1355','지명1356','지명1357','지명1358','지명1359','지명1360','지명1361','지명1362','지명1363','지명1364','지명1365','지명1366','지명1367','지명1368','지명1369','지명1370','지명1371','지명1372','지명1373','지명1374','지명1375','지명1376','지명1377','지명1378','지명1379','지명1380','지명1381','지명1382','지명1383','지명1384','지명1385','지명1386','지명1387','지명1388','지명1389','지명1390','지명1391','지명1392','지명1393','지명1394','지명1395','지명1396','지명1397','지명1398','지명1399','지명1400','지명1401','지명1402','지명1403','지명1404','지명1405','지명1406','지명1407','지명1408','지명1409','지명1410','지명1411','지명1412','지명1413','지명1414','지명1415','지명1416','지명1417','지명1418','지명1419','지명1420','지명1421','지명1422','지명1423','지명1424','지명1425','지명1426','지명1427','지명1428','지명1429','지명1430','지명1431','지명1432','지명1433','지명1434','지명1435','지명1436','지명1437','지명1438','지명1439','지명1440','지명1441','지명1442','지명1443','지명1444','지명1445','지명1446','지명1447','지명1448','지명1449','지명1450','지명1451','지명1452','지명1453','지명1454','지명1455','지명1456','지명1457','지명1458','지명1459','지명1460','지명1461','지명1462','지명1463','지명1464','지명1465','지명1466','지명1467','지명1468','지명1469','지명1470','지명1471','지명1472','지명1473','지명1474','지명1475','지명1476','지명1477','지명1478','지명1479','지명1480','지명1481','지명1482','지명1483','지명1484','지명1485','지명1486','지명1487','지명1488','지명1489','지명1490','지명1491','지명1492','지명1493','지명1494','지명1495','지명1496','지명1497','지명1498','지명1499','지명1500','지명1501','지명1502','지명1503','지명1504','지명1505','지명1506','지명1507','지명1508','지명1509','지명1510','지명1511','지명1512','지명1513','지명1514','지명1515','지명1516','지명1517','지명1518','지명1519','지명1520','지명1521','지명1522','지명1523','지명1524','지명1525','지명1526','지명1527','지명1528','지명1529','지명1530','지명1531','지명1532','지명1533','지명1534','지명1535','지명1536','지명1537','지명1538','지명1539','지명1540','지명1541','지명1542','지명1543','지명1544','지명1545','지명1546','지명1547','지명1548','지명1549','지명1550','지명1551','지명1552','지명1553','지명1554','지명1555','지명1556','지명1557','지명1558','지명1559','지명1560','지명1561','지명1562','지명1563','지명1564','지명1565','지명1566','지명1567','지명1568','지명1569','지명1570','지명1571','지명1572','지명1573','지명1574','지명1575','지명1576','지명1577','지명1578','지명1579','지명1580','지명1581','지명1582','지명1583','지명1584','지명1585','지명1586','지명1587','지명1588','지명1589','지명1590','지명1591','지명1592','지명1593','지명1594','지명1595','지명1596','지명1597','지명1598','지명1599','지명1600','지명1601','지명1602','지명1603','지명1604','지명1605','지명1606','지명1607','지명1608','지명1609','지명1610','지명1611','지명1612','지명1613','지명1614','지명1615','지명1616','지명1617','지명1618','지명1619','지명1620','지명1621','지명1622','지명1623','지명1624','지명1625','지명1626','지명1627','지명1628','지명1629','지명1630','지명1631','지명1632','지명1633','지명1634','지명1635','지명1636','지명1637','지명1638','지명1639','지명1640','지명1641','지명1642','지명1643','지명1644','지명1645','지명1646','지명1647','지명1648','지명1649','지명1650','지명1651','지명1652','지명1653','지명1654','지명1655','지명1656','지명1657','지명1658','지명1659','지명1660','지명1661','지명1662','지명1663','지명1664','지명1665','지명1666','지명1667','지명1668','지명1669','지명1670','지명1671','지명1672','지명1673','지명1674','지명1675','지명1676','지명1677','지명1678','지명1679','지명1680','지명1681','지명1682','지명1683','지명1684','지명1685','지명1686','지명1687','지명1688','지명1689','지명1690','지명1691','지명1692','지명1693','지명1694','지명1695','지명1696','지명1697','지명1698','지명1699','지명1700','지명1701','지명1702','지명1703','지명1704','지명1705','지명1706','지명1707','지명1708','지명1709','지명1710','지명1711','지명1712','지명1713','지명1714','지명1715','지명1716','지명1717','지명1718','지명1719','지명1720','지명1721','지명1722','지명1723','지명1724','지명1725','지명1726','지명1727','지명1728','지명1729','지명1730','지명1731','지명1732','지명1733','지명1734','지명1735','지명1736','지명1737','지명1738','지명1739','지명1740','지명1741','지명1742','지명1743','지명1744','지명1745','지명1746','지명1747','지명1748','지명1749','지명1750','지명1751','지명1752','지명1753','지명1754','지명1755','지명1756','지명1757','지명1758','지명1759','지명1760','지명1761','지명1762','지명1763','지명1764','지명1765','지명1766','지명1767','지명1768','지명1769','지명1770','지명1771','지명1772','지명1773','지명1774','지명1775','지명1776','지명1777','지명1778','지명1779','지명1780','지명1781','지명1782','지명1783','지명1784','지명1785','지명1786','지명1787','지명1788','지명1789','지명1790','지명1791','지명1792','지명1793','지명1794','지명1795','지명1796','지명1797','지명1798','지명1799','지명1800','지명1801','지명1802','지명1803','지명1804','지명1805','지명1806','지명1807','지명1808','지명1809','지명1810','지명1811','지명1812','지명1813','지명1814','지명1815','지명1816','지명1817','지명1818','지명1819','지명1820','지명1821','지명1822','지명1823','지명1824','지명1825','지명1826','지명1827','지명1828','지명1829','지명1830','지명1831','지명1832','지명1833','지명1834','지명1835','지명1836','지명1837','지명1838','지명1839','지명1840','지명1841','지명1842','지명1843','지명1844','지명1845','지명1846','지명1847','지명1848','지명1849','지명1850','지명1851','지명1852','지명1853','지명1854','지명1855','지명1856','지명1857','지명1858','지명1859','지명1860','지명1861','지명1862','지명1863','지명1864','지명1865','지명1866','지명1867','지명1868','지명1869','지명1870','지명1871','지명1872','지명1873','지명1874','지명1875','지명1876','지명1877','지명1878','지명1879','지명1880','지명1881','지명1882','지명1883','지명1884','지명1885','지명1886','지명1887','지명1888','지명1889','지명1890','지명1891','지명1892','지명1893','지명1894','지명1895','지명1896','지명1897','지명1898','지명1899','지명1900','지명1901','지명1902','지명1903','지명1904','지명1905','지명1906','지명1907','지명1908','지명1909','지명1910','지명1911','지명1912','지명1913','지명1914','지명1915','지명1916','지명1917','지명1918','지명1919','지명1920','지명1921','지명1922','지명1923','지명1924','지명1925','지명1926','지명1927','지명1928','지명1929','지명1930','지명1931','지명1932','지명1933','지명1934','지명1935','지명1936','지명1937','지명1938','지명1939','지명1940','지명1941','지명1942','지명1943','지명1944','지명1945','지명1946','지명1947','지명1948','지명1949','지명1950','지명1951','지명1952','지명1953','지명1954','지명1955','지명1956','지명1957','지명1958','지명1959','지명1960','지명1961','지명1962','지명1963','지명1964','지명1965','지명1966','지명1967','지명1968','지명1969','지명1970','지명1971','지명1972','지명1973','지명1974','지명1975','지명1976','지명1977','지명1978','지명1979','지명1980','지명1981','지명1982','지명1983','지명1984','지명1985','지명1986','지명1987','지명1988','지명1989','지명1990','지명1991','지명1992','지명1993','지명1994','지명1995','지명1996','지명1997','지명1998','지명1999','지명2000','지명2001','지명2002','지명2003','지명2004','지명2005','지명2006','지명2007','지명2008','지명2009','지명2010','지명2011','지명2012','지명2013','지명2014','지명2015','지명2016','지명2017','지명2018','지명2019','지명2020','지명2021','지명2022','지명2023','지명2024','지명2025','지명2026','지명2027','지명2028','지명2029','지명2030','지명2031','지명2032','지명2033','지명2034','지명2035','지명2036','지명2037','지명2038','지명2039','지명2040','지명2041','지명2042','지명2043','지명2044','지명2045','지명2046','지명2047','지명2048'],
  es:['Ababuj','Abades','Abadiño','Abadía','Abadín','Abajas','Abala','Abaltzisketa','Abancay','Abangares','Abanilla','Abanto','Abapó','Abarca de Campos','Abarán','Abasolo','Abasolo del Valle','Abaurregaina/Abaurrea Alta','Abaurrepea/Abaurrea Baja','Abaí','Abdenago C. García','Abegondo','Abejar','Abejorral','Abejuela','Abelardo L. Rodríguez','Abella de la Conca','Abengibre','Abenójar','Aberin','Abertura','Abezames','Abia de la Obispalía','Abia de las Torres','Abiego','Abizanda','Abla','Ablanque','Ablitas','Abra Pampa','Abrego','Abrera','Abreus','Abrevadero','Abriaquí','Abrucena','Abusejo','Abáigar','Abánades','Abárzuza/Abartzuza','Acachuén','Acacoyagua','Acacías','Acahay','Acahuasco','Acahuizotla','Acajete','Acajutla','Acala','Acalco','Acalpican de Morelos','Acambay','Acamilpa','Acamixtla','Acanceh','Acandí','Acapetahua','Acapetlahuaya','Acaponeta','Acapulco de Juárez','Acarigua','Acarí','Acatempa','Acatempan','Acatenango','Acateno','Acatepec','Acatla','Acatlán','Acatlán de Juárez','Acatlán de Osorio','Acatlán de Pérez Figueroa','Acatzingo','Acaxochitlán','Acayuca','Acayucan','Acazónica','Acebedo','Acebo','Acedera','Aceguá','Acehúche','Aceituna','Acered','Aceuchal','Acevedo','Achacachi','Achichipico','Achiras','Achotal de Moreno','Achuapa','Achutupo','Achí','Acoapa','Acolla','Acolman de Netzahualcóyotl','Aconchi','Acontitla','Acopinalco del Peñón','Acosta','Acoxcatlán','Acoyapa','Acoyotla','Acteopan','Actipan','Actipan de Morelos','Actopan','Acuaco','Acuamanala','Acueducto Fraccionamiento','Acuexcomac','Acuitlapan','Acuitlapilco','Acuitzio','Acula','Aculco de Espinoza','Acultzingo','Acuítzio del Canje','Acxotla del Monte','Acxotla del Río','Acámbaro','Adahuesca','Adalia','Adamuz','Adanero','Adeje','Adelia María','Ademuz','Adiós','Adjuntas','Adjuntas del Río','Adobes','Adolfo Alsina','Adolfo Gonzáles Chaves','Adolfo López Mateos','Adolfo Moreno','Adolfo Ruiz Cortines','Adolfo Ruíz Cortines','Ador','Adra','Adrada de Haza','Adrada de Pirón','Adradas','Adrados','Adsubia','Aduana del Sásabe','Aduna','Adzaneta','Agaete','Agallas','Agalteca','Agiabampo Uno','Agolada','Agoncillo','Agost','Agostitlán','Agramunt','Agres','Agronomía','Agrícola Lázaro Cárdenas','Agrón','Agrónomos Mexicanos','Agua Azul','Agua Azul Rancho','Agua Bermeja','Agua Blanca','Agua Blanca Serranía','Agua Blanca Sur','Agua Buena','Agua Caliente','Agua Colorada','Agua Delgada','Agua Dulce','Agua Escondida','Agua Fría','Agua Gorda','Agua Nueva','Agua Paloma','Agua Prieta','Agua Rica','Agua Salada','Agua Santa del Yuna','Agua Señora','Agua Verde','Agua Zarca','Agua de Dios','Agua de Oro','Agua del Espino','Aguacatenango','Aguacatán','Aguachica','Aguada','Aguada de Pasajeros','Aguadas','Aguadilla','Aguadulce','Agualeguas','Agualeguas Nuevo León','Agualote','Aguanqueterique','Aguarón','Aguas Blancas','Aguas Buenas','Aguas Calientes','Aguas Corrientes','Aguas Cándidas','Aguas Verdes','Aguas del Padre','Aguasal','Aguascalientes','Aguatón','Aguaviva','Aguazul','Agudo','Aguilafuente','Aguilar de Bureba','Aguilar de Campoo','Aguilar de Campos','Aguilar de Codés','Aguilar de Segarra','Aguilar de la Frontera','Aguilar del Alfambra','Aguilar del Río Alhama','Aguilares','Aguilera','Aguililla','Aguilón','Agullana','Agullent','Agulo','Agustín Codazzi','Agustín de Iturbide','Agón','Agüero','Agüimes','Ahigal','Ahigal de Villarino','Ahigal de los Aceiteros','Ahillones','Ahome','Ahuacatitlán','Ahuacatlán','Ahuacatlán de Guadalupe','Ahuacatán','Ahuachapán','Ahuacuotzingo','Ahuajutla','Ahualulco de Mercado','Ahualulco del Sonido Trece','Ahuas','Ahuatempan','Ahuateno','Ahuatepec','Ahuatepec Pueblo','Ahuatepec de Camino','Ahuatitla','Ahuatlán','Ahuaxintitla','Ahuazotepec','Ahuehuepan','Ahuehuetitla','Ahuehuetitlán','Ahuehuetzingo','Ahuehueyo Primero Centro','Ahuetita de Abajo','Ahuexotitlán','Ahueyahualco','Ahuihuiyuco','Ahuirán','Ahuisculco','Ahumada','Aia','Aibar/Oibar','Aibonito','Aielo de Malferit','Aielo de Rugat','Aiguafreda','Aiguamúrcia','Aiguaviva','Aiguá','Aigües','Ailigandí','Ainzón','Aipe','Aiquile','Aires Puros','Aisa','Aitona','Aizarnazabal','Ajacuba','Ajalpan','Ajalvir','Ajamil','Ajamil de Cameros','Ajangiz','Ajijic','Ajilhó','Ajofrín','Ajuchitlancito','Ajuchitlán','Ajuchitlán del Progreso','Ajuno','Ajuterique','Akil','Akumal','Alacranes','Alacón','Aladrén','Alaejos','Alagón','Alagón del Río','Alaior','Alajeró','Alajuela','Alajuelita','Alamar','Alameda','Alameda de la Sagra','Alameda del Valle','Alamedilla','Alamillo','Alaminos','Alamús Els','Alange','Alanje','Alanís','Alaquines','Alaquàs','Alar del Rey','Alaraz','Alarba','Alarcón','Alarilla','Alaró','Alatoz','Alauca','Alausí','Alba','Alba Posse','Alba de Cerrato','Alba de Tormes','Alba de Yeltes','Albacete','Albagés L','Albaida','Albaida del Aljarafe','Albal','Albaladejo','Albaladejo del Cuende','Albalat de la Ribera','Albalat dels Sorells','Albalat dels Tarongers','Albalate de Cinca','Albalate de Zorita','Albalate de las Nogueras','Albalate del Arzobispo','Albalatillo','Albalá','Albanchez de Mágina','Albania','Albanyà','Albardón','Albares','Albarracín','Albarradas','Albarreal de Tajo','Albatana','Albatera','Albatàrrec','Albelda','Albelda de Iregua','Albendea','Albendiego','Albentosa','Alberic','Alberite','Alberite de San Juan','Albero Alto','Albero Bajo','Alberti','Alberto Carrera Torres','Alberto Villarreal','Alberuela de Tubo','Albesa','Albeta','Albi L','Albia','Albillos','Albino Zertuche','Albinyana','Albiol','Albiztur','Albocàsser','Alboloduy','Albolote','Albondón','Albons','Alborache','Alborada','Alborada Jaltenco','Alboraya','Alborea','Alborge','Albornos','Albox','Albudeite','Albuixech','Alburquerque','Albuñol','Albuñuelas','Albuñán','Albán','Albánchez','Alcabón','Alcadozo','Alcaine','Alcalalí','Alcalde Díaz','Alcalà de Xivert','Alcalá','Alcalá de Ebro','Alcalá de Guadaira','Alcalá de Gurrea','Alcalá de Henares','Alcalá de Moncayo','Alcalá de la Selva','Alcalá de la Vega','Alcalá de los Gazules','Alcalá del Júcar','Alcalá del Obispo','Alcalá del Río','Alcalá del Valle','Alcalá la Real','Alcampell','Alcanadre','Alcanar','Alcantarilla','Alcantud','Alcanó','Alcaracejos','Alcaraces','Alcaraz','Alcarràs','Alcaucín','Alcaudete','Alcaudete de la Jara','Alcazarén','Alcañices','Alcañiz','Alcañizo','Alcholoa','Alcoba','Alcobendas','Alcocer','Alcocer de Planes','Alcocero de Mola','Alcocéber','Alcohujate','Alcolea','Alcolea de Calatrava','Alcolea de Cinca','Alcolea de Tajo','Alcolea de las Peñas','Alcolea del Pinar','Alcolea del Río','Alcoleja','Alcoletge','Alcollarín','Alconaba','Alconada','Alconada de Maderuelo','Alconchel','Alconchel de Ariza','Alconchel de la Estrella','Alconera','Alcora l','Alcorcón','Alcorisa','Alcoroches','Alcover','Alcoy','Alcoy/Alcoi','Alcozacán','Alcozauca de Guerrero','Alcubierre','Alcubilla de Avellaneda','Alcubilla de Nogales','Alcubilla de las Peñas','Alcubillas','Alcublas','Alcudia de Monteagud','Alcudia de Veo','Alcuéscar','Alcàntera de Xúquer','Alcàsser','Alcántara','Alcázar de San Juan','Alcázar del Rey','Alcázares Los','Alcóntar','Alcúdia','Alcúdia de Crespins l','Alcúdia l','Aldaia','Aldama','Aldama Estación','Aldana','Aldea L','Aldea Real','Aldea San Antonio','Aldea de San Miguel','Aldea del Cano','Aldea del Fresno','Aldea del Obispo','Aldea del Rey','Aldea en Cabo','Aldeacentenera','Aldeacipreste','Aldeadávila de la Ribera','Aldealafuente','Aldealcorvo','Aldealengua','Aldealengua de Pedraza','Aldealengua de Santa María','Aldealices','Aldealpozo','Aldealseñor','Aldeamayor de San Martín','Aldeanueva de Barbarroya','Aldeanueva de Ebro','Aldeanueva de Figueroa','Aldeanueva de Guadalajara','Aldeanueva de San Bartolomé','Aldeanueva de Santa Cruz','Aldeanueva de la Serrezuela','Aldeanueva de la Sierra','Aldeanueva de la Vera','Aldeanueva del Camino','Aldeanueva del Codonal','Aldeaquemada','Aldearrodrigo','Aldearrubia','Aldeaseca','Aldeaseca de Alba','Aldeaseca de la Frontera','Aldeasoña','Aldeatejada','Aldeavieja de Tormes','Aldehorno','Aldehuela de Jerte','Aldehuela de Liestos','Aldehuela de Periáñez','Aldehuela de Yeltes','Aldehuela de la Bóveda','Aldehuela del Codonal','Aldeire','Aldeonte','Alderetes','Aldover','Aledo','Alegia','Alegría-Dulantzi','Aleixar','Alejandro Gallinal','Alejandro Roca','Alejandría','Alejo González (Bilbao)','Alejo Ledesma','Alella','Alentisque','Alerre','Alesanco','Alesón','Alfacar','Alfafar','Alfafara','Alfajarín','Alfajayucan','Alfambra','Alfamén','Alfara de Algimia','Alfara de Carles','Alfara de la Baronia','Alfara del Patriarca','Alfaraz de Sayago','Alfarnate','Alfarnatejo','Alfaro','Alfarp','Alfarrasí','Alfarràs','Alfauir','Alfondeguilla','Alfonso G. Calderón Velarde','Alfonso Moguel','Alfonso Reyes','Alforja','Alforque','Alfoz','Alfoz de Bricia','Alfoz de Lloredo','Alfoz de Quintanadueñas','Alfoz de Santa Gadea','Alfredo Baquerizo Moreno','Alfredo V. Bonfil','Alfàs del Pi l','Alfántega','Alfés','Algadefe','Algaida','Algar','Algar de Mesa','Algar de Palancia','Algarinejo','Algarra','Algarrobo','Algarrobos Arriba','Algatocín','Algeciras','Algemesí','Algerri','Algete','Algimia de Alfara','Algimia de Almonacid','Alginet','Algodonales','Algodre','Algora','Algorfa','Alguaire','Alguazas','Algueña','Algámitas','Alhabia','Alhama de Almería','Alhama de Aragón','Alhama de Granada','Alhama de Murcia','Alhambra','Alhaurín de la Torre','Alhaurín el Grande','Alhendín','Alhuaca','Alhuey','Alhóndiga','Aliaga','Aliaguilla','Alianza','Alianza Real','Alicante','Alicante/Alacant','Alicún','Alicún de Ortega','Alija del Infantado','Alins','Alique','Aliseda','Alista','Aliud','Alió','Aljaraque','Aljojuca','Aljucén','Alkiza','Allande','Allariz','Allen','Allende','Allepuz','Aller','Allo','Alloza','Allueva','Allín/Allin','Almacelles','Almadenejos','Almadrones','Almadén','Almadén de la Plata','Almafuerte','Almagres','Almagro','Almaguer','Almajano','Almaluez','Almansa','Almanza','Almaraz','Almaraz de Duero','Almargen','Almarza','Almarza de Cameros','Almassora','Almatret','Almazora/Almassora','Almazul','Almazán','Almecatla','Almedina','Almedinilla','Almedíjar','Almegíjar','Almeida','Almeida de Sayago','Almenar','Almenar de Soria','Almenara','Almenara de Adaja','Almenara de Tormes','Almendra','Almendral','Almendral de la Cañada','Almendralejo','Almendros','Almensilla','Almería','Almirante','Almirante Brown','Almiserà','Almochuel','Almodóvar del Campo','Almodóvar del Pinar','Almodóvar del Río','Almoguera','Almogía','Almohaja','Almoharín','Almoines','Almolonga','Almoloya','Almoloya de Alquisiras','Almoloya del Río','Almonacid de Toledo','Almonacid de Zorita','Almonacid de la Cuba','Almonacid de la Sierra','Almonacid del Marquesado','Almonaster la Real','Almonte','Almoradí','Almorox','Almoster','Almozara','Almudaina','Almudévar','Almunia de San Juan','Almuniente','Almuradiel','Almussafes','Almuñécar','Almàssera','Almáchar','Almócita','Alobras','Alocén','Alonsotegi','Alora','Alosno','Alotenango','Alovera','Alozaina','Alp','Alpachiri','Alpandeire','Alpanseque','Alpartir','Alpatláhuac','Alpedrete','Alpens','Alpera','Alpeñés','Alpicat','Alpoyeca','Alpuente','Alpujarra','Alpujarra de la Sierra','Alpuyeca','Alpuyecancingo de las Montañas','Alqueria d\'Asnar l','Alqueria de la Comtessa l','Alquerías del Niño Perdido','Alquife','Alquézar','Alquízar','Alsodux','Alt Àneu','Alta Gracia','Alta Italia','Altable','Altafulla','Altagracia','Altagracia de Orituco','Altamira','Altamira de Zináparo','Altamirano','Altarejos','Altata','Altavista de Ramos','Altea','Altepexi','Alto Barinas','Alto Baudó','Alto Biobío','Alto Boquete','Alto Hospicio','Alto Lucero','Alto Río Senguer','Alto de Jesús','Alto de La Estancia','Alto del Carmen','Alto del Espino','Altorricón','Altos','Altos Los','Altos de Chipión','Altos de San Francisco','Altos del Rosario','Altotonga','Altsasu','Altsasu/Alsasua','Altura','Altus Bosques','Altzaga','Altzayanca','Altzo','Alubarén','Aluminé','Alustante','Alvarado','Alvear','Alzira','Alàs i Cerc','Alájar','Alía','Alòs de Balaguer','Amacuautitlán','Amacueca','Amacuitlapilco','Amacuzac','Amado Gómez','Amado Nervo','Amagá','Amajaquillo','Amalfi','Amanalco de Becerra','Amancio','Amapa','Amapala','Amarete','Amatanejo','Amatenango de la Frontera','Amatenango del Valle','Amatepec','Amatillo','Amatitlán','Amatitlán de Azueta','Amatitán','Amatlán','Amatlán de Cañas','Amatlán de Quetzalcoatl','Amatlán de los Reyes','Amatán','Amavida','Amaxac de Guerrero','Amayuca','Amayuelas de Arriba','Amazcala','Ambalema','Ambato','Ambel','Ambite','Ambo','Ambrosio','Ambía','Amealco','Ameca','Ameca Municipality','Amecameca','Ameche','Ameluca','Amer','Ametlla de Mar','Ametlla del Vallès L','Ameyugo','Amezketa','Amieva','Amilcingo','Amina','Amixtlán','Amoeiro','Amorebieta-Etxano','Amoroto','Amozoc','Amozoc de Mota','Ampliación Tezoyuca','Ampliación de la Laguna','Ampliación la Hincada','Ampolla L','Amposta','Ampudia','Ampuero','Amuco de la Reforma','Amurrio','Amusco','Amusquillo','América Libre','Amés','Améscoa Baja','Anacleto Canabal 2da. Sección','Anacleto Canabal 3ra. Sección','Anaco','Anadón','Anahuac','Analco','Anamorós','Anapoima','Anaya','Anaya de Alba','Ancasti','Anchuelo','Anchuras','Ancud','Ancuya','Ancín','Ancín/Antzin','Ancón','Andacollo','Andahuaylas','Andalgalá','Andalucía','Andavías','Andes','Andilla','Andoain','Andoas','Andorra','Andosilla','Andratx','Andrés Quintana Roo','Andújar','Anenecuilco','Anento','Angahuán','Angamacutiro de la Unión','Angel R. Cabada','Angelópolis','Anglesola','Anglès','Angol','Angostura','Anguciana','Anguiano','Anguil','Anguita','Anguix','Angón','Angüés','Anievas','Animas Trujano','Aniñón','Anna','Anoca','Anoeta','Anolaima','Anorí','Anquela del Ducado','Anquela del Pedregal','Anserma','Ansermanuevo','Ansihuacuaro','Ansoáin/Antsoain','Ansó','Anta','Antas','Antas de Ulla','Antella','Antequera','Antigua','Antigua Guatemala','Antigua Ocotepeque','Antiguo Cuscatlán','Antiguo Morelos','Antigüedad','Antillón','Antofagasta','Antofagasta de la Sierra','Antonio Amaro','Antonio Escobedo','Antonio J Bermúdez','Antonio Rosales','Antuco','Antzuola','Antártica','Antón','Antón Lizardo','Antúnez','Antúnez (Morelos)','Anue','Anza','Anzoátegui','Anáhuac','Aoiz','Aoiz/Agoitz','Apacilagua','Apalani','Apan','Apango','Apango de Zaragoza','Apantla','Apantéopan','Apapantilla','Apapátaro','Apartadó','Apas','Apaseo el Alto','Apaseo el Grande','Apastepeque','Apatauyan','Apatzingán','Apaxco de Ocampo','Apaxtla','Apaxtla de Castrejón','Apazapan','Apazulco','Apeo','Apetatitlán Antonio Carbajal','Apipilulco','Apizaco','Apo','Apoala','Apodaca','Apoderado','Apolinario Saravia','Apopa','Aporo','Apozol','Apozol de Gutiérrez','Apulo','Aputzio de Juárez','Apía','Aquila','Aquiles Córdova Morán','Aquiles Serdán','Aquiles Serdán (San Fernando)','Aquiles Serdán 1ra. Sección','Aquismón','Aquitania','Aquixtla','Arabayona de Mógica','Aracataca','Aracena','Arada','Arafo','Aragua de Barcelona','Aragüés del Puerto','Arahal','Arahuetes','Araitz','Arakaldo','Arakil','Arama','Aramaio','Aramberri','Aramecina','Aranarache','Aranarache/Aranaratxe','Arancón','Aranda de Duero','Aranda de Moncayo','Arandas','Arandilla','Arandilla del Arroyo','Aranga','Aranguren','Arani','Aranjuez','Arano','Arantepacua','Arantza','Arantzazu','Aranza','Aranzazu','Aranzueque','Arapiles','Araró','Aras','Aras de los Olmos','Arata','Aratichanguío','Aratoca','Arauca','Arauco','Araulí','Arauquita','Araure','Arauzo de Miel','Arauzo de Salce','Arauzo de Torre','Arañuel','Arbancón','Arbeca','Arbeláez','Arbeteta','Arbizu','Arbo','Arbolada los Sauces','Arboleas','Arboleda','Arboledas','Arboletes','Arbolillo','Arbolí','Arboç','Arbúcies','Arcabuco','Arcas del Villar','Arce/Artzi','Arcediano','Arcelia','Arcelia de Rodríguez','Arcenillas','Archena','Archidona','Arcicóllar','Arcila','Arcinas','Arconada','Arcones','Arcos','Arcos Los','Arcos de Jalón','Arcos de la Frontera','Arcos de la Polvorosa','Arcos de la Sierra','Arcos de las Salinas','Ardales','Ardisa','Ardón','Areatza','Arecibo','Areguá','Arellano','Arena 1ra. Sección','Arena 6ta. Sección (La Bolsa)','Arena de Hidalgo','Arenal','Arenal Santa Ana','Arenales de San Gregorio','Arenas','Arenas de Iguña','Arenas de San Juan','Arenas de San Pedro','Arenas del Rey','Arenillas','Arenillas de Riopisuerga','Arenosa','Arenoso','Arens de Lledó','Arenys de Mar','Arenys de Munt','Arenzana de Abajo','Arenzana de Arriba','Arequipa','Ares','Ares del Maestrat','Ares del Maestre','Areso','Aretxabaleta','Arevalillo','Arevalillo de Cega','Argamasilla de Alba','Argamasilla de Calatrava','Arganda','Arganda del Rey','Arganza','Arganzuela','Argavieso','Argañín','Argecilla','Argelaguer','Argelia','Argelita','Argente','Argentera','Argentona','Argençola','Argoños','Arguedas','Arguis','Arguisuelas','Argujillo','Argés','Aria','Ariany','Arias','Aribe','Arica','Arico','Ariguaní','Arija','Arimatea','Arimís','Ario de Rayón','Ario de Rosales','Aristóbulo del Valle','Arivechi','Ariza','Arizona','Arizpe','Ariño','Arjona','Arjonilla','Arlanzón','Armallones','Armando Fernández Garza','Armañanzas','Armenia','Armenta','Armentera L','Armenteros','Armero','Armería','Armilla','Armiñón','Armstrong','Armuña','Armuña de Almanzora','Armuña de Tajuña','Arnedillo','Arnedo','Arnes','Arnoia A','Arnuero','Aroche','Arona','Arosemena','Arquillinos','Arquillos','Arrabalde','Arraia-Maeztu','Arraiján','Arrancacepas','Arrankudiaga','Arrasate/Mondragón','Arratzu','Arraya de Oca','Arrazua-Ubarrundia','Arrecife','Arrecifes','Arredondo','Arres','Arriaga','Arriate','Arrieta','Arrigorriaga','Arroba de los Montes','Arroyito','Arroyo','Arroyo Cabral','Arroyo Choápam','Arroyo Grande','Arroyo Granizo','Arroyo Hondo','Arroyo Hondo Abejonal','Arroyo Limón','Arroyo Naranjo','Arroyo Palenque','Arroyo Salado','Arroyo San Isidro','Arroyo Seco','Arroyo Vista Hermosa','Arroyo Zapotillo','Arroyo de Banco','Arroyo de Enmedio','Arroyo de San Serván','Arroyo de la Encomienda','Arroyo de la Luz','Arroyo de las Fraguas','Arroyo del Maíz Uno','Arroyo del Medio','Arroyo del Ojanco','Arroyo del Potrero','Arroyohondo','Arroyomolinos','Arroyomolinos de León','Arroyomolinos de la Vera','Arroyos','Arroyos y Esteros','Arruazu','Arrufó','Arróniz','Arrúbal','Arsèguel','Artajona','Artana','Artazu','Artea','Arteaga','Arteixo','Artemio Treviño','Artemisa','Artenara','Artesa de Lleida','Artesa de Segre','Artieda','Artigas','Arturo Martínez Adame','Artzentales','Artziniega','Artà','Artés','Arucas','Arvenza Uno','Arzúa','Arándiga','Arén','Arévalo','Arévalo de la Sierra','As Pontes de García Rodríguez','Ascención de Guarayos','Ascensión','Ascope','Ascó','Aserrí','Aserrío de Gariché','Asientos','Aspa','Aspariegos','Asparrena','Aspe','Astacinga','Astapa','Asteasu','Astigarraga','Astorga','Astrea','Astudillo','Asturianos','Asuncion','Asunción Cacalotepec','Asunción Ixtaltepec','Asunción Mita','Asunción Nochixtlán','Asunción Ocotlán','Asunción Tlacolulita','Asín','Atacco','Atacheo de Regalado','Ataco','Atahualpa','Atajate','Atalaya','Atalaya del Cañavate','Atalpan','Atamaría','Atanzón','Atapaneo','Atapuerca','Atapán','Ataquines','Atarfe','Atarjea','Atarjeas de Covarrubias','Atarrabia','Atasta','Ataun','Atea','Ateca','Atecax','Atemanica','Atempan','Atenango del Río','Atenas','Atenas de San Cristóbal','Atencingo','Atengo','Atenguillo','Atenxoxola','Atequiza','Atescatempa','Atexcal','Atexcatzingo','Atez','Aticama','Atienza','Atil','Atima','Atiquizaya','Atitalaquia','Atizapán','Atla','Atlacahualoya','Atlacholoaya','Atlacomulco de Fabela','Atlahuilco','Atlamajac','Atlamajalcingo del Río','Atlangatepec','Atlapexco','Atlatlahucan','Atlatongo','Atlautla','Atlequizayan','Atliaca','Atlixco','Atlixtac','Atlzayanca','Atlántida','Atocha','Atolinga','Atoluca','Atonalisco','Atongo','Atotonilco','Atotonilco de Tula','Atotonilco el Bajo','Atotonilco el Grande','Atotonilquillo','Atoyac','Atoyac de Álvarez','Atoyatempan','Atrato','Atuncolla','Atuntaqui','Atxondo','Atyrá','Atzacan','Atzacoaloya','Atzala','Atzalan','Atzalán','Atzcatlán','Atzeneta d\'Albaida','Atzeneta del Maestrat','Atzingo (La Cumbre)','Atzitzintla','Auas','Augusto Gómez Villanueva','Auka','Aulesti','Aurelio Manrique','Auritz/Burguete','Aurora Ermita','Aurora Esquipulas','Ausejo','Ausejo de la Sierra','Ausines Los','Autilla del Pino','Autillo de Campos','Autlán de Navarro','Autol','Aután','Auñón','Ave María','Aveinte','Avellaneda','Avellanosa de Muñó','Avilés','Avinyonet de Puigventós','Avinyonet del Penedès','Avinyó','Avià','Aviá Terai','Avión','Axapusco','Axaxacualco','Axixintla','Axochiapan','Axochío','Axotlán','Axtla de Terrazas','Axutla','Axuxco','Ayabaca','Ayacucho','Ayahualulco','Ayala','Ayala/Aiara','Ayamonte','Ayapa','Ayapango','Ayapel','Ayaviri','Ayegui','Ayegui/Aiegi','Ayerbe','Ayllón','Ayna','Ayometitla','Ayoquezco de Aldama','Ayora','Ayotitlán','Ayotla','Ayotlán','Ayotoxco de Guerrero','Ayotuxtla','Ayotzinapa','Ayotzintepec','Ayoó de Vidriales','Aysén','Ayuela','Ayuquila','Ayutla','Ayutla Jalisco','Ayutla de los Libres','Ayutuxtepeque','Ayódar','Azacualpa','Azagra','Azaila','Azanuy-Alins','Azara','Azcapotzalco','Azkoitia','Azlor','Aznalcázar','Aznalcóllar','Azofra','Azogues','Azoyú','Azpeitia','Azteca','Aztlán','Azua','Azuaga','Azuara','Azuelo','Azul','Azumbilla','Azuqueca de Henares','Azután','Azuébar','Azángaro','Aín','Aínsa','Aínsa-Sobrarbe','Añana','Añasco','Añatuya','Añe','Añelo','Añora','Añorbe','Añover de Tajo','Añover de Tormes','Añón de Moncayo','Babahoyo','Babilafuente','Baborigame','Baburia','Baca','Bacabachi','Bacabchén','Bacadéhuachi','Bacalar','Bacame Nuevo','Bacanora','Bacares','Bacerac','Bachajón','Bachigualatito','Bachoco','Bachomobampo Número Dos','Bachíniva','Bacobampo','Bacorehuis','Bacubirito','Badajoz','Badalona','Badarán','Badia del Vallès','Badiraguato','Badolatosa','Badules','Baells','Baena','Baeza','Bagaces','Bagadó','Bagojo Colectivo','Bagua Grande','Bagà','Bagüés','Bahabón','Bahabón de Esgueva','Bahuichivo','Bahía Asunción','Bahía Azul','Bahía Blanca','Bahía Honda','Bahía Solano','Bahía Tortugas','Bahía de Caráquez','Bahía de Kino','Bahía de Lobos','Baides','Bailo','Bailén','Baiona','Baitoa','Baix Pallars','Baja Mar','Bajo Baudó','Bajo Boquete','Bajo Corral','Bajos de Chila','Bajos de Haina','Bajos del Ejido','Bajucu','Bajío Seco','Bajío de Bonillas','Bajío de Ratones','Bajío de San José','Bajío de San Nicolás','Bakaiku','Bakio','Balaguer','Balancán','Balazote','Balbases Los','Balboa','Balcarce','Balconchán','Balcones de la Calera','Baldellou','Baleira','Balenyà','Balfate','Baliarrain','Ballesteros de Calatrava','Balleza','Ballobar','Balmaseda','Balnearia','Balones','Balsa de Ves','Balsareny','Baltanás','Baltar','Baltasar Brum','Balvanera','Balzar','Baláo','Bambamarca','Bamoa','Banastás','Banco Nacional','Bande','Banderas','Banderas del Águila','Banderilla','Banes','Bangandhó','Banus Vallarta','Banyalbufar','Banyeres de Mariola','Banyeres del Penedès','Banyoles','Baní','Baquerín de Campos','Bara de Chachalacas','Baracoa','Baradero','Baraguá','Barajas de Madrid','Barajas de Melo','Barakaldo','Baralla','Baranoa','Baraona','Baraya','Barañáin','Barbacoas','Barbadillo','Barbadillo de Herreros','Barbadillo del Mercado','Barbadillo del Pez','Barbadás','Barbalos','Barbarin','Barbastro','Barbate','Barbens','Barberena','Barberà de la Conca','Barberà del Vallès','Barbolla','Barbosa','Barbués','Barbuñales','Barca','Barcarrota','Barcelona','Barceloneta','Barceo','Barchín del Hoyo','Barcial de la Loma','Barcial del Barco','Barcience','Barco de Valdeorras O','Barcones','Bardallur','Bareyo','Bargas','Bargota','Barichara','Barillas','Barinas','Barinitas','Bariometo','Barjas','Barlovento','Barnizal','Barquisimeto','Barra Patuca','Barra de Carrasco','Barra de Cazones','Barra de Navidad','Barra de Tecoanapa','Barracas','Barrachina','Barraco','Barrado','Barranca','Barranca de Otates','Barranca de Santa Clara','Barranca de Upía','Barranca de los Laureles','Barranca del Tule','Barrancabermeja','Barrancas','Barrancas y Amate 3ra. Sección','Barranco','Barranco Adentro','Barranco Colorado','Barranco Minas','Barranco de Loba','Barranqueras','Barranquilla','Barranquitas','Barrax','Barreiros','Barretal','Barretos','Barrika','Barrio Aldamas','Barrio Aztlán','Barrio Bordo Nuevo','Barrio Chiquichuca','Barrio Cuarto (La Loma)','Barrio Guadalupe','Barrio Nuevo','Barrio Nuevo de los Muertos','Barrio San Diego','Barrio San Joaquín el Junco','Barrio San Miguel Dorami','Barrio Santa Cruz','Barrio Sur','Barrio Tlatenco','Barrio de Boyecha','Barrio de Canales','Barrio de Centro del Cerrillo','Barrio de Ensido','Barrio de España','Barrio de Guadalupe','Barrio de Jalisco','Barrio de Muñó','Barrio de México','Barrio de Nuevo León','Barrio de Puentecillas','Barrio de Reyes','Barrio de San Isidro','Barrio de San Juan','Barrio de San Miguel','Barrio de San Ramón','Barrio de Tapias','Barrio de la Barranca','Barrio de la Concepción','Barrio del Cajón','Barrio el Boncho','Barrio el Vivero','Barrio la Joya','Barrio la Tenería','Barrio los Tules','Barriopedro','Barrios Los','Barrios de Bureba Los','Barrios de Colina','Barrios de Luna Los','Barro','Barromán','Barros Blancos','Barruecopardo','Barruelo de Santullán','Barruelo del Valle','Barrundia','Barrón','Bartolomé Masó','Baruta','Barva','Barx','Barxeta','Barásoain','Basaburua','Basail','Basardilla','Basaseachic','Basauri','Basconcillos del Tozo','Basconcobe','Bascuñana','Bascuñana de San Pedro','Bassella','Bastimentos','Basúchil','Batabanó','Batallas','Batea','Baterno','Batopilas','Batres','Batán','Bausen','Bauta','Bautista Chico','Bavispe','Bayaguana','Bayamo','Bayamón','Bayano','Bayarque','Bayubas de Abajo','Bayubas de Arriba','Bayárcal','Baza','Baztan','Baña A','Bañados de Carrasco','Bañares','Bañobárez','Baños','Baños de Ebro/Mañueta','Baños de Molgas','Baños de Montemayor','Baños de Rioja','Baños de Río Tobía','Baños de Tajo','Baños de Valdearados','Baños de la Encina','Bañuelos','Bañuelos de Bureba','Bañón','Bea','Beade','Beamud','Beariz','Beas','Beas de Granada','Beas de Guadix','Beas de Segura','Beasain','Becanchén','Becedas','Becedillas','Beceite','Becerreá','Becerril','Becerril de Campos','Becerril de la Sierra','Becilla de Valderaduey','Bedia','Bedmar y Garcíez','Begonte','Begues','Begur','Begíjar','Beintza-Labaien','Beire','Beires','Beizama','Bejucal','Bejucal de Ocampo','Bejuco','Bejucos','Bejís','Belalcázar','Belascoáin','Belauntza','Belbimbre','Belchite','Belem','Belem del Refugio','Beleña','Belgrano','Belianes','Belinchón','Belisario Domínguez','Bell Ville','Bell-lloc d\'Urgell','Bella Esperanza','Bella Italia','Bella Unión','Bella Vista','Bella Vista del Río','Bellaguarda','Bellas Fuentes','Bellavista','Bellcaire d\'Empordà','Bellcaire d\'Urgell','Bellmunt d\'Urgell','Bellmunt del Priorat','Bello','Bello Amanecer','Bellprat','Bellpuig','Bellreguard','Bellvei','Bellver de Cerdanya','Bellvís','Bellús','Belmira','Belmonte','Belmonte de Campos','Belmonte de Gracián','Belmonte de Miranda','Belmonte de San José','Belmonte de Tajo','Belmontejo','Belorado','Beltrán','Belvedere','Belver de Cinca','Belver de los Montes','Belvis de la Jara','Belvís de Monroy','Belén','Belén Atzitzimititlán','Belén Gualcho','Belén de Los Andaquies','Belén de Umbría','Bembibre','Benabarre','Benacazón','Benadalid','Benafarces','Benafer','Benafigos','Benaguasil','Benagéber','Benahadux','Benahavís','Benalauría','Benalmádena','Benalup-Casas Viejas','Benalúa','Benalúa de las Villas','Benamargosa','Benamaurel','Benamejí','Benamocarra','Benaocaz','Benaoján','Benarrabá','Benasal','Benasau','Benasque','Benassal','Benatae','Benavarri / Benabarre','Benavent de Segrià','Benavente','Benavides','Benavites','Benegiles','Beneixama','Beneixida','Benejúzar','Benemérito Juárez','Benemérito de las Américas','Benetússer','Benferri','Beniarbeig','Beniardá','Beniarjó','Beniarrés','Beniatjar','Benicarló','Benicasim/Benicàssim','Benicolet','Benicull de Xúquer','Benicàssim','Benidoleig','Benidorm','Beniel','Benifairó de la Valldigna','Benifairó de les Valls','Benifaió','Benifallet','Benifallim','Benifato','Beniflá','Benigembla','Benigànim','Benijofar','Benilloba','Benillup','Benimantell','Benimarfull','Benimassot','Benimeli','Benimodo','Benimuslem','Beniparrell','Benirredrà','Benisanó','Benissa','Benissanet','Benissoda','Benisuera','Benitachell','Benitagla','Benito García (El Zorrillo)','Benito González','Benito Juarez','Benito Juárez','Benito Juárez (La Playita)','Benito Juárez (Vinatería)','Benito Juárez II (San Martín)','Benito Juárez Uno','Benizalón','Benjamín Aceval','Benjamín Hill','Benlloch','Benquerencia','Benquerencia de la Serena','Bentarique','Benuza','Bera'],
  fr:['Aadorf','Aalst','Aalter','Aarau','Aarberg','Aarburg','Aarschot','Aartselaar','Aarwangen','Abainville','Abalak','Abbaretz','Abbeville','Abeilhan','Abengourou','Abeïbara','Abidjan','Abilly','Ablain-Saint-Nazaire','Ableiges','Ablis','Ablon','Ablon-sur-Seine','Abobo','Aboisso','Abomey','Abomey-Calavi','Abondance','Abondant','Abong Mbang','Abreschviller','Abrest','Abscon','Abzac','Achenheim','Achicourt','Achiet-le-Grand','Achères','Achères-la-Forêt','Acigné','Acquarossa','Acquigny','Adelboden','Adiaké','Adligenswil','Adliswil','Adliswil / Hündli-Zopf','Adliswil / Oberleimbach','Adliswil / Sonnenberg','Adliswil / Sood','Adliswil / Tal','Adzopé','Adéane','Aesch','Aeschi b. Spiez','Afa','Affeltrangen','Affery','Affoltern / Hasenbüel','Affoltern / Oberdorf','Affoltern / Sonnenberg','Affoltern / Unterdorf','Affoltern am Albis','Agadez','Agboville','Agde','Agen','Ageville','Aghione','Agneaux','Agnetz','Agnibilékrou','Agno','Agny','Agnéby-Tiassa','Agon-Coutainville','Agonac','Aguié','Ahetze','Ahuillé','Ahun','Ahuy','Aiffres','Aigle','Aigle District','Aiglemont','Aigné','Aigre','Aigrefeuille-sur-Maine','Aigremont','Aigueblanche','Aiguefonde','Aigueperse','Aigues-Mortes','Aigues-Vives','Aiguillon','Aigurande','Aillant-sur-Tholon','Aillevillers-et-Lyaumont','Aillianville','Ailly-sur-Noye','Ailly-sur-Somme','Aimargues','Aime','Ainay-le-Château','Aincreville','Aingoulaincourt','Airaines','Aire-la-Ville','Aire-sur-la-Lys','Airolo','Airvault','Aiseau','Aiserey','Aiti','Aiton','Aix-Noulette','Aix-en-Othe','Aix-en-Provence','Aix-les-Bains','Aixe-sur-Vienne','Aizanville','Aizenay','Ajaccio','Ajain','Aketi','Akom II','Akono','Akonolinga','Akoupé','Alaghsas','Alando','Alata','Alba-la-Romaine','Albaret-Sainte-Marie','Albaret-le-Comtal','Albens','Albert','Albertacce','Albertville','Albi','Albias','Albigny-sur-Saône','Albitreccia','Alby-sur-Chéran','Alençon','Alfortville','Algajola','Algolsheim','Algrange','Alignan-du-Vent','Alissas','Alixan','Alizay','Alken','Allada','Allaire','Allan','Allanche','Allassac','Allauch','Alle','Alleins','Allenc','Allennes-les-Marais','Allevard','Allex','Allichamps','Allinges','Allières-et-Risset','Allonne','Allonnes','Allonzier-la-Caille','Allouagne','Allschwil','Allègre','Alpes-Maritimes','Alpes-de-Haute-Provence','Alpnach','Alsting','Altagène','Altdorf','Altendorf','Alterswil','Althen-des-Paluds','Altiani','Altier','Altishofen','Altkirch','Altnau','Altorf','Altstätten','Alveringem','Alzi','Alzonne','Alès','Alénya','Aléria','Amancy','Amanlis','Amanty','Amanvillers','Amay','Ambam','Ambarès-et-Lagrave','Ambazac','Ambert','Ambiegna','Ambierle','Ambillou','Amblainville','Ambleny','Ambleteuse','Ambly-sur-Meuse','Amblève','Amboise','Ambon','Ambonville','Ambrières-les-Vallées','Ambronay','Ambès','Ambérieu-en-Bugey','Ambérieux-en-Dombes','Amden','Amel-sur-l\'Étang','Amfreville','Amfreville-la-Mi-Voie','Amiens','Amilly','Amlamé','Ammerschwihr','Amnéville','Amou','Amplepuis','Ampriani','Ampuis','Amriswil','Ancemont','Ancenis','Ancerville','Ancy-le-Franc','Ancy-sur-Moselle','Ancône','Andance','Andancette','Andard','Andelfingen','Andelnans','Andelot-Blancheville','Andenne','Anderlues','Andermatt','Andernay','Andernos-les-Bains','Andeville','Andilly','Andilly-en-Bassigny','Andlau','Andolsheim','Andouillé','Andres','Andrest','Andrezé','Andrésy','Andrézieux-Bouthéon','Anduze','Andwil','Andé','Anet','Anetz','Angers','Angerville','Angerville-l’Orcher','Angervilliers','Angevillers','Angicourt','Angles','Anglet','Angoulins','Angoulême','Angres','Angresse','Angy','Anhiers','Anhée','Aniane','Aniche','Anizy-le-Château','Anières','Annay','Annecy','Annecy-le-Vieux','Annemasse','Annequin','Annesse-et-Beaulieu','Annet-sur-Marne','Anneyron','Annezin','Annoeullin','Annonay','Annonville','Annot','Annéville-la-Prairie','Anor','Anould','Anrosey','Ans','Ansauvillers','Anse','Ansongo','Ansouis','Anstaing','Anthisnes','Anthy-sur-Léman','Antibes','Antigny','Antisanti','Antoing','Antonne-et-Trigonant','Antony','Antrain','Antran','Antrenas','Antwerpen','Anyama','Anzegem','Anzin','Anzin-Saint-Aubin','Aného','Aoste','Aouste-sur-Sye','Appenzell','Appietto','Apples','Appoigny','Apprieu','Apremont','Apremont-la-Forêt','Aprey','Apt','Aramon','Araouane','Arbellara','Arbent','Arbigny-sous-Varennes','Arbois','Arbon','Arbon District','Arbonne','Arbonne-la-Forêt','Arbori','Arbot','Arbouans','Arbus','Arc-en-Barrois','Arc-et-Senans','Arc-lès-Gray','Arc-sur-Tille','Arcachon','Arcangues','Arcey','Arch','Archamps','Arches','Archettes','Archigny','Arcis-sur-Aube','Arcueil','Ardennes','Ardentes','Ardin','Ardon','Ardooie','Ardres','Aregno','Arenc','Arendonk','Arenthon','Arette','Argancy','Argelers','Argeliers','Argelès-Gazost','Argences','Argent-sur-Sauldre','Argentan','Argentat','Argenteuil','Argenton-les-Vallées','Argenton-sur-Creuse','Argentré','Argentré-du-Plessis','Argiusta-Moriccio','Arinthod','Arisdorf','Aristau','Arlanc','Arles','Arlesheim','Arleux','Arlit','Arlon','Armbouts-Cappel','Armenonville-les-Gâtineaux','Armentières','Armentières-en-Brie','Armissan','Armoy','Arnac-Pompadour','Arnac-la-Poste','Arnage','Arnancourt','Arnas','Arnay-le-Duc','Arnières-sur-Iton','Arnouville','Arnèke','Aron','Arosa','Arpajon','Arpajon-sur-Cère','Arques','Arques-la-Bataille','Arradon','Arrah','Arrancy-sur-Crusnes','Arras','Arro','Arrou','Ars-en-Ré','Ars-sur-Formans','Ars-sur-Moselle','Arsac','Art-sur-Meurthe','Artannes-sur-Indre','Artas','Artemare','Artenay','Arth','Arthaz-Pont-Notre-Dame','Arthez-de-Béarn','Arthon','Arthon-en-Retz','Arthès','Artiguelouve','Artigues-près-Bordeaux','Artix','Artres','Arudy','Arvert','Arveyres','Arvigo','Arzano','Arzenc-d\'Apcher','Arzenc-de-Randon','Arzens','Arzier','Arzo','Arzon','Arâches-la-Frasse','Arçonnay','Arès','As','Ascain','Aschères-le-Marché','Asco','Ascona','Asnières-sur-Nouère','Asnières-sur-Oise','Asnières-sur-Seine','Aspach','Aspach-le-Bas','Aspach-le-Haut','Aspet','Aspiran','Aspremont','Assas','Assat','Asse','Assenede','Assesse','Asson','Assérac','Astaffort','Atakpamé','Ath','Athies-sous-Laon','Athis-Mons','Athis-de-l\'Orne','Athée-sur-Cher','Attainville','Attalens','Attancourt','Attert','Attiches','Attichy','Attignat','Attigny','Attinghausen','Attiswil','Atur','Au','Au / Mittel-Dorf','Au / Unter-Dorf','Aubagne','Aubais','Aubange','Aube-sur-Rîle','Aubel','Aubenas','Aubepierre-sur-Aube','Auberchicourt','Aubergenville','Auberive','Auberives-sur-Varèze','Aubers','Aubervilliers','Aubevoye','Aubie-et-Espessas','Aubiet','Aubignan','Aubigny','Aubigny-au-Bac','Aubigny-en-Artois','Aubigny-sur-Nère','Aubigné-Racan','Aubin','Aubière','Aubonne','Aubord','Auboué','Aubry-du-Hainaut','Aubréville','Aubusson','Auby','Aucamville','Auch','Auchel','Auchy-les-Mines','Auchy-lès-Hesdin','Audeloncourt','Audenge','Audierne','Audincourt','Audruicq','Audun-le-Roman','Audun-le-Tiche','Auffargis','Auffay','Augan','Augny','Augy','Aujeurres','Aullène','Aulnat','Aulnay','Aulnay-sous-Bois','Aulnay-sur-Mauldre','Aulnois-en-Perthois','Aulnois-sous-Laon','Aulnoy-lez-Valenciennes','Aulnoy-sur-Aube','Aulnoye-Aymeries','Ault','Aumale','Aumetz','Aumont-Aubrac','Aunay-sous-Auneau','Aunay-sur-Odon','Auneau','Auneuil','Aups','Auray','Aurec-sur-Loire','Aureilhan','Aureille','Auriac-sur-Vendinelle','Auribeau-sur-Siagne','Aurignac','Aurillac','Auriol','Auroux','Aussillon','Aussonne','Auterive','Authie','Authon-du-Perche','Autigny-le-Grand','Autigny-le-Petit','Autrans','Autreville-sur-la-Renne','Autry-le-Châtel','Autrécourt-sur-Aire','Autréville-Saint-Lambert','Autun','Auvernier','Auvers-Saint-Georges','Auvers-le-Hamon','Auvers-sur-Oise','Auvillar','Auw','Auxerre','Auxi-le-Château','Auxon-Dessous','Auxonne','Auxy','Auzances','Auzat-la-Combelle','Auzebosc','Auzeville-Tolosane','Auzielle','Auzouer-en-Touraine','Availles-Limouzine','Avallon','Avanne-Aveney','Avanton','Avapessa','Aveize','Aveizieux','Avelgem','Avelin','Avenches','Avensan','Avermes','Avesnelles','Avesnes-le-Comte','Avesnes-le-Sec','Avesnes-les-Aubert','Avessac','Avignon','Avignonet-Lauragais','Avillers-Sainte-Croix','Avilly-Saint-Léonard','Avion','Avioth','Aviron','Avize','Avocourt','Avoine','Avon','Avord','Avranches','Avrechy','Avrecourt','Avrillé','Avry-sur-Matran','Avèze','Awans','Ax-les-Thermes','Ay','Ay-sur-Moselle','Ayamé','Aydat','Aydoilles','Ayent','Ayguemorte-les-Graves','Ayguesvives','Ayorou','Ayron','Ayse','Aytré','Aywaille','Azannes-et-Soumazannes','Azay-le-Brûlé','Azay-le-Ferron','Azay-le-Rideau','Azay-sur-Cher','Azille','Azilone-Ampaza','Azzana','Azé','Baar','Baarle-Hertog','Babanki','Baccarat','Bachant','Bachenbülach','Bachy','Bacqueville-en-Caux','Bad Ragaz','Bad Zurzach','Badaroux','Baden','Badonviller','Badonvilliers-Gérauvilliers','Badou','Baelen','Bafang','Bafia','Bafilo','Bafing','Bafoulabé','Bafoussam','Bagard','Bages','Bagnac-sur-Célé','Bagneaux-sur-Loing','Bagnes','Bagneux','Bagnoles-de-l\'Orne','Bagnolet','Bagnols-en-Forêt','Bagnols-sur-Cèze','Bagnères-de-Bigorre','Bagnères-de-Luchon','Bagoué','Baguer-Morvan','Baguer-Pican','Baho','Baignes-Sainte-Radegonde','Baillargues','Baille','Bailleau-le-Pin','Bailleau-l’Évêque','Baillet-en-France','Bailleul','Bailleul-Sir-Berthoult','Bailleul-sur-Thérain','Bailleval','Bailly','Bailly-Carrois','Bailly-Romainvilliers','Bailly-aux-Forges','Bain-de-Bretagne','Baincthun','Bains','Bains-les-Bains','Bains-sur-Oust','Bainville-sur-Madon','Bais','Baisieux','Baissey','Baixas','Balagny-sur-Thérain','Balan','Balaruc-le-Vieux','Balaruc-les-Bains','Balazé','Balbigny','Baldersheim','Balen','Balerna','Balgach','Bali','Ballainvilliers','Ballaison','Ballan-Miré','Ballancourt-sur-Essonne','Ballens','Balleyara','Ballon','Ballots','Ballwil','Balma','Balogna','Balsièges','Balsthal','Baltschieder','Balzac','Bamako','Bamenda','Bamendjou','Bamusso','Ban-de-Laveline','Bana','Banamba','Banassac-Canilhac','Bandiagara','Bandjoun','Bandol','Bandundu','Banfora','Bangangté','Bangolo','Banikoara','Bankim','Bannalec','Bannes','Bannoncourt','Bansoa','Bantheville','Bantzenheim','Banyo','Banyuls de la Marenda','Banyuls-dels-Aspres','Bapaume','Bar-le-Duc','Bar-sur-Aube','Bar-sur-Seine','Barani','Baraqueville','Barbaggio','Barbaste','Barbazan-Debat','Barbechat','Barbentane','Barberaz','Barbezieux-Saint-Hilaire','Barbizon','Barby','Barbâtre','Barcelonne-du-Gers','Barcelonnette','Bardos','Barentin','Barenton','Bargemon','Barjac','Barjols','Barjouville','Barlin','Barneville-Carteret','Barneville-Plage','Baroueli','Barr','Barraux','Barre-des-Cévennes','Barrettali','Barsac','Bart','Bartenheim','Bas-Rhin','Bas-Vully','Bas-en-Basset','Basel','Basoko','Bassan','Bassar','Basse Lasne','Basse-Goulaine','Basse-Ham','Basse-Nendaz','Bassecourt','Bassenge','Bassens','Bassersdorf','Bassila','Bassillac','Bassoncourt','Bassurels','Bassussarry','Bastelica','Bastelicaccia','Bastia','Bastogne','Batibo','Batilly','Batié','Batouri','Battenheim','Batz-sur-Mer','Baud','Baudonvilliers','Baudrecourt','Baudrémont','Bauen','Baugy','Baugé-en-Anjou','Baule','Baulne','Baulny','Baulon','Bauma','Baume-les-Dames','Bauné','Bauvin','Bavans','Bavay','Bavent','Bavilliers','Bavois','Bay-sur-Aube','Bayard-sur-Marne','Bayeux','Bayon','Bayonne','Bazainville','Bazancourt','Bazas','Bazega','Bazeilles','Bazeilles-sur-Othain','Bazemont','Bazet','Bazincourt-sur-Saulx','Baziège','Bazoches-les-Gallerandes','Bazoges-en-Pareds','Bazou','Bazouges-la-Pérouse','Bazouges-sur-le-Loir','Baâlon','Beatenberg','Beaucaire','Beaucamps-le-Vieux','Beauchamp','Beauchamps','Beauchastel','Beauchemin','Beauclair','Beaucourt','Beaucouzé','Beaucroissant','Beaucé','Beaufay','Beaufort','Beaufort-en-Argonne','Beaufort-en-Vallée','Beaugency','Beaujeu','Beaulieu','Beaulieu-en-Argonne','Beaulieu-lès-Loches','Beaulieu-sous-la-Roche','Beaulieu-sur-Dordogne','Beaulieu-sur-Layon','Beaulieu-sur-Mer','Beaulon','Beaumes-de-Venise','Beaumetz-lès-Loges','Beaumont','Beaumont-Hague','Beaumont-Monteux','Beaumont-de-Lomagne','Beaumont-de-Pertuis','Beaumont-du-Gâtinais','Beaumont-du-Périgord','Beaumont-en-Verdunois','Beaumont-en-Véron','Beaumont-la-Ronce','Beaumont-le-Roger','Beaumont-lès-Valence','Beaumont-sur-Lèze','Beaumont-sur-Oise','Beaumont-sur-Sarthe','Beaune','Beaune-la-Rolande','Beaupréau','Beaupuy','Beauquesne','Beauraing','Beaurains','Beaurainville','Beaurepaire','Beaurevoir','Beausemblant','Beausite','Beausoleil','Beautiran','Beautor','Beauvais','Beauval','Beauvallon','Beauvechain','Beauvoir-de-Marc','Beauvoir-sur-Mer','Beauvoir-sur-Niort','Beauvois-en-Cambrésis','Beauvoisin','Beauzac','Beauzelle','Beckenried','Beernem','Beerse','Beersel','Begijnendijk','Begnins','Behonne','Behren-lès-Forbach','Beignon','Bekkevoort','Bekondo','Bel-Air-Val-d\'Ance','Belberaud','Belbeuf','Belcodène','Belfaux','Belfort','Belgentier','Belgodère','Belin-Béliet','Bellac','Bellaing','Belle de Mai','Belle-Isle-en-Terre','Belle-Plagne','Bellegarde','Bellegarde-en-Forez','Bellegarde-sur-Valserine','Bellenaves','Belleneuve','Bellengreville','Belleray','Bellerive-sur-Allier','Belleu','Bellevaux','Belleville','Belleville-sur-Loire','Belleville-sur-Meuse','Belleville-sur-Vie','Bellevue','Belley','Bellignat','Belligné','Bellinzona','Bellinzona District','Bellmund','Belloy-en-France','Bellême','Belmont','Belmont-de-la-Loire','Belmont-sur-Lausanne','Belmont-sur-Rance','Belo','Beloeil','Belp','Belpech','Belrain','Belrupt-en-Verdunois','Belsunce','Belvès','Belvédère-Campomoro','Belz','Bembèrèkè','Benet','Beney-en-Woëvre','Benfeld','Benglen','Beni','Benken','Bennecourt','Bennwihr','Benquet','Berck','Berck-Plage','Berg','Bergerac','Bergheim','Bergholtz','Bergues','Berikon','Beringen','Berlaar','Berlaimont','Berlare','Berloz','Bern','Bern-Mittelland','Bernardswiller','Bernaville','Bernay','Bernes-sur-Oise','Berneval-le-Grand','Bernex','Bernin','Bernis','Bernissart','Bernières-sur-Mer','Berné','Berolle','Beromünster','Berre-l\'Étang','Berre-les-Alpes','Berric','Berrien','Berrwiller','Berson','Berstett','Bersée','Berteaucourt-les-Dames','Bertem','Berthecourt','Bertogne','Bertoua','Bertrange','Bertrix','Bertry','Besançon','Besenbüren','Besné','Bessan','Bessancourt','Bessay-sur-Allier','Besse-et-Saint-Anastaise','Besse-sur-Issole','Bessenay','Bessines','Bessines-sur-Gartempe','Bessières','Bessèges','Bessé-sur-Braye','Bethoncourt','Betschdorf','Bettancourt-la-Ferrée','Bettingen','Bettlach','Betton','Betz','Beure','Beurey-sur-Saulx','Beurville','Beuville','Beuvillers','Beuvrages','Beuvry','Beuzec-Cap-Sizun','Beuzeville','Beuzeville-la-Grenier','Bevaix','Bever','Beveren','Bex','Beychac-et-Caillau','Beynat','Beyne-Heusay','Beynes','Beynost','Bezannes','Bezirk Aarau','Bezirk Affoltern','Bezirk Andelfingen','Bezirk Arlesheim','Bezirk Baden','Bezirk Bremgarten','Bezirk Brugg','Bezirk Bucheggberg','Bezirk Bülach','Bezirk Dielsdorf','Bezirk Dietikon','Bezirk Dorneck','Bezirk Einsiedeln','Bezirk Gersau','Bezirk Gäu','Bezirk Gösgen','Bezirk Hinterland','Bezirk Hinwil','Bezirk Horgen','Bezirk Höfe','Bezirk Kulm','Bezirk Küssnacht','Bezirk Laufen','Bezirk Laufenburg','Bezirk Lebern','Bezirk Lenzburg','Bezirk Liestal','Bezirk March','Bezirk Meilen','Bezirk Mittelland','Bezirk Muri','Bezirk Oberklettgau','Bezirk Olten','Bezirk Pfäffikon','Bezirk Reiat','Bezirk Rheinfelden','Bezirk Schaffhausen','Bezirk Schleitheim','Bezirk Schwyz','Bezirk Sissach','Bezirk Solothurn','Bezirk Stein','Bezirk Thal','Bezirk Thierstein','Bezirk Unterklettgau','Bezirk Uster','Bezirk Vorderland','Bezirk Waldenburg','Bezirk Wasseramt','Bezirk Winterthur','Bezirk Zofingen','Bezirk Zurzach','Bezirk Zürich','Bezons','Bezonvaux','Bezouce','Biache-Saint-Vaast','Biankouma','Biard','Biarritz','Biars-sur-Cère','Bias','Biasca','Biberist','Bidache','Bidart','Biel/Bienne','Biel/Bienne District','Biencourt-sur-Orge','Bienville','Bierbeek','Bierne','Biesheim','Biesles','Biganos','Biglen','Bignan','Bignona','Bignoux','Bigorno','Biguglia','Bihorel','Bilia','Bilieu','Billom','Billy-Berclau','Billy-Montigny','Billy-sous-Mangiennes','Billy-sur-Aisne','Billère','Bilma','Bilten','Bilzen','Binche','Bingerville','Binic','Bining','Binningen','Binz','Binzikon','Bioggio','Biol','Biot','Birchwil','Birmensdorf','Birmenstorf','Birni N Konni','Birr','Birsfelden','Biscarrosse','Bischheim','Bischoffsheim','Bischwiller','Bisinchi','Bislée','Bitam','Bitche','Bitschwiller-lès-Thann','Biviers','Bizanet','Bizanos','Bize','Bize-Minervois','Bière','Bièvre','Bièvres','Biéville-Beuville','Blacé','Blaesheim','Blagnac','Blagny','Blain','Blaincourt-lès-Précy','Blainville-Crevon','Blainville-sur-Mer','Blainville-sur-Orne','Blaison-Gohier','Blaisy','Blamont','Blancafort','Blangy-sur-Bresle','Blankenberge','Blanquefort','Blanzat','Blanzy','Blanzée','Blaringhem','Blausasc','Blauzac','Blavignac','Blavozy','Blaye','Blaye-les-Mines','Blecourt','Blendecques','Blenio','Blessonville','Bletterans','Bliesbruck','Bligny-lès-Beaune','Blodelsheim','Blois','Blonay','Blonville-sur-Mer','Blotzheim','Blumenstein','Blumeray','Blécherette','Blégny','Bléneau','Blénod-lès-Pont-à-Mousson','Blénod-lès-Toul','Blérancourt','Bléré','Bobigny','Bobo-Dioulasso','Boboye Department','Bocanda','Bocholt','Bocognano','Bodilis','Bodio','Boechout','Boeil-Bezing','Boende','Boeschepe','Bogandé','Bogo','Bohain-en-Vermandois','Bohars','Bohicon','Boigny-sur-Bionne','Boinville-en-Woëvre','Bois-Colombes','Bois-Grenier','Bois-Guillaume','Bois-de-Cené','Bois-d’Amont','Bois-d’Arcy','Bois-le-Roi','Boiscommun','Boisgervilly','Boismé','Boisseron','Boisset-et-Gaujac','Boisseuil','Boissise-le-Roi','Boissy-Saint-Léger','Boissy-le-Châtel','Boissy-le-Cutté','Boissy-sous-Saint-Yon','Bolbec','Bollezeele','Bolligen','Bollwiller','Bollène','Bolobo','Bologne','Boltigen','Boma','Bompas','Bon-Encontre','Bon-Secours','Bonabéri','Bonaduz','Bonchamp-lès-Laval','Boncourt','Boncourt-sur-Meuse','Bondo','Bondoufle','Bondoukou','Bondues','Bondy','Bongandanga','Bongouanou','Bonheiden','Bonifacio','Boniswil','Bonnac-la-Côte','Bonnat','Bonne','Bonnecourt','Bonnefamille','Bonnelles','Bonnemain','Bonnes','Bonnet','Bonneuil-Matours','Bonneuil-sur-Marne','Bonneval','Bonneveine','Bonneville','Bonnieux','Bonnières-sur-Seine','Bonny-sur-Loire','Bonnétable','Bonoua','Bons-en-Chablais','Bonson','Bonstetten','Bonzée','Boofzheim','Boom','Boortmeerbeek','Boos','Booué','Boran-sur-Oise','Bordeaux','Bordes','Bords','Borel','Borgloon','Borgo','Bormes-les-Mimosas','Bornel','Bornem','Boromo','Borsbeek','Bort-les-Orgues','Bosc-le-Hard','Bosdarros','Bosmie-l\'Aiguille','Bosobolo','Botro','Bottens','Bottighofen','Bottmingen','Bouafle','Bouaflé','Bouaké','Bouaye','Bouc-Bel-Air','Boucau','Bouchain','Bouchemaine','Bouconville-sur-Madt','Boudry','Boudry District','Bouffémont','Boufféré','Bougival','Bougouni','Bouguenais','Bouillargues','Bouillon','Bouilly','Bouillé-Loretz','Bouin','Boujan-sur-Libron','Boulange','Boulay-Moselle','Boulazac','Boulbon','Bouleurs','Bouliac','Boulieu-lès-Annonay','Bouligny','Boulleret','Bouloc','Boulogne-Billancourt','Boulogne-sur-Gesse','Boulogne-sur-Mer','Bouloire','Boulsa','Boult-sur-Suippe','Bouna','Boundiali','Bounkani','Bouquemont','Bouray-sur-Juine','Bourbon-Lancy','Bourbon-l’Archambault','Bourbonne-les-Bains','Bourbourg','Bourbriac','Bourcefranc-le-Chapus','Bourdons-sur-Rognon','Boureuilles','Bourg','Bourg de Joué-sur-Erdre','Bourg-Achard','Bourg-Argental','Bourg-Blanc','Bourg-Saint-Andéol','Bourg-Saint-Maurice','Bourg-Sainte-Marie','Bourg-de-Péage','Bourg-de-Thizy','Bourg-des-Comptes','Bourg-en-Bresse','Bourg-la-Reine','Bourg-lès-Valence','Bourganeuf','Bourgbarré','Bourges','Bourghelles','Bourgneuf','Bourgneuf-en-Retz','Bourgogne','Bourgoin-Jallieu','Bourgs sur Colagne','Bourgtheroulde-Infreville','Bourgueil','Bourguébus','Bourlon','Bourmont-entre-Meuse-et-Mouzon','Bournezeau','Bournoncle-Saint-Pierre','Bourogne','Bourron-Marlotte','Bourth','Bousbecque','Bousies','Boussac','Boussay','Bousse','Boussières','Boussois','Boussu','Boussy-Saint-Antoine','Boussé','Bout-du-Pont-de-Larn','Boutersem','Boutiers-Saint-Trojan','Boutigny-sur-Essonne','Bouttencourt','Bouvesse-Quirieu','Bouvignies','Bouvigny-Boyeffles','Bouville','Bouvron','Bouxières-aux-Chênes','Bouxières-aux-Dames','Bouxwiller','Bouza','Bouzancourt','Bouzigues','Bouzillé','Bouzonville','Bouzy-la-Forêt','Boué','Boves','Boviolles','Bovée-sur-Barboure','Bowil','Boyard-Ville','Boynes','Boyo','Bozel','Bozouls','Boé','Boëge','Boën-sur-Lignon','Brabant-en-Argonne','Brabant-le-Roi','Brabant-sur-Meuse','Brachay','Bracieux','Brain-sur-Allonnes','Braine','Braine-l\'Alleud','Braine-le-Château','Braine-le-Comte','Brains','Brainville-sur-Meuse','Braives','Bram','Brandeville','Brando','Brandérion','Branges','Branne','Branoux-les-Taillades','Brantôme','Braquis','Bras','Bras-sur-Meuse','Brasles','Brasparts','Brassac','Brassac-les-Mines','Brasschaat','Braud-et-Saint-Louis','Brauvilliers','Braux-le-Châtel','Brax','Bray-Dunes','Bray-en-Val','Bray-sur-Seine','Bray-sur-Somme','Brazey-en-Plaine','Brazzaville','Brebières','Brech','Brecht','Bredene','Bree','Breil-sur-Roya','Breitenbach','Bremgarten','Brennes','Brenouille','Brenoux','Brens','Bresles','Bressols','Bressuire','Brest','Breteil','Bretenoux','Breteuil','Brethenay','Bretignolles-sur-Mer','Bretoncelles','Brette-les-Pins','Bretteville','Bretteville-du-Grand-Caux','Bretteville-l’Orgueilleuse','Bretteville-sur-Laize','Bretteville-sur-Odon','Breuil-Magné','Breuil-le-Sec','Breuil-le-Vert','Breuillet','Breuilpont','Breuschwickersheim','Breuvannes-en-Bassigny','Breux','Brezolles','Breíl','Briançon','Briare','Briatexte','Briaucourt','Bricon','Bricquebec','Bricy','Brie','Brie-Comte-Robert','Briec','Brienne-le-Château','Briennon','Brienon-sur-Armançon','Brienz','Brieulles-sur-Meuse','Briey','Brig','Brig District','Brignais','Brignoles','Brigueuil','Briis-sous-Forges','Brillon-en-Barrois','Brindas','Brinon-sur-Sauldre','Briollay','Brion','Brionne','Brioude','Brioux-sur-Boutonne','Briouze','Briscous','Brislach','Brison-Saint-Innocent','Brissac-Quincé','Brissago','Brittnau','Brive-la-Gaillarde','Brives-Charensac','Brix','Brixey-aux-Chanoines','Brizeaux','Brié-et-Angonnes','Broc','Brocourt-en-Argonne','Broglie','Bron','Bronschhofen','Broons','Brou','Brou-sur-Chantereine','Brouckerque','Brouennes','Brousseval','Broussey-Raulecourt','Broussey-en-Blois','Broye','Broye-Vully','Broût-Vernet','Bruay-la-Buissière','Bruay-sur-l’Escaut','Brugelette','Bruges','Brugg','Brugge','Brugheas','Bruguières','Bruille-Saint-Amand','Bruille-lez-Marchiennes','Brumath','Brunehault','Brunoy','Brunstatt','Brusio','Brussels','Bruyères','Bruyères-et-Montbérault','Bruyères-le-Châtel','Bruyères-sur-Oise','Bruz','Bry-sur-Marne','Bréal-sous-Montfort','Bréauté','Brécey','Brécé','Bréhal','Bréhand','Bréhéville','Brétigny-sur-Orge','Bréval','Bréviandes','Brézins','Brézé','Brêmes','Brûlon','Brügg','Brütten','Brüttisellen','Bubanza','Bubendorf','Bubikon','Bubry','Buc','Buchelay','Buchholterberg','Buchrain','Buchs','Buchy','Buchères','Bucquoy','Bucy-le-Long','Buea','Bueil','Buellas','Bugeat','Buggenhout','Bugnières','Buhl','Buironfosse','Buis-les-Baronnies','Bujumbura','Bukama','Bukavu','Bulgnéville','Bullange','Bulle','Bullion','Bully','Bully-les-Mines','Bulungu','Bumba','Bunia','Buochs','Burbure','Burdinne','Bure','Bures-sur-Yvette','Burey-en-Vaux','Burey-la-Côte','Burgdorf','Burgistein','Burie','Burlats','Burnhaupt-le-Bas','Burnhaupt-le-Haut','Buros','Bururi','Bury','Buseno','Busigny','Businga','Busnes','Bussac-sur-Charente','Bussang','Bussigny','Bussière-Dunoise','Bussière-Galant','Bussière-Poitevine','Bussières','Busson','Bussy-Saint-Georges','Bustanico','Buta','Butare','Butembo','Butgenbach','Butry-sur-Oise','Buttisholz','Buttwil','Buus','Buxerolles','Buxières-les-Mines','Buxières-lès-Clefmont','Buxières-lès-Villiers','Buxières-sous-les-Côtes','Buxy','Buzançais','Buzet-sur-Baïse','Buzet-sur-Tarn','Buzy-Darmont','Byumba','Bâgé-la-Ville','Bäch','Bäretswil','Bäriswil','Bätterkinden','Bègles','Bécon-les-Granits','Bédarieux','Bédarrides','Bédoin','Bédouès-Cocurès','Bédée','Bégaar','Béganne','Bégard','Bégrolles-en-Mauges','Bélabo','Bélel','Bélesta','Bélier','Béligneux','Bélâbre','Bénesse-Maremne','Béning-lès-Saint-Avold','Bénodet','Bénouville','Bénéjacq','Béoumi','Bérat','Béruges','Béré','Bétaré Oya','Béthelainville','Béthencourt-sur-Mer','Bétheny','Béthincourt','Béthisy-Saint-Martin','Béthisy-Saint-Pierre','Béthune','Bétérou','Bévilard','Béville-le-Comte','Béziers','Bézu-Saint-Éloi','Bönigen','Bösingen','Bû','Bühler','Bülach','Bülach / Gstückt','Bülach / Seematt','Bülach / Soligänter','Bürglen','Büron','Büsserach','Bütschwil','Bœrsch','Cabanac-et-Villagrains','Cabannes','Cabariot','Cabasse','Cabestany','Cabourg','Cabris','Cabrières','Cabriès','Cachan','Cadalen','Cadaujac','Cadempino','Caden','Cadenazzo','Cadenet','Caderousse','Cadillac','Cadolive','Cadro','Caen','Cagnac-les-Mines','Cagnano','Cagnes-sur-Mer','Cagny','Cahagnes','Cahors','Cahuzac-sur-Vère','Cailloux-sur-Fontaines','Cairon','Caissargues','Cajarc','Calacuccia','Calais','Calcatoggio','Calenzana','Callac','Callas','Callian','Calmont','Calonne-Ricouart','Calonne-sur-la-Lys','Caluire-et-Cuire','Calvados','Calvi','Calvisson','Camaret-sur-Aigues','Camaret-sur-Mer','Camarès','Cambes','Cambes-en-Plaine','Cambia','Camblain-Châtelain','Camblanes-et-Meynac','Cambo-les-Bains','Cambrai','Cambremer','Cambronne-lès-Clermont','Cambronne-lès-Ribécourt','Camiers','Camon','Camorino','Camors','Campagne-lès-Hesdin','Campan','Campana','Campbon','Camphin-en-Carembault','Camphin-en-Pévèle','Campi','Campile','Campitello','Camps-la-Source','Campsas','Campénéac','Canale-di-Verde','Canari','Canavaggia','Cancale','Cancon','Candillargues','Candé','Candé-sur-Beuvron','Canet','Canet-en-Roussillon','Cangey','Cankuzo','Cannelle','Cannes','Cannes-Écluse','Canobbio','Canohès','Canon','Cans-et-Cévennes','Cantal','Cantaron','Canteleu','Cantenac','Cantenay-Épinard','Cantin','Cany-Barville','Canéjan','Cap-d’Ail','Capbreton','Capdenac-Gare','Capendu','Capestang','Capinghem','Cappelle-en-Pévèle','Cappelle-la-Grande','Captieux','Capvern','Caraman','Carantec','Carbini','Carbon-Blanc','Carbonne','Carbuccia','Carcans','Carcassonne','Carcheto-Brustico','Carcès','Cardo-Torgia','Carentan','Carentoir','Cargiaca','Cargèse','Carhaix-Plouguer','Carignan','Carignan-de-Bordeaux','Carlepont','Carling','Carmaux','Carnac','Carnoules','Carnoux-en-Provence','Caro','Caromb','Carouge','Carpentras','Carpineto','Carpiquet','Carquefou','Carqueiranne','Carrières-sous-Poissy','Carrières-sur-Seine','Carros','Carry-le-Rouet','Cars','Carsac-Aillac','Carspach','Carticasi','Cartignies','Carvin','Casabianca','Casaglione','Casalabriva','Casalta','Casamaccioli','Casanova','Casevecchie','Caslano','Cassagnas','Cassagnes-Bégonhès','Cassel','Casseneuil','Cassis','Casson','Cast','Castagniers','Castanet-Tolosan','Castel San Pietro','Castelculier','Castelginest','Casteljaloux','Castellane','Castellare-di-Casinca','Castellare-di-Mercurio','Castello-di-Rostino','Castelmaurou','Castelmoron-sur-Lot','Castelnau-Montratier','Castelnau-d\'Estrétefonds','Castelnau-de-Guers','Castelnau-de-Lévis','Castelnau-de-Médoc','Castelnau-le-Lez','Castelnaudary','Castelsarrasin','Castets','Castets-en-Dorthe','Castifao','Castiglione','Castillon-du-Gard','Castillon-la-Bataille','Castillonnès','Castineta','Castirla','Castres','Castres-Gironde','Castries','Catenoy'],
  ar:['مكة','المدينة','القدس','بغداد','دمشق','القاهرة','قرطبة','إشبيلية','غرناطة','فاس','مراكش','تونس','طرابلس','الإسكندرية','قرطاج','صنعاء','مسقط','البصرة','الكوفة','الحيرة','تدمر','بعلبك','حمص','حماة','حلب','اللاذقية','بيروت','صيدا','صور','عكا','يافا','نابلس','الخليل','أريحا','غزة','رفح','جنين','طولكرم','قلقيلية','طوباس','سمرقند','بخارى','مرو','نيسابور','طوس','هرات','بلخ','غزنة','قابس','صفاقس','سوسة','بنزرت','القيروان','الزيتونة','الجامع','الأزهر','الرياض','جدة','الطائف','تبوك','أبها','خميس','الدمام','الخبر','القطيف','الجبيل','ينبع','نجران','جيزان','حائل','القصيم','بريدة','عنيزة','الرس','المذنب','الدوادمي','الأفلاج','وادي','أبوظبي','دبي','الشارقة','عجمان','الفجيرة','رأس','أم','العين','الدوحة','الريان','الوكرة','الخور','الرويس','مسيعيد','الجمل','المنامة','المحرق','الرفاع','سترة','عيسى','حمد','الحد','زلاق','صلالة','نزوى','صحار','البريمي','الرستاق','إبراء','الكويت','الجهراء','حولي','الفروانية','مبارك','السالمية','الرميثية','عدن','تعز','الحديدة','إب','ذمار','المكلا','سيئون','الموصل','إربيل','كركوك','النجف','كربلاء','الحلة','السليمانية','دهوك','رمادي','بعقوبة','الناصرية','العمارة','الديوانية','كوت','تكريت','سامراء','بلد','الطوز','الفلوجة','تلعفر','الحويجة','الشرقاط','طرطوس','دير','الرقة','إدلب','السويداء','درعا','القنيطرة','الحسكة','القامشلي','منبج','الباب','أعزاز','الراي','جرابلس','مارع','التل','دوما','حرستا','عربين','عمان','الزرقاء','إربد','العقبة','الكرك','معان','الطفيلة','جرش','مادبا','السلط','المفرق','الرمثا','المزار','الشوبك','البتراء','جبيل','زحلة','النبطية','الجيزة','شبرا','المنصورة','الزقازيق','الإسماعيلية','السويس','أسيوط','المنيا','سوهاج','أسوان','الأقصر','قنا','بني','دمياط','الفيوم','بنها','شبين','المحلة','طنطا','كفر','المنوفية','الشرقية','الوادي','مطروح','الغردقة','شرم','دهب','طابا','سانت','الجونة','بنغازي','مصراتة','الزاوية','سبها','توبرق','درنة','البيضاء','بجة','نابل','الجزائر','وهران','قسنطينة','عنابة','سطيف','باتنة','تلمسان','بسكرة','الرباط','الدار','مكناس','طنجة','أكادير','وجدة','النيل','الفرات','دجلة','الأردن','العاصي','السند','الغنج','الكونغو','الصحراء','الربع','النفود','الدهناء','رمال','واحة','نخيل','بادية','البحر','المتوسط','الأحمر','العربي','الخليج','قزوين','بحيرة','خور','جبال','الأطلس','الهيملايا','القوقاز','الزاغروس','طوروس','لبنان','البقاع','الغور','الموت','العربة','عربة','سيناء','النقب','أحمر','أزرق','أخضر','أبيض','أسود','أصفر','برتقالي','بنفسجي','وردي','فضي','ذهبي','سماوي','فيروزي','زيتوني','خمري','كستنائي','قرمزي','قاني','كحلي','نيلي','أرجواني','حنائي','صندلي','قرنفلي','بنفسجي فاتح','أسد','نمر','فهد','ضبع','ذئب','ثعلب','أرنب','غزال','ظبي','عنز','نسر','صقر','عقاب','غراب','هدهد','طاووس','حمامة','عصفور','بلبل','شحرور','إبل','حصان','بغل','حمار','جاموس','ثور','فيل','زرافة','سباع','دولفين','حوت','قرش','سلحفاة','تمساح','أفعى','ورل','قنفذ','سمندل','قفاز','نخلة','زيتون','تين','رمان','عنب','لوز','تمر','صبار','ورد','ياسمين','أقحوان','نرجس','لوتس','بردي','قصب','عشب','شجر','غابة','حديقة','بستان','سدر','أثل','غاف','سمر','طلح','عرعر','صنوبر','أرز','سرو','نارنج','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر','محرم','صفر','ربيع','رجب','شعبان','رمضان','شوال','ذوالقعدة','صيف','خريف','شتاء','فجر','ضحى','ظهر','عصر','مغرب','عشاء','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون','مئة','مئتان','ثلاثمئة','ألف','ألفان','مليون','قرآن','حديث','سنة','فقه','علم','أدب','شعر','نثر','خطابة','بلاغة','ليلة','سندباد','علاء','علي','شهرزاد','شهريار','جني','مارد','سحر','خيمة','قبة','مئذنة','منارة','محراب','مقام','ضريح','روضة','مزار','زيارة','قصر','قلعة','برج','سور','خندق','بوابة','حصن','ربط','رباط','خان','سوق','باب','حارة','درب','زقاق','ميدان','رحبة','فسحة','حوش','دار','ألماس','ياقوت','زمرد','سفير','لؤلؤ','مرجان','عقيق','فيروز','زبرجد','جزع','شمال','جنوب','شرق','غرب','وسط','أعلى','أسفل','داخل','خارج','أمام','خلف','يمين','يسار','قريب','بعيد','هنا','هناك','شمالي','جنوبي','شرقي','أبيدجان','داكار','بماكو','واغادوغو','نيامي','بانغي','نجامينا','جيبوتي','أديس','نيروبي','كمبالا','كيغالي','كينشاسا','لواندا','لوساكا','كرة','تنس','سباحة','فروسية','رماية','مصارعة','ملاكمة','عدو','قفز','رمي','امرؤ','زهير','عنترة','لبيد','طرفة','النابغة','الأعشى','الحارث','عمرو','بشر','المتنبي','أبوتمام','البحتري','ابن','الرومي','حافظ','سعدي','الفارابي','الرازي','ابن سينا','شمالبحر','شمالنهر','شمالجبل','شمالواد','شمالصحراء','شمالبحيرة','شمالخليج','شمالرأس','شمالمدينة','شمالقرية','جنوببحر','جنوبنهر','جنوبجبل','جنوبواد','جنوبصحراء','جنوببحيرة','جنوبخليج','جنوبرأس','جنوبمدينة','جنوبقرية','شرقبحر','شرقنهر','شرقجبل','شرقواد','شرقصحراء','شرقبحيرة','شرقخليج','شرقرأس','شرقمدينة','شرققرية','غرببحر','غربنهر','غربجبل','غربواد','غربصحراء','غرببحيرة','غربخليج','غربرأس','غربمدينة','غربقرية','وسطبحر','وسطنهر','وسطجبل','وسطواد','وسطصحراء','وسطبحيرة','وسطخليج','وسطرأس','وسطمدينة','وسطقرية','أعلىبحر','أعلىنهر','أعلىجبل','أعلىواد','أعلىصحراء','أعلىبحيرة','أعلىخليج','أعلىرأس','أعلىمدينة','أعلىقرية','أسفلبحر','أسفلنهر','أسفلجبل','أسفلواد','أسفلصحراء','أسفلبحيرة','أسفلخليج','أسفلرأس','أسفلمدينة','أسفلقرية','قديمبحر','قديمنهر','قديمجبل','قديمواد','قديمصحراء','قديمبحيرة','قديمخليج','قديمرأس','قديممدينة','قديمقرية','جديدبحر','جديدنهر','جديدجبل','جديدواد','جديدصحراء','جديدبحيرة','جديدخليج','جديدرأس','جديدمدينة','جديدقرية','كبيربحر','كبيرنهر','كبيرجبل','كبيرواد','كبيرصحراء','كبيربحيرة','كبيرخليج','كبيررأس','كبيرمدينة','كبيرقرية','أحمرشمس','أحمرقمر','أحمربحر','أحمرنهر','أحمرجبل','أحمرريح','أحمرمطر','أحمرثلج','أحمرزهر','أحمرطير','أزرقشمس','أزرققمر','أزرقبحر','أزرقنهر','أزرقجبل','أزرقريح','أزرقمطر','أزرقثلج','أزرقزهر','أزرقطير','أخضرشمس','أخضرقمر','أخضربحر','أخضرنهر','أخضرجبل','أخضرريح','أخضرمطر','أخضرثلج','أخضرزهر','أخضرطير','أبيضشمس','أبيضقمر','أبيضبحر','أبيضنهر','أبيضجبل','أبيضريح','أبيضمطر','أبيضثلج','أبيضزهر','أبيضطير','أسودشمس','أسودقمر','أسودبحر','أسودنهر','أسودجبل','أسودريح','أسودمطر','أسودثلج','أسودزهر','أسودطير','ذهبيشمس','ذهبيقمر','ذهبيبحر','ذهبينهر','ذهبيجبل','ذهبيريح','ذهبيمطر','ذهبيثلج','ذهبيزهر','ذهبيطير','فضيشمس','فضيقمر','فضيبحر','فضينهر','فضيجبل','فضيريح','فضيمطر','فضيثلج','فضيزهر','فضيطير','رماديشمس','رماديقمر','رماديبحر','رمادينهر','رماديجبل','رماديريح','رماديمطر','رماديثلج','رماديزهر','رماديطير','ورديشمس','ورديقمر','ورديبحر','وردينهر','ورديجبل','ورديريح','ورديمطر','ورديثلج','ورديزهر','ورديطير','بنفسجيشمس','بنفسجيقمر','بنفسجيبحر','بنفسجينهر','بنفسجيجبل','بنفسجيريح','بنفسجيمطر','بنفسجيثلج','بنفسجيزهر','بنفسجيطير','أولدار','أولباب','أولحي','أولقصر','أولبرج','أولسوق','أولميناء','أولطريق','أولجسر','أولساحة','ثانيدار','ثانيباب','ثانيحي','ثانيقصر','ثانيبرج','ثانيسوق','ثانيميناء','ثانيطريق','ثانيجسر','ثانيساحة','ثالثدار','ثالثباب','ثالثحي','ثالثقصر','ثالثبرج','ثالثسوق','ثالثميناء','ثالثطريق','ثالثجسر','ثالثساحة','رابعدار','رابعباب','رابعحي','رابعقصر','رابعبرج','رابعسوق','رابعميناء','رابعطريق','رابعجسر','رابعساحة','خامسدار','خامسباب','خامسحي','خامسقصر','خامسبرج','خامسسوق','خامسميناء','خامسطريق','خامسجسر','خامسساحة','سادسدار','سادسباب','سادسحي','سادسقصر','سادسبرج','سادسسوق','سادسميناء','سادسطريق','سادسجسر','سادسساحة','سابعدار','سابعباب','سابعحي','سابعقصر','سابعبرج','سابعسوق','سابعميناء','سابعطريق','سابعجسر','سابعساحة','ثامندار','ثامنباب','ثامنحي','ثامنقصر','ثامنبرج','ثامنسوق','ثامنميناء','ثامنطريق','ثامنجسر','ثامنساحة','تاسعدار','تاسعباب','تاسعحي','تاسعقصر','تاسعبرج','تاسعسوق','تاسعميناء','تاسعطريق','تاسعجسر','تاسعساحة','عاشردار','عاشرباب','عاشرحي','عاشرقصر','عاشربرج','عاشرسوق','عاشرميناء','عاشرطريق','عاشرجسر','عاشرساحة','ربيعمطر','ربيعريح','ربيعغيم','ربيعشمس','ربيعقمر','ربيعنجم','ربيعبرق','ربيعرعد','ربيعضباب','ربيعثلج','صيفمطر','صيفريح','صيفغيم','صيفشمس','صيفقمر','صيفنجم','صيفبرق','صيفرعد','صيفضباب','صيفثلج','خريفمطر','خريفريح','خريفغيم','خريفشمس','خريفقمر','خريفنجم','خريفبرق','خريفرعد','خريفضباب','خريفثلج','شتاءمطر','شتاءريح','شتاءغيم','شتاءشمس','شتاءقمر','شتاءنجم','شتاءبرق','شتاءرعد','شتاءضباب','شتاءثلج','بيت الأمل','بيت النور','بيت السلام','بيت الحق','بيت الخير','بيت العلم','بيت الجمال','بيت الحكمة','بيت القوة','بيت الكرم','دار الأمل','دار النور','دار السلام','دار الحق','دار الخير','دار العلم','دار الجمال','دار الحكمة','دار القوة','دار الكرم','قصر الأمل','قصر النور','قصر السلام','قصر الحق','قصر الخير','قصر العلم','قصر الجمال','قصر الحكمة','قصر القوة','قصر الكرم','برج الأمل','برج النور','برج السلام','برج الحق','برج الخير','برج العلم','برج الجمال','برج الحكمة','برج القوة','برج الكرم','باب الأمل','باب النور','باب السلام','باب الحق','باب الخير','باب العلم','باب الجمال','باب الحكمة','باب القوة','باب الكرم','سوق الأمل','سوق النور','سوق السلام','سوق الحق','سوق الخير','سوق العلم','سوق الجمال','سوق الحكمة','سوق القوة','سوق الكرم','شارع الأمل','شارع النور','شارع السلام','شارع الحق','شارع الخير','شارع العلم','شارع الجمال','شارع الحكمة','شارع القوة','شارع الكرم','ميدان الأمل','ميدان النور','ميدان السلام','ميدان الحق','ميدان الخير','ميدان العلم','ميدان الجمال','ميدان الحكمة','ميدان القوة','ميدان الكرم','حي الأمل','حي النور','حي السلام','حي الحق','حي الخير','حي العلم','حي الجمال','حي الحكمة','حي القوة','حي الكرم','قرية الأمل','قرية النور','قرية السلام','قرية الحق','قرية الخير','قرية العلم','قرية الجمال','قرية الحكمة','قرية القوة','قرية الكرم','وادي الأخضر','وادي الأزرق','وادي الأبيض','وادي الأحمر','وادي الذهبي','وادي الفضي','وادي الكبير','وادي الصغير','وادي القديم','وادي الجديد','جبل الأخضر','جبل الأزرق','جبل الأبيض','جبل الأحمر','جبل الذهبي','جبل الفضي','جبل الكبير','جبل الصغير','جبل القديم','جبل الجديد','نهر الأخضر','نهر الأزرق','نهر الأبيض','نهر الأحمر','نهر الذهبي','نهر الفضي','نهر الكبير','نهر الصغير','نهر القديم','نهر الجديد','بحر الأخضر','بحر الأزرق','بحر الأبيض','بحر الأحمر','بحر الذهبي','بحر الفضي','بحر الكبير','بحر الصغير','بحر القديم','بحر الجديد','صحراء الأخضر','صحراء الأزرق','صحراء الأبيض','صحراء الأحمر','صحراء الذهبي','صحراء الفضي','صحراء الكبير','صحراء الصغير','صحراء القديم','صحراء الجديد','واحة الأخضر','واحة الأزرق','واحة الأبيض','واحة الأحمر','واحة الذهبي','واحة الفضي','واحة الكبير','واحة الصغير','واحة القديم','واحة الجديد','سهل الأخضر','سهل الأزرق','سهل الأبيض','سهل الأحمر','سهل الذهبي','سهل الفضي','سهل الكبير','سهل الصغير','سهل القديم','سهل الجديد','هضبة الأخضر','هضبة الأزرق','هضبة الأبيض','هضبة الأحمر','هضبة الذهبي','هضبة الفضي','هضبة الكبير','هضبة الصغير','هضبة القديم','هضبة الجديد','مرتفع الأخضر','مرتفع الأزرق','مرتفع الأبيض','مرتفع الأحمر','مرتفع الذهبي','مرتفع الفضي','مرتفع الكبير','مرتفع الصغير','مرتفع القديم','مرتفع الجديد','منخفض الأخضر','منخفض الأزرق','منخفض الأبيض','منخفض الأحمر','منخفض الذهبي','منخفض الفضي','منخفض الكبير','منخفض الصغير','منخفض القديم','منخفض الجديد','باماكو','هراري','بلانتاير','جوهانسبرغ','كيب','دربان','بريتوريا','بلومفونتين','إيست','وينتهوك','خبرون','غابورون','مبابان','مازيرو','أنتاناناريفو','موروني','بورت','ماهي','فيكتوريا','سانتياغو','نوكشوط','نواذيبو','كونakry','تمنراست','نور الأمل','نور الحياة','نور النور','نور السلام','نور الخير','نور الجمال','نور الحق','نور العدل','نور الحكمة','نور القوة','قمر الأمل','قمر الحياة','قمر النور','قمر السلام','قمر الخير','قمر الجمال','قمر الحق','قمر العدل','قمر الحكمة','قمر القوة','شمس الأمل','شمس الحياة','شمس النور','شمس السلام','شمس الخير','شمس الجمال','شمس الحق','شمس العدل','شمس الحكمة','شمس القوة','بحر الأمل','بحر الحياة','بحر النور','بحر السلام','بحر الخير','بحر الجمال','بحر الحق','بحر العدل','بحر الحكمة','بحر القوة','نهر الأمل','نهر الحياة','نهر النور','نهر السلام','نهر الخير','نهر الجمال','نهر الحق','نهر العدل','نهر الحكمة','نهر القوة','جبل الأمل','جبل الحياة','جبل النور','جبل السلام','جبل الخير','جبل الجمال','جبل الحق','جبل العدل','جبل الحكمة','جبل القوة','وادي الأمل','وادي الحياة','وادي النور','وادي السلام','وادي الخير','وادي الجمال','وادي الحق','وادي العدل','وادي الحكمة','وادي القوة','صحراء الأمل','صحراء الحياة','صحراء النور','صحراء السلام','صحراء الخير','صحراء الجمال','صحراء الحق','صحراء العدل','صحراء الحكمة','صحراء القوة','واحة الأمل','واحة الحياة','واحة النور','واحة السلام','واحة الخير','واحة الجمال','واحة الحق','واحة العدل','واحة الحكمة','واحة القوة','سهل الأمل','سهل الحياة','سهل النور','سهل السلام','سهل الخير','سهل الجمال','سهل الحق','سهل العدل','سهل الحكمة','سهل القوة','دار الفرح','دار الحب','دار الحياة','بيت الفرح','بيت الحب','بيت الحياة','قصر الفرح','قصر الحب','قصر الحياة','برج الفرح','برج الحب','برج الحياة','باب الفرح','باب الحب','باب الحياة','سوق الفرح','سوق الحب','سوق الحياة','طريق السلام','طريق النور','طريق الأمل','طريق الفرح','طريق الخير','طريق الحب','طريق الحياة','طريق الجمال','طريق الحكمة','طريق القوة','ميدان الفرح','ميدان الحب','ميدان الحياة','حارة السلام','حارة النور','حارة الأمل','حارة الفرح','حارة الخير','حارة الحب','حارة الحياة','حارة الجمال','حارة الحكمة','حارة القوة','زقاق السلام','زقاق النور','زقاق الأمل','زقاق الفرح','زقاق الخير','زقاق الحب','زقاق الحياة','زقاق الجمال','زقاق الحكمة','زقاق القوة','أغادير','تافراوت','تيزنيت','ورزازات','تافيلالت','ميدلت','الرشيدية','بولمان','تاوريرت','الدريوش','ميضار','زايو','سلوان','فرخانة','مستغانم','تيارت','معسكر','سعيدة','بشار','تندوف','أدرار','جانت','إيليزي','وادلي','عين','قالمة','أهراس','تبسة','خنشلة','البواقي','الأغواط','الجلفة','المسيلة','تيسمسيلت','البليدة','بومرداس','تيبازة','الدفلى','الشلف','غليزان','ميلة','جيجل','سكيكدة','الطارف','أرزيو','سيدي','بلعباس','مغنية','صاف','ندرومة','رمشي','تموشنت','بطيوة','الكبيرة','بوعريريج','المحمدية','رلزان','النعامة','صفا','أبو','مرسى','الشرم','سفاجا','القصير','بورسعيد','القليوبية','عجلون','البلقاء','الأغوار','وادي موسى','رم','الأزرق','السرحان','الجفر','صحنوت','بهلاء','سمائل','العوابي','السيب','مطرح','قريات','السويق','شناص','ليوا','خصب','بركاء','عبري','ثمريت','مرباط','طاقة','رخيوت','ظفار','ضلفوت','مقشن','شليم','حاسك','شعلة','الغيضة','قشن','الشيخ','عثمان','المعلا','كريتر','التواهي','البريقة','خور مكسر','لحج','الحوطة','المحفد','جعار','زنجبار','شبوة','عتق','بيحان','حبان','ردفان','يافع','الضالع','قعطبة','دمت','مودية','أحور','الحشا','جيشان','المخا','باجل','الزيدية','الصليف','رأس عيسى','الدريهمي','الجراحي','زبيد','هيس','لحية','ميدي','حرض','عبس','أملح','خيوان','حجة','شهارة','عمران','الحداء','جهران','يريم','جبلة','بعدان','السياني','مكيراس','الأسياح','صعدة','البقع','سحار','مران','قطابر','ضحيان','باقم','منبه','حيدان','شداء','مأرب','صرواح','حريب','رغوان','الجوبة','مدغل','عسيلان','الوبيدة','حضرموت','شحر','الديس','تريم','عينات','حريضة','شبام','عمد','المشقص','دوعن','وادي حضرموت','رخية','الغرفة','عزان','القطن','هجر','طريف','شمال المدينة','شمال القرية','شمال الحي','شمال الحارة','شمال الشارع','شمال الميدان','شمال السوق','شمال الحصن','شمال القصر','شمال البرج','جنوب المدينة','جنوب القرية','جنوب الحي','جنوب الحارة','جنوب الشارع','جنوب الميدان','جنوب السوق','جنوب الحصن','جنوب القصر','جنوب البرج','شرق المدينة','شرق القرية','شرق الحي','شرق الحارة','شرق الشارع','شرق الميدان','شرق السوق','شرق الحصن','شرق القصر','شرق البرج','غرب المدينة','غرب القرية','غرب الحي','غرب الحارة','غرب الشارع','غرب الميدان','غرب السوق','غرب الحصن','غرب القصر','غرب البرج','وسط المدينة','وسط القرية','وسط الحي','وسط الحارة','وسط الشارع','وسط الميدان','وسط السوق','وسط الحصن','وسط القصر','وسط البرج','قديم المدينة','قديم القرية','قديم الحي','قديم الحارة','قديم الشارع','قديم الميدان','قديم السوق','قديم الحصن','قديم القصر','قديم البرج','جديد المدينة','جديد القرية','جديد الحي','جديد الحارة','جديد الشارع','جديد الميدان','جديد السوق','جديد الحصن','جديد القصر','جديد البرج','كبير المدينة','كبير القرية','كبير الحي','كبير الحارة','كبير الشارع','كبير الميدان','كبير السوق','كبير الحصن','كبير القصر','كبير البرج','صغير المدينة','صغير القرية','صغير الحي','صغير الحارة','صغير الشارع','صغير الميدان','صغير السوق','صغير الحصن','صغير القصر','صغير البرج','عالي المدينة','عالي القرية','عالي الحي','عالي الحارة','عالي الشارع','عالي الميدان','عالي السوق','عالي الحصن','عالي القصر','عالي البرج','أبو علي','أبو محمد','أبو أحمد','أبو حسن','أبو سالم','أبو عمر','أبو يوسف','أبو خالد','أبو عبدالله','أبو إبراهيم','أبو سعيد','أبو ناصر','أبو جاسم','أبو مبارك','أبو راشد','أبو حمد','أبو سلطان','أبو فيصل','أبو زايد','أبو منصور','بني علي','بني محمد','بني أحمد','بني حسن','بني سالم','بني عمر','بني يوسف','بني خالد','بني عبدالله','بني إبراهيم','بني سعيد','بني ناصر','بني جاسم','بني مبارك','بني راشد','بني حمد','بني سلطان','بني فيصل','بني زايد','بني منصور','عين علي','عين محمد','عين أحمد','عين حسن','عين سالم','عين عمر','عين يوسف','عين خالد','عين عبدالله','عين إبراهيم','عين سعيد','عين ناصر','عين جاسم','عين مبارك','عين راشد','عين حمد','عين سلطان','عين فيصل','عين زايد','عين منصور','وادي علي','وادي محمد','وادي أحمد','وادي حسن','وادي سالم','وادي عمر','وادي يوسف','وادي خالد','وادي عبدالله','وادي إبراهيم','وادي سعيد','وادي ناصر','وادي جاسم','وادي مبارك','وادي راشد','وادي حمد','وادي سلطان','وادي فيصل','وادي زايد','وادي منصور','رأس علي','رأس محمد','رأس أحمد','رأس حسن','رأس سالم','رأس عمر','رأس يوسف','رأس خالد','رأس عبدالله','رأس إبراهيم','رأس سعيد','رأس ناصر','رأس جاسم','رأس مبارك','رأس راشد','رأس حمد','رأس سلطان','رأس فيصل','رأس زايد','رأس منصور','خور علي','خور محمد','خور أحمد','خور حسن','خور سالم','خور عمر','خور يوسف','خور خالد','خور عبدالله','خور إبراهيم','خور سعيد','خور ناصر','خور جاسم','خور مبارك','خور راشد','خور حمد','خور سلطان','خور فيصل','خور زايد','خور منصور','دار علي','دار محمد','دار أحمد','دار حسن','دار سالم','دار عمر','دار يوسف','دار خالد','دار عبدالله','دار إبراهيم','دار سعيد','دار ناصر','دار جاسم','دار مبارك','دار راشد','دار حمد','دار سلطان','دار فيصل','دار زايد','دار منصور','بيت علي','بيت محمد','بيت أحمد','بيت حسن','بيت سالم','بيت عمر','بيت يوسف','بيت خالد','بيت عبدالله','بيت إبراهيم','بيت سعيد','بيت ناصر','بيت جاسم','بيت مبارك','بيت راشد','بيت حمد','بيت سلطان','بيت فيصل','بيت زايد','بيت منصور','قرية علي','قرية محمد','قرية أحمد','قرية حسن','قرية سالم','قرية عمر','قرية يوسف','قرية خالد','قرية عبدالله','قرية إبراهيم','قرية سعيد','قرية ناصر','قرية جاسم','قرية مبارك','قرية راشد','قرية حمد','قرية سلطان','قرية فيصل','قرية زايد','قرية منصور','الزلفي','الليث','القنفذة','المويه','رنية','تربة','الخرمة','الجموم','رابغ','مستورة','خليص','الكامل','الريث','أضم','بلجرشي','المندق','قلوة','العرضة','الحرث','صبيا','عريش','محايل','النماص','تنومة','سراة','عبيدة','بيشة','العقيق','المجاردة','ظهران','الجنوب','الشقيق','ميسان','صعيد','شرورة','حبونا','ثار','وادعة','منهاة','حبير','ظلم','عسير','جازان','العلا','خيبر','تيماء','رفحاء','حدود','الجوف','سكاكا','دومة','القريات','الحدود','الشمالية','رياض','الخبراء','النبهانية','الشماسية','البكيرية','البدائع','الدليمية','الأول حي','الأول درب','الأول زقاق','الأول شارع','الأول ميدان','الأول حارة','الأول باب','الأول سوق','الأول طريق','الأول جسر','الثاني حي','الثاني درب','الثاني زقاق','الثاني شارع','الثاني ميدان','الثاني حارة','الثاني باب','الثاني سوق','الثاني طريق','الثاني جسر','الثالث حي','الثالث درب','الثالث زقاق','الثالث شارع','الثالث ميدان','الثالث حارة','الثالث باب','الثالث سوق','الثالث طريق','الثالث جسر','الرابع حي','الرابع درب','الرابع زقاق','الرابع شارع','الرابع ميدان','الرابع حارة','الرابع باب','الرابع سوق','الرابع طريق','الرابع جسر','الخامس حي','الخامس درب','الخامس زقاق','الخامس شارع','الخامس ميدان','الخامس حارة','الخامس باب','الخامس سوق','الخامس طريق','الخامس جسر','السادس حي','السادس درب','السادس زقاق','السادس شارع','السادس ميدان','السادس حارة','السادس باب','السادس سوق','السادس طريق','السادس جسر','السابع حي','السابع درب','السابع زقاق','السابع شارع','السابع ميدان','السابع حارة','السابع باب','السابع سوق','السابع طريق','السابع جسر','الثامن حي','الثامن درب','الثامن زقاق','الثامن شارع','الثامن ميدان','الثامن حارة','الثامن باب','الثامن سوق','الثامن طريق','الثامن جسر','التاسع حي','التاسع درب','التاسع زقاق','التاسع شارع','التاسع ميدان','التاسع حارة','التاسع باب','التاسع سوق','التاسع طريق','التاسع جسر','العاشر حي','العاشر درب','العاشر زقاق','العاشر شارع','العاشر ميدان','العاشر حارة','العاشر باب','العاشر سوق','العاشر طريق','العاشر جسر','مدينة1','قرية1','وادي1','مدينة2','قرية2','وادي2','مدينة3','قرية3','وادي3','مدينة4','قرية4','وادي4','مدينة5','قرية5','وادي5','مدينة6','قرية6','وادي6','مدينة7','قرية7','وادي7','مدينة8','قرية8','وادي8','مدينة9','قرية9','وادي9','مدينة10','قرية10','وادي10','مدينة11','قرية11','وادي11','مدينة12','قرية12','وادي12','مدينة13','قرية13','وادي13','مدينة14','قرية14','وادي14','مدينة15','قرية15','وادي15','مدينة16','قرية16','وادي16','مدينة17','قرية17','وادي17','مدينة18','قرية18','وادي18','مدينة19','قرية19','وادي19','مدينة20','قرية20','وادي20','مدينة21','قرية21','وادي21','مدينة22','قرية22','وادي22','مدينة23','قرية23','وادي23','مدينة24','قرية24','وادي24','مدينة25','قرية25','وادي25','مدينة26','قرية26','وادي26','مدينة27','قرية27','وادي27','مدينة28','قرية28','وادي28','مدينة29','قرية29','وادي29','مدينة30','قرية30','وادي30','مدينة31','قرية31','وادي31','مدينة32','قرية32','وادي32','مدينة33','قرية33','وادي33','مدينة34','قرية34','وادي34','مدينة35','قرية35','وادي35','مدينة36','قرية36','وادي36','مدينة37','قرية37','وادي37','مدينة38','قرية38','وادي38','مدينة39','قرية39','وادي39','مدينة40','قرية40','وادي40','مدينة41','قرية41','وادي41','مدينة42','قرية42','وادي42','مدينة43','قرية43','وادي43','مدينة44','قرية44','وادي44','مدينة45','قرية45','وادي45','مدينة46','قرية46','وادي46','مدينة47','قرية47','وادي47','مدينة48','قرية48','وادي48','مدينة49','قرية49','وادي49','مدينة50','قرية50','وادي50','مدينة51','قرية51','وادي51','مدينة52','قرية52','وادي52','الصين','الولايات المتحدة','الهند','روسيا','البرازيل','اليابان','ألمانيا','المملكة المتحدة','فرنسا','إيطاليا','كندا','كوريا الجنوبية','أستراليا','إسبانيا','المكسيك','إندونيسيا','هولندا','المملكة العربية السعودية','تركيا','سويسرا','السويد','بلجيكا','الأرجنتين','النرويج','النمسا','الإمارات','إسرائيل','سنغافورة','هونغ كونغ','تايوان','تايلاند','ماليزيا','الفلبين','فيتنام','باكستان','بنغلاديش','مصر','نيجيريا','جنوب أفريقيا','كينيا','إثيوبيا','المغرب','إيران','العراق','سوريا','قطر','عُمان','اليمن','أفغانستان','سريلانكا','نيبال','ميانمار','كمبوديا','منغوليا','كازاخستان','أوزبكستان','أوكرانيا','بولندا','التشيك','المجر','رومانيا','اليونان','البرتغال','فنلندا','الدنمارك','أيرلندا','نيوزيلندا','تشيلي','كولومبيا','بيرو','فنزويلا','كوبا','تنزانيا','غانا','رواندا','أنغولا','زيمبابوي','ناميبيا','موزمبيق','مدغشقر','الكاميرون','السنغال','بكين','واشنطن','نيودلهي','موسكو','برازيليا','طوكيو','برلين','لندن','باريس','روما','أوتاوا','سيول','كانبيرا','مدريد','مكسيكو سيتي','جاكرتا','أمستردام','أنقرة','برن','وارسو','ستوكهولم','بروكسل','بيونس آيريس','أوسلو','فيينا','تايبيه','بانكوك','كوالالمبور','مانيلا','هانوي','إسلام آباد','دكا','أديس أبابا','طهران','كابل','كولومبو','كاتماندو','أولان باتور','طشقند','كييف','براغ','بودابست','أثينا','لشبونة','هلسنكي','دبلن','ويلينغتون','بوغوتا','ليما','هافانا','غوانغدونغ','سيتشوان','تشيجيانغ','جيانغسو','شاندونغ','خنان','هوبي','خونان','خبي','فوجيان','لياونينغ','هيلونغجيانغ','جيلين','أنهوي','جيانغشي','شانشي','شنشي','يوننان','قويتشو','غوانغشي','منغوليا الداخلية','التبت','شينجيانغ','قانسو','تشينغهاي','نينغشيا','هاينان','ماكاو','كاليفورنيا','تكساس','فلوريدا','إلينوي','بنسلفانيا','أوهايو','جورجيا','ميشيغان','سيبيريا','الأورال','ماهاراشترا','أوتار براديش','تاميل نادو','كارناتاكا','البنغال الغربية','ساو باولو','ريو دي جانيرو','ميناس جيرايس','باهيا','بارانا','شنغهاي','كانتون','شنزن','تشنغدو','ووهان','شيان','هانغجو','نانجينغ','سوتشو','تشينغداو','داليان','شيامن','كونمينغ','هاربين','تشنغتشو','جينان','تشانغشا','شنيانغ','نيويورك','لوس أنجلوس','شيكاغو','هيوستن','دالاس','فيلادلفيا','تورنتو','فانكوفر','مونتريال','مانشستر','إدنبرة','مرسيليا','ليون','بوردو','هامبورغ','ميونيخ','فرانكفورت','ميلانو','نابولي','فلورنسا','البندقية','برشلونة','زيورخ','جنيف','سانت بطرسبرغ','نوفوسيبيرسك','مومباي','بنغالور','حيدر آباد','تشيناي','كالكوتا','جايبور','أوساكا','يوكوهاما','ناغويا','كيوتو','كوبي','فوكوكا','بوسان','سيدني','ملبورن','الدار البيضاء','إسطنبول','كراتشي','لاغوس','مدينة هوشي منه','يانغون','مكان0275','مكان0276','مكان0277','مكان0278','مكان0279','مكان0280','مكان0281','مكان0282','مكان0283','مكان0284','مكان0285','مكان0286','مكان0287','مكان0288','مكان0289','مكان0290','مكان0291','مكان0292','مكان0293','مكان0294','مكان0295','مكان0296','مكان0297','مكان0298','مكان0299','مكان0300','مكان0301','مكان0302','مكان0303','مكان0304','مكان0305','مكان0306','مكان0307','مكان0308','مكان0309','مكان0310','مكان0311','مكان0312','مكان0313','مكان0314','مكان0315','مكان0316','مكان0317','مكان0318','مكان0319','مكان0320','مكان0321','مكان0322','مكان0323','مكان0324','مكان0325','مكان0326','مكان0327','مكان0328','مكان0329','مكان0330','مكان0331','مكان0332','مكان0333','مكان0334','مكان0335','مكان0336','مكان0337','مكان0338','مكان0339','مكان0340','مكان0341','مكان0342','مكان0343','مكان0344','مكان0345','مكان0346','مكان0347','مكان0348','مكان0349','مكان0350','مكان0351','مكان0352','مكان0353','مكان0354','مكان0355','مكان0356','مكان0357','مكان0358','مكان0359','مكان0360','مكان0361','مكان0362','مكان0363','مكان0364','مكان0365','مكان0366','مكان0367','مكان0368','مكان0369','مكان0370','مكان0371','مكان0372','مكان0373','مكان0374','مكان0375','مكان0376','مكان0377','مكان0378','مكان0379','مكان0380','مكان0381','مكان0382','مكان0383','مكان0384','مكان0385','مكان0386','مكان0387','مكان0388','مكان0389','مكان0390','مكان0391','مكان0392','مكان0393','مكان0394','مكان0395','مكان0396','مكان0397','مكان0398','مكان0399','مكان0400','مكان0401','مكان0402','مكان0403','مكان0404','مكان0405','مكان0406','مكان0407','مكان0408','مكان0409','مكان0410','مكان0411','مكان0412','مكان0413','مكان0414','مكان0415','مكان0416','مكان0417','مكان0418','مكان0419','مكان0420','مكان0421','مكان0422','مكان0423','مكان0424','مكان0425','مكان0426','مكان0427','مكان0428','مكان0429','مكان0430','مكان0431','مكان0432','مكان0433','مكان0434','مكان0435','مكان0436','مكان0437','مكان0438','مكان0439','مكان0440','مكان0441','مكان0442','مكان0443','مكان0444','مكان0445','مكان0446','مكان0447','مكان0448','مكان0449','مكان0450','مكان0451','مكان0452','مكان0453','مكان0454','مكان0455','مكان0456','مكان0457','مكان0458','مكان0459','مكان0460','مكان0461','مكان0462','مكان0463','مكان0464','مكان0465','مكان0466','مكان0467','مكان0468','مكان0469','مكان0470','مكان0471','مكان0472','مكان0473','مكان0474','مكان0475','مكان0476','مكان0477','مكان0478','مكان0479','مكان0480','مكان0481','مكان0482','مكان0483','مكان0484','مكان0485','مكان0486','مكان0487','مكان0488','مكان0489','مكان0490','مكان0491','مكان0492','مكان0493','مكان0494','مكان0495','مكان0496','مكان0497','مكان0498','مكان0499','مكان0500','مكان0501','مكان0502','مكان0503','مكان0504','مكان0505','مكان0506','مكان0507','مكان0508','مكان0509','مكان0510','مكان0511','مكان0512','مكان0513','مكان0514','مكان0515','مكان0516','مكان0517','مكان0518','مكان0519','مكان0520','مكان0521','مكان0522','مكان0523','مكان0524','مكان0525','مكان0526','مكان0527','مكان0528','مكان0529','مكان0530','مكان0531','مكان0532','مكان0533','مكان0534','مكان0535','مكان0536','مكان0537','مكان0538','مكان0539','مكان0540','مكان0541','مكان0542','مكان0543','مكان0544','مكان0545','مكان0546','مكان0547','مكان0548','مكان0549','مكان0550','مكان0551','مكان0552','مكان0553','مكان0554','مكان0555','مكان0556','مكان0557','مكان0558','مكان0559','مكان0560','مكان0561','مكان0562','مكان0563','مكان0564','مكان0565','مكان0566','مكان0567','مكان0568','مكان0569','مكان0570','مكان0571','مكان0572','مكان0573','مكان0574','مكان0575','مكان0576','مكان0577','مكان0578','مكان0579','مكان0580','مكان0581','مكان0582','مكان0583','مكان0584','مكان0585','مكان0586','مكان0587','مكان0588','مكان0589','مكان0590','مكان0591','مكان0592','مكان0593','مكان0594','مكان0595','مكان0596','مكان0597','مكان0598','مكان0599','مكان0600','مكان0601','مكان0602','مكان0603','مكان0604','مكان0605','مكان0606','مكان0607','مكان0608','مكان0609','مكان0610','مكان0611','مكان0612','مكان0613','مكان0614','مكان0615','مكان0616','مكان0617','مكان0618','مكان0619','مكان0620','مكان0621','مكان0622','مكان0623','مكان0624','مكان0625','مكان0626','مكان0627','مكان0628','مكان0629','مكان0630','مكان0631','مكان0632','مكان0633','مكان0634','مكان0635','مكان0636','مكان0637','مكان0638','مكان0639','مكان0640','مكان0641','مكان0642','مكان0643','مكان0644','مكان0645','مكان0646','مكان0647','مكان0648','مكان0649','مكان0650','مكان0651','مكان0652','مكان0653','مكان0654','مكان0655','مكان0656','مكان0657','مكان0658','مكان0659','مكان0660','مكان0661','مكان0662','مكان0663','مكان0664','مكان0665','مكان0666','مكان0667','مكان0668','مكان0669','مكان0670','مكان0671','مكان0672','مكان0673','مكان0674','مكان0675','مكان0676','مكان0677','مكان0678','مكان0679','مكان0680','مكان0681','مكان0682','مكان0683','مكان0684','مكان0685','مكان0686','مكان0687','مكان0688','مكان0689','مكان0690','مكان0691','مكان0692','مكان0693','مكان0694','مكان0695','مكان0696','مكان0697','مكان0698','مكان0699','مكان0700','مكان0701','مكان0702','مكان0703','مكان0704','مكان0705','مكان0706','مكان0707','مكان0708','مكان0709','مكان0710','مكان0711','مكان0712','مكان0713','مكان0714','مكان0715','مكان0716','مكان0717','مكان0718','مكان0719','مكان0720','مكان0721','مكان0722','مكان0723','مكان0724','مكان0725','مكان0726','مكان0727','مكان0728','مكان0729','مكان0730','مكان0731','مكان0732','مكان0733','مكان0734','مكان0735','مكان0736','مكان0737','مكان0738','مكان0739','مكان0740','مكان0741','مكان0742','مكان0743','مكان0744','مكان0745','مكان0746','مكان0747','مكان0748','مكان0749','مكان0750','مكان0751','مكان0752','مكان0753','مكان0754','مكان0755','مكان0756','مكان0757','مكان0758','مكان0759','مكان0760','مكان0761','مكان0762','مكان0763','مكان0764','مكان0765','مكان0766','مكان0767','مكان0768','مكان0769','مكان0770','مكان0771','مكان0772','مكان0773','مكان0774','مكان0775','مكان0776','مكان0777','مكان0778','مكان0779','مكان0780','مكان0781','مكان0782','مكان0783','مكان0784','مكان0785','مكان0786','مكان0787','مكان0788','مكان0789','مكان0790','مكان0791','مكان0792','مكان0793','مكان0794','مكان0795','مكان0796','مكان0797','مكان0798','مكان0799','مكان0800','مكان0801','مكان0802','مكان0803','مكان0804','مكان0805','مكان0806','مكان0807','مكان0808','مكان0809','مكان0810','مكان0811','مكان0812','مكان0813','مكان0814','مكان0815','مكان0816','مكان0817','مكان0818','مكان0819','مكان0820','مكان0821','مكان0822','مكان0823','مكان0824','مكان0825','مكان0826','مكان0827','مكان0828','مكان0829','مكان0830','مكان0831','مكان0832','مكان0833','مكان0834','مكان0835','مكان0836','مكان0837','مكان0838','مكان0839','مكان0840','مكان0841','مكان0842','مكان0843','مكان0844','مكان0845','مكان0846','مكان0847','مكان0848','مكان0849','مكان0850','مكان0851','مكان0852','مكان0853','مكان0854','مكان0855','مكان0856','مكان0857','مكان0858','مكان0859','مكان0860','مكان0861','مكان0862','مكان0863','مكان0864','مكان0865','مكان0866','مكان0867','مكان0868','مكان0869','مكان0870','مكان0871','مكان0872','مكان0873','مكان0874','مكان0875','مكان0876','مكان0877','مكان0878','مكان0879','مكان0880','مكان0881','مكان0882','مكان0883','مكان0884','مكان0885','مكان0886','مكان0887','مكان0888','مكان0889','مكان0890','مكان0891','مكان0892','مكان0893','مكان0894','مكان0895','مكان0896','مكان0897','مكان0898','مكان0899','مكان0900','مكان0901','مكان0902','مكان0903','مكان0904','مكان0905','مكان0906','مكان0907','مكان0908','مكان0909','مكان0910','مكان0911','مكان0912','مكان0913','مكان0914','مكان0915','مكان0916','مكان0917','مكان0918','مكان0919','مكان0920','مكان0921','مكان0922','مكان0923','مكان0924','مكان0925','مكان0926','مكان0927','مكان0928','مكان0929','مكان0930','مكان0931','مكان0932','مكان0933','مكان0934','مكان0935','مكان0936','مكان0937','مكان0938','مكان0939','مكان0940','مكان0941','مكان0942','مكان0943','مكان0944','مكان0945','مكان0946','مكان0947','مكان0948','مكان0949','مكان0950','مكان0951','مكان0952','مكان0953','مكان0954','مكان0955','مكان0956','مكان0957','مكان0958','مكان0959','مكان0960','مكان0961','مكان0962','مكان0963','مكان0964','مكان0965','مكان0966','مكان0967','مكان0968','مكان0969','مكان0970','مكان0971','مكان0972','مكان0973','مكان0974','مكان0975','مكان0976','مكان0977','مكان0978','مكان0979','مكان0980','مكان0981','مكان0982','مكان0983','مكان0984','مكان0985','مكان0986','مكان0987','مكان0988','مكان0989','مكان0990','مكان0991','مكان0992','مكان0993','مكان0994','مكان0995','مكان0996','مكان0997','مكان0998','مكان0999','مكان1000','مكان1001','مكان1002','مكان1003','مكان1004','مكان1005','مكان1006','مكان1007','مكان1008','مكان1009','مكان1010','مكان1011','مكان1012','مكان1013','مكان1014','مكان1015','مكان1016','مكان1017','مكان1018','مكان1019','مكان1020','مكان1021','مكان1022','مكان1023','مكان1024','مكان1025','مكان1026','مكان1027','مكان1028','مكان1029','مكان1030','مكان1031','مكان1032','مكان1033','مكان1034','مكان1035','مكان1036','مكان1037','مكان1038','مكان1039','مكان1040','مكان1041','مكان1042','مكان1043','مكان1044','مكان1045','مكان1046','مكان1047','مكان1048','مكان1049','مكان1050','مكان1051','مكان1052','مكان1053','مكان1054','مكان1055','مكان1056','مكان1057','مكان1058','مكان1059','مكان1060','مكان1061','مكان1062','مكان1063','مكان1064','مكان1065','مكان1066','مكان1067','مكان1068','مكان1069','مكان1070','مكان1071','مكان1072','مكان1073','مكان1074','مكان1075','مكان1076','مكان1077','مكان1078','مكان1079','مكان1080','مكان1081','مكان1082','مكان1083','مكان1084','مكان1085','مكان1086','مكان1087','مكان1088','مكان1089','مكان1090','مكان1091','مكان1092','مكان1093','مكان1094','مكان1095','مكان1096','مكان1097','مكان1098','مكان1099','مكان1100','مكان1101','مكان1102','مكان1103','مكان1104','مكان1105','مكان1106','مكان1107','مكان1108','مكان1109','مكان1110','مكان1111','مكان1112','مكان1113','مكان1114','مكان1115','مكان1116','مكان1117','مكان1118','مكان1119','مكان1120','مكان1121','مكان1122','مكان1123','مكان1124','مكان1125','مكان1126','مكان1127','مكان1128','مكان1129','مكان1130','مكان1131','مكان1132','مكان1133','مكان1134','مكان1135','مكان1136','مكان1137','مكان1138','مكان1139','مكان1140','مكان1141','مكان1142','مكان1143','مكان1144','مكان1145','مكان1146','مكان1147','مكان1148','مكان1149','مكان1150','مكان1151','مكان1152','مكان1153','مكان1154','مكان1155','مكان1156','مكان1157','مكان1158','مكان1159','مكان1160','مكان1161','مكان1162','مكان1163','مكان1164','مكان1165','مكان1166','مكان1167','مكان1168','مكان1169','مكان1170','مكان1171','مكان1172','مكان1173','مكان1174','مكان1175','مكان1176','مكان1177','مكان1178','مكان1179','مكان1180','مكان1181','مكان1182','مكان1183','مكان1184','مكان1185','مكان1186','مكان1187','مكان1188','مكان1189','مكان1190','مكان1191','مكان1192','مكان1193','مكان1194','مكان1195','مكان1196','مكان1197','مكان1198','مكان1199','مكان1200','مكان1201','مكان1202','مكان1203','مكان1204','مكان1205','مكان1206','مكان1207','مكان1208','مكان1209','مكان1210','مكان1211','مكان1212','مكان1213','مكان1214','مكان1215','مكان1216','مكان1217','مكان1218','مكان1219','مكان1220','مكان1221','مكان1222','مكان1223','مكان1224','مكان1225','مكان1226','مكان1227','مكان1228','مكان1229','مكان1230','مكان1231','مكان1232','مكان1233','مكان1234','مكان1235','مكان1236','مكان1237','مكان1238','مكان1239','مكان1240','مكان1241','مكان1242','مكان1243','مكان1244','مكان1245','مكان1246','مكان1247','مكان1248','مكان1249','مكان1250','مكان1251','مكان1252','مكان1253','مكان1254','مكان1255','مكان1256','مكان1257','مكان1258','مكان1259','مكان1260','مكان1261','مكان1262','مكان1263','مكان1264','مكان1265','مكان1266','مكان1267','مكان1268','مكان1269','مكان1270','مكان1271','مكان1272','مكان1273','مكان1274','مكان1275','مكان1276','مكان1277','مكان1278','مكان1279','مكان1280','مكان1281','مكان1282','مكان1283','مكان1284','مكان1285','مكان1286','مكان1287','مكان1288','مكان1289','مكان1290','مكان1291','مكان1292','مكان1293','مكان1294','مكان1295','مكان1296','مكان1297','مكان1298','مكان1299','مكان1300','مكان1301','مكان1302','مكان1303','مكان1304','مكان1305','مكان1306','مكان1307','مكان1308','مكان1309','مكان1310','مكان1311','مكان1312','مكان1313','مكان1314','مكان1315','مكان1316','مكان1317','مكان1318','مكان1319','مكان1320','مكان1321','مكان1322','مكان1323','مكان1324','مكان1325','مكان1326','مكان1327','مكان1328','مكان1329','مكان1330','مكان1331','مكان1332','مكان1333','مكان1334','مكان1335','مكان1336','مكان1337','مكان1338','مكان1339','مكان1340','مكان1341','مكان1342','مكان1343','مكان1344','مكان1345','مكان1346','مكان1347','مكان1348','مكان1349','مكان1350','مكان1351','مكان1352','مكان1353','مكان1354','مكان1355','مكان1356','مكان1357','مكان1358','مكان1359','مكان1360','مكان1361','مكان1362','مكان1363','مكان1364','مكان1365','مكان1366','مكان1367','مكان1368','مكان1369','مكان1370','مكان1371','مكان1372','مكان1373','مكان1374','مكان1375','مكان1376','مكان1377','مكان1378','مكان1379','مكان1380','مكان1381','مكان1382','مكان1383','مكان1384','مكان1385','مكان1386','مكان1387','مكان1388','مكان1389','مكان1390','مكان1391','مكان1392','مكان1393','مكان1394','مكان1395','مكان1396','مكان1397','مكان1398','مكان1399','مكان1400','مكان1401','مكان1402','مكان1403','مكان1404','مكان1405','مكان1406','مكان1407','مكان1408','مكان1409','مكان1410','مكان1411','مكان1412','مكان1413','مكان1414','مكان1415','مكان1416','مكان1417','مكان1418','مكان1419','مكان1420','مكان1421','مكان1422','مكان1423','مكان1424','مكان1425','مكان1426','مكان1427','مكان1428','مكان1429','مكان1430','مكان1431','مكان1432','مكان1433','مكان1434','مكان1435','مكان1436','مكان1437','مكان1438','مكان1439','مكان1440','مكان1441','مكان1442','مكان1443','مكان1444','مكان1445','مكان1446','مكان1447','مكان1448','مكان1449','مكان1450','مكان1451','مكان1452','مكان1453','مكان1454','مكان1455','مكان1456','مكان1457','مكان1458','مكان1459','مكان1460','مكان1461','مكان1462','مكان1463','مكان1464','مكان1465','مكان1466','مكان1467','مكان1468','مكان1469','مكان1470','مكان1471','مكان1472','مكان1473','مكان1474','مكان1475','مكان1476','مكان1477','مكان1478','مكان1479','مكان1480','مكان1481','مكان1482','مكان1483','مكان1484','مكان1485','مكان1486','مكان1487','مكان1488','مكان1489','مكان1490','مكان1491','مكان1492','مكان1493','مكان1494','مكان1495','مكان1496','مكان1497','مكان1498','مكان1499','مكان1500','مكان1501','مكان1502','مكان1503','مكان1504','مكان1505','مكان1506','مكان1507','مكان1508','مكان1509','مكان1510','مكان1511','مكان1512','مكان1513','مكان1514','مكان1515','مكان1516','مكان1517','مكان1518','مكان1519','مكان1520','مكان1521','مكان1522','مكان1523','مكان1524','مكان1525','مكان1526','مكان1527','مكان1528','مكان1529','مكان1530','مكان1531','مكان1532','مكان1533','مكان1534','مكان1535','مكان1536','مكان1537','مكان1538','مكان1539','مكان1540','مكان1541','مكان1542','مكان1543','مكان1544','مكان1545','مكان1546','مكان1547','مكان1548','مكان1549','مكان1550','مكان1551','مكان1552','مكان1553','مكان1554','مكان1555','مكان1556','مكان1557','مكان1558','مكان1559','مكان1560','مكان1561','مكان1562','مكان1563','مكان1564','مكان1565','مكان1566','مكان1567','مكان1568','مكان1569','مكان1570','مكان1571','مكان1572','مكان1573','مكان1574','مكان1575','مكان1576','مكان1577','مكان1578','مكان1579','مكان1580','مكان1581','مكان1582','مكان1583','مكان1584','مكان1585','مكان1586','مكان1587','مكان1588','مكان1589','مكان1590','مكان1591','مكان1592','مكان1593','مكان1594','مكان1595','مكان1596','مكان1597','مكان1598','مكان1599','مكان1600','مكان1601','مكان1602','مكان1603','مكان1604','مكان1605','مكان1606','مكان1607','مكان1608','مكان1609','مكان1610','مكان1611','مكان1612','مكان1613','مكان1614','مكان1615','مكان1616','مكان1617','مكان1618','مكان1619','مكان1620','مكان1621','مكان1622','مكان1623','مكان1624','مكان1625','مكان1626','مكان1627','مكان1628','مكان1629','مكان1630','مكان1631','مكان1632','مكان1633','مكان1634','مكان1635','مكان1636','مكان1637','مكان1638','مكان1639','مكان1640','مكان1641','مكان1642','مكان1643','مكان1644','مكان1645','مكان1646','مكان1647','مكان1648','مكان1649','مكان1650','مكان1651','مكان1652','مكان1653','مكان1654','مكان1655','مكان1656','مكان1657','مكان1658','مكان1659','مكان1660','مكان1661','مكان1662','مكان1663','مكان1664','مكان1665','مكان1666','مكان1667','مكان1668','مكان1669','مكان1670','مكان1671','مكان1672','مكان1673','مكان1674','مكان1675','مكان1676','مكان1677','مكان1678','مكان1679','مكان1680','مكان1681','مكان1682','مكان1683','مكان1684','مكان1685','مكان1686','مكان1687','مكان1688','مكان1689','مكان1690','مكان1691','مكان1692','مكان1693','مكان1694','مكان1695','مكان1696','مكان1697','مكان1698','مكان1699','مكان1700','مكان1701','مكان1702','مكان1703','مكان1704','مكان1705','مكان1706','مكان1707','مكان1708','مكان1709','مكان1710','مكان1711','مكان1712','مكان1713','مكان1714','مكان1715','مكان1716','مكان1717','مكان1718','مكان1719','مكان1720','مكان1721','مكان1722','مكان1723','مكان1724','مكان1725','مكان1726','مكان1727','مكان1728','مكان1729','مكان1730','مكان1731','مكان1732','مكان1733','مكان1734','مكان1735','مكان1736','مكان1737','مكان1738','مكان1739','مكان1740','مكان1741','مكان1742','مكان1743','مكان1744','مكان1745','مكان1746','مكان1747','مكان1748','مكان1749','مكان1750','مكان1751','مكان1752','مكان1753','مكان1754','مكان1755','مكان1756','مكان1757','مكان1758','مكان1759','مكان1760','مكان1761','مكان1762','مكان1763','مكان1764','مكان1765','مكان1766','مكان1767','مكان1768','مكان1769','مكان1770','مكان1771','مكان1772','مكان1773','مكان1774','مكان1775','مكان1776','مكان1777','مكان1778','مكان1779','مكان1780','مكان1781','مكان1782','مكان1783','مكان1784','مكان1785','مكان1786','مكان1787','مكان1788','مكان1789','مكان1790','مكان1791','مكان1792','مكان1793','مكان1794','مكان1795','مكان1796','مكان1797','مكان1798','مكان1799','مكان1800','مكان1801','مكان1802','مكان1803','مكان1804','مكان1805','مكان1806','مكان1807','مكان1808','مكان1809','مكان1810','مكان1811','مكان1812','مكان1813','مكان1814','مكان1815','مكان1816','مكان1817','مكان1818','مكان1819','مكان1820','مكان1821','مكان1822','مكان1823','مكان1824','مكان1825','مكان1826','مكان1827','مكان1828','مكان1829','مكان1830','مكان1831','مكان1832','مكان1833','مكان1834','مكان1835','مكان1836','مكان1837','مكان1838','مكان1839','مكان1840','مكان1841','مكان1842','مكان1843','مكان1844','مكان1845','مكان1846','مكان1847','مكان1848','مكان1849','مكان1850','مكان1851','مكان1852','مكان1853','مكان1854','مكان1855','مكان1856','مكان1857','مكان1858','مكان1859','مكان1860','مكان1861','مكان1862','مكان1863','مكان1864','مكان1865','مكان1866','مكان1867','مكان1868','مكان1869','مكان1870','مكان1871','مكان1872','مكان1873','مكان1874','مكان1875','مكان1876','مكان1877','مكان1878','مكان1879','مكان1880','مكان1881','مكان1882','مكان1883','مكان1884','مكان1885','مكان1886','مكان1887','مكان1888','مكان1889','مكان1890','مكان1891','مكان1892','مكان1893','مكان1894','مكان1895','مكان1896','مكان1897','مكان1898','مكان1899','مكان1900','مكان1901','مكان1902','مكان1903','مكان1904','مكان1905','مكان1906','مكان1907','مكان1908','مكان1909','مكان1910','مكان1911','مكان1912','مكان1913','مكان1914','مكان1915','مكان1916','مكان1917','مكان1918','مكان1919','مكان1920','مكان1921','مكان1922','مكان1923','مكان1924','مكان1925','مكان1926','مكان1927','مكان1928','مكان1929','مكان1930','مكان1931','مكان1932','مكان1933','مكان1934','مكان1935','مكان1936','مكان1937','مكان1938','مكان1939','مكان1940','مكان1941','مكان1942','مكان1943','مكان1944','مكان1945','مكان1946','مكان1947','مكان1948','مكان1949','مكان1950','مكان1951','مكان1952','مكان1953','مكان1954','مكان1955','مكان1956','مكان1957','مكان1958','مكان1959','مكان1960','مكان1961','مكان1962','مكان1963','مكان1964','مكان1965','مكان1966','مكان1967','مكان1968','مكان1969','مكان1970','مكان1971','مكان1972','مكان1973','مكان1974','مكان1975','مكان1976','مكان1977','مكان1978','مكان1979','مكان1980','مكان1981','مكان1982','مكان1983','مكان1984','مكان1985','مكان1986','مكان1987','مكان1988','مكان1989','مكان1990','مكان1991','مكان1992','مكان1993','مكان1994','مكان1995','مكان1996','مكان1997','مكان1998','مكان1999','مكان2000','مكان2001','مكان2002','مكان2003','مكان2004','مكان2005','مكان2006','مكان2007','مكان2008','مكان2009','مكان2010','مكان2011','مكان2012','مكان2013','مكان2014','مكان2015','مكان2016','مكان2017','مكان2018','مكان2019','مكان2020','مكان2021','مكان2022','مكان2023','مكان2024','مكان2025','مكان2026','مكان2027','مكان2028','مكان2029','مكان2030','مكان2031','مكان2032','مكان2033','مكان2034','مكان2035','مكان2036','مكان2037','مكان2038','مكان2039','مكان2040','مكان2041','مكان2042','مكان2043','مكان2044','مكان2045','مكان2046','مكان2047','مكان2048'],
  ru:['Новгород','Псков','Суздаль','Владимир','Ростов','Переяславль','Углич','Кострома','Ярославль','Рязань','Тверь','Коломна','Серпухов','Можайск','Звенигород','Дмитров','Клин','Боровск','Калуга','Тула','Орёл','Курск','Белгород','Воронеж','Елец','Липецк','Тамбов','Пенза','Саранск','Ульяновск','Симбирск','Казань','Астрахань','Самара','Саратов','Волгоград','Краснодар','Ставрополь','Пятигорск','Кисловодск','Ессентуки','Железноводск','Нальчик','Черкесск','Владикавказ','Грозный','Майкоп','Элиста','Симферополь','Севастополь','Керчь','Феодосия','Ялта','Евпатория','Судак','Москва','Санкт','Новосибирск','Екатеринбург','Нижний','Челябинск','Уфа','Пермь','Красноярск','Тольятти','Ижевск','Барнаул','Иркутск','Хабаровск','Владивосток','Махачкала','Томск','Оренбург','Кемерово','Новокузнецк','Набережные','Киров','Чебоксары','Калининград','Брянск','Иваново','Магнитогорск','Сочи','Архангельск','Сургут','Смоленск','Чита','Курган','Улан','Нижнекамск','Байкал','Ангара','Лена','Обь','Иртыш','Енисей','Амур','Колыма','Индигирка','Яна','Вилюй','Алдан','Витим','Олёкма','Зея','Бурея','Якутск','Магадан','Норильск','Воркута','Инта','Муромцево','Тобольск','Тюмень','Омск','Абакан','Кызыл','Ангарск','Братск','Усть','Благовещенск','Биробиджан','Комсомольск','Находка','Уссурийск','Артём','Арсеньев','Петропавловск','Анадырь','Палана','Тиличики','Козыревск','Мильково','Вилючинск','Урал','Алтай','Саяны','Хибины','Кавказ','Эльбрус','Казбек','Белуха','Мунку','Топографы','Победа','Денали','Арктика','Тайга','Тундра','Лесотундра','Ладога','Онега','Ильмень','Белое','Рыбинск','Иваньково','Горьков','Куйбышев','Цимлянск','Нарын','Токтогул','Волга','Дон','Печора','Кама','Ока','Белая','Чусовая','Тобол','Ишим','Пышма','Тура','Тавда','Сосьва','Вагай','Демьянка','Катунь','Бия','Томь','Чулым','Кеть','Васюган','Тым','Пайдугина','Парабель','Чая','берёза','сосна','дуб','клён','ясень','ива','тополь','рябина','черёмуха','калина','орёл','сокол','ястреб','журавль','лебедь','цапля','аист','дятел','соловей','кукушка','волк','медведь','лиса','заяц','белка','олень','лось','кабан','рысь','бобёр','красный','синий','зелёный','белый','чёрный','жёлтый','оранжевый','фиолетовый','розовый','коричневый','серый','серебряный','золотой','голубой','бирюзовый','малиновый','алый','янтарный','кремовый','бежевый','лазурный','багровый','пурпурный','изумрудный','сапфировый','рубиновый','жемчужный','платиновый','бронзовый','январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь','понедельник','вторник','среда','четверг','пятница','суббота','воскресенье','один','два','три','четыре','пять','шесть','семь','восемь','девять','десять','одиннадцать','двенадцать','двадцать','тридцать','сорок','пятьдесят','сто','тысяча','Рюрик','Олег','Игорь','Ольга','Святослав','Ярослав','Мстислав','Дмитрий','Иван','Василий','Борис','Андрей','Александр','Михаил','Николай','Пушкин','Толстой','Достоевский','Тургенев','Гоголь','Чехов','Некрасов','Лермонтов','Репин','Суриков','Шишкин','Куинджи','Айвазовский','Левитан','Врубель','Серов','Чайковский','Мусоргский','Бородин','Глинка','Рахманинов','Скрябин','Прокофьев','Шостакович','Кремль','Эрмитаж','Петергоф','Третьяковка','Большой','Мариинский','Русский','Исаакий','рассвет','закат','полдень','полночь','aurora','полярное','сполохи','северное','снегопад','метель','вьюга','буран','поземка','гололёд','наледь','проталина','распутица','половодье','паводок','ледоход','ледостав','осенний','весенний','летний','Масленица','Пасха','Рождество','Новый','Троица','Спас','Покров','Крещение','Сретение','Благовещение','Вербное','Преображение','Успение','Петров','Ильин','борщ','щи','уха','солянка','окрошка','рассольник','ботвинья','свекольник','пельмени','вареники','блины','пирожки','кулебяка','расстегай','ватрушка','баранка','квас','кефир','ряженка','сметана','творог','варенье','мёд','сбитень','водка','медовуха','наливка','настойка','самогон','брага','пиво','вино','кремль','терем','изба','хата','курень','землянка','юрта','чум','яранга','ярта','церковь','собор','монастырь','колокольня','трапезная','паперть','притвор','алтарь','иконостас','Киев','Харьков','Одесса','Днепр','Донецк','Запорожье','Львов','Минск','Алматы','Нур','Ташкент','Самарканд','Бишкек','Душанбе','Ашхабад','Баку','Тбилиси','Ереван','Кишинёв','Таллин','Рига','Вильнюс','Варшава','Прага','север','юг','восток','запад','центр','верх','низ','внутри','снаружи','середина','Северныйгород','Северныйрека','Северныйгора','Северныйозеро','Северныйморе','Северныйостров','Северныйзалив','Северныймыс','Северныйдолина','Северныйравнина','Южныйгород','Южныйрека','Южныйгора','Южныйозеро','Южныйморе','Южныйостров','Южныйзалив','Южныймыс','Южныйдолина','Южныйравнина','Восточныйгород','Восточныйрека','Восточныйгора','Восточныйозеро','Восточныйморе','Восточныйостров','Восточныйзалив','Восточныймыс','Восточныйдолина','Восточныйравнина','Западныйгород','Западныйрека','Западныйгора','Западныйозеро','Западныйморе','Западныйостров','Западныйзалив','Западныймыс','Западныйдолина','Западныйравнина','Новыйгород','Новыйрека','Новыйгора','Новыйозеро','Новыйморе','Новыйостров','Новыйзалив','Новыймыс','Новыйдолина','Новыйравнина','Старыйгород','Старыйрека','Старыйгора','Старыйозеро','Старыйморе','Старыйостров','Старыйзалив','Старыймыс','Старыйдолина','Старыйравнина','Большойгород','Большойрека','Большойгора','Большойозеро','Большойморе','Большойостров','Большойзалив','Большоймыс','Большойдолина','Большойравнина','Малыйгород','Малыйрека','Малыйгора','Малыйозеро','Малыйморе','Малыйостров','Малыйзалив','Малыймыс','Малыйдолина','Малыйравнина','Красныйгород','Красныйрека','Красныйгора','Красныйозеро','Красныйморе','Красныйостров','Красныйзалив','Красныймыс','Красныйдолина','Красныйравнина','Белыйгород','Белыйрека','Белыйгора','Белыйозеро','Белыйморе','Белыйостров','Белыйзалив','Белыймыс','Белыйдолина','Белыйравнина','красныйсолнце','красныйлуна','красныйморе','красныйрека','красныйгора','красныйветер','красныйдождь','красныйснег','красныйцветок','красныйптица','синийсолнце','синийлуна','синийморе','синийрека','синийгора','синийветер','синийдождь','синийснег','синийцветок','синийптица','зелёныйсолнце','зелёныйлуна','зелёныйморе','зелёныйрека','зелёныйгора','зелёныйветер','зелёныйдождь','зелёныйснег','зелёныйцветок','зелёныйптица','белыйсолнце','белыйлуна','белыйморе','белыйрека','белыйгора','белыйветер','белыйдождь','белыйснег','белыйцветок','белыйптица','чёрныйсолнце','чёрныйлуна','чёрныйморе','чёрныйрека','чёрныйгора','чёрныйветер','чёрныйдождь','чёрныйснег','чёрныйцветок','чёрныйптица','золотойсолнце','золотойлуна','золотойморе','золотойрека','золотойгора','золотойветер','золотойдождь','золотойснег','золотойцветок','золотойптица','серебряныйсолнце','серебряныйлуна','серебряныйморе','серебряныйрека','серебряныйгора','серебряныйветер','серебряныйдождь','серебряныйснег','серебряныйцветок','серебряныйптица','серыйсолнце','серыйлуна','серыйморе','серыйрека','серыйгора','серыйветер','серыйдождь','серыйснег','серыйцветок','серыйптица','розовыйсолнце','розовыйлуна','розовыйморе','розовыйрека','розовыйгора','розовыйветер','розовыйдождь','розовыйснег','розовыйцветок','розовыйптица','фиолетовыйсолнце','фиолетовыйлуна','фиолетовыйморе','фиолетовыйрека','фиолетовыйгора','фиолетовыйветер','фиолетовыйдождь','фиолетовыйснег','фиолетовыйцветок','фиолетовыйптица','веснадождь','веснаветер','веснатуман','веснамороз','веснаснег','веснагроза','веснарадуга','веснароса','веснаиней','веснапурга','летодождь','летоветер','летотуман','летомороз','летоснег','летогроза','леторадуга','летороса','летоиней','летопурга','осеньдождь','осеньветер','осеньтуман','осеньмороз','осеньснег','осеньгроза','осеньрадуга','осеньроса','осеньиней','осеньпурга','зимадождь','зимаветер','зиматуман','зимамороз','зимаснег','зимагроза','зимарадуга','зимароса','зимаиней','зимапурга','первыйберег','первыйлес','первыйполе','первыйсад','первыйдвор','первыймост','первыйпуть','первыйкрай','первыйбор','первыйлуг','второйберег','второйлес','второйполе','второйсад','второйдвор','второймост','второйпуть','второйкрай','второйбор','второйлуг','третийберег','третийлес','третийполе','третийсад','третийдвор','третиймост','третийпуть','третийкрай','третийбор','третийлуг','четвёртыйберег','четвёртыйлес','четвёртыйполе','четвёртыйсад','четвёртыйдвор','четвёртыймост','четвёртыйпуть','четвёртыйкрай','четвёртыйбор','четвёртыйлуг','пятыйберег','пятыйлес','пятыйполе','пятыйсад','пятыйдвор','пятыймост','пятыйпуть','пятыйкрай','пятыйбор','пятыйлуг','шестойберег','шестойлес','шестойполе','шестойсад','шестойдвор','шестоймост','шестойпуть','шестойкрай','шестойбор','шестойлуг','седьмойберег','седьмойлес','седьмойполе','седьмойсад','седьмойдвор','седьмоймост','седьмойпуть','седьмойкрай','седьмойбор','седьмойлуг','восьмойберег','восьмойлес','восьмойполе','восьмойсад','восьмойдвор','восьмоймост','восьмойпуть','восьмойкрай','восьмойбор','восьмойлуг','девятыйберег','девятыйлес','девятыйполе','девятыйсад','девятыйдвор','девятыймост','девятыйпуть','девятыйкрай','девятыйбор','девятыйлуг','десятыйберег','десятыйлес','десятыйполе','десятыйсад','десятыйдвор','десятыймост','десятыйпуть','десятыйкрай','десятыйбор','десятыйлуг','Северогорск','Североморск','Североречск','Северопольск','Северолесск','Северогород','Североуральск','Северосибирск','Северодонск','Североволжск','Южногорск','Южноморск','Южноречск','Южнопольск','Южнолесск','Южногород','Южноуральск','Южносибирск','Южнодонск','Южноволжск','Восточногорск','Восточноморск','Восточноречск','Восточнопольск','Восточнолесск','Восточногород','Восточноуральск','Восточносибирск','Восточнодонск','Восточноволжск','Западногорск','Западноморск','Западноречск','Западнопольск','Западнолесск','Западногород','Западноуральск','Западносибирск','Западнодонск','Западноволжск','Новогорск','Новоморск','Новоречск','Новопольск','Новолесск','Новогород','Новоуральск','Новодонск','Нововолжск','Старогорск','Староморск','Староречск','Старопольск','Старолесск','Старогород','Староуральск','Старосибирск','Стародонск','Староволжск','Красногорск','Красноморск','Красноречск','Краснопольск','Краснолесск','Красногород','Красноуральск','Красносибирск','Краснодонск','Красноволжск','Белогорск','Беломорск','Белоречск','Белопольск','Белолесск','Белогород','Белоуральск','Белосибирск','Белодонск','Беловолжск','Черногорск','Черноморск','Черноречск','Чернопольск','Чернолесск','Черногород','Черноуральск','Черносибирск','Чернодонск','Черноволжск','Зеленогорск','Зеленоморск','Зеленоречск','Зеленопольск','Зеленолесск','Зеленогород','Зеленоуральск','Зеленосибирск','Зеленодонск','Зеленоволжск','Александров','Андреев','Борисов','Васильев','Георгиев','Дмитриев','Иванов','Кириллов','Лаврентьев','Александровка','Андреевка','Борисовка','Васильевка','Георгиевка','Дмитриевка','Ивановка','Кирилловка','Лаврентьевка','Александрово','Андреево','Борисово','Васильево','Георгиево','Дмитриево','Кириллово','Лаврентьево','Анапа','Армавир','Балашов','Батайск','Бийск','Буйнакск','Глазов','Горно','Губкин','Гусь','Дербент','Димитровград','Железногорск','Зеленоград','Златоуст','Каменск','Канск','Кинешма','Когалым','Копейск','Королёв','Котлас','Крымск','Ленинск','Миасс','Мурманск','Муром','Нефтеюганск','Нижневартовск','Новороссийск','Новочеркасск','Новошахтинск','Обнинск','Орск','Первоуральск','Петрозаводск','Прокопьевск','Рубцовск','Сальск','Стерлитамак','Таганрог','Шахты','Энгельс','Красногорье','Краснопольe','Красноморье','Красноречье','Белогорье','Белопольe','Беломорье','Белоречье','Черногорье','Чернопольe','Черноморье','Черноречье','Зеленогорье','Зеленопольe','Зеленоморье','Зеленоречье','Синегорск','Синепольск','Синеморск','Синеречск','Синегорье','Синепольe','Синеморье','Синеречье','Синелесск','Новогорье','Новопольe','Новоморье','Новоречье','Старогорье','Старопольe','Староморье','Староречье','Великогорск','Великопольск','Великоморск','Великоречск','Великогорье','Великопольe','Великоморье','Великоречье','Великолесск','Малогорск','Малопольск','Маломорск','Малоречск','Малогорье','Малопольe','Маломорье','Малоречье','Малолесск','Высокогорск','Высокопольск','Высокоморск','Высокоречск','Высокогорье','Высокопольe','Высокоморье','Высокоречье','Высоколесск','Алексейов','Алексейево','Алексейино','Алексейово','Алексейск','Алексейка','Алексейцк','Алексейнск','Алексейвск','Борисево','Борисино','Борисск','Бориска','Борисцк','Бориснск','Борисвск','Василийов','Василийево','Василийино','Василийово','Василийск','Василийка','Василийцк','Василийнск','Василийвск','Григорийов','Григорийево','Григорийино','Григорийово','Григорийск','Григорийка','Григорийцк','Григорийнск','Григорийвск','Дмитрийов','Дмитрийево','Дмитрийино','Дмитрийово','Дмитрийск','Дмитрийка','Дмитрийцк','Дмитрийнск','Дмитрийвск','Евгенийов','Евгенийево','Евгенийино','Евгенийово','Евгенийск','Евгенийка','Евгенийцк','Евгенийнск','Евгенийвск','Иванево','Иванино','Иванск','Иванка','Иванцк','Иваннск','Иванвск','Константинов','Константинево','Константинино','Константиново','Константинск','Константинка','Константинцк','Константиннск','Константинвск','Леонидов','Леонидево','Леонидино','Леонидово','Леонидск','Леонидка','Леонидцк','Леониднск','Леонидвск','Михаилов','Михаилево','Михаилино','Михаилово','Михаилск','Михаилка','Михаилцк','Михаилнск','Михаилвск','Алей','Амга','Анива','Аргунь','Аркагала','Арысь','Асса','Ахтуба','Ачинск','Аян','Бакал','Балей','Балта','Барабаш','Батуми','Белебей','Белово','Белозерск','Белорецк','Белоярский','Берёзово','Берёзовский','Бикин','Билибино','Бирск','Бологое','Борисоглебск','Боровичи','Бугульма','Бугуруслан','Буй','Бузулук','Быково','Валдай','Валуйки','Великие','Вельск','Верещагино','Верхоянск','Вилюйск','Вичуга','Волжск','Воткинск','Всеволожск','Вязники','Гатчина','Геленджик','Грязовец','Губаха','Гудермес','Гулькевичи','Гусиноозерск','Дзержинск','Добрянка','Дубна','Дудинка','Духовщина','Ейск','Елабуга','Ельня','Енисейск','Ефремов','Жигулёвск','Жирновск','Жуков','Заречный','Зарайск','Заринск','Зерноград','Зима','Змеиногорск','Зубцов','Иланский','Ипатово','Ирбит','Исилькуль','Ишимбай','Йошкар','Кадников','Калач','Каменка','Камень','Камешково','Камызяк','Кандалакша','Карабаново','Карабаш','Карасук','Карачев','Каргополь','Кизилюрт','Кизляр','Кимовск','Кимры','Кинель','Кириши','Кирово','Кировск','Кирс','Кирсанов','Киселёвск','Клинцы','Ковров','Ковылкино','Козьмодемьянск','Колпашево','Колпино','Коммунар','Кольчугино','Кондопога','Коркино','Корсаков','Костомукша','Котельники','Котельнич','Краснокаменск','Красноперекопск','Краснотурьинск','Красноуфимск','Красный','Кропоткин','Кузнецк','Кулебаки','Куровское','Лабинск','Лангепас','Лениногорск','Лесной','Лесозаводск','Лида','Лиски','Лобня','Лысково','Лысьва','Малгобек','Мариинск','Маркс','Медногорск','Межгорье','Менделеевск','Миллерово','Минеральные','Михайловка','Михайловск','Мичуринск','Можга','Моздок','Мончегорск','Мурино','Мценск','Надым','Назрань','Нарьян','Нерюнгри','Нефтекамск','Нижнеудинск','Нижняя','Никольск','Новоалтайск','Новодвинск','Новозыбков','Новокубанск','Новомосковск','Новопавловск','Новотроицк','Новочебоксарск','Ногинск','Нытва','Октябрьский','Олёкминск','Оленегорск','Орехово','Орлов','Осинники','Остров','Отрадный','Охта','Павлово','Павловск','Партизанск','Переславль','Петровск','Полевской','Полысаево','Поронайск','Протвино','Пугачёв','Пушкино','Пыть','Радужный','Ревда','Реж','Россошь','Рославль','Руза','Рыльск','Саки','Саров','Саянск','Семилуки','Сибай','Сим','Скопин','Славянск','Слободской','Сокол','Солнечногорск','Соликамск','Сосногорск','Среднеколымск','Стрежевой','Сызрань','Тайшет','Северный берег','Северный лес','Северный поле','Северный луг','Северный пруд','Северный ручей','Северный родник','Северный роща','Северный бор','Северный сад','Южный берег','Южный лес','Южный поле','Южный луг','Южный пруд','Южный ручей','Южный родник','Южный роща','Южный бор','Южный сад','Восточный берег','Восточный лес','Восточный поле','Восточный луг','Восточный пруд','Восточный ручей','Восточный родник','Восточный роща','Восточный бор','Восточный сад','Западный берег','Западный лес','Западный поле','Западный луг','Западный пруд','Западный ручей','Западный родник','Западный роща','Западный бор','Западный сад','Центральный берег','Центральный лес','Центральный поле','Центральный луг','Центральный пруд','Центральный ручей','Центральный родник','Центральный роща','Центральный бор','Центральный сад','Верхний берег','Верхний лес','Верхний поле','Верхний луг','Верхний пруд','Верхний ручей','Верхний родник','Верхний роща','Верхний бор','Верхний сад','Нижний берег','Нижний лес','Нижний поле','Нижний луг','Нижний пруд','Нижний ручей','Нижний родник','Нижний роща','Нижний бор','Нижний сад','Новый берег','Новый лес','Новый поле','Новый луг','Новый пруд','Новый ручей','Новый родник','Новый роща','Новый бор','Новый сад','Старый берег','Старый лес','Старый поле','Старый луг','Старый пруд','Старый ручей','Старый родник','Старый роща','Старый бор','Старый сад','Красный берег','Красный лес','Красный поле','Красный луг','Красный пруд','Красный ручей','Красный родник','Красный роща','Красный бор','Красный сад','Тарко','Тихвин','Тихорецк','Тоглиатти','Торжок','Тосно','Троицк','Туапсе','Тулун','Туринск','Уварово','Углегорск','Удачный','Ужур','Урай','Урус','Усинск','Усолье','Ухта','Фокино','Фрязево','Фурманов','Ханты','Харабали','Харцызск','Хасавюрт','Хвалынск','Химки','Холмск','Чапаевск','Чегем','Черепаново','Чернушка','Чусовой','Шадринск','Шали','Шелехов','Шуя','Щёкино','Щёлково','Юрга','Юрьевец','Юрьев','Ялуторовск','Ярцево','Ясногорск','Яшкино','Тихий ключ','Тихий исток','Тихий брод','Тихий омут','Тихий порог','Тихий перекат','Тихий излучина','Тихий устье','Тихий пойма','Тихий дельта','Быстрый ключ','Быстрый исток','Быстрый брод','Быстрый омут','Быстрый порог','Быстрый перекат','Быстрый излучина','Быстрый устье','Быстрый пойма','Быстрый дельта','Светлый ключ','Светлый исток','Светлый брод','Светлый омут','Светлый порог','Светлый перекат','Светлый излучина','Светлый устье','Светлый пойма','Светлый дельта','Тёмный ключ','Тёмный исток','Тёмный брод','Тёмный омут','Тёмный порог','Тёмный перекат','Тёмный излучина','Тёмный устье','Тёмный пойма','Тёмный дельта','Холодный ключ','Холодный исток','Холодный брод','Холодный омут','Холодный порог','Холодный перекат','Холодный излучина','Холодный устье','Холодный пойма','Холодный дельта','Тёплый ключ','Тёплый исток','Тёплый брод','Тёплый омут','Тёплый порог','Тёплый перекат','Тёплый излучина','Тёплый устье','Тёплый пойма','Тёплый дельта','Сухой ключ','Сухой исток','Сухой брод','Сухой омут','Сухой порог','Сухой перекат','Сухой излучина','Сухой устье','Сухой пойма','Сухой дельта','Мокрый ключ','Мокрый исток','Мокрый брод','Мокрый омут','Мокрый порог','Мокрый перекат','Мокрый излучина','Мокрый устье','Мокрый пойма','Мокрый дельта','Высокий ключ','Высокий исток','Высокий брод','Высокий омут','Высокий порог','Высокий перекат','Высокий излучина','Высокий устье','Высокий пойма','Высокий дельта','Низкий ключ','Низкий исток','Низкий брод','Низкий омут','Низкий порог','Низкий перекат','Низкий излучина','Низкий устье','Низкий пойма','Низкий дельта','Алексейев','Алексейин','Алексейград','Алексейполь','Алексейгорск','Андрейов','Андрейев','Андрейин','Андрейск','Андрейцк','Андрейнск','Андрейвск','Андрейград','Андрейполь','Андрейгорск','Антонов','Антонев','Антонин','Антонск','Антонцк','Антоннск','Антонвск','Антонград','Антонполь','Антонгорск','Аркадийов','Аркадийев','Аркадийин','Аркадийск','Аркадийцк','Аркадийнск','Аркадийвск','Аркадийград','Аркадийполь','Аркадийгорск','Борисев','Борисин','Борисград','Борисполь','Борисгорск','Вадимов','Вадимев','Вадимин','Вадимск','Вадимцк','Вадимнск','Вадимвск','Вадимград','Вадимполь','Вадимгорск','Валерийов','Валерийев','Валерийин','Валерийск','Валерийцк','Валерийнск','Валерийвск','Валерийград','Валерийполь','Валерийгорск','Василийев','Василийин','Василийград','Василийполь','Василийгорск','Викторов','Викторев','Викторин','Викторск','Викторцк','Викторнск','Викторвск','Викторград','Викторполь','Викторгорск','Виталийов','Виталийев','Виталийин','Виталийск','Виталийцк','Виталийнск','Виталийвск','Виталийград','Виталийполь','Виталийгорск','Владимиров','Владимирев','Владимирин','Владимирск','Владимирцк','Владимирнск','Владимирвск','Владимирград','Владимирполь','Владимиргорск','Вячеславов','Вячеславев','Вячеславин','Вячеславск','Вячеславцк','Вячеславнск','Вячеславвск','Вячеславград','Вячеславполь','Вячеславгорск','Геннадийов','Геннадийев','Геннадийин','Геннадийск','Геннадийцк','Геннадийнск','Геннадийвск','Геннадийград','Геннадийполь','Геннадийгорск','Георгийов','Георгийев','Георгийин','Георгийск','Георгийцк','Георгийнск','Георгийвск','Георгийград','Георгийполь','Георгийгорск','Григорийев','Григорийин','Григорийград','Григорийполь','Григорийгорск','Дмитрийев','Дмитрийин','Дмитрийград','Дмитрийполь','Дмитрийгорск','Евгенийев','Евгенийин','Евгенийград','Евгенийполь','Евгенийгорск','Иванев','Иванин','Иванград','Иванполь','Ивангорск','Игорьов','Игорьев','Игорьин','Игорьск','Игорьцк','Игорьнск','Игорьвск','Игорьград','Игорьполь','Игорьгорск','Ильяов','Ильяев','Ильяин','Ильяск','Ильяцк','Ильянск','Ильявск','Ильяград','Ильяполь','Ильягорск','Кириллев','Кириллин','Кириллск','Кириллцк','Кириллнск','Кириллвск','Кириллград','Кириллполь','Кириллгорск','Константинев','Константинин','Константинград','Константинполь','Константингорск','Леонидев','Леонидин','Леонидград','Леонидполь','Леонидгорск','Левов','Левев','Левин','Левск','Левцк','Левнск','Леввск','Левград','Левполь','Левгорск','Максимов','Максимев','Максимин','Максимск','Максимцк','Максимнск','Максимвск','Максимград','Максимполь','Максимгорск','Михаилев','Михаилин','Михаилград','Михаилполь','Михаилгорск','Никитаов','Никитаев','Никитаин','Никитаск','Никитацк','Никитанск','Никитавск','Никитаград','Никитаполь','Никитагорск','Николайов','Николайев','Николайин','Николайск','Николайцк','Николайнск','Николайвск','Николайград','Николайполь','Николайгорск','Олегов','Олегев','Олегин','Олегск','Олегцк','Олегнск','Олегвск','Олегград','Олегполь','Олеггорск','Павелов','Павелев','Павелин','Павелск','Павелцк','Павелнск','Павелвск','Павелград','Павелполь','Павелгорск','Пётров','Пётрев','Пётрин','Пётрск','Пётрцк','Пётрнск','Пётрвск','Пётрград','Пётрполь','Пётргорск','Романов','Романев','Романин','Романск','Романцк','Романнск','Романвск','Романград','Романполь','Романгорск','Русланов','Русланев','Русланин','Русланск','Русланцк','Русланнск','Русланвск','Русланград','Русланполь','Руслангорск','Сергейов','Сергейев','Сергейин','Сергейск','Сергейцк','Сергейнск','Сергейвск','Сергейград','Сергейполь','Сергейгорск','Степанов','Степанев','Степанин','Степанск','Степанцк','Степаннск','Степанвск','Степанград','Степанполь','Степангорск','Тимуров','Тимурев','Тимурин','Тимурск','Тимурцк','Тимурнск','Тимурвск','Тимурград','Тимурполь','Тимургорск','Фёдоров','Фёдорев','Фёдорин','Фёдорск','Фёдорцк','Фёдорнск','Фёдорвск','Фёдорград','Фёдорполь','Фёдоргорск','Филиппов','Филиппев','Филиппин','Филиппск','Филиппцк','Филиппнск','Филиппвск','Филиппград','Филиппполь','Филиппгорск','Юрийов','Юрийев','Юрийин','Юрийск','Юрийцк','Юрийнск','Юрийвск','Юрийград','Юрийполь','Юрийгорск','Яковов','Яковев','Яковин','Яковск','Яковцк','Яковнск','Яковвск','Яковград','Яковполь','Яковгорск','Звёздный сад','Звёздный парк','Звёздный бор','Звёздный лес','Звёздный луг','Звёздный степь','Звёздный тундра','Звёздный тайга','Звёздный пустошь','Звёздный угодье','Солнечный сад','Солнечный парк','Солнечный бор','Солнечный лес','Солнечный луг','Солнечный степь','Солнечный тундра','Солнечный тайга','Солнечный пустошь','Солнечный угодье','Лунный сад','Лунный парк','Лунный бор','Лунный лес','Лунный луг','Лунный степь','Лунный тундра','Лунный тайга','Лунный пустошь','Лунный угодье','Речной сад','Речной парк','Речной бор','Речной лес','Речной луг','Речной степь','Речной тундра','Речной тайга','Речной пустошь','Речной угодье','Морской сад','Морской парк','Морской бор','Морской лес','Морской луг','Морской степь','Морской тундра','Морской тайга','Морской пустошь','Морской угодье','Горный сад','Горный парк','Горный бор','Горный лес','Горный луг','Горный степь','Горный тундра','Горный тайга','Горный пустошь','Горный угодье','Лесной сад','Лесной парк','Лесной бор','Лесной лес','Лесной луг','Лесной степь','Лесной тундра','Лесной тайга','Лесной пустошь','Лесной угодье','Полевой сад','Полевой парк','Полевой бор','Полевой лес','Полевой луг','Полевой степь','Полевой тундра','Полевой тайга','Полевой пустошь','Полевой угодье','Степной сад','Степной парк','Степной бор','Степной лес','Степной луг','Степной степь','Степной тундра','Степной тайга','Степной пустошь','Степной угодье','Таёжный сад','Таёжный парк','Таёжный бор','Таёжный лес','Таёжный луг','Таёжный степь','Таёжный тундра','Таёжный тайга','Таёжный пустошь','Таёжный угодье','Город1','Река1','Гора1','Город2','Река2','Гора2','Город3','Река3','Гора3','Город4','Река4','Гора4','Город5','Река5','Гора5','Город6','Река6','Гора6','Город7','Река7','Гора7','Город8','Река8','Гора8','Город9','Река9','Гора9','Город10','Река10','Гора10','Город11','Река11','Китай','США','Индия','Россия','Бразилия','Япония','Германия','Великобритания','Франция','Италия','Канада','Южная Корея','Австралия','Испания','Мексика','Индонезия','Нидерланды','Саудовская Аравия','Турция','Швейцария','Швеция','Бельгия','Аргентина','Норвегия','Австрия','ОАЭ','Израиль','Сингапур','Гонконг','Тайвань','Таиланд','Малайзия','Филиппины','Вьетнам','Пакистан','Бангладеш','Египет','Нигерия','ЮАР','Кения','Эфиопия','Марокко','Алжир','Иран','Ирак','Сирия','Иордания','Кувейт','Катар','Оман','Йемен','Афганистан','Шри-Ланка','Непал','Мьянма','Камбоджа','Монголия','Казахстан','Узбекистан','Украина','Польша','Чехия','Венгрия','Румыния','Греция','Португалия','Финляндия','Дания','Ирландия','Новая Зеландия','Чили','Колумбия','Перу','Венесуэла','Куба','Танзания','Гана','Руанда','Ангола','Зимбабве','Намибия','Мозамбик','Мадагаскар','Камерун','Конго','Сенегал','Пекин','Вашингтон','Нью-Дели','Бразилиа','Токио','Берлин','Лондон','Париж','Рим','Оттава','Сеул','Канберра','Мадрид','Мехико','Джакарта','Амстердам','Эр-Рияд','Анкара','Берن','Стокгольм','Брюссель','Буэнос-Айрес','Осло','Вена','Абу-Даби','Иерусалим','Тайбэй','Бангкок','Куала-Лумпур','Манила','Ханой','Исламабад','Дакка','Каир','Найроби','Аддис-Абеба','Тегеран','Багдад','Дамаск','Амман','Доха','Маскат','Кабул','Коломбо','Катманду','Улан-Батор','Будапешт','Афины','Лиссабон','Хельсинки','Дублин','Веллингтон','Сантьяго','Богота','Лима','Гавана','Кигали','Луанда','Гуандун','Сычуань','Чжэцзян','Цзянсу','Шаньдун','Хэнань','Хубэй','Хунань','Хэбэй','Фуцзянь','Ляонин','Хэйлунцзян','Цзилинь','Аньхой','Цзянси','Шаньси','Шэньси','Юньнань','Гуйчжоу','Гуанси','Внутренняя Монголия','Тибет','Синьцзян','Ганьсу','Цинхай','Нинся','Хайнань','Макао','Калифорния','Техас','Флорида','Иллинойс','Пенсильвания','Огайо','Джорджия','Мичиган','Сибирь','Махараштра','Уттар-Прадеш','Тамилнад','Карнатака','Западная Бенгалия','Сан-Паулу','Рио-де-Жанейро','Минас-Жерайс','Баия','Парана','Шанхай','Гуанчжоу','Шэньчжэнь','Чэнду','Ухань','Сиань','Ханчжоу','Нанкин','Сучжоу','Циндао','Далянь','Сямынь','Куньмин','Харбин','Чжэнчжоу','Цзинань','Чанша','Шэньян','Нью-Йорк','Лос-Анджелес','Чикаго','Хьюстон','Даллас','Филадельфия','Торонто','Ванкувер','Монреаль','Манчестер','Эдинбург','Марсель','Лион','Бордо','Гамбург','Мюнхен','Франкфурт','Милан','Неаполь','Флоренция','Венеция','Барселона','Цюрих','Женева','Санкт-Петербург','Мумбаи','Бангалор','Хайдарабад','Ченнаи','Калькутта','Джайпур','Осака','Иокогама','Нагоя','Киото','Кобэ','Фукуока','Пусан','Сидней','Мельбурн','Касабланка','Дубай','Стамбул','Карачи','Лагос','Йоханнесбург','Хошимин','Янгон','Место0275','Место0276','Место0277','Место0278','Место0279','Место0280','Место0281','Место0282','Место0283','Место0284','Место0285','Место0286','Место0287','Место0288','Место0289','Место0290','Место0291','Место0292','Место0293','Место0294','Место0295','Место0296','Место0297','Место0298','Место0299','Место0300','Место0301','Место0302','Место0303','Место0304','Место0305','Место0306','Место0307','Место0308','Место0309','Место0310','Место0311','Место0312','Место0313','Место0314','Место0315','Место0316','Место0317','Место0318','Место0319','Место0320','Место0321','Место0322','Место0323','Место0324','Место0325','Место0326','Место0327','Место0328','Место0329','Место0330','Место0331','Место0332','Место0333','Место0334','Место0335','Место0336','Место0337','Место0338','Место0339','Место0340','Место0341','Место0342','Место0343','Место0344','Место0345','Место0346','Место0347','Место0348','Место0349','Место0350','Место0351','Место0352','Место0353','Место0354','Место0355','Место0356','Место0357','Место0358','Место0359','Место0360','Место0361','Место0362','Место0363','Место0364','Место0365','Место0366','Место0367','Место0368','Место0369','Место0370','Место0371','Место0372','Место0373','Место0374','Место0375','Место0376','Место0377','Место0378','Место0379','Место0380','Место0381','Место0382','Место0383','Место0384','Место0385','Место0386','Место0387','Место0388','Место0389','Место0390','Место0391','Место0392','Место0393','Место0394','Место0395','Место0396','Место0397','Место0398','Место0399','Место0400','Место0401','Место0402','Место0403','Место0404','Место0405','Место0406','Место0407','Место0408','Место0409','Место0410','Место0411','Место0412','Место0413','Место0414','Место0415','Место0416','Место0417','Место0418','Место0419','Место0420','Место0421','Место0422','Место0423','Место0424','Место0425','Место0426','Место0427','Место0428','Место0429','Место0430','Место0431','Место0432','Место0433','Место0434','Место0435','Место0436','Место0437','Место0438','Место0439','Место0440','Место0441','Место0442','Место0443','Место0444','Место0445','Место0446','Место0447','Место0448','Место0449','Место0450','Место0451','Место0452','Место0453','Место0454','Место0455','Место0456','Место0457','Место0458','Место0459','Место0460','Место0461','Место0462','Место0463','Место0464','Место0465','Место0466','Место0467','Место0468','Место0469','Место0470','Место0471','Место0472','Место0473','Место0474','Место0475','Место0476','Место0477','Место0478','Место0479','Место0480','Место0481','Место0482','Место0483','Место0484','Место0485','Место0486','Место0487','Место0488','Место0489','Место0490','Место0491','Место0492','Место0493','Место0494','Место0495','Место0496','Место0497','Место0498','Место0499','Место0500','Место0501','Место0502','Место0503','Место0504','Место0505','Место0506','Место0507','Место0508','Место0509','Место0510','Место0511','Место0512','Место0513','Место0514','Место0515','Место0516','Место0517','Место0518','Место0519','Место0520','Место0521','Место0522','Место0523','Место0524','Место0525','Место0526','Место0527','Место0528','Место0529','Место0530','Место0531','Место0532','Место0533','Место0534','Место0535','Место0536','Место0537','Место0538','Место0539','Место0540','Место0541','Место0542','Место0543','Место0544','Место0545','Место0546','Место0547','Место0548','Место0549','Место0550','Место0551','Место0552','Место0553','Место0554','Место0555','Место0556','Место0557','Место0558','Место0559','Место0560','Место0561','Место0562','Место0563','Место0564','Место0565','Место0566','Место0567','Место0568','Место0569','Место0570','Место0571','Место0572','Место0573','Место0574','Место0575','Место0576','Место0577','Место0578','Место0579','Место0580','Место0581','Место0582','Место0583','Место0584','Место0585','Место0586','Место0587','Место0588','Место0589','Место0590','Место0591','Место0592','Место0593','Место0594','Место0595','Место0596','Место0597','Место0598','Место0599','Место0600','Место0601','Место0602','Место0603','Место0604','Место0605','Место0606','Место0607','Место0608','Место0609','Место0610','Место0611','Место0612','Место0613','Место0614','Место0615','Место0616','Место0617','Место0618','Место0619','Место0620','Место0621','Место0622','Место0623','Место0624','Место0625','Место0626','Место0627','Место0628','Место0629','Место0630','Место0631','Место0632','Место0633','Место0634','Место0635','Место0636','Место0637','Место0638','Место0639','Место0640','Место0641','Место0642','Место0643','Место0644','Место0645','Место0646','Место0647','Место0648','Место0649','Место0650','Место0651','Место0652','Место0653','Место0654','Место0655','Место0656','Место0657','Место0658','Место0659','Место0660','Место0661','Место0662','Место0663','Место0664','Место0665','Место0666','Место0667','Место0668','Место0669','Место0670','Место0671','Место0672','Место0673','Место0674','Место0675','Место0676','Место0677','Место0678','Место0679','Место0680','Место0681','Место0682','Место0683','Место0684','Место0685','Место0686','Место0687','Место0688','Место0689','Место0690','Место0691','Место0692','Место0693','Место0694','Место0695','Место0696','Место0697','Место0698','Место0699','Место0700','Место0701','Место0702','Место0703','Место0704','Место0705','Место0706','Место0707','Место0708','Место0709','Место0710','Место0711','Место0712','Место0713','Место0714','Место0715','Место0716','Место0717','Место0718','Место0719','Место0720','Место0721','Место0722','Место0723','Место0724','Место0725','Место0726','Место0727','Место0728','Место0729','Место0730','Место0731','Место0732','Место0733','Место0734','Место0735','Место0736','Место0737','Место0738','Место0739','Место0740','Место0741','Место0742','Место0743','Место0744','Место0745','Место0746','Место0747','Место0748','Место0749','Место0750','Место0751','Место0752','Место0753','Место0754','Место0755','Место0756','Место0757','Место0758','Место0759','Место0760','Место0761','Место0762','Место0763','Место0764','Место0765','Место0766','Место0767','Место0768','Место0769','Место0770','Место0771','Место0772','Место0773','Место0774','Место0775','Место0776','Место0777','Место0778','Место0779','Место0780','Место0781','Место0782','Место0783','Место0784','Место0785','Место0786','Место0787','Место0788','Место0789','Место0790','Место0791','Место0792','Место0793','Место0794','Место0795','Место0796','Место0797','Место0798','Место0799','Место0800','Место0801','Место0802','Место0803','Место0804','Место0805','Место0806','Место0807','Место0808','Место0809','Место0810','Место0811','Место0812','Место0813','Место0814','Место0815','Место0816','Место0817','Место0818','Место0819','Место0820','Место0821','Место0822','Место0823','Место0824','Место0825','Место0826','Место0827','Место0828','Место0829','Место0830','Место0831','Место0832','Место0833','Место0834','Место0835','Место0836','Место0837','Место0838','Место0839','Место0840','Место0841','Место0842','Место0843','Место0844','Место0845','Место0846','Место0847','Место0848','Место0849','Место0850','Место0851','Место0852','Место0853','Место0854','Место0855','Место0856','Место0857','Место0858','Место0859','Место0860','Место0861','Место0862','Место0863','Место0864','Место0865','Место0866','Место0867','Место0868','Место0869','Место0870','Место0871','Место0872','Место0873','Место0874','Место0875','Место0876','Место0877','Место0878','Место0879','Место0880','Место0881','Место0882','Место0883','Место0884','Место0885','Место0886','Место0887','Место0888','Место0889','Место0890','Место0891','Место0892','Место0893','Место0894','Место0895','Место0896','Место0897','Место0898','Место0899','Место0900','Место0901','Место0902','Место0903','Место0904','Место0905','Место0906','Место0907','Место0908','Место0909','Место0910','Место0911','Место0912','Место0913','Место0914','Место0915','Место0916','Место0917','Место0918','Место0919','Место0920','Место0921','Место0922','Место0923','Место0924','Место0925','Место0926','Место0927','Место0928','Место0929','Место0930','Место0931','Место0932','Место0933','Место0934','Место0935','Место0936','Место0937','Место0938','Место0939','Место0940','Место0941','Место0942','Место0943','Место0944','Место0945','Место0946','Место0947','Место0948','Место0949','Место0950','Место0951','Место0952','Место0953','Место0954','Место0955','Место0956','Место0957','Место0958','Место0959','Место0960','Место0961','Место0962','Место0963','Место0964','Место0965','Место0966','Место0967','Место0968','Место0969','Место0970','Место0971','Место0972','Место0973','Место0974','Место0975','Место0976','Место0977','Место0978','Место0979','Место0980','Место0981','Место0982','Место0983','Место0984','Место0985','Место0986','Место0987','Место0988','Место0989','Место0990','Место0991','Место0992','Место0993','Место0994','Место0995','Место0996','Место0997','Место0998','Место0999','Место1000','Место1001','Место1002','Место1003','Место1004','Место1005','Место1006','Место1007','Место1008','Место1009','Место1010','Место1011','Место1012','Место1013','Место1014','Место1015','Место1016','Место1017','Место1018','Место1019','Место1020','Место1021','Место1022','Место1023','Место1024','Место1025','Место1026','Место1027','Место1028','Место1029','Место1030','Место1031','Место1032','Место1033','Место1034','Место1035','Место1036','Место1037','Место1038','Место1039','Место1040','Место1041','Место1042','Место1043','Место1044','Место1045','Место1046','Место1047','Место1048','Место1049','Место1050','Место1051','Место1052','Место1053','Место1054','Место1055','Место1056','Место1057','Место1058','Место1059','Место1060','Место1061','Место1062','Место1063','Место1064','Место1065','Место1066','Место1067','Место1068','Место1069','Место1070','Место1071','Место1072','Место1073','Место1074','Место1075','Место1076','Место1077','Место1078','Место1079','Место1080','Место1081','Место1082','Место1083','Место1084','Место1085','Место1086','Место1087','Место1088','Место1089','Место1090','Место1091','Место1092','Место1093','Место1094','Место1095','Место1096','Место1097','Место1098','Место1099','Место1100','Место1101','Место1102','Место1103','Место1104','Место1105','Место1106','Место1107','Место1108','Место1109','Место1110','Место1111','Место1112','Место1113','Место1114','Место1115','Место1116','Место1117','Место1118','Место1119','Место1120','Место1121','Место1122','Место1123','Место1124','Место1125','Место1126','Место1127','Место1128','Место1129','Место1130','Место1131','Место1132','Место1133','Место1134','Место1135','Место1136','Место1137','Место1138','Место1139','Место1140','Место1141','Место1142','Место1143','Место1144','Место1145','Место1146','Место1147','Место1148','Место1149','Место1150','Место1151','Место1152','Место1153','Место1154','Место1155','Место1156','Место1157','Место1158','Место1159','Место1160','Место1161','Место1162','Место1163','Место1164','Место1165','Место1166','Место1167','Место1168','Место1169','Место1170','Место1171','Место1172','Место1173','Место1174','Место1175','Место1176','Место1177','Место1178','Место1179','Место1180','Место1181','Место1182','Место1183','Место1184','Место1185','Место1186','Место1187','Место1188','Место1189','Место1190','Место1191','Место1192','Место1193','Место1194','Место1195','Место1196','Место1197','Место1198','Место1199','Место1200','Место1201','Место1202','Место1203','Место1204','Место1205','Место1206','Место1207','Место1208','Место1209','Место1210','Место1211','Место1212','Место1213','Место1214','Место1215','Место1216','Место1217','Место1218','Место1219','Место1220','Место1221','Место1222','Место1223','Место1224','Место1225','Место1226','Место1227','Место1228','Место1229','Место1230','Место1231','Место1232','Место1233','Место1234','Место1235','Место1236','Место1237','Место1238','Место1239','Место1240','Место1241','Место1242','Место1243','Место1244','Место1245','Место1246','Место1247','Место1248','Место1249','Место1250','Место1251','Место1252','Место1253','Место1254','Место1255','Место1256','Место1257','Место1258','Место1259','Место1260','Место1261','Место1262','Место1263','Место1264','Место1265','Место1266','Место1267','Место1268','Место1269','Место1270','Место1271','Место1272','Место1273','Место1274','Место1275','Место1276','Место1277','Место1278','Место1279','Место1280','Место1281','Место1282','Место1283','Место1284','Место1285','Место1286','Место1287','Место1288','Место1289','Место1290','Место1291','Место1292','Место1293','Место1294','Место1295','Место1296','Место1297','Место1298','Место1299','Место1300','Место1301','Место1302','Место1303','Место1304','Место1305','Место1306','Место1307','Место1308','Место1309','Место1310','Место1311','Место1312','Место1313','Место1314','Место1315','Место1316','Место1317','Место1318','Место1319','Место1320','Место1321','Место1322','Место1323','Место1324','Место1325','Место1326','Место1327','Место1328','Место1329','Место1330','Место1331','Место1332','Место1333','Место1334','Место1335','Место1336','Место1337','Место1338','Место1339','Место1340','Место1341','Место1342','Место1343','Место1344','Место1345','Место1346','Место1347','Место1348','Место1349','Место1350','Место1351','Место1352','Место1353','Место1354','Место1355','Место1356','Место1357','Место1358','Место1359','Место1360','Место1361','Место1362','Место1363','Место1364','Место1365','Место1366','Место1367','Место1368','Место1369','Место1370','Место1371','Место1372','Место1373','Место1374','Место1375','Место1376','Место1377','Место1378','Место1379','Место1380','Место1381','Место1382','Место1383','Место1384','Место1385','Место1386','Место1387','Место1388','Место1389','Место1390','Место1391','Место1392','Место1393','Место1394','Место1395','Место1396','Место1397','Место1398','Место1399','Место1400','Место1401','Место1402','Место1403','Место1404','Место1405','Место1406','Место1407','Место1408','Место1409','Место1410','Место1411','Место1412','Место1413','Место1414','Место1415','Место1416','Место1417','Место1418','Место1419','Место1420','Место1421','Место1422','Место1423','Место1424','Место1425','Место1426','Место1427','Место1428','Место1429','Место1430','Место1431','Место1432','Место1433','Место1434','Место1435','Место1436','Место1437','Место1438','Место1439','Место1440','Место1441','Место1442','Место1443','Место1444','Место1445','Место1446','Место1447','Место1448','Место1449','Место1450','Место1451','Место1452','Место1453','Место1454','Место1455','Место1456','Место1457','Место1458','Место1459','Место1460','Место1461','Место1462','Место1463','Место1464','Место1465','Место1466','Место1467','Место1468','Место1469','Место1470','Место1471','Место1472','Место1473','Место1474','Место1475','Место1476','Место1477','Место1478','Место1479','Место1480','Место1481','Место1482','Место1483','Место1484','Место1485','Место1486','Место1487','Место1488','Место1489','Место1490','Место1491','Место1492','Место1493','Место1494','Место1495','Место1496','Место1497','Место1498','Место1499','Место1500','Место1501','Место1502','Место1503','Место1504','Место1505','Место1506','Место1507','Место1508','Место1509','Место1510','Место1511','Место1512','Место1513','Место1514','Место1515','Место1516','Место1517','Место1518','Место1519','Место1520','Место1521','Место1522','Место1523','Место1524','Место1525','Место1526','Место1527','Место1528','Место1529','Место1530','Место1531','Место1532','Место1533','Место1534','Место1535','Место1536','Место1537','Место1538','Место1539','Место1540','Место1541','Место1542','Место1543','Место1544','Место1545','Место1546','Место1547','Место1548','Место1549','Место1550','Место1551','Место1552','Место1553','Место1554','Место1555','Место1556','Место1557','Место1558','Место1559','Место1560','Место1561','Место1562','Место1563','Место1564','Место1565','Место1566','Место1567','Место1568','Место1569','Место1570','Место1571','Место1572','Место1573','Место1574','Место1575','Место1576','Место1577','Место1578','Место1579','Место1580','Место1581','Место1582','Место1583','Место1584','Место1585','Место1586','Место1587','Место1588','Место1589','Место1590','Место1591','Место1592','Место1593','Место1594','Место1595','Место1596','Место1597','Место1598','Место1599','Место1600','Место1601','Место1602','Место1603','Место1604','Место1605','Место1606','Место1607','Место1608','Место1609','Место1610','Место1611','Место1612','Место1613','Место1614','Место1615','Место1616','Место1617','Место1618','Место1619','Место1620','Место1621','Место1622','Место1623','Место1624','Место1625','Место1626','Место1627','Место1628','Место1629','Место1630','Место1631','Место1632','Место1633','Место1634','Место1635','Место1636','Место1637','Место1638','Место1639','Место1640','Место1641','Место1642','Место1643','Место1644','Место1645','Место1646','Место1647','Место1648','Место1649','Место1650','Место1651','Место1652','Место1653','Место1654','Место1655','Место1656','Место1657','Место1658','Место1659','Место1660','Место1661','Место1662','Место1663','Место1664','Место1665','Место1666','Место1667','Место1668','Место1669','Место1670','Место1671','Место1672','Место1673','Место1674','Место1675','Место1676','Место1677','Место1678','Место1679','Место1680','Место1681','Место1682','Место1683','Место1684','Место1685','Место1686','Место1687','Место1688','Место1689','Место1690','Место1691','Место1692','Место1693','Место1694','Место1695','Место1696','Место1697','Место1698','Место1699','Место1700','Место1701','Место1702','Место1703','Место1704','Место1705','Место1706','Место1707','Место1708','Место1709','Место1710','Место1711','Место1712','Место1713','Место1714','Место1715','Место1716','Место1717','Место1718','Место1719','Место1720','Место1721','Место1722','Место1723','Место1724','Место1725','Место1726','Место1727','Место1728','Место1729','Место1730','Место1731','Место1732','Место1733','Место1734','Место1735','Место1736','Место1737','Место1738','Место1739','Место1740','Место1741','Место1742','Место1743','Место1744','Место1745','Место1746','Место1747','Место1748','Место1749','Место1750','Место1751','Место1752','Место1753','Место1754','Место1755','Место1756','Место1757','Место1758','Место1759','Место1760','Место1761','Место1762','Место1763','Место1764','Место1765','Место1766','Место1767','Место1768','Место1769','Место1770','Место1771','Место1772','Место1773','Место1774','Место1775','Место1776','Место1777','Место1778','Место1779','Место1780','Место1781','Место1782','Место1783','Место1784','Место1785','Место1786','Место1787','Место1788','Место1789','Место1790','Место1791','Место1792','Место1793','Место1794','Место1795','Место1796','Место1797','Место1798','Место1799','Место1800','Место1801','Место1802','Место1803','Место1804','Место1805','Место1806','Место1807','Место1808','Место1809','Место1810','Место1811','Место1812','Место1813','Место1814','Место1815','Место1816','Место1817','Место1818','Место1819','Место1820','Место1821','Место1822','Место1823','Место1824','Место1825','Место1826','Место1827','Место1828','Место1829','Место1830','Место1831','Место1832','Место1833','Место1834','Место1835','Место1836','Место1837','Место1838','Место1839','Место1840','Место1841','Место1842','Место1843','Место1844','Место1845','Место1846','Место1847','Место1848','Место1849','Место1850','Место1851','Место1852','Место1853','Место1854','Место1855','Место1856','Место1857','Место1858','Место1859','Место1860','Место1861','Место1862','Место1863','Место1864','Место1865','Место1866','Место1867','Место1868','Место1869','Место1870','Место1871','Место1872','Место1873','Место1874','Место1875','Место1876','Место1877','Место1878','Место1879','Место1880','Место1881','Место1882','Место1883','Место1884','Место1885','Место1886','Место1887','Место1888','Место1889','Место1890','Место1891','Место1892','Место1893','Место1894','Место1895','Место1896','Место1897','Место1898','Место1899','Место1900','Место1901','Место1902','Место1903','Место1904','Место1905','Место1906','Место1907','Место1908','Место1909','Место1910','Место1911','Место1912','Место1913','Место1914','Место1915','Место1916','Место1917','Место1918','Место1919','Место1920','Место1921','Место1922','Место1923','Место1924','Место1925','Место1926','Место1927','Место1928','Место1929','Место1930','Место1931','Место1932','Место1933','Место1934','Место1935','Место1936','Место1937','Место1938','Место1939','Место1940','Место1941','Место1942','Место1943','Место1944','Место1945','Место1946','Место1947','Место1948','Место1949','Место1950','Место1951','Место1952','Место1953','Место1954','Место1955','Место1956','Место1957','Место1958','Место1959','Место1960','Место1961','Место1962','Место1963','Место1964','Место1965','Место1966','Место1967','Место1968','Место1969','Место1970','Место1971','Место1972','Место1973','Место1974','Место1975','Место1976','Место1977','Место1978','Место1979','Место1980','Место1981','Место1982','Место1983','Место1984','Место1985','Место1986','Место1987','Место1988','Место1989','Место1990','Место1991','Место1992','Место1993','Место1994','Место1995','Место1996','Место1997','Место1998','Место1999','Место2000','Место2001','Место2002','Место2003','Место2004','Место2005','Место2006','Место2007','Место2008','Место2009','Место2010','Место2011','Место2012','Место2013','Место2014','Место2015','Место2016','Место2017','Место2018','Место2019','Место2020','Место2021','Место2022','Место2023','Место2024','Место2025','Место2026','Место2027','Место2028','Место2029','Место2030','Место2031','Место2032','Место2033','Место2034','Место2035','Место2036','Место2037','Место2038','Место2039','Место2040','Место2041','Место2042','Место2043','Место2044','Место2045','Место2046','Место2047','Место2048'],
  pt:['A dos Cunhados','A dos Francos','Abadia de Goiás','Abadia dos Dourados','Abadiânia','Abaetetuba','Abaeté','Abaiara','Abaré','Abatiá','Abaíra','Abdon Batista','Abel Figueiredo','Abelardo Luz','Abrantes','Abraveses','Abre Campo','Abreu e Lima','Abreulândia','Abrigada','Acaiaca','Acajutiba','Acarape','Acaraú','Acari','Acará','Acauã','Aceguá','Achada Leitão','Acopiara','Acorizal','Acrelândia','Acreúna','Adamantina','Adaúfe','Adelândia','Adolfo','Adrianópolis','Adustina','Adão','Afogados da Ingazeira','Afonso Bezerra','Afonso Cláudio','Afonso Cunha','Afrânio','Afuá','Agrestina','Agricolândia','Agrolândia','Agronômica','Aguada de Cima','Agualva','Aguanil','Aguaí','Agudo','Agudos','Agudos do Sul','Aguiar','Aguiar da Beira','Aguiarnópolis','Aguçadoura','Aileu','Aimorés','Ainaro','Aiquara','Aiuaba','Aiuruoca','Ajuda','Ajuricaba','Alagoa','Alagoa Grande','Alagoa Nova','Alagoinha','Alagoinha do Piauí','Alagoinhas','Alambari','Alandroal','Alas','Albardo','Albergaria-a-Velha','Albertina','Albufeira','Alcabideche','Alcains','Alcanede','Alcanena','Alcanhões','Alcantarilha','Alcantil','Alcinópolis','Alcobaça','Alcochete','Alcoentre','Alcoutim','Alcácer do Sal','Alcântara','Alcântaras','Aldeia Galega da Merceana','Aldeia Gavinha','Aldeia Nova Miranda do Douro','Aldeia Nova de São Bento','Aldeia Velha','Aldeia Viçosa','Aldeia da Ponte','Aldeia da Ribeira','Aldeia de Joanes','Aldeia de Paio Pires','Aldeia de Santo António','Aldeia do Bispo','Aldeias','Aldeias Altas','Alecrim','Alegre','Alegrete','Alegrete do Piauí','Alegria','Alenquer','Alexandria','Alexânia','Alfaiates','Alfarelos','Alfeizerão','Alfena','Alfenas','Alferrarede','Alfornelos','Alfragide','Alfredo Chaves','Alfredo Marcondes','Alfredo Vasconcelos','Alfredo Wagner','Alfândega da Fé','Algodres','Algodão de Jandaíra','Algoz','Alguber','Algueirão','Algueirão–Mem Martins','Algés','Alhadas','Alhandra','Alhos Vedros','Aliança','Aliança do Tocantins','Alijó','Aljezur','Aljubarrota','Aljustrel','Almada','Almadina','Almancil','Almargem','Almargem do Bispo','Almas','Almeida','Almeirim','Almenara','Almendra','Almino Afonso','Almirante Tamandaré','Almirante Tamandaré do Sul','Almodôvar','Almofala','Almograve','Aloândia','Alpendurada','Alpercata','Alpestre','Alpiarça','Alpinópolis','Alta Floresta','Alta Floresta d\'Oeste','Altair','Altamira','Altamira do Maranhão','Altamira do Paraná','Altaneira','Alter do Chão','Alterosa','Altinho','Altinópolis','Alto Alegre','Alto Alegre do Maranhão','Alto Alegre do Pindaré','Alto Alegre dos Parecis','Alto Araguaia','Alto Bela Vista','Alto Boa Vista','Alto Caparaó','Alto Feliz','Alto Garças','Alto Horizonte','Alto Jequitibá','Alto Longá','Alto Molócuè','Alto Paraguai','Alto Paraná','Alto Paraíso','Alto Paraíso de Goiás','Alto Parnaíba','Alto Piquiri','Alto Rio Doce','Alto Rio Novo','Alto Santo','Alto Taquari','Alto do Pina','Alto do Rodrigues','Altos','Altura','Altãnia','Altônia','Alumínio','Alvaiázere','Alvalade','Alvarenga','Alvarães','Alvendre','Alverca da Beira','Alverca do Ribatejo','Alvinlândia','Alvinópolis','Alvito','Alvoco da Serra','Alvor','Alvorada','Alvorada d\'Oeste','Alvorada de Minas','Alvorada do Gurguéia','Alvorada do Norte','Alvorada do Sul','Alvorninha','Além Paraíba','Amadora','Amajari','Amambai','Amaporã','Amapá','Amapá do Maranhão','Amaraji','Amaral Ferrador','Amaralina','Amarante','Amarante do Maranhão','Amares','Amargosa','Amaturá','Ambriz','Ameixoeira','Americana','Americano do Brasil','Ametista do Sul','Amiães de Baixo','Amontada','Amor','Amora','Amoreira','Amorim','Amorinópolis','Amparo','Amparo da Serra','Amparo de São Francisco','Ampére','Amélia Rodrigues','América Dourada','Américo Brasiliense','Américo de Campos','Anadia','Anagé','Anahy','Anajatuba','Anajás','Analândia','Anamã','Ananindeua','Ananás','Anapu','Anapurus','Anastácio','Anaurilândia','Anchieta','Andaraí','Andirá','Andorinha','Andradas','Andradina','Andrelândia','André da Rocha','Angatuba','Angelim','Angelina','Angelândia','Angical','Angical do Piauí','Angico','Angicos','Angra do Heroísmo','Angra dos Reis','Anguera','Angélica','Angústias','Anhanguera','Anhembi','Anhumas','Anicuns','Anita Garibaldi','Anitápolis','Anjos','Anori','Ansião','Anta','Anta Gorda','Antas','Antonina','Antonina do Norte','António Enes','Antônio Almeida','Antônio Cardoso','Antônio Carlos','Antônio Dias','Antônio Gonçalves','Antônio João','Antônio Martins','Antônio Olinto','Antônio Prado','Antônio Prado de Minas','Anápolis','Ançã','Anísio de Abreu','Aparecida','Aparecida d\'Oeste','Aparecida de Goiânia','Aparecida do Rio Doce','Aparecida do Rio Negro','Aparecida do Taboado','Apelação','Aperibé','Apiacá','Apiacás','Apiaí','Apicum-Açu','Apiúna','Apodi','Aporá','Aporé','Apuarema','Apucarana','Apuiarés','Apuí','Apúlia','Apúlia e Fão','Aquidabã','Aquidauana','Aquiraz','Arabutã','Aracaju','Aracati','Aracatu','Araci','Aracitaba','Aracoiaba','Aracruz','Aradas','Aragarças','Aragoiânia','Aragominas','Araguacema','Araguaiana','Araguainha','Araguanã','Araguapaz','Araguari','Araguatins','Araguaçu','Araguaína','Araioses','Aral Moreira','Aramari','Arambaré','Arame','Aramina','Arandu','Arantina','Arapeí','Arapiraca','Arapoema','Araponga','Arapongas','Araporã','Arapoti','Araputanga','Arapuá','Arapuã','Araquari','Arara','Araranguá','Araraquara','Araras','Ararendá','Arari','Araricá','Araripe','Araripina','Araruama','Araruna','Arataca','Aratiba','Aratuba','Aratuípe','Araucária','Arauá','Araxá','Arazede','Araçagi','Araçariguama','Araçatuba','Araçaí','Araçoiaba','Araçoiaba da Serra','Araçu','Araçuaí','Araçás','Araújos','Arceburgo','Arco da Calheta','Arco-Íris','Arcos','Arcos de Valdevez','Arcoverde','Arcozelo','Areado','Areal','Arealva','Areia','Areia Branca','Areia de Baraúnas','Areial','Areias','Areiópolis','Arenápolis','Arenópolis','Arganil','Argirita','Argivai','Argoncilhe','Aricanduva','Arinos','Aripuanã','Ariquemes','Ariranha','Ariranha do Ivaí','Armamar','Armazém','Armação','Armação de Pêra','Armação dos Búzios','Arneiroz','Aroazes','Aroeiras','Aroeiras do Itaim','Arouca','Arraial','Arraial do Cabo','Arraias','Arraiolos','Arranhó','Arrentela','Arrifana','Arrifes','Arroio Grande','Arroio Trinta','Arroio do Meio','Arroio do Padre','Arroio do Sal','Arroio do Tigre','Arroio dos Ratos','Arronches','Arruda dos Vinhos','Artur Nogueira','Aruanã','Arujá','Arvoredo','Arvorezinha','Arês','Arões','Ascurra','Aspásia','Assafarge','Assaré','Assaí','Assis','Assis Brasil','Assis Chateaubriand','Assomada','Assunção','Assunção do Piauí','Astolfo Dutra','Astorga','Atalaia','Atalaia do Norte','Atalanta','Ataléia','Atauro Island','Atibaia','Atins','Atouguia da Baleia','Atílio Vivacqua','Augustinópolis','Augusto Corrêa','Augusto Pestana','Augusto Severo','Augusto de Lima','Aurelino Leal','Auriflama','Aurilândia','Aurora','Aurora do Pará','Aurora do Tocantins','Autazes','Avanca','Avanhandava','Avaré','Avaí','Aveiras de Baixo','Aveiras de Cima','Aveiro','Aveleda','Avelino Lopes','Avelinópolis','Aveloso','Avelãs da Ribeira','Aver-o-Mar','Aves','Avintes','Avis','Axixá','Axixá do Tocantins','Azambuja','Azambuja (town)','Azeitão','Azenha','Azenhas do Mar','Azevo','Azinhaga','Azueira','Açailândia','Açores','Açu','Açucena','Babaçulândia','Bacabal','Bacabeira','Bacuri','Bacurituba','Bady Bassitt','Baependi','Bafatá','Bagre','Baguia','Baguim do Monte','Bagé','Baianópolis','Baixa Grande','Baixa Grande do Ribeiro','Baixio','Baixo Guandu','Baião','Balazar','Balbinos','Baldim','Baliza','Balneário Arroio do Silva','Balneário Barra do Sul','Balneário Camboriú','Balneário Gaivota','Balneário Pinhal','Balneário Piçarras','Balneário Rincão','Balombo','Balsa Nova','Balsas','Baltar','Bambuí','Banabuiú','Bananal','Bananeiras','Bandeira','Bandeira do Sul','Bandeirante','Bandeirantes','Bandeirantes do Tocantins','Bannach','Banzaê','Baraçal','Baraúna','Barbacena','Barbalha','Barbosa','Barbosa Ferraz','Barcarena','Barcelona','Barcelos','Barique','Bariri','Barqueiros','Barra','Barra Bonita','Barra Funda','Barra Longa','Barra Mansa','Barra Velha','Barra d\'Alcântara','Barra da Estiva','Barra de Guabiraba','Barra de Santa Rosa','Barra de Santana','Barra de Santo Antônio','Barra de São Francisco','Barra de São Miguel','Barra do Bugres','Barra do Chapéu','Barra do Choça','Barra do Corda','Barra do Garças','Barra do Guarita','Barra do Jacaré','Barra do Mendes','Barra do Ouro','Barra do Piraí','Barra do Quaraí','Barra do Ribeiro','Barra do Rio Azul','Barra do Rocha','Barra do Turvo','Barra dos Coqueiros','Barracão','Barrancos','Barras','Barreira','Barreiras','Barreiras do Piauí','Barreirinha','Barreirinhas','Barreiro','Barreiro do Jaíba','Barreiros','Barretos','Barrinha','Barro','Barro Alto','Barro Duro','Barro Preto','Barrocas','Barrolândia','Barroquinha','Barros Cassal','Barrosas','Barroso','Barueri','Barão','Barão de Antonina','Barão de Cocais','Barão de Cotegipe','Barão de Grajaú','Barão de Melgaço','Barão de Monte Alto','Barão do Triunfo','Bastos','Bataguassu','Bataiporã','Batalha','Batatais','Batayporã','Baturité','Baucau','Baukau','Bauru','Bayeux','Bazartete','Baía Farta','Baía Formosa','Baía da Traição','Beato','Beato António','Bebedouro','Beberibe','Beduido','Beira','Beira Rio','Beiriz de Baixo','Beja','Bela Cruz','Bela Vista','Bela Vista da Caroba','Bela Vista de Goiás','Bela Vista de Minas','Bela Vista do Maranhão','Bela Vista do Paraíso','Bela Vista do Piauí','Bela Vista do Toldo','Belas','Belford Roxo','Belmiro Braga','Belmonte','Belo Campo','Belo Horizonte','Belo Jardim','Belo Monte','Belo Oriente','Belo Vale','Belterra','Belver','Belágua','Belém','Belém de Maria','Belém de São Francisco','Belém do Brejo do Cruz','Belém do Piauí','Belém do São Francisco','Bemfica','Benavente','Bendada','Benedita','Beneditinos','Benedito Leite','Benedito Novo','Benespera','Benevides','Benfica','Benguela','Benjamin Constant','Benjamin Constant do Sul','Bensafrim','Bento Fernandes','Bento Gonçalves','Bento de Abreu','Bequimão','Berilo','Beringel','Berizal','Bernardino Batista','Bernardino de Campos','Bernardo Sayão','Bernardo do Mearim','Bertioga','Bertolínia','Bertópolis','Beruri','Betim','Betânia','Betânia do Piauí','Bezerros','Bias Fortes','Bibala','Bicas','Biguaçu','Bilac','Biquinhas','Birigui','Biritiba Mirim','Biritinga','Biscoitos','Bismula','Bissau','Bissorã','Bituruna','Blumenau','Boa Esperança','Boa Esperança do Iguaçu','Boa Esperança do Sul','Boa Hora','Boa Nova','Boa Saúde','Boa Ventura','Boa Ventura de São Roque','Boa Viagem','Boa Vista','Boa Vista da Aparecida','Boa Vista das Missões','Boa Vista do Buricá','Boa Vista do Cadeado','Boa Vista do Gurupi','Boa Vista do Incra','Boa Vista do Ramos','Boa Vista do Sul','Boa Vista do Tupim','Boane','Boaventura','Boavista dos Pinheiros','Bobadela','Boca da Mata','Boca do Acre','Bocaina','Bocaina de Minas','Bocaina do Sul','Bocaiúva','Bocaiúva do Sul','Bocoio','Bodocó','Bodoquena','Bodó','Bofete','Boituva','Bolama','Boliqueime','Bom Conselho','Bom Despacho','Bom Jardim','Bom Jardim da Serra','Bom Jardim de Goiás','Bom Jardim de Minas','Bom Jesus','Bom Jesus da Lapa','Bom Jesus da Penha','Bom Jesus da Serra','Bom Jesus das Selvas','Bom Jesus de Goiás','Bom Jesus do Amparo','Bom Jesus do Araguaia','Bom Jesus do Galho','Bom Jesus do Itabapoana','Bom Jesus do Norte','Bom Jesus do Oeste','Bom Jesus do Sul','Bom Jesus do Tocantins','Bom Jesus dos Perdões','Bom Lugar','Bom Princípio','Bom Princípio do Piauí','Bom Progresso','Bom Repouso','Bom Retiro','Bom Retiro do Sul','Bom Sucesso','Bom Sucesso de Itararé','Bom Sucesso do Sul','Bombarral','Bombinhas','Bonfim','Bonfim do Piauí','Bonfinópolis','Bonfinópolis de Minas','Boninal','Bonito','Bonito de Minas','Bonito de Santa Fé','Bonópolis','Boqueirão','Boqueirão do Leão','Boqueirão do Piauí','Boquim','Boquira','Boracéia','Borba','Borborema','Borda da Mata','Borebi','Borrazópolis','Borá','Bossoroca','Botelhos','Boticas','Botucatu','Botumirim','Botuporã','Botuverá','Bougado','Bouça Cova','Bozano','Braga','Braganey','Bragança','Bragança Paulista','Branca','Brandoa','Branquinha','Brasil Novo','Brasileira','Brasilândia','Brasilândia de Minas','Brasilândia do Sul','Brasilândia do Tocantins','Brasiléia','Brasnorte','Brasília','Brasília de Minas','Brazabrantes','Brazópolis','Braço do Norte','Braço do Trombudo','Braúna','Braúnas','Brejetuba','Brejinho','Brejinho de Nazaré','Brejo','Brejo Alegre','Brejo Grande','Brejo Grande do Araguaia','Brejo Santo','Brejo da Madre de Deus','Brejo de Areia','Brejo do Cruz','Brejo do Piauí','Brejo dos Santos','Brejolândia','Brejão','Brejões','Breu Branco','Breves','Brito','Britânia','Brochier','Brodowski','Brodósqui','Brotas','Brotas de Macaúbas','Brumadinho','Brumado','Brunópolis','Brusque','Brás Pires','Buarcos','Buba','Bubaque','Bucelas','Bueno Brandão','Buenos Aires','Buenópolis','Buerarema','Bugre','Bujari','Bujaru','Bula Atumba','Buraca','Buri','Buritama','Buriti','Buriti Alegre','Buriti Bravo','Buriti de Goiás','Buriti do Tocantins','Buriti dos Lopes','Buriti dos Montes','Buriticupu','Buritinópolis','Buritirama','Buritirana','Buritis','Buritizal','Buritizeiro','Butiá','Buíque','Bálsamo','Caapiranga','Caaporã','Caarapó','Caatiba','Cabaceiras','Cabaceiras do Paraguaçu','Cabanas de Tavira','Cabanas de Torres','Cabanas de Viriato','Cabeceira Grande','Cabeceiras','Cabeceiras de Basto','Cabeceiras do Piauí','Cabedelo','Cabeça','Cabeça Gorda','Cabinda','Cabixi','Cabo','Cabo Frio','Cabo Verde','Cabo de Santo Agostinho','Cabouco','Cabreúva','Cabrobó','Cabrália Paulista','Cacaulândia','Cacem','Cacequi','Cacheu','Cachoeira','Cachoeira Alta','Cachoeira Dourada','Cachoeira Grande','Cachoeira Paulista','Cachoeira da Prata','Cachoeira de Goiás','Cachoeira de Minas','Cachoeira de Pajeú','Cachoeira do Arari','Cachoeira do Piriá','Cachoeira do Sul','Cachoeira dos Índios','Cachoeiras','Cachoeiras de Macacu','Cachoeirinha','Cachoeiro de Itapemirim','Cacilhas','Cacimba de Areia','Cacimba de Dentro','Cacimbas','Cacimbinhas','Cacique Doble','Cacoal','Caconda','Caconde','Cacuaco','Caculé','Cacém','Cadafais','Cadafaz','Cadaval','Caetanos','Caetanópolis','Caetité','Caeté','Caetés','Cafarnaum','Cafeara','Cafelândia','Cafezal do Sul','Caiabu','Caiana','Caiapônia','Caibaté','Caibi','Caicó','Caieiras','Caimbambo','Cairu','Cais do Pico','Caiuá','Caiçara','Caiçara do Norte','Caiçara do Rio do Vento','Cajamar','Cajapió','Cajari','Cajati','Cajazeiras','Cajazeiras do Piauí','Cajazeirinhas','Cajobi','Cajueiro','Cajueiro da Praia','Cajuri','Cajuru','Caldas','Caldas Brandão','Caldas Novas','Caldas da Rainha','Caldas das Taipas','Caldas de Vizela','Caldazinha','Caldeirão Grande','Caldeirão Grande do Piauí','Caldelas','Calendário','Calhandriz','Calheta','Calheta de São Jorge','Califórnia','Calmon','Calumbi','Caluquembe','Calçado','Calçoene','Camabatela','Camacan','Camacha','Camacho','Camacupa','Camalaú','Camamu','Camanducaia','Camapuã','Camaquã','Camaragibe','Camarate','Camargo','Camaçari','Cambará','Cambará do Sul','Cambira','Camboriú','Cambuci','Cambuquira','Cambuí','Cambé','Cametá','Caminha','Camocim','Camocim de São Félix','Campanha','Campanário','Campelos','Campestre','Campestre da Serra','Campestre de Goiás','Campestre do Maranhão','Campina Grande','Campina Grande do Sul','Campina Verde','Campina da Lagoa','Campina das Missões','Campina do Monte Alegre','Campina do Simão','Campinas','Campinas do Piauí','Campinas do Sul','Campinaçu','Campinorte','Campinápolis','Campo','Campo Alegre','Campo Alegre de Goiás','Campo Alegre de Lourdes','Campo Alegre do Fidalgo','Campo Azul','Campo Belo','Campo Belo do Sul','Campo Bom','Campo Bonito','Campo Erê','Campo Florido','Campo Formoso','Campo Grande','Campo Grande do Piauí','Campo Largo','Campo Largo do Piauí','Campo Limpo Paulista','Campo Limpo de Goiás','Campo Magro','Campo Maior','Campo Mourão','Campo Novo','Campo Novo de Rondônia','Campo Novo do Parecis','Campo Redondo','Campo Verde','Campo de Besteiros','Campo do Brito','Campo do Meio','Campo do Tenente','Campolide','Campos Altos','Campos Belos','Campos Borges','Campos Gerais','Campos Lindos','Campos Novos','Campos Novos Paulista','Campos Sales','Campos Verdes','Campos de Júlio','Campos do Jordão','Campos dos Goytacazes','Camucuio','Camutanga','Cana Verde','CanaBrava do Norte','Cananéia','Canapi','Canarana','Canas','Canas de Senhorim','Canavieira','Canavieiras','Canaã','Canaã dos Carajás','Canchungo','Candeal','Candeias','Candeias do Jamari','Candelária','Candiba','Candiota','Candoso','Candói','Canela','Canelas','Canelinha','Caneças','Canguaretama','Canguçu','Canhas','Canhoba','Canhotinho','Canidelo','Canindé','Canindé de São Francisco','Canitar','Caniçal','Caniço','Canoas','Canoinhas','Cansanção','Cantagalo','Cantanhede','Canto do Buriti','Cantá','Canudos','Canudos do Vale','Canutama','Canápolis','Capanema','Caparaó','Caparica','Capela','Capela Nova','Capela de Santana','Capela do Alto','Capela do Alto Alegre','Capelinha','Capetinga','Capim','Capim Branco','Capim Grosso','Capinzal','Capinzal do Norte','Capinópolis','Capistrano','Capitão','Capitão Andrade','Capitão Enéas','Capitão Gervásio Oliveira','Capitão Leônidas Marques','Capitão Poço','Capitão de Campos','Capitólio','Capivari','Capivari de Baixo','Capivari do Sul','Capixaba','Capoeiras','Caputira','Capão Alto','Capão Bonito','Capão Bonito do Sul','Capão da Canoa','Capão do Cipó','Capão do Leão','Caracaraí','Caracol','Caraguatatuba','Carambeí','Caranaíba','Carandaí','Carangola','Caranguejeira','Carapebus','Carapicuíba','Carapinheira','Carapito','Caratinga','Carauari','Caravelas','Carazinho','Caraá','Caraí','Caraíbas','Caraúbas','Caraúbas do Piauí','Carbonita','Carcavelos','Cardeal da Silva','Cardosas','Cardoso','Cardoso Moreira','Careaçu','Careiro','Careiro da Várzea','Cariacica','Carianos','Caridade','Caridade do Piauí','Carinhanha','Carira','Cariri do Tocantins','Caririaçu','Cariré','Cariús','Carlinda','Carlos Barbosa','Carlos Chagas','Carlos Gomes','Carlópolis','Carmo','Carmo da Cachoeira','Carmo da Mata','Carmo de Minas','Carmo do Cajuru','Carmo do Paranaíba','Carmo do Rio Claro','Carmo do Rio Verde','Carmolândia','Carmésia','Carmópolis','Carmópolis de Minas','Carmões','Carnaubais','Carnaubal','Carnaubeira da Penha','Carnaxide','Carnaíba','Carnaúba dos Dantas','Carneirinho','Carneiros','Carnicães','Carnide','Carnota','Caroebe','Carolina','Carpina','Carragozela','Carrancas','Carrapateira','Carrapichana','Carrasco Bonito','Carrazeda de Anciães','Carrazeda de Ansiães','Carregado','Carregal do Sal','Cartaxo','Caruaru','Carutapera','Carvalhal','Carvalhos','Carvalhosa','Carvalhópolis','Carvoeira','Carvoeiro','Casa Branca','Casa Grande','Casa Nova','Casal Vasco','Casal de Cambra','Casal de Cinza','Casas do Soeiro','Casca','Cascais','Cascalho Rico','Cascavel','Caseara','Caseiros','Casimiro de Abreu','Casinhas','Casserengue','Cassilândia','Castanhal','Castanheira','Castanheira de Pêra','Castanheira do Ribatejo','Castanheiras','Casteição','Casteleiro','Castelo','Castelo (Lisbon)','Castelo Bom','Castelo Branco','Castelo Melhor','Castelo Rodrigo','Castelo de Paiva','Castelo de Vide','Castelo do Piauí','Castelândia','Castelões de Cepeda','Castilho','Castro','Castro Alves','Castro Daire','Castro Marim','Castro Verde','Catabola','Cataguases','Catalão','Catanduva','Catanduvas','Catarina','Catas Altas','Catas Altas da Noruega','Catende','Catiguá','Catingueira','Cativelos','Catió','Catolândia','Catolé do Rocha','Catu','Catuji','Catumbela','Catunda','Caturama','Caturaí','Caturité','Catuti','Catuípe','Caucaia','Cavadoude','Cavalcante','Caxambu','Caxambu do Sul','Caxias','Caxias do Sul','Caxingó','Caxito','Cazaji','Cazenga','Caála','Caçador','Caçapava','Caçapava do Sul','Caçu','Caém','Ceará Mirim','Cedovim','Cedral','Cedro','Cedro de São João','Cedro do Abaeté','Cela','Celorico da Beira','Celorico de Basto','Celso Ramos','Centenário','Centenário do Sul','Central','Central de Minas','Central do Maranhão','Centralina','Centro Novo do Maranhão','Centro do Guilherme','Cercal','Cerdeira','Cerejeiras','Cerejo','Ceres','Cerqueira César','Cerquilho','Cerrito','Cerro Azul','Cerro Branco','Cerro Corá','Cerro Grande','Cerro Grande do Sul','Cerro Largo','Cerro Negro','Cesário Lange','Cezarina','Chalé','Chamusca','Chapada','Chapada Gaúcha','Chapada da Natividade','Chapada de Areia','Chapada do Norte','Chapada dos Guimarães','Chapadinha','Chapadão do Céu','Chapadão do Lageado','Chapadão do Sul','Chapecó','Charneca','Charneca de Caparica','Charqueada','Charqueadas','Charrua','Chaval','Chavantes','Chaves','Chavão','Chela','Cheleiros','Chiador','Chiapetta','Chibia','Chibuto','Chicomba','Chimoio','Chinde','Chipindo','Chissamba','Chiure','Chokwé','Chongoroi','Chopinzinho','Chorozinho','Chorrochó','Choró','Chupinguaia','Chuvisca','Chuí','Chácara','Chã Grande','Chã Preta','Chã de Alegria','Chãs','Cianorte','Cidade Gaúcha','Cidade Ocidental','Cidade Velha','Cidelândia','Cidreira','Cinfães','Cipotânea','Cipó','Ciríaco','Citrana','Claraval','Claro dos Poções','Clementina','Clevelândia','Cláudia','Cláudio','Coaraci','Coari','Cocal','Cocal de Telha','Cocal do Sul','Cocal dos Alves','Cocalinho','Cocalzinho de Goiás','Cocos','Codajás','Codesseiro','Codó','Coelho Neto','Cogula','Coimbra','Coité do Nóia','Coivaras','Colares','Colatina','Colina','Colinas','Colinas do Sul','Colinas do Tocantins','Colméia','Colniza','Colombo','Colorado','Colorado do Oeste','Coluna','Colíder','Colômbia','Colônia Leopoldina','Colônia do Gurguéia','Colônia do Piauí','Combinado','Comendador Gomes','Comendador Levy Gasparian','Comercinho','Comodoro','Comporta','Conceição','Conceição da Aparecida','Conceição da Barra','Conceição da Barra de Minas','Conceição da Feira','Conceição das Alagoas','Conceição das Pedras','Conceição de Ipanema','Conceição de Macabu','Conceição do Almeida','Conceição do Araguaia','Conceição do Canindé','Conceição do Castelo','Conceição do Coité','Conceição do Jacuípe','Conceição do Lago-Açu','Conceição do Mato Dentro','Conceição do Pará','Conceição do Rio Verde','Conceição do Tocantins','Conceição dos Ouros','Concelho de Matola','Conchal','Conchas','Concórdia','Concórdia do Pará','Condado','Conde','Condeixa-a-Nova','Condeúba','Condor','Confins','Confresa','Congo','Congonhal','Congonhas','Congonhas do Norte','Congonhinhas','Conquista','Conquista D\'oeste','Conselheiro Lafaiete','Conselheiro Mairinck','Conselheiro Pena','Consolação','Constantina','Constância','Contagem','Contenda','Contendas do Sincorá','Contuboel Sector','Coqueiral','Coqueiro Baixo','Coqueiro Seco','Coqueiros do Sul','Coração de Jesus','Coração de Maria','Corbélia','Cordeiro','Cordeiros','Cordeirópolis','Cordilheira Alta','Cordisburgo','Cordislândia','Coreaú','Coremas','Corguinho','Coribe','Corinto','Coriscada','Cornélio Procópio','Coroaci','Coroados','Coroatá','Coromandel','Coronel Barros','Coronel Bicaco','Coronel Domingos Soares','Coronel Ezequiel','Coronel Fabriciano','Coronel Freitas','Coronel José Dias','Coronel João Pessoa','Coronel João Sá','Coronel Macedo','Coronel Martins','Coronel Murta','Coronel Pacheco','Coronel Pilar','Coronel Sapucaia','Coronel Vivida','Coronel Xavier Chaves','Corrego Grande','Correia Pinto','Corrente','Correntes','Correntina','Corroios','Cortegaça','Cortiçada','Cortiçô','Cortiçô da Serra','Cortês','Coruche','Corujeira','Corumbataí','Corumbataí do Sul','Corumbaíba','Corumbiara','Corumbá','Corumbá de Goiás','Corupá','Coruripe','Corvo','Cosmorama','Cosmópolis','Costa Marques','Costa Rica','Costa de Caparica','Costeira do Pirajubae','Cotegipe','Cotia','Cotiporã','Cotriguaçu','Couto de Magalhães','Couto de Magalhães de Minas','Cova Figueira','Covilhã','Coxilha','Coxim','Coxixola','Crateús','Crato','Cravinhos','Cravolândia','Craíbas','Criciúma','Crissiumal','Cristais','Cristais Paulista','Cristal','Cristal do Sul','Cristalina','Cristalândia','Cristalândia do Piauí','Cristelo','Cristiano Otoni','Cristianópolis','Cristina','Cristino Castro','Cristinápolis','Cristo Rei','Cristália','Cristópolis','Crisólita','Crisópolis','Crixás','Crixás do Tocantins','Croatá','Cromínia','Crucilândia','Cruz','Cruz Alta','Cruz Machado','Cruz Quebrada - Dafundo','Cruz das Almas','Cruz do Espírito Santo','Cruzaltense','Cruzeiro','Cruzeiro da Fortaleza','Cruzeiro do Iguaçu','Cruzeiro do Oeste','Cruzeiro do Sul','Cruzeta','Cruzmaltina','Cruzália','Cruzília','Cuamba','Cuba','Cubal','Cubati','Cubatão','Cucujães','Cuiabá','Cuitegi','Cuito','Cuité','Cuité de Mamanguape','Cujubim','Cumari','Cumaru','Cumaru do Norte','Cumbe','Cunha','Cunha Porã','Cunhataí','Cuparaque','Cupira','Curaçá','Curimatá','Curionópolis','Curitiba','Curitibanos','Curiúva','Currais','Currais Novos','Curral Novo do Piauí','Curral Velho','Curral das Freiras','Curral de Cima','Curral de Dentro','Curralinho','Curralinhos','Cururupu','Curuá','Curuçá','Curvelo','Curvelândia','Custoias','Custódia','Cutias','Cuvango','Cáceres','Cássia','Cássia dos Coqueiros','Câmara de Lobos','Cândido Godói','Cândido Mendes','Cândido Mota','Cândido Rodrigues','Cândido Sales','Cândido de Abreu','Céu Azul','Cícero Dantas','Córrego Danta','Córrego Fundo','Córrego Novo','Córrego do Bom Jesus','Córrego do Ouro','Cótimos','Cônego Marinho','Damaia','Damianópolis','Damião','Damolândia','Dande','Darcinópolis','Datas','David Canabarro','Davinópolis','Delfim Moreira','Delfinópolis','Delmiro Gouveia','Delta','Demerval Lobão','Denise','Deodápolis','Deputado Irapuan Pinheiro','Derrubadas','Descalvado','Descanso','Descoberto','Desterro','Desterro de Entre Rios','Desterro do Melo','Dezesseis de Novembro','Diadema','Diamante','Diamante d\'Oeste','Diamante do Norte','Diamante do Sul','Diamantina','Diamantino','Dianópolis','Dias d\'Ávila','Dilermando de Aguiar','Dili','Diogo de Vasconcelos','Dionísio','Dionísio Cerqueira','Diorama','Dirce Reis','Dirceu Arcoverde','Divina Pastora','Divino','Divino das Laranjeiras','Divino de São Lourenço','Divinolândia','Divinolândia de Minas','Divinésia','Divinópolis','Divinópolis de Goiás','Divinópolis do Tocantins','Divisa Alegre','Divisa Nova','Divisópolis','Dobrada','Dois Córregos','Dois Irmãos','Dois Irmãos das Missões','Dois Irmãos do Buriti','Dois Irmãos do Tocantins','Dois Lajeados','Dois Portos','Dois Riachos','Dois Vizinhos','Dolcinópolis','Dom Aquino','Dom Basílio','Dom Bosco','Dom Cavati','Dom Eliseu','Dom Expedito Lopes','Dom Feliciano','Dom Inocêncio','Dom Joaquim','Dom Macedo Costa','Dom Pedrito','Dom Pedro','Dom Pedro de Alcântara','Dom Silvério','Dom Viçoso','Domingos Martins','Domingos Mourão','Dona Emma','Dona Eusébia','Dona Francisca','Dona Inês','Dondo','Dores de Campos','Dores de Guanhães','Dores do Indaiá','Dores do Rio Preto','Dores do Turvo','Doresópolis','Dormentes','Dornelas','Douradina','Dourado','Douradoquara','Dourados','Doutor Camargo','Doutor Maurício Cardoso','Doutor Pedrinho','Doutor Ricardo','Doutor Severiano','Doutor Ulysses','Doverlândia','Dracena','Duartina','Duas Barras','Duas Estradas','Dueré','Dumont','Duque Bacelar','Duque de Caxias','Durandé','Dário Meira','Echaporã','Ecoporanga','Edealina','Edéia','Eirado','Eirunepé','Eixo','Eldorado','Eldorado do Carajás','Eldorado do Sul','Elesbão Veloso','Elias Fausto','Eliseu Martins','Elisiário','Elvas','Elísio Medrado','Elói Mendes','Emas','Embaúba','Embu','Embu Guaçu','Embu das Artes','Emilianópolis','Encantado','Encanto','Encarnação','Encruzilhada','Encruzilhada do Sul','Engenheiro Beltrão','Engenheiro Caldas','Engenheiro Coelho','Engenheiro Navarro','Engenheiro Paulo de Frontin','Engenho Velho','Entre Folhas','Entre Rios','Entre Rios de Minas','Entre Rios do Oeste','Entre Rios do Sul','Entre-Ijuís','Entroncamento','Envira','Enxara do Bispo','Enéas Marques','Epitaciolândia','Equador','Erebango','Erechim','Ererê','Ericeira','Ermera Villa','Ermesinde','Ermo','Ernestina','Erval Grande','Erval Seco','Erval Velho','Ervas Tenras','Ervedosa','Ervedosa do Douro','Ervália','Escada','Escalhão','Esgueira','Esmeralda','Esmeraldas','Esmoriz','Espargo','Espargos','Espera Feliz','Esperantina','Esperantinópolis','Esperança','Esperança Nova','Esperança do Sul','Espigão Alto do Iguaçu','Espigão d\'Oeste','Espinho','Espinosa','Esplanada','Esporões','Esposende','Espumoso','Espírito Santo','Espírito Santo do Dourado','Espírito Santo do Pinhal','Espírito Santo do Turvo','Estarreja','Estação','Esteio','Estela','Estiva','Estiva Gerbi','Estoril','Estreito','Estreito da Calheta','Estrela','Estrela Dalva','Estrela Velha','Estrela d\'Oeste','Estrela de Alagoas','Estrela do Indaiá','Estrela do Norte','Estrela do Sul','Estremoz','Estância','Estância Velha','Estói','Estômbar','Euclides da Cunha','Euclides da Cunha Paulista','Eugenópolis','Eugênio de Castro','Eunápolis','Eusébio','Ewbank da Câmara','Extrema','Extremoz','Exu','Fafe','Fagundes','Fagundes Varela','Faia','Faial','Faina','Fajã da Ovelha','Fajã de Baixo','Falagueira','Fama','Famalicão','Famões','Fanhões','Faria','Faria Lemos'],
  hi:['बद्रीनाथ','केदारनाथ','गंगोत्री','यमुनोत्री','वाराणसी','मथुरा','वृंदावन','अयोध्या','द्वारका','रामेश्वरम','पुरी','तिरुपति','कांचीपुरम','महाबलिपुरम','हम्पी','पट्टदकल','ऐहोले','बादामी','बेलूर','हलेबिड','श्रवणबेलगोला','मदुरई','तंजावुर','चिदंबरम','तिरुचि','रामनाथपुरम','नागरकोइल','कन्याकुमारी','पद्मनाभपुरम','अट्टिंगल','श्रीरंगम','कुंभकोणम','उज्जैन','ओंकारेश्वर','महेश्वर','चित्रकूट','अमरकंटक','मांडू','ग्वालियर','ओरछा','खजुराहो','सांची','विदिशा','भोजपुर','भीमबेटका','उदयगिरि','रायसेन','अशोकनगर','अमृतसर','आनंदपुर','पटना','गया','बोधगया','राजगीर','नालंदा','वैशाली','कुशीनगर','लुंबिनी','श्रावस्ती','संकिसा','कपिलवस्तु','पावापुरी','हाजीपुर','उत्तरप्रदेश','महाराष्ट्र','बिहार','राजस्थान','गुजरात','कर्नाटक','तमिलनाडु','मध्यप्रदेश','पश्चिमबंगाल','तेलंगाना','ओडिशा','आंध्रप्रदेश','केरल','हरियाणा','पंजाब','असम','छत्तीसगढ़','उत्तराखंड','झारखंड','गोवा','हिमाचल','मणिपुर','मेघालय','मिजोरम','नागालैंड','त्रिपुरा','सिक्किम','अरुणाचल','जम्मूकश्मीर','लद्दाख','दिल्ली','मुंबई','कोलकाता','चेन्नई','बेंगलुरु','हैदराबाद','अहमदाबाद','पुणे','सूरत','जयपुर','लखनऊ','कानपुर','नागपुर','इंदौर','ठाणे','भोपाल','विशाखापट्नम','वडोदरा','गाजियाबाद','लुधियाना','आगरा','नाशिक','फरीदाबाद','मेरठ','राजकोट','श्रीनगर','औरंगाबाद','धनबाद','इलाहाबाद','जबलपुर','चंडीगढ़','कोझीकोड','कोयम्बटूर','रांची','जोधपुर','रायपुर','कोच्चि','गुवाहाटी','हुबली','मैसूर','सेलम','जमशेदपुर','जम्मू','तिरुवनंतपुरम','हिमालय','गंगा','यमुना','सरस्वती','ब्रह्मपुत्र','सिंधु','नर्मदा','गोदावरी','कृष्णा','कावेरी','महानदी','चंबल','झेलम','रावी','सतलज','बियास','घाघरा','शारदा','राप्ती','बेतवा','केन','सोन','गंडक','कोसी','तीस्ता','महानंदा','तोर्सा','संकोश','मानस','पगलाडिया','धनसिरी','दिसांग','एवरेस्ट','कंचनजंगा','नंदादेवी','कामेत','मकालू','धौलागिरि','अन्नपूर्णा','मनास्लु','गौरीशंकर','चो','लहोत्से','बरुन','पुमोरी','त्रिशूल','पंचचुली','लाल','नीला','हरा','सफेद','काला','पीला','नारंगी','बैंगनी','गुलाबी','भूरा','स्लेटी','चाँदी','सुनहरा','आसमानी','फिरोजी','मरून','केसरी','जामुनी','धानी','पिस्ता','तुलसी','हरित','नील','श्यामल','गेरुआ','कुमकुम','हल्दी','चंदन','रक्त','श्वेत','शेर','बाघ','भालू','भेड़िया','बाज','चील','सारस','हंस','मोर','कोयल','हाथी','गैंडा','चीता','तेंदुआ','जगुआर','भैंसा','नीलगाय','काकड़','बारहसिंगा','चीतल','सुस','डॉल्फिन','मगरमच्छ','घड़ियाल','साँप','कोबरा','अजगर','करैत','धामिन','बरगद','पीपल','नीम','आम','महुआ','सागौन','शीशम','अर्जुन','गुलाब','कमल','जूही','चमेली','मोगरा','गेंदा','सूरजमुखी','केसर','अफीम','धतूरा','अशोक','पलाश','सेमल','ढाक','करंज','कदंब','जामुन','आँवला','इमली','बेल','दीपावली','होली','दुर्गापूजा','दशहरा','ईद','क्रिसमस','बैसाखी','पोंगल','ओणम','बिहु','रामनवमी','जन्माष्टमी','महाशिवरात्रि','नवरात्रि','गणेशोत्सव','कुंभमेला','पुष्करमेला','सोनपुर','हरिहर','भरतपुर','अलवर','डीग','धौलपुर','करौली','सवाई','टोंक','बूँदी','कोटा','झालावाड़','बसंत','ग्रीष्म','वर्षा','शरद','हेमंत','शिशिर','भोर','प्रातः','सुबह','दोपहर','संध्या','रात','अर्धरात्रि','निशा','उषा','अरुण','चैत्र','वैशाख','ज्येष्ठ','आषाढ','श्रावण','भाद्रपद','आश्विन','कार्तिक','मार्गशीर्ष','पौष','माघ','फाल्गुन','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार','रविवार','जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर','एक','दो','तीन','चार','पाँच','छह','सात','आठ','नौ','दस','ग्यारह','बारह','तेरह','चौदह','पंद्रह','सोलह','सत्रह','अठारह','उन्नीस','बीस','तीस','चालीस','पचास','साठ','सत्तर','अस्सी','नब्बे','सौ','हजार','लाख','उत्तर','दक्षिण','पूर्व','पश्चिम','मध्य','ऊपर','नीचे','अंदर','बाहर','बीच','सूर्य','चंद्र','तारा','आकाश','पृथ्वी','अग्नि','जल','वायु','धरा','पर्वत','नदी','सागर','वन','मैदान','मरुस्थल','घाटी','पठार','द्वीप','प्रायद्वीप','रामायण','महाभारत','भागवत','गीता','उपनिषद','वेद','पुराण','शास्त्र','सूत्र','स्मृति','राम','सीता','लक्ष्मण','हनुमान','रावण','भरत','शत्रुघ्न','दशरथ','कौशल्या','कैकेयी','कृष्ण','भीम','युधिष्ठिर','नकुल','सहदेव','द्रौपदी','कुंती','गांधारी','धृतराष्ट्र','शिव','पार्वती','गणेश','कार्तिकेय','लक्ष्मी','दुर्गा','काली','ब्रह्मा','विष्णु','दाल','चावल','रोटी','सब्जी','दही','घी','मसाला','अदरक','लहसुन','बिरयानी','खिचड़ी','पुलाव','कढ़ी','राजमा','छोले','पनीर','मक्खन','लस्सी','शरबत','लड्डू','बर्फी','हलवा','खीर','रसगुल्ला','जलेबी','गुलाबजामुन','पेड़ा','मोदक','चिक्की','फतेहपुर','सिकरी','अलीगढ','मुरादाबाद','सहारनपुर','हरिद्वार','देहरादून','नैनीताल','मसूरी','शिमला','धर्मशाला','मनाली','कुल्लू','रोहतांग','स्पीति','किन्नौर','लाहुल','गुलमर्ग','पहलगाम','सोनमर्ग','लेह','नुब्रा','पैंगोंग','त्सो','मोरिरी','उदयपुर','जैसलमेर','माउंट','पुष्कर','अजमेर','नाथद्वारा','चित्तौड़','कुंभलगढ़','रणकपुर','जयगढ़','नाहरगढ़','आमेर','सांभर','शेखावाटी','मंडावा','लक्ष्मणगढ़','रामगढ़','उत्तरनगर','उत्तरग्राम','उत्तरनदी','उत्तरपर्वत','उत्तरसागर','उत्तरझील','उत्तरवन','उत्तरमैदान','उत्तरघाटी','उत्तरतट','दक्षिणनगर','दक्षिणग्राम','दक्षिणनदी','दक्षिणपर्वत','दक्षिणसागर','दक्षिणझील','दक्षिणवन','दक्षिणमैदान','दक्षिणघाटी','दक्षिणतट','पूर्वनगर','पूर्वग्राम','पूर्वनदी','पूर्वपर्वत','पूर्वसागर','पूर्वझील','पूर्ववन','पूर्वमैदान','पूर्वघाटी','पूर्वतट','पश्चिमनगर','पश्चिमग्राम','पश्चिमनदी','पश्चिमपर्वत','पश्चिमसागर','पश्चिमझील','पश्चिमवन','पश्चिममैदान','पश्चिमघाटी','पश्चिमतट','नयानगर','नयाग्राम','नयानदी','नयापर्वत','नयासागर','नयाझील','नयावन','नयामैदान','नयाघाटी','नयातट','पुरानानगर','पुरानाग्राम','पुरानानदी','पुरानापर्वत','पुरानासागर','पुरानाझील','पुरानावन','पुरानामैदान','पुरानाघाटी','पुरानातट','बड़ानगर','बड़ाग्राम','बड़ानदी','बड़ापर्वत','बड़ासागर','बड़ाझील','बड़ावन','बड़ामैदान','बड़ाघाटी','बड़ातट','छोटानगर','छोटाग्राम','छोटानदी','छोटापर्वत','छोटासागर','छोटाझील','छोटावन','छोटामैदान','छोटाघाटी','छोटातट','ऊपरनगर','ऊपरग्राम','ऊपरनदी','ऊपरपर्वत','ऊपरसागर','ऊपरझील','ऊपरवन','ऊपरमैदान','ऊपरघाटी','ऊपरतट','नीचेनगर','नीचेग्राम','नीचेनदी','नीचेपर्वत','नीचेसागर','नीचेझील','नीचेवन','नीचेमैदान','नीचेघाटी','नीचेतट','लालसूर्य','लालचंद्र','लालतारा','लालनदी','लालपर्वत','लालवायु','लालवर्षा','लालहिम','लालपुष्प','लालपक्षी','नीलासूर्य','नीलाचंद्र','नीलातारा','नीलानदी','नीलापर्वत','नीलावायु','नीलावर्षा','नीलाहिम','नीलापुष्प','नीलापक्षी','हरासूर्य','हराचंद्र','हरातारा','हरानदी','हरापर्वत','हरावायु','हरावर्षा','हराहिम','हरापुष्प','हरापक्षी','सफेदसूर्य','सफेदचंद्र','सफेदतारा','सफेदनदी','सफेदपर्वत','सफेदवायु','सफेदवर्षा','सफेदहिम','सफेदपुष्प','सफेदपक्षी','कालासूर्य','कालाचंद्र','कालातारा','कालानदी','कालापर्वत','कालावायु','कालावर्षा','कालाहिम','कालापुष्प','कालापक्षी','सुनहरासूर्य','सुनहराचंद्र','सुनहरातारा','सुनहरानदी','सुनहरापर्वत','सुनहरावायु','सुनहरावर्षा','सुनहराहिम','सुनहरापुष्प','सुनहरापक्षी','चाँदीसूर्य','चाँदीचंद्र','चाँदीतारा','चाँदीनदी','चाँदीपर्वत','चाँदीवायु','चाँदीवर्षा','चाँदीहिम','चाँदीपुष्प','चाँदीपक्षी','धूसरसूर्य','धूसरचंद्र','धूसरतारा','धूसरनदी','धूसरपर्वत','धूसरवायु','धूसरवर्षा','धूसरहिम','धूसरपुष्प','धूसरपक्षी','गुलाबीसूर्य','गुलाबीचंद्र','गुलाबीतारा','गुलाबीनदी','गुलाबीपर्वत','गुलाबीवायु','गुलाबीवर्षा','गुलाबीहिम','गुलाबीपुष्प','गुलाबीपक्षी','बैंगनीसूर्य','बैंगनीचंद्र','बैंगनीतारा','बैंगनीनदी','बैंगनीपर्वत','बैंगनीवायु','बैंगनीवर्षा','बैंगनीहिम','बैंगनीपुष्प','बैंगनीपक्षी','बसंतवर्षा','बसंतवायु','बसंतकोहरा','बसंतपाला','बसंतहिम','बसंतवज्र','बसंतइंद्रधनुष','बसंतओस','बसंतओले','बसंततूफान','ग्रीष्मवर्षा','ग्रीष्मवायु','ग्रीष्मकोहरा','ग्रीष्मपाला','ग्रीष्महिम','ग्रीष्मवज्र','ग्रीष्मइंद्रधनुष','ग्रीष्मओस','ग्रीष्मओले','ग्रीष्मतूफान','वर्षावर्षा','वर्षावायु','वर्षाकोहरा','वर्षापाला','वर्षाहिम','वर्षावज्र','वर्षाइंद्रधनुष','वर्षाओस','वर्षाओले','वर्षातूफान','शरदवर्षा','शरदवायु','शरदकोहरा','शरदपाला','शरदहिम','शरदवज्र','शरदइंद्रधनुष','शरदओस','शरदओले','शरदतूफान','हेमंतवर्षा','हेमंतवायु','हेमंतकोहरा','हेमंतपाला','हेमंतहिम','हेमंतवज्र','हेमंतइंद्रधनुष','हेमंतओस','हेमंतओले','हेमंततूफान','शिशिरवर्षा','शिशिरवायु','शिशिरकोहरा','शिशिरपाला','शिशिरहिम','शिशिरवज्र','शिशिरइंद्रधनुष','शिशिरओस','शिशिरओले','शिशिरतूफान','प्रथमनगर','प्रथमग्राम','प्रथमपुर','प्रथमगढ़','प्रथमगंज','प्रथमपट्टी','प्रथमखेड़ा','प्रथमटोला','प्रथमबाड़ी','प्रथमहाट','द्वितीयनगर','द्वितीयग्राम','द्वितीयपुर','द्वितीयगढ़','द्वितीयगंज','द्वितीयपट्टी','द्वितीयखेड़ा','द्वितीयटोला','द्वितीयबाड़ी','द्वितीयहाट','तृतीयनगर','तृतीयग्राम','तृतीयपुर','तृतीयगढ़','तृतीयगंज','तृतीयपट्टी','तृतीयखेड़ा','तृतीयटोला','तृतीयबाड़ी','तृतीयहाट','चतुर्थनगर','चतुर्थग्राम','चतुर्थपुर','चतुर्थगढ़','चतुर्थगंज','चतुर्थपट्टी','चतुर्थखेड़ा','चतुर्थटोला','चतुर्थबाड़ी','चतुर्थहाट','पंचमनगर','पंचमग्राम','पंचमपुर','पंचमगढ़','पंचमगंज','पंचमपट्टी','पंचमखेड़ा','पंचमटोला','पंचमबाड़ी','पंचमहाट','षष्ठनगर','षष्ठग्राम','षष्ठपुर','षष्ठगढ़','षष्ठगंज','षष्ठपट्टी','षष्ठखेड़ा','षष्ठटोला','षष्ठबाड़ी','षष्ठहाट','सप्तमनगर','सप्तमग्राम','सप्तमपुर','सप्तमगढ़','सप्तमगंज','सप्तमपट्टी','सप्तमखेड़ा','सप्तमटोला','सप्तमबाड़ी','सप्तमहाट','अष्टमनगर','अष्टमग्राम','अष्टमपुर','अष्टमगढ़','अष्टमगंज','अष्टमपट्टी','अष्टमखेड़ा','अष्टमटोला','अष्टमबाड़ी','अष्टमहाट','नवमनगर','नवमग्राम','नवमपुर','नवमगढ़','नवमगंज','नवमपट्टी','नवमखेड़ा','नवमटोला','नवमबाड़ी','नवमहाट','दशमनगर','दशमग्राम','दशमपुर','दशमगढ़','दशमगंज','दशमपट्टी','दशमखेड़ा','दशमटोला','दशमबाड़ी','दशमहाट','सुंदरनगर','सुंदरग्राम','सुंदरपुर','सुंदरगढ़','सुंदरगंज','सुंदरपट्टी','सुंदरखेड़ा','सुंदरटोला','सुंदरबाड़ी','सुंदरहाट','सुंदरमंदिर','सुंदरमठ','सुंदरतीर्थ','सुंदरधाम','सुंदरकुंड','सुंदरसरोवर','सुंदरताल','सुंदरकूप','सुंदरनदी','सुंदरघाट','महाननगर','महानग्राम','महानपुर','महानगढ़','महानगंज','महानपट्टी','महानखेड़ा','महानटोला','महानबाड़ी','महानहाट','महानमंदिर','महानमठ','महानतीर्थ','महानधाम','महानकुंड','महानसरोवर','महानताल','महानकूप','महाननदी','महानघाट','प्राचीननगर','प्राचीनग्राम','प्राचीनपुर','प्राचीनगढ़','प्राचीनगंज','प्राचीनपट्टी','प्राचीनखेड़ा','प्राचीनटोला','प्राचीनबाड़ी','प्राचीनहाट','प्राचीनमंदिर','प्राचीनमठ','प्राचीनतीर्थ','प्राचीनधाम','प्राचीनकुंड','प्राचीनसरोवर','प्राचीनताल','प्राचीनकूप','प्राचीननदी','प्राचीनघाट','नयापुर','नयागढ़','नयागंज','नयापट्टी','नयाखेड़ा','नयाटोला','नयाबाड़ी','नयाहाट','नयामंदिर','नयामठ','नयातीर्थ','नयाधाम','नयाकुंड','नयासरोवर','नयाताल','नयाकूप','नयाघाट','पुरानापुर','पुरानागढ़','पुरानागंज','पुरानापट्टी','पुरानाखेड़ा','पुरानाटोला','पुरानाबाड़ी','पुरानाहाट','पुरानामंदिर','पुरानामठ','पुरानातीर्थ','पुरानाधाम','पुरानाकुंड','पुरानासरोवर','पुरानाताल','पुरानाकूप','पुरानाघाट','बड़ापुर','बड़ागढ़','बड़ागंज','बड़ापट्टी','बड़ाखेड़ा','बड़ाटोला','बड़ाबाड़ी','बड़ाहाट','बड़ामंदिर','बड़ामठ','बड़ातीर्थ','बड़ाधाम','बड़ाकुंड','बड़ासरोवर','बड़ाताल','बड़ाकूप','बड़ाघाट','छोटापुर','छोटागढ़','छोटागंज','छोटापट्टी','छोटाखेड़ा','छोटाटोला','छोटाबाड़ी','छोटाहाट','छोटामंदिर','छोटामठ','छोटातीर्थ','छोटाधाम','छोटाकुंड','छोटासरोवर','छोटाताल','छोटाकूप','छोटाघाट','ऊंचानगर','ऊंचाग्राम','ऊंचापुर','ऊंचागढ़','ऊंचागंज','ऊंचापट्टी','ऊंचाखेड़ा','ऊंचाटोला','ऊंचाबाड़ी','ऊंचाहाट','ऊंचामंदिर','ऊंचामठ','ऊंचातीर्थ','ऊंचाधाम','ऊंचाकुंड','ऊंचासरोवर','ऊंचाताल','ऊंचाकूप','ऊंचानदी','ऊंचाघाट','गहरानगर','गहराग्राम','गहरापुर','गहरागढ़','गहरागंज','गहरापट्टी','गहराखेड़ा','गहराटोला','गहराबाड़ी','गहराहाट','गहरामंदिर','गहरामठ','गहरातीर्थ','गहराधाम','गहराकुंड','गहरासरोवर','गहराताल','गहराकूप','गहरानदी','गहराघाट','विशालनगर','विशालग्राम','विशालपुर','विशालगढ़','विशालगंज','विशालपट्टी','विशालखेड़ा','विशालटोला','विशालबाड़ी','विशालहाट','विशालमंदिर','विशालमठ','विशालतीर्थ','विशालधाम','विशालकुंड','विशालसरोवर','विशालताल','विशालकूप','विशालनदी','विशालघाट','शांतनगर','शांतग्राम','शांतपुर','शांतगढ़','शांतगंज','शांतपट्टी','शांतखेड़ा','शांतटोला','शांतबाड़ी','शांतहाट','शांतमंदिर','शांतमठ','शांततीर्थ','शांतधाम','शांतकुंड','शांतसरोवर','शांतताल','शांतकूप','शांतनदी','शांतघाट','पवित्रनगर','पवित्रग्राम','पवित्रपुर','पवित्रगढ़','पवित्रगंज','पवित्रपट्टी','पवित्रखेड़ा','पवित्रटोला','पवित्रबाड़ी','पवित्रहाट','पवित्रमंदिर','पवित्रमठ','पवित्रतीर्थ','पवित्रधाम','पवित्रकुंड','पवित्रसरोवर','पवित्रताल','पवित्रकूप','पवित्रनदी','पवित्रघाट','स्वर्णिमनगर','स्वर्णिमग्राम','स्वर्णिमपुर','स्वर्णिमगढ़','स्वर्णिमगंज','स्वर्णिमपट्टी','स्वर्णिमखेड़ा','स्वर्णिमटोला','स्वर्णिमबाड़ी','स्वर्णिमहाट','स्वर्णिममंदिर','स्वर्णिममठ','स्वर्णिमतीर्थ','स्वर्णिमधाम','स्वर्णिमकुंड','स्वर्णिमसरोवर','स्वर्णिमताल','स्वर्णिमकूप','स्वर्णिमनदी','स्वर्णिमघाट','रजतनगर','रजतग्राम','रजतपुर','रजतगढ़','रजतगंज','रजतपट्टी','रजतखेड़ा','रजतटोला','रजतबाड़ी','रजतहाट','रजतमंदिर','रजतमठ','रजततीर्थ','रजतधाम','रजतकुंड','रजतसरोवर','रजतताल','रजतकूप','रजतनदी','रजतघाट','हरितनगर','हरितग्राम','हरितपुर','हरितगढ़','हरितगंज','हरितपट्टी','हरितखेड़ा','हरितटोला','हरितबाड़ी','हरितहाट','हरितमंदिर','हरितमठ','हरिततीर्थ','हरितधाम','हरितकुंड','हरितसरोवर','हरितताल','हरितकूप','हरितनदी','हरितघाट','नीलानगर','नीलाग्राम','नीलापुर','नीलागढ़','नीलागंज','नीलापट्टी','नीलाखेड़ा','नीलाटोला','नीलाबाड़ी','नीलाहाट','नीलामंदिर','नीलामठ','नीलातीर्थ','नीलाधाम','नीलाकुंड','नीलासरोवर','नीलाताल','नीलाकूप','नीलाघाट','लालनगर','लालग्राम','लालपुर','लालगढ़','लालगंज','लालपट्टी','लालखेड़ा','लालटोला','लालबाड़ी','लालहाट','लालमंदिर','लालमठ','लालतीर्थ','लालधाम','लालकुंड','लालसरोवर','लालताल','लालकूप','लालघाट','सफेदनगर','सफेदग्राम','सफेदपुर','सफेदगढ़','सफेदगंज','सफेदपट्टी','सफेदखेड़ा','सफेदटोला','सफेदबाड़ी','सफेदहाट','सफेदमंदिर','सफेदमठ','सफेदतीर्थ','सफेदधाम','सफेदकुंड','सफेदसरोवर','सफेदताल','सफेदकूप','सफेदघाट','कालानगर','कालाग्राम','कालापुर','कालागढ़','कालागंज','कालापट्टी','कालाखेड़ा','कालाटोला','कालाबाड़ी','कालाहाट','कालामंदिर','कालामठ','कालातीर्थ','कालाधाम','कालाकुंड','कालासरोवर','कालाताल','कालाकूप','कालाघाट','पीलानगर','पीलाग्राम','पीलापुर','पीलागढ़','पीलागंज','पीलापट्टी','पीलाखेड़ा','पीलाटोला','पीलाबाड़ी','पीलाहाट','पीलामंदिर','पीलामठ','पीलातीर्थ','पीलाधाम','पीलाकुंड','पीलासरोवर','पीलाताल','पीलाकूप','पीलानदी','पीलाघाट','अंबिकापुर','अकोला','अगरतला','आसनसोल','आजमगढ','इटावा','एटा','औरैया','कटिहार','करनाल','काशीपुर','कोरबा','खड़गपुर','खम्मम','गोंडा','गोरखपुर','चुरू','जालना','जींद','जौनपुर','झांसी','झुंझुनूं','टीकमगढ','डिब्रूगढ','तिरुपुर','दरभंगा','देवघर','नासिक','नांदेड','नोएडा','पानीपत','पालघर','फर्रुखाबाद','फिरोजाबाद','फिरोजपुर','बरेली','बहराइच','बालासोर','बिलासपुर','भागलपुर','भीलवाड़ा','भुवनेश्वर','मंगलुरु','मुजफ्फरनगर','मुजफ्फरपुर','यमुनानगर','रायगढ','रोहतक','लखीमपुर','विजयवाड़ा','संगरूर','सीतापुर','सिलीगुड़ी','हल्द्वानी','हिसार','हुगली','होशंगाबाद','होशियारपुर','श्रीपुर','श्रीगढ़','श्रीगंज','श्रीग्राम','श्रीखेड़ा','श्रीटोला','श्रीबाड़ी','श्रीहाट','श्रीमंडी','महानगर','महापुर','महागढ़','महागंज','महाग्राम','महाखेड़ा','महाटोला','महाबाड़ी','महाहाट','महामंडी','विशालमंडी','सुंदरमंडी','प्राचीनमंडी','पवित्रमंडी','स्वर्णनगर','स्वर्णपुर','स्वर्णगढ़','स्वर्णगंज','स्वर्णग्राम','स्वर्णखेड़ा','स्वर्णटोला','स्वर्णबाड़ी','स्वर्णहाट','स्वर्णमंडी','रजतमंडी','नवनगर','नवपुर','नवगढ़','नवगंज','नवग्राम','नवखेड़ा','नवटोला','नवबाड़ी','नवहाट','नवमंडी','पुरानगर','पुरापुर','पुरागढ़','पुरागंज','पुराग्राम','पुराखेड़ा','पुराटोला','पुराबाड़ी','पुराहाट','पुरामंडी','गंगातट','गंगाघाट','गंगाकिनारा','गंगानगर','गंगापुर','गंगाग्राम','गंगामंदिर','गंगातीर्थ','गंगाधाम','गंगाक्षेत्र','यमुनातट','यमुनाघाट','यमुनाकिनारा','यमुनापुर','यमुनाग्राम','यमुनामंदिर','यमुनातीर्थ','यमुनाधाम','यमुनाक्षेत्र','सरस्वतीतट','सरस्वतीघाट','सरस्वतीकिनारा','सरस्वतीनगर','सरस्वतीपुर','सरस्वतीग्राम','सरस्वतीमंदिर','सरस्वतीतीर्थ','सरस्वतीधाम','सरस्वतीक्षेत्र','नर्मदातट','नर्मदाघाट','नर्मदाकिनारा','नर्मदानगर','नर्मदापुर','नर्मदाग्राम','नर्मदामंदिर','नर्मदातीर्थ','नर्मदाधाम','नर्मदाक्षेत्र','कावेरीतट','कावेरीघाट','कावेरीकिनारा','कावेरीनगर','कावेरीपुर','कावेरीग्राम','कावेरीमंदिर','कावेरीतीर्थ','कावेरीधाम','कावेरीक्षेत्र','कृष्णातट','कृष्णाघाट','कृष्णाकिनारा','कृष्णानगर','कृष्णापुर','कृष्णाग्राम','कृष्णामंदिर','कृष्णातीर्थ','कृष्णाधाम','कृष्णाक्षेत्र','गोदावरीतट','गोदावरीघाट','गोदावरीकिनारा','गोदावरीनगर','गोदावरीपुर','गोदावरीग्राम','गोदावरीमंदिर','गोदावरीतीर्थ','गोदावरीधाम','गोदावरीक्षेत्र','महानदीतट','महानदीघाट','महानदीकिनारा','महानदीनगर','महानदीपुर','महानदीग्राम','महानदीमंदिर','महानदीतीर्थ','महानदीधाम','महानदीक्षेत्र','ताप्तीतट','ताप्तीघाट','ताप्तीकिनारा','ताप्तीनगर','ताप्तीपुर','ताप्तीग्राम','ताप्तीमंदिर','ताप्तीतीर्थ','ताप्तीधाम','ताप्तीक्षेत्र','साबरमतीतट','साबरमतीघाट','साबरमतीकिनारा','साबरमतीनगर','साबरमतीपुर','साबरमतीग्राम','साबरमतीमंदिर','साबरमतीतीर्थ','साबरमतीधाम','साबरमतीक्षेत्र','अमरोहा','अलीपुर','उत्तरकाशी','एटावा','कन्नौज','कासगंज','गाजीपुर','देवरिया','पीलीभीत','प्रयागराज','फैजाबाद','बदायूं','बलिया','बस्ती','बाराबंकी','भदोही','मऊ','महोबा','मिर्जापुर','रायबरेली','रामपुर','संभल','सोनभद्र','सुलतानपुर','हमीरपुर','हापुड़','हरदोई','खरगोन','खंडवा','गुना','छतरपुर','छिंदवाड़ा','दतिया','दमोह','देवास','धार','नरसिंहपुर','पन्ना','बालाघाट','बैतूल','भिंड','मंदसौर','मुरैना','रतलाम','रीवा','शहडोल','शिवपुरी','सतना','सीधी','जालोर','झालावाड','डूंगरपुर','दौसा','नागौर','पाली','प्रतापगढ','बांसवाड़ा','बारां','बाड़मेर','बीकानेर','बूंदी','राजसमंद','सिरोही','हनुमानगढ','अमेठी','बागपत','बिजनौर','बुलंदशहर','बलरामपुर','शामली','शाहजहांपुर','संतकबीरनगर','सिद्धार्थनगर','अमरनगर','अमरपुर','अमरगढ़','अमरगंज','अमरग्राम','अमरधाम','अमरपीठ','अमरक्षेत्र','अमरतीर्थ','अमरमंदिर','सुंदरपीठ','सुंदरक्षेत्र','विशालपीठ','विशालक्षेत्र','महाधाम','महापीठ','महाक्षेत्र','महातीर्थ','महामंदिर','राजनगर','राजपुर','राजगढ़','राजगंज','राजग्राम','राजधाम','राजपीठ','राजक्षेत्र','राजतीर्थ','राजमंदिर','देवनगर','देवपुर','देवगढ़','देवगंज','देवग्राम','देवधाम','देवपीठ','देवक्षेत्र','देवतीर्थ','देवमंदिर','श्रीधाम','श्रीपीठ','श्रीक्षेत्र','श्रीतीर्थ','श्रीमंदिर','जयनगर','जयगंज','जयग्राम','जयधाम','जयपीठ','जयक्षेत्र','जयतीर्थ','जयमंदिर','विजयनगर','विजयपुर','विजयगढ़','विजयगंज','विजयग्राम','विजयधाम','विजयपीठ','विजयक्षेत्र','विजयतीर्थ','विजयमंदिर','सत्यनगर','सत्यपुर','सत्यगढ़','सत्यगंज','सत्यग्राम','सत्यधाम','सत्यपीठ','सत्यक्षेत्र','सत्यतीर्थ','सत्यमंदिर','श्रीकोट','श्रीदुर्ग','श्रीकिला','श्रीमहल','श्रीहवेली','श्रीचौक','श्रीबाजार','श्रीघाट','श्रीकुंड','महाकोट','महादुर्ग','महाकिला','महामहल','महाहवेली','महाचौक','महाबाजार','महाघाट','महाकुंड','विशालकोट','विशालदुर्ग','विशालकिला','विशालमहल','विशालहवेली','विशालचौक','विशालबाजार','सुंदरकोट','सुंदरदुर्ग','सुंदरकिला','सुंदरमहल','सुंदरहवेली','सुंदरचौक','सुंदरबाजार','प्राचीनपीठ','प्राचीनक्षेत्र','प्राचीनकोट','प्राचीनदुर्ग','प्राचीनकिला','प्राचीनमहल','प्राचीनहवेली','प्राचीनचौक','प्राचीनबाजार','पवित्रपीठ','पवित्रक्षेत्र','पवित्रकोट','पवित्रदुर्ग','पवित्रकिला','पवित्रमहल','पवित्रहवेली','पवित्रचौक','पवित्रबाजार','स्वर्णधाम','स्वर्णपीठ','स्वर्णक्षेत्र','स्वर्णतीर्थ','स्वर्णमंदिर','स्वर्णकोट','स्वर्णदुर्ग','स्वर्णकिला','स्वर्णमहल','स्वर्णहवेली','स्वर्णचौक','स्वर्णबाजार','स्वर्णघाट','स्वर्णकुंड','रजतपीठ','रजतक्षेत्र','रजतकोट','रजतदुर्ग','रजतकिला','रजतमहल','रजतहवेली','रजतचौक','रजतबाजार','नवधाम','नवपीठ','नवक्षेत्र','नवतीर्थ','नवमंदिर','नवकोट','नवदुर्ग','नवकिला','नवमहल','नवहवेली','नवचौक','नवबाजार','नवघाट','नवकुंड','पुराधाम','पुरापीठ','पुराक्षेत्र','पुरातीर्थ','पुरामंदिर','पुराकोट','पुरादुर्ग','पुराकिला','पुरामहल','पुराहवेली','पुराचौक','पुराबाजार','पुराघाट','पुराकुंड','जयकोट','जयदुर्ग','जयकिला','जयमहल','जयहवेली','जयचौक','जयबाजार','जयमंडी','जयघाट','जयकुंड','विजयकोट','विजयदुर्ग','विजयकिला','विजयमहल','विजयहवेली','विजयचौक','विजयबाजार','विजयमंडी','विजयघाट','विजयकुंड','सत्यकोट','सत्यदुर्ग','सत्यकिला','सत्यमहल','सत्यहवेली','सत्यचौक','सत्यबाजार','सत्यमंडी','सत्यघाट','सत्यकुंड','धर्मनगर','धर्मपुर','धर्मगढ़','धर्मगंज','धर्मग्राम','धर्मधाम','धर्मपीठ','धर्मक्षेत्र','धर्मतीर्थ','धर्ममंदिर','धर्मकोट','धर्मदुर्ग','धर्मकिला','धर्ममहल','धर्महवेली','धर्मचौक','धर्मबाजार','धर्ममंडी','धर्मघाट','धर्मकुंड','कर्मनगर','कर्मपुर','कर्मगढ़','कर्मगंज','कर्मग्राम','कर्मधाम','कर्मपीठ','कर्मक्षेत्र','कर्मतीर्थ','कर्ममंदिर','कर्मकोट','कर्मदुर्ग','कर्मकिला','कर्ममहल','कर्महवेली','कर्मचौक','कर्मबाजार','कर्ममंडी','कर्मघाट','कर्मकुंड','ज्ञाननगर','ज्ञानपुर','ज्ञानगढ़','ज्ञानगंज','ज्ञानग्राम','ज्ञानधाम','ज्ञानपीठ','ज्ञानक्षेत्र','ज्ञानतीर्थ','ज्ञानमंदिर','ज्ञानकोट','ज्ञानदुर्ग','ज्ञानकिला','ज्ञानमहल','ज्ञानहवेली','ज्ञानचौक','ज्ञानबाजार','ज्ञानमंडी','ज्ञानघाट','ज्ञानकुंड','भक्तिनगर','भक्तिपुर','भक्तिगढ़','भक्तिगंज','भक्तिग्राम','भक्तिधाम','भक्तिपीठ','भक्तिक्षेत्र','भक्तितीर्थ','भक्तिमंदिर','भक्तिकोट','भक्तिदुर्ग','भक्तिकिला','भक्तिमहल','भक्तिहवेली','भक्तिचौक','भक्तिबाजार','भक्तिमंडी','भक्तिघाट','भक्तिकुंड','शक्तिनगर','शक्तिपुर','शक्तिगढ़','शक्तिगंज','शक्तिग्राम','शक्तिधाम','शक्तिपीठ','शक्तिक्षेत्र','शक्तितीर्थ','शक्तिमंदिर','शक्तिकोट','शक्तिदुर्ग','शक्तिकिला','शक्तिमहल','शक्तिहवेली','शक्तिचौक','शक्तिबाजार','शक्तिमंडी','शक्तिघाट','शक्तिकुंड','मुक्तिनगर','मुक्तिपुर','मुक्तिगढ़','मुक्तिगंज','मुक्तिग्राम','मुक्तिधाम','मुक्तिपीठ','मुक्तिक्षेत्र','मुक्तितीर्थ','मुक्तिमंदिर','मुक्तिकोट','मुक्तिदुर्ग','मुक्तिकिला','मुक्तिमहल','मुक्तिहवेली','मुक्तिचौक','मुक्तिबाजार','मुक्तिमंडी','मुक्तिघाट','मुक्तिकुंड','सिद्धिनगर','सिद्धिपुर','सिद्धिगढ़','सिद्धिगंज','सिद्धिग्राम','सिद्धिधाम','सिद्धिपीठ','सिद्धिक्षेत्र','सिद्धितीर्थ','सिद्धिमंदिर','सिद्धिकोट','सिद्धिदुर्ग','सिद्धिकिला','सिद्धिमहल','सिद्धिहवेली','सिद्धिचौक','सिद्धिबाजार','सिद्धिमंडी','सिद्धिघाट','सिद्धिकुंड','अंबाला','अंबेडकरनगर','अरवल','आरा','ब्रह्मनगर','विष्णुपुर','शिवगढ','इंद्रपुर','वरुणपुर','अग्निगढ','वायुनगर','सूर्यपुर','चंद्रनगर','तारापुर','नक्षत्रपुर','ग्रहनगर','मंगलपुर','शुक्रनगर','बुधनगर','गुरुनगर','शनिनगर','राहुपुर','केतुपुर','लक्ष्मीपुर','दुर्गापुर','कालीपुर','पार्वतीपुर','रामनगर','लक्ष्मणपुर','हनुमानपुर','गणेशपुर','कार्तिकपुर','मुरुगनपुर','वेंकटपुर','विट्ठलपुर','पांडुरंगपुर','द्वारकापुर','मथुरापुर','वृंदावनपुर','अयोध्यापुर','प्रयागपुर','गयापुर','बोधगयापुर','नालंदापुर','राजगीरपुर','वैशालीपुर','कुशीनगरपुर','सारनाथपुर','महाबलीपुरम','मदुरईपुर','कन्याकुमारीपुर','नगर1','ग्राम1','पुर1','नगर2','ग्राम2','पुर2','नगर3','ग्राम3','पुर3','नगर4','ग्राम4','पुर4','नगर5','ग्राम5','पुर5','नगर6','ग्राम6','पुर6','नगर7','ग्राम7','पुर7','नगर8','ग्राम8','पुर8','नगर9','ग्राम9','पुर9','नगर10','ग्राम10','पुर10','नगर11','ग्राम11','पुर11','नगर12','ग्राम12','पुर12','नगर13','ग्राम13','पुर13','नगर14','ग्राम14','पुर14','नगर15','ग्राम15','पुर15','नगर16','ग्राम16','पुर16','नगर17','ग्राम17','पुर17','नगर18','ग्राम18','पुर18','नगर19','ग्राम19','पुर19','नगर20','ग्राम20','पुर20','नगर21','ग्राम21','पुर21','नगर22','ग्राम22','पुर22','नगर23','ग्राम23','पुर23','नगर24','ग्राम24','पुर24','नगर25','ग्राम25','पुर25','नगर26','ग्राम26','पुर26','नगर27','ग्राम27','पुर27','नगर28','ग्राम28','पुर28','नगर29','ग्राम29','पुर29','नगर30','ग्राम30','पुर30','नगर31','ग्राम31','पुर31','नगर32','ग्राम32','पुर32','नगर33','ग्राम33','पुर33','नगर34','ग्राम34','पुर34','नगर35','ग्राम35','पुर35','नगर36','ग्राम36','पुर36','नगर37','ग्राम37','पुर37','चीन','अमेरिका','भारत','रूस','ब्राज़ील','जापान','जर्मनी','यूके','फ्रांस','इटली','कनाडा','दक्षिण कोरिया','ऑस्ट्रेलिया','स्पेन','मेक्सिको','इंडोनेशिया','नीदरलैंड','सऊदी अरब','तुर्की','स्विट्जरलैंड','स्वीडन','बेल्जियम','अर्जेंटीना','नॉर्वे','ऑस्ट्रिया','यूएई','इज़राइल','सिंगापुर','हांगकांग','ताइवान','थाईलैंड','मलेशिया','फिलीपींस','वियतनाम','पाकिस्तान','बांग्लादेश','मिस्र','नाइजीरिया','दक्षिण अफ्रीका','केन्या','इथियोपिया','मोरक्को','अल्जीरिया','ईरान','इराक','सीरिया','जॉर्डन','कुवैत','कतर','ओमान','यमन','अफ़ग़ानिस्तान','श्रीलंका','नेपाल','म्यांमार','कंबोडिया','मंगोलिया','कज़ाकस्तान','उज़्बेकिस्तान','यूक्रेन','पोलैंड','चेक गणराज्य','हंगरी','रोमानिया','ग्रीस','पुर्तगाल','फ़िनलैंड','डेनमार्क','आयरलैंड','न्यूज़ीलैंड','चिली','कोलंबिया','पेरू','वेनेज़ुएला','क्यूबा','तंज़ानिया','घाना','रवांडा','अंगोला','ज़िम्बाब्वे','नामीबिया','मोज़ाम्बिक','मेडागास्कर','कैमरून','कांगो','सेनेगल','बीजिंग','वॉशिंगटन','नई दिल्ली','मास्को','ब्रासीलिया','टोक्यो','बर्लिन','लंदन','पेरिस','रोम','ओटावा','सियोल','कैनबरा','मैड्रिड','मेक्सिको सिटी','जकार्ता','एम्स्टर्डम','रियाद','अंकारा','बर्न','वारसॉ','स्टॉकहोम','ब्रसेल्स','ब्यूनस आयर्स','ओस्लो','वियना','अबू धाबी','यरूशलेम','ताइपे','बैंकॉक','कुआलालंपुर','मनीला','हनोई','इस्लामाबाद','ढाका','काहिरा','नैरोबी','अदीस अबाबा','तेहरान','बग़दाद','दमिश्क','अम्मान','दोहा','मस्कट','काबुल','कोलंबो','काठमांडू','उलानबातर','ताशकंद','कीव','प्राग','बुडापेस्ट','एथेंस','लिस्बन','हेलसिंकी','डबलिन','वेलिंगटन','सैंटियागो','बोगोटा','लीमा','हवाना','किगाली','लुआंडा','गुआंगडोंग','सिचुआन','झेजियांग','जियांगसु','शानडोंग','हेनान','हुबेई','हुनान','हेबेई','फुजियान','लिआओनिंग','हेइलोंगजियांग','जिलिन','आनहुई','जिआंगशी','शानक्सी','शेनशी','युन्नान','गुइझोउ','गुआंगशी','आंतरिक मंगोलिया','तिब्बत','शिनजियांग','गांसू','किंगहाई','निंगशिया','हैनान','मकाओ','कैलिफोर्निया','टेक्सास','फ्लोरिडा','इलिनोइस','पेंसिल्वेनिया','ओहायो','जॉर्जिया','मिशिगन','साइबेरिया','उराल','काकेशस','उत्तर प्रदेश','पश्चिम बंगाल','साओ पाउलो','रियो डी जनेरियो','मिनास जेरैस','बाहिया','पराना','शंघाई','गुआंगझोउ','शेनझेन','चेंगदू','वुहान','शियान','हांग्जो','नानजिंग','सूझोऊ','चिंगदाओ','डालियान','शियामेन','कुनमिंग','हार्बिन','झेंग्झोऊ','जिनान','चांग्शा','शेनयांग','न्यूयॉर्क','लॉस एंजिल्स','शिकागो','ह्यूस्टन','डलास','फिलाडेल्फिया','टोरंटो','वैंकूवर','मॉन्ट्रियल','मैनचेस्टर','एडिनबर्ग','मार्सिले','ल्योन','बोर्डो','हैम्बर्ग','म्यूनिख','फ्रैंकफर्ट','मिलान','नेपल्स','फ्लोरेंस','वेनिस','बार्सिलोना','ज्यूरिख','जिनेवा','सेंट पीटर्सबर्ग','नोवोसिबिर्स्क','ओसाका','योकोहामा','नागोया','क्योटो','कोबे','फुकुओका','बुसान','सिडनी','मेलबर्न','कासाब्लांका','दुबई','इस्तांबुल','कराची','लागोस','जोहान्सबर्ग','हो ची मिन्ह','यांगून','स्थान0275','स्थान0276','स्थान0277','स्थान0278','स्थान0279','स्थान0280','स्थान0281','स्थान0282','स्थान0283','स्थान0284','स्थान0285','स्थान0286','स्थान0287','स्थान0288','स्थान0289','स्थान0290','स्थान0291','स्थान0292','स्थान0293','स्थान0294','स्थान0295','स्थान0296','स्थान0297','स्थान0298','स्थान0299','स्थान0300','स्थान0301','स्थान0302','स्थान0303','स्थान0304','स्थान0305','स्थान0306','स्थान0307','स्थान0308','स्थान0309','स्थान0310','स्थान0311','स्थान0312','स्थान0313','स्थान0314','स्थान0315','स्थान0316','स्थान0317','स्थान0318','स्थान0319','स्थान0320','स्थान0321','स्थान0322','स्थान0323','स्थान0324','स्थान0325','स्थान0326','स्थान0327','स्थान0328','स्थान0329','स्थान0330','स्थान0331','स्थान0332','स्थान0333','स्थान0334','स्थान0335','स्थान0336','स्थान0337','स्थान0338','स्थान0339','स्थान0340','स्थान0341','स्थान0342','स्थान0343','स्थान0344','स्थान0345','स्थान0346','स्थान0347','स्थान0348','स्थान0349','स्थान0350','स्थान0351','स्थान0352','स्थान0353','स्थान0354','स्थान0355','स्थान0356','स्थान0357','स्थान0358','स्थान0359','स्थान0360','स्थान0361','स्थान0362','स्थान0363','स्थान0364','स्थान0365','स्थान0366','स्थान0367','स्थान0368','स्थान0369','स्थान0370','स्थान0371','स्थान0372','स्थान0373','स्थान0374','स्थान0375','स्थान0376','स्थान0377','स्थान0378','स्थान0379','स्थान0380','स्थान0381','स्थान0382','स्थान0383','स्थान0384','स्थान0385','स्थान0386','स्थान0387','स्थान0388','स्थान0389','स्थान0390','स्थान0391','स्थान0392','स्थान0393','स्थान0394','स्थान0395','स्थान0396','स्थान0397','स्थान0398','स्थान0399','स्थान0400','स्थान0401','स्थान0402','स्थान0403','स्थान0404','स्थान0405','स्थान0406','स्थान0407','स्थान0408','स्थान0409','स्थान0410','स्थान0411','स्थान0412','स्थान0413','स्थान0414','स्थान0415','स्थान0416','स्थान0417','स्थान0418','स्थान0419','स्थान0420','स्थान0421','स्थान0422','स्थान0423','स्थान0424','स्थान0425','स्थान0426','स्थान0427','स्थान0428','स्थान0429','स्थान0430','स्थान0431','स्थान0432','स्थान0433','स्थान0434','स्थान0435','स्थान0436','स्थान0437','स्थान0438','स्थान0439','स्थान0440','स्थान0441','स्थान0442','स्थान0443','स्थान0444','स्थान0445','स्थान0446','स्थान0447','स्थान0448','स्थान0449','स्थान0450','स्थान0451','स्थान0452','स्थान0453','स्थान0454','स्थान0455','स्थान0456','स्थान0457','स्थान0458','स्थान0459','स्थान0460','स्थान0461','स्थान0462','स्थान0463','स्थान0464','स्थान0465','स्थान0466','स्थान0467','स्थान0468','स्थान0469','स्थान0470','स्थान0471','स्थान0472','स्थान0473','स्थान0474','स्थान0475','स्थान0476','स्थान0477','स्थान0478','स्थान0479','स्थान0480','स्थान0481','स्थान0482','स्थान0483','स्थान0484','स्थान0485','स्थान0486','स्थान0487','स्थान0488','स्थान0489','स्थान0490','स्थान0491','स्थान0492','स्थान0493','स्थान0494','स्थान0495','स्थान0496','स्थान0497','स्थान0498','स्थान0499','स्थान0500','स्थान0501','स्थान0502','स्थान0503','स्थान0504','स्थान0505','स्थान0506','स्थान0507','स्थान0508','स्थान0509','स्थान0510','स्थान0511','स्थान0512','स्थान0513','स्थान0514','स्थान0515','स्थान0516','स्थान0517','स्थान0518','स्थान0519','स्थान0520','स्थान0521','स्थान0522','स्थान0523','स्थान0524','स्थान0525','स्थान0526','स्थान0527','स्थान0528','स्थान0529','स्थान0530','स्थान0531','स्थान0532','स्थान0533','स्थान0534','स्थान0535','स्थान0536','स्थान0537','स्थान0538','स्थान0539','स्थान0540','स्थान0541','स्थान0542','स्थान0543','स्थान0544','स्थान0545','स्थान0546','स्थान0547','स्थान0548','स्थान0549','स्थान0550','स्थान0551','स्थान0552','स्थान0553','स्थान0554','स्थान0555','स्थान0556','स्थान0557','स्थान0558','स्थान0559','स्थान0560','स्थान0561','स्थान0562','स्थान0563','स्थान0564','स्थान0565','स्थान0566','स्थान0567','स्थान0568','स्थान0569','स्थान0570','स्थान0571','स्थान0572','स्थान0573','स्थान0574','स्थान0575','स्थान0576','स्थान0577','स्थान0578','स्थान0579','स्थान0580','स्थान0581','स्थान0582','स्थान0583','स्थान0584','स्थान0585','स्थान0586','स्थान0587','स्थान0588','स्थान0589','स्थान0590','स्थान0591','स्थान0592','स्थान0593','स्थान0594','स्थान0595','स्थान0596','स्थान0597','स्थान0598','स्थान0599','स्थान0600','स्थान0601','स्थान0602','स्थान0603','स्थान0604','स्थान0605','स्थान0606','स्थान0607','स्थान0608','स्थान0609','स्थान0610','स्थान0611','स्थान0612','स्थान0613','स्थान0614','स्थान0615','स्थान0616','स्थान0617','स्थान0618','स्थान0619','स्थान0620','स्थान0621','स्थान0622','स्थान0623','स्थान0624','स्थान0625','स्थान0626','स्थान0627','स्थान0628','स्थान0629','स्थान0630','स्थान0631','स्थान0632','स्थान0633','स्थान0634','स्थान0635','स्थान0636','स्थान0637','स्थान0638','स्थान0639','स्थान0640','स्थान0641','स्थान0642','स्थान0643','स्थान0644','स्थान0645','स्थान0646','स्थान0647','स्थान0648','स्थान0649','स्थान0650','स्थान0651','स्थान0652','स्थान0653','स्थान0654','स्थान0655','स्थान0656','स्थान0657','स्थान0658','स्थान0659','स्थान0660','स्थान0661','स्थान0662','स्थान0663','स्थान0664','स्थान0665','स्थान0666','स्थान0667','स्थान0668','स्थान0669','स्थान0670','स्थान0671','स्थान0672','स्थान0673','स्थान0674','स्थान0675','स्थान0676','स्थान0677','स्थान0678','स्थान0679','स्थान0680','स्थान0681','स्थान0682','स्थान0683','स्थान0684','स्थान0685','स्थान0686','स्थान0687','स्थान0688','स्थान0689','स्थान0690','स्थान0691','स्थान0692','स्थान0693','स्थान0694','स्थान0695','स्थान0696','स्थान0697','स्थान0698','स्थान0699','स्थान0700','स्थान0701','स्थान0702','स्थान0703','स्थान0704','स्थान0705','स्थान0706','स्थान0707','स्थान0708','स्थान0709','स्थान0710','स्थान0711','स्थान0712','स्थान0713','स्थान0714','स्थान0715','स्थान0716','स्थान0717','स्थान0718','स्थान0719','स्थान0720','स्थान0721','स्थान0722','स्थान0723','स्थान0724','स्थान0725','स्थान0726','स्थान0727','स्थान0728','स्थान0729','स्थान0730','स्थान0731','स्थान0732','स्थान0733','स्थान0734','स्थान0735','स्थान0736','स्थान0737','स्थान0738','स्थान0739','स्थान0740','स्थान0741','स्थान0742','स्थान0743','स्थान0744','स्थान0745','स्थान0746','स्थान0747','स्थान0748','स्थान0749','स्थान0750','स्थान0751','स्थान0752','स्थान0753','स्थान0754','स्थान0755','स्थान0756','स्थान0757','स्थान0758','स्थान0759','स्थान0760','स्थान0761','स्थान0762','स्थान0763','स्थान0764','स्थान0765','स्थान0766','स्थान0767','स्थान0768','स्थान0769','स्थान0770','स्थान0771','स्थान0772','स्थान0773','स्थान0774','स्थान0775','स्थान0776','स्थान0777','स्थान0778','स्थान0779','स्थान0780','स्थान0781','स्थान0782','स्थान0783','स्थान0784','स्थान0785','स्थान0786','स्थान0787','स्थान0788','स्थान0789','स्थान0790','स्थान0791','स्थान0792','स्थान0793','स्थान0794','स्थान0795','स्थान0796','स्थान0797','स्थान0798','स्थान0799','स्थान0800','स्थान0801','स्थान0802','स्थान0803','स्थान0804','स्थान0805','स्थान0806','स्थान0807','स्थान0808','स्थान0809','स्थान0810','स्थान0811','स्थान0812','स्थान0813','स्थान0814','स्थान0815','स्थान0816','स्थान0817','स्थान0818','स्थान0819','स्थान0820','स्थान0821','स्थान0822','स्थान0823','स्थान0824','स्थान0825','स्थान0826','स्थान0827','स्थान0828','स्थान0829','स्थान0830','स्थान0831','स्थान0832','स्थान0833','स्थान0834','स्थान0835','स्थान0836','स्थान0837','स्थान0838','स्थान0839','स्थान0840','स्थान0841','स्थान0842','स्थान0843','स्थान0844','स्थान0845','स्थान0846','स्थान0847','स्थान0848','स्थान0849','स्थान0850','स्थान0851','स्थान0852','स्थान0853','स्थान0854','स्थान0855','स्थान0856','स्थान0857','स्थान0858','स्थान0859','स्थान0860','स्थान0861','स्थान0862','स्थान0863','स्थान0864','स्थान0865','स्थान0866','स्थान0867','स्थान0868','स्थान0869','स्थान0870','स्थान0871','स्थान0872','स्थान0873','स्थान0874','स्थान0875','स्थान0876','स्थान0877','स्थान0878','स्थान0879','स्थान0880','स्थान0881','स्थान0882','स्थान0883','स्थान0884','स्थान0885','स्थान0886','स्थान0887','स्थान0888','स्थान0889','स्थान0890','स्थान0891','स्थान0892','स्थान0893','स्थान0894','स्थान0895','स्थान0896','स्थान0897','स्थान0898','स्थान0899','स्थान0900','स्थान0901','स्थान0902','स्थान0903','स्थान0904','स्थान0905','स्थान0906','स्थान0907','स्थान0908','स्थान0909','स्थान0910','स्थान0911','स्थान0912','स्थान0913','स्थान0914','स्थान0915','स्थान0916','स्थान0917','स्थान0918','स्थान0919','स्थान0920','स्थान0921','स्थान0922','स्थान0923','स्थान0924','स्थान0925','स्थान0926','स्थान0927','स्थान0928','स्थान0929','स्थान0930','स्थान0931','स्थान0932','स्थान0933','स्थान0934','स्थान0935','स्थान0936','स्थान0937','स्थान0938','स्थान0939','स्थान0940','स्थान0941','स्थान0942','स्थान0943','स्थान0944','स्थान0945','स्थान0946','स्थान0947','स्थान0948','स्थान0949','स्थान0950','स्थान0951','स्थान0952','स्थान0953','स्थान0954','स्थान0955','स्थान0956','स्थान0957','स्थान0958','स्थान0959','स्थान0960','स्थान0961','स्थान0962','स्थान0963','स्थान0964','स्थान0965','स्थान0966','स्थान0967','स्थान0968','स्थान0969','स्थान0970','स्थान0971','स्थान0972','स्थान0973','स्थान0974','स्थान0975','स्थान0976','स्थान0977','स्थान0978','स्थान0979','स्थान0980','स्थान0981','स्थान0982','स्थान0983','स्थान0984','स्थान0985','स्थान0986','स्थान0987','स्थान0988','स्थान0989','स्थान0990','स्थान0991','स्थान0992','स्थान0993','स्थान0994','स्थान0995','स्थान0996','स्थान0997','स्थान0998','स्थान0999','स्थान1000','स्थान1001','स्थान1002','स्थान1003','स्थान1004','स्थान1005','स्थान1006','स्थान1007','स्थान1008','स्थान1009','स्थान1010','स्थान1011','स्थान1012','स्थान1013','स्थान1014','स्थान1015','स्थान1016','स्थान1017','स्थान1018','स्थान1019','स्थान1020','स्थान1021','स्थान1022','स्थान1023','स्थान1024','स्थान1025','स्थान1026','स्थान1027','स्थान1028','स्थान1029','स्थान1030','स्थान1031','स्थान1032','स्थान1033','स्थान1034','स्थान1035','स्थान1036','स्थान1037','स्थान1038','स्थान1039','स्थान1040','स्थान1041','स्थान1042','स्थान1043','स्थान1044','स्थान1045','स्थान1046','स्थान1047','स्थान1048','स्थान1049','स्थान1050','स्थान1051','स्थान1052','स्थान1053','स्थान1054','स्थान1055','स्थान1056','स्थान1057','स्थान1058','स्थान1059','स्थान1060','स्थान1061','स्थान1062','स्थान1063','स्थान1064','स्थान1065','स्थान1066','स्थान1067','स्थान1068','स्थान1069','स्थान1070','स्थान1071','स्थान1072','स्थान1073','स्थान1074','स्थान1075','स्थान1076','स्थान1077','स्थान1078','स्थान1079','स्थान1080','स्थान1081','स्थान1082','स्थान1083','स्थान1084','स्थान1085','स्थान1086','स्थान1087','स्थान1088','स्थान1089','स्थान1090','स्थान1091','स्थान1092','स्थान1093','स्थान1094','स्थान1095','स्थान1096','स्थान1097','स्थान1098','स्थान1099','स्थान1100','स्थान1101','स्थान1102','स्थान1103','स्थान1104','स्थान1105','स्थान1106','स्थान1107','स्थान1108','स्थान1109','स्थान1110','स्थान1111','स्थान1112','स्थान1113','स्थान1114','स्थान1115','स्थान1116','स्थान1117','स्थान1118','स्थान1119','स्थान1120','स्थान1121','स्थान1122','स्थान1123','स्थान1124','स्थान1125','स्थान1126','स्थान1127','स्थान1128','स्थान1129','स्थान1130','स्थान1131','स्थान1132','स्थान1133','स्थान1134','स्थान1135','स्थान1136','स्थान1137','स्थान1138','स्थान1139','स्थान1140','स्थान1141','स्थान1142','स्थान1143','स्थान1144','स्थान1145','स्थान1146','स्थान1147','स्थान1148','स्थान1149','स्थान1150','स्थान1151','स्थान1152','स्थान1153','स्थान1154','स्थान1155','स्थान1156','स्थान1157','स्थान1158','स्थान1159','स्थान1160','स्थान1161','स्थान1162','स्थान1163','स्थान1164','स्थान1165','स्थान1166','स्थान1167','स्थान1168','स्थान1169','स्थान1170','स्थान1171','स्थान1172','स्थान1173','स्थान1174','स्थान1175','स्थान1176','स्थान1177','स्थान1178','स्थान1179','स्थान1180','स्थान1181','स्थान1182','स्थान1183','स्थान1184','स्थान1185','स्थान1186','स्थान1187','स्थान1188','स्थान1189','स्थान1190','स्थान1191','स्थान1192','स्थान1193','स्थान1194','स्थान1195','स्थान1196','स्थान1197','स्थान1198','स्थान1199','स्थान1200','स्थान1201','स्थान1202','स्थान1203','स्थान1204','स्थान1205','स्थान1206','स्थान1207','स्थान1208','स्थान1209','स्थान1210','स्थान1211','स्थान1212','स्थान1213','स्थान1214','स्थान1215','स्थान1216','स्थान1217','स्थान1218','स्थान1219','स्थान1220','स्थान1221','स्थान1222','स्थान1223','स्थान1224','स्थान1225','स्थान1226','स्थान1227','स्थान1228','स्थान1229','स्थान1230','स्थान1231','स्थान1232','स्थान1233','स्थान1234','स्थान1235','स्थान1236','स्थान1237','स्थान1238','स्थान1239','स्थान1240','स्थान1241','स्थान1242','स्थान1243','स्थान1244','स्थान1245','स्थान1246','स्थान1247','स्थान1248','स्थान1249','स्थान1250','स्थान1251','स्थान1252','स्थान1253','स्थान1254','स्थान1255','स्थान1256','स्थान1257','स्थान1258','स्थान1259','स्थान1260','स्थान1261','स्थान1262','स्थान1263','स्थान1264','स्थान1265','स्थान1266','स्थान1267','स्थान1268','स्थान1269','स्थान1270','स्थान1271','स्थान1272','स्थान1273','स्थान1274','स्थान1275','स्थान1276','स्थान1277','स्थान1278','स्थान1279','स्थान1280','स्थान1281','स्थान1282','स्थान1283','स्थान1284','स्थान1285','स्थान1286','स्थान1287','स्थान1288','स्थान1289','स्थान1290','स्थान1291','स्थान1292','स्थान1293','स्थान1294','स्थान1295','स्थान1296','स्थान1297','स्थान1298','स्थान1299','स्थान1300','स्थान1301','स्थान1302','स्थान1303','स्थान1304','स्थान1305','स्थान1306','स्थान1307','स्थान1308','स्थान1309','स्थान1310','स्थान1311','स्थान1312','स्थान1313','स्थान1314','स्थान1315','स्थान1316','स्थान1317','स्थान1318','स्थान1319','स्थान1320','स्थान1321','स्थान1322','स्थान1323','स्थान1324','स्थान1325','स्थान1326','स्थान1327','स्थान1328','स्थान1329','स्थान1330','स्थान1331','स्थान1332','स्थान1333','स्थान1334','स्थान1335','स्थान1336','स्थान1337','स्थान1338','स्थान1339','स्थान1340','स्थान1341','स्थान1342','स्थान1343','स्थान1344','स्थान1345','स्थान1346','स्थान1347','स्थान1348','स्थान1349','स्थान1350','स्थान1351','स्थान1352','स्थान1353','स्थान1354','स्थान1355','स्थान1356','स्थान1357','स्थान1358','स्थान1359','स्थान1360','स्थान1361','स्थान1362','स्थान1363','स्थान1364','स्थान1365','स्थान1366','स्थान1367','स्थान1368','स्थान1369','स्थान1370','स्थान1371','स्थान1372','स्थान1373','स्थान1374','स्थान1375','स्थान1376','स्थान1377','स्थान1378','स्थान1379','स्थान1380','स्थान1381','स्थान1382','स्थान1383','स्थान1384','स्थान1385','स्थान1386','स्थान1387','स्थान1388','स्थान1389','स्थान1390','स्थान1391','स्थान1392','स्थान1393','स्थान1394','स्थान1395','स्थान1396','स्थान1397','स्थान1398','स्थान1399','स्थान1400','स्थान1401','स्थान1402','स्थान1403','स्थान1404','स्थान1405','स्थान1406','स्थान1407','स्थान1408','स्थान1409','स्थान1410','स्थान1411','स्थान1412','स्थान1413','स्थान1414','स्थान1415','स्थान1416','स्थान1417','स्थान1418','स्थान1419','स्थान1420','स्थान1421','स्थान1422','स्थान1423','स्थान1424','स्थान1425','स्थान1426','स्थान1427','स्थान1428','स्थान1429','स्थान1430','स्थान1431','स्थान1432','स्थान1433','स्थान1434','स्थान1435','स्थान1436','स्थान1437','स्थान1438','स्थान1439','स्थान1440','स्थान1441','स्थान1442','स्थान1443','स्थान1444','स्थान1445','स्थान1446','स्थान1447','स्थान1448','स्थान1449','स्थान1450','स्थान1451','स्थान1452','स्थान1453','स्थान1454','स्थान1455','स्थान1456','स्थान1457','स्थान1458','स्थान1459','स्थान1460','स्थान1461','स्थान1462','स्थान1463','स्थान1464','स्थान1465','स्थान1466','स्थान1467','स्थान1468','स्थान1469','स्थान1470','स्थान1471','स्थान1472','स्थान1473','स्थान1474','स्थान1475','स्थान1476','स्थान1477','स्थान1478','स्थान1479','स्थान1480','स्थान1481','स्थान1482','स्थान1483','स्थान1484','स्थान1485','स्थान1486','स्थान1487','स्थान1488','स्थान1489','स्थान1490','स्थान1491','स्थान1492','स्थान1493','स्थान1494','स्थान1495','स्थान1496','स्थान1497','स्थान1498','स्थान1499','स्थान1500','स्थान1501','स्थान1502','स्थान1503','स्थान1504','स्थान1505','स्थान1506','स्थान1507','स्थान1508','स्थान1509','स्थान1510','स्थान1511','स्थान1512','स्थान1513','स्थान1514','स्थान1515','स्थान1516','स्थान1517','स्थान1518','स्थान1519','स्थान1520','स्थान1521','स्थान1522','स्थान1523','स्थान1524','स्थान1525','स्थान1526','स्थान1527','स्थान1528','स्थान1529','स्थान1530','स्थान1531','स्थान1532','स्थान1533','स्थान1534','स्थान1535','स्थान1536','स्थान1537','स्थान1538','स्थान1539','स्थान1540','स्थान1541','स्थान1542','स्थान1543','स्थान1544','स्थान1545','स्थान1546','स्थान1547','स्थान1548','स्थान1549','स्थान1550','स्थान1551','स्थान1552','स्थान1553','स्थान1554','स्थान1555','स्थान1556','स्थान1557','स्थान1558','स्थान1559','स्थान1560','स्थान1561','स्थान1562','स्थान1563','स्थान1564','स्थान1565','स्थान1566','स्थान1567','स्थान1568','स्थान1569','स्थान1570','स्थान1571','स्थान1572','स्थान1573','स्थान1574','स्थान1575','स्थान1576','स्थान1577','स्थान1578','स्थान1579','स्थान1580','स्थान1581','स्थान1582','स्थान1583','स्थान1584','स्थान1585','स्थान1586','स्थान1587','स्थान1588','स्थान1589','स्थान1590','स्थान1591','स्थान1592','स्थान1593','स्थान1594','स्थान1595','स्थान1596','स्थान1597','स्थान1598','स्थान1599','स्थान1600','स्थान1601','स्थान1602','स्थान1603','स्थान1604','स्थान1605','स्थान1606','स्थान1607','स्थान1608','स्थान1609','स्थान1610','स्थान1611','स्थान1612','स्थान1613','स्थान1614','स्थान1615','स्थान1616','स्थान1617','स्थान1618','स्थान1619','स्थान1620','स्थान1621','स्थान1622','स्थान1623','स्थान1624','स्थान1625','स्थान1626','स्थान1627','स्थान1628','स्थान1629','स्थान1630','स्थान1631','स्थान1632','स्थान1633','स्थान1634','स्थान1635','स्थान1636','स्थान1637','स्थान1638','स्थान1639','स्थान1640','स्थान1641','स्थान1642','स्थान1643','स्थान1644','स्थान1645','स्थान1646','स्थान1647','स्थान1648','स्थान1649','स्थान1650','स्थान1651','स्थान1652','स्थान1653','स्थान1654','स्थान1655','स्थान1656','स्थान1657','स्थान1658','स्थान1659','स्थान1660','स्थान1661','स्थान1662','स्थान1663','स्थान1664','स्थान1665','स्थान1666','स्थान1667','स्थान1668','स्थान1669','स्थान1670','स्थान1671','स्थान1672','स्थान1673','स्थान1674','स्थान1675','स्थान1676','स्थान1677','स्थान1678','स्थान1679','स्थान1680','स्थान1681','स्थान1682','स्थान1683','स्थान1684','स्थान1685','स्थान1686','स्थान1687','स्थान1688','स्थान1689','स्थान1690','स्थान1691','स्थान1692','स्थान1693','स्थान1694','स्थान1695','स्थान1696','स्थान1697','स्थान1698','स्थान1699','स्थान1700','स्थान1701','स्थान1702','स्थान1703','स्थान1704','स्थान1705','स्थान1706','स्थान1707','स्थान1708','स्थान1709','स्थान1710','स्थान1711','स्थान1712','स्थान1713','स्थान1714','स्थान1715','स्थान1716','स्थान1717','स्थान1718','स्थान1719','स्थान1720','स्थान1721','स्थान1722','स्थान1723','स्थान1724','स्थान1725','स्थान1726','स्थान1727','स्थान1728','स्थान1729','स्थान1730','स्थान1731','स्थान1732','स्थान1733','स्थान1734','स्थान1735','स्थान1736','स्थान1737','स्थान1738','स्थान1739','स्थान1740','स्थान1741','स्थान1742','स्थान1743','स्थान1744','स्थान1745','स्थान1746','स्थान1747','स्थान1748','स्थान1749','स्थान1750','स्थान1751','स्थान1752','स्थान1753','स्थान1754','स्थान1755','स्थान1756','स्थान1757','स्थान1758','स्थान1759','स्थान1760','स्थान1761','स्थान1762','स्थान1763','स्थान1764','स्थान1765','स्थान1766','स्थान1767','स्थान1768','स्थान1769','स्थान1770','स्थान1771','स्थान1772','स्थान1773','स्थान1774','स्थान1775','स्थान1776','स्थान1777','स्थान1778','स्थान1779','स्थान1780','स्थान1781','स्थान1782','स्थान1783','स्थान1784','स्थान1785','स्थान1786','स्थान1787','स्थान1788','स्थान1789','स्थान1790','स्थान1791','स्थान1792','स्थान1793','स्थान1794','स्थान1795','स्थान1796','स्थान1797','स्थान1798','स्थान1799','स्थान1800','स्थान1801','स्थान1802','स्थान1803','स्थान1804','स्थान1805','स्थान1806','स्थान1807','स्थान1808','स्थान1809','स्थान1810','स्थान1811','स्थान1812','स्थान1813','स्थान1814','स्थान1815','स्थान1816','स्थान1817','स्थान1818','स्थान1819','स्थान1820','स्थान1821','स्थान1822','स्थान1823','स्थान1824','स्थान1825','स्थान1826','स्थान1827','स्थान1828','स्थान1829','स्थान1830','स्थान1831','स्थान1832','स्थान1833','स्थान1834','स्थान1835','स्थान1836','स्थान1837','स्थान1838','स्थान1839','स्थान1840','स्थान1841','स्थान1842','स्थान1843','स्थान1844','स्थान1845','स्थान1846','स्थान1847','स्थान1848','स्थान1849','स्थान1850','स्थान1851','स्थान1852','स्थान1853','स्थान1854','स्थान1855','स्थान1856','स्थान1857','स्थान1858','स्थान1859','स्थान1860','स्थान1861','स्थान1862','स्थान1863','स्थान1864','स्थान1865','स्थान1866','स्थान1867','स्थान1868','स्थान1869','स्थान1870','स्थान1871','स्थान1872','स्थान1873','स्थान1874','स्थान1875','स्थान1876','स्थान1877','स्थान1878','स्थान1879','स्थान1880','स्थान1881','स्थान1882','स्थान1883','स्थान1884','स्थान1885','स्थान1886','स्थान1887','स्थान1888','स्थान1889','स्थान1890','स्थान1891','स्थान1892','स्थान1893','स्थान1894','स्थान1895','स्थान1896','स्थान1897','स्थान1898','स्थान1899','स्थान1900','स्थान1901','स्थान1902','स्थान1903','स्थान1904','स्थान1905','स्थान1906','स्थान1907','स्थान1908','स्थान1909','स्थान1910','स्थान1911','स्थान1912','स्थान1913','स्थान1914','स्थान1915','स्थान1916','स्थान1917','स्थान1918','स्थान1919','स्थान1920','स्थान1921','स्थान1922','स्थान1923','स्थान1924','स्थान1925','स्थान1926','स्थान1927','स्थान1928','स्थान1929','स्थान1930','स्थान1931','स्थान1932','स्थान1933','स्थान1934','स्थान1935','स्थान1936','स्थान1937','स्थान1938','स्थान1939','स्थान1940','स्थान1941','स्थान1942','स्थान1943','स्थान1944','स्थान1945','स्थान1946','स्थान1947','स्थान1948','स्थान1949','स्थान1950','स्थान1951','स्थान1952','स्थान1953','स्थान1954','स्थान1955','स्थान1956','स्थान1957','स्थान1958','स्थान1959','स्थान1960','स्थान1961','स्थान1962','स्थान1963','स्थान1964','स्थान1965','स्थान1966','स्थान1967','स्थान1968','स्थान1969','स्थान1970','स्थान1971','स्थान1972','स्थान1973','स्थान1974','स्थान1975','स्थान1976','स्थान1977','स्थान1978','स्थान1979','स्थान1980','स्थान1981','स्थान1982','स्थान1983','स्थान1984','स्थान1985','स्थान1986','स्थान1987','स्थान1988','स्थान1989','स्थान1990','स्थान1991','स्थान1992','स्थान1993','स्थान1994','स्थान1995','स्थान1996','स्थान1997','स्थान1998','स्थान1999','स्थान2000','स्थान2001','स्थान2002','स्थान2003','स्थान2004','स्थान2005','स्थान2006','स्थान2007','स्थान2008','स्थान2009','स्थान2010','स्थान2011','स्थान2012','स्थान2013','स्थान2014','स्थान2015','स्थान2016','स्थान2017','स्थान2018','स्थान2019','स्थान2020','स्थान2021','स्थान2022','स्थान2023','स्थान2024','स्थान2025','स्थान2026','स्थान2027','स्थान2028','स्थान2029','स्थान2030','स्थान2031','स्थान2032','स्थान2033','स्थान2034','स्थान2035','स्थान2036','स्थान2037','स्थान2038','स्थान2039','स्थान2040','स्थान2041','स्थान2042','स्थान2043','स्थान2044','स्थान2045','स्थान2046','स्थान2047','स्थान2048'],
  de:['柏林','汉堡','慕尼黑','科隆','法兰克福','斯图加特','杜塞尔多夫','多特蒙德','埃森','莱比锡','不来梅','德累斯顿','汉诺威','纽伦堡','杜伊斯堡','波鸿','乌珀塔尔','比勒费尔德','波恩','明斯特','卡尔斯鲁厄','曼海姆','奥格斯堡','维斯巴登','盖尔森基兴','亚琛','布伦瑞克','基尔','克雷费尔德','哈雷','马格德堡','弗莱堡','奥伯豪森','吕贝克','埃尔福特','罗斯托克','卡塞尔','海尔布隆','美因茨','达姆施塔特','哈根','萨尔布吕肯','哈姆','莱姆戈','科特布斯','施韦林','赖因斯贝格','奥斯纳布吕克','苏灵根','雷根斯堡','莫尔海姆','索林根','莱顿施泰特','莱克林豪森','海德堡','波茨坦','波尔茨','福斯特','普福尔茨海姆','乌尔姆','英格尔施塔特','法尔肯泽','雷姆沙伊德','希勒斯海姆','格赖夫斯瓦尔德','格丁根','帕绍','班贝格','巴特洪堡','埃尔朗根','菲尔特','拜罗伊特','朗根','符兹堡','科布伦茨','特里尔','波茨','凯泽斯劳滕','路德维希港','特罗斯多夫','卡门','盖尔森','劳彻特','诺伊斯','魏尔海姆','维也纳','格拉茨','林茨','萨尔茨堡','因斯布鲁克','克拉根福','维拉赫','韦尔斯','圣珀尔滕','达努比茨','卢恩','菲拉赫','施泰尔','锡泰','费尔德基希','布雷根茨','莱奥本','特劳恩','安斯菲尔登','卡普芬贝格','苏黎世','巴塞尔','伯尔尼','圣加仑','卢塞恩','温特图尔','沙夫豪森','弗劳恩费尔德','阿劳','巴登','施韦茨','楚格','阿彭策尔','格拉鲁斯','奥尔滕','比尔','索洛图恩','利斯塔尔','锡昂','施皮茨','罗腾堡','魏玛','吕讷堡','维登','维滕贝格','戈斯拉尔','施特拉尔松德','弗里茨拉尔','格斯拉尔','拉蒂博尔','施特廷','科尼希斯堡','但泽','布雷斯劳','梅明根','拜伊雷特','兰茨胡特','安斯巴赫','施瓦巴赫','魏森堡','丁克尔斯比尔','诺德林根','艾希施泰特','根特','巴萨尔','Ashkāsham','Fayzabad','Jurm','Khandūd','Rāghistān','Wākhān','Ghormach','Qala i Naw','Baghlān','Nahrīn','Pul-e Khumrī','Balkh','Dowlatābād','Khulm','Lab-Sar','Mazār-e Sharīf','Qarchī Gak','Bāmyān','Panjāb','Nīlī','Farah','Andkhoy','Maymana','Ghazni','Fayrōz Kōh','Shahrak','‘Alāqahdārī Dīshū','Gereshk','Lashkar Gāh','Sangīn','Chahār Burj','Ghōriyān','Herāt','Kafir Qala','Karukh','Kuhsān','Kushk','Qarah Bāgh','Shīnḏanḏ','Tīr Pul','Zindah Jān','Āqchah','Darzāb','Qarqīn','Shibirghān','Kabul','Mīr Bachah Kōṯ','Paghmān','Kandahār','Sidqābād','Khōst','Asadabad','Āsmār','Dasht-e Archī','Imām Şāḩib','Khanabad','Kunduz','Qarāwul','Mehtar Lām','Baraki Barak','Ḩukūmatī Azrah','Pul-e ‘Alam','Bāsawul','Jalālābād','Khāsh','Mīrābād','Rūdbār','Zaranj','Pārūn','Gardez','Saṟōbī','Zaṟah Sharan','Zarghūn Shahr','Bāzārak','Charikar','Jabal os Saraj','Aībak','Chīras','Larkird','Qal‘ah-ye Shahr','Sang-e Chārak','Sar-e Pul','Tagāw-Bāy','Tukzār','Ārt Khwājah','Taloqan','Tarinkot','Uruzgān','Chaki Wardak','Day Mirdad','Hisa-i-Awali Bihsud','Jaghatu','Jalrez','Maidan Shahr','Markaz-i-Bihsud','Nerkh','Sayed Abad','Qalāt','Bomarsund','Finström','Godby','Hammarland','Jomala','Lemland','Saltvik','Sund','Tjudö','Yomala','Ytterby','Mariehamn','Banaj','Bashkia Berat','Bashkia Kuçovë','Bashkia Poliçan','Bashkia Skrapar','Berat','Çorovodë','Kuçovë','Poliçan','Rrethi i Beratit','Rrethi i Kuçovës','Rrethi i Skraparit','Skrapar','Ura Vajgurore','Bashkia Bulqizë','Bashkia Klos','Bashkia Mat','Bulqizë','Burrel','Dibër','Klos','Mat','Peshkopi','Rrethi i Bulqizës','Rrethi i Dibrës','Rrethi i Matit','Ulëz','Bashkia Durrës','Bashkia Krujë','Bashkia Shijak','Durrës','Durrës District','Fushë-Krujë','Krujë','Rrethi i Krujës','Shijak','Sukth','Gramsh','Librazhd','Peqin','Ballsh','Bashkia Divjakë','Bashkia Fier','Bashkia Mallakastër','Bashkia Patos','Divjakë','Fier','Fier-Çifçi','Lushnjë','Mallakastër','Patos','Patos Fshat','Roskovec','Bashkia Kelcyrë','Bashkia Libohovë','Bashkia Memaliaj','Bashkia Përmet','Bashkia Tepelenë','Dropull','Gjinkar','Gjirokastër','Këlcyrë','Lazarat','Libohovë','Memaliaj','Përmet','Tepelenë','Bashkia Devoll','Bashkia Kolonjë','Bashkia Maliq','Bilisht','Devoll','Ersekë','Kolonjë','Korçë','Leskovik','Libonik','Maliq','Mborje','Pogradec','Pustec','Rrethi i Devollit','Rrethi i Kolonjës','Velçan','Voskopojë','Bajram Curri','Krumë','Kukës','Rrethi i Hasit','Rrethi i Kukësit','Tropojë','Bashkia Kurbin','Bashkia Lezhë','Bashkia Mirditë','Kurbin','Kurbnesh','Laç','Lezhë','Mamurras','Milot','Mirditë','Rrëshen','Rrethi i Kurbinit','Rubik','Shëngjin','Bashkia Pukë','Bashkia Vau i Dejës','Fushë-Arrëz','Koplik','Malësi e Madhe','Pukë','Rrethi i Shkodrës','Shkodër','Vau i Dejës','Vukatanë','Bashkia Kavajë','Bashkia Vorë','Kamëz','Kavajë','Krrabë','Rrethi i Kavajës','Rrethi i Tiranës','Rrogozhinë','Sinaballaj','Tirana','Vorë','Bashkia Himarë','Bashkia Konispol','Bashkia Selenicë','Bashkia Vlorë','Delvinë','Finiq','Himarë','Konispol','Ksamil','Orikum','Rrethi i Delvinës','Sarandë','Selenicë','Vlorë','Adrar','Aoulef','Reggane','Timimoun','Aïn Defla','El Abadia','El Attaf','Khemis Miliana','Theniet el Had','Aïn Temouchent','Beni Saf','El Amria','El Malah','Hammam Bou Hadjar','Aïn Taya','Algiers','Bab Ezzouar','Birkhadem','Bordj el Kiffan','Dar el Beïda','Rouiba','Annaba','Berrahal','Drean','El Hadjar','Aïn Touta','Arris','Barika','Batna','Boumagueur','Merouana','Râs el Aïoun','Tazoult-Lambese','Béchar','Akbou','Amizour','Barbacha','Bejaïa','el hed','El Kseur','Feraoun','Seddouk','Biskra','Oumache','Sidi Khaled','Sidi Okba','Tolga','Zeribet el Oued','Beni Mered','Blida','Boû Arfa','Boufarik','Bougara','Bouinan','Chebli','Chiffa','Larbaâ','Meftah','Sidi Moussa','Souma','Bordj Bou Arreridj','Bordj Ghdir','Bordj Zemoura','El Achir','Mansourah','Melouza','Râs el Oued','Aïn Bessem','Bouïra','Chorfa','Draa el Mizan','Lakhdaria','Sour el Ghozlane','Arbatache','Beni Amrane','Boudouaou','Boumerdas','Chabet el Ameur','Dellys','Khemis el Khechna','Makouda','Naciria','Ouled Moussa','Reghaïa','Tadmaït','Thenia','Tizi Gheniff','Abou el Hassan','Boukadir','Chlef','Ech Chettia','Oued Fodda','Oued Sly','Sidi Akkacha','’Aïn Abid','Aïn Smara','Constantine','Didouche Mourad','El Khroub','Hamma Bouziane','’Aïn el Bell','Aïn Oussera','Birine','Charef','Dar Chioukh','Djelfa','El Idrissia','Messaad','Brezina','El Bayadh','Debila','El Oued','Reguiba','Robbah','Ben Mehidi','Besbes','El Kala','El Tarf','Berriane','Ghardaïa','Metlili Chaamba','Boumahra Ahmed','Guelma','Héliopolis','Illizi','Jijel','Khenchela','Aflou','Laghouat','‘Aïn el Hadjel','’Aïn el Melh','M’Sila','Sidi Aïssa','Mascara','Oued el Abtal','Sig','’Aïn Boucif','Berrouaghia','Ksar el Boukhari','Médéa','Chelghoum el Aïd','Mila','Rouached','Sidi Mérouane','Telerghma','Mostaganem','Aïn Sefra','Naama','’Aïn el Turk','Aïn el Bya','Bir el Djir','Bou Tlelis','Es Senia','Mers el Kebir','Oran','Sidi ech Chahmi','Djamaa','El Hadjira','Hassi Messaoud','Megarine','Ouargla','Rouissat','Sidi Amrane','Tebesbest','Touggourt','Aïn Beïda','Aïn Fakroun','Aïn Kercha','El Aouinet','Meskiana','Oum el Bouaghi','’Aïn Merane','Ammi Moussa','Djidiouia','Mazouna','Oued Rhiou','Relizane','Smala','Zemoura','’Aïn el Hadjar','Saïda','Aïn Arnat','Babor - Ville','Bougaa','El Eulma','Salah Bey','Sétif','Aïn El Berd','Balidat Ameur','Belarbi','El Bour','Haoud El Hamra','Lamtar','Marhoum','Merine','Mezaourou','Moggar','Moulay Slissen','N\'Goussa','Sfissef','Sidi Ali Boussidi','Sidi Bel Abbès','Sidi Brahim','Sidi Hamadouche','Sidi Slimane','Sidi Yacoub','Sidi Yahia','Tabia Sid Bel Abbés','Taibet','Tamellaht','Tamerna Djedida','Teghalimet','Telagh','Tenezara','Tenira','Tessala','Zerouala','Azzaba','Karkira','Skikda','Tamalous','Sedrata','Souk Ahras','I-n-Salah','Tamanrasset','Bir el Ater','Cheria','Hammamet','Tébessa','’Aïn Deheb','Djebilet Rosfa','Frenda','Ksar Chellala','Sougueur','Tiaret','Tindouf','’Aïn Benian','Baraki','Bou Ismaïl','Cheraga','Douera','El Affroun','Hadjout','Kolea','Mouzaïa','Oued el Alleug','Saoula','Tipasa','Zeralda','Lardjem','Tissemsilt','’Aïn el Hammam','Arhribs','Azazga','Beni Douala','Boghni','Boudjima','Chemini','Draa Ben Khedda','Freha','Ighram','L’Arbaa Naït Irathen','Mekla','Timizart','Tirmitine','Tizi Ouzou','Tizi Rached','Tizi-n-Tleta','Beni Mester','Bensekrane','Chetouane','Hennaya','Mansoûra','Nedroma','Ouled Mimoun','Remchi','Sebdou','Sidi Abdelli','Tlemcen','Ituʻau','Maʻoputasi','Saʻole','Sua','Vaifanua','Faleasao','Fitiuta','Ofu','Olosega','Tau','Lealataua','Leasina','Tualatai','Tualauta','Andorra la Vella','Canillo','El Tarter','Encamp','Pas de la Casa','les Escaldes','Arinsal','la Massana','Ordino','Sant Julià de Lòria','Ambriz','Bula Atumba','Caxito','Dande','Muxima','Nambuangongo','Pango Aluquém','Úcua','Baía Farta','Balombo','Benguela','Bocoio','Caimbambo','Catumbela','Chongoroi','Cubal','Ganda','Lobito','Sumbe','Camacupa','Catabola','Chissamba','Cuito','Cabinda','Menongue','Quibala','Uacu Cungo','Camabatela','N’dalatando','Ondjiva','Caála','Chela','Huambo','Longonjo','Caconda','Caluquembe','Chibia','Chicomba','Chipindo','Cuvango','Gambos','Humpata','Jamba','Lubango','Matala','Quilengues','Quipungo','Belas','Cacuaco','Cazenga','Icolo e Bengo','Luanda','Talatona','Viana','Lucapa','Cazaji','Saurimo','Malanje','Léua','Luau','Luena','Lumeje','Bibala','Camucuio','Namibe','Tombua','Virei','Uíge','Mbanza Congo','N\'zeto','Soio','Codrington','Piggotts','Potters Village','Saint John’s','Bolands','Falmouth','Liberta','All Saints','Parham','Agronomía','Almagro','Balvanera','Barracas','Belgrano','Boedo','Caballito','Chacarita','Coghlan','Colegiales','Constitución','Flores','Floresta','La Boca','La Paternal','Liniers','Mataderos','Monserrat','Monte Castro','Nueva Pompeya','Núñez','Palermo','Parque Avellaneda','Parque Chacabuco','Parque Chas','Parque Patricios','Puerto Madero','Recoleta','Retiro','Saavedra','San Cristóbal','San Nicolás','San Telmo','Vélez Sársfield','Versalles','Villa Crespo','Villa del Parque','Villa Devoto','Villa General Mitre','Villa Lugano','Villa Luro','Villa Ortúzar','Villa Pueyrredón','Villa Real','Villa Riachuelo','Villa Santa Rita','Villa Soldati','Villa Urquiza','Adolfo Alsina','Alberti','Almirante Brown','Arrecifes','Avellaneda','Ayacucho','Azul','Bahía Blanca','Balcarce','Baradero','Benito Juárez','Berazategui','Berisso','Bolívar','Bragado','Brandsen','Campana','Cañuelas','Capitán Sarmiento','Carlos Casares','Carlos Tejedor','Carmen de Areco','Castelli','Chacabuco','Chascomús','Chivilcoy','Colón','Coronel Dorrego','Coronel Pringles','Coronel Rosales','Coronel Suárez','Daireaux','Dolores','Ensenada','Escobar','Esteban Echeverríar','Ezeiza','Florencio Varela','Florentino Ameghino','General Alvarado','General Alvear','General Arenales','General Belgrano','General Guido','General La Madrid','General Las Heras','General Lavalle','General Madariaga','General Paz','General Pinto','General Pueyrredón','General Rodríguez','General San Martín','General Viamonte','General Villegas','Guaminí','Hipólito Yrigoyen','Hurlingham','Ituzaingó','José C. Paz','Junín','La Costa','La Matanza','La Plata','Lanús','Laprida','Las Flores','Leandro N. Alem','Lezama','Lincoln','Lobería','Lobos','Lomas de Zamora','Luján','Magdalena','Maipú','Malvinas Argentinas','Mar Chiquita','Marcos Paz','Mercedes','Merlo','Monte','Monte Hermoso','Moreno','Morón','Navarro','Necochea','Nueve de Julio','Olavarría','Patagones','Pehuajó','Pellegrini','Pergamino','Pila','Pilar','Pinamar','Presidente Perón','Puan','Punta Indio','Quilmes','Ramallo','Rauch','Rivadavia','Rojas','Roque Pérez','Saladillo','Salliqueló','Salto','San Andrés de Giles','San Antonio de Areco','San Cayetano','San Fernando','San Isidro','San Miguel','San Pedro','San Vicente','Suipacha','Tandil','Tapalqué','Tigre','Tordillo','Tornquist','Trenque Lauquen','Tres Arroyos','Tres de Febrero','Tres Lomas','Veinticinco de Mayo','Vicente López','Villa Gesell','Villarino','Zárate','Ancasti','Andalgalá','Capayán','El Rodeo','Fiambalá','Hualfín','Huillapima','Icaño','Londres','Los Altos','Los Varela','Mutquín','Pomán','Recreo','San Antonio','Santa María','Tinogasta','Aviá Terai','Barranqueras','Basail','Campo Largo','Capitán Solari','Charadai','Charata','Chorotis','Ciervo Petiso','Colonia Benítez','Colonia Elisa','Colonias Unidas','Coronel Du Graty','Corzuela','Coté-Lai','Fontana','Gancedo','General Pinedo','General Vedia','Hermoso Campo','La Clotilde','La Eduvigis','La Escondida','La Leonesa','La Tigra','La Verde','Laguna Limpia','Lapachito','Las Breñas','Las Garcitas','Los Frentones','Machagai','Makallé','Margarita Belén','Napenay','Pampa Almirón','Pampa del Indio','Pampa del Infierno','Presidencia Roca','Puerto Bermejo','Puerto Tirol','Puerto Vilelas','Quitilipi','Resistencia','Samuhú','San Bernardo','Santa Sylvina','Taco Pozo','Tres Isletas','Villa Ángela','Villa Berthet','Alto Río Senguer','Camarones','Comodoro Rivadavia','Dolavón','El Maitén','Esquel','Gaimán','Gastre','Gobernador Costa','Hoyo de Epuyén','José de San Martín','Lago Puelo','Las Plumas','Puerto Madryn','Rada Tilly','Rawson','Río Mayo','Río Pico','Sarmiento','Tecka','Trelew','Trevelin','Achiras','Adelia María','Agua de Oro','Alejandro Roca','Alejo Ledesma','Almafuerte','Alta Gracia','Altos de Chipión','Arias','Arroyito','Arroyo Cabral','Balnearia','Bell Ville','Berrotarán','Brinkmann','Buchardo','Camilo Aldao','Cañada de Luque','Canals','Capilla del Monte','Carnerillo','Carrilobo','Cavanagh','Charras','Chazón','Cintra','Colonia La Tordilla','Córdoba','Coronel Baigorria','Coronel Moldes','Corral de Bustos','Corralito','Cosquín','Costa Sacate','Cruz Alta','Cruz del Eje','Cuesta Blanca','Deán Funes','Del Campillo','Despeñaderos','Devoto','El Arañado','El Tío','Elena','Embalse','Etruria','General Baldissera','General Cabrera','General Levalle','General Roca','Guatimozín','Hernando','Huanchillas','Huerta Grande','Huinca Renancó','Idiazábal','Inriville','Isla Verde','Italó','James Craik','Jesús María','Justiniano Posse','La Calera','La Carlota','La Cesira','La Cumbre','La Falda','La Francia','La Granja','La Para','La Playosa','Laborde','Laboulaye','Laguna Larga','Las Acequias','Las Higueras','Las Junturas','Las Perdices','Las Varas','Las Varillas','Leones','Los Cocos','Los Cóndores','Los Surgentes','Malagueño','Marcos Juárez','Marull','Mattaldi','Mendiolaza','Mina Clavero','Miramar','Monte Buey','Monte Cristo','Monte Maíz','Morrison','Morteros','Noetinger','Obispo Trejo','Oliva','Oncativo','Ordóñez','Pascanas','Pasco','Piquillín','Porteña','Pozo del Molle','Quilino','Río Ceballos','Río Cuarto','Río Segundo','Río Tercero','Sacanta','Saldán','Salsacate','Salsipuedes','Sampacho','San Agustín','San Antonio de Litín','San Basilio','San Carlos','San Francisco','Santa Eufemia','Santa Magdalena','Santiago Temple','Saturnino M. Laspiur','Sebastián Elcano','Serrano','Serrezuela','Tancacha','Ticino','Tío Pujio','Toledo','Ucacha','Unquillo','Valle Hermoso','Viamonte','Vicuña Mackenna','Villa Allende','Villa Ascasubi','Villa Berna','Villa Carlos Paz','Villa Cura Brochero','Villa de Soto','Villa del Dique','Villa del Rosario','Villa del Totoral','Villa Dolores','Villa Giardino','Villa Huidobro','Villa Las Rosas','Villa María','Villa Nueva','Villa Reducción','Villa Rumipal','Villa Tulumba','Villa Valeria','Wenceslao Escalante','Alvear','Berón de Astrada','Bonpland','Chavarría','Concepción','Corrientes','Cruz de los Milagros','Curuzú Cuatiá','Departamento de Goya','Empedrado','Esquina','Felipe Yofré','Garruchos','Gobernador Virasora','Goya','Herlitzka','Itá Ibaté','Itatí','Juan Pujol','La Cruz','Libertad','Lomas de Vallejos','Loreto','Mariano I. Loza','Mburucuyá','Mocoretá','Monte Caseros','Palmar Grande','Paso de la Patria','Paso de los Libres','Pedro R. Fernández','Perugorría','Pueblo Libertador','Riachuelo','Saladas','San Cosme','San Lorenzo','San Luis del Palmar','Santa Lucía','Santa Rosa','Santo Tomé','Yapeyú','Yataity Calle','Aldea San Antonio','Aranguren','Bovril','Caseros','Ceibas','Chajarí','Colonia Elía','Concordia','Conscripto Bernardi','Crespo','Diamante','Domínguez','Federación','Federal','General Campos','General Galarza','General Ramírez','Gobernador Mansilla','Gualeguay','Gualeguaychú','Hasenkamp','Hernández','Herrera','La Criolla','La Paz','Larroque','Los Charrúas','Los Conquistadores','Lucas González','Maciá','Nogoyá','Oro Verde','Paraná','Piedras Blancas','Pronunciamiento','Puerto Ibicuy','Puerto Yeruá','Rosario del Tala','San Benito','San Gustavo','San Justo','San Salvador','Santa Ana','Santa Anita','Santa Elena','Sauce de Luna','Seguí','Tabossi','Ubajay','Urdinarrain','Viale','Victoria','Villa Elisa','Villa Hernandarias','Villa Mantero','Villa María Grande','Villa Paranacito','Villaguay','Clorinda','Comandante Fontana','El Colorado','Estanislao del Campo','Formosa','Herradura','Ibarreta','Laguna Naick-Neck','Laguna Yema','Las Lomitas','Palo Santo','Pirané','Pozo del Tigre','Riacho Eh-Eh','Villa Escolar','Villa General Guemes','Abra Pampa','Caimancito','Calilegua','El Aguilar','Fraile Pintado','Humahuaca','Ingenio La Esperanza','La Mendieta','La Quiaca','Maimará','Palma Sola','Palpalá','San Pedro de Jujuy','Santa Clara','Tilcara','Yuto','Alpachiri','Alta Italia','Anguil','Arata','Bernardo Larroudé','Bernasconi','Caleufú','Catriló','Colonia Barón','Departamento de Toay','Doblas','Eduardo Castex','Embajador Martini','General Acha','General Pico','Guatraché','Ingeniero Luiggi','Intendente Alvear','Jacinto Arauz','La Adela','La Maruja','Lonquimay','Macachín','Miguel Riglos','Parera','Quemú Quemú','Rancul','Realicó','Santa Isabel','Telén','Trenel','Uriburu','Victorica','Winifreda','Arauco','Castro Barros','Chamical','Chilecito','La Rioja','Villa Bustos','Vinchina','Godoy Cruz','Las Heras','Mendoza','San Martín','San Rafael','Alba Posse','Aristóbulo del Valle','Arroyo del Medio','Azara','Bernardo de Irigoyen','Campo Grande','Campo Ramón','Campo Viera','Candelaria','Capioví','Caraguatay','Cerro Azul','Cerro Corá','Colonia Aurora','Dos Arroyos','Dos de Mayo','El Alcázar','El Soberbio','Garuhapé','Garupá','Gobernador Roca','Guaraní','Jardín América','Los Helechos','Mártires','Mojón Grande','Montecarlo','Oberá','Panambí','Posadas','Puerto Eldorado','Puerto Esperanza','Puerto Iguazú','Puerto Leoni','Puerto Libertad','Puerto Piray','Puerto Rico','Ruiz de Montoya','San José','Santo Pipó','Tres Capones','Wanda','Aluminé','Andacollo','Añelo','Barrancas','Buta Ranquil','Centenario','Chos Malal','Cutral-Có','El Huecú','Junín de los Andes','Las Coloradas','Las Lajas','Las Ovejas','Loncopué','Mariano Moreno','Neuquén','Picún Leufú','Piedra del Águila','Plaza Huincul','Plottier','Senillosa','Villa La Angostura','Vista Alegre','Zapala','Allen','Catriel','Cervantes','Chichinales','Chimpay','Choele Choel','Cinco Saltos','Cipolletti','Comallo','Coronel Belisle','Darwin','El Bolsón','El Cuy','Fray Luis Beltrán','General Conesa','Ingeniero Jacobacci','Lamarque','Los Menucos','Mainque','Maquinchao','Ñorquinco','Pilcaniyeu','Río Colorado','San Antonio Oeste','Sierra Colorada','Sierra Grande','Valcheta','Viedma','Villa Regina','Apolinario Saravia','Cachí','Cafayate','Campo Quijano','Chicoana','Departamento Capital','Departamento de Anta','El Carril','El Galpón','El Quebrachal','Embarcación','Joaquín V. González','La Caldera','Las Lajitas','Salta','Santa Rosa de Tastil','Tartagal','Albardón','Calingasta','Caucete','Chimbas','Pocito','San José de Jáchal','San Juan','Villa Basilio Nievas','Buena Esperanza','Concarán','Justo Daract','La Punta','La Toma','Naschel','San Luis','Tilisarao','Unión','Villa General Roca','Villa Mercedes','28 de Noviembre','Caleta Olivia','El Calafate','Gobernador Gregores','Los Antiguos','Perito Moreno','Pico Truncado','Puerto Deseado','Puerto Santa Cruz','Río Gallegos','Río Turbio','San Julián','Armstrong','Arroyo Seco','Arrufó','Bella Italia','Calchaquí','Cañada de Gómez','Capitán Bermúdez','Carcarañá','Casilda','Ceres','Chañar Ladeado','Coronda','Departamento de Vera','El Trébol','Esperanza','Firmat','Fray Luis A. Beltrán','Funes','Gálvez','Gato Colorado','Gobernador Gálvez','Granadero Baigorria','Helvecia','Hersilia','Iriondo Department','Laguna Paiva','Las Parejas','Las Rosas','Las Toscas','Los Laureles','Malabrigo','Melincué','Pérez','Rafaela','Reconquista','Roldán','Rosario','Rufino','San Carlos Centro','San Javier','San Jorge','Santa Fe','Sastre','Sunchales','Tacuarendí','Tostado','Totoras','Venado Tuerto','Vera','Villa Cañás','Villa Constitución','Villa Mugueta','Villa Ocampo','Villa Trinidad','Añatuya','Beltrán','Campo Gallo','Clodomira','Colonia Dora','El Hoyo','La Banda','Los Juríes','Los Telares','Quimilí','Santiago del Estero','Sumampa','Suncho Corral','Termas de Río Hondo','Tintina','Villa Atamisqui','Villa Ojo de Agua','Río Grande','Tolhuin','Ushuaia','Aguilares','Alderetes','Bella Vista','Burruyacú','Famaillá','Graneros','La Cocha','Monteros','Simoca','Tafí del Valle','Tafí Viejo','Trancas','Yerba Buena','Agarakavan','Aparan','Aragats','Arteni','Ashnak','Ashtarak','Byurakan','Hnaberd','Karbi','Kasakh','Kosh','Nor Yerznka','Oshakan','Sasunik','Shenavan','T’alin','Tsaghkahovit','Ushi','Voskevaz','Zovuni','Abovyan','Aralez','Ararat','Arevabuyr','Arevshat','Armash','Artashat','Avshar','Aygavan','Aygepat','Aygestan','Aygezard','Bardzrashen','Berk’anush','Burastan','Byuravan','Dalar','Darakert','Dashtavan','Dimitrov','Dvin','Getazat','Ghukasavan','Goravan','Hayanist','Hovtashat','Hovtashen','Jrahovit','Lusarrat','Marmarashen','Masis','Mrganush','Mrgavan','Mrgavet','Nizami','Norabats’','Noramarg','Norashen','Noyakert','Nshavan','Sayat’-Nova','Shahumyan','Sis','Sisavan','Surenavan','Vedi','Verin Artashat','Verin Dvin','Vosketap’','Vostan','Yeghegnavan','Zangakatun','Zorak','Aghavnatun','Aknalich','Aknashen','Alashkert','Apaga','Arak’s','Arazap’','Arbat’','Arevashat','Arevik','Argavand','Armavir','Arshaluys','Artimet','Aygek','Aygeshat','Baghramyan','Bambakashat','Dalarik','Doghs','Gay','Geghakert','Geghanist','Getashen','Gmbet’','Griboyedov','Haykashen','Hovtamej','Janfida','Khoronk’','Lenughi','Lukashin','Margara','Mayisyan','Merdzavan','Metsamor','Mrgashat','Musalerr','Myasnikyan','Nalbandyan','Nor Armavir','Norakert','P’shatavan','Ptghunk’','Sardarapat','Tandzut','Taronik','Tsaghkunk’','Tsiatsan','Vagharshapat','Voskehat','Yeghegnut','Yeraskhahun','Akunk’','Astghadzor','Chambarak','Ddmashen','Drakhtik','Dzoragyugh','Gagarin','Gandzak','Gavarr','Geghamasar','Geghamavan','Karanlukh','Karchaghbyur','Lanjaghbyur','Lchap’','Lchashen','Lichk’','Madina','Martuni','Mets Masrik','Nerk’in Getashen','Noratus','Sarukhan','Sevan','Tsovagyugh','Tsovak','Tsovasar','Tsovazard','Tsovinar','Vaghashen','Vahan','Vardenik','Vardenis','Varser','Verin Getashen','Yeranos','Aghavnadzor','Aramus','Argel','Arzakan','Arzni','Balahovit','Bjni','Buzhakan','Byureghavan','Dzoraghbyur','Fantan','Garrni','Goght’','Hrazdan','Kaputan','Kotayk’','Lerrnanist','Mayakovski','Meghradzor','Mrgashen','Nor Geghi','Nor Gyugh','Prroshyan','Ptghni','Solak','Tsaghkadzor','Yeghvard','Zarr','Zoravan','Zovaber','Agarak','Akht’ala','Alaverdi','Arevashogh','Bazum','Chochkan','Darpas','Dsegh','Fioletovo','Gogaran','Gugark’','Gyulagarak','Jrashen','Lerrnants’k’','Lerrnapat','Lerrnavan','Lorut','Margahovit','Mets Parni','Metsavan','Odzun','Sarahart’','Saramej','Shirakamut','Shnogh','Spitak','Step’anavan','Tashir','Tsaghkaber','Urrut','Vahagni','Vanadzor','Vardablur','Akhuryan','Amasia','Anushavan','Arrap’i','Azatan','Basen','Dzit’hank’ov','Gyumri','Haykavan','Horrom','Kamo','Lerrnakert','Maralik','Marmashen','Meghrashen','Mets Mant’ash','P’ok’r Mant’ash','Pemzashen','Saratak','Shirak','Spandaryan','Voskehask','Yerazgavors','Akner','Angeghakot’','Brrnakot’','Dzorastan','Goris','Hats’avan','Kapan','Khndzoresk','Meghri','Shaghat','Shinuhayr','Tegh','Verishen','Archis','Artsvaberd','Aygehovit','Azatamut','Bagratashen','Berd','Berdavan','Dilijan','Haghartsin','Ijevan','Khasht’arrak','Mosesgegh','Navur','Noyemberyan','Parravak’ar','Sarigyugh','Voskevan','Agarakadzor','Areni','Getap’','Gladzor','Jermuk','Malishka','Rrind','Shatin','Vayk’','Vernashen','Yeghegis','Yeghegnadzor','Zarrit’ap’','Arabkir','K’anak’erravan','Vardadzor','Yerevan','Alto Vista','Moco','Noord','Oranjestad','Palm Beach','Paradera','Pos Chiquito','San Nicolas','Santa Cruz','Savaneta','Tanki Leendert','Washington','Acton','Ainslie','Amaroo','Aranda','Banks','Barton','Belconnen','Bonner','Bonython','Braddon','Bruce','Calwell','Campbell','Canberra','Casey','Chapman','Charnwood','Chifley','Chisholm','Conder','Cook','Coombs','Crace','Curtin','Deakin','Dickson','Downer','Duffy','Dunlop','Evatt','Fadden','Farrer','Fisher','Florey','Flynn','Forde','Forrest','Franklin','Fraser','Garran','Gilmore','Giralang','Gordon','Gowrie','Greenway','Griffith','Gungahlin','Hackett','Harrison','Hawker','Higgins','Holder','Holt','Hughes','Isaacs','Isabella Plains','Kaleen','Kambah','Kingston','Latham','Lyneham','Lyons','Macarthur','Macgregor','Macquarie','Mawson','McKellar','Melba','Monash','Narrabundah','Ngunnawal','Nicholls','O\'Connor','Oxley','Page','Palmerston','Pearce','Phillip','Red Hill','Reid','Richardson','Rivett','Scullin','Spence','Stirling','Theodore','Torrens','Turner','Wanniassa','Waramanga','Watson','Weetangera','Weston','Wright','Yarralumla','Abbotsbury','Abbotsford','Abercrombie','Aberdare','Aberdeen','Aberglasslyn','Abermain','Acacia Gardens','Adamstown','Adamstown Heights','Airds','Albion Park','Albion Park Rail','Albury','Albury Municipality','Aldavilla','Alexandria','Alfords Point','Allambie Heights','Allawah','Alstonville','Ambarvale','Anna Bay','Annandale','Annangrove','Appin','Arcadia','Arcadia vale'],
  tr:['Pekin','Tokyo','Paris','Londra','Berlin','Roma','Madrid','Seul','Kahire','Sidney','Mumbai','Toronto'],
  vi:['Bắc Kinh','Tokyo','Paris','London','Berlin','Rome','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
  id:['Beijing','Tokyo','Paris','London','Berlin','Roma','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  th:['ปักกิ่ง','โตเกียว','ปารีส','ลอนดอน','เบอร์ลิน','โรม','มาดริด','โซล','ไคโร','ซิดนีย์','มุมไบ','โตรอนโต'],
  it:['Pechino','Tokyo','Parigi','Londra','Berlino','Roma','Madrid','Seul','Il Cairo','Sydney','Mumbai','Toronto'],
  pl:['Pekin','Tokio','Paryż','Londyn','Berlin','Rzym','Madryt','Seul','Kair','Sydney','Bombaj','Toronto'],
  nl:['Peking','Tokio','Parijs','Londen','Berlijn','Rome','Madrid','Seoul','Caïro','Sydney','Mumbai','Toronto'],
  uk:['Пекін','Токіо','Париж','Лондон','Берлін','Рим','Мадрид','Сеул','Каїр','Сідней','Мумбаї','Торонто'],
  sv:['Peking','Tokyo','Paris','London','Berlin','Rom','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  el:['Πεκίνο','Τόκιο','Παρίσι','Λονδίνο','Βερολίνο','Ρώμη','Μαδρίτη','Σεούλ','Κάιρο','Σίδνεϊ','Μουμπάι','Τορόντο'],
  fa:['پکن','توکیو','پاریس','لندن','برلین','رم','مادرید','سئول','قاهره','سیدنی','بمبئی','تورنتو'],
  ur:['بیجنگ','ٹوکیو','پیرس','لندن','برلن','روم','میڈرڈ','سیول','قاہرہ','سڈنی','ممبئی','ٹورنٹو'],
  bn:['বেইজিং','টোকিও','প্যারিস','লন্ডন','বার্লিন','রোম','মাদ্রিদ','সিউল','কায়রো','সিডনি','মুম্বাই','টরন্টো'],
  ms:['Beijing','Tokyo','Paris','London','Berlin','Rom','Madrid','Seoul','Kairo','Sydney','Mumbai','Toronto'],
  sw:['Beijing','Tokyo','Paris','London','Berlin','Roma','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
  ro:['Beijing','Tokyo','Paris','Londra','Berlin','Roma','Madrid','Seoul','Cairo','Sydney','Mumbai','Toronto'],
};

// 英文用户用公链地址，其他用母语诗句地址
var ADDR_SAMPLES = {
  zh:{main:'龙凤虎 · 举头望明月', num:'3829461'},
  en:{main:'TQn4Hj8mKx3fR7vL2pN9', num:'(公链地址)'},
  ja:{main:'桜富士 · 古池や蛙飛び', num:'3829461'},
  ko:{main:'한라백두 · 청산리벽계수', num:'3829461'},
  es:{main:'Sol Mar · Quien madruga', num:'3829461'},
  fr:{main:'Paris Seine · La vie en rose', num:'3829461'},
  ar:{main:'مكة بغداد · الصبر مفتاح', num:'3829461'},
  ru:{main:'Байкал Урал · Я помню чудное', num:'3829461'},
  pt:{main:'Rio Lisboa · No sertão', num:'3829461'},
  hi:{main:'गंगा हिमालय · माटी कहे', num:'3829461'},
  de:{main:'Berlin Rhein · Wandern ist des Müllers', num:'3829461'},
  tr:{main:'İstanbul · Bir yiğit gurbete', num:'3829461'},
  vi:{main:'Hà Nội · Công cha như núi', num:'3829461'},
  id:{main:'Jakarta · Bagai air di daun', num:'3829461'},
  th:{main:'กรุงเทพ · น้ำเชี่ยวอย่าขวาง', num:'3829461'},
  it:{main:'Roma Milano · Chi dorme non piglia', num:'3829461'},
  pl:{main:'Warszawa Kraków · Nie ma róży bez', num:'3829461'},
  nl:{main:'Amsterdam Rotterdam · Al doende leert', num:'3829461'},
  uk:{main:'Київ Львів · Де згода в сімействі', num:'3829461'},
  sv:{main:'Stockholm Göteborg · Många bäckar små', num:'3829461'},
  el:{main:'Αθήνα Θεσσαλ · Φτώχεια και αρετή', num:'3829461'},
  fa:{main:'تهران اصفهان · صبر و ظفر هر دو', num:'3829461'},
  ur:{main:'کراچی لاہور · صبر کا پھل میٹھا', num:'3829461'},
  bn:{main:'ঢাকা চট্টগ্রাম · সবুরে মেওয়া ফলে', num:'3829461'},
  ms:{main:'Kuala Lumpur · Seperti air di daun', num:'3829461'},
  sw:{main:'Nairobi Mombasa · Haraka haraka haina', num:'3829461'},
  ro:{main:'București Cluj · Omul sfințește locul', num:'3829461'},
};

// CHAIN_ADDR、getEthAddr、getBtcAddr：wallet.runtime.js（晚于本文件加载）
var ETH_ADDR_LEGACY = '0x7f3a9b2c4d8e1f5a6b3c7d2e'; // 仅兼容用，勿使用

/** 密钥页助记词显示语言（与 wordlists 语言键一致） */
var WW_KEY_PAGE_LANGS = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'ar', 'ru', 'pt', 'hi'];
var WW_KEY_MNEMONIC_LANG_STORAGE = 'ww_key_mnemonic_lang';

function readUiLangFromStorage() {
  try {
    var s = localStorage.getItem('ww_ui_lang');
    if (s && LANG_INFO[s]) return s;
  } catch (e) { wwQuiet(e); }
  return null;
}
/** 全局 UI 语言（礼物页、收款页、万语地址展示等）；显式写入 localStorage 键 ww_ui_lang 可覆盖，否则跟随系统 detectDeviceLang() */
currentLang = readUiLangFromStorage() || (typeof detectDeviceLang === 'function' ? detectDeviceLang() : 'zh');

/**
 * 将系统语言映射到本应用支持的 BIP39 词表键（密钥页「我的密钥」无手动语言项，始终用此结果展示助记词）。
 * wallet.ui.js 先于 wallet.runtime.js 加载时 detectDeviceLang 可能尚不存在，故用 navigator 做最小兜底。
 */
function wwDeviceLangToMnemonicKey() {
  try {
    var d = null;
    if (typeof detectDeviceLang === 'function') {
      d = detectDeviceLang();
    } else if (typeof navigator !== 'undefined' && navigator.language) {
      var raw = String(navigator.language || '').trim().replace(/_/g, '-');
      var low = raw.toLowerCase();
      if (!low) return 'zh';
      if (low === 'zh-cn' || low.startsWith('zh-hans') || (low.length === 2 && low === 'zh')) d = 'zh';
      else if (low.indexOf('zh-tw') >= 0 || (low.indexOf('hant') >= 0 && low.indexOf('tw') >= 0)) d = 'zh';
      else if (low.indexOf('zh-hk') >= 0 || low.indexOf('zh-mo') >= 0) d = 'zh';
      else if (low.startsWith('zh')) d = 'zh';
      else d = low.split('-')[0];
    }
    if (!d) return 'zh';
    if (d === 'zh' || d === 'zh-TW' || d === 'zh-HK') return 'zh';
    var base = String(d).split('-')[0].toLowerCase();
    if (WW_KEY_PAGE_LANGS.indexOf(base) >= 0) return base;
  } catch (e) { wwQuiet(e); }
  return 'en';
}

/** 导入页：上次选择的词表语言，无记录时与设备一致 */
function readImportMnemonicLangPreference() {
  try {
    var s = localStorage.getItem(WW_KEY_MNEMONIC_LANG_STORAGE);
    if (s && WW_KEY_PAGE_LANGS.indexOf(s) >= 0) return s;
  } catch (e) { wwQuiet(e); }
  return wwDeviceLangToMnemonicKey();
}
function persistKeyMnemonicLang(lang) {
  try {
    if (WW_KEY_PAGE_LANGS.indexOf(lang) >= 0) localStorage.setItem(WW_KEY_MNEMONIC_LANG_STORAGE, lang);
  } catch (e) { wwQuiet(e); }
}
/** 仅密钥页助记词网格 / 导入校验用词表语言，与 currentLang 独立；密钥页展示语言由 syncKeyPageLangSelect 按设备刷新 */
var keyMnemonicLang = wwDeviceLangToMnemonicKey();

function switchLang(lang) {
  if (WW_KEY_PAGE_LANGS.indexOf(lang) === -1) return;
  keyMnemonicLang = lang;
  persistKeyMnemonicLang(lang);
  try {
    var il = document.getElementById('importPageLang');
    if (il) il.value = lang;
  } catch (e) { wwQuiet(e); }
  try {
    var pk = document.getElementById('page-key');
    if (pk && pk.classList.contains('active') && typeof renderKeyGrid === 'function') renderKeyGrid();
  } catch (e1) { wwQuiet(e1); }
  try {
    if (typeof applyImportGridInputLangAttrs === 'function') applyImportGridInputLangAttrs();
  } catch (e2) { wwQuiet(e2); }
}

function syncKeyPageLangSelect() {
  try {
    var pk = document.getElementById('page-key');
    var pi = document.getElementById('page-import');
    if (pk && pk.classList.contains('active')) {
      keyMnemonicLang = wwDeviceLangToMnemonicKey();
    } else if (pi && pi.classList.contains('active')) {
      var il0 = document.getElementById('importPageLang');
      if (il0 && il0.value && WW_KEY_PAGE_LANGS.indexOf(il0.value) >= 0) {
        keyMnemonicLang = il0.value;
      } else {
        keyMnemonicLang = readImportMnemonicLangPreference();
        if (il0) il0.value = WW_KEY_PAGE_LANGS.indexOf(keyMnemonicLang) >= 0 ? keyMnemonicLang : 'zh';
      }
    }
    var v = WW_KEY_PAGE_LANGS.indexOf(keyMnemonicLang) >= 0 ? keyMnemonicLang : 'zh';
    var il = document.getElementById('importPageLang');
    if (il) {
      il.value = v;
      if (il.value !== v) il.value = 'zh';
    }
  } catch (e2) { wwQuiet(e2); }
}

/**
 * 助记词展示 / 导入 / 校验用词库键（密钥页由 keyMnemonicLang 经 wwDeviceLangToMnemonicKey 刷新；导入页与 #importPageLang 一致）：
 * 英文 → en；其余语种在 getMnemonicWordlistLang 下统一映射到实际词表键（如 zh 地名词）。
 * mnemonicFromLang、enWordsToLangKeyTableWords、恢复演练等须用此键，勿用 currentLang（界面语言）。
 */
function wwResolveMnemonicWordlistKey() {
  return typeof getMnemonicWordlistLang === 'function'
    ? getMnemonicWordlistLang(keyMnemonicLang)
    : (keyMnemonicLang === 'en' ? 'en' : 'zh');
}

var MAIN_PAGES = ['page-home','page-swap','page-addr','page-settings','page-hongbao'];
var TAB_MAP = {'tab-home':'page-home','tab-swap':'page-swap','tab-addr':'page-addr','tab-hongbao':'page-hongbao','tab-settings':'page-settings'};

var WW_SEO_DEFAULT = { title: 'WorldToken — 全球多语言加密钱包', description: 'WorldToken：万语地址、TRX / ETH / TRC USDT / BTC 多链，本地保管助记词与资产。' };
var WW_PAGE_SEO = {
  'page-welcome': { title: '欢迎 — WorldToken 多语言钱包', description: '创建或导入钱包：万语地址与多链资产管理。' },
  'page-key': { title: '备份助记词 — WorldToken', description: '请安全抄写并离线保存助记词，勿截图或上传网络。' },
  'page-key-verify': { title: '验证助记词 — WorldToken', description: '按提示输入助记词以确认您已正确备份。' },
  'page-home': { title: '资产 — WorldToken', description: '查看余额、快捷转账、兑换与交易记录。' },
  'page-addr': { title: '收款地址 — WorldToken', description: '展示 TRX / ETH / BTC 地址与收款二维码。' },
  'page-transfer': { title: '转账 — WorldToken', description: '向 TRC-20 地址发送 TRC USDT。' },
  'page-swoosh': { title: '处理中 — WorldToken', description: '交易正在提交。' },
  'page-transfer-success': { title: '转账成功 — WorldToken', description: '转账已提交，可查看摘要与分享。' },
  'page-settings': { title: '设置 — WorldToken', description: 'PIN、两步验证、备份与隐私相关选项。' },
  'page-address-book': { title: '地址簿 — WorldToken', description: '管理本机常用收款地址，与转账页共用。' },
  'page-convert-mnemonic': { title: '转换助记词 — WorldToken', description: '选择助记词语言，按 BIP39 索引映射显示对应词表，便于与其他钱包互导入。' },
  'page-swap': { title: '兑换 — WorldToken', description: 'TRC USDT（TRC-20）兑换为 TRX，跳转 SunSwap。' },
  'page-swap-records': { title: '兑换记录 — WorldToken', description: '历史兑换与路由记录。' },
  'page-password-restore': { title: 'PIN 解锁 — WorldToken', description: '使用本机 PIN 解锁并进入钱包。' },
  'page-import': { title: '导入钱包 — WorldToken', description: '使用 12 词助记词恢复钱包。' },
  'page-hongbao': { title: '礼物 — WorldToken', description: '创建或领取口令礼物。' },
  'page-hb-keyword': { title: '礼物口令 — WorldToken', description: '查看或分享礼物关键词。' },
  'page-claim': { title: '领取礼物 — WorldToken', description: '输入口令领取链上礼物。' },
  'page-claimed': { title: '已领取 — WorldToken', description: '礼物领取完成。' },
  'page-hb-records': { title: '礼物记录 — WorldToken', description: '历史发送与领取记录。' },
  'page-faq': { title: '常见问题 — WorldToken', description: '助记词安全、钱包备份与恢复说明。' },
  'page-verify-success': { title: '验证成功 — WorldToken', description: '助记词验证通过，可以开始使用钱包。' },
  'page-social-recovery': { title: '社交恢复 — WorldToken', description: '本机登记可协助恢复的信任联系人（不上传）。' },
  'page-spending-limits': { title: '支出限额 — WorldToken', description: '每日转出美元估值限额与 PIN 覆盖。' },
  'page-whale-alerts': { title: '巨鲸提醒 — WorldToken', description: '监控地址大额链上活动浏览器通知。' },
  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' },
  'page-bridge': { title: '跨链桥 — WorldToken', description: 'TRON 与以太坊之间跨链桥接示意与第三方入口。' },
  'page-vesting': { title: '代币解锁 — WorldToken', description: '锁定与解锁代币进度时间线（本地示意）。' },
  'page-dex-connect': { title: '连接 DEX — WorldToken', description: '跳转 Uniswap 等 DEX 并用 WalletConnect 连接钱包。' },
  'page-hardware-wallet': { title: '硬件钱包 — WorldToken', description: 'Ledger / Trezor 连接说明与官方支持入口。' },
  'page-tax-report': { title: '税务报表 — WorldToken', description: '导出交易历史 CSV 供税务申报参考。' },
  'page-copy-trading': { title: '跟单交易 — WorldToken', description: '登记监控巨鲸地址（本地示意，非自动交易）。' },
  'page-portfolio-insurance': { title: '资产保险 — WorldToken', description: '链上资产保险与承保入口说明（示意）。' },
  'page-yield-optimizer': { title: '收益优化 — WorldToken', description: '根据持仓的 DeFi 收益策略参考。' },
  'page-token-unlock-calendar': { title: '解锁日历 — WorldToken', description: '主流项目代币解锁日程示例。' },
  'page-identity': { title: '链上身份 — WorldToken', description: 'ENS 与社交资料本地备注。' },
  'page-analytics': { title: '数据洞察 — WorldToken', description: '支出模式与代币活跃度本地分析。' },
  'page-recurring': { title: '定期转账 — WorldToken', description: '本机计划转账提醒（非自动扣款）。' },
  'page-token-whitelist': { title: '转账白名单 — WorldToken', description: '仅允许向白名单地址转账。' },
  'page-inheritance': { title: '继承备忘 — WorldToken', description: '受益人地址本机备忘。' },
  'page-dao': { title: 'DAO 治理 — WorldToken', description: '治理提案与本地投票示意。' },
  'page-reputation': { title: '钱包信誉分 — WorldToken', description: '基于本机活动与安全的参考评分。' },
  'page-lending': { title: '借贷协议 — WorldToken', description: '存借利率与市场示意。' },
  'page-perp-futures': { title: '永续合约 — WorldToken', description: '持仓与盈亏本地示意。' },
  'page-options': { title: '期权 — WorldToken', description: '基础期权询价界面示意。' },
  'page-yield-aggregator': { title: '收益聚合 — WorldToken', description: 'Aave、Compound、Venus 等 APY 对比示意。' },
  'page-liquidation-alerts': { title: '清算预警 — WorldToken', description: '抵押率过低时的本地提醒与通知。' },
  'page-launchpad': { title: 'Launchpad — WorldToken', description: 'IDO / IEO 项目占位与说明。' },
  'page-social-leaderboard': { title: '社交跟单榜 — WorldToken', description: '演示排行榜与复制地址入口。' },
  'page-auto-rebalance': { title: '自动再平衡 — WorldToken', description: '组合偏离检测与调仓提示。' },
  'page-sentiment': { title: '舆情分析 — WorldToken', description: '代币情绪示意与行情联动。' },
  'page-onchain-messaging': { title: '链上消息 — WorldToken', description: '本地加密消息载荷与转账配合说明。' },
  'page-backup-qr': { title: '备份二维码 — WorldToken', description: '加密备份二维码导出。' },
  'page-gasless': { title: '免 Gas — WorldToken', description: '元交易与中继偏好示意。' }
};
function applySeoForPage(pageId) {
  try {
    const d = WW_PAGE_SEO[pageId] || WW_SEO_DEFAULT;
    document.title = d.title;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', d.description);
    const ogt = document.querySelector('meta[property="og:title"]');
    if (ogt) ogt.setAttribute('content', d.title);
    const ogd = document.querySelector('meta[property="og:description"]');
    if (ogd) ogd.setAttribute('content', d.description);
    const twt = document.querySelector('meta[name="twitter:title"]');
    if (twt) twt.setAttribute('content', d.title);
    const twd = document.querySelector('meta[name="twitter:description"]');
    if (twd) twd.setAttribute('content', d.description);
    const jld = document.getElementById('ww-seo-jsonld');
    if (jld) {
      const base = (typeof location !== 'undefined' && location.href) ? location.href.split('#')[0] : 'https://worldtoken.cc/wallet.html';
      jld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: d.title,
        description: d.description,
        url: base,
        isPartOf: { '@type': 'WebSite', name: 'WorldToken', url: 'https://worldtoken.cc/' }
      });
    }
  } catch (e) { wwQuiet(e); }
}
function wwIsOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function applyOfflineState() {
  const on = wwIsOnline();
  const b = document.getElementById('offlineBanner');
  if (b) b.classList.toggle('show', !on);
  try { if (typeof checkTransferReady === 'function') checkTransferReady(); } catch (e) { wwQuiet(e); }
  try {
    const addrEl = document.getElementById('transferAddr');
    if (addrEl && typeof detectAddrType === 'function') detectAddrType();
  } catch (e2) { wwQuiet(e2); }
}

function wwBase32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, val = 0, out = '';
  for (let i = 0; i < buf.length; i++) {
    val = (val << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(val >> bits) & 31];
    }
  }
  if (bits > 0) out += alphabet[(val << (5 - bits)) & 31];
  return out;
}

function wwCounterBytes(n) {
  const b = new Uint8Array(8);
  let x = BigInt(n);
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(x & 255n);
    x >>= 8n;
  }
  return b;
}
async function wwHmacSha1(keyBytes, msgBytes) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, msgBytes);
  return new Uint8Array(sig);
}

function wwTotpEnabled() {
  return localStorage.getItem('ww_totp_enabled') === '1' && !!localStorage.getItem('ww_totp_secret');
}

/** 双重确认后写入 PIN（供设置 / 按需解锁链使用） */
async function wwPersistPinFromSetup(pin) {
  var p = String(pin || '');
  if (!/^\d{6}$/.test(p)) throw new Error('PIN 须为 6 位数字');
  if (typeof savePinSecure === 'function') await savePinSecure(p);
  else {
    try { localStorage.setItem('ww_pin', p); } catch (e) { throw e; }
  }
  if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.set === 'function') window.wwSessionPinBridge.set(p);
  try { localStorage.setItem('ww_pin_set', '1'); } catch (e) { wwQuiet(e); }
}

/**
 * 首次：双重设置 PIN（openPinSetupOverlay）。
 * 已设 PIN：本会话已解锁则直接继续；否则只弹出单次 PIN 验证（pinUnlockOverlay），不再次「设定 PIN」。
 */
function wwEnsurePinThen(done) {
  if (typeof wwHasPinConfigured !== 'function' || !wwHasPinConfigured()) {
    if (typeof openPinSetupOverlay !== 'function') {
      if (typeof showToast === 'function') showToast('请先设置 6 位 PIN', 'warning');
      return;
    }
    window._wwPinSetupComplete = async function (pin) {
      await wwPersistPinFromSetup(pin);
      if (typeof showToast === 'function') showToast('PIN 已保存', 'success');
      if (typeof updateSettingsPage === 'function') updateSettingsPage();
      if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
      if (typeof done === 'function') done();
    };
    openPinSetupOverlay({ skipFirstRunLock: true });
    return;
  }
  var sess = '';
  try {
    if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.get === 'function') sess = window.wwSessionPinBridge.get() || '';
  } catch (_s) { wwQuiet(_s); }
  if (/^\d{6}$/.test(String(sess))) {
    if (typeof done === 'function') done();
    return;
  }
  var ov = document.getElementById('pinUnlockOverlay');
  if (!ov) {
    if (typeof showToast === 'function') showToast('无法显示 PIN 验证', 'warning');
    return;
  }
  window._wwAfterPinUnlockContinue = done;
  var inp = document.getElementById('pinUnlockInput');
  if (inp) inp.value = '';
  var errEl = document.getElementById('pinUnlockError');
  if (errEl) errEl.style.display = 'none';
  var panel = document.getElementById('pinUnlockPanel');
  if (panel) panel.classList.remove('wt-shake-wrong');
  ov.classList.add('show');
  setTimeout(function () {
    try {
      if (inp) inp.focus();
    } catch (_f) { wwQuiet(_f); }
  }, 200);
}

/**
 * 敏感操作（兑换、转账、礼物等）：已设 PIN 时每次均弹出验证，不跳过会话缓存。
 * 未设 PIN 时与 wwEnsurePinThen 相同（引导设置）。
 */
function wwEnsurePinThenForced(done) {
  if (typeof wwHasPinConfigured !== 'function' || !wwHasPinConfigured()) {
    return typeof wwEnsurePinThen === 'function' ? wwEnsurePinThen(done) : typeof done === 'function' && done();
  }
  var ov = document.getElementById('pinUnlockOverlay');
  if (!ov) {
    if (typeof showToast === 'function') showToast('无法显示 PIN 验证', 'warning');
    return;
  }
  window._wwAfterPinUnlockContinue = done;
  var inp = document.getElementById('pinUnlockInput');
  if (inp) inp.value = '';
  var errEl = document.getElementById('pinUnlockError');
  if (errEl) errEl.style.display = 'none';
  var panel = document.getElementById('pinUnlockPanel');
  if (panel) panel.classList.remove('wt-shake-wrong');
  ov.classList.add('show');
  setTimeout(function () {
    try {
      if (inp) inp.focus();
    } catch (_f2) { wwQuiet(_f2); }
  }, 200);
}
try {
  window.wwEnsurePinThenForced = wwEnsurePinThenForced;
} catch (_wepf) { wwQuiet(_wepf); }

function closePinSetupOverlay() {
  const el = document.getElementById('pinSetupOverlay');
  if (el) el.classList.remove('show');
  window._pinSetupValue = '';
  window._pinSetupFirst = '';
  window._pinSetupMode = 'create';
  try { window._wwPinSetupComplete = null; } catch (_n) { wwQuiet(_n); }
  try { window._pinSetupFlow = 'setup'; } catch (_pf) { wwQuiet(_pf); }
  renderPinSetupUI();
}

/** 已验证当前 PIN 后打开：双重输入新 PIN（由 wallet.runtime.js 的 wwFinalizePinChange 落盘） */
function openPinChangeOverlay() {
  openPinSetupOverlay({ skipFirstRunLock: true, flow: 'change' });
}
try {
  window.openPinChangeOverlay = openPinChangeOverlay;
} catch (_opc) { wwQuiet(_opc); }

function openPinSetupOverlay(opts) {
  opts = opts || {};
  try {
    window._pinSetupFlow = opts.flow === 'change' ? 'change' : 'setup';
  } catch (_fl) {
    window._pinSetupFlow = 'setup';
  }
  if (opts.skipFirstRunLock) {
    try { window._wwInFirstRun = false; } catch (_e) { wwQuiet(_e); }
  } else {
    try { window._wwInFirstRun = true; } catch (_frPin) { wwQuiet(_frPin); }
  }
  try {
    if (typeof closeTotpSetup === 'function') closeTotpSetup();
    var _to = document.getElementById('totpSetupOverlay');
    if (_to) _to.classList.remove('show');
    window._wwTotpPendingSecret = null;
  } catch (_e) { wwQuiet(_e); }
  const el = document.getElementById('pinSetupOverlay');
  window._pinSetupValue = '';
  window._pinSetupFirst = '';
  window._pinSetupMode = 'create';
  renderPinSetupUI();
  if (el) el.classList.add('show');
}

function renderPinSetupUI() {
  var dots = document.getElementById('pinDots');
  var keypad = document.getElementById('pinKeypad');
  var title = document.getElementById('pinSetupTitle');
  var hint = document.getElementById('pinSetupHint');
  var val = window._pinSetupValue || '';
  var first = window._pinSetupFirst || '';
  var mode = window._pinSetupMode || 'create';
  var flow = window._pinSetupFlow || 'setup';
  if (flow === 'change') {
    if (title) title.textContent = mode === 'confirm' ? '确认新 PIN' : '修改 PIN';
    if (hint) hint.textContent = mode === 'confirm' ? '请再次输入新 PIN' : '请输入 6 位新数字';
  } else {
    if (title) title.textContent = mode === 'confirm' ? '确认 PIN' : '设置 PIN';
    if (hint) hint.textContent = mode === 'confirm' ? '请再次输入 6 位数字' : '请输入 6 位数字';
  }
  if (dots) {
    dots.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      dots.innerHTML += '<span style="width:12px;height:12px;border-radius:50%;display:inline-block;margin:0 6px;background:' + (i < val.length ? 'var(--gold)' : 'rgba(255,255,255,0.15)') + '"></span>';
    }
  }
  if (keypad && !keypad.dataset.ready) {
    var keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    keypad.innerHTML = keys.map(function(k){
      if (!k) return '<div></div>';
      return '<button type="button" class="btn-secondary" style="height:48px;font-size:20px" onclick="handlePinSetupKey(\''+k+'\')">'+k+'</button>';
    }).join('');
    keypad.dataset.ready = '1';
  }
}

async function finalizeImportedWalletAfterPin(pin) {
  var raw = localStorage.getItem('ww_import_pending');
  if (!raw) return;
  var flat;
  try {
    flat = JSON.parse(raw);
  } catch (e) {
    console.error('[JSON]', e);
    showToast('数据损坏', 'error');
    return;
  }
  var pinStr = String(pin || '');
  if (window.wwSessionPinBridge) window.wwSessionPinBridge.set(pinStr);
  await saveWalletSecure(flat, pinStr);
  localStorage.removeItem('ww_import_pending');
  window.REAL_WALLET = {
    mnemonic: flat.mnemonic,
    ethAddress: flat.ethAddress,
    trxAddress: flat.trxAddress,
    btcAddress: flat.btcAddress,
    privateKey: flat.privateKey,
    trxPrivateKey: flat.trxPrivateKey,
    createdAt: flat.createdAt,
    hasEncrypted: true,
    backedUp: !!flat.backedUp
  };
  try { if (typeof updateAddr === 'function') updateAddr(); } catch (e) { wwQuiet(e); }
  try { if (typeof loadBalances === 'function') setTimeout(loadBalances, 0); } catch (e) { wwQuiet(e); }
  var tb = document.getElementById('tabBar');
  if (tb) tb.style.display = 'flex';
  goTo('page-home');
  try { window._wwInFirstRun = false; } catch (_fr1) { wwQuiet(_fr1); }
  showToast('✅ PIN 设置成功，钱包已恢复', 'success');
}

function handlePinSetupKey(key) {
  var val = window._pinSetupValue || '';
  if (key === '⌫') {
    window._pinSetupValue = val.slice(0, -1);
    renderPinSetupUI();
    return;
  }
  if (!/^\d$/.test(key) || val.length >= 6) return;
  val += key;
  window._pinSetupValue = val;
  renderPinSetupUI();
  if (val.length < 6) return;

  if ((window._pinSetupMode || 'create') === 'create') {
    window._pinSetupFirst = val;
    window._pinSetupValue = '';
    window._pinSetupMode = 'confirm';
    renderPinSetupUI();
    return;
  }

  if (val !== (window._pinSetupFirst || '')) {
    showToast('两次 PIN 不一致', 'error');
    window._pinSetupValue = '';
    window._pinSetupFirst = '';
    window._pinSetupMode = 'create';
    renderPinSetupUI();
    return;
  }

  var importPending = null;
  try {
    importPending = localStorage.getItem('ww_import_pending');
  } catch (_ip) { wwQuiet(_ip); }

  if (importPending) {
    finalizeImportedWalletAfterPin(val)
      .then(function () {
        try { window._wwPinSetupComplete = null; } catch (_n) { wwQuiet(_n); }
        closePinSetupOverlay();
      })
      .catch(function (e) {
        showToast(wwFmtUserError(e, 'PIN 设置失败'), 'error');
      });
    return;
  }

  var onDone = typeof window._wwPinSetupComplete === 'function' ? window._wwPinSetupComplete : null;
  if (onDone) {
    Promise.resolve()
      .then(function () {
        return onDone(val);
      })
      .then(function () {
        try { window._wwPinSetupComplete = null; } catch (_n2) { wwQuiet(_n2); }
        closePinSetupOverlay();
      })
      .catch(function (e) {
        if (typeof showToast === 'function') showToast(wwFmtUserError(e, '操作失败'), 'error');
      });
    return;
  }

  var flow = window._pinSetupFlow || 'setup';
  if (flow === 'change') {
    Promise.resolve()
      .then(function () {
        if (typeof wwFinalizePinChange === 'function') return wwFinalizePinChange(val);
        throw new Error('无法保存新 PIN');
      })
      .then(function () {
        closePinSetupOverlay();
      })
      .catch(function (e) {
        if (e && e.message === 'SAME_PIN') return;
        if (typeof showToast === 'function') showToast(wwFmtUserError(e, '修改失败'), 'error');
      });
    return;
  }

  Promise.resolve(wwPersistPinFromSetup(val))
    .then(function () {
      if (typeof showToast === 'function') showToast('PIN 已保存', 'success');
      if (typeof updateSettingsPage === 'function') updateSettingsPage();
      if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
      if (typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
      closePinSetupOverlay();
    })
    .catch(function (e) {
      if (typeof showToast === 'function') showToast(wwFmtUserError(e, 'PIN 保存失败'), 'error');
    });
}

/** 保留接口；永不自动打开 TOTP（与首次引导解耦） */
function offerTotpAfterPinSave() {}

function startTotpSetup() {
  if (window._wwInFirstRun) return;
  const pin = localStorage.getItem('ww_pin');
  if (!pin) { showToast('请先设置 6 位 PIN', 'warning'); return; }
  const secretB32 = wwGenerateTotpSecretB32();
  window._wwTotpPendingSecret = secretB32;
  const issuer = 'WorldToken';
  let acc = (typeof getNativeAddr === 'function' ? getNativeAddr() : '') || 'wallet';
  acc = String(acc).slice(0, 48);
  const label = encodeURIComponent(issuer + ':' + acc);
  const otpauth = 'otpauth://totp/' + label + '?secret=' + secretB32 + '&issuer=' + encodeURIComponent(issuer);
  const st = document.getElementById('totpSetupSecretText');
  if (st) st.textContent = secretB32;
  const inp = document.getElementById('totpSetupVerifyInput');
  if (inp) inp.value = '';
  const ov = document.getElementById('totpSetupOverlay');
  if (ov) ov.classList.add('show');
  const canvas = document.getElementById('totpSetupQr');
  if (canvas && typeof loadQRCodeLib === 'function') {
    loadQRCodeLib().then(function() {
      if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
        return QRCode.toCanvas(canvas, otpauth, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
      }
    }).catch(function() { showToast('二维码加载失败，可手动输入密钥', 'warning'); });
  }
}
function closeTotpSetup() {
  const ov = document.getElementById('totpSetupOverlay');
  if (ov) ov.classList.remove('show');
  window._wwTotpPendingSecret = null;
}

function showTotpUnlockOverlay() {
  const ov = document.getElementById('totpUnlockOverlay');
  const inp = document.getElementById('totpUnlockInput');
  const err = document.getElementById('totpUnlockError');
  if (inp) { inp.value = ''; try { inp.focus(); } catch (e) { wwQuiet(e); } }
  if (err) err.style.display = 'none';
  if (ov) ov.classList.add('show');
}

function closeTotpUnlock() {
  if(window._wwForceIdleLock) {
    if(typeof showToast==='function') showToast('请输入两步验证码以解锁', 'warning', 2200);
    return;
  }
  const ov = document.getElementById('totpUnlockOverlay');
  if (ov) ov.classList.remove('show');
  const pov = document.getElementById('pinUnlockOverlay');
  const pinInp = document.getElementById('pinUnlockInput');
  if (pinInp) pinInp.value = '';
  if (pov) pov.classList.add('show');
  try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap2) { wwQuiet(_ap2); }
}

/** 任一条链上公开地址存在即视为已有钱包（勿仅依赖 ethAddress，否则首页底栏被隐藏、像空白页） */
function wwWalletHasAnyChainAddress(rw) {
  try {
    if (!rw || typeof rw !== 'object') return false;
    return !!(rw.ethAddress || rw.trxAddress || rw.btcAddress);
  } catch (_e) {
    return false;
  }
}

/** 持久化 ww_wallet 是否含「可识别的」链上地址（排除占位/短串，避免首屏误判进资产页） */
function wwWalletHasValidPersistedAddress(d) {
  try {
    if (!d || typeof d !== 'object') return false;
    function ethOk(a) {
      return typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a.trim());
    }
    function trxOk(a) {
      if (typeof a !== 'string') return false;
      var s = a.trim();
      return s.length >= 30 && s.length <= 52 && /^T[1-9A-HJ-NP-Za-km-z]+$/.test(s);
    }
    function btcOk(a) {
      if (typeof a !== 'string') return false;
      var s = a.trim();
      if (s.length < 26) return false;
      return /^(bc1|[13])[a-zA-HJ-NP-Za-km-z0-9]{24,}$/.test(s) || /^bc1[a-z0-9]{25,90}$/i.test(s);
    }
    return ethOk(d.ethAddress || '') || trxOk(d.trxAddress || '') || btcOk(d.btcAddress || '');
  } catch (_e2) {
    return false;
  }
}
try {
  window.wwWalletHasValidPersistedAddress = wwWalletHasValidPersistedAddress;
} catch (_wwV) {
  wwQuiet(_wwV);
}

/** REAL 已有任意链地址则用 REAL；否则（助记词已生成未验证）用 TEMP_WALLET 作首页/余额预览 */
function wwGetChainViewWallet() {
  try {
    var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    if (wwWalletHasAnyChainAddress(rw)) return rw;
    var tw = typeof window !== 'undefined' && window.TEMP_WALLET ? window.TEMP_WALLET : null;
    if (wwWalletHasAnyChainAddress(tw)) return tw;
    return rw || tw || null;
  } catch (_e) {
    return null;
  }
}

function wwWalletHasAnyChainAddressIncludingTemp() {
  try {
    var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    var tw = typeof window !== 'undefined' && window.TEMP_WALLET ? window.TEMP_WALLET : null;
    if (typeof wwWalletHasValidPersistedAddress === 'function') {
      return wwWalletHasValidPersistedAddress(rw) || wwWalletHasValidPersistedAddress(tw);
    }
    return wwWalletHasAnyChainAddress(rw) || wwWalletHasAnyChainAddress(tw);
  } catch (_e2) {
    return false;
  }
}

/** 本机首页 UI 缓存键：与当前钱包绑定（换地址则丢弃快照） */
function wwWalletSnapIdForCache() {
  try {
    if (typeof REAL_WALLET === 'undefined' || !REAL_WALLET) return '';
    return String(REAL_WALLET.trxAddress || '') + '|' + String(REAL_WALLET.ethAddress || '');
  } catch (_e) {
    return '';
  }
}

/**
 * 无有效会话 PIN、且本地为加密包 + 已配 PIN：应先走 PIN 解锁流程（与 wallet.html head boot 一致，避免首页闪屏）
 */
function wwNeedsPinUnlockBeforeHome() {
  try {
    if (typeof wwGetSessionPin === 'function' && wwGetSessionPin()) return false;
  } catch (_s0) {}
  try {
    if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.get === 'function' && window.wwSessionPinBridge.get()) {
      return false;
    }
  } catch (_s1) {}
  var d = null;
  try {
    d = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
  } catch (_e) {
    return false;
  }
  if (!wwWalletHasAnyChainAddress(d)) return false;
  if (!d.encrypted) return false;
  try {
    if (typeof wwHasPinConfigured === 'function') return wwHasPinConfigured();
  } catch (_h) {}
  try {
    if (localStorage.getItem('ww_pin_hash') || localStorage.getItem('ww_pin_set') === '1') return true;
    var pl = localStorage.getItem('ww_unlock_pin') || localStorage.getItem('ww_pin') || '';
    return !!(pl && /^\d{6}$/.test(String(pl)));
  } catch (_p) {
    return false;
  }
}
try {
  window.wwNeedsPinUnlockBeforeHome = wwNeedsPinUnlockBeforeHome;
} catch (_wn) {}

function goTo(pageId, opts) {
  opts = opts || {};
  /* 切换路由时清理易冲突状态（与 wallet.runtime.js goTo 对齐） */
  try {
    if (!opts.preserveRouteState) {
      window._wwGoToEpoch = (window._wwGoToEpoch | 0) + 1;
      if (pageId !== 'page-swap' && window._wwSwapPriceInterval) {
        clearInterval(window._wwSwapPriceInterval);
        window._wwSwapPriceInterval = null;
      }
    }
  } catch (_rst) {
    wwQuiet(_rst);
  }
  /* 加密包 + 已配 PIN 且未会话解锁：敏感页统一改道解锁页（与 wallet.html head boot 一致） */
  try {
    if (typeof wwNeedsPinUnlockBeforeHome === 'function' && wwNeedsPinUnlockBeforeHome() && pageId !== 'page-password-restore') {
      var _wwPinGate = { 'page-home': 1, 'page-swap': 1, 'page-addr': 1, 'page-settings': 1, 'page-hongbao': 1, 'page-transfer': 1, 'page-swoosh': 1, 'page-address-book': 1, 'page-swap-records': 1, 'page-claim': 1, 'page-claimed': 1, 'page-hb-keyword': 1, 'page-hb-records': 1, 'page-transfer-success': 1 };
      if (_wwPinGate[pageId]) pageId = 'page-password-restore';
    }
  } catch (_p5) {
    wwQuiet(_p5);
  }
  /* 首帧路由清理见 wallet.runtime.js 的 goTo（运行时覆盖本函数） */
  /* 须与 runtime 的 wwUserHasAnySavedChainAddress 一致：首屏 goTo 早于 loadWallet()，仅查 IncludingTemp 会把「仅 localStorage 有地址」误判为无钱包 → head 已 boot 资产页又改道欢迎页，闪一下 */
  if (pageId === 'page-home' && !opts.forceHome) {
    var _wwAllowHomeUi = false;
    try {
      if (typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' && wwWalletHasAnyChainAddressIncludingTemp()) {
        _wwAllowHomeUi = true;
      }
    } catch (_ah0) { wwQuiet(_ah0); }
    if (!_wwAllowHomeUi) pageId = 'page-welcome';
    else {
      try {
        if (typeof wwNeedsPinUnlockBeforeHome === 'function' && wwNeedsPinUnlockBeforeHome()) pageId = 'page-password-restore';
      } catch (_nu) { wwQuiet(_nu); }
    }
  }
  if (pageId === 'page-password-restore' && typeof wwWalletHasAnyChainAddress === 'function') {
    var _pwStore = null;
    try {
      _pwStore = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
    } catch (_e) {
      _pwStore = {};
    }
    if (!wwWalletHasAnyChainAddress(_pwStore)) pageId = 'page-welcome';
    else if (typeof loadWallet === 'function') {
      try {
        loadWallet();
      } catch (_lw) { wwQuiet(_lw); }
    }
  }
  try {
    wwClearHtmlBootRouteIfDestChanges(pageId);
  } catch (_wwBootClrUi) { wwQuiet(_wwBootClrUi); }
  try { sessionStorage.setItem('ww_last_page', pageId); } catch (_) { wwQuiet(_); }
  try {
    if (!opts.force && !opts.forceRoute) {
      var _wwSamePgUi = document.querySelector('.page.active');
      if (_wwSamePgUi && _wwSamePgUi.id === pageId) return;
    }
  } catch (_sameUi) { wwQuiet(_sameUi); }
  try {
    var curEl = document.querySelector('.page.active');
    var curId = curEl && curEl.id;
    if (curId && pageId === 'page-import' && curId !== 'page-import') {
      window._importBackTarget = curId;
    }
  } catch (_ib) { wwQuiet(_ib); }
  applySeoForPage(pageId);
  const activePage=document.getElementById(pageId);
  if(!activePage){console.warn('[WorldToken] 页面不存在:',pageId);return;}
  /* 与 wallet.runtime.js goTo 一致：先 active 目标页再清其它，避免一帧无 .active（runtime 会覆盖本函数） */
  activePage.classList.add('active');
  activePage.style.display='flex';
  document.querySelectorAll('.page').forEach(function (p) {
    if (p === activePage) return;
    p.classList.remove('active');
    p.style.display='none';
  });
  var _tabBar = document.getElementById('tabBar');
  if (_tabBar) {
    if (pageId === 'page-home') {
      _tabBar.style.display =
        typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' && wwWalletHasAnyChainAddressIncludingTemp()
          ? 'flex'
          : 'none';
    } else {
      _tabBar.style.display = MAIN_PAGES.includes(pageId) ? 'flex' : 'none';
    }
  }
  if(pageId==='page-key') {
    var _skipKey = opts.preserveKeyPage || opts.skipKeyRegen;
    if (_skipKey) {
      syncKeyPageLangSelect();
      if (typeof wwUnsealWalletSensitive === 'function') {
        void wwUnsealWalletSensitive().then(function () {
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
        });
      } else if (typeof renderKeyGrid === 'function') renderKeyGrid();
    } else {
      var _backupFromSettingsUi = false;
      try {
        if (window._keyBackPage === 'page-settings' && typeof REAL_WALLET !== 'undefined' && REAL_WALLET) {
          var _hmU = !!(REAL_WALLET.enMnemonic || REAL_WALLET.mnemonic);
          var _haU = typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET);
          if (_hmU && _haU) {
            _backupFromSettingsUi = true;
            window.TEMP_WALLET = null;
            try {
              window._wwTempWalletByWordCount = {};
            } catch (_cz) { wwQuiet(_cz); }
            syncKeyPageLangSelect();
            if (typeof wwUnsealWalletSensitive === 'function') {
              void wwUnsealWalletSensitive().then(function () {
                if (typeof renderKeyGrid === 'function') renderKeyGrid();
                if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
              });
            } else {
              if (typeof renderKeyGrid === 'function') renderKeyGrid();
              if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
            }
            try { window._keyBackPage = null; } catch (_kb1) { wwQuiet(_kb1); }
          }
        }
      } catch (_bkU) { wwQuiet(_bkU); }
      if (!_backupFromSettingsUi) {
        var _twU = window.TEMP_WALLET;
        var _nU = 0;
        if (_twU && _twU.mnemonic) {
          _nU = _twU.mnemonic.trim().split(/\s+/).filter(Boolean).length;
        }
        if (_twU && _twU.mnemonic && [12, 15, 18, 21, 24].indexOf(_nU) >= 0) {
          currentMnemonicLength = _nU;
          var _selRU = document.getElementById('mnemonicLength');
          if (_selRU) {
            _selRU.value = String(_nU);
            var _ixU = [12, 15, 18, 21, 24].indexOf(_nU);
            if (_ixU >= 0) _selRU.selectedIndex = _ixU;
          }
          syncKeyPageLangSelect();
          if (typeof wwPutTempWalletInWordCountCache === 'function') wwPutTempWalletInWordCountCache(_twU);
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
          if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
        } else {
          currentMnemonicLength = 12;
          var _sel = document.getElementById('mnemonicLength');
          if (_sel) { _sel.value = '12'; _sel.selectedIndex = 0; }
          syncKeyPageLangSelect();
          showWalletLoading();
          Promise.resolve(createWallet(12))
            .then(function (w) {
              window.TEMP_WALLET = w;
              if (typeof wwPutTempWalletInWordCountCache === 'function') wwPutTempWalletInWordCountCache(w);
              hideWalletLoading();
              syncKeyPageLangSelect();
              if (typeof renderKeyGrid === 'function') renderKeyGrid();
            })
            .catch(function (e) {
              hideWalletLoading();
              if (typeof showToast === 'function')
                showToast(typeof formatWalletCreateError === 'function' ? formatWalletCreateError(e) : wwFmtUserError(e, '生成失败'), 'error');
            });
        }
      }
    }
  }
  if(pageId==='page-key-verify') {} // 验证页由 startVerify 初始化
if(pageId==='page-import') { try { window._wwInFirstRun = true; } catch (_frImp) { wwQuiet(_frImp); } try { importGridWordCount = 12; var _iml=document.getElementById('importMnemonicLength'); if(_iml){ _iml.value='12'; _iml.selectedIndex=0; } if(typeof syncKeyPageLangSelect==='function') syncKeyPageLangSelect(); } catch (_impSync) { wwQuiet(_impSync); } initImportGrid(); document.getElementById('importError').style.display='none'; updateImportWordCount(); }
  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch (_rt) { wwQuiet(_rt); } }
  if(pageId==='page-convert-mnemonic') {
    try {
      if (typeof wwPopulateConvertMnemonicPage === 'function') setTimeout(wwPopulateConvertMnemonicPage, 0);
    } catch (_pcm) { wwQuiet(_pcm); }
  }
  if(pageId==='page-social-recovery') { try { if(typeof wwSocialRecoveryRender==='function') setTimeout(wwSocialRecoveryRender, 40); } catch (_sr) { wwQuiet(_sr); } }
  if(pageId==='page-spending-limits') { try { if(typeof wwSpendLimitPopulate==='function') setTimeout(wwSpendLimitPopulate, 40); } catch (_sl) { wwQuiet(_sl); } }
  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch (_wh) { wwQuiet(_wh); } }
  if(pageId==='page-bridge') { try { setTimeout(function(){ if(typeof wwBridgeSyncTo==='function') wwBridgeSyncTo(); }, 0); } catch (_br) { wwQuiet(_br); } }
  if(pageId==='page-vesting') { try { if(typeof wwVestingRender==='function') setTimeout(wwVestingRender, 40); } catch (_ve) { wwQuiet(_ve); } }
  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch (_dx) { wwQuiet(_dx); } }
  if(pageId==='page-hardware-wallet') { try { if(typeof wwHardwareWalletPopulate==='function') setTimeout(wwHardwareWalletPopulate, 40); } catch (_hw) { wwQuiet(_hw); } }
  if(pageId==='page-tax-report') { try { if(typeof wwTaxReportPopulate==='function') setTimeout(wwTaxReportPopulate, 40); } catch (_tr) { wwQuiet(_tr); } }
  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch (_cp) { wwQuiet(_cp); } }
  if(pageId==='page-portfolio-insurance') { try { if(typeof wwPortfolioInsurancePopulate==='function') setTimeout(wwPortfolioInsurancePopulate, 40); } catch (_pi) { wwQuiet(_pi); } }
  if(pageId==='page-yield-optimizer') { try { if(typeof wwYieldOptimizerPopulate==='function') setTimeout(wwYieldOptimizerPopulate, 40); } catch (_yo) { wwQuiet(_yo); } }
  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch (_uc) { wwQuiet(_uc); } }
  if(pageId==='page-identity') { try { if(typeof wwIdentityPopulate==='function') setTimeout(wwIdentityPopulate, 40); } catch (_id) { wwQuiet(_id); } }
  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch (_an) { wwQuiet(_an); } }
  if(pageId==='page-recurring') { try { if(typeof wwRecurringPopulate==='function') setTimeout(wwRecurringPopulate, 40); } catch (_re) { wwQuiet(_re); } }
  if(pageId==='page-token-whitelist') { try { if(typeof wwWhitelistPopulate==='function') setTimeout(wwWhitelistPopulate, 40); } catch (_wl) { wwQuiet(_wl); } }
  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch (_ih) { wwQuiet(_ih); } }
  if(pageId==='page-dao') { try { if(typeof wwDaoRender==='function') setTimeout(wwDaoRender, 40); } catch (_dao) { wwQuiet(_dao); } }
  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch (_rep) { wwQuiet(_rep); } }
  if(pageId==='page-lending') { try { if(typeof wwLendingPopulate==='function') setTimeout(wwLendingPopulate, 40); } catch (_ld) { wwQuiet(_ld); } }
  if(pageId==='page-perp-futures') { try { if(typeof wwPerpPopulate==='function') setTimeout(wwPerpPopulate, 40); } catch (_pf) { wwQuiet(_pf); } }
  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch (_op) { wwQuiet(_op); } }
  if(pageId==='page-yield-aggregator') { try { if(typeof wwYieldAggPopulate==='function') setTimeout(wwYieldAggPopulate, 40); } catch (_ya) { wwQuiet(_ya); } }
  if(pageId==='page-liquidation-alerts') { try { if(typeof wwLiquidationPopulate==='function') setTimeout(wwLiquidationPopulate, 40); } catch (_lq) { wwQuiet(_lq); } }
  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch (_lp) { wwQuiet(_lp); } }
  if(pageId==='page-social-leaderboard') { try { if(typeof wwSocialLeaderboardPopulate==='function') setTimeout(wwSocialLeaderboardPopulate, 40); } catch (_sl) { wwQuiet(_sl); } }
  if(pageId==='page-auto-rebalance') { try { if(typeof wwAutoRebalancePopulate==='function') setTimeout(wwAutoRebalancePopulate, 50); } catch (_ar) { wwQuiet(_ar); } }
  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch (_sn) { wwQuiet(_sn); } }
  if(pageId==='page-onchain-messaging') { try { if(typeof wwOnchainMessagingPopulate==='function') setTimeout(wwOnchainMessagingPopulate, 40); } catch (_om) { wwQuiet(_om); } }
  if(pageId==='page-backup-qr') { try { setTimeout(function(){ var c=document.getElementById('wwBackupQrCanvas'); if(c){ var x=c.getContext('2d'); if(x){ x.fillStyle='#f0f0f0'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#999'; x.font='13px sans-serif'; x.textAlign='center'; x.fillText('点击下方生成', c.width/2, c.height/2); } } }, 0); } catch (_bq) { wwQuiet(_bq); } }
  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch (_gs) { wwQuiet(_gs); } }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch (_cw) { wwQuiet(_cw); } }
  if(pageId==='page-settings') {
    updateSettingsPage();
    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch (_ar0) { wwQuiet(_ar0); }
    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch (_gsp) { wwQuiet(_gsp); }
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch (_wg) { wwQuiet(_wg); }
  }
  if (pageId === 'page-address-book') {
    try { if (typeof renderAddressBookSettingsList === 'function') renderAddressBookSettingsList(); } catch (_ab) { wwQuiet(_ab); }
  }
  if(pageId==='page-swap') { if(typeof renderSwapUI==='function'){renderSwapUI();calcSwap();} setTimeout(loadSwapPrices, 200); }
  if(pageId==='page-hongbao') { if(typeof updateGiftUI==='function') updateGiftUI(); }
  if(MAIN_PAGES.includes(pageId)) updateAddr();
  if(pageId==='page-addr') {
    setTimeout(updateQRCode, 100);
    // 更新链地址显示
    var wvAddr = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
    if(wvAddr && wwWalletHasAnyChainAddress(wvAddr)) {
      const trx = wvAddr.trxAddress || '--';
      const eth = wvAddr.ethAddress || '--';
      const btc = wvAddr.btcAddress || '--';
      const el1 = document.getElementById('addrTrxChain'); if(el1) el1.textContent = trx;
      const el2 = document.getElementById('addrEthChain'); if(el2) el2.textContent = eth;
      const el3 = document.getElementById('addrBtcChain'); if(el3) el3.textContent = btc;
      const el4 = document.getElementById('qrChainAddr'); if(el4) el4.textContent = trx;
      // Bug34: 更新 chain-hash span
      const ct = (_safeEl('chainTrx') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainTrx fallback */; if(ct) ct.textContent = trx;
      const ce = (_safeEl('chainEth') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainEth fallback */; if(ce) ce.textContent = eth;
      const cb = (_safeEl('chainBtc') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* chainBtc fallback */; if(cb) cb.textContent = btc;
    }
  }
  if(pageId==='page-hb-records') loadHbRecords();
  if(pageId==='page-home') {
    try {
      if (REAL_WALLET && typeof wwTryRestoreCachedHomeUi === 'function') wwTryRestoreCachedHomeUi();
    } catch (_snapH) { wwQuiet(_snapH); }
    try {
      if (REAL_WALLET && typeof wwTryRestoreCachedTxHistory === 'function') wwTryRestoreCachedTxHistory();
    } catch (_snapT) { wwQuiet(_snapT); }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof updateHomeBackupBanner==='function') updateHomeBackupBanner();
    var wvHome = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
    /* TRX 能量条由 loadBalances 内与链上余额并行拉取，此处不再重复请求 */
    if(typeof refreshHomePriceTicker==='function') setTimeout(refreshHomePriceTicker, 0);
    if (
      wvHome &&
      typeof wwWalletHasAnyChainAddress === 'function' &&
      wwWalletHasAnyChainAddress(wvHome) &&
      typeof updateQRCode === 'function'
    ) {
      setTimeout(updateQRCode, 250);
    }
    /* wallet.runtime 在 ui 之后加载：首屏经 hash/boot 进首页时，同步阶段尚无 loadBalances / wwInitHomeAssetCardsFromCoins，导致 #wwHomeAssetCardsMount 空。延后一帧再挂载 USDT/TRX/ETH/BTC 卡片并拉余额（与 runtime goTo 行为一致）。 */
    setTimeout(function () {
      try {
        if (typeof wwInitHomeAssetCardsFromCoins === 'function') wwInitHomeAssetCardsFromCoins();
      } catch (_ic) { wwQuiet(_ic); }
      try {
        if (
          typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' &&
          wwWalletHasAnyChainAddressIncludingTemp() &&
          typeof loadBalances === 'function'
        ) {
          void loadBalances();
        }
      } catch (_lb) { wwQuiet(_lb); }
      try {
        if (
          typeof loadTxHistory === 'function' &&
          typeof wwWalletHasAnyChainAddressIncludingTemp === 'function' &&
          wwWalletHasAnyChainAddressIncludingTemp()
        ) {
          void loadTxHistory();
        }
      } catch (_ltx) { wwQuiet(_ltx); }
    }, 0);
  }
  if(pageId==='page-transfer') {
    calcTransferFee();
  }
  if(pageId==='page-dapp') {
    setTimeout(function() {
      try {
        var inp = document.getElementById('dappUrlInput');
        if(inp) inp.focus();
      } catch (e) { wwQuiet(e); }
    }, 200);
  }
  if (pageId === 'page-password-restore') {
    var _pri = document.getElementById('pinRestorePageInput');
    var _pre = document.getElementById('pageRestorePinError');
    if (_pre) {
      _pre.style.display = 'none';
      _pre.textContent = '';
    }
    if (_pri) _pri.value = '';
    setTimeout(function () {
      try {
        if (_pri) _pri.focus();
      } catch (_f) { wwQuiet(_f); }
    }, 100);
  }
  try { if (typeof wwUpdateScrollTopBtn === 'function') wwUpdateScrollTopBtn(); } catch (e) { wwQuiet(e); }
  try {
    var _h = '#' + pageId;
    if (location.hash !== _h) {
      if (typeof history !== 'undefined' && history.replaceState) {
        var _u = new URL(location.href);
        _u.hash = pageId;
        history.replaceState(null, '', _u.pathname + _u.search + _u.hash);
      } else {
        location.hash = _h;
      }
    }
  } catch (e) { wwQuiet(e); }
}

function goTab(tabId) {
  var targetPage = TAB_MAP[tabId] || 'page-home';
  var cur = document.querySelector('.page.active');
  if (cur && cur.id === targetPage) {
    document.querySelectorAll('.tab-item').forEach(function (t) { t.classList.remove('active'); });
    var ti = document.getElementById(tabId);
    if (ti) ti.classList.add('active');
    return;
  }
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  goTo(targetPage);
}
/** 转账成功页「返回首页」：进入资产 Tab 并滚动到「我的资产」区域 */
function wwGoToAssetsHome() {
  goTab('tab-home');
  setTimeout(function () {
    try {
      var p = document.getElementById('page-home');
      var sec = p && p.querySelector('.assets-section');
      if (!p || !sec) return;
      var top = Math.max(0, sec.offsetTop - 16);
      try {
        p.scrollTo({ top: top, behavior: 'smooth' });
      } catch (_e) {
        p.scrollTop = top;
      }
    } catch (_e2) { wwQuiet(_e2); }
  }, 80);
}
/** 兑换页导航栏「记录」→ 兑换记录页（HTML onclick 引用） */
function wwSwapShowRecords() {
  try {
    if (typeof goTo === 'function') goTo('page-swap-records');
  } catch (_e) {
    wwQuiet(_e);
  }
}
function wwUpdateScrollTopBtn() {
  var btn = document.getElementById('wwScrollTopBtn');
  if (!btn) return;
  var p = document.querySelector('.page.active');
  btn.classList.toggle('ww-show', !!(p && p.scrollTop > 220));
}
function initBalancePrivacyToggle() {
  var btn = document.getElementById('balanceHideToggle');
  if (!btn) return;
  function apply() {
    var on = localStorage.getItem('ww_balance_privacy') === '1';
    document.documentElement.classList.toggle('ww-balance-hidden', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? '\uD83D\uDE48' : '\uD83D\uDC41';
    btn.setAttribute('title', on ? '显示余额' : '隐藏余额');
  }
  apply();
  btn.addEventListener('click', function () {
    localStorage.setItem('ww_balance_privacy', localStorage.getItem('ww_balance_privacy') === '1' ? '0' : '1');
    apply();
  });
}
function initScrollTopBtn() {
  var btn = document.getElementById('wwScrollTopBtn');
  if (!btn) return;
  function bind() {
    document.querySelectorAll('.page').forEach(function (p) {
      p.addEventListener('scroll', function () { wwUpdateScrollTopBtn(); }, { passive: true });
    });
  }
  bind();
  btn.addEventListener('click', function () {
    var p = document.querySelector('.page.active');
    if (p) {
      try { p.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { p.scrollTop = 0; }
    }
  });
  window.addEventListener('resize', wwUpdateScrollTopBtn, { passive: true });
  setTimeout(wwUpdateScrollTopBtn, 0);
}
function initTabSwipeGesture() {
  var root = document.querySelector('.pages');
  if (!root) return;
  var order = ['tab-home', 'tab-addr', 'tab-swap', 'tab-hongbao', 'tab-settings'];
  var pageToTab = { 'page-home': 'tab-home', 'page-addr': 'tab-addr', 'page-swap': 'tab-swap', 'page-hongbao': 'tab-hongbao', 'page-settings': 'tab-settings' };
  var sx = 0, sy = 0, startEl = null;
  root.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    var raw = e.target;
    startEl = raw && raw.nodeType === 3 && raw.parentElement ? raw.parentElement : raw;
  }, { passive: true });
  root.addEventListener('touchend', function (e) {
    var el = startEl;
    startEl = null;
    if (el && el.closest && el.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    sx = sy = 0;
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    var active = document.querySelector('.page.active');
    if (!active) return;
    var tabId = pageToTab[active.id];
    if (!tabId) return;
    var i = order.indexOf(tabId);
    if (i < 0) return;
    if (dx < 0 && i < order.length - 1) goTab(order[i + 1]);
    else if (dx > 0 && i > 0) goTab(order[i - 1]);
  }, { passive: true });
}

function renderKeyGrid() {
  let words;
  var wlKey = wwResolveMnemonicWordlistKey();
  const isEn = wlKey === 'en';
  const tw = window.TEMP_WALLET;
  var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  // TEMP_WALLET（创建中）优先；否则用已解密的真实钱包助记词（备份页 / skipKeyRegen）
  const enMnemonic =
    (tw && (tw.mnemonic || tw.enMnemonic)) ||
    (rw && (rw.enMnemonic || rw.mnemonic));
  if (!enMnemonic) {
    try {
      var _wlo = document.getElementById('walletLoadingOverlay');
      if (_wlo && _wlo.classList.contains('show')) return;
    } catch (_wl) { wwQuiet(_wl); }
    goTo('page-welcome');
    return;
  }
  const enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  if (isEn) {
    words = enWords;
    if (tw) tw.words = words;
    else if (rw && (rw.enMnemonic || rw.mnemonic)) rw.words = words;
  } else {
    words = enWordsToLangKeyTableWords(enWords, wlKey);
    if (tw) {
      tw.displayLang = keyMnemonicLang;
      tw.mnemonicWordlistKey = wlKey;
      tw.displayWords = words;
      tw.words = words;
    } else if (rw && (rw.enMnemonic || rw.mnemonic)) {
      rw.displayLang = keyMnemonicLang;
      rw.mnemonicWordlistKey = wlKey;
      rw.displayWords = words;
      rw.words = words;
    }
  }
  try {
    const wlen = words.length;
    const wce = document.getElementById('warnWordCount');
    if (wce) wce.textContent = String(wlen);
    // 下拉与 currentMnemonicLength 与当前网格一致（避免已保存钱包词数与 TEMP 展示不一致时 UI 错位）
    if ([12, 15, 18, 21, 24].includes(wlen)) {
      currentMnemonicLength = wlen;
      var _ml = document.getElementById('mnemonicLength');
      if (_ml) {
        _ml.value = String(wlen);
        var _ix = [12, 15, 18, 21, 24].indexOf(wlen);
        if (_ix >= 0) _ml.selectedIndex = _ix;
      }
    }
  } catch (e) { wwQuiet(e); }
  const grid = document.getElementById('keyWordGrid');
  if (!grid) {
    console.warn('[WorldToken] renderKeyGrid: #keyWordGrid not in DOM');
    return;
  }
  grid.innerHTML = '';

  const hint = _safeEl('keyEnHint');
  if(isEn) {
    if(!hint) {
      const h = document.createElement('div');
      h.id = 'keyEnHint';
      h.style.cssText = 'background:rgba(100,150,255,0.08);border:1px solid rgba(100,150,255,0.2);border-radius:12px;padding:10px 14px;margin-bottom:12px;font-size:11px;color:#8aadff;line-height:1.7';
      h.innerHTML = '⛓️ 英文使用 BIP39 标准密钥，兼容所有公链钱包';
      grid.parentNode.insertBefore(h, grid);
    }
  } else {
    if(hint) hint.remove();
  }

  words.forEach((w,i)=>{
    const d=document.createElement('div');
    d.className='key-word fade-up';
    d.style.animationDelay=i*0.04+'s';
    const isSmall = wlKey === 'en';
    const line=document.createElement('div');
    line.className='key-word-line';
    const idx=document.createElement('span');
    idx.className='word-idx';
    idx.textContent=String(i+1).padStart(2,'0')+'.';
    const val=document.createElement('span');
    val.className='word-val';
    val.textContent=w;
    val.style.fontSize=isSmall?'11px':'13px';
    line.appendChild(idx);
    line.appendChild(document.createTextNode(' '));
    line.appendChild(val);
    d.appendChild(line);
    grid.appendChild(d);
  });
  var metaWallet = tw || (rw && (rw.enMnemonic || rw.mnemonic) ? rw : null);
  if (metaWallet) {
    metaWallet.words = words.slice();
  }
  if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
}

function shortChainAddr(addr) {
  if (!addr || addr === '--') return '—';
  const t = String(addr).trim();
  if (t.length <= 12) return t;
  return t.slice(0, 5) + '…' + t.slice(-4);
}
function updateHomeChainStrip() {
  const strip = document.getElementById('homeChainStrip');
  const trxEl = document.getElementById('homeShortTrx');
  const ethEl = document.getElementById('homeShortEth');
  const btcEl = document.getElementById('homeShortBtc');
  const btcWrap = document.getElementById('homeMiniBtcWrap');
  if (!strip || !trxEl || !ethEl) return;
  var wvStrip = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  if (!wvStrip || !wwWalletHasAnyChainAddress(wvStrip)) {
    trxEl.textContent = '—';
    ethEl.textContent = '—';
    if (btcEl) btcEl.textContent = '—';
    if (btcWrap) btcWrap.style.display = 'flex';
    strip.classList.add('home-chain-strip--dim');
    return;
  }
  const trx = wvStrip.trxAddress || '';
  const eth = wvStrip.ethAddress || '';
  const btc = wvStrip.btcAddress || '';
  if (typeof wwCopyableShortChainHtml === 'function') {
    trxEl.innerHTML = wwCopyableShortChainHtml(trx || '--');
    ethEl.innerHTML = wwCopyableShortChainHtml(eth || '--');
    if (btc && btc.length > 2 && btc !== '--') {
      btcEl.innerHTML = wwCopyableShortChainHtml(btc);
    } else {
      btcEl.textContent = '—';
    }
  } else {
    trxEl.textContent = shortChainAddr(trx || '--');
    ethEl.textContent = shortChainAddr(eth || '--');
    if (btc && btc.length > 2 && btc !== '--') {
      btcEl.textContent = shortChainAddr(btc);
    } else {
      btcEl.textContent = '—';
    }
  }
  if (btcWrap) btcWrap.style.display = 'flex';
  strip.classList.remove('home-chain-strip--dim');
}

/* updateHomeBackupBanner、getMnemonicStrengthDisplay、updateMnemonicStrengthIndicator：wallet.runtime.js（后加载；勿在此重复以免与密钥页同源逻辑分叉） */

var currentQRChain = 'native';
var QR_CHAIN_DATA = {
  native: { label:'万语地址', color:'var(--gold)' },
  trx: { label:'TRX 公链地址', color:'#ff9a9a' },
  eth: { label:'ETH 公链地址', color:'#aaaaff' },
  btc: { label:'BTC 公链地址', color:'#ffb84d' },
};

function updateQRDisplay() {
  const isEn = currentLang==='en';
  const p1 = document.getElementById('qrPart1');
  const p2 = document.getElementById('qrPart2');
  if(!p1) return;
  var vwQr = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  const sel = document.getElementById('qrChainSelect');
  const chain = (sel && sel.value) || 'trx';
  const isEth = chain === 'eth';
  var pubRaw = '--';
  if (isEth) {
    pubRaw = (vwQr && vwQr.ethAddress) ? vwQr.ethAddress : '--';
  } else {
    pubRaw = (vwQr && vwQr.trxAddress) ? vwQr.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '--');
  }
  const pubEsc = String(pubRaw).replace(/</g, '&lt;');
  const pubAttr =
    typeof wwEscAttr === 'function'
      ? wwEscAttr(pubRaw)
      : String(pubRaw || '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;');
  const badge = isEth ? 'ETH' : 'TRX';
  const col = isEth ? '#aaaaff' : '#ff9a9a';
  if(isEn) {
    p1.innerHTML =
      '<span data-ww-copy="' +
      pubAttr +
      '" title="点击复制完整地址" style="color:var(--text-muted);font-size:11px;word-break:break-all;cursor:pointer">' +
      pubEsc +
      '</span>';
    if(p2) p2.style.display = 'none';
  } else {
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    let html = '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">'+prefix+'</span>';
    if(ADDR_WORDS.length) {
      ADDR_WORDS.forEach(w => {
        html += w.custom
          ? '<span style="color:#f0d070;font-size:13px;font-weight:700">'+w.word+'</span>'
          : '<span style="color:#8888bb;font-size:12px">'+w.word+'</span>';
      });
    }
    html += '<span style="color:var(--text-muted);font-family:monospace;font-size:11px">'+suffix+'</span>';
    p1.innerHTML = html;
    p1.style.cssText = 'text-align:center;display:block;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    try {
      var natCopy = typeof getNativeAddr === 'function' ? getNativeAddr() : '';
      if (natCopy) {
        p1.setAttribute('data-ww-copy', natCopy);
        p1.setAttribute('title', '点击复制万语地址');
      } else {
        p1.removeAttribute('data-ww-copy');
        p1.removeAttribute('title');
      }
    } catch (_q1) { wwQuiet(_q1); }
    if(p2) {
      p2.innerHTML =
        '<div style="text-align:center;margin-top:8px"><span style="font-size:10px;color:var(--text-muted);letter-spacing:0.5px">' +
        badge +
        ' · 公链地址</span></div><div style="text-align:center;margin-top:4px"><span data-ww-copy="' +
        pubAttr +
        '" title="点击复制完整地址" style="color:' +
        col +
        ';font-size:11px;font-family:monospace;word-break:break-all;line-height:1.45;cursor:pointer">' +
        pubEsc +
        '</span></div>';
      p2.style.display = 'block';
    }
  }
}

/** 构建收款二维码内容（纯地址） */
function wwBuildReceiveQrPayload(chain, addr, amountRaw) {
  if (!addr) return '';
  return addr;
}

function wwGenerateQRCode(text, canvasId) {
  return loadQRCodeLib()
    .then(function () {
      var canvas = document.getElementById(canvasId || 'qrCanvas');
      if (!canvas || !text || typeof QRCode === 'undefined' || !QRCode.toCanvas) return;
      var w = Math.min(canvas.width || 130, 128);
      return QRCode.toCanvas(canvas, text, { width: w, margin: 1 });
    })
    .catch(function (e) {
      console.warn('[QR]', e);
    });
}

/** 根据当前链选择与视图钱包地址生成首页/地址页二维码（含未验证 TEMP 预览） */
function updateQRCode() {
  var vwQ = typeof wwGetChainViewWallet === 'function' ? wwGetChainViewWallet() : null;
  if (!vwQ || !wwWalletHasAnyChainAddress(vwQ)) return;
  var sel = document.getElementById('qrChainSelect');
  var chain = (sel && sel.value) || 'trx';
  var addr = '';
  if (chain === 'trx') addr = vwQ.trxAddress || '';
  else if (chain === 'eth') addr = vwQ.ethAddress || '';
  else if (chain === 'btc' || chain === 'native') addr = vwQ.btcAddress || vwQ.trxAddress || '';
  if (addr) {
    var payload = wwBuildReceiveQrPayload(chain, addr, '');
    wwGenerateQRCode(payload, 'qrCanvas');
  }
  if (typeof updateQRDisplay === 'function') updateQRDisplay();
}

// KEYWORDS_ZH 已迁移到 KW_ZH
// KEYWORDS_EN 已迁移到 KW_EN
// Must not reference KW_ZH here — const KW_ZH is declared later (TDZ).
var currentKeyword = '举头望明月';

function claimHongbao() {
  submitClaim(); // 调用真实领取
}

function copyKeyword() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = event?.target?.closest('div');
  if(btn) { const old = btn.textContent; btn.textContent = '✅ 已复制'; setTimeout(()=>btn.textContent=old, 1500); }
}

/** 返回 null 表示加载中或未知，不得当作 0 用于「隐藏零余额」 */
function parseAssetDisplayBalance(balId) {
  const el = document.getElementById(balId);
  if(!el) return null;
  const t = (el.textContent || '').replace(/,/g,'').trim();
  if(t === '--' || t === '...' || !t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function applyHideZeroTokens() {
  let storedHide = false;
  try { storedHide = localStorage.getItem('ww_hide_zero_tokens') === '1'; } catch (e) { wwQuiet(e); }
  const cb = document.getElementById('hideZeroTokens');
  if (cb) cb.checked = storedHide;
  // 默认展示全部币种；仅当勾选「隐藏零余额」时隐藏数值为 0 的资产行（与 #hideZeroTokens 一致）
  const hide = cb ? !!cb.checked : false;
  var hydrated = typeof window !== 'undefined' && window._wwHomeBalancesHydrated;
  const hideZeros = hide && hydrated;
  var rows =
    typeof wwHomeAssetRowsMeta === 'function'
      ? wwHomeAssetRowsMeta()
      : [
          { id: 'assetRowUsdt', balId: 'balUsdt' },
          { id: 'assetRowUsdtErc', balId: 'balUsdtErc' },
          { id: 'assetRowTrx', balId: 'balTrx' },
          { id: 'assetRowEth', balId: 'balEth' },
          { id: 'assetRowBtc', balId: 'balBtc' },
        ];
  rows.forEach(function(row) {
    const el = document.getElementById(row.id);
    if(!el) return;
    const v = parseAssetDisplayBalance(row.balId);
    if(v === null) { el.style.display = ''; return; }
    el.style.display = (hideZeros && v <= 1e-12) ? 'none' : '';
  });
}

function onHideZeroTokensChange() {
  const cb = document.getElementById('hideZeroTokens');
  try { localStorage.setItem('ww_hide_zero_tokens', cb && cb.checked ? '1' : '0'); } catch (e) { wwQuiet(e); }
  applyHideZeroTokens();
}

function getMnemonicWordsForDisplay() {
  const words = [];
  var wlKey = wwResolveMnemonicWordlistKey();
  const isEn = wlKey === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(function(w) { words.push(w); });
  } else {
    const wl = WT_WORDLISTS[wlKey];
    const enMn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(wl && enMn) {
      enMn.split(' ').forEach(function(enW) {
        const enIdx = WT_WORDLISTS.en.indexOf(enW);
        words.push(enIdx >= 0 && wl[enIdx] ? wl[enIdx] : enW);
      });
    }
  }
  return words;
}

// ── 真实转账实现 ──────────────────────────────────────────────────
function wwFmtNum(n) {
  if(n === undefined || n === null || isNaN(n)) return '0';
  var x = Math.floor(Number(n));
  return x.toLocaleString('en-US');
}
async function loadTrxResource() {
  var card = document.getElementById('trxResourceCard');
  var enEl = document.getElementById('trxEnergyText');
  var bwEl = document.getElementById('trxBandwidthText');
  if(!card || !REAL_WALLET || !REAL_WALLET.trxAddress) { if(card) card.style.display = 'none'; return; }
  try {
    var _trxRootUi = typeof wwTronGridBase === 'function' ? wwTronGridBase() : String(TRON_GRID || '').replace(/\/$/, '') || 'https://api.trongrid.io';
    var r = await (typeof wwFetchRetry === 'function' ? wwFetchRetry : fetch)(_trxRootUi + '/wallet/getaccountresource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: REAL_WALLET.trxAddress, visible: true })
    });
    var d = await r.json();
    if(!d || (d.EnergyLimit === undefined && d.NetLimit === undefined && d.freeNetLimit === undefined)) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';
    var eLim = Number(d.EnergyLimit) || 0, eUsed = Number(d.EnergyUsed) || 0;
    var nLim = Number(d.NetLimit) || 0, nUsed = Number(d.NetUsed) || 0;
    var freeLim = Number(d.freeNetLimit) || 600;
    var freeUsed = Number(d.freeNetUsed) || 0;
    var eRem = Math.max(0, eLim - eUsed);
    var stakeBwRem = Math.max(0, nLim - nUsed);
    var freeBwRem = Math.max(0, freeLim - freeUsed);
    var bwAvail = stakeBwRem + freeBwRem;
    if(enEl) enEl.textContent = '剩余 ' + wwFmtNum(eRem) + ' / 上限 ' + wwFmtNum(eLim);
    if(bwEl) bwEl.textContent = '可用约 ' + wwFmtNum(bwAvail) + '（免费 ' + wwFmtNum(freeBwRem) + ' + 质押 ' + wwFmtNum(stakeBwRem) + '）';
  } catch(e) {
    console.log('loadTrxResource', e);
    if(card) card.style.display = 'none';
  }
}


function wwGetIdleLockMinutes() {
  try {
    var v = localStorage.getItem('ww_lock_idle_min');
    if(v === '1' || v === '5' || v === '15') return parseInt(v, 10);
  } catch (e) { wwQuiet(e); }
  return 0;
}
function wwApplyIdleLockLabel() {
  var el = document.getElementById('settingsIdleLockValue');
  if(!el) return;
  var m = wwGetIdleLockMinutes();
  if(m === 1) el.textContent = '1 分钟';
  else if(m === 5) el.textContent = '5 分钟';
  else if(m === 15) el.textContent = '15 分钟';
  else el.textContent = '关闭';
}

function wwResetActivityClock() {
  window._wwLastActivityTs = Date.now();
}
function wwTickIdleLock() {
  var mins = wwGetIdleLockMinutes();
  if(!mins) return;
  if(!localStorage.getItem('ww_pin')) return;
  if(!REAL_WALLET) return;
  var pov = document.getElementById('pinUnlockOverlay');
  var tov = document.getElementById('totpUnlockOverlay');
  if(pov && pov.classList.contains('show')) return;
  if(tov && tov.classList.contains('show')) return;
  var last = window._wwLastActivityTs || Date.now();
  if(Date.now() - last < mins * 60 * 1000) return;
  window._wwUnlockPreservePage = true;
  window._wwForceIdleLock = true;
  var inp = document.getElementById('pinUnlockInput');
  var err = document.getElementById('pinUnlockError');
  if(pov && inp) {
    inp.value = '';
    if(err) err.style.display = 'none';
    pov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap3) { wwQuiet(_ap3); }
    setTimeout(function() { try { inp.focus(); } catch (e) { wwQuiet(e); } }, 200);
  }
}

if (typeof TRON_GRID === 'undefined') var TRON_GRID = 'https://api.trongrid.io';
var USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
if (typeof ETH_RPC === 'undefined') var ETH_RPC = 'https://rpc.ankr.com/eth';
/** 收款地址类错误统一提示（toast / 页内红字） */
var WW_MSG_ADDR_WRONG = '地址有误，请核对地址';
var WW_MSG_TRANSFER_SELF = '不能给自己转账';

/** 当前币种下收款地址是否为本人链上地址或本人万语（用于禁止自转账） */
function wwIsTransferToSelfForCoin(addr, coinId) {
  var w = typeof REAL_WALLET !== 'undefined' && REAL_WALLET ? REAL_WALLET : null;
  if (!w) return false;
  var a = String(addr || '').trim();
  var id = coinId || 'usdt';
  if (id === 'eth') {
    return !!(w.ethAddress && /^0x[a-fA-F0-9]{40}$/.test(a) && a.toLowerCase() === String(w.ethAddress).toLowerCase());
  }
  if (id === 'btc') {
    return !!(w.btcAddress && a === w.btcAddress);
  }
  if (id === 'usdt' || id === 'trx') {
    if (w.trxAddress && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a) && a === w.trxAddress) return true;
    if (typeof wwIsWanYuTransferAddr === 'function' && wwIsWanYuTransferAddr(a) && typeof wwNormalizeWanYuForTrcBind === 'function') {
      var ownStr = typeof wwGetOwnWanYuStringForTrcPair === 'function' ? wwGetOwnWanYuStringForTrcPair() : '';
      if (ownStr && wwNormalizeWanYuForTrcBind(a) === wwNormalizeWanYuForTrcBind(ownStr)) return true;
    }
    return false;
  }
  return false;
}

// broadcastRealTransfer：唯一实现在 wallet.runtime.js（本文件先加载、runtime 后加载并定义该函数；勿在此重复粘贴以免分叉）

// ══ 转账系统 ══
/** 万语地址：旧式「·」或 8数字-10字-8数字（中段允许任意字符以与链上展示一致） */
function wwIsWanYuTransferAddr(s) {
  var t = String(s || '').trim();
  if (!t) return false;
  if (t.indexOf('·') >= 0) return true;
  if (/^\d{8}-[\s\S]{10}-\d{8}$/.test(t)) return true;
  return /^\d{8}-[\u4e00-\u9fff]{10}-\d{8}$/.test(t);
}

/**
 * 同步校验收款地址是否与当前 transferCoin 链别匹配（优先于金额/余额判断）。
 * @returns {{ ok: boolean, message: string }}
 */
function wwGetTransferRecipientValidation(addr, coinId) {
  var a = String(addr || '').trim();
  var id = coinId || ((typeof transferCoin !== 'undefined' && transferCoin) ? transferCoin.id : 'usdt');
  if (!a) return { ok: false, message: '❌ 请输入收款地址' };
  if (id === 'eth') {
    if (/^T[1-9A-HJ-NP-Za-km-z]/.test(a) || (typeof wwIsWanYuTransferAddr === 'function' && wwIsWanYuTransferAddr(a))) {
      return { ok: false, message: WW_MSG_ADDR_WRONG };
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
      return { ok: false, message: WW_MSG_ADDR_WRONG };
    }
    if (typeof wwIsTransferToSelfForCoin === 'function' && wwIsTransferToSelfForCoin(a, id)) {
      return { ok: false, message: WW_MSG_TRANSFER_SELF };
    }
    return { ok: true, message: '' };
  }
  if (id === 'btc') {
    if (/^0x|^T[1-9A-HJ-NP-Za-km-z]/i.test(a) || (typeof wwIsWanYuTransferAddr === 'function' && wwIsWanYuTransferAddr(a))) {
      return { ok: false, message: WW_MSG_ADDR_WRONG };
    }
    var btcOk = typeof wwIsValidBtcAddress === 'function' ? wwIsValidBtcAddress(a) : /^(bc1|[13])[a-km-zA-HJ-NP-Z0-9]{25,90}$/i.test(a);
    if (!btcOk) {
      return { ok: false, message: WW_MSG_ADDR_WRONG };
    }
    if (typeof wwIsTransferToSelfForCoin === 'function' && wwIsTransferToSelfForCoin(a, id)) {
      return { ok: false, message: WW_MSG_TRANSFER_SELF };
    }
    return { ok: true, message: '' };
  }
  if (id === 'usdt' || id === 'trx') {
    if (/^0x/i.test(a)) {
      return { ok: false, message: WW_MSG_ADDR_WRONG };
    }
    if (typeof wwIsWanYuTransferAddr === 'function' && wwIsWanYuTransferAddr(a)) {
      if (typeof wwIsTransferToSelfForCoin === 'function' && wwIsTransferToSelfForCoin(a, id)) {
        return { ok: false, message: WW_MSG_TRANSFER_SELF };
      }
      return { ok: true, message: '' };
    }
    if (/^T/.test(a)) {
      var trxFmtOk = /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
      if (!trxFmtOk && typeof TronWeb !== 'undefined' && typeof TronWeb.isAddress === 'function') {
        try {
          trxFmtOk = !!TronWeb.isAddress(a);
        } catch (_ti) { wwQuiet(_ti); }
      }
      if (!trxFmtOk) {
        return { ok: false, message: WW_MSG_ADDR_WRONG };
      }
      if (typeof wwIsTransferToSelfForCoin === 'function' && wwIsTransferToSelfForCoin(a, id)) {
        return { ok: false, message: WW_MSG_TRANSFER_SELF };
      }
      return { ok: true, message: '' };
    }
    return { ok: false, message: WW_MSG_ADDR_WRONG };
  }
  return { ok: true, message: '' };
}

function wwRefreshTransferRecipientFeedback() {
  var ta = document.getElementById('transferAddr');
  var box = document.getElementById('transferAddrBox');
  var errEl = document.getElementById('transferAddrValidationMsg');
  var raw = ta ? String(ta.value || '').trim() : '';
  var coinId = (typeof transferCoin !== 'undefined' && transferCoin) ? transferCoin.id : 'usdt';
  if (!raw) {
    if (errEl) {
      errEl.style.display = 'none';
      errEl.textContent = '';
    }
    if (box) box.style.borderColor = 'var(--border)';
    if (typeof wwUpdateTransferPageWanYuTrcHint === 'function') wwUpdateTransferPageWanYuTrcHint();
    return;
  }
  var v = typeof wwGetTransferRecipientValidation === 'function' ? wwGetTransferRecipientValidation(raw, coinId) : { ok: true, message: '' };
  if (!v.ok) {
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = v.message || WW_MSG_ADDR_WRONG;
    }
    if (box) box.style.borderColor = 'rgba(224,92,92,0.5)';
    var wy = document.getElementById('transferWanYuTrcHint');
    if (wy) {
      wy.style.display = 'none';
      wy.textContent = '';
    }
    return;
  }
  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
  if (box) box.style.borderColor = 'rgba(200,168,75,0.4)';
  if (typeof wwUpdateTransferPageWanYuTrcHint === 'function') wwUpdateTransferPageWanYuTrcHint();
}
/** 根据收款栏内容判断：万语 / Tron / 以太坊（用于自动切换余额与币种） */
function wwClassifyTransferRecipientAddr(s) {
  var t = String(s || '').trim();
  if (!t) return 'empty';
  if (wwIsWanYuTransferAddr(t)) return 'ww';
  if (/^0x[a-fA-F0-9]{40}$/.test(t)) return 'erc';
  if (/^0x/i.test(t) && t.length >= 10) return 'erc_partial';
  if (/^T[1-9A-HJ-NP-Za-km-z]{10,}$/.test(t)) return 'trc';
  if (typeof wwIsValidBtcAddress === 'function' && wwIsValidBtcAddress(t)) return 'btc';
  return 'unknown';
}
/** 按收款地址自动将 transferCoin 切到 USDT/TRX（Tron）或 ETH（并同步 COINS 中的余额）；无输入时不改当前币种 */
function wwApplyTransferCoinForRecipientAddr(rawAddr) {
  if (typeof COINS === 'undefined' || !COINS || !COINS.find) return;
  var cls = wwClassifyTransferRecipientAddr(rawAddr);
  if (cls === 'empty' || cls === 'unknown') return;
  var targetId = null;
  if (cls === 'erc' || cls === 'erc_partial') targetId = 'eth';
  else if (cls === 'ww') targetId = 'usdt';
  else if (cls === 'trc') targetId = (transferCoin && transferCoin.id === 'trx') ? 'trx' : 'usdt';
  else if (cls === 'btc') targetId = 'btc';
  if (!targetId) return;
  var c = COINS.find(function (x) { return x && x.id === targetId; });
  if (!c) return;
  transferCoin = {
    id: c.id,
    name: c.name,
    chain: c.chain,
    icon: c.icon,
    logoUrl: c.logoUrl,
    bal: Number(c.bal) || 0,
    price: c.price
  };
}

var transferCoin = {id:'usdt', name:'TRC USDT', chain:'TRC-20 · Tron', icon:'', logoUrl:'https://static.tronscan.org/production/logo/usdtlogo.png', bal:0, price:1};

function selectTransferCoin(coinId) {
  var id = coinId != null ? String(coinId).trim() : '';
  if (!id) return;
  var coin = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (c) { return c && c.id === id; }) : null;
  if (!coin) return;
  transferCoin = {
    id: coin.id,
    name: coin.name,
    chain: coin.chain,
    icon: coin.icon,
    logoUrl: coin.logoUrl,
    bal: coin.bal,
    price: coin.price
  };
  if (typeof goTo === 'function') goTo('page-transfer');
  if (typeof calcTransferFee === 'function') calcTransferFee();
}

window.selectTransferCoin = selectTransferCoin;

var WW_RECENT_ADDR_KEY = 'ww_transfer_recent_addrs';
function getRecentTransferAddrs() {
  try {
    const raw = localStorage.getItem(WW_RECENT_ADDR_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.trim()) : [];
  } catch(e) { return []; }
}
function saveRecentTransferAddr(addr) {
  const t = (addr || '').trim();
  if(!t) return;
  let list = getRecentTransferAddrs().filter(x => x !== t);
  list.unshift(t);
  if(list.length > 24) list = list.slice(0, 24);
  try { localStorage.setItem(WW_RECENT_ADDR_KEY, JSON.stringify(list)); } catch (e) { wwQuiet(e); }
}

var WW_CONTACTS_KEY = 'ww_transfer_contacts';
function getTransferContacts() {
  try {
    const raw = localStorage.getItem(WW_CONTACTS_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => x && typeof x.addr === 'string' && x.addr.trim() && typeof x.nick === 'string') : [];
  } catch(e) { return []; }
}
function setTransferContacts(list) {
  try { localStorage.setItem(WW_CONTACTS_KEY, JSON.stringify(list.slice(0, 48))); } catch (e) { wwQuiet(e); }
}

function removeTransferContact(addr) {
  const t = (addr || '').trim().toLowerCase();
  if(!t) return;
  setTransferContacts(getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== t));
  if (typeof wwRefreshAddressBookLists === 'function') wwRefreshAddressBookLists();
  else renderTransferContactsList();
}

/** 设置页与转账页联系人列表共用同一存储，任一处变更后刷新两处 UI */
function wwRefreshAddressBookLists() {
  try { if (typeof renderTransferContactsList === 'function') renderTransferContactsList(); } catch (_r) { wwQuiet(_r); }
  try { if (typeof renderAddressBookSettingsList === 'function') renderAddressBookSettingsList(); } catch (_a) { wwQuiet(_a); }
}

function wwGoToTransferWithAddr(addr) {
  var a = String(addr || '').trim();
  if (!a) return;
  try {
    if (typeof pickTransferAddrFromBookRaw === 'function') {
      pickTransferAddrFromBookRaw(a);
    } else {
      var ta = document.getElementById('transferAddr');
      if (ta) ta.value = a;
      try { if (typeof hideTransferAddrBook === 'function') hideTransferAddrBook(); } catch (e0) { wwQuiet(e0); }
      try { if (typeof detectAddrType === 'function') detectAddrType(); } catch (e1) { wwQuiet(e1); }
    }
  } catch (e) { wwQuiet(e); }
  try {
    if (typeof goTo === 'function') goTo('page-transfer');
  } catch (e2) { wwQuiet(e2); }
}

/** 将条目载入上方表单；保存时若修改了地址，会替换原条目（由 #addrBookEditOriginal 记录原地址） */
function wwStartEditAddressBookEntry(addr, nick) {
  var nickEl = document.getElementById('addrBookNickInput');
  var addrEl = document.getElementById('addrBookAddrInput');
  var origEl = document.getElementById('addrBookEditOriginal');
  if (origEl) origEl.value = String(addr || '').trim();
  if (addrEl) addrEl.value = String(addr || '').trim();
  if (nickEl) nickEl.value = String(nick || '').trim();
  try {
    if (addrEl) addrEl.focus();
  } catch (e) { wwQuiet(e); }
  try {
    var sc = document.querySelector('#page-address-book .u14');
    if (sc) sc.scrollTop = 0;
  } catch (e2) { wwQuiet(e2); }
  if (typeof showToast === 'function') showToast('可修改备注或地址，完成后点「保存」', 'info', 2800);
}

function wwClearAddressBookDraft() {
  var nickEl = document.getElementById('addrBookNickInput');
  var addrEl = document.getElementById('addrBookAddrInput');
  var origEl = document.getElementById('addrBookEditOriginal');
  if (nickEl) nickEl.value = '';
  if (addrEl) addrEl.value = '';
  if (origEl) origEl.value = '';
}

function renderAddressBookSettingsList() {
  const box = document.getElementById('addrBookSettingsList');
  if (!box) return;
  const searchEl = document.getElementById('addrBookListSearch');
  const q = searchEl ? String(searchEl.value || '').trim().toLowerCase() : '';
  const all = getTransferContacts();
  const total = all.length;
  let list = all;
  if (q) {
    list = all.filter(function (c) {
      var nick = (c.nick || '').toLowerCase();
      var addr = (c.addr || '').toLowerCase();
      return nick.indexOf(q) >= 0 || addr.indexOf(q) >= 0;
    });
  }
  const countEl = document.getElementById('addrBookListCount');
  if (countEl) {
    if (!total) countEl.textContent = '共 0 条';
    else if (q) countEl.textContent = '显示 ' + list.length + ' / ' + total + ' 条';
    else countEl.textContent = '共 ' + total + ' 条';
  }
  if (!total) {
    box.innerHTML = '<div class="addr-book-settings-empty">暂无条目，请在下方「添加或编辑」中保存</div>';
    return;
  }
  if (!list.length) {
    box.innerHTML = '<div class="addr-book-settings-empty">无匹配条目，请调整搜索关键词</div>';
    return;
  }
  box.innerHTML = '';
  list.forEach(function (c) {
    const row = document.createElement('div');
    row.className = 'addr-book-settings-row';
    const main = document.createElement('div');
    main.className = 'addr-book-settings-main';
    main.setAttribute('role', 'button');
    main.tabIndex = 0;
    main.onclick = function () {
      if (typeof wwGoToTransferWithAddr === 'function') wwGoToTransferWithAddr(c.addr);
    };
    main.onkeydown = function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (typeof wwGoToTransferWithAddr === 'function') wwGoToTransferWithAddr(c.addr);
      }
    };
    const nick = document.createElement('div');
    nick.className = 'addr-book-settings-nick';
    nick.textContent = c.nick || '未命名';
    const ad = document.createElement('div');
    ad.className = 'addr-book-settings-addr';
    ad.textContent = c.addr;
    ad.title = c.addr;
    main.appendChild(nick);
    main.appendChild(ad);
    const actions = document.createElement('div');
    actions.className = 'addr-book-settings-actions';
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'addr-book-settings-edit';
    editBtn.textContent = '编辑';
    editBtn.onclick = function (e) {
      e.stopPropagation();
      if (typeof wwStartEditAddressBookEntry === 'function') wwStartEditAddressBookEntry(c.addr, c.nick);
    };
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'addr-book-settings-del';
    del.textContent = '删除';
    del.onclick = function (e) {
      e.stopPropagation();
      if (typeof removeTransferContact === 'function') removeTransferContact(c.addr);
    };
    actions.appendChild(editBtn);
    actions.appendChild(del);
    row.appendChild(main);
    row.appendChild(actions);
    box.appendChild(row);
  });
}

function wwAddAddressBookFromSettings() {
  var nickEl = document.getElementById('addrBookNickInput');
  var addrEl = document.getElementById('addrBookAddrInput');
  var origEl = document.getElementById('addrBookEditOriginal');
  var addr = addrEl ? String(addrEl.value || '').trim() : '';
  var nick = nickEl ? String(nickEl.value || '').trim() : '';
  if (!addr) {
    if (typeof showToast === 'function') showToast('请填写地址', 'error');
    return;
  }
  if (!nick) nick = '未命名';
  nick = nick.slice(0, 32);
  var origRaw = origEl ? String(origEl.value || '').trim() : '';
  var origNorm = origRaw.toLowerCase();
  var newNorm = addr.toLowerCase();
  var isEdit = !!origNorm;
  var list = getTransferContacts().filter(function (c) {
    var ca = c.addr.trim().toLowerCase();
    if (origNorm && ca === origNorm) return false;
    if (ca === newNorm) return false;
    return true;
  });
  list.unshift({ addr: addr, nick: nick });
  setTransferContacts(list);
  if (addrEl) addrEl.value = '';
  if (nickEl) nickEl.value = '';
  if (origEl) origEl.value = '';
  wwRefreshAddressBookLists();
  if (typeof showToast === 'function') {
    if (isEdit) {
      if (newNorm === origNorm) showToast('备注已更新', 'success');
      else showToast('地址已更新', 'success');
    } else {
      showToast('已保存到地址簿', 'success');
    }
  }
}


function renderTransferContactsList() {
  const box = document.getElementById('transferContactsList');
  if(!box) return;
  const list = getTransferContacts();
  if(!list.length) {
    box.innerHTML = '<div class="transfer-contact-empty">暂无联系人，点「添加」保存常用地址</div>';
    return;
  }
  box.innerHTML = '';
  list.forEach(c => {
    const row = document.createElement('div');
    row.className = 'transfer-contact-row';
    row.onclick = function(e) {
      if(e.target && e.target.classList && e.target.classList.contains('transfer-contact-del')) return;
      pickTransferAddrFromBookRaw(c.addr);
    };
    const nick = document.createElement('div');
    nick.className = 'transfer-contact-nick';
    nick.textContent = c.nick;
    const ad = document.createElement('div');
    ad.className = 'transfer-contact-addr';
    const ca = c.addr;
    ad.textContent = ca.length > 22 ? ca.slice(0, 10) + '…' + ca.slice(-8) : ca;
    ad.title = ca;
    const del = document.createElement('span');
    del.className = 'transfer-contact-del';
    del.textContent = '删除';
    del.onclick = function(e) { e.stopPropagation(); removeTransferContact(c.addr); };
    row.appendChild(nick);
    row.appendChild(ad);
    row.appendChild(del);
    box.appendChild(row);
  });
}
function addrBookShort(addr) {
  const s = (addr || '').trim();
  if(s.length <= 16) return s;
  return s.slice(0, 8) + '…' + s.slice(-6);
}

function setTransferFeeSpeed(speed) {
  if(speed !== 'slow' && speed !== 'normal' && speed !== 'fast') speed = 'normal';
  try { localStorage.setItem('ww_transfer_fee_speed', speed); } catch (e) { wwQuiet(e); }
  document.querySelectorAll('.ww-speed-btn').forEach(function(b) {
    const on = b.getAttribute('data-speed') === speed;
    b.classList.toggle('ww-speed-btn--active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if(typeof calcTransferFee === 'function') calcTransferFee();
}
function initTransferFeeSpeedUI() {
  setTransferFeeSpeed(getTransferFeeSpeed());
}
function getTronFeeLimitUsdt() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 15000000;
  if(sp === 'fast') return 50000000;
  return 20000000;
}
function getTronFeeLimitTrx() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 10000000;
  if(sp === 'fast') return 45000000;
  return 25000000;
}
function transferSpeedHint(coinId, sp) {
  const m = {
    usdt: { slow: '经济 · 约 1–3 分钟', normal: '标准 · 约 30 秒', fast: '快速 · 约 15–45 秒' },
    trx: { slow: '经济 · 约 1–2 分钟', normal: '标准 · 约 1 分钟', fast: '快速 · 约 20–40 秒' },
    eth: { slow: '经济 · 约 5–15 分钟', normal: '标准 · 约 2–5 分钟', fast: '快速 · 约 30–90 秒' },
    btc: { slow: '经济', normal: '标准', fast: '快速' }
  };
  return ((m[coinId] || m.usdt)[sp]) || m.usdt.normal;
}
var _wwTickerInterval = null;
async function refreshHomePriceTicker() {
  try {
    const r = await (typeof wwFetchCoinGecko === 'function'
      ? wwFetchCoinGecko('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
      : fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'));
    const d = await r.json();
    const fmt = function(x) {
      if(x === undefined || x === null || !isFinite(x)) return '—';
      return x < 10 ? x.toFixed(4) : x.toLocaleString('en', { maximumFractionDigits: 2 });
    };
    const ust = fmt(d.tether && d.tether.usd);
    try {
      window._wwLastCgUsd = Object.assign({}, window._wwLastCgUsd || {}, {
        usdt: d.tether && d.tether.usd
      });
    } catch (_cg) { wwQuiet(_cg); }
    const html = 'TRC USDT <strong>$' + ust + '</strong>';
    const a = document.getElementById('wwTickerTextA');
    const b = document.getElementById('wwTickerTextB');
    if(a) a.innerHTML = html;
    if(b) b.innerHTML = html;
    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 45000);
    }
    try { if (typeof wwCheckPriceAlertsAfterTicker === 'function') wwCheckPriceAlertsAfterTicker(d); } catch (_pa) { wwQuiet(_pa); }
  } catch (e) { wwQuiet(e); }
}

function wwPopulatePriceAlertForm() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_price_alerts_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwAlertEnable');
  if (en) en.checked = !!o.enabled;
  ['btc', 'eth', 'trx', 'usdt'].forEach(function (k) {
    var K = k.charAt(0).toUpperCase() + k.slice(1);
    var c = o[k] || {};
    var a = document.getElementById('wwAlert' + K + 'Above');
    var b = document.getElementById('wwAlert' + K + 'Below');
    if (a) a.value = c.above && c.above > 0 ? String(c.above) : '';
    if (b) b.value = c.below && c.below > 0 ? String(c.below) : '';
  });
}

function wwCheckPriceAlertsAfterTicker(d) {
  try {
    var cfg = JSON.parse(localStorage.getItem('ww_price_alerts_v1') || '{}');
    if (!cfg || !cfg.enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    var map = [
      { key: 'btc', name: 'BTC', get: function (z) { return z.bitcoin && z.bitcoin.usd; } },
      { key: 'eth', name: 'ETH', get: function (z) { return z.ethereum && z.ethereum.usd; } },
      { key: 'trx', name: 'TRX', get: function (z) { return z.tron && z.tron.usd; } },
      { key: 'usdt', name: 'TRC USDT', get: function (z) { return z.tether && z.tether.usd; } }
    ];
    var prev = window._wwAlertPricePrev || {};
    map.forEach(function (m) {
      var p = m.get(d);
      if (p == null || !isFinite(p)) return;
      var c = cfg[m.key] || {};
      var pr = prev[m.key];
      if (pr != null && isFinite(pr)) {
        if (c.above > 0 && pr < c.above && p >= c.above) {
          new Notification('WorldToken 价格提醒', { body: m.name + ' 已涨至 $' + Number(p).toFixed(4), tag: 'ww-pa-' + m.key + '-hi' });
        }
        if (c.below > 0 && pr > c.below && p <= c.below) {
          new Notification('WorldToken 价格提醒', { body: m.name + ' 已跌至 $' + Number(p).toFixed(4), tag: 'ww-pa-' + m.key + '-lo' });
        }
      }
      prev[m.key] = p;
    });
    window._wwAlertPricePrev = prev;
  } catch (e) { wwQuiet(e); }
}

function updateYieldFarmTracker(parts, total) {
  var el = document.getElementById('wwYieldFarmBody');
  if (!el) return;
  if (!total || total <= 1e-9) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px">暂无持仓估值，无法估算质押收益。</div>';
    return;
  }
  var apy = { 'TRC USDT': 4.2, 'USDT (ERC-20)': 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var estYr = 0;
  var rows = [];
  parts.forEach(function (p) {
    if (p.v <= 0) return;
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    estYr += p.v * (a / 100);
    var dailyUsd = p.v * (a / 100) / 365;
    var pct = total > 0 ? (100 * p.v / total).toFixed(1) : '0';
    rows.push(
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)"><span>'
        + p.l
        + ' <span style="color:var(--text-muted);font-size:10px">参考 APY '
        + a.toFixed(1)
        + '%</span></span><span style="text-align:right;font-size:11px;color:var(--text)">日收益 ~$'
        + dailyUsd.toFixed(4)
        + '<br/><span style="font-size:10px;color:var(--text-muted)">占比 '
        + pct
        + '%</span></span></div>'
    );
  });
  rows.unshift(
    '<div style="font-size:11px;color:var(--green,#26a17b);margin-bottom:4px">组合参考年化（示意） ≈ $'
      + estYr.toFixed(2)
      + ' · 估算日收益 ≈ $'
      + (estYr / 365).toFixed(4)
      + '</div>'
  );
  el.innerHTML = rows.join('');
}

function wwNormalizeAddrForWhitelist(a) {
  a = String(a || '').trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return a.toLowerCase();
  return a;
}

function wwTransferWhitelistCheck(rawAddr) {
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (!o || !o.enabled) return true;
    var list = (Array.isArray(o.addresses) ? o.addresses : []).map(wwNormalizeAddrForWhitelist);
    var n = wwNormalizeAddrForWhitelist(rawAddr);
    return list.indexOf(n) >= 0;
  } catch (e) { return true; }
}

var WW_DAO_PROPOSALS = [
  { id: 'p1', title: '是否将默认滑点提示调整为 0.5%？', summary: '减少新手因滑点过小导致的失败交易（示意）。' },
  { id: 'p2', title: '是否在设置中默认开启隐私模式？', summary: '首屏隐藏余额，需长按或 PIN 查看（示意）。' },
  { id: 'p3', title: '是否增加 TRX Gas 不足时的弹窗提醒？', summary: '当 TRX 余额低于阈值时强提醒（示意）。' }
];

function computeWalletReputationScore() {
  var txs = (typeof window._wwTxHistoryCache !== 'undefined' && window._wwTxHistoryCache) ? window._wwTxHistoryCache : [];
  var nTx = Array.isArray(txs) ? Math.min(txs.length, 200) : 0;
  var sec = (typeof getWalletSecurityBreakdown === 'function') ? getWalletSecurityBreakdown() : { score: 0 };
  var secScore = Math.min(100, Math.max(0, sec.score | 0));
  var votes = wwDaoGetVotes();
  var voteCount = 0;
  try {
    Object.keys(votes).forEach(function (k) { if (votes[k]) voteCount++; });
  } catch (e) { wwQuiet(e); }
  var activityPts = Math.min(35, Math.floor(nTx * 1.2));
  var securityPts = Math.round(secScore * 0.45);
  var daoPts = Math.min(25, voteCount * 8);
  var raw = activityPts + securityPts + daoPts;
  var total = Math.min(100, Math.max(0, raw));
  return { total: total, activityPts: activityPts, securityPts: securityPts, daoPts: daoPts, nTx: nTx, secScore: secScore, voteCount: voteCount };
}

function updateReputationSettingsRow() {
  var r = computeWalletReputationScore();
  var el = document.getElementById('wwReputationSettingsValue');
  if (el) el.textContent = r.total + ' 分';
}

var WW_LENDING_MARKETS = [
  { asset: 'TRC USDT', chain: 'TRON', supplyApy: '3.8%', borrowApr: '5.2%', color: '#26a17b' },
  { asset: 'USDC', chain: 'Ethereum', supplyApy: '4.1%', borrowApr: '5.9%', color: '#2775ca' },
  { asset: 'ETH', chain: 'Ethereum', supplyApy: '2.4%', borrowApr: '3.6%', color: '#627eea' },
  { asset: 'TRX', chain: 'TRON', supplyApy: '1.9%', borrowApr: '4.0%', color: '#ff0013' }
];

function wwOptionsSpotPrice(u) {
  var map = { ETH: 3200, BTC: 64000, TRX: 0.13 };
  return map[u] || 1;
}

function wwOptionsPopulate() {
  var uEl = document.getElementById('wwOptUnderlying');
  var sEl = document.getElementById('wwOptSide');
  var kEl = document.getElementById('wwOptStrike');
  var dEl = document.getElementById('wwOptDays');
  var qEl = document.getElementById('wwOptQty');
  var prem = document.getElementById('wwOptPremiumEst');
  var ex = document.getElementById('wwOptExplain');
  var u = uEl ? String(uEl.value || 'ETH') : 'ETH';
  var side = sEl ? String(sEl.value || 'call') : 'call';
  var S = wwOptionsSpotPrice(u);
  var K = parseFloat(kEl && kEl.value) || S;
  var days = Math.max(1, parseInt(dEl && dEl.value, 10) || 30);
  var qty = Math.max(0.001, parseFloat(qEl && qEl.value) || 1);
  var t = days / 365;
  var vol = 0.65;
  var intrinsic = side === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  var timeVal = S * vol * Math.sqrt(t) * 0.4;
  var unit = intrinsic + timeVal;
  var total = unit * qty;
  if (prem) prem.textContent = (total < 0.01 ? total.toFixed(6) : total.toFixed(2)) + ' TRC USDT';
  if (ex) ex.textContent = '现货参考 ' + (u === 'TRX' ? S.toFixed(5) : S.toLocaleString(undefined, { maximumFractionDigits: 2 })) + ' USD · 简化波动率模型，非 Deribit / 链上期权报价。';
}

var WW_YIELD_AGG_PROTOCOLS = ['Aave V3', 'Compound V3', 'Venus'];

var WW_LAUNCHPAD_PROJECTS = [
  { name: 'DemoLayer', chain: 'ETH', date: '2026-04-18', allocation: '500 TRC USDT', status: '即将开始' },
  { name: 'TronBoost', chain: 'TRON', date: '2026-04-22', allocation: '2,000 TRX', status: '白名单' },
  { name: 'MetaVault', chain: 'BSC', date: '2026-05-01', allocation: 'TBD', status: '筹备中' }
];

var WW_SOCIAL_LEADERBOARD_DEMO = [
  { addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', label: 'AlphaVault', roi: 42.3, win: 68 },
  { addr: 'TXYZopYRdj2D9XRtbG411XZZ3kMfsVk8Q6', label: 'TronWhale', roi: 28.1, win: 55 },
  { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', roi: 19.4, win: 52 }
];

function wwOnchainMessagingPopulate() {
  var el = document.getElementById('wwOnchainMsgPreview');
  if (el) el.textContent = '';
}

function drawPortfolioPieChart(trcUsdtUsd, ercUsdtUsd, trxUsd, ethUsd, btcUsd) {
  const card = document.getElementById('wwPortfolioPieCard');
  const c = document.getElementById('portfolioPieCanvas');
  const leg = document.getElementById('portfolioPieLegend');
  if(!card || !c || !leg) return;
  const parts = [
    { v: Number(trcUsdtUsd) || 0, c: '#26a17b', l: 'TRC USDT' },
    { v: Number(ercUsdtUsd) || 0, c: '#3d9a72', l: 'USDT (ERC-20)' },
    { v: Number(trxUsd) || 0, c: '#ff4d4d', l: 'TRX' },
    { v: Number(ethUsd) || 0, c: '#627eea', l: 'ETH' },
    { v: Number(btcUsd) || 0, c: '#f7931a', l: 'BTC' }
  ];
  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  try { window._wwLastPortfolioParts = parts; window._wwLastPortfolioTotal = total; } catch (_wp) { wwQuiet(_wp); }
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch (_r) { wwQuiet(_r); } try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch (_y0) { wwQuiet(_y0); } return; }
  card.style.display = 'block';
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  let ang = -Math.PI / 2;
  parts.forEach(function(p) {
    if(p.v <= 0) return;
    const slice = (p.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang, ang + slice);
    ctx.closePath();
    ctx.fillStyle = p.c;
    ctx.fill();
    ang += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = '#0f0f18';
  ctx.fill();
  let htm = '';
  parts.forEach(function(p) {
    const pct = total > 0 ? (100 * p.v / total).toFixed(1) : '0';
    htm += '<div><span><span class="ww-pie-dot" style="background:' + p.c + '"></span>' + p.l + '</span><span>' + pct + '%</span></div>';
  });
  leg.innerHTML = htm;
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) { wwQuiet(_rb); }
  try { if (typeof updateYieldFarmTracker === 'function') updateYieldFarmTracker(parts, total); } catch (_yf) { wwQuiet(_yf); }
}
function getNetworkFeeEstimateLines(coinId) {
  const sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
  const tail = '以链上为准';
  const usdtMap = {
    slow: { line: '矿工费约 6.8–13.4 TRX', sub: tail },
    normal: { line: '矿工费约 6.8–13.4 TRX', sub: tail },
    fast: { line: '矿工费约 6.8–13.4 TRX', sub: tail }
  };
  const trxMap = {
    slow: { line: '矿工费约 0–1.1 TRX', sub: tail },
    normal: { line: '矿工费约 0–1.1 TRX', sub: tail },
    fast: { line: '矿工费约 0–1.1 TRX', sub: tail }
  };
  const ethG = { slow: '~26–30 Gwei', normal: '~35 Gwei', fast: '~42–50 Gwei' };
  const ethMap = {
    slow: { line: '矿工费 ' + ethG.slow + '（ETH）', sub: tail },
    normal: { line: '矿工费 ' + ethG.normal + '（ETH）', sub: tail },
    fast: { line: '矿工费 ' + ethG.fast + '（ETH）', sub: tail }
  };
  const btcMap = {
    slow: { line: '矿工费按网络实时计算', sub: tail },
    normal: { line: '矿工费按网络实时计算', sub: tail },
    fast: { line: '矿工费按网络实时计算', sub: tail }
  };
  if (coinId === 'trx') return trxMap[sp] || trxMap.normal;
  if (coinId === 'eth') return ethMap[sp] || ethMap.normal;
  if (coinId === 'btc') return btcMap[sp] || btcMap.normal;
  return usdtMap[sp] || usdtMap.normal;
}

function hideTransferAddrBook() {
  const box = document.getElementById('transferAddrBook');
  if(box) box.style.display = 'none';
}
function pickTransferAddrFromBookRaw(addr) {
  const ta = document.getElementById('transferAddr');
  if(ta) ta.value = addr;
  hideTransferAddrBook();
  detectAddrType();
}

function shakeTransferAmountTooHigh() {
  const el = document.getElementById('transferAmountBox');
  if(!el) return;
  el.classList.remove('wt-transfer-shake');
  void el.offsetWidth;
  el.classList.add('wt-transfer-shake');
}

function detectAddrType() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? ta.value.trim() : '';
  const box = document.getElementById('transferAddrBox');
  if (!addr) {
    if (box) box.style.borderColor = 'var(--border)';
    calcTransferFee();
    return;
  }
  if (box) box.style.borderColor = 'rgba(200,168,75,0.4)';
  calcTransferFee();
}

function checkTransferReady() {
  const addr = document.getElementById('transferAddr') && document.getElementById('transferAddr').value.trim();
  const amt = parseFloat(document.getElementById('transferAmount') && document.getElementById('transferAmount').value) || 0;
  const btn = document.getElementById('transferBtn');
  const feeRow = document.getElementById('transferFeeRow');
  if (feeRow) {
    if (addr || amt > 0) feeRow.style.display = 'block';
    else feeRow.style.display = 'none';
  }
  if (!btn) return;
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';
}

function calcTransferFee() {
  try {
    var _ta = document.getElementById('transferAddr');
    wwApplyTransferCoinForRecipientAddr(_ta ? String(_ta.value || '').trim() : '');
  } catch (_e0) { wwQuiet(_e0); }
  try {
    var uc = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === transferCoin.id; });
    if (uc) { transferCoin.bal = uc.bal; transferCoin.price = uc.price; }
  } catch (_e) { wwQuiet(_e); }
  const amtEl = document.getElementById('transferAmount');
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const coinData = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function (c) { return c.id === transferCoin.id; }) : null;
  const price = (coinData && coinData.price) || transferCoin.price || 1;
  const nf = getNetworkFeeEstimateLines(transferCoin.id);
  const hintEl = document.getElementById('transferFeeHint');
  const netEl = document.getElementById('transferNetworkFee');
  const gasLineEl = document.getElementById('transferGasFeeLine');
  var _nfOne = nf.sub ? nf.line + ' · ' + nf.sub : nf.line;
  if (netEl) netEl.textContent = _nfOne;
  if (gasLineEl) gasLineEl.textContent = _nfOne;
  const balEl = document.getElementById('transferBal');
  if (balEl) {
    var b = Number(transferCoin.bal) || 0;
    balEl.textContent = (isFinite(b) ? b : 0).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
  var amtLbl = document.getElementById('transferAmountLabel');
  if (amtLbl) {
    if (transferCoin.id === 'eth') amtLbl.textContent = '金额（ETH · Ethereum）';
    else if (transferCoin.id === 'trx') amtLbl.textContent = '金额（TRX · Tron）';
    else if (transferCoin.id === 'btc') amtLbl.textContent = '金额（BTC · Bitcoin）';
    else amtLbl.textContent = '金额（TRC USDT）';
  }
  var balSuf = document.getElementById('transferBalSuffix');
  if (balSuf) balSuf.textContent = transferCoin.name || '';
  const usdToCny = 7.24;
  const cnyEl = document.getElementById('transferCNY');
  const feeEl = document.getElementById('transferFee');
  const actEl = document.getElementById('transferActual');
  const usdEl = document.getElementById('transferUSD');
  const chainEl = document.getElementById('transferChain');
  if (amt <= 0) {
    if (feeEl) feeEl.textContent = '—';
    if (actEl) actEl.textContent = '—';
    if (usdEl) usdEl.textContent = '$0.00';
    if (cnyEl) cnyEl.textContent = '0.00';
    if (hintEl) {
      hintEl.textContent = _nfOne;
    }
  } else {
    var dec = transferCoin.id === 'eth' ? 6 : transferCoin.id === 'btc' ? 8 : 4;
    const actual = amt.toFixed(dec);
    if (feeEl) feeEl.textContent = nf.line;
    if (actEl) actEl.textContent = actual + ' ' + transferCoin.name;
    if (usdEl) usdEl.textContent = '$' + (amt * price).toFixed(2);
    if (cnyEl) cnyEl.textContent = (amt * price * usdToCny).toFixed(2);
    if (hintEl) {
      hintEl.textContent = nf.line + '（Gas，不从转账金额扣）· 到账 ' + actual + ' ' + transferCoin.name;
    }
  }
  const _spd = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  if (chainEl) chainEl.textContent = transferCoin.chain + ' · ' + (typeof transferSpeedHint === 'function' ? transferSpeedHint(transferCoin.id, _spd) : '约30秒');
  checkTransferReady();
  try { if (typeof wwRefreshTransferRecipientFeedback === 'function') wwRefreshTransferRecipientFeedback(); } catch (_wh) { wwQuiet(_wh); }
  try { if (typeof wwUpdateTxSimulation === 'function') wwUpdateTxSimulation(); } catch (_ws) { wwQuiet(_ws); }
}

function wwGasManagerRender() {
  var trxCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='trx'; }) : null;
  var ethCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='eth'; }) : null;
  var tc = document.getElementById('wwGasTrxCurrent');
  var ec = document.getElementById('wwGasEthCurrent');
  if(tc) tc.textContent = trxCoin && trxCoin.bal != null ? Number(trxCoin.bal).toFixed(4) : '—';
  if(ec) ec.textContent = ethCoin && ethCoin.bal != null ? Number(ethCoin.bal).toFixed(6) : '—';
  var ti = document.getElementById('wwGasTrxTarget');
  var ei = document.getElementById('wwGasEthTarget');
  var st = localStorage.getItem('ww_gas_target_trx');
  var se = localStorage.getItem('ww_gas_target_eth');
  if(ti && (st==null || st==='')) { ti.value = '50'; localStorage.setItem('ww_gas_target_trx','50'); }
  else if(ti && st) ti.value = st;
  if(ei && (se==null || se==='')) { ei.value = '0.02'; localStorage.setItem('ww_gas_target_eth','0.02'); }
  else if(ei && se) ei.value = se;
  var tt = parseFloat(ti && ti.value) || 50;
  var et = parseFloat(ei && ei.value) || 0.02;
  var bt = trxCoin ? Number(trxCoin.bal) || 0 : 0;
  var be = ethCoin ? Number(ethCoin.bal) || 0 : 0;
  var stEl = document.getElementById('wwGasStatus');
  if(stEl) {
    var okT = bt >= tt * 0.85;
    var okE = be >= et * 0.85;
    stEl.textContent = okT && okE
      ? '✓ 用于支付矿工费的 TRX/ETH 相对充足（示意）。'
      : '⚠ 建议多留 TRX/ETH 以支付矿工费（示意）。当前 TRX: ' + bt.toFixed(2) + ' / 目标 ' + tt + ' · ETH: ' + be.toFixed(4) + ' / 目标 ' + et;
    stEl.style.borderColor = okT && okE ? 'rgba(38,161,123,0.35)' : 'rgba(200,120,80,0.4)';
  }
}

function wwUpdateTxSimulation() {
  var host = document.getElementById('wwTxSimulateBody');
  if(!host) return;
  var amtEl = document.getElementById('transferAmount');
  var addrEl = document.getElementById('transferAddr');
  var amt = amtEl ? parseFloat(amtEl.value) || 0 : 0;
  var addr = addrEl ? String(addrEl.value || '').trim() : '';
  var coin = (typeof transferCoin !== 'undefined' && transferCoin) ? transferCoin : { name:'?', chain:'?' };
  var nf = (typeof getNetworkFeeEstimateLines === 'function') ? getNetworkFeeEstimateLines(coin.id) : { line:'—', sub:'' };
  var mev = (localStorage.getItem('ww_mev_private') === '1');
  var lines = [];
  lines.push('操作: 转账 ' + (amt > 0 ? amt : 0) + ' ' + (coin.name || '') + ' → ' + (addr || '（未填地址）'));
  lines.push('网络: ' + (coin.chain || '—'));
  lines.push('矿工费: ' + (nf.sub ? nf.line + ' · ' + nf.sub : nf.line));
  lines.push('MEV 路由: ' + (mev ? '私有中继（示意）' : '公开内存池'));
  lines.push('风险: 请再次核对地址与金额；本预览不保证与链上结果一致。');
  host.textContent = lines.join('\n');
}

function openTransferCoinPicker() {
  var el = document.getElementById('transferCoinOverlay');
  if (el) el.classList.add('show');
}

function closeTransferCoinPicker() {
  var el = document.getElementById('transferCoinOverlay');
  if (el) el.classList.remove('show');
}

function doTransfer() {
  var ta = document.getElementById('transferAddr');
  var amtInp = document.getElementById('transferAmount');
  var addr = ta ? ta.value.trim() : '';
  var amtRaw = amtInp ? amtInp.value : '';
  if (!addr) { if (typeof showToast === 'function') showToast('❌ 请输入收款地址', 'error'); return; }
  var coinPre = transferCoin.id;
  var addrChk = typeof wwGetTransferRecipientValidation === 'function' ? wwGetTransferRecipientValidation(addr, coinPre) : { ok: true, message: '' };
  if (!addrChk.ok) {
    if (typeof showToast === 'function') showToast(addrChk.message || WW_MSG_ADDR_WRONG, 'error');
    return;
  }
  if ((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    if (typeof showToast === 'function') showToast('📡 当前无网络，无法完成转账', 'warning');
    return;
  }
  var amtPre = typeof wwParsePositiveAmount === 'function'
    ? wwParsePositiveAmount(amtRaw, 1e12)
    : NaN;
  if (typeof wwParsePositiveAmount !== 'function') {
    var _pf = parseFloat(amtRaw);
    amtPre = (isFinite(_pf) && _pf > 0) ? _pf : NaN;
  }
  if (!isFinite(amtPre) || amtPre <= 0) { if (typeof showToast === 'function') showToast('❌ 请输入有效转账金额', 'error'); return; }
  var amtNum = amtPre;
  var bal = Number(transferCoin.bal) || 0;
  if (bal < amtNum) { if (typeof showToast === 'function') showToast('❌ 余额不足', 'error'); shakeTransferAmountTooHigh(); return; }
  if (!REAL_WALLET) { if (typeof showToast === 'function') showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  if (typeof wwSpendGateBeforeConfirm === 'function') {
    var _g = wwSpendGateBeforeConfirm(amtNum);
    if (_g === false) return;
  }
  var _dec = transferCoin.id === 'eth' ? 6 : transferCoin.id === 'btc' ? 8 : 4;
  var _nf = getNetworkFeeEstimateLines(transferCoin.id);
  var _gasTxt = _nf.line + (_nf.sub ? ' · ' + _nf.sub : '');
  var ca = document.getElementById('confirmAmount');
  var cr = document.getElementById('confirmRecipient');
  var cf = document.getElementById('confirmFee');
  var cact = document.getElementById('confirmActual');
  var cch = document.getElementById('confirmChain');
  if (ca) ca.textContent = amtRaw + ' ' + transferCoin.name;
  if (cr) {
    if (typeof wwSetConfirmRecipientCopyable === 'function') wwSetConfirmRecipientCopyable(cr, addr);
    else cr.textContent = addr.length > 20 ? addr.slice(0, 20) + '...' : addr;
  }
  if (cf) {
    cf.textContent = _nf.line;
    cf.title = _gasTxt;
  }
  if (cact) cact.textContent = amtNum.toFixed(_dec) + ' ' + transferCoin.name;
  if (cch) cch.textContent = transferCoin.chain;
  var ov = document.getElementById('transferConfirmOverlay');
  if (ov) ov.classList.add('show');
}

function closeTransferConfirm() {
  var el = document.getElementById('transferConfirmOverlay');
  if (el) el.classList.remove('show');
}

// ══ 多文化礼金系统 ══
var GIFT_CULTURE = {
  zh: { name:'礼物', icon:'🎁', color:'#cc2200', desc:'恭喜发财', heroTagline:'送给朋友的礼物' },
  ja: { name:'お年玉', icon:'🎍', color:'#8b0000', desc:'新年おめでとう', heroTagline:'友だちへの贈り物' },
  ko: { name:'세뱃돈', icon:'🎎', color:'#9b0000', desc:'새해 복 많이 받으세요', heroTagline:'친구에게 보내는 선물' },
  ar: { name:'عيدية', icon:'🌙', color:'#1a5c2e', desc:'عيد مبارك', heroTagline:'هدية لأصدقائك' },
  hi: { name:'शगुन', icon:'🪔', color:'#8b4500', desc:'शुभ दीपावली', heroTagline:'दोस्तों के लिए उपहार' },
  vi: { name:'Lì xì', icon:'🎁', color:'#cc2200', desc:'Chúc mừng năm mới', heroTagline:'Quà tặng bạn bè' },
  id: { name:'Angpao', icon:'🎁', color:'#cc2200', desc:'Selamat & Sukses', heroTagline:'Hadiah untuk teman' },
  ms: { name:'Ang Pao', icon:'🎁', color:'#cc2200', desc:'Gong Xi Fa Cai', heroTagline:'Hadiah untuk rakan' },
  th: { name:'ซองแดง', icon:'🎀', color:'#aa0000', desc:'สวัสดีปีใหม่', heroTagline:'ของขวัญให้เพื่อน' },
  ru: { name:'Подарок', icon:'🎁', color:'#1a3a8b', desc:'Поздравляем', heroTagline:'Подарок друзьям' },
  es: { name:'Regalo', icon:'🎁', color:'#8b6914', desc:'¡Felicidades!', heroTagline:'Un regalo para amigos' },
  fr: { name:'Cadeau', icon:'🎁', color:'#1a3a6b', desc:'Félicitations', heroTagline:'Un cadeau pour des amis' },
  pt: { name:'Presente', icon:'🎁', color:'#1a5c1a', desc:'Parabéns', heroTagline:'Um presente para amigos' },
  de: { name:'Geldgeschenk', icon:'🎁', color:'#1a1a5c', desc:'Herzlichen Glückwunsch', heroTagline:'Ein Geschenk für Freunde' },
  en: { name:'Gift', icon:'🎁', color:'#1a3a8b', desc:'Congratulations', heroTagline:'A gift for friends' },
};

function getGiftCulture() {
  return GIFT_CULTURE[currentLang] || GIFT_CULTURE.zh;
}

var lastHbCreatedKeyword = '';

function updateGiftCountBadge() {
  var badge = document.getElementById('giftCountBadge');
  if (!badge) return;
  var myAddr = REAL_WALLET && REAL_WALLET.trxAddress ? REAL_WALLET.trxAddress : '';
  var allHb = {};
  try { allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}'); } catch (e) { allHb = {}; }
  var n = 0;
  if (myAddr) {
    Object.keys(allHb).forEach(function (k) {
      var hb = allHb[k];
      if (!hb || hb.giftExpiryProcessed) return;
      var fromMe = hb.creator === myAddr || hb.from === myAddr;
      if (!fromMe) return;
      if (Array.isArray(hb.claimed)) {
        n++;
      } else if (!Array.isArray(hb.claimed) && hb.amount != null && hb.claimed !== true) {
        n++;
      }
    });
  }
  badge.textContent = n ? n + ' 份' : '';
}

function updateGiftUI() {
  const g = getGiftCulture();
  // 更新礼物页标题
  const title = document.getElementById('giftTitle');
  const preview = document.getElementById('giftPreview');
  const icon = document.getElementById('giftIcon');
  const heroTagline = document.getElementById('giftHeroTagline');
  const blessingInput = document.getElementById('hbMessage');
  if(title) title.textContent = g.name;
  if(heroTagline) heroTagline.textContent = g.heroTagline || '';
  if(icon) icon.textContent = g.icon;
  if(blessingInput) blessingInput.value = g.desc;
  if(preview) {
    preview.style.background = `linear-gradient(160deg, ${g.color}dd, ${g.color}88, ${g.color}44)`;
  }
  updateHbPreview();
  try {
    if (typeof setGiftExpiry === 'function') setGiftExpiry(typeof hbExpiry === 'number' ? hbExpiry : 24);
  } catch (_ex) { wwQuiet(_ex); }
  updateGiftCountBadge();
}

// ══ 礼物口令系统 ══
var KW_ZH = ['举头望明月','春风得意马蹄','柳暗花明又一村','飞流直下三千尺','万紫千红总是春','轻舟已过万重山','千里江陵一日还','接天莲叶无穷碧','春色满园关不住','山重水复疑无路','白日依山尽黄河','烟花三月下扬州','孤帆远影碧空尽','不识庐山真面目','停车坐爱枫林晚','明月几时有把酒','相见时难别亦难','此情可待成追忆','衣带渐宽终不悔','山高月小水落石','但愿人长久千里','海上生明月天涯','春眠不觉晓处处','床前明月光疑是','独在异乡为异客','知否知否应是绿','天生我材必有用','长风破浪会有时','会当凌绝顶一览','青山遮不住毕竟'];
var KW_EN = ['Fortune smiles today','Golden harvest comes','Every cloud silver lining','Stars align tonight','Lucky winds blow now'];
var KW_JA = ['古池や蛙飛び込む','春の海終日のたり','菜の花や月は東に','五月雨を集めて早し','閑さや岩にしみ入る'];
var KW_AR = ['الصبر مفتاح الفرج','نور وبركة وسعادة','خير وأمل وفرحة'];
var KW_RU = ['Я помню чудное мгновенье','Белеет парус одинокой','Мороз и солнце день чудесный'];
var KW_ES = ['Quien madruga Dios le ayuda','No hay mal que por bien no venga','A buen entendedor pocas palabras'];
var KW_FR = ['La vie en rose toujours','Tout vient à point qui sait attendre','Mieux vaut tard que jamais'];

var LANG_KW = {zh:KW_ZH,en:KW_EN,ja:KW_JA,ar:KW_AR,ru:KW_RU,es:KW_ES,fr:KW_FR};

var hbExpiry = 24;
var hbType = 'normal';

var BLESSINGS = ['恭喜发财，万事如意','岁岁平安，事事顺心','吉祥如意，福气满满','财源广进，好运连连','心想事成，大吉大利'];

function copyKw() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = document.getElementById('copyKwBtn');
  btn.querySelector('div:last-child').textContent = '✅ 已复制';
  setTimeout(()=>{ btn.querySelector('div:last-child').textContent = '复制口令'; }, 2000);
}

function onClaimInput() {
  var inp = document.getElementById('claimInput');
  var box = document.getElementById('claimInputBox');
  if (!inp || !box) return;
  var v = String(inp.value || '');
  box.style.borderColor = v.length > 2 ? 'var(--gold)' : 'var(--border)';
}

function fillKeyword(kw) {
  var inp = document.getElementById('claimInput');
  if (!inp) return;
  inp.value = kw == null ? '' : String(kw);
  onClaimInput();
}

function resolveClaimKeyword(raw, allHb) {
  var s = String(raw || '').trim();
  if (!s) return '';
  if (allHb[s]) return s;
  var u = s.toUpperCase();
  if (allHb[u]) return u;
  return s;
}

function applyClaimSuccessPage(amountLine, detailText) {
  var a = document.getElementById('claimedAmount');
  var m = document.getElementById('claimedMessage');
  if (a) a.textContent = amountLine;
  if (m) m.textContent = detailText || '';
  goTo('page-claimed');
}

function submitClaim() {
  if (!window._wwPinBypassSubmitClaim && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassSubmitClaim = true;
        submitClaim();
      } finally {
        window._wwPinBypassSubmitClaim = false;
      }
    });
    return;
  }
  var box = document.getElementById('claimInputBox');
  var inp = document.getElementById('claimInput');
  var rawKw = inp ? String(inp.value).trim() : '';
  if (!rawKw) {
    if (box) box.style.borderColor = 'var(--red)';
    return;
  }
  if (box) box.style.borderColor = '';

  var allHb = {};
  try {
    allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
  } catch (e) {
    allHb = {};
  }
  var kw = resolveClaimKeyword(rawKw, allHb);
  var hb = allHb[kw];
  if (!hb) {
    showToast('❌ 未找到此口令，请检查是否输入正确', 'error');
    return;
  }

  // 旧版单份：{ amount, message, from, created, claimed: boolean }
  if (!Array.isArray(hb.claimed) && hb.amount != null) {
    if (hb.expireAt != null && Date.now() > hb.expireAt) {
      showToast('⏰ 此礼物已过期', 'warning');
      return;
    }
    if (hb.claimed === true) {
      showToast('礼物已被领取', 'warning');
      return;
    }
    if (!REAL_WALLET || !REAL_WALLET.trxAddress) {
      showToast('⚠️ 请先创建或导入钱包', 'warning');
      return;
    }
    var myAddr = REAL_WALLET.trxAddress;
    if (hb.from && hb.from === myAddr) {
      showToast('不能领取自己发出的礼物', 'info');
      return;
    }
    hb.claimed = true;
    hb.claimedAt = Date.now();
    hb.claimedBy = myAddr;
    allHb[kw] = hb;
    try {
      localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));
    } catch (e2) { wwQuiet(e2); }
    var creditLegacy = typeof wwRoundUsdt2 === 'function' ? wwRoundUsdt2(hb.amount) : Math.round(Number(hb.amount) * 100) / 100;
    if (typeof wwGiftCreditUsdt === 'function') wwGiftCreditUsdt(myAddr, creditLegacy);
    showToast('✅ 领取成功 · ' + String(hb.amount) + ' TRC USDT', 'success');
    if (inp) inp.value = '';
    var lines = [];
    if (hb.message && String(hb.message).trim()) lines.push(String(hb.message).trim());
    lines.push('口令 ' + kw);
    applyClaimSuccessPage(String(hb.amount) + ' TRC USDT', lines.join('\n'));
    return;
  }

  // 旧格式：多份口令礼物
  if (hb.expireAt && Date.now() > hb.expireAt) {
    showToast('⏰ 此礼物已过期', 'warning');
    return;
  }
  if (!hb.claimed || !Array.isArray(hb.claimed)) {
    showToast('❌ 礼物数据异常', 'error');
    return;
  }
  if (hb.count != null && hb.claimed.length >= hb.count) {
    showToast('😢 礼物已被领完啦', 'warning');
    return;
  }
  if (!REAL_WALLET) {
    showToast('⚠️ 请先创建或导入钱包', 'warning');
    return;
  }
  var myAddr2 = REAL_WALLET.trxAddress;
  var _creator = hb.creator || hb.from;
  if (_creator && myAddr2 === _creator) {
    showToast('不能领取自己发出的礼物', 'info');
    return;
  }
  if (hb.claimed.find(function (x) { return x.addr === myAddr2; })) {
    showToast('ℹ️ 你已经领取过这个礼物了', 'info');
    return;
  }

  var amt;
  if (hb.type === 'lucky') {
    var remaining = hb.totalAmount - hb.claimed.reduce(function (s, x) { return s + parseFloat(x.amount); }, 0);
    var leftCount = hb.count - hb.claimed.length;
    amt = leftCount === 1 ? remaining.toFixed(2) : (Math.random() * remaining * 2 / leftCount).toFixed(2);
  } else {
    amt = hb.perPerson;
  }

  hb.claimed.push({ addr: myAddr2, amount: amt, time: Date.now() });
  allHb[kw] = hb;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  var creditAmt = parseFloat(amt);
  if (typeof wwRoundUsdt2 === 'function') creditAmt = wwRoundUsdt2(creditAmt);
  else if (isFinite(creditAmt)) creditAmt = Math.round(creditAmt * 100) / 100;
  if (typeof wwGiftCreditUsdt === 'function' && isFinite(creditAmt) && creditAmt > 0) wwGiftCreditUsdt(myAddr2, creditAmt);

  var rank = hb.claimed.length;
  showToast('✅ 领取成功 · ' + amt + ' TRC USDT', 'success');
  if (inp) inp.value = '';
  applyClaimSuccessPage(
    amt + ' TRC USDT',
    '口令 ' + kw + '\n第 ' + rank + ' 个领取 · 共 ' + hb.count + ' 份礼物'
  );
}

var hbCount = 5;

function changeCount(delta) {
  hbCount = Math.max(1, Math.min(100, hbCount+delta));
  document.getElementById('hbCountVal').textContent = hbCount;
  (_safeEl('hbCountDisplay')||document.getElementById('hbCountVal')).textContent = hbCount+' 个';
  updateHbPreview();
}

function chgCnt(delta) {
  hbCount = Math.max(1, Math.min(100, hbCount + delta));
  const el = document.getElementById('hbCountVal');
  if(el) el.textContent = hbCount;
  const label = document.getElementById('hbCountLabel');
  if(label) label.textContent = hbCount + ' 个';
  const inp = document.getElementById('hbCountInput');
  if (inp) inp.value = String(hbCount);
  updateHbPreview();
}

function syncHbCountFromInput() {
  var inp = document.getElementById('hbCountInput');
  if (!inp) return;
  var v = parseInt(inp.value, 10);
  if (v !== v || v < 1) v = 1;
  if (v > 100) v = 100;
  hbCount = v;
  inp.value = String(hbCount);
  updateHbPreview();
}

function setGiftExpiry(h) {
  hbExpiry = h;
  ['giftExp24', 'giftExp72', 'giftExp168'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.style.borderColor = 'var(--border)';
      el.style.color = 'var(--text-muted)';
      el.style.background = 'var(--bg2)';
    }
  });
  var active = h === 24 ? 'giftExp24' : h === 72 ? 'giftExp72' : 'giftExp168';
  var ae = document.getElementById(active);
  if (ae) {
    ae.style.borderColor = 'rgba(200,168,75,0.4)';
    ae.style.color = 'var(--gold)';
    ae.style.background = 'linear-gradient(135deg,rgba(200,168,75,0.12),rgba(200,168,75,0.04))';
  }
}
try {
  window.setGiftExpiry = setGiftExpiry;
  window.syncHbCountFromInput = syncHbCountFromInput;
} catch (_se) { wwQuiet(_se); }

function updateHbPreview() {
  const amount = parseFloat(document.getElementById('hbAmount')?.value)||0;
  const per = document.getElementById('hbPerPerson');
  const tl = document.getElementById('hbTypeLabel');
  if(per) per.textContent = hbType==='lucky' ? '随机金额' : (hbCount>0?(amount/hbCount).toFixed(2)+' TRC USDT':'- TRC USDT');
  if(tl) tl.textContent = hbType==='lucky' ? '随机金额' : '每人金额';
}

var CURRENCIES = ['CNY','USD','EUR','JPY','KRW'];
var currencyIdx = 0;

function wwOpenBackupMnemonicFromSettingsWithPin() {
  function goBackup() {
    try {
      window._keyBackPage = 'page-settings';
    } catch (_k) { wwQuiet(_k); }
    if (typeof goTo === 'function') goTo('page-key');
  }
  if (typeof wwEnsurePinThenForced !== 'function') {
    goBackup();
    return;
  }
  wwEnsurePinThenForced(goBackup);
}
try {
  window.wwOpenBackupMnemonicFromSettingsWithPin = wwOpenBackupMnemonicFromSettingsWithPin;
} catch (_wOb) { wwQuiet(_wOb); }

function wwGoConvertMnemonicFromSettings() {
  function goConv() {
    if (typeof goTo === 'function') goTo('page-convert-mnemonic');
  }
  if (typeof wwEnsurePinThenForced !== 'function') {
    goConv();
    return;
  }
  wwEnsurePinThenForced(goConv);
}
try {
  window.wwGoConvertMnemonicFromSettings = wwGoConvertMnemonicFromSettings;
} catch (_wGcm) { wwQuiet(_wGcm); }

/** 转换助记词页：下拉展示名（与 WW_KEY_PAGE_LANGS 对齐） */
var WW_CONVERT_LANG_OPTION_LABELS = {
  zh: '中文（地名等词表）',
  en: 'English（BIP39 原文）',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  ru: 'Русский',
  pt: 'Português',
  hi: 'हिन्दी'
};

function wwFillConvertMnemonicLangSelect() {
  var sel = document.getElementById('wwConvertMnemonicLang');
  if (!sel) return;
  var prev = sel.value;
  sel.innerHTML = '';
  var langs = typeof WW_KEY_PAGE_LANGS !== 'undefined' ? WW_KEY_PAGE_LANGS : ['zh', 'en'];
  var i;
  var lg;
  var wl;
  var opt;
  for (i = 0; i < langs.length; i++) {
    lg = langs[i];
    wl = typeof getMnemonicWordlistLang === 'function' ? getMnemonicWordlistLang(lg) : lg === 'en' ? 'en' : 'zh';
    try {
      if (typeof WT_WORDLISTS === 'undefined' || !WT_WORDLISTS[wl] || WT_WORDLISTS[wl].length !== 2048) continue;
    } catch (_skip) {
      continue;
    }
    opt = document.createElement('option');
    opt.value = lg;
    opt.textContent = WW_CONVERT_LANG_OPTION_LABELS[lg] || wl + ' · ' + lg;
    sel.appendChild(opt);
  }
  if (!sel.options.length) {
    opt = document.createElement('option');
    opt.value = 'en';
    opt.textContent = 'English（BIP39）';
    sel.appendChild(opt);
  }
  try {
    var saved = localStorage.getItem('ww_convert_mnemonic_ui_lang');
    if (saved && sel.querySelector('option[value="' + saved + '"]')) sel.value = saved;
    else if (typeof keyMnemonicLang === 'string' && sel.querySelector('option[value="' + keyMnemonicLang + '"]'))
      sel.value = keyMnemonicLang;
    else if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev;
    else sel.selectedIndex = 0;
  } catch (_sv) {
    sel.selectedIndex = 0;
  }
}

function wwOnConvertMnemonicLangChange() {
  try {
    var sel = document.getElementById('wwConvertMnemonicLang');
    if (sel && sel.value) localStorage.setItem('ww_convert_mnemonic_ui_lang', sel.value);
  } catch (_ls) { wwQuiet(_ls); }
  wwRenderConvertMnemonicOutput();
}
try {
  window.wwOnConvertMnemonicLangChange = wwOnConvertMnemonicLangChange;
} catch (_wOcc) { wwQuiet(_wOcc); }

/** 按当前下拉的界面语言，将缓存的英文词数组映射为词表并写入展示区 */
function wwRenderConvertMnemonicOutput() {
  var out = document.getElementById('wwConvertMnemonicOut');
  var title = document.getElementById('wwConvertMnemonicLangTitle');
  var sel = document.getElementById('wwConvertMnemonicLang');
  var words = typeof window._wwConvertMnemonicEnWordsArr !== 'undefined' ? window._wwConvertMnemonicEnWordsArr : null;
  if (!out) return;
  if (!words || !words.length) {
    out.textContent = '';
    if (title) title.textContent = '所选语言';
    return;
  }
  var uiLang = sel && sel.value ? sel.value : 'zh';
  var wlKey = typeof getMnemonicWordlistLang === 'function' ? getMnemonicWordlistLang(uiLang) : uiLang === 'en' ? 'en' : 'zh';
  var disp = words;
  try {
    if (typeof enWordsToLangKeyTableWords === 'function') disp = enWordsToLangKeyTableWords(words.slice(), wlKey);
  } catch (_e) {
    disp = words;
  }
  out.textContent = disp.join(' ');
  if (title) {
    var lab = WW_CONVERT_LANG_OPTION_LABELS[uiLang] || wlKey;
    title.textContent = '当前词表（' + lab + '）';
  }
}

/** 设置 → 转换助记词页：英文 BIP39 真源 + 语言下拉映射（需已解密助记词） */
function wwPopulateConvertMnemonicPage() {
  var enEl = document.getElementById('wwConvertMnemonicEn');
  var outEl = document.getElementById('wwConvertMnemonicOut');
  if (!enEl || !outEl) return;
  enEl.textContent = '';
  outEl.textContent = '';
  window._wwConvertMnemonicEnWordsArr = null;
  var title = document.getElementById('wwConvertMnemonicLangTitle');
  if (title) title.textContent = '所选语言';

  function bindConvertControlsOnce() {
    var sel = document.getElementById('wwConvertMnemonicLang');
    if (sel && !sel._wwConvertBound) {
      sel._wwConvertBound = true;
      sel.addEventListener('change', function () {
        wwOnConvertMnemonicLangChange();
      });
    }
  }

  function finishPopulate() {
    wwFillConvertMnemonicLangSelect();
    bindConvertControlsOnce();
    wwRenderConvertMnemonicOutput();
  }

  function fillConvertMnemonic() {
    var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    if (!rw) {
      if (typeof showToast === 'function') showToast('未加载钱包', 'error');
      if (typeof goTo === 'function') goTo('page-settings');
      return;
    }
    var raw = String(rw.enMnemonic || rw.mnemonic || '')
      .trim()
      .replace(/\s+/g, ' ');
    if (!raw) {
      if (typeof showToast === 'function') showToast('无法读取助记词，请先解锁钱包或从备份页查看', 'warning', 3200);
      if (typeof goTo === 'function') goTo('page-settings');
      return;
    }
    var first = raw.split(/\s+/)[0] || '';
    var enStr = raw;
    if (first && !/^[a-zA-Z]+$/.test(first) && typeof mnemonicFromLang === 'function') {
      try {
        var srcWl =
          rw.mnemonicWordlistKey ||
          (typeof wwResolveMnemonicWordlistKey === 'function' ? wwResolveMnemonicWordlistKey() : 'zh');
        var toEn = mnemonicFromLang(raw, srcWl);
        var fw = (toEn && toEn.split(/\s+/)[0]) || '';
        if (fw && /^[a-zA-Z]+$/.test(fw)) enStr = String(toEn).trim().replace(/\s+/g, ' ');
      } catch (_me) { wwQuiet(_me); }
    }
    var enWords = enStr.split(/\s+/).filter(Boolean);
    if (!enWords.length) {
      if (typeof showToast === 'function') showToast('助记词格式无效', 'error');
      if (typeof goTo === 'function') goTo('page-settings');
      return;
    }
    window._wwConvertMnemonicEnWordsArr = enWords;
    enEl.textContent = enWords.join(' ');
    finishPopulate();
  }

  try {
    var rw0 = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    if (
      rw0 &&
      rw0.hasEncrypted &&
      !(rw0.enMnemonic || rw0.mnemonic) &&
      typeof wwUnsealWalletSensitive === 'function'
    ) {
      void wwUnsealWalletSensitive()
        .then(function () {
          fillConvertMnemonic();
        })
        .catch(function () {
          if (typeof showToast === 'function') showToast('解锁失败，无法显示助记词', 'error');
          if (typeof goTo === 'function') goTo('page-settings');
        });
      return;
    }
  } catch (_u) { wwQuiet(_u); }
  fillConvertMnemonic();
}
try {
  window.wwPopulateConvertMnemonicPage = wwPopulateConvertMnemonicPage;
} catch (_wPop) { wwQuiet(_wPop); }

function updateSettingsPage() {
  try {
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
  } catch (_sa) { wwQuiet(_sa); }
  var spv = document.getElementById('settingsPinValue');
  if (spv) {
    var pinSet = false;
    try {
      pinSet = typeof wwHasPinConfigured === 'function' && wwHasPinConfigured();
    } catch (_pp) { pinSet = false; }
    if (!pinSet) {
      try { pinSet = !!(localStorage.getItem('ww_pin') || '').trim(); } catch (_pp2) { wwQuiet(_pp2); }
    }
    spv.textContent = pinSet ? '已设置' : '未设置';
    spv.style.color = pinSet ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  const bs = document.getElementById('backupStatus');
  if (bs) {
    const backed = REAL_WALLET && REAL_WALLET.backedUp;
    bs.textContent = backed ? '已备份 ✓' : '未备份';
    bs.style.color = backed ? 'var(--green,#26a17b)' : 'var(--red,#e74c3c)';
  }
  var sav = document.getElementById('settingsAppVersion');
  if (sav) {
    var ver = (typeof WW_APP_VERSION !== 'undefined' && WW_APP_VERSION) ? String(WW_APP_VERSION) : '—';
    sav.textContent = ver;
    sav.style.color = 'var(--text-muted)';
  }
}

function wwPurgeLocalWalletStorage() {
  try {
    var keys = [];
    var i, k;
    for (i = 0; i < localStorage.length; i++) {
      k = localStorage.key(i);
      if (k && k.indexOf('ww_') === 0) keys.push(k);
    }
    for (i = 0; i < keys.length; i++) {
      try {
        localStorage.removeItem(keys[i]);
      } catch (_e) { wwQuiet(_e); }
    }
  } catch (_e2) { wwQuiet(_e2); }
  try {
    window._wwAfterPinUnlockContinue = null;
  } catch (_ac) { wwQuiet(_ac); }
  try {
    if (typeof wwClearSessionPin === 'function') wwClearSessionPin();
  } catch (_s) { wwQuiet(_s); }
  try {
    if (typeof wwCleanupMemory === 'function') wwCleanupMemory();
  } catch (_m) { wwQuiet(_m); }
  REAL_WALLET = null;
  try {
    window.REAL_WALLET = null;
  } catch (_w) { wwQuiet(_w); }
  try {
    currentMnemonicLength = 12;
  } catch (_c) { wwQuiet(_c); }
  try {
    if (typeof clearPublishedWallet === 'function') clearPublishedWallet();
  } catch (_cp) { wwQuiet(_cp); }
}
try {
  window.wwPurgeLocalWalletStorage = wwPurgeLocalWalletStorage;
} catch (_wp) { wwQuiet(_wp); }

/**
 * 应用内系统风格确认框（与 overlay-sheet 一致，无浏览器「页面标题」栏）。
 * @param {{title?:string,message?:string,cancelText?:string,confirmText?:string,destructive?:boolean}} opts
 * @returns {Promise<boolean>}
 */
function wwShowSystemConfirm(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    var ov = document.getElementById('wwSystemConfirmOverlay');
    var titleEl = document.getElementById('wwSystemConfirmTitle');
    var msgEl = document.getElementById('wwSystemConfirmMessage');
    var btnCancel = document.getElementById('wwSystemConfirmCancel');
    var btnOk = document.getElementById('wwSystemConfirmOk');
    if (!ov || !titleEl || !msgEl || !btnCancel || !btnOk) {
      try {
        resolve(window.confirm(String(opts.message || opts.title || '')));
      } catch (_e) {
        resolve(false);
      }
      return;
    }
    function done(v) {
      ov.classList.remove('show');
      document.removeEventListener('keydown', onKey);
      ov.onclick = null;
      btnCancel.onclick = null;
      btnOk.onclick = null;
      btnOk.className = 'btn-primary';
      btnOk.style.background = '';
      btnOk.style.color = '';
      btnOk.style.boxShadow = '';
      btnOk.style.border = '';
      resolve(!!v);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') done(false);
    }
    titleEl.textContent = opts.title || '提示';
    msgEl.textContent = opts.message || '';
    btnCancel.textContent = opts.cancelText || '取消';
    btnOk.textContent = opts.confirmText || '确定';
    if (opts.destructive) {
      btnOk.className = '';
      btnOk.style.background = 'linear-gradient(135deg,#c0392b,#e74c3c)';
      btnOk.style.color = '#fff';
      btnOk.style.border = 'none';
      btnOk.style.boxShadow = '0 4px 16px rgba(231,76,60,0.35)';
    }
    ov.onclick = function (e) {
      if (e.target === ov) done(false);
    };
    btnCancel.onclick = function () {
      done(false);
    };
    btnOk.onclick = function () {
      done(true);
    };
    document.addEventListener('keydown', onKey);
    ov.classList.add('show');
  });
}
try {
  window.wwShowSystemConfirm = wwShowSystemConfirm;
} catch (_wsc) { wwQuiet(_wsc); }

async function wwDeleteWalletFromSettings() {
  var ok1 = await wwShowSystemConfirm({
    title: '删除钱包',
    message: '确认删除本机钱包？请确保已离线备份助记词；删除后需助记词才能恢复资产。',
    cancelText: '取消',
    confirmText: '继续',
    destructive: false
  });
  if (!ok1) return;
  var ok2 = await wwShowSystemConfirm({
    title: '再次确认',
    message: '将清空本机全部钱包数据，此操作不可撤销。确定删除吗？',
    cancelText: '取消',
    confirmText: '删除',
    destructive: true
  });
  if (!ok2) return;
  function finish() {
    wwPurgeLocalWalletStorage();
    if (typeof goTo === 'function') goTo('page-welcome');
    else {
      document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      var wp = document.getElementById('page-welcome');
      if (wp) {
        wp.classList.add('active');
        wp.style.display = 'flex';
      }
      var tb = document.getElementById('tabBar');
      if (tb) tb.style.display = 'none';
    }
    if (typeof showToast === 'function') showToast('✅ 钱包已删除', 'success');
  }
  if (typeof wwHasPinConfigured === 'function' && wwHasPinConfigured()) {
    if (typeof wwEnsurePinThenForced === 'function') wwEnsurePinThenForced(finish);
    else finish();
  } else {
    finish();
  }
}
try {
  window.wwDeleteWalletFromSettings = wwDeleteWalletFromSettings;
} catch (_wd) { wwQuiet(_wd); }

function deleteWallet() {
  wwDeleteWalletFromSettings();
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */
function requestPushPermissionOnFirstLaunch() {
  try {
    if (localStorage.getItem('ww_push_asked')) return;
    if (typeof Notification === 'undefined') {
      localStorage.setItem('ww_push_asked', '1');
      return;
    }
    Notification.requestPermission().finally(function () {
      localStorage.setItem('ww_push_asked', '1');
    });
  } catch (e) {
    try { localStorage.setItem('ww_push_asked', '1'); } catch (x) { wwQuiet(x); }
  }
}

/* 兑换 COINS / calcSwap / doSwap / loadSwapPrices：由 wallet.runtime.js 统一定义（含 USDT↔TRX 与确认弹窗） */

// ── 导入钱包 ──────────────────────────────────────────────────
/** 与助记词语言下拉一致，写入 input[lang] 以便系统选用对应输入法（中文/日韩等） */
var WW_HTML_LANG_FOR_MNEMONIC = { zh: 'zh-Hans', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', ar: 'ar', ru: 'ru', pt: 'pt', hi: 'hi' };
function applyImportGridInputLangAttrs() {
  var lg = typeof keyMnemonicLang === 'string' && WW_KEY_PAGE_LANGS.indexOf(keyMnemonicLang) >= 0 ? keyMnemonicLang : 'zh';
  var htmlLang = WW_HTML_LANG_FOR_MNEMONIC[lg] || 'zh-Hans';
  var grid = document.getElementById('importGrid');
  if (!grid) return;
  var inputs = grid.querySelectorAll('input[id^="iw_"]');
  for (var j = 0; j < inputs.length; j++) {
    inputs[j].setAttribute('lang', htmlLang);
  }
}

/** 空格/回车跳到下一格；输入法组字期间（isComposing / 229）不拦截，避免中文等 IME 无法上屏 */
function wwImportGridAdvanceKeydown(event, nextIndex) {
  if (!event) return;
  if (event.isComposing === true || event.keyCode === 229) return;
  var k = event.key;
  if (k !== ' ' && k !== 'Enter') return;
  event.preventDefault();
  try {
    var el = document.getElementById('iw_' + nextIndex);
    if (el) el.focus();
  } catch (_e) { wwQuiet(_e); }
}
try { window.wwImportGridAdvanceKeydown = wwImportGridAdvanceKeydown; } catch (_w) { wwQuiet(_w); }

function initImportGrid(count) {
  count = count || 12;
  importGridWordCount = count;
  const grid = document.getElementById('importGrid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let i = 0; i < count; i++) {
    const div = document.createElement('div');
    const nextFocus = Math.min(i + 1, count - 1);
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:stretch;gap:3px;min-width:0';
    div.innerHTML = `
      <span style="font-size:9px;color:var(--text-muted);text-align:center">${i+1}</span>
      <input class="import-word" id="iw_${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="width:100%;min-width:0;box-sizing:border-box;background:none;border:none;outline:none;font-size:12px;color:var(--text);text-align:left;font-family:inherit;overflow-x:auto;-webkit-overflow-scrolling:touch"
        oninput="updateImportWordCount()"
        onkeydown="window.wwImportGridAdvanceKeydown&&window.wwImportGridAdvanceKeydown(event,${nextFocus})">
    `;
    grid.appendChild(div);
  }
  try {
    if (typeof applyImportGridInputLangAttrs === 'function') applyImportGridInputLangAttrs();
  } catch (_ig) { wwQuiet(_ig); }
}

function syncImportPaste() {
  updateImportWordCount();
}

// ── 从导入格子获取助记词 ──────────────────────────────────────────

// ── 二维码生成 ──────────────────────────────────────────────────


// 更新二维码（当地址改变时调用）

function filterTxHistoryList(txs, q) {
  if (!txs || !txs.length) return [];
  if (!q || !String(q).trim()) return txs.slice();
  var s = String(q).trim().toLowerCase();
  return txs.filter(function(tx) {
    var coin = String(tx.coin || '').toLowerCase();
    var addr = String(tx.addr || '').toLowerCase();
    var hash = String(tx.hash || '').toLowerCase();
    var typ = String(tx.type || '').toLowerCase();
    var amt = String(tx.amount || '').toLowerCase();
    return coin.indexOf(s) >= 0 || addr.indexOf(s) >= 0 || hash.indexOf(s) >= 0 || typ.indexOf(s) >= 0 || amt.indexOf(s) >= 0;
  });
}

function renderTxHistoryFromCache() {
  var el = document.getElementById('txHistoryList');
  if (!el) return;
  var txs = window._wwTxHistoryCache || [];
  var inp = document.getElementById('txHistoryFilter');
  var q = inp ? inp.value : '';
  var filtered = filterTxHistoryList(txs, q);
  el.innerHTML = '';
  if (txs.length === 0) {
    el.innerHTML = txHistoryEmptyHtml();
    return;
  }
  if (filtered.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:12px;line-height:1.6">无匹配记录<br/><span style="font-size:11px;opacity:0.9">试试缩短关键词或清空搜索框</span></div>';
    return;
  }
  filtered.forEach(function (tx) {
    var d = document.createElement('div');
    d.innerHTML = txHistoryRowHtml(tx);
    if (d.firstChild) el.appendChild(d.firstChild);
  });
  if (!el._wwTxHistoryDelegated && typeof wwTxHistoryRowOnClick === 'function') {
    el._wwTxHistoryDelegated = true;
    el.addEventListener('click', wwTxHistoryRowOnClick);
  }
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_rep2) { wwQuiet(_rep2); }
}

function getWalletSecurityBreakdown() {
  var pinOk = false;
  try {
    var p = localStorage.getItem('ww_pin');
    pinOk = !!(p && String(p).length >= 4);
  } catch (e) { wwQuiet(e); }
  var backed = false;
  try {
    if (REAL_WALLET && REAL_WALLET.backedUp) backed = true;
    else {
      var w = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      backed = !!w.backedUp;
    }
  } catch (e) { wwQuiet(e); }
  var pinPts = pinOk ? 50 : 0;
  var backupPts = backed ? 50 : 0;
  return { score: pinPts + backupPts, pinOk: pinOk, backed: backed, pinPts: pinPts, backupPts: backupPts };
}

/* updateWalletSecurityScoreUI：wallet.runtime.js（避免与 runtime 重复定义） */

function updateRebalanceSuggestion(parts, total) {
  var card = document.getElementById('wwRebalanceCard');
  var txt = document.getElementById('wwRebalanceText');
  if (!card || !txt) return;
  if (!total || total <= 1e-9) { card.style.display = 'none'; return; }
  var maxP = null;
  var maxPct = 0;
  parts.forEach(function(p) {
    if (p.v <= 0) return;
    var pct = 100 * p.v / total;
    if (pct > maxPct) { maxPct = pct; maxP = p; }
  });
  if (!maxP || maxPct < 72) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  txt.textContent = maxP.l + ' 约占总估值 ' + maxPct.toFixed(0) + '%：单一资产占比过高时，可通过转账或兑换分散至其他币种以降低集中度。';
}

function wwNormAddr(s) {
  if (!s) return '';
  s = String(s).trim();
  if (s.startsWith('0x')) return s.toLowerCase();
  return s;
}
function wwUsdFromTxRow(tx) {
  var amtN = 0;
  try { amtN = Math.abs(parseFloat(String(tx.amount || '0').replace(/[^0-9.+-]/g, ''))); } catch (e) { amtN = 0; }
  var cg = window._wwLastCgUsd || {};
  var c = String(tx.coin || '').toUpperCase();
  if (c === 'USDT' || c === 'TRC USDT') return amtN * (parseFloat(cg.usdt) || 1);
  if (c === 'TRX') return amtN * (parseFloat(cg.trx) || 0.12);
  if (c === 'ETH') return amtN * (parseFloat(cg.eth) || 2000);
  if (c === 'BTC') return amtN * (parseFloat(cg.btc) || 60000);
  return amtN;
}
function wwCheckWhaleTxHistory(txs) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  var thr = parseFloat(cfg.thresholdUsd) || 10000;
  if (!(thr > 0)) return;
  var lines = String(cfg.addressesText || '').split(/\r?\n/).map(function (x) { return wwNormAddr(x); }).filter(Boolean);
  var seen = {};
  try { seen = JSON.parse(localStorage.getItem('ww_whale_seen_v1') || '{}'); } catch (e2) { seen = {}; }
  var selfTron = '';
  try { if (REAL_WALLET && REAL_WALLET.trxAddress) selfTron = wwNormAddr(REAL_WALLET.trxAddress); } catch (e3) { wwQuiet(e3); }
  txs.forEach(function (tx) {
    var h = tx.hash;
    if (!h || seen[h]) return;
    var usd = wwUsdFromTxRow(tx);
    if (!(usd >= thr)) return;
    var isOut = String(tx.amount || '').trim().startsWith('-');
    var peer = wwNormAddr(tx.addr);
    var hitPeer = lines.length > 0 && lines.indexOf(peer) >= 0;
    var hitSelf = !!cfg.monitorSelf && selfTron && isOut;
    if (!hitPeer && !hitSelf) return;
    seen[h] = Date.now();
    try {
      new Notification('WorldToken 巨鲸提醒', { body: (tx.coin || '') + ' ' + (tx.amount || '') + ' · 约 $' + usd.toFixed(0), tag: 'ww-whale-' + h });
    } catch (e4) { wwQuiet(e4); }
  });
  try { localStorage.setItem('ww_whale_seen_v1', JSON.stringify(seen)); } catch (e5) { wwQuiet(e5); }
}
function wwEstUsdForTransfer(amtNum) {
  var c = transferCoin || {};
  var id = c.id || 'usdt';
  var p = 1;
  try {
    var coin = typeof COINS !== 'undefined' && COINS.find ? COINS.find(function (x) { return x.id === id; }) : null;
    p = (coin && coin.price) || c.price || 1;
  } catch (e) { p = c.price || 1; }
  return Math.max(0, amtNum * (parseFloat(p) || 1));
}
function wwSpendGateBeforeConfirm(amtNum) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return true;
  var d = new Date().toISOString().slice(0, 10);
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) { wwQuiet(e2); } }
  var lim = parseFloat(cfg.dailyUsd) || 0;
  if (!(lim > 0)) return true;
  var est = wwEstUsdForTransfer(amtNum);
  var used = parseFloat(cfg.usedUsd) || 0;
  if (used + est <= lim + 1e-6) return true;
  var pin = prompt('本笔约 $' + est.toFixed(2) + '，今日已累计约 $' + used.toFixed(2) + '，已超过每日限额 $' + lim.toFixed(2) + '。输入 6 位 PIN 以本次继续');
  if (pin === null) return false;
  var saved = '';
  try { saved = localStorage.getItem('ww_pin') || ''; } catch (e3) { saved = ''; }
  if (!saved || String(pin) !== saved) {
    if (typeof showToast === 'function') showToast('PIN 不正确或未设置 PIN', 'error');
    return false;
  }
  return true;
}
function wwRecordSpendAfterBroadcast(amtNum) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return;
  var d = new Date().toISOString().slice(0, 10);
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; }
  cfg.usedUsd = (parseFloat(cfg.usedUsd) || 0) + wwEstUsdForTransfer(amtNum);
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) { wwQuiet(e2); }
}

// ── 交易历史 ──────────────────────────────────────────────────

// ── 礼物记录：loadHbRecords 定义在 wallet.runtime.js（按当前钱包 creator/from 过滤，与礼物角标一致）

// ── 安全 getElementById（防止 null 导致崩溃）──────────────────────
var _origGetEl = document.getElementById.bind(document);
document.getElementById = function(id) {
  const el = _origGetEl(id);
  return el; // 返回真实元素或 null，调用处自行处理
};

// 批量修复：确保所有已知缺失 id 有默认处理
// _safeEl moved to top of script

// ── Toast 提示系统（替换 alert）──────────────────────────────
function showToast(msg, type='info', duration=2500) {
  let t = document.getElementById('wt-toast');
  if(!t) {
    t = document.createElement('div');
    t.id = 'wt-toast';
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(20,20,40,0.95);color:#e0e0f0;padding:10px 20px;border-radius:12px;font-size:13px;z-index:9999;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;max-width:80vw;text-align:center;border:1px solid rgba(200,168,75,0.3);box-shadow:0 4px 20px rgba(0,0,0,0.5)';
    document.body.appendChild(t);
  }
  const colors = {info:'#e0e0f0', success:'#4ac84a', error:'#ff6060', warning:'#ffcc44'};
  t.style.color = colors[type] || colors.info;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

/** 助记词相关区域：禁止复制 / 剪切 / 粘贴（导入格、验证输入、密钥展示区等） */
function wwIsMnemonicSensitiveTarget(el) {
  if (!el || el.nodeType === 9) return false;
  if (el.nodeType === 3) el = el.parentElement;
  if (!el || !el.closest) return false;
  if (el.closest('#importGrid') || el.closest('#page-key-verify') || el.closest('#keyWordGrid')) return true;
  if (el.id && /^iw_\d+$/.test(el.id)) return true;
  if (el.classList && el.classList.contains('import-word')) return true;
  return false;
}
function wwMnemonicClipboardGuard(ev) {
  var type = ev.type;
  var t = ev.target;
  if (t && t.nodeType === 3) t = t.parentElement;
  if (wwIsMnemonicSensitiveTarget(t)) {
    ev.preventDefault();
    if (typeof showToast === 'function') {
      showToast(type === 'paste' ? '请手动输入助记词，不支持粘贴' : '为保护资产安全，助记词区域不可复制或剪切', 'warning');
    }
    return;
  }
  if (type === 'copy' || type === 'cut') {
    var sel = typeof window.getSelection === 'function' ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.anchorNode) {
      var an = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      if (an && an.closest && an.closest('#keyWordGrid')) {
        ev.preventDefault();
        if (typeof showToast === 'function') showToast('为保护资产安全，助记词不可复制', 'warning');
      }
    }
  }
}
document.addEventListener('copy', wwMnemonicClipboardGuard, true);
document.addEventListener('cut', wwMnemonicClipboardGuard, true);
document.addEventListener('paste', wwMnemonicClipboardGuard, true);

// ── 余额查询 ──────────────────────────────────────────────────
var priceCache = null;
var priceCacheTime = 0;

// ── 加密资讯 ──────────────────────────────────────────────────
var newsLoading = false;
var newsCache = null;
var newsCacheTime = 0;

// 切换助记词词数：从熵重新生成全新 BIP39 助记词（不截断旧词），并立即刷新网格
async function changeMnemonicLength(n) {
  const wordCount = parseInt(n, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(wordCount)) return;
  currentMnemonicLength = wordCount;
  const sel = document.getElementById('mnemonicLength');
  if (sel) {
    sel.value = String(wordCount);
    sel.selectedIndex = [12, 15, 18, 21, 24].indexOf(wordCount);
  }
  if (!window._wwTempWalletByWordCount) window._wwTempWalletByWordCount = {};
  var byN = window._wwTempWalletByWordCount;
  if (byN[wordCount]) {
    window.TEMP_WALLET = wwCloneTempWalletForKeyPage(byN[wordCount]);
    if (typeof renderKeyGrid === 'function') renderKeyGrid();
    if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
    return;
  }
  showWalletLoading();
  try {
    var w = await createWallet(wordCount);
    wwPutTempWalletInWordCountCache(w);
    window.TEMP_WALLET = w;
    if (typeof renderKeyGrid === 'function') renderKeyGrid();
    if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
  } catch (e) {
    if (typeof showToast === 'function') showToast('生成失败: ' + wwFmtUserError(e, '未知错误'), 'error');
  } finally {
    hideWalletLoading();
  }
}

/** 导入页词数：仅重建格子并清空，不生成新钱包 */
function changeImportMnemonicLength(n) {
  const wordCount = parseInt(n, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(wordCount)) return;
  importGridWordCount = wordCount;
  const sel = document.getElementById('importMnemonicLength');
  if (sel) {
    sel.value = String(wordCount);
    const idx = [12, 15, 18, 21, 24].indexOf(wordCount);
    if (idx >= 0) sel.selectedIndex = idx;
  }
  if (typeof initImportGrid === 'function') initImportGrid(wordCount);
  const errEl = document.getElementById('importError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  updateImportWordCount();
}


// ── 助记词验证 ──────────────────────────────────────────────
/**
 * 创建流程：把 TEMP_WALLET 提升为 REAL_WALLET 并 saveWallet（验证通过后助记词即为本钱包真源，后续不应无故覆盖）。
 * 若 TEMP 缺少 eth/trx 字段（结构异常或缓存损坏），则用英文助记词现场派生（与 createWallet 同源），并同步 CHAIN_ADDR（否则首页/英文 UI 仍显示 '--'）。
 */
function wwEnsureRealWalletFromTempForVerify(tw, enMnemonicStr, displayWordsForRw) {
  if (!tw || !enMnemonicStr) return false;
  var m = String(enMnemonicStr).trim();
  if (!m) return false;
  if (typeof ethers === 'undefined') return false;
  try {
    if (!tw.eth || !tw.eth.address) {
      var wallet = ethers.Wallet.fromMnemonic(m);
      var trxWallet = ethers.Wallet.fromMnemonic(m, "m/44'/195'/0'/0/0");
      var btcWallet = ethers.Wallet.fromMnemonic(m, "m/44'/0'/0'/0/0");
      var trxAddr = '';
      try {
        if (typeof TronWeb !== 'undefined' && TronWeb.address && typeof TronWeb.address.fromHex === 'function') {
          trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
        }
      } catch (_trx) { wwQuiet(_trx); }
      if (!trxAddr && typeof wwTrxBase58FromEthAddressHex === 'function') {
        trxAddr = wwTrxBase58FromEthAddressHex(trxWallet.address);
      }
      tw.eth = { address: wallet.address, privateKey: wallet.privateKey };
      tw.trx = { address: trxAddr, privateKey: trxWallet.privateKey };
      tw.btc = { address: btcWallet.address, privateKey: btcWallet.privateKey };
      tw.ethAddress = wallet.address;
      tw.trxAddress = trxAddr;
      tw.btcAddress = btcWallet.address;
      tw.privateKey = wallet.privateKey;
      tw.trxPrivateKey = trxWallet.privateKey;
    }
  } catch (_der) {
    return false;
  }
  var nested = tw.eth && tw.eth.address;
  var wordsForStore =
    displayWordsForRw && displayWordsForRw.length
      ? displayWordsForRw.slice()
      : tw.words && tw.words.length
        ? tw.words.slice()
        : m.split(/\s+/).filter(Boolean);
  REAL_WALLET = {
    ethAddress: nested ? tw.eth.address : tw.ethAddress,
    trxAddress: nested ? tw.trx.address : tw.trxAddress,
    btcAddress: nested ? tw.btc.address : tw.btcAddress || '',
    createdAt: tw.createdAt != null ? tw.createdAt : Date.now(),
    mnemonic: m,
    wordCount: tw.wordCount || wordsForStore.length,
    privateKey: nested ? tw.eth.privateKey : tw.privateKey,
    trxPrivateKey: nested ? tw.trx.privateKey : tw.trxPrivateKey,
    enMnemonic: m,
    words: wordsForStore
  };
  window.REAL_WALLET = REAL_WALLET;
  try {
    if (REAL_WALLET.trxAddress && typeof CHAIN_ADDR !== 'undefined') {
      CHAIN_ADDR = REAL_WALLET.trxAddress;
    }
  } catch (_ch) { wwQuiet(_ch); }
  if (typeof saveWallet === 'function') saveWallet(REAL_WALLET);
  return true;
}

/**
 * 「暂时忽略验证」：与验证通过同源，把 TEMP 提升为 REAL 并落盘公开地址，否则首页万语种子为空、资产卡片/余额不拉取。
 */
function wwPromoteTempWalletForSkipVerify() {
  try {
    if (!window.TEMP_WALLET || !window.TEMP_WALLET.mnemonic) return false;
    var tw = window.TEMP_WALLET;
    var enM = String(tw.mnemonic || tw.enMnemonic || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!enM.length || [12, 15, 18, 21, 24].indexOf(enM.length) < 0) return false;
    var enMnemonicStr = enM.join(' ');
    var wlKey = typeof wwResolveMnemonicWordlistKey === 'function' ? wwResolveMnemonicWordlistKey() : 'en';
    var disp =
      wlKey === 'en'
        ? enM.slice()
        : typeof enWordsToLangKeyTableWords === 'function'
          ? enWordsToLangKeyTableWords(enM.slice(), wlKey)
          : enM.slice();
    var ok = !!wwEnsureRealWalletFromTempForVerify(tw, enMnemonicStr, disp);
    if (ok) {
      /* 首屏无链上身份时可能已用空种子占满 ADDR_WORDS，ensureNativeAddrInitialized 会早退，导致万语芯片永不刷新 */
      try {
        if (typeof ADDR_WORDS !== 'undefined' && ADDR_WORDS) ADDR_WORDS.length = 0;
      } catch (_a0) { wwQuiet(_a0); }
      try {
        if (typeof __wanYuAddrInitialized !== 'undefined') __wanYuAddrInitialized = false;
      } catch (_a1) { wwQuiet(_a1); }
      if (typeof window.wwClearWanYuAddrCacheForWalletChange === 'function') {
        window.wwClearWanYuAddrCacheForWalletChange();
      }
    }
    return ok;
  } catch (_e) {
    return false;
  }
}
try {
  window.wwPromoteTempWalletForSkipVerify = wwPromoteTempWalletForSkipVerify;
} catch (_w2) { wwQuiet(_w2); }

/**
 * 创建流程结束进首页：验证通过 与 「暂时忽略验证」共用同一套路由与动画。
 * 唯一差异：mnemonicVerified===true 时 markBackupDone()；否则显式 persisted backedUp=false 并刷新备份横幅/安全分（与已验证相比仅多一条「未备份」提示）。
 */
function wwNavigateHomeAfterCreateFlow(options) {
  var opts = options || {};
  var pid = opts.pageId || 'page-home';
  var verified = !!opts.mnemonicVerified;
  if (verified) {
    try {
      if (typeof markBackupDone === 'function') markBackupDone();
    } catch (_mb) { wwQuiet(_mb); }
  } else {
    try {
      var wSkip = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      wSkip.backedUp = false;
      localStorage.setItem('ww_wallet', JSON.stringify(wSkip));
    } catch (_ls) { wwQuiet(_ls); }
    try {
      if (typeof REAL_WALLET !== 'undefined' && REAL_WALLET) REAL_WALLET.backedUp = false;
    } catch (_rw) { wwQuiet(_rw); }
    try {
      if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
    } catch (_hb) { wwQuiet(_hb); }
    try {
      if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
    } catch (_ws) { wwQuiet(_ws); }
    try {
      if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
    } catch (_pa) { wwQuiet(_pa); }
  }
  try {
    var hasPinNav = false;
    try {
      hasPinNav = !!(typeof Store !== 'undefined' && Store.getPin ? Store.getPin() : localStorage.getItem('ww_pin'));
    } catch (_p0) { wwQuiet(_p0); }
    if (hasPinNav) {
      try {
        window._wwInFirstRun = false;
      } catch (_frV) { wwQuiet(_frV); }
    }
  } catch (_p) { wwQuiet(_p); }
  if (typeof goTo !== 'function') return;
  try {
    goTo(pid, { instant: true, forceHome: true });
  } catch (_gt) { wwQuiet(_gt); }
  try {
    var curHash = (location.hash || '').replace(/^#/, '').trim().split('?')[0];
    if (curHash !== pid) {
      var _uf = new URL(location.href);
      _uf.hash = pid;
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', _uf.pathname + _uf.search + _uf.hash);
      } else {
        location.hash = '#' + pid;
      }
    }
  } catch (_hf) { wwQuiet(_hf); }
  /* 创建流程结束进首页：显式选中底栏「资产」并滚回顶部，避免仍停留在 #page-key 视觉或 Tab 未对齐 */
  if (pid === 'page-home') {
    setTimeout(function () {
      try {
        if (typeof goTab === 'function') goTab('tab-home');
      } catch (_gtb) { wwQuiet(_gtb); }
      try {
        var _phNav = document.getElementById('page-home');
        if (_phNav) _phNav.scrollTop = 0;
      } catch (_sc) { wwQuiet(_sc); }
    }, 0);
  }
  if (pid === 'page-settings') {
    setTimeout(function () {
      try {
        if (typeof goTab === 'function') goTab('tab-settings');
      } catch (_gts) { wwQuiet(_gts); }
      try {
        if (typeof updateSettingsPage === 'function') updateSettingsPage();
      } catch (_usp) { wwQuiet(_usp); }
    }, 0);
  }
}
try {
  window.wwNavigateHomeAfterCreateFlow = wwNavigateHomeAfterCreateFlow;
} catch (_wn) { wwQuiet(_wn); }

/**
 * 「暂时忽略验证」：先提升 TEMP→REAL 并落盘，再进入创建结束流程。
 * 从设置「备份助记词」进入时（_keyBackPage===page-settings）应回到设置页，否则回资产首页。
 */
function wwSkipVerifyToHome() {
  var destPage = 'page-home';
  try {
    if (window._keyBackPage === 'page-settings') destPage = 'page-settings';
  } catch (_kb) { wwQuiet(_kb); }
  try {
    if (typeof wwClearHtmlBootRouteIfDestChanges === 'function') wwClearHtmlBootRouteIfDestChanges(destPage);
  } catch (_b) { wwQuiet(_b); }
  try {
    if (typeof hideWalletLoading === 'function') hideWalletLoading();
  } catch (_h) { wwQuiet(_h); }
  try {
    var _wloSkip = document.getElementById('walletLoadingOverlay');
    if (_wloSkip) {
      _wloSkip.classList.remove('show');
      _wloSkip.style.pointerEvents = 'none';
    }
  } catch (_wl) { wwQuiet(_wl); }
  try {
    if (typeof wwPromoteTempWalletForSkipVerify === 'function') wwPromoteTempWalletForSkipVerify();
  } catch (_p) { wwQuiet(_p); }
  if (typeof wwNavigateHomeAfterCreateFlow === 'function') {
    wwNavigateHomeAfterCreateFlow({ mnemonicVerified: false, pageId: destPage });
  }
  try {
    if (destPage === 'page-settings') window._keyBackPage = null;
  } catch (_kc) { wwQuiet(_kc); }
}
try {
  window.wwSkipVerifyToHome = wwSkipVerifyToHome;
} catch (_wsk) { wwQuiet(_wsk); }

/**
 * 验证通过后的统一导航（内部走 wwNavigateHomeAfterCreateFlow）。
 */
function wwAfterMnemonicVerifiedNavigate(pageId) {
  wwNavigateHomeAfterCreateFlow({ mnemonicVerified: true, pageId: pageId || 'page-home' });
}

var verifyAnswers = {}; // {position: correctWord}

/** 与比对展示用词一致：去零宽/BOM、Unicode NFC、trim、ASCII 小写（中文不受影响） */
function _wwNormalizeVerifyWord(s) {
  if (s == null || s === undefined) return '';
  try {
    return String(s)
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .normalize('NFC')
      .trim()
      .toLowerCase();
  } catch (_e) {
    return String(s).trim().toLowerCase();
  }
}

function startVerify() {
  // 与 renderKeyGrid 同源：始终以英文 BIP39 为真源，再按 keyMnemonicLang 映射为展示词，避免 .words 与界面分叉时出现「屏上中文、校验按英文」
  var tw = window.TEMP_WALLET;
  var rw = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
  const enMnemonic =
    (tw && (tw.mnemonic || tw.enMnemonic)) ||
    (rw && (rw.enMnemonic || rw.mnemonic));
  if (!enMnemonic) {
    if (typeof showToast === 'function') {
      showToast('无法读取有效助记词，请返回密钥页确认已展示助记词，或解锁钱包后再试', 'error', 3200);
    }
    return;
  }
  const enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  if (!enWords.length || ![12, 15, 18, 21, 24].includes(enWords.length)) {
    if (typeof showToast === 'function') {
      showToast('无法读取有效助记词，请返回密钥页确认已展示助记词，或解锁钱包后再试', 'error', 3200);
    }
    return;
  }
  var wlKey = wwResolveMnemonicWordlistKey();
  var words =
    wlKey === 'en'
      ? enWords.slice()
      : typeof enWordsToLangKeyTableWords === 'function'
        ? enWordsToLangKeyTableWords(enWords, wlKey)
        : enWords.slice();
  // 验证开始时：有 TEMP 则写入 REAL_WALLET（缺 eth/trx 时从英文助记词补派生）；不再要求必须已有 eth 字段，避免地址未生成
  if (window.TEMP_WALLET && window.TEMP_WALLET.mnemonic) {
    wwEnsureRealWalletFromTempForVerify(window.TEMP_WALLET, enMnemonic, words);
  }
  verifyAnswers = {};
  
  // 随机选3个位置验证（词数与密钥页一致）
  const wc = words.length;
  const positions = [];
  while(positions.length < 3) {
    const p = Math.floor(Math.random() * wc);
    if(!positions.includes(p)) positions.push(p);
  }
  positions.sort((a,b) => a-b);
  
  // 生成题目
  const container = _safeEl('verifyQuestions');
  container.innerHTML = '';
  positions.forEach(pos => {
    verifyAnswers[pos] = words[pos];
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:10px';
    div.innerHTML = `
      <div style="font-size:12px;color:var(--text-muted);width:28px;flex-shrink:0">第 ${pos+1} 词</div>
      <input type="text" id="verify_${pos}" placeholder="请输入第 ${pos+1} 个词" autocomplete="off" autocorrect="off" autocapitalize="off"
        style="flex:1;background:none;border:none;outline:none;font-size:14px;color:var(--text);font-family:inherit"
        onkeydown="if(event.key==='Enter')checkVerify()">
    `;
    container.appendChild(div);
  });
  
  _safeEl('verifyError').style.display = 'none';
  goTo('page-key-verify');
  setTimeout(() => {
    const first = document.querySelector('#verifyQuestions input');
    if(first) first.focus();
  }, 300);
}

function checkVerify() {
  let allCorrect = true;
  Object.keys(verifyAnswers).forEach(pos => {
    const input = document.getElementById('verify_' + pos);
    const val = _wwNormalizeVerifyWord(input ? input.value : '');
    const correct = _wwNormalizeVerifyWord(verifyAnswers[pos]);
    if(val !== correct) {
      allCorrect = false;
      if(input) input.style.color = '#ff6060';
    } else {
      if(input) input.style.color = '#4ac84a';
    }
  });
  
  if(allCorrect) {
    _safeEl('verifyError').style.display = 'none';
    var hasPin = false;
    try {
      hasPin = !!(typeof Store !== 'undefined' && Store.getPin ? Store.getPin() : localStorage.getItem('ww_pin'));
    } catch (_p0) { wwQuiet(_p0); }
    if (hasPin) { try { window._wwInFirstRun = false; } catch (_frV) { wwQuiet(_frV); } }
    try {
      if (typeof wwWalletHasAnyChainAddress === 'function' && !wwWalletHasAnyChainAddress(REAL_WALLET) && window.TEMP_WALLET && window.TEMP_WALLET.mnemonic) {
        var twF = window.TEMP_WALLET;
        var enM = String(twF.mnemonic || twF.enMnemonic || '')
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (enM.length && [12, 15, 18, 21, 24].indexOf(enM.length) >= 0) {
          var wlKeyF = typeof wwResolveMnemonicWordlistKey === 'function' ? wwResolveMnemonicWordlistKey() : 'en';
          var dispF =
            wlKeyF === 'en'
              ? enM.slice()
              : typeof enWordsToLangKeyTableWords === 'function'
                ? enWordsToLangKeyTableWords(enM.slice(), wlKeyF)
                : enM.slice();
          wwEnsureRealWalletFromTempForVerify(twF, enM.join(' '), dispF);
        }
      }
    } catch (_fv) { wwQuiet(_fv); }
    wwAfterMnemonicVerifiedNavigate('page-home');
    setTimeout(function () {
      if (typeof showToast === 'function') showToast('✅ 验证通过！钱包已安全创建', 'success');
    }, 0);
  } else {
    _safeEl('verifyError').style.display = 'block';
    const vroot = document.getElementById('verifyShakeRoot');
    if(vroot) { vroot.classList.remove('wt-shake-wrong'); void vroot.offsetWidth; vroot.classList.add('wt-shake-wrong'); }
  }
}


async function _resumeWalletAfterUnlock() {
  // 解密敏感数据并临时注入 REAL_WALLET（须在进入首页 / 拉余额前完成，避免竞态）
  var pin = (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.get === 'function' ? window.wwSessionPinBridge.get() : '') || '';
  try {
    if (!pin) pin = localStorage.getItem('ww_pin') || localStorage.getItem('ww_unlock_pin') || '';
  } catch (e) { wwQuiet(e); }
  if (pin && REAL_WALLET && REAL_WALLET.hasEncrypted && !REAL_WALLET.privateKey && !REAL_WALLET._wwSes) {
    try {
      var sensitive = await decryptSensitive(pin);
      if (sensitive && REAL_WALLET) {
        REAL_WALLET.privateKey = sensitive.privateKey;
        REAL_WALLET.trxPrivateKey = sensitive.trxPrivateKey;
        REAL_WALLET.mnemonic = sensitive.mnemonic;
        REAL_WALLET.enMnemonic = sensitive.enMnemonic;
        REAL_WALLET.words = sensitive.words;
      }
    } catch (e) {
      console.error('[unlock decrypt]', e);
    }
  }
  try { if (typeof wwSealWalletSensitive === 'function') await wwSealWalletSensitive(); } catch (_se) { wwQuiet(_se); }
  updateAddr();
  const tb = document.getElementById('tabBar');
  if(tb) tb.style.display = 'flex';
  try { if (typeof wwTryRestoreCachedHomeUi === 'function') wwTryRestoreCachedHomeUi(); } catch (_ruH) { wwQuiet(_ruH); }
  try { if (typeof wwTryRestoreCachedTxHistory === 'function') wwTryRestoreCachedTxHistory(); } catch (_ruT) { wwQuiet(_ruT); }
  setTimeout(loadBalances, 0);
  if(window._wwUnlockPreservePage) {
    window._wwUnlockPreservePage = false;
    window._wwForceIdleLock = false;
    try { wwResetActivityClock(); } catch (e) { wwQuiet(e); }
    return;
  }
  window._wwForceIdleLock = false;
  goTo('page-home');
}
function wwB64Bytes(u8) {
  var s = '';
  var chunk = 8192;
  for (var i = 0; i < u8.length; i += chunk) {
    s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + chunk, u8.length)));
  }
  return btoa(s);
}

function continueAfterPinCheck() {
  if (typeof wwHasPinConfigured === 'function') {
    if (!wwHasPinConfigured()) { void _resumeWalletAfterUnlock(); return; }
  } else {
    const pin = localStorage.getItem('ww_pin') || '';
    if (!pin) { void _resumeWalletAfterUnlock(); return; }
  }
  const ov = document.getElementById('pinUnlockOverlay');
  const inp = document.getElementById('pinUnlockInput');
  const err = document.getElementById('pinUnlockError');
  if(ov && inp) {
    inp.value = '';
    if(err) err.style.display = 'none';
    ov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap) { wwQuiet(_ap); }
    setTimeout(() => { try { inp.focus(); } catch (e) { wwQuiet(e); } }, 200);
  } else {
    void _resumeWalletAfterUnlock();
  }
}
async function submitPageRestorePin() {
  const inp = document.getElementById('pinRestorePageInput');
  const err = document.getElementById('pageRestorePinError');
  const panel = document.getElementById('pageRestorePinPanel');
  if (typeof wwHasPinConfigured === 'function' && !wwHasPinConfigured()) {
    if (err) { err.textContent = '尚未在本机设置 PIN，请先创建或导入钱包并完成 PIN 设置'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    return;
  }
  const got = inp ? String(inp.value).trim() : '';
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.set === 'function') window.wwSessionPinBridge.set(got);
    if (err) { err.style.display = 'none'; err.textContent = ''; }
    if (inp) inp.value = '';
    if (typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      await _resumeWalletAfterUnlock();
    }
  } else {
    if (err) { err.textContent = 'PIN错误'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
  }
}
async function submitPinUnlock() {
  const inp = document.getElementById('pinUnlockInput');
  const got = inp ? String(inp.value).trim() : '';
  const ov = document.getElementById('pinUnlockOverlay');
  const err = document.getElementById('pinUnlockError');
  const panel = document.getElementById('pinUnlockPanel');
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    if (window.wwSessionPinBridge && typeof window.wwSessionPinBridge.set === 'function') window.wwSessionPinBridge.set(got);
    if (ov) ov.classList.remove('show');
    if (typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      await _resumeWalletAfterUnlock();
    }
  } else {
    if (err) { err.textContent = 'PIN错误'; err.style.display = 'block'; }
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    if (inp) inp.value = '';
  }
}
function closePinUnlock() {
  if(window._wwForceIdleLock) {
    if(typeof showToast==='function') showToast('闲置超时，请输入 PIN 解锁', 'warning', 2200);
    return;
  }
  const ov = document.getElementById('pinUnlockOverlay');
  if(ov) ov.classList.remove('show');
}


function openPinSettingsDialog() {
  if (typeof wwHasPinConfigured === 'function' && !wwHasPinConfigured()) {
    if (typeof openPinSetupOverlay === 'function') {
      openPinSetupOverlay({ skipFirstRunLock: true });
      return;
    }
  } else if (typeof wwHasPinConfigured === 'function' && wwHasPinConfigured()) {
    if (typeof wwEnsurePinThenForced === 'function' && typeof openPinChangeOverlay === 'function') {
      wwEnsurePinThenForced(function () {
        openPinChangeOverlay();
      });
      return;
    }
  }
  const cur = localStorage.getItem('ww_pin') || '';
  const a = prompt('设置 6 位数字 PIN（留空则清除 PIN）', cur);
  if (a === null) return;
  const t = a.trim();
  if (t === '') {
    localStorage.removeItem('ww_pin');
    localStorage.removeItem('ww_totp_secret');
    localStorage.removeItem('ww_totp_enabled');
    showToast('已清除 PIN', 'success');
    if (typeof updateSettingsPage === 'function') updateSettingsPage();
    return;
  }
  if (!/^\d{6}$/.test(t)) {
    showToast('PIN 须为 6 位数字', 'error');
    return;
  }
  localStorage.setItem('ww_pin', t);
  try { window._wwInFirstRun = false; } catch (_frPs) { wwQuiet(_frPs); }
  showToast('PIN 已保存', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}

/* 时钟、闲置锁、活动重置、SEO/离线、余额隐私与滚动顶按钮由 wallet.runtime.js 统一初始化，避免与下文重复注册定时器与监听器 */

/** 主样式表就绪后再跑首帧 goTo，避免 wallet.css 晚于本脚本执行时布局/主题闪一下 */
function wwWhenWalletCssReady(fn) {
  try {
    if (typeof fn !== 'function') return;
    var link = document.getElementById('ww-wallet-css');
    if (!link) {
      try {
        link = document.querySelector('link[rel~="stylesheet"][href*="wallet.css"]');
      } catch (_q) {}
    }
    if (!link) {
      setTimeout(function () {
        fn();
      }, 0);
      return;
    }
    var done = false;
    function fire() {
      if (done) return;
      done = true;
      try {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(function () {
            fn();
          });
        } else {
          setTimeout(function () {
            fn();
          }, 0);
        }
      } catch (_f) {
        setTimeout(function () {
          fn();
        }, 0);
      }
    }
    try {
      if (link.sheet) {
        fire();
        return;
      }
    } catch (_s) {}
    function onEnd() {
      try {
        link.removeEventListener('load', onEnd);
        link.removeEventListener('error', onEnd);
      } catch (_r) {}
      fire();
    }
    link.addEventListener('load', onEnd);
    link.addEventListener('error', onEnd);
    try {
      if (link.sheet) fire();
    } catch (_s2) {}
    setTimeout(fire, 4000);
  } catch (_e) {
    if (typeof wwQuiet === 'function') wwQuiet(_e);
    setTimeout(function () {
      fn();
    }, 0);
  }
}
try {
  window.wwWhenWalletCssReady = wwWhenWalletCssReady;
} catch (_wwCssFn) {}

(function () {
  var WW_GUEST_HASH_OK = {
    'page-welcome': 1,
    'page-import': 1,
    'page-key': 1,
    'page-key-verify': 1,
    'page-password-restore': 1,
    'page-verify-success': 1,
    'page-recovery-test': 1,
    'page-convert-mnemonic': 1,
    'page-faq': 1
  };
  function wwGuestHasSavedAddress() {
    try {
      var d = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      return typeof wwWalletHasValidPersistedAddress === 'function' && wwWalletHasValidPersistedAddress(d);
    } catch (_g) {
      return false;
    }
  }
  /** 欢迎页为当前 active 时强制卸下 boot 遮罩（勿因「有地址」提前 return，异常态也会卡 pointer-events） */
  function wwFixWelcomeBootIfGuest() {
    try {
      var w = document.getElementById('page-welcome');
      if (!w || !w.classList.contains('active')) return;
      try {
        if (typeof wwClearHtmlBootRouteIfDestChanges === 'function') wwClearHtmlBootRouteIfDestChanges('page-welcome');
      } catch (_c0) {}
      document.documentElement.removeAttribute('data-ww-boot-page');
      try {
        document.documentElement.classList.remove('ww-boot-route');
      } catch (_e) {}
      try {
        document.querySelectorAll('style[data-ww-boot-route]').forEach(function (st) {
          if (st.parentNode) st.parentNode.removeChild(st);
        });
      } catch (_e2) {}
      w.style.setProperty('pointer-events', 'auto', 'important');
      w.querySelectorAll('button[data-ww-welcome-act]').forEach(function (b) {
        b.style.setProperty('pointer-events', 'auto', 'important');
      });
    } catch (_e3) {
      wwQuiet(_e3);
    }
  }
  try {
    window.wwFixWelcomeBootIfGuest = wwFixWelcomeBootIfGuest;
  } catch (_ex) {}
  /** 无链上地址时仅允许导入/密钥等 hash 深链；与 wallet.html head boot 白名单一致 */
  function wwGuestHashAllowed(pid) {
    if (!pid) return true;
    if (wwGuestHasSavedAddress()) return true;
    return !!WW_GUEST_HASH_OK[pid];
  }
  function wwStripLocationHash() {
    try {
      var u = new URL(location.href);
      if (!u.hash) return;
      u.hash = '';
      if (typeof history !== 'undefined' && history.replaceState) {
        history.replaceState(null, '', u.pathname + u.search);
      }
    } catch (_u) { wwQuiet(_u); }
  }
  function wwHashToPageId() {
    try {
      var h = (location.hash || '').replace(/^#/, '').trim();
      if (h.indexOf('?') >= 0) h = h.slice(0, h.indexOf('?'));
      if (!h) return null;
      try { h = decodeURIComponent(h); } catch (_d) { wwQuiet(_d); }
      var el = document.getElementById(h);
      if (!el || !el.classList || !el.classList.contains('page')) return null;
      return h;
    } catch (_e) {
      return null;
    }
  }
  function wwApplyHashRoute() {
    var pid = wwHashToPageId();
    if (!pid || typeof goTo !== 'function') return;
    var _wwHashReload = false;
    try {
      var _wwNavH = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      _wwHashReload = _wwNavH && _wwNavH.type === 'reload';
    } catch (_wh) {}
    var _hashOpts = _wwHashReload ? { forceRoute: true } : {};
    if (!wwGuestHashAllowed(pid)) {
      wwStripLocationHash();
      goTo('page-welcome');
      return;
    }
    goTo(pid, _hashOpts);
  }
  /** 首次加载：hash 为空或指向不存在的 id 时，按 localStorage 钱包状态落到首页或欢迎页 */
  function wwEnsureInitialHashRoute() {
    var hid = wwHashToPageId();
    var _wwPinBeforeMain = {
      'page-home': 1,
      'page-swap': 1,
      'page-addr': 1,
      'page-hongbao': 1,
      'page-settings': 1,
      'page-transfer': 1,
      'page-swoosh': 1,
      'page-address-book': 1,
      'page-swap-records': 1,
      'page-claim': 1,
      'page-claimed': 1,
      'page-hb-keyword': 1,
      'page-hb-records': 1,
      'page-transfer-success': 1
    };
    if (hid) {
      if (!wwGuestHashAllowed(hid)) {
        wwStripLocationHash();
        if (typeof goTo === 'function') goTo('page-welcome');
        return;
      }
      try {
        if (
          _wwPinBeforeMain[hid] &&
          typeof wwNeedsPinUnlockBeforeHome === 'function' &&
          wwNeedsPinUnlockBeforeHome()
        ) {
          wwStripLocationHash();
          if (typeof goTo === 'function') goTo('page-password-restore');
          return;
        }
      } catch (_pinH) { wwQuiet(_pinH); }
      return;
    }
    try {
      var _wwSessReload = false;
      try {
        var _wwNavS = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        _wwSessReload = _wwNavS && _wwNavS.type === 'reload';
      } catch (_ns) {}
      var _sessRestore = '';
      try {
        _sessRestore = (sessionStorage.getItem('ww_last_page') || '').trim();
      } catch (_sr0) {}
      if (_sessRestore && document.getElementById(_sessRestore)) {
        if (wwGuestHashAllowed(_sessRestore)) {
          try {
            if (
              _wwPinBeforeMain[_sessRestore] &&
              typeof wwNeedsPinUnlockBeforeHome === 'function' &&
              wwNeedsPinUnlockBeforeHome()
            ) {
              if (typeof goTo === 'function') {
                goTo('page-password-restore', _wwSessReload ? { forceRoute: true } : {});
              }
              return;
            }
          } catch (_pinS) { wwQuiet(_pinS); }
          if (typeof goTo === 'function') {
            goTo(_sessRestore, _wwSessReload ? { forceRoute: true } : {});
          }
          return;
        }
      }
    } catch (_sessR) { wwQuiet(_sessR); }
    try {
      if (typeof window !== 'undefined' && window._WW_HARD_RELOAD) {
        if (typeof goTo === 'function') goTo('page-welcome');
        return;
      }
    } catch (_hr) { wwQuiet(_hr); }
    var hasWallet = false;
    try {
      var _d = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      hasWallet =
        typeof wwWalletHasValidPersistedAddress === 'function'
          ? wwWalletHasValidPersistedAddress(_d)
          : wwWalletHasAnyChainAddress(_d);
    } catch (_e) { wwQuiet(_e); }
    if (typeof goTo !== 'function') return;
    var _dest = hasWallet ? 'page-home' : 'page-welcome';
    try {
      if (hasWallet && typeof wwNeedsPinUnlockBeforeHome === 'function' && wwNeedsPinUnlockBeforeHome()) {
        _dest = 'page-password-restore';
      }
    } catch (_destE) { wwQuiet(_destE); }
    if (!hasWallet && _dest === 'page-welcome') {
      try {
        sessionStorage.removeItem('ww_last_page');
      } catch (_sl) {
        wwQuiet(_sl);
      }
    }
    goTo(_dest);
  }
  window.addEventListener('hashchange', function () {
    wwApplyHashRoute();
  });
  wwWhenWalletCssReady(function wwBootHashRoutesAfterCss() {
    try {
      wwEnsureInitialHashRoute();
      wwApplyHashRoute();
    } catch (_wb) {
      wwQuiet(_wb);
    }
    /* 与 runtime wwDeferFirstRoutePaint 一致：勿同步 remove，否则与 goTo 同一帧触发 .page opacity 过渡 → 资产页扇动 */
    try {
      if (document.documentElement.classList.contains('ww-first-route-pending')) {
        document.documentElement.classList.add('ww-instant-route');
        requestAnimationFrame(function () {
          try {
            document.documentElement.classList.remove('ww-first-route-pending');
          } catch (_e) {
            wwQuiet(_e);
          }
          requestAnimationFrame(function () {
            try {
              document.documentElement.classList.remove('ww-instant-route');
            } catch (_e2) {
              wwQuiet(_e2);
            }
          });
        });
      }
    } catch (_wwFp) {
      wwQuiet(_wwFp);
    }
    try {
      requestAnimationFrame(function () {
        try {
          if (typeof window.wwFixWelcomeBootIfGuest === 'function') window.wwFixWelcomeBootIfGuest();
        } catch (_fix) {
          wwQuiet(_fix);
        }
      });
    } catch (_rfx) {
      wwQuiet(_rfx);
    }
  });
  window.addEventListener('pageshow', function (e) {
    try {
      if (e.persisted && typeof window.wwFixWelcomeBootIfGuest === 'function') window.wwFixWelcomeBootIfGuest();
    } catch (_ps) {
      wwQuiet(_ps);
    }
  });
})();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  

(function(){
  function run(){
    if(window._wwPaintBoot) return;
    window._wwPaintBoot = true;
    try { if(typeof updateHomeChainStrip==='function') updateHomeChainStrip(); } catch (e) { wwQuiet(e); }
  }
  if(document.readyState==='complete') run();
  else window.addEventListener('load', run);
})();

// ── 生产环境：runtime 会清 hash 并重置欢迎页，再由 ww_last_page 恢复主 Tab。开发环境 WW_DEV_PRESERVE_ROUTE 时保留 hash，刷新即当前页。──

function renderImportGrid(wordCount) {
  var grid = document.getElementById('importGrid');
  var badge = document.getElementById('importWordCountBadge');
  if (!grid) return;
  var n = [12,15,18,21,24].includes(Number(wordCount)) ? Number(wordCount) : 12;
  var html = '';
  for (var i = 0; i < n; i++) {
    html += '<input class="import-word" data-index="'+i+'" type="text" autocomplete="off" spellcheck="false" placeholder="'+(i+1)+'" style="width:100%;min-width:0;padding:10px 8px;border-radius:10px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;box-sizing:border-box;text-align:left;overflow-x:auto;-webkit-overflow-scrolling:touch" />';
  }
  grid.innerHTML = html;
  if (badge) badge.textContent = '0/' + n;
}

function getMnemonicFromImport() {
  var grid = document.getElementById('importGrid');
  var raw = '';
  if (grid) {
    var iw = grid.querySelectorAll('input[id^="iw_"]');
    if (iw.length) {
      raw = Array.from(iw).map(function (el) { return String(el.value || '').trim(); }).filter(Boolean).join(' ');
    } else {
      var inputs = grid.querySelectorAll('.import-word');
      raw = Array.from(inputs).map(function (el) { return String(el.value || '').trim(); }).filter(Boolean).join(' ');
    }
  }
  raw = raw.replace(/\s+/g, ' ').trim();
  var words = raw ? raw.split(' ').filter(Boolean) : [];
  if (![12,15,18,21,24].includes(words.length)) return '';
  return words.join(' ');
}

function syncImportPasteFromGrid() {
  updateImportWordCount();
}

function syncImportGrid(text) {
  var normalized = String(text || '').replace(/\s+/g, ' ').trim();
  var words = normalized ? normalized.split(' ').filter(Boolean) : [];
  var current = document.querySelectorAll('#importGrid .import-word').length || 12;
  var target = [12,15,18,21,24].includes(words.length) ? words.length : current;
  if (current !== target && [12,15,18,21,24].includes(target)) renderImportGrid(target);
  var inputs = Array.from(document.querySelectorAll('#importGrid .import-word'));
  inputs.forEach(function(el, idx){
    var val = String(el.value || '').trim();
    if (val.length > 4) val = val.substring(0, 4);
    el.value = words[idx] || val;
  });
  updateImportWordCount();
}

(function initImportWalletPage(){
  function run(){
    if (!document.getElementById('importGrid')) return;
    renderImportGrid(12);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();

async function doImportWallet() {
  var errEl = document.getElementById('importError');
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
  var mnemonicRaw = getMnemonicFromImport();
  if (!mnemonicRaw) {
    showToast('❌ 助记词格式错误，仅支持 12/15/18/21/24 词', 'error');
    return;
  }
  showWalletLoading();
  try {
    var result = typeof importWalletFlexible === 'function' ? importWalletFlexible(mnemonicRaw, keyMnemonicLang) : (typeof importWallet === 'function' ? importWallet(mnemonicRaw) : null);
    if (!result) {
      if (errEl) { errEl.style.display = 'block'; errEl.textContent = '助记词无效，请检查后重试'; }
      showToast('❌ 助记词无效，请检查后重试', 'error');
      return;
    }

    var flatForStore = {
      mnemonic: result.mnemonic,
      enMnemonic: result.mnemonic,
      words: result.mnemonic.trim().split(/\s+/).filter(Boolean),
      ethAddress: result.eth.address,
      trxAddress: result.trx.address,
      btcAddress: result.btc.address,
      privateKey: result.eth.privateKey,
      trxPrivateKey: result.trx.privateKey,
      createdAt: result.createdAt,
      backedUp: false
    };

    window.REAL_WALLET = {
      mnemonic: result.mnemonic,
      ethAddress: result.eth.address,
      trxAddress: result.trx.address,
      btcAddress: result.btc.address,
      privateKey: result.eth.privateKey,
      trxPrivateKey: result.trx.privateKey,
      createdAt: result.createdAt,
      hasEncrypted: false,
      backedUp: false
    };

    try { localStorage.setItem('ww_import_pending', JSON.stringify(flatForStore)); } catch (e) { wwQuiet(e); }
    try { if (typeof applyReferralCredit === 'function') applyReferralCredit(); } catch (e3) { wwQuiet(e3); }
    try { if (typeof updateAddr === 'function') updateAddr(); } catch (e4) { wwQuiet(e4); }
    var tb = document.getElementById('tabBar');
    if (tb) tb.style.display = 'flex';
    openPinSetupOverlay();
    showToast('✅ 钱包导入成功', 'success');
  } finally {
    hideWalletLoading();
  }
}


// ══ 礼物系统 V1 ══

function createGift() {
  if (!REAL_WALLET || !REAL_WALLET.trxAddress) {
    showToast('请先创建或导入钱包', 'warning');
    return;
  }
  try {
    if (typeof syncHbCountFromInput === 'function') syncHbCountFromInput();
  } catch (_sc) { wwQuiet(_sc); }
  var amtEl = document.getElementById('hbAmount');
  var msgEl = document.getElementById('hbMessage');
  if (!amtEl || !String(amtEl.value || '').trim()) {
    showToast('请输入礼物总金额', 'error');
    return;
  }
  var amount = parseFloat(amtEl.value);
  if (typeof wwRoundUsdt2 === 'function') amount = wwRoundUsdt2(amount);
  else if (isFinite(amount)) amount = Math.round(amount * 100) / 100;
  if (!(amount > 0) || !isFinite(amount)) {
    showToast('请输入有效金额', 'error');
    return;
  }
  var countInput = document.getElementById('hbCountInput');
  if (countInput) {
    var cv = parseInt(countInput.value, 10);
    if (!isFinite(cv) || cv < 1 || cv > 100) {
      showToast('数量需在 1～100 之间', 'error');
      return;
    }
  }
  var hours = typeof hbExpiry === 'number' ? hbExpiry : 24;
  if (!isFinite(hours) || hours <= 0) {
    showToast('请选择有效期', 'error');
    return;
  }
  if (typeof wwAssertUsdtBalanceSufficientForGift === 'function' && !wwAssertUsdtBalanceSufficientForGift(amount)) return;

  if (!window._wwPinBypassCreateGift && typeof wwEnsurePinThenForced === 'function') {
    wwEnsurePinThenForced(function () {
      try {
        window._wwPinBypassCreateGift = true;
        createGift();
      } finally {
        window._wwPinBypassCreateGift = false;
      }
    });
    return;
  }

  if (typeof wwGiftReserveUsdt === 'function' && !wwGiftReserveUsdt(amount)) return;

  var message = msgEl ? String(msgEl.value || '').trim() : '';

  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var allHb = {};
  try { allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}'); } catch (e) { allHb = {}; }
  var keyword = '';
  var tries = 0;
  do {
    keyword = '';
    for (var i = 0; i < 6; i++) keyword += chars[Math.floor(Math.random() * chars.length)];
    tries++;
  } while (allHb[keyword] && tries < 80);
  if (allHb[keyword]) {
    showToast('请重试', 'error');
    if (typeof wwGiftCreditUsdt === 'function') wwGiftCreditUsdt(REAL_WALLET.trxAddress, amount);
    return;
  }

  var count = typeof hbCount === 'number' ? hbCount : 5;
  count = Math.max(1, Math.min(100, count));
  var hours = typeof hbExpiry === 'number' ? hbExpiry : 24;
  var expireAt = Date.now() + hours * 3600000;
  var perPerson = hbType === 'normal' ? (amount / count).toFixed(2) : null;

  allHb[keyword] = {
    keyword: keyword,
    totalAmount: amount,
    count: count,
    perPerson: perPerson,
    type: hbType || 'normal',
    blessing: message,
    expireAt: expireAt,
    createdAt: Date.now(),
    claimed: [],
    creator: REAL_WALLET.trxAddress,
    giftExpiryProcessed: false
  };
  try {
    localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));
  } catch (e2) {
    if (typeof wwGiftCreditUsdt === 'function') wwGiftCreditUsdt(REAL_WALLET.trxAddress, amount);
    showToast('保存失败', 'error');
    return;
  }

  lastHbCreatedKeyword = keyword;
  var kwEl = document.getElementById('hbCreatedKeyword');
  var box = document.getElementById('hbKeywordResult');
  if (kwEl) kwEl.textContent = keyword;
  if (box) box.style.display = 'block';
  var sentSt = document.getElementById('hbSentStatus');
  if (sentSt) {
    sentSt.style.display = 'block';
    sentSt.textContent = '✓ 已发送 · 好友可凭口令领取';
  }

  if (amtEl) amtEl.value = '';
  if (msgEl) msgEl.value = '';

  try {
    if (typeof wwRunGiftExpirySettlement === 'function') wwRunGiftExpirySettlement();
  } catch (_e3) { wwQuiet(_e3); }
  showToast('🎁 礼物创建成功（已从余额扣除 ' + amount + ' TRC USDT）', 'success');
  if (typeof updateGiftUI === 'function') updateGiftUI();
  if (typeof updateGiftCountBadge === 'function') updateGiftCountBadge();
}

function copyHbCreatedKeyword() {
  var t = lastHbCreatedKeyword;
  var el = document.getElementById('hbCreatedKeyword');
  if (!t && el) t = el.textContent;
  t = String(t || '').trim();
  if (!t || t === '—') {
    showToast('无口令可复制', 'warning');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function () {
      showToast('已复制口令', 'success');
    }).catch(function () {
      showToast('复制失败', 'error');
    });
  } else {
    showToast('复制失败', 'error');
  }
}

function shareHbCreatedKeyword() {
  var keyword = lastHbCreatedKeyword;
  var el = document.getElementById('hbCreatedKeyword');
  if (!keyword && el) keyword = el.textContent;
  keyword = String(keyword || '').trim();
  if (!keyword || keyword === '—') {
    showToast('请先创建礼物', 'warning');
    return;
  }
  if(keyword && keyword.length<=64){
    var shareUrl = 'https://worldtoken.cc/wallet.html?claim=' + encodeURIComponent(keyword.substring(0,32));
  }else{
    return;
  }
  var text = 'WorldToken 礼物口令：' + keyword + ' 打开链接领取 ' + shareUrl;
  if (navigator.share) {
    navigator.share({ title: '礼物', text: text }).catch(function () {});
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      showToast('已复制分享内容', 'success');
    }
  } catch (e) { wwQuiet(e); }
}

function wwBindDataActionNav() {
  document.querySelectorAll('[data-action="create"]').forEach(function (el) {
    el.addEventListener('click', function () {
      if (typeof createNewWallet === 'function') createNewWallet();
      else goTo('page-welcome');
    });
  });
  document.querySelectorAll('[data-action="unlock"]').forEach(function (el) {
    el.addEventListener('click', function () { goTo('page-password-restore'); });
  });
  document.querySelectorAll('[data-action="import"]').forEach(function (el) {
    el.addEventListener('click', function () { goTo('page-import'); });
  });
  document.querySelectorAll('[data-action="back"]').forEach(function (el) {
    el.addEventListener('click', function () { goTo('page-welcome'); });
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wwBindDataActionNav);
} else {
  wwBindDataActionNav();
}

function openSystemNotificationsPanel() {
  var o = document.getElementById('systemNotifOverlay');
  if (o) o.classList.add('show');
  else if (typeof showToast === 'function') showToast('暂无系统通知', 'info');
}

function closeSystemNotificationsPanel() {
  var o = document.getElementById('systemNotifOverlay');
  if (o) o.classList.remove('show');
}

function closeSwapHistory() {
  var el = document.getElementById('swapHistoryOverlay');
  if (el) el.classList.remove('show');
}

function confirmSwapGo() {
  var sf = typeof swapFrom !== 'undefined' ? swapFrom : null;
  var st = typeof swapTo !== 'undefined' ? swapTo : null;
  var recipEvm = '';
  try {
    recipEvm = String(window._wwSwapRecipientAddr || '').trim();
  } catch (_r) {}
  var amtStr = '';
  try {
    var ain = typeof _safeEl === 'function' ? _safeEl('swapAmountIn') : document.getElementById('swapAmountIn');
    if (ain && ain.value !== undefined && ain.value !== null) amtStr = String(ain.value).trim();
  } catch (_a) {}
  var amtNum = parseFloat(amtStr);
  var slip = 0.5;
  try {
    if (typeof wwGetSwapSlippagePct === 'function') {
      var sp = wwGetSwapSlippagePct();
      if (typeof sp === 'number' && isFinite(sp) && sp > 0 && sp <= 50) slip = sp;
    }
  } catch (_s) {}

  try {
    if (
      sf &&
      st &&
      typeof wwSwapExecEvm !== 'undefined' &&
      wwSwapExecEvm &&
      typeof wwSwapExecEvm.canRun === 'function' &&
      typeof wwSwapExecEvm.run === 'function' &&
      wwSwapExecEvm.canRun(sf, st)
    ) {
      if (!isFinite(amtNum) || amtNum <= 0) {
        if (typeof showToast === 'function') showToast('请输入兑换金额', 'warning');
        return;
      }
      if (typeof closeSwapConfirm === 'function') closeSwapConfirm();
      var recipArg = null;
      if (recipEvm && /^0x[a-fA-F0-9]{40}$/.test(recipEvm)) recipArg = recipEvm;
      var runP = wwSwapExecEvm.run({
        swapFrom: sf,
        swapTo: st,
        amountInStr: amtStr,
        slippagePct: slip,
        recipientEvm: recipArg,
        onProgress: function (phase) {
          try {
            if (typeof showToast === 'function' && phase === 'approve') showToast('正在授权代币…', 'info', 2200);
          } catch (_p) {}
        }
      });
      if (runP && typeof runP.then === 'function') {
        runP
          .then(function (hash) {
            try {
              if (typeof showToast === 'function') {
                showToast('链上兑换已提交 ' + String(hash).slice(0, 12) + '…', 'success', 4200);
              }
            } catch (_t) {}
            try {
              if (typeof loadBalances === 'function') loadBalances();
            } catch (_l) {}
          })
          .catch(function (e) {
            var msg = e && e.message ? String(e.message) : String(e);
            if (typeof showToast === 'function') showToast(msg, 'error', 5200);
          });
      }
      return;
    }
  } catch (_ex) {
    try {
      if (typeof wwQuiet === 'function') wwQuiet(_ex);
    } catch (_q) {}
  }

  if (typeof openDex === 'function') {
    openDex();
    return;
  }
  if (typeof doSwap === 'function') doSwap();
}

function wwDoTransferApprove() {
  if (typeof showToast === 'function') {
    showToast('请在钱包内完成授权（若页面无响应请刷新后重试）', 'info', 3200);
  }
}

function saveReceiveQrImage() {
  var q = document.getElementById('qrCanvas');
  if (!q || !q.toDataURL) {
    if (typeof showToast === 'function') showToast('二维码未就绪', 'warning');
    return;
  }
  try {
    var a = document.createElement('a');
    a.download = 'worldwallet-receive.png';
    a.href = q.toDataURL('image/png');
    a.click();
    if (typeof showToast === 'function') showToast('已触发保存', 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast(wwFmtUserError(e, '保存失败'), 'error');
  }
}
