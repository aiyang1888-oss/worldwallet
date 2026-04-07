// wallet.addr.js — 地址系统：多语言/渲染/复制

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
  // 初始化万语地址（如果还没初始化）
  if(ADDR_WORDS.length === 0) initAddrWords();
  else renderAddrWords();
  // 获取完整万语地址
  const nativeAddr = getNativeAddr();
  const shortAddr = nativeAddr.length > 16 ? nativeAddr.substring(0,8)+'...'+nativeAddr.slice(-4) : nativeAddr;
  // 首页芯片（中间段金色随机展示，见 renderHomeAddrChip）
  if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
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

function randDigits(n) {
  let s = '';
  for(let i=0;i<n;i++) s += Math.floor(Math.random()*10);
  return s;
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
  var seed = (typeof getNativeAddr === 'function' ? getNativeAddr() : '') + '|' + ((REAL_WALLET && REAL_WALLET.trxAddress) ? REAL_WALLET.trxAddress : (typeof CHAIN_ADDR !== 'undefined' ? CHAIN_ADDR : ''));
  var midGold = _wwGoldMiddleTenFromNavigator(seed);
  var goldStyle = 'color:#C8A84B;font-weight:700;letter-spacing:0.5px;';
  var dimStyle = 'color:rgba(255,255,255,0.45);font-size:10px;';
  if (isEn) {
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
  var prefix = (document.getElementById('addrPrefix') && document.getElementById('addrPrefix').textContent || '38294651').replace(/\D/g, '').substring(0, 8);
  var suffix = (document.getElementById('addrSuffix') && document.getElementById('addrSuffix').textContent || '92847361').replace(/\D/g, '').substring(0, 8);
  chip.innerHTML = '<span style="' + dimStyle + '">' + _wwEsc(prefix) + '</span><span style="' + goldStyle + '">' + _wwEsc(midGold) + '</span><span style="' + dimStyle + '">' + _wwEsc(suffix) + '</span>';
  chip.style.cssText = 'font-size:11px;letter-spacing:0.5px;color:#C8A84B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(100%,260px);text-align:center;display:block';
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
    // 首页芯片（中间段为 navigator 语言相关的 10 字/词，金色）
    if (typeof renderHomeAddrChip === 'function') renderHomeAddrChip();
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
    let html = `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${prefix}</span>`;
    ADDR_WORDS.forEach(w => {
      html += w.custom
        ? `<span style="color:#f0d070;font-size:14px;font-weight:700;text-shadow:0 0 6px rgba(240,208,112,0.5)">${w.word}</span>`
        : `<span style="color:#8888bb;font-size:13px">${w.word}</span>`;
    });
    html += `<span style="color:var(--text-muted);font-family:monospace;font-size:11px">${suffix}</span>`;
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
    // 随机
    const lang = randLang();
    ADDR_WORDS[idx] = {word: randWord(lang), lang, custom: false};
  } else {
    ADDR_WORDS[idx] = {word: input.trim(), lang: w.lang, custom: true};
  }
  renderAddrWords();
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
  const prefix = (document.getElementById('addrPrefix')?.textContent || '38294651').replace(/\D/g,'').substring(0,8);
  const suffix = (document.getElementById('addrSuffix')?.textContent || '92847361').replace(/\D/g,'').substring(0,8);
  const words = ADDR_WORDS.length ? ADDR_WORDS.map(w=>w.word).join('') : '';
  return prefix + words + suffix;
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
  var wlKey = typeof getMnemonicWordlistLang === 'function' ? getMnemonicWordlistLang(currentLang) : (currentLang === 'en' ? 'en' : 'zh');
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
