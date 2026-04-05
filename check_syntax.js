const fs = require('fs');
const path = require('path');
const root = __dirname;
const htmlPath = process.argv[2] || path.join(root, 'dist', 'wallet.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
console.log('HTML:', htmlPath);
const wordlists = fs.readFileSync(path.join(root, 'assets', 'wordlists.js'), 'utf-8');

// 提取最大 inline script
const matches = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
const scripts = matches.map(m => m[1]);
const main = scripts.reduce((a, b) => a.length > b.length ? a : b, '');

console.log(`主脚本大小: ${(main.length/1024).toFixed(0)}KB`);
console.log(`wordlists.js 大小: ${(wordlists.length/1024).toFixed(1)}KB`);

try {
  new Function(wordlists);
  console.log('✅ wordlists.js 语法正确');
} catch (e) {
  console.log(`❌ wordlists.js 语法错误: ${e.message}`);
  process.exit(1);
}

try {
  new Function(main);
  console.log('✅ 内联脚本语法正确！');
} catch(e) {
  console.log(`❌ 语法错误: ${e.message}`);
  
  // 二分查找错误位置
  const half = Math.floor(main.length / 2);
  try { new Function(main.slice(0, half)); console.log(`前半段 OK`); }
  catch(e2) { console.log(`前半段错误: ${e2.message}`); }
  try { new Function(main.slice(half)); console.log(`后半段 OK`); }
  catch(e3) { console.log(`后半段错误: ${e3.message}`); }
}
