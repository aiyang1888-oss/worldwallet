#!/usr/bin/env python3
"""Patch dist/wallet.html: TRX energy/bandwidth, DApp browser page, idle PIN lock timer."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"
MIN_LINES = 5946


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    orig_lines = len(raw.splitlines())

    n1 = """      </div>
      <div class="quick-btns">
        <div class="quick-btn" onclick="goTo('page-transfer')"><div class="quick-btn-icon" class="u8">📤</div><div class="quick-btn-label">转账</div></div>"""
    i1 = """      </div>
      <div id="trxResourceCard" style="display:none;margin:0 16px 10px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:10px;color:var(--text-muted);letter-spacing:1.5px">TRON 资源</span>
          <span id="trxResourceRefresh" onclick="if(typeof loadTrxResource==='function')loadTrxResource()" style="font-size:11px;color:var(--gold);cursor:pointer">刷新</span>
        </div>
        <div style="display:flex;gap:14px;font-size:12px;line-height:1.45">
          <div style="flex:1;min-width:0"><span style="color:var(--text-muted);font-size:11px">能量</span><br /><strong id="trxEnergyText" style="color:var(--text);word-break:break-all">--</strong></div>
          <div style="flex:1;min-width:0"><span style="color:var(--text-muted);font-size:11px">带宽</span><br /><strong id="trxBandwidthText" style="color:var(--text);word-break:break-all">--</strong></div>
        </div>
      </div>
      <div class="quick-btns">
        <div class="quick-btn" onclick="goTo('page-transfer')"><div class="quick-btn-icon" class="u8">📤</div><div class="quick-btn-label">转账</div></div>"""
    if n1 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 1 (home quick-btns) not found")
    raw = raw.replace(n1, i1, 1)

    n1b = """        <div class="quick-btn" onclick="goTo('page-hongbao')"><div class="quick-btn-icon" class="u8">🎁</div><div class="quick-btn-label">礼物</div></div>
      </div>
      <div class="assets-section">"""
    i1b = """        <div class="quick-btn" onclick="goTo('page-hongbao')"><div class="quick-btn-icon" class="u8">🎁</div><div class="quick-btn-label">礼物</div></div>
        <div class="quick-btn" onclick="goTo('page-dapp')"><div class="quick-btn-icon" class="u8">🌐</div><div class="quick-btn-label">DApp</div></div>
      </div>
      <div class="assets-section">"""
    if n1b not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 1b (hongbao quick + assets) not found")
    raw = raw.replace(n1b, i1b, 1)

    n_css = """.quick-btns { display: flex; gap: 8px; padding: 14px 20px; }
