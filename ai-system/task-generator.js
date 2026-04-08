/**
 * Task Generator
 * 基于扫描和审核结果，生成结构化修复任务列表
 * 仅生成任务，不修改代码
 */

const fs = require('fs');
const path = require('path');

class TaskGenerator {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.tasksDir = path.join(projectRoot, 'ai-system/tasks');
    if (!fs.existsSync(this.tasksDir)) {
      fs.mkdirSync(this.tasksDir, { recursive: true });
    }
  }

  /**
   * 从 Scout 和 Reviewer 结果生成修复任务
   */
  generateTasks(scoutResult, reviewerResult) {
    const tasks = [];
    let taskId = 1;

    // 遍历所有发现的问题
    if (!scoutResult.bugs_found || scoutResult.bugs_found.length === 0) {
      return {
        generated_at: new Date().toISOString(),
        total_tasks: 0,
        tasks: []
      };
    }

    scoutResult.bugs_found.forEach(bug => {
      const task = {
        task_id: `TASK-${String(taskId).padStart(3, '0')}`,
        bug_id: bug.id,
        severity: bug.severity,
        status: 'new',
        created_at: new Date().toISOString(),
        
        // 问题信息
        issue: {
          description: bug.description,
          file: bug.file,
          line: bug.line,
          code_snippet: bug.code_snippet
        },

        // 修复信息
        fix: {
          suggestion: bug.fix_suggestion,
          test_failure: bug.test_failure,
          effort: this.estimateEffort(bug.severity)
        },

        // 任务管理
        assignment: {
          assigned_to: null, // 需要手动分配
          due_date: this.calculateDueDate(bug.severity),
          priority: this.mapSeverityToPriority(bug.severity)
        },

        // 状态追踪
        tracking: {
          issue_url: null, // GitHub Issue URL
          pr_url: null,    // Pull Request URL
          merged: false,
          verified: false
        }
      };

      tasks.push(task);
      taskId++;
    });

    return {
      generated_at: new Date().toISOString(),
      project: 'WorldWallet',
      total_tasks: tasks.length,
      breakdown: {
        high: tasks.filter(t => t.severity === 'high').length,
        medium: tasks.filter(t => t.severity === 'medium').length,
        low: tasks.filter(t => t.severity === 'low').length
      },
      tasks: tasks
    };
  }

  /**
   * 估计修复工作量
   */
  estimateEffort(severity) {
    const effortMap = {
      'high': {
        hours: 1,
        level: 'Low'
      },
      'medium': {
        hours: 2,
        level: 'Medium'
      },
      'low': {
        hours: 3,
        level: 'Medium'
      }
    };

    return effortMap[severity] || { hours: 1, level: 'Low' };
  }

  /**
   * 计算截止日期
   */
  calculateDueDate(severity) {
    const now = new Date();
    const dueDate = new Date(now);

    switch (severity) {
      case 'high':
        dueDate.setDate(dueDate.getDate() + 3); // 3 天
        break;
      case 'medium':
        dueDate.setDate(dueDate.getDate() + 7); // 1 周
        break;
      case 'low':
        dueDate.setDate(dueDate.getDate() + 14); // 2 周
        break;
    }

    return dueDate.toISOString().split('T')[0];
  }

  /**
   * 映射严重程度到优先级
   */
  mapSeverityToPriority(severity) {
    const priorityMap = {
      'high': 'P0',
      'medium': 'P1',
      'low': 'P2'
    };
    return priorityMap[severity] || 'P2';
  }

  /**
   * 保存任务列表
   */
  saveTasks(taskData) {
    const taskFile = path.join(this.tasksDir, 'fix-tasks.json');
    fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
    return taskFile;
  }

  /**
   * 生成任务 Markdown 报告
   */
  generateMarkdownTasks(taskData) {
    let markdown = `# 🔧 修复任务清单\n\n`;
    markdown += `**生成时间**: ${new Date().toISOString()}\n`;
    markdown += `**项目**: ${taskData.project}\n`;
    markdown += `**总任务数**: ${taskData.total_tasks}\n\n`;

    // 统计
    markdown += `## 📊 任务统计\n\n`;
    markdown += `| 优先级 | 数量 | 截止日期 |\n`;
    markdown += `|--------|------|----------|\n`;
    markdown += `| 🔴 HIGH (P0) | ${taskData.breakdown.high} | 3 天内 |\n`;
    markdown += `| 🟡 MEDIUM (P1) | ${taskData.breakdown.medium} | 1 周内 |\n`;
    markdown += `| 🟢 LOW (P2) | ${taskData.breakdown.low} | 2 周内 |\n\n`;

    // 按优先级分组
    const byPriority = {
      'P0': [],
      'P1': [],
      'P2': []
    };

    taskData.tasks.forEach(task => {
      byPriority[task.assignment.priority].push(task);
    });

    // P0 任务
    if (byPriority['P0'].length > 0) {
      markdown += `## 🔴 P0 - 立即处理 (HIGH)\n\n`;
      byPriority['P0'].forEach((task, idx) => {
        markdown += this.generateTaskMarkdown(task, idx + 1);
      });
    }

    // P1 任务
    if (byPriority['P1'].length > 0) {
      markdown += `## 🟡 P1 - 本周处理 (MEDIUM)\n\n`;
      byPriority['P1'].forEach((task, idx) => {
        markdown += this.generateTaskMarkdown(task, idx + 1);
      });
    }

    // P2 任务
    if (byPriority['P2'].length > 0) {
      markdown += `## 🟢 P2 - 后续处理 (LOW)\n\n`;
      byPriority['P2'].forEach((task, idx) => {
        markdown += this.generateTaskMarkdown(task, idx + 1);
      });
    }

    markdown += `---\n\n`;
    markdown += `## 📝 任务模板\n\n`;
    markdown += `### 创建 GitHub Issue 时使用:\n\n`;
    markdown += `\`\`\`markdown\n`;
    markdown += `**标题**: [Security-${taskData.tasks[0]?.bug_id || 'XXXX'}] ${taskData.tasks[0]?.issue.description || 'Fix security issue'}\n\n`;
    markdown += `**优先级**: ${taskData.tasks[0]?.assignment.priority || 'P1'}\n\n`;
    markdown += `**问题**:\\n\n`;
    markdown += `文件: \`${taskData.tasks[0]?.issue.file || 'path/to/file'}\`\n\n`;
    markdown += `行号: ${taskData.tasks[0]?.issue.line || 'XX'}\n\n`;
    markdown += `**代码**:\\n\n\\\`\\\`\\\`javascript\n${taskData.tasks[0]?.issue.code_snippet || 'code'}\n\\\`\\\`\\\`\n\n`;
    markdown += `**修复建议**:\\n\\n${taskData.tasks[0]?.fix.suggestion || 'Suggestion'}\n\n`;
    markdown += `**工作量**: ${taskData.tasks[0]?.fix.effort.hours || 1} 小时\n\n`;
    markdown += `**截止日期**: ${taskData.tasks[0]?.assignment.due_date || 'YYYY-MM-DD'}\n\`\`\`\n\n`;

    return markdown;
  }

  /**
   * 生成单个任务的 Markdown
   */
  generateTaskMarkdown(task, index) {
    let md = `### ${index}. ${task.task_id} - ${task.issue.description}\n\n`;
    md += `**状态**: ${task.status}\n`;
    md += `**优先级**: ${task.assignment.priority}\n`;
    md += `**截止日期**: ${task.assignment.due_date}\n`;
    md += `**工作量**: ${task.fix.effort.hours}h (${task.fix.effort.level})\n\n`;

    md += `**文件**: \`${task.issue.file}\`\n`;
    md += `**行号**: ${task.issue.line}\n\n`;

    md += `**问题**:\n\n${task.issue.description}\n\n`;

    md += `**代码**:\n\n\`\`\`javascript\n${task.issue.code_snippet}\n\`\`\`\n\n`;

    md += `**修复建议**:\n\n${task.fix.suggestion}\n\n`;

    md += `**分配给**: ${task.assignment.assigned_to || '待分配'}\n`;
    md += `**Issue**: ${task.tracking.issue_url || '待创建'}\n`;
    md += `**PR**: ${task.tracking.pr_url || '待创建'}\n\n`;

    md += `---\n\n`;

    return md;
  }

  /**
   * 打印任务摘要
   */
  printTaskSummary(taskData) {
    console.log('\n📋 修复任务生成完成');
    console.log('================================\n');

    console.log(`✅ 生成任务数: ${taskData.total_tasks} 个\n`);

    console.log('📊 优先级分布:');
    console.log(`   🔴 P0 (HIGH): ${taskData.breakdown.high} 个 - 3 天内`);
    console.log(`   🟡 P1 (MEDIUM): ${taskData.breakdown.medium} 个 - 1 周内`);
    console.log(`   🟢 P2 (LOW): ${taskData.breakdown.low} 个 - 2 周内\n`);

    console.log('📁 输出文件:');
    console.log(`   JSON: ai-system/tasks/fix-tasks.json`);
    console.log(`   Markdown: ai-system/tasks/fix-tasks.md\n`);
  }
}

module.exports = TaskGenerator;
