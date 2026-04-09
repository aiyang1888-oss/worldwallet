#!/usr/bin/env python3
"""Remove top-level `const NAME =` blocks from wallet.runtime.js when NAME is already `var NAME` in wallet.ui.js."""
import re

with open("wallet.ui.js", encoding="utf-8") as f:
    ui = f.read()
ui_vars = set(re.findall(r"^var ([A-Za-z_$][\w$]*)\s*=", ui, re.M))

with open("wallet.runtime.js", encoding="utf-8") as f:
    lines = f.readlines()

out = []
i = 0
n = len(lines)
while i < n:
    line = lines[i]
    m = re.match(r"^const ([A-Za-z_$][\w$]*)\s*=", line)
    if not m or m.group(1) not in ui_vars:
        out.append(line)
        i += 1
        continue
    name = m.group(1)
    j = i
    depth = 0
    while j < n:
        seg = lines[j]
        depth += seg.count("{") - seg.count("}")
        depth += seg.count("[") - seg.count("]")
        depth += seg.count("(") - seg.count(")")
        if j == i and ";" in seg and depth == 0:
            j += 1
            break
        if j > i and depth <= 0 and ";" in seg:
            j += 1
            break
        j += 1
        if j - i > 5000:
            raise RuntimeError(f"runaway skip for {name}")
    out.append(f"/* const {name}: wallet.ui.js */\n")
    i = j

with open("wallet.runtime.js", "w", encoding="utf-8") as f:
    f.writelines(out)

print("deduped", len(lines), "->", len(out), "lines; ui_vars matched:", sorted(ui_vars)[:5], "...")
