#!/usr/bin/env node
/**
 * Telegram：内联按钮 + 回复键盘 → 本机 Cursor CLI（New Agent：create-chat + agent -c 打开 Composer）
 *
 * 环境变量（见 .env.example）：
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *   CURSOR_WORKSPACE — 默认打开的工作区目录
 *   TELEGRAM_CONTROL_ENABLED=1 — 未设置则拒绝启动（防误跑）
 *
 * 用法：npm run telegram:cursor
 */
import axios from 'axios';
import { execFile, spawn } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
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

/** 回复键盘按钮文案（须与下方 MAP 一致） */
const BTN = {
  workspace: '📂 打开工作区',
  walletHtml: '📄 wallet.html',
  run: '▶ Run',
  newAgent: '🆕 New Agent',
  agentStatus: 'ℹ️ Agent 状态',
  help: '❓ 帮助',
  panel: '⌨️ 显示按钮',
};

/** 与回复键盘第一列文案对齐，用于识别用户点击 */
const TEXT_TO_ACTION = {
  [BTN.workspace]: 'cw_workspace',
  [BTN.walletHtml]: 'cw_wallet_html',
  [BTN.run]: 'cw_run',
  [BTN.newAgent]: 'cw_new_agent',
  [BTN.agentStatus]: 'cw_agent_status',
  [BTN.help]: 'cw_help',
  [BTN.panel]: 'cw_panel',
};

function deny(reason) {
  console.error(`[telegram-cursor-control] ${reason}`);
  process.exit(1);
}

if (!ENABLED) deny('请设置 TELEGRAM_CONTROL_ENABLED=1 后启动（见 .env.example）');
if (!TOKEN || !ALLOWED_CHAT) deny('需要 TELEGRAM_BOT_TOKEN 与 TELEGRAM_CHAT_ID');
if (!fs.existsSync(WORKSPACE)) deny(`工作区不存在: ${WORKSPACE}`);

const GOTO_TARGET = path.join(WORKSPACE, 'dist', 'wallet.html');

const execFileAsync = promisify(execFile);

/** LaunchAgent 下 PATH 常不含 ~/.local/bin，必须解析出 cursor 真实路径 */
function resolveCursorBin() {
  const fromEnv = process.env.CURSOR_CLI_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const home = process.env.HOME || '';
  const candidates = [
    path.join(home, '.local/bin/cursor'),
    '/usr/local/bin/cursor',
    '/opt/homebrew/bin/cursor',
    '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
  ];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) {
        const st = fs.statSync(p);
        if (st.isFile() || st.isSymbolicLink()) return p;
      }
    } catch {
      /* ignore */
    }
  }
  return 'cursor';
}

const CURSOR_BIN = resolveCursorBin();

/** 输入框上方的常驻自定义键盘（ReplyKeyboardMarkup） */
const REPLY_KEYBOARD = {
  keyboard: [
    [{ text: BTN.workspace }, { text: BTN.walletHtml }],
    [{ text: BTN.run }, { text: BTN.newAgent }],
    [{ text: BTN.agentStatus }, { text: BTN.help }],
    [{ text: BTN.panel }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
  is_persistent: true,
  input_field_placeholder: '点下方按钮或发 /start',
};

const INLINE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: BTN.workspace, callback_data: 'cw_workspace' },
      { text: BTN.walletHtml, callback_data: 'cw_wallet_html' },
    ],
    [
      { text: BTN.run, callback_data: 'cw_run' },
      { text: BTN.newAgent, callback_data: 'cw_new_agent' },
    ],
    [
      { text: BTN.agentStatus, callback_data: 'cw_agent_status' },
      { text: BTN.help, callback_data: 'cw_help' },
    ],
  ],
};

/** @param {string[]} args */
function runCursor(args) {
  const child = spawn(CURSOR_BIN, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

/** 后台启动 npm run dev（静态站，默认端口见 package.json） */
function runNpmDev() {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: WORKSPACE,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
    shell: false,
  });
  child.unref();
}

/**
 * 打开 Cursor Agent 的 Composer（CLI: -c / --cloud = launch 时打开 composer picker）
 * 与 create-chat 得到的 session 绑定：--resume <id>
 * -f：信任工作区，避免卡在交互式 “Workspace Trust”
 */
