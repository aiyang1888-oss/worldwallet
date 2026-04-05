#!/usr/bin/env python3
"""On-chain messaging (encrypted payload), backup QR (AES-GCM blob), gasless / meta-tx preferences — dist/wallet.html."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKERS = (
    'id="page-onchain-messaging"',
    'id="page-backup-qr"',
    'id="page-gasless"',
    "function wwOnchainMessagingPopulate(",
    "function wwBackupQrGenerate(",
    "function wwGaslessPopulate(",
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

    # ── Settings rows (after 舆情分析, before wwGasManagerCard) ─────
    n_set = """          <div class="settings-row" onclick="goTo('page-sentiment')">
            <span class="settings-icon">📰</span>
            <span class="settings-label">舆情分析</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">多空头绪</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    i_set = """          <div class="settings-row" onclick="goTo('page-sentiment')">
            <span class="settings-icon">📰</span>
            <span class="settings-label">舆情分析</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">多空头绪</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-onchain-messaging')">
            <span class="settings-icon">💬</span>
            <span class="settings-label">链上消息</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">加密载荷 · 附转账</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-backup-qr')">
            <span class="settings-icon">📲</span>
            <span class="settings-label">备份二维码</span>
            <span class="settings-value" style="font-size:11px;color:var(--text-muted)">加密导出 QR</span>
            <span class="settings-arrow">›</span>
          </div>
          <div class="settings-divider"></div>
          <div class="settings-row" onclick="goTo('page-gasless')">
            <span class="settings-icon">🎈</span>
            <span class="settings-label">免 Gas / 元交易</span>
            <span class="settings-value" id="wwGaslessSettingsHint" style="font-size:11px;color:var(--text-muted)">中继示意</span>
            <span class="settings-arrow">›</span>
          </div>
        </div>

        <div id="wwGasManagerCard" """
    if n_set not in raw:
        raise SystemExit("anchor settings sentiment / wwGasManagerCard not found")
    raw = raw.replace(n_set, i_set, 1)

    # ── Pages before recovery-test ───────────────────────────────────
    n_pages = """    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    i_pages = """    <!-- 链上消息（本地加密载荷，可随转账备注传播） -->
    <div class="page" id="page-onchain-messaging">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">链上消息</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">在本地用密码将文本<b>加密</b>为载荷；收款方可凭约定密码解密。密文可放入转账备注或另行发送（具体链上备注长度以网络为准）。</div>
        <label style="display:block;margin-bottom:6px;font-size:11px;color:var(--text-muted)">消息内容</label>
        <textarea id="wwOnchainMsgInput" rows="4" placeholder="输入要加密的短消息…" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;resize:vertical;margin-bottom:12px"></textarea>
        <label style="display:block;margin-bottom:6px;font-size:11px;color:var(--text-muted)">加密密码（至少 4 位）</label>
        <input id="wwOnchainMsgPass" type="password" placeholder="与收款方线下约定" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;margin-bottom:12px" />
        <button type="button" class="btn-primary" style="width:100%;padding:12px;margin-bottom:10px" onclick="if(typeof wwOnchainMsgEncrypt==='function')wwOnchainMsgEncrypt()">生成本地加密载荷</button>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">密文预览（截断）</div>
        <div id="wwOnchainMsgPreview" style="font-size:10px;color:var(--text);word-break:break-all;line-height:1.5;padding:10px;border-radius:12px;background:var(--bg2);border:1px solid var(--border);min-height:48px;margin-bottom:12px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="if(typeof wwOnchainMsgCopy==='function')wwOnchainMsgCopy()">复制密文</button>
          <button type="button" class="btn-secondary" style="flex:1;min-width:120px;padding:10px;font-size:12px" onclick="if(typeof wwOnchainMsgGoTransfer==='function')wwOnchainMsgGoTransfer()">前往转账</button>
        </div>
      </div>
    </div>

    <!-- 备份二维码（加密 JSON，非明文助记词） -->
    <div class="page" id="page-backup-qr">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">备份二维码</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">生成含<b>地址与备份标记</b>的 AES-GCM 加密包二维码，需与解密密码配合使用；请勿将密码与二维码存放在同一处。</div>
        <label style="display:block;margin-bottom:6px;font-size:11px;color:var(--text-muted)">导出密码</label>
        <input id="wwBackupQrPass" type="password" placeholder="解密时须使用同一密码" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:14px;margin-bottom:14px" />
        <div style="display:flex;justify-content:center;margin-bottom:14px">
          <canvas id="wwBackupQrCanvas" width="200" height="200" style="border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.25)"></canvas>
        </div>
        <button type="button" class="btn-primary" style="width:100%;padding:12px" onclick="if(typeof wwBackupQrGenerate==='function')wwBackupQrGenerate()">生成加密备份二维码</button>
      </div>
    </div>

    <!-- 免 Gas / 元交易（偏好示意） -->
    <div class="page" id="page-gasless">
      <div class="nav-bar">
        <div class="nav-back" onclick="goTo('page-settings')" style="font-size:22px;color:var(--gold);cursor:pointer;width:32px">&#8249;</div>
        <div class="nav-title">免 Gas / 元交易</div>
        <div class="nav-right"></div>
      </div>
      <div class="u14" style="padding:16px 20px 40px">
        <div style="font-size:12px;color:var(--text-muted);line-height:1.65;margin-bottom:14px">开启后，发送界面将<b>提示</b>可选用中继器代付 Gas（EIP-2771 / 4337 等需合约与节点支持；此处仅为本机偏好与说明）。</div>
        <label style="display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:13px;color:var(--text)">
          <input type="checkbox" id="wwGaslessEnable" onchange="if(typeof wwGaslessSave==='function')wwGaslessSave()" style="width:18px;height:18px;accent-color:var(--gold)" />
          优先展示元交易 / 中继路由（示意）
        </label>
        <label style="display:block;margin-bottom:6px;font-size:11px;color:var(--text-muted)">中继 / Bundler URL（可选，仅备忘）</label>
        <input id="wwGaslessRelay" type="text" placeholder="https://…" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;margin-bottom:14px" oninput="if(typeof wwGaslessSave==='function')wwGaslessSave()" />
        <div style="font-size:11px;color:var(--text-muted);line-height:1.65;padding:12px;border-radius:12px;background:rgba(98,126,234,0.08);border:1px solid rgba(98,126,234,0.25)">零 Gas 体验通常依赖项目方赞助或 Paymaster；请仅使用可信中继，并注意 MEV 与延迟风险。</div>
      </div>
    </div>

    <!-- 恢复演练（安全模式） -->
    <div class="page" id="page-recovery-test">"""
    if n_pages not in raw:
        raise SystemExit("anchor page-recovery-test block not found")
    raw = raw.replace(n_pages, i_pages, 1)

    # ── SEO map ─────────────────────────────────────────────────────
    n_seo = """  'page-sentiment': { title: '舆情分析 — WorldToken', description: '代币情绪示意与行情联动。' }
};"""
    i_seo = """  'page-sentiment': { title: '舆情分析 — WorldToken', description: '代币情绪示意与行情联动。' },
  'page-onchain-messaging': { title: '链上消息 — WorldToken', description: '本地加密消息载荷与转账配合说明。' },
  'page-backup-qr': { title: '备份二维码 — WorldToken', description: '加密备份二维码导出。' },
  'page-gasless': { title: '免 Gas — WorldToken', description: '元交易与中继偏好示意。' }
};"""
    if n_seo not in raw:
        raise SystemExit("anchor WW_PAGE_SEO page-sentiment closing not found")
    raw = raw.replace(n_seo, i_seo, 1)

    # ── goTo side effects ───────────────────────────────────────────
    n_go = """  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch(_sn) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    i_go = """  if(pageId==='page-sentiment') { try { if(typeof wwSentimentPopulate==='function') setTimeout(wwSentimentPopulate, 50); } catch(_sn) {} }
  if(pageId==='page-onchain-messaging') { try { if(typeof wwOnchainMessagingPopulate==='function') setTimeout(wwOnchainMessagingPopulate, 40); } catch(_om) {} }
  if(pageId==='page-backup-qr') { try { setTimeout(function(){ var c=document.getElementById('wwBackupQrCanvas'); if(c){ var x=c.getContext('2d'); if(x){ x.fillStyle='#f0f0f0'; x.fillRect(0,0,c.width,c.height); x.fillStyle='#999'; x.font='13px sans-serif'; x.textAlign='center'; x.fillText('点击下方生成', c.width/2, c.height/2); } } }, 0); } catch(_bq) {} }
  if(pageId==='page-gasless') { try { if(typeof wwGaslessPopulate==='function') setTimeout(wwGaslessPopulate, 40); } catch(_gs) {} }
  if(pageId==='page-charts') { try { if(typeof renderWwChartsPlaceholder==='function') setTimeout(renderWwChartsPlaceholder, 60); } catch(_cw) {} }"""
    if n_go not in raw:
        raise SystemExit("anchor goTo sentiment/charts not found")
    raw = raw.replace(n_go, i_go, 1)

    # ── JS: before wwRecoveryTestClear ───────────────────────────────
    n_js = """  box.innerHTML = out.join('');
}

