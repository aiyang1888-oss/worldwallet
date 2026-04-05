#!/usr/bin/env python3
"""彻底去掉手机壳，页面直接全屏"""
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 把 body 样式改为全屏
old_body = '''body {
  background: #0d0d18;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: 'PingFang SC','Noto Sans CJK SC','Microsoft YaHei','Segoe UI',sans-serif;
}'''

new_body = '''body {
  background: #0d0d18;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: 'PingFang SC','Noto Sans CJK SC','Microsoft YaHei','Segoe UI',sans-serif;
}

/* 强制全屏，无手机壳 */
@media screen {
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  .phone {
    width: 100vw !important;
    height: 100vh !important;
    min-height: 100vh !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    margin: 0 !important;
    overflow: hidden !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
  }
  .status-bar {
    display: none !important;
  }
  body > * {
    display: none !important;
  }
  .phone {
    display: flex !important;
  }
}'''

if old_body in c:
    c = c.replace(old_body, new_body, 1)
    print("✅ 全屏样式注入")
else:
    print("❌ 未找到 body 样式")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

import shutil
shutil.copy(path, path.replace('assets', 'dist'))
print("✅ 已更新 dist")
