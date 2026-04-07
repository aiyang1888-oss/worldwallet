// wallet.addr.js — 地址系统：多语言/渲染/复制

/** 万语地址初始化调试：initAddrWords 调用次数（仅日志） */
var __wanYuInitAddrWordsCallCount = 0;
/** 防止重复生成：已成功载入或生成 10 字 + 前后缀后设为 true */
var __wanYuAddrInitialized = false;
/** 防止 initAddrWords 重入（嵌套调用竞态） */
var __wanYuInitLock = false;

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

function updateRealAddr() {
  // 英语模式下更新地址显示为公链地址
  if(REAL_WALLET && REAL_WALLET.ethAddress) {
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
    const sa = document.getElementById('settingsAddr');
    if(sa) sa.textContent = REAL_WALLET.ethAddress;
  }
  if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
}

function updateAddr() {
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
  if(qp1 && !isEn) { qp1.textContent = nativeAddr; qp1.style.fontSize='12px'; qp1.style.letterSpacing='0'; }
  if(qp2 && !isEn) qp2.style.display = 'none';
  // swoosh 转账动画
  const sfp1 = _safeEl('swooshFromPart1');
  const sfp2 = _safeEl('swooshFromPart2');
  if(sfp1 && !isEn) { sfp1.textContent = nativeAddr; sfp1.style.fontSize='12px'; sfp1.style.letterSpacing='0'; }
  if(sfp2 && !isEn) sfp2.style.display = 'none';
  // 转账成功页
  const suc1 = _safeEl('successFromPart1');
  const suc2 = _safeEl('successFromPart2');
  if(suc1 && !isEn) { suc1.textContent = nativeAddr; suc1.style.fontSize='12px'; }
  if(suc2 && !isEn) suc2.style.display = 'none';
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

function randDigits(n) {
  let s = '';
  for(let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
}

/** 万语地址持久化：刷新/切页后必须与首次生成一致 */
function persistWanYuAddrToStorage() {
  try {
    if (typeof ADDR_WORDS === 'undefined' || !ADDR_WORDS.length) return;
    var preEl = document.getElementById('addrPrefix');
    var sufEl = document.getElementById('addrSuffix');
    var prefix = (preEl && preEl.textContent || '').replace(/\D/g, '').substring(0, 8).padStart(8, '0');
    var suffix = (sufEl && sufEl.textContent || '').replace(/\D/g, '').substring(0, 8).padStart(8, '0');
    if (!preEl || prefix.replace(/0/g, '') === '') {
      try {
        var lp = localStorage.getItem('wallet_prefix');
        if (lp) prefix = String(lp).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
      } catch (_p) {}
    }
    if (!sufEl || suffix.replace(/0/g, '') === '') {
      try {
        var ls = localStorage.getItem('wallet_suffix');
        if (ls) suffix = String(ls).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
      } catch (_s) {}
    }
    var slots = ADDR_WORDS.map(function (w) {
      return { word: w.word, lang: w.lang || 'zh', custom: !!w.custom };
    });
    var wordsJoin = ADDR_WORDS.map(function (w) { return w.word; }).join('');
    var native = prefix + '-' + wordsJoin + '-' + suffix;
    localStorage.setItem('wallet_native_addr', native);
    localStorage.setItem('wallet_prefix', prefix);
    localStorage.setItem('wallet_suffix', suffix);
    localStorage.setItem('wallet_addr_words', JSON.stringify(slots));
    var roundTrip = localStorage.getItem('wallet_native_addr') === native;
    console.log('[WanYuAddr] 保存地址到 localStorage:', {
      wallet_native_addr: native,
      wallet_prefix: prefix,
      wallet_suffix: suffix,
      wallet_addr_words: slots,
      roundTripOk: roundTrip
    });
    if (!roundTrip) console.warn('[WanYuAddr] localStorage 回读与写入不一致');
  } catch (e) {
    console.error('[WanYuAddr] persistWanYuAddrToStorage 失败:', e);
  }
}

function tryLoadWanYuAddrFromStorage() {
  try {
    if (typeof ADDR_WORDS === 'undefined') return false;
    var prefix = localStorage.getItem('wallet_prefix');
    var suffix = localStorage.getItem('wallet_suffix');
    var wj = localStorage.getItem('wallet_addr_words');
    var rawFull = localStorage.getItem('wallet_native_addr');
    console.log('[WanYuAddr] 从 localStorage 读取地址:', {
      prefix: prefix,
      suffix: suffix,
      words: wj,
      wallet_native_addr: rawFull
    });
    if ((!prefix || !suffix) && rawFull && String(rawFull).indexOf('-') >= 0) {
      var parts = String(rawFull).split('-');
      if (parts.length === 3) {
        prefix = prefix || String(parts[0]).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
        suffix = suffix || String(parts[2]).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
      }
    }
    if (!prefix || !suffix) return false;
    prefix = String(prefix).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
    suffix = String(suffix).replace(/\D/g, '').substring(0, 8).padStart(8, '0');
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
            var preEl2 = document.getElementById('addrPrefix');
            var sufEl2 = document.getElementById('addrSuffix');
            if (preEl2) preEl2.textContent = prefix;
            if (sufEl2) sufEl2.textContent = suffix;
            console.log('[WanYuAddr] 已从 wallet_native_addr 中段恢复 10 字');
            return true;
          }
        }
      }
      return false;
    }
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
    const sa = document.getElementById('settingsAddr');
    if (sa) { sa.textContent = addr; sa.style.cssText = 'font-size:10px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center;display:block'; }
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
  if (ADDR_WORDS.length > 0) return;
  initAddrWords();
}

