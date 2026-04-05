// wallet.tx.js — 交易：转账/余额/价格/历史

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

/**
 * 链上广播：使用 core/wallet.js 的 sendTx + core/security.js 的 decryptWalletSensitive
 */
async function broadcastRealTransfer() {
  if (!REAL_WALLET) {
    showToast('⚠️ 请先创建或导入钱包', 'warning');
    return false;
  }
  const addr = document.getElementById('transferAddr').value.trim();
  if (typeof wwTransferWhitelistCheck === 'function' && !wwTransferWhitelistCheck(addr)) {
    showToast('❌ 收款地址未通过「转账白名单」校验。请在 设置 → 转账白名单 中添加该地址或关闭白名单。', 'error');
    return false;
  }
  const amt = parseFloat(document.getElementById('transferAmount').value);
  const coin = transferCoin.id;

  var pin = '';
  try {
    pin = (localStorage.getItem('ww_pin') || '').trim();
  } catch (e) {}

  var ethKey = null;
  var trxKey = null;
  if (pin && typeof decryptWalletSensitive === 'function') {
    try {
      var sens = await decryptWalletSensitive(pin);
      if (sens) {
        ethKey = sens.ethKey || sens.privateKey;
        trxKey = sens.trxKey || sens.trxPrivateKey;
      }
    } catch (e) {
      console.error('[broadcastRealTransfer] decrypt', e);
    }
  }
  if (!ethKey && REAL_WALLET.privateKey) ethKey = REAL_WALLET.privateKey;
  if (!trxKey && REAL_WALLET.trxPrivateKey) trxKey = REAL_WALLET.trxPrivateKey;

  var chain = null;
  var pk = null;
  if (coin === 'usdt') {
    chain = 'usdt_trc20';
    pk = trxKey;
  } else if (coin === 'trx') {
    chain = 'trx';
    pk = trxKey;
  } else if (coin === 'eth') {
    chain = 'eth';
    pk = ethKey;
  } else {
    showToast('⚠️ 暂不支持 ' + transferCoin.name + ' 转账', 'warning');
    return false;
  }

  if (!pk) {
    showToast('❌ 无法获取私钥，请确认已设置 PIN 并解锁钱包', 'error');
    return false;
  }

  if (typeof sendTx !== 'function') {
    showToast('❌ 钱包核心未加载', 'error');
    return false;
  }

  try {
    var out = await sendTx(chain, addr, amt, pk);
    if (out && out.error) {
      showToast('❌ 转账失败: ' + out.error, 'error');
      return false;
    }
    var txHash = out && out.txHash;
    if (txHash) {
      try {
        if (typeof wwRecordSpendAfterBroadcast === 'function') wwRecordSpendAfterBroadcast(amt);
      } catch (_rs) {}
      _safeEl('successTxHash') &&
        ((_safeEl('successTxHash') || { textContent: '', style: {}, classList: { add: function () {}, remove: function () {} } }).textContent = txHash);
      _safeEl('successTxLink') &&
        (_safeEl('successTxLink').href =
          coin === 'eth' ? 'https://etherscan.io/tx/' + txHash : 'https://tronscan.org/#/transaction/' + txHash);
      return true;
    }
  } catch (e) {
    console.error('转账失败:', e);
    showToast('❌ 转账失败: ' + (e.message || e), 'error');
  }
  return false;
}

