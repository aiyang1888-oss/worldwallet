#!/usr/bin/env python3
"""
Merge all executable inline <script>...</script> blocks into one block before </body>.
Preserves: <script type="application/ld+json"> in place; collects <script src="..."> and
re-inserts them immediately before the merged inline block (end of body).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SCRIPT_RE = re.compile(
    r"<script(?P<attrs>\b[^>]*)>(?P<body>[\s\S]*?)</script\s*>",
    re.IGNORECASE,
)

SRC_ATTR_RE = re.compile(r"\bsrc\s*=\s*(['\"])([^'\"]+)\1", re.IGNORECASE)
TYPE_ATTR_RE = re.compile(r"\btype\s*=\s*(['\"])([^'\"]+)\1", re.IGNORECASE)


def _attrs_dict(attrs: str) -> dict[str, str]:
    out: dict[str, str] = {}
    m = SRC_ATTR_RE.search(attrs)
    if m:
        out["src"] = m.group(2)
    m = TYPE_ATTR_RE.search(attrs)
    if m:
        out["type"] = m.group(2)
    return out


def _fix_inline(body: str) -> str:
    # Truncated selector in dist bundle
    if "steps.querySelectorAll(');" in body:
        body = body.replace(
            "steps.querySelectorAll(');",
            "try { steps.querySelectorAll('[data-step]').forEach(function(el, i) { el.classList.toggle('active', (i + 1) === n); }); } catch (e) {}",
        )
    return body


def merge_wallet_html(html: str) -> str:
    merged_chunks: list[str] = []
    external_tags: list[str] = []
    out: list[str] = []
    last = 0

    for m in SCRIPT_RE.finditer(html):
        attrs = m.group("attrs") or ""
        body = m.group("body")
        full = m.group(0)
        ad = _attrs_dict(attrs)

        out.append(html[last : m.start()])

        t = ad.get("type", "").lower()
        if t == "application/ld+json":
            out.append(full)
        elif "src" in ad:
            external_tags.append(full.strip())
        else:
            merged_chunks.append(_fix_inline(body))
        last = m.end()

    out.append(html[last:])
    result = "".join(out)

    if not merged_chunks:
        raise SystemExit("No inline scripts found to merge.")

    merged = "\n".join(merged_chunks)
    injection_parts = external_tags + ["<script>", merged, "</script>"]
    injection = "\n".join(injection_parts) + "\n"

    lower = result.lower()
    bi = lower.rfind("</body>")
    if bi == -1:
        raise SystemExit("No </body> found.")
    return result[:bi] + injection + result[bi:]


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--no-line-check"]
    skip_line_check = "--no-line-check" in sys.argv[1:]
    path = Path(args[0] if args else "dist/wallet.html")
    raw = path.read_text(encoding="utf-8")
    out = merge_wallet_html(raw)
    path.write_text(out, encoding="utf-8")
    n = len(out.splitlines())
    print(f"Wrote {path} ({n} lines)")
    if not skip_line_check and n <= 5400:
        raise SystemExit(f"ERROR: line count {n} must stay above 5400")


if __name__ == "__main__":
    main()
