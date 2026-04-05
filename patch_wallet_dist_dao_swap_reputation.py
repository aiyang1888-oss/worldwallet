#!/usr/bin/env python3
"""DAO governance UI, cross-chain swap price comparison on swap page, wallet reputation score — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-dao"',
    'id="page-reputation"',
    'id="wwCrossChainCompare"',
    "function wwDaoRender(",
    "function wwReputationPopulate(",
    "function updateCrossChainSwapCompare(",
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

    # ── Settings: DAO + reputation rows (after inheritance) ─────────
    n_set = """          <div class="settings-row" onclick="goTo('page-inheritance')">
            <span class="settings-icon">📜</span>
            <span class="settings-label">继承与受益人</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">备忘</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    i_set = """          <div class="settings-row" onclick="goTo('page-inheritance')">
            <span class="settings-icon">📜</span>
            <span class="settings-label">继承与受益人</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">备忘</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-dao')">
            <span class="settings-icon">🏛️</span>
            <span class="settings-label">DAO 治理</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">提案与投票</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-reputation')">
            <span class="settings-icon">⭐</span>
            <span class="settings-label">钱包信誉分</span>
            <span class="settings-value" id="wwReputationSettingsValue" style="font-size:11px;color:var(--text-muted)">--</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    if n_set not in raw:
        raise SystemExit("anchor settings inheritance / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: DAO + reputation before recovery test ────────────────
    n_pg = """    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """    </div>

    <!-- DAO 治理（本机示意） -->
    <div class="page" id="page-dao">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">DAO 治理</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">以下为<b>示意</b>治理提案：投票仅保存在本机，用于演示界面；链上治理请前往对应项目的官方入口。</div>
        <div id="wwDaoProposalList" style="display:flex;flex-direction:column;gap:12px"></div>
      </div>
    </div>

    <!-- 钱包信誉分 -->
    <div class="page" id="page-reputation">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">钱包信誉分</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:linear-gradient(135deg,rgba(98,126,234,0.12),transparent);border:1px solid rgba(98,126,234,0.35);border-radius:16px;padding:16px;margin-bottom:16px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">综合评分（本机估算）</div>
          <div style="font-size:36px;font-weight:800;color:var(--gold);line-height:1" id="wwReputationScoreBig">--</div>
          <div style="margin-top:12px;height:8px;border-radius:8px;background:var(--bg3);overflow:hidden">
            <div id="wwReputationBar" style="height:100%;width:0%;background:linear-gradient(90deg,#627eea,#c8a84b);border-radius:8px;transition:width 0.4s ease"></div>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin-top:12px;line-height:1.6" id="wwReputationExplain">根据本机交易记录条数、安全设置与 DAO 参与度等估算，不代表链上信用或征信。</p>
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px;font-size:12px;line-height:1.65;color:var(--text-muted)">
          <div style="font-weight:600;color:var(--text);margin-bottom:8px">计分说明</div>
          <ul style="margin:0;padding-left:18px;line-height:1.8">
            <li>交易活跃度（历史条数）</li>
            <li>钱包安全分（PIN 与备份）</li>
            <li>本机 DAO 投票参与次数</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── Swap page: cross-chain compare block ─────────────────────────
    n_sw = """        <div class="swap-info" style="margin-bottom:16px">
          <div class="swap-info-row">
            <span>汇率</span>
            <span class="swap-info-val" id="swapRate">1 USDT ≈ — TRX</span>
          </div>
          <div class="swap-info-row">
            <span>手续费</span>
            <span class="swap-info-val gold" id="swapFee">0.30%（0.30 USDT）</span>
          </div>
          <div class="swap-info-row" style="margin-bottom:0">
            <span>预计到账</span>
            <span class="swap-info-val">约 30 秒</span>
          </div>
        </div>

        <button class="btn-primary" onclick="doSwap()">⚡ 立即兑换</button>"""
    i_sw = """        <div class="swap-info" style="margin-bottom:16px">
          <div class="swap-info-row">
            <span>汇率</span>
            <span class="swap-info-val" id="swapRate">1 USDT ≈ — TRX</span>
          </div>
          <div class="swap-info-row">
            <span>手续费</span>
            <span class="swap-info-val gold" id="swapFee">0.30%（0.30 USDT）</span>
          </div>
          <div class="swap-info-row" style="margin-bottom:0">
            <span>预计到账</span>
            <span class="swap-info-val">约 30 秒</span>
          </div>
        </div>

        <div id="wwCrossChainCompare" style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:12px">
          <div style="font-weight:700;margin-bottom:10px;color:var(--text);display:flex;align-items:center;gap:6px">🌐 跨链路由比价 <span style="font-size:10px;font-weight:500;color:var(--text-muted)">（参考）</span></div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
              <div>
                <div style="font-size:11px;color:var(--text-muted)">TRON 生态（SunSwap 等）</div>
                <div id="wwSwapCompareTron" style="font-weight:700;color:var(--text);margin-top:2px">—</div>
              </div>
              <span id="wwSwapCompareBadgeTron" style="font-size:10px;padding:3px 8px;border-radius:999px;background:var(--bg3);color:var(--text-muted);align-self:center">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
              <div>
                <div style="font-size:11px;color:var(--text-muted)">以太坊主网（Uniswap 等）</div>
                <div id="wwSwapCompareEth" style="font-weight:700;color:var(--text);margin-top:2px">—</div>
              </div>
              <span id="wwSwapCompareBadgeEth" style="font-size:10px;padding:3px 8px;border-radius:999px;background:var(--bg3);color:var(--text-muted);align-self:center">—</span>
            </div>
          </div>
          <div id="wwSwapCompareBest" style="font-size:11px;color:var(--gold);margin-top:10px;line-height:1.5"></div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:8px;line-height:1.55">同额输入下两条链的<b>参考</b>预估到账；跨链需先桥接资产，实际以各 DEX 报价、滑点与 Gas 为准。</div>
        </div>

        <button class="btn-primary" onclick="doSwap()">⚡ 立即兑换</button>"""
    if n_sw not in raw:
        raise SystemExit("anchor swap-info / btn-primary doSwap not found")
    raw = raw.replace(n_sw, i_sw, 1)

    # ── WW_PAGE_SEO ─────────────────────────────────────────────────
    n_seo = """  'page-inheritance': { title: '继承备忘 — WorldToken', description: '受益人地址本机备忘。' }
};"""
    i_seo = """  'page-inheritance': { title: '继承备忘 — WorldToken', description: '受益人地址本机备忘。' },
  'page-dao': { title: 'DAO 治理 — WorldToken', description: '治理提案与本地投票示意。' },
  'page-reputation': { title: '钱包信誉分 — WorldToken', description: '基于本机活动与安全的参考评分。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-inheritance closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ──────────────────────────────────────────────
    n_show = """  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch(_ih) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_show = """  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch(_ih) {} }
  if(pageId==='page-dao') { try { if(typeof wwDaoRender==='function') setTimeout(wwDaoRender, 40); } catch(_dao) {} }
  if(pageId==='page-reputation') { try { if(typeof wwReputationPopulate==='function') setTimeout(wwReputationPopulate, 40); } catch(_rep) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_show not in raw:
        raise SystemExit("showPage inheritance/charts block not found")
    raw = raw.replace(n_show, i_show, 1)

    # ── calcSwap: call compare at end ─────────────────────────────────
    n_calc = """  const rateEl = (_safeEl('swapRateInfo') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRateInfo fallback */;
  if(rateEl) rateEl.textContent = `1 ${swapFrom.name} ≈ ${rate > 1 ? rate.toFixed(4) : rate.toFixed(8)} ${swapTo.name}`;
}"""
    i_calc = """  const rateEl = (_safeEl('swapRateInfo') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* swapRateInfo fallback */;
  if(rateEl) rateEl.textContent = `1 ${swapFrom.name} ≈ ${rate > 1 ? rate.toFixed(4) : rate.toFixed(8)} ${swapTo.name}`;
  try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc) {}
}"""
    if n_calc not in raw:
        raise SystemExit("calcSwap tail not found")
    raw = raw.replace(n_calc, i_calc, 1)

    # ── loadSwapPrices: after calcSwap in try ────────────────────────
    n_lp = """    COINS.forEach(coin => { if(priceMap[coin.id]) coin.price = priceMap[coin.id]; });
    calcSwap();
    console.log('兑换价格已更新');"""
    i_lp = """    COINS.forEach(coin => { if(priceMap[coin.id]) coin.price = priceMap[coin.id]; });
    calcSwap();
    try { if(typeof updateCrossChainSwapCompare==='function') updateCrossChainSwapCompare(); } catch(_cc2) {}
    console.log('兑换价格已更新');"""
    if n_lp not in raw:
        raise SystemExit("loadSwapPrices calcSwap block not found")
    raw = raw.replace(n_lp, i_lp, 1)

    # ── JS: DAO + reputation + compare (after wwInheritanceSave) ───
    n_js = """function wwInheritanceSave() {
  var b = document.getElementById('wwInheritanceBeneficiary');
  var n = document.getElementById('wwInheritanceNote');
  var o = {
    beneficiary: b ? String(b.value || '').trim().slice(0, 256) : '',
    note: n ? String(n.value || '').trim().slice(0, 2000) : ''
  };
  try { localStorage.setItem('ww_inheritance_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('继承备忘已保存（本机）', 'success', 2200);
}

function wwRecoveryTestClear() {"""
    i_js = """function wwInheritanceSave() {
  var b = document.getElementById('wwInheritanceBeneficiary');
  var n = document.getElementById('wwInheritanceNote');
  var o = {
    beneficiary: b ? String(b.value || '').trim().slice(0, 256) : '',
    note: n ? String(n.value || '').trim().slice(0, 2000) : ''
  };
  try { localStorage.setItem('ww_inheritance_v1', JSON.stringify(o)); } catch (e2) {}
  if (typeof showToast === 'function') showToast('继承备忘已保存（本机）', 'success', 2200);
}

var WW_DAO_PROPOSALS = [
  { id: 'p1', title: '是否将默认滑点提示调整为 0.5%？', summary: '减少新手因滑点过小导致的失败交易（示意）。' },
  { id: 'p2', title: '是否在设置中默认开启隐私模式？', summary: '首屏隐藏余额，需长按或 PIN 查看（示意）。' },
  { id: 'p3', title: '是否增加 TRX Gas 不足时的弹窗提醒？', summary: '当 TRX 余额低于阈值时强提醒（示意）。' }
];

function wwDaoGetVotes() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_dao_votes_v1') || '{}');
    return typeof j === 'object' && j ? j : {};
  } catch (e) { return {}; }
}

function wwDaoSetVote(pid, choice) {
  var v = wwDaoGetVotes();
  v[pid] = choice;
  try { localStorage.setItem('ww_dao_votes_v1', JSON.stringify(v)); } catch (e2) {}
  wwDaoRender();
  try { if(typeof wwReputationPopulate==='function') wwReputationPopulate(); } catch (_r) {}
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch (_s) {}
  if (typeof showToast === 'function') showToast('投票已保存（本机）', 'success', 1800);
}

function wwDaoRender() {
  var box = document.getElementById('wwDaoProposalList');
  if (!box) return;
  var votes = wwDaoGetVotes();
  box.innerHTML = WW_DAO_PROPOSALS.map(function (pr) {
    var cur = votes[pr.id] || '';
    function btn(ch, label) {
      var on = cur === ch ? 'background:rgba(200,168,75,0.25);border-color:var(--gold);color:var(--gold)' : 'background:var(--bg3);border-color:var(--border);color:var(--text)';
      return '<button type="button" class="btn-secondary" style="flex:1;min-width:72px;padding:8px 6px;font-size:11px;' + on + '" onclick="wwDaoSetVote(\\'' + pr.id + '\\',\\'' + ch + '\\')">' + label + '</button>';
    }
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:14px">' +
      '<div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:6px">' + pr.title + '</div>' +
      '<div style="font-size:12px;color:var(--text-muted);line-height:1.55;margin-bottom:12px">' + pr.summary + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' + btn('yes', '赞成') + btn('no', '反对') + btn('abstain', '弃权') + '</div></div>';
  }).join('');
}

function computeWalletReputationScore() {
  var txs = (typeof window._wwTxHistoryCache !== 'undefined' && window._wwTxHistoryCache) ? window._wwTxHistoryCache : [];
  var nTx = Array.isArray(txs) ? Math.min(txs.length, 200) : 0;
  var sec = (typeof getWalletSecurityBreakdown === 'function') ? getWalletSecurityBreakdown() : { score: 0 };
  var secScore = Math.min(100, Math.max(0, sec.score | 0));
  var votes = wwDaoGetVotes();
  var voteCount = 0;
  try {
    Object.keys(votes).forEach(function (k) { if (votes[k]) voteCount++; });
  } catch (e) {}
  var activityPts = Math.min(35, Math.floor(nTx * 1.2));
  var securityPts = Math.round(secScore * 0.45);
  var daoPts = Math.min(25, voteCount * 8);
  var raw = activityPts + securityPts + daoPts;
  var total = Math.min(100, Math.max(0, raw));
  return { total: total, activityPts: activityPts, securityPts: securityPts, daoPts: daoPts, nTx: nTx, secScore: secScore, voteCount: voteCount };
}

function wwReputationPopulate() {
  var r = computeWalletReputationScore();
  var big = document.getElementById('wwReputationScoreBig');
  var bar = document.getElementById('wwReputationBar');
  var ex = document.getElementById('wwReputationExplain');
  if (big) big.textContent = String(r.total);
  if (bar) bar.style.width = r.total + '%';
  if (ex) {
    ex.textContent = '活跃度 +' + r.activityPts + ' / 安全 +' + r.securityPts + ' / 治理 +' + r.daoPts + '（交易 ' + r.nTx + ' 条，安全分 ' + r.secScore + '，已投 ' + r.voteCount + ' 票）。此为本地参考分。';
  }
  try { updateReputationSettingsRow(); } catch (e) {}
}

function updateReputationSettingsRow() {
  var r = computeWalletReputationScore();
  var el = document.getElementById('wwReputationSettingsValue');
  if (el) el.textContent = r.total + ' 分';
}

function updateCrossChainSwapCompare() {
  var amtIn = parseFloat((_safeEl('swapAmountIn') || {}).value) || 0;
  var pFrom = (swapFrom && swapFrom.price) ? swapFrom.price : 1;
  var pTo = (swapTo && swapTo.price) ? swapTo.price : 1;
  var feeTron = amtIn * 0.003;
  var feeEth = amtIn * 0.0028;
  var slipEth = 0.9985;
  var outTron = (pTo > 0) ? ((amtIn - feeTron) * pFrom / pTo) : 0;
  var outEth = (pTo > 0) ? ((amtIn - feeEth) * pFrom / pTo) * slipEth : 0;
  var ft = swapTo ? swapTo.name : '';
  var elT = document.getElementById('wwSwapCompareTron');
  var elE = document.getElementById('wwSwapCompareEth');
  var bT = document.getElementById('wwSwapCompareBadgeTron');
  var bE = document.getElementById('wwSwapCompareBadgeEth');
  var best = document.getElementById('wwSwapCompareBest');
  if (elT) elT.textContent = amtIn > 0 ? (outTron > 1 ? outTron.toFixed(4) : outTron.toFixed(8)) + ' ' + ft : '—';
  if (elE) elE.textContent = amtIn > 0 ? (outEth > 1 ? outEth.toFixed(4) : outEth.toFixed(8)) + ' ' + ft : '—';
  var better = '相近';
  if (amtIn > 0 && outTron > outEth * 1.0001) { better = 'TRON 路径参考更优（预估多 ' + ((outTron - outEth) > 1 ? (outTron - outEth).toFixed(4) : (outTron - outEth).toFixed(8)) + ' ' + ft + '）'; if (bT) { bT.textContent = '较优'; bT.style.background = 'rgba(38,161,123,0.2)'; bT.style.color = '#26a17b'; } if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; } }
  else if (amtIn > 0 && outEth > outTron * 1.0001) { better = '以太坊路径参考更优（预估多 ' + ((outEth - outTron) > 1 ? (outEth - outTron).toFixed(4) : (outEth - outTron).toFixed(8)) + ' ' + ft + '）'; if (bE) { bE.textContent = '较优'; bE.style.background = 'rgba(98,126,234,0.2)'; bE.style.color = '#627eea'; } if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; } }
  else {
    if (bT) { bT.textContent = '参考'; bT.style.background = 'var(--bg3)'; bT.style.color = 'var(--text-muted)'; }
    if (bE) { bE.textContent = '参考'; bE.style.background = 'var(--bg3)'; bE.style.color = 'var(--text-muted)'; }
  }
  if (best) best.textContent = amtIn > 0 ? better : '';
}

