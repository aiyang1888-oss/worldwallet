# ✅ CURSOR FINAL TASK - dist/ Build Process

**Status**: 需要处理  
**Priority**: HIGH  
**Effort**: 5-10 分钟  

---

## 📋 问题描述

dist/ 目录中的文件和 wallet-shell/ 不同步。

**现象**: 
- P0 测试发现 dist/ 缺少以下文件:
  - dist/js/idb-cache.js ❌
  - dist/js/idb-kv.js ❌
  - dist/core/key-derivation-cache.js ❌
  - dist/core/session-key-cache.js ❌

**浏览器错误**:
```
Failed to load resource: 404 (File not found)
http://localhost:8888/dist/js/idb-cache.js
```

---

## ✅ 解决方案 (选一个)

### 方案 A: 添加构建脚本 (推荐)

**修改**: package.json

**找到** build 命令并添加文件同步:

```json
{
  "scripts": {
    "build": "your-existing-build && cp -r wallet-shell/js/* dist/js/ && cp -r wallet-shell/core/* dist/core/",
    "sync-dist": "cp -r wallet-shell/js/* dist/js/ && cp -r wallet-shell/core/* dist/core/"
  }
}
```

**检验**: `npm run build` 后检查 dist/ 有所有文件

---

### 方案 B: 创建独立同步脚本

**创建文件**: sync-dist.sh

```bash
#!/bin/bash
# Sync wallet-shell files to dist

echo "Syncing wallet-shell to dist..."
cp -r wallet-shell/js/* dist/js/
cp -r wallet-shell/core/* dist/core/
echo "✅ Sync complete"
```

**使用**:
```bash
chmod +x sync-dist.sh
./sync-dist.sh
```

**添加到 package.json**:
```json
{
  "scripts": {
    "sync-dist": "./sync-dist.sh"
  }
}
```

---

### 方案 C: .gitignore dist/ 并自动生成

**修改**: .gitignore

```
dist/
!dist/.gitkeep
```

**然后**: 总是在构建时从 wallet-shell/ 生成 dist/

---

## 🔍 验证清单

选择方案后，运行验证:

```bash
# 1. 执行构建或同步
npm run build  # 或 ./sync-dist.sh

# 2. 检查文件是否存在
ls -1 dist/js/idb-*.js
ls -1 dist/core/*-cache.js

# 3. 应该看到:
dist/js/idb-cache.js ✅
dist/js/idb-kv.js ✅
dist/core/key-derivation-cache.js ✅
dist/core/session-key-cache.js ✅
```

---

## 📝 完成任务后

1. 运行构建/同步脚本
2. 验证 dist/ 有所有文件
3. 可选: 提交到 GitHub

---

## 📊 测试结果

当前状态：
- ✅ 代码集成: 100% 完成
- ✅ 功能测试: 5/5 通过
- ⏳ 待修复: dist/ 同步流程

选择方案并执行，测试会立即继续。

---

**需要你告诉 Cursor 这个任务。**

