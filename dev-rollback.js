/**
 * Dev Phase Rollback Handler
 * 处理修改失败时的回滚和错误日志
 */

const fs = require('fs');
const path = require('path');

class DevRollback {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.failedPatchDir = path.join(projectRoot, 'ai-tasks/failed-patches');
    if (!fs.existsSync(this.failedPatchDir)) {
      fs.mkdirSync(this.failedPatchDir, { recursive: true });
    }
  }

  /**
   * 从备份文件恢复
   */
  rollbackFromBackup(filePath, backupPath) {
    try {
      if (!fs.existsSync(backupPath)) {
        return {
          status: 'failed',
          error: `Backup file not found: ${backupPath}`
        };
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      fs.writeFileSync(filePath, backupContent, 'utf-8');

      return {
        status: 'success',
        restored_file: filePath,
        restored_from: backupPath,
        restored_at: new Date().toISOString()
      };
    } catch (e) {
      return {
        status: 'failed',
        error: `Rollback failed: ${e.message}`
      };
    }
  }

  /**
   * 保存失败的修改记录（用于诊断）
   */
  saveFailedPatch(taskId, filePath, originalContent, attemptedContent, error, diff) {
    try {
      const timestamp = new Date().toISOString();
      const fileName = path.basename(filePath);
      const patchFileName = `${taskId}-${fileName}-${Date.now()}.json`;
      const patchPath = path.join(this.failedPatchDir, patchFileName);

      const patchData = {
        task_id: taskId,
        timestamp: timestamp,
        file_path: filePath,
        error: {
          message: error.message,
          type: error.constructor.name
        },
        stats: {
          original_lines: originalContent.split('\n').length,
          attempted_lines: attemptedContent.split('\n').length
        },
        diff: diff,
        original_content_preview: originalContent.substring(0, 500),
        attempted_content_preview: attemptedContent.substring(0, 500)
      };

      fs.writeFileSync(patchPath, JSON.stringify(patchData, null, 2), 'utf-8');

      return {
        status: 'saved',
        patch_file: patchPath
      };
    } catch (e) {
      console.error(`Failed to save patch: ${e.message}`);
      return {
        status: 'failed',
        error: e.message
      };
    }
  }

  /**
   * 生成详细的错误日志
   */
  generateErrorLog(taskId, filePath, error, preCheck, postCheck, rollbackResult) {
    const errorLog = {
      task_id: taskId,
      timestamp: new Date().toISOString(),
      phase: 'dev',
      status: 'failed',
      
      target_file: filePath,
      
      pre_check: preCheck,
      post_check: postCheck,
      
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack.split('\n').slice(0, 5) // 只保留前 5 行
      },

      rollback_result: rollbackResult,

      recovery_status: rollbackResult?.status === 'success' ? '✅ Recovered' : '❌ Recovery failed',

      recommendations: this.generateRecommendations(error, preCheck, postCheck)
    };

    return errorLog;
  }

  /**
   * 根据错误类型生成修复建议
   */
  generateRecommendations(error, preCheck, postCheck) {
    const recommendations = [];

    if (!preCheck?.file_exists) {
      recommendations.push('Check if target file path is correct');
    }

    if (!preCheck?.backup_created) {
      recommendations.push('Ensure backup directory has write permissions');
    }

    if (postCheck?.errors?.length > 0) {
      postCheck.errors.forEach(err => {
        if (err.includes('Syntax error')) {
          recommendations.push('Check the generated code for syntax errors');
        }
      });
    }

    if (error.message.includes('Syntax error')) {
      recommendations.push('Review the Dev AI output format');
    }

    if (recommendations.length === 0) {
      recommendations.push('Check Dev AI logs for modification details');
      recommendations.push('Manually review the failed patch file');
    }

    return recommendations;
  }

  /**
   * 保存完整的错误日志到文件
   */
  saveErrorLog(errorLog, taskId) {
    try {
      const logPath = path.join(
        this.projectRoot,
        'ai-tasks',
        `error-log-${taskId}-${Date.now()}.json`
      );

      fs.writeFileSync(logPath, JSON.stringify(errorLog, null, 2), 'utf-8');
      return logPath;
    } catch (e) {
      console.error(`Failed to save error log: ${e.message}`);
      return null;
    }
  }

  /**
   * 清理旧备份（保留最近的 20 个）
   */
  cleanupOldBackups(maxKeep = 20) {
    try {
      const backupDir = path.join(this.projectRoot, 'ai-tasks/backups');
      if (!fs.existsSync(backupDir)) return;

      const files = fs.readdirSync(backupDir)
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length > maxKeep) {
        for (let i = maxKeep; i < files.length; i++) {
          try {
            fs.unlinkSync(files[i].path);
          } catch (e) {
            // 忽略删除失败
          }
        }
      }
    } catch (e) {
      console.error(`Cleanup failed: ${e.message}`);
    }
  }
}

module.exports = DevRollback;
