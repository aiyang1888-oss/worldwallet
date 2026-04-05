#!/usr/bin/env python3
"""
全量检查 wallet.html 内联 JS 语法错误，并尝试修复所有已知问题。
"""
import re, subprocess, sys

FILE = '/Users/daxiang/Desktop/WorldWallet/dist/wallet.html'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"文件大小: {len(content):,} 字节")

# 提取最大的内联 script（钱包主逻辑）
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', content, re.DOTALL)
print(f"共 {len(scripts)} 个 script 块，大小: {[len(s) for s in scripts]}")

main_script = max(scripts, key=len)
print(f"\n主脚本大小: {len(main_script):,} 字节")

# 用 node 检查语法
def check_syntax(code):
    result = subprocess.run(
        ['node', '--input-type=module', '-e', ''],
        input=f"void 0; try {{ new Function({repr(code[:2000000])}); console.log('OK'); }} catch(e) {{ console.error('ERR:', e.message); }}",
        capture_output=True, text=True, timeout=30
    )
    return result.stdout.strip(), result.stderr.strip()

print("\n=== 语法检查 ===")
out, err = check_syntax(main_script)
print(f"结果: {out or err}")

# 修复1: 字母间撇号 N'Goussa -> N\'Goussa
fixed = re.sub(r"([a-zA-Z])'([a-zA-Z])", r"\1\\'\2", content)
count1 = len(re.findall(r"([a-zA-Z])'([a-zA-Z])", content))

# 修复2: 双逗号 ],, -> ],
count2 = fixed.count('],,')
fixed = fixed.replace('],,', '],')

# 修复3: 检查还有没有 ],, 的变种（空格）
count3 = len(re.findall(r'\],\s*,', fixed))
fixed = re.sub(r'\],\s*,', '],', fixed)

# 修复4: 末尾多余逗号前的 } 或 ] （trailing comma in object）
# 先不动，只检查

print(f"\n修复统计:")
print(f"  撇号转义: {count1} 处")
print(f"  双逗号 ],,: {count2} 处")
print(f"  空格双逗号: {count3} 处")

# 再次检查语法
main_scripts_fixed = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', fixed, re.DOTALL)
main_script_fixed = max(main_scripts_fixed, key=len)

print("\n=== 修复后语法检查 ===")
out2, err2 = check_syntax(main_script_fixed)
print(f"结果: {out2 or err2}")

if 'OK' in out2:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(fixed)
    print(f"\n✅ 已写入修复后文件，大小: {len(fixed):,} 字节")
else:
    print(f"\n❌ 还有错误，未写入。错误: {err2}")
    # 找出错误位置
    if 'ERR:' in (out2 + err2):
        err_msg = (out2 + err2).replace('ERR:', '').strip()
        print(f"错误信息: {err_msg}")
