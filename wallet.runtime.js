/*! WorldToken wallet.runtime.js — split from wallet.html; refactor incrementally. */

var _pin = null;

// 强制清除旧 Service Worker 和缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(k => caches.delete(k));
  });
}

function tapHaptic(ms) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms === undefined ? 12 : ms); } catch (e) {}
}
document.addEventListener('click', function(ev) {
  var el = ev.target.closest('.tab-item,.quick-btn,#homeCopyBtn,#balRefreshBtn,.btn-primary,.btn-secondary');
  if (!el) return;
  tapHaptic(12);
}, true);

function parseUsdFromBalanceTxt(txt) {
  if (!txt) return 0;
  var n = parseFloat(String(txt).replace(/[$,\s]/g, ''));
  return isFinite(n) ? n : 0;
}
function cancelHomeBalanceAnim() {
  if (window._homeBalanceAnimRaf) {
    cancelAnimationFrame(window._homeBalanceAnimRaf);
    window._homeBalanceAnimRaf = 0;
  }
}
function animateHomeUsdTo(targetUsd, fmtUsdFn) {
  cancelHomeBalanceAnim();
  var el = document.getElementById('totalBalanceDisplay');
  var from = parseUsdFromBalanceTxt(el ? el.textContent : '');
  if (!isFinite(from)) from = 0;
  var dur = 560;
  var t0 = null;
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function tick(now) {
    if (!t0) t0 = now;
    var p = Math.min(1, (now - t0) / dur);
    var v = from + (targetUsd - from) * easeOutCubic(p);
    if (el) el.textContent = fmtUsdFn(p < 1 ? v : targetUsd);
    if (p < 1) window._homeBalanceAnimRaf = requestAnimationFrame(tick);
    else window._homeBalanceAnimRaf = 0;
  }
  window._homeBalanceAnimRaf = requestAnimationFrame(tick);
}

function loadTronWeb(){return new Promise(r=>{if(window.TronWeb){r();return;}const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js';s.onload=r;document.head.appendChild(s);});}
var _qrLoadPromise=null;
function loadQRCodeLib(){
  if(typeof QRCode!=='undefined'&&QRCode.toCanvas)return Promise.resolve();
  if(_qrLoadPromise)return _qrLoadPromise;
  _qrLoadPromise=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
    s.async=true;
    s.onload=function(){res();};
    s.onerror=function(){_qrLoadPromise=null;rej(new Error('qrcode load failed'));};
    document.head.appendChild(s);
  });
  return _qrLoadPromise;
}
function countMnemonicWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}
function updateImportWordCount() {
  const input = document.getElementById('importPaste');
  const badge = document.getElementById('importWordCountBadge');
  if(!badge) return;
  const n = countMnemonicWords(input ? input.value : '');
  var max = 12;
  try {
    var grid = document.getElementById('importGrid');
    if (grid) {
      var nIw = grid.querySelectorAll('input[id^="iw_"]').length;
      var nAw = grid.querySelectorAll('.import-word').length;
      if (nIw > 0) max = nIw;
      else if (nAw > 0) max = nAw;
      else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) max = importGridWordCount;
    } else if (typeof importGridWordCount === 'number' && importGridWordCount > 0) {
      max = importGridWordCount;
    }
  } catch (_e) {}
  badge.textContent = n + '/' + max;
}
function setWalletCreateStep(n) {
  const steps = document.getElementById('walletCreateSteps');
  const text = document.getElementById('walletLoadingText');
  const labels = ['正在生成钱包…', '1/3 生成密钥', '2/3 派生地址', '3/3 完成'];
  if (text) text.textContent = (n >= 1 && n <= 3) ? labels[n] : labels[0];
  if (!steps) return;
  try { steps.querySelectorAll('[data-step]').forEach(function(el, i) { el.classList.toggle('active', (i + 1) === n); }); } catch (e) {}
}
function showWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.add('show');
  
}
function hideWalletLoading() {
  const el = document.getElementById('walletLoadingOverlay');
  if(el) el.classList.remove('show');
  
}



const LANG_INFO = {
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
function detectDeviceLang() {
  function resolveTag(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const raw = tag.trim().replace(/_/g, '-');
    if (!raw) return null;
    if (LANG_INFO[raw]) return raw;
    const lower = raw.toLowerCase();
    for (const k of Object.keys(LANG_INFO)) {
      if (k.toLowerCase() === lower) return k;
    }
    if (lower === 'zh-cn' || lower.startsWith('zh-hans')) return 'zh';
    if (lower === 'zh-tw' || (lower.includes('hant') && lower.includes('tw'))) return 'zh-TW';
    if (lower === 'zh-hk' || lower === 'zh-mo' || (lower.includes('hant') && lower.includes('hk'))) return 'zh-HK';
    if (lower.startsWith('zh')) return 'zh';
    const base = lower.split('-')[0];
    if (LANG_INFO[base]) return base;
    return null;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length) {
      for (let i = 0; i < navigator.languages.length; i++) {
        const r = resolveTag(navigator.languages[i]);
        if (r) return r;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const r = resolveTag(navigator.language);
      if (r) return r;
    }
  } catch (e) {}
  return 'zh';
}

// 扩展语言词库（万语地址用）
// ⏱️ 词库懒加载：WW_WORDS_EXTRA 在地址生成时按需访问
const WW_WORDS_EXTRA = {
  zh:['北京','上海','广州','深圳','成都','重庆','杭州','武汉','西安','南京','天津','苏州','长沙','郑州','青岛','沈阳','宁波','东莞','无锡','福州','厦门','哈尔滨','昆明','大连','合肥','济南','温州','南宁','长春','贵阳','佛山','南昌','石家庄','太原','乌鲁木齐','呼和浩特','拉萨','银川','西宁','海口','三亚','兰州','桂林','丽江','大理','张家界','敦煌','吐鲁番','喀什','格尔木','日喀则','林芝','遵义','凯里','兴义','都匀','荔波','镇远','黎平','台州','温岭','临海','玉环','黄岩','椒江','路桥','仙居','天台','三门','丽水','龙泉','云和','庆元','景宁','缙云','遂昌','松阳','青田','宿迁','泗阳','沭阳','泗洪','钟山','六枝','织金','纳雍','赫章','威宁','大方','黔西','金沙','铜仁','碧江','万山','玉屏','松桃','沿河','印江','德江','思南','石阡','江口','榕江','从江','锦屏','天柱','岑巩','三穗','施秉','黄平','剑河','台江','丹寨','雷山','麻江','福泉','贵定','龙里','惠水','长顺','罗甸','平塘','独山','三都','瓮安','余庆','湄潭','凤冈','正安','道真','务川','绥阳','桐梓','习水','赤水','仁怀'],
  en:[]
};

// ── 补充缺失函数定义 ──────────────────────────────────────────
function updateRealAddr() {
  // 英语模式下更新地址显示为公链地址
  if(REAL_WALLET && REAL_WALLET.ethAddress) {
    const chip = document.getElementById('homeAddrChip');
    if(chip) chip.textContent = REAL_WALLET.trxAddress || REAL_WALLET.ethAddress;
    const sa = document.getElementById('settingsAddr');
    if(sa) sa.textContent = REAL_WALLET.ethAddress;
  }
  if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
}

// ── 万语地址系统 ──────────────────────────────────────────
const ADDR_WORDS = []; // 10个字槽，每个 {word, lang, custom}

function randDigits(n) {
  let s = '';
  for(let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
}

// 手机键盘可打出的字符（仅保留真正可输入的字母字符）
const SINGLE_CHARS = {
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

function initAddrWords() {
  ADDR_WORDS.length = 0;
  for(let i=0;i<10;i++) {
    const lang = randLang();
    ADDR_WORDS.push({word: randWord(lang), lang, custom: false});
  }
  // 随机前后缀
  document.getElementById('addrPrefix').textContent = randDigits(8);
  document.getElementById('addrSuffix').textContent = randDigits(8);
  renderAddrWords();
  // 同步所有地方的地址显示（统一单行）
  setTimeout(() => {
    const addr = getNativeAddr();
    // 统一样式：单行 + 居中
    const ADDR_STYLE = 'font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;width:100%;display:block';
    // 首页芯片
    const chip = document.getElementById('homeAddrChip');
    if(chip) {
      const pre = addr.substring(0, 8);
      const mid = addr.substring(8, 18);
      const suf = addr.substring(18);
      chip.innerHTML = '<span style="color:rgba(255,255,255,0.35);font-size:10px">' + pre + '</span>' +
        '<span style="color:#f0d070;font-weight:700;font-size:13px;letter-spacing:1px">' + mid + '</span>' +
        '<span style="color:rgba(255,255,255,0.35);font-size:10px">' + suf + '</span>';
      chip.style.cssText += ';text-align:center;display:block';
    }
    // QR大字（居中 + 高亮）
    const qp1 = document.getElementById('qrPart1');
    const qp2 = document.getElementById('qrPart2');
    if(qp1) {
      const prefix = document.getElementById('addrPrefix')?.textContent || '';
      const suffix = document.getElementById('addrSuffix')?.textContent || '';
      let html = `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${prefix}</span>`;
      ADDR_WORDS.forEach(w => {
        if(w.custom) {
          html += `<span style="color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)">${w.word}</span>`;
        } else {
          html += `<span style="color:#8888bb;font-size:13px">${w.word}</span>`;
        }
      });
      html += `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${suffix}</span>`;
      qp1.innerHTML = html;
    }
    if(qp2) qp2.style.display = 'none';
    // QR弹窗
    const qm = document.getElementById('qrAddrMain');
    if(qm) { qm.textContent = addr; qm.style.cssText = 'font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#1a1a1a;text-align:center;display:block;margin-bottom:4px'; }
    // 设置页
    const sa = document.getElementById('settingsAddr');
    if(sa) { sa.textContent = addr; sa.style.cssText = 'font-size:10px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
    // swoosh（单行居中）
    const sfp1 = _safeEl('swooshFromPart1');
    const sfp2 = _safeEl('swooshFromPart2');
    if(sfp1) { sfp1.textContent = addr; sfp1.style.cssText = 'font-size:10px;font-weight:700;color:#f0d070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
    if(sfp2) sfp2.style.display = 'none';
    // 成功页（单行居中）
    const suc1 = _safeEl('successFromPart1');
    const suc2 = _safeEl('successFromPart2');
    if(suc1) { suc1.textContent = addr; suc1.style.cssText = 'font-size:10px;font-weight:700;color:#f0d070;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
    if(suc2) suc2.style.display = 'none';
  }, 50);
}

function renderAddrWords() {
  const container = document.getElementById('addrWords');
  if(!container) return;
  // 确保 suffix/prefix 只含8位数字
  const pre = document.getElementById('addrPrefix');
  const suf = document.getElementById('addrSuffix');
  if(pre) pre.textContent = (pre.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  if(suf) suf.textContent = (suf.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  // 每个字符等宽盒子，定制字金色高亮，随机字淡紫（DOM + textContent，避免 innerHTML XSS）
  container.innerHTML = '';
  ADDR_WORDS.forEach(w => {
    const span = document.createElement('span');
    span.textContent = w.word;
    span.style.cssText = w.custom
      ? 'display:inline-flex;align-items:center;justify-content:center;width:18px;color:#f0d070;font-size:17px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)'
      : 'display:inline-flex;align-items:center;justify-content:center;width:18px;color:#8888bb;font-size:16px';
    container.appendChild(span);
  });
  // 同步 addrMain
  const m = (_safeEl('addrMain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* addrMain fallback */;
  if(m) m.textContent = ADDR_WORDS.map(w=>w.word).join('');
  // 同步 QR 高亮
  const qp1 = document.getElementById('qrPart1');
  if(qp1 && ADDR_WORDS.length) {
    qp1.innerHTML = '';
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);

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
  }
}

function openCustomizeAddr() {
  openWordEditor(0);
}

function openWordEditor(idx) {
  const w = ADDR_WORDS[idx];
  const info = LANG_INFO[w.lang] || {flag:'🌍', name:'?'};

  // 弹出简单的 prompt 式选择
  const langList = Object.keys(SAMPLE_KEYS).filter(l=>l!=='en').map(l=>{
    const i = LANG_INFO[l]||{flag:'🌍',name:l};
    return `${i.flag} ${i.name} (${l})`;
  }).join('\n');

  const input = window.prompt(
    `第 ${idx+1} 个字（当前：${info.flag} "${w.word}"）\n\n输入新词（直接输入），或留空随机\n\n可用语言：${Object.entries(LANG_INFO).filter(([l])=>l!=='en').map(([l,i])=>i.flag+l).join(' ')}`,
    w.custom ? w.word : ''
  );

  if(input === null) return; // 取消

  const trimmed = input.trim();
  if(trimmed === '') {
    // 随机
    const lang = randLang();
    ADDR_WORDS[idx] = {word: randWord(lang), lang, custom: false};
  } else {
    if (trimmed.length > 4) {
      alert('词长度必须在 1-4 个字符之间');
      return;
    }
    if (!/^[\u4e00-\u9fff\u3040-\u309f\uac00-\ud7af\u0600-\u06ff\u0400-\u04ff\u0900-\u097f\u0e00-\u0e7f\u1ea0-\u1ef9\u0100-\u017f\u0370-\u03ff\u0600-\u06ff]+$/.test(trimmed)) {
      alert('仅允许输入字符');
      return;
    }
    ADDR_WORDS[idx] = {word: trimmed, lang: w.lang, custom: true};
  }
  renderAddrWords();
}

// getNativeAddr 已统一到下方定义



// ── 真实钱包存储 ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
// WorldToken 多语言词库引擎 v2.0
// 每语言 2048 词，索引对应 BIP39，支持双向转换
// ═══════════════════════════════════════════════════════
// WT_WORDLISTS loaded from wordlists.js


// 英文词 → 索引（BIP39标准索引）
const EN_WORD_INDEX = {};
WT_WORDLISTS.en.forEach((w, i) => EN_WORD_INDEX[w] = i);

// 各语言词 → 索引
const WT_LANG_INDEX = {};
Object.keys(WT_WORDLISTS).forEach(lang => {
  WT_LANG_INDEX[lang] = {};
  WT_WORDLISTS[lang].forEach((w, i) => WT_LANG_INDEX[lang][w] = i);
});

/**
 * 英文助记词 → 目标语言助记词
 * @param {string} mnemonic - 标准BIP39英文助记词
 * @param {string} lang - 目标语言
 * @returns {string} 目标语言助记词（空格分隔）
 */
function mnemonicToLang(mnemonic, lang) {
  if (!lang || lang === "en" || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  return words.map(w => {
    const idx = EN_WORD_INDEX[w];
    if (idx === undefined) return w; // 未知词保持原样
    return WT_WORDLISTS[lang][idx] || w;
  }).join(" ");
}

/** 英文 BIP39 词数组 → 当前语言密钥表词条（词数与上方词数选择一致，逐词映射索引） */
function enWordsToLangKeyTableWords(enWords, lang) {
  if (!enWords || !enWords.length) return [];
  if (!lang || lang === 'en') return enWords.slice();
  if (!WT_WORDLISTS[lang]) return enWords.slice();
  return enWords.map(function (w) {
    const idx = EN_WORD_INDEX[w];
    if (idx === undefined) return w;
    return WT_WORDLISTS[lang][idx] || w;
  });
}

/**
 * 任意语言助记词 → 英文BIP39助记词
 * @param {string} mnemonic - 任意语言助记词
 * @param {string} lang - 输入语言
 * @returns {string} 标准英文助记词
 */
function mnemonicFromLang(mnemonic, lang) {
  if (!lang || lang === "en" || !WT_WORDLISTS[lang]) return mnemonic;
  const words = mnemonic.trim().split(/\s+/);
  const langIndex = WT_LANG_INDEX[lang] || {};
  return words.map(w => {
    const idx = langIndex[w];
    if (idx === undefined) return w;
    return WT_WORDLISTS.en[idx] || w;
  }).join(" ");
}

const _safeEl = (id) => document.getElementById(id) || {
  textContent: '', innerHTML: '', value: '0', style: {display:'',cssText:'',color:'',background:'',opacity:'',width:'',transform:''},
  classList: {add:()=>{},remove:()=>{},contains:()=>false},
  href: '', disabled: false,
  addEventListener: ()=>{}, focus: ()=>{}, blur: ()=>{}, remove: ()=>{}
};
/** REAL_WALLET 在 wallet.core.js 声明；此处不重复 let/var */

/** 密钥页词数；新建默认 12，须与 #mnemonicLength、下方网格词数一致（仅内存，不写入 localStorage） */
let currentMnemonicLength = 12;
/** 导入页格子词数（与 #importGrid 一致；勿与密钥页 currentMnemonicLength 混用） */
let importGridWordCount = 12;

/** 会话 PIN（仅存内存，不读 localStorage 明文） */
var _wwSessionPin = '';
function wwGetSessionPin() { return _wwSessionPin || ''; }
function wwSetSessionPin(p) {
  _wwSessionPin = p ? String(p) : '';
  _pin = p ? String(p) : null;
  clearTimeout(window._wwSessionPinTimeout);
  window._wwSessionPinTimeout = setTimeout(function() {
    _wwSessionPin = '';
    _pin = null;
    console.log('[SessionPin] 会话 PIN 已自动清除');
  }, 15 * 60 * 1000);
}
function wwClearSessionPin() {
  clearTimeout(window._wwSessionPinTimeout);
  window._wwSessionPinTimeout = null;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = null;
  _wwSessionPin = '';
  _pin = null;
}

function wwCleanupMemory() {
  if (REAL_WALLET) {
    REAL_WALLET.privateKey = null;
    REAL_WALLET.trxPrivateKey = null;
    REAL_WALLET.mnemonic = null;
    REAL_WALLET.enMnemonic = null;
    REAL_WALLET.words = null;
  }
  window._wwSessionPin = '';
  _pin = null;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = null;
  window._wwTotpPendingSecret = null;
  window._wwLastActivityTs = null;
  window._wwLastPortfolioParts = null;
  window._wwLastPortfolioTotal = null;
  window._wwUnlockPreservePage = false;
  window._wwForceIdleLock = false;
  window._wwTxHistoryCache = null;
  clearTimeout(window._wwSessionPinTimeout);
  clearTimeout(window._wwIdleLockTimer);
}

function wwCleanupStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('_temp') || key.includes('_pending'))) {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    }
  } catch (e) {}
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    wwClearSessionPin();
    if (REAL_WALLET) {
      REAL_WALLET.privateKey = null;
      REAL_WALLET.trxPrivateKey = null;
      REAL_WALLET.mnemonic = null;
    }
  }
});

window.addEventListener('beforeunload', function() {
  wwClearSessionPin();
  wwCleanupMemory();
  try { wwCleanupStorage(); } catch (_wcs) {}
  try { sessionStorage.clear(); } catch (e) {}
});

/** 是否已配置 PIN（hash、迁移标志，或尚未迁移的 6 位明文） */
function wwHasPinConfigured() {
  try {
    if (localStorage.getItem('ww_pin_hash')) return true;
    if (localStorage.getItem('ww_pin_set') === '1') return true;
    var p = '';
    if (typeof Store !== 'undefined' && Store.getPin) p = Store.getPin();
    else {
      p = (_pin || '') || localStorage.getItem('ww_unlock_pin') || '';
    }
    return !!(p && /^\d{6}$/.test(String(p)));
  } catch (e) { return false; }
}
(function wwMigratePlainPinToHashOnce() {
  if (typeof savePinSecure !== 'function') return;
  try {
    if (localStorage.getItem('ww_pin_hash')) return;
    var plain = localStorage.getItem('ww_unlock_pin') || (_pin || '');
    if (!plain || !/^\d{6}$/.test(String(plain))) return;
    savePinSecure(plain).then(function() {
      wwSetSessionPin(plain);
      try { localStorage.setItem('ww_pin_set', '1'); } catch (e) {}
    }).catch(function(e) { console.warn('[PIN migrate]', e); });
  } catch (e) {}
})();

// ⚠️ 注意：私钥存储于 localStorage，仅供演示，生产环境应加密
// ── 钱包加密存储模块 ───────────────────────────────────────────

/**
 * 从 PIN 派生 AES-GCM 密钥
 * @param {string} pin - 用户 PIN
 * @param {Uint8Array} salt - 16字节盐
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-GCM 加密
 * @param {string} plaintext - 明文 JSON 字符串
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{salt:string, iv:string, data:string}>} Base64 编码
 */
async function encryptWithPin(plaintext, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPin(pin, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

/**
 * AES-GCM 解密
 * @param {{salt:string, iv:string, data:string}} bundle - 加密包
 * @param {string} pin - 用户 PIN
 * @returns {Promise<string>} 解密后的明文
 */
async function decryptWithPin(bundle, pin) {
  const salt = Uint8Array.from(atob(bundle.salt), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(bundle.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0));
  const key = await deriveKeyFromPin(pin, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv }, key, data
  );
  return new TextDecoder().decode(decrypted);
}

async function encryptTotpSecret(sec, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPin(pin, salt);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(sec)
  );
  const data = {
    v: 1,
    s: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    c: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
  return JSON.stringify(data);
}

async function decryptTotpSecret(encrypted, pin) {
  try {
    const data = JSON.parse(encrypted);
    const salt = new Uint8Array(atob(data.s).split('').map(function(c) { return c.charCodeAt(0); }));
    const iv = new Uint8Array(atob(data.iv).split('').map(function(c) { return c.charCodeAt(0); }));
    const ct = new Uint8Array(atob(data.c).split('').map(function(c) { return c.charCodeAt(0); }));
    const key = await deriveKeyFromPin(pin, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ct
    );
    return new TextDecoder().decode(plaintext);
  } catch (e) {
    console.error('[TOTP decrypt failed]', e);
    return null;
  }
}

/**
 * 保存钱包（敏感数据加密）
 * @param {object} w - 完整钱包对象
 * @param {string} pin - 用户 PIN（无 PIN 则不存敏感数据）
 */
async function saveWalletSecure(w, pin) {
  try {
    // 公开信息（始终明文存储）
    var safe = {
      ethAddress: w.ethAddress,
      trxAddress: w.trxAddress,
      btcAddress: w.btcAddress || '',
      createdAt: w.createdAt,
      backedUp: w.backedUp || false
    };
    // 有 PIN → 加密敏感数据
    if (pin) {
      var sensitive = JSON.stringify({
        mnemonic: w.mnemonic,
        enMnemonic: w.enMnemonic || w.mnemonic,
        words: w.words,
        privateKey: w.privateKey,
        trxPrivateKey: w.trxPrivateKey
      });
      safe.encrypted = await encryptWithPin(sensitive, pin);
    }
    localStorage.setItem('ww_wallet', JSON.stringify(safe));
  } catch (e) {
    console.error('[saveWalletSecure] error:', e);
  }
}

/* loadWalletPublic 定义在 wallet.core.js（同步 REAL_WALLET / CHAIN_ADDR）；勿在此重复声明 */

/**
 * 解密敏感数据（需要时调用，用完清除）
 * @param {string} pin - 用户 PIN
 * @returns {Promise<{mnemonic,enMnemonic,privateKey,trxPrivateKey}|null>}
 */
async function decryptSensitive(pin) {
  try {
    var d = localStorage.getItem('ww_wallet');
    if (!d) return null;
    var parsed = JSON.parse(d);
    if (!parsed.encrypted) return null;
    var plaintext = await decryptWithPin(parsed.encrypted, pin);
    return JSON.parse(plaintext);
  } catch (e) {
    console.error('[decryptSensitive] error:', e);
    return null;
  }
}


// ── 旧 saveWallet（保留兼容，内部调用 saveWalletSecure）──
function saveWallet(w) {
  var pin = _pin || '';
  if (pin) {
    saveWalletSecure(w, pin).catch(function (e) { _saveWalletPlainPublicOnly(w); });
  } else {
    _saveWalletPlainPublicOnly(w);
  }
}

/** 只存公开信息（无 PIN 降级方案） */
function _saveWalletPlainPublicOnly(w) {
  try {
    var safe = {
      ethAddress: w.ethAddress,
      trxAddress: w.trxAddress,
      btcAddress: w.btcAddress || '',
      createdAt: w.createdAt,
      backedUp: w.backedUp || false
    };
    localStorage.setItem('ww_wallet', JSON.stringify(safe));
  } catch(e) {}
}

/* loadWallet 定义在 wallet.core.js（含万语地址初始化与移除 html.ww-addr-pending）；勿在此重复声明，否则会覆盖核心实现导致异常 */

const WW_REF_INVITES_KEY = 'ww_ref_invites_v1';
function getRefInvitesMap() {
  try { return JSON.parse(localStorage.getItem(WW_REF_INVITES_KEY) || '{}'); } catch (e) { return {}; }
}
function saveRefInvitesMap(m) {
  try { localStorage.setItem(WW_REF_INVITES_KEY, JSON.stringify(m)); } catch (e) {}
}
function normalizeRefCode(s) {
  if (!s || typeof s !== 'string') return '';
  s = s.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return s.slice(0, 32);
}
function captureReferralFromUrl() {
  try {
    var u = new URL(location.href);
    var r = u.searchParams.get('ref');
    if (r) {
      r = normalizeRefCode(r);
      if (r.length >= 6 && r.length <= 32) {
        sessionStorage.setItem('ww_ref_pending', r);
        u.searchParams.delete('ref');
        history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
      }
    }
  } catch (e) {}
}
function getMyReferralCodeForWallet(w) {
  if (!w || !w.ethAddress) return '';
  var addr = String(w.ethAddress).toLowerCase();
  try {
    if (typeof ethers !== 'undefined' && ethers.utils && ethers.utils.keccak256) {
      var h = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('wwref:' + addr));
      return h.slice(2, 12);
    }
  } catch (e) {}
  return addr.replace(/^0x/, '').slice(0, 10);
}
function getMyReferralCode() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) return '';
  return getMyReferralCodeForWallet(REAL_WALLET);
}
function getInviteCountForCode(code) {
  var m = getRefInvitesMap();
  var n = m[code];
  return typeof n === 'number' && !isNaN(n) ? n : 0;
}
function applyReferralCredit() {
  try {
    if (localStorage.getItem('ww_ref_install_credited') === '1') return;
    var pending = sessionStorage.getItem('ww_ref_pending');
    if (!pending) return;
    if (!REAL_WALLET || !REAL_WALLET.ethAddress) return;
    var myCode = getMyReferralCodeForWallet(REAL_WALLET);
    if (pending === myCode) return;
    var map = getRefInvitesMap();
    map[pending] = (map[pending] || 0) + 1;
    saveRefInvitesMap(map);
    localStorage.setItem('ww_ref_install_credited', '1');
    sessionStorage.removeItem('ww_ref_pending');
    if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  } catch (e) {}
}
function getReferralShareUrl() {
  var code = getMyReferralCode();
  if (!code) return '';
  try {
    var u = new URL(location.href);
    u.searchParams.set('ref', code);
    return u.toString().split('#')[0];
  } catch (e) {
    return 'https://worldtoken.cc/wallet.html?ref=' + encodeURIComponent(code);
  }
}
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
const BIP39_WORDS = ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident','account','accuse','achieve','acid','acoustic','acquire','across','act','action','actor','actress','actual','adapt','add','addict','address','adjust','admit','adult','advance','advice','aerobic','afford','afraid','again','age','agent','agree','ahead','aim','air','airport','aisle','alarm','album','alcohol','alert','alien','all','alley','allow','almost','alone','alpha','already','also','alter','always','amateur','amazing','among','amount','amused','analyst','anchor','ancient','anger','angle','angry','animal','ankle','announce','annual','another','answer','antenna','antique','anxiety','any','apart','apology','appear','apple','approve','april','arch','arctic','area','arena','argue','arm','armor','army','around','arrange','arrest','arrive','arrow','art','artefact','artist','artwork','ask','aspect','assault','asset','assist','assume','asthma','athlete','atom','attack','attend','attitude','attract','auction','audit','august','aunt','author','auto','autumn','average','avocado','avoid','awake'];

function generateLocalMnemonic() {
  const words = [];
  for(let i = 0; i < 12; i++) {
    words.push(BIP39_WORDS[Math.floor(Math.random() * BIP39_WORDS.length)]);
  }
  return words.join(' ');
}

function formatWalletCreateError(e) {
  if (!e) return '创建失败：未知错误';
  const raw = String(e.message || e.reason || '');
  if (/^创建失败：/.test(raw)) return raw;
  if (typeof ethers === 'undefined')
    return '创建失败：钱包库（ethers）未加载，请检查网络后刷新页面';
  if (e.name === 'QuotaExceededError' || /quota|存储空间|exceeded/i.test(raw))
    return '创建失败：浏览器存储已满或受限，请清理本站数据后重试';
  if (/ethers is not defined|ethers.*undefined/i.test(raw) || (e.name === 'ReferenceError' && /ethers/i.test(raw)))
    return '创建失败：钱包库（ethers）未加载，请检查网络后刷新页面';
  if (/invalid mnemonic|checksum|invalid entropy|bad seed/i.test(raw))
    return '创建失败：助记词生成异常（' + raw + '）';
  if (/fromMnemonic|HDNode|hardened|path/i.test(raw))
    return '创建失败：密钥派生失败（' + raw + '）';
  if (raw) return '创建失败：' + raw;
  return '创建失败：' + (e.name || String(e));
}
function walletCreateYield() {
  return new Promise(function(resolve) {
    requestAnimationFrame(function() { setTimeout(resolve, 16); });
  });
}
/** BIP39：12/15/18/21/24 词对应 128/160/192/224/256 bit 熵 */
function getEntropyByteCountForMnemonicWords(n) {
  const map = { 12: 16, 15: 20, 18: 24, 21: 28, 24: 32 };
  return map[n] || 16;
}
function getTargetMnemonicWordCount() {
  try {
    const activePage = document.querySelector('.page.active');
    const aid = activePage && activePage.id;
    // 「设置钱包」里创建新钱包：固定 12 词，不沿用密钥页曾选过的 15/18/24（否则会生成错误词数）
    if (aid === 'page-create') return 12;
  } catch (e) {}
  let n = typeof currentMnemonicLength === 'number' ? currentMnemonicLength : 12;
  if (![12, 15, 18, 21, 24].includes(n)) n = 12;
  // 不读 #mnemonicLength DOM：浏览器可能恢复上次的选中项，导致词数与内存/钱包不一致
  return n;
}
/** 密钥页下拉：与 currentMnemonicLength 同步 */
function syncMnemonicLengthChoice(v) {
  const n = parseInt(v, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(n)) return;
  currentMnemonicLength = n;
  try {
    const mk = document.getElementById('mnemonicLength');
    if (mk) mk.value = String(n);
  } catch (e) {}
}
/** 页面加载时初始化密钥页下拉为 12（不读 REAL_WALLET.enMnemonic 词数；词数不写入 localStorage） */
function initMnemonicLengthSelectors() {
  // 永远默认 12 词；不读 REAL_WALLET 词数、不写入 localStorage（对抗刷新后浏览器恢复下拉选中项）
  const n = 12;
  currentMnemonicLength = n;
  try {
    const mk = document.getElementById('mnemonicLength');
    if (mk) {
      mk.value = '12';
      mk.selectedIndex = 0;
    }
  } catch (e) {}
}
/** @param {number} [forcedWordCount] 若传入则按该词数生成（避免与 DOM 不同步） */
async function createRealWallet(forcedWordCount) {
  if (typeof ethers === 'undefined') {
    throw new Error('钱包库（ethers）未就绪，请检查网络连接后刷新页面重试');
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  let mnemonic, wallet, trxWallet, btcWallet, trxAddr;
  try {
    const nWords = (typeof forcedWordCount === 'number' && [12, 15, 18, 21, 24].includes(forcedWordCount))
      ? forcedWordCount
      : getTargetMnemonicWordCount();
    const entropyBytes = getEntropyByteCountForMnemonicWords(nWords);
    mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(entropyBytes));
    wallet = ethers.Wallet.fromMnemonic(mnemonic);
  } catch (e) {
    console.error('[WorldToken] 钱包创建失败:', e);
    throw new Error(formatWalletCreateError(e));
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  try {
    trxWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
    btcWallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/0'/0'/0/0");
  } catch (e) {
    console.error('[WorldToken] 钱包创建失败:', e);
    throw new Error(formatWalletCreateError(e));
  }
  trxAddr = '';
  try {
    await loadTronWeb();
    if (typeof TronWeb !== 'undefined') {
      trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
    } else {
      trxAddr = 'T' + trxWallet.address.slice(2, 35);
    }
  } catch (e2) {
    trxAddr = 'T' + trxWallet.address.slice(2, 35);
  }
  if (typeof setWalletCreateStep === 'function') 
  await walletCreateYield();
  const w = {
    mnemonic: mnemonic,
    enMnemonic: mnemonic,
    words: mnemonic.split(' '),
    ethAddress: wallet.address,
    trxAddress: trxAddr,
    btcAddress: btcWallet.address,
    privateKey: wallet.privateKey,
    trxPrivateKey: trxWallet.privateKey,
    createdAt: Date.now()
  };
  window.REAL_WALLET = w;
  saveWallet(w);
  applyReferralCredit();
  return w;
}

async function restoreWallet(mnemonic) {
  if(typeof ethers === 'undefined') return null;
  try {
    const inputWords = mnemonic.trim().split(/\s+/);
    if(![12,15,18,21,24].includes(inputWords.length)) {
      showToast(`❌ 助记词必须是12/15/18/21/24个词，当前${inputWords.length}个`, 'error');
      return null;
    }
    // 自动检测语言并转换为英文BIP39（若输入非英文词）
    let enMnemonicStr = mnemonic.trim();
    let detectedLang = 'en';
    const firstWord = inputWords[0];
    if (firstWord && !/^[a-z]+$/.test(firstWord)) {
      // 非英文，尝试所有语言词库匹配
      for (const lang of Object.keys(WT_LANG_INDEX || {})) {
        if (lang === 'en') continue;
        const idx = (WT_LANG_INDEX[lang] || {})[firstWord];
        if (idx !== undefined) {
          detectedLang = lang;
          enMnemonicStr = mnemonicFromLang(mnemonic.trim(), lang);
          break;
        }
      }
    }
    const words = enMnemonicStr.split(' ');
    const wallet = ethers.Wallet.fromMnemonic(enMnemonicStr);
    const trxWallet = ethers.Wallet.fromMnemonic(enMnemonicStr, "m/44'/195'/0'/0/0");
    // 将 ETH 地址转换为正确的 TRX 地址（Base58Check）
    let trxAddr = '';
    try {
      if(typeof TronWeb !== 'undefined') {
        trxAddr = TronWeb.address.fromHex('41' + trxWallet.address.slice(2));
      } else {
        trxAddr = 'T' + trxWallet.address.slice(2, 36); // fallback
      }
    } catch(e) { trxAddr = 'T' + trxWallet.address.slice(2, 36); }
    // BTC 地址（m/44'/0'/0'/0/0）
    let btcAddr2 = '';
    try {
      const btcWallet = ethers.Wallet.fromMnemonic(enMnemonicStr, "m/44'/0'/0'/0/0");
      // 简化：用 ETH 地址格式存储 BTC 未压缩公钥（实际BTC地址需更多处理）
      btcAddr2 = btcWallet.address; // 暂用ETH格式，后续可升级
    } catch(e) {}
    const w = {
      mnemonic: enMnemonicStr,
      enMnemonic: enMnemonicStr,           // 真实英文BIP39助记词
      inputMnemonic: mnemonic.trim(),      // 用户输入的原始词（可能是其他语言）
      inputLang: detectedLang,
      words: words,
      ethAddress: wallet.address,
      trxAddress: trxAddr,
      privateKey: wallet.privateKey,       // ETH private key
      trxPrivateKey: trxWallet.privateKey,  // TRX private key
      btcAddress: btcAddr2,                 // BTC address (simplified)
      createdAt: Date.now()
    };
    window.REAL_WALLET = w;
    saveWallet(w);
    applyReferralCredit();
    return w;
  } catch(e) {
    showToast('❌ 助记词无效，请检查后重试', 'error');
    return null;
  }
}

// 页面加载时恢复钱包（只恢复数据，不跳转）
captureReferralFromUrl();
loadWallet();
try { initMnemonicLengthSelectors(); } catch (_iml) {}
try {
  const _txList = document.getElementById('txHistoryList');
  if (_txList && typeof txHistoryEmptyHtml === 'function') _txList.innerHTML = txHistoryEmptyHtml();
} catch (_e) {}
// 钱包昵称 localStorage（仅本机）
try { if (localStorage.getItem('ww_wallet_nickname') == null) localStorage.setItem('ww_wallet_nickname', ''); } catch (_wn) {}
function getWalletNickname() { try { return localStorage.getItem('ww_wallet_nickname') || ''; } catch (e) { return ''; } }
function setWalletNickname(s) { try { localStorage.setItem('ww_wallet_nickname', (s || '').trim().slice(0, 32)); } catch (e) {} }
function applyWwTheme() {
  var t = localStorage.getItem('ww_theme') || 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
  var el = document.getElementById('settingsThemeValue');
  if (el) el.textContent = t === 'light' ? '浅色' : '深色';
}
function toggleWwTheme() {
  var cur = localStorage.getItem('ww_theme') || 'dark';
  var next = cur === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('ww_theme', next); } catch (e) {}
  applyWwTheme();
}
applyWwTheme();
// 页面加载完成（多次固定下拉为 12，晚于部分浏览器的表单/会话恢复）
window.addEventListener('load', () => {
  try { initMnemonicLengthSelectors(); } catch (_iml2) {}
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml4) {}
  }, 0);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml5) {}
  }, 50);
  setTimeout(function () {
    try { initMnemonicLengthSelectors(); } catch (_iml6) {}
  }, 200);
  if (typeof requestPushPermissionOnFirstLaunch === 'function') requestPushPermissionOnFirstLaunch();
});
window.addEventListener('pageshow', function () {
  try { initMnemonicLengthSelectors(); } catch (_iml3) {}
});
// 强刷后进入应用最开始的页面（欢迎页），不恢复 URL hash 深链
document.querySelectorAll('.page').forEach(p => {
  p.classList.remove('active');
  p.style.display = '';
});
try {
  if (typeof history !== 'undefined' && history.replaceState) {
    var _u0 = new URL(location.href);
    _u0.hash = '';
    history.replaceState(null, '', _u0.pathname + _u0.search);
  } else if (location.hash) {
    location.hash = '';
  }
} catch (_rh0) {}
const welcomePage = document.getElementById('page-welcome');
if (welcomePage) {
  welcomePage.classList.add('active');
}
try {
  var _tbBoot = document.getElementById('tabBar');
  if (_tbBoot) _tbBoot.style.display = 'none';
} catch (_tbb) {}

