wallet-shell/
  index.html        界面 HTML/CSS（与 dist 一致）
  wallet.runtime.js 从 dist/wallet.runtime.js 复制，含 goTo、createRealWallet 等完整逻辑
  app.js            可选补丁入口（默认不在页面中引用）

本地预览（在 wallet-shell 目录）：
  python3 -m http.server 4173
  浏览器打开 http://127.0.0.1:4173/

「设置钱包」：欢迎页点「创建新钱包」，或需在代码里 goTo('page-create')。

更新 runtime：从仓库根目录执行
  cp dist/wallet.runtime.js wallet-shell/wallet.runtime.js
