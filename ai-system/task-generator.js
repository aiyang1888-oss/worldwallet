const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateTasks(issues = []) {
  const tasks = issues.map((item, index) => {
    const severity = (item.severity || item.level || 'LOW').toUpperCase();
    let days = 14;
    if (severity === 'HIGH') days = 3;
    if (severity === 'MEDIUM') days = 7;

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    return {
      id: index + 1,
      file: item.file || item.path || 'unknown',
      line: item.line || 0,
      severity,
      issue: item.issue || item.message || item.description || 'unknown issue',
      suggestion: item.suggestion || item.fix_note || item.fix_suggestion || 'fix the issue',
      deadline: deadline.toISOString().split('T')[0]
    };
  });

  return tasks;
}

function saveTasks(tasks) {
  const dir = path.join(__dirname, 'tasks');
  ensureDir(dir);

  const jsonPath = path.join(dir, 'fix-tasks.json');
  const mdPath = path.join(dir, 'fix-tasks.md');

  fs.writeFileSync(jsonPath, JSON.stringify(tasks, null, 2));

  let md = '# Fix Tasks\n\n';
  tasks.forEach(t => {
    md += `## Task ${t.id}\n`;
    md += `- File: ${t.file}\n`;
    md += `- Line: ${t.line}\n`;
    md += `- Severity: ${t.severity}\n`;
    md += `- Issue: ${t.issue}\n`;
    md += `- Suggestion: ${t.suggestion}\n`;
    md += `- Deadline: ${t.deadline}\n\n`;
  });

  fs.writeFileSync(mdPath, md);

  console.log('Tasks generated:', jsonPath, mdPath);
}

function run() {
  const issuesPath = path.join(__dirname, '../ai-tasks/audit-review.json');

  let issues = [];
  if (fs.existsSync(issuesPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(issuesPath, 'utf8'));
      issues = data.issues || [];
    } catch (e) {
      console.warn('Failed to read issues');
    }
  }

  const tasks = generateTasks(issues);
  saveTasks(tasks);
}

if (require.main === module) {
  run();
}

module.exports = { generateTasks };
