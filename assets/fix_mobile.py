#!/usr/bin/env python3
"""手机上去掉手机壳，直接全屏显示"""
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 在现有 CSS 末尾加媒体查询，手机上去掉壳
old_style_end = '</style>'
mobile_css = '''
/* 手机浏览器直接全屏 */
@media (max-width: 480px) {
  body {
    background: var(--bg) !important;
    display: block !important;
    justify-content: unset !important;
    align-items: unset !important;
  }
  .phone {
    width: 100% !important;
    height: 100vh !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    margin: 0 !important;
  }
  .status-bar { display: none !important; }
}
</style>'''

c = c.replace(old_style_end, mobile_css, 1)
print("✅ 手机全屏 CSS 加入")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

import shutil
shutil.copy(path, path.replace('assets', 'dist'))
print("✅ 已更新 dist/wallet.html")
