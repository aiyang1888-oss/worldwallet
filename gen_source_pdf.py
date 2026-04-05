#!/usr/bin/env python3
"""
生成软件著作权申请用源码 PDF
规则：前30页 + 后30页（每页50行）
"""
import subprocess, os

SRC = '/Users/daxiang/Desktop/WorldWallet/dist/wallet.html'
OUT = '/Users/daxiang/Desktop/WorldWallet/copyright/'
os.makedirs(OUT, exist_ok=True)

with open(SRC, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
lines_per_page = 50
# 前30页 = 前1500行，后30页 = 后1500行
front = lines[:1500]
back = lines[max(0, total-1500):]

print(f"总行数: {total}")
print(f"前30页: 第1行~第{len(front)}行")
print(f"后30页: 第{total-len(back)+1}行~第{total}行")

# 生成 HTML 然后转 PDF（用 pandoc 或直接写 HTML）
content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>WorldToken 多语言数字钱包系统 V1.0 - 源程序</title>
<style>
  body {{ font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.4; margin: 2cm; }}
  h1 {{ font-size: 14pt; text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; }}
  h2 {{ font-size: 11pt; margin-top: 20px; }}
  pre {{ white-space: pre-wrap; word-break: break-all; background: #f5f5f5; padding: 10px; border: 1px solid #ddd; }}
  .line-num {{ color: #888; user-select: none; display: inline-block; width: 50px; }}
  .page-break {{ page-break-before: always; }}
</style>
</head>
<body>
<h1>WorldToken 多语言数字钱包系统 V1.0</h1>
<p style="text-align:center">软件著作权申请源程序鉴别材料</p>
<p style="text-align:center">申请人：郭军超 &nbsp;&nbsp; 著作权登记申请日期：2026年</p>
<hr>

<h2>第一部分：源程序前30页（第1行 ~ 第{len(front)}行）</h2>
<pre>"""

for i, line in enumerate(front, 1):
    esc = line.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
    content += f'<span class="line-num">{i:4d} </span>{esc}'

content += f"""</pre>

<div class="page-break"></div>

<h2>第二部分：源程序后30页（第{total-len(back)+1}行 ~ 第{total}行）</h2>
<pre>"""

for i, line in enumerate(back, total-len(back)+1):
    esc = line.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
    content += f'<span class="line-num">{i:4d} </span>{esc}'

content += """</pre>
</body>
</html>"""

html_path = OUT + 'source_code.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ HTML 生成: {html_path}")
print(f"文件大小: {os.path.getsize(html_path)//1024} KB")
print("请用浏览器打开此文件，然后 Ctrl+P → 另存为PDF")
