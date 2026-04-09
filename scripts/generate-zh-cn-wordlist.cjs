#!/usr/bin/env node
/**
 * 从 scripts/pcas-code.json（modood/Administrative-divisions-of-China）生成
 * 2048 个唯一中文地名：省级 → 地级 → 县级 → 镇级补足；**每条 2～3 个 Unicode 字符**
 *（避免 UI 截断为伪词如「齐齐哈」、且与真实地名一致）。
 * 输出 dist/wordlists/zh-cn.json（与 BIP39 英文词索引 0..2047 对齐）。
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'dist', 'wordlists', 'zh-cn.json');
const PCAS = path.join(__dirname, 'pcas-code.json');

function ulen(s) {
  return [...String(s)].length;
}

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
  /街道|办事处|片区|园区|开发区|经济区|高新区|保税区|新区|风景区|管理区|保护区|监狱|农场|林场|水库|群岛|水域|海区|虚拟|不详|其它|其他|示范区|合作区|试验区|科技谷|物流园|工业园|聚集区|大学城|管理处|养殖场|铁厂街道/;

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
  const s0 = String(name);
  /** 必须先处理「市」：否则「沧州市」→「沧州」后再 /州$/ 会误变成「沧」 */
  if (s0.endsWith('市')) return s0.replace(/市$/, '');
  if (s0.endsWith('地区')) return s0.replace(/地区$/, '');
  if (s0.endsWith('盟')) return s0.replace(/盟$/, '');
  if (s0.endsWith('州')) return s0.replace(/州$/, '');
  return s0;
}

/** 去掉县级名称末尾常见后缀，用于去重时的「地级市简称 + 专名」 */
function stripDistrictSuffix(name) {
  let s = String(name || '');
  const sfx = ['自治县', '自治旗', '林区', '特区', '市辖区', '市', '区', '县', '旗'];
  for (const x of sfx) {
    if (s.endsWith(x)) {
      s = s.slice(0, -x.length);
      break;
    }
  }
  return s;
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
    if (!t || ulen(t) < 2 || ulen(t) > 3) return false;
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
        if (ulen(disambig) >= 2 && ulen(disambig) <= 3) add(disambig);
      }
    }
  }

  return { out, seen };
}

/** 镇名（去掉「镇」），仅 2～3 字 */
function collectTownZhen(tree, seen, out) {
  function walk(nodes, cityShort) {
    if (!nodes) return;
    for (const node of nodes) {
      const c = String(node.code || '');
      const name = node.name;
      if (c.length === 9 && name && /镇$/.test(name) && !SKIP_RE.test(name)) {
        const short = name.replace(/镇$/, '');
        if (ulen(short) < 2 || ulen(short) > 3) {
          /* skip */
        } else {
          const cand = (cityShort || '') + short;
          if (ulen(cand) >= 2 && ulen(cand) <= 3 && !seen.has(cand)) {
            seen.add(cand);
            out.push(cand);
          }
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

/**
 * 广度补足：任意县级专名去掉后缀后若为 2～3 字则收录（与主循环顺序一致）
 */
function collectStrippedCounties(tree, seen, out) {
  for (const prov of tree) {
    for (const city of prov.children || []) {
      const cc = String(city.code || '');
      if (cc.length !== 4) continue;
      for (const co of city.children || []) {
        const coc = String(co.code || '');
        if (coc.length !== 6) continue;
        const raw = co.name;
        if (!raw || shouldSkipCounty(raw)) continue;
        const base = stripDistrictSuffix(raw);
        if (ulen(base) >= 2 && ulen(base) <= 3 && !seen.has(base)) {
          seen.add(base);
          out.push(base);
        }
      }
    }
  }
}

/**
 * 最后补足：乡级 2～3 字专名（去掉「乡」「民族乡」等）
 */
function collectTownships(tree, seen, out) {
  const stripXiang = (n) =>
    String(n || '')
      .replace(/民族乡$/, '')
      .replace(/苏木$/, '')
      .replace(/乡$/, '');
  function walk(nodes) {
    if (!nodes) return;
    for (const node of nodes) {
      const c = String(node.code || '');
      const name = node.name;
      if (
        c.length === 9 &&
        name &&
        (/(乡|苏木)$/.test(name) || /民族乡$/.test(name)) &&
        !SKIP_RE.test(name)
      ) {
        const short = stripXiang(name);
        if (ulen(short) >= 2 && ulen(short) <= 3 && !seen.has(short)) {
          seen.add(short);
          out.push(short);
        }
      }
      if (node.children) walk(node.children);
    }
  }
  for (const prov of tree) {
    for (const city of prov.children || []) {
      const cc = String(city.code || '');
      if (cc.length !== 4) continue;
      for (const co of city.children || []) {
        const coc = String(co.code || '');
        if (coc.length === 6) walk(co.children);
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
    collectStrippedCounties(tree, seen, out);
  }
  if (out.length < 2048) {
    collectTownships(tree, seen, out);
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

  for (let i = 0; i < final2048.length; i++) {
    const w = final2048[i];
    if (ulen(w) < 2 || ulen(w) > 3) {
      console.error('[generate-zh-cn-wordlist] length violation at', i, w);
      process.exit(1);
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(final2048, null, 2) + '\n', 'utf8');
  console.log('[generate-zh-cn-wordlist] OK', OUT, 'n=', final2048.length);
}

main();
