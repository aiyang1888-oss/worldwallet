with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 给 _safeEl fallback 对象加 remove 方法
old = """const _safeEl = (id) => document.getElementById(id) || {
  textContent: '', innerHTML: '', value: '0', style: {display:'',cssText:'',color:'',background:'',opacity:'',width:'',transform:''},
  classList: {add:()=>{},remove:()=>{},contains:()=>false},
  href: '', disabled: false,
  addEventListener: ()=>{}, focus: ()=>{}, blur: ()=>{}
};"""

new = """const _safeEl = (id) => document.getElementById(id) || {
  textContent: '', innerHTML: '', value: '0', style: {display:'',cssText:'',color:'',background:'',opacity:'',width:'',transform:''},
  classList: {add:()=>{},remove:()=>{},contains:()=>false},
  href: '', disabled: false,
  addEventListener: ()=>{}, focus: ()=>{}, blur: ()=>{}, remove: ()=>{}
};"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ _safeEl fallback 加入 remove()")
else:
    print("❌ 找不到")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