const SAMPLE_KEYS = {
  zh:['奥尔迪诺','马萨纳','恩坎普','卡尼略','阿布扎比','扎布尔','塔哈尔','萨尔普勒','萨曼甘','帕克蒂卡','帕克蒂亚','乌鲁兹甘','楠格哈尔','洛加尔','拉格曼','昆都士','库纳尔','卡比萨','坎大哈','喀布尔','朱兹詹','赫拉特','赫尔曼德','古尔','加兹尼','法利亚布','法拉','巴米扬','巴尔赫','巴格兰','巴德吉斯','巴达赫尚','霍斯特','努尔斯坦','代孔迪','潘杰希尔','圣菲利普','圣彼得','圣保罗','圣玛丽','圣约翰','圣乔治','雷东达岛','巴布达岛','亚拉拉特','休尼克','叶里温','阿拉加措特恩','亚马维尔','格加尔库尼克','科泰克','希拉克','塔武什','南伦达','北伦达','莫希科','萨伊','威热','马兰哲','罗安达','北广萨','喀丙达','本哥','纳米贝','威拉','万博','库内纳','南广萨','本吉拉','米西奥内斯','福尔摩沙','布宜诺斯艾利斯','恩特雷里奥斯','科连特斯','布宜诺斯艾利斯省','图库曼','火地岛','圣大非','圣克鲁斯','圣路易斯','圣胡安','萨尔塔','内格罗河','内乌肯','门多萨','拉里奥哈','拉潘帕','胡胡伊','科尔多瓦','丘布特','查科','卡塔马卡','福拉尔贝格','蒂罗尔','施泰尔马克','萨尔茨堡','上奥地利','下奥地利','克恩顿','布尔根兰','西澳大利亚','北领地','维多利亚','塔斯马尼亚','新南威尔士','澳大利亚首都领地','赞格兰','亚尔德姆雷','萨利扬','萨比拉巴德','比利亚苏瓦尔','马萨雷','列里克','菲祖利','杰布拉伊尔','贾利拉巴德','阿斯塔拉','泰尔泰尔','霍贾文德','扎卡塔雷','塔乌兹','丘尔达米尔','盖贝莱','库萨雷','克尔巴贾尔','戈兰博伊','伊斯梅尔雷','迪维奇','巴拉肯','巴尔达','阿赫苏','凯达贝克','布尔奇科特','圣托马斯','圣菲利普区','圣彼得教','圣迈克尔','圣露西教','圣约瑟夫','圣约翰教','圣詹姆斯教','圣乔治教','圣安德鲁','基督城教','拉杰沙希专','达卡专','吉大港专','库尔纳专','巴里萨尔专','锡尔赫特专','朗布尔专','布鲁塞尔首都大','瓦隆大','佛兰德斯','布克莱迪穆翁大','瀑布大','中央大','中东大','中北大','中西大','中南大','东部大','上盆地大','北部大','高原-中部大','萨赫勒大','西南大','索菲亚','加布罗沃','穆哈拉格','首都','南方','北方','马坎巴','布鲁里','穆拉姆维亚','基特加','鲁伊吉','坎库佐','布班扎','锡比托凯','恩戈齐','卡扬扎','穆因加','基龙多','鲁塔纳','布松布拉乡村','鲁蒙盖','祖省','韦梅','莫诺','博尔古','大西洋','阿塔科拉','阿黎博里','丘陵','库福','峡谷','滨海','高原','汶莱摩拉','塔里哈','圣克鲁斯省','波托西','奥鲁罗','拉巴斯','丘基萨卡','贝尼','圣尤斯特歇斯','北里奥格兰德','皮奥伊','伯南布哥','帕拉','马拉尼昂','阿拉戈斯','塞尔希培','圣保罗州','圣卡塔琳娜','里约热内卢','巴拉那','米纳斯吉拉斯','南马托格罗索','马托格罗索','戈亚斯','联邦','圣埃斯皮里图','托坎廷斯','罗赖马','亚马孙','朗多尼亚','拉吉德岛','贝里群岛','伊纳瓜','哈勃岛','自由港','埃克苏马','卡特岛','比米尼群岛','中阿巴科','东大巴哈马','希望镇','北阿巴科','北安德罗斯岛','北伊柳塞拉','南阿巴科','南安德罗斯','南伊柳塞拉','西舰井','西大巴哈马岛','南部','西北','奎嫩','卡特伦','卡拉哈迪','杭济','中部','维捷布斯克','明斯克','托莱多','斯坦克里克','橘园','科罗萨尔','卡约','伯利兹','艾伯塔','不列颠哥伦比亚','曼尼托巴','新不伦瑞克','新斯科舍','努纳武','安大略','爱德华王子岛','萨斯喀彻温','育空','楚阿帕','乔波','坦噶尼喀','南基伍','桑库鲁','北基伍','蒙加拉','马涅马','卢卢阿','东开赛','伊图里','上韦莱','赤道','下韦莱','马伊恩东贝','奎卢','上加丹加','瓦卡加','瓦卡','姆博穆','上姆博穆','上科托','下科托','巴明吉-班戈兰','桑加-姆巴埃雷','瓦姆-彭代','瓦姆','翁贝拉－姆波科','纳纳-曼贝雷','洛巴耶','凯莫','曼贝雷-卡代','桑加','普尔','高原省','尼阿里','利夸拉','莱库穆','奎卢省','盆地','布恩扎','西盆地','苏黎世','楚格','沃州','瓦莱','乌里','提契诺','图尔高','索洛图恩','施维茨','沙夫豪森','上瓦尔登','下瓦尔登','纳沙泰尔','卢塞恩','汝拉','格劳宾登','格拉鲁斯','日内瓦','弗里堡','伯恩','巴塞尔城市','巴塞尔乡村','外阿彭策尔','内阿彭策尔','阿尔高','下萨桑德拉','登盖莱','湖泊','潟湖','萨瓦内','邦达马河谷','赞赞','塔拉帕卡大','圣地亚哥首都大','湖大','科金博大','河大','纽夫莱大','南部区','西部','北部','滨海区','极北','东部','中部区','阿达马瓦','西藏','青海','新疆维吾尔自治','浙江','云南','天津','四川','山西','上海','山东','陕西','宁夏','江西','江苏','湖南','湖北','河南','河北','琼州','贵州','广西','广东','甘肃','福建','重庆','安徽','内蒙古','辽宁','吉林','黑龙江','北京','比查达','考卡山谷','托利马','苏克雷','桑坦德','里萨拉尔达','金迪奥','普图马约','北桑坦德','梅塔','马格达莱纳','瓜希拉','乌伊拉','瓜维亚雷','瓜伊尼亚','昆迪纳马卡','塞萨尔','考卡','卡萨纳雷','卡尔达斯','阿劳卡','安蒂奥基亚','亚马孙省','蓬塔雷纳斯','利蒙','埃雷迪亚','瓜纳卡斯特','卡塔戈','阿拉胡埃拉','比亚克拉拉','圣地亚哥','圣斯皮里图斯','马坦萨斯','拉斯图纳斯','奥尔金','关塔那摩','格拉玛','西恩富戈斯','谢戈德阿维拉','阿特米萨','玛雅贝克','帕福斯','尼科西亚','利马索尔','拉纳卡','凯里尼亚','法马古斯塔','南摩拉维亚','南波希米亚','中波希米亚','萨克森-安哈尔','萨克森自由','萨尔兰','莱茵兰-普法尔茨','下萨克森','黑森','汉堡','不来梅','勃兰登堡','柏林','巴伐利亚','巴登-符腾堡','塔朱拉','奥博克','迪基尔','阿里萨比','阿尔塔','中日德兰大','北日德兰大','西兰大','南丹麦大','圣彼得堂','圣保罗堂','圣帕特里克堂','圣马克堂','圣卢克','圣约瑟夫堂','圣约翰区','圣乔治区','圣戴维堂','圣安德鲁区','巴尔韦德','圣地亚哥省','圣胡安省','萨马纳','普拉塔港','佩德纳莱斯','国家特','蒙特普拉塔','蒙特克里斯蒂','拉罗马纳','拉阿尔塔格拉西亚','独立','阿托马约尔','埃斯派亚','杜阿尔特','巴拉奥纳','巴奥鲁可','阿苏阿','圣多明哥','特莱姆森','提济乌祖','提塞姆西勒特','廷杜夫','提亚雷特','泰贝萨','塔曼拉塞特','苏格艾赫拉斯','斯基克达','西迪贝勒阿巴斯','塞提夫','埃利赞','乌姆布瓦吉','瓦尔格拉','奥兰','纳马','姆西拉','穆斯塔加奈姆','米拉','穆阿斯凯尔','艾格瓦特','汉舍莱','吉杰勒','伊利济','盖勒马','塔里夫','瓦迪','巴亚兹','杰勒法','君士坦丁','谢利夫','布维拉','布阿拉里季堡','卜利达','比斯克拉','贝沙尔','巴特纳','安纳巴','阿尔及尔','艾因泰穆尚特','艾因迪夫拉','阿德拉尔','贝尼阿巴斯','萨莫拉-钦奇佩','通古拉瓦','皮钦查','帕斯塔萨','纳波','莫罗纳-圣地亚哥','洛哈','因巴布拉','瓜亚斯','埃斯梅拉达斯','埃尔奥罗','钦博拉索','卡尔奇','阿苏艾','奥雷亚纳','圣埃伦娜','沃鲁','维尔扬迪','瓦尔加','塔尔图','萨雷','拉普拉','珀尔瓦','派尔努','西维鲁','莱内','约格瓦','耶尔瓦','东维鲁','希乌','哈尔尤','索哈杰','北西奈','基纳','马特鲁','谢赫村','南西奈','杜姆亚特','塞得港','艾斯尤特','阿斯旺','苏伊士','新河谷','盖卢比尤','开罗','明亚','米努夫','吉萨','伊斯梅利亚','亚历山大','西部省','法尤姆','布海拉','红海','代盖赫利耶','卢克索','安塞巴','南红海','加什-巴尔卡','北红海','穆尔西亚自治','休达','安达卢西亚','加那利群岛','埃斯特雷马杜拉','巴伦西亚自治','阿斯图里亚斯','纳瓦拉','马德里自治','坎塔布里亚','卡斯蒂利亚-莱昂','加利西亚','阿法尔','阿姆哈拉','本尚古勒-古马兹','德雷达瓦','甘贝拉','哈勒尔','奥罗米亚','索马里','提格里','拉普兰','凯努','北博滕','中博滕','博滕','南博滕','北卡累利阿','北萨沃','南萨沃','屈米河谷','皮尔卡','坎塔海梅','西南芬兰','新地','萨塔昆塔','西部大','北部大区','中央大区','东部大区','罗图马岛','雅浦','波纳佩','丘克','卢瓦尔河地区大','法兰西岛','布列塔尼大','诺曼底大','大东部大','上法兰西大','沃勒-恩特姆','滨海奥果韦','奥果韦-伊温多','尼扬加','中奥果韦','上奥果韦','河口','威尔士','苏格兰','北爱尔兰','英格兰','圣帕特里克','圣马克','圣戴维','第比利斯','阿扎尔自治共和国','克维莫-卡特利','卡赫季','古利亚','伊梅列季亚','什达-卡特利','阿布哈兹','库雅雷克','凯克卡塔','上河','北岸','中河','下河','博凯大','法拉纳大','康康大','金迪亚大','拉贝大','马木大','恩泽雷科雷大','中马其顿大','西马其顿大','萨卡帕','索洛拉','圣罗萨','圣马科斯','萨卡特佩克斯','基切','克萨尔特南戈','贝登','伊萨瓦尔','瓜地马拉','普罗格雷索','奇基穆拉','奇马尔特南戈','下维拉帕斯','上维拉帕斯','通巴利','基纳拉','博拉马','比翁博','波塔罗-锡帕鲁尼','波默伦-苏佩纳姆','马海卡-伯比斯','德梅拉拉-马海卡','库尤尼-马扎鲁尼','巴里马-瓦伊尼','离岛','中西','湾仔','东区','油尖旺','九龙城','观塘','葵青','屯门','北区','沙田','约罗','山谷','奥兰乔','奥科特佩克','伦皮拉','拉巴斯省','因蒂布卡','埃尔帕拉伊索','科尔特斯','科潘','科马亚瓜','科隆','乔卢特卡','阿特兰蒂达','东南','南部省','西北省','东北','北部省','大湾','中央','阿蒂博尼特','尼普斯','赫维什','豪伊杜-比豪尔','佐洛','沃什','托尔瑙','绍莫吉','佩斯','费耶尔','巴奇-基什孔','北苏门答腊','南苏门答腊','北苏拉威西','中苏拉威西','东加里曼丹','南加里曼丹','西加里曼丹','东爪哇','中爪哇','西爪哇','巴厘岛','万丹','邦加-勿里洞','伦斯特','芒斯特','阿尔斯特','耶路撒冷','特拉维夫','海法','北部区','中央区','西孟加拉','北方邦','特里普拉','特伦甘纳','泰米尔纳德','锡金','拉贾斯坦','旁遮普','本地治里','那加兰','米佐拉姆','梅加拉亚','曼尼普尔','马哈拉施特拉','中央邦','喀拉拉','卡纳塔克','喜马偕尔','哈里亚纳','古吉拉特','果阿','昌迪加尔','比哈尔','阿萨姆','阿鲁纳恰尔','安得拉','恰蒂斯加尔','贾坎德','拉达克','巴士拉','萨拉赫丁','尼尼微','米桑','埃尔比勒','迪亚拉','济加尔','杜胡克','巴格达','巴比伦','卡迪西亚','穆萨纳','安巴尔','德黑兰','赞詹','亚兹德','塞姆南','马赞德兰','中央省','洛雷斯坦','库尔德斯坦','克尔曼沙汗','克尔曼','伊拉姆','霍尔木兹甘','哈马丹','吉兰','法尔斯','布什尔','东阿塞拜疆','西亚塞拜然','阿尔达比勒','伊斯法罕','戈勒斯坦','加兹温','库姆','南呼罗珊','礼萨呼罗珊','北呼罗珊','厄尔布尔士','首都区','西峡湾','西西里岛','卡拉布里亚','威尼托','翁布里亚','托斯卡纳','普利亚','皮埃蒙','莫利塞','马尔凯','利古里亚','拉齐奥','坎帕尼亚','巴斯利卡塔','阿布鲁佐','西摩兰','特里洛尼','圣托马斯区','圣玛丽区','圣詹姆斯','圣伊丽莎白','圣凯瑟琳','圣安娜','波特兰','曼彻斯特','金斯敦','汉诺威','克拉伦登','马安','伊尔比德','塔菲拉','安曼','马弗拉克','拜勒加','阿杰隆','杰拉什','马代巴','山梨','山口','和歌山','富山','鸟取','东京都','德岛','栃木','静冈','岛根','滋贺','埼玉','佐贺','大阪府','冲绳','冈山','大分','新潟','奈良','长崎','长野','宫崎','三重','京都府','熊本','高知','神奈川','鹿儿岛','香川','石川','兵库','广岛','群马','岐阜','福冈','福井','爱媛','爱知','山形','宫城','岩手','茨城','福岛','千叶','秋田','北海道','青森','西波克特郡','瓦吉尔郡','瓦辛基苏郡','图尔卡纳郡','塔纳河郡','夏亚郡','桑布卢郡','内罗毕郡','蒙巴萨','梅鲁郡','马萨比特郡','曼德拉郡','莱基皮亚郡','夸莱郡','基图伊郡','基苏木郡','基西郡','基里尼亚加郡','基利菲','基安布郡','凯里乔郡','卡卡梅加郡','伊希约洛郡','加里萨郡','恩布郡','布希亚郡','邦戈马郡','巴林戈郡','年达鲁阿郡','维希加','马查科斯郡','马瓜尼郡','卡耶亚多郡','涅里郡','霍马湾郡','博美特郡','米戈利郡','纳库鲁郡','纳罗克郡','尼亚米拉郡','奥什','巴特肯','塔拉斯','纳伦','伊塞克湖','贾拉拉巴德','楚河','菩萨','马德望','柴桢','上丁','腊塔纳基里','波萝勉','柏威夏','拜林','白马','戈公','贡布','磅同','磅士卑','磅清扬','磅湛','西哈努克','班迭棉吉','菲尼克斯群岛','莫埃利岛','大科摩罗岛','罗先','首尔','釜山','京畿','光州','杰赫拉','费尔瓦尼耶','艾哈迈迪','巴甫洛达尔','卡拉干达','万象','沙湾拿吉','沙拉湾','琅勃拉邦','甘蒙','占巴塞','博胶','博利坎赛','永珍','米库','拉博列','登内里','舒瓦瑟尔','卡斯特里','特里森贝格','特里森','沙恩','鲁格尔','毛伦','甘普林','埃申','乌沃','萨伯勒格穆沃','北中','东部省','锡诺','宁巴','蒙特塞拉多','马里兰','洛法','大吉德','大角山','大巴萨','邦县','博米','大克鲁','马吉比','里弗塞斯','巴波卢','吉河','塔巴-采卡','古廷','加查斯内克','莫霍特隆','莫哈莱斯胡克','马塞卢','马费滕','莱里贝','布塔-布泰','伯里亚','阿利图斯','考纳斯','克莱佩达','马里扬波莱','帕内韦日斯','希奥利艾','陶拉盖','特尔希艾','乌田纳','维尔纽斯','文茨皮尔斯市镇','文茨皮尔斯','瓦尔卡市镇','图库姆斯市镇','奥格雷市镇','利耶帕亚','叶尔加瓦','古尔贝内市镇','陶格夫匹尔斯','采西斯市镇','阿卢克斯内市镇','奥莱内市镇','基耶卡瓦市镇','萨拉斯皮尔斯市镇','利瓦尼市镇','瓦拉克利亚尼市镇','罗帕日市镇','南库尔泽梅市镇','上道加瓦市镇','库夫拉','塞卜哈','穆尔祖格','朱夫拉','西山','温格内','泰莱内什蒂','塔拉克利亚','斯特勒谢尼','索罗卡','雷什卡内','雷济纳','奥尔海伊','新阿内尼','尼斯波雷尼','莱奥瓦','森杰雷','克留莱尼','亚洛韦尼','冈代米尔','卡胡尔','格洛代尼','弗洛雷什蒂','弗莱什蒂','杜伯萨里','栋杜谢尼','奇米什利亚','布里切尼','巴萨拉贝亚斯卡','亨切什蒂','绍尔德内什蒂','罗扎耶市镇','莫伊科瓦茨','科托尔','新海尔采格','比耶洛波列','古西涅市镇','佩特尼察市镇','图齐市镇','瓦兰多沃市镇','雷森市镇','博西洛沃市镇','波格丹齐市镇','兹尔诺夫齐市镇','卡尔宾齐市镇','罗索曼市镇','格拉德斯科市镇','洛佐沃市镇','布尔韦尼察','查什卡市镇','多尔内尼市镇','戈斯蒂瓦尔','伊林登市镇','耶古诺夫采','普拉斯尼察市镇','圣尼古莱市镇','泰阿尔采市镇','德巴尔察市镇','锡卡索','塞古','莫普提','库利科罗','卡伊','加奥','巴马科','基达尔','德林达依','掸邦','实皆','仰光','勃固','曼德勒','克耶','克伦','克钦','钦邦','乌布苏','戈壁阿尔泰','色楞格','南戈壁','东戈壁','东方','布尔干','后杭爱','圣安多尼堂','望德堂','大堂','风顺堂','嘉模堂','路氹填海','路环','特拉扎','提里斯-宰穆尔','塔甘特','因希里','西胡德','东胡德','吉迪马卡','戈尔戈勒','努瓦迪布湾','卜拉克纳','阿萨巴','阿德拉尔省','罗德里格岛','尤卡坦','韦拉克鲁斯','特拉斯卡拉','塔毛利帕斯','塔巴斯科','金塔纳罗奥','克雷塔罗','普埃布拉','瓦哈卡','新莱昂','莫雷洛斯','墨西哥','伊达尔戈','格雷罗','墨西哥城','恰帕斯','坎佩切','萨卡特卡斯','索诺拉','锡那罗亚','圣路易斯波托西','纳亚里特','米却肯','哈利斯科','瓜纳华托','杜兰戈','科利马','科阿韦拉','奇瓦瓦','南下加利福尼亚','下加利福尼亚','阿瓜斯卡连特斯','登嘉楼','雪兰莪','砂拉越','沙巴','玻璃','霹雳','彭亨','森美兰','吉兰丹','槟城','吉打','柔佛','布城','赞比西亚','太特','索法拉','尼亚萨','楠普拉','马普托','伊尼扬巴内','加扎','德尔加杜角','卡普里维','霍马斯','埃龙戈','哈达普','卡拉斯','库内内','奥汉圭纳','奥马海凯','奥穆萨蒂','奥沙纳','奥希科托','奥乔宗朱帕','东卡万戈','西卡万戈','津德尔大','塔瓦大','马拉迪大','多索大','迪法大','阿加德兹大','蒂拉贝里大','河流','高原州','奥约','翁多','奥贡','尼日尔','拉各斯','夸拉','卡齐纳','卡诺','卡杜纳','伊莫','克罗斯河','博尔诺','贝努埃','包奇','阿南布拉','阿夸伊博姆','联邦首都特','阿比亚','三角','埃多','埃努古','吉加瓦','巴耶尔萨','埃邦伊','埃基蒂','贡贝','纳萨拉瓦','扎姆法拉','凯比','科吉','奥孙','塔拉巴','约贝','里瓦斯','圣胡安河','新塞哥维亚','马塔加尔帕','马萨亚','马德里斯','莱昂','希诺特加','格拉纳达','埃斯特利','琼塔莱斯','奇南德加','卡拉索','博阿科','北加勒比海岸自治','南加勒比海岸自治','南荷兰','泽兰','乌得勒支','上艾瑟尔','北荷兰','北布拉班特','林堡','格罗宁根','海尔德兰','弗里斯兰','德伦特','弗莱福兰','芬马克郡','西福尔郡','特罗姆斯郡','泰勒马克郡','罗加兰郡','东福尔郡','诺尔兰郡','阿克什胡斯郡','特伦德拉格','阿格德尔','内陆郡','韦斯特兰郡','亚伦','瓦博埃','尼博克','梅嫩','艾珠','埃瓦','代尼戈莫杜','布阿达','博埃','拜齐','阿尼巴雷','阿内坦','阿纳巴尔','艾沃','惠灵顿大','怀卡托','塔斯曼','塔拉纳基大','南地大','普伦蒂湾大','北地大','马尔堡','霍克湾大','吉斯伯恩大','坎特伯雷','奥克兰','奥塔哥大','西岸大','内地','中部省','扎希拉','马斯喀特','穆桑代姆','佐法尔','布赖米','东北省','贝拉瓜斯','雅拉库纳族自治','洛斯桑托斯','埃雷拉','奇里基','博卡斯德尔托罗','恩贝拉-沃内安特','恩戈贝布格勒自治','乌卡亚利大','通贝斯大','圣马丁大','皮乌拉地','洛雷托大','兰巴耶克大','拉利伯塔德大','瓦努科大','卡哈马卡大','安卡什大','亚马孙大','塔克纳大','普诺大','帕斯科大','莫克瓜大','马德雷德迪奥斯大','利马','利马大','胡宁大','伊卡大','万卡韦利卡大','库斯科大','阿亚库乔大','阿雷基帕大','阿普里马克大','西新不列颠','西高地','南高地','桑道恩','新爱尔兰','莫雷贝','马努斯','马当','海湾','恩加','东塞皮克','东新不列颠','东高地','钦布','米尔恩湾','赫拉','吉瓦卡','棉兰老穆斯林自治','北棉兰老','民马罗巴','卡加延河谷','索科斯克萨尔根','卡拉加','科迪勒拉行政','伊罗戈','卡拉巴松','西米沙鄢','中央吕宋','中米沙鄢','东米沙鄢','三宝颜半岛','达沃','比科尔','伊斯兰堡首都','信德','旁遮普省','开伯尔-普什图','俾路支','自由克什米尔','卢布林','小波兰','喀尔巴阡山','瓦尔米亚-马祖里','下西里西亚','罗兹','卢布斯卡','波美拉尼亚','西里西亚','大波兰','西滨海','阿雷西沃','加沙地带','约旦河西岸地','塞图巴尔','圣塔伦','波塔莱格雷','里斯本','莱里亚','法鲁','埃武拉','布朗库堡','贝雅','马德拉','维塞乌','雷阿尔城','维亚纳堡','波尔图','瓜达','科英布拉','布拉干萨','布拉加','雅庞','松索罗尔','卡扬埃尔','哈托博海伊','艾梅利克','艾拉伊','安加尔','科罗尔','梅莱凯奥克','雅拉尔德','恩切萨尔','雅切隆','雅德马乌','埃雷姆伦维','宜瓦尔','贝里琉','圣佩德罗','阿耶斯总统','米西奥内斯省','伊塔普阿','科迪勒拉','卡宁德尤','卡萨帕','阿曼拜','上巴拉圭','豪尔','乌姆锡拉勒','宰阿因','弗朗恰','沃尔恰','图尔恰','蒂米什','特列奥尔曼','苏恰瓦','锡比乌','萨图马雷','瑟拉日','普拉霍瓦','奥尔特','尼亚姆茨','穆列什','梅赫丁茨','马拉穆列什','雅西','雅洛米察','胡内多阿拉','戈尔日','久尔久','加拉茨','多尔日','登博维察','科瓦斯纳','康斯坦察','克卢日','卡拉什-塞维林','克勒拉希','布泽乌','布拉索夫','布勒伊拉','博托沙尼','比霍尔','巴克乌','阿尔杰什','阿拉德','阿尔巴','伊尔福夫','伏伊伏丁那','雅罗斯拉夫尔','沃罗涅日','沃洛格达','伏尔加格勒','乌里扬诺夫斯克','特维尔','图拉','坦波夫','斯塔夫罗波尔边疆','斯摩棱斯克','萨拉托夫','萨马拉','梁赞','罗斯托夫','普斯科夫','彼尔姆边疆','奔萨','奥廖尔','诺夫哥罗德','涅涅茨自治','摩尔曼斯克','莫斯科','莫尔多瓦共和国','马里埃尔共和国','利佩茨克','列宁格勒','库尔斯克','克拉斯诺达尔边疆','科斯特罗马','科米共和国','基洛夫','卡累利阿共和国','卡卢加','卡尔梅克共和国','加里宁格勒','伊万诺沃','下诺夫哥罗德','达吉斯坦共和国','楚瓦什共和国','车臣共和国','布良斯克','别尔哥罗德','阿斯特拉罕','阿尔汉格尔斯克','阿迪格共和国','弗拉基米尔','秋明','图瓦共和国','斯维尔德洛夫斯克','鄂木斯克','新西伯利亚','库尔干','哈卡斯共和国','阿尔泰共和国','车里雅宾斯克','阿尔泰边疆','滨海边疆','哈巴罗夫斯克边疆','犹太自治','阿穆尔','萨哈林','马加丹','楚科奇自治','塔布克','奈季兰','阿西尔','利雅得','马莱塔','伊莎贝尔','瓜达尔卡纳尔','中部群岛','泰莫图','马基拉-乌拉瓦','舒瓦瑟尔省','拉纳尔和贝罗纳','塔卡玛卡','圣路易','格洛港','潘特拉吕','普莱桑斯','蒙弗勒利','蒙巴克斯顿','英吉利河','拉蒂格与内岛','格拉西斯','卡斯喀得','贝尔翁布雷','贝尔艾尔','贝圣安那','贝拉扎尔','安塞艾托瓦','昂斯欧潘','莱马梅勒','罗切凯曼','奥凯普','北部州','喀土穆','红海州','杰济拉','加达里夫','白尼罗','青尼罗','西达尔富尔','西科尔多凡','南达尔富尔','南科尔多凡','卡萨拉','尼罗','北达尔富尔','北科尔多凡','森纳尔','东达尔富尔','中达尔富尔','北博滕省','西曼兰','西诺尔兰','西博滕','韦姆兰','乌普萨拉','南曼兰','东约特兰','厄勒布鲁','克鲁努贝里','达拉纳','卡尔马','延雪平','耶姆特兰','哈兰','哥得兰','耶夫勒堡','布莱金厄','斯科讷','西约塔兰','特雷布涅市镇','斯洛文尼亚科尼采','什科菲亚洛卡市镇','塞夫尼察市镇','申特尤尔市镇','拉多夫利察市镇','普图伊','波斯托伊纳','马里博尔城市市镇','洛加泰茨市镇','柳托梅尔','拉什科市镇','科佩尔','伊佐拉','伊德里亚','赫拉斯特尼克市镇','奇尔诺梅利市镇','皮夫卡市镇','洛什卡多利纳市镇','伊格市镇','采尔克诺','热莱兹尼基市镇','科巴里德市镇','博希尼市镇','卢科维察市镇','拉代切市镇','兹雷切市镇','鲁舍市镇','佩斯尼察市镇','多尔纳瓦市镇','索尔察瓦市镇','科门达市镇','普雷瓦列','普雷博尔德市镇','米尔纳佩奇市镇','奥普洛特尼察市镇','哈伊迪纳市镇','代斯特尔尼克市镇','圣安娜市镇','伦达瓦','格拉德市镇','戈列市镇','安卡兰市镇','斯瓦尔巴群岛','科希策','普列索夫','日利纳','布拉迪斯拉发','尼特拉','特尔纳瓦','西部区','南方省','北方省','东方省','塞拉利昂西北','基耶萨诺瓦','阿夸维瓦','博尔戈马焦雷','法埃塔诺','菲奥伦蒂诺','蒙特贾尔迪诺','济金绍尔','坦巴昆达','圣路易区','马塔姆','卢加','科尔达','考拉克','法蒂克','久尔贝勒','达喀尔','卡夫林','塞久','瓦尼卡','锡帕利维尼','萨拉马卡','帕拉马里博','帕拉区','尼克里','马罗韦讷','科罗尼','科默韦讷','布罗科蓬多','上尼罗','湖泊州','团结','中赤道','西赤道','西加扎勒河','琼莱','北加扎勒河','东赤道','瓦拉卜','圣多美岛','普林西比岛','松索纳特','圣维森特','圣安娜省','圣萨尔瓦多','圣米格尔','拉利伯塔德','查拉特南戈','塔尔图斯','大马士革','伊德利卜','霍姆斯','哈马','阿勒颇','大马士革农村','代尔祖尔','德拉','苏韦达','库奈特拉','拉塔基亚','哈塞克','曼齐尼','卢邦博','霍霍','萨拉马特','瓦达伊','瓦迪菲拉','坦吉莱','中沙里','东凯比河','东洛贡','西洛贡','湖区','加奈姆','盖拉','沙里-巴吉尔米','巴塔','博尔库','哈杰尔-拉密','芒杜尔','西凯比河','西拉','提贝斯提','西恩内迪','东恩内迪','草原','高原区','卡拉','达府','素叻他尼府','素可泰府','叻武里府','拉廊府','巴蜀府','普吉府','碧武里府','攀牙府','夜丰颂府','南奔府','南邦府','甲米府','北碧府','甘烹碧府','春蓬府','清莱府','清迈府','益梭通府','也拉府','程逸府','素林府','素攀府','宋卡府','四色菊府','信武里府','沙敦府','沙拉武里府','沙没颂堪府','沙没沙空府','沙没巴干府','沙功那空府','黎逸府','罗勇府','大城府','帕府','彭世洛府','披集府','碧差汶府','帕尧府','博他仑府','北大年府','巴吞他尼府','廊开府','那拉提瓦府','那空是贪玛叻府','那空沙旺府','那空叻差是玛府','那空拍侬府','佛统府','那空那育府','穆达汉府','马哈沙拉堪府','华富里府','黎府','曼谷','孔敬府','加拉信府','春武里府','庄他武里府','猜也蓬府','猜纳府','差春骚府','武里南府','乌隆府','巴真府','乌汶府','安纳乍伦府','农磨兰普府','沙缴府','汶干府','哈特隆','维克克','马努法伊','马纳图托','利逵萨','劳滕','科瓦利马','埃尔梅拉','帝力','博博纳罗','包考','阿伊纳罗','阿伊莱乌','巴尔坎','阿哈尔','马雷','列巴普','宰格万','突尼斯','托泽尔','泰塔温','苏塞','锡勒亚奈','西迪布济德','斯法克斯','吉比利','加夫萨','加贝斯','纳布勒','梅德宁','坚杜拜','本阿鲁斯','比塞大','艾尔亚内','凯鲁万','卡塞林','莫纳斯提尔','马赫迪耶','卡夫','马努巴','埃瓦岛','纽阿斯群岛','约兹加特','凡省','乌沙克','尚勒乌尔法','通杰利','锡瓦斯','锡尔特','尼代','内夫谢希尔','穆什','穆拉','马尔丁','马尼萨','马拉蒂亚','屈塔希亚','科尼亚','克尔谢希尔','开塞利','卡赫拉曼马拉什','伊兹密尔','厄斯帕尔塔','梅尔辛','哈塔伊','哈卡里','加济安泰普','埃斯基谢希尔','埃尔祖鲁姆','埃尔津詹','埃拉泽','迪亚巴克尔','代尼兹利','布尔杜尔','比特利斯','宾格尔','比莱吉克','巴勒克埃西尔','艾登','安塔利亚','安卡拉','阿勒','阿菲永卡拉希萨尔','阿德亚曼','阿达纳','奥斯曼尼耶','厄德尔','阿克萨赖','巴特曼','卡拉曼','克勒克卡莱','舍尔纳克','基利斯','宗古尔达克','特拉布宗','托卡特','泰基尔达','锡诺普','萨姆松','萨卡里亚','里泽','奥尔杜','科贾埃利','克尔克拉雷利','卡斯塔莫努','卡尔斯','伊斯坦布尔','居米什哈内','吉雷松','埃迪尔内','乔鲁姆','昌克勒','恰纳卡莱','布尔萨','博卢','阿尔特温','阿马西亚','巴尔滕','卡拉比克','亚洛瓦','阿尔达汉','巴伊布尔特','阿里马','迭戈马丁地','王子镇地','大桑格雷地','锡帕里亚','努伊环礁','纳努梅阿环礁','纳努芒阿岛','瓦伊图普','努库费陶环礁','努库莱莱环礁','福建省','高雄','台北','卡盖拉','坦噶','塔波拉','辛吉达','欣延加','鲁夸','姆万扎','莫罗戈罗','姆贝亚','马拉','林迪','乞力马扎罗','基戈马','伊林加','多多马','三兰港','阿鲁沙','曼亚拉','鲁伍马','姆特瓦拉','锡米尤','盖塔','卡塔维'],
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
const ADDR_SAMPLES = {
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

CHAIN_ADDR = (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : '--';
// 如果有真实钱包，使用真实 TRX 地址（与 wallet.core.js 共用 var，勿用 const 重复声明）
function getChainAddr() {
  return (REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : CHAIN_ADDR;
};
// ETH/BTC 地址动态读取（不用 const 硬编码）
function getEthAddr() { return (REAL_WALLET && REAL_WALLET.ethAddress) ? REAL_WALLET.ethAddress : '--'; }
function getBtcAddr() { return (REAL_WALLET && REAL_WALLET.btcAddress) ? REAL_WALLET.btcAddress : '--'; }
const ETH_ADDR_LEGACY = '0x7f3a9b2c4d8e1f5a6b3c7d2e'; // 仅兼容用，勿使用

let currentLang = detectDeviceLang();
const MAIN_PAGES = ['page-home','page-swap','page-addr','page-settings','page-hongbao'];
const TAB_MAP = {'tab-home':'page-home','tab-swap':'page-swap','tab-addr':'page-addr','tab-hongbao':'page-hongbao','tab-settings':'page-settings'};

const WW_SEO_DEFAULT = { title: 'WorldToken — 全球多语言加密钱包', description: 'WorldToken：万语地址、TRX / ETH / USDT / BTC 多链，本地保管助记词与资产。' };
const WW_PAGE_SEO = {
  'page-welcome': { title: '欢迎 — WorldToken 多语言钱包', description: '创建或导入钱包：万语地址与多链资产管理。' },
  'page-create': { title: '创建钱包 — WorldToken', description: '生成 BIP39 助记词，派生 TRX、ETH、BTC 地址。' },
  'page-key': { title: '备份助记词 — WorldToken', description: '请安全抄写并离线保存助记词，勿截图或上传网络。' },
  'page-key-verify': { title: '验证助记词 — WorldToken', description: '按提示输入助记词以确认您已正确备份。' },
  'page-home': { title: '资产 — WorldToken', description: '查看余额、快捷转账、兑换与交易记录。' },
  'page-addr': { title: '收款地址 — WorldToken', description: '展示 TRX / ETH / BTC 地址与收款二维码。' },
  'page-transfer': { title: '转账 — WorldToken', description: '向万语地址或公链地址发送 USDT、TRX、ETH、BTC。' },
  'page-swoosh': { title: '处理中 — WorldToken', description: '交易正在提交。' },
  'page-transfer-success': { title: '转账成功 — WorldToken', description: '转账已提交，可查看摘要与分享。' },
  'page-settings': { title: '设置 — WorldToken', description: 'PIN、两步验证、备份与隐私相关选项。' },
  'page-swap': { title: '兑换 — WorldToken', description: '通过 SunSwap / Uniswap 等 DEX 兑换代币。' },
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
  } catch (e) {}
}
function wwIsOnline() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
function applyOfflineState() {
  const on = wwIsOnline();
  const b = document.getElementById('offlineBanner');
  if (b) b.classList.toggle('show', !on);
  try { if (typeof checkTransferReady === 'function') checkTransferReady(); } catch (e) {}
  try {
    const addrEl = document.getElementById('transferAddr');
    if (addrEl && typeof detectAddrType === 'function') detectAddrType();
  } catch (e2) {}
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
function wwBase32Decode(s) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  s = String(s || '').replace(/\s/g, '').toUpperCase().replace(/=+$/, '');
  let bits = 0, val = 0, out = [];
  for (let i = 0; i < s.length; i++) {
    const idx = alphabet.indexOf(s[i]);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((val >> bits) & 255);
    }
  }
  return new Uint8Array(out);
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
async function wwVerifyTotpCode(secretB32, input) {
  if (!/^\d{6}$/.test(input || '')) return false;
  const raw = wwBase32Decode(secretB32);
  if (!raw.length) return false;
  const step = 30;
  const t = Math.floor(Date.now() / 1000 / step);
  for (let d = -1; d <= 1; d++) {
    const msg = wwCounterBytes(t + d);
    const h = await wwHmacSha1(raw, msg);
    const o = h[h.length - 1] & 0x0f;
    const bin = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
    const code = String(bin % 1000000).padStart(6, '0');
    if (code === input) return true;
  }
  return false;
}
function wwTotpEnabled() {
  return localStorage.getItem('ww_totp_enabled') === '1' && !!localStorage.getItem('ww_totp_secret');
}
function wwGenerateTotpSecretB32() {
  const u = new Uint8Array(20);
  crypto.getRandomValues(u);
  return wwBase32Encode(u);
}

function offerTotpAfterPinSave() {
  if (wwTotpEnabled()) return;
  setTimeout(function() {
    try {
      if (!confirm('是否启用 Google Authenticator 两步验证？\n启用后解锁钱包时需输入 PIN 与动态码。')) return;
      startTotpSetup();
    } catch (e) {}
  }, 120);
}
function openTotpSettingsRow() {
  if (!wwHasPinConfigured()) { showToast('请先设置 6 位 PIN', 'warning'); return; }
  if (wwTotpEnabled()) {
    if (!confirm('确定要关闭两步验证吗？')) return;
    localStorage.removeItem('ww_totp_secret');
    localStorage.removeItem('ww_totp_enabled');
    showToast('两步验证已关闭', 'success');
    updateSettingsPage();
    return;
  }
  startTotpSetup();
}
function startTotpSetup() {
  if (!wwHasPinConfigured()) { showToast('请先设置 6 位 PIN', 'warning'); return; }
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
async function confirmTotpSetup() {
  const sec = window._wwTotpPendingSecret;
  const inputEl = document.getElementById('totpSetupVerifyInput');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!/^\d{6}$/.test(input)) { showToast('请输入 6 位验证码', 'error'); return; }
  if (!sec) { showToast('会话已过期，请重试', 'error'); return; }
  const ok = await wwVerifyTotpCode(sec, input);
  if (!ok) { showToast('验证码不正确', 'error'); return; }
  const pin = wwGetSessionPin();
  if (!pin) { showToast('请先通过 PIN 解锁钱包', 'error'); return; }
  try {
    localStorage.setItem('ww_totp_secret', await encryptTotpSecret(sec, pin));
  } catch (e) {
    console.error('[TOTP encrypt]', e);
    showToast('保存失败', 'error');
    return;
  }
  localStorage.setItem('ww_totp_enabled', '1');
  window._wwTotpPendingSecret = null;
  closeTotpSetup();
  showToast('两步验证已启用', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function showTotpUnlockOverlay() {
  const ov = document.getElementById('totpUnlockOverlay');
  const inp = document.getElementById('totpUnlockInput');
  const err = document.getElementById('totpUnlockError');
  if (inp) { inp.value = ''; try { inp.focus(); } catch (e) {} }
  if (err) err.style.display = 'none';
  if (ov) ov.classList.add('show');
}
async function submitTotpUnlock() {
  const inp = document.getElementById('totpUnlockInput');
  const err = document.getElementById('totpUnlockError');
  const got = inp ? inp.value.trim() : '';
  if (!/^\d{6}$/.test(got)) {
    if (err) err.textContent = '请输入 6 位数字';
    if (err) err.style.display = 'block';
    return;
  }
  const encryptedSec = localStorage.getItem('ww_totp_secret');
  if (!encryptedSec) {
    if (err) err.textContent = 'TOTP 配置已丢失';
    if (err) err.style.display = 'block';
    return;
  }
  const pin = _pin || wwGetSessionPin();
  if (!pin) {
    if (err) err.textContent = '请先通过 PIN 解锁钱包';
    if (err) err.style.display = 'block';
    return;
  }
  var sec = null;
  try {
    var parsed = JSON.parse(encryptedSec);
    if (parsed && parsed.v === 1 && parsed.s && parsed.iv && parsed.c) {
      sec = await decryptTotpSecret(encryptedSec, pin);
      if (!sec) {
        if (err) err.textContent = 'TOTP 解密失败';
        if (err) err.style.display = 'block';
        return;
      }
    } else {
      sec = encryptedSec;
    }
  } catch (_e) {
    sec = encryptedSec;
  }
  const ok = await wwVerifyTotpCode(sec, got);
  if (!ok) {
    if (err) err.textContent = '验证码不正确';
    if (err) err.style.display = 'block';
    if (inp) inp.value = '';
    const pan = document.getElementById('totpUnlockPanel');
    if (pan) {
      pan.classList.remove('wt-shake-wrong');
      void pan.offsetWidth;
      pan.classList.add('wt-shake-wrong');
    }
    return;
  }
  _pin = pin;
  clearTimeout(window._pinClearTimer);
  window._pinClearTimer = setTimeout(function () {
    _pin = null;
  }, 30 * 60 * 1000);
  const ov = document.getElementById('totpUnlockOverlay');
  if (ov) ov.classList.remove('show');
  if (err) err.style.display = 'none';
  await _resumeWalletAfterUnlock();
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
  try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap2) {}
}

function goTo(pageId, opts) {
  opts = opts || {};
  if (pageId === 'page-home' && typeof wwWalletHasAnyChainAddress === 'function') {
    var _rwGo = typeof REAL_WALLET !== 'undefined' ? REAL_WALLET : null;
    if (!wwWalletHasAnyChainAddress(_rwGo)) pageId = 'page-welcome';
  }
  if (pageId === 'page-password-restore' && typeof wwWalletHasAnyChainAddress === 'function') {
    var _pwStoreRt = null;
    try {
      _pwStoreRt = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
    } catch (_e) {
      _pwStoreRt = {};
    }
    if (!wwWalletHasAnyChainAddress(_pwStoreRt)) pageId = 'page-welcome';
    else if (typeof loadWallet === 'function') {
      try {
        loadWallet();
      } catch (_lw) {}
    }
  }
  try { sessionStorage.setItem('ww_last_page', pageId); } catch(_) {}
  try {
    var curEl = document.querySelector('.page.active');
    var curId = curEl && curEl.id;
    if (curId && pageId === 'page-import' && curId !== 'page-import') {
      window._importBackTarget = curId;
    }
  } catch (_ib) {}
  applySeoForPage(pageId);
  document.querySelectorAll('.page').forEach(p=>{p.classList.remove('active');p.style.display='';});
  const activePage=document.getElementById(pageId);
  if(!activePage){console.warn('[WorldToken] 页面不存在:',pageId);return;}
  activePage.classList.add('active');
  activePage.style.display='';
  var _tbGo = document.getElementById('tabBar');
  if (_tbGo) {
    if (pageId === 'page-home') {
      _tbGo.style.display = (typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET)) ? 'flex' : 'none';
    } else {
      _tbGo.style.display = MAIN_PAGES.includes(pageId) ? 'flex' : 'none';
    }
  }
  if(pageId==='page-key') {
    var _skipKey = opts.preserveKeyPage || opts.skipKeyRegen;
    if (_skipKey) {
      if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
      if (typeof renderKeyGrid === 'function') renderKeyGrid();
    } else {
      currentMnemonicLength = 12;
      var _selK = document.getElementById('mnemonicLength');
      if (_selK) { _selK.value = '12'; _selK.selectedIndex = 0; }
      if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
      showWalletLoading();
      Promise.resolve(createWallet(12))
        .then(function (w) {
          window.TEMP_WALLET = w;
          hideWalletLoading();
          if (typeof syncKeyPageLangSelect === 'function') syncKeyPageLangSelect();
          if (typeof renderKeyGrid === 'function') renderKeyGrid();
        })
        .catch(function (e) {
          hideWalletLoading();
          if (typeof showToast === 'function')
            showToast(typeof formatWalletCreateError === 'function' ? formatWalletCreateError(e) : (e && e.message) || '生成失败', 'error');
        });
    }
  }
  if(pageId==='page-key-verify') {} // 验证页由 startVerify 初始化
if(pageId==='page-import') { initImportGrid(); document.getElementById('importError').style.display='none'; const paste=document.getElementById('importPaste'); if(paste) paste.value=''; updateImportWordCount(); }
  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-social-recovery') { try { if(typeof wwSocialRecoveryRender==='function') setTimeout(wwSocialRecoveryRender, 40); } catch(_sr) {} }
  if(pageId==='page-spending-limits') { try { if(typeof wwSpendLimitPopulate==='function') setTimeout(wwSpendLimitPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch(_wh) {} }
  if(pageId==='page-bridge') { try { setTimeout(function(){ if(typeof wwBridgeSyncTo==='function') wwBridgeSyncTo(); }, 0); } catch(_br) {} }
  if(pageId==='page-vesting') { try { if(typeof wwVestingRender==='function') setTimeout(wwVestingRender, 40); } catch(_ve) {} }
  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch(_dx) {} }
  if(pageId==='page-hardware-wallet') { try { if(typeof wwHardwareWalletPopulate==='function') setTimeout(wwHardwareWalletPopulate, 40); } catch(_hw) {} }
  if(pageId==='page-tax-report') { try { if(typeof wwTaxReportPopulate==='function') setTimeout(wwTaxReportPopulate, 40); } catch(_tr) {} }
  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch(_cp) {} }
  if(pageId==='page-portfolio-insurance') { try { if(typeof wwPortfolioInsurancePopulate==='function') setTimeout(wwPortfolioInsurancePopulate, 40); } catch(_pi) {} }
  if(pageId==='page-yield-optimizer') { try { if(typeof wwYieldOptimizerPopulate==='function') setTimeout(wwYieldOptimizerPopulate, 40); } catch(_yo) {} }
  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch(_uc) {} }
  if(pageId==='page-identity') { try { if(typeof wwIdentityPopulate==='function') setTimeout(wwIdentityPopulate, 40); } catch(_id) {} }
  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch(_an) {} }
  if(pageId==='page-recurring') { try { if(typeof wwRecurringPopulate==='function') setTimeout(wwRecurringPopulate, 40); } catch(_re) {} }
  if(pageId==='page-token-whitelist') { try { if(typeof wwWhitelistPopulate==='function') setTimeout(wwWhitelistPopulate, 40); } catch(_wl) {} }
  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch(_ih) {} }
  if(pageId==='page-dao') { try { if(typeof wwDaoRender==='function') setTimeout(wwDaoRender, 40); } catch(_dao) {} }
  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch(_rep) {} }
  if(pageId==='page-lending') { try { if(typeof wwLendingPopulate==='function') setTimeout(wwLendingPopulate, 40); } catch(_ld) {} }
  if(pageId==='page-perp-futures') { try { if(typeof wwPerpPopulate==='function') setTimeout(wwPerpPopulate, 40); } catch(_pf) {} }
  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch(_op) {} }
  if(pageId==='page-yield-aggregator') { try { if(typeof wwYieldAggPopulate==='function') setTimeout(wwYieldAggPopulate, 40); } catch(_ya) {} }
  if(pageId==='page-liquidation-alerts') { try { if(typeof wwLiquidationPopulate==='function') setTimeout(wwLiquidationPopulate, 40); } catch(_lq) {} }
  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch(_lp) {} }
  if(pageId==='page-social-leaderboard') { try { if(typeof wwSocialLeaderboardPopulate==='function') setTimeout(wwSocialLeaderboardPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-auto-rebalance') { try { if(typeof wwAutoRebalancePopulate==='function') setTimeout(wwAutoRebalancePopulate, 50); } catch(_ar) {} }
  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch(_sn) {} }
  if(pageId==='page-onchain-messaging') { try { if(typeof wwOnchainMessagingPopulate==='function') setTimeout(wwOnchainMessagingPopulate, 40); } catch(_om) {} }
  if(pageId==='page-backup-qr') { try { setTimeout(function(){ var c=document.getElementById('wwBackupQrCanvas'); if(c){ var x=c.getContext('2d'); if(x){ x.fillStyle='#f0f0f0'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#999'; x.font='13px sans-serif'; x.textAlign='center'; x.fillText('点击下方生成', c.width/2, c.height/2); } } }, 0); } catch(_bq) {} }
  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch(_gs) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }
  if(pageId==='page-settings') {
    updateSettingsPage();
    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch(_ar0) {}
    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch(_gsp) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}
  }
  if(pageId==='page-swap') { if(typeof renderSwapUI==='function'){renderSwapUI();calcSwap();} setTimeout(loadSwapPrices, 200); }
  if(pageId==='page-hongbao') { if(typeof updateGiftUI==='function') updateGiftUI(); }
  if(MAIN_PAGES.includes(pageId)) updateAddr();
  if(pageId==='page-addr') {
    setTimeout(updateQRCode, 100);
    // 更新链地址显示
    if(REAL_WALLET) {
      const trx = REAL_WALLET.trxAddress || '--';
      const eth = REAL_WALLET.ethAddress || '--';
      const btc = REAL_WALLET.btcAddress || '--';
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
  if(pageId==='page-swap') setTimeout(loadSwapPrices, 100);
  if(pageId==='page-hb-records') loadHbRecords();
  if(pageId==='page-home') {
    // 有钱包时显示导航栏
    if(REAL_WALLET && REAL_WALLET.ethAddress) {
      document.getElementById('tabBar').style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof updateHomeBackupBanner==='function') updateHomeBackupBanner();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
    if(REAL_WALLET && REAL_WALLET.trxAddress && typeof loadTrxResource==='function') setTimeout(loadTrxResource, 400);
    if(typeof refreshHomePriceTicker==='function') setTimeout(refreshHomePriceTicker, 200);
  }
  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
    try { if(typeof wwMevToggleInit==='function') wwMevToggleInit(); } catch(_wm) {}
  }
  if(pageId==='page-dapp') {
    setTimeout(function() {
      try {
        var inp = document.getElementById('dappUrlInput');
        if(inp) inp.focus();
      } catch(e) {}
    }, 200);
  }
  if (pageId === 'page-home' && typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET)) {
    setTimeout(loadTxHistory, 500);
    setTimeout(loadBalances, 500);
  }
  if (pageId === 'page-password-restore') {
    var _priRt = document.getElementById('pinRestorePageInput');
    var _preRt = document.getElementById('pageRestorePinError');
    if (_preRt) {
      _preRt.style.display = 'none';
      _preRt.textContent = '';
    }
    if (_priRt) _priRt.value = '';
    setTimeout(function () {
      try {
        if (_priRt) _priRt.focus();
      } catch (_f) {}
    }, 100);
  }
  try { if (typeof wwUpdateScrollTopBtn === 'function') wwUpdateScrollTopBtn(); } catch (e) {}
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
  } catch (e) {}
}


async function resolveENS(name) {
  if (!name.endsWith('.eth')) return name;
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const addr = await provider.resolveName(name);
    return addr || name;
  } catch(e) { return name; }
}

function goTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  goTo(TAB_MAP[tabId]||'page-home');
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
  var order = ['tab-home', 'tab-addr', 'tab-swap', 'tab-settings'];
  var pageToTab = { 'page-home': 'tab-home', 'page-addr': 'tab-addr', 'page-swap': 'tab-swap', 'page-settings': 'tab-settings' };
  var sx = 0, sy = 0, startEl = null;
  root.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; startEl = e.target;
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


function selectLang(btn) {
  document.querySelectorAll('#welcomeLangGrid .lang-row, #welcomeLangGrid .lang-btn').forEach(b=>{
    b.classList.remove('active');
    const check = b.querySelector('.lang-check');
    if(check) check.style.opacity='0';
  });
  btn.classList.add('active');
  const check = btn.querySelector('.lang-check');
  if(check) check.style.opacity='1';
  currentLang = btn.dataset.lang;
}

function renderKeyGrid() {
  let words;
  const isEn = currentLang === 'en';
  const enMnemonic = REAL_WALLET && REAL_WALLET.enMnemonic;
  if (!enMnemonic) {
    goTo('page-create');
    return;
  }
  const enWords = enMnemonic.trim().split(/\s+/).filter(Boolean);
  if (isEn) {
    words = enWords;
    if (REAL_WALLET) REAL_WALLET.words = words;
  } else {
    words = enWordsToLangKeyTableWords(enWords, currentLang);
    if (REAL_WALLET) {
      REAL_WALLET.displayLang = currentLang;
      REAL_WALLET.displayWords = words;
      REAL_WALLET.words = words;
    }
  }
  try {
    // 只更新警告文字，不覆盖用户选择的词数
    const wlen = words.length;
    const wce = document.getElementById('warnWordCount');
    if (wce) wce.textContent = String(wlen);
    // 不反向覆盖 currentMnemonicLength 或下拉框
  } catch (e) {}
  const grid = document.getElementById('keyWordGrid');
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
    const isSmall = currentLang==='en';
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
  if (REAL_WALLET) {
    REAL_WALLET.words = words.slice();
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
  /* 首页 TRX/ETH/BTC 链上圆形条已移除，保留空函数供旧调用 */
}

function updateHomeBackupBanner() {
  var b = document.getElementById('homeBackupBanner');
  if (!b) return;
  var show = REAL_WALLET && REAL_WALLET.ethAddress && !REAL_WALLET.backedUp;
  b.style.display = show ? 'block' : 'none';
}

function getMnemonicStrengthDisplay() {
  var n = 12;
  // 以真实助记词词数为准（不依赖可能被浏览器恢复的下拉框）
  if (REAL_WALLET && REAL_WALLET.enMnemonic) {
    var wc = REAL_WALLET.enMnemonic.trim().split(/\s+/).filter(Boolean).length;
    if ([12, 15, 18, 21, 24].includes(wc)) n = wc;
  } else if ([12, 15, 18, 21, 24].includes(currentMnemonicLength)) {
    n = currentMnemonicLength;
  }
  if (![12,15,18,21,24].includes(n)) n = 12;
  var bitsMap = {12:128,15:160,18:192,21:224,24:256};
  var bits = bitsMap[n] || 128;
  var levels = {12:'标准',15:'良好',18:'强',21:'很强',24:'极高'};
  var level = levels[n] || '标准';
  return { bits: bits, level: level, n: n };
}

function updateMnemonicStrengthIndicator() {
  var elBits = document.getElementById('mnemonicStrengthBits');
  var elLevel = document.getElementById('mnemonicStrengthLevel');
  if (!elBits || !elLevel) return;
  var d = getMnemonicStrengthDisplay();
  elBits.textContent = String(d.bits);
  elLevel.textContent = d.level;
}

function setTransferQuickAmount(amt) {
  var inp = document.getElementById('transferAmount');
  if (!inp) return;
  inp.value = String(amt);
  if (typeof calcTransferFee === 'function') calcTransferFee();
}

function updateAddr() {
  const a = ADDR_SAMPLES[currentLang]||ADDR_SAMPLES.zh;
  const isEn = currentLang==='en';
  // 初始化万语地址（如果还没初始化）
  if(ADDR_WORDS.length === 0) initAddrWords();
  else renderAddrWords();
  // 获取完整万语地址
  const nativeAddr = getNativeAddr();
  const shortAddr = nativeAddr.length > 16 ? nativeAddr.substring(0,8)+'...'+nativeAddr.slice(-4) : nativeAddr;
  // 首页芯片
  const chip = document.getElementById('homeAddrChip');
  if(chip) chip.textContent = isEn ? CHAIN_ADDR : nativeAddr;
  // QR 二维码区大字显示
  const qp1 = document.getElementById('qrPart1');
  const qp2 = document.getElementById('qrPart2');
  if(qp1 && !isEn) { qp1.textContent = nativeAddr.substring(0,10); qp1.style.fontSize='14px'; qp1.style.letterSpacing='1px'; }
  if(qp2 && !isEn) { qp2.textContent = nativeAddr.substring(10); qp2.style.fontSize='12px'; }
  // swoosh 转账动画
  const sfp1 = _safeEl('swooshFromPart1');
  const sfp2 = _safeEl('swooshFromPart2');
  if(sfp1 && !isEn) { sfp1.textContent = nativeAddr.substring(0,8); sfp1.style.fontSize='12px'; sfp1.style.letterSpacing='1px'; }
  if(sfp2 && !isEn) sfp2.textContent = nativeAddr.substring(8,18)+'...';
  // 转账成功页
  const suc1 = _safeEl('successFromPart1');
  const suc2 = _safeEl('successFromPart2');
  if(suc1 && !isEn) { suc1.textContent = nativeAddr.substring(0,8); suc1.style.fontSize='12px'; }
  if(suc2 && !isEn) suc2.textContent = nativeAddr.substring(8,18)+'...';
  // 地址页
  const m=_safeEl('addrMain');
  const n=(_safeEl('addrNum') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* addrNum fallback */;
  if(m) m.textContent = isEn ? CHAIN_ADDR : a.main;
  if(n) n.style.display = isEn?'none':'block';
  if(n&&!isEn) n.textContent = a.num;
  // QR弹窗同步
  const qm=document.getElementById('qrAddrMain');
  if(qm) qm.textContent = isEn ? CHAIN_ADDR : nativeAddr;
  // 二维码区语言标签（与系统语言 currentLang 一致）
  const langTag = document.getElementById('qrLangTag');
  const info = LANG_INFO[currentLang]||{flag:'🌍',name:'Mother'};
  if(langTag) langTag.textContent = (info.flag || '🌍') + ' ' + (currentLang === 'en' ? 'BIP39' : '万语地址');
  // 更新二维码显示内容
  updateQRDisplay();
  // 同步礼金UI
  if(typeof updateGiftUI==='function') updateGiftUI();
  updateHomeChainStrip();
}

function getNativeAddr() {
  if(currentLang === 'en') return CHAIN_ADDR;
  const prefix = (document.getElementById('addrPrefix')?.textContent || '38294651').replace(/\D/g,'').substring(0,8);
  const suffix = (document.getElementById('addrSuffix')?.textContent || '92847361').replace(/\D/g,'').substring(0,8);
  const words = ADDR_WORDS.length ? ADDR_WORDS.map(w=>w.word).join('') : '';
  return prefix + '-' + words + '-' + suffix;
}

function copyHomeAddr() {
  const addr = getNativeAddr();
  const btn = document.getElementById('homeCopyAddrBtn');
  const done = () => {
    if(btn) {
      btn.textContent = '✅ 已复制';
      btn.style.background = 'rgba(74,200,74,0.2)';
      btn.style.color = 'var(--green)';
      setTimeout(() => {
        btn.textContent = '复制地址';
        btn.style.background = '';
        btn.style.color = '';
      }, 1800);
    }
    showToast('✅ 万语地址已复制到剪贴板', 'success', 2200);
  };
  if(navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(addr).then(done).catch(() => {
      try {
        const ta = document.createElement('textarea');
        ta.value = addr;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch(e) { showToast('复制失败，请长按地址手动复制', 'error'); }
    });
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = addr;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch(e) { showToast('复制失败，请长按地址手动复制', 'error'); }
  }
}

function copyNative() {
  navigator.clipboard?.writeText(getNativeAddr()).catch(()=>{});
  const btn=document.getElementById('copyNativeBtn');
  if(btn){btn.textContent='✅ 已复制'; btn.classList.add('copied');}
  setTimeout(()=>{btn.textContent='📋 复制';if(btn) btn.classList.remove('copied');},2000);
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

function copySingle(text, el) {
  navigator.clipboard?.writeText(text).catch(()=>{});
  const orig=el.textContent; el.textContent='✅';
  setTimeout(()=>el.textContent=orig,1500);
}

function showQR() { document.getElementById('qrOverlay').classList.add('show'); }

let currentQRChain = 'native';
const QR_CHAIN_DATA = {
  native: { label:'万语地址', color:'var(--gold)' },
  trx: { label:'TRX 公链地址', color:'#ff9a9a' },
  eth: { label:'ETH 公链地址', color:'#aaaaff' },
  btc: { label:'BTC 公链地址', color:'#ffb84d' },
};

function switchQRChain(chain) {
  currentQRChain = chain;
  const btns = ['native','trx','eth','btc'];
  btns.forEach(b => {
    const el = document.getElementById('qrBtn'+b.charAt(0).toUpperCase()+b.slice(1));
    if(!el) return;
    if(b===chain) {
      el.style.borderColor='rgba(200,168,75,0.4)';
      el.style.color='var(--gold)';
      el.style.background='linear-gradient(135deg,rgba(200,168,75,0.15),rgba(200,168,75,0.05))';
    } else {
      el.style.borderColor='var(--border)';
      el.style.color='var(--text-muted)';
      el.style.background='var(--bg3)';
    }
  });
  updateQRDisplay();
}

function updateQRDisplay() {
  const isEn = currentLang==='en';
  const p1 = document.getElementById('qrPart1');
  const p2 = document.getElementById('qrPart2');
  if(!p1) return;
  if(isEn) {
    p1.innerHTML = '<span style="color:var(--text-muted);font-size:11px">'+CHAIN_ADDR+'</span>';
    if(p2) p2.style.display = 'none';
  } else {
    // 用万语地址，带高亮
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
    if(p2) p2.style.display = 'none';
  }
}

function copyQRAddr() {
  const native = getNativeAddr();
  const text = currentLang==='en'
    ? '⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr()
    : '🌍 万语地址\n'+native+'\n\n⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr();
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn = _safeEl('qrCopyBtn');
  if(btn) { btn.innerHTML='✅ 已复制'; setTimeout(()=>btn.innerHTML='📋 复制地址',1500); }
}

function toggleQRChain() {
  const chains = ['native','trx','eth','btc'];
  const idx = chains.indexOf(currentQRChain);
  switchQRChain(chains[(idx+1)%chains.length]);
}
function hideQR() { document.getElementById('qrOverlay').classList.remove('show'); }


// KEYWORDS_ZH 已迁移到 KW_ZH
// KEYWORDS_EN 已迁移到 KW_EN
// Must not reference KW_ZH here — const KW_ZH is declared later (TDZ).
let currentKeyword = '举头望明月';

function getKeywords() {
  return (typeof LANG_KW!=='undefined' ? LANG_KW[currentLang] : null) || KW_ZH || [];
}

function refreshKeyword() {
  const kws = getKeywords();
  const idx = Math.floor(Math.random() * kws.length);
  currentKeyword = kws[idx];
  // 更新关键词显示（多个可能的 DOM id）
  ['hbKeyword','kwKeyword','kwShareKeyword'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent=currentKeyword;
  });
}

function setAmount(v) {
  document.getElementById('hbAmount').value = v;
  updateHbPreview();
}

function claimHongbao() {
  submitClaim(); // 调用真实领取
}

function copyKeyword() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = event?.target?.closest('div');
  if(btn) { const old = btn.textContent; btn.textContent = '✅ 已复制'; setTimeout(()=>btn.textContent=old, 1500); }
}




function toggleBatchSendPanel() {
  const p = document.getElementById('batchSendPanel');
  const box = document.getElementById('transferAddrBox');
  const t = document.getElementById('batchSendToggle');
  if(!p || !box) return;
  const opening = p.style.display === 'none' || !p.style.display;
  if(opening) {
    p.style.display = 'block';
    box.style.display = 'none';
    if(t) t.textContent = '✏️ 单笔转账';
  } else {
    p.style.display = 'none';
    box.style.display = '';
    if(t) t.textContent = '📋 批量发送';
  }
}

async function runBatchTransfer() {
  const ta = document.getElementById('batchTransferLines');
  const lines = (ta && ta.value ? ta.value : '').split(/\n/).map(function(l) { return l.trim(); }).filter(Boolean);
  const amt = parseFloat(document.getElementById('transferAmount').value);
  if(!lines.length) { showToast('❌ 请至少输入一个地址', 'error'); return; }
  if(!amt || amt <= 0) { showToast('❌ 请输入有效金额', 'error'); return; }
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  const bal = Number(transferCoin.bal) || 0;
  const n = lines.length;
  if(amt * n > bal + 1e-10) { showToast('❌ 总金额超过可用余额（共'+n+'笔）', 'error'); if(typeof shakeTransferAmountTooHigh==='function') shakeTransferAmountTooHigh(); return; }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  if(!confirm('将向 '+n+' 个地址各发送 '+amt+' '+transferCoin.name+'，确认？')) return;
  let okCount = 0;
  for(let i = 0; i < lines.length; i++) {
    document.getElementById('transferAddr').value = lines[i];
    document.getElementById('transferAmount').value = String(amt);
    const ok = await broadcastRealTransfer();
    if(ok) { okCount++; if(typeof saveRecentTransferAddr==='function') saveRecentTransferAddr(lines[i]); }
    else { showToast('第 '+(i+1)+' 笔发送失败，已停止', 'error'); break; }
    await new Promise(function(r) { setTimeout(r, 450); });
  }
  showToast('完成：成功 '+okCount+' / '+n, okCount === n ? 'success' : 'warning');
  if(typeof loadBalances==='function') loadBalances();
  if(okCount > 0) goTo('page-home');
}

function parseAssetDisplayBalance(balId) {
  const el = document.getElementById(balId);
  if(!el) return 0;
  const t = (el.textContent || '').replace(/,/g,'').trim();
  if(t === '--' || t === '...' || !t) return 0;
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

function applyHideZeroTokens() {
  let hide = false;
  try { hide = localStorage.getItem('ww_hide_zero_tokens') === '1'; } catch(e) {}
  const cb = document.getElementById('hideZeroTokens');
  if(cb) cb.checked = hide;
  const rows = [
    { id: 'assetRowUsdt', balId: 'balUsdt' },
  ];
  rows.forEach(function(row) {
    const el = document.getElementById(row.id);
    if(!el) return;
    const v = parseAssetDisplayBalance(row.balId);
    el.style.display = (hide && v <= 1e-12) ? 'none' : '';
  });
}

function onHideZeroTokensChange() {
  const cb = document.getElementById('hideZeroTokens');
  try { localStorage.setItem('ww_hide_zero_tokens', cb && cb.checked ? '1' : '0'); } catch(e) {}
  applyHideZeroTokens();
}

function getMnemonicWordsForDisplay() {
  const words = [];
  const isEn = currentLang === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(function(w) { words.push(w); });
  } else {
    const wl = WT_WORDLISTS[currentLang];
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

function copyMnemonicAsCardImage(btn) {
  const words = getMnemonicWordsForDisplay();
  if(!words.length) { showToast('无可用助记词', 'error'); return; }
  const w = 720;
  const rowH = 42;
  const cols = 3;
  const gridRows = Math.ceil(words.length / cols);
  const h = 120 + gridRows * rowH + 100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#1a1528');
  grd.addColorStop(1, '#07070e');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(200,168,75,0.45)';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = 'rgba(200,168,75,0.95)';
  ctx.font = 'bold 28px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WorldToken', w / 2, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '14px system-ui,-apple-system,sans-serif';
  ctx.fillText('助记词备份 · 请离线保存，勿分享', w / 2, 88);
  ctx.textAlign = 'left';
  ctx.font = '20px ui-monospace, Menlo, monospace';
  const cellW = (w - 96) / cols;
  words.forEach(function(word, i) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 48 + col * cellW;
    const y = 118 + row * rowH;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillText((i + 1) + '. ' + word, x, y);
  });
  ctx.fillStyle = 'rgba(255,120,100,0.95)';
  ctx.font = '13px system-ui,-apple-system,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ 任何获得此图的人可能控制您的资产 · 请妥善保管', w / 2, h - 36);
  canvas.toBlob(function(blob) {
    if(!blob) { showToast('图片生成失败', 'error'); return; }
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'worldtoken-mnemonic-backup.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch(e1) {}
    if(navigator.clipboard && navigator.clipboard.write) {
      try {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } catch(e2) {}
    }
    if(btn) {
      var prev = btn.textContent;
      btn.textContent = '✅ 已保存';
      setTimeout(function() { btn.textContent = prev; }, 2000);
    }
  }, 'image/png', 0.95);
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
    var r = await fetch(TRON_GRID + '/wallet/getaccountresource', {
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
function wwLoadDappUrl() {
  var inp = document.getElementById('dappUrlInput');
  var f = document.getElementById('dappFrame');
  if(!f) return;
  var u = inp && inp.value ? inp.value.trim() : '';
  if(!u) { if(typeof showToast==='function') showToast('请输入网址', 'warning'); return; }
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    f.src = u;
  } catch(e1) {
    if(typeof showToast==='function') showToast('无法打开链接', 'error');
  }
}
function wwDappReload() {
  var f = document.getElementById('dappFrame');
  if(f && f.src) { try { f.contentWindow.location.reload(); } catch(e) { f.src = f.src; } }
}
function wwGetIdleLockMinutes() {
  try {
    var v = localStorage.getItem('ww_lock_idle_min');
    if(v === '1' || v === '5' || v === '15') return parseInt(v, 10);
  } catch(e) {}
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
function wwCycleIdleLockMinutes() {
  var cur = wwGetIdleLockMinutes();
  var next = cur === 0 ? 1 : (cur === 1 ? 5 : (cur === 5 ? 15 : 0));
  try {
    if(next === 0) localStorage.removeItem('ww_lock_idle_min');
    else localStorage.setItem('ww_lock_idle_min', String(next));
  } catch(e) {}
  wwApplyIdleLockLabel();
  wwResetActivityClock();
  if(typeof showToast==='function') showToast(next === 0 ? '已关闭闲置锁定' : ('闲置 ' + next + ' 分钟后锁定'), 'info', 2200);
}
function wwResetActivityClock() {
  window._wwLastActivityTs = Date.now();
}
function wwTickIdleLock() {
  var mins = wwGetIdleLockMinutes();
  if(!mins) return;
  if(!wwHasPinConfigured()) return;
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
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap3) {}
    setTimeout(function() { try { inp.focus(); } catch(e) {} }, 200);
  }
  wwCleanupMemory();
  try { wwCleanupStorage(); } catch (_wcs2) {}
  window._wwUnlockPreservePage = true;
  window._wwForceIdleLock = true;
}

const TRON_GRID = 'https://api.trongrid.io';
const USDT_TRC20 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const ETH_RPC = 'https://eth.llamarpc.com';

function shakeTransferAmountTooHigh() {
  try {
    var el = document.getElementById('transferAmount');
    if (!el) return;
    var i = 0;
    var id = setInterval(function () {
      el.style.transform = (i++ % 2) ? 'translateX(4px)' : 'translateX(-4px)';
      if (i > 6) {
        clearInterval(id);
        el.style.transform = '';
      }
    }, 45);
  } catch (_e) {}
}

async function broadcastRealTransfer() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return false; }
  const addr = document.getElementById('transferAddr').value.trim();
  const coin = transferCoin.id;
  if(!addr || addr.length < 26){showToast('地址格式无效','error');return false;}
  if(coin==='eth' && !addr.match(/^0x[a-fA-F0-9]{40}$/)){showToast('以太坊地址格式错误','error');return false;}
  if((coin==='usdt'||coin==='trx') && !addr.match(/^T[a-zA-Z0-9]{33}$/)){showToast('TRON地址格式错误','error');return false;}
  if (typeof wwTransferWhitelistCheck === 'function' && !wwTransferWhitelistCheck(addr)) {
    showToast('❌ 收款地址未通过「转账白名单」校验。请在 设置 → 转账白名单 中添加该地址或关闭白名单。', 'error');
    return false;
  }
  const amt = parseFloat(document.getElementById('transferAmount').value);
  if(!amt || amt<=0 || isNaN(amt)){showToast('金额无效','error');return false;}
  if(amt>10000){showToast('单笔超10000限额','error');return false;}
  const bal = (transferCoin.bal||0);
  if(amt>bal){showToast('余额不足','error');return false;}

  const txkey = Date.now()+Math.random();
  window._wwPendingTxs = window._wwPendingTxs || {};
  window._wwPendingTxs[txkey] = {coin,addr,amt,time:Date.now()};
  try {
    let txHash = '';

    if(coin === 'usdt') {
      // USDT TRC-20 转账
      txHash = await sendUSDT_TRC20(addr, amt);
    } else if(coin === 'trx') {
      // TRX 转账：加载 TronWeb 后用 isAddress 校验（优于纯正则）
      await loadTronWeb();
      if(typeof TronWeb !== 'undefined' && typeof TronWeb.isAddress === 'function') {
        if(!TronWeb.isAddress(addr)) { showToast('TRON地址格式错误','error'); return false; }
      } else if(!addr.match(/^T[a-zA-Z0-9]{33}$/)) {
        showToast('TRON地址格式错误','error'); return false;
      }
      txHash = await sendTRX(addr, amt);
    } else if(coin === 'eth') {
      // ETH 转账
      txHash = await sendETH(addr, amt);
    } else {
      showToast('⚠️ 暂不支持 ' + transferCoin.name + ' 转账', 'warning');
      return false;
    }

    if(txHash) {
      try { if (typeof wwRecordSpendAfterBroadcast === 'function') wwRecordSpendAfterBroadcast(amt); } catch (_rs) {}
      _safeEl('successTxHash') && ((_safeEl('successTxHash') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successTxHash fallback */.textContent = txHash);
      _safeEl('successTxLink') && (_safeEl('successTxLink').href =
        coin==='eth' ? 'https://etherscan.io/tx/'+txHash : 'https://tronscan.org/#/transaction/'+txHash);
      return true;
    }
  } catch(e) {
    console.error('转账失败:', e);
    showToast('❌ 转账失败: ' + (e.message || e), 'error');
  } finally {
    try { delete window._wwPendingTxs[txkey]; } catch (_pt) {}
  }
  return false;
}

async function sendUSDT_TRC20(toAddr, amount) {
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey);
  if(!Number.isFinite(amount) || amount <= 0 || amount > 1e8) { throw new Error('金额范围错误'); }
  const amtSun = Math.floor(amount * 1e6);
  if(amtSun <= 0 || amtSun > 1e14) { throw new Error('精度错误'); }
  const tx = await tw.transactionBuilder.triggerSmartContract(
    USDT_TRC20,
    'transfer(address,uint256)',
    { feeLimit: (typeof getTronFeeLimitUsdt==='function' ? getTronFeeLimitUsdt() : 20000000) },
    [
      { type: 'address', value: toAddr },
      { type: 'uint256', value: amtSun }
    ],
    REAL_WALLET.trxAddress // Base58格式，TronWeb自动处理
  );
  const signed = await tw.trx.sign(tx.transaction);
  const result = await tw.trx.sendRawTransaction(signed);
  if(result.result) return result.txid;
  throw new Error(result.message || 'USDT 广播失败');
}

async function sendTRX(toAddr, amount) {
  await loadTronWeb();
  const tw = new TronWeb({ fullHost: TRON_GRID });
  tw.setPrivateKey(REAL_WALLET.trxPrivateKey || REAL_WALLET.privateKey);
  if(typeof TronWeb !== 'undefined' && typeof TronWeb.isAddress === 'function') {
    if(!TronWeb.isAddress(toAddr)) { throw new Error('TRON地址格式错误'); }
  } else if(!toAddr.match(/^T[a-zA-Z0-9]{33}$/)) {
    throw new Error('TRON地址格式错误');
  }
  const amtSun = Math.floor(amount * 1e6);
  if(!toAddr.match(/^T[a-zA-Z0-9]{33}$/)) { throw new Error('TRON地址格式错误'); }
  const tx = await tw.transactionBuilder.sendTrx(toAddr, amtSun, REAL_WALLET.trxAddress, { feeLimit: (typeof getTronFeeLimitTrx==='function' ? getTronFeeLimitTrx() : 25000000) });
  const signed = await tw.trx.sign(tx);
  const result = await tw.trx.sendRawTransaction(signed);
  if(result.result) return result.txid;
  throw new Error(result.message || 'TRX 广播失败');
}

async function sendETH(toAddr, amount) {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
  if(!ethers.utils.isAddress(toAddr)){throw new Error('以太坊地址无效');}
  toAddr = ethers.utils.getAddress(toAddr);
  const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);
  const sp = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  const mult = sp === 'slow' ? 0.88 : sp === 'fast' ? 1.24 : 1;
  const fd = await provider.getFeeData();
  const txReq = {
    to: toAddr,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: ethers.BigNumber.from('21000')
  };
  const est = await provider.estimateGas(txReq).catch(function () { return ethers.BigNumber.from('21000'); });
  txReq.gasLimit = est.mul(120).div(100);
  const m = Math.round(mult * 100);
  if(fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
    txReq.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
    txReq.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
  } else if(fd.gasPrice) {
    txReq.gasPrice = fd.gasPrice.mul(m).div(100);
  }
  const tx = await wallet.sendTransaction(txReq);
  await tx.wait(1);
  return tx.hash;
}

// ══ 转账系统 ══
let transferCoin = {id:'usdt', name:'USDT', chain:'TRC-20 · Tron', icon:'💚', bal:0, price:1};

const WW_RECENT_ADDR_KEY = 'ww_transfer_recent_addrs';
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
  try { localStorage.setItem(WW_RECENT_ADDR_KEY, JSON.stringify(list)); } catch(e) {}
}

const WW_CONTACTS_KEY = 'ww_transfer_contacts';
function getTransferContacts() {
  try {
    const raw = localStorage.getItem(WW_CONTACTS_KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter(x => x && typeof x.addr === 'string' && x.addr.trim() && typeof x.nick === 'string') : [];
  } catch(e) { return []; }
}
function setTransferContacts(list) {
  try { localStorage.setItem(WW_CONTACTS_KEY, JSON.stringify(list.slice(0, 48))); } catch(e) {}
}
function saveTransferContact(addr, nick) {
  const a = (addr || '').trim();
  const n = ((nick || '').trim() || '未命名').slice(0, 32);
  if(!a) return;
  let list = getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== a.toLowerCase());
  list.unshift({ addr: a, nick: n });
  setTransferContacts(list);
  renderTransferContactsList();
  showToast('已保存联系人', 'success');
}
function removeTransferContact(addr) {
  const t = (addr || '').trim().toLowerCase();
  if(!t) return;
  setTransferContacts(getTransferContacts().filter(c => c.addr.trim().toLowerCase() !== t));
  renderTransferContactsList();
}
function toggleContactAddForm() {
  const f = document.getElementById('transferContactAddForm');
  if(!f) return;
  const open = f.style.display === 'none' || !f.style.display || f.style.display === '';
  f.style.display = open ? 'block' : 'none';
  if(open) {
    const inp = document.getElementById('contactNickInput');
    if(inp) { inp.value = ''; try { inp.focus(); } catch(e) {} }
  }
}
function saveContactFromForm() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? ta.value.trim() : '';
  const inp = document.getElementById('contactNickInput');
  const nick = inp ? inp.value.trim() : '';
  if(!addr) { showToast('请先填写收款地址', 'error'); return; }
  saveTransferContact(addr, nick);
  const f = document.getElementById('transferContactAddForm');
  if(f) f.style.display = 'none';
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
function getTransferFeeSpeed() {
  try {
    const s = localStorage.getItem('ww_transfer_fee_speed');
    if(s === 'slow' || s === 'normal' || s === 'fast') return s;
  } catch(e) {}
  return 'normal';
}
function setTransferFeeSpeed(speed) {
  if(speed !== 'slow' && speed !== 'normal' && speed !== 'fast') speed = 'normal';
  try { localStorage.setItem('ww_transfer_fee_speed', speed); } catch(e) {}
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
let _wwTickerInterval = null;
async function refreshHomePriceTicker() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
    const d = await r.json();
    const fmt = function(x) {
      if(x === undefined || x === null || !isFinite(x)) return '—';
      return x < 10 ? x.toFixed(4) : x.toLocaleString('en', { maximumFractionDigits: 2 });
    };
    const ust = fmt(d.tether && d.tether.usd);
    try {
      window._wwLastCgUsd = {
        usdt: d.tether && d.tether.usd
      };
    } catch (_cg) {}
    const html = 'USDT <strong>$' + ust + '</strong>';
    const a = document.getElementById('wwTickerTextA');
    const b = document.getElementById('wwTickerTextB');
    if(a) a.innerHTML = html;
    if(b) b.innerHTML = html;
    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 90000);
    }
    try { if (typeof wwCheckPriceAlertsAfterTicker === 'function') wwCheckPriceAlertsAfterTicker(d); } catch (_pa) {}
  } catch(e) {}
}

