/**
 * simple-bot.js — 给小郭的本地工具权限
 * 功能：截图、读写文件、执行命令、修改 .env
 * 用法：TELEGRAM_BOT_TOKEN=xxx PROCESSING_GROUP_ID=yyy node simple-bot.js
 */
const TelegramBot = require('node-telegram-bot-api');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = process.env.PROCESSING_GROUP_ID;
const REPO = process.env.REPO_PATH || '/Users/daxiang/Desktop/Projects/WorldWallet';

if (!TOKEN) { console.error('缺少 TELEGRAM_BOT_TOKEN'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
console.log(`[bot] 启动, group=${GROUP_ID}, repo=${REPO}`);

function isAllowed(msg) {
  return !GROUP_ID || String(msg.chat.id) === String(GROUP_ID);
}

function reply(msg, text) {
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
}

// /screenshot — 截取当前屏幕
bot.onText(/\/screenshot/, async (msg) => {
  if (!isAllowed(msg)) return;
  const file = path.join(os.tmpdir(), `screen_${Date.now()}.png`);
  try {
    execSync(`/usr/sbin/screencapture -x ${file}`);
    await bot.sendPhoto(msg.chat.id, file, { caption: '当前屏幕截图' });
    fs.unlinkSync(file);
  } catch (e) {
    reply(msg, `❌ 截图失败: ${e.message}`);
  }
});

// /run <命令> — 执行 shell 命令
bot.onText(/\/run (.+)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const cmd = match[1];
  try {
    const out = execSync(cmd, { cwd: REPO, timeout: 30000,
      env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' }
    }).toString().trim();
    reply(msg, `\`\`\`\n${out.slice(0, 3500)}\n\`\`\``);
  } catch (e) {
    reply(msg, `❌ 错误:\n\`\`\`\n${(e.stderr||e.message||'').toString().slice(0,2000)}\n\`\`\``);
  }
});

// /read <文件路径> — 读取文件内容
bot.onText(/\/read (.+)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const filePath = match[1].startsWith('/') ? match[1] : path.join(REPO, match[1]);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    reply(msg, `📄 \`${filePath}\`\n\`\`\`\n${content.slice(0, 3500)}\n\`\`\``);
  } catch (e) {
    reply(msg, `❌ 读取失败: ${e.message}`);
  }
});

// /write <文件路径>\n<内容> — 写入文件
bot.onText(/\/write (.+)\n([\s\S]+)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const filePath = match[1].startsWith('/') ? match[1] : path.join(REPO, match[1]);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, match[2]);
    reply(msg, `✅ 已写入: \`${filePath}\` (${match[2].length} 字节)`);
  } catch (e) {
    reply(msg, `❌ 写入失败: ${e.message}`);
  }
});

// /ls [路径] — 列出目录
bot.onText(/\/ls\s*(.*)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const dir = match[1].trim() || REPO;
  const fullPath = dir.startsWith('/') ? dir : path.join(REPO, dir);
  try {
    const items = fs.readdirSync(fullPath).map(f => {
      const stat = fs.statSync(path.join(fullPath, f));
      return `${stat.isDirectory() ? '📁' : '📄'} ${f}`;
    });
    reply(msg, `\`${fullPath}\`\n${items.slice(0, 80).join('\n')}`);
  } catch (e) {
    reply(msg, `❌ ${e.message}`);
  }
});

// /git <子命令> — git 操作
bot.onText(/\/git (.+)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  try {
    const out = execSync(`git ${match[1]}`, { cwd: REPO, timeout: 30000,
      env: { ...process.env, PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin' }
    }).toString().trim();
    reply(msg, `\`\`\`\n${out.slice(0, 3500)}\n\`\`\``);
  } catch (e) {
    reply(msg, `❌ git 错误:\n\`\`\`\n${(e.stderr||e.message||'').toString().slice(0,2000)}\n\`\`\``);
  }
});

// /env — 查看 .env 文件
bot.onText(/\/env$/, (msg) => {
  if (!isAllowed(msg)) return;
  const envFile = path.join(REPO, '.env');
  try {
    const content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '(文件不存在)';
    reply(msg, `📄 \`.env\`\n\`\`\`\n${content.slice(0, 3500)}\n\`\`\``);
  } catch (e) {
    reply(msg, `❌ ${e.message}`);
  }
});

// /setenv KEY=VALUE — 修改 .env
bot.onText(/\/setenv (.+=.+)/, (msg, match) => {
  if (!isAllowed(msg)) return;
  const envFile = path.join(REPO, '.env');
  const [key, ...rest] = match[1].split('=');
  const value = rest.join('=');
  try {
    let lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').split('\n') : [];
    const idx = lines.findIndex(l => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
    fs.writeFileSync(envFile, lines.join('\n'));
    reply(msg, `✅ .env 已更新: \`${key}=${value}\``);
  } catch (e) {
    reply(msg, `❌ ${e.message}`);
  }
});

// /help — 帮助
bot.onText(/\/help/, (msg) => {
  if (!isAllowed(msg)) return;
  reply(msg, `🤖 *小郭工具箱*
/screenshot — 截取屏幕
/run <命令> — 执行 shell 命令
/read <路径> — 读取文件
/write <路径>\\n<内容> — 写入文件
/ls [路径] — 列出目录
/git <子命令> — git 操作
/env — 查看 .env
/setenv KEY=VALUE — 修改 .env`);
});

bot.on('polling_error', (e) => console.error('[bot] polling error:', e.message));
console.log('[bot] 就绪，等待命令...');
