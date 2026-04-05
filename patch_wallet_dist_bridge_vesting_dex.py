#!/usr/bin/env python3
"""Cross-chain bridge UI (TRX/ETH), token vesting schedule view, DEX connect (Uniswap / SunSwap) — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-bridge"',
    'id="page-vesting"',
    'id="page-dex-connect"',
    "function wwOpenDexUniswap(",
    "function wwVestingRender(",
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

    # ── Settings: 3 rows after 巨鲸提醒 ───────────────────────────────
    n_set = """          <div class="settings-row" onclick="goTo('page-whale-alerts')">
            <span class="settings-icon">🐋</span>
            <span class="settings-label">巨鲸提醒</span>
            <span class="settings-value" id="settingsWhaleValue" style="font-size:11px;color:var(--text-muted)">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>


        <div id="wwPriceAlertSection" """
    i_set = """          <div class="settings-row" onclick="goTo('page-whale-alerts')">
            <span class="settings-icon">🐋</span>
            <span class="settings-label">巨鲸提醒</span>
            <span class="settings-value" id="settingsWhaleValue" style="font-size:11px;color:var(--text-muted)">关闭</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-bridge')">
            <span class="settings-icon">🌉</span>
            <span class="settings-label">跨链桥</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">TRX ↔ ETH</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-vesting')">
            <span class="settings-icon">📅</span>
            <span class="settings-label">代币解锁</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">进度</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-dex-connect')">
            <span class="settings-icon">🔗</span>
            <span class="settings-label">连接 DEX</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">Uniswap</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>


        <div id="wwPriceAlertSection" """
    if n_set not in raw:
        raise SystemExit("anchor whale row / wwPriceAlertSection not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: bridge / vesting / dex (before 恢复演练) ───────────────
    n_pg = """      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """      </div>
    </div>

    <!-- 跨链桥 -->
    <div class="page" id="page-bridge">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">跨链桥</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">在 <b>TRON</b> 与 <b>以太坊</b> 之间转移资产通常通过<strong>第三方桥</strong>或交易所。以下为示意界面，请核对官方合约与手续费。</div>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">从</div>
        <select id="wwBridgeFrom" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;margin-bottom:12px" onchange="if(typeof wwBridgeSyncTo==='function')wwBridgeSyncTo()">
          <option value="trx">Tron (TRC20)</option>
          <option value="eth">Ethereum (ERC20)</option>
        </select>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">到</div>
        <select id="wwBridgeTo" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;margin-bottom:12px" disabled>
          <option value="eth">Ethereum (ERC20)</option>
          <option value="trx">Tron (TRC20)</option>
        </select>
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">代币（示意）</div>
        <input id="wwBridgeToken" type="text" placeholder="USDT" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;margin-bottom:12px" />
        <div style="font-size:12px;margin-bottom:6px;color:var(--text)">数量</div>
        <input id="wwBridgeAmount" type="text" inputmode="decimal" placeholder="0.0" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:15px;margin-bottom:14px" />
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;margin-bottom:10px;font-size:13px" onclick="if(typeof wwBridgeCopyRecvAddr==='function')wwBridgeCopyRecvAddr()">复制收款地址（当前钱包）</button>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;margin-bottom:10px;font-size:14px" onclick="if(typeof wwBridgeOpenStargate==='function')wwBridgeOpenStargate()">打开 Stargate（多链桥）</button>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:13px" onclick="if(typeof wwBridgeOpenTronDocs==='function')wwBridgeOpenTronDocs()">Tron 文档 — 跨链说明</button>
      </div>
    </div>

    <!-- 代币解锁 -->
    <div class="page" id="page-vesting">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">代币解锁</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:12px">展示「锁定 / 已解锁」比例随时间变化（本机示例数据，可对接真实锁仓合约）。</div>
        <div id="wwVestingTimeline" style="margin-bottom:14px"></div>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:13px" onclick="if(typeof wwVestingResetDemo==='function')wwVestingResetDemo()">恢复示例进度</button>
      </div>
    </div>

    <!-- 连接 DEX -->
    <div class="page" id="page-dex-connect">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">连接 DEX</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">在浏览器中打开去中心化交易所，使用 <b>WalletConnect</b> 或浏览器插件连接与本应用相同的地址。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12px;word-break:break-all" id="wwDexAddrHint">当前地址加载中…</div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px;margin-bottom:10px;font-size:14px" onclick="wwOpenDexUniswap()">打开 Uniswap（以太坊）</button>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;margin-bottom:10px;font-size:13px" onclick="if(typeof wwOpenDexSunswap==='function')wwOpenDexSunswap()">打开 SunSwap（TRON）</button>
        <button type="button" class="btn-secondary" style="width:100%;padding:12px;font-size:13px" onclick="if(typeof wwOpenDexOneinch==='function')wwOpenDexOneinch()">打开 1inch 聚合器</button>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO map ─────────────────────────────────────────────────────
    n_seo = """  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' }
};"""
    i_seo = """  'page-charts': { title: '行情 — WorldToken', description: 'K 线图表占位与高级行情分析入口。' },
  'page-dapp': { title: 'DApp 浏览器 — WorldToken', description: '在应用内打开去中心化应用链接。' },
  'page-bridge': { title: '跨链桥 — WorldToken', description: 'TRON 与以太坊之间跨链桥接示意与第三方入口。' },
  'page-vesting': { title: '代币解锁 — WorldToken', description: '锁定与解锁代币进度时间线（本地示意）。' },
  'page-dex-connect': { title: '连接 DEX — WorldToken', description: '跳转 Uniswap 等 DEX 并用 WalletConnect 连接钱包。' }
};"""
    if n_seo not in raw:
        raise SystemExit("anchor WW_PAGE_SEO tail not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── goTo() hooks ────────────────────────────────────────────────
    n_go = """  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch(_wh) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-whale-alerts') { try { if(typeof wwWhalePopulate==='function') setTimeout(wwWhalePopulate, 40); } catch(_wh) {} }
  if(pageId==='page-bridge') { try { setTimeout(function(){ if(typeof wwBridgeSyncTo==='function') wwBridgeSyncTo(); }, 0); } catch(_br) {} }
  if(pageId==='page-vesting') { try { if(typeof wwVestingRender==='function') setTimeout(wwVestingRender, 40); } catch(_ve) {} }
  if(pageId==='page-dex-connect') { try { if(typeof wwDexConnectPopulate==='function') setTimeout(wwDexConnectPopulate, 40); } catch(_dx) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("anchor goTo whale/charts not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS: after wwWhaleSaveFromUI block ─────────────────────────────
    n_js = """function wwRequestWhaleNotifyPermission() {
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
function wwSocialRecoveryRender() {"""
    i_js = """function wwRequestWhaleNotifyPermission() {
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

function wwBridgeSyncTo() {
  var f = document.getElementById('wwBridgeFrom');
  var t = document.getElementById('wwBridgeTo');
  if (!f || !t) return;
  var v = f.value === 'trx' ? 'eth' : 'trx';
  for (var i = 0; i < t.options.length; i++) {
    if (t.options[i].value === v) { t.selectedIndex = i; break; }
  }
}

function wwBridgeCopyRecvAddr() {
  var f = document.getElementById('wwBridgeFrom');
  var want = f && f.value === 'eth' ? 'eth' : 'trx';
  var addr = '';
  try {
    if (REAL_WALLET) {
      addr = want === 'eth' ? (REAL_WALLET.ethAddress || '') : (REAL_WALLET.trxAddress || '');
    }
  } catch (e) {}
  if (!addr) {
    if (typeof showToast === 'function') showToast('暂无钱包地址', 'info');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(function () {
        if (typeof showToast === 'function') showToast('已复制 ' + want.toUpperCase() + ' 地址', 'success');
      });
    } else {
      prompt('复制地址', addr);
    }
  } catch (e2) {}
}

function wwBridgeOpenStargate() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://www.stargate.finance/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://www.stargate.finance/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('请在桥接站点选择网络与代币，并核对合约', 'info', 3200);
}

function wwBridgeOpenTronDocs() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://developers.tron.network/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://developers.tron.network/';
  } catch (e) {}
}

function wwVestingRender() {
  var host = document.getElementById('wwVestingTimeline');
  if (!host) return;
  var rows = null;
  try { rows = JSON.parse(localStorage.getItem('ww_vesting_demo_v1') || 'null'); } catch (e) { rows = null; }
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    rows = [
      { t: 'T0', unlockedPct: 0 },
      { t: '第 3 月', unlockedPct: 25 },
      { t: '第 6 月', unlockedPct: 60 },
      { t: '第 12 月', unlockedPct: 100 }
    ];
  }
  host.innerHTML = rows.map(function (r) {
    var u = Math.max(0, Math.min(100, parseFloat(r.unlockedPct) || 0));
    var lk = 100 - u;
    var esc = function (s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:var(--text)">' + esc(r.t) + '</span><span style="color:var(--text-muted)">已解锁 ' + u.toFixed(0) + '% · 锁定 ' + lk.toFixed(0) + '%</span></div>' +
      '<div style="height:10px;border-radius:8px;background:var(--bg3);overflow:hidden;display:flex">' +
      '<div style="width:' + u + '%;background:linear-gradient(90deg,#26a17b,#4fd1a5)"></div>' +
      '<div style="width:' + lk + '%;background:rgba(200,168,75,0.35)"></div></div></div>';
  }).join('');
}

function wwVestingResetDemo() {
  try { localStorage.removeItem('ww_vesting_demo_v1'); } catch (e) {}
  wwVestingRender();
  if (typeof showToast === 'function') showToast('已恢复示例进度', 'info');
}

function wwDexConnectPopulate() {
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

function wwOpenDexUniswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.uniswap.org/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.uniswap.org/';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 Uniswap 使用 WalletConnect 连接与上述相同的地址', 'info', 3600);
}

function wwOpenDexSunswap() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://sunswap.com/#/home', '_blank', 'noopener,noreferrer');
    else location.href = 'https://sunswap.com/#/home';
  } catch (e) {}
  if (typeof showToast === 'function') showToast('在 SunSwap 使用 TronLink / WalletConnect', 'info', 3200);
}

function wwOpenDexOneinch() {
  try {
    if (typeof window !== 'undefined' && window.open) window.open('https://app.1inch.io/', '_blank', 'noopener,noreferrer');
    else location.href = 'https://app.1inch.io/';
  } catch (e) {}
}

function wwSocialRecoveryRender() {"""
    if n_js not in raw:
        raise SystemExit("anchor wwRequestWhaleNotifyPermission / wwSocialRecoveryRender not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
