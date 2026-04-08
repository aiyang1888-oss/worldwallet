#!/usr/bin/env node
/**
 * Telegram 内联按钮 → 本机 Cursor CLI（需与 Bot 同一台机器长期运行本脚本）
 *
 * 环境变量（见 .env.example）：
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *   CURSOR_WORKSPACE — 默认打开的工作区目录
 *   TELEGRAM_CONTROL_ENABLED=1 — 未设置则拒绝启动（防误跑）
 *
 * 用法：npm run telegram:cursor
 */
import axios from 'axios';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

for (const envPath of [path.join(ROOT, '.env'), path.join(ROOT, 'assets', '.env')]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_CHAT = String(process.env.TELEGRAM_CHAT_ID || '').trim();
const WORKSPACE = path.resolve(process.env.CURSOR_WORKSPACE || ROOT);
const ENABLED = process.env.TELEGRAM_CONTROL_ENABLED === '1';

const API = `https://api.telegram.org/bot${TOKEN}`;

function deny(reason) {
  console.error(`[telegram-cursor-control] ${reason}`);
  process.exit(1);
}

if (!ENABLED) deny('请设置 TELEGRAM_CONTROL_ENABLED=1 后启动（见 .env.example）');
if (!TOKEN || !ALLOWED_CHAT) deny('需要 TELEGRAM_BOT_TOKEN 与 TELEGRAM_CHAT_ID');
if (!fs.existsSync(WORKSPACE)) deny(`工作区不存在: ${WORKSPACE}`);

const GOTO_TARGET = path.join(WORKSPACE, 'dist', 'wallet.html');

/** @param {string} cmd @param {string[]} args */
function runCursor(args) {
  const child = spawn('cursor', args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

const KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📂 打开工作区', callback_data: 'cw_workspace' },
      { text: '📄 打开 wallet.html', callback_data: 'cw_wallet_html' },
    ],
    [
      { text: 'ℹ️ Agent 状态', callback_data: 'cw_agent_status' },
      { text: '❓ 帮助', callback_data: 'cw_help' },
    ],
  ],
};

async function apiPost(method, payload) {
  const { data } = await axios.post(`${API}/${method}`, payload, { timeout: 60000 });
  if (!data.ok) throw new Error(`${method}: ${JSON.stringify(data)}`);
  return data.result;
}

async function apiGet(method, params) {
  const { data } = await axios.get(`${API}/${method}`, { params, timeout: 60000 });
  if (!data.ok) throw new Error(`${method}: ${JSON.stringify(data)}`);
  return data.result;
}

async function sendChat(chatId, text, extra = {}) {
  return apiPost('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}

async function answerCallback(id, text) {
  try {
    await apiPost('answerCallbackQuery', { callback_query_id: id, text: text?.slice(0, 200) || '' });
  } catch (e) {
    console.error('[answerCallbackQuery]', e.message);
  }
}

function isAllowed(chatId) {
  return String(chatId) === ALLOWED_CHAT;
}

async function handleCallback(q) {
  const chatId = q.message?.chat?.id;
  const uid = q.from?.id;
  if (!isAllowed(chatId) && !isAllowed(uid)) {
    await answerCallback(q.id, '未授权');
    return;
  }

  const data = q.data || '';

  try {
    switch (data) {
      case 'cw_workspace':
        runCursor(['-r', '-a', WORKSPACE]);
        await answerCallback(q.id, '已请求打开工作区');
        await sendChat(chatId, `已触发：cursor 打开工作区\n${WORKSPACE}`);
        break;
      case 'cw_wallet_html': {
        const g = `${GOTO_TARGET}:1`.replace(/\\/g, '/');
        runCursor(['-r', '-g', g]);
        await answerCallback(q.id, '已请求打开文件');
        await sendChat(chatId, `已触发：cursor goto\n${g}`);
        break;
      }
      case 'cw_agent_status': {
        await answerCallback(q.id, '查询中…');
        const { execFile } = await import('child_process');
        execFile(
          'cursor',
          ['agent', 'status'],
          { cwd: WORKSPACE, timeout: 20000, maxBuffer: 1024 * 512 },
          async (err, stdout, stderr) => {
            const out = [stdout, stderr].filter(Boolean).join('\n').trim() || String(err?.message || '');
            await sendChat(chatId, `Agent status:\n${out.slice(0, 3500)}`);
          }
        );
        break;
      }
      case 'cw_help':
        await answerCallback(q.id, '帮助');
        await sendChat(
          chatId,
          [
            'Cursor 遥控说明',
            '',
            '• 本机需已安装 cursor 并完成 cursor agent login',
            `• 「打开工作区」≈ cursor -r -a ${WORKSPACE}`,
            `• 「打开 wallet.html」≈ cursor -g …/dist/wallet.html:1`,
            '• 仅 TELEGRAM_CHAT_ID 可使用',
            '',
            '保持运行: npm run telegram:cursor（可用 tmux / pm2）',
          ].join('\n')
        );
        break;
      default:
        await answerCallback(q.id, '未知操作');
    }
  } catch (e) {
    console.error(e);
    await answerCallback(q.id, '执行失败');
    await sendChat(chatId, `错误: ${e.message}`);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  if (!isAllowed(chatId)) {
    await sendChat(chatId, '未授权使用此 Bot。');
    return;
  }
  const t = (msg.text || '').trim();
  if (t === '/start' || t === '/cursor') {
    await sendChat(chatId, '选择操作（本机 Cursor）：', { reply_markup: KEYBOARD });
    return;
  }
  if (t === '/help') {
    await sendChat(chatId, '发送 /start 显示按钮面板。', { reply_markup: KEYBOARD });
  }
}

let offset = 0;

async function poll() {
  const { data } = await axios.get(`${API}/getUpdates`, {
    params: { offset, timeout: 50 },
    timeout: 60000,
  });
  if (!data.ok) throw new Error(JSON.stringify(data));
  for (const u of data.result || []) {
    offset = u.update_id + 1;
    if (u.callback_query) await handleCallback(u.callback_query);
    else if (u.message) await handleMessage(u.message);
  }
}

async function main() {
  const me = await apiGet('getMe');
  console.log(`[telegram-cursor-control] Bot @${me.username} 轮询中… 工作区: ${WORKSPACE}`);
  await sendChat(ALLOWED_CHAT, `Cursor 遥控已启动（工作区: ${WORKSPACE}）\n发送 /start 显示按钮。`).catch(() => {});

  for (;;) {
    try {
      await poll();
    } catch (e) {
      console.error('[poll]', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
