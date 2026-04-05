#!/usr/bin/env python3
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 直接把欢迎页的按钮区域改为绝对定位，固定在底部
old_buttons = '''      <!-- 按钮区 -->
      <div style="width:100%;flex-shrink:0;margin-top:40px">
        <button class="btn-primary" onclick="goTo('page-create')" style="padding:13px;font-size:14px">🚀 开始使用</button>
        <button class="btn-secondary" onclick="goTo('page-import')" style="padding:10px;font-size:13px;margin-top:7px">📥 导入已有钱包</button>'''

new_buttons = '''      <!-- 按钮区 -->
      <div style="width:100%;flex-shrink:0;margin-top:32px">
        <button class="btn-primary" onclick="goTo('page-create')" style="padding:13px;font-size:14px">🚀 开始使用</button>
        <button class="btn-secondary" onclick="goTo('page-import')" style="padding:10px;font-size:13px;margin-top:7px">📥 导入已有钱包</button>'''

# 更重要的是修复 .phone 内容溢出
# 找到 page-welcome 的样式，确保按钮在可视区内
old_welcome_style = '#page-welcome {\n  background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,168,75,0.15) 0%, transparent 60%), var(--bg);\n  align-items: center;\n  padding: 16px 24px 14px;\n  text-align: center;\n  overflow: hidden;\n}'

# 直接在 CSS 里强制欢迎页布局
# 找到 welcomeWrap 相关 CSS 或直接加 override
old_head_close = '/* ── 手机全屏 CSS 加入──*/\n@media (max-width: 480px) {'

# 替换成更强的全屏适配
old_mobile = '''/* 手机浏览器直接全屏 */
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
}'''

new_mobile = '''/* 手机浏览器直接全屏 */
@media (max-width: 768px) {
  html, body {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background: var(--bg) !important;
    display: block !important;
  }
  body {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }
  .phone {
    width: 100vw !important;
    height: 100vh !important;
    max-width: 100% !important;
    max-height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    margin: 0 !important;
    overflow: hidden !important;
  }
  .status-bar { display: none !important; }
}'''

if old_mobile in c:
    c = c.replace(old_mobile, new_mobile, 1)
    print("✅ 手机全屏 CSS 修复")
else:
    # 直接在 </style> 前加
    c = c.replace('</style>', new_mobile + '\n</style>', 1)
    print("✅ 手机全屏 CSS 新增")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

import shutil
shutil.copy(path, path.replace('assets', 'dist'))
print("✅ 已更新 dist")
