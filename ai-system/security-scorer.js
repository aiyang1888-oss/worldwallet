/**
 * Security Scorer
 * 计算安全评分和趋势记录
 */

const fs = require('fs');
const path = require('path');

class SecurityScorer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.metricsDir = path.join(projectRoot, 'ai-system/metrics');
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
    this.trendFile = path.join(this.metricsDir, 'security-trend.json');
  }

  /**
   * 计算安全评分
   * Score = 100 - HIGH×20 - MEDIUM×10 - LOW×5
   */
  calculateScore(scoutResult) {
    const highCount = scoutResult.bugs_found.filter(b => b.severity === 'high').length;
    const mediumCount = scoutResult.bugs_found.filter(b => b.severity === 'medium').length;
    const lowCount = scoutResult.bugs_found.filter(b => b.severity === 'low').length;

    const score = Math.max(0, 100 - (highCount * 20 + mediumCount * 10 + lowCount * 5));

    return {
      score: Math.round(score),
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      totalIssues: scoutResult.bugs_found.length
    };
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return { grade: 'A', emoji: '🟢', description: 'Excellent' };
    if (score >= 80) return { grade: 'B', emoji: '🟡', description: 'Good' };
    if (score >= 70) return { grade: 'C', emoji: '🟠', description: 'Fair' };
    if (score >= 60) return { grade: 'D', emoji: '🔴', description: 'Poor' };
    return { grade: 'F', emoji: '⚫', description: 'Critical' };
  }

  /**
   * 记录趋势
   */
  recordTrend(scoreData) {
    let trends = [];

    // 读取现有记录
    if (fs.existsSync(this.trendFile)) {
      const content = fs.readFileSync(this.trendFile, 'utf-8');
      trends = JSON.parse(content);
    }

    // 添加新记录
    const record = {
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      score: scoreData.score,
      high: scoreData.high,
      medium: scoreData.medium,
      low: scoreData.low,
      totalIssues: scoreData.totalIssues
    };

    trends.push(record);

    // 保存（保留最近 90 天的数据）
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const filteredTrends = trends.filter(t => new Date(t.timestamp) >= ninetyDaysAgo);

    fs.writeFileSync(this.trendFile, JSON.stringify(filteredTrends, null, 2));

    return record;
  }

  /**
   * 获取趋势数据
   */
  getTrends(limit = 30) {
    if (!fs.existsSync(this.trendFile)) {
      return [];
    }

    const content = fs.readFileSync(this.trendFile, 'utf-8');
    const trends = JSON.parse(content);

    return trends.slice(-limit);
  }

  /**
   * 计算趋势变化
   */
  calculateTrendChange(trends) {
    if (trends.length < 2) {
      return {
        direction: 'stable',
        change: 0,
        trend: 'No trend data'
      };
    }

    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    const change = latest.score - previous.score;

    let direction = 'stable';
    if (change > 5) direction = 'improving';
    else if (change < -5) direction = 'declining';

    return {
      direction,
      change: change,
      emoji: direction === 'improving' ? '📈' : direction === 'declining' ? '📉' : '➡️',
      trend: direction === 'improving'
        ? `Improving (+${change})`
        : direction === 'declining'
          ? `Declining (${change})`
          : `Stable (±${Math.abs(change)})`,
      previousScore: previous.score,
      latestScore: latest.score
    };
  }

  /**
   * 获取最近七天的趋势
   */
  getLast7Days(trends) {
    const last7 = trends.slice(-7);
    if (last7.length === 0) {
      return [];
    }

    return last7.map(t => ({
      date: t.date,
      score: t.score,
      issues: t.totalIssues,
      high: t.high
    }));
  }

  /**
   * 打印评分摘要
   */
  printScoreSummary(scoreData, trendData) {
    const gradeInfo = this.getGrade(scoreData.score);

    console.log('\n📊 安全评分');
    console.log('================================\n');

    console.log(`${gradeInfo.emoji} 当前评分: ${scoreData.score}/100 (${gradeInfo.grade})`);
    console.log(`   ${gradeInfo.description}\n`);

    console.log('📌 风险统计:');
    console.log(`   🔴 HIGH: ${scoreData.high} 个`);
    console.log(`   🟡 MEDIUM: ${scoreData.medium} 个`);
    console.log(`   🟢 LOW: ${scoreData.low} 个\n`);

    if (trendData.direction !== 'stable') {
      console.log(`趋势: ${trendData.emoji} ${trendData.trend}`);
      console.log(`上次得分: ${trendData.previousScore} → 本次: ${trendData.latestScore}\n`);
    }
  }
}

module.exports = SecurityScorer;
