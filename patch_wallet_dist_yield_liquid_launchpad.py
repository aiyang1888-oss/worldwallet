#!/usr/bin/env python3
"""Liquidation protection alerts, yield aggregator (Aave/Compound/Venus), launchpad IDO/IEO — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-yield-aggregator"',
    'id="page-liquidation-alerts"',
    'id="page-launchpad"',
    "function wwYieldAggPopulate(",
    "function wwLiquidationPopulate(",
    "function wwLaunchpadPopulate(",
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

    # ── Settings rows (after 期权交易, before wwGasManagerCard) ─────
    n_set = """          <div class="settings-row" onclick="goTo('page-options')">
            <span class="settings-icon">📊</span>
            <span class="settings-label">期权交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">基础界面</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-options')">
            <span class="settings-icon">📊</span>
            <span class="settings-label">期权交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">基础界面</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-yield-aggregator')">
            <span class="settings-icon">🧮</span>
            <span class="settings-label">收益聚合</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">Aave / Compound / Venus</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-liquidation-alerts')">
            <span class="settings-icon">⚠️</span>
            <span class="settings-label">清算预警</span>
            <span class="settings-value" id="wwLiqSettingsHint" style="font-size:11px;color:var(--text-muted)">抵押率监控</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-launchpad')">
            <span class="settings-icon">🚀</span>
            <span class="settings-label">Launchpad</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">IDO / IEO 示意</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings page-options / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages before recovery test ──────────────────────────────────
    n_pg = """      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """      </div>
    </div>

    <!-- 收益聚合对比（本机示意） -->
    <div class="page" id="page-yield-aggregator">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">收益聚合</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">并排对比 <b>Aave</b>、<b>Compound</b>、<b>Venus</b> 等协议的参考供应 APY（<b>本地占位</b>，非实时链上）。</div>
        <div id="wwYieldAggTable" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px"></div>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px" onclick="if(typeof wwYieldAggRefreshDemo==='function')wwYieldAggRefreshDemo()">刷新示例利率</button>
      </div>
    </div>

    <!-- 清算保护预警（本机示意） -->
    <div class="page" id="page-liquidation-alerts">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">清算预警</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">当健康因子 / 抵押率低于阈值时提醒（浏览器通知需授权）。数据为<b>本机演示</b>。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">预警阈值：抵押率 &lt; （%）</div>
          <input id="wwLiqThreshold" type="text" inputmode="decimal" placeholder="130" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:15px" onchange="if(typeof wwLiquidationSaveThreshold==='function')wwLiquidationSaveThreshold()" />
          <label style="display:flex;align-items:center;gap:10px;margin-top:12px;font-size:13px;color:var(--text)">
            <input type="checkbox" id="wwLiqNotify" style="width:18px;height:18px;accent-color:var(--gold)" onchange="if(typeof wwLiquidationSaveThreshold==='function')wwLiquidationSaveThreshold()" />
            启用浏览器通知
          </label>
        </div>
        <div id="wwLiquidationList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px"></div>
        <button type="button" class="btn-primary" style="width:100%;padding:12px;margin-bottom:10px" onclick="if(typeof wwLiquidationScanDemo==='function')wwLiquidationScanDemo()">扫描示例仓位</button>
      </div>
    </div>

    <!-- Launchpad / IDO（本机示意） -->
    <div class="page" id="page-launchpad">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">Launchpad</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">即将开始的 <b>IDO / IEO</b> 项目列表为<b>占位</b>；参与需前往官方平台并完成 KYC。</div>
        <div id="wwLaunchpadList" style="display:flex;flex-direction:column;gap:12px"></div>
        <button type="button" class="btn-secondary" style="width:100%;margin-top:14px;padding:12px" onclick="if(typeof showToast==='function')showToast('演示环境不提交真实申购','info',2200)">连接官方 Launchpad</button>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test (options closing) not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── WW_PAGE_SEO ─────────────────────────────────────────────────
    n_seo = """  'page-options': { title: '期权 — WorldToken', description: '基础期权询价界面示意。' }
};"""
    i_seo = """  'page-options': { title: '期权 — WorldToken', description: '基础期权询价界面示意。' },
  'page-yield-aggregator': { title: '收益聚合 — WorldToken', description: 'Aave、Compound、Venus 等 APY 对比示意。' },
  'page-liquidation-alerts': { title: '清算预警 — WorldToken', description: '抵押率过低时的本地提醒与通知。' },
  'page-launchpad': { title: 'Launchpad — WorldToken', description: 'IDO / IEO 项目占位与说明。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-options closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ──────────────────────────────────────────────
    n_show = """  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch(_op) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_show = """  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch(_op) {} }
  if(pageId==='page-yield-aggregator') { try { if(typeof wwYieldAggPopulate==='function') setTimeout(wwYieldAggPopulate, 40); } catch(_ya) {} }
  if(pageId==='page-liquidation-alerts') { try { if(typeof wwLiquidationPopulate==='function') setTimeout(wwLiquidationPopulate, 40); } catch(_lq) {} }
  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch(_lp) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_show not in raw:
        raise SystemExit("showPage options/charts block not found")
    raw = raw.replace(n_show, i_show, 1)

    # ── JS (before wwRecoveryTestClear) ─────────────────────────────
    n_js = """function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}"""
    i_js = """var WW_YIELD_AGG_PROTOCOLS = ['Aave V3', 'Compound V3', 'Venus'];

function wwYieldAggJitter(base) {
  var b = parseFloat(base) || 3;
  return (b + (Math.random() - 0.5) * 0.6).toFixed(2);
}

