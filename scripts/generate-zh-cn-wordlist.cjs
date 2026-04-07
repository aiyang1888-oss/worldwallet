#!/usr/bin/env node
/**
 * 从 scripts/pcas-code.json（modood/Administrative-divisions-of-China）生成
 * 2048 个唯一中文地名：省级 → 地级 → 县级；县级重名时用「地级市简称+县名」区分。
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'wallet-shell', 'wordlists', 'zh-cn.json');
const PCAS = path.join(__dirname, 'pcas-code.json');

function ensurePcas() {
  if (!fs.existsSync(PCAS)) {
    console.error(
      '[generate-zh-cn-wordlist] missing scripts/pcas-code.json — curl from modood/Administrative-divisions-of-China dist/pcas-code.json'
    );
    process.exit(1);
  }
  try {
    JSON.parse(fs.readFileSync(PCAS, 'utf8'));
  } catch (e) {
    console.error('[generate-zh-cn-wordlist] invalid JSON in', PCAS);
    process.exit(1);
  }
}

const SKIP_RE =
  /街道|办事处|片区|园区|开发区|经济区|高新区|保税区|新区|风景区|管理区|保护区|监狱|农场|林场|水库|群岛|水域|海区|虚拟|不详|其它|其他|示范区|合作区|试验区|科技谷|物流园|工业园|聚集区|大学城|管理处|养殖场|群岛|铁厂街道/;

function normProvince(name) {
  if (!name) return '';
  const n = String(name);
  if (n === '新疆维吾尔自治区') return '新疆';
  if (n === '内蒙古自治区') return '内蒙古';
  if (n === '广西壮族自治区') return '广西';
  if (n === '宁夏回族自治区') return '宁夏';
  if (n === '西藏自治区') return '西藏';
  if (n.endsWith('市')) return n.replace(/市$/, '');
  if (n.endsWith('省')) return n.replace(/省$/, '');
  if (n.endsWith('特别行政区')) return n.replace(/特别行政区$/, '');
  return n;
}

function normCityName(name) {
  if (!name || name === '市辖区' || name === '县') return '';
  return String(name)
    .replace(/市$/, '')
    .replace(/地区$/, '')
    .replace(/盟$/, '')
    .replace(/州$/, '');
}

function stripDistrictSuffix(name) {
  return String(name || '')
    .replace(/区$/, '')
    .replace(/县$/, '')
    .replace(/市$/, '')
    .replace(/旗$/, '')
    .replace(/自治县$/, '')
    .replace(/自治旗$/, '');
}

function shouldSkipCounty(name) {
  if (!name) return true;
  if (SKIP_RE.test(name)) return true;
  if (name === '市辖区' || name === '县') return true;
  return false;
}

function build(tree) {
  const out = [];
  const seen = new Set();

  function add(s) {
    const t = String(s || '').trim();
    if (!t || t.length < 2) return false;
    if (seen.has(t)) return false;
    seen.add(t);
    out.push(t);
    return true;
  }

  for (const prov of tree) {
    const pnorm = normProvince(prov.name);
    if (pnorm) add(pnorm);

    for (const city of prov.children || []) {
      const cc = String(city.code || '');
      if (cc.length !== 4) continue;
      const cityShort = normCityName(city.name);
      if (cityShort) add(cityShort);

      for (const co of city.children || []) {
        const coc = String(co.code || '');
        if (coc.length !== 6) continue;
        const raw = co.name;
        if (!raw || shouldSkipCounty(raw)) continue;
        if (add(raw)) continue;
        const disambig = (cityShort || '') + stripDistrictSuffix(raw);
        if (disambig.length >= 2) add(disambig);
      }
    }
  }

  return { out, seen };
}

/** 收集 9 位 code 的镇名（区县级下），用于补足 2048 */
function collectTownZhen(tree, seen, out) {
  function walk(nodes, cityShort) {
    if (!nodes) return;
    for (const node of nodes) {
      const c = String(node.code || '');
      const name = node.name;
      if (c.length === 9 && name && /镇$/.test(name) && !SKIP_RE.test(name)) {
        const short = name.replace(/镇$/, '');
        if (short.length < 2) continue;
        const cand = (cityShort || '') + short;
        if (!seen.has(cand)) {
          seen.add(cand);
          out.push(cand);
        }
      }
      if (node.children) walk(node.children, cityShort);
    }
  }
  for (const prov of tree) {
    for (const city of prov.children || []) {
      const cc = String(city.code || '');
      if (cc.length !== 4) continue;
      const cityShort = normCityName(city.name);
      for (const co of city.children || []) {
        const coc = String(co.code || '');
        if (coc.length === 6) walk(co.children, cityShort);
      }
    }
  }
}

function main() {
  ensurePcas();
  const tree = JSON.parse(fs.readFileSync(PCAS, 'utf8'));
  const { out, seen } = build(tree);

  if (out.length < 2048) {
    collectTownZhen(tree, seen, out);
  }

  if (out.length < 2048) {
    console.error('[generate-zh-cn-wordlist] only got', out.length, 'names; need 2048');
    process.exit(1);
  }

  const final2048 = out.slice(0, 2048);
  const uniq = new Set(final2048);
  if (uniq.size !== 2048) {
    console.error('[generate-zh-cn-wordlist] duplicate entries in first 2048');
    process.exit(1);
  }

  fs.writeFileSync(OUT, JSON.stringify(final2048, null, 2) + '\n', 'utf8');
  console.log('[generate-zh-cn-wordlist] OK', OUT, 'n=', final2048.length);
}

main();
