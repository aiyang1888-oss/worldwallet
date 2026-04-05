#!/usr/bin/env python3
"""Yield farming tracker (APY / est. rewards), Web Notification price alerts, recovery drill page — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="wwYieldFarmCard"',
    'id="wwPriceAlertSection"',
    'id="page-recovery-test"',
    "function updateYieldFarmTracker(",
    "function wwCheckPriceAlertsAfterTicker(",
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

    # ── Home: yield farming card (before 我的资产) ───────────────────
    n_yield_anchor = """      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    i_yield_anchor = """      </div>
      <div id="wwYieldFarmCard" style="margin:0 16px 12px;padding:12px 14px;background:rgba(38,161,123,0.07);border:1px solid rgba(38,161,123,0.28);border-radius:14px;font-size:12px;line-height:1.55;color:var(--text)">
        <div style="font-weight:700;margin-bottom:6px;color:var(--text)">🌾 收益追踪（示意）</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">参考常见质押 / 理财 APY，按当前持仓美元估值估算日收益与年化（本地统计，非链上合约）。</div>
        <div id="wwYieldFarmBody" style="display:flex;flex-direction:column;gap:8px"></div>
        <div style="margin-top:8px;font-size:10px;color:var(--text-muted)">APY 为示例值，实际收益以各平台与链上数据为准。</div>
      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    if n_yield_anchor not in raw:
        raise SystemExit("anchor yield / 我的资产 not found")
    raw = raw.replace(n_yield_anchor, i_yield_anchor, 1)

    # ── Settings: recovery drill row ─────────────────────────────────
    n_rec_row = """          <div class="settings-row" onclick="window._keyBackPage='page-settings';goTo('page-key')">
            <span class="settings-icon">📋</span>
            <span class="settings-label">备份密钥</span>
            <span class="settings-value" id="backupStatus" style="color:var(--red)">未备份</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>"""
    i_rec_row = """          <div class="settings-row" onclick="window._keyBackPage='page-settings';goTo('page-key')">
            <span class="settings-icon">📋</span>
            <span class="settings-label">备份密钥</span>
            <span class="settings-value" id="backupStatus" style="color:var(--red)">未备份</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-recovery-test')">
            <span class="settings-icon">🧪</span>
            <span class="settings-label">恢复演练</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">安全模式</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>"""
    if n_rec_row not in raw:
        raise SystemExit("anchor backup settings row block not found")
    raw = raw.replace(n_rec_row, i_rec_row, 1)

    # ── Settings: price alerts (before 邀请) ─────────────────────────
    n_inv = """


        <!-- 邀请 -->"""
    i_inv = """

        <div id="wwPriceAlertSection" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;color:var(--text)">🔔 价格提醒</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.55">使用浏览器 Web Notifications。价格与首页行情同源（约 90 秒刷新）。保存后需在系统中允许通知。</div>
          <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:10px;cursor:pointer;user-select:none">
            <input type="checkbox" id="wwAlertEnable" style="accent-color:var(--gold);width:16px;height:16px" />
            启用价格提醒
          </label>
          <button type="button" class="btn-secondary" style="width:100%;padding:10px;margin-bottom:12px;font-size:13px" onclick="if(typeof wwRequestPriceAlertPermission==='function')wwRequestPriceAlertPermission()">请求通知权限</button>
          <div style="display:grid;gap:10px;font-size:12px">
            <div style="padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600">BTC</span> 美元价 — 高于 <input id="wwAlertBtcAbove" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /> 低于 <input id="wwAlertBtcBelow" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600">ETH</span> 美元价 — 高于 <input id="wwAlertEthAbove" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /> 低于 <input id="wwAlertEthBelow" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600">TRX</span> 美元价 — 高于 <input id="wwAlertTrxAbove" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /> 低于 <input id="wwAlertTrxBelow" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /></div>
            <div style="padding:8px 0"><span style="font-weight:600">USDT</span> 美元价 — 高于 <input id="wwAlertUsdtAbove" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /> 低于 <input id="wwAlertUsdtBelow" type="number" step="any" placeholder="可选" style="width:90px;padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px" /></div>
          </div>
          <button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:12px;font-size:13px" onclick="if(typeof wwSavePriceAlertsFromUI==='function')wwSavePriceAlertsFromUI()">保存提醒条件</button>
        </div>


        <!-- 邀请 -->"""
    if n_inv not in raw:
        raise SystemExit("anchor before <!-- 邀请 --> not found")
    raw = raw.replace(n_inv, i_inv, 1)

    # ── Page: recovery drill ──────────────────────────────────────────
    n_dapp = """    <!-- DApp 浏览器 -->
    <div class="page" id="page-dapp">"""
    i_dapp = """    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">恢复演练</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:rgba(200,168,75,0.08);border:1px solid rgba(200,168,75,0.3);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:12px;line-height:1.65;color:var(--text-muted)">
          <b style="color:var(--gold)">安全模式</b>：仅在设备本地校验助记词派生地址是否与当前钱包一致，不会上传网络。请在私密环境操作，完成后请清除输入。
        </div>
        <div style="font-size:14px;color:var(--text);margin-bottom:10px;font-weight:600">输入助记词（与备份语言一致）</div>
        <textarea id="recoveryTestInput" rows="5" placeholder="空格分隔的 12 / 15 / 18 / 21 / 24 个词…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;line-height:1.5;resize:vertical"></textarea>
        <button type="button" class="btn-primary" style="width:100%;margin-top:14px;padding:14px" onclick="if(typeof wwRecoveryTestSubmit==='function')wwRecoveryTestSubmit()">验证是否与当前钱包一致</button>
        <button type="button" class="btn-secondary" style="width:100%;margin-top:10px;padding:12px" onclick="if(typeof wwRecoveryTestClear==='function')wwRecoveryTestClear()">清除输入</button>
      </div>
    </div>

    <!-- DApp 浏览器 -->
    <div class="page" id="page-dapp">"""
    if n_dapp not in raw:
        raise SystemExit("anchor DApp page not found")
    raw = raw.replace(n_dapp, i_dapp, 1)

    # ── SEO map ───────────────────────────────────────────────────────
    n_seo = """  'page-faq': { title: '常见问题 — WorldToken', description: '助记词安全、钱包备份与恢复说明。' },
  'page-verify-success': { title: '验证成功 — WorldToken', description: '助记词验证通过，可以开始使用钱包。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }
};"""
    i_seo = """  'page-faq': { title: '常见问题 — WorldToken', description: '助记词安全、钱包备份与恢复说明。' },
  'page-verify-success': { title: '验证成功 — WorldToken', description: '助记词验证通过，可以开始使用钱包。' },
  'page-recovery-test': { title: '恢复演练 — WorldToken', description: '离线验证助记词是否与当前钱包一致（安全模式）。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }
};"""
    if n_seo not in raw:
        raise SystemExit("anchor WW_PAGE_SEO tail not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── JS: refreshHomePriceTicker — append alert check ───────────────
    n_tick = """    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 90000);
    }
  } catch(e) {}
}
function drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd) {"""
    i_tick = """    if(!_wwTickerInterval) {
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
  var words = enStr.trim().split(/\\s+/);
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

function drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd) {"""
    if n_tick not in raw:
        raise SystemExit("anchor refreshHomePriceTicker / drawPortfolioPieChart not found")
    raw = raw.replace(n_tick, i_tick, 1)

    # ── drawPortfolioPieChart: call yield tracker ────────────────────
    n_pie = """  leg.innerHTML = htm;
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) {}
}
function getNetworkFeeEstimateLines(coinId) {"""
    i_pie = """  leg.innerHTML = htm;
  try { if (typeof updateRebalanceSuggestion === 'function') updateRebalanceSuggestion(parts, total); } catch (_rb) {}
  try { if (typeof updateYieldFarmTracker === 'function') updateYieldFarmTracker(parts, total); } catch (_yf) {}
}
function getNetworkFeeEstimateLines(coinId) {"""
    if n_pie not in raw:
        raise SystemExit("anchor end drawPortfolioPieChart not found")
    raw = raw.replace(n_pie, i_pie, 1)

    # ── drawPortfolioPieChart: clear yield when no portfolio ───────────
    n_pie0 = """  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} return; }"""
    i_pie0 = """  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch(_y0) {} return; }"""
    if n_pie0 not in raw:
        raise SystemExit("anchor drawPortfolioPieChart total<=0 not found")
    raw = raw.replace(n_pie0, i_pie0, 1)

    # ── updateSettingsPage: populate price form ───────────────────────
    n_us = """  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}"""
    i_us = """  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  if (typeof wwPopulatePriceAlertForm === 'function') wwPopulatePriceAlertForm();
}"""
    if n_us not in raw:
        raise SystemExit("anchor updateSettingsPage tail not found")
    raw = raw.replace(n_us, i_us, 1)

    # ── goTo: clear recovery textarea ─────────────────────────────────
    n_go = """  if(pageId==='page-import') { initImportGrid(); document.getElementById('importError').style.display='none'; const paste=document.getElementById('importPaste'); if(paste) paste.value=''; updateImportWordCount(); }
  if(pageId==='page-settings') updateSettingsPage();"""
    i_go = """  if(pageId==='page-import') { initImportGrid(); document.getElementById('importError').style.display='none'; const paste=document.getElementById('importPaste'); if(paste) paste.value=''; updateImportWordCount(); }
  if(pageId==='page-recovery-test') { try { const rt=document.getElementById('recoveryTestInput'); if(rt) rt.value=''; } catch(_rt) {} }
  if(pageId==='page-settings') updateSettingsPage();"""
    if n_go not in raw:
        raise SystemExit("anchor goTo import/settings not found")
    raw = raw.replace(n_go, i_go, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")


if __name__ == "__main__":
    main()