function wwRequestPriceAlertPermission() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info');
      return;
    }
    Notification.requestPermission().then(function (p) {
      var msg = p === 'granted' ? '已授予通知权限' : ('权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info');
    });
  } catch (e) {}
}

function wwSavePriceAlertsFromUI() {
  var keys = ['btc', 'eth', 'trx', 'usdt'];
  var o = { enabled: !!(document.getElementById('wwAlertEnable') && document.getElementById('wwAlertEnable').checked) };
  keys.forEach(function (k) {
    var K = k.charAt(0).toUpperCase() + k.slice(1);
    var a = parseFloat((document.getElementById('wwAlert' + K + 'Above') || {}).value || '');
    var b = parseFloat((document.getElementById('wwAlert' + K + 'Below') || {}).value || '');
    o[k] = { above: isFinite(a) && a > 0 ? a : 0, below: isFinite(b) && b > 0 ? b : 0 };
  });
  try { localStorage.setItem('ww_price_alerts_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('已保存价格提醒', 'success');
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
      { key: 'usdt', name: 'USDT', get: function (z) { return z.tether && z.tether.usd; } }
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
  } catch (e) {}
}

function updateYieldFarmTracker(parts, total) {
  var el = document.getElementById('wwYieldFarmBody');
  if (!el) return;
  if (!total || total <= 1e-9) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:11px">暂无持仓估值，无法估算质押收益。</div>';
    return;
  }
  var apy = { USDT: 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
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

function wwWhitelistPopulate() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (en) en.checked = !!o.enabled;
    if (ta) ta.value = (Array.isArray(o.addresses) ? o.addresses : []).join('\n');
  } catch (e2) {
    if (en) en.checked = false;
    if (ta) ta.value = '';
  }
}

