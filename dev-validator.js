/**
 * Dev Phase Validator
 * 改前改后校验，确保代码修改的安全性
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DevValidator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.backupDir = path.join(projectRoot, 'ai-tasks/backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 改前验证：文件检查 + 备份
   */
  validateBefore(filePath) {
    const checks = {
      file_exists: false,
      file_readable: false,
      backup_created: false,
      backup_path: null,
      errors: []
    };

    try {
      // 1. 文件存在性检查
      if (!fs.existsSync(filePath)) {
        checks.errors.push(`File not found: ${filePath}`);
        return checks;
      }
      checks.file_exists = true;

      // 2. 文件可读性检查
      const originalContent = fs.readFileSync(filePath, 'utf-8');
      checks.file_readable = true;

      // 3. 创建备份
      const timestamp = Date.now();
      const fileName = path.basename(filePath);
      const backupFileName = `${fileName}.${timestamp}.bak`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      fs.writeFileSync(backupPath, originalContent, 'utf-8');
      checks.backup_created = true;
      checks.backup_path = backupPath;

    } catch (e) {
      checks.errors.push(`Pre-validation failed: ${e.message}`);
    }

    return checks;
  }

  /**
   * 改后验证：语法检查 + 读回检查
   */
  validateAfter(filePath) {
    const checks = {
      file_exists: false,
      file_readable: false,
      syntax_valid: false,
      read_back_ok: false,
      errors: []
    };

    try {
      // 1. 文件存在性和可读性
      if (!fs.existsSync(filePath)) {
        checks.errors.push(`File not found after change: ${filePath}`);
        return checks;
      }
      checks.file_exists = true;

      const modifiedContent = fs.readFileSync(filePath, 'utf-8');
      checks.file_readable = true;

      // 2. JavaScript 语法检查（使用 Node 的 --check）
      try {
        execSync(`node --check ${filePath}`, { stdio: 'pipe' });
        checks.syntax_valid = true;
      } catch (e) {
        checks.errors.push(`Syntax error: ${e.message}`);
        return checks;
      }

      // 3. 读回验证（确保写入的内容与预期一致）
      const readBackContent = fs.readFileSync(filePath, 'utf-8');
      if (readBackContent === modifiedContent) {
        checks.read_back_ok = true;
      } else {
        checks.errors.push('Read-back verification failed: content mismatch');
      }

    } catch (e) {
      checks.errors.push(`Post-validation failed: ${e.message}`);
    }

    return checks;
  }

  /**
   * 生成 diff（改动对比）
   */
  generateDiff(originalContent, modifiedContent) {
    const originalLines = originalContent.split('\n');
    const modifiedLines = modifiedContent.split('\n');
    
    const changes = {
      added: [],
      removed: [],
      total_lines_before: originalLines.length,
      total_lines_after: modifiedLines.length
    };

    // 简单的逐行对比（不是完整的 diff 算法）
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const modLine = modifiedLines[i] || '';
      
      if (origLine !== modLine) {
        if (i < originalLines.length) {
          changes.removed.push({
            line: i + 1,
            content: origLine
          });
        }
        if (i < modifiedLines.length) {
          changes.added.push({
            line: i + 1,
            content: modLine
          });
        }
      }
    }

    return changes;
  }
}

module.exports = DevValidator;
