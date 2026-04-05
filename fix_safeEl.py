with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取 _safeEl 定义
safeEl_def = """const _safeEl = (id) => document.getElementById(id) || {
  textContent: '', innerHTML: '', value: '0', style: {display:'',cssText:'',color:'',background:'',opacity:'',width:'',transform:''},
  classList: {add:()=>{},remove:()=>{},contains:()=>false},
  href: '', disabled: false,
  addEventListener: ()=>{}, focus: ()=>{}, blur: ()=>{}
};"""

# 从原位置删掉
if safeEl_def in content:
    content = content.replace(safeEl_def, '// _safeEl moved to top of script', 1)
    print("✅ 从原位置删除")
else:
    print("❌ 找不到原始定义，检查一下")

# 插入到第一个 <script> 内联脚本的最开头（在 let REAL_WALLET 前面）
insert_before = 'let REAL_WALLET = null;'
if insert_before in content:
    content = content.replace(insert_before, safeEl_def + '\n\n' + insert_before, 1)
    print("✅ 插入到脚本顶部")
else:
    print("❌ 找不到插入位置")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
