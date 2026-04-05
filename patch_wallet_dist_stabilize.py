#!/usr/bin/env python3
"""Stabilize dist/wallet.html: goTo/goTab/selectLang try/catch, safe tabBar, merge motion CSS, idempotent."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MARKER = "/* ww-stabilize-v1 */"


def main() -> None:
    raw = DIST.read_text(encoding="utf-8")
    if MARKER in raw:
        sz = DIST.stat().st_size
        lines = len(raw.splitlines())
        print(f"OK: already applied — {DIST} ({lines} lines, {sz} bytes)")
        if sz < 800_000:
            raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")
        return

    # ── CSS: merge duplicate @media (prefers-reduced-motion) blocks ───
    old_motion_1 = """@media (prefers-reduced-motion: reduce) {
  .page { transition-duration: 0.01ms; }
}

/* ── 欢迎页 ── */"""
    new_motion_1 = """@media (prefers-reduced-motion: reduce) {
  .page { transition-duration: 0.01ms; }
  .ww-scroll-top-btn { transition: none; }
}

/* ── 欢迎页 ── */"""
    if old_motion_1 not in raw:
        raise SystemExit("anchor CSS motion block 1 not found")
    raw = raw.replace(old_motion_1, new_motion_1, 1)

    old_motion_2 = """@media (prefers-reduced-motion: reduce) {
  .ww-scroll-top-btn { transition: none; }
}

"""
    new_motion_2 = ""
    if old_motion_2 not in raw:
        raise SystemExit("anchor CSS motion block 2 not found")
    raw = raw.replace(old_motion_2, new_motion_2, 1)

    # ── goTo: outer try/catch + marker comment ────────────────────────
    old_goto_start = """function goTo(pageId) {
  applySeoForPage(pageId);"""
    new_goto_start = f"""function goTo(pageId) {{
  {MARKER}
  try {{
  applySeoForPage(pageId);"""
    if old_goto_start not in raw:
        raise SystemExit("anchor goTo start not found")
    raw = raw.replace(old_goto_start, new_goto_start, 1)

    old_goto_end = """  } catch (e) {}
}


async function resolveENS(name) {"""
    new_goto_end = """  } catch (e) {}
  } catch (e) {
    console.error('[WorldToken] goTo', pageId, e);
    try { if (typeof showToast === 'function') showToast(String(e && e.message || e), 'error'); } catch (_) {}
  }
}


async function resolveENS(name) {"""
    if old_goto_end not in raw:
        raise SystemExit("anchor goTo end not found")
    raw = raw.replace(old_goto_end, new_goto_end, 1)

    # ── tabBar: null-safe (all direct .style assignments) ─────────────
    raw = raw.replace(
        "document.getElementById('tabBar').style.display = MAIN_PAGES.includes(pageId)?'flex':'none';",
        "var _tbGo=document.getElementById('tabBar');if(_tbGo)_tbGo.style.display = MAIN_PAGES.includes(pageId)?'flex':'none';",
        1,
    )
    raw = raw.replace(
        "      document.getElementById('tabBar').style.display = 'flex';",
        "      var _tbH=document.getElementById('tabBar');if(_tbH)_tbH.style.display = 'flex';",
    )
    raw = raw.replace(
        "document.getElementById('tabBar').style.display = 'none';",
        "(function(){var t=document.getElementById('tabBar');if(t)t.style.display='none';})();",
        1,
    )

    # ── Long inline onclick (verify success) ─────────────────────────
    raw = raw.replace(
        'onclick="updateAddr();document.getElementById(\'tabBar\').style.display=\'flex\';setTimeout(loadBalances,500);goTo(\'page-home\')"',
        'onclick="try{updateAddr();var _t=document.getElementById(\'tabBar\');if(_t)_t.style.display=\'flex\';setTimeout(loadBalances,500);goTo(\'page-home\')}catch(e){console.error(e);if(typeof showToast===\'function\')try{showToast(String(e&&e.message||e),\'error\');}catch(_){}}"',
        1,
    )

    # ── goTab ────────────────────────────────────────────────────────
    old_gotab = """function goTab(tabId) {
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  goTo(TAB_MAP[tabId]||'page-home');
}"""
    new_gotab = """function goTab(tabId) {
  try {
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  goTo(TAB_MAP[tabId]||'page-home');
  } catch (e) {
    console.error('[WorldToken] goTab', tabId, e);
    try { if (typeof showToast === 'function') showToast(String(e && e.message || e), 'error'); } catch (_) {}
  }
}"""
    if old_gotab not in raw:
        raise SystemExit("anchor goTab not found")
    raw = raw.replace(old_gotab, new_gotab, 1)

    # ── selectLang ─────────────────────────────────────────────────────
    old_sel = """function selectLang(btn) {
  document.querySelectorAll('#welcomeLangGrid .lang-row, #welcomeLangGrid .lang-btn').forEach(b=>{
    b.classList.remove('active');
    const check = b.querySelector('.lang-check');
    if(check) check.style.opacity='0';
  });
  btn.classList.add('active');
  const check = btn.querySelector('.lang-check');
  if(check) check.style.opacity='1';
  currentLang = btn.dataset.lang;
}"""
    new_sel = """function selectLang(btn) {
  try {
  document.querySelectorAll('#welcomeLangGrid .lang-row, #welcomeLangGrid .lang-btn').forEach(b=>{
    b.classList.remove('active');
    const check = b.querySelector('.lang-check');
    if(check) check.style.opacity='0';
  });
  btn.classList.add('active');
  const check = btn.querySelector('.lang-check');
  if(check) check.style.opacity='1';
  currentLang = btn.dataset.lang;
  } catch (e) {
    console.error('[WorldToken] selectLang', e);
    try { if (typeof showToast === 'function') showToast(String(e && e.message || e), 'error'); } catch (_) {}
  }
}"""
    if old_sel not in raw:
        raise SystemExit("anchor selectLang not found")
    raw = raw.replace(old_sel, new_sel, 1)

    DIST.write_text(raw, encoding="utf-8")
    sz = DIST.stat().st_size
    lines = len(raw.splitlines())
    print(f"OK: wrote {DIST} ({lines} lines, {sz} bytes)")
    if sz < 800_000:
        raise SystemExit(f"ERROR: file size {sz} must stay above 800000 bytes")


if __name__ == "__main__":
    main()
