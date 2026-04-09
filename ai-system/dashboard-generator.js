'use strict';

const fs   = require('fs');
const path = require('path');

// Project root = parent of ai-system/ so dashboard path is stable when cwd differs
const OUTPUT_FILE = path.join(__dirname, '..', 'SECURITY_DASHBOARD.md');

/**
 * generateSecurityDashboard(latest, trend, issues)
 * Writes SECURITY_DASHBOARD.md and returns the markdown string.
 */
function generateSecurityDashboard(latest, trend, issues) {
  const l       = latest  || {};
  const tArr    = Array.isArray(trend)  ? trend  : [];
  const iArr    = Array.isArray(issues) ? issues : [];

  const date   = l.date   || new Date().toISOString();
  const score  = l.score  != null ? l.score  : 'N/A';
  const level  = l.level  || 'N/A';
  const high   = l.high   != null ? l.high   : 0;
  const medium = l.medium != null ? l.medium : 0;
  const low    = l.low    != null ? l.low    : 0;

  // Status line
  let status;
  if (level === 'A' || level === 'B') status = '✅ Security posture is **acceptable**.';
  else if (level === 'C')             status = '⚠️  Security posture is a **warning** — review medium/low issues.';
  else if (level === 'D')             status = '🔴 Security posture is **high risk** — immediate action required.';
  else                                status = 'Status unknown.';

  // Trend table (last 5)
  const recent = tArr.slice(-5);
  let trendSection;
  if (recent.length === 0) {
    trendSection = '_No trend data available._';
  } else {
    const header = '| Date | Score | HIGH | MEDIUM | LOW |\n|------|-------|------|--------|-----|';
    const rows   = recent.map(r =>
      `| ${r.date || ''} | ${r.score != null ? r.score : ''} | ${r.high != null ? r.high : ''} | ${r.medium != null ? r.medium : ''} | ${r.low != null ? r.low : ''} |`
    ).join('\n');
    trendSection = `${header}\n${rows}`;
  }

  // Top issues (max 5)
  let issuesSection;
  if (iArr.length === 0) {
    issuesSection = 'No issues found.';
  } else {
    issuesSection = iArr.slice(0, 5).map((issue, idx) => {
      const severity = issue.severity || issue.level || issue.grade || '';
      const location = issue.location || issue.file  || issue.path  || '';
      const message  = issue.message || issue.description || issue.desc || issue.title || JSON.stringify(issue);
      const parts    = [`${idx + 1}.`];
      if (severity) parts.push(`**[${severity}]**`);
      if (location) parts.push(`\`${location}\``);
      parts.push(message);
      return parts.join(' ');
    }).join('\n');
  }

  const md = `# Security Dashboard

_Generated: ${new Date().toISOString()}_

---

## Latest Scan

| Field | Value |
|-------|-------|
| Date  | ${date} |
| Score | ${score} |
| Level | ${level} |

---

## Risk Breakdown

| Severity | Count |
|----------|-------|
| 🔴 HIGH   | ${high} |
| 🟡 MEDIUM | ${medium} |
| 🟢 LOW    | ${low} |

---

## Trend (Last 5 Scans)

${trendSection}

---

## Top Issues

${issuesSection}

---

## Status

${status}
`;

  try {
    fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
  } catch (err) {
    // write failure is non-fatal; caller gets the string regardless
  }

  return md;
}

module.exports = { generateSecurityDashboard };
