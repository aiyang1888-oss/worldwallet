#!/usr/bin/env python3
"""Add home price ticker, portfolio pie chart, and transfer fee speed tier to dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    orig_lines = len(raw.splitlines())

    # Bundle may already include ticker / pie / fee speed (merged out-of-order vs this script).
    _markers = (
        'id="wwPriceTickerBar"',
        "function getTransferFeeSpeed(",
        "function drawPortfolioPieChart(",
    )
    if all(m in raw for m in _markers):
        sz = DIST.stat().st_size
        lines = len(raw.splitlines())
        print(f"OK: already applied — {DIST} ({lines} lines, {sz} bytes)")
        if sz < 800_000:
            raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
        return

    # ── CSS (ticker + pie + speed buttons) ───────────────────────────
    needle_css = """.home-balance-chart-foot { display: flex; justify-content: space-between; font-size: 9px; color: rgba(255,255,255,0.38); margin-top: 4px; padding: 0 2px; }
.transfer-contacts-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 12px 14px; margin-bottom: 14px; }"""
    insert_css = """.home-balance-chart-foot { display: flex; justify-content: space-between; font-size: 9px; color: rgba(255,255,255,0.38); margin-top: 4px; padding: 0 2px; }
.ww-price-ticker-bar { overflow: hidden; width: 100%; background: linear-gradient(90deg, rgba(18,14,28,0.98), rgba(26,22,40,0.95)); border-bottom: 1px solid var(--border); padding: 9px 0; margin: 0 0 0 0; }
.ww-price-ticker-marquee { display: flex; width: max-content; animation: wwTickerScroll 32s linear infinite; }
.ww-price-ticker-marquee:hover { animation-play-state: paused; }
@keyframes wwTickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.ww-ticker-text { display: inline-block; padding-right: 56px; font-size: 12px; color: rgba(255,255,255,0.82); letter-spacing: 0.25px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ww-ticker-text strong { color: var(--gold-light); font-weight: 700; margin-left: 5px; }
.ww-portfolio-pie-card { margin: 0 16px 12px; padding: 14px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; }
.ww-portfolio-pie-title { font-size: 11px; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 10px; }
.ww-portfolio-pie-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.ww-portfolio-pie-legend { flex: 1; min-width: 140px; font-size: 12px; line-height: 1.65; color: var(--text); }
.ww-portfolio-pie-legend div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ww-pie-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-right: 6px; display: inline-block; }
.ww-speed-btn { flex: 1; min-width: 0; padding: 10px 8px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg3); color: var(--text-muted); font-size: 12px; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s; }
.ww-speed-btn--active { border-color: rgba(200,168,75,0.65); background: rgba(200,168,75,0.12); color: var(--gold-light); font-weight: 600; }
.transfer-contacts-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 16px; padding: 12px 14px; margin-bottom: 14px; }"""
    if needle_css not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: anchor CSS not found")
    raw = raw.replace(needle_css, insert_css, 1)

    # ── Ticker HTML (top of home) ───────────────────────────────────────
    needle_home = """    <!-- 首页 -->
    <div class="page" id="page-home">
      <div class="home-header" style="position:relative">"""
    insert_home = """    <!-- 首页 -->
    <div class="page" id="page-home">
      <div class="ww-price-ticker-bar" id="wwPriceTickerBar">
        <div class="ww-price-ticker-marquee">
          <span class="ww-ticker-text" id="wwTickerTextA">BTC <strong id="tickBtc">—</strong> · ETH <strong id="tickEth">—</strong> · TRX <strong id="tickTrx">—</strong> · USDT <strong id="tickUsdt">—</strong></span>
          <span class="ww-ticker-text" id="wwTickerTextB" aria-hidden="true">BTC <strong>—</strong> · ETH <strong>—</strong> · TRX <strong>—</strong> · USDT <strong>—</strong></span>
        </div>
      </div>
      <div class="home-header" style="position:relative">"""
    if needle_home not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: anchor home header not found")
    raw = raw.replace(needle_home, insert_home, 1)

    # ── Portfolio pie (before 我的资产) ─────────────────────────────────
    needle_pie = """      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    insert_pie = """      </div>
      <div id="wwPortfolioPieCard" class="ww-portfolio-pie-card" style="display:none">
        <div class="ww-portfolio-pie-title">资产占比</div>
        <div class="ww-portfolio-pie-row">
          <canvas id="portfolioPieCanvas" width="168" height="168" style="flex-shrink:0;display:block"></canvas>
          <div class="ww-portfolio-pie-legend" id="portfolioPieLegend"></div>
        </div>
      </div>
      <div class="assets-section">
        <div class="assets-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>我的资产</span>"""
    if needle_pie not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: anchor assets-section not found")
    raw = raw.replace(needle_pie, insert_pie, 1)

    # ── Fee speed row (transfer page) ───────────────────────────────────
    needle_speed = """        </div>




        <!-- 手续费 -->"""
    insert_speed = """        </div>

        <div id="transferSpeedRow" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:12px 16px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.5px">交易速度（网络费档位）</div>
          <div style="display:flex;gap:8px">
            <button type="button" class="ww-speed-btn" data-speed="slow" onclick="setTransferFeeSpeed('slow')">慢</button>
            <button type="button" class="ww-speed-btn" data-speed="normal" onclick="setTransferFeeSpeed('normal')">标准</button>
            <button type="button" class="ww-speed-btn" data-speed="fast" onclick="setTransferFeeSpeed('fast')">快</button>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:8px;line-height:1.45">链上实际费用以网络为准；较快档位会提高能量 / Gas 上限以优先确认。</div>
        </div>

        <!-- 手续费 -->"""
    if needle_speed not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: anchor transfer speed not found")
    raw = raw.replace(needle_speed, insert_speed, 1)

    # ── JS helpers (before getNetworkFeeEstimateLines) ───────────────────
    needle_js = """function getNetworkFeeEstimateLines(coinId) {
  const map = {
    usdt: { line: '≈ 8.5 TRX · 合约能量（示意）', sub: '约 30 秒内确认' },
    trx: { line: '≈ 1.0 TRX · 带宽消耗（示意）', sub: '约 1 分钟内确认' },
    eth: { line: '≈ 0.0012 ETH · Gas ~35 Gwei（示意）', sub: '约 2–5 分钟确认' },
    btc: { line: '≈ 1.2k sat/vB · 费率档（示意）', sub: '约 20–60 分钟确认' }
  };
  return map[coinId] || map.usdt;
}"""
    insert_js = r"""function getTransferFeeSpeed() {
  try {
    const s = localStorage.getItem('ww_transfer_fee_speed');
    if(s === 'slow' || s === 'normal' || s === 'fast') return s;
  } catch(e) {}
  return 'normal';
}
function setTransferFeeSpeed(speed) {
  if(speed !== 'slow' && speed !== 'normal' && speed !== 'fast') speed = 'normal';
  try { localStorage.setItem('ww_transfer_fee_speed', speed); } catch(e) {}
  document.querySelectorAll('.ww-speed-btn').forEach(function(b) {
    const on = b.getAttribute('data-speed') === speed;
    b.classList.toggle('ww-speed-btn--active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if(typeof calcTransferFee === 'function') calcTransferFee();
}
function initTransferFeeSpeedUI() {
  setTransferFeeSpeed(getTransferFeeSpeed());
}
function getTronFeeLimitUsdt() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 15000000;
  if(sp === 'fast') return 50000000;
  return 20000000;
}
function getTronFeeLimitTrx() {
  const sp = getTransferFeeSpeed();
  if(sp === 'slow') return 10000000;
  if(sp === 'fast') return 45000000;
  return 25000000;
}
function transferSpeedHint(coinId, sp) {
  const m = {
    usdt: { slow: '经济 · 约 1–3 分钟', normal: '标准 · 约 30 秒', fast: '快速 · 约 15–45 秒' },
    trx: { slow: '经济 · 约 1–2 分钟', normal: '标准 · 约 1 分钟', fast: '快速 · 约 20–40 秒' },
    eth: { slow: '经济 · 约 5–15 分钟', normal: '标准 · 约 2–5 分钟', fast: '快速 · 约 30–90 秒' },
    btc: { slow: '经济', normal: '标准', fast: '快速' }
  };
  return ((m[coinId] || m.usdt)[sp]) || m.usdt.normal;
}
let _wwTickerInterval = null;
async function refreshHomePriceTicker() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tron,tether&vs_currencies=usd');
    const d = await r.json();
    const fmt = function(x) {
      if(x === undefined || x === null || !isFinite(x)) return '—';
      return x < 10 ? x.toFixed(4) : x.toLocaleString('en', { maximumFractionDigits: 2 });
    };
    const btc = fmt(d.bitcoin && d.bitcoin.usd);
    const eth = fmt(d.ethereum && d.ethereum.usd);
    const trx = fmt(d.tron && d.tron.usd);
    const ust = fmt(d.tether && d.tether.usd);
    const html = 'BTC <strong>$' + btc + '</strong> · ETH <strong>$' + eth + '</strong> · TRX <strong>$' + trx + '</strong> · USDT <strong>$' + ust + '</strong>';
    const a = document.getElementById('wwTickerTextA');
    const b = document.getElementById('wwTickerTextB');
    if(a) a.innerHTML = html;
    if(b) b.innerHTML = html;
    if(!_wwTickerInterval) {
      _wwTickerInterval = setInterval(function() { refreshHomePriceTicker(); }, 90000);
    }
  } catch(e) {}
}
function drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd) {
  const card = document.getElementById('wwPortfolioPieCard');
  const c = document.getElementById('portfolioPieCanvas');
  const leg = document.getElementById('portfolioPieLegend');
  if(!card || !c || !leg) return;
  const parts = [
    { v: Number(usdtUsd) || 0, c: '#26a17b', l: 'USDT' },
    { v: Number(trxUsd) || 0, c: '#e84d4d', l: 'TRX' },
    { v: Number(ethUsd) || 0, c: '#627eea', l: 'ETH' },
    { v: Number(btcUsd) || 0, c: '#f7931a', l: 'BTC' }
  ];
  const total = parts.reduce(function(a, p) { return a + p.v; }, 0);
  if(total <= 1e-9) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 6;
  ctx.clearRect(0, 0, w, h);
  let ang = -Math.PI / 2;
  parts.forEach(function(p) {
    if(p.v <= 0) return;
    const slice = (p.v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, ang, ang + slice);
    ctx.closePath();
    ctx.fillStyle = p.c;
    ctx.fill();
    ang += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = '#0f0f18';
  ctx.fill();
  let htm = '';
  parts.forEach(function(p) {
    const pct = total > 0 ? (100 * p.v / total).toFixed(1) : '0';
    htm += '<div><span><span class="ww-pie-dot" style="background:' + p.c + '"></span>' + p.l + '</span><span>' + pct + '%</span></div>';
  });
  leg.innerHTML = htm;
}
function getNetworkFeeEstimateLines(coinId) {
  const sp = typeof getTransferFeeSpeed === 'function' ? getTransferFeeSpeed() : 'normal';
  const usdtMap = {
    slow: { line: '≈ 6–8 TRX · 能量上限（经济档）', sub: '确认较慢，费用较低' },
    normal: { line: '≈ 8.5 TRX · 合约能量（示意）', sub: '约 30 秒内确认' },
    fast: { line: '≈ 12–18 TRX · 能量上限（快速档）', sub: '优先确认' }
  };
  const trxMap = {
    slow: { line: '≈ 0.8 TRX · 带宽（经济档）', sub: '约 1–2 分钟' },
    normal: { line: '≈ 1.0 TRX · 带宽消耗（示意）', sub: '约 1 分钟内确认' },
    fast: { line: '≈ 1.2 TRX · 带宽（快速档）', sub: '约 20–40 秒' }
  };
  const ethG = { slow: '~26–30 Gwei', normal: '~35 Gwei', fast: '~42–50 Gwei' };
  const ethT = { slow: '约 5–15 分钟', normal: '约 2–5 分钟', fast: '约 30–90 秒' };
  const ethMap = {
    slow: { line: '≈ 0.0010 ETH · Gas ' + ethG.slow + '（示意）', sub: ethT.slow },
    normal: { line: '≈ 0.0012 ETH · Gas ' + ethG.normal + '（示意）', sub: ethT.normal },
    fast: { line: '≈ 0.0015 ETH · Gas ' + ethG.fast + '（示意）', sub: ethT.fast }
  };
  const btcMap = {
    slow: { line: '≈ 低费率档 sat/vB（示意）', sub: '约 40–90 分钟' },
    normal: { line: '≈ 1.2k sat/vB · 费率档（示意）', sub: '约 20–60 分钟' },
    fast: { line: '≈ 高费率档 sat/vB（示意）', sub: '约 10–30 分钟' }
  };
  if(coinId === 'trx') return trxMap[sp] || trxMap.normal;
  if(coinId === 'eth') return ethMap[sp] || ethMap.normal;
  if(coinId === 'btc') return btcMap[sp] || btcMap.normal;
  return usdtMap[sp] || usdtMap.normal;
}"""
    if needle_js not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: anchor getNetworkFeeEstimateLines not found")
    raw = raw.replace(needle_js, insert_js, 1)

    # ── sendUSDT feeLimit ───────────────────────────────────────────────
    old_usdt = """    { feeLimit: 20000000 },"""
    new_usdt = """    { feeLimit: (typeof getTronFeeLimitUsdt==='function' ? getTronFeeLimitUsdt() : 20000000) },"""
    if old_usdt not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: USDT feeLimit anchor not found")
    raw = raw.replace(old_usdt, new_usdt, 1)

    # ── sendTRX ─────────────────────────────────────────────────────────
    old_trx = """  const tx = await tw.transactionBuilder.sendTrx(toAddr, amtSun, REAL_WALLET.trxAddress);"""
    new_trx = """  const tx = await tw.transactionBuilder.sendTrx(toAddr, amtSun, REAL_WALLET.trxAddress, { feeLimit: (typeof getTronFeeLimitTrx==='function' ? getTronFeeLimitTrx() : 25000000) });"""
    if old_trx not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: sendTRX anchor not found")
    raw = raw.replace(old_trx, new_trx, 1)

    # ── sendETH ─────────────────────────────────────────────────────────
    old_eth = """async function sendETH(toAddr, amount) {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);
  const tx = await wallet.sendTransaction({
    to: toAddr,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: 21000  // 标准 ETH 转账 gas
  });
  await tx.wait(1);
  return tx.hash;
}"""
    new_eth = """async function sendETH(toAddr, amount) {
  const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
  const wallet = new ethers.Wallet(REAL_WALLET.privateKey, provider);
  const sp = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  const mult = sp === 'slow' ? 0.88 : sp === 'fast' ? 1.24 : 1;
  const fd = await provider.getFeeData();
  const txReq = {
    to: toAddr,
    value: ethers.utils.parseEther(amount.toString()),
    gasLimit: 21000
  };
  const m = Math.round(mult * 100);
  if(fd.maxFeePerGas && fd.maxPriorityFeePerGas) {
    txReq.maxFeePerGas = fd.maxFeePerGas.mul(m).div(100);
    txReq.maxPriorityFeePerGas = fd.maxPriorityFeePerGas.mul(m).div(100);
  } else if(fd.gasPrice) {
    txReq.gasPrice = fd.gasPrice.mul(m).div(100);
  }
  const tx = await wallet.sendTransaction(txReq);
  await tx.wait(1);
  return tx.hash;
}"""
    if old_eth not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: sendETH block not found")
    raw = raw.replace(old_eth, new_eth, 1)

    # ── getPrices: include bitcoin ──────────────────────────────────────
    old_gp = """    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum&vs_currencies=usd');
    const data = await res.json();
    priceCache = {
      usdt: data.tether?.usd || 1,
      trx: data.tron?.usd || 0.12,
      eth: data.ethereum?.usd || 3200,
    };"""
    new_gp = """    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,tron,ethereum,bitcoin&vs_currencies=usd');
    const data = await res.json();
    priceCache = {
      usdt: data.tether?.usd || 1,
      trx: data.tron?.usd || 0.12,
      eth: data.ethereum?.usd || 3200,
      btc: data.bitcoin?.usd || 60000,
    };"""
    if old_gp not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: getPrices block not found")
    raw = raw.replace(old_gp, new_gp, 1)

    old_gp_ret = """  } catch(e) {
    return { usdt: 1, trx: 0.12, eth: 3200 };
  }
}"""
    new_gp_ret = """  } catch(e) {
    return { usdt: 1, trx: 0.12, eth: 3200, btc: 60000 };
  }
}"""
    if old_gp_ret not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: getPrices catch not found")
    raw = raw.replace(old_gp_ret, new_gp_ret, 1)

    # ── calcTransferFee: transferChain uses speed hint ─────────────────
    old_chain = """  document.getElementById('transferChain').textContent = transferCoin.chain+' · 约30秒';"""
    new_chain = """  const _spd = (typeof getTransferFeeSpeed === 'function') ? getTransferFeeSpeed() : 'normal';
  document.getElementById('transferChain').textContent = transferCoin.chain+' · '+(typeof transferSpeedHint==='function'?transferSpeedHint(transferCoin.id,_spd):'约30秒');"""
    if old_chain not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: calcTransferFee chain line not found")
    raw = raw.replace(old_chain, new_chain, 1)

    # ── loadBalances: pie + ticker ──────────────────────────────────────
    old_lb = """    drawHomeBalanceChart(total);
    // 动态汇率（从价格接口获取，fallback 7.2）"""
    new_lb = """    drawHomeBalanceChart(total);
    if(typeof drawPortfolioPieChart==='function') drawPortfolioPieChart(usdtUsd, trxUsd, ethUsd, btcUsd);
    if(typeof refreshHomePriceTicker==='function') refreshHomePriceTicker();
    // 动态汇率（从价格接口获取，fallback 7.2）"""
    if old_lb not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: loadBalances anchor not found")
    raw = raw.replace(old_lb, new_lb, 1)

    # ── goTo: home + transfer init ──────────────────────────────────────
    old_go = """  if(pageId==='page-home') {
    // 有钱包时显示导航栏
    if(REAL_WALLET && REAL_WALLET.ethAddress) {
      document.getElementById('tabBar').style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
    if(REAL_WALLET && REAL_WALLET.trxAddress && typeof loadTrxResource==='function') setTimeout(loadTrxResource, 400);
  }
  if(pageId==='page-transfer') {
    calcTransferFee();
    renderTransferContactsList();
  }"""
    new_go = """  if(pageId==='page-home') {
    // 有钱包时显示导航栏
    if(REAL_WALLET && REAL_WALLET.ethAddress) {
      document.getElementById('tabBar').style.display = 'flex';
    }
    if(typeof updateHomeChainStrip==='function') updateHomeChainStrip();
    if(typeof drawHomeBalanceChart==='function' && window._lastTotalUsd > 0) drawHomeBalanceChart(window._lastTotalUsd);
    if(REAL_WALLET && REAL_WALLET.trxAddress && typeof loadTrxResource==='function') setTimeout(loadTrxResource, 400);
    if(typeof refreshHomePriceTicker==='function') setTimeout(refreshHomePriceTicker, 200);
  }
  if(pageId==='page-transfer') {
    if(typeof initTransferFeeSpeedUI==='function') initTransferFeeSpeedUI();
    calcTransferFee();
    renderTransferContactsList();
  }"""
    if old_go not in raw:
        raise SystemExit("patch_wallet_dist_home_enhancements: goTo block not found")
    raw = raw.replace(old_go, new_go, 1)

    DIST.write_text(raw, encoding="utf-8")
    new_lines = len(raw.splitlines())
    print(f"Patched {DIST} ({orig_lines} -> {new_lines} lines)")
    if new_lines < 6261:
        raise SystemExit(f"ERROR: line count {new_lines} must be >= 6261")


if __name__ == "__main__":
    main()
