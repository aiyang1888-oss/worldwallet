#!/usr/bin/env python3
"""Tx history search filter, wallet security score (PIN + backup), quick rebalance hint — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="txHistoryFilter"',
    'id="wwSecurityScoreCard"',
    'id="wwRebalanceCard"',
    "function updateWalletSecurityScoreUI()",
    "function renderTxHistoryFromCache()",
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

    # ── CSS (tx filter focus) ─────────────────────────────────────────
    n_css = """.tx-empty-friendly .tx-empty-hint { font-size: 12.5px; line-height: 1.8; color: var(--text-muted); max-width: 320px; margin: 0 auto; }"""
    i_css = """.tx-empty-friendly .tx-empty-hint { font-size: 12.5px; line-height: 1.8; color: var(--text-muted); max-width: 320px; margin: 0 auto; }
#txHistoryFilter::placeholder { color: var(--text-muted); opacity: 0.85; }"""
    if n_css not in raw:
        raise SystemExit("anchor CSS tx-empty-hint not found")
    raw = raw.replace(n_css, i_css, 1)

    # ── Home: tx history filter row ───────────────────────────────────
    n_txh = """        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:600;color:var(--text)">最近交易</span>
          <span onclick="loadTxHistory()" style="font-size:11px;color:var(--gold);cursor:pointer">刷新</span>
        </div>
        <div id="txHistoryList">"""
    i_txh = """        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:13px;font-weight:600;color:var(--text)">最近交易</span>
          <span onclick="loadTxHistory()" style="font-size:11px;color:var(--gold);cursor:pointer">刷新</span>
        </div>
        <input type="search" id="txHistoryFilter" placeholder="搜索地址、币种、方向或哈希…" autocomplete="off" inputmode="search" oninput="applyTxHistoryFilter()" style="width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:10px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;outline:none" />
        <div id="txHistoryList">"""
    if n_txh not in raw:
        raise SystemExit("anchor tx history header row not found")
    raw = raw.replace(n_txh, i_txh, 1)

    # ── Home: rebalance card (after portfolio pie) ─────────────────────
    n_pie = """      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    i_pie = """      </div>
      <div id="wwRebalanceCard" style="display:none;margin:0 16px 12px;padding:12px 14px;background:rgba(98,126,234,0.09);border:1px solid rgba(98,126,234,0.32);border-radius:14px;font-size:12px;line-height:1.55;color:var(--text)">
        <div style="font-weight:700;margin-bottom:6px;color:var(--text)">⚖️ 快速再平衡建议</div>
        <div id="wwRebalanceText" style="color:var(--text-muted)"></div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
          <button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:8px;font-size:12px" onclick="goTo('page-transfer')">去转账</button>
          <button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:8px;font-size:12px" onclick="goTab('tab-swap')">去兑换</button>
        </div>
      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    if n_pie not in raw:
        raise SystemExit("anchor after portfolio pie / assets-section not found")
    raw = raw.replace(n_pie, i_pie, 1)

    # ── Settings: security score card ─────────────────────────────────
    n_sec = """        <!-- 安全 -->
        <div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin:0 4px 8px">安全</div>"""
    i_sec = """        <div id="wwSecurityScoreCard" style="background:linear-gradient(135deg,rgba(200,168,75,0.1),transparent);border:1px solid rgba(200,168,75,0.35);border-radius:16px;padding:14px 16px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div>
              <div style="font-size:10px;color:var(--text-muted);letter-spacing:1px;margin-bottom:4px">钱包安全分</div>
              <div style="font-size:26px;font-weight:800;color:var(--gold);line-height:1" id="wwSecurityScoreValue">--</div>
            </div>
            <span style="font-size:11px;padding:4px 10px;border-radius:999px;background:var(--bg3);color:var(--text-muted)" id="wwSecurityScoreBadge">评估中</span>
          </div>
          <div style="margin-top:10px;height:6px;border-radius:6px;background:var(--bg3);overflow:hidden">
            <div id="wwSecurityScoreBar" style="height:100%;width:0%;background:linear-gradient(90deg,#26a17b,#c8a84b);border-radius:6px;transition:width 0.35s ease"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.55" id="wwSecurityScoreHint">根据本机 PIN 与助记词备份状态估算（满分 100）。</div>
        </div>

        <!-- 安全 -->
        <div style="font-size:10px;color:var(--text-muted);letter-spacing:2px;margin:0 4px 8px">安全</div>"""
    if n_sec not in raw:
        raise SystemExit("anchor settings 安全 section not found")
    raw = raw.replace(n_sec, i_sec, 1)

    # ── JS: helpers before loadTxHistory ──────────────────────────────
    n_pre = """// ── 交易历史 ──────────────────────────────────────────────────
async function loadTxHistory() {"""
    i_pre = """function filterTxHistoryList(txs, q) {
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

function renderTxHistoryFromCache() {
  var el = document.getElementById('txHistoryList');
  if (!el) return;
  var txs = window._wwTxHistoryCache || [];
  var inp = document.getElementById('txHistoryFilter');
  var q = inp ? inp.value : '';
  var filtered = filterTxHistoryList(txs, q);
  if (txs.length === 0) {
    el.innerHTML = txHistoryEmptyHtml();
    return;
  }
  if (filtered.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:18px;color:var(--text-muted);font-size:12px;line-height:1.6">无匹配记录<br/><span style="font-size:11px;opacity:0.9">试试缩短关键词或清空搜索框</span></div>';
    return;
  }
  el.innerHTML = filtered.map(function(tx) { return txHistoryRowHtml(tx); }).join('');
}

function applyTxHistoryFilter() {
  renderTxHistoryFromCache();
}

function getWalletSecurityBreakdown() {
  var pinOk = false;
  try {
    var p = localStorage.getItem('ww_unlock_pin');
    pinOk = !!(p && String(p).length >= 4);
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

// ── 交易历史 ──────────────────────────────────────────────────
async function loadTxHistory() {"""
    if n_pre not in raw:
        raise SystemExit("anchor before loadTxHistory not found")
    raw = raw.replace(n_pre, i_pre, 1)

    # ── loadTxHistory body: cache + render ────────────────────────────
    n_ld = """    if(txs.length === 0) {
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }

    el.innerHTML = txs.map(tx => `
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
    `).join('');"""
    i_ld = """    if(txs.length === 0) {
      try { window._wwTxHistoryCache = []; } catch (_c) {}
      el.innerHTML = txHistoryEmptyHtml();
      return;
    }
    try { window._wwTxHistoryCache = txs; } catch (_c2) {}
    renderTxHistoryFromCache();"""
    if n_ld not in raw:
        raise SystemExit("anchor loadTxHistory render block not found")
    raw = raw.replace(n_ld, i_ld, 1)

    # ── drawPortfolioPieChart: early exit + suggestion ────────────────
    n_pie2 = """  if(total <= 1e-9) { card.style.display = 'none'; return; }"""
    i_pie2 = """  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} return; }"""
    if n_pie2 not in raw:
        raise SystemExit("anchor drawPortfolioPieChart total check not found")
    raw = raw.replace(n_pie2, i_pie2, 1)

    n_pie3 = """  leg.innerHTML = htm;
}
function getNetworkFeeEstimateLines(coinId) {"""
    i_pie3 = """  leg.innerHTML = htm;
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) {}
}
function getNetworkFeeEstimateLines(coinId) {"""
    if n_pie3 not in raw:
        raise SystemExit("anchor end drawPortfolioPieChart not found")
    raw = raw.replace(n_pie3, i_pie3, 1)

    # ── updateSettingsPage ─────────────────────────────────────────────
    # Match only the block at end of updateSettingsPage (unique: updateReferral + backup banner)
    n_us2 = """  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    i_us2 = """  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}"""
    if n_us2 not in raw:
        raise SystemExit("anchor updateSettingsPage tail not found")
    raw = raw.replace(n_us2, i_us2, 1)

    # ── loadWallet ─────────────────────────────────────────────────────
    n_lw = """  try { if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner(); } catch (_hb) {}
}"""
    i_lw = """  try { if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner(); } catch (_hb) {}
  try { if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI(); } catch (_ws) {}
}"""
    if n_lw not in raw:
        raise SystemExit("anchor loadWallet tail not found")
    raw = raw.replace(n_lw, i_lw, 1)

    # ── markBackupDone (patch_wallet_dist backup script) ─────────────
    n_mb = """  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    # Too generic — target markBackupDone closing
    n_mb2 = """  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    # Find unique string in markBackupDone
    n_mark = """function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    i_mark = """function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}"""
    if n_mark not in raw:
        raise SystemExit("anchor markBackupDone not found")
    raw = raw.replace(n_mark, i_mark, 1)

    n_pin = """  localStorage.setItem('ww_unlock_pin', t);
  showToast('PIN 已保存', 'success');
  if(typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
}"""
    i_pin = """  localStorage.setItem('ww_unlock_pin', t);
  showToast('PIN 已保存', 'success');
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if(typeof offerTotpAfterPinSave === 'function') offerTotpAfterPinSave();
}"""
    if n_pin not in raw:
        raise SystemExit("anchor openPinSettingsDialog PIN save not found")
    raw = raw.replace(n_pin, i_pin, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")


if __name__ == "__main__":
    main()