function wwYieldAggPopulate() {
  var box = document.getElementById('wwYieldAggTable');
  if (!box) return;
  var assets = [
    { sym: 'USDT', base: 4.2 },
    { sym: 'USDC', base: 4.0 },
    { sym: 'ETH', base: 2.8 },
    { sym: 'TRX', base: 1.5 }
  ];
  var rows = [];
  assets.forEach(function (a) {
    var cells = WW_YIELD_AGG_PROTOCOLS.map(function (name) {
      return '<td style="padding:8px 6px;text-align:right;font-weight:600;color:var(--gold)">' + wwYieldAggJitter(a.base) + '%</td>';
    }).join('');
    rows.push('<tr><td style="padding:8px 6px;font-weight:600;color:var(--text)">' + a.sym + '</td>' + cells + '</tr>');
  });
  box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden"><thead><tr><th style="text-align:left;padding:10px 8px;color:var(--text-muted)">资产</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Aave</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Compound</th><th style="text-align:right;padding:10px 6px;color:var(--text-muted)">Venus</th></tr></thead><tbody>' + rows.join('') + '</tbody></table><p style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.5">供应 APY 为本地随机抖动示例，真实利率以各协议前端为准。</p>';
}

function wwYieldAggRefreshDemo() {
  wwYieldAggPopulate();
  if (typeof showToast === 'function') showToast('已刷新示例 APY', 'info', 1600);
}

function wwLiquidationGetThreshold() {
  var v = parseFloat((document.getElementById('wwLiqThreshold') || {}).value);
  if (!isFinite(v) || v <= 0) return 130;
  return v;
}

function wwLiquidationSaveThreshold() {
  try {
    localStorage.setItem('ww_liq_threshold', String(wwLiquidationGetThreshold()));
    var n = document.getElementById('wwLiqNotify');
    localStorage.setItem('ww_liq_notify', n && n.checked ? '1' : '0');
  } catch (e) {}
  wwLiquidationPopulate();
}

function wwLiquidationLoad() {
  try {
    var t = localStorage.getItem('ww_liq_threshold');
    var el = document.getElementById('wwLiqThreshold');
    if (el && t) el.value = t;
    var n = document.getElementById('wwLiqNotify');
    if (n) n.checked = localStorage.getItem('ww_liq_notify') === '1';
  } catch (e2) {}
}

function wwLiquidationDemoPositions() {
  return [
    { id: '1', asset: 'ETH', collateralUsd: 5000, debtUsd: 2800, ratio: 178 },
    { id: '2', asset: 'TRX', collateralUsd: 1200, debtUsd: 950, ratio: 126 }
  ];
}

function wwLiquidationScanDemo() {
  wwLiquidationPopulate();
  if (typeof showToast === 'function') showToast('已根据示例仓位检查抵押率', 'success', 2000);
}

function wwLiquidationMaybeNotify(ratio, threshold) {
  if (ratio >= threshold) return;
  try {
    if (localStorage.getItem('ww_liq_notify') !== '1') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification('WorldToken · 清算预警', { body: '抵押率 ' + ratio.toFixed(1) + '% 低于阈值 ' + threshold + '%（示意）' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  } catch (e) {}
}

function wwLiquidationPopulate() {
  wwLiquidationLoad();
  var th = wwLiquidationGetThreshold();
  var hint = document.getElementById('wwLiqSettingsHint');
  if (hint) hint.textContent = '阈值 ' + th + '%';
  var list = document.getElementById('wwLiquidationList');
  if (!list) return;
  var pos = wwLiquidationDemoPositions();
  var html = pos.map(function (p) {
    var danger = p.ratio < th;
    if (danger) wwLiquidationMaybeNotify(p.ratio, th);
    var bg = danger ? 'rgba(229,72,77,0.12)' : 'var(--bg2)';
    var bor = danger ? '1px solid rgba(229,72,77,0.45)' : '1px solid var(--border)';
    return '<div style="background:' + bg + ';border:' + bor + ';border-radius:14px;padding:12px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<div><div style="font-weight:700;color:var(--text)">' + p.asset + ' 抵押</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">债务约 $' + p.debtUsd + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">抵押率</div><div style="font-size:18px;font-weight:800;color:' + (danger ? '#e5484d' : '#26a17b') + '">' + p.ratio + '%</div></div></div>';
  }).join('');
  list.innerHTML = html || '<div style="color:var(--text-muted);font-size:13px">暂无演示仓位</div>';
}

var WW_LAUNCHPAD_PROJECTS = [
  { name: 'DemoLayer', chain: 'ETH', date: '2026-04-18', allocation: '500 USDT', status: '即将开始' },
  { name: 'TronBoost', chain: 'TRON', date: '2026-04-22', allocation: '2,000 TRX', status: '白名单' },
  { name: 'MetaVault', chain: 'BSC', date: '2026-05-01', allocation: 'TBD', status: '筹备中' }
];

function wwLaunchpadIntentDemo() {
  if (typeof showToast === 'function') showToast('演示：未连接链上申购', 'info', 2000);
}

function wwLaunchpadPopulate() {
  var box = document.getElementById('wwLaunchpadList');
  if (!box) return;
  box.innerHTML = WW_LAUNCHPAD_PROJECTS.map(function (p) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + p.name + '</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">' + p.chain + ' · ' + p.date + '</div></div>' +
      '<span style="font-size:11px;padding:4px 8px;border-radius:8px;background:rgba(200,168,75,0.15);color:var(--gold)">' + p.status + '</span></div>' +
      '<div style="margin-top:10px;font-size:12px;color:var(--text-muted)">意向额度：<b style="color:var(--text)">' + p.allocation + '</b></div>' +
      '<button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:10px;font-size:13px" onclick="wwLaunchpadIntentDemo()">登记意向（示意）</button></div>';
  }).join('');
}

function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}"""
    if n_js not in raw:
        raise SystemExit("anchor wwRecoveryTestClear not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
