#!/usr/bin/env python3
"""Remove top-level const/let blocks from wallet.runtime.js when NAME is already declared in wallet.ui.js."""
import re

with open("wallet.ui.js", encoding="utf-8") as f:
    ui = f.read()
ui_vars = set(re.findall(r"^var ([A-Za-z_$][\w$]*)\s*=", ui, re.M))
ui_vars |= set(re.findall(r"if \(typeof ([A-Za-z_$][\w$]*) === 'undefined'\) var \1", ui))

with open("wallet.runtime.js", encoding="utf-8") as f:
    lines = f.readlines()

out = []
i = 0
n = len(lines)
while i < n:
    line = lines[i]
    m = re.match(r"^(const|let) ([A-Za-z_$][\w$]*)\s*=", line)
    if not m or m.group(2) not in ui_vars:
        out.append(line)
        i += 1
        continue
    kind, name = m.group(1), m.group(2)
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
            raise RuntimeError(f"runaway skip for {kind} {name}")
    out.append(f"/* {kind} {name}: wallet.ui.js */\n")
    i = j

with open("wallet.runtime.js", "w", encoding="utf-8") as f:
    f.writelines(out)

print("ok lines", len(out))
