#!/usr/bin/env python3
"""Portfolio insurance UI, DeFi yield optimizer suggestions, token unlock calendar — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-portfolio-insurance"',
    'id="page-yield-optimizer"',
    'id="page-token-unlock-calendar"',
    "function wwPortfolioInsurancePopulate(",
    "function wwYieldOptimizerPopulate(",
    "function wwTokenUnlockCalendarPopulate(",
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

    # ── Settings: three rows before Gas manager card ─────────────────
    n_set = """          <div class="settings-row" onclick="goTo('page-copy-trading')">
            <span class="settings-icon">🐳</span>
            <span class="settings-label">跟单交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">巨鲸地址</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    i_set = """          <div class="settings-row" onclick="goTo('page-copy-trading')">
            <span class="settings-icon">🐳</span>
            <span class="settings-label">跟单交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">巨鲸地址</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-portfolio-insurance')">
            <span class="settings-icon">🛡️</span>
            <span class="settings-label">资产保险</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">承保选项</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-yield-optimizer')">
            <span class="settings-icon">📊</span>
            <span class="settings-label">收益优化</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">DeFi 策略</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-token-unlock-calendar')">
            <span class="settings-icon">📅</span>
            <span class="settings-label">解锁日历</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">大户项目</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    if n_set not in raw:
        raise SystemExit("anchor settings copy-trading / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: before 恢复演练 ───────────────────────────────────────
    n_pg = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """    </div>

    <!-- 资产保险 -->
    <div class="page" id="page-portfolio-insurance">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">资产保险</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">链上资产可通过第三方协议或托管方提供的<b>保险产品</b>降低黑客与合约风险。以下为常见入口（示意，不构成投保建议）。</div>
        <div id="wwInsuranceBody" style="display:flex;flex-direction:column;gap:12px"></div>
        <p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin-top:14px">投保前请阅读条款、承保范围与免赔额；本应用不代售保险。</p>
      </div>
    </div>

    <!-- 收益优化 -->
    <div class="page" id="page-yield-optimizer">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">收益优化</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:12px">根据首页<b>持仓占比</b>与参考 APY，给出可考虑的收益策略（本地估算，非投资建议）。</div>
        <div id="wwYieldOptimizerHint" style="background:rgba(38,161,123,0.08);border:1px solid rgba(38,161,123,0.28);border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:var(--text-muted)"></div>
        <div id="wwYieldOptimizerBody" style="display:flex;flex-direction:column;gap:10px"></div>
        <p style="font-size:10px;color:var(--text-muted);margin-top:12px;line-height:1.5">智能合约与质押均有本金风险，请以官方文档与链上数据为准。</p>
      </div>
    </div>

    <!-- 解锁日历 -->
    <div class="page" id="page-token-unlock-calendar">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">解锁日历</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:12px">主流项目<b>代币解锁</b>日程（示例数据，非实时行情；请以项目方公告为准）。</div>
        <div id="wwUnlockCalendarBody" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── Persist portfolio parts for optimizer ───────────────────────
    n_pie = """  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch(_y0) {} return; }"""
    i_pie = """  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  try { window._wwLastPortfolioParts = parts; window._wwLastPortfolioTotal = total; } catch (_wp) {}
  if(total <= 1e-9) { card.style.display = 'none'; try { if(typeof updateRebalanceSuggestion==='function') updateRebalanceSuggestion([], 0); } catch(_r) {} try { if(typeof updateYieldFarmTracker==='function') updateYieldFarmTracker([], 0); } catch(_y0) {} return; }"""
    if n_pie not in raw:
        raise SystemExit("drawPortfolioPieChart total anchor not found")
    raw = raw.replace(n_pie, i_pie, 1)

    # ── SEO map ─────────────────────────────────────────────────────
    n_seo = """  'page-copy-trading': { title: '跟单交易 — WorldToken', description: '登记监控巨鲸地址（本地示意，非自动交易）。' }
};"""
    i_seo = """  'page-copy-trading': { title: '跟单交易 — WorldToken', description: '登记监控巨鲸地址（本地示意，非自动交易）。' },
  'page-portfolio-insurance': { title: '资产保险 — WorldToken', description: '链上资产保险与承保入口说明（示意）。' },
  'page-yield-optimizer': { title: '收益优化 — WorldToken', description: '根据持仓的 DeFi 收益策略参考。' },
  'page-token-unlock-calendar': { title: '解锁日历 — WorldToken', description: '主流项目代币解锁日程示例。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-copy-trading anchor not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ───────────────────────────────────────────────
    n_go = """  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch(_cp) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch(_cp) {} }
  if(pageId==='page-portfolio-insurance') { try { if(typeof wwPortfolioInsurancePopulate==='function') setTimeout(wwPortfolioInsurancePopulate, 40); } catch(_pi) {} }
  if(pageId==='page-yield-optimizer') { try { if(typeof wwYieldOptimizerPopulate==='function') setTimeout(wwYieldOptimizerPopulate, 40); } catch(_yo) {} }
  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch(_uc) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("showPage copy-trading / charts anchor not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS: after wwCopyTradingRemove ───────────────────────────────
    n_js = """function wwCopyTradingRemove(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e2) {}
  var ta = document.getElementById('wwCopyWatchInput');
  if (ta) ta.value = ar.map(function (x) { return x.addr; }).join('\\n');
  wwCopyTradingRenderList();
}