// 万语地址中段：10 个随机汉字（每字独立抽取）；不使用 WW_WORDS_EXTRA 等地名词库
// SINGLE_CHARS.zh 在 wallet.ui.js 中定义，此处仅作脚本解析顺序兜底
var WW_ZH_ADDR_CHAR_FALLBACK =
  '龙凤虎鹤福寿禄喜财春夏秋冬金木水火土山川云月星日风雨雪天地人和日月星斗甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥东南西北' +
  '等的个多咕咚得到来更中一二三四五六七八九十百千万千大小国人心正开平安乐吉祥如意';

function randWanYuZhChar() {
  const pool = (typeof SINGLE_CHARS !== 'undefined' && SINGLE_CHARS.zh && SINGLE_CHARS.zh.length)
    ? SINGLE_CHARS.zh
    : WW_ZH_ADDR_CHAR_FALLBACK;
  return pool[Math.floor(Math.random() * pool.length)];
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
  var chip = document.getElementById('homeAddrChip');
  if (!chip) return;
  var isEn = currentLang === 'en';
  var goldStyle = 'color:#C8A84B;font-weight:700;letter-spacing:0.5px;';
  var dimStyle = 'color:rgba(255,255,255,0.45);font-size:10px;';
  if (isEn) {
    var seed = (typeof getNativeAddr === 'function' ? getNativeAddr() : '') + '|' + ((REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : ''));
    var midGold = _wwGoldMiddleTenFromNavigator(seed);
    var ca = String((REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : '--'));
    if (ca.length > 14 && ca !== '--') {
      var pre = ca.slice(0, 5);
      var suf = ca.slice(-5);
      chip.innerHTML = '<span style="' + dimStyle + '">' + _wwEsc(pre) + '</span><span style="' + goldStyle + '">' + _wwEsc(midGold) + '</span><span style="' + dimStyle + '">' + _wwEsc(suf) + '</span>';
    } else {
      chip.innerHTML = '<span style="' + goldStyle + '">' + _wwEsc(midGold) + '</span>';
    }
    chip.style.cssText = 'font-size:11px;letter-spacing:0.5px;color:#C8A84B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(100%,260px);text-align:center;display:block';
    return;
  }
  var prefix = _wanYuP8FromDomOrStorage(document.getElementById('addrPrefix'), 'wallet_prefix', '38294651');
  var suffix = _wanYuP8FromDomOrStorage(document.getElementById('addrSuffix'), 'wallet_suffix', '92847361');
  var midGold = ADDR_WORDS.length ? ADDR_WORDS.map(function(w) { return w.word; }).join('') : '';
  chip.innerHTML = '<span style="' + dimStyle + '">' + _wwEsc(prefix) + '</span><span style="' + dimStyle + '">-</span><span style="' + goldStyle + '">' + _wwEsc(midGold) + '</span><span style="' + dimStyle + '">-</span><span style="' + dimStyle + '">' + _wwEsc(suffix) + '</span>';
  chip.style.cssText = 'font-size:11px;letter-spacing:0.5px;color:#C8A84B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(100%,260px);text-align:center;display:block';
}

function initAddrWords() {
  if (__wanYuInitLock) return;
  __wanYuInitLock = true;
  try {
    __wanYuInitAddrWordsCallCount++;
    console.log('[WanYuAddr] initAddrWords 调用次数:', __wanYuInitAddrWordsCallCount, {
      addrWordsLen: typeof ADDR_WORDS !== 'undefined' ? ADDR_WORDS.length : -1,
      alreadyInit: __wanYuAddrInitialized
    });
    if (__wanYuAddrInitialized && ADDR_WORDS.length === 10) {
      renderAddrWords();
      return;
    }
    if (tryLoadWanYuAddrFromStorage()) {
      __wanYuAddrInitialized = true;
      renderAddrWords();
      persistWanYuAddrToStorage();
      syncNativeAddrDisplaysToAllViews();
      return;
    }
    ADDR_WORDS.length = 0;
    for (let i = 0; i < 10; i++) {
      ADDR_WORDS.push({ word: randWanYuZhChar(), lang: 'zh', custom: false });
    }
    var preEl = document.getElementById('addrPrefix');
    var sufEl = document.getElementById('addrSuffix');
    if (preEl) preEl.textContent = randDigits(8);
    if (sufEl) sufEl.textContent = randDigits(8);
    renderAddrWords();
    persistWanYuAddrToStorage();
    syncNativeAddrDisplaysToAllViews();
    __wanYuAddrInitialized = true;
  } finally {
    __wanYuInitLock = false;
  }
}

