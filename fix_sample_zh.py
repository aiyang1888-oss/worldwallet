#!/usr/bin/env python3
import re

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找 SAMPLE_KEYS 里的 zh:[ ... ] 
# SAMPLE_KEYS 从第1988行开始
sk_start = content.find('const SAMPLE_KEYS = {')
# zh: 在 SAMPLE_KEYS 里
zh_start = content.find("  zh:['", sk_start)
# 找结束位置（下一个 en: 或其他key）
zh_end = content.find("'],\n  en:", zh_start)
if zh_end < 0:
    zh_end = content.find("'],\n  'zh", zh_start)

print(f"SAMPLE_KEYS zh词库: {zh_start}~{zh_end+2}")

# 提取所有词条
zh_block = content[zh_start:zh_end+2]
words = re.findall(r"'([^']+)'", zh_block)
print(f"原始词条数: {len(words)}")

def is_valid_zh(word):
    if len(word) < 2 or len(word) > 8:
        return False
    # 必须含汉字
    has_cjk = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', word))
    # 不能含拉丁字母、阿拉伯字母、西里尔字母等
    has_non_cjk_script = bool(re.search(r'[a-zA-Z\u0600-\u06ff\u0400-\u04ff\u0900-\u097f\u0e00-\u0e7f\uac00-\ud7af\u3040-\u30ff]', word))
    # 允许：汉字、数字、常用标点（·、-、·）
    return has_cjk and not has_non_cjk_script

clean = [w for w in words if is_valid_zh(w)]
# 去重保序
seen, unique = set(), []
for w in clean:
    if w not in seen:
        seen.add(w)
        unique.append(w)

print(f"过滤后词条数: {len(unique)}")
print(f"前5: {unique[:5]}")
print(f"后5: {unique[-5:]}")

# 替换
new_zh = "  zh:['" + "','".join(unique) + "']"
new_content = content[:zh_start] + new_zh + content[zh_end+1:]

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"✅ 完成，文件大小: {len(new_content)//1024}KB")
