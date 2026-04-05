#!/usr/bin/env python3
"""Advanced charts placeholder (TradingView-style), cloud encrypted backup hint, anti-phishing word on PIN unlock — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-charts"',
    'id="wwCloudBackupHint"',
    'id="wwAntiPhishBadge"',
    "function wwRefreshAntiPhishOnPinUnlock()",
    "function renderWwChartsPlaceholder()",
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

    # ── CSS: candle chart host ───────────────────────────────────────
    n_css = """.quick-btns { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 20px; }"""
    i_css = """.quick-btns { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 20px; }
#wwCandleChartHost { box-shadow: inset 0 0 0 1px rgba(200,168,75,0.08); }"""
    if n_css not in raw:
        raise SystemExit("anchor .quick-btns CSS not found")
    raw = raw.replace(n_css, i_css, 1)

    # ── Home: quick btn → 行情 ─────────────────────────────────────────
    n_q = """        <div class="quick-btn" onclick="goTo('page-dapp')"><div class="quick-btn-icon" class="u8">🌐</div><div class="quick-btn-label">DApp</div></div>
      </div>
      <div id="wwPortfolioPieCard" """
    i_q = """        <div class="quick-btn" onclick="goTo('page-dapp')"><div class="quick-btn-icon" class="u8">🌐</div><div class="quick-btn-label">DApp</div></div>
        <div class="quick-btn" onclick="goTo('page-charts')"><div class="quick-btn-icon" class="u8">📈</div><div class="quick-btn-label">行情</div></div>
      </div>
      <div id="wwPortfolioPieCard" """
    if n_q not in raw:
        raise SystemExit("anchor quick-btns / DApp / wwPortfolioPieCard not found")
    raw = raw.replace(n_q, i_q, 1)

    # ── Settings: cloud backup hint card ───────────────────────────────
    n_cloud = """          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.55" id="wwSecurityScoreHint">根据本机 PIN 与助记词备份状态估算（满分 100）。</div>
        </div>

        <!-- 安全 -->"""
    i_cloud = """          <div style="font-size:11px;color:var(--text-muted);margin-top:8px;line-height:1.55" id="wwSecurityScoreHint">根据本机 PIN 与助记词备份状态估算（满分 100）。</div>
        </div>

        <div id="wwCloudBackupHint" style="background:rgba(80,120,200,0.08);border:1px solid rgba(80,120,200,0.35);border-radius:16px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">☁️ 云端备份提示</div>
          <div style="font-size:11px;color:var(--text-muted);line-height:1.6;margin-bottom:12px">可将<b>加密后的备份文本</b>发到自有邮箱或保存到云盘；请勿明文发送助记词。下列导出仅含地址与备份标记，经您输入的密码加密（AES-GCM）。</div>
          <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:13px" onclick="if(typeof wwExportEncryptedCloudBackup==='function')wwExportEncryptedCloudBackup()">复制加密备份到剪贴板</button>
        </div>

        <!-- 安全 -->"""
    if n_cloud not in raw:
        raise SystemExit("anchor wwSecurityScoreHint / 安全 not found")
    raw = raw.replace(n_cloud, i_cloud, 1)

    # ── Settings: anti-phishing row ───────────────────────────────────
    n_ap = """          <div class="settings-row" onclick="goTo('page-recovery-test')">
            <span class="settings-icon">🧪</span>
            <span class="settings-label">恢复演练</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">安全模式</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>"""
    i_ap = """          <div class="settings-row" onclick="goTo('page-recovery-test')">
            <span class="settings-icon">🧪</span>
            <span class="settings-label">恢复演练</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">安全模式</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="if(typeof wwOpenAntiPhishDialog==='function')wwOpenAntiPhishDialog()">
            <span class="settings-icon">🪪</span>
            <span class="settings-label">防钓鱼口令</span>
            <span class="settings-value" id="settingsAntiPhishValue" style="font-size:11px;color:var(--text-muted)">未设置</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>"""
    if n_ap not in raw:
        raise SystemExit("anchor recovery-test settings block not found")
    raw = raw.replace(n_ap, i_ap, 1)

    # ── PIN overlay: anti-phishing badge ─────────────────────────────
    n_pin = """      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">已设置 6 位数字 PIN，用于保护钱包访问</div>
      <input id="pinUnlockInput" """
    i_pin = """      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">已设置 6 位数字 PIN，用于保护钱包访问</div>
      <div id="wwAntiPhishBadge" style="display:none;font-size:13px;font-weight:700;color:var(--gold);margin:-4px 0 14px;padding:10px 12px;border-radius:12px;background:rgba(200,168,75,0.12);border:1px solid rgba(200,168,75,0.38);line-height:1.4"></div>
      <input id="pinUnlockInput" """
    if n_pin not in raw:
        raise SystemExit("anchor PIN subtitle / pinUnlockInput not found")
    raw = raw.replace(n_pin, i_pin, 1)

    # ── Page: charts (before DApp) ────────────────────────────────────
    n_pg = """    <!-- DApp 浏览器 -->
    <div class="page" id="page-dapp">"""
    i_pg = """    <!-- K线 / 行情（图表示意） -->
    <div class="page" id="page-charts">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-home')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">行情</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 32px">
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:12px">1H</button>
          <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:12px">4H</button>
          <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:12px">1D</button>
          <button type="button" class="btn-secondary" style="padding:8px 12px;font-size:12px">1W</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.55">TradingView 风格 K 线占位（本地示意，非实时行情源）。</div>
        <div id="wwCandleChartHost" style="height:220px;border-radius:14px;border:1px solid var(--border);background:linear-gradient(180deg,#0e1218 0%,#0a0a12 100%);position:relative;overflow:hidden">
          <div style="position:absolute;inset:0;opacity:0.22;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:28px 22px"></div>
          <div id="wwCandleBars" style="position:absolute;left:0;right:0;bottom:24px;top:16px;display:flex;align-items:flex-end;justify-content:space-around;gap:2px;padding:0 8px"></div>
          <div style="position:absolute;bottom:6px;left:10px;font-size:10px;color:var(--text-muted)">OHLC · 示意</div>
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:12px;line-height:1.6">完整图表可接入 TradingView Widget 或自建行情；此处仅展示布局与蜡烛占位。</p>
      </div>
    </div>

    <!-- DApp 浏览器 -->
    <div class="page" id="page-dapp">"""
    if n_pg not in raw:
        raise SystemExit("anchor DApp page not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO ───────────────────────────────────────────────────────────
    n_seo = """  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }"""
    i_seo = """  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO recovery / dapp block not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── goTo: page-charts ─────────────────────────────────────────────
    n_goto = """  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-settings') updateSettingsPage();"""
    i_goto = """  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }
  if(pageId==='page-settings') updateSettingsPage();"""
    if n_goto not in raw:
        raise SystemExit("goTo recovery-test anchor not found")
    raw = raw.replace(n_goto, i_goto, 1)

    # ── updateSettingsPage: anti-phish label ─────────────────────────
    n_us = """  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */"""
    i_us = """  if(typeof wwApplyIdleLockLabel==='function') wwApplyIdleLockLabel();
  if (typeof updateReferralSettingsUI === 'function') updateReferralSettingsUI();
  if (typeof updateHomeBackupBanner === 'function') updateHomeBackupBanner();
  const apv = document.getElementById('settingsAntiPhishValue');
  if (apv) {
    var aw = '';
    try { aw = localStorage.getItem('ww_antiphish_word') || ''; } catch (e) {}
    apv.textContent = aw ? ('已设置 · ' + aw.slice(0, 6) + (aw.length > 6 ? '…' : '')) : '未设置';
    apv.style.color = aw ? 'var(--green,#26a17b)' : 'var(--text-muted)';
  }
  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */"""
    if n_us not in raw:
        raise SystemExit("updateSettingsPage tail anchor not found")
    raw = raw.replace(n_us, i_us, 1)

    # ── continueAfterPinCheck: refresh badge ──────────────────────────
    n_ca = """    ov.classList.add('show');
    setTimeout(() => { try { inp.focus(); } catch(e) {} }, 200);
  } else {
    _resumeWalletAfterUnlock();
  }
}
function submitPinUnlock() {"""
    i_ca = """    ov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap) {}
    setTimeout(() => { try { inp.focus(); } catch(e) {} }, 200);
  } else {
    _resumeWalletAfterUnlock();
  }
}
function submitPinUnlock() {"""
    if n_ca not in raw:
        raise SystemExit("continueAfterPinCheck anchor not found")
    raw = raw.replace(n_ca, i_ca, 1)

    # ── closeTotpUnlock ───────────────────────────────────────────────
    n_totp = """  if (pov) pov.classList.add('show');
}

function goTo(pageId) {"""
    i_totp = """  if (pov) pov.classList.add('show');
  try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap2) {}
}

function goTo(pageId) {"""
    if n_totp not in raw:
        raise SystemExit("closeTotpUnlock / goTo anchor not found")
    raw = raw.replace(n_totp, i_totp, 1)

    # ── wwTickIdleLock ────────────────────────────────────────────────
    n_idle = """    pov.classList.add('show');
    setTimeout(function() { try { inp.focus(); } catch(e) {} }, 200);
  }
}

const TRON_GRID = 'https://api.trongrid.io';"""
    i_idle = """    pov.classList.add('show');
    try { if (typeof wwRefreshAntiPhishOnPinUnlock === 'function') wwRefreshAntiPhishOnPinUnlock(); } catch (_ap3) {}
    setTimeout(function() { try { inp.focus(); } catch(e) {} }, 200);
  }
}

const TRON_GRID = 'https://api.trongrid.io';"""
    if n_idle not in raw:
        raise SystemExit("wwTickIdleLock / TRON_GRID anchor not found")
    raw = raw.replace(n_idle, i_idle, 1)

    # ── JS: helpers (before continueAfterPinCheck) ────────────────────
    n_js = """function continueAfterPinCheck() {
  const pin = localStorage.getItem('ww_unlock_pin');"""
    i_js = """function wwB64Bytes(u8) {
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
  var t = prompt('设置防钓鱼口令（解锁界面会显示，用于识别仿冒应用）\\n留空则清除', cur);
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
  const pin = localStorage.getItem('ww_unlock_pin');"""
    if n_js not in raw:
        raise SystemExit("continueAfterPinCheck anchor for JS insert not found")
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
