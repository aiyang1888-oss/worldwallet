/**
 * Telegram Notifier
 * 实时推送 AI 自动化流程的执行进度
 */

const axios = require('axios');

class TelegramNotifier {
  constructor(botToken, chatId) {
    this.botToken = botToken;
    this.chatId = chatId;
    this.enabled = !!(botToken && chatId);
    
    if (this.enabled) {
      this.apiUrl = `https://api.telegram.org/bot${botToken}`;
    }
  }

  async send(message) {
    if (!this.enabled) {
      return { status: 'disabled', reason: 'No botToken or chatId configured' };
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML' // 使用 HTML 格式，避免转义问题
      }, {
        timeout: 5000
      });

      return { status: 'success', message_id: response.data.result.message_id };
    } catch (e) {
      console.error(`[TELEGRAM] Send failed: ${e.message}`);
      return { status: 'failed', error: e.message };
    }
  }

  /**
   * 通知：阶段开始
   */
  async notifyPhaseStart(phaseName, taskInfo = {}) {
    const phaseEmoji = {
      'scout': '🔍',
      'reviewer': '👀',
      'dev': '💻',
      'test': '🧪',
      'commit': '📝'
    };

    const emoji = phaseEmoji[phaseName] || '⏳';
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' });

    let message = `${emoji} <b>[开始]</b> ${phaseName.toUpperCase()} 阶段\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `时间: ${timestamp}`;

    if (taskInfo.task_id) {
      message += `\n任务: ${taskInfo.task_id}`;
    }

    return await this.send(message);
  }

  /**
   * 通知：阶段完成
   */
  async notifyPhaseComplete(phaseName, data = {}) {
    const phaseEmoji = {
      'scout': '🔍',
      'reviewer': '👀',
      'dev': '💻',
      'test': '🧪',
      'commit': '📝'
    };

    const emoji = phaseEmoji[phaseName] || '✅';
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' });
    const duration = data.duration ? `${data.duration}s` : '?';

    let message = `${emoji} <b>[完成]</b> ${phaseName.toUpperCase()} 阶段\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `用时: ${duration}`;

    // 阶段特定信息
    if (phaseName === 'scout' && data.bugs_found) {
      message += `\n发现 Bug: <b>${data.bugs_found.length}</b> 个`;
      if (data.bugs_found.length > 0) {
        const topBugs = data.bugs_found.slice(0, 3);
        topBugs.forEach(bug => {
          const level = bug.severity === 'high' ? '🔴' : '🟡';
          message += `\n${level} ${bug.description.substring(0, 40)}`;
        });
      }
    }

    if (phaseName === 'reviewer' && data.approved !== undefined) {
      message += `\n审核: ${data.approved ? '✅ <b>APPROVED</b>' : '❌ <b>REJECTED</b>'}`;
    }

    if (phaseName === 'dev' && data.files_changed) {
      message += `\n修改文件: <b>${data.files_changed.length}</b> 个`;
    }

    if (phaseName === 'test' && data.tests_total !== undefined) {
      const passed = data.tests_passed || 0;
      const total = data.tests_total || 0;
      const status = passed === total ? '✅' : '❌';
      message += `\n测试结果: ${status} <b>${passed}/${total}</b> 通过`;
    }

    if (phaseName === 'commit' && data.commit_hash) {
      message += `\nCommit: <code>${data.commit_hash.substring(0, 7)}</code>`;
    }

    return await this.send(message);
  }

  /**
   * 通知：阶段失败
   */
  async notifyPhaseError(phaseName, error, taskId = '') {
    const emoji = '❌';
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' });

    let message = `${emoji} <b>[失败]</b> ${phaseName.toUpperCase()} 阶段\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `错误: <code>${error.substring(0, 100)}</code>`;

    if (taskId) {
      message += `\n任务: ${taskId}`;
    }

    message += `\n时间: ${timestamp}`;

    return await this.send(message);
  }

  /**
   * 通知：最终总结
   */
  async notifyFinalSummary(summary) {
    const isSuccess = summary.overall_status === 'success';
    const emoji = isSuccess ? '🎉' : '⚠️';
    const statusText = isSuccess ? '✅ <b>SUCCESS</b>' : '❌ <b>FAILED</b>';

    let message = `${emoji} <b>[完成]</b> 整轮闭环\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `任务: <b>${summary.task_id}</b>\n`;
    message += `状态: ${statusText}\n`;
    message += `总用时: <b>${summary.total_duration}s</b>`;

    if (summary.files_changed !== undefined) {
      message += `\n修改: <b>${summary.files_changed}</b> 个文件`;
    }

    if (summary.tests_status) {
      message += `\n测试: ${summary.tests_status}`;
    }

    if (summary.commit_hash) {
      message += `\nCommit: <code>${summary.commit_hash.substring(0, 7)}</code>`;
    }

    if (summary.branch) {
      message += `\n分支: <b>${summary.branch}</b>`;
    }

    return await this.send(message);
  }

  /**
   * 通知：回滚成功
   */
  async notifyRollback(taskId, filePath, backupPath) {
    const message = `🔄 <b>[回滚]</b> 修改已撤销\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `任务: ${taskId}\n` +
      `文件: <code>${path.basename(filePath)}</code>\n` +
      `恢复自: <code>${path.basename(backupPath)}</code>`;

    return await this.send(message);
  }

  /**
   * 通知：系统错误
   */
  async notifySystemError(error, context = '') {
    const message = `💥 <b>[系统错误]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `错误: <code>${error.substring(0, 100)}</code>\n` +
      `${context ? `上下文: ${context}\n` : ''}` +
      `时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' })}`;

    return await this.send(message);
  }

  /**
   * 通知：安全评分
   * summary: { score, level, high, medium, low, trend, topIssue }
   */
  async sendSecurityScore(summary = {}) {
    try {
      const score    = summary.score    != null ? summary.score    : 'N/A';
      const level    = summary.level    != null ? summary.level    : 'N/A';
      const high     = summary.high     != null ? summary.high     : 0;
      const medium   = summary.medium   != null ? summary.medium   : 0;
      const low      = summary.low      != null ? summary.low      : 0;
      const trend    = summary.trend    || 'N/A';
      const topIssue = summary.topIssue || 'None';

      const levelEmoji = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' };
      const trendEmoji = { up: '📈', down: '📉', flat: '➡️' };
      const lEmoji = levelEmoji[level] || '⚪';
      const tEmoji = trendEmoji[trend] || '';
      const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Phnom_Penh' });

      let message = `🔐 <b>[安全评分]</b>\n`;
      message += `━━━━━━━━━━━━━━━━━━━\n`;
      message += `评分: <b>${score}</b>  等级: ${lEmoji} <b>${level}</b>\n`;
      message += `🔴 HIGH: <b>${high}</b>  🟡 MEDIUM: <b>${medium}</b>  🟢 LOW: <b>${low}</b>\n`;
      message += `趋势: ${tEmoji} ${trend}\n`;
      message += `Top Issue: <code>${String(topIssue).substring(0, 80)}</code>\n`;
      message += `时间: ${timestamp}`;

      return await this.send(message);
    } catch (e) {
      console.warn(`[TELEGRAM] sendSecurityScore warning: ${e.message}`);
      return { status: 'failed', error: e.message };
    }
  }
}

module.exports = TelegramNotifier;