function wwRecoveryTestClear() {"""
    i_js = """  box.innerHTML = out.join('');
}

function wwOnchainMessagingPopulate() {
  var el = document.getElementById('wwOnchainMsgPreview');
  if (el) el.textContent = '';
}

async function wwOnchainMsgEncrypt() {
  var msg = (document.getElementById('wwOnchainMsgInput') || {}).value || '';
  var pass = (document.getElementById('wwOnchainMsgPass') || {}).value || '';
  if (!String(msg).trim()) { if (typeof showToast === 'function') showToast('请输入消息内容', 'warning'); return; }
  if (!pass || String(pass).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位加密密码', 'warning'); return; }
  var enc = new TextEncoder();
  var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  try {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 80000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var plain = JSON.stringify({ v: 1, kind: 'ww_onchain_msg', t: Date.now(), text: String(msg) });
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(plain));
    var outObj = { v: 1, kind: 'ww_onchain_msg', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var prev = document.getElementById('wwOnchainMsgPreview');
    if (prev) prev.textContent = txt.slice(0, 480) + (txt.length > 480 ? '…' : '');
    try { localStorage.setItem('ww_onchain_msg_prefill', txt); } catch (e) {}
    if (typeof showToast === 'function') showToast('已加密，可复制或前往转账页粘贴到备注', 'success');
  } catch (e) {
    if (typeof showToast === 'function') showToast('加密失败', 'error');
  }
}

function wwOnchainMsgCopy() {
  try {
    var b64 = localStorage.getItem('ww_onchain_msg_prefill') || '';
    if (!b64) { if (typeof showToast === 'function') showToast('请先生成加密载荷', 'warning'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b64);
    else { var ta = document.createElement('textarea'); ta.value = b64; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    if (typeof showToast === 'function') showToast('已复制密文', 'success');
  } catch (e) {}
}

function wwOnchainMsgGoTransfer() {
  try { goTo('page-transfer'); } catch (e) {}
}

async function wwBackupQrGenerate() {
  var p = (document.getElementById('wwBackupQrPass') || {}).value || '';
  if (!p || String(p).length < 4) { if (typeof showToast === 'function') showToast('请输入至少 4 位导出密码', 'warning'); return; }
  if (!REAL_WALLET || !REAL_WALLET.ethAddress) { if (typeof showToast === 'function') showToast('请先创建或导入钱包', 'warning'); return; }
  var enc = new TextEncoder();
  try {
    var payload = JSON.stringify({
      v: 1,
      t: Date.now(),
      kind: 'ww_qr_backup',
      eth: REAL_WALLET.ethAddress,
      trx: REAL_WALLET.trxAddress || '',
      btc: REAL_WALLET.btcAddress || '',
      backed: !!REAL_WALLET.backedUp
    });
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(p), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(payload));
    var outObj = { v: 1, kind: 'ww_qr_backup', salt: '', iv: '', data: '' };
    if (typeof wwB64Bytes === 'function') {
      outObj.salt = wwB64Bytes(salt);
      outObj.iv = wwB64Bytes(iv);
      outObj.data = wwB64Bytes(new Uint8Array(ct));
    } else {
      var b64u8 = function(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
      outObj.salt = b64u8(salt);
      outObj.iv = b64u8(iv);
      outObj.data = b64u8(new Uint8Array(ct));
    }
    var txt = JSON.stringify(outObj);
    var canvas = document.getElementById('wwBackupQrCanvas');
    await loadQRCodeLib();
    if (canvas && typeof QRCode !== 'undefined' && QRCode.toCanvas) {
      await QRCode.toCanvas(canvas, txt, { width: 200, margin: 1, color: { dark: '#0a0a12ff', light: '#ffffffff' } });
      if (typeof showToast === 'function') showToast('已生成加密备份二维码（请妥善保管）', 'success');
    } else if (typeof showToast === 'function') showToast('二维码库加载失败', 'error');
  } catch (e) {
    if (typeof showToast === 'function') showToast('生成失败', 'error');
  }
}

function wwGaslessPopulate() {
  var cb = document.getElementById('wwGaslessEnable');
  var rel = document.getElementById('wwGaslessRelay');
  var hint = document.getElementById('wwGaslessSettingsHint');
  try {
    if (cb) cb.checked = localStorage.getItem('ww_gasless_meta') === '1';
    if (rel) rel.value = localStorage.getItem('ww_gasless_relay') || '';
  } catch (e) {}
  if (hint) {
    try { hint.textContent = localStorage.getItem('ww_gasless_meta') === '1' ? '已开启示意' : '关闭'; } catch (e2) { hint.textContent = '—'; }
  }
}

function wwGaslessSave() {
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
    if n_js not in raw:
        raise SystemExit("anchor wwSentimentPopulate / wwRecoveryTestClear not found")
    raw = raw.replace(n_js, i_js, 1)

    # Settings page: refresh gasless hint when opening settings
    n_st = """    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch(_ar0) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    i_st = """    try { if(typeof wwAutoRebalanceSave==='function') wwAutoRebalanceSave(); } catch(_ar0) {}
    try { if(typeof wwGaslessPopulate==='function') wwGaslessPopulate(); } catch(_gsp) {}
    try { if(typeof wwGasManagerRender==='function') setTimeout(wwGasManagerRender, 30); } catch(_wg) {}"""
    if n_st in raw:
        raw = raw.replace(n_st, i_st, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: patched {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
