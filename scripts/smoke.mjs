// The browser test: `npm run smoke` (or `mise run smoke`). Opens every page in
// headless Chrome, on a local Wrangler server, and fails on anything that breaks.
//
//   npm run smoke                               # starts its own server
//   npm run smoke -- --url http://localhost:8788  # or use one that's running
//   npm run smoke -- topics/water               # only pages whose path has this
//
// On every page: no JS errors, no failed requests, nothing wider than a phone
// screen at 390px. On topic pages it also checks the 3D stage draws, then
// presses every button, slides every slider end to end, and taps all over the
// stage, and checks again. Last, the 404 page and the old-link redirects.
//
// It needs Google Chrome (or set CHROME to a Chrome or Chromium binary), and
// talks to it over the DevTools protocol, so there is nothing to install.
import { spawn } from 'node:child_process';
import { readdir, readFile, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const args = process.argv.slice(2);
const urlArg = args.includes('--url') ? args[args.indexOf('--url') + 1] : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--url');
const TABS = 4; // pages at a time
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const children = [];
const cleanup = () => children.forEach((c) => c.kill('SIGTERM'));
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

// ---------- The server ----------

const freePort = () => new Promise((resolve) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});

async function startServer() {
  if (urlArg) return urlArg.replace(/\/$/, '');
  const port = await freePort();
  const wrangler = spawn(join(ROOT, 'node_modules', '.bin', 'wrangler'), ['dev', '--port', String(port)], {
    cwd: ROOT, stdio: 'ignore', env: { ...process.env, ANTHROPIC_API_KEY: '' },
  });
  children.push(wrangler);
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    if (await fetch(base).then((r) => r.ok, () => false)) return base;
    await sleep(500);
  }
  throw new Error('Wrangler didn’t start. Try `npm run dev` to see why.');
}

// ---------- Chrome, over the DevTools protocol ----------

const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);

async function startChrome() {
  const { access } = await import('node:fs/promises');
  let bin;
  for (const c of CHROMES) if (await access(c).then(() => true, () => false)) { bin = c; break; }
  if (!bin) throw new Error('No Chrome found. Set CHROME to a Chrome or Chromium binary.');
  const profile = await mkdtemp(join(tmpdir(), 'elix-smoke-'));
  const chrome = spawn(bin, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', // WebGL without a GPU
    '--mute-audio', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  children.push(chrome);
  process.on('exit', () => rm(profile, { recursive: true, force: true }));
  const ws = await new Promise((resolve, reject) => {
    let err = '';
    chrome.stderr.on('data', (d) => {
      err += d;
      const m = err.match(/DevTools listening on (ws:\S+)/);
      if (m) resolve(m[1]);
    });
    chrome.on('exit', () => reject(new Error(`Chrome quit: ${err.slice(0, 300)}`)));
  });
  return connect(ws);
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const waiting = new Map();
  const listeners = new Set();
  socket.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      listeners.forEach((fn) => fn(msg));
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    waiting.set(++id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return new Promise((resolve) => {
    socket.onopen = () => resolve({ send, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn), close: () => socket.close() });
  });
}

// A tab, with what went wrong in it.
async function openTab(browser) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  const tab = { send, problems: [], loaded: null };
  browser.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    const p = msg.params;
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = p.exceptionDetails;
      tab.problems.push(`error: ${d.exception?.description?.split('\n')[0] ?? d.text}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && (p.type === 'error' || p.type === 'warning' && p.args.some((a) => /THREE/.test(a.value)))) {
      tab.problems.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`);
    } else if (msg.method === 'Network.responseReceived' && p.response.status >= 400) {
      tab.problems.push(`${p.response.status} ${p.response.url}`);
    } else if (msg.method === 'Network.loadingFailed' && !p.canceled && p.errorText !== 'net::ERR_ABORTED') {
      tab.problems.push(`failed to load (${p.errorText}) ${tab.requests.get(p.requestId) ?? ''}`);
    } else if (msg.method === 'Network.requestWillBeSent') {
      tab.requests.set(p.requestId, p.request.url);
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      tab.problems.push(`opened a ${p.type} dialog: ${p.message}`);
      send('Page.handleJavaScriptDialog', { accept: true });
    } else if (msg.method === 'Page.loadEventFired') {
      tab.loaded?.();
    }
  });
  tab.requests = new Map();
  await Promise.all(['Runtime.enable', 'Network.enable', 'Page.enable'].map((m) => send(m)));
  tab.eval = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  tab.size = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  tab.go = async (url) => {
    const loaded = new Promise((r) => { tab.loaded = r; });
    await send('Page.navigate', { url });
    await Promise.race([loaded, sleep(15000)]);
  };
  tab.click = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, pointerType: 'mouse' });
    }
  };
  return tab;
}

// ---------- The pages ----------

async function pages() {
  const out = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'audio' && e.name !== 'fonts') await walk(p);
      else if (e.name.endsWith('.html')) out.push(`/${relative(PUBLIC, p).replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '')}`);
    }
  };
  await walk(PUBLIC);
  return out.sort().filter((p) => !only.length || only.some((o) => p.includes(o)));
}