function wwWhitelistSave() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  var lines = (ta && ta.value ? ta.value : '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  var o = { enabled: !!(en && en.checked), addresses: lines.slice(0, 200) };
  try { localStorage.setItem('ww_transfer_whitelist_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('白名单已保存', 'success', 1800);
}

function wwRecurringLoad() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_recurring_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwRecurringSave(list) {
  try { localStorage.setItem('ww_recurring_v1', JSON.stringify(list.slice(0, 50))); } catch (e) {}
}

function wwRecurringRenderList() {
  var host = document.getElementById('wwRecurringList');
  if (!host) return;
  var list = wwRecurringLoad();
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无计划。添加后将在此显示下次提醒时间。</div>';
    return;
  }
    host.innerHTML = list.map(function (it, idx) {
    var next = it.nextAt ? new Date(it.nextAt).toLocaleString() : '—';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="word-break:break-all;color:var(--text)"><b>' + (it.amt || '?') + '</b> → ' + (it.addr || '').replace(/</g, '') + '</div>' +
      '<span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="wwRecurringRemove(' + idx + ')">删除</span></div>' +
      '<div style="margin-top:6px;color:var(--text-muted);font-size:11px">间隔 ' + (it.days || '?') + ' 天 · 下次提醒 ' + next + ' · ' + (it.enabled ? '已启用' : '已暂停') + '</div></div>';
  }).join('');
}

function wwRecurringPopulate() {
  wwRecurringRenderList();
}

function wwRecurringAdd() {
  var a = document.getElementById('wwRecurringAddr');
  var m = document.getElementById('wwRecurringAmt');
  var d = document.getElementById('wwRecurringDays');
  var en = document.getElementById('wwRecurringEnabled');
  var addr = a ? String(a.value || '').trim() : '';
  var amt = m ? String(m.value || '').trim() : '';
  var days = parseInt(d && d.value ? d.value : '7', 10);
  if (!addr) { if (typeof showToast === 'function') showToast('请填写收款地址', 'error'); return; }
  if (!days || days < 1) days = 7;
  var list = wwRecurringLoad();
  var nextAt = Date.now() + days * 86400000;
  list.push({ id: String(Date.now()), addr: addr, amt: amt || '—', days: days, enabled: !!(en && en.checked), nextAt: nextAt });
  wwRecurringSave(list);
  wwRecurringRenderList();
  if (a) a.value = '';
  if (m) m.value = '';
  if (typeof showToast === 'function') showToast('已加入计划列表', 'success', 2000);
}

function wwRecurringRemove(idx) {
  var list = wwRecurringLoad();
  list.splice(idx, 1);
  wwRecurringSave(list);
  wwRecurringRenderList();
}

function wwRecurringTick() {
  var list = wwRecurringLoad();
  var now = Date.now();
  var ch = false;
  list.forEach(function (it) {
    if (!it || !it.enabled || !it.nextAt) return;
    if (now < it.nextAt) return;
    var days = Math.max(1, parseInt(it.days, 10) || 7);
    it.nextAt = now + days * 86400000;
    ch = true;
    var title = 'WorldToken · 定期转账提醒';
    var body = '计划：向 ' + String(it.addr || '').slice(0, 18) + '… 发送约 ' + (it.amt || '?') + '（请手动在转账页操作）';
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body: body, tag: 'ww-recurring-' + (it.id || '') });
      } else if (typeof showToast === 'function') {
        showToast('📅 ' + body, 'warning', 6000);
      }
    } catch (e) {}
  });
  if (ch) wwRecurringSave(list);
}

function wwInheritancePopulate() {
  try {
    var o = JSON.parse(localStorage.getItem('ww_inheritance_v1') || '{}');
    var b = document.getElementById('wwInheritanceBeneficiary');
    var n = document.getElementById('wwInheritanceNote');
    if (b) b.value = o.beneficiary || '';
    if (n) n.value = o.note || '';
  } catch (e) {}
}

function wwInheritanceSave() {
  var b = document.getElementById('wwInheritanceBeneficiary');
  var n = document.getElementById('wwInheritanceNote');
  var o = {
    beneficiary: b ? String(b.value || '').trim().slice(0, 256) : '',
    note: n ? String(n.value || '').trim().slice(0, 2000) : ''
  };
  try { localStorage.setItem('ww_inheritance_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('继承备忘已保存（本机）', 'success', 2200);
}

var WW_DAO_PROPOSALS = [
  { id: 'p1', title: '是否将默认滑点提示调整为 0.5%？', summary: '减少新手因滑点过小导致的失败交易（示意）。' },
  { id: 'p2', title: '是否在设置中默认开启隐私模式？', summary: '首屏隐藏余额，需长按或 PIN 查看（示意）。' },
  { id: 'p3', title: '是否增加 TRX Gas 不足时的弹窗提醒？', summary: '当 TRX 余额低于阈值时强提醒（示意）。' }
];

function wwDaoGetVotes() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_dao_votes_v1') || '{}');
    return typeof j === 'object' && j ? j : {};
  } catch (e) { return {}; }
}

function wwDaoSetVote(pid, choice) {
  var v = wwDaoGetVotes();
  v[pid] = choice;
  try { localStorage.setItem('ww_dao_votes_v1', JSON.stringify(v)); } catch (e2) {}
  wwDaoRender();
  try { if(typeof wwReputationPopulate==='function') wwReputationPopulate(); } catch (_r) {}
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_s) {}
  if (typeof showToast === 'function') showToast('投票已保存（本机）', 'success', 1800);
}

function wwDaoRender() {
  var box = document.getElementById('wwDaoProposalList');
  if (!box) return;
  var votes = wwDaoGetVotes();
  box.innerHTML = WW_DAO_PROPOSALS.map(function (pr) {
    var cur = votes[pr.id] || '';
    function btn(ch, label) {
      var on = cur === ch ? 'background:rgba(200,168,75,0.25);border-color:var(--gold);color:var(--gold)' : 'background:var(--bg3);border-color:var(--border);color:var(--text)';
      return '<button type="button" class="btn-secondary" style="flex:1;min-width:72px;padding:8px 6px;font-size:11px;' + on + '" onclick="wwDaoSetVote(\'' + pr.id + '\',\'' + ch + '\')">' + label + '</button>';
    }
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:6px">' + pr.title + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.55;margin-bottom:12px">' + pr.summary + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btn('yes', '赞成') + btn('no', '反对') + btn('abstain', '弃权') + '</div></div>';
  }).join('');
}

function computeWalletReputationScore() {
  var txs = (typeof window._wwTxHistoryCache !== 'undefined' && window._wwTxHistoryCache) ? window._wwTxHistoryCache : [];
  var nTx = Array.isArray(txs) ? Math.min(txs.length, 200) : 0;
  var sec = (typeof getWalletSecurityBreakdown === 'function') ? getWalletSecurityBreakdown() : { score: 0 };
  var secScore = Math.min(100, Math.max(0, sec.score | 0));
  var votes = wwDaoGetVotes();
  var voteCount = 0;
  try {
    Object.keys(votes).forEach(function (k) { if (votes[k]) voteCount++; });
  } catch (e) {}
  var activityPts = Math.min(35, Math.floor(nTx * 1.2));
  var securityPts = Math.round(secScore * 0.45);
  var daoPts = Math.min(25, voteCount * 8);
  var raw = activityPts + securityPts + daoPts;
  var total = Math.min(100, Math.max(0, raw));
  return { total: total, activityPts: activityPts, securityPts: securityPts, daoPts: daoPts, nTx: nTx, secScore: secScore, voteCount: voteCount };
}

function wwReputationPopulate() {
  var r = computeWalletReputationScore();
  var big = document.getElementById('wwReputationScoreBig');
  var bar = document.getElementById('wwReputationBar');
  var ex = document.getElementById('wwReputationExplain');
  if (big) big.textContent = String(r.total);
  if (bar) bar.style.width = r.total + '%';
  if (ex) {
    ex.textContent = '活跃度 +' + r.activityPts + ' / 安全 +' + r.securityPts + ' / 治理 +' + r.daoPts + '（交易 ' + r.nTx + ' 条，安全分 ' + r.secScore + '，已投 ' + r.voteCount + ' 票）。此为本地参考分。';
  }
  try { updateReputationSettingsRow(); } catch (e) {}
}

function updateReputationSettingsRow() {
  var r = computeWalletReputationScore();
  var el = document.getElementById('wwReputationSettingsValue');
  if (el) el.textContent = r.total + ' 分';
}

function updateCrossChainSwapCompare() {
  var amtIn = parseFloat((_safeEl('swapAmountIn') || {}).value) || 0;
  var pFrom = (swapFrom && swapFrom.price) ? swapFrom.price : 1;
  var pTo = (swapTo && swapTo.price) ? swapTo.price : 1;
  var feeTron = amtIn * 0.003;
  var feeEth = amtIn * 0.0028;
  var slipEth = 0.9985;
  var outTron = (pTo > 0) ? ((amtIn - feeTron) * pFrom / pTo) : 0;
  var outEth = (pTo > 0) ? ((amtIn - feeEth) * pFrom / pTo) * slipEth : 0;
  var ft = swapTo ? swapTo.name : '';
  var elT = document.getElementById('wwSwapCompareTron');
  var elE = document.getElementById('wwSwapCompareEth');
  var bT = document.getElementById('wwSwapCompareBadgeTron');
  var bE = document.getElementById('wwSwapCompareBadgeEth');
  var best = document.getElementById('wwSwapCompareBest');
  if (elT) elT.textContent = amtIn > 0 ? (outTron > 1 ? outTron.toFixed(4) : outTron.toFixed(8)) + ' ' + ft : '—';
  if (elE) elE.textContent = amtIn > 0 ? (outEth > 1 ? outEth.toFixed(4) : outEth.toFixed(8)) + ' ' + ft : '—';
  var better = '相近';
  if (amtIn > 0 && outTron > outEth * 1.0001) { better = 'TRON 路径参考更优（预估多 ' + ((outTron - outEth) > 1 ? (outTron - outEth).toFixed(4) : (outTron - outEth).toFixed(8)) + ' ' + ft + '）'; if (bT) { bT.textContent = '较优'; bT.style.background = 'rgba(38,161,123,0.2)'; bT.style.color = '#26a17b'; } if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; } }
  else if (amtIn > 0 && outEth > outTron * 1.0001) { better = '以太坊路径参考更优（预估多 ' + ((outEth - outTron) > 1 ? (outEth - outTron).toFixed(4) : (outEth - outTron).toFixed(8)) + ' ' + ft + '）'; if (bE) { bE.textContent = '较优'; bE.style.background = 'rgba(98,126,234,0.2)'; bE.style.color = '#627eea'; } if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; } }
  else {
    if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; }
    if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; }
  }
  if (best) best.textContent = amtIn > 0 ? better : '';
}

var WW_LENDING_MARKETS = [
  { asset: 'USDT', chain: 'TRON', supplyApy: '3.8%', borrowApr: '5.2%', color: '#26a17b' },
  { asset: 'USDC', chain: 'Ethereum', supplyApy: '4.1%', borrowApr: '5.9%', color: '#2775ca' },
  { asset: 'ETH', chain: 'Ethereum', supplyApy: '2.4%', borrowApr: '3.6%', color: '#627eea' },
  { asset: 'TRX', chain: 'TRON', supplyApy: '1.9%', borrowApr: '4.0%', color: '#ff0013' }
];

function wwLendingMarketToast(el) {
  var name = el && el.getAttribute ? el.getAttribute('data-asset') : '';
  if (typeof showToast === 'function') showToast(String(name || '') + ' 市场为示意数据', 'info', 1800);
}

function wwLendingPopulate() {
  var box = document.getElementById('wwLendingMarkets');
  if (!box) return;
  box.innerHTML = WW_LENDING_MARKETS.map(function (m) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + m.asset + ' <span style="font-size:11px;color:var(--text-muted);font-weight:500">' + m.chain + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">供应 APY / 借款 APR</div></div>' +
      '<div style="text-align:right"><div style="font-size:16px;font-weight:700;color:' + m.color + '">' + m.supplyApy + ' <span style="color:var(--text-muted);font-weight:500">/</span> ' + m.borrowApr + '</div>' +
      '<button type="button" class="btn-secondary" data-asset="' + m.asset + '" style="margin-top:8px;padding:6px 12px;font-size:11px" onclick="wwLendingMarketToast(this)">详情</button></div></div>';
  }).join('');
}

function wwPerpGetPositions() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_perp_demo_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwPerpSetPositions(arr) {
  try { localStorage.setItem('ww_perp_demo_v1', JSON.stringify(arr)); } catch (e2) {}
}

function wwPerpAddDemo() {
  var side = Math.random() > 0.5 ? '多' : '空';
  var sym = ['BTC','ETH','TRX'][Math.floor(Math.random() * 3)];
  var entry = sym === 'BTC' ? 62000 + Math.random() * 2000 : sym === 'ETH' ? 3200 + Math.random() * 200 : 0.12 + Math.random() * 0.02;
  var lev = [5, 10, 20][Math.floor(Math.random() * 3)];
  var p = wwPerpGetPositions();
  p.push({ id: 'p' + Date.now(), symbol: sym, side: side, entry: entry, size: (0.01 + Math.random() * 0.2).toFixed(4), leverage: lev, uPnl: (Math.random() * 200 - 80).toFixed(2) });
  wwPerpSetPositions(p);
  wwPerpPopulate();
  if (typeof showToast === 'function') showToast('已添加示例持仓', 'success', 1600);
}

