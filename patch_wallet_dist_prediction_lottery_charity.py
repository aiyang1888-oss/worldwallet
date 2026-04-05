#!/usr/bin/env python3
"""Prediction markets UI, daily crypto lottery (demo), charity donations — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-prediction-markets"',
    'id="page-crypto-lottery"',
    'id="page-charity"',
    "function wwPredictionPopulate(",
    "function wwLotteryEnter(",
    "function wwCharityDemo(",
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

    # ── Settings rows (after gasless, before Gas manager card) ───────
    n_set = """          <div class="settings-row" onclick="goTo('page-gasless')">
            <span class="settings-icon">🎈</span>
            <span class="settings-label">免 Gas / 元交易</span>
            <span class="settings-value" id="wwGaslessSettingsHint" style="font-size:11px;color:var(--text-muted)">中继示意</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-gasless')">
            <span class="settings-icon">🎈</span>
            <span class="settings-label">免 Gas / 元交易</span>
            <span class="settings-value" id="wwGaslessSettingsHint" style="font-size:11px;color:var(--text-muted)">中继示意</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-prediction-markets')">
            <span class="settings-icon">📊</span>
            <span class="settings-label">预测市场</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">价格押注示意</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-crypto-lottery')">
            <span class="settings-icon">🎰</span>
            <span class="settings-label">每日抽奖</span>
            <span class="settings-value" id="wwLotterySettingsHint" style="font-size:11px;color:var(--text-muted)">小游戏</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-charity')">
            <span class="settings-icon">💝</span>
            <span class="settings-label">慈善捐赠</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">验证地址示意</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings gasless / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages before recovery-test ───────────────────────────────────
    n_pages = """      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pages = r"""      </div>
    </div>

    <!-- 预测市场（本机示意，无链上结算） -->
    <div class="page" id="page-prediction-markets">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">预测市场</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">对主流资产<b>涨跌方向</b>做本地示意押注记录；不涉及真实资金与合约结算，仅供体验界面。</div>
        <div id="wwPredictionHint" style="font-size:12px;padding:10px 12px;border-radius:12px;background:rgba(98,126,234,0.1);border:1px solid rgba(98,126,234,0.28);margin-bottom:14px;color:var(--text-muted)">—</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">BTC 下一周期</div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button type="button" class="btn-secondary" style="flex:1" onclick="wwPredictionPick('BTC','up')">看涨</button>
          <button type="button" class="btn-secondary" style="flex:1" onclick="wwPredictionPick('BTC','down')">看跌</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">ETH 下一周期</div>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-secondary" style="flex:1" onclick="wwPredictionPick('ETH','up')">看涨</button>
          <button type="button" class="btn-secondary" style="flex:1" onclick="wwPredictionPick('ETH','down')">看跌</button>
        </div>
      </div>
    </div>

    <!-- 每日抽奖（示意） -->
    <div class="page" id="page-crypto-lottery">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">每日抽奖</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">模拟<b>小额报名费</b>参与抽签（本机记录，无链上支付与真实奖池）。</div>
        <div id="wwLotteryStatus" style="font-size:12px;padding:10px 12px;border-radius:12px;background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.3);margin-bottom:14px;color:var(--text)">—</div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px" onclick="wwLotteryEnter()">支付示意报名费并抽签</button>
      </div>
    </div>

    <!-- 慈善捐赠（验证地址示意） -->
    <div class="page" id="page-charity">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">慈善捐赠</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">以下地址为<b>演示用</b>占位；实际捐赠前请在官方渠道核实收款地址。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px;font-size:12px;line-height:1.55">
          <div style="color:var(--text-muted);font-size:11px;margin-bottom:6px">示例机构 A（USDT · TRC20）</div>
          <div style="font-family:ui-monospace,monospace;word-break:break-all;color:var(--text)">TXyzDemoCharityAddr1234567890WorldToken</div>
        </div>
        <div id="wwCharityTotal" style="font-size:12px;margin-bottom:14px;color:var(--gold)">0 USDT（示意累计）</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn-secondary" style="flex:1;min-width:100px" onclick="wwCharityDemo(1)">+1 USDT 示意</button>
          <button type="button" class="btn-secondary" style="flex:1;min-width:100px" onclick="wwCharityDemo(5)">+5 USDT 示意</button>
        </div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pages not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pages, i_pages, 1)

    # ── WW_PAGE_SEO ──────────────────────────────────────────────────
    n_seo = """  'page-gasless': { title: '免 Gas — WorldToken', description: '元交易与中继偏好示意。' }
};"""
    i_seo = """  'page-gasless': { title: '免 Gas — WorldToken', description: '元交易与中继偏好示意。' },
  'page-prediction-markets': { title: '预测市场 — WorldToken', description: '加密价格预测押注本地示意。' },
  'page-crypto-lottery': { title: '每日抽奖 — WorldToken', description: '小额报名费抽奖界面示意。' },
  'page-charity': { title: '慈善捐赠 — WorldToken', description: '向验证慈善钱包捐赠示意。' }
};"""
    if n_seo not in raw:
        raise SystemExit("anchor WW_PAGE_SEO page-gasless closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── applySeoForPage hooks ────────────────────────────────────────
    n_ap = """  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch(_gs) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_ap = """  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch(_gs) {} }
  if(pageId==='page-prediction-markets') { try { if(typeof wwPredictionPopulate==='function') setTimeout(wwPredictionPopulate, 40); } catch(_pm) {} }
  if(pageId==='page-crypto-lottery') { try { if(typeof wwLotteryPopulate==='function') setTimeout(wwLotteryPopulate, 40); } catch(_lt) {} }
  if(pageId==='page-charity') { try { if(typeof wwCharityPopulate==='function') setTimeout(wwCharityPopulate, 40); } catch(_ch) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_ap not in raw:
        raise SystemExit("anchor applySeoForPage gasless/charts not found")
    raw = raw.replace(n_ap, i_ap, 1)

    # ── Settings: lottery hint when opening settings ─────────────────
    n_st = """    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch(_gsp) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    i_st = """    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch(_gsp) {}
    try { if(typeof wwLotteryPopulate==='function') wwLotteryPopulate(); } catch(_lph) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    if n_st in raw:
        raw = raw.replace(n_st, i_st, 1)

    # ── JS (before wwRecoveryTestClear) ─────────────────────────────
    n_js = """function wwGaslessSave() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    localStorage.setItem('ww_gasless_meta', cb && cb.checked ? '1' : '0');
    if (rel) localStorage.setItem('ww_gasless_relay', String(rel.value || '').trim().slice(0, 200));
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) {}
  }
  if (typeof showToast === 'function') showToast('已保存免 Gas 偏好（示意）', 'success');
}

function wwRecoveryTestClear() {"""
    i_js = """function wwGaslessSave() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    localStorage.setItem('ww_gasless_meta', cb && cb.checked ? '1' : '0');
    if (rel) localStorage.setItem('ww_gasless_relay', String(rel.value || '').trim().slice(0, 200));
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) {}
  }
  if (typeof showToast === 'function') showToast('已保存免 Gas 偏好（示意）', 'success');
}

function wwPredictionPopulate() {
  var el = document.getElementById('wwPredictionHint');
  if (el) {
    try {
      var picks = JSON.parse(localStorage.getItem('ww_prediction_demo') || '[]');
      el.textContent = picks.length ? ('已记录 ' + picks.length + ' 条示意押注（本机）') : '尚未押注（本机演示，无结算）';
    } catch (e) { el.textContent = '—'; }
  }
}
function wwPredictionPick(symbol, side) {
  try {
    var arr = JSON.parse(localStorage.getItem('ww_prediction_demo') || '[]');
    arr.push({ t: Date.now(), s: symbol, side: side });
    localStorage.setItem('ww_prediction_demo', JSON.stringify(arr.slice(-80)));
    if (typeof showToast === 'function') showToast('已记录 ' + symbol + ' ' + (side === 'up' ? '看涨' : '看跌') + '（示意）', 'success');
    wwPredictionPopulate();
  } catch (e) {}
}
function wwLotteryPopulate() {
  var st = document.getElementById('wwLotteryStatus');
  var hint = document.getElementById('wwLotterySettingsHint');
  var today = new Date().toISOString().slice(0, 10);
  try {
    var d = localStorage.getItem('ww_lottery_day');
    if (st) st.textContent = d === today ? '今日已参与抽签（示意）' : '今日可参与（示意）';
    if (hint) hint.textContent = d === today ? '已抽' : '可抽';
  } catch (e) {
    if (st) st.textContent = '—';
  }
}
function wwLotteryEnter() {
  try {
    localStorage.setItem('ww_lottery_day', new Date().toISOString().slice(0, 10));
    var r = Math.floor(Math.random() * 100000);
    if (typeof showToast === 'function') showToast('抽签号 #' + r + '（示意，无真实开奖与扣款）', 'success');
    wwLotteryPopulate();
  } catch (e) {}
}
function wwCharityPopulate() {
  var el = document.getElementById('wwCharityTotal');
  if (el) {
    try {
      var v = localStorage.getItem('ww_charity_total_usdt') || '0';
      el.textContent = v + ' USDT（本地示意累计，非链上）';
    } catch (e) { el.textContent = '0'; }
  }
}
function wwCharityDemo(amount) {
  try {
    var cur = parseFloat(localStorage.getItem('ww_charity_total_usdt') || '0') || 0;
    localStorage.setItem('ww_charity_total_usdt', String(cur + amount));
    if (typeof showToast === 'function') showToast('已累加 ' + amount + ' USDT 到本地示意统计', 'success');
    wwCharityPopulate();
  } catch (e) {}
}

function wwRecoveryTestClear() {"""
    if n_js not in raw:
        raise SystemExit("anchor wwGaslessSave / wwRecoveryTestClear not found")
    raw = raw.replace(n_js, i_js, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
