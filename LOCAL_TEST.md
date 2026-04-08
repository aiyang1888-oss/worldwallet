# 本地测试链接（与 `package.json` 中 `dev` 一致）

先在本机项目根目录启动静态服务（**目录为 `dist/`，端口 `8766`**）：

```bash
cd /path/to/WorldWallet
npm run dev
```

浏览器访问（**任选其一，钱包页内容相同**）：

| 说明 | URL |
|------|-----|
| 主入口（推荐） | http://127.0.0.1:8766/wallet.html |
| 根路径（`index.html` 与 wallet 同步） | http://127.0.0.1:8766/ |
| 同页别名 `app.html` | http://127.0.0.1:8766/app.html |
| 官网落地页 `official.html` | http://127.0.0.1:8766/official.html |

使用 `localhost` 亦可：`http://localhost:8766/wallet.html`（与上表等价）。

自动化 / 环境变量：可设置 `WALLET_TEST_URL` 覆盖默认的 `http://127.0.0.1:8766/wallet.html`（见 `test-p0-auto.js`）。
