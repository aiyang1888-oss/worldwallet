#!/usr/bin/env python3
"""Recurring payments, transfer whitelist, wallet inheritance beneficiary — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-recurring"',
    'id="page-token-whitelist"',
    'id="page-inheritance"',
    "function wwTransferWhitelistCheck(",
    "function wwRecurringPopulate(",
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

    # ── Settings: three rows before Gas manager ─────────────────────
    n_set = """          <div class="settings-row" onclick="goTo('page-analytics')">
            <span class="settings-icon">📉</span>
            <span class="settings-label">数据洞察</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">支出与活跃</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    i_set = """          <div class="settings-row" onclick="goTo('page-analytics')">
            <span class="settings-icon">📉</span>
            <span class="settings-label">数据洞察</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">支出与活跃</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-recurring')">
            <span class="settings-icon">🔁</span>
            <span class="settings-label">定期转账</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">计划任务</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-token-whitelist')">
            <span class="settings-icon">✅</span>
            <span class="settings-label">转账白名单</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">仅允许向…</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-inheritance')">
            <span class="settings-icon">📜</span>
            <span class="settings-label">继承与受益人</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">备忘</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:14px 16px;margin-bottom:16px">"""
    if n_set not in raw:
        raise SystemExit("anchor settings analytics / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages: before 恢复演练 ───────────────────────────────────────
    n_pg = """      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pg = """      </div>
    </div>

    <!-- 定期转账 -->
    <div class="page" id="page-recurring">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">定期转账</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">在本机保存<b>计划任务</b>（示意）：到达间隔后推送提醒，不会自动扣款；实际转账仍需您手动确认。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">收款地址</div>
          <input id="wwRecurringAddr" type="text" autocomplete="off" placeholder="TRX / ETH 地址" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
        </div>
        <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
          <label style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">金额（示意）</span>
            <input id="wwRecurringAmt" type="text" inputmode="decimal" placeholder="0.0" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
          </label>
          <label style="flex:1;min-width:120px;display:flex;flex-direction:column;gap:4px">
            <span style="font-size:11px;color:var(--text-muted)">间隔（天）</span>
            <input id="wwRecurringDays" type="text" inputmode="numeric" placeholder="7" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
          </label>
        </div>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:13px;color:var(--text)">
          <input type="checkbox" id="wwRecurringEnabled" style="width:18px;height:18px;accent-color:var(--gold)" />
          <span>启用此计划</span>
        </label>
        <button type="button" class="btn-primary" style="width:100%;padding:14px" onclick="if(typeof wwRecurringAdd==='function')wwRecurringAdd()">添加到计划列表</button>
        <div id="wwRecurringList" style="margin-top:16px;display:flex;flex-direction:column;gap:10px"></div>
      </div>
    </div>

    <!-- 转账白名单 -->
    <div class="page" id="page-token-whitelist">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">转账白名单</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="background:rgba(200,80,80,0.08);border:1px solid rgba(200,80,80,0.28);border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:12px;line-height:1.6;color:var(--text-muted)">开启后，<b>仅允许</b>向下方列表中的地址发起转账（本机校验）。请谨慎启用，并确保列表完整。</div>
        <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:12px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:14px">
          <span style="font-size:14px;color:var(--text)">启用白名单模式</span>
          <input type="checkbox" id="wwWhitelistEnabled" onchange="if(typeof wwWhitelistSave==='function')wwWhitelistSave()" style="width:20px;height:20px;accent-color:var(--gold)" />
        </label>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">每行一个地址（TRX / ETH / BTC 等）</div>
        <textarea id="wwWhitelistTextarea" rows="8" placeholder="T…&#10;0x…" autocomplete="off" autocorrect="off" spellcheck="false" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;line-height:1.5;resize:vertical" onchange="if(typeof wwWhitelistSave==='function')wwWhitelistSave()" onblur="if(typeof wwWhitelistSave==='function')wwWhitelistSave()"></textarea>
        <button type="button" class="btn-primary" style="width:100%;margin-top:12px;padding:12px" onclick="if(typeof wwWhitelistSave==='function')wwWhitelistSave()">保存白名单</button>
      </div>
    </div>

    <!-- 继承与受益人 -->
    <div class="page" id="page-inheritance">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">继承与受益人</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">仅作<b>本机备忘</b>：记录您希望家人知晓的受益地址或说明。链上无法自动执行继承；请结合法律遗嘱与托管方案。</div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">受益人 / 备用收款地址</div>
          <input id="wwInheritanceBeneficiary" type="text" autocomplete="off" placeholder="公链地址" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px" />
        </div>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">备注（联系方式、托管说明等）</div>
          <textarea id="wwInheritanceNote" rows="4" placeholder="仅保存在本机" autocomplete="off" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;line-height:1.5;resize:vertical"></textarea>
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:14px" onclick="if(typeof wwInheritanceSave==='function')wwInheritanceSave()">保存备忘</button>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pg not in raw:
        raise SystemExit("anchor before page-recovery-test not found")
    raw = raw.replace(n_pg, i_pg, 1)

    # ── SEO map ─────────────────────────────────────────────────────
    n_seo = """  'page-analytics': { title: '数据洞察 — WorldToken', description: '支出模式与代币活跃度本地分析。' }
};"""
    i_seo = """  'page-analytics': { title: '数据洞察 — WorldToken', description: '支出模式与代币活跃度本地分析。' },
  'page-recurring': { title: '定期转账 — WorldToken', description: '本机计划转账提醒（非自动扣款）。' },
  'page-token-whitelist': { title: '转账白名单 — WorldToken', description: '仅允许向白名单地址转账。' },
  'page-inheritance': { title: '继承备忘 — WorldToken', description: '受益人地址本机备忘。' }
};"""
    if n_seo not in raw:
        raise SystemExit("WW_PAGE_SEO page-analytics anchor not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── showPage hooks ───────────────────────────────────────────────
    n_go = """  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch(_an) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-analytics') { try { if(typeof wwAnalyticsPopulate==='function') setTimeout(wwAnalyticsPopulate, 50); } catch(_an) {} }
  if(pageId==='page-recurring') { try { if(typeof wwRecurringPopulate==='function') setTimeout(wwRecurringPopulate, 40); } catch(_re) {} }
  if(pageId==='page-token-whitelist') { try { if(typeof wwWhitelistPopulate==='function') setTimeout(wwWhitelistPopulate, 40); } catch(_wl) {} }
  if(pageId==='page-inheritance') { try { if(typeof wwInheritancePopulate==='function') setTimeout(wwInheritancePopulate, 40); } catch(_ih) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("showPage analytics / charts anchor not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── broadcastRealTransfer: whitelist gate ────────────────────────
    n_br = """async function broadcastRealTransfer() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return false; }
  const addr = document.getElementById('transferAddr').value.trim();
  const amt = parseFloat(document.getElementById('transferAmount').value);"""
    i_br = """async function broadcastRealTransfer() {
  if(!REAL_WALLET) { showToast('⚠️ 请先创建或导入钱包', 'warning'); return false; }
  const addr = document.getElementById('transferAddr').value.trim();
  if (typeof wwTransferWhitelistCheck === 'function' && !wwTransferWhitelistCheck(addr)) {
    showToast('❌ 收款地址未通过「转账白名单」校验。请在 设置 → 转账白名单 中添加该地址或关闭白名单。', 'error');
    return false;
  }
  const amt = parseFloat(document.getElementById('transferAmount').value);"""
    if n_br not in raw:
        raise SystemExit("broadcastRealTransfer anchor not found")
    raw = raw.replace(n_br, i_br, 1)

    # ── Idle tick interval: add recurring checker ───────────────────
    n_iv = """  setInterval(function() { try { wwTickIdleLock(); } catch(e) {} }, 15000);
  wwApplyIdleLockLabel();"""
    i_iv = """  setInterval(function() { try { wwTickIdleLock(); } catch(e) {} }, 15000);
  setInterval(function() { try { if (typeof wwRecurringTick === 'function') wwRecurringTick(); } catch(e) {} }, 60000);
  wwApplyIdleLockLabel();"""
    if n_iv not in raw:
        raise SystemExit("idle lock interval anchor not found")
    raw = raw.replace(n_iv, i_iv, 1)

    # ── JS: before wwRecoveryTestClear ───────────────────────────────
    n_js = """function wwRecoveryTestClear() {"""
    i_js = """function wwNormalizeAddrForWhitelist(a) {
  a = String(a || '').trim();
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return a.toLowerCase();
  return a;
}

function wwTransferWhitelistCheck(rawAddr) {
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (!o || !o.enabled) return true;
    var list = (Array.isArray(o.addresses) ? o.addresses : []).map(wwNormalizeAddrForWhitelist);
    var n = wwNormalizeAddrForWhitelist(rawAddr);
    return list.indexOf(n) >= 0;
  } catch (e) { return true; }
}

function wwWhitelistPopulate() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  try {
    var o = JSON.parse(localStorage.getItem('ww_transfer_whitelist_v1') || '{}');
    if (en) en.checked = !!o.enabled;
    if (ta) ta.value = (Array.isArray(o.addresses) ? o.addresses : []).join('\\n');
  } catch (e2) {
    if (en) en.checked = false;
    if (ta) ta.value = '';
  }
}

function wwWhitelistSave() {
  var en = document.getElementById('wwWhitelistEnabled');
  var ta = document.getElementById('wwWhitelistTextarea');
  var lines = (ta && ta.value ? ta.value : '').split(/\\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  var o = { enabled: !!(en && en.checked), addresses: lines.slice(0, 200) };
  try { localStorage.setItem('ww_transfer_whitelist_v1', JSON.stringify(o)); } catch (e) {}
  if (typeof showToast === 'function') showToast('白名单已保存', 'success', 1800);
}

function wwRecurringLoad() {
  try {
    var j = JSON.parse(localStorage.getItem('ww_recurring_v1') || '[]');
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

function wwRecurringSave(list) {
  try { localStorage.setItem('ww_recurring_v1', JSON.stringify(list.slice(0, 50))); } catch (e) {}
}

function wwRecurringRenderList() {
  var host = document.getElementById('wwRecurringList');
  if (!host) return;
  var list = wwRecurringLoad();
  if (!list.length) {
    host.innerHTML = '<div style="text-align:center;padding:14px;color:var(--text-muted);font-size:12px">暂无计划。添加后将在此显示下次提醒时间。</div>';
    return;
  }
    host.innerHTML = list.map(function (it, idx) {
    var next = it.nextAt ? new Date(it.nextAt).toLocaleString() : '—';
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="word-break:break-all;color:var(--text)"><b>' + (it.amt || '?') + '</b> → ' + (it.addr || '').replace(/</g, '') + '</div>' +
      '<span style="color:var(--red);cursor:pointer;flex-shrink:0" onclick="wwRecurringRemove(' + idx + ')">删除</span></div>' +
      '<div style="margin-top:6px;color:var(--text-muted);font-size:11px">间隔 ' + (it.days || '?') + ' 天 · 下次提醒 ' + next + ' · ' + (it.enabled ? '已启用' : '已暂停') + '</div></div>';
  }).join('');
}

function wwRecurringPopulate() {
  wwRecurringRenderList();
}

function wwRecurringAdd() {
  var a = document.getElementById('wwRecurringAddr');
  var m = document.getElementById('wwRecurringAmt');
  var d = document.getElementById('wwRecurringDays');
  var en = document.getElementById('wwRecurringEnabled');
  var addr = a ? String(a.value || '').trim() : '';
  var amt = m ? String(m.value || '').trim() : '';
  var days = parseInt(d && d.value ? d.value : '7', 10);
  if (!addr) { if (typeof showToast === 'function') showToast('请填写收款地址', 'error'); return; }
  if (!days || days < 1) days = 7;
  var list = wwRecurringLoad();
  var nextAt = Date.now() + days * 86400000;
  list.push({ id: String(Date.now()), addr: addr, amt: amt || '—', days: days, enabled: !!(en && en.checked), nextAt: nextAt });
  wwRecurringSave(list);
  wwRecurringRenderList();
  if (a) a.value = '';
  if (m) m.value = '';
  if (typeof showToast === 'function') showToast('已加入计划列表', 'success', 2000);
}

function wwRecurringRemove(idx) {
  var list = wwRecurringLoad();
  list.splice(idx, 1);
  wwRecurringSave(list);
  wwRecurringRenderList();
}

function wwRecurringTick() {
  var list = wwRecurringLoad();
  var now = Date.now();
  var ch = false;
  list.forEach(function (it) {
    if (!it || !it.enabled || !it.nextAt) return;
    if (now < it.nextAt) return;
    var days = Math.max(1, parseInt(it.days, 10) || 7);
    it.nextAt = now + days * 86400000;
    ch = true;
    var title = 'WorldToken · 定期转账提醒';
    var body = '计划：向 ' + String(it.addr || '').slice(0, 18) + '… 发送约 ' + (it.amt || '?') + '（请手动在转账页操作）';
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body: body, tag: 'ww-recurring-' + (it.id || '') });
      } else if (typeof showToast === 'function') {
        showToast('📅 ' + body, 'warning', 6000);
      }
    } catch (e) {}
  });
  if (ch) wwRecurringSave(list);
}

function wwInheritancePopulate() {
  try {
    var o = JSON.parse(localStorage.getItem('ww_inheritance_v1') || '{}');
    var b = document.getElementById('wwInheritanceBeneficiary');
    var n = document.getElementById('wwInheritanceNote');
    if (b) b.value = o.beneficiary || '';
    if (n) n.value = o.note || '';
  } catch (e) {}
}

function wwInheritanceSave() {
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
