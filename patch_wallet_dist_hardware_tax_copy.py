#!/usr/bin/env python3
"""Hardware wallet connect UI (Ledger/Trezor), tax CSV export from tx cache, copy-trading watchlist — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-hardware-wallet"',
    'id="page-tax-report"',
    'id="page-copy-trading"',
    "function wwHardwareWalletPopulate(",
    "function wwTaxExportCsv(",
    "function wwCopyTradingPopulate(",
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

    # ── Settings: three new rows (after DEX connect) ──────────────────
    n_set = """          <div class="settings-row" onclick="goTo('page-dex-connect')">
            <span class="settings-icon">🔗</span>
            <span class="settings-label">连接 DEX</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">Uniswap</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-dex-connect')">
            <span class="settings-icon">🔗</span>
            <span class="settings-label">连接 DEX</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">Uniswap</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-hardware-wallet')">
            <span class="settings-icon">🔐</span>
            <span class="settings-label">硬件钱包</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">Ledger / Trezor</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-tax-report')">
            <span class="settings-icon">📑</span>
            <span class="settings-label">税务报表</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">导出 CSV</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-copy-trading')">
            <span class="settings-icon">🐳</span>
            <span class="settings-label">跟单交易</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">巨鲸地址</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings DEX row / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: insert before 恢复演练 ─────────────────────────────────
    n_pg = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """    </div>

    <!-- 硬件钱包 -->
    <div class="page" id="page-hardware-wallet">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">硬件钱包</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">通过 USB 或蓝牙连接 <b>Ledger</b> / <b>Trezor</b>，在桌面浏览器中完成配对；本页为流程说明与入口（Web 端无法直接访问 USB 设备时需使用配套应用）。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12px;line-height:1.6;color:var(--text-muted)">
          <div style="font-weight:700;color:var(--text);margin-bottom:8px">推荐步骤</div>
          <ol style="margin:0;padding-left:18px;line-height:1.75">
            <li>安装厂商官方应用（Ledger Live / Trezor Suite）</li>
            <li>在设备上启用对应链（ETH / Tron 等）</li>
            <li>使用「用本钱包地址验证」核对派生地址一致</li>
          </ol>
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;margin-bottom:10px;font-size:14px" onclick="if(typeof wwOpenLedgerSupport==='function')wwOpenLedgerSupport()">Ledger 支持中心</button>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;margin-bottom:10px;font-size:13px" onclick="if(typeof wwOpenTrezorSupport==='function')wwOpenTrezorSupport()">Trezor 入门</button>
        <div id="wwHardwareAddrEcho" style="background:var(--bg2);border:1px dashed var(--border);border-radius:12px;padding:10px 12px;font-size:11px;word-break:break-all;color:var(--text-muted)"></div>
      </div>
    </div>

    <!-- 税务报表 -->
    <div class="page" id="page-tax-report">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">税务报表</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:12px">将首页已加载的<b>交易历史缓存</b>导出为 CSV，便于自行申报或交给会计师（字段为示意，请按当地法规调整）。</div>
        <div id="wwTaxReportSummary" style="background:rgba(38,161,123,0.08);border:1px solid rgba(38,161,123,0.28);border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--text-muted)"></div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;margin-bottom:10px;font-size:14px" onclick="if(typeof wwTaxExportCsv==='function')wwTaxExportCsv()">导出 CSV 文件</button>
        <p style="font-size:11px;color:var(--text-muted);line-height:1.55;margin:0">若记录为空，请先在首页「最近交易」处点击刷新加载链上数据后再导出。</p>
      </div>
    </div>

    <!-- 跟单交易 -->
    <div class="page" id="page-copy-trading">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">跟单交易</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:rgba(200,168,75,0.08);border:1px solid rgba(200,168,75,0.28);border-radius:12px;padding:10px 12px;margin-bottom:14px;font-size:11px;line-height:1.6;color:var(--text-muted)"><b style="color:var(--gold)">风险提示</b>：以下为本地登记监控地址的示意功能，不会自动下单；实盘跟单需对接交易所 / 智能合约，请务必自行验证策略与合约安全。</div>
        <label style="font-size:12px;color:var(--text);display:block;margin-bottom:6px;font-weight:600">巨鲸 / 目标地址（每行一个）</label>
        <textarea id="wwCopyWatchInput" rows="5" placeholder="T… 或 0x…" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px;line-height:1.45;resize:vertical;font-family:ui-monospace,monospace"></textarea>
        <button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:12px;font-size:13px" onclick="if(typeof wwCopyTradingSave==='function')wwCopyTradingSave()">保存监控列表</button>
        <div id="wwCopyWatchList" style="margin-top:14px"></div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO map ───────────────────────────────────────────────────────
    n_seo = """  'page-dex-connect': { title: '连接 DEX — WorldToken', description: '跳转 Uniswap 等 DEX 并用 WalletConnect 连接钱包。' }
};"""
    i_seo = """  'page-dex-connect': { title: '连接 DEX — WorldToken', description: '跳转 Uniswap 等 DEX 并用 WalletConnect 连接钱包。' },
  'page-hardware-wallet': { title: '硬件钱包 — WorldToken', description: 'Ledger / Trezor 连接说明与官方支持入口。' },
  'page-tax-report': { title: '税务报表 — WorldToken', description: '导出交易历史 CSV 供税务申报参考。' },
  'page-copy-trading': { title: '跟单交易 — WorldToken', description: '登记监控巨鲸地址（本地示意，非自动交易）。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO anchor not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ────────────────────────────────────────────────
    n_go = """  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch(_dx) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch(_dx) {} }
  if(pageId==='page-hardware-wallet') { try { if(typeof wwHardwareWalletPopulate==='function') setTimeout(wwHardwareWalletPopulate, 40); } catch(_hw) {} }
  if(pageId==='page-tax-report') { try { if(typeof wwTaxReportPopulate==='function') setTimeout(wwTaxReportPopulate, 40); } catch(_tr) {} }
  if(pageId==='page-copy-trading') { try { if(typeof wwCopyTradingPopulate==='function') setTimeout(wwCopyTradingPopulate, 40); } catch(_cp) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("showPage dex/charts anchor not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS: after wwDexConnectPopulate ────────────────────────────────
    n_js = """function wwDexConnectPopulate() {
  var el = document.getElementById('wwDexAddrHint');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">ETH</div><div style="color:var(--text)">' + REAL_WALLET.ethAddress + '</div>' +
        '<div style="margin:10px 0 6px;color:var(--text-muted)">TRX</div><div style="color:var(--text)">' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwOpenDexUniswap() {"""
    i_js = """function wwDexConnectPopulate() {
  var el = document.getElementById('wwDexAddrHint');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">ETH</div><div style="color:var(--text)">' + REAL_WALLET.ethAddress + '</div>' +
        '<div style="margin:10px 0 6px;color:var(--text-muted)">TRX</div><div style="color:var(--text)">' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwHardwareWalletPopulate() {
  var el = document.getElementById('wwHardwareAddrEcho');
  if (!el) return;
  try {
    if (REAL_WALLET && REAL_WALLET.ethAddress && REAL_WALLET.trxAddress) {
      el.innerHTML = '<div style="margin-bottom:6px;color:var(--text-muted)">与本钱包核对地址</div><div style="color:var(--text);font-size:12px">ETH: ' + REAL_WALLET.ethAddress + '</div><div style="color:var(--text);font-size:12px;margin-top:6px">TRX: ' + REAL_WALLET.trxAddress + '</div>';
    } else {
      el.textContent = '请先创建或导入钱包后再与硬件设备显示地址逐项核对。';
    }
  } catch (e) {
    el.textContent = '—';
  }
}

function wwOpenLedgerSupport() {
  try { if (window.open) window.open('https://support.ledger.com/', '_blank', 'noopener,noreferrer'); } catch (e) {}
  if (typeof showToast === 'function') showToast('请在官方支持页查看设备与链兼容说明', 'info', 2800);
}

function wwOpenTrezorSupport() {
  try { if (window.open) window.open('https://trezor.io/learn/', '_blank', 'noopener,noreferrer'); } catch (e) {}
}

function wwTaxReportPopulate() {
  var sum = document.getElementById('wwTaxReportSummary');
  if (!sum) return;
  var n = 0;
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) n = window._wwTxHistoryCache.length;
  } catch (e) { n = 0; }
  sum.textContent = '当前可导出记录条数：' + n + '（来自首页交易历史缓存）';
}

function wwTaxExportCsv() {
  var rows = [];
  try {
    if (window._wwTxHistoryCache && Array.isArray(window._wwTxHistoryCache)) rows = window._wwTxHistoryCache.slice();
  } catch (e) { rows = []; }
  if (!rows.length) {
    if (typeof showToast === 'function') showToast('暂无缓存记录，请先在首页刷新交易历史', 'info', 3200);
    return;
  }
  var esc = function (s) {
    var t = String(s == null ? '' : s);
    if (/[",\\n\\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  };
  var lines = ['date,type,coin,amount,counterparty,tx_hash'];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    lines.push([esc(r.time), esc(r.type), esc(r.coin), esc(r.amount), esc(r.addr), esc(r.hash)].join(','));
  }
  var blob = new Blob([lines.join('\\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'worldwallet-tx-tax-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { try { URL.revokeObjectURL(a.href); document.body.removeChild(a); } catch (e2) {} }, 800);
  if (typeof showToast === 'function') showToast('已生成 CSV（请自行核对字段）', 'success', 2400);
}

function wwCopyTradingPopulate() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  try {
    var raw = localStorage.getItem('ww_copy_watch_v1') || '';
    var ar = [];
    try { ar = JSON.parse(raw); } catch (e) { ar = []; }
    if (Array.isArray(ar) && ar.length) {
      ta.value = ar.map(function (x) { return (x && x.addr) ? String(x.addr) : ''; }).filter(Boolean).join('\\n');
    }
  } catch (e2) {}
  wwCopyTradingRenderList();
}

function wwCopyTradingSave() {
  var ta = document.getElementById('wwCopyWatchInput');
  if (!ta) return;
  var lines = String(ta.value || '').split(/[\\n,;\\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  var ar = lines.map(function (addr) { return { addr: addr }; });
  try { localStorage.setItem('ww_copy_watch_v1', JSON.stringify(ar)); } catch (e) {}
  wwCopyTradingRenderList();
  if (typeof showToast === 'function') showToast('已保存 ' + ar.length + ' 个地址（本机）', 'success', 2200);
}

function wwCopyTradingRenderList() {
  var host = document.getElementById('wwCopyWatchList');
  if (!host) return;
  var ar = [];
  try { ar = JSON.parse(localStorage.getItem('ww_copy_watch_v1') || '[]'); } catch (e) { ar = []; }
  if (!Array.isArray(ar) || !ar.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无监控地址</div>';
    return;
  }
  host.innerHTML = ar.map(function (c, i) {
    var a = (c && c.addr) ? String(c.addr) : '';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:11px;word-break:break-all;display:flex;justify-content:space-between;gap:8px;align-items:center"><span style="color:var(--text)">' + a.replace(/</g, '') + '</span><span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="if(typeof wwCopyTradingRemove==='function')wwCopyTradingRemove(' + i + ')">移除</span></div>';
  }).join('');
}

function wwCopyTradingRemove(idx) {
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
    if n_js not in raw:
        raise SystemExit("wwDexConnectPopulate / wwOpenDexUniswap anchor not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched — {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
