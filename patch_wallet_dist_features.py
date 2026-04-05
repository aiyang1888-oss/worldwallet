#!/usr/bin/env python3
"""Apply batch send, hide-zero tokens, and mnemonic card image to dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    orig_lines = len(raw.splitlines())

    # ── 1) 批量转账 UI（地址框与联系人之间）────────────────────────────
    needle1 = """          <div id="transferAddrBook" class="transfer-addr-dd" class="u5" onclick="event.preventDefault()"></div>
        </div>

        <div class="transfer-contacts-card" id="transferContactsCard">"""
    insert1 = """          <div id="transferAddrBook" class="transfer-addr-dd" class="u5" onclick="event.preventDefault()"></div>
        </div>

        <div id="batchSendPanel" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:14px 16px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;letter-spacing:1px">批量地址（每行一个，使用下方统一金额分别发送）</div>
          <textarea id="batchTransferLines" rows="5" placeholder="每行一个收款地址（Tron / ETH 等）" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px;font-size:13px;color:var(--text);resize:vertical;line-height:1.5;font-family:ui-monospace,monospace"></textarea>
          <button type="button" class="btn-primary" style="width:100%;margin-top:10px" onclick="runBatchTransfer()">向列表批量发送</button>
        </div>
        <div style="text-align:center;margin-bottom:12px">
          <span id="batchSendToggle" style="font-size:12px;color:var(--gold);cursor:pointer;user-select:none" onclick="toggleBatchSendPanel()">📋 批量发送</span>
        </div>

        <div class="transfer-contacts-card" id="transferContactsCard">"""
    if needle1 not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 1 (batch UI) not found")
    raw = raw.replace(needle1, insert1, 1)

    # ── 2) 首页资产标题：隐藏零余额开关 ───────────────────────────────
    needle2 = """        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>我的资产</span>
          <span id="balRefreshBtn" onclick="loadBalances()" style="font-size:11px;color:var(--gold);cursor:pointer">刷新</span>
        </div>
        <div class="asset-item">"""
    insert2 = """        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end">
            <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted);cursor:pointer;user-select:none;margin:0">
              <input type="checkbox" id="hideZeroTokens" onchange="onHideZeroTokensChange()" style="accent-color:var(--gold);width:14px;height:14px" />
              隐藏零余额
            </label>
            <span id="balRefreshBtn" onclick="loadBalances()" style="font-size:11px;color:var(--gold);cursor:pointer">刷新</span>
          </div>
        </div>
        <div class="asset-item" id="assetRowUsdt">"""
    if needle2 not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 2 (assets title) not found")
    raw = raw.replace(needle2, insert2, 1)

    needle2b = """        <div class="asset-item" id="assetRowUsdt">
          <div class="asset-icon" style="background:rgba(38,161,123,0.15)">💚</div>
          <div class="asset-info"><div class="asset-name">USDT</div><div class="asset-chain">TRC-20 · Tron</div></div>
          <div class="asset-right">
            <div class="asset-amount" id="balUsdt">--</div>
            <div class="asset-value" id="valUsdt">$--</div>
            <div class="asset-change up" id="chgUsdt">+0.01%</div>
          </div>
        </div>
        <div class="asset-item">
          <div class="asset-icon" style="background:rgba(255,165,0,0.12)">🔴</div>"""
    insert2b = """        <div class="asset-item" id="assetRowUsdt">
          <div class="asset-icon" style="background:rgba(38,161,123,0.15)">💚</div>
          <div class="asset-info"><div class="asset-name">USDT</div><div class="asset-chain">TRC-20 · Tron</div></div>
          <div class="asset-right">
            <div class="asset-amount" id="balUsdt">--</div>
            <div class="asset-value" id="valUsdt">$--</div>
            <div class="asset-change up" id="chgUsdt">+0.01%</div>
          </div>
        </div>
        <div class="asset-item" id="assetRowTrx">
          <div class="asset-icon" style="background:rgba(255,165,0,0.12)">🔴</div>"""
    if needle2b not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 2b (trx row) not found")
    raw = raw.replace(needle2b, insert2b, 1)

    needle2c = """        <div class="asset-item" id="assetRowTrx">
          <div class="asset-icon" style="background:rgba(255,165,0,0.12)">🔴</div>
          <div class="asset-info"><div class="asset-name">TRX</div><div class="asset-chain">Tron</div></div>
          <div class="asset-right">
            <div class="asset-amount" id="balTrx">--</div>
            <div class="asset-value" id="valTrx">$--</div>
            <div class="asset-change up" id="chgTrx">+0.8%</div>
          </div>
        </div>
        <div class="asset-item">
          <div class="asset-icon" style="background:rgba(100,100,255,0.12)">🔷</div>"""
    insert2c = """        <div class="asset-item" id="assetRowTrx">
          <div class="asset-icon" style="background:rgba(255,165,0,0.12)">🔴</div>
          <div class="asset-info"><div class="asset-name">TRX</div><div class="asset-chain">Tron</div></div>
          <div class="asset-right">
            <div class="asset-amount" id="balTrx">--</div>
            <div class="asset-value" id="valTrx">$--</div>
            <div class="asset-change up" id="chgTrx">+0.8%</div>
          </div>
        </div>
        <div class="asset-item" id="assetRowEth">
          <div class="asset-icon" style="background:rgba(100,100,255,0.12)">🔷</div>"""
    if needle2c not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 2c (eth row) not found")
    raw = raw.replace(needle2c, insert2c, 1)

    # ── 3) 助记词页：保存图片按钮 ─────────────────────────────────────
    needle3 = """        <button class="btn-secondary" onclick="copyAllMnemonic(this)" style="margin-bottom:8px">📋 复制助记词</button>
        <button class="btn-primary" onclick="startVerify()">✅ 我已抄写，开始验证</button>"""
    insert3 = """        <button class="btn-secondary" onclick="copyAllMnemonic(this)" style="margin-bottom:8px">📋 复制助记词</button>
        <button class="btn-secondary" onclick="copyMnemonicAsCardImage(this)" style="margin-bottom:8px">🖼️ 保存助记词图片</button>
        <button class="btn-primary" onclick="startVerify()">✅ 我已抄写，开始验证</button>"""
    if needle3 not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 3 (mnemonic buttons) not found")
    raw = raw.replace(needle3, insert3, 1)

    # ── 4) JS：批量转账 + 隐藏零余额 + 图片（插在 broadcastRealTransfer 之前）──
    needle4 = """// ── 真实转账实现 ──────────────────────────────────────────────────