async function loadBalances() {
  if(!REAL_WALLET || !REAL_WALLET.trxAddress) return;
  const tbd = document.getElementById('totalBalanceDisplay');
  const tbs = document.getElementById('totalBalanceSub');
  if(tbd) tbd.classList.add('home-balance--loading');
  if(tbs) tbs.textContent = '同步中…';
  
  const btn = _safeEl('balRefreshBtn');
  if(btn) btn.textContent = '查询中...';
  
  // 更新标签为加载中
  ['balUsdt','balTrx','balEth','balBtc'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '...';
  });

  try {
    const [bal, prices] = await Promise.all([
      typeof getBalance === 'function'
        ? getBalance({
            eth: REAL_WALLET.ethAddress || '',
            trx: REAL_WALLET.trxAddress || ''
          })
        : Promise.resolve({ eth: 0, trx: 0, usdt: 0, btc: 0, totalUsd: 0 }),
      getPrices()
    ]);

    const usdtBal = bal.usdt;
    const trxBal = bal.trx;
    const ethBal = bal.eth;

    let btcBal = typeof bal.btc === 'number' && bal.btc > 0 ? bal.btc : 0;
    try {
      if (REAL_WALLET.btcAddress && !btcBal) {
        const btcRes = await fetch(`https://mempool.space/api/address/${REAL_WALLET.btcAddress}`);
        const btcData = await btcRes.json();
        btcBal = ((btcData.chain_stats?.funded_txo_sum || 0) - (btcData.chain_stats?.spent_txo_sum || 0)) / 1e8;
      }
    } catch(e) { console.log('BTC query skipped'); }

    const fmt = (n) => n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(4);
    const fmtUsd = (n) => '$' + (n >= 1 ? n.toLocaleString('en',{maximumFractionDigits:2}) : n.toFixed(2));

    const usdtUsd = usdtBal * prices.usdt;
    const trxUsd = trxBal * prices.trx;
    const ethUsd = ethBal * prices.eth;
    const btcUsd = btcBal * (prices.btc || 60000);
    const total = (typeof bal.totalUsd === 'number' ? bal.totalUsd : 0) + btcUsd;

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    set('balUsdt', fmt(usdtBal));
    set('valUsdt', fmtUsd(usdtUsd));
    set('balTrx', fmt(trxBal));
    set('valTrx', fmtUsd(trxUsd));
    set('balEth', fmt(ethBal));
    set('valEth', fmtUsd(ethUsd));
    // 更新涨跌幅（从 CoinGecko 获取）
    try {
      const r2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum&vs_currencies=usd&include_24hr_change=true');
      const d2 = await r2.json();
      const fmtChg = (v) => (v>0?'+':'')+v.toFixed(2)+'%';
      if(d2.tether?.usd_24h_change!==undefined) set('chgUsdt', fmtChg(d2.tether.usd_24h_change));
      if(d2.tron?.usd_24h_change!==undefined) set('chgTrx', fmtChg(d2.tron.usd_24h_change));
      if(d2.ethereum?.usd_24h_change!==undefined) set('chgEth', fmtChg(d2.ethereum.usd_24h_change));
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

    // BTC 显示
    if(btcBal > 0) {
      const btcRow = document.getElementById('btcAssetRow');
      if(btcRow) btcRow.style.display = 'flex';
      set('balBtc', btcBal.toFixed(6));
      set('valBtc', fmtUsd(btcUsd));
      COINS.forEach(c => { if(c.id==='btc') { c.bal = btcBal; c.price = prices.btc || 60000; } });
    }

    // ── 同步 COINS 余额（兑换页使用）──
    COINS.forEach(coin => {
      if(coin.id === 'usdt') { coin.bal = usdtBal; coin.price = prices.usdt || 1; }
      else if(coin.id === 'trx') { coin.bal = trxBal; coin.price = prices.trx || 0.12; }
      else if(coin.id === 'eth') { coin.bal = ethBal; coin.price = prices.eth || 2500; }
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

function getTransferFeeSpeed() {
  try {
    const s = localStorage.getItem('ww_transfer_fee_speed');
    if(s === 'slow' || s === 'normal' || s === 'fast') return s;
  } catch(e) {}
  return 'normal';
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

function txHistoryRowHtml(tx) {
  return `
      <div onclick="window.open((tx.coin==='eth'?'https://etherscan.io/tx/':'https://tronscan.org/#/transaction/')+tx.hash,'_blank')"
        style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:opacity 0.2s"
        onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${tx.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${tx.type} ${tx.coin}</div>
          <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${tx.addr.slice(0,8)}...${tx.addr.slice(-6)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:700;color:${tx.color}">${tx.amount}</div>
          <div style="font-size:10px;color:var(--text-muted)">${tx.time}</div>
        </div>
      </div>
    `;
}

function txHistoryFriendlyHtml(icon, title, hint) {
  return '<div class="tx-empty-friendly"><div class="tx-empty-icon" aria-hidden="true">' + icon + '</div><div class="tx-empty-title">' + title + '</div><div class="tx-empty-hint">' + hint + '</div></div>';
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

function applyTxHistoryFilter() {
  renderTxHistoryFromCache();
}