function wwOpenDexUniswap() {"""
    i_js = """function wwCopyTradingRemove(idx) {
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || idx < 0 || idx >= ar.length) return;
  ar.splice(idx, 1);
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e2) {}
  var ta = document.getElementById('wwCopyWatchInput');
  if (ta) ta.value = ar.map(function (x) { return x.addr; }).join('\\n');
  wwCopyTradingRenderList();
}

function wwPortfolioInsurancePopulate() {
  var host = document.getElementById('wwInsuranceBody');
  if (!host) return;
  var items = [
    { t: 'Nexus Mutual', d: '去中心化互助承保（需了解 NXM 与 KYC 要求）', u: 'https://www.nexusmutual.io/' },
    { t: 'InsurAce', d: '多链 DeFi 协议组合保险', u: 'https://www.insurace.io/' },
    { t: '托管方条款', d: '若资产在交易所，请查阅其用户保护与保险说明', u: 'https://www.binance.com/en/support/faq' }
  ];
  host.innerHTML = items.map(function (it) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-weight:700;color:var(--text);font-size:14px">' + it.t + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">' + it.d + '</div>' +
      '<button type="button" class="btn-secondary" style="align-self:flex-start;padding:8px 14px;font-size:12px" onclick="try{window.open(\\'' + it.u + '\\',\\'_blank\\',\\'noopener,noreferrer\\');}catch(e){}">了解详情</button></div>';
  }).join('');
}

function wwYieldOptimizerPopulate() {
  var body = document.getElementById('wwYieldOptimizerBody');
  var hint = document.getElementById('wwYieldOptimizerHint');
  if (!body || !hint) return;
  var parts = [];
  var total = 0;
  try {
    if (window._wwLastPortfolioParts && window._wwLastPortfolioTotal != null) {
      parts = window._wwLastPortfolioParts;
      total = Number(window._wwLastPortfolioTotal) || 0;
    }
  } catch (e) { parts = []; total = 0; }
  if (!total || total <= 1e-9) {
    hint.textContent = '暂无持仓估值：请返回首页等待余额加载后再查看策略建议。';
    body.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">—</div>';
    return;
  }
  var apy = { USDT: 4.2, TRX: 4.8, ETH: 3.6, BTC: 2.9 };
  var top = null;
  var bestA = 0;
  parts.forEach(function (p) {
    var a = apy[p.l] != null ? apy[p.l] : 3.5;
    if (a > bestA && p.v > 0) { bestA = a; top = p.l; }
  });
  hint.innerHTML = '当前组合参考总市值约 <b style="color:var(--text)">$' + total.toFixed(2) + '</b>。' +
    (top ? ' 占比最高的可优化资产侧重：<b style="color:var(--gold)">' + top + '</b>（参考 APY ' + bestA.toFixed(1) + '%）。' : '');
  var strategies = [
    { n: '稳定币理财 / 货币市场', apy: '3.5–5%', fit: 'USDT', note: '适合大额 USDT，注意合约与平台信用风险' },
    { n: '原生链质押（ETH / TRX）', apy: '3–6%', fit: 'ETH,TRX', note: '流动性质押或节点委托，需解锁期与罚没规则' },
    { n: '流动性挖矿（AMM）', apy: '变动大', fit: 'USDT,ETH', note: '无常损失与智能合约风险较高' }
  ];
  body.innerHTML = strategies.map(function (s) {
    var ok = parts.some(function (p) { return p.v > 0 && s.fit.indexOf(p.l) >= 0; });
    var badge = ok ? '<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:rgba(200,168,75,0.2);color:var(--gold)">与持仓相关</span>' : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">' +
      '<span style="font-weight:700;color:var(--text);font-size:13px">' + s.n + '</span>' + badge + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">参考 APY ' + s.apy + ' · ' + s.note + '</div></div>';
  }).join('');
}

function wwTokenUnlockCalendarPopulate() {
  var host = document.getElementById('wwUnlockCalendarBody');
  if (!host) return;
  var rows = [
    { proj: 'Arbitrum', tok: 'ARB', when: '2026-05-16', amt: '约 1.1B 代币', note: '团队与投资人解锁批次（示例）' },
    { proj: 'Optimism', tok: 'OP', when: '2026-06-30', amt: '约 3.8 亿 OP', note: '治理金库释放（示例）' },
    { proj: 'dYdX', tok: 'DYDX', when: '2026-08-01', amt: '投资人解锁', note: '请关注官方 changelog' },
    { proj: 'WorldToken 生态', tok: 'WTK', when: '2026-09-15', amt: '社区激励', note: '占位示例，非真实解锁计划' }
  ];
  host.innerHTML = rows.map(function (r) {
    return '<div style="display:flex;flex-direction:column;gap:4px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
      '<span style="font-weight:700;color:var(--text)">' + r.proj + ' <span style="color:var(--gold)">' + r.tok + '</span></span>' +
      '<span style="font-size:12px;color:var(--green,#26a17b)">' + r.when + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + r.amt + ' · ' + r.note + '</div></div>';
  }).join('');
}

function wwOpenDexUniswap() {"""
    if n_js not in raw:
        raise SystemExit("wwCopyTradingRemove / wwOpenDexUniswap anchor not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched — {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
