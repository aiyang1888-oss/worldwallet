#!/usr/bin/env python3
"""On-chain identity (ENS/social), full privacy (balances + addresses), wallet analytics — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-identity"',
    'id="page-analytics"',
    "function wwIdentityPopulate(",
    "function wwAnalyticsPopulate(",
    ".ww-balance-hidden #settingsAddr",
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

    # ── CSS: extend privacy blur to addresses ───────────────────────
    n_css = """.ww-balance-hidden #page-home .asset-change {
  filter: blur(11px);
  user-select: none;
}"""
    i_css = """.ww-balance-hidden #page-home .asset-change {
  filter: blur(11px);
  user-select: none;
}
.ww-balance-hidden #homeAddrChip,
.ww-balance-hidden .home-short-addr,
.ww-balance-hidden #settingsAddr,
.ww-balance-hidden #settingsWalletTitle,
.ww-balance-hidden #page-addr .addr-display,
.ww-balance-hidden #page-addr .copy-row,
.ww-balance-hidden #receiveAddrText {
  filter: blur(9px);
  user-select: none;
  pointer-events: none;
}
.ww-balance-hidden .ww-balance-hide-btn {
  pointer-events: auto;
}"""
    if n_css not in raw:
        raise SystemExit("anchor CSS .ww-balance-hidden asset-change block not found")
    raw = raw.replace(n_css, i_css, 1)

    # ── Settings: three rows before Gas manager ─────────────────────
    n_set = """          <div class="settings-row" onclick="goTo('page-token-unlock-calendar')">
            <span class="settings-icon">📅</span>
            <span class="settings-label">解锁日历</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">大户项目</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    i_set = """          <div class="settings-row" onclick="goTo('page-token-unlock-calendar')">
            <span class="settings-icon">📅</span>
            <span class="settings-label">解锁日历</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">大户项目</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-identity')">
            <span class="settings-icon">🪪</span>
            <span class="settings-label">链上身份</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">ENS / 社交</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-analytics')">
            <span class="settings-icon">📉</span>
            <span class="settings-label">数据洞察</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">支出与活跃</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    if n_set not in raw:
        raise SystemExit("anchor settings unlock-calendar / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: before 恢复演练 ──────────────────────────────────────
    n_pg = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """    </div>

    <!-- 链上身份 -->
    <div class="page" id="page-identity">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">链上身份</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">将 <b>ENS 名称</b>与社交资料与当前钱包关联（仅保存在本机，不上传服务器）。链上解析 ENS 需在支持的网络使用对应地址。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">ENS / 域名</div>
          <input id="wwIdentityEns" type="text" placeholder="例如 vitalik.eth" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">X (Twitter)</div>
          <input id="wwIdentityTwitter" type="text" placeholder="@handle" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Farcaster / Lens（备注）</div>
          <input id="wwIdentitySocial2" type="text" placeholder="FID 或 @lens/handle" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;margin-top:4px" onclick="if(typeof wwIdentitySave==='function')wwIdentitySave()">保存到本机</button>
        <p style="font-size:10px;color:var(--text-muted);margin-top:12px;line-height:1.5">提示：在第三方 DApp 中仍需自行验证合约与签名请求。</p>
      </div>
    </div>

    <!-- 数据洞察 -->
    <div class="page" id="page-analytics">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">数据洞察</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">基于首页<b>最近交易缓存</b>的本地统计（示意）。刷新交易列表后数据更新。</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">近7日活跃热度（示意）</div>
        <div id="wwAnalyticsHeatmap" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:18px"></div>
        <div id="wwAnalyticsTopTokens" style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px"></div>
        <div id="wwAnalyticsSummary" style="font-size:12px;color:var(--text-muted);line-height:1.6"></div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO map ─────────────────────────────────────────────────────
    n_seo = """  'page-token-unlock-calendar': { title: '解锁日历 — WorldToken', description: '主流项目代币解锁日程示例。' }
};"""
    i_seo = """  'page-token-unlock-calendar': { title: '解锁日历 — WorldToken', description: '主流项目代币解锁日程示例。' },
  'page-identity': { title: '链上身份 — WorldToken', description: 'ENS 与社交资料本地备注。' },
  'page-analytics': { title: '数据洞察 — WorldToken', description: '支出模式与代币活跃度本地分析。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-token-unlock-calendar anchor not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ───────────────────────────────────────────────
    n_go = """  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch(_uc) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-token-unlock-calendar') { try { if(typeof wwTokenUnlockCalendarPopulate==='function') setTimeout(wwTokenUnlockCalendarPopulate, 40); } catch(_uc) {} }
  if(pageId==='page-identity') { try { if(typeof wwIdentityPopulate==='function') setTimeout(wwIdentityPopulate, 40); } catch(_id) {} }
  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch(_an) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("showPage token-unlock / charts anchor not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS: after wwTokenUnlockCalendarPopulate ─────────────────────
    n_js = """function wwTokenUnlockCalendarPopulate() {
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
    i_js = """function wwTokenUnlockCalendarPopulate() {
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

function wwIdentityPopulate() {
  var o = {};
  try { o = JSON.parse(localStorage.getItem('ww_identity_v1') || '{}'); } catch (e) { o = {}; }
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  if (a) a.value = o.ens || '';
  if (b) b.value = o.twitter || '';
  if (c) c.value = o.social2 || '';
}

function wwIdentitySave() {
  var a = document.getElementById('wwIdentityEns');
  var b = document.getElementById('wwIdentityTwitter');
  var c = document.getElementById('wwIdentitySocial2');
  var o = {
    ens: a ? String(a.value || '').trim().slice(0, 128) : '',
    twitter: b ? String(b.value || '').trim().slice(0, 64) : '',
    social2: c ? String(c.value || '').trim().slice(0, 128) : ''
  };
  try { localStorage.setItem('ww_identity_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('链上身份已保存（本机）', 'success', 2200);
}

function wwAnalyticsPopulate() {
  var heat = document.getElementById('wwAnalyticsHeatmap');
  var topEl = document.getElementById('wwAnalyticsTopTokens');
  var sumEl = document.getElementById('wwAnalyticsSummary');
  if (!heat || !topEl || !sumEl) return;
  var txs = [];
  try { txs = window._wwTxHistoryCache || []; } catch (e) { txs = []; }
  if (!Array.isArray(txs)) txs = [];
  var days = ['一', '二', '三', '四', '五', '六', '日'];
  var n = Math.max(1, txs.length);
  heat.innerHTML = days.map(function (d, i) {
    var h = Math.min(100, 18 + (n * (i + 3)) % 72);
    return '<div style="text-align:center"><div style="height:' + h + 'px;border-radius:8px;background:linear-gradient(180deg,rgba(200,168,75,0.55),rgba(200,168,75,0.12));margin-bottom:4px"></div><div style="font-size:10px;color:var(--text-muted)">周' + d + '</div></div>';
  }).join('');
  var byCoin = {};
  txs.forEach(function (tx) {
    var k = String(tx.coin || '—');
    byCoin[k] = (byCoin[k] || 0) + 1;
  });
  var sorted = Object.keys(byCoin).sort(function (a, b) { return (byCoin[b] || 0) - (byCoin[a] || 0); });
  if (!sorted.length) {
    topEl.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无交易缓存：请返回首页并点击「刷新」加载最近交易。</div>';
    sumEl.textContent = '';
    return;
  }
  topEl.innerHTML = sorted.slice(0, 6).map(function (k) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px">' +
      '<span style="font-weight:600;color:var(--text)">' + k + '</span>' +
      '<span style="font-size:12px;color:var(--gold)">' + byCoin[k] + ' 笔</span></div>';
  }).join('');
  var inC = 0, outC = 0;
  txs.forEach(function (tx) {
    var t = String(tx.type || '');
    if (t.indexOf('入') >= 0 || t.indexOf('收') >= 0) inC++;
    else if (t.indexOf('出') >= 0 || t.indexOf('转') >= 0) outC++;
  });
  sumEl.innerHTML = '共分析 <b style="color:var(--text)">' + txs.length + '</b> 条缓存记录。方向概览：转入类约 ' + inC + ' 条，转出类约 ' + outC + ' 条（基于类型文本启发式）。';
}

function wwOpenDexUniswap() {"""
    if n_js not in raw:
        raise SystemExit("wwTokenUnlockCalendarPopulate / wwOpenDexUniswap anchor not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched — {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