// Every button in the panel, every slider end to end, and taps on a grid over
// the stage. Not links (they leave the page), and not “Start over” last, so
// the stars it earned can be seen.
const MASH = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = (el) => el.offsetParent !== null && !el.disabled;
  let pressed = 0, slid = 0;
  for (let round = 0; round < 2; round++) {
    for (const b of document.querySelectorAll('.panel button, .stage button')) {
      if (!shown(b) || b.id === 'reset-stars' || b.id === 'info-close') continue;
      b.click(); pressed++;
      await wait(60);
    }
    for (const r of document.querySelectorAll('input[type=range]')) {
      if (!shown(r)) continue;
      for (const v of [r.min, r.max, (Number(r.min) + Number(r.max)) / 2]) {
        r.value = v;
        r.dispatchEvent(new Event('input', { bubbles: true }));
        r.dispatchEvent(new Event('change', { bubbles: true }));
        await wait(80);
      }
      slid++;
    }
  }
  return { pressed, slid };
})()`;

async function check(tab, base, path) {
  const problems = [];
  tab.problems = [];
  // A phone first: nothing wider than the screen.
  await tab.size(390, 844);
  await tab.go(base + path);
  await sleep(1500);
  const wide = await tab.eval('document.documentElement.scrollWidth - innerWidth');
  if (wide > 1) problems.push(`${wide}px wider than a 390px phone screen`);

  await tab.size(1280, 800);
  await tab.go(base + path);
  await sleep(2500); // Three.js comes from the CDN
  const isTopic = await tab.eval('!!document.getElementById("stage")');
  if (isTopic) {
    const stage = await tab.eval(`(() => {
      // The 3D view is the biggest canvas (the microscope also has a 2D one).
      const area = (el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height;
      const c = [...document.querySelectorAll('#stage canvas')].sort((a, b) => area(b) - area(a))[0];
      if (!c) return { error: 'no canvas in #stage' };
      const r = c.getBoundingClientRect();
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return { x: r.x, y: r.y, w: r.width, h: r.height, gl: !!gl,
        stars: document.getElementById('try-count')?.textContent ?? '' };
    })()`);
    if (stage.error) problems.push(stage.error);
    else {
      if (stage.w < 100 || stage.h < 100) problems.push(`stage is only ${stage.w}×${stage.h}`);
      if (!stage.gl) problems.push('no WebGL context');
      if (!/⭐ \d+ of \d+/.test(stage.stars)) problems.push(`“Try this!” count says “${stage.stars}”`);
      // Tap a grid over the stage: tap-to-learn parts, and empty taps.
      for (let i = 1; i < 6; i++) {
        for (let j = 1; j < 5; j++) {
          await tab.click(stage.x + (stage.w * i) / 6, stage.y + (stage.h * j) / 5);
          await sleep(40);
        }
      }
      const { pressed, slid } = await tab.eval(MASH);
      await sleep(1500); // let the animations run on what was pressed
      const after = await tab.eval('document.getElementById("try-count").textContent');
      problems.push(`__info pressed ${pressed}, slid ${slid}, ${after}`);
    }
  } else {
    // Menu pages: the theme toggle, both ways.
    await tab.eval('document.querySelector("[data-theme-toggle]")?.click()');
    await tab.eval('document.querySelector("[data-theme-toggle]")?.click()');
    const pills = await tab.eval('[...document.querySelectorAll(".pill.stars")].length');
    problems.push(`__info ${pills} star pills`);
  }
  await sleep(300);
  // /api/ask says “not ready” without a key; that’s not a failure.
  return [...new Set([...tab.problems, ...problems])].filter((p) => !/\/api\/ask/.test(p));
}

async function checkServer(base) {
  const problems = [];
  const missing = await fetch(`${base}/no-such-page`);
  if (missing.status !== 404) problems.push(`/no-such-page answers ${missing.status}, not 404`);
  if (!(await missing.text()).includes('Lost in the pond')) problems.push('/no-such-page isn’t the 404 page');
  for (const [from, to] of [['/science', '/10/science/'], ['/topics/water', '/10/science/topics/water'], ['/organisms/yeast', '/10/science/organisms/yeast']]) {
    const r = await fetch(base + from, { redirect: 'manual' });
    const where = new URL(r.headers.get('location') ?? '', base).pathname;
    if (r.status !== 301 || where !== to) problems.push(`${from} → ${r.status} ${where}, not 301 ${to}`);
  }
  const ask = await fetch(`${base}/api/ask`).then((r) => r.json(), () => null);
  if (typeof ask?.ready !== 'boolean') problems.push('GET /api/ask doesn’t answer { ready }');
  return problems;
}

// ---------- Run ----------

const started = Date.now();
const list = await pages();
const [base, browser] = await Promise.all([startServer(), startChrome()]);
console.log(`${list.length} pages on ${base}\n`);
const tabs = await Promise.all(Array.from({ length: Math.min(TABS, list.length) }, () => openTab(browser)));
let failed = 0;
let next = 0;
await Promise.all(tabs.map(async (tab) => {
  while (next < list.length) {
    const path = list[next++];
    let found;
    try {
      found = await check(tab, base, path);
    } catch (error) {
      found = [`the test itself broke: ${error.message.split('\n')[0]}`];
    }
    const info = found.filter((p) => p.startsWith('__info')).map((p) => p.slice(7));
    const bad = found.filter((p) => !p.startsWith('__info'));
    if (bad.length) failed++;
    console.log(`${bad.length ? '✗' : '✓'} ${path}${info.length ? `  (${info.join('; ')})` : ''}`);
    for (const p of bad) console.log(`    ${p}`);
  }
}));
if (!only.length) {
  const server = await checkServer(base);
  console.log(`${server.length ? '✗' : '✓'} 404 page, old-link redirects, and /api/ask`);
  for (const p of server) console.log(`    ${p}`);
  if (server.length) failed++;
}
browser.close();
console.log(`\n${failed ? `${failed} failed` : 'All passed'} in ${Math.round((Date.now() - started) / 1000)}s.`);
process.exit(failed ? 1 : 0);
