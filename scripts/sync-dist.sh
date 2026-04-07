#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHELL_DIR="$ROOT_DIR/wallet-shell"
DIST_DIR="$ROOT_DIR/dist"

echo "🔄 同步 wallet-shell → dist/"

# 复制核心文件
mkdir -p "$DIST_DIR/js" "$DIST_DIR/core"
cp "$SHELL_DIR/js/api-config.js" "$DIST_DIR/js/" 2>/dev/null || true
cp "$SHELL_DIR/core/"*.js "$DIST_DIR/core/" 2>/dev/null || true
cp "$SHELL_DIR/index.html" "$DIST_DIR/wallet.html"
cp "$SHELL_DIR/wallet.css" "$DIST_DIR/"
cp "$SHELL_DIR/wallet.core.js" "$DIST_DIR/"
cp "$SHELL_DIR/wallet.ui.js" "$DIST_DIR/"
cp "$SHELL_DIR/wallet.addr.js" "$DIST_DIR/"
cp "$SHELL_DIR/wallet.tx.js" "$DIST_DIR/"
cp "$SHELL_DIR/wallet.runtime.js" "$DIST_DIR/"
cp "$SHELL_DIR/wordlists.js" "$DIST_DIR/"

# 创建 wordlists 目录并复制词库
mkdir -p "$DIST_DIR/wordlists"
if [ -d "$SHELL_DIR/wordlists" ]; then
  cp -r "$SHELL_DIR/wordlists"/* "$DIST_DIR/wordlists/"
  echo "✅ 词库已同步"
fi

# 复制其他必要文件
cp "$SHELL_DIR/manifest.json" "$DIST_DIR/" 2>/dev/null || true
cp "$SHELL_DIR/sw.js" "$DIST_DIR/" 2>/dev/null || true

echo "✅ 同步完成"
ls -lh "$DIST_DIR/wallet.html"