function wwRecoveryTestClear() {"""
    if n_js not in raw:
        raise SystemExit("wwInheritanceSave block not found")
    raw = raw.replace(n_js, i_js, 1)

    # ── renderTxHistoryFromCache: refresh reputation row ─────────────
    n_tx = """  el.innerHTML = filtered.map(function(tx) { return txHistoryRowHtml(tx); }).join('');
}

function applyTxHistoryFilter() {"""
    i_tx = """  el.innerHTML = filtered.map(function(tx) { return txHistoryRowHtml(tx); }).join('');
  try { if(typeof updateReputationSettingsRow==='function') updateReputationSettingsRow(); } catch(_rep2) {}
}

function applyTxHistoryFilter() {"""
    if n_tx not in raw:
        raise SystemExit("renderTxHistoryFromCache end not found")
    raw = raw.replace(n_tx, i_tx, 1)

    # ── updateSettingsPage: refresh reputation in settings list ─────
    n_up = """  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */
function requestPushPermissionOnFirstLaunch() {"""
    i_up = """  if (typeof updateWalletSecurityScoreUI === 'function') updateWalletSecurityScoreUI();
  try { if (typeof updateReputationSettingsRow === 'function') updateReputationSettingsRow(); } catch (_rs) {}
}

/** 首次打开时请求浏览器通知权限（仅询问一次） */
function requestPushPermissionOnFirstLaunch() {"""
    if n_up not in raw:
        raise SystemExit("updateSettingsPage end / requestPushPermission anchor not found")
    raw = raw.replace(n_up, i_up, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched — {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
