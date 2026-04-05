with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. 版本号统一为 v1.0.0，域名改 worldtoken.cc
old = "showToast('WorldToken v2.0.0 · worldtoken.co', 'info', 3000)"
new = "showToast('WorldToken v1.0.0 · worldtoken.cc', 'info', 3000)"
if old in content:
    content = content.replace(old, new)
    fixes += 1
    print("✅ 版本号+域名修复")

# 2. updateSettingsPage 加 backupStatus 更新
old2 = """function updateSettingsPage() {
  const info = LANG_INFO[currentLang]||{name:'中文'};
  const sl = (_safeEl('settingsLang') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsLang fallback */;
  if(sl) sl.textContent = info.name;
  const sa = document.getElementById('settingsAddr');
  if(sa) sa.textContent = getNativeAddr();
}"""
new2 = """function updateSettingsPage() {
  const info = LANG_INFO[currentLang]||{name:'中文'};
  const sl = (_safeEl('settingsLang') || {textContent:'',style:{},classList:{add:()=>{},remove:()=>{}}}) /* settingsLang fallback */;
  if(sl) sl.textContent = info.name;
  const sa = document.getElementById('settingsAddr');
  if(sa) sa.textContent = getNativeAddr();
  // 实时反映备份状态
  const bs = document.getElementById('backupStatus');
  if(bs) {
    const backed = REAL_WALLET && REAL_WALLET.backedUp;
    bs.textContent = backed ? '已备份 ✓' : '未备份';
    bs.style.color = backed ? 'var(--green,#26a17b)' : 'var(--red,#e74c3c)';
  }
}"""
if old2 in content:
    content = content.replace(old2, new2)
    fixes += 1
    print("✅ updateSettingsPage 加备份状态同步")

print(f"共修复 {fixes} 处")

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
