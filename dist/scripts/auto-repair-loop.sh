#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAX_ROUNDS=10
REPORTS_DIR="$ROOT/reports"
mkdir -p "$REPORTS_DIR"

scan_project() {
  find "$ROOT" \( -path "$ROOT/.git" -prune \) -o -type f -print 2>/dev/null | LC_ALL=C sort
}

analyze_architecture() {
  local n
  n=$(find "$ROOT" \( -path "$ROOT/.git" -prune \) -o -type f -print 2>/dev/null | wc -l | tr -d ' ')
  echo "- 根目录: \`$ROOT\`"
  echo "- 文件总数（不含 .git 内对象）: $n"
  echo "- 扩展名分布（前 20）:"
  find "$ROOT" \( -path "$ROOT/.git" -prune \) -o -type f -print 2>/dev/null | sed -n 's/.*\.//p' | sort | uniq -c | sort -rn | head -20 | sed 's/^/- /'
  echo "- 目录树（目录项，截断）:"
  find "$ROOT" \( -path "$ROOT/.git" -prune \) -o -type d -print 2>/dev/null | LC_ALL=C sort | head -60 | sed 's/^/- /'
}

check_logic_step() {
  local f err=0
  while IFS= read -r f; do
    [[ -n "$f" && -f "$f" ]] || continue
    if ! node --check "$f" 2>"$REPORTS_DIR/.arl_err"; then
      echo "- \`$f\`"
      sed 's/^/  /' "$REPORTS_DIR/.arl_err"
      err=1
    fi
  done < <(find "$ROOT" \( -path "$ROOT/.git" -prune \) -o -name '*.js' -type f -print 2>/dev/null | LC_ALL=C sort)
  rm -f "$REPORTS_DIR/.arl_err"
  return "$err"
}

run_tests_capture() {
  local logf="$1"
  if node "$ROOT/scripts/auto-repair-test.mjs" >"$logf" 2>&1; then
    return 0
  fi
  return 1
}

apply_unified_patch_if_any() {
  local patch_file="$1"
  [[ -f "$patch_file" ]] || return 1
  [[ -s "$patch_file" ]] || return 1
  head -n 1 "$patch_file" | grep -q '^--- ' || return 1
  if patch -p0 --dry-run -f -s <"$patch_file" >/dev/null 2>&1; then
    (cd "$ROOT" && patch -p0 -f <"$patch_file")
    return 0
  fi
  return 1
}

round=1
while [[ "$round" -le "$MAX_ROUNDS" ]]; do
  REPORT="$REPORTS_DIR/round_${round}.md"
  PATCH_FILE="$REPORTS_DIR/round_${round}.patch"
  TEST_LOG="$REPORTS_DIR/.arl_test_${round}.log"
  AFTER_LOG="$REPORTS_DIR/.arl_test_after_${round}.log"
  rm -f "$PATCH_FILE"

  SCAN_OUT=$(scan_project | head -500)
  ARCH_OUT=$(analyze_architecture)

  LOG_BUF=$(mktemp)
  set +e
  check_logic_step >"$LOG_BUF" 2>&1
  LOGIC_RC=$?
  set -e
  LOGIC_ISSUES=$(cat "$LOG_BUF")
  rm -f "$LOG_BUF"

  if [[ "$LOGIC_RC" -eq 0 ]]; then
    LOGIC_BLOCK="（本轮未发现 JS 语法检查错误）"
  else
    LOGIC_BLOCK=$'```\n'"${LOGIC_ISSUES:-}"$'\n```'
  fi

  TEST_PASS=0
  if run_tests_capture "$TEST_LOG"; then
    TEST_PASS=1
  fi

  BUG_LIST=""
  if [[ "$TEST_PASS" -ne 1 ]]; then
    BUG_LIST=$(cat "$TEST_LOG" || true)
  fi

  FIX_BODY="本轮未生成可自动应用的 unified diff（无内置自动修复规则）。"
  PATCH_APPLIED="否"
  MODIFIED_FILES="（无）"
  REMAINING=""

  if [[ "$TEST_PASS" -eq 1 ]]; then
    REMAINING="无。测试已通过。"
    printf '%s\n' "# Placeholder: no unified diff generated (tests already passed)." >"$PATCH_FILE"
  else
    REMAINING="测试未通过。详见上文「发现的问题」与测试日志。"
    printf '%s\n' "# Placeholder: no unified diff generated (automatic repair not implemented)." >"$PATCH_FILE"
  fi

  if apply_unified_patch_if_any "$PATCH_FILE"; then
    PATCH_APPLIED="是"
  else
    PATCH_APPLIED="否（无有效 unified diff 或 dry-run 未通过）"
  fi

  AFTER_PASS=0
  if run_tests_capture "$AFTER_LOG"; then
    AFTER_PASS=1
  fi

  {
    echo "# Auto Repair Loop — Round $round"
    echo ""
    echo "## 发现的问题"
    echo ""
    echo "### 1. 项目结构扫描（摘要）"
    echo ""
    echo '```'
    echo "$SCAN_OUT"
    echo '```'
    echo ""
    echo "### 2. 架构分析"
    echo ""
    echo "$ARCH_OUT"
    echo ""
    echo "### 3. 逻辑 / 语法检查（node --check）"
    echo ""
    echo "$LOGIC_BLOCK"
    echo ""
    echo "### 4. 测试运行（初次）"
    echo ""
    if [[ "$TEST_PASS" -eq 1 ]]; then
      echo "通过。"
    else
      echo "未通过。"
      echo ""
      echo '```'
      cat "$TEST_LOG" 2>/dev/null || true
      echo '```'
    fi
    echo ""
    echo "### 5. Bug 列表（来自测试输出）"
    echo ""
    if [[ -z "${BUG_LIST:-}" ]]; then
      echo "无。"
    else
      echo '```'
      echo "$BUG_LIST"
      echo '```'
    fi
    echo ""
    echo "## 修复内容"
    echo ""
    echo "$FIX_BODY"
    echo ""
    echo "## 修改文件"
    echo ""
    echo "$MODIFIED_FILES"
    echo ""
    echo "- 补丁文件: \`reports/round_${round}.patch\`（占位说明，非有效 unified diff 时不会应用变更）"
    echo "- 补丁应用: $PATCH_APPLIED"
    echo ""
    echo "## 再次运行测试（应用补丁后）"
    echo ""
    if [[ "$AFTER_PASS" -eq 1 ]]; then
      echo "通过。"
    else
      echo "未通过。"
      echo ""
      echo '```'
      cat "$AFTER_LOG" 2>/dev/null || true
      echo '```'
    fi
    echo ""
    echo "## 剩余问题"
    echo ""
    if [[ "$AFTER_PASS" -eq 1 ]]; then
      echo "无。"
    else
      echo "$REMAINING"
    fi
  } >"$REPORT"

  rm -f "$TEST_LOG" "$AFTER_LOG"

  if [[ "$AFTER_PASS" -eq 1 ]]; then
    exit 0
  fi

  round=$((round + 1))
done

exit 1