function openComposerForSession(sessionId) {
  const env = { ...process.env };
  delete env.NO_OPEN_BROWSER;
  delete env.CI;
  const child = spawn(
    CURSOR_BIN,
    ['agent', '-c', '--resume', sessionId, '--workspace', WORKSPACE, '-f'],
    {
      detached: true,
      stdio: 'ignore',
      env,
    }
  );
  child.on('error', (err) => console.error('[openComposerForSession]', err));
  child.unref();
}

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

/**
 * @param {string|number} chatId
 * @param {string} action
 * @param {{ skipReplyKeyboard?: boolean }} [opts]
 */
async function dispatchAction(chatId, action, opts = {}) {
  const withKeyboard = opts.skipReplyKeyboard
    ? {}
    : { reply_markup: REPLY_KEYBOARD };

  switch (action) {
    case 'cw_workspace':
      runCursor(['-r', '-a', WORKSPACE]);
      await sendChat(chatId, `已触发：cursor 打开工作区\n${WORKSPACE}`, withKeyboard);
      return;
    case 'cw_wallet_html': {
      const g = `${GOTO_TARGET}:1`.replace(/\\/g, '/');
      runCursor(['-r', '-g', g]);
      await sendChat(chatId, `已触发：cursor goto\n${g}`, withKeyboard);
      return;
    }
    case 'cw_run':
      runNpmDev();
      await sendChat(
        chatId,
        [
          '已后台启动: npm run dev',
          `目录: ${WORKSPACE}`,
          '默认: http://127.0.0.1:8766/wallet.html',
          '若端口被占用，请先结束本机已占用的 http.server。',
        ].join('\n'),
        withKeyboard
      );
      return;
    case 'cw_new_agent': {
      await sendChat(
        chatId,
        `正在创建会话并尝试打开 Composer…\nCLI: ${CURSOR_BIN}`,
        withKeyboard
      );
      const agentEnv = {
        ...process.env,
        NO_OPEN_BROWSER: process.env.NO_OPEN_BROWSER || '1',
        CI: process.env.CI || '1',
      };
      try {
        const { stdout, stderr } = await execFileAsync(
          CURSOR_BIN,
          ['agent', 'create-chat'],
          {
            cwd: WORKSPACE,
            timeout: 90000,
            maxBuffer: 1024 * 1024,
            env: agentEnv,
          }
        );
        const raw = [stdout, stderr].filter(Boolean).join('\n').trim();
        const firstLine = raw.split(/\r?\n/).filter(Boolean)[0] || '';
        const id = /^[0-9a-f-]{36}$/i.test(firstLine.trim()) ? firstLine.trim() : raw.split(/\s+/)[0] || '';
        if (!id) {
          await sendChat(
            chatId,
            `create-chat 未返回有效 id，原始输出:\n${raw.slice(0, 1500) || '(空)'}`,
            withKeyboard
          );
          return;
        }
        openComposerForSession(id);
        const msg = [
          '已创建会话，并已请求打开 Composer（agent -c --resume …）',
          `chat id:\n${id}`,
          '',
          '若未弹出 Cursor 窗口，在本机终端执行：',
          `${CURSOR_BIN} agent -c --resume ${id} --workspace "${WORKSPACE}" -f`,
        ].join('\n');
        await sendChat(chatId, msg.slice(0, 4000), withKeyboard);
      } catch (e) {
        const err = /** @type {NodeJS.ErrnoException & { stderr?: Buffer }} */ (e);
        const hint = err.code === 'ENOENT' ? '\n提示: 设置 CURSOR_CLI_PATH 为 cursor 可执行文件绝对路径。' : '';
        const stderr = err.stderr ? `\n${String(err.stderr).slice(0, 800)}` : '';
        console.error('[cw_new_agent]', err);
        await sendChat(
          chatId,
          `create-chat 失败: ${err.message}${stderr}${hint}`,
          withKeyboard
        );
      }
      return;
    }
    case 'cw_agent_status': {
      try {
        const { stdout, stderr } = await execFileAsync(CURSOR_BIN, ['agent', 'status'], {
          cwd: WORKSPACE,
          timeout: 30000,
          maxBuffer: 1024 * 512,
          env: process.env,
        });
        const out = [stdout, stderr].filter(Boolean).join('\n').trim();
        await sendChat(chatId, `Agent status:\n${out.slice(0, 3500)}`, withKeyboard);
      } catch (e) {
        const err = /** @type {NodeJS.ErrnoException & { stderr?: Buffer }} */ (e);
        const stderr = err.stderr ? `\n${String(err.stderr).slice(0, 800)}` : '';
        console.error('[cw_agent_status]', err);
        await sendChat(chatId, `agent status 失败: ${err.message}${stderr}`, withKeyboard);
      }
      return;
    }
    case 'cw_help':
      await sendChat(
        chatId,
        [
          'Cursor 遥控说明',
          '',
          '• 下方键盘可常驻；若消失可点「显示按钮」或发 /start',
          '• 本机需已安装 cursor 并完成 cursor agent login',
          `• 打开工作区 ≈ cursor -r -a ${WORKSPACE}`,
          '• 打开 wallet.html ≈ cursor -g …/dist/wallet.html:1',
          '• Run ≈ 后台 npm run dev（本地预览 dist）',
          '• New Agent ≈ create-chat + agent -c --resume（打开 Composer）',
          '• 仅 TELEGRAM_CHAT_ID 可使用',
        ].join('\n'),
        withKeyboard
      );
      return;
    case 'cw_panel':
      await sendChat(
        chatId,
        '已刷新下方自定义键盘。若仍看不到：Telegram 设置 → 把键盘展开，或重启 Telegram。',
        { reply_markup: REPLY_KEYBOARD }
      );
      return;
    default:
      await sendChat(chatId, '未知操作', withKeyboard);
  }
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
    if (data === 'cw_agent_status') await answerCallback(q.id, '查询中…');
    else if (data === 'cw_help') await answerCallback(q.id, '帮助');
    else if (data === 'cw_run') await answerCallback(q.id, '已启动 dev');
    else if (data === 'cw_new_agent') await answerCallback(q.id, 'Composer…');
    else if (data.startsWith('cw_')) await answerCallback(q.id, '已执行');

    await dispatchAction(chatId, data, { skipReplyKeyboard: false });
  } catch (e) {
    console.error(e);
    await answerCallback(q.id, '执行失败');
    await sendChat(chatId, `错误: ${e.message}`, { reply_markup: REPLY_KEYBOARD });
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  if (!isAllowed(chatId)) {
    await sendChat(chatId, '未授权使用此 Bot。');
    return;
  }
  const t = (msg.text || '').trim().replace(/\u200b/g, '');

  if (t === '/start' || t === '/cursor') {
    await sendChat(chatId, '下方为自定义键盘（在输入框上面）；再下一条消息带内联按钮。', {
      reply_markup: REPLY_KEYBOARD,
    });
    await sendChat(chatId, '或使用内联按钮：', { reply_markup: INLINE_KEYBOARD });
    return;
  }

  if (t === '/help' || t === '/keyboard') {
    await sendChat(chatId, '已重新显示自定义键盘。', { reply_markup: REPLY_KEYBOARD });
    return;
  }

  let action = TEXT_TO_ACTION[t];
  if (!action && /^🆕\s*new\s*agent$/i.test(t)) action = 'cw_new_agent';
  if (action) {
    await dispatchAction(chatId, action);
    return;
  }

  await sendChat(chatId, '未知指令。发 /start 显示按钮，或点输入框上方键盘。', {
    reply_markup: REPLY_KEYBOARD,
  });
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
  console.log(
    `[telegram-cursor-control] Bot @${me.username} 轮询中… 工作区: ${WORKSPACE}\n` +
      `[telegram-cursor-control] cursor CLI: ${CURSOR_BIN}`
  );
  await sendChat(ALLOWED_CHAT, `Cursor 遥控已启动（工作区: ${WORKSPACE}）\n发 /start 显示输入框上方按钮。`, {
    reply_markup: REPLY_KEYBOARD,
  }).catch(() => {});

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