.quick-btn {
  flex: 1; background: var(--bg2);"""
    i_css = """.quick-btns { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 20px; }
.quick-btn {
  flex: 1 1 18%; min-width: 56px; background: var(--bg2);"""
    if n_css not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor CSS quick-btns not found")
    raw = raw.replace(n_css, i_css, 1)

    n2 = """          <div class="settings-row" onclick="showToast('👆 请在手机设置中开启 Face ID / 指纹', 'info')">
            <span class="settings-icon">👆</span>
            <span class="settings-label">Face ID / 指纹</span>
            <span class="settings-value">已开启</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="window._keyBackPage='page-settings';goTo('page-key')">"""
    i2 = """          <div class="settings-row" onclick="showToast('👆 请在手机设置中开启 Face ID / 指纹', 'info')">
            <span class="settings-icon">👆</span>
            <span class="settings-label">Face ID / 指纹</span>
            <span class="settings-value">已开启</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="wwCycleIdleLockMinutes()">
            <span class="settings-icon">⏱️</span>
            <span class="settings-label">闲置锁定</span>
            <span class="settings-value" id="settingsIdleLockValue">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="window._keyBackPage='page-settings';goTo('page-key')">"""
    if n2 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 2 (settings Face ID) not found")
    raw = raw.replace(n2, i2, 1)

    n3 = """    </div>

    <!-- Swap页 -->
    <div class="page" id="page-swap">"""
    i3 = """    </div>

    <!-- DApp 浏览器 -->
    <div class="page" id="page-dapp">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-home')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">DApp</div>
        <div class="nav-right" onclick="if(typeof wwDappReload==='function')wwDappReload()" style="font-size:13px;color:var(--gold);cursor:pointer">刷新</div>
      </div>
      <div class="u14" style="padding-bottom:24px">
        <div style="display:flex;gap:8px;margin-bottom:10px;align-items:stretch">
          <input type="text" id="dappUrlInput" inputmode="url" autocomplete="off" placeholder="https:// 或域名" style="flex:1;min-width:0;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;outline:none;box-sizing:border-box" onkeydown="if(event.key==='Enter'&&typeof wwLoadDappUrl==='function')wwLoadDappUrl()" />
          <button type="button" class="btn-primary" style="flex-shrink:0;padding:12px 16px" onclick="wwLoadDappUrl()">打开</button>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin:0 0 10px;line-height:1.5">部分站点禁止嵌入网页，若无法显示请在系统浏览器中打开。</p>
        <iframe id="dappFrame" title="DApp" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation" style="width:100%;height:min(72vh,560px);min-height:320px;border:1px solid var(--border);border-radius:14px;background:#0a0a12"></iframe>
      </div>
    </div>

    <!-- Swap页 -->
    <div class="page" id="page-swap">"""
    if n3 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 3 (before Swap page) not found")
    raw = raw.replace(n3, i3, 1)

    n4 = """  'page-faq': { title: '常见问题 — WorldToken', description: '助记词安全、钱包备份与恢复说明。' },
  'page-verify-success': { title: '验证成功 — WorldToken', description: '助记词验证通过，可以开始使用钱包。' }
};"""
    i4 = """  'page-faq': { title: '常见问题 — WorldToken', description: '助记词安全、钱包备份与恢复说明。' },
  'page-verify-success': { title: '验证成功 — WorldToken', description: '助记词验证通过，可以开始使用钱包。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }
};"""
    if n4 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 4 (WW_PAGE_SEO) not found")
    raw = raw.replace(n4, i4, 1)

    n5 = """  if(pageId==='page-home' && REAL_WALLET && REAL_WALLET.trxAddress) {
    setTimeout(loadTxHistory, 500);
    setTimeout(loadBalances, 500);
  }
}"""
    i5 = """  if(pageId==='page-dapp') {
    setTimeout(function() {
      try {
        var inp = document.getElementById('dappUrlInput');
        if(inp) inp.focus();
      } catch(e) {}
    }, 200);
  }
  if(pageId==='page-home' && REAL_WALLET && REAL_WALLET.trxAddress) {
    setTimeout(loadTxHistory, 500);
    setTimeout(loadBalances, 500);
  }
}"""
    if n5 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 5 (goTo home trx) not found")
    raw = raw.replace(n5, i5, 1)

    n6 = """  if(pageId==='page-home') {
    // 有钱包时显示导航栏
    if(REAL_WALLET && REAL_WALLET.ethAddress) {
      document.getElementById('tabBar').style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
  }"""
    i6 = """  if(pageId==='page-home') {
    // 有钱包时显示导航栏
    if(REAL_WALLET && REAL_WALLET.ethAddress) {
      document.getElementById('tabBar').style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
    if(REAL_WALLET && REAL_WALLET.trxAddress && typeof loadTrxResource==='function') setTimeout(loadTrxResource, 400);
  }"""
    if n6 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 6 (goTo page-home block) not found")
    raw = raw.replace(n6, i6, 1)

    n7 = """function updateSettingsPage() {
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
}"""
    i7 = """function updateSettingsPage() {
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
}"""
    if n7 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 7 (updateSettingsPage) not found")
    raw = raw.replace(n7, i7, 1)

    n8 = """const TRON_GRID = 'https://api.trongrid.io';"""
    i8 = """function wwFmtNum(n) {
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
  if(!/^https?:\\/\\//i.test(u)) u = 'https://' + u;
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
  if(!localStorage.getItem('ww_unlock_pin')) return;
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
    setTimeout(function() { try { inp.focus(); } catch(e) {} }, 200);
  }
}

const TRON_GRID = 'https://api.trongrid.io';"""
    if n8 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 8 (TRON_GRID) not found")
    raw = raw.replace(n8, i8, 1)

    n9 = """function _resumeWalletAfterUnlock() {
  updateAddr();
  const tb = document.getElementById('tabBar');
  if(tb) tb.style.display = 'flex';
  setTimeout(loadBalances, 500);
  goTo('page-home');
}"""
    i9 = """function _resumeWalletAfterUnlock() {
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
}"""
    if n9 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 9 (_resumeWalletAfterUnlock) not found")
    raw = raw.replace(n9, i9, 1)

    n10 = """function closePinUnlock() {
  const ov = document.getElementById('pinUnlockOverlay');
  if(ov) ov.classList.remove('show');
}"""
    i10 = """function closePinUnlock() {
  if(window._wwForceIdleLock) {
    if(typeof showToast==='function') showToast('闲置超时，请输入 PIN 解锁', 'warning', 2200);
    return;
  }
  const ov = document.getElementById('pinUnlockOverlay');
  if(ov) ov.classList.remove('show');
}"""
    if n10 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 10 (closePinUnlock) not found")
    raw = raw.replace(n10, i10, 1)

    n11 = """function closeTotpUnlock() {
  const ov = document.getElementById('totpUnlockOverlay');
  if (ov) ov.classList.remove('show');
  const pov = document.getElementById('pinUnlockOverlay');
  const pinInp = document.getElementById('pinUnlockInput');
  if (pinInp) pinInp.value = '';
  if (pov) pov.classList.add('show');
}"""
    i11 = """function closeTotpUnlock() {
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
}"""
    if n11 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 11 (closeTotpUnlock) not found")
    raw = raw.replace(n11, i11, 1)

    n12 = """    if(btn) btn.textContent = '刷新';
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────"""
    i12 = """    if(btn) btn.textContent = '刷新';
    if(typeof applyHideZeroTokens==='function') applyHideZeroTokens();
    if(typeof loadTrxResource==='function') loadTrxResource();
  } catch(e) {
    console.error('Balance load error:', e);
    if(tbd) tbd.classList.remove('home-balance--loading');
    if(btn) btn.textContent = '刷新';
  }
}


