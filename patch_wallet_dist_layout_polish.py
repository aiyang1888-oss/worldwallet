#!/usr/bin/env python3
"""
全局排版 / 布局 / 可读性优化：写入 dist/wallet.html。
- 提升文字对比与层级（--text / --text-muted / --border）
- html 防缩放、body 行高与字体平滑
- .page 安全区、滚动条、overscroll
- 导航与按钮触控与留白
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist" / "wallet.html"

MIN_BYTES = 800_000


def main() -> None:
    if not DIST.is_file():
        raise SystemExit(f"Missing {DIST}")
    raw = DIST.read_text(encoding="utf-8")
    orig = raw

    # 1) :root 块替换
    old_root = """* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

:root {
  --gold: #c8a84b;
  --gold-light: #f0d070;
  --bg: #080810;
  --bg2: #0f0f1c;
  --bg3: #141426;
  --border: #22223a;
  --text: #e0e0f0;
  --text-dim: #888;
  --text-muted: #555;
  --green: #4ac84a;
  --red: #ff6060;
}"""
    new_root = """* { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

:root {
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
    if old_root in raw:
        raw = raw.replace(old_root, new_root, 1)
    elif "--line-body:" not in raw:
        raise SystemExit("patch_wallet_dist_layout_polish: :root block not found (file changed?)")

    old_body = """body {
  background: #0d0d18;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: 'PingFang SC','Noto Sans CJK SC','Microsoft YaHei','Segoe UI',sans-serif;
}"""
    new_body = """body {
  background: #0d0d18;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  font-family: 'PingFang SC','Noto Sans CJK SC','Microsoft YaHei','Segoe UI',system-ui,-apple-system,sans-serif;
  line-height: var(--line-body, 1.55);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}"""
    if old_body in raw:
        raw = raw.replace(old_body, new_body, 1)
    elif "min-height: 100dvh" not in raw:
        raise SystemExit("patch_wallet_dist_layout_polish: body block not found")

    old_page = """.page {
  position: absolute;
  top: 50px; left: 0; right: 0; bottom: 0;
  overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column;
  background: var(--bg);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(14px, 0, 0);
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.34s;
  z-index: 0;
}"""
    new_page = """.page {
  position: absolute;
  top: 50px; left: 0; right: 0; bottom: 0;
  overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  display: flex; flex-direction: column;
  background: var(--bg);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translate3d(14px, 0, 0);
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1), transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.34s;
  z-index: 0;
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: max(10px, env(safe-area-inset-bottom, 0px));
}
.page::-webkit-scrollbar { width: 5px; }
.page::-webkit-scrollbar-track { background: transparent; }
.page::-webkit-scrollbar-thumb {
  background: rgba(200, 168, 75, 0.28);
  border-radius: 6px;
}"""
    if old_page in raw:
        raw = raw.replace(old_page, new_page, 1)
    elif "overscroll-behavior: contain" not in raw:
        raise SystemExit("patch_wallet_dist_layout_polish: .page block not found")

    # 导航栏安全区
    old_nav = """.nav-bar {
  height: 56px; background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 20px; gap: 14px; flex-shrink: 0;
}"""
    new_nav = """.nav-bar {
  height: 56px; background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 max(18px, env(safe-area-inset-left, 0px)) 0 max(18px, env(safe-area-inset-right, 0px));
  gap: 14px; flex-shrink: 0;
}"""
    if old_nav in raw:
        raw = raw.replace(old_nav, new_nav, 1)

    # 主按钮最小高度（触控）
    old_btn = """.btn-primary {
  background: linear-gradient(135deg, #b8982a, #e8c850);
  color: #0a0a05; border: none; border-radius: 16px;
  padding: 12px; font-size: 14px; font-weight: 700;
  cursor: pointer; width: 100%; transition: all 0.2s;
}"""
    new_btn = """.btn-primary {
  background: linear-gradient(135deg, #b8982a, #e8c850);
  color: #0a0a05; border: none; border-radius: 16px;
  padding: 14px 16px; font-size: 15px; font-weight: 700;
  min-height: 48px;
  cursor: pointer; width: 100%; transition: all 0.2s;
  letter-spacing: 0.02em;
}"""
    if old_btn in raw:
        raw = raw.replace(old_btn, new_btn, 1)

    old_sec = """.btn-secondary {
  background: transparent; color: var(--gold);
  border: 1.5px solid rgba(200,168,75,0.3);
  border-radius: 16px; padding: 10px;
  font-size: 13px; cursor: pointer; width: 100%;
  transition: all 0.2s; margin-top: 6px;
}"""
    new_sec = """.btn-secondary {
  background: transparent; color: var(--gold);
  border: 1.5px solid rgba(200,168,75,0.3);
  border-radius: 16px; padding: 12px 14px;
  font-size: 14px; cursor: pointer; width: 100%;
  min-height: 46px;
  transition: all 0.2s; margin-top: 6px;
  letter-spacing: 0.02em;
}"""
    if old_sec in raw:
        raw = raw.replace(old_sec, new_sec, 1)

    # 首页标题区略增呼吸感
    old_home = """.home-header { background: var(--bg2); padding: 16px 20px 20px; border-bottom: 1px solid var(--border); }"""
    new_home = """.home-header { background: var(--bg2); padding: 18px max(18px, env(safe-area-inset-left, 0px)) 22px max(18px, env(safe-area-inset-right, 0px)); border-bottom: 1px solid var(--border); }"""
    if old_home in raw:
        raw = raw.replace(old_home, new_home, 1)

    old_key = """.key-content { padding: 16px 20px; flex: 1; }"""
    new_key = """.key-content { padding: var(--page-pad-y, 16px) max(18px, var(--page-pad-x, 18px)); flex: 1; }"""
    if old_key in raw:
        raw = raw.replace(old_key, new_key, 1)

    # 语言格小字可读性
    _ln_old = ".lang-name { font-size: 10px; color: var(--text-muted); }"
    _ln_new = ".lang-name { font-size: 11px; color: var(--text-muted); line-height: var(--line-tight, 1.35); }"
    if _ln_old in raw:
        raw = raw.replace(_ln_old, _ln_new, 1)

    light_old = """[data-theme="light"] {
  --gold: #a88935;
  --gold-light: #d4b85c;
  --bg: #f0f0f4;
  --bg2: #ffffff;
  --bg3: #e8e8ee;
  --border: #d0d0dc;
  --text: #1a1a24;
  --text-dim: #555;
  --text-muted: #888;
  --green: #2a9d4a;
  --red: #d04040;
}"""
    light_new = """[data-theme="light"] {
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
    if light_old in raw:
        raw = raw.replace(light_old, light_new, 1)

    if raw == orig:
        print(f"OK: already applied — {DIST}")
        return

    sz = len(raw.encode("utf-8"))
    if sz < MIN_BYTES:
        raise SystemExit(f"ERROR: output too small ({sz} bytes), expected >= {MIN_BYTES}")

    DIST.write_text(raw, encoding="utf-8")
    lines = len(raw.splitlines())
    print(f"OK: {DIST} ({lines} lines, {sz} bytes)")


if __name__ == "__main__":
    main()
