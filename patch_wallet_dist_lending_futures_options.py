#!/usr/bin/env python3
"""Lending protocol UI, perpetual futures tracker, options trading interface — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-lending"',
    'id="page-perp-futures"',
    'id="page-options"',
    "function wwLendingPopulate(",
    "function wwPerpPopulate(",
    "function wwOptionsPopulate(",
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

    # ── Settings rows (after reputation, before wwGasManagerCard) ────
    n_set = """          <div class="settings-row" onclick="goTo('page-reputation')">
            <span class="settings-icon">⭐</span>
            <span class="settings-label">钱包信誉分</span>
            <span class="settings-value" id="wwReputationSettingsValue" style="font-size:11px;color:var(--text-muted)">--</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-reputation')">
            <span class="settings-icon">⭐</span>
            <span class="settings-label">钱包信誉分</span>
            <span class="settings-value" id="wwReputationSettingsValue" style="font-size:11px;color:var(--text-muted)">--</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-lending')">
            <span class="settings-icon">🏦</span>
            <span class="settings-label">借贷协议</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">存借利率示意</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-perp-futures')">
            <span class="settings-icon">📈</span>
            <span class="settings-label">永续合约</span>
            <span class="settings-value" id="wwPerpSettingsSummary" style="font-size:11px;color:var(--text-muted)">--</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-options')">
            <span class="settings-icon">📊</span>
            <span class="settings-label">期权交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">基础界面</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings reputation / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: lending + perp + options before recovery test ────────
    n_pg = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """    </div>

    <!-- 借贷协议（本机示意） -->
    <div class="page" id="page-lending">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">借贷协议</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">以下为<b>示意</b>市场利率与操作入口，数据为本地占位；真实存借请前往 Aave、Compound、JustLend 等官方 dApp。</div>
        <div id="wwLendingMarkets" style="display:flex;flex-direction:column;gap:12px"></div>
        <button type="button" class="btn-secondary" style="width:100%;margin-top:14px;padding:12px" onclick="if(typeof showToast==='function')showToast('请通过 DApp 浏览器打开官方借贷协议','info',2400)">在 DApp 中打开协议</button>
      </div>
    </div>

    <!-- 永续合约持仓（本机示意） -->
    <div class="page" id="page-perp-futures">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">永续合约</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:11px;color:var(--text-muted)">未实现盈亏（示意）</div>
            <div id="wwPerpUnrealizedPnl" style="font-size:22px;font-weight:800;color:var(--gold)">—</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:var(--text-muted)">持仓数</div>
            <div id="wwPerpOpenCount" style="font-size:18px;font-weight:700;color:var(--text)">0</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.55">以下为<b>本地演示</b>持仓列表；连接交易所 API 后可替换为真实数据。</div>
        <div id="wwPerpPositions" style="display:flex;flex-direction:column;gap:10px"></div>
        <button type="button" class="btn-primary" style="width:100%;margin-top:14px;padding:12px" onclick="if(typeof wwPerpAddDemo==='function')wwPerpAddDemo()">添加示例持仓</button>
      </div>
    </div>

    <!-- 期权（基础界面示意） -->
    <div class="page" id="page-options">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">期权</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">简易期权询价界面（<b>示意</b>）：权利金为本地估算公式，非链上报价。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:12px">
          <label style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">标的</span>
            <select id="wwOptUnderlying" style="padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" onchange="if(typeof wwOptionsPopulate==='function')wwOptionsPopulate()">
              <option value="ETH">ETH</option>
              <option value="BTC">BTC</option>
              <option value="TRX">TRX</option>
            </select>
          </label>
          <label style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">方向</span>
            <select id="wwOptSide" style="padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" onchange="if(typeof wwOptionsPopulate==='function')wwOptionsPopulate()">
              <option value="call">看涨 Call</option>
              <option value="put">看跌 Put</option>
            </select>
          </label>
          <label style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">行权价 (USD)</span>
            <input id="wwOptStrike" type="text" inputmode="decimal" placeholder="例如 3500" style="padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" oninput="if(typeof wwOptionsPopulate==='function')wwOptionsPopulate()" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">到期（天）</span>
            <input id="wwOptDays" type="text" inputmode="numeric" placeholder="30" style="padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" oninput="if(typeof wwOptionsPopulate==='function')wwOptionsPopulate()" />
          </label>
          <label style="display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">合约数量（张·示意）</span>
            <input id="wwOptQty" type="text" inputmode="decimal" placeholder="1" style="padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" oninput="if(typeof wwOptionsPopulate==='function')wwOptionsPopulate()" />
          </label>
        </div>
        <div style="margin-top:16px;background:linear-gradient(135deg,rgba(200,168,75,0.1),transparent);border:1px solid rgba(200,168,75,0.35);border-radius:14px;padding:16px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">参考权利金（示意）</div>
          <div id="wwOptPremiumEst" style="font-size:28px;font-weight:800;color:var(--gold)">—</div>
          <div id="wwOptExplain" style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.55"></div>
        </div>
        <button type="button" class="btn-primary" style="width:100%;margin-top:16px;padding:14px" onclick="if(typeof showToast==='function')showToast('演示环境不支持真实下单','info',2200)">预览订单（示意）</button>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── WW_PAGE_SEO ─────────────────────────────────────────────────
    n_seo = """  'page-reputation': { title: '钱包信誉分 — WorldToken', description: '基于本机活动与安全的参考评分。' }
};"""
    i_seo = """  'page-reputation': { title: '钱包信誉分 — WorldToken', description: '基于本机活动与安全的参考评分。' },
  'page-lending': { title: '借贷协议 — WorldToken', description: '存借利率与市场示意。' },
  'page-perp-futures': { title: '永续合约 — WorldToken', description: '持仓与盈亏本地示意。' },
  'page-options': { title: '期权 — WorldToken', description: '基础期权询价界面示意。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-reputation closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ──────────────────────────────────────────────
    n_show = """  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch(_rep) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_show = """  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch(_rep) {} }
  if(pageId==='page-lending') { try { if(typeof wwLendingPopulate==='function') setTimeout(wwLendingPopulate, 40); } catch(_ld) {} }
  if(pageId==='page-perp-futures') { try { if(typeof wwPerpPopulate==='function') setTimeout(wwPerpPopulate, 40); } catch(_pf) {} }
  if(pageId==='page-options') { try { if(typeof wwOptionsPopulate==='function') setTimeout(wwOptionsPopulate, 40); } catch(_op) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_show not in raw:
        raise SystemExit("showPage reputation/charts block not found")
    raw = raw.replace(n_show, i_show, 1)

    # ── JS (before wwRecoveryTestClear) ─────────────────────────────
    n_js = """function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}"""
    i_js = """var WW_LENDING_MARKETS = [
  { asset: 'USDT', chain: 'TRON', supplyApy: '3.8%', borrowApr: '5.2%', color: '#26a17b' },
  { asset: 'USDC', chain: 'Ethereum', supplyApy: '4.1%', borrowApr: '5.9%', color: '#2775ca' },
  { asset: 'ETH', chain: 'Ethereum', supplyApy: '2.4%', borrowApr: '3.6%', color: '#627eea' },
  { asset: 'TRX', chain: 'TRON', supplyApy: '1.9%', borrowApr: '4.0%', color: '#ff0013' }
];

function wwLendingMarketToast(el) {
  var name = el && el.getAttribute ? el.getAttribute('data-asset') : '';
  if (typeof showToast === 'function') showToast(String(name || '') + ' 市场为示意数据', 'info', 1800);
}

function wwLendingPopulate() {
  var box = document.getElementById('wwLendingMarkets');
  if (!box) return;
  box.innerHTML = WW_LENDING_MARKETS.map(function (m) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px">' +
      '<div><div style="font-weight:700;font-size:15px;color:var(--text)">' + m.asset + ' <span style="font-size:11px;color:var(--text-muted);font-weight:500">' + m.chain + '</span></div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:4px">供应 APY / 借款 APR</div></div>' +
      '<div style="text-align:right"><div style="font-size:16px;font-weight:700;color:' + m.color + '">' + m.supplyApy + ' <span style="color:var(--text-muted);font-weight:500">/</span> ' + m.borrowApr + '</div>' +
      '<button type="button" class="btn-secondary" data-asset="' + m.asset + '" style="margin-top:8px;padding:6px 12px;font-size:11px" onclick="wwLendingMarketToast(this)">详情</button></div></div>';
  }).join('');
}

function wwPerpGetPositions() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_perp_demo_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwPerpSetPositions(arr) {
  try { localStorage.setItem('ww_perp_demo_v1', JSON.stringify(arr)); } catch (e2) {}
}

function wwPerpAddDemo() {
  var side = Math.random() > 0.5 ? '多' : '空';
  var sym = ['BTC','ETH','TRX'][Math.floor(Math.random() * 3)];
  var entry = sym === 'BTC' ? 62000 + Math.random() * 2000 : sym === 'ETH' ? 3200 + Math.random() * 200 : 0.12 + Math.random() * 0.02;
  var lev = [5, 10, 20][Math.floor(Math.random() * 3)];
  var p = wwPerpGetPositions();
  p.push({ id: 'p' + Date.now(), symbol: sym, side: side, entry: entry, size: (0.01 + Math.random() * 0.2).toFixed(4), leverage: lev, uPnl: (Math.random() * 200 - 80).toFixed(2) });
  wwPerpSetPositions(p);
  wwPerpPopulate();
  if (typeof showToast === 'function') showToast('已添加示例持仓', 'success', 1600);
}

function wwPerpPopulate() {
  var list = wwPerpGetPositions();
  var host = document.getElementById('wwPerpPositions');
  var pnlEl = document.getElementById('wwPerpUnrealizedPnl');
  var cntEl = document.getElementById('wwPerpOpenCount');
  var sum = 0;
  list.forEach(function (x) { sum += parseFloat(x.uPnl) || 0; });
  if (pnlEl) {
    pnlEl.textContent = list.length ? (sum >= 0 ? '+' : '') + sum.toFixed(2) + ' USDT' : '—';
    pnlEl.style.color = sum >= 0 ? '#26a17b' : '#e5484d';
  }
  if (cntEl) cntEl.textContent = String(list.length);
  var srow = document.getElementById('wwPerpSettingsSummary');
  if (srow) srow.textContent = list.length ? (list.length + ' 笔 · PnL ' + (sum >= 0 ? '+' : '') + sum.toFixed(0)) : '无持仓';
  if (!host) return;
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">暂无持仓，可点击添加示例数据</div>';
    return;
  }
  host.innerHTML = list.map(function (p) {
    var col = parseFloat(p.uPnl) >= 0 ? '#26a17b' : '#e5484d';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:700;font-size:15px">' + p.symbol + '-PERP</span>' +
      '<span style="font-size:12px;padding:3px 8px;border-radius:8px;background:var(--bg3)">' + p.side + ' · ' + p.leverage + 'x</span></div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.7">开仓价 <b style="color:var(--text)">' + (p.entry > 20 ? p.entry.toFixed(2) : p.entry.toFixed(5)) + '</b> · 数量 ' + p.size +
      '<br/>未实现 <b style="color:' + col + '">' + (parseFloat(p.uPnl) >= 0 ? '+' : '') + p.uPnl + '</b> USDT</div></div>';
  }).join('');
}

function wwOptionsSpotPrice(u) {
  var map = { ETH: 3200, BTC: 64000, TRX: 0.13 };
  return map[u] || 1;
}

function wwOptionsPopulate() {
  var uEl = document.getElementById('wwOptUnderlying');
  var sEl = document.getElementById('wwOptSide');
  var kEl = document.getElementById('wwOptStrike');
  var dEl = document.getElementById('wwOptDays');
  var qEl = document.getElementById('wwOptQty');
  var prem = document.getElementById('wwOptPremiumEst');
  var ex = document.getElementById('wwOptExplain');
  var u = uEl ? String(uEl.value || 'ETH') : 'ETH';
  var side = sEl ? String(sEl.value || 'call') : 'call';
  var S = wwOptionsSpotPrice(u);
  var K = parseFloat(kEl && kEl.value) || S;
  var days = Math.max(1, parseInt(dEl && dEl.value, 10) || 30);
  var qty = Math.max(0.001, parseFloat(qEl && qEl.value) || 1);
  var t = days / 365;
  var vol = 0.65;
  var intrinsic = side === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  var timeVal = S * vol * Math.sqrt(t) * 0.4;
  var unit = intrinsic + timeVal;
  var total = unit * qty;
  if (prem) prem.textContent = (total < 0.01 ? total.toFixed(6) : total.toFixed(2)) + ' USDT';
  if (ex) ex.textContent = '现货参考 ' + (u === 'TRX' ? S.toFixed(5) : S.toLocaleString(undefined, { maximumFractionDigits: 2 })) + ' USD · 简化波动率模型，非 Deribit / 链上期权报价。';
}

function wwRecoveryTestClear() {
  try {
    var t = document.getElementById('recoveryTestInput');
    if (t) t.value = '';
  } catch (e) {}
}"""
    if n_js not in raw:
        raise SystemExit("wwRecoveryTestClear anchor not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched — {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
