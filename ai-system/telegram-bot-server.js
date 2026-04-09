const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');

const TOKEN = process.env.TG_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

let offset = 0;

function api(method, data = {}) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(data);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.write(payload);
    req.end();
  });
}

function sendMenu() {
  return api('sendMessage', {
    chat_id: CHAT_ID,
    text: '🛡️ 安全控制台',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 看看板', callback_data: 'VIEW_DASHBOARD' }],
        [{ text: '🧾 看任务', callback_data: 'VIEW_TASKS' }],
        [{ text: '📋 Cursor 任务', callback_data: 'VIEW_CURSOR_PROMPT' }]
      ]
    }
  });
}

function sendDashboard() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'SECURITY_DASHBOARD.md'), 'utf8').slice(0, 3500);
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '📊 安全看板\n\n' + txt
    });
  } catch {
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '❌ 无法读取看板'
    });
  }
}

function sendTasks() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'ai-system/tasks/fix-tasks.md'), 'utf8').slice(0, 3500);
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '🧾 修复任务\n\n' + txt
    });
  } catch {
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '❌ 无法读取任务'
    });
  }
}

function sendCursorPrompt() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'ai-system/tasks/cursor-prompt.txt'), 'utf8').slice(0, 3800);
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '📋 复制以下内容发给 Cursor：\n\n' + txt
    });
  } catch {
    return api('sendMessage', {
      chat_id: CHAT_ID,
      text: '❌ 无法读取 cursor-prompt.txt'
    });
  }
}

async function poll() {
  const res = await api('getUpdates', {
    offset: offset + 1,
    timeout: 10
  });

  const updates = res.result || [];

  for (const u of updates) {
    offset = u.update_id;

    console.log('UPDATE:', JSON.stringify(u));

    if (u.message && u.message.text === '/start') {
      await sendMenu();
    }

    if (u.callback_query) {
      const data = u.callback_query.data;

      console.log('BUTTON CLICK:', data);

      if (data === 'VIEW_DASHBOARD') {
        await sendDashboard();
      }

      if (data === 'VIEW_TASKS') {
        await sendTasks();
      }

      if (data === 'VIEW_CURSOR_PROMPT') {
        await sendCursorPrompt();
      }

      await api('answerCallbackQuery', {
        callback_query_id: u.callback_query.id
      });
    }
  }
}

setInterval(poll, 2000);

console.log('Bot running...');
