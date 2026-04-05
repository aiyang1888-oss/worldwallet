#!/usr/bin/env python3
"""Home backup banner, mnemonic strength indicator, transfer quick amounts — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"


ALREADY_MARKERS = (
    ".home-backup-banner",
    'id="homeBackupBanner"',
    'id="mnemonicStrengthBits"',
    'id="transferQuickAmountRow"',
    "function updateHomeBackupBanner()",
    "function setTransferQuickAmount(",
)


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    if all(m in raw for m in ALREADY_MARKERS):
        sz = DIST.stat().st_size
        lines = len(raw.splitlines())
        print(f"OK: already applied — {DIST} ({lines} lines, {sz} bytes)")
        return

    # ── CSS ───────────────────────────────────────────────────────────
    n1 = """.home-header { background: var(--bg2); padding: 16px 20px 20px; border-bottom: 1px solid var(--border); }
.home-greeting { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }"""
    i1 = """.home-header { background: var(--bg2); padding: 16px 20px 20px; border-bottom: 1px solid var(--border); }
.home-backup-banner {
  display: none;
  background: rgba(231, 76, 60, 0.16);
  border: 1px solid rgba(231, 76, 60, 0.42);
  color: #ffb4a8;
  border-radius: 12px;
  padding: 10px 12px;
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  line-height: 1.45;
  user-select: none;
}
.home-backup-banner:active { opacity: 0.92; }
.ww-quick-amt {
  flex: 1 1 calc(25% - 8px);
  min-width: 64px;
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid rgba(200, 168, 75, 0.35);
  background: var(--bg3);
  color: var(--gold);
  cursor: pointer;
}
.ww-quick-amt:active { transform: scale(0.98); }
.home-greeting { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }"""
    if n1 not in raw:
        raise SystemExit("anchor CSS (home-header) not found")
    raw = raw.replace(n1, i1, 1)

    # ── Home: backup banner ────────────────────────────────────────────
    n2 = """      <div class="home-header" style="position:relative">
        <div style="position:absolute;top:0;right:0;display:flex;align-items:center;gap:8px">"""
    i2 = """      <div class="home-header" style="position:relative">
        <div id="homeBackupBanner" class="home-backup-banner" role="alert" onclick="goTo('page-settings')">⚠️ 钱包尚未备份助记词，丢失设备将无法恢复资产。点此处前往设置确认备份</div>
        <div style="position:absolute;top:0;right:0;display:flex;align-items:center;gap:8px">"""
    if n2 not in raw:
        raise SystemExit("anchor home-header inner not found")
    raw = raw.replace(n2, i2, 1)

    # ── Key page: strength row ─────────────────────────────────────────
    n3 = """        </div>
        <div class="key-grid" id="keyWordGrid"></div>
        <div class="key-warning">"""
    i3 = """        </div>
        <div id="mnemonicStrengthRow" style="background:rgba(200,168,75,0.08);border:1px solid rgba(200,168,75,0.28);border-radius:12px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px">
          <span style="color:var(--text-muted)">恢复短语强度</span>
          <span style="color:var(--text);font-weight:600">熵 <span id="mnemonicStrengthBits">128</span> bit · <span id="mnemonicStrengthLevel" style="color:var(--gold)">标准</span></span>
        </div>
        <div class="key-grid" id="keyWordGrid"></div>
        <div class="key-warning">"""
    if n3 not in raw:
        raise SystemExit("anchor key-grid not found")
    raw = raw.replace(n3, i3, 1)

    # ── Transfer: quick USDT amounts ───────────────────────────────────
    n4 = """            <input id="transferAmount" type="number" placeholder="0.00" oninput="calcTransferFee()" style="flex:1;min-width:0;width:100%;background:none;border:none;font-size:32px;font-weight:700;color:#e0e0f0;outline:none;text-align:right;display:block" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">"""
    i4 = """            <input id="transferAmount" type="number" placeholder="0.00" oninput="calcTransferFee()" style="flex:1;min-width:0;width:100%;background:none;border:none;font-size:32px;font-weight:700;color:#e0e0f0;outline:none;text-align:right;display:block" />
          </div>
          <div id="transferQuickAmountRow" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
            <button type="button" class="ww-quick-amt" onclick="setTransferQuickAmount(10)">10 USDT</button>
            <button type="button" class="ww-quick-amt" onclick="setTransferQuickAmount(50)">50 USDT</button>
            <button type="button" class="ww-quick-amt" onclick="setTransferQuickAmount(100)">100 USDT</button>
            <button type="button" class="ww-quick-amt" onclick="setTransferQuickAmount(500)">500 USDT</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">"""
    if n4 not in raw:
        raise SystemExit("anchor transferAmount block not found")
    raw = raw.replace(n4, i4, 1)

    # ── JS: helpers after updateHomeChainStrip ─────────────────────────
    n5 = """  strip.classList.remove('home-chain-strip--dim');
}

function updateAddr() {"""
    i5 = """  strip.classList.remove('home-chain-strip--dim');
}

function updateHomeBackupBanner() {
  var b = document.getElementById('homeBackupBanner');
  if (!b) return;
  var show = REAL_WALLET && REAL_WALLET.ethAddress && !REAL_WALLET.backedUp;
  b.style.display = show ? 'block' : 'none';
}

function getMnemonicStrengthDisplay() {
  var n = 12;
  if (REAL_WALLET && REAL_WALLET.enMnemonic) {
    var ws = REAL_WALLET.enMnemonic.trim().split(/\\s+/).filter(Boolean);
    n = ws.length || 12;
  } else {
    var sel = document.getElementById('mnemonicLength');
    if (sel && sel.value) n = parseInt(sel.value, 10) || 12;
  }
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

function updateAddr() {"""
    if n5 not in raw:
        raise SystemExit("anchor after updateHomeChainStrip not found")
    raw = raw.replace(n5, i5, 1)

    # ── loadWallet tail ────────────────────────────────────────────────
    n6 = """function loadWallet() {
  try {
    const d = localStorage.getItem('ww_wallet');
    if(d) REAL_WALLET = JSON.parse(d);
    if (REAL_WALLET && REAL_WALLET.ethAddress) {
      try { sessionStorage.removeItem('ww_ref_pending'); } catch (_r) {}
    }
  } catch(e) {}
}"""
    i6 = """function loadWallet() {
  try {
    const d = localStorage.getItem('ww_wallet');
    if(d) REAL_WALLET = JSON.parse(d);
    if (REAL_WALLET && REAL_WALLET.ethAddress) {
      try { sessionStorage.removeItem('ww_ref_pending'); } catch (_r) {}
    }
  } catch(e) {}
  try { if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner(); } catch (_hb) {}
}"""
    if n6 not in raw:
        raise SystemExit("anchor loadWallet not found")
    raw = raw.replace(n6, i6, 1)

    # ── goTo page-home ─────────────────────────────────────────────────
    n7 = """    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);"""
    i7 = """    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof updateHomeBackupBanner==='function') updateHomeBackupBanner();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);"""
    if n7 not in raw:
        raise SystemExit("anchor goTo page-home not found")
    raw = raw.replace(n7, i7, 1)

    # ── updateSettingsPage tail ────────────────────────────────────────
    n8 = """  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
}"""
    i8 = """  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    # Only replace first occurrence in updateSettingsPage — match more context
    n8b = """  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
}"""
    i8b = """  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    if n8b not in raw:
        raise SystemExit("anchor updateSettingsPage end not found")
    raw = raw.replace(n8b, i8b, 1)

    # ── renderKeyGrid end ──────────────────────────────────────────────
    n9 = """  if (REAL_WALLET) {
    REAL_WALLET.words = words.slice();
  }
}

function shortChainAddr(addr) {"""
    i9 = """  if (REAL_WALLET) {
    REAL_WALLET.words = words.slice();
  }
  if (typeof updateMnemonicStrengthIndicator === 'function') updateMnemonicStrengthIndicator();
}

function shortChainAddr(addr) {"""
    if n9 not in raw:
        raise SystemExit("anchor renderKeyGrid end not found")
    raw = raw.replace(n9, i9, 1)

    # ── changeMnemonicLength ───────────────────────────────────────────
    n10 = """function changeMnemonicLength(len) {
  if(REAL_WALLET) {
    REAL_WALLET.words = null; // 清除旧词，触发重新生成
    saveWallet(REAL_WALLET);
  }
  renderKeyGrid(); // 重新生成对应长度的词
}"""
    i10 = """function changeMnemonicLength(len) {
  currentMnemonicLength = parseInt(len, 10) || 12;
  if(REAL_WALLET) {
    REAL_WALLET.words = null; // 清除旧词，触发重新生成
    saveWallet(REAL_WALLET);
  }
  renderKeyGrid(); // 重新生成对应长度的词
}"""
    if n10 not in raw:
        raise SystemExit("anchor changeMnemonicLength not found")
    raw = raw.replace(n10, i10, 1)

    # ── markBackupDone ─────────────────────────────────────────────────
    n11 = """function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份'; el.style.color='var(--green,#26a17b)'; }
}"""
    i11 = """function markBackupDone() {
  const w = JSON.parse(localStorage.getItem('ww_wallet')||'{}');
  w.backedUp = true;
  localStorage.setItem('ww_wallet', JSON.stringify(w));
  if(REAL_WALLET) REAL_WALLET.backedUp = true;
  const el = document.getElementById('backupStatus');
  if(el) { el.textContent='已备份 ✓'; el.style.color='var(--green,#26a17b)'; }
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
}"""
    if n11 not in raw:
        raise SystemExit("anchor markBackupDone not found")
    raw = raw.replace(n11, i11, 1)

    # ── verify success: persist backup flag ────────────────────────────
    n12 = """    // 验证通过，显示成功页
    updateAddr();
    goTo('page-verify-success');
    // 用户手动点按钮进入首页（已移除自动跳转）"""
    i12 = """    // 验证通过，显示成功页
    if (typeof markBackupDone === 'function') markBackupDone();
    updateAddr();
    goTo('page-verify-success');
    // 用户手动点按钮进入首页（已移除自动跳转）"""
    if n12 in raw:
        raw = raw.replace(n12, i12, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")


if __name__ == "__main__":
    main()
