/**
 * Scout Rules for WorldWallet Security Module
 * 扫描 dist/core/security.js 找出安全问题
 */

const fs = require('fs');
const path = require('path');

class SecurityScout {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.securityFile = path.join(projectRoot, 'dist/core/security.js');
  }

  /**
   * 扫描 security.js 文件
   */
  scan() {
    const issues = [];

    try {
      if (!fs.existsSync(this.securityFile)) {
        return { bugs_found: [], error: 'File not found' };
      }

      const content = fs.readFileSync(this.securityFile, 'utf-8');

      // Rule 1: 检查是否有直接使用 === 比较密钥/hash（timing attack 风险）
      const directComparisonMatch = content.match(/([a-zA-Z_]\w*)\s*===\s*([a-zA-Z_]\w*)/g);
      if (directComparisonMatch) {
        const linesWithComparison = content.split('\n').map((line, idx) => ({
          line: idx + 1,
          content: line
        })).filter(item => item.content.includes('==='));

        // 检查是否在敏感操作中（hash, password, key）
        linesWithComparison.forEach(item => {
          if (item.content.includes('hash') || item.content.includes('password') || item.content.includes('key')) {
            issues.push({
              id: 'SECURITY-001',
              severity: 'high',
              file: 'dist/core/security.js',
              line: item.line,
              description: 'Direct comparison (===) used for sensitive data - vulnerable to timing attack',
              code_snippet: item.content.trim(),
              test_failure: 'Timing attack vulnerability - use constant-time comparison',
              fix_suggestion: 'Use constantTimeEqual() or crypto.timingSafeEqual() for hash/password comparison'
            });
          }
        });
      }

      // Rule 2: 检查 atob() 是否没有错误处理
      const atobMatches = content.match(/atob\s*\(/g);
      if (atobMatches) {
        const linesWithAtob = content.split('\n').map((line, idx) => ({
          line: idx + 1,
          content: line
        })).filter(item => item.content.includes('atob('));

        linesWithAtob.forEach(item => {
          // 简单检查：如果 atob 调用没有被 try-catch 包围
          const beforeLines = content.split('\n').slice(Math.max(0, item.line - 5), item.line).join('\n');
          if (!beforeLines.includes('try')) {
            issues.push({
              id: 'SECURITY-002',
              severity: 'high',
              file: 'dist/core/security.js',
              line: item.line,
              description: 'atob() call without try-catch - can throw on invalid base64',
              code_snippet: item.content.trim(),
              test_failure: 'Missing error handling for atob()',
              fix_suggestion: 'Wrap atob() in try-catch block to handle invalid base64 input'
            });
          }
        });
      }

      // Rule 3: 检查硬编码的 salt（所有用户共享，不安全）
      const hardcodedSaltMatch = content.match(/salt['\s:]*=['\s]*['"]([a-zA-Z0-9_-]+)['"]/g);
      if (hardcodedSaltMatch) {
        const linesWithSalt = content.split('\n').map((line, idx) => ({
          line: idx + 1,
          content: line
        })).filter(item => /salt\s*=\s*['"]/.test(item.content));

        linesWithSalt.forEach(item => {
          issues.push({
            id: 'SECURITY-003',
            severity: 'medium',
            file: 'dist/core/security.js',
            line: item.line,
            description: 'Hardcoded salt value - all users share same salt, vulnerable to precomputed hash tables',
            code_snippet: item.content.trim(),
            test_failure: 'Security: hardcoded salt reduces security',
            fix_suggestion: 'Generate unique random salt per user, or use bcrypt/argon2 with automatic salt handling'
          });
        });
      }

      return {
        bugs_found: issues,
        test_status: issues.length > 0 ? `${issues.length} security issues found` : 'No issues',
        confidence: 'high'
      };

    } catch (e) {
      return {
        bugs_found: [],
        error: e.message
      };
    }
  }
}

module.exports = SecurityScout;
