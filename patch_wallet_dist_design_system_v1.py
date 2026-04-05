#!/usr/bin/env python3
"""
WorldToken UI — Design System v1（从零定义的设计基础）
- 新调色板与语义色（仍兼容现有 --bg / --gold 等变量名）
- 圆角阶梯、阴影 token
- 顶栏 / 底栏毛玻璃、欢迎页与首页光晕
- 桌面「手机框」渐变与描边

幂等：已含标记 WW_DESIGN_V1 则跳过。
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"
MIN_BYTES = 800_000
MARKER = "/* WW_DESIGN_V1 */"

OLD_ROOT = """::root {
  --gold: #c8a84b;
  --gold-light: #f0d070;
  --bg: #080810;
  --bg2: #0f0f1c;
  --bg3: #141426;
  --border: #2e2e42;
  --text: #ececf4;
  --text-dim: #9aa0b4;
  --text-muted: #6a6f82;
  --green: #4ac84a;
  --red: #ff6060;
  --nav-h: 56px;
  --page-pad-x: 18px;
  --page-pad-y: 16px;
  --line-body: 1.55;
  --line-tight: 1.35;
}"""

# 注意：上面 typo — 文件里是 :root 不是 ::root
OLD_ROOT = OLD_ROOT.replace("::root", ":root", 1)

NEW_ROOT = """:root {
  /* —— Brand —— */
  --gold: #e4c56c;
  --gold-light: #f2e6b0;
  --gold-muted: rgba(228, 197, 108, 0.38);
  /* —— Surfaces（深空 + 层级） —— */
  --bg: #06060f;
  --bg2: #0c0c18;
  --bg3: #141428;
  --border: rgba(255, 255, 255, 0.085);
  /* —— Text —— */
  --text: #f1f3f8;
  --text-dim: #9aa3b8;
  --text-muted: #6b7588;
  /* —— Semantic —— */
  --green: #4cd964;
  --red: #ff6b6b;
  /* —— Layout —— */
  --nav-h: 56px;
  --page-pad-x: 18px;
  --page-pad-y: 16px;
  --line-body: 1.55;
  --line-tight: 1.35;
  /* —— Design System v1 tokens —— */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  --shadow-gold: 0 4px 28px rgba(228, 197, 108, 0.22);
  --shadow-float: 0 16px 48px rgba(0, 0, 0, 0.45);
}"""

OLD_LIGHT = """[data-theme="light"] {
  --gold: #a88935;
  --gold-light: #d4b85c;
  --bg: #f0f0f4;
  --bg2: #ffffff;
  --bg3: #e8e8ee;
  --border: #c8c8d4;
  --text: #16161f;
  --text-dim: #4a4a58;
  --text-muted: #6b6b7a;
  --green: #2a9d4a;
  --red: #d04040;
}"""

NEW_LIGHT = """[data-theme="light"] {
  --gold: #b8922a;
  --gold-light: #d4af37;
  --gold-muted: rgba(184, 146, 42, 0.4);
  --bg: #f2f3f7;
  --bg2: #ffffff;
  --bg3: #eaeaef;
  --border: rgba(0, 0, 0, 0.09);
  --text: #12121a;
  --text-dim: #4a5060;
  --text-muted: #737a8c;
  --green: #2a9d4a;
  --red: #d04040;
  --shadow-gold: 0 4px 24px rgba(184, 146, 42, 0.18);
  --shadow-float: 0 12px 40px rgba(0, 0, 0, 0.08);
}"""

MOTION_ANCHOR = """@media (prefers-reduced-motion: reduce) {
  .page { transition-duration: 0.01ms; }
}

/* ── 欢迎页 ── */"""

DESIGN_BLOCK = """@media (prefers-reduced-motion: reduce) {
  .page { transition-duration: 0.01ms; }
}

""" + MARKER + """
/* ========== WorldToken UI · Design System v1（覆盖层） ========== */
@media (min-width: 769px) {
  .phone {
    background: linear-gradient(165deg, rgba(16, 16, 32, 0.98) 0%, rgba(8, 8, 18, 1) 42%, #06060f 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.45),
      0 40px 100px rgba(0, 0, 0, 0.78),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }
}

.status-bar {
  background: rgba(6, 6, 15, 0.82) !important;
  backdrop-filter: saturate(1.15) blur(16px);
  -webkit-backdrop-filter: saturate(1.15) blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-bar {
  background: rgba(10, 10, 22, 0.9) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.tab-bar {
  background: rgba(10, 10, 22, 0.93) !important;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
}

.tab-item {
  font-size: 11px;
  letter-spacing: 0.03em;
}
.tab-item.active {
  font-weight: 600;
}

#page-welcome {
  background:
    radial-gradient(ellipse 95% 75% at 50% -28%, rgba(228, 197, 108, 0.22) 0%, transparent 58%),
    radial-gradient(ellipse 55% 50% at 95% 85%, rgba(100, 80, 200, 0.09) 0%, transparent 52%),
    var(--bg) !important;
}

.home-header {
  background: linear-gradient(180deg, rgba(14, 14, 28, 0.96) 0%, rgba(8, 8, 18, 0.55) 100%) !important;
  border-bottom-color: rgba(255, 255, 255, 0.06) !important;
}

.btn-primary {
  border-radius: var(--radius-md, 16px);
  box-shadow: var(--shadow-gold);
}
.btn-secondary {
  border-radius: var(--radius-md, 16px);
}

[data-theme="light"] .status-bar {
  background: rgba(255, 255, 255, 0.86) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
[data-theme="light"] .nav-bar {
  background: rgba(255, 255, 255, 0.92) !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07) !important;
}
[data-theme="light"] .tab-bar {
  background: rgba(255, 255, 255, 0.95) !important;
  border-top: 1px solid rgba(0, 0, 0, 0.07) !important;
}
[data-theme="light"] #page-welcome {
  background:
    radial-gradient(ellipse 90% 70% at 50% -20%, rgba(184, 146, 42, 0.14) 0%, transparent 55%),
    var(--bg) !important;
}
[data-theme="light"] .home-header {
  background: linear-gradient(180deg, #ffffff 0%, rgba(248, 248, 252, 0.95) 100%) !important;
}

/* ── 欢迎页 ── */"""


def main() -> None:
    if not DIST.is_file():
        raise SystemExit(f"Missing {DIST}")
    raw = DIST.read_text(encoding="utf-8")
    if MARKER in raw:
        print(f"OK: already applied — {DIST}")
        return

    if OLD_ROOT not in raw:
        raise SystemExit("design_system_v1: :root block not found (run from layout-polish baseline?)")
    raw = raw.replace(OLD_ROOT, NEW_ROOT, 1)

    if OLD_LIGHT not in raw:
        raise SystemExit("design_system_v1: light theme block not found")
    raw = raw.replace(OLD_LIGHT, NEW_LIGHT, 1)

    if MOTION_ANCHOR not in raw:
        raise SystemExit("design_system_v1: motion media anchor not found")
    raw = raw.replace(MOTION_ANCHOR, DESIGN_BLOCK, 1)

    raw = raw.replace(
        '<meta name="theme-color" content="#c8a84b">',
        '<meta name="theme-color" content="#0c0c18">',
        1,
    )

    sz = len(raw.encode("utf-8"))
    if sz < MIN_BYTES:
        raise SystemExit(f"ERROR: output too small ({sz} bytes)")

    DIST.write_text(raw, encoding="utf-8")
    print(f"OK: {DIST} ({len(raw.splitlines())} lines, {sz} bytes)")


if __name__ == "__main__":
    main()