function wwPerpPopulate() {
  var list = wwPerpGetPositions();
  var host = document.getElementById('wwPerpPositions');
  var pnlEl = document.getElementById('wwPerpUnrealizedPnl');
  var cntEl = document.getElementById('wwPerpOpenCount');
  var sum = 0;
  list.forEach(function (x) { sum += parseFloat(x.uPnl) || 0; });
  if (pnlEl) {
    pnlEl.textContent = list.length ? (sum >= 0 ? '+' : '') + sum.toFixed(2) + ' USDT' : '—';
    pnlEl.style.color = sum >= 0 ? '#26a17b' : '#e5484d';
  }
  if (cntEl) cntEl.textContent = String(list.length);
  var srow = document.getElementById('wwPerpSettingsSummary');
  if (srow) srow.textContent = list.length ? (list.length + ' 笔 · PnL ' + (sum >= 0 ? '+' : '') + sum.toFixed(0)) : '无持仓';
  if (!host) return;
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">暂无持仓，可点击添加示例数据</div>';
    return;
  }
  host.innerHTML = list.map(function (p) {
    var col = parseFloat(p.uPnl) >= 0 ? '#26a17b' : '#e5484d';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:700;font-size:15px">' + p.symbol + '-PERP</span>' +
      '<span style="font-size:12px;padding:3px 8px;border-radius:8px;background:var(--bg3)">' + p.side + ' · ' + p.leverage + 'x</span></div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.7">开仓价 <b style="color:var(--text)">' + (p.entry > 20 ? p.entry.toFixed(2) : p.entry.toFixed(5)) + '</b> · 数量 ' + p.size +
      '<br/>未实现 <b style="color:' + col + '">' + (parseFloat(p.uPnl) >= 0 ? '+' : '') + p.uPnl + '</b> USDT</div></div>';
  }).join('');
}

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
  if (prem) prem.textContent = (total < 0.01 ? total.toFixed(6) : total.toFixed(2)) + ' USDT';
  if (ex) ex.textContent = '现货参考 ' + (u === 'TRX' ? S.toFixed(5) : S.toLocaleString(undefined, { maximumFractionDigits: 2 })) + ' USD · 简化波动率模型，非 Deribit / 链上期权报价。';
}

var WW_YIELD_AGG_PROTOCOLS = ['Aave V3', 'Compound V3', 'Venus'];

function wwYieldAggJitter(base) {
  var b = parseFloat(base) || 3;
  return (b + (Math.random() - 0.5) * 0.6).toFixed(2);
}

function wwYieldAggPopulate() {
  var box = document.getElementById('wwYieldAggTable');
  if (!box) return;
  var assets = [
    { sym: 'USDT', base: 4.2 },
    { sym: 'USDC', base: 4.0 },
    { sym: 'ETH', base: 2.8 },
    { sym: 'TRX', base: 1.5 }
  ];
  var rows = [];
  assets.forEach(function (a) {
    var cells = WW_YIELD_AGG_PROTOCOLS.map(function (name) {
      return '<td style="padding:8px 6px;text-align:right;font-weight:600;color:var(--gold)">' + wwYieldAggJitter(a.base) + '%</td>';
    }).join('');
    rows.push('<tr><td style="padding:8px 6px;font-weight:600;color:var(--text)">' + a.sym + '</td>' + cells + '</tr>');
  });
  box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden"><thead><tr><th style="text-align:left;padding:10px 8px;color:var(--text-muted)">资产</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Aave</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Compound</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Venus</th></tr></thead><tbody>' + rows.join('') + '</tbody></table><p style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.5">供应 APY 为本地随机抖动示例，真实利率以各协议前端为准。</p>';
}

function wwYieldAggRefreshDemo() {
  wwYieldAggPopulate();
  if (typeof showToast === 'function') showToast('已刷新示例 APY', 'info', 1600);
}

function wwLiquidationGetThreshold() {
  var v = parseFloat((document.getElementById('wwLiqThreshold') || {}).value);
  if (!isFinite(v) || v <= 0) return 130;
  return v;
}

function wwLiquidationSaveThreshold() {
  try {
    localStorage.setItem('ww_liq_threshold', String(wwLiquidationGetThreshold()));
    var n = document.getElementById('wwLiqNotify');
    localStorage.setItem('ww_liq_notify', n && n.checked ? '1' : '0');
  } catch (e) {}
  wwLiquidationPopulate();
}

function wwLiquidationLoad() {
  try {
    var t = localStorage.getItem('ww_liq_threshold');
    var el = document.getElementById('wwLiqThreshold');
    if (el && t) el.value = t;
    var n = document.getElementById('wwLiqNotify');
    if (n) n.checked = localStorage.getItem('ww_liq_notify') === '1';
  } catch (e2) {}
}

function wwLiquidationDemoPositions() {
  return [
    { id: '1', asset: 'ETH', collateralUsd: 5000, debtUsd: 2800, ratio: 178 },
    { id: '2', asset: 'TRX', collateralUsd: 1200, debtUsd: 950, ratio: 126 }
  ];
}

function wwLiquidationScanDemo() {
  wwLiquidationPopulate();
  if (typeof showToast === 'function') showToast('已根据示例仓位检查抵押率', 'success', 2000);
}

function wwLiquidationMaybeNotify(ratio, threshold) {
  if (ratio >= threshold) return;
  try {
    if (localStorage.getItem('ww_liq_notify') !== '1') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('WorldToken · 清算预警', { body: '抵押率 ' + ratio.toFixed(1) + '% 低于阈值 ' + threshold + '%（示意）' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch (e) {}
}

function wwLiquidationPopulate() {
  wwLiquidationLoad();
  var th = wwLiquidationGetThreshold();
  var hint = document.getElementById('wwLiqSettingsHint');
  if (hint) hint.textContent = '阈值 ' + th + '%';
  var list = document.getElementById('wwLiquidationList');
  if (!list) return;
  var pos = wwLiquidationDemoPositions();
  var html = pos.map(function (p) {
    var danger = p.ratio < th;
    if (danger) wwLiquidationMaybeNotify(p.ratio, th);
    var bg = danger ? 'rgba(229,72,77,0.12)' : 'var(--bg2)';
    var bor = danger ? '1px solid rgba(229,72,77,0.45)' : '1px solid var(--border)';
    return '<div style="background:' + bg + ';border:' + bor + ';border-radius:14px;padding:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div><div style="font-weight:700;color:var(--text)">' + p.asset + ' 抵押</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">债务约 $' + p.debtUsd + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">抵押率</div><div style="font-size:18px;font-weight:800;color:' + (danger ? '#e5484d' : '#26a17b') + '">' + p.ratio + '%</div></div></div>';
  }).join('');
  list.innerHTML = html || '<div style="color:var(--text-muted);font-size:13px">暂无演示仓位</div>';
}

var WW_LAUNCHPAD_PROJECTS = [
  { name: 'DemoLayer', chain: 'ETH', date: '2026-04-18', allocation: '500 USDT', status: '即将开始' },
  { name: 'TronBoost', chain: 'TRON', date: '2026-04-22', allocation: '2,000 TRX', status: '白名单' },
  { name: 'MetaVault', chain: 'BSC', date: '2026-05-01', allocation: 'TBD', status: '筹备中' }
];

function wwLaunchpadIntentDemo() {
  if (typeof showToast === 'function') showToast('演示：未连接链上申购', 'info', 2000);
}

function wwLaunchpadPopulate() {
  var box = document.getElementById('wwLaunchpadList');
  if (!box) return;
  box.innerHTML = WW_LAUNCHPAD_PROJECTS.map(function (p) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + p.name + '</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + p.chain + ' · ' + p.date + '</div></div>' +
      '<span style="font-size:11px;padding:4px 8px;border-radius:8px;background:rgba(200,168,75,0.15);color:var(--gold)">' + p.status + '</span></div>' +
      '<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">意向额度：<b style="color:var(--text)">' + p.allocation + '</b></div>' +
      '<button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:10px;font-size:13px" onclick="wwLaunchpadIntentDemo()">登记意向（示意）</button></div>';
  }).join('');
}

var WW_SOCIAL_LEADERBOARD_DEMO = [
  { addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', label: 'AlphaVault', roi: 42.3, win: 68 },
  { addr: 'TXYZopYRdj2D9XRtbG411XZZ3kMfsVk8Q6', label: 'TronWhale', roi: 28.1, win: 55 },
  { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', roi: 19.4, win: 52 }
];

function wwSocialLeaderboardCopyAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardCopy(r.addr);
}

function wwSocialLeaderboardFillTransferAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardFillTransfer(r.addr);
}

function wwSocialLeaderboardCopy(addr) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr);
    else {
      var ta = document.createElement('textarea');
      ta.value = addr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (typeof showToast === 'function') showToast('已复制地址', 'success', 1600);
  } catch (e) {}
}

function wwSocialLeaderboardFillTransfer(addr) {
  try {
    localStorage.setItem('ww_prefill_transfer_to', addr);
    goTo('page-transfer');
    setTimeout(function () {
      var el = document.getElementById('transferTo') || document.querySelector('[id*="transfer"][id*="To"]');
      if (el) { el.value = addr; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 120);
  } catch (e2) {
    goTo('page-transfer');
  }
}

function wwSocialLeaderboardPopulate() {
  var box = document.getElementById('wwSocialLeaderboardList');
  if (!box) return;
  box.innerHTML = WW_SOCIAL_LEADERBOARD_DEMO.map(function (r, i) {
    var short = r.addr.length > 18 ? r.addr.slice(0, 10) + '…' + r.addr.slice(-8) : r.addr;
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-size:12px;color:var(--text-muted)">#' + (i + 1) + ' · ' + r.label + '</div>' +
      '<div style="font-weight:700;margin-top:4px;color:var(--text)">' + short + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">模拟 ROI</div>' +
      '<div style="font-size:18px;font-weight:800;color:#26a17b">+' + r.roi.toFixed(1) + '%</div>' +
      '<div style="font-size:11px;color:var(--text-muted)">胜率 ' + r.win + '%</div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardCopyAt(' + i + ')">复制地址</button>' +
      '<button type="button" class="btn-primary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardFillTransferAt(' + i + ')">填入转账</button></div></div>';
  }).join('');
}

function wwAutoRebalanceSave() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    localStorage.setItem('ww_autorebal_enable', en && en.checked ? '1' : '0');
    if (th) localStorage.setItem('ww_autorebal_threshold', String(parseInt(th.value, 10) || 8));
  } catch (e) {}
  var hint = document.getElementById('wwAutoRebalSettingsHint');
  if (hint) {
    try {
      hint.textContent = localStorage.getItem('ww_autorebal_enable') === '1' ? '已启用' : '关闭';
    } catch (e2) { hint.textContent = '—'; }
  }
}

function wwAutoRebalanceLoad() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    if (en) en.checked = localStorage.getItem('ww_autorebal_enable') === '1';
    if (th) {
      var t = parseInt(localStorage.getItem('ww_autorebal_threshold') || '8', 10);
      if (isFinite(t) && t > 0) th.value = String(t);
    }
  } catch (e) {}
}

function wwAutoRebalancePortfolioParts() {
  var u = parseFloat((document.getElementById('valUsdt') || {}).textContent.replace(/[^0-9.\-]/g, '')) || 0;
  var total = u;
  if (total <= 0) return { total: 0, parts: [{ k: 'USDT', p: 0 }] };
  return {
    total: total,
    parts: [
      { k: 'USDT', p: 100 }
    ]
  };
}

function wwAutoRebalancePopulate() {
  wwAutoRebalanceLoad();
  var body = document.getElementById('wwAutoRebalanceBody');
  if (!body) return;
  var th = parseInt((document.getElementById('wwAutoRebalThreshold') || {}).value || '8', 10);
  if (!isFinite(th) || th < 1) th = 8;
  var target = { USDT: 100 };
  var data = wwAutoRebalancePortfolioParts();
  if (!data.total) {
    body.innerHTML = '<div style="color:var(--text-muted);font-size:13px">暂无估值数据，请返回首页刷新余额后再试。</div>';
    return;
  }
  var rows = data.parts.map(function (x) {
    var tgt = target[x.k] || 25;
    var drift = x.p - tgt;
    var hit = Math.abs(drift) >= th;
    return { k: x.k, p: x.p, tgt: tgt, drift: drift, hit: hit };
  });
  var any = rows.some(function (r) { return r.hit; });
  body.innerHTML = rows.map(function (r) {
    var col = r.hit ? '#e5484d' : 'var(--text-muted)';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<span style="font-weight:700;color:var(--text)">' + r.k + '</span>' +
      '<span style="font-size:12px;color:var(--text-muted)">当前 ' + r.p.toFixed(1) + '% · 目标 ' + r.tgt + '%</span></div>' +
      '<div style="margin-top:6px;font-size:13px;color:' + col + '">偏离 ' + (r.drift >= 0 ? '+' : '') + r.drift.toFixed(1) + ' 百分点' + (r.hit ? '（超过阈值）' : '') + '</div></div>';
  }).join('') + (any && localStorage.getItem('ww_autorebal_enable') === '1'
    ? '<div style="background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.35);border-radius:12px;padding:12px;font-size:12px;color:var(--text)">建议：通过转账或兑换向<b>权重不足</b>的资产倾斜；本应用不代您执行交易。</div>'
    : '<div style="font-size:12px;color:var(--text-muted)">提示：可在设置中开启「偏离提醒」。</div>');
}

function wwSentimentHash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function wwSentimentPopulate() {
  var box = document.getElementById('wwSentimentList');
  if (!box) return;
  var coins = ['USDT'];
  var els = ['chgUsdt'];
  var out = [];
  for (var i = 0; i < coins.length; i++) {
    var ch = (document.getElementById(els[i]) || {}).textContent || '';
    var m = ch.match(/[\-+]?[0-9]+(?:\.[0-9]+)?/);
    var px = m ? parseFloat(m[0]) : 0;
    var h = wwSentimentHash(coins[i] + String(px));
    var score = Math.max(-100, Math.min(100, Math.round(px * 12 + (h % 17) - 8)));
    var lab = score >= 20 ? '偏多' : (score <= -20 ? '偏空' : '中性');
    var bg = score >= 20 ? 'rgba(38,161,123,0.12)' : (score <= -20 ? 'rgba(229,72,77,0.12)' : 'var(--bg2)');
    out.push('<div style="background:' + bg + ';border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:800;font-size:16px;color:var(--text)">' + coins[i] + '</div>' +
      '<span style="font-size:12px;padding:4px 10px;border-radius:999px;background:var(--bg3);color:var(--text-muted)">' + lab + '</span></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;height:8px;border-radius:8px;background:var(--bg3);overflow:hidden">' +
      '<div style="height:100%;width:' + (50 + score / 2) + '%;background:linear-gradient(90deg,#e5484d,#c8a84b,#26a17b);border-radius:8px"></div></div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--gold);min-width:52px;text-align:right">' + score + '</div></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">与首页涨跌幅示意联动 · 非新闻 NLP</div></div>');
  }
  box.innerHTML = out.join('');
}

function wwOnchainMessagingPopulate() {
  var el = document.getElementById('wwOnchainMsgPreview');
  if (el) el.textContent = '';
}

async function wwOnchainMsgEncrypt() {
  var msg = (document.getElementById('wwOnchainMsgInput') || {}).value || '';
  var pass = (document.getElementById('wwOnchainMsgPass') || {}).value || '';
  if (!String(msg).trim()) { if (typeof showToast === 'function') showToast('请输入消息内容', 'warning'); return; }
  if (!pass || String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位加密密码', 'warning'); return; }
  var enc = new TextEncoder();
  var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  try {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 80000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var plain = JSON.stringify({ v: 1, kind: 'ww_onchain_msg', t: Date.now(), text: String(msg) });
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plain));
    var outObj = { v: 1, kind: 'ww_onchain_msg', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var prev = document.getElementById('wwOnchainMsgPreview');
    if (prev) prev.textContent = txt.slice(0, 480) + (txt.length > 480 ? '…' : '');
    try { localStorage.setItem('ww_onchain_msg_prefill', txt); } catch (e) {}
    if (typeof showToast === 'function') showToast('已加密，可复制或前往转账页粘贴到备注', 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast('加密失败', 'error');
  }
}

function wwOnchainMsgCopy() {
  try {
    var b64 = localStorage.getItem('ww_onchain_msg_prefill') || '';
    if (!b64) { if (typeof showToast === 'function') showToast('请先生成加密载荷', 'warning'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b64);
    else { var ta = document.createElement('textarea'); ta.value = b64; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    if (typeof showToast === 'function') showToast('已复制密文', 'success');
  } catch (e) {}
}

function wwOnchainMsgGoTransfer() {
  try { goTo('page-transfer'); } catch (e) {}
}

async function wwBackupQrGenerate() {
  var p = (document.getElementById('wwBackupQrPass') || {}).value || '';
  if (!p || String(p).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位导出密码', 'warning'); return; }
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      kind: 'ww_qr_backup',
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(p), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var outObj = { v: 1, kind: 'ww_qr_backup', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var canvas = document.getElementById('wwBackupQrCanvas');
    await loadQRCodeLib();
    if (canvas && typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      await QRCode.toCanvas(canvas, txt, { width: 200, margin: 1, color: { dark: '#0a0a12ff', light: '#ffffffff' } });
      if (typeof showToast === 'function') showToast('已生成加密备份二维码（请妥善保管）', 'success');
    } else if (typeof showToast === 'function') showToast('二维码库加载失败', 'error');
  } catch (e) {
    if (typeof showToast === 'function') showToast('生成失败', 'error');
  }
}

function wwGaslessPopulate() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    if (cb) cb.checked = localStorage.getItem('ww_gasless_meta') === '1';
    if (rel) rel.value = localStorage.getItem('ww_gasless_relay') || '';
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) { hint.textContent = '—'; }
  }
}

function wwGaslessSave() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    localStorage.setItem('ww_gasless_meta', cb && cb.checked ? '1' : '0');
    if (rel) localStorage.setItem('ww_gasless_relay', String(rel.value || '').trim().slice(0, 200));
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) {}
  }
  if (typeof showToast === 'function') showToast('已保存免 Gas 偏好（示意）', 'success');
}

function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}

function wwRecoveryTestSubmit() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) {
    if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'error');
    return;
  }
  var raw = (document.getElementById('recoveryTestInput') || {}).value || '';
  if (!String(raw).trim()) {
    if (typeof showToast === 'function') showToast('请输入助记词', 'error');
    return;
  }
  var lang = typeof currentLang !== 'undefined' ? currentLang : 'en';
  var enStr = raw.trim();
  try {
    if (typeof mnemonicFromLang === 'function') enStr = mnemonicFromLang(raw.trim(), lang);
  } catch (e1) {}
  var words = enStr.trim().split(/\s+/);
  if (![12, 15, 18, 21, 24].includes(words.length)) {
    if (typeof showToast === 'function') showToast('词数应为 12/15/18/21/24', 'error');
    return;
  }
  try {
    var w = ethers.Wallet.fromMnemonic(enStr.trim());
    var match = REAL_WALLET.ethAddress && w.address && w.address.toLowerCase() === String(REAL_WALLET.ethAddress).toLowerCase();
    if (match) {
      if (typeof showToast === 'function') showToast('验证通过：助记词与当前钱包一致', 'success');
    } else {
      if (typeof showToast === 'function') showToast('与当前钱包不一致或助记词无效', 'error');
    }
  } catch (e2) {
    if (typeof showToast === 'function') showToast('助记词无效或无法解析', 'error');
  }
}

function drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd) {
  const card = document.getElementById('wwPortfolioPieCard');
  const c = document.getElementById('portfolioPieCanvas');
  const leg = document.getElementById('portfolioPieLegend');
  if(!card || !c || !leg) return;
  void trxUsd; void ethUsd; void btcUsd;
  const parts = [
    { v: Number(usdtUsd) || 0, c: '#26a17b', l: 'USDT' },
  ];
  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  try { window._wwLastPortfolioParts = parts; window._wwLastPortfolioTotal = total; } catch (_wp) {}
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch(_y0) {} return; }
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
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) {}
  try { if (typeof updateYieldFarmTracker === 'function') updateYieldFarmTracker(parts, total); } catch (_yf) {}
}
function getNetworkFeeEstimateLines(coinId) {
  const sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
  const usdtMap = {
    slow: { line: '≈ 6–8 TRX · 能量上限（经济档）', sub: '确认较慢，费用较低' },
    normal: { line: '≈ 8.5 TRX · 合约能量（示意）', sub: '约 30 秒内确认' },
    fast: { line: '≈ 12–18 TRX · 能量上限（快速档）', sub: '优先确认' }
  };
  const trxMap = {
    slow: { line: '≈ 0.8 TRX · 带宽（经济档）', sub: '约 1–2 分钟' },
    normal: { line: '≈ 1.0 TRX · 带宽消耗（示意）', sub: '约 1 分钟内确认' },
    fast: { line: '≈ 1.2 TRX · 带宽（快速档）', sub: '约 20–40 秒' }
  };
  const ethG = { slow: '~26–30 Gwei', normal: '~35 Gwei', fast: '~42–50 Gwei' };
  const ethT = { slow: '约 5–15 分钟', normal: '约 2–5 分钟', fast: '约 30–90 秒' };
  const ethMap = {
    slow: { line: '≈ 0.0010 ETH · Gas ' + ethG.slow + '（示意）', sub: ethT.slow },
    normal: { line: '≈ 0.0012 ETH · Gas ' + ethG.normal + '（示意）', sub: ethT.normal },
    fast: { line: '≈ 0.0015 ETH · Gas ' + ethG.fast + '（示意）', sub: ethT.fast }
  };
  const btcMap = {
    slow: { line: '≈ 低费率档 sat/vB（示意）', sub: '约 40–90 分钟' },
    normal: { line: '≈ 1.2k sat/vB · 费率档（示意）', sub: '约 20–60 分钟' },
    fast: { line: '≈ 高费率档 sat/vB（示意）', sub: '约 10–30 分钟' }
  };
  if(coinId === 'trx') return trxMap[sp] || trxMap.normal;
  if(coinId === 'eth') return ethMap[sp] || ethMap.normal;
  if(coinId === 'btc') return btcMap[sp] || btcMap.normal;
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
function updateTransferAddrBook() {
  const box = document.getElementById('transferAddrBook');
  const ta = document.getElementById('transferAddr');
  if(!box || !ta) return;
  const q = ta.value.trim().toLowerCase();
  if(!q.length) {
    box.innerHTML = '';
    box.style.display = 'none';
    return;
  }
  const contacts = getTransferContacts();
  const recent = getRecentTransferAddrs();
  const contactSet = new Set(contacts.map(c => c.addr.trim().toLowerCase()));
  const matchedContacts = contacts.filter(c => {
    const al = c.addr.toLowerCase();
    const nl = (c.nick || '').toLowerCase();
    return al.includes(q) || nl.includes(q);
  });
  const matchedRecent = recent.filter(a => {
    const al = a.toLowerCase();
    return !contactSet.has(al) && al.includes(q);
  });
  if(!matchedContacts.length && !matchedRecent.length) {
    box.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'transfer-addr-dd-empty';
    empty.textContent = (contacts.length || recent.length) ? '暂无匹配地址' : '暂无历史地址与联系人';
    box.appendChild(empty);
    box.style.display = 'block';
    return;
  }
  box.innerHTML = '';
  const appendHdr = function(lbl) {
    const h = document.createElement('div');
    h.className = 'transfer-addr-dd-hdr';
    h.textContent = lbl;
    box.appendChild(h);
  };
  const addContactItems = function(list) {
    list.forEach(function(item) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item';
      const span = document.createElement('span');
      span.className = 'contact-nick-mark';
      span.textContent = item.nick + ' · ';
      div.appendChild(span);
      div.appendChild(document.createTextNode(addrBookShort(item.addr)));
      div.title = item.addr;
      div.onmousedown = function(e) { e.preventDefault(); pickTransferAddrFromBookRaw(item.addr); };
      box.appendChild(div);
    });
  };
  const addRecentItems = function(list) {
    list.forEach(function(addr) {
      const div = document.createElement('div');
      div.className = 'transfer-addr-dd-item recent-item';
      const ico = document.createElement('span');
      ico.className = 'recent-ico';
      ico.textContent = '\u231b ';
      div.appendChild(ico);
      div.appendChild(document.createTextNode(addr));
      div.title = '\u6700\u8fd1\u8f6c\u8d26: ' + addr;
      div.onmousedown = function(e) { e.preventDefault(); pickTransferAddrFromBookRaw(addr); };
      box.appendChild(div);
    });
  };
  if(matchedContacts.length) {
    appendHdr('\u8054\u7cfb\u4eba');
    addContactItems(matchedContacts.slice(0, 12));
  }
  if(matchedRecent.length) {
    appendHdr('\u6700\u8fd1\u8f6c\u8d26');
    addRecentItems(matchedRecent.slice(0, 12));
  }
  box.style.display = 'block';
}
function shakeTransferAmountTooHigh() {
  const el = document.getElementById('transferAmountBox');
  if(!el) return;
  el.classList.remove('wt-transfer-shake');
  void el.offsetWidth;
  el.classList.add('wt-transfer-shake');
}
function pinUnlockBackspace() {
  const inp = document.getElementById('pinUnlockInput');
  if(!inp) return;
  inp.value = (inp.value || '').slice(0, -1);
  try { inp.focus(); } catch(e) {}
}
function pinUnlockClear() {
  const inp = document.getElementById('pinUnlockInput');
  if(!inp) return;
  inp.value = '';
  const err = document.getElementById('pinUnlockError');
  if(err) err.style.display = 'none';
  try { inp.focus(); } catch(e) {}
}



function detectAddrType() {
  const ta = document.getElementById('transferAddr');
  const addr = ta ? String(ta.value || '').trim() : '';
  const tag = document.getElementById('addrTypeTag');
  const box = document.getElementById('transferAddrBox');
  const btn = document.getElementById('transferBtn');

  // wallet.html 精简转账页无 addrTypeTag 等节点：仅更新边框并走 calcTransferFee
  if (!tag) {
    if (!addr) {
      if (box) box.style.borderColor = 'var(--border)';
      if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; }
    } else if (box) {
      box.style.borderColor = 'rgba(200,168,75,0.4)';
    }
    calcTransferFee();
    return;
  }

  const icon = document.getElementById('addrTypeIcon');
  const name = document.getElementById('addrTypeName');
  const recipient = document.getElementById('recipientCard');

  if (!addr) {
    tag.style.display = 'none';
    if (recipient) recipient.style.display = 'none';
    if (box) box.style.borderColor = 'var(--border)';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; }
    calcTransferFee();
    return;
  }

  let type = '', chainName = '', isWorldToken = false;
  if (addr.includes('·') || addr.length < 30) {
    type = '🌍'; chainName = 'WorldToken 万语地址'; isWorldToken = true;
  } else if (addr.startsWith('T') && addr.length >= 34) {
    type = '🔴'; chainName = 'TRX · Tron 链';
  } else if (addr.startsWith('0x') && addr.length >= 42) {
    type = '🔷'; chainName = 'ETH · Ethereum 链';
  } else if (addr.startsWith('bc1') || addr.startsWith('1') || addr.startsWith('3')) {
    type = '🟠'; chainName = 'BTC · Bitcoin 链';
  } else {
    type = '❓'; chainName = '未识别地址格式';
  }

  tag.style.display = 'block';
  if (icon) icon.textContent = type + ' ';
  if (name) name.textContent = chainName;
  if (box) box.style.borderColor = 'rgba(200,168,75,0.4)';

  if (isWorldToken && addr.includes('·')) {
    const parts = addr.split('·');
    const rn = document.getElementById('recipientName');
    const ra = document.getElementById('recipientAddr');
    if (rn) rn.textContent = parts[0].trim();
    if (ra) ra.textContent = (parts[1] && parts[2] ? (parts[1].trim() + ' · ' + parts[2].trim()) : '') || 'WorldToken 用户';
    if (recipient) recipient.style.display = 'block';
  } else if (recipient) {
    recipient.style.display = 'none';
  }

  calcTransferFee();
}

function checkTransferReady() {
  const addrEl = document.getElementById('transferAddr');
  const amtEl = document.getElementById('transferAmount');
  const addr = addrEl ? addrEl.value.trim() : '';
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const btn = document.getElementById('transferBtn');
  const feeRow = document.getElementById('transferFeeRow');
  const bal = Number(transferCoin.bal) || 0;
  const over = amt > bal + 1e-10;
  if (feeRow) {
    if (addr || amt > 0) feeRow.style.display = 'block';
    else feeRow.style.display = 'none';
  }
  const offline = (typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false);
  if (!btn) return;
  if (offline) {
    btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed';
    return;
  }
  if (addr && amt > 0 && !over) {
    btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed';
  }
}

function calcTransferFee() {
  try {
    var uc = typeof COINS !== 'undefined' && COINS.find && COINS.find(function (c) { return c && c.id === transferCoin.id; });
    if (uc) { transferCoin.bal = uc.bal; transferCoin.price = uc.price; }
  } catch (_e) {}
  const amtEl = document.getElementById('transferAmount');
  const amt = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
  const coinData = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function (c) { return c.id === transferCoin.id; }) : null;
  const price = (coinData && coinData.price) || transferCoin.price || 1;
  const nf = getNetworkFeeEstimateLines(transferCoin.id);
  const hintEl = document.getElementById('transferFeeHint');
  const netEl = document.getElementById('transferNetworkFee');
  const gasLineEl = document.getElementById('transferGasFeeLine');
  if (netEl) netEl.textContent = nf.line + ' · ' + nf.sub;
  if (gasLineEl) gasLineEl.textContent = nf.line + ' · ' + nf.sub;
  const balEl = document.getElementById('transferBal');
  if (balEl) {
    var b = Number(transferCoin.bal) || 0;
    balEl.textContent = (isFinite(b) ? b : 0).toLocaleString(undefined, { maximumFractionDigits: 8 });
  }
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
    if (hintEl) hintEl.textContent = nf.line + ' · ' + nf.sub + ' · TRC-20 需能量/带宽';
  } else {
    const feeNum = amt * 0.003;
    const fee = feeNum.toFixed(4);
    const actual = (amt - feeNum).toFixed(4);
    if (feeEl) feeEl.textContent = fee + ' ' + transferCoin.name;
    if (actEl) actEl.textContent = actual + ' ' + transferCoin.name;
    if (usdEl) usdEl.textContent = '$' + (amt * price).toFixed(2);
    if (cnyEl) cnyEl.textContent = (amt * price * usdToCny).toFixed(2);
    if (hintEl) {
      hintEl.textContent = '约 ' + fee + ' ' + transferCoin.name + ' 费 · 到账约 ' + actual + ' ' + transferCoin.name + ' · ' + nf.sub;
    }
  }
  const _spd = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  if (chainEl) chainEl.textContent = transferCoin.chain + ' · ' + (typeof transferSpeedHint === 'function' ? transferSpeedHint(transferCoin.id, _spd) : '约30秒');
  const bal = Number(transferCoin.bal) || 0;
  if (amt > bal + 1e-10) shakeTransferAmountTooHigh();
  checkTransferReady();
  try { if (typeof wwUpdateTxSimulation === 'function') wwUpdateTxSimulation(); } catch (_ws) {}
}

function wwMevToggleInit() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  c.checked = (localStorage.getItem('ww_mev_private') === '1');
}

function wwMevSave() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  localStorage.setItem('ww_mev_private', c.checked ? '1' : '0');
  try { if(typeof wwUpdateTxSimulation==='function') wwUpdateTxSimulation(); } catch(e) {}
  if(typeof showToast==='function') showToast(c.checked ? '已开启 MEV 保护（示意）' : '已使用公开内存池（示意）', 'info', 2200);
}

function wwGasSaveTargets() {
  var a = document.getElementById('wwGasTrxTarget');
  var b = document.getElementById('wwGasEthTarget');
  if(a && a.value != null) localStorage.setItem('ww_gas_target_trx', String(a.value).trim());
  if(b && b.value != null) localStorage.setItem('ww_gas_target_eth', String(b.value).trim());
  try { wwGasManagerRender(); } catch(e) {}
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
      ? '✓ Gas 代币储备相对目标充足（示意）。'
      : '⚠ 建议保留更多 TRX/ETH 以应对拥堵与合约交互（示意）。 TRX: ' + bt.toFixed(2) + ' / 目标 ' + tt + ' · ETH: ' + be.toFixed(4) + ' / 目标 ' + et;
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
  lines.push('预估网络费: ' + nf.line + (nf.sub ? ' · ' + nf.sub : ''));
  lines.push('MEV 路由: ' + (mev ? '私有中继（示意）' : '公开内存池'));
  lines.push('风险: 请再次核对地址与金额；本预览不保证与链上结果一致。');
  host.textContent = lines.join('\n');
}

function setTransferMax() {
  document.getElementById('transferAmount').value = transferCoin.bal;
  calcTransferFee();
}

function selectTransferCoin(id) {
  // 从 COINS 读取实时余额和价格
  const coinData = COINS.find(c=>c.id===id);
  const map = {
    usdt:{id:'usdt',name:'USDT',chain:'TRC-20 · Tron',icon:'💚',bal:coinData&&coinData.id==='usdt'?coinData.bal:0,price:coinData&&coinData.id==='usdt'?coinData.price:1},
    trx:{id:'trx',name:'TRX',chain:'Tron',icon:'🔴',bal:coinData&&coinData.id==='trx'?coinData.bal:0,price:coinData&&coinData.id==='trx'?coinData.price:0.12},
    eth:{id:'eth',name:'ETH',chain:'Ethereum',icon:'🔷',bal:coinData&&coinData.id==='eth'?coinData.bal:0,price:coinData&&coinData.id==='eth'?coinData.price:2500},
    btc:{id:'btc',name:'BTC',chain:'Bitcoin',icon:'🟠',bal:coinData&&coinData.id==='btc'?coinData.bal:0,price:coinData&&coinData.id==='btc'?coinData.price:60000},
  };
  transferCoin = COINS.find(c=>c.id===id) || map[id] || map.usdt;
  document.getElementById('transferCoinIcon').textContent = transferCoin.icon;
  document.getElementById('transferCoinName').textContent = transferCoin.name;
  document.getElementById('transferBal').textContent = transferCoin.bal.toLocaleString();
  closeTransferCoinPicker();
  calcTransferFee();
}

function openTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.add('show'); }
function closeTransferCoinPicker() { _safeEl('transferCoinOverlay').classList.remove('show'); }

async function doTransfer() {
  const addr = document.getElementById('transferAddr').value.trim();
  const amt = document.getElementById('transferAmount').value;
  if(!addr) { showToast('❌ 请输入接收地址', 'error'); return; }
  if(!amt || parseFloat(amt) <= 0) { showToast('❌ 请输入有效金额', 'error'); return; }
  const amtNum = parseFloat(amt) || 0;
  const bal = Number(transferCoin.bal) || 0;
  if(amtNum > bal + 1e-10) { showToast('❌ 金额超过可用余额', 'error'); shakeTransferAmountTooHigh(); return; }
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  if (typeof wwSpendGateBeforeConfirm === 'function') {
    var _g = await wwSpendGateBeforeConfirm(amtNum);
    if (_g === false) return;
  }
  const fee = (amtNum*0.003).toFixed(2);
  const actual = (amtNum - amtNum*0.003).toFixed(2);
  document.getElementById('confirmAmount').textContent = amt+' '+transferCoin.name;
  document.getElementById('confirmRecipient').textContent = addr.length>20 ? addr.slice(0,20)+'...' : addr;
  document.getElementById('confirmFee').textContent = fee+' '+transferCoin.name;
  document.getElementById('confirmActual').textContent = actual+' '+transferCoin.name;
  document.getElementById('confirmChain').textContent = transferCoin.chain;
  _safeEl('transferConfirmOverlay').classList.add('show');
}

function closeTransferConfirm() { _safeEl('transferConfirmOverlay').classList.remove('show'); }

function confirmTransfer() {
  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，无法完成转账', 'warning');
    return;
  }
  closeTransferConfirm();
  // 填充成功页数据
  const amt = document.getElementById('transferAmount').value;
  const addr = document.getElementById('transferAddr').value.trim();
  saveRecentTransferAddr(addr);
  const amtF = parseFloat(amt)||0;
  const fee = (amtF*0.003).toFixed(2);
  const a = ADDR_SAMPLES[currentLang]||ADDR_SAMPLES.zh;
  const isEn = currentLang==='en';
  const info = LANG_INFO[currentLang]||{flag:'🇨🇳',name:'中文'};
  const g = getGiftCulture ? getGiftCulture() : {icon:'🌍'};

  // 发件人（我的地址）
  _safeEl('successAmount').textContent = amt;
  _safeEl('successCoin').textContent = transferCoin.name;
  (_safeEl('successCultureIcon') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successCultureIcon fallback */.textContent = g.icon;
  // 发件人 = 我自己的地址
  if(isEn) {
    _safeEl('successFromPart1').textContent = 'My Wallet';
    _safeEl('successFromPart2').textContent = '';
    document.getElementById('successFromPart3').textContent = '';
    _safeEl('successFromLang').textContent = info.flag+' English · BIP39';
  } else {
    const parts = a.main.split(' · ');
    _safeEl('successFromPart1').textContent = parts[0]||'龙凤虎';
    _safeEl('successFromPart2').textContent = parts[1]||'举头望明月';
    document.getElementById('successFromPart3').textContent = a.num||'3829461';
    const fromAddr = getNativeAddr(); _safeEl('successFromLang').textContent = fromAddr.substring(0,12)+'...';
  }

  // 收件人 = 输入的对方地址（不同！）
  const isWW = addr.includes('·');
  if(isWW) {
    // WorldToken母语地址，拆解显示
    const parts2 = addr.split('·').map(s=>s.trim());
    _safeEl('successToIcon').textContent = '🌍';
    _safeEl('successToName').textContent = parts2[0]||addr;
    _safeEl('successToAddr').textContent = (parts2[1]||'')+' · '+(parts2[2]||'') + ' · WorldToken';
  } else {
    // 公链地址
    const chainIcon = addr.startsWith('T')?'🔴':addr.startsWith('0x')?'🔷':addr.startsWith('bc')?'🟠':'⛓️';
    _safeEl('successToIcon').textContent = chainIcon;
    _safeEl('successToName').textContent = addr.slice(0,18)+'...'+addr.slice(-6);
    _safeEl('successToAddr').textContent = transferCoin.chain;
  }

  // 详情
  _safeEl('successFee') && ((_safeEl('successFee') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successFee fallback */.textContent = fee+' '+transferCoin.name);
  const sfi=(_safeEl('successFeeInline') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successFeeInline fallback */; if(sfi) sfi.textContent='手续费 '+fee+' '+transferCoin.name+' · '+transferCoin.chain;
  _safeEl('successChain').textContent = transferCoin.chain;
  const nt = new Date();
  const ts = nt.getFullYear()+'.'+String(nt.getMonth()+1).padStart(2,'0')+'.'+String(nt.getDate()).padStart(2,'0')+' '+String(nt.getHours()).padStart(2,'0')+':'+String(nt.getMinutes()).padStart(2,'0');
  const st=_safeEl('successTime2'); if(st) st.textContent=ts;

  // 先填充动画页数据
  const sw1=_safeEl('swooshToName'); if(sw1) sw1.textContent=_safeEl('successToName')?.textContent||'';
  const sw2=_safeEl('swooshToAddr'); if(sw2) sw2.textContent=_safeEl('successToAddr')?.textContent||'';
  const sw3=_safeEl('swooshAmtVal'); if(sw3) sw3.textContent=amt;
  const sw4=_safeEl('swooshCoinName'); if(sw4) sw4.textContent=transferCoin.name;
  const sf1=_safeEl('swooshFromPart1'); if(sf1) sf1.textContent=_safeEl('successFromPart1')?.textContent||'';
  const sf2=_safeEl('swooshFromPart2'); if(sf2) sf2.textContent=_safeEl('successFromPart2')?.textContent||'';
  const sfl=_safeEl('swooshFromLang'); if(sfl) sfl.textContent=_safeEl('successFromLang')?.textContent||'';

  // 尝试真实广播
  const sendBtn = document.getElementById('confirmSendBtn');
  if(sendBtn) { sendBtn.disabled=true; sendBtn.textContent='⏳ 广播中...'; }

  broadcastRealTransfer().then(ok => {
    if(sendBtn) { sendBtn.disabled=false; sendBtn.textContent='✅ 确认转账'; }
    if(ok) {
      goTo('page-swoosh'); // 广播成功，显示成功动画
    } else {
      showToast('⚠️ 转账广播失败，请检查余额和网络', 'warning');
    }
  }).catch(err => {
    if(sendBtn) { sendBtn.disabled=false; sendBtn.textContent='✅ 确认转账'; }
    showToast('❌ 转账失败：' + (err?.message || '网络错误'), 'error');
  });

  // 启动嗖动画
  setTimeout(() => {
    const coin = document.getElementById('swooshCoin');
    const trail = document.getElementById('swooshTrail');
    const receiver = document.getElementById('swooshReceiver');
    const check = document.getElementById('swooshCheck');
    if(coin) coin.classList.add('swoosh-coin');
    if(trail) trail.classList.add('swoosh-trail');
    setTimeout(()=>{ if(receiver) receiver.classList.add('receiver-glow'); if(check) { check.textContent='✓'; check.style.color='#4ac84a'; check.style.fontSize='20px'; } }, 900);
    // 动画结束后跳成功页
    setTimeout(()=>{ goTo('page-transfer-success'); setTimeout(loadBalances, 2000); }, 1800);
  }, 200);
}

function shareSuccess() {
  const amt = _safeEl('successAmount').textContent;
  const coin = _safeEl('successCoin').textContent;
  const from = _safeEl('successFromPart1').textContent+' '+_safeEl('successFromPart2').textContent;
  navigator.clipboard?.writeText('我刚通过 WorldToken 发送了 '+amt+' '+coin+'\n发款方：'+from+'\nworldtoken.cc').catch(()=>{});
  const txEl = _safeEl('successTxHash');
  const txText = txEl ? txEl.textContent : '转账记录';
  navigator.clipboard?.writeText(txText).catch(()=>{});
  const btn2 = event?.target?.closest('div');
  if(btn2) { const old2 = btn2.querySelector('div:last-child')?.textContent || ''; if(btn2.querySelector('div:last-child')) { btn2.querySelector('div:last-child').textContent='✅ 已复制'; setTimeout(()=>btn2.querySelector('div:last-child').textContent=old2,1500); } }
}

// ══ 多文化礼金系统 ══
const GIFT_CULTURE = {
  zh: { name:'礼物', icon:'🎁', color:'#cc2200', desc:'恭喜发财', festival:'春节·中秋·生日' },
  ja: { name:'お年玉', icon:'🎍', color:'#8b0000', desc:'新年おめでとう', festival:'お正月·お祝い' },
  ko: { name:'세뱃돈', icon:'🎎', color:'#9b0000', desc:'새해 복 많이 받으세요', festival:'설날·추석' },
  ar: { name:'عيدية', icon:'🌙', color:'#1a5c2e', desc:'عيد مبارك', festival:'عيد الفطر·عيد الأضحى' },
  hi: { name:'शगुन', icon:'🪔', color:'#8b4500', desc:'शुभ दीपावली', festival:'दीपावली·विवाह·जन्मदिन' },
  vi: { name:'Lì xì', icon:'🎁', color:'#cc2200', desc:'Chúc mừng năm mới', festival:'Tết·Sinh nhật' },
  id: { name:'Angpao', icon:'🎁', color:'#cc2200', desc:'Selamat & Sukses', festival:'Lebaran·Imlek' },
  ms: { name:'Ang Pao', icon:'🎁', color:'#cc2200', desc:'Gong Xi Fa Cai', festival:'Tahun Baru Cina' },
  th: { name:'ซองแดง', icon:'🎀', color:'#aa0000', desc:'สวัสดีปีใหม่', festival:'ตรุษจีน·วันเกิด' },
  ru: { name:'Подарок', icon:'🎁', color:'#1a3a8b', desc:'Поздравляем', festival:'Новый год·День рождения' },
  es: { name:'Regalo', icon:'🎁', color:'#8b6914', desc:'¡Felicidades!', festival:'Navidad·Cumpleaños' },
  fr: { name:'Cadeau', icon:'🎁', color:'#1a3a6b', desc:'Félicitations', festival:'Noël·Anniversaire' },
  pt: { name:'Presente', icon:'🎁', color:'#1a5c1a', desc:'Parabéns', festival:'Natal·Aniversário' },
  de: { name:'Geldgeschenk', icon:'🎁', color:'#1a1a5c', desc:'Herzlichen Glückwunsch', festival:'Weihnachten·Geburtstag' },
  en: { name:'Gift', icon:'🎁', color:'#1a3a8b', desc:'Congratulations', festival:'Christmas·Birthday' },
};

function getGiftCulture() {
  return GIFT_CULTURE[currentLang] || GIFT_CULTURE.zh;
}

function updateGiftUI() {
  const g = getGiftCulture();
  // 更新礼物页标题
  const title = document.getElementById('giftTitle');
  const subtitle = document.getElementById('giftSubtitle');
  const preview = document.getElementById('giftPreview');
  const icon = document.getElementById('giftIcon');
  const blessingInput = document.getElementById('hbMessage');
  const festivalTag = document.getElementById('giftFestival');
  if(title) title.textContent = g.name;
  if(subtitle) subtitle.textContent = g.festival;
  if(icon) icon.textContent = g.icon;
  if(blessingInput) blessingInput.value = g.desc;
  if(festivalTag) festivalTag.textContent = g.festival;
  if(preview) {
    preview.style.background = `linear-gradient(160deg, ${g.color}dd, ${g.color}88, ${g.color}44)`;
  }
  updateHbPreview();
}

// ══ 礼物口令系统 ══
const KW_ZH = ['举头望明月','春风得意马蹄','柳暗花明又一村','飞流直下三千尺','万紫千红总是春','轻舟已过万重山','千里江陵一日还','接天莲叶无穷碧','春色满园关不住','山重水复疑无路','白日依山尽黄河','烟花三月下扬州','孤帆远影碧空尽','不识庐山真面目','停车坐爱枫林晚','明月几时有把酒','相见时难别亦难','此情可待成追忆','衣带渐宽终不悔','山高月小水落石','但愿人长久千里','海上生明月天涯','春眠不觉晓处处','床前明月光疑是','独在异乡为异客','知否知否应是绿','天生我材必有用','长风破浪会有时','会当凌绝顶一览','青山遮不住毕竟'];
const KW_EN = ['Fortune smiles today','Golden harvest comes','Every cloud silver lining','Stars align tonight','Lucky winds blow now'];
const KW_JA = ['古池や蛙飛び込む','春の海終日のたり','菜の花や月は東に','五月雨を集めて早し','閑さや岩にしみ入る'];
const KW_AR = ['الصبر مفتاح الفرج','نور وبركة وسعادة','خير وأمل وفرحة'];
const KW_RU = ['Я помню чудное мгновенье','Белеет парус одинокой','Мороз и солнце день чудесный'];
const KW_ES = ['Quien madruga Dios le ayuda','No hay mal que por bien no venga','A buen entendedor pocas palabras'];
const KW_FR = ['La vie en rose toujours','Tout vient à point qui sait attendre','Mieux vaut tard que jamais'];

const LANG_KW = {zh:KW_ZH,en:KW_EN,ja:KW_JA,ar:KW_AR,ru:KW_RU,es:KW_ES,fr:KW_FR};

let hbExpiry = 24;
let hbType = 'normal';

const BLESSINGS = ['恭喜发财，万事如意','岁岁平安，事事顺心','吉祥如意，福气满满','财源广进，好运连连','心想事成，大吉大利'];

function getKwPool() {
  return LANG_KW[currentLang] || KW_ZH;
}

function genKeyword() {
  const pool = getKwPool();
  return pool[Math.floor(Math.random() * pool.length)];
}

function switchHbType(type) {
  hbType = type;
  const n = document.getElementById('btnNormal');
  const l = document.getElementById('btnLucky');
  if(type === 'normal') {
    n.style.background = 'linear-gradient(135deg,#b8982a,#e8c850)';
    n.style.color = '#0a0a05';
    l.style.background = 'none';
    l.style.color = 'var(--text-muted)';
  } else {
    l.style.background = 'linear-gradient(135deg,#b8982a,#e8c850)';
    l.style.color = '#0a0a05';
    n.style.background = 'none';
    n.style.color = 'var(--text-muted)';
  }
  updateHbPreview();
}

function setAmt(v) {
  document.getElementById('hbAmount').value = v;
  updateHbPreview();
}

function setExpiry(h) {
  hbExpiry = h;
  ['exp24','exp72','exp168'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) { el.style.borderColor='var(--border)'; el.style.color='var(--text-muted)'; el.style.background='var(--bg2)'; }
  });
  const active = h===24?'exp24':h===72?'exp72':'exp168';
  const el = document.getElementById(active);
  if(el) { el.style.borderColor='rgba(200,168,75,0.4)'; el.style.color='var(--gold)'; el.style.background='linear-gradient(135deg,rgba(200,168,75,0.12),rgba(200,168,75,0.04))'; }
}

function randomBlessing() {
  const b = BLESSINGS[Math.floor(Math.random()*BLESSINGS.length)];
  document.getElementById('hbMessage').value = b;
}

function createHongbao() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return; }
  currentKeyword = genKeyword();
  const amount = parseFloat(document.getElementById('hbAmount').value) || 100;
  const blessing = document.getElementById('hbMessage').value;
  const count = hbCount;
  const perPerson = hbType==='normal' ? (amount/count).toFixed(2) : null;
  const expireAt = Date.now() + hbExpiry * 3600 * 1000;

  // 存入 localStorage
  const hbData = {
    keyword: currentKeyword,
    totalAmount: amount,
    count: count,
    perPerson: perPerson,
    type: hbType,
    blessing: blessing,
    expireAt: expireAt,
    createdAt: Date.now(),
    claimed: [],  // {addr, amount, time}
    creator: REAL_WALLET.trxAddress
  };
  const allHb = JSON.parse(localStorage.getItem('ww_hongbaos')||'{}');
  allHb[currentKeyword] = hbData;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  // 更新UI
  document.getElementById('kwKeyword').textContent = currentKeyword;
  document.getElementById('kwBlessingText').textContent = blessing;
  document.getElementById('kwAmtText').textContent = amount + ' USDT';
  document.getElementById('kwCntText').textContent = '共' + count + '份礼物';
  document.getElementById('kwExpText').textContent = '有效期' + hbExpiry + '小时';
  document.getElementById('kwShareKeyword').textContent = currentKeyword;
  document.getElementById('kwProgress').textContent = '0 / ' + count + ' 已领取';
  document.getElementById('kwProgressBar').style.width = '0%';
  const shareUrl = 'https://worldtoken.cc/wallet.html';
  document.getElementById('kwShareText').innerHTML = '🎁 我给你发了一个WorldToken礼物！<br>口令：<span style="color:var(--gold);font-weight:700">' + currentKeyword + '</span><br>打开WorldToken → 输入口令 → 立即领取 💰<br><span style="color:var(--text-muted);font-size:11px">有效期' + hbExpiry + '小时，先到先得</span>';

  goTo('page-hb-keyword');
}

function copyKw() {
  navigator.clipboard?.writeText(currentKeyword).catch(()=>{});
  const btn = document.getElementById('copyKwBtn');
  btn.querySelector('div:last-child').textContent = '✅ 已复制';
  setTimeout(()=>{ btn.querySelector('div:last-child').textContent = '复制口令'; }, 2000);
}

function shareKw() {
  const txt = '🎁 我给你发了一个WorldToken礼物！\n口令：' + currentKeyword + '\n打开链接领取 👉 https://worldtoken.cc/wallet.html\n有效期' + hbExpiry + '小时，先到先得';
  // 尝试直接分享 Telegram
  const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent('https://worldtoken.cc/wallet.html') + '&text=' + encodeURIComponent('🎁 WorldToken礼物口令：' + currentKeyword + '\n输入口令即可领取加密货币！');
  window.open(tgUrl, '_blank');
}

function showHbQR() {
  if(!currentKeyword) return;
  const url = 'https://worldtoken.cc/wallet.html?claim=' + encodeURIComponent(currentKeyword);
  loadQRCodeLib().then(function(){
    if(typeof QRCode !== 'undefined') {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, url, {width:200,margin:1}, function() {
        canvas.toDataURL();
        showToast('💬 请截图分享口令：' + currentKeyword, 'info', 4000);
      });
    } else {
      showToast('✅ 口令已复制：' + currentKeyword, 'success');
    }
  }).catch(function(){ showToast('✅ 口令已复制：' + currentKeyword, 'success'); });
}

function copyShareText() {
  const txt = document.getElementById('kwShareText').textContent;
  navigator.clipboard?.writeText(txt).catch(()=>{});
  document.getElementById('kwShareText').style.opacity = '0.6';
  setTimeout(()=>document.getElementById('kwShareText').style.opacity='1', 800);
}

function onClaimInput() {
  const v = document.getElementById('claimInput').value;
  const box = document.getElementById('claimInputBox');
  box.style.borderColor = v.length > 2 ? 'var(--gold)' : 'var(--border)';
}

function fillKeyword(kw) {
  document.getElementById('claimInput').value = kw;
  onClaimInput();
}

function submitClaim() {
  const kw = document.getElementById('claimInput').value.trim();
  if(!kw) { document.getElementById('claimInputBox').style.borderColor='var(--red)'; return; }

  // 查找礼物
  const allHb = JSON.parse(localStorage.getItem('ww_hongbaos')||'{}');
  const hb = allHb[kw];

  if(!hb) {
    showToast('❌ 未找到此口令，请检查是否输入正确', 'error');
    return;
  }
  if(Date.now() > hb.expireAt) {
    showToast('⏰ 此礼物已过期', 'warning');
    return;
  }
  if(hb.claimed.length >= hb.count) {
    showToast('😢 礼物已被领完啦', 'warning');
    return;
  }
  if(!REAL_WALLET) {
    showToast('⚠️ 请先创建或导入钱包', 'warning');
    return;
  }
  const myAddr = REAL_WALLET.trxAddress;
  if(hb.claimed.find(x=>x.addr===myAddr)) {
    showToast('ℹ️ 你已经领取过这个礼物了', 'info');
    return;
  }

  // 计算金额（随机或固定）
  let amt;
  if(hb.type === 'lucky') {
    const remaining = hb.totalAmount - hb.claimed.reduce((s,x)=>s+parseFloat(x.amount),0);
    const leftCount = hb.count - hb.claimed.length;
    amt = leftCount === 1 ? remaining.toFixed(2) : (Math.random() * remaining * 2 / leftCount).toFixed(2);
  } else {
    amt = hb.perPerson;
  }

  // 记录领取
  hb.claimed.push({ addr: myAddr, amount: amt, time: Date.now() });
  allHb[kw] = hb;
  localStorage.setItem('ww_hongbaos', JSON.stringify(allHb));

  const rank = hb.claimed.length;
  document.getElementById('claimedAmount').textContent = amt;
  document.getElementById('claimedKeyword').textContent = kw;
  document.getElementById('claimedRank').textContent = '第 '+rank+' 个领取 · 共'+hb.count+'份礼物';
  goTo('page-claimed');
}

let hbCount = 5;
function selectHbType(type) {
  hbType = type;
  document.getElementById('hbTypeNormal').style.borderColor = type==='normal'?'var(--gold)':'var(--border)';
  document.getElementById('hbTypeLucky').style.borderColor = type==='lucky'?'var(--gold)':'var(--border)';
  updateHbPreview();
}
function changeCount(delta) {
  hbCount = Math.max(1, Math.min(100, hbCount+delta));
  document.getElementById('hbCountVal').textContent = hbCount;
  (_safeEl('hbCountDisplay')||document.getElementById('hbCountVal')).textContent = hbCount+' 个';
  updateHbPreview();
}

function chgCnt(delta) {
  hbCount = Math.max(1, Math.min(20, hbCount + delta));
  const el = document.getElementById('hbCountVal');
  if(el) el.textContent = hbCount;
  const label = document.getElementById('hbCountLabel');
  if(label) label.textContent = hbCount + ' 个';
  updateHbPreview();
}

function updateHbPreview() {
  const amount = parseFloat(document.getElementById('hbAmount')?.value)||0;
  const per = document.getElementById('hbPerPerson');
  const tl = document.getElementById('hbTypeLabel');
  if(per) per.textContent = hbType==='lucky' ? '随机金额' : (hbCount>0?(amount/hbCount).toFixed(2)+' USDT':'- USDT');
  if(tl) tl.textContent = hbType==='lucky' ? '随机金额' : '每人金额';
}
function sendHongbao() {
  const amount = document.getElementById('hbAmount').value;
  document.getElementById('hbSuccessDesc').innerHTML = amount+' USDT · '+hbCount+'份礼物';
  document.getElementById('hbSuccessKeyword').textContent = currentKeyword;
  document.getElementById('hbSuccessOverlay').style.display = 'flex';
}
function hideHbSuccess() { document.getElementById('hbSuccessOverlay').style.display = 'none'; }


const CURRENCIES = ['CNY','USD','EUR','JPY','KRW'];
let currencyIdx = 0;
function toggleCurrency() {
  currencyIdx = (currencyIdx+1) % CURRENCIES.length;
  const el = _safeEl('settingsCurrency'); if(!el) return;
  if(el) el.textContent = CURRENCIES[currencyIdx];
}

function toggleNetwork() {
  const el = (_safeEl('settingsNetwork') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsNetwork fallback */;
  if(el) el.textContent = el.textContent==='主网' ? '测试网' : '主网';
}

function deleteWallet() {
  if(!window.confirm('⚠️ 确认删除钱包？请确保已备份助记词！')) return;
  if(!window.confirm('再次确认：删除后资产将永久丢失！')) return;
  // 清除所有钱包数据
  localStorage.removeItem('ww_wallet');
  localStorage.removeItem('ww_hongbaos');
  try { localStorage.removeItem('ww_ref_install_credited'); } catch (_x) {}
  window.REAL_WALLET = null;
  currentMnemonicLength = 12;
  // 跳回欢迎页
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-welcome').classList.add('active');
  showToast('✅ 钱包已删除', 'success');
}

function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}

function updateSettingsPage() {
  const info = LANG_INFO[currentLang]||{name:'中文'};
  const sl = (_safeEl('settingsLang') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsLang fallback */;
  if(sl) sl.textContent = info.name;
  const wn = getWalletNickname();
  const wti = document.getElementById('settingsWalletTitle');
  if (wti) wti.textContent = wn || '我的钱包';
  const wni = document.getElementById('walletNicknameInput');
  if (wni && document.activeElement !== wni) wni.value = wn;
  if (typeof applyWwTheme === 'function') applyWwTheme();
  const sa = document.getElementById('settingsAddr');
  if(sa) sa.textContent = getNativeAddr();
  // 实时反映备份状态
  const bs = document.getElementById('backupStatus');
  if(bs) {
    const backed = REAL_WALLET && REAL_WALLET.backedUp;
    bs.textContent = backed ? '已备份 ✓' : '未备份';
    bs.style.color = backed ? 'var(--green,#26a17b)' : 'var(--red,#e74c3c)';
  }
  const tv = document.getElementById('settingsTotpValue');
  if(tv) {
    const on = (typeof wwTotpEnabled === 'function' && wwTotpEnabled());
    tv.textContent = on ? '已开启' : '未开启';
    tv.style.color = on ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  const apv = document.getElementById('settingsAntiPhishValue');
  if (apv) {
    var aw = '';
    try { aw = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
    apv.textContent = aw ? ('已设置 · ' + aw.slice(0, 6) + (aw.length > 6 ? '…' : '')) : '未设置';
    apv.style.color = aw ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  var scv = document.getElementById('settingsSocialRecoveryValue');
  if (scv) {
    var n = 0;
    try { var ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); n = Array.isArray(ar) ? ar.length : 0; } catch (e0) { n = 0; }
    scv.textContent = n ? (n + ' 人') : '未添加';
    scv.style.color = n ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  var slv = document.getElementById('settingsSpendLimitValue');
  if (slv) {
    var sp = {};
    try { sp = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e1) { sp = {}; }
    if (sp && sp.en && parseFloat(sp.dailyUsd) > 0) {
      slv.textContent = '每日 $' + parseFloat(sp.dailyUsd).toFixed(0);
      slv.style.color = 'var(--green,#26a17b)';
    } else {
      slv.textContent = '关闭';
      slv.style.color = 'var(--text-muted)';
    }
  }
  var whv = document.getElementById('settingsWhaleValue');
  if (whv) {
    var wh = {};
    try { wh = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e2) { wh = {}; }
    if (wh && wh.en) {
      whv.textContent = '已开 · $' + (parseFloat(wh.thresholdUsd) > 0 ? parseFloat(wh.thresholdUsd).toFixed(0) : '—');
      whv.style.color = 'var(--green,#26a17b)';
    } else {
      whv.textContent = '关闭';
      whv.style.color = 'var(--text-muted)';
    }
  }
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  try { if (typeof updateReputationSettingsRow === 'function') updateReputationSettingsRow(); } catch (_rs) {}
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
    try { localStorage.setItem('ww_push_asked', '1'); } catch (x) {}
  }
}

function promptWalletNotifications() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info', 2500);
      else alert('当前环境不支持通知');
      return;
    }
    Notification.requestPermission().then(function (p) {
      localStorage.setItem('ww_push_asked', '1');
      const msg = p === 'granted' ? '已开启通知' : ('通知权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info', 2500);
    });
  } catch (e) {}
}


// ══ 兑换系统 ══
const COINS = [
  {id:'usdt', name:'USDT', chain:'TRC-20', icon:'💚', bg:'rgba(38,161,123,0.15)', bal:0, price:1},
  {id:'btc',  name:'BTC',  chain:'Bitcoin', icon:'🟠', bg:'rgba(255,165,0,0.12)', bal:0, price:60000},
  {id:'eth',  name:'ETH',  chain:'Ethereum', icon:'🔷', bg:'rgba(100,100,255,0.12)', bal:0, price:2500},
  {id:'trx',  name:'TRX',  chain:'Tron', icon:'🔴', bg:'rgba(255,80,80,0.12)', bal:0, price:0.12},
  {id:'bnb',  name:'BNB',  chain:'BNB Chain', icon:'🟡', bg:'rgba(255,215,0,0.12)', bal:0, price:312},
];

let swapFrom = COINS.find(c => c.id === 'usdt') || COINS[0];
let swapTo   = COINS.find(c => c.id === 'trx') || COINS[1];
let pickerTarget = 'from';

function setSwapCoin(target, coin) {
  if(target==='from') swapFrom=coin;
  else swapTo=coin;
  renderSwapUI();
  calcSwap();
}

