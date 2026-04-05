with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 修复 createRealWallet() 的 onclick 调用（现在是 async，需要 await）
old = "onclick=\"(function(btn){btn.disabled=true;const w=createRealWallet();btn.disabled=false;if(w&&currentLang==='en'){updateRealAddr();}goTo('page-key');})(this)\""
new = "onclick=\"(async function(btn){btn.disabled=true;const w=await createRealWallet();btn.disabled=false;if(w&&currentLang==='en'){updateRealAddr();}goTo('page-key');})(this)\""

if old in content:
    content = content.replace(old, new, 1)
    print("✅ onclick 已修复")
else:
    print("❌ 找不到目标字符串，需手动检查")
    # 找近似位置
    idx = content.find('createRealWallet')
    print(content[idx-100:idx+200])

with open('/Users/daxiang/Desktop/WorldWallet/dist/wallet.html', 'w', encoding='utf-8') as f:
    f.write(content)
