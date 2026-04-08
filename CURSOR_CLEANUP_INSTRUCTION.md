# 📋 Cursor 清理指令 - 方案 A 执行清单

**Date**: 2026-04-08 11:22 UTC+7  
**目标**: 删除 wallet-shell 结构，只保留 dist 作为唯一源  
**预计时间**: 10-15 分钟  

---

## 🎯 最终目标结构

```
WorldWallet/
├── dist/
│   ├── wallet.html ✅
│   ├── assets/
│   ├── core/
│   ├── js/
│   └── ...
├── scripts/
├── src/
├── package.json
├── README.md
└── (其他配置文件)
```

---

## ✅ Cursor 需要执行的步骤

### Step 1: 删除 wallet-shell 目录

```bash
# 删除 wallet-shell 目录（如果存在）
rm -rf wallet-shell/
```

**说明**: wallet-shell 是旧的源代码目录结构，现在只用 dist

---

### Step 2: 删除 sync-dist.sh 脚本

```bash
# 删除不再需要的同步脚本
rm -f scripts/sync-dist.sh
```

**说明**: 不再需要从 wallet-shell 同步到 dist，因为 dist 是唯一源

---

### Step 3: 更新 .gitignore

在 `.gitignore` 中删除或注释掉以下行（如果存在）:

```
# 删除或注释掉这些行:
wallet-shell/
/wallet-shell/*
!wallet-shell/.gitkeep
```

**说明**: wallet-shell 不再是项目的一部分

---

### Step 4: 清理 package.json 中的脚本

在 `package.json` 中，删除或注释掉与 wallet-shell 相关的脚本：

```json
// 删除这些脚本（如果存在）:
"sync-dist": "bash scripts/sync-dist.sh",
```

**说明**: 不再需要同步脚本

---

### Step 5: 删除相关配置文件

```bash
# 删除与 wallet-shell 同步相关的其他文件/配置
# 检查是否有以下文件，如有则删除:
rm -f .sync-dist.log
rm -f .serve-dist.log (这个可以保留，无关)
```

---

### Step 6: 更新 README.md

在项目 README.md 中更新说明：

```markdown
# 项目结构

- `dist/` - Web 应用文件（唯一源）
  - `wallet.html` - 主应用文件
  - `assets/` - 静态资源
  - `core/` - 核心代码
  - `js/` - JavaScript 模块

不再使用 wallet-shell，dist 是唯一的源目录。
```

---

### Step 7: Git 提交

```bash
git add .
git commit -m "Refactor: Simplify project structure - Remove wallet-shell, use dist as sole source

- 删除 wallet-shell 源目录
- 删除 sync-dist.sh 同步脚本
- 更新 .gitignore，移除 wallet-shell 相关规则
- 清理 package.json 中的同步脚本
- dist/ 现在是项目的唯一源目录
- 简化项目结构，便于维护"
```

---

## 📋 验证清单

完成后，检查以下项目确保一切正确：

```bash
# 1. 验证 wallet-shell 已删除
ls -la | grep wallet-shell  # 不应该有任何输出

# 2. 验证 sync-dist.sh 已删除
ls scripts/ | grep sync-dist  # 不应该有任何输出

# 3. 验证 dist 目录完整
ls -la dist/wallet.html  # 应该存在

# 4. 验证应用还能加载
# 访问: http://127.0.0.1:9999/dist/wallet.html
# 应该看到 WorldToken 欢迎页面
```

---

## 🎯 完成标志

✅ wallet-shell 目录已删除  
✅ sync-dist.sh 脚本已删除  
✅ .gitignore 已更新  
✅ package.json 已清理  
✅ Git 提交已完成  
✅ 应用仍可正常加载  

---

## 📝 执行此清单后

项目将简化为：
- dist 是唯一的源目录
- 无需再维护 wallet-shell
- 无需再同步文件
- 项目结构清晰简洁

如有问题，直接告诉我。

