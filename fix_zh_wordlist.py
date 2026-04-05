#!/usr/bin/env python3
"""
过滤中文词库：只保留纯汉字词条（去掉英文、阿拉伯文、其他外文混入的词）
"""
import re, json

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到 zh:[ ... ] 词库
zh_start = content.find("  zh:['")
zh_end = content.find("'],\n  en:", zh_start)
if zh_end < 0:
    zh_end = content.find("'],\n  'zh-TW':", zh_start)

print(f"zh词库位置: {zh_start}~{zh_end}")

# 提取词库字符串
zh_block = content[zh_start:zh_end+2]  # 包含 ']
# 提取所有词条
words_raw = re.findall(r"'([^']+)'", zh_block)
print(f"原始词条数: {len(words_raw)}")

def is_valid_zh(word):
    """只保留：
    - 至少1个汉字
    - 不含拉丁字母（纯汉字城市名）
    - 长度2-8字
    """
    if len(word) < 2 or len(word) > 8:
        return False
    # 必须全是汉字或常用标点
    has_cjk = bool(re.search(r'[\u4e00-\u9fff\u3400-\u4dbf]', word))
    has_latin = bool(re.search(r'[a-zA-Z]', word))
    has_arabic = bool(re.search(r'[\u0600-\u06ff]', word))
    has_cyrillic = bool(re.search(r'[\u0400-\u04ff]', word))
    has_hindi = bool(re.search(r'[\u0900-\u097f]', word))
    return has_cjk and not has_latin and not has_arabic and not has_cyrillic and not has_hindi

# 过滤
clean_words = [w for w in words_raw if is_valid_zh(w)]
# 去重但保持顺序
seen = set()
unique_words = []
for w in clean_words:
    if w not in seen:
        seen.add(w)
        unique_words.append(w)

print(f"过滤后词条数: {len(unique_words)}")
print(f"示例前10: {unique_words[:10]}")
print(f"示例后10: {unique_words[-10:]}")

# 生成新词库
new_zh_list = "['" + "','".join(unique_words) + "']"
new_zh_block = f"  zh:{new_zh_list}"

# 替换
new_content = content[:zh_start] + new_zh_block + content[zh_end+1:]  # +1跳过]

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"✅ 完成！文件大小: {len(new_content)//1024}KB")