// ── 加密资讯 ──────────────────────────────────────────────────"""
    if n12 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 12 (loadBalances end) not found")
    raw = raw.replace(n12, i12, 1)

    n13 = """  if(got === want) {
    if(ov) ov.classList.remove('show');
    if(typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      _resumeWalletAfterUnlock();
    }
  } else {"""
    i13 = """  if(got === want) {
    if(ov) ov.classList.remove('show');
    if(typeof wwTotpEnabled === 'function' && wwTotpEnabled()) {
      showTotpUnlockOverlay();
    } else {
      window._wwForceIdleLock = false;
      _resumeWalletAfterUnlock();
    }
  } else {"""
    if n13 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 13 (submitPinUnlock success) not found")
    raw = raw.replace(n13, i13, 1)

    n14 = """updateTime(); window._timeInterval = setInterval(updateTime,60000);
const lg=document.getElementById("welcomeLangGrid"); if(lg) lg.scrollTop=0;"""
    i14 = """updateTime(); window._timeInterval = setInterval(updateTime,60000);
try {
  wwResetActivityClock();
  ['pointerdown','touchstart','keydown','scroll','click'].forEach(function(ev) {
    document.addEventListener(ev, function() { wwResetActivityClock(); }, { capture: true, passive: true });
  });
  setInterval(function() { try { wwTickIdleLock(); } catch(e) {} }, 15000);
  wwApplyIdleLockLabel();
} catch(e) {}
const lg=document.getElementById("welcomeLangGrid"); if(lg) lg.scrollTop=0;"""
    if n14 not in raw:
        raise SystemExit("patch_wallet_dist_trx_dapp_idle: anchor 14 (updateTime boot) not found")
    raw = raw.replace(n14, i14, 1)

    DIST.write_text(raw, encoding="utf-8")
    new_lines = len(raw.splitlines())
    print(f"Patched {DIST} ({orig_lines} -> {new_lines} lines)")
    if new_lines < MIN_LINES:
        raise SystemExit(f"ERROR: line count {new_lines} must be >= {MIN_LINES}")


if __name__ == "__main__":
    main()
