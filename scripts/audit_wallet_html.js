#!/usr/bin/env node
/**
 * Deep audit of dist/wallet.html: function declarations vs onclick handlers,
 * and smoke-test wallet flows in Node with mocks.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ethers = require('ethers');

const HTML_PATH = process.argv[2] || path.join(__dirname, '../dist/wallet.html');

function extractMainScript(html) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/src=/i.test(attrs)) continue;
    if (/application\/ld\+json/i.test(attrs)) continue;
    return m[2];
  }
  return null;
}

/** Collect identifiers from onclick string that look like fn( — skip obj.method( */
function callsFromOnclick(body) {
  const out = new Set();
  const kw = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'new', 'typeof', 'await', 'var', 'let', 'const', 'super']);
  const re = /(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g;
  let x;
  while ((x = re.exec(body))) {
    const name = x[1];
    if (!kw.has(name)) out.add(name);
  }
  return [...out];
}

function collectDeclaredNames(script) {
  const names = new Set();
  // function foo(
  let m;
  const reFn = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = reFn.exec(script))) names.add(m[1]);
  // async function foo(
  const reAsync = /async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = reAsync.exec(script))) names.add(m[1]);
  // const foo = function / async function / () =>
  const reConst = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/g;
  while ((m = reConst.exec(script))) names.add(m[1]);
  return names;
}

function extractOnclickBodies(html) {
  const bodies = [];
  const re = /\bonclick\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) bodies.push({ raw: m[1], line: html.slice(0, m.index).split('\n').length });
  const re2 = /\bonclick\s*=\s*'([^']*)'/gi;
  while ((m = re2.exec(html))) bodies.push({ raw: m[1], line: html.slice(0, m.index).split('\n').length });
  return bodies;
}

function buildDomMock() {
  const els = new Map();
  function makeEl(id) {
    const o = {
      id,
      style: {},
      classList: { add() {}, remove() {}, contains: () => false },
      appendChild(c) {
        this.children = this.children || [];
        this.children.push(c);
        return c;
      },
      insertBefore() {},
      remove() {},
      querySelector() {
        return null;
      },
      getAttribute: () => null,
      setAttribute() {},
      focus() {},
      innerHTML: '',
      textContent: '',
      value: '',
      dataset: {},
      parentNode: { insertBefore() {}, removeChild() {} },
      children: [],
    };
    if (id) els.set(id, o);
    return o;
  }
  const document = {
    body: makeEl(''),
    documentElement: { setAttribute() {}, getAttribute: () => null, style: {} },
    head: makeEl('head'),
    getElementById(id) {
      if (!els.has(id)) els.set(id, makeEl(id));
      return els.get(id);
    },
    querySelector(sel) {
      if (sel === '#verifyQuestions input') {
        const vq = els.get('verifyQuestions');
        if (vq && vq.children && vq.children[0]) return { focus() {}, value: '' };
        return null;
      }
      return null;
    },
    querySelectorAll(sel) {
      const pages = [];
      for (let i = 0; i < 80; i++) {
        pages.push({
          id: 'page-' + i,
          classList: { contains: () => false, add() {}, remove() {} },
          style: { display: '' },
        });
      }
      return pages;
    },
    createElement() {
      return makeEl('');
    },
    readyState: 'complete',
    addEventListener() {},
  };
  // Pre-seed common ids
  [
    'keyLangFlag',
    'keyLangName',
    'keyWordGrid',
    'verifyQuestions',
    'verifyError',
    'verifyShakeRoot',
    'importPaste',
    'importError',
    'tabBar',
    'mnemonicLength',
  ].forEach((id) => document.getElementById(id));
  return { document, els };
}