function renderSwapUI() {
  const f=swapFrom, t=swapTo;
  _safeEl('swapFromIcon').style.background=f.bg;
  (_safeEl('swapFromIcon') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromIcon fallback */.textContent=f.icon;
  (_safeEl('swapFromName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromName fallback */.textContent=f.name;
  (_safeEl('swapFromChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromChain fallback */.textContent=f.chain;
  (_safeEl('swapFromBal') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFromBal fallback */.textContent=f.bal.toLocaleString();
  _safeEl('swapToIcon').style.background=t.bg;
  (_safeEl('swapToIcon') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToIcon fallback */.textContent=t.icon;
  (_safeEl('swapToName') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToName fallback */.textContent=t.name;
  (_safeEl('swapToChain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapToChain fallback */.textContent=t.chain;
  const rate = (swapFrom.price/swapTo.price).toFixed(swapTo.price>100?6:4);
  (_safeEl('swapRate') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRate fallback */.textContent=`1 ${f.name} ≈ ${rate} ${t.name}`;
}

function calcSwap() {
  const amtIn = parseFloat(_safeEl('swapAmountIn').value)||0;
  // 用实时价格（已由 loadSwapPrices 更新）
  const pFrom = swapFrom.price || 1;
  const pTo = swapTo.price || 1;
  const fee = amtIn * 0.003;
  const amtOut = ((amtIn - fee) * pFrom / pTo);
  const fmt = amtOut > 1 ? amtOut.toFixed(4) : amtOut.toFixed(8);
  (_safeEl('swapAmountOut') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapAmountOut fallback */.textContent = fmt;
  (_safeEl('swapInUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapInUSD fallback */.textContent = '$'+(amtIn*pFrom).toFixed(2);
  (_safeEl('swapOutUSD') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapOutUSD fallback */.textContent = '$'+((amtIn-fee)*pFrom).toFixed(2);
  (_safeEl('swapFee') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapFee fallback */.textContent = `0.30%（${fee.toFixed(4)} ${swapFrom.name}）`;
  // 更新汇率显示
  const rate = pFrom / pTo;
  const rateEl = (_safeEl('swapRateInfo') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRateInfo fallback */;
  if(rateEl) rateEl.textContent = `1 ${swapFrom.name} ≈ ${rate > 1 ? rate.toFixed(4) : rate.toFixed(8)} ${swapTo.name}`;
  try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc) {}
}

// 从 CoinGecko 拉实时价格
const COIN_GECKO_IDS = { usdt:'tether', trx:'tron', eth:'ethereum', btc:'bitcoin', bnb:'binancecoin' };
async function loadSwapPrices() {
  try {
    const ids = ['tether','tron','ethereum','bitcoin','binancecoin'].join(',');
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const d = await r.json();
    const priceMap = { usdt: d.tether?.usd||1, trx: d.tron?.usd||0.12, eth: d.ethereum?.usd||2500, btc: d.bitcoin?.usd||60000, bnb: d.binancecoin?.usd||400 };
    // 更新 COINS 价格
    COINS.forEach(coin => { if(priceMap[coin.id]) coin.price = priceMap[coin.id]; });
    calcSwap();
    try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc2) {}
    console.log('兑换价格已更新');
  } catch(e) { console.log('价格加载失败，使用默认'); }
}

function swapCoins() {
  const tmp=swapFrom; swapFrom=swapTo; swapTo=tmp;
  const btn=_safeEl('swapArrowBtn');
  btn.style.transform='rotate(180deg)';
  setTimeout(()=>btn.style.transform='',300);
  renderSwapUI(); calcSwap();
}

function setSwapMax() {
  _safeEl('swapAmountIn').value=swapFrom.bal;
  calcSwap();
}

function openCoinPicker(target) {
  pickerTarget=target;
  const list=document.getElementById('coinPickerList');
  list.innerHTML='';
  COINS.forEach(coin=>{
    const current = target==='from'?swapFrom:swapTo;
    const other = target==='from'?swapTo:swapFrom;
    if(coin.id===other.id) return; // 不能选同一个
    const div=document.createElement('div');
    div.style.cssText='display:flex;align-items:center;gap:12px;background:var(--bg3);border:1.5px solid '+(coin.id===current.id?'var(--gold)':'var(--border)')+';border-radius:14px;padding:12px 14px;cursor:pointer;transition:all 0.2s';
    div.innerHTML=`<div style="width:36px;height:36px;border-radius:50%;background:${coin.bg};display:flex;align-items:center;justify-content:center;font-size:18px">${coin.icon}</div><div class="u4"><div style="font-size:15px;font-weight:600;color:var(--text)">${coin.name}</div><div style="font-size:11px;color:var(--text-muted)">${coin.chain}</div></div><div class="u6"><div style="font-size:14px;color:var(--text)">${coin.bal.toLocaleString()}</div></div>`;
    div.onclick=()=>{setSwapCoin(pickerTarget,coin);closeCoinPicker();};
    list.appendChild(div);
  });
  const _ovcoinPi = document.getElementById('coinPickerOverlay'); if(_ovcoinPi) _ovcoinPi.classList.add('show');
}

function closeCoinPicker() { const _ovcoinPi2 = document.getElementById('coinPickerOverlay'); if(_ovcoinPi2) _ovcoinPi2.classList.remove('show'); }

function doSwap() {
  const amt = parseFloat(_safeEl('swapAmountIn').value)||0;
  if(!amt) return;
  const out = (_safeEl('swapAmountOut') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapAmountOut fallback */.textContent;

  // 根据交易对选择 DEX
  const isTronPair = ['trx','usdt'].includes(swapFrom.id) && ['trx','usdt'].includes(swapTo.id);
  const isEthPair = ['eth','usdt'].includes(swapFrom.id) || ['eth','usdt'].includes(swapTo.id);

  // 显示确认弹窗
  const overlay = document.getElementById('swapConfirmOverlay');
  if(overlay) {
    _safeEl('swapConfirmFrom').textContent = amt + ' ' + swapFrom.name;
    _safeEl('swapConfirmTo').textContent = out + ' ' + swapTo.name;
    _safeEl('swapConfirmRate').textContent = '1 ' + swapFrom.name + ' ≈ ' + (swapFrom.price/swapTo.price).toFixed(6) + ' ' + swapTo.name;
    overlay.classList.add('show');
  } else {
    // 直接跳转 DEX
    openDex();
  }
}

function openDex() {
  const closeOverlay = document.getElementById('swapConfirmOverlay');
  if(closeOverlay) closeOverlay.classList.remove('show');

  const isTron = ['trx','usdt'].includes(swapFrom.id) && ['trx','usdt'].includes(swapTo.id);
  const COIN_ADDRS = {
    trx: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // TRX
    usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',  // USDT TRC20
    eth: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
  };

  if(isTron) {
    // SunSwap (Tron DEX)
    const fromAddr = COIN_ADDRS[swapFrom.id] || '';
    const toAddr = COIN_ADDRS[swapTo.id] || '';
    window.open(`https://sunswap.com/#/v3?inputCurrency=${fromAddr}&outputCurrency=${toAddr}`, '_blank');
  } else {
    // Uniswap
    const UNISWAP_TOKENS = { usdt:'0xdAC17F958D2ee523a2206206994597C13D831ec7', eth:'ETH', btc:'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' };
    const inToken = UNISWAP_TOKENS[swapFrom.id] || swapFrom.id.toUpperCase();
    const outToken = UNISWAP_TOKENS[swapTo.id] || swapTo.id.toUpperCase();
    window.open(`https://app.uniswap.org/swap?inputCurrency=${inToken}&outputCurrency=${outToken}`, '_blank');
  }
}


// ── 导入钱包 ──────────────────────────────────────────────────
function initImportGrid(count) {
  count = count || 12;
  importGridWordCount = count;
  const grid = document.getElementById('importGrid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:3px';
    div.innerHTML = `
      <span style="font-size:9px;color:var(--text-muted)">${i+1}</span>
      <input id="iw_${i}" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="width:100%;background:none;border:none;outline:none;font-size:12px;color:var(--text);text-align:center;font-family:inherit"
        oninput="syncImportPaste()"
        onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();document.getElementById('iw_${Math.min(i+1,11)}')&&document.getElementById('iw_${Math.min(i+1,11)}').focus();}">
    `;
    grid.appendChild(div);
  }
}

function syncImportGrid(text) {
  const words = text.trim().split(/[\s,]+/).filter(w => w);
  const validLengths = [12, 15, 18, 21, 24];
  // 自动调整格子数
  const targetLen = validLengths.find(l => l >= words.length) || 12;
  initImportGrid(targetLen);
  for(let i = 0; i < targetLen; i++) {
    const inp = document.getElementById('iw_' + i);
    if(inp) {
      let val = String(inp.value || '').trim();
      if (val.length > 4) val = val.substring(0, 4);
      inp.value = words[i] || val;
    }
  }
  updateImportWordCount();
}

function syncImportPaste() {
  const words = [];
  const syncLen = importGridWordCount || 12;
  for(let i = 0; i < syncLen; i++) {
    const inp = document.getElementById('iw_' + i);
    words.push(inp ? inp.value.trim() : '');
  }
  const paste = document.getElementById('importPaste');
  if(paste) paste.value = words.filter(w=>w).join(' ');
  updateImportWordCount();
}

function copyAllMnemonic(btn) {
  const words = [];
  const isEn = currentLang === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(w => words.push(w));
  } else {
    const wl = WT_WORDLISTS[currentLang];
    const enMn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(wl && enMn) {
      enMn.split(' ').forEach(enW => {
        const enIdx = WT_WORDLISTS.en.indexOf(enW);
        words.push(enIdx >= 0 && wl[enIdx] ? wl[enIdx] : enW);
      });
    }
  }
  if(!words.length) return;
  const text = words.join(' ');
  navigator.clipboard.writeText(text).then(() => {
    const prev = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const prev = btn.textContent;
    btn.textContent = '✅ 已复制';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  });
}



// ── 从导入格子获取助记词 ──────────────────────────────────────────
function getMnemonicFromGrid() {
  const len = importGridWordCount || 12;
  const words = [];
  // 先尝试从 textarea 粘贴区读取
  const paste = document.getElementById('importPaste');
  if(paste && paste.value.trim()) {
    const pasted = paste.value.trim().split(/\s+/);
    if([12,15,18,21,24].includes(pasted.length)) return pasted.join(' ');
  }
  // 从格子读取
  for(let i = 0; i < len; i++) {
    const inp = document.getElementById('iw_' + i);
    if(!inp || !inp.value.trim()) {
      const errEl = document.getElementById('importError');
      if(errEl) { errEl.style.display='block'; errEl.textContent=`第${i+1}个词不能为空`; }
      showToast(`❌ 第${i+1}个词不能为空`, 'error');
      return null;
    }
    words.push(inp.value.trim());
  }
  return words.join(' ');
}

function doImportWallet() {
  const mnemonic = getMnemonicFromGrid();
  if(!mnemonic) return;
  restoreWallet(mnemonic).then(w => {
    if(w) {
      updateAddr();
      document.getElementById('tabBar').style.display = 'flex';
      setTimeout(loadBalances, 500);
      goTo('page-home');
      showToast('✅ 钱包导入成功！', 'success');
    }
  });
}


// ── 二维码生成 ──────────────────────────────────────────────────
function generateQRCode(text, canvasId) {
  const canvas = document.getElementById(canvasId || 'qrCanvas');
  if(!canvas) return;
  loadQRCodeLib().then(function(){
    if(typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      QRCode.toCanvas(canvas, text || 'worldtoken', {
        width: 130,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }, function(err) {
        if(err) console.error('QR error:', err);
      });
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = 'https://chart.googleapis.com/chart?chs=130x130&cht=qr&chl=' + encodeURIComponent(text) + '&choe=UTF-8';
      img.style.width = '130px';
      img.style.height = '130px';
      canvas.parentNode.replaceChild(img, canvas);
    }
  }).catch(function(e){
    console.error('QR lib:', e);
    try {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      img.src = 'https://chart.googleapis.com/chart?chs=130x130&cht=qr&chl=' + encodeURIComponent(text) + '&choe=UTF-8';
      img.style.width = '130px';
      img.style.height = '130px';
      canvas.parentNode.replaceChild(img, canvas);
    } catch(e2) { console.error(e2); }
  });
}

// 更新二维码（当地址改变时调用）
function ethFloatToWeiString(v) {
  if (!isFinite(v) || v <= 0) return '0';
  const s = v.toFixed(18);
  const i = s.indexOf('.');
  const whole = i < 0 ? s : s.slice(0, i);
  const frac = i < 0 ? '' : s.slice(i + 1, i + 1 + 18);
  const w = (whole.replace(/^0+/, '') || '0') + frac.padEnd(18, '0').slice(0, 18);
  return w.replace(/^0+/, '') || '0';
}
function buildReceiveQrPayload(chain, addr, amountRaw) {
  if (!addr) return '';
  const raw = (document.getElementById('qrReceiveAmount') && document.getElementById('qrReceiveAmount').value) || amountRaw || '';
  const amt = parseFloat(String(raw).replace(',', '.'));
  const hasAmt = !isNaN(amt) && amt > 0;
  if (!hasAmt) return addr;
  if (chain === 'trx') {
    const sun = Math.round(amt * 1e6);
    if (!isFinite(sun) || sun <= 0) return addr;
    return 'tron:' + addr + '?amount=' + sun;
  }
  if (chain === 'eth') {
    const wei = ethFloatToWeiString(amt);
    return 'ethereum:' + addr + '?value=' + wei;
  }
  return addr;
}
function updateQRCode() {
  if(!REAL_WALLET) return;
  const chain = document.getElementById('qrChainSelect')?.value || 'trx';
  let addr = '';
  if(chain === 'trx') addr = REAL_WALLET.trxAddress || '';
  else if(chain === 'eth') addr = REAL_WALLET.ethAddress || '';
  if(addr) generateQRCode(buildReceiveQrPayload(chain, addr), 'qrCanvas');
}



function txHistoryFriendlyHtml(icon, title, hint) {
  return '<div class="tx-empty-friendly"><div class="tx-empty-icon" aria-hidden="true">' + icon + '</div><div class="tx-empty-title">' + title + '</div><div class="tx-empty-hint">' + hint + '</div></div>';
}
function txHistoryEmptyHtml() {
  const L = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'zh';
  const M = {
    en: { title: "No transactions yet", hint: "After you send or receive once, your latest activity will appear here. On-chain confirmations usually take just a few seconds — tap Refresh above if you just sent something." },
    zh: { title: '暂无交易记录', hint: '这里会列出你最近的转账与收款。完成第一笔后，记录很快就会出现在这里。链上确认通常只要几秒——若刚发出，点上方「刷新」或稍后再看即可。' },
    'zh-TW': { title: '尚無交易紀錄', hint: '轉帳或收款後，最新活動會顯示在這裡。鏈上確認有時需要幾秒鐘，若剛送出請點上方「重新整理」或稍後再查看。' },
    ja: { title: 'まだ取引履歴がありません', hint: '送金や受取を一度行うと、直近のアクティビティがここに表示されます。オンチェーンの確定に数秒かかることがあります。送った直後は「更新」をタップしてください。' },
    ko: { title: '아직 거래 내역이 없어요', hint: '보내기·받기를 한 번 하면 최근 활동이 여기에 표시됩니다. 온체인 확인에 몇 초 걸릴 수 있어요. 방금 보냈다면 위의 새로고침을 눌러 보세요.' },
    es: { title: 'Aún no hay transacciones', hint: 'Cuando envíes o recibas, verás aquí tu actividad reciente. La confirmación en cadena puede tardar unos segundos; pulsa Actualizar arriba si acabas de enviar.' },
    fr: { title: 'Pas encore de transactions', hint: 'Après un envoi ou une réception, votre activité récente apparaîtra ici. La confirmation on-chain peut prendre quelques secondes — touchez Actualiser ci-dessus.' },
    ar: { title: 'لا توجد معاملات بعد', hint: 'بعد أول إرسال أو استلام، ستظهر أنشطتك هنا. قد تستغرق التأكيدات على السلسلة ثوانٍ — اضغط «تحديث» أعلاه إذا أرسلت للتو.' },
    hi: { title: 'अभी कोई लेनदेन नहीं', hint: 'भेजने या प्राप्त करने के बाद आपकी हाल की गतिविधि यहाँ दिखेगी। ऑन-चेन पुष्टि में कुछ सेकंड लग सकते हैं — अभी भेजा है तो ऊपर ताज़ा करें दबाएँ।' },
    pt: { title: 'Ainda não há transações', hint: 'Depois de enviar ou receber, sua atividade recente aparece aqui. A confirmação na rede pode levar alguns segundos — toque em Atualizar acima se acabou de enviar.' },
    ru: { title: 'Пока нет транзакций', hint: 'После отправки или получения здесь появится активность. Подтверждение в сети может занять несколько секунд — нажмите «Обновить» выше, если только что отправили.' },
    de: { title: 'Noch keine Transaktionen', hint: 'Nach dem ersten Senden oder Empfangen erscheint Ihre Aktivität hier. Die On-Chain-Bestätigung kann einige Sekunden dauern — tippen Sie oben auf Aktualisieren.' },
  };
  const pack = M[L] || M.zh;
  return txHistoryFriendlyHtml('📬', pack.title, pack.hint);
}

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

function txHistoryRowHtml(tx) {
  const escapeHtml = function(str) {
    const div = document.createElement('div');
    div.textContent = String(str || '');
    return div.innerHTML;
  };
  var addr = String(tx.addr || '');
  var addrLine = addr.length > 8 ? (addr.slice(0, 8) + '...' + addr.slice(-6)) : addr;
  var coin = String(tx.coin || '');
  var hash = String(tx.hash || '');
  const addrEscaped = escapeHtml(addrLine);
  const amountEscaped = escapeHtml(tx.amount);
  const typeEscaped = escapeHtml(tx.type);
  const coinEscaped = escapeHtml(coin);
  const iconEscaped = escapeHtml(tx.icon);
  const timeEscaped = escapeHtml(tx.time);
  const hashAttr = escapeHtml(hash);
  const coinAttr = escapeHtml(coin);
  var col = (typeof wwTxSanitizeColor === 'function' ? wwTxSanitizeColor(tx.color) : 'inherit');
  return (
    '<div class="ww-tx-history-row" role="button" tabindex="0" data-coin="' + coinAttr + '" data-hash="' + hashAttr + '"' +
    ' style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity 0.2s">' +
    '<div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + iconEscaped + '</div>' +
    '<div style="flex:1;min-width:0">' +
    '<div style="font-size:13px;font-weight:600;color:var(--text)">' + typeEscaped + ' ' + coinEscaped + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + addrEscaped + '</div>' +
    '</div>' +
    '<div style="text-align:right;flex-shrink:0">' +
    '<div style="font-size:14px;font-weight:700;color:' + col + '">' + amountEscaped + '</div>' +
    '<div style="font-size:10px;color:var(--text-muted)">' + timeEscaped + '</div>' +
    '</div>' +
    '</div>'
  );
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
  filtered.forEach(function(tx) {
    var html = txHistoryRowHtml(tx);
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    if (wrap.firstChild) el.appendChild(wrap.firstChild);
  });
  if (!el._wwTxHistoryDelegated && typeof wwTxHistoryRowOnClick === 'function') {
    el._wwTxHistoryDelegated = true;
    el.addEventListener('click', wwTxHistoryRowOnClick);
  }
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch(_rep2) {}
}

function applyTxHistoryFilter() {
  renderTxHistoryFromCache();
}

function getWalletSecurityBreakdown() {
  var pinOk = false;
  try {
    pinOk = wwHasPinConfigured();
  } catch (e) {}
  var backed = false;
  try {
    if (REAL_WALLET && REAL_WALLET.backedUp) backed = true;
    else {
      var w = JSON.parse(localStorage.getItem('ww_wallet') || '{}');
      backed = !!w.backedUp;
    }
  } catch (e) {}
  var pinPts = pinOk ? 50 : 0;
  var backupPts = backed ? 50 : 0;
  return { score: pinPts + backupPts, pinOk: pinOk, backed: backed, pinPts: pinPts, backupPts: backupPts };
}

function updateWalletSecurityScoreUI() {
  var el = document.getElementById('wwSecurityScoreValue');
  var bar = document.getElementById('wwSecurityScoreBar');
  var hint = document.getElementById('wwSecurityScoreHint');
  var badge = document.getElementById('wwSecurityScoreBadge');
  if (!el || !bar || !hint) return;
  var b = getWalletSecurityBreakdown();
  el.textContent = String(b.score);
  bar.style.width = b.score + '%';
  var tips = [];
  if (!b.pinOk) tips.push('未设置 PIN：他人拿到设备时可能直接打开钱包。');
  if (!b.backed) tips.push('未确认备份助记词：设备丢失将无法恢复资产。');
  if (b.pinOk && b.backed) tips.push('PIN 与备份均已就绪；请离线保管助记词，勿截图或泄露。');
  hint.textContent = tips.length ? tips.join(' ') : '加载中…';
  if (badge) {
    if (b.score >= 100) { badge.textContent = '优秀'; badge.style.color = 'var(--green,#26a17b)'; }
    else if (b.score >= 50) { badge.textContent = '一般'; badge.style.color = 'var(--gold)'; }
    else { badge.textContent = '待加强'; badge.style.color = 'var(--red,#e74c3c)'; }
  }
}

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
  if (c === 'USDT') return amtN * (parseFloat(cg.usdt) || 1);
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
  try { if (REAL_WALLET && REAL_WALLET.trxAddress) selfTron = wwNormAddr(REAL_WALLET.trxAddress); } catch (e3) {}
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
    } catch (e4) {}
  });
  try { localStorage.setItem('ww_whale_seen_v1', JSON.stringify(seen)); } catch (e5) {}
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
async function wwSpendGateBeforeConfirm(amtNum) {
  var cfg = {};
  try { cfg = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { cfg = {}; }
  if (!cfg || !cfg.en) return true;
  var d = new Date().toISOString().slice(0, 10);
  if (cfg.day !== d) { cfg.day = d; cfg.usedUsd = 0; try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) {} }
  var lim = parseFloat(cfg.dailyUsd) || 0;
  if (!(lim > 0)) return true;
  var est = wwEstUsdForTransfer(amtNum);
  var used = parseFloat(cfg.usedUsd) || 0;
  if (used + est <= lim + 1e-6) return true;
  var pin = prompt('本笔约 $' + est.toFixed(2) + '，今日已累计约 $' + used.toFixed(2) + '，已超过每日限额 $' + lim.toFixed(2) + '。输入 6 位 PIN 以本次继续');
  if (pin === null) return false;
  if (typeof verifyPin === 'function') {
    var ok = await verifyPin(pin);
    if (ok) { wwSetSessionPin(pin); return true; }
    if (typeof showToast === 'function') showToast('PIN 不正确或未设置 PIN', 'error');
    return false;
  }
  var saved = wwGetSessionPin();
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
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(cfg)); } catch (e2) {}
}
function wwSpendLimitPopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwSpendLimitEnable');
  if (en) en.checked = !!o.en;
  var du = document.getElementById('wwSpendLimitDailyUsd');
  if (du) du.value = o.dailyUsd && parseFloat(o.dailyUsd) > 0 ? String(o.dailyUsd) : '';
  var d = new Date().toISOString().slice(0, 10);
  if (o.day !== d) { o.usedUsd = 0; }
  var u = document.getElementById('wwSpendUsedDisplay');
  if (u) u.textContent = '$' + (parseFloat(o.usedUsd) || 0).toFixed(2);
}
function wwSpendSaveFromUI() {
  var en = !!(document.getElementById('wwSpendLimitEnable') && document.getElementById('wwSpendLimitEnable').checked);
  var daily = parseFloat((document.getElementById('wwSpendLimitDailyUsd') || {}).value || '');
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_spend_limit_v1') || '{}'); } catch (e) { o = {}; }
  o.en = en;
  o.dailyUsd = isFinite(daily) && daily > 0 ? daily : 0;
  var d = new Date().toISOString().slice(0, 10);
  if (o.day !== d) { o.day = d; o.usedUsd = 0; }
  try { localStorage.setItem('ww_spend_limit_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('已保存支出限额', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  wwSpendLimitPopulate();
}
function wwWhalePopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_whale_v1') || '{}'); } catch (e) { o = {}; }
  var en = document.getElementById('wwWhaleEnable');
  if (en) en.checked = !!o.en;
  var ms = document.getElementById('wwWhaleSelf');
  if (ms) ms.checked = !!o.monitorSelf;
  var th = document.getElementById('wwWhaleThreshold');
  if (th) th.value = o.thresholdUsd && parseFloat(o.thresholdUsd) > 0 ? String(o.thresholdUsd) : '';
  var ta = document.getElementById('wwWhaleAddresses');
  if (ta) ta.value = o.addressesText || '';
}
function wwWhaleSaveFromUI() {
  var o = {
    en: !!(document.getElementById('wwWhaleEnable') && document.getElementById('wwWhaleEnable').checked),
    monitorSelf: !!(document.getElementById('wwWhaleSelf') && document.getElementById('wwWhaleSelf').checked),
    thresholdUsd: parseFloat((document.getElementById('wwWhaleThreshold') || {}).value || '') || 0,
    addressesText: (document.getElementById('wwWhaleAddresses') || {}).value || ''
  };
  try { localStorage.setItem('ww_whale_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('已保存巨鲸提醒', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwRequestWhaleNotifyPermission() {
  try {
    if (typeof Notification === 'undefined') {
      if (typeof showToast === 'function') showToast('当前环境不支持通知', 'info');
      return;
    }
    Notification.requestPermission().then(function (p) {
      var msg = p === 'granted' ? '已授予通知权限' : ('权限：' + p);
      if (typeof showToast === 'function') showToast(msg, 'info');
    });
  } catch (e) {}
}

function wwBridgeSyncTo() {
  var f = document.getElementById('wwBridgeFrom');
  var t = document.getElementById('wwBridgeTo');
  if (!f || !t) return;
  var v = f.value === 'trx' ? 'eth' : 'trx';
  for (var i = 0; i < t.options.length; i++) {
    if (t.options[i].value === v) { t.selectedIndex = i; break; }
  }
}

function wwBridgeCopyRecvAddr() {
  var f = document.getElementById('wwBridgeFrom');
  var want = f && f.value === 'eth' ? 'eth' : 'trx';
  var addr = '';
  try {
    if (REAL_WALLET) {
      addr = want === 'eth' ? (REAL_WALLET.ethAddress || '') : (REAL_WALLET.trxAddress || '');
    }
  } catch (e) {}
  if (!addr) {
    if (typeof showToast === 'function') showToast('暂无钱包地址', 'info');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () {
        if (typeof showToast === 'function') showToast('已复制 ' + want.toUpperCase() + ' 地址', 'success');
      });
    } else {
      prompt('复制地址', addr);
    }
  } catch (e2) {}
}

function wwBridgeOpenStargate() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://www.stargate.finance/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://www.stargate.finance/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('请在桥接站点选择网络与代币，并核对合约', 'info', 3200);
}

function wwBridgeOpenTronDocs() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://developers.tron.network/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://developers.tron.network/';
  } catch (e) {}
}

function wwVestingRender() {
  var host = document.getElementById('wwVestingTimeline');
  if (!host) return;
  var rows = null;
  try { rows = JSON.parse(localStorage.getItem('ww_vesting_demo_v1') || 'null'); } catch (e) { rows = null; }
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    rows = [
      { t: 'T0', unlockedPct: 0 },
      { t: '第 3 月', unlockedPct: 25 },
      { t: '第 6 月', unlockedPct: 60 },
      { t: '第 12 月', unlockedPct: 100 }
    ];
  }
  host.innerHTML = rows.map(function (r) {
    var u = Math.max(0, Math.min(100, parseFloat(r.unlockedPct) || 0));
    var lk = 100 - u;
    var esc = function (s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:var(--text)">' + esc(r.t) + '</span><span style="color:var(--text-muted)">已解锁 ' + u.toFixed(0) + '% · 锁定 ' + lk.toFixed(0) + '%</span></div>' +
      '<div style="height:10px;border-radius:8px;background:var(--bg3);overflow:hidden;display:flex">' +
      '<div style="width:' + u + '%;background:linear-gradient(90deg,#26a17b,#4fd1a5)"></div>' +
      '<div style="width:' + lk + '%;background:rgba(200,168,75,0.35)"></div></div></div>';
  }).join('');
}

function wwVestingResetDemo() {
  try { localStorage.removeItem('ww_vesting_demo_v1'); } catch (e) {}
  wwVestingRender();
  if (typeof showToast === 'function') showToast('已恢复示例进度', 'info');
}

function wwDexConnectPopulate() {
  var el = document.getElementById('wwDexAddrHint');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">ETH</div><div style="color:var(--text)">' + REAL_WALLET.ethAddress + '</div>' +
        '<div style="margin:10px 0 6px;color:var(--text-muted)">TRX</div><div style="color:var(--text)">' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwHardwareWalletPopulate() {
  var el = document.getElementById('wwHardwareAddrEcho');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">与本钱包核对地址</div><div style="color:var(--text);font-size:12px">ETH: ' + REAL_WALLET.ethAddress + '</div><div style="color:var(--text);font-size:12px;margin-top:6px">TRX: ' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包后再与硬件设备显示地址逐项核对。';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwOpenLedgerSupport() {
  try { if (window.open) window.open('https://support.ledger.com/', '_blank', 'noopener,noreferrer'); } catch (e) {}
  if (typeof showToast === 'function') showToast('请在官方支持页查看设备与链兼容说明', 'info', 2800);
}

function wwOpenTrezorSupport() {
  try { if (window.open) window.open('https://trezor.io/learn/', '_blank', 'noopener,noreferrer'); } catch (e) {}
}

function wwTaxReportPopulate() {
  var sum = document.getElementById('wwTaxReportSummary');
  if (!sum) return;
  var n = 0;
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) n = window._wwTxHistoryCache.length;
  } catch (e) { n = 0; }
  sum.textContent = '当前可导出记录条数：' + n + '（来自首页交易历史缓存）';
}

function wwTaxExportCsv() {
  var rows = [];
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) rows = window._wwTxHistoryCache.slice();
  } catch (e) { rows = []; }
  if (!rows.length) {
    if (typeof showToast === 'function') showToast('暂无缓存记录，请先在首页刷新交易历史', 'info', 3200);
    return;
  }
  var esc = function (s) {
    var t = String(s == null ? '' : s);
    if (/[",\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  };
  var lines = ['date,type,coin,amount,counterparty,tx_hash'];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    lines.push([esc(r.time), esc(r.type), esc(r.coin), esc(r.amount), esc(r.addr), esc(r.hash)].join(','));
  }
  var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'worldwallet-tx-tax-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e2) {} }, 800);
  if (typeof showToast === 'function') showToast('已生成 CSV（请自行核对字段）', 'success', 2400);
}

function wwCopyTradingPopulate() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  try {
    var raw = localStorage.getItem('ww_copy_watch_v1') || '';
    var ar = [];
    try { ar = JSON.parse(raw); } catch (e) { ar = []; }
    if (Array.isArray(ar) && ar.length) {
      ta.value = ar.map(function (x) { return (x && x.addr) ? String(x.addr) : ''; }).filter(Boolean).join('\n');
    }
  } catch (e2) {}
  wwCopyTradingRenderList();
}

function wwCopyTradingSave() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  var lines = String(ta.value || '').split(/[\n,;\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  var ar = lines.map(function (addr) { return { addr: addr }; });
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e) {}
  wwCopyTradingRenderList();
  if (typeof showToast === 'function') showToast('已保存 ' + ar.length + ' 个地址（本机）', 'success', 2200);
}

function wwCopyTradingRenderList() {
  var host = document.getElementById('wwCopyWatchList');
  if (!host) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || !ar.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无监控地址</div>';
    return;
  }
  host.innerHTML = ar.map(function (c, i) {
    var a = (c && c.addr) ? String(c.addr) : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:11px;word-break:break-all;display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="color:var(--text)">' + a.replace(/</g, '') + '</span><span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwCopyTradingRemove===\'function\')wwCopyTradingRemove(' + i + ')">移除</span></div>';
  }).join('');
}

function wwCopyTradingRemove(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e2) {}
  var ta = document.getElementById('wwCopyWatchInput');
  if (ta) ta.value = ar.map(function (x) { return x.addr; }).join('\n');
  wwCopyTradingRenderList();
}

function wwPortfolioInsurancePopulate() {
  var host = document.getElementById('wwInsuranceBody');
  if (!host) return;
  var items = [
    { t: 'Nexus Mutual', d: '去中心化互助承保（需了解 NXM 与 KYC 要求）', u: 'https://www.nexusmutual.io/' },
    { t: 'InsurAce', d: '多链 DeFi 协议组合保险', u: 'https://www.insurace.io/' },
    { t: '托管方条款', d: '若资产在交易所，请查阅其用户保护与保险说明', u: 'https://www.binance.com/en/support/faq' }
  ];
  host.innerHTML = items.map(function (it) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-weight:700;color:var(--text);font-size:14px">' + it.t + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">' + it.d + '</div>' +
      '<button type="button" class="btn-secondary" style="align-self:flex-start;padding:8px 14px;font-size:12px" onclick="try{window.open(\'' + it.u + '\',\'_blank\',\'noopener,noreferrer\');}catch(e){}">了解详情</button></div>';
  }).join('');
}

function wwYieldOptimizerPopulate() {
  var body = document.getElementById('wwYieldOptimizerBody');
  var hint = document.getElementById('wwYieldOptimizerHint');
  if (!body || !hint) return;
  var parts = [];
  var total = 0;
  try {
    if (window._wwLastPortfolioParts && window._wwLastPortfolioTotal != null) {
      parts = window._wwLastPortfolioParts;
      total = Number(window._wwLastPortfolioTotal) || 0;
    }
  } catch (e) { parts = []; total = 0; }
  if (!total || total <= 1e-9) {
    hint.textContent = '暂无持仓估值：请返回首页等待余额加载后再查看策略建议。';
    body.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">—</div>';
    return;
  }
  var apy = { USDT: 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var top = null;
  var bestA = 0;
  parts.forEach(function (p) {
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    if (a > bestA && p.v > 0) { bestA = a; top = p.l; }
  });
  hint.innerHTML = '当前组合参考总市值约 <b style="color:var(--text)">$' + total.toFixed(2) + '</b>。' +
    (top ? ' 占比最高的可优化资产侧重：<b style="color:var(--gold)">' + top + '</b>（参考 APY ' + bestA.toFixed(1) + '%）。' : '');
  var strategies = [
    { n: '稳定币理财 / 货币市场', apy: '3.5–5%', fit: 'USDT', note: '适合大额 USDT，注意合约与平台信用风险' },
    { n: '原生链质押（ETH / TRX）', apy: '3–6%', fit: 'ETH,TRX', note: '流动性质押或节点委托，需解锁期与罚没规则' },
    { n: '流动性挖矿（AMM）', apy: '变动大', fit: 'USDT,ETH', note: '无常损失与智能合约风险较高' }
  ];
  body.innerHTML = strategies.map(function (s) {
    var ok = parts.some(function (p) { return p.v > 0 && s.fit.indexOf(p.l) >= 0; });
    var badge = ok ? '<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(200,168,75,0.2);color:var(--gold)">与持仓相关</span>' : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-weight:700;color:var(--text);font-size:13px">' + s.n + '</span>' + badge + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">参考 APY ' + s.apy + ' · ' + s.note + '</div></div>';
  }).join('');
}

function wwTokenUnlockCalendarPopulate() {
  var host = document.getElementById('wwUnlockCalendarBody');
  if (!host) return;
  var rows = [
    { proj: 'Arbitrum', tok: 'ARB', when: '2026-05-16', amt: '约 1.1B 代币', note: '团队与投资人解锁批次（示例）' },
    { proj: 'Optimism', tok: 'OP', when: '2026-06-30', amt: '约 3.8 亿 OP', note: '治理金库释放（示例）' },
    { proj: 'dYdX', tok: 'DYDX', when: '2026-08-01', amt: '投资人解锁', note: '请关注官方 changelog' },
    { proj: 'WorldToken 生态', tok: 'WTK', when: '2026-09-15', amt: '社区激励', note: '占位示例，非真实解锁计划' }
  ];
  host.innerHTML = rows.map(function (r) {
    return '<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
      '<span style="font-weight:700;color:var(--text)">' + r.proj + ' <span style="color:var(--gold)">' + r.tok + '</span></span>' +
      '<span style="font-size:12px;color:var(--green,#26a17b)">' + r.when + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + r.amt + ' · ' + r.note + '</div></div>';
  }).join('');
}

function wwIdentityPopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_identity_v1') || '{}'); } catch (e) { o = {}; }
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  if (a) a.value = o.ens || '';
  if (b) b.value = o.twitter || '';
  if (c) c.value = o.social2 || '';
}

function wwIdentitySave() {
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  var o = {
    ens: a ? String(a.value || '').trim().slice(0, 128) : '',
    twitter: b ? String(b.value || '').trim().slice(0, 64) : '',
    social2: c ? String(c.value || '').trim().slice(0, 128) : ''
  };
  try { localStorage.setItem('ww_identity_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('链上身份已保存（本机）', 'success', 2200);
}

function wwAnalyticsPopulate() {
  var heat = document.getElementById('wwAnalyticsHeatmap');
  var topEl = document.getElementById('wwAnalyticsTopTokens');
  var sumEl = document.getElementById('wwAnalyticsSummary');
  if (!heat || !topEl || !sumEl) return;
  var txs = [];
  try { txs = window._wwTxHistoryCache || []; } catch (e) { txs = []; }
  if (!Array.isArray(txs)) txs = [];
  var days = ['一', '二', '三', '四', '五', '六', '日'];
  var n = Math.max(1, txs.length);
  heat.innerHTML = days.map(function (d, i) {
    var h = Math.min(100, 18 + (n * (i + 3)) % 72);
    return '<div style="text-align:center"><div style="height:' + h + 'px;border-radius:8px;background:linear-gradient(180deg,rgba(200,168,75,0.55),rgba(200,168,75,0.12));margin-bottom:4px"></div><div style="font-size:10px;color:var(--text-muted)">周' + d + '</div></div>';
  }).join('');
  var byCoin = {};
  txs.forEach(function (tx) {
    var k = String(tx.coin || '—');
    byCoin[k] = (byCoin[k] || 0) + 1;
  });
  var sorted = Object.keys(byCoin).sort(function (a, b) { return (byCoin[b] || 0) - (byCoin[a] || 0); });
  if (!sorted.length) {
    topEl.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无交易缓存：请返回首页并点击「刷新」加载最近交易。</div>';
    sumEl.textContent = '';
    return;
  }
  topEl.innerHTML = sorted.slice(0, 6).map(function (k) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<span style="font-weight:600;color:var(--text)">' + k + '</span>' +
      '<span style="font-size:12px;color:var(--gold)">' + byCoin[k] + ' 笔</span></div>';
  }).join('');
  var inC = 0, outC = 0;
  txs.forEach(function (tx) {
    var t = String(tx.type || '');
    if (t.indexOf('入') >= 0 || t.indexOf('收') >= 0) inC++;
    else if (t.indexOf('出') >= 0 || t.indexOf('转') >= 0) outC++;
  });
  sumEl.innerHTML = '共分析 <b style="color:var(--text)">' + txs.length + '</b> 条缓存记录。方向概览：转入类约 ' + inC + ' 条，转出类约 ' + outC + ' 条（基于类型文本启发式）。';
}

function wwOpenDexUniswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.uniswap.org/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.uniswap.org/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 Uniswap 使用 WalletConnect 连接与上述相同的地址', 'info', 3600);
}

function wwOpenDexSunswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://sunswap.com/#/home', '_blank', 'noopener,noreferrer');
    else location.href = 'https://sunswap.com/#/home';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 SunSwap 使用 TronLink / WalletConnect', 'info', 3200);
}

function wwOpenDexOneinch() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.1inch.io/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.1inch.io/';
  } catch (e) {}
}

