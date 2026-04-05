#!/usr/bin/env python3
"""Gas token reserve manager, transaction simulation preview, MEV / private-mempool toggle — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="wwGasManagerCard"',
    'id="wwMevToggleRow"',
    'id="wwTxSimulatePanel"',
    "function wwGasManagerRender(",
    "function wwUpdateTxSimulation(",
    "function wwMevToggleInit(",
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

    # ── Settings: gas manager card (before 价格提醒) ─────────────────
    n_gas = """        </div>


        <div id="wwPriceAlertSection" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    i_gas = """        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;color:var(--text)">⛽ Gas 代币储备</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.55">本机记录目标阈值，与首页余额对比（示意，非托管）。用于提醒保留足够 TRX / ETH 支付网络费。</div>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="color:var(--text-muted)">TRX（当前）</span>
              <span style="font-weight:600;color:var(--text)" id="wwGasTrxCurrent">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="color:var(--text-muted)">ETH（当前）</span>
              <span style="font-weight:600;color:var(--text)" id="wwGasEthCurrent">—</span>
            </div>
            <label style="display:flex;flex-direction:column;gap:4px">
              <span style="font-size:11px;color:var(--text-muted)">目标 TRX 储备</span>
              <input id="wwGasTrxTarget" type="text" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px" oninput="wwGasSaveTargets()" />
            </label>
            <label style="display:flex;flex-direction:column;gap:4px">
              <span style="font-size:11px;color:var(--text-muted)">目标 ETH 储备</span>
              <input id="wwGasEthTarget" type="text" inputmode="decimal" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px" oninput="wwGasSaveTargets()" />
            </label>
            <div id="wwGasStatus" style="font-size:11px;padding:8px 10px;border-radius:10px;background:rgba(38,161,123,0.08);border:1px solid rgba(38,161,123,0.25);color:var(--text-muted);line-height:1.5"></div>
          </div>
        </div>


        <div id="wwPriceAlertSection" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    if n_gas not in raw:
        raise SystemExit("anchor before wwPriceAlertSection not found")
    raw = raw.replace(n_gas, i_gas, 1)

    # ── Transfer: MEV row + simulation panel ─────────────────────────
    n_tr = """        </div>

        <!-- 手续费 -->
        <div id="transferFeeRow" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 16px;margin-bottom:20px">"""
    i_tr = """        </div>

        <div id="wwMevToggleRow" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <div style="font-size:13px;font-weight:600;color:var(--text)">MEV 保护（示意）</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;line-height:1.45">开启后优先通过私有中继 / 私有内存池路由（本地开关，实际路由取决于钱包后端）。</div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none">
            <input type="checkbox" id="wwMevToggle" onchange="wwMevSave()" style="width:18px;height:18px;accent-color:var(--gold)" />
            <span style="font-size:12px;color:var(--text-muted)">私有中继</span>
          </label>
        </div>

        <div id="wwTxSimulatePanel" style="background:rgba(98,126,234,0.06);border:1px solid rgba(98,126,234,0.28);border-radius:14px;padding:12px 14px;margin-bottom:14px">
          <div style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text)">🔍 交易模拟预览</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;line-height:1.5">根据当前表单估算将发生的动作（本地示意，非链上 eth_call）。</div>
          <pre id="wwTxSimulateBody" style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;color:var(--text);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg3);padding:10px;border-radius:10px;border:1px solid var(--border);min-height:72px"></pre>
        </div>

        <!-- 手续费 -->
        <div id="transferFeeRow" style="display:none;background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 16px;margin-bottom:20px">"""
    if n_tr not in raw:
        raise SystemExit("anchor transfer gas / transferFeeRow not found")
    raw = raw.replace(n_tr, i_tr, 1)

    # ── goTo: settings + transfer hooks ──────────────────────────────
    n_go1 = """  if(pageId==='page-settings') updateSettingsPage();"""
    i_go1 = """  if(pageId==='page-settings') {
    updateSettingsPage();
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}
  }"""
    if n_go1 not in raw:
        raise SystemExit("anchor goTo page-settings not found")
    raw = raw.replace(n_go1, i_go1, 1)

    n_go2 = """  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
  }"""
    i_go2 = """  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
    try { if(typeof wwMevToggleInit==='function') wwMevToggleInit(); } catch(_wm) {}
  }"""
    if n_go2 not in raw:
        raise SystemExit("anchor goTo page-transfer not found")
    raw = raw.replace(n_go2, i_go2, 1)

    # ── JS: after calcTransferFee ─────────────────────────────────────
    n_cf = """  checkTransferReady();
}

function setTransferMax() {"""
    i_cf = """  checkTransferReady();
  try { if(typeof wwUpdateTxSimulation==='function') wwUpdateTxSimulation(); } catch(_ws) {}
}

function setTransferMax() {"""
    if n_cf not in raw:
        raise SystemExit("anchor end calcTransferFee / setTransferMax not found")
    raw = raw.replace(n_cf, i_cf, 1)

    # ── JS: helpers before setTransferMax ───────────────────────────
    n_pre = """function setTransferMax() {
  document.getElementById('transferAmount').value = transferCoin.bal;
  calcTransferFee();
}"""

    i_pre = r"""function wwMevToggleInit() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  c.checked = (localStorage.getItem('ww_mev_private') === '1');
}

function wwMevSave() {
  var c = document.getElementById('wwMevToggle');
  if(!c) return;
  localStorage.setItem('ww_mev_private', c.checked ? '1' : '0');
  try { if(typeof wwUpdateTxSimulation==='function') wwUpdateTxSimulation(); } catch(e) {}
  if(typeof showToast==='function') showToast(c.checked ? '已开启 MEV 保护（示意）' : '已使用公开内存池（示意）', 'info', 2200);
}

function wwGasSaveTargets() {
  var a = document.getElementById('wwGasTrxTarget');
  var b = document.getElementById('wwGasEthTarget');
  if(a && a.value != null) localStorage.setItem('ww_gas_target_trx', String(a.value).trim());
  if(b && b.value != null) localStorage.setItem('ww_gas_target_eth', String(b.value).trim());
  try { wwGasManagerRender(); } catch(e) {}
}

function wwGasManagerRender() {
  var trxCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='trx'; }) : null;
  var ethCoin = (typeof COINS !== 'undefined' && COINS.find) ? COINS.find(function(c){ return c && c.id==='eth'; }) : null;
  var tc = document.getElementById('wwGasTrxCurrent');
  var ec = document.getElementById('wwGasEthCurrent');
  if(tc) tc.textContent = trxCoin && trxCoin.bal != null ? Number(trxCoin.bal).toFixed(4) : '—';
  if(ec) ec.textContent = ethCoin && ethCoin.bal != null ? Number(ethCoin.bal).toFixed(6) : '—';
  var ti = document.getElementById('wwGasTrxTarget');
  var ei = document.getElementById('wwGasEthTarget');
  var st = localStorage.getItem('ww_gas_target_trx');
  var se = localStorage.getItem('ww_gas_target_eth');
  if(ti && (st==null || st==='')) { ti.value = '50'; localStorage.setItem('ww_gas_target_trx','50'); }
  else if(ti && st) ti.value = st;
  if(ei && (se==null || se==='')) { ei.value = '0.02'; localStorage.setItem('ww_gas_target_eth','0.02'); }
  else if(ei && se) ei.value = se;
  var tt = parseFloat(ti && ti.value) || 50;
  var et = parseFloat(ei && ei.value) || 0.02;
  var bt = trxCoin ? Number(trxCoin.bal) || 0 : 0;
  var be = ethCoin ? Number(ethCoin.bal) || 0 : 0;
  var stEl = document.getElementById('wwGasStatus');
  if(stEl) {
    var okT = bt >= tt * 0.85;
    var okE = be >= et * 0.85;
    stEl.textContent = okT && okE
      ? '✓ Gas 代币储备相对目标充足（示意）。'
      : '⚠ 建议保留更多 TRX/ETH 以应对拥堵与合约交互（示意）。 TRX: ' + bt.toFixed(2) + ' / 目标 ' + tt + ' · ETH: ' + be.toFixed(4) + ' / 目标 ' + et;
    stEl.style.borderColor = okT && okE ? 'rgba(38,161,123,0.35)' : 'rgba(200,120,80,0.4)';
  }
}

function wwUpdateTxSimulation() {
  var host = document.getElementById('wwTxSimulateBody');
  if(!host) return;
  var amtEl = document.getElementById('transferAmount');
  var addrEl = document.getElementById('transferAddr');
  var amt = amtEl ? parseFloat(amtEl.value) || 0 : 0;
  var addr = addrEl ? String(addrEl.value || '').trim() : '';
  var coin = (typeof transferCoin !== 'undefined' && transferCoin) ? transferCoin : { name:'?', chain:'?' };
  var nf = (typeof getNetworkFeeEstimateLines === 'function') ? getNetworkFeeEstimateLines(coin.id) : { line:'—', sub:'' };
  var mev = (localStorage.getItem('ww_mev_private') === '1');
  var lines = [];
  lines.push('操作: 转账 ' + (amt > 0 ? amt : 0) + ' ' + (coin.name || '') + ' → ' + (addr || '（未填地址）'));
  lines.push('网络: ' + (coin.chain || '—'));
  lines.push('预估网络费: ' + nf.line + (nf.sub ? ' · ' + nf.sub : ''));
  lines.push('MEV 路由: ' + (mev ? '私有中继（示意）' : '公开内存池'));
  lines.push('风险: 请再次核对地址与金额；本预览不保证与链上结果一致。');
  host.textContent = lines.join('\n');
}

function setTransferMax() {
  document.getElementById('transferAmount').value = transferCoin.bal;
  calcTransferFee();
}"""

    if n_pre not in raw:
        raise SystemExit("anchor setTransferMax block not found")
    raw = raw.replace(n_pre, i_pre, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
