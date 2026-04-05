#!/usr/bin/env python3
"""Social trading leaderboard, automated portfolio rebalance, crypto sentiment — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-social-leaderboard"',
    'id="page-auto-rebalance"',
    'id="page-sentiment"',
    "function wwSocialLeaderboardPopulate(",
    "function wwAutoRebalancePopulate(",
    "function wwSentimentPopulate(",
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

    # ── Settings rows (after Launchpad, before wwGasManagerCard) ─────
    n_set = """          <div class="settings-row" onclick="goTo('page-launchpad')">
            <span class="settings-icon">🚀</span>
            <span class="settings-label">Launchpad</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">IDO / IEO 示意</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-launchpad')">
            <span class="settings-icon">🚀</span>
            <span class="settings-label">Launchpad</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">IDO / IEO 示意</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-social-leaderboard')">
            <span class="settings-icon">🏆</span>
            <span class="settings-label">社交跟单榜</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">排行榜 · 复制</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-auto-rebalance')">
            <span class="settings-icon">⚙️</span>
            <span class="settings-label">自动再平衡</span>
            <span class="settings-value" id="wwAutoRebalSettingsHint" style="font-size:11px;color:var(--text-muted)">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-sentiment')">
            <span class="settings-icon">📰</span>
            <span class="settings-label">舆情分析</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">多空头绪</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings Launchpad / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: after page-launchpad, before recovery-test ────────────
    n_pages = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pages = """    </div>

    <!-- 社交跟单榜（示意） -->
    <div class="page" id="page-social-leaderboard">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">跟单榜</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">演示地址的<b>模拟收益率</b>排行；「复制地址」仅填入转账收款框，不构成投资建议。</div>
        <div id="wwSocialLeaderboardList" style="display:flex;flex-direction:column;gap:12px"></div>
      </div>
    </div>

    <!-- 自动组合再平衡 -->
    <div class="page" id="page-auto-rebalance">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">自动再平衡</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">当 USDT / TRX / ETH / BTC 的美元占比相对<b>目标权重</b>偏离超过阈值时，本页给出调仓提示（本机计算，不自动下单）。</div>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:13px;color:var(--text)">
          <input type="checkbox" id="wwAutoRebalEnable" onchange="if(typeof wwAutoRebalanceSave==='function')wwAutoRebalanceSave()" style="width:18px;height:18px;accent-color:var(--gold)" />
          启用偏离提醒（本地）
        </label>
        <label style="display:block;margin-bottom:8px;font-size:11px;color:var(--text-muted)">偏离阈值 %</label>
        <input id="wwAutoRebalThreshold" type="number" min="1" max="50" step="1" value="8" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:15px;margin-bottom:14px" oninput="if(typeof wwAutoRebalanceSave==='function')wwAutoRebalanceSave()" />
        <div id="wwAutoRebalanceBody" style="display:flex;flex-direction:column;gap:10px"></div>
        <button type="button" class="btn-primary" style="width:100%;margin-top:14px;padding:12px" onclick="if(typeof wwAutoRebalancePopulate==='function')wwAutoRebalancePopulate()">重新计算</button>
      </div>
    </div>

    <!-- 舆情 / 情绪（示意） -->
    <div class="page" id="page-sentiment">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">舆情分析</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">与首页行情代币联动，展示<b>模拟</b>多空情绪分数（-100～+100），非真实新闻 NLP。</div>
        <div id="wwSentimentList" style="display:flex;flex-direction:column;gap:12px"></div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pages not in raw:
        raise SystemExit("anchor page-recovery-test block not found")
    raw = raw.replace(n_pages, i_pages, 1)

    # ── SEO map ──────────────────────────────────────────────────────
    n_seo = """  'page-launchpad': { title: 'Launchpad — WorldToken', description: 'IDO / IEO 项目占位与说明。' }
};"""
    i_seo = """  'page-launchpad': { title: 'Launchpad — WorldToken', description: 'IDO / IEO 项目占位与说明。' },
  'page-social-leaderboard': { title: '社交跟单榜 — WorldToken', description: '演示排行榜与复制地址入口。' },
  'page-auto-rebalance': { title: '自动再平衡 — WorldToken', description: '组合偏离检测与调仓提示。' },
  'page-sentiment': { title: '舆情分析 — WorldToken', description: '代币情绪示意与行情联动。' }
};"""
    if n_seo not in raw:
        raise SystemExit("anchor WW_PAGE_SEO launchpad closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── goTo side effects ────────────────────────────────────────────
    n_go = """  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch(_lp) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-launchpad') { try { if(typeof wwLaunchpadPopulate==='function') setTimeout(wwLaunchpadPopulate, 40); } catch(_lp) {} }
  if(pageId==='page-social-leaderboard') { try { if(typeof wwSocialLeaderboardPopulate==='function') setTimeout(wwSocialLeaderboardPopulate, 40); } catch(_sl) {} }
  if(pageId==='page-auto-rebalance') { try { if(typeof wwAutoRebalancePopulate==='function') setTimeout(wwAutoRebalancePopulate, 50); } catch(_ar) {} }
  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch(_sn) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("anchor goTo launchpad/charts not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS after wwLaunchpadPopulate ─────────────────────────────────
    n_js = """function wwLaunchpadPopulate() {
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

function wwRecoveryTestClear() {"""
    i_js = """function wwLaunchpadPopulate() {
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

var WW_SOCIAL_LEADERBOARD_DEMO = [
  { addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', label: 'AlphaVault', roi: 42.3, win: 68 },
  { addr: 'TXYZopYRdj2D9XRtbG411XZZ3kMfsVk8Q6', label: 'TronWhale', roi: 28.1, win: 55 },
  { addr: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', label: 'vitalik.eth', roi: 19.4, win: 52 }
];

function wwSocialLeaderboardCopyAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardCopy(r.addr);
}

function wwSocialLeaderboardFillTransferAt(i) {
  var r = WW_SOCIAL_LEADERBOARD_DEMO[i];
  if (!r) return;
  wwSocialLeaderboardFillTransfer(r.addr);
}

function wwSocialLeaderboardCopy(addr) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr);
    else {
      var ta = document.createElement('textarea');
      ta.value = addr;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (typeof showToast === 'function') showToast('已复制地址', 'success', 1600);
  } catch (e) {}
}

function wwSocialLeaderboardFillTransfer(addr) {
  try {
    localStorage.setItem('ww_prefill_transfer_to', addr);
    goTo('page-transfer');
    setTimeout(function () {
      var el = document.getElementById('transferTo') || document.querySelector('[id*="transfer"][id*="To"]');
      if (el) { el.value = addr; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, 120);
  } catch (e2) {
    goTo('page-transfer');
  }
}

function wwSocialLeaderboardPopulate() {
  var box = document.getElementById('wwSocialLeaderboardList');
  if (!box) return;
  box.innerHTML = WW_SOCIAL_LEADERBOARD_DEMO.map(function (r, i) {
    var short = r.addr.length > 18 ? r.addr.slice(0, 10) + '…' + r.addr.slice(-8) : r.addr;
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
      '<div><div style="font-size:12px;color:var(--text-muted)">#' + (i + 1) + ' · ' + r.label + '</div>' +
      '<div style="font-weight:700;margin-top:4px;color:var(--text)">' + short + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:11px;color:var(--text-muted)">模拟 ROI</div>' +
      '<div style="font-size:18px;font-weight:800;color:#26a17b">+' + r.roi.toFixed(1) + '%</div>' +
      '<div style="font-size:11px;color:var(--text-muted)">胜率 ' + r.win + '%</div></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardCopyAt(' + i + ')">复制地址</button>' +
      '<button type="button" class="btn-primary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="wwSocialLeaderboardFillTransferAt(' + i + ')">填入转账</button></div></div>';
  }).join('');
}

function wwAutoRebalanceSave() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    localStorage.setItem('ww_autorebal_enable', en && en.checked ? '1' : '0');
    if (th) localStorage.setItem('ww_autorebal_threshold', String(parseInt(th.value, 10) || 8));
  } catch (e) {}
  var hint = document.getElementById('wwAutoRebalSettingsHint');
  if (hint) {
    try {
      hint.textContent = localStorage.getItem('ww_autorebal_enable') === '1' ? '已启用' : '关闭';
    } catch (e2) { hint.textContent = '—'; }
  }
}

function wwAutoRebalanceLoad() {
  try {
    var en = document.getElementById('wwAutoRebalEnable');
    var th = document.getElementById('wwAutoRebalThreshold');
    if (en) en.checked = localStorage.getItem('ww_autorebal_enable') === '1';
    if (th) {
      var t = parseInt(localStorage.getItem('ww_autorebal_threshold') || '8', 10);
      if (isFinite(t) && t > 0) th.value = String(t);
    }
  } catch (e) {}
}

function wwAutoRebalancePortfolioParts() {
  var u = parseFloat((document.getElementById('valUsdt') || {}).textContent.replace(/[^0-9.\\-]/g, '')) || 0;
  var t = parseFloat((document.getElementById('valTrx') || {}).textContent.replace(/[^0-9.\\-]/g, '')) || 0;
  var e = parseFloat((document.getElementById('valEth') || {}).textContent.replace(/[^0-9.\\-]/g, '')) || 0;
  var b = parseFloat((document.getElementById('valBtc') || {}).textContent.replace(/[^0-9.\\-]/g, '')) || 0;
  var total = u + t + e + b;
  if (total <= 0) return { total: 0, parts: [{ k: 'USDT', p: 0 }, { k: 'TRX', p: 0 }, { k: 'ETH', p: 0 }, { k: 'BTC', p: 0 }] };
  return {
    total: total,
    parts: [
      { k: 'USDT', p: 100 * u / total },
      { k: 'TRX', p: 100 * t / total },
      { k: 'ETH', p: 100 * e / total },
      { k: 'BTC', p: 100 * b / total }
    ]
  };
}

function wwAutoRebalancePopulate() {
  wwAutoRebalanceLoad();
  var body = document.getElementById('wwAutoRebalanceBody');
  if (!body) return;
  var th = parseInt((document.getElementById('wwAutoRebalThreshold') || {}).value || '8', 10);
  if (!isFinite(th) || th < 1) th = 8;
  var target = { USDT: 40, TRX: 15, ETH: 30, BTC: 15 };
  var data = wwAutoRebalancePortfolioParts();
  if (!data.total) {
    body.innerHTML = '<div style="color:var(--text-muted);font-size:13px">暂无估值数据，请返回首页刷新余额后再试。</div>';
    return;
  }
  var rows = data.parts.map(function (x) {
    var tgt = target[x.k] || 25;
    var drift = x.p - tgt;
    var hit = Math.abs(drift) >= th;
    return { k: x.k, p: x.p, tgt: tgt, drift: drift, hit: hit };
  });
  var any = rows.some(function (r) { return r.hit; });
  body.innerHTML = rows.map(function (r) {
    var col = r.hit ? '#e5484d' : 'var(--text-muted)';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">' +
      '<span style="font-weight:700;color:var(--text)">' + r.k + '</span>' +
      '<span style="font-size:12px;color:var(--text-muted)">当前 ' + r.p.toFixed(1) + '% · 目标 ' + r.tgt + '%</span></div>' +
      '<div style="margin-top:6px;font-size:13px;color:' + col + '">偏离 ' + (r.drift >= 0 ? '+' : '') + r.drift.toFixed(1) + ' 百分点' + (r.hit ? '（超过阈值）' : '') + '</div></div>';
  }).join('') + (any && localStorage.getItem('ww_autorebal_enable') === '1'
    ? '<div style="background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.35);border-radius:12px;padding:12px;font-size:12px;color:var(--text)">建议：通过转账或兑换向<b>权重不足</b>的资产倾斜；本应用不代您执行交易。</div>'
    : '<div style="font-size:12px;color:var(--text-muted)">提示：可在设置中开启「偏离提醒」。</div>');
}

function wwSentimentHash(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function wwSentimentPopulate() {
  var box = document.getElementById('wwSentimentList');
  if (!box) return;
  var coins = ['USDT', 'TRX', 'ETH', 'BTC'];
  var els = ['chgUsdt', 'chgTrx', 'chgEth', 'chgBtc'];
  var out = [];
  for (var i = 0; i < coins.length; i++) {
    var ch = (document.getElementById(els[i]) || {}).textContent || '';
    var m = ch.match(/[\\-+]?[0-9]+(?:\\.[0-9]+)?/);
    var px = m ? parseFloat(m[0]) : 0;
    var h = wwSentimentHash(coins[i] + String(px));
    var score = Math.max(-100, Math.min(100, Math.round(px * 12 + (h % 17) - 8)));
    var lab = score >= 20 ? '偏多' : (score <= -20 ? '偏空' : '中性');
    var bg = score >= 20 ? 'rgba(38,161,123,0.12)' : (score <= -20 ? 'rgba(229,72,77,0.12)' : 'var(--bg2)');
    out.push('<div style="background:' + bg + ';border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<div style="font-weight:800;font-size:16px;color:var(--text)">' + coins[i] + '</div>' +
      '<span style="font-size:12px;padding:4px 10px;border-radius:999px;background:var(--bg3);color:var(--text-muted)">' + lab + '</span></div>' +
      '<div style="margin-top:10px;display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;height:8px;border-radius:8px;background:var(--bg3);overflow:hidden">' +
      '<div style="height:100%;width:' + (50 + score / 2) + '%;background:linear-gradient(90deg,#e5484d,#c8a84b,#26a17b);border-radius:8px"></div></div>' +
      '<div style="font-size:18px;font-weight:800;color:var(--gold);min-width:52px;text-align:right">' + score + '</div></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">与首页涨跌幅示意联动 · 非新闻 NLP</div></div>');
  }
  box.innerHTML = out.join('');
}

function wwRecoveryTestClear() {"""
    if n_js not in raw:
        raise SystemExit("anchor wwLaunchpadPopulate / wwRecoveryTestClear not found")
    raw = raw.replace(n_js, i_js, 1)

    # Update settings hint when settings page opens
    n_upd = """    updateSettingsPage();
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    i_upd = """    updateSettingsPage();
    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch(_ar0) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    if n_upd in raw:
        raw = raw.replace(n_upd, i_upd, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
