#!/usr/bin/env python3
"""
从城市数据库提取 es/fr/pt 语言的真实城市名词库，
替换 SAMPLE_KEYS 里的占位符。
目标：每种语言 2048 个干净的城市名。
"""
import json, re

DB = '/Users/daxiang/.openclaw/workspace/ruyi9/multilang/countries-states-cities-database-master/json/countries+states+cities.json'
print("加载数据库...")
with open(DB, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 西班牙语国家：西班牙、墨西哥、阿根廷、哥伦比亚、秘鲁、委内瑞拉、智利等
ES_COUNTRIES = {'ES','MX','AR','CO','PE','VE','CL','EC','BO','PY','UY','CR','CU','DO','GT','HN','NI','PA','PR','SV'}
# 法语国家：法国、加拿大(魁北克)、比利时、瑞士、科特迪瓦、塞内加尔等
FR_COUNTRIES = {'FR','BE','CH','CI','SN','CM','ML','BF','NE','TG','BJ','GA','CG','CD','RW','BI'}
# 葡萄牙语国家：葡萄牙、巴西、安哥拉、莫桑比克等
PT_COUNTRIES = {'PT','BR','AO','MZ','CV','GW','ST','TL'}

def get_cities(country_codes, max_count=2048):
    cities = []
    seen = set()
    for country in data:
        if country.get('iso2') not in country_codes:
            continue
        for state in country.get('states', []):
            for city in state.get('cities', []):
                name = city.get('name', '').strip()
                # 过滤：只保留干净的名称（无特殊符号、长度2-30）
                if not name or len(name) < 2 or len(name) > 30:
                    continue
                if name.lower() in seen:
                    continue
                # 过滤纯数字和特殊字符开头
                if name[0].isdigit():
                    continue
                seen.add(name.lower())
                cities.append(name)
    # 按知名度排序（优先首字母，保证多样性）
    cities.sort(key=lambda x: (x[0].upper(), x))
    return cities[:max_count]

print("提取西班牙语城市...")
es_cities = get_cities(ES_COUNTRIES)
print(f"  → {len(es_cities)} 个城市")

print("提取法语城市...")
fr_cities = get_cities(FR_COUNTRIES)
print(f"  → {len(fr_cities)} 个城市")

print("提取葡萄牙语城市...")
pt_cities = get_cities(PT_COUNTRIES)
print(f"  → {len(pt_cities)} 个城市")

# 如果数量不足 2048，补充
def pad_to(lst, target=2048):
    if len(lst) >= target:
        return lst[:target]
    # 不足则循环补充（在词尾加序号区分）
    orig = lst[:]
    i = 2
    while len(lst) < target:
        lst.append(orig[len(lst) % len(orig)] + str(i))
        i += 1
    return lst[:target]

es_cities = pad_to(es_cities)
fr_cities = pad_to(fr_cities)
pt_cities = pad_to(pt_cities)

def fmt_list(lst):
    return "['" + "','".join(c.replace("'", "\\'") for c in lst) + "']"

# 现在替换 wallet.html 里的占位符词库
SRC = '/Users/daxiang/Desktop/WorldWallet/dist/wallet.html'
with open(SRC, 'r', encoding='utf-8') as f:
    content = f.read()

# 找出 es/fr/pt 的词库位置并替换
# 格式：es:['...'],
for lang, cities in [('es', es_cities), ('fr', fr_cities), ('pt', pt_cities)]:
    pattern = rf"(  {lang}:\[')([^']+(?:'[^']*'[^']*)*?)('\],?\n)"
    # 用更可靠的方式：找到 es:[...] 整块替换
    # 先找开始位置
    start_marker = f"  {lang}:['"
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print(f"❌ 找不到 {lang} 词库")
        continue
    
    # 找结束位置（下一个语言key或 };）
    # 向后找 '],\n  ' 或 ']\n};'
    end_search = start_idx + len(start_marker)
    depth = 1
    i = content.find('[', start_idx) + 1
    while i < len(content) and depth > 0:
        if content[i] == '[': depth += 1
        elif content[i] == ']': depth -= 1
        i += 1
    end_idx = i  # 指向 ] 之后
    # 包含尾部逗号和换行
    if content[end_idx] == ',':
        end_idx += 1
    
    old_block = content[start_idx:end_idx]
    new_block = f"  {lang}:{fmt_list(cities)}"
    content = content[:start_idx] + new_block + content[end_idx:]
    print(f"✅ {lang}: 替换完成，{len(cities)} 个城市，前3: {cities[:3]}")

with open(SRC, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n文件大小: {len(content)//1024}KB")
print("完成！")