async function runFlowTests(mainScript) {
  const { document } = buildDomMock();
  const store = {};
  const sandbox = {
    console,
    window: null,
    document,
    addEventListener: () => {},
    removeEventListener: () => {},
    navigator: {
      serviceWorker: { getRegistrations: () => Promise.resolve([]) },
      clipboard: { writeText: () => Promise.resolve() },
    },
    caches: {
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
    },
    localStorage: {
      getItem: (k) => store[k] || null,
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { href: 'https://example.com/wallet.html', pathname: '/wallet.html' },
    history: { pushState() {}, replaceState() {} },
    setTimeout: (fn, t) => setTimeout(fn, t || 0),
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    fetch: () => Promise.resolve({ ok: false }),
    alert: () => {},
    prompt: () => null,
    confirm: () => false,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    crypto: globalThis.crypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    Blob,
    URL: { createObjectURL: () => '', revokeObjectURL() {} },
    Image: function () {},
    HTMLElement: function () {},
    SVGElement: function () {},
    CustomEvent: function () {},
    Event: function () {},
    MutationObserver: function () {
      return { observe() {}, disconnect() {} };
    },
    IntersectionObserver: function () {
      return { observe() {}, disconnect() {} };
    },
    getComputedStyle: () => ({}),
    ethers,
    TronWeb: undefined,
    REAL_WALLET: null,
    WT_LANG_INDEX: {},
    LANG_INFO: { zh: { flag: '🇨🇳', name: '中文' }, en: { flag: '🇺🇸', name: 'EN' } },
    currentLang: 'en',
    SAMPLE_KEYS: { zh: ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'] },
    WT_I18N: {},
  };
  sandbox.window = sandbox;

  // Stubs used before full script defines them
  sandbox.showToast = () => {};
  sandbox.goTo = () => {};
  sandbox.goTab = () => {};
  sandbox.updateAddr = () => {};
  sandbox.saveWallet = () => {};
  sandbox.applyReferralCredit = () => {};
  sandbox.loadTronWeb = async () => {};
  sandbox.formatWalletCreateError = (e) => e && e.message;
  sandbox.markBackupDone = () => {};
  sandbox._safeEl = (id) => document.getElementById(id) || { style: {}, innerHTML: '' };

  const ctx = vm.createContext(sandbox);
  try {
    vm.runInContext(mainScript, ctx, { timeout: 120000 });
  } catch (e) {
    return { ok: false, phase: 'load', error: String(e && e.stack) };
  }

  // Real `loadTronWeb` loads TronWeb from CDN (never resolves in Node); stub for flow tests.
  try {
    vm.runInContext(
      'loadTronWeb = function(){ return Promise.resolve(); };',
      ctx
    );
  } catch (_) {}

  const checks = {
    createRealWallet: typeof sandbox.window.createRealWallet,
    renderKeyGrid: typeof sandbox.window.renderKeyGrid,
    startVerify: typeof sandbox.window.startVerify,
    checkVerify: typeof sandbox.window.checkVerify,
    initImportGrid: typeof sandbox.window.initImportGrid,
    getMnemonicFromGrid: typeof sandbox.window.getMnemonicFromGrid,
    doImportWallet: typeof sandbox.window.doImportWallet,
    restoreWallet: typeof sandbox.window.restoreWallet,
  };

  // --- Create wallet flow ---
  let flowErr = null;
  try {
    sandbox.window.REAL_WALLET = null;
    const w = await vm.runInContext('createRealWallet()', ctx, { timeout: 60000 });
    if (!w || !w.enMnemonic) flowErr = 'createRealWallet did not return wallet';
    else {
      await vm.runInContext('renderKeyGrid()', ctx);
      await vm.runInContext('startVerify()', ctx);
      await vm.runInContext(
        `
        Object.keys(verifyAnswers).forEach(function(pos) {
          var inp = document.getElementById('verify_' + pos);
          if (inp) inp.value = verifyAnswers[pos];
        });
        checkVerify();
      `,
        ctx
      );
    }
  } catch (e) {
    flowErr = String(e && e.message);
  }

  // --- Import grid flow (paste path) ---
  let importErr = null;
  try {
    const testMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    await vm.runInContext(
      `
      currentMnemonicLength = 12;
      initImportGrid(12);
      var p = document.getElementById('importPaste');
      if (p) p.value = ${JSON.stringify(testMnemonic)};
    `,
      ctx
    );
    const g = await vm.runInContext('getMnemonicFromGrid()', ctx);
    if (g !== testMnemonic) importErr = 'getMnemonicFromGrid expected pasted mnemonic, got: ' + g;
  } catch (e) {
    importErr = String(e && e.message);
  }

  return { ok: !flowErr && !importErr, checks, flowErr, importErr };
}

async function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const mainScript = extractMainScript(html);
  if (!mainScript) {
    console.error('No main inline script');
    process.exit(1);
  }
  try {
    new Function(mainScript);
  } catch (e) {
    console.error('Syntax error in main script:', e.message);
    process.exit(1);
  }

  const declared = collectDeclaredNames(mainScript);
  const onclickBodies = extractOnclickBodies(html);
  const missing = [];
  const globalNames = new Set([...declared, 'event', 'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'history', 'location', 'fetch', 'Math', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'Promise', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Date', 'RegExp', 'Error', 'TypeError', 'parseInt', 'Intl', 'undefined']);

  for (const { raw, line } of onclickBodies) {
    const calls = callsFromOnclick(raw);
    for (const name of calls) {
      if (globalNames.has(name)) continue;
      // Methods on event/target — often event.stopPropagation, this
      if (name === 'this' || name === 'event') continue;
      if (!declared.has(name) && typeof globalThis[name] === 'undefined') {
        missing.push({ line, name, snippet: raw.slice(0, 120) });
      }
    }
  }

  // Deduplicate by line+name
  const key = (x) => x.line + '\t' + x.name;
  const seen = new Set();
  const uniq = missing.filter((m) => {
    const k = key(m);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  console.log('=== audit_wallet_html ===');
  console.log('File:', HTML_PATH, 'size', html.length);
  console.log('Declared functions (regex count):', declared.size);
  console.log('onclick handlers:', onclickBodies.length);
  console.log('Potentially missing callees:', uniq.length);

  const flow = await runFlowTests(mainScript);
  console.log('\n=== VM flow tests ===');
  console.log(JSON.stringify(flow.checks, null, 2));
  if (flow.phase) console.log('Load error:', flow.error);
  if (flow.flowErr) console.log('Create/verify flow error:', flow.flowErr);
  if (flow.importErr) console.log('Import paste flow error:', flow.importErr);

  if (uniq.length) {
    console.log('\n--- Missing references (first 40) ---');
    uniq.slice(0, 40).forEach((x) => console.log(`L${x.line} ${x.name}: ${x.snippet}`));
  }

  if (uniq.length || flow.flowErr || flow.importErr || flow.phase) {
    process.exitCode = 1;
  }
}

module.exports = { runFlowTests, extractMainScript, extractOnclickBodies, callsFromOnclick, collectDeclaredNames };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
