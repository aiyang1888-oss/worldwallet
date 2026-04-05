with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

old = """onclick="(async function(btn){btn.disabled=true;const w=await createRealWallet();btn.disabled=false;if(w&&currentLang==='en'){updateRealAddr();}goTo('page-key');})(this)"""

new = """onclick="(async function(btn){btn.disabled=true;btn.style.opacity='0.5';try{const w=await createRealWallet();if(w){REAL_WALLET=w;saveWallet(w);if(typeof updateRealAddr==='function')updateRealAddr();goTo('page-key');}else{showToast('创建失败，请重试','error');}}catch(e){showToast(e.message||'创建失败','error');}finally{btn.disabled=false;btn.style.opacity='1';}})(this)"""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ onclick 修复完成")
else:
    print("❌ 找不到目标")
    idx = content.find('createRealWallet')
    print(content[idx-50:idx+200])

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
