#!/usr/bin/env python3
"""Social recovery (trusted contacts), daily spending limits with PIN override, whale alerts for monitored addresses — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-social-recovery"',
    'id="page-spending-limits"',
    'id="page-whale-alerts"',
    "function wwCheckWhaleTxHistory(",
    "function wwSpendGateBeforeConfirm(",
)


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    if all(m in raw for m in MARKERS):
        sz = DIST.stat().st_size
        lines = len(raw.splitlines())
        print(f"OK: already applied — {DIST} ({lines} lines, {sz} bytes)")
        if sz < 800_000:
            raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
        return

    # ── Settings: 3 new rows (after 防钓鱼) ───────────────────────────
    n_set = """          <div class="settings-row" onclick="if(typeof wwOpenAntiPhishDialog==='function')wwOpenAntiPhishDialog()">
            <span class="settings-icon">🪪</span>
            <span class="settings-label">防钓鱼口令</span>
            <span class="settings-value" id="settingsAntiPhishValue" style="font-size:11px;color:var(--text-muted)">未设置</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>


        <div id="wwPriceAlertSection" """
    i_set = """          <div class="settings-row" onclick="if(typeof wwOpenAntiPhishDialog==='function')wwOpenAntiPhishDialog()">
            <span class="settings-icon">🪪</span>
            <span class="settings-label">防钓鱼口令</span>
            <span class="settings-value" id="settingsAntiPhishValue" style="font-size:11px;color:var(--text-muted)">未设置</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-social-recovery')">
            <span class="settings-icon">🤝</span>
            <span class="settings-label">社交恢复</span>
            <span class="settings-value" id="settingsSocialRecoveryValue" style="font-size:11px;color:var(--text-muted)">联系人</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-spending-limits')">
            <span class="settings-icon">📉</span>
            <span class="settings-label">支出限额</span>
            <span class="settings-value" id="settingsSpendLimitValue" style="font-size:11px;color:var(--text-muted)">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-whale-alerts')">
            <span class="settings-icon">🐋</span>
            <span class="settings-label">巨鲸提醒</span>
            <span class="settings-value" id="settingsWhaleValue" style="font-size:11px;color:var(--text-muted)">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>


        <div id="wwPriceAlertSection" """
    if n_set not in raw:
        raise SystemExit("anchor anti-phish / wwPriceAlertSection not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: social / spend / whale (before 恢复演练) ───────────────
    n_pg = """      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """      </div>
    </div>

    <!-- 社交恢复（联系人仅本机保存） -->
    <div class="page" id="page-social-recovery">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">社交恢复</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:rgba(80,120,200,0.08);border:1px solid rgba(80,120,200,0.28);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.65;color:var(--text-muted)">
          <b style="color:var(--text)">说明</b>：在此记录可协助您保管分片或见证恢复的<b>信任联系人</b>（姓名与备注仅保存在本机，不会上传）。实际链上社交恢复需智能合约或多签方案；此处用于家庭/团队预案登记。
        </div>
        <div id="wwSocialContactsList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px"></div>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:13px;margin-bottom:10px" onclick="if(typeof wwSocialAddContactPrompt==='function')wwSocialAddContactPrompt()">＋ 添加信任联系人</button>
        <button type="button" class="btn-primary" style="width:100%;padding:12px;font-size:13px" onclick="if(typeof wwSocialSaveFromUI==='function')wwSocialSaveFromUI()">保存列表</button>
      </div>
    </div>

    <!-- 支出限额 -->
    <div class="page" id="page-spending-limits">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">支出限额</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:14px">按<b>美元估值</b>统计当日转出（与首页币种单价一致）。超出限额时需输入与本机相同的 6 位 PIN 以<b>单次放行</b>。</div>
        <label style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:14px;cursor:pointer;user-select:none">
          <input type="checkbox" id="wwSpendLimitEnable" style="accent-color:var(--gold);width:18px;height:18px" /> 启用每日限额
        </label>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">每日限额（USD 约值）</div>
        <input id="wwSpendLimitDailyUsd" type="number" step="any" min="0" placeholder="例如 500" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:15px;margin-bottom:14px" />
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.6">
          <div>今日已计：<strong id="wwSpendUsedDisplay">$0.00</strong></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">每日 UTC 自然日重置；成功广播后累计。</div>
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;font-size:14px" onclick="if(typeof wwSpendSaveFromUI==='function')wwSpendSaveFromUI()">保存</button>
      </div>
    </div>

    <!-- 巨鲸提醒 -->
    <div class="page" id="page-whale-alerts">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">巨鲸提醒</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-bottom:12px">当<b>交易记录</b>中出现与下列地址相关、且美元估值超过阈值的大额流水时，通过<b>浏览器通知</b>提醒（需授权通知）。</div>
        <label style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:12px;cursor:pointer;user-select:none">
          <input type="checkbox" id="wwWhaleEnable" style="accent-color:var(--gold);width:18px;height:18px" /> 启用巨鲸提醒
        </label>
        <label style="display:flex;align-items:center;gap:10px;font-size:13px;margin-bottom:14px;cursor:pointer;user-select:none">
          <input type="checkbox" id="wwWhaleSelf" style="accent-color:var(--gold);width:18px;height:18px" /> 同时提醒本人钱包的大额转出
        </label>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">阈值（USD）</div>
        <input id="wwWhaleThreshold" type="number" step="any" min="0" placeholder="例如 10000" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:15px;margin-bottom:12px" />
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">监控地址（每行一个，TRX / 0x）</div>
        <textarea id="wwWhaleAddresses" rows="5" placeholder="T...&#10;0x..." autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px;line-height:1.45;resize:vertical;font-family:ui-monospace,monospace"></textarea>
        <button type="button" class="btn-secondary" style="width:100%;margin-top:12px;padding:12px;font-size:13px" onclick="if(typeof wwRequestWhaleNotifyPermission==='function')wwRequestWhaleNotifyPermission()">请求通知权限</button>
        <button type="button" class="btn-primary" style="width:100%;margin-top:10px;padding:14px;font-size:14px" onclick="if(typeof wwWhaleSaveFromUI==='function')wwWhaleSaveFromUI()">保存</button>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO ───────────────────────────────────────────────────────────
    n_seo = """  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },"""
    i_seo = """  'page-social-recovery': { title: '社交恢复 — WorldToken', description: '本机登记可协助恢复的信任联系人（不上传）。' },
  'page-spending-limits': { title: '支出限额 — WorldToken', description: '每日转出美元估值限额与 PIN 覆盖。' },
  'page-whale-alerts': { title: '巨鲸提醒 — WorldToken', description: '监控地址大额链上活动浏览器通知。' },
  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO anchor not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── goTo ────────────────────────────────────────────────────────
    n_go = """  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }
  if(pageId==='page-settings') updateSettingsPage();"""
    i_go = """  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-social-recovery') { try { if(typeof wwSocialRecoveryRender==='function') setTimeout(wwSocialRecoveryRender, 40); } catch(_sr) {} }
  if(pageId==='page-spending-limits') { try { if(typeof wwSpendLimitPopulate==='function') setTimeout(wwSpendLimitPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch(_wh) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }
  if(pageId==='page-settings') updateSettingsPage();"""
    if n_go not in raw:
        raise SystemExit("goTo block anchor not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── Ticker: cache USD for whale / spend ────────────────────────────
    n_tk = """    const ust = fmt(d.tether && d.tether.usd);
    const html = 'BTC <strong>$' + btc + '</strong> · ETH <strong>$' + eth + '</strong> · TRX <strong>$' + trx + '</strong> · USDT <strong>$' + ust + '</strong>';"""
    i_tk = """    const ust = fmt(d.tether && d.tether.usd);
    try {
      window._wwLastCgUsd = {
        btc: d.bitcoin && d.bitcoin.usd,
        eth: d.ethereum && d.ethereum.usd,
        trx: d.tron && d.tron.usd,
        usdt: d.tether && d.tether.usd
      };
    } catch (_cg) {}
    const html = 'BTC <strong>$' + btc + '</strong> · ETH <strong>$' + eth + '</strong> · TRX <strong>$' + trx + '</strong> · USDT <strong>$' + ust + '</strong>';"""
    if n_tk not in raw:
        raise SystemExit("refreshHomePriceTicker fmt/html anchor not found")
    raw = raw.replace(n_tk, i_tk, 1)

    # ── doTransfer: spending gate ─────────────────────────────────────
    n_do = """  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  const fee = (amtNum*0.003).toFixed(2);"""
    i_do = """  if((typeof wwIsOnline === 'function') ? !wwIsOnline() : (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    showToast('📡 当前无网络，请联网后再发送', 'warning');
    return;
  }
  if (typeof wwSpendGateBeforeConfirm === 'function') {
    var _g = wwSpendGateBeforeConfirm(amtNum);
    if (_g === false) return;
  }
  const fee = (amtNum*0.003).toFixed(2);"""
    if n_do not in raw:
        raise SystemExit("doTransfer online check anchor not found")
    raw = raw.replace(n_do, i_do, 1)

    # ── broadcastRealTransfer: record spend ───────────────────────────
    n_br = """    if(txHash) {
      _safeEl('successTxHash') && ((_safeEl('successTxHash') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successTxHash fallback */.textContent = txHash);
      _safeEl('successTxLink') && (_safeEl('successTxLink').href =
        coin==='eth' ? 'https://etherscan.io/tx/'+txHash : 'https://tronscan.org/#/transaction/'+txHash);
      return true;
    }"""
    i_br = """    if(txHash) {
      try { if (typeof wwRecordSpendAfterBroadcast === 'function') wwRecordSpendAfterBroadcast(amt); } catch (_rs) {}
      _safeEl('successTxHash') && ((_safeEl('successTxHash') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* successTxHash fallback */.textContent = txHash);
      _safeEl('successTxLink') && (_safeEl('successTxLink').href =
        coin==='eth' ? 'https://etherscan.io/tx/'+txHash : 'https://tronscan.org/#/transaction/'+txHash);
      return true;
    }"""
    if n_br not in raw:
        raise SystemExit("broadcastRealTransfer txHash block not found")
    raw = raw.replace(n_br, i_br, 1)

    # ── loadTxHistory: whale check before render ────────────────────
    n_lh = """    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) {}
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }
    try { window._wwTxHistoryCache = txs; } catch (_c2) {}
    renderTxHistoryFromCache();"""
    i_lh = """    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) {}
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }
    try { window._wwTxHistoryCache = txs; } catch (_c2) {}
    try { if (typeof wwCheckWhaleTxHistory === 'function') wwCheckWhaleTxHistory(txs); } catch (_wh) {}
    renderTxHistoryFromCache();"""
    if n_lh not in raw:
        raise SystemExit("loadTxHistory cache anchor not found")
    raw = raw.replace(n_lh, i_lh, 1)

    # ── updateSettingsPage: new labels ────────────────────────────────
    n_us = """  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */"""
    i_us = """  var scv = document.getElementById('settingsSocialRecoveryValue');
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
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */"""
    if n_us not in raw:
        raise SystemExit("updateSettingsPage tail anchor not found")
    raw = raw.replace(n_us, i_us, 1)

    # ── JS block (after wwCheckPriceAlertsAfterTicker closes / before loadTxHistory) ──
    n_js = """// ── 交易历史 ──────────────────────────────────────────────────
async function loadTxHistory() {"""
    i_js = r"""function wwNormAddr(s) {
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
function wwSpendGateBeforeConfirm(amtNum) {
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
  var saved = '';
  try { saved = localStorage.getItem('ww_unlock_pin') || ''; } catch (e3) { saved = ''; }
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
      '<span style="font-size:12px;color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwSocialRemoveContact==='function')wwSocialRemoveContact(' + i + ')">删除</span></div>';
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
async function loadTxHistory() {"""
    if n_js not in raw:
        raise SystemExit("loadTxHistory anchor for JS insert not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
    if not all(m in raw for m in MARKERS):
        raise SystemExit("ERROR: markers missing after patch")


if __name__ == "__main__":
    main()
