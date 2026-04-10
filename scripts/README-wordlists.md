# WorldToken 中文助记词词表（`WT_WORDLISTS.zh`）

## 规则（与产品一致）

- **对齐 BIP39**：`zh[i]` 与标准英文 `en[i]` 共用同一索引 `i ∈ [0,2047]`；熵与校验仍完全遵循 BIP39，仅「展示用词」为中文地名。
- **词条形态**：每条 **2～3 个 Unicode 汉字**（便于抄写与格子输入，避免四字以上长地名）。
- **顺序**：自 **国家统计局区划树**（`pcas-code.json`）按 **行政层级** 广度优先收录——省级简称 → 地级简称 → 县级（过滤园区/街道等）→ 镇/乡专名等补足至 2048 条。实现见 `generate-zh-cn-wordlist.cjs`。

## 数据依赖

- `scripts/pcas-code.json`：来自 [modood/Administrative-divisions-of-China](https://github.com/modood/Administrative-divisions-of-China) 的 `dist/pcas-code.json`。更新示例：

```bash
curl -fsSL -o scripts/pcas-code.json \
  https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/pcas-code.json
```

或使用本仓库脚本：`bash scripts/fetch-pcas-code.sh`

## 一键再生（推荐）

在仓库根目录执行（**需要网络**：`ww-build-wordlists.mjs` 会从 bitcoinjs/bip39 拉取英文词表并写入其它语种 JSON）：

```bash
npm run wordlist:zh
```

等价步骤：

1. `node scripts/generate-zh-cn-wordlist.cjs` → `dist/wordlists/zh-cn.json`
2. `node scripts/verify-zh-wordlist.mjs`
3. `node scripts/ww-build-wordlists.mjs` → `dist/wordlists.js` + `dist/wordlists/*.json`

仅重建内嵌 `wordlists.js`（**不**重算中文地名）且已有 `dist/wordlists/zh-cn.json` 时：

```bash
npm run wordlists:build
```

## 校验

```bash
npm run wordlist:verify
```

## 与运行时关系

- 浏览器加载 **`dist/wordlists.js`**（内嵌 `en` + `zh`）；其它语言自 `dist/wordlists/<lang>.json` 懒加载。
- `wallet.ui.js` 中的 `wwNormalizeZhWordlistForDisplay` 用于兼容历史长词条展示；**经本流水线生成的 `zh-cn.json` 已满足 2～3 字**，归一化对新区表通常为恒等。

## 旧脚本说明

- `inject-zh-wordlist.cjs`：在旧版「巨型单文件 `wordlists.js`」时代用于就地替换 `zh:` 数组；当前请以 `ww-build-wordlists.mjs` 为准。
