#!/usr/bin/env bash
# 下载国家统计局风格区划树 JSON，供 generate-zh-cn-wordlist.cjs 使用。
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT_DIR/scripts/pcas-code.json"
URL="https://raw.githubusercontent.com/modood/Administrative-divisions-of-China/master/dist/pcas-code.json"
echo "Fetching $URL → $OUT"
curl -fsSL -o "$OUT" "$URL"
node -e "JSON.parse(require('fs').readFileSync('$OUT','utf8')); console.log('[fetch-pcas-code] OK JSON');"