function renderAddrWords() {
  const container = document.getElementById('addrWords');
  if(!container) return;
  // 确保 suffix/prefix 只含8位数字
  const pre = document.getElementById('addrPrefix');
  const suf = document.getElementById('addrSuffix');
  if(pre) pre.textContent = (pre.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  if(suf) suf.textContent = (suf.textContent || '').replace(/\D/g,'').substring(0,8).padStart(8,'0');
  // 每个字符等宽盒子，定制字金色高亮，随机字淡紫
  let html = '';
  ADDR_WORDS.forEach(w => {
    if(w.custom) {
      html += `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;color:#f0d070;font-size:17px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)">${w.word}</span>`;
    } else {
      html += `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;color:#8888bb;font-size:16px">${w.word}</span>`;
    }
  });
  container.innerHTML = html;
  // 同步 addrMain
  const m = (_safeEl('addrMain') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* addrMain fallback */;
  if(m) m.textContent = ADDR_WORDS.map(w=>w.word).join('');
  // 同步 QR 高亮
  const qp1 = document.getElementById('qrPart1');
  if(qp1 && ADDR_WORDS.length) {
    const prefix = (document.getElementById('addrPrefix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    const suffix = (document.getElementById('addrSuffix')?.textContent || '').replace(/\D/g,'').substring(0,8);
    let html = `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${prefix}</span><span style="color:var(--text-muted);font-size:11px">-</span>`;
    ADDR_WORDS.forEach(w => {
      html += w.custom
        ? `<span style="color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)">${w.word}</span>`
        : `<span style="color:#8888bb;font-size:13px">${w.word}</span>`;
    });
    html += `<span style="color:var(--text-muted);font-size:11px">-</span><span style="color:var(--text-muted);font-family:monospace;font-size:11px">${suffix}</span>`;
    qp1.innerHTML = html;
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

  if(input.trim() === '') {
    // 随机一字（万语中段均为汉字单字池）
    ADDR_WORDS[idx] = {word: randWanYuZhChar(), lang: 'zh', custom: false};
  } else {
    ADDR_WORDS[idx] = {word: input.trim(), lang: w.lang, custom: true};
  }
  renderAddrWords();
  persistWanYuAddrToStorage();
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

function editHomeAddr() {
  tapHaptic(12);
  if (typeof goTab === 'function') goTab('tab-addr');
}

function getNativeAddr() {
  if(currentLang === 'en') return CHAIN_ADDR;
  try {
    var snap = localStorage.getItem('wallet_native_addr');
    if (snap && String(snap).split('-').length === 3 && ADDR_WORDS.length === 10) {
      var mid = String(snap).split('-')[1] || '';
      var valid = true;
      for (var j = 0; j < 10; j++) {
        if (!ADDR_WORDS[j] || String(ADDR_WORDS[j].word) !== mid.charAt(j)) {
          valid = false;
          break;
        }
      }
      if (valid) return snap;
    }
  } catch (_e) {}
  const prefix = _wanYuP8FromDomOrStorage(document.getElementById('addrPrefix'), 'wallet_prefix', '38294651');
  const suffix = _wanYuP8FromDomOrStorage(document.getElementById('addrSuffix'), 'wallet_suffix', '92847361');
  const words = ADDR_WORDS.length ? ADDR_WORDS.map(w=>w.word).join('') : '';
  return prefix + '-' + words + '-' + suffix;
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

function copyAllMnemonic(btn) {
  const words = [];
  var mnLang = (typeof keyMnemonicLang !== 'undefined' && keyMnemonicLang) ? keyMnemonicLang : 'zh';
  var wlKey = typeof getMnemonicWordlistLang === 'function' ? getMnemonicWordlistLang(mnLang) : (mnLang === 'en' ? 'en' : 'zh');
  const isEn = wlKey === 'en';
  if(isEn) {
    const mn = REAL_WALLET && REAL_WALLET.enMnemonic;
    if(mn) mn.split(' ').forEach(w => words.push(w));
  } else {
    const wl = WT_WORDLISTS[wlKey];
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

function copyQRAddr() {
  const native = getNativeAddr();
  const text = currentLang==='en'
    ? '⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr()
    : '🌍 万语地址\n'+native+'\n\n⛓️ 公链地址\nTRX: '+CHAIN_ADDR+'\nETH: '+getEthAddr()+'\nBTC: '+getBtcAddr();
  navigator.clipboard?.writeText(text).catch(()=>{});
  const btn = _safeEl('qrCopyBtn');
  if(btn) { btn.innerHTML='✅ 已复制'; setTimeout(()=>btn.innerHTML='📋 复制地址',1500); }
}