function wwSocialRecoveryRender() {
  var list = document.getElementById('wwSocialContactsList');
  if (!list) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || ar.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:12px">暂无联系人，点击下方添加</div>';
    return;
  }
  list.innerHTML = ar.map(function (c, i) {
    var name = (c && c.name) ? String(c.name) : '未命名';
    var note = (c && c.note) ? String(c.note) : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
      '<div><div style="font-weight:700;color:var(--text);font-size:14px">' + name.replace(/</g, '') + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;word-break:break-all">' + note.replace(/</g, '') + '</div></div>' +
      '<span style="font-size:12px;color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwSocialRemoveContact===\'function\')wwSocialRemoveContact(' + i + ')">删除</span></div>';
  }).join('');
}
function wwSocialAddContactPrompt() {
  var name = prompt('联系人称呼');
  if (name === null) return;
  var note = prompt('备注（电话 / 邮箱 / 线下约定等，仅本机）', '');
  if (note === null) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar)) ar = [];
  ar.push({ name: String(name).trim() || '未命名', note: String(note || '').trim() });
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) {}
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialRemoveContact(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_social_contacts_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_social_contacts_v1', JSON.stringify(ar)); } catch (e2) {}
  wwSocialRecoveryRender();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
function wwSocialSaveFromUI() {
  if (typeof showToast === 'function') showToast('联系人已保存在本机', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}

// ── 交易历史 ──────────────────────────────────────────────────
async function loadTxHistory() {
  if(!REAL_WALLET) return;
  const el = document.getElementById('txHistoryList');
  if(!el) return;
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">⏳ 加载中...</div>';

  try {
    const txs = [];

    // TRX 转账记录
    const trxAddr = REAL_WALLET.trxAddress;
    if(trxAddr && trxAddr.startsWith('T')) {
      const r1 = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}/transactions/trc20?limit=10&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`);
      const d1 = await r1.json();
      if(d1.data) {
        for(const tx of d1.data.slice(0,5)) {
          const isOut = tx.from === trxAddr;
          const amt = (parseInt(tx.value) / 1e6).toFixed(2);
          txs.push({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'USDT',
            amount: (isOut?'-':'+') + amt,
            addr: isOut ? tx.to : tx.from,
            time: new Date(tx.block_timestamp).toLocaleDateString('zh-CN'),
            hash: tx.transaction_id,
            color: isOut ? '#e05c5c' : '#26a17b'
          });
        }
      }

      // TRX 原生交易
      const r2 = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}/transactions?limit=5&only_confirmed=true`);
      const d2 = await r2.json();
      if(d2.data) {
        for(const tx of d2.data.slice(0,3)) {
          const contract = tx.raw_data?.contract?.[0];
          if(contract?.type !== 'TransferContract') continue;
          const val = contract.parameter?.value;
          if(!val) continue;
          const isOut = val.owner_address && TronWeb?.address?.fromHex(val.owner_address) === trxAddr;
          const amt = ((val.amount||0) / 1e6).toFixed(2);
          txs.push({
            icon: isOut ? '📤' : '📥',
            type: isOut ? '转出' : '转入',
            coin: 'TRX',
            amount: (isOut?'-':'+') + amt,
            addr: val.to_address ? (typeof TronWeb!=='undefined'?TronWeb.address.fromHex(val.to_address):val.to_address) : '',
            time: new Date(tx.raw_data.timestamp).toLocaleDateString('zh-CN'),
            hash: tx.txID,
            color: isOut ? '#e05c5c' : '#e84142'
          });
        }
      }
    }

    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) {}
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }
    try { window._wwTxHistoryCache = txs; } catch (_c2) {}
    try { if (typeof wwCheckWhaleTxHistory === 'function') wwCheckWhaleTxHistory(txs); } catch (_wh) {}
    renderTxHistoryFromCache();

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


// ── 礼物记录 ──────────────────────────────────────────────────
function loadHbRecords() {
  const el = document.getElementById('hbRecordsList');
  if(!el) return;

  const allHb = JSON.parse(localStorage.getItem('ww_hongbaos') || '{}');
  const list = Object.values(allHb).sort((a,b) => b.createdAt - a.createdAt);

  if(list.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px"><div class="u10">🎁</div>暂无礼物记录</div>';
    return;
  }

  const now = Date.now();
  el.innerHTML = list.map(hb => {
    const claimed = hb.claimed?.length || 0;
    const total = hb.count || 1;
    const pct = Math.round(claimed / total * 100);
    const expired = now > hb.expireAt;
    const fullyClaimed = claimed >= total;
    const timeAgo = formatTimeAgo(hb.createdAt);
    const statusText = fullyClaimed ? '🏆 已领完' : expired ? '⏰ 已过期' : `${claimed}/${total} 已领取`;
    const statusColor = fullyClaimed ? 'var(--gold)' : expired ? 'var(--text-muted)' : 'var(--green,#26a17b)';
    const opacity = (expired || fullyClaimed) ? '0.7' : '1';
    const typeLabel = hb.type === 'lucky' ? '随机礼物' : '普通礼物';

    return `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:10px;opacity:${opacity}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${fullyClaimed||expired?'0':'10px'}">
          <span style="font-size:28px">🎁</span>
          <div class="u4">
            <div style="font-size:14px;font-weight:600;color:var(--text)">${hb.keyword}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${typeLabel} · ${timeAgo}${expired?' · 已过期':''}</div>
          </div>
          <div class="u6">
            <div style="font-size:14px;font-weight:600;color:var(--gold)">${hb.totalAmount} USDT</div>
            <div style="font-size:11px;color:${statusColor}">${statusText}</div>
          </div>
        </div>
        ${!fullyClaimed && !expired ? `
        <div style="background:var(--bg3);border-radius:6px;height:4px;overflow:hidden">
          <div style="background:linear-gradient(90deg,#c8a84b,#f0d070);height:100%;width:${pct}%;border-radius:6px;transition:width 0.5s"></div>
        </div>` : ''}
        ${hb.claimed && hb.claimed.length > 0 ? `
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
          ${hb.claimed.map((cl, i) => `
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);padding:2px 0">
            <span>第 ${i+1} 个：${cl.addr.slice(0,8)}...${cl.addr.slice(-4)}</span>
            <span style="color:var(--gold)">+${parseFloat(cl.amount).toFixed(2)} USDT</span>
          </div>`).join('')}
        </div>` : ''}
      </div>
    `;
  }).join('');

  el.innerHTML += '<div style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:10px;padding-bottom:20px">· 共 ' + list.length + ' 条记录 ·</div>';
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if(d > 0) return d + '天前';
  if(h > 0) return h + '小时前';
  if(m > 0) return m + '分钟前';
  return '刚刚';
}



// ── 安全 getElementById（防止 null 导致崩溃）──────────────────────
const _origGetEl = document.getElementById.bind(document);
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

// ── 余额查询 ──────────────────────────────────────────────────
let priceCache = null;
let priceCacheTime = 0;

function drawHomeBalanceChart(totalUsd) {
  const wrap = document.getElementById('homeBalanceChartWrap');
  const svg = document.getElementById('homeBalanceChartSvg');
  const foot = document.getElementById('homeBalanceChartFoot');
  if(!wrap || !svg) return;
  const t = Number(totalUsd);
  if(!t || t <= 0 || !isFinite(t)) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  const days = ['6天前','5天前','4天前','3天前','2天前','昨天','今天'];
  const seed = Math.abs(Math.sin((t % 1000) * 13.37));
  const pts = [];
  for(let i = 0; i < 7; i++) {
    const wobble = (i - 3) * 0.014 + (seed - 0.5) * 0.045;
    pts.push(Math.max(0, t * (1 + wobble)));
  }
  pts[6] = t;
  const min = Math.min.apply(null, pts) * 0.997;
  const max = Math.max.apply(null, pts) * 1.003;
  const W = 320, H = 72, padY = 8;
  const range = max - min || 1;
  const coords = pts.map(function(p, i) {
    const x = (i / (pts.length - 1)) * (W - 8) + 4;
    const y = padY + (1 - (p - min) / range) * (H - padY * 2);
    return [x, y];
  });
  let d = 'M ' + coords[0][0] + ',' + coords[0][1];
  for(let i = 1; i < coords.length; i++) d += ' L ' + coords[i][0] + ',' + coords[i][1];
  const area = 'M' + coords[0][0] + ',' + H + ' ' + coords.map(function(c) { return c[0] + ',' + c[1]; }).join(' ') + ' L' + coords[coords.length - 1][0] + ',' + H + ' Z';
  svg.innerHTML = '<defs><linearGradient id="hmChartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(200,168,75,0.38)"/><stop offset="100%" stop-color="rgba(200,168,75,0)"/></linearGradient></defs><path d="' + area + '" fill="url(#hmChartGrad)"/><path d="' + d + '" fill="none" stroke="rgba(232,200,80,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  if(foot) foot.innerHTML = '<span>' + days[0] + '</span><span>' + days[6] + '</span>';
}

async function getPrices() {
  if(priceCache && Date.now() - priceCacheTime < 5*60*1000) return priceCache;
  try {
    // CoinGecko 免费价格 API（无需 key）
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum,bitcoin&vs_currencies=usd');
    const data = await res.json();
    priceCache = {
      usdt: data.tether?.usd || 1,
      trx: data.tron?.usd || 0.12,
      eth: data.ethereum?.usd || 3200,
      btc: data.bitcoin?.usd || 60000,
    };
    priceCacheTime = Date.now();
    return priceCache;
  } catch(e) {
    return { usdt: 1, trx: 0.12, eth: 3200, btc: 60000 };
  }
}

async function loadBalances() {
  if (!REAL_WALLET) return;
  if (!REAL_WALLET.ethAddress && !REAL_WALLET.trxAddress && !REAL_WALLET.btcAddress) return;
  const tbd = document.getElementById('totalBalanceDisplay');
  const tbs = document.getElementById('totalBalanceSub');
  if(tbd) tbd.classList.add('home-balance--loading');
  if(tbs) tbs.textContent = '同步中…';
  
  const btn = _safeEl('balRefreshBtn');
  if(btn) btn.textContent = '查询中...';
  
  // 更新标签为加载中
  ['balUsdt'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '...';
  });

  try {
    const [prices] = await Promise.all([getPrices()]);
    
    // 查询 TRX 余额（TronGrid 免费 API）；无 TRX 地址则跳过
    const trxAddr = REAL_WALLET.trxAddress;
    const ethAddr = REAL_WALLET.ethAddress;
    
    let usdtBal = 0, trxBal = 0, ethBal = 0;

    // TRX 余额
    if (trxAddr) {
      try {
        const trxRes = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}`, {
          headers: { 'TRON-PRO-API-KEY': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' } // 建议在 trongrid.io 申请免费 key
        });
        const trxData = await trxRes.json();
        if(trxData.data && trxData.data[0]) {
          trxBal = (trxData.data[0].balance || 0) / 1e6;
          // USDT TRC-20 余额
          const trc20 = trxData.data[0].trc20 || [];
          const usdtToken = trc20.find(t => Object.keys(t)[0] === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
          if(usdtToken) usdtBal = parseInt(Object.values(usdtToken)[0]) / 1e6;
        }
      } catch(e) { console.log('TRX query failed:', e); }
    }

    // ETH 余额（公共 RPC）
    if (ethAddr) {
      try {
        const ethRes = await fetch('https://eth.llamarpc.com', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({jsonrpc:'2.0',method:'eth_getBalance',params:[ethAddr,'latest'],id:1})
        });
        const ethData = await ethRes.json();
        if(ethData.result) ethBal = parseInt(ethData.result, 16) / 1e18;
      } catch(e) { console.log('ETH query failed:', e); }
    }

    // 更新UI
    const fmt = (n) => n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(4);
    const fmtUsd = (n) => '$' + (n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(2));

    // BTC 余额（BlockCypher 免费API，从助记词派生BTC地址）
    let btcBal = 0, btcAddr = '';
    try {
      // 从 ETH 地址派生 BTC 地址（简化：用 Blockchain.info 查询）
      // 由于BTC地址派生复杂，暂时尝试查询（如有BTC地址）
      if(REAL_WALLET.btcAddress) {
        btcAddr = REAL_WALLET.btcAddress;
        // BTC 余额查询（使用 mempool.space，更稳定）
        const btcRes = await fetch(`https://mempool.space/api/address/${btcAddr}`);
        const btcData = await btcRes.json();
        btcBal = ((btcData.chain_stats?.funded_txo_sum || 0) - (btcData.chain_stats?.spent_txo_sum || 0)) / 1e8;
      }
    } catch(e) { console.log('BTC query skipped'); }

    const usdtUsd = usdtBal * prices.usdt;
    const trxUsd = trxBal * prices.trx;
    const ethUsd = ethBal * prices.eth;
    const btcUsd = btcBal * (prices.btc || 60000);
    const total = usdtUsd;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('balUsdt', fmt(usdtBal));
    set('valUsdt', fmtUsd(usdtUsd));
    // 更新涨跌幅（从 CoinGecko 获取）
    try {
      const r2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd&include_24hr_change=true');
      const d2 = await r2.json();
      const fmtChg = (v) => (v>0?'+':'')+v.toFixed(2)+'%';
      if(d2.tether?.usd_24h_change!==undefined) set('chgUsdt', fmtChg(d2.tether.usd_24h_change));
    } catch(e) {}
    if(tbd) tbd.classList.remove('home-balance--loading');
    animateHomeUsdTo(total, fmtUsd);
    window._lastTotalUsd = total;
    drawHomeBalanceChart(total);
    if(typeof drawPortfolioPieChart==='function') drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd);
    if(typeof refreshHomePriceTicker==='function') refreshHomePriceTicker();
    // 动态汇率（从价格接口获取，fallback 7.2）
  const cnyRate = window._cnyRate || 7.2;
  set('totalBalanceSub', '≈ ' + (total * cnyRate).toFixed(0) + ' CNY · 实时价格');
  // 尝试获取实时汇率
  if(!window._cnyRate) {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(r=>r.json()).then(d=>{ window._cnyRate = d.rates?.CNY || 7.2; })
      .catch(()=>{});
  }

    // ── 同步 COINS 余额（兑换页使用）──
    COINS.forEach(coin => {
      if(coin.id === 'usdt') { coin.bal = usdtBal; coin.price = prices.usdt || 1; }
      else if(coin.id === 'trx') { coin.bal = trxBal; coin.price = prices.trx || 0.12; }
      else if(coin.id === 'eth') { coin.bal = ethBal; coin.price = prices.eth || 2500; }
      else if(coin.id === 'btc') { coin.bal = btcBal; coin.price = prices.btc || 60000; }
    });
    renderSwapUI(); calcSwap();
    
    if(btn) btn.textContent = '刷新';
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
    if(typeof loadTrxResource==='function') loadTrxResource();
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────
let newsLoading = false;
let newsCache = null;
let newsCacheTime = 0;

async function loadNews() {
  // 备用新闻源列表（allorigins代理）
  const RSS_SOURCES = [
    'https://api.allorigins.win/get?url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F',
    'https://api.allorigins.win/get?url=https%3A%2F%2Fcointelegraph.com%2Frss',
    'https://api.allorigins.win/get?url=https%3A%2F%2Fdecrypt.co%2Ffeed',
  ];
  if(newsLoading) return;
  const list = document.getElementById('newsList');
  if(!list) return;
  if(newsCache && Date.now() - newsCacheTime < 5 * 60 * 1000) {
    renderNews(newsCache);
    return;
  }
  newsLoading = true;
  list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted)"><div class="u10">⏳</div><div style="font-size:13px">加载中...</div></div>';
  try {
    // 使用 allorigins 代理绕过 CORS，抓取 CoinDesk RSS
    const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/');
    const res = await fetch(proxyUrl);
    const data = await res.json();
    // 解析 RSS XML
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = xml.querySelectorAll('item');
    newsCache = Array.from(items).slice(0,20).map(item => ({
      title: item.querySelector('title')?.textContent || '',
      url: item.querySelector('link')?.textContent || item.querySelector('guid')?.textContent || '',
      source: {title: 'CoinDesk'},
      published_at: item.querySelector('pubDate')?.textContent || ''
    }));
    newsCacheTime = Date.now();
    renderNews(newsCache);
  } catch(e) {
    console.log('News load failed:', e);
    list.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-muted)"><div class="u10">😕</div><div style="font-size:13px;margin-bottom:16px">加载失败，请点下方链接阅读</div></div>';
  }
  newsLoading = false;
}

function renderNews(items) {
  const list = document.getElementById('newsList');
  if(!list || !items.length) return;
  
  list.innerHTML = '';
  items.forEach(item => {
    const time = item.published_at ? new Date(item.published_at).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
    const source = item.source?.title || item.domain || '';
    const coins = (item.currencies || []).slice(0,3).map(c => 
      `<span style="background:rgba(200,168,75,0.12);border:1px solid rgba(200,168,75,0.2);border-radius:6px;padding:2px 6px;font-size:10px;color:var(--gold)">${c.code}</span>`
    ).join('');
    
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;cursor:pointer;transition:all 0.15s';
    div.innerHTML = `
      <div style="font-size:14px;font-weight:600;color:var(--text);line-height:1.5;margin-bottom:8px">${item.title}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div class="u11">
          <span style="font-size:11px;color:var(--text-muted)">${source}</span>
          ${time ? '<span style="font-size:10px;color:var(--text-dim)">· ' + time + '</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${coins}</div>
      </div>
    `;
    div.onclick = () => {
      if(item.url) window.open(item.url, '_blank');
    };
    list.appendChild(div);
  });
}


// 切换助记词词数：从熵重新生成全新 BIP39 助记词（不截断旧词），并立即刷新网格
async function changeMnemonicLength(n) {
  const wordCount = parseInt(n, 10) || 12;
  if (![12, 15, 18, 21, 24].includes(wordCount)) return;
  currentMnemonicLength = wordCount;
  // 同步下拉框
  const sel = document.getElementById('mnemonicLength');
  if (sel) {
    sel.value = String(wordCount);
    sel.selectedIndex = [12,15,18,21,24].indexOf(wordCount);
  }
  // 重新生成指定词数的钱包
  showWalletLoading();
  try {
    await createRealWallet(wordCount);
    if (typeof updateRealAddr === 'function') updateRealAddr();
    if (typeof renderKeyGrid === 'function') renderKeyGrid();
  } catch(e) {
    if (typeof showToast === 'function') showToast('生成失败: ' + (e&&e.message||e), 'error');
  } finally {
    hideWalletLoading();
  }
}


// ── 助记词验证 ──────────────────────────────────────────────
var verifyAnswers = {}; // {position: correctWord}

function startVerify() {
  // 直接用 REAL_WALLET.words（由 renderKeyGrid 设置的当前显示词）
  let words;
  if(REAL_WALLET && REAL_WALLET.words && REAL_WALLET.words.length >= 12) {
    words = REAL_WALLET.words.slice();
  } else {
    // fallback：从当前语言演示词库随机取词（词数优先 currentMnemonicLength，不依赖可能被恢复的下拉框）
    var nPick = 12;
    if ([12, 15, 18, 21, 24].includes(currentMnemonicLength)) {
      nPick = currentMnemonicLength;
    } else {
      var _selV = document.getElementById('mnemonicLength');
      if (_selV && _selV.value) {
        var _pv = parseInt(_selV.value, 10);
        if ([12, 15, 18, 21, 24].includes(_pv)) nPick = _pv;
      }
    }
    var _wlK = typeof getMnemonicWordlistLang === 'function' ? getMnemonicWordlistLang(currentLang) : (currentLang === 'en' ? 'en' : 'zh');
    const pool = (typeof WT_WORDLISTS !== 'undefined' && WT_WORDLISTS[_wlK] && WT_WORDLISTS[_wlK].length)
      ? WT_WORDLISTS[_wlK]
      : (SAMPLE_KEYS[currentLang] || SAMPLE_KEYS.zh);
    const indices = [];
    while(indices.length < nPick) {
      const idx = Math.floor(Math.random() * pool.length);
      if(!indices.includes(idx)) indices.push(idx);
    }
    words = indices.map(i => pool[i]);
    if(!REAL_WALLET) window.REAL_WALLET = {};
    REAL_WALLET.words = words;
    REAL_WALLET.mnemonic = words.join(' ');
    saveWallet(REAL_WALLET);
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
    const val = input ? input.value.trim().toLowerCase() : '';
    const correct = verifyAnswers[pos].toLowerCase();
    if(val !== correct) {
      allCorrect = false;
      if(input) input.style.color = '#ff6060';
    } else {
      if(input) input.style.color = '#4ac84a';
    }
  });
  
  if(allCorrect) {
    _safeEl('verifyError').style.display = 'none';
    // 验证通过，显示成功页
    if (typeof markBackupDone === 'function') markBackupDone();
    updateAddr();
    goTo('page-verify-success');
    // 用户手动点按钮进入首页（已移除自动跳转）
  } else {
    _safeEl('verifyError').style.display = 'block';
    const vroot = document.getElementById('verifyShakeRoot');
    if(vroot) { vroot.classList.remove('wt-shake-wrong'); void vroot.offsetWidth; vroot.classList.add('wt-shake-wrong'); }
  }
}


async function _resumeWalletAfterUnlock() {
  // 解密敏感数据并临时注入 REAL_WALLET（须在进入首页 / 拉余额前完成，避免竞态）
  var pin = wwGetSessionPin();
  if (pin && REAL_WALLET && REAL_WALLET.hasEncrypted && !REAL_WALLET.privateKey) {
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
  updateAddr();
  const tb = document.getElementById('tabBar');
  if(tb) tb.style.display = 'flex';
  setTimeout(loadBalances, 500);
  if(window._wwUnlockPreservePage) {
    window._wwUnlockPreservePage = false;
    window._wwForceIdleLock = false;
    try { wwResetActivityClock(); } catch(e) {}
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
function wwRefreshAntiPhishOnPinUnlock() {
  var w = '';
  try { w = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
  var el = document.getElementById('wwAntiPhishBadge');
  if (!el) return;
  if (!w) { el.style.display = 'none'; el.textContent = ''; return; }
  el.style.display = 'block';
  el.textContent = '防钓鱼口令：' + w;
}
function wwOpenAntiPhishDialog() {
  var cur = '';
  try { cur = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
  var t = prompt('设置防钓鱼口令（解锁界面会显示，用于识别仿冒应用）\n留空则清除', cur);
  if (t === null) return;
  t = String(t).trim();
  if (t === '') {
    try { localStorage.removeItem('ww_antiphish_word'); } catch (e) {}
    if (typeof showToast === 'function') showToast('已清除防钓鱼口令', 'info');
  } else {
    try { localStorage.setItem('ww_antiphish_word', t.slice(0, 32)); } catch (e) {}
    if (typeof showToast === 'function') showToast('已保存防钓鱼口令', 'success');
  }
  wwRefreshAntiPhishOnPinUnlock();
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
}
async function wwExportEncryptedCloudBackup() {
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  var pass = prompt('设置加密密码（请牢记，用于解密此备份）');
  if (!pass) return;
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var out = { v: 1, kind: 'ww_cloud_backup', salt: wwB64Bytes(salt), iv: wwB64Bytes(iv), data: wwB64Bytes(new Uint8Array(ct)) };
    var txt = JSON.stringify(out);
    try {
      await navigator.clipboard.writeText(txt);
      if (typeof showToast === 'function') showToast('加密备份已复制到剪贴板，可粘贴到邮件或云笔记', 'success');
    } catch (e) {
      prompt('复制加密备份（手动全选复制）', txt);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('导出失败：' + (e && e.message ? e.message : String(e)), 'error');
  }
}
async function wwExportEncryptedKeyBackup() {
  if (!REAL_WALLET || !REAL_WALLET.enMnemonic) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  if (!window.confirm('将导出含助记词的加密文本。若密码泄露，资产将面临风险。仅保存到可信位置，切勿与密码同存一处。确定继续？')) return;
  var pass = prompt('设置加密密码（请牢记，用于在其他设备解密此备份）');
  if (!pass) return;
  if (String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位密码', 'warning'); return; }
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      kind: 'ww_key_payload',
      enMnemonic: REAL_WALLET.enMnemonic,
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var out = { v: 1, kind: 'ww_key_backup', salt: wwB64Bytes(salt), iv: wwB64Bytes(iv), data: wwB64Bytes(new Uint8Array(ct)) };
    var txt = JSON.stringify(out);
    try {
      await navigator.clipboard.writeText(txt);
      if (typeof showToast === 'function') showToast('含助记词加密备份已复制，请离线妥善保管', 'success');
    } catch (e) {
      prompt('复制加密备份（手动全选复制）', txt);
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('导出失败：' + (e && e.message ? e.message : String(e)), 'error');
  }
}
function renderWwChartsPlaceholder() {
  var host = document.getElementById('wwCandleBars');
  if (!host) return;
  host.innerHTML = '';
  var n = 28;
  for (var i = 0; i < n; i++) {
    var h = 36 + Math.random() * 58;
    var up = Math.random() > 0.42;
    var col = up ? '#26a17b' : '#e74c3c';
    var wick = 10 + Math.random() * 20;
    var d = document.createElement('div');
    d.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;flex:1;min-width:0;max-width:12px';
    d.innerHTML = '<div style="width:2px;height:' + wick + '%;background:rgba(255,255,255,0.22);margin-bottom:2px"></div><div style="width:72%;height:' + h + '%;background:' + col + ';border-radius:2px;opacity:0.92"></div>';
    host.appendChild(d);
  }
}

function continueAfterPinCheck() {
  if (!wwHasPinConfigured()) { void _resumeWalletAfterUnlock(); return; }
  const ov = document.getElementById('pinUnlockOverlay');
  const inp = document.getElementById('pinUnlockInput');
  const err = document.getElementById('pinUnlockError');
  if(ov && inp) {
    inp.value = '';
    if(err) err.style.display = 'none';
    ov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap) {}
    setTimeout(() => { try { inp.focus(); } catch(e) {} }, 200);
  } else {
    void _resumeWalletAfterUnlock();
  }
}
async function submitPageRestorePin() {
  const inp = document.getElementById('pinRestorePageInput');
  const err = document.getElementById('pageRestorePinError');
  const panel = document.getElementById('pageRestorePinPanel');
  if (!wwHasPinConfigured()) {
    if (err) { err.textContent = '尚未在本机设置 PIN，请先创建或导入钱包并完成 PIN 设置'; err.style.display = 'block'; }
    if (inp) inp.value = '';
    if (panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    return;
  }
  const got = inp ? String(inp.value).trim() : '';
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    wwSetSessionPin(got);
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
  const got = inp ? inp.value.trim() : '';
  const ov = document.getElementById('pinUnlockOverlay');
  const err = document.getElementById('pinUnlockError');
  const panel = document.getElementById('pinUnlockPanel');
  var ok = typeof verifyPin === 'function' ? await verifyPin(got) : false;
  if (ok) {
    wwSetSessionPin(got);
    if(ov) ov.classList.remove('show');
    if(typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      await _resumeWalletAfterUnlock();
    }
  } else {
    if(err) { err.textContent = 'PIN错误'; err.style.display = 'block'; }
    if(panel) { panel.classList.remove('wt-shake-wrong'); void panel.offsetWidth; panel.classList.add('wt-shake-wrong'); }
    if(inp) inp.value = '';
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
function checkWwAirdrop() {
  try {
    var u = 'https://worldtoken.cc/';
    if (typeof window !== 'undefined' && window.open) {
      window.open(u, '_blank', 'noopener,noreferrer');
    } else {
      location.href = u;
    }
  } catch (e) {}
  if (typeof showToast === 'function') showToast('已在浏览器打开官网，可在站内查看活动与公告', 'info', 2800);
}

async function openPinSettingsDialog() {
  const cur = wwGetSessionPin() || '';
  const a = prompt('设置 6 位数字 PIN（留空则清除 PIN）', cur);
  if(a === null) return;
  const t = a.trim();
  if(t === '') {
    wwClearSessionPin();
    try {
      localStorage.removeItem('ww_unlock_pin');
      localStorage.removeItem('ww_pin');
      localStorage.removeItem('ww_pin_hash');
      localStorage.removeItem('ww_pin_set');
      localStorage.removeItem('ww_totp_secret');
      localStorage.removeItem('ww_totp_enabled');
    } catch(e) {}
    showToast('已清除 PIN', 'success');
    if(typeof updateSettingsPage==='function') updateSettingsPage();
    return;
  }
  if(!/^\d{6}$/.test(t)) { showToast('PIN 须为 6 位数字', 'error'); return; }
  try {
    if (typeof savePinSecure === 'function') await savePinSecure(t);
  } catch (e) {
    console.error(e);
    showToast('PIN 保存失败', 'error');
    return;
  }
  wwSetSessionPin(t);
  try { localStorage.setItem('ww_pin_set', '1'); } catch(e) {}
  showToast('PIN 已保存', 'success');
  if (typeof updateSettingsPage === 'function') updateSettingsPage();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if(typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
}

// 时钟
function updateTime() {
  const now=new Date();
  document.getElementById('statusTime').textContent=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
}
updateTime(); window._timeInterval = setInterval(updateTime,60000);
try {
  wwResetActivityClock();
  ['pointerdown','touchstart','keydown','scroll','click'].forEach(function(ev) {
    document.addEventListener(ev, function() { wwResetActivityClock(); }, { capture: true, passive: true });
  });
  setInterval(function() { try { wwTickIdleLock(); } catch(e) {} }, 15000);
  setInterval(function() { try { if (typeof wwRecurringTick === 'function') wwRecurringTick(); } catch(e) {} }, 60000);
  wwApplyIdleLockLabel();
} catch(e) {}
const lg=document.getElementById("welcomeLangGrid"); if(lg) lg.scrollTop=0;
try { var _ap0 = document.querySelector('.page.active'); applySeoForPage(_ap0 && _ap0.id ? _ap0.id : 'page-welcome'); applyOfflineState(); window.addEventListener('online', applyOfflineState); window.addEventListener('offline', applyOfflineState); } catch(e) {}
try { initBalancePrivacyToggle(); initScrollTopBtn(); initTabSwipeGesture(); } catch (e) {}

/* hash 路由由 wallet.ui.js 统一处理（含 wwEnsureInitialHashRoute）；勿重复注册，避免双次 goTo 与行为不一致 */

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  

(function(){
  function run(){
    if(window._wwPaintBoot) return;
    window._wwPaintBoot = true;
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        try { if(typeof updateHomeChainStrip==='function') updateHomeChainStrip(); } catch(e) {}
      });
    });
  }
  if(document.readyState==='complete') run();
  else window.addEventListener('load', run);
})();



// ── 刷新恢复当前页 ────────────────────────────────────────────────
(function() {
  // 只有主要 Tab 页面才恢复；且必须已有本地钱包地址。
  // 否则 goTo 会盖住默认的欢迎页、底栏隐藏，体感像「按钮全点不动」（sessionStorage 在 ?v= 测缓存时仍存在）。
  var ALLOW_RESTORE = ['page-home','page-addr','page-swap','page-settings'];
  try {
    var last = sessionStorage.getItem('ww_last_page');
    if (!last || !ALLOW_RESTORE.includes(last) || !document.getElementById(last)) return;
    var hasWallet = typeof wwWalletHasAnyChainAddress === 'function' && wwWalletHasAnyChainAddress(REAL_WALLET);
    if (!hasWallet) {
      try { sessionStorage.removeItem('ww_last_page'); } catch (_r) {}
      return;
    }
    setTimeout(function() { goTo(last); }, 50);
  } catch(_) {}
})();

(function wwClearStaleServiceWorkerCaches() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    regs.forEach(function(r) { r.update(); });
  });
  if (typeof caches === 'undefined' || !caches.keys) return;
  caches.keys().then(function(names) {
    names.forEach(function(name) {
      if (name !== 'worldtoken-v202604060428') caches.delete(name);
    });
  });
})();

// 防止在控制台输出敏感数据
(function wwSanitizeConsoleOutput() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const sanitize = function(obj) {
    if (obj === REAL_WALLET || (obj && typeof obj === 'object' && obj.privateKey)) {
      return '[SENSITIVE_DATA_FILTERED]';
    }
    if (typeof obj === 'string' && (obj.includes('privateKey') || obj.includes('mnemonic'))) {
      return '[SENSITIVE_DATA_FILTERED]';
    }
    return obj;
  };
  console.log = function() {
    return originalLog.apply(console, Array.from(arguments).map(sanitize));
  };
  console.error = function() {
    return originalError.apply(console, Array.from(arguments).map(sanitize));
  };
  console.warn = function() {
    return originalWarn.apply(console, Array.from(arguments).map(sanitize));
  };
})();