const TRON_GRID = 'https://api.trongrid.io';"""
    insert4 = """function toggleBatchSendPanel() {
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
  const lines = (ta && ta.value ? ta.value : '').split(/\\n/).map(function(l) { return l.trim(); }).filter(Boolean);
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
    { id: 'assetRowTrx', balId: 'balTrx' },
    { id: 'assetRowEth', balId: 'balEth' },
    { id: 'btcAssetRow', balId: 'balBtc' },
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
const TRON_GRID = 'https://api.trongrid.io';"""
    if needle4 not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 4 (TRON_GRID) not found")
    raw = raw.replace(needle4, insert4, 1)

    # ── 5) loadBalances 末尾调用 applyHideZeroTokens ─────────────────
    needle5 = """    if(btn) btn.textContent = '刷新';
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────"""
    insert5 = """    if(btn) btn.textContent = '刷新';
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────"""
    if needle5 not in raw:
        raise SystemExit("patch_wallet_dist_features: anchor 5 (loadBalances end) not found")
    raw = raw.replace(needle5, insert5, 1)

    DIST.write_text(raw, encoding="utf-8")
    new_lines = len(raw.splitlines())
    print(f"Patched {DIST} ({orig_lines} -> {new_lines} lines)")
    if new_lines < 5763:
        raise SystemExit(f"ERROR: line count {new_lines} must be >= 5763")


if __name__ == "__main__":
    main()
