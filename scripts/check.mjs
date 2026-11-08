// Sanity checks that need no browser and no server: `npm test` (or `mise run check`).
// It reads the files in public/ and fails on anything broken. The browser test,
// scripts/smoke.mjs, opens every page; this one checks how they fit together.
//
//   npm test           # every check
//   npm test -- -v     # also list what passed
//
// What it checks:
//   syntax     every JS file parses
//   links      every local href, src, and _redirects target points at a file
//   pages      favicons, one Three.js version, a module script that exists
//   topics     each topic page’s challenges, its stars pill, and the data-topics lists
//   css        no color hard-coded outside the theme blocks; every var() is defined
//   text       curly quotes and American spelling in what she reads
//   voice      every line Cello says has a clip (scripts/voice.mjs --check)
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const verbose = process.argv.includes('-v');

const failures = [];
let passed = 0;
const fail = (area, where, what) => failures.push(`${area}  ${where}: ${what}`);
const pass = (area, what) => {
  passed++;
  if (verbose) console.log(`ok  ${area}  ${what}`);
};

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(path)));
    else out.push(path);
  }
  return out;
}

const isFile = (path) => stat(path).then((s) => s.isFile(), () => false);
const rel = (path) => relative(ROOT, path);
const all = await files(PUBLIC);
const html = all.filter((f) => f.endsWith('.html'));
const js = all.filter((f) => f.endsWith('.js'));
const source = Object.fromEntries(await Promise.all([...html, ...js].map(async (f) => [f, await readFile(f, 'utf8')])));

// ---------- syntax ----------

const scripts = [...js, join(ROOT, 'worker/index.js'), ...(await files(join(ROOT, 'scripts')))];
await Promise.all(scripts.map(async (f) => {
  try {
    await run(process.execPath, ['--check', f]);
    pass('syntax', rel(f));
  } catch (error) {
    fail('syntax', rel(f), error.stderr.split('\n').find((l) => /Error/.test(l)) ?? 'does not parse');
  }
}));

// ---------- links ----------

// Where a URL lands, the way Cloudflare serves public/: a file, a folder’s
// index.html, or a clean URL without .html.
async function lands(url, from) {
  const path = decodeURI(url.split(/[?#]/)[0]);
  if (!path) return true; // #anchor on the same page
  const abs = path.startsWith('/') ? join(PUBLIC, path) : resolve(dirname(from), path);
  if (!abs.startsWith(PUBLIC)) return false;
  return (await isFile(abs)) || (await isFile(join(abs, 'index.html'))) || (await isFile(`${abs}.html`));
}

const external = /^(https?:|mailto:|tel:|data:|javascript:|blob:)/;
for (const f of html) {
  const urls = [...source[f].matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !external.test(u));
  for (const url of urls) {
    if (await lands(url, f)) pass('links', `${rel(f)} → ${url}`);
    else fail('links', rel(f), `${url} goes nowhere`);
  }
}
for (const line of (await readFile(join(PUBLIC, '_redirects'), 'utf8')).split('\n')) {
  const [from, to] = line.trim().split(/\s+/);
  if (!from || from.startsWith('#')) continue;
  const target = to.replace(':splat', '');
  // A splat target is a folder; the rest must land on a page.
  const ok = to.includes(':splat') ? (await stat(join(PUBLIC, target)).catch(() => null))?.isDirectory() : await lands(target, PUBLIC);
  if (ok) pass('links', `_redirects ${from}`);
  else fail('links', 'public/_redirects', `${from} → ${to} goes nowhere`);
}

// ---------- pages ----------

const threeVersions = new Set();
for (const f of html) {
  const page = source[f];
  if (!/rel="icon"[^>]*favicon\.ico/.test(page)) fail('pages', rel(f), 'no favicon link');
  if (!/<title>[^<]+<\/title>/.test(page)) fail('pages', rel(f), 'no <title>');
  for (const m of page.matchAll(/three@([\d.]+)\//g)) threeVersions.add(m[1]);
  if (page.includes('three@') && !page.includes('"three/addons/"')) fail('pages', rel(f), 'import map has no three/addons/');
  pass('pages', rel(f));
}
if (threeVersions.size > 1) fail('pages', 'import maps', `more than one Three.js version: ${[...threeVersions].join(', ')}`);

// Menu pages end with the contact footer; topic pages don’t.
const topicPages = html.filter((f) => /\/(topics|organisms)\//.test(f));
const menuPages = html.filter((f) => !topicPages.includes(f));
for (const f of menuPages) {
  if (!source[f].includes('class="site-footer"')) fail('pages', rel(f), 'no contact footer');
}

// ---------- topics ----------

const unitPages = html.filter((f) => /\/unit-\d+\.html$/.test(f));
const listed = (f) => new Set((source[f].match(/data-topics="([^"]+)"/)?.[1] ?? '').split(/\s+/).filter(Boolean));
const menus = ['index.html', '10/index.html'].map((p) => join(PUBLIC, p));
const sciencePills = new Set([...source[join(PUBLIC, '10/science/index.html')].matchAll(/data-topics="([^"]+)"/g)]
  .flatMap((m) => m[1].split(/\s+/)));
const pillOnUnit = new Map(); // topic id → the unit page with its stars pill
for (const f of unitPages) {
  for (const m of source[f].matchAll(/id="stars-([\w-]+)"/g)) pillOnUnit.set(m[1], f);
}
const topics = new Set();

for (const f of topicPages) {
  const page = source[f];
  const where = rel(f);
  const scriptSrc = page.match(/<script type="module" src="([^"]+)"/)?.[1];
  if (!scriptSrc) {
    fail('topics', where, 'no module script');
    continue;
  }
  const code = source[resolve(dirname(f), scriptSrc)];
  if (!code) {
    fail('topics', where, `${scriptSrc} not found`);
    continue;
  }
  const topic = code.match(/\btopic:\s*'([\w-]+)'/)?.[1];
  if (!topic) {
    fail('topics', where, 'its script never calls createExplorer({ topic })');
    continue;
  }
  if (topics.has(topic)) fail('topics', where, `topic id “${topic}” is used twice, so their stars mix`);
  topics.add(topic);

  // Challenges: complete() ignores ids it doesn’t know, so a typo means a star
  // that never ticks.
  const challenges = [...page.matchAll(/data-challenge="([\w-]+)"/g)].map((m) => m[1]);
  if (!challenges.length) fail('topics', where, 'no “Try this!” challenges');
  if (new Set(challenges).size !== challenges.length) fail('topics', where, 'a challenge is listed twice');
  for (const id of challenges) {
    if (id === 'parts') continue; // ticks itself in js/explorer.js
    // Named in quotes, or as a key (BLOCKS = { wood: … } then complete(key)).
    if (!code.includes(`'${id}'`) && !code.includes(`"${id}"`) && !new RegExp(`\\b${id}:`).test(code)) fail('topics', where, `challenge “${id}” never completes (not in ${scriptSrc})`);
  }
  for (const m of code.matchAll(/complete\('([\w-]+)'\)/g)) {
    if (!challenges.includes(m[1])) fail('topics', where, `${scriptSrc} completes “${m[1]}”, which the page doesn’t list`);
  }

  for (const id of ['stage', 'mascot', 'info', 'info-title', 'info-text', 'try-count', 'reset-stars', 'pause', 'reset']) {
    if (!page.includes(`id="${id}"`)) fail('topics', where, `no #${id}`);
  }
  if (!/class="facts"/.test(page)) fail('topics', where, 'no “Fast facts” list');

  // The way back, and the way in.
  const back = page.match(/class="back[^"]*" href="([^"]+)"/)?.[1];
  const unit = pillOnUnit.get(topic);
  if (!unit) fail('topics', where, `no stars pill id="stars-${topic}" on any unit page`);
  else {
    const name = rel(unit).split('/').pop();
    if (!back?.endsWith(name)) fail('topics', where, `Back goes to ${back}, but its card is on ${name}`);
    const card = source[unit].includes(`href="topics/${f.split('/').pop()}"`) || source[unit].includes(`href="organisms/${f.split('/').pop()}"`);
    if (!card) fail('topics', where, `${name} has no link to it`);
  }
  for (const menu of menus) {
    if (!listed(menu).has(topic)) fail('topics', rel(menu), `data-topics is missing “${topic}”`);
  }
  // The Science page has one data-topics list per unit.
  if (!sciencePills.has(topic)) fail('topics', '10/science/index.html', `no unit card lists “${topic}”`);
  pass('topics', `${where} (${topic}, ${challenges.length} challenges)`);
}
for (const menu of menus) {
  for (const id of listed(menu)) if (!topics.has(id)) fail('topics', rel(menu), `data-topics lists “${id}”, which no page uses`);
}
for (const [id, f] of pillOnUnit) if (!topics.has(id)) fail('topics', rel(f), `stars-${id} matches no topic page`);
// A “Play now” card without a page, or a page whose card still says “Coming next”.
for (const f of unitPages) {
  for (const m of source[f].matchAll(/href="((?:topics|organisms)\/[\w-]+\.html)"/g)) {
    if (!(await isFile(join(dirname(f), m[1])))) fail('topics', rel(f), `${m[1]} doesn’t exist`);
  }
}

// ---------- css ----------

const css = await readFile(join(PUBLIC, 'css/style.css'), 'utf8');
const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
// Strip the theme blocks, then look for colors anywhere else.
const outsideThemes = css.replace(/:root(\[data-theme="light"\])?\s*\{[^}]*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
for (const m of outsideThemes.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi)) {
  const line = css.slice(0, css.indexOf(outsideThemes.slice(Math.max(0, m.index - 40), m.index + 10))).split('\n').length;
  fail('css', 'public/css/style.css', `hard-coded color ${m[0]} near line ${line}`);
}
const used = new Set([...[css, ...html.map((f) => source[f]), ...js.map((f) => source[f])].join('\n').matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
for (const v of used) {
  // A var set inline by the page (style="--wave: …") counts as defined.
  if (!defined.has(v) && !html.some((f) => source[f].includes(`${v}:`)) && !js.some((f) => source[f].includes(`'${v}'`))) {
    fail('css', 'var()', `${v} is used but never defined`);
  }
}
pass('css', `${defined.size} variables`);

// ---------- text ----------

// What she reads: the text between tags (not scripts, styles, or attributes),
// plus the strings in the JS that look like sentences.
const visible = (page) => page
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, '\n');
const british = /\b(colou?r(?<=colour)s?|favourite|centre[sd]?|organis(?:e|ed|es|ing|ation)|recognis\w*|behaviour|neighbour\w*|metre|litre|grey|realis\w*|practise|travell\w*|labelled|analys(?:e|ed))\b/i;
for (const f of html) {
  visible(source[f]).split('\n').forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (/['"]/.test(t)) fail('text', rel(f), `straight quote in “${t.slice(0, 60)}”`);
    const word = t.match(british);
    if (word) fail('text', rel(f), `British spelling “${word[0]}” in “${t.slice(0, 60)}”`);
  });
}
for (const f of js) {
  // Only quoted strings that read like sentences, so code isn’t flagged.
  for (const m of source[f].matchAll(/'((?:[^'\\\n]|\\.)*)'|`([^`]*)`/g)) {
    const s = m[1] ?? m[2];
    if (!/^[\p{Lu}“‘(].*\s.*[.!?…”’)]$/u.test(s) || /[<>{};=]/.test(s.replace(/\$\{[^}]*\}/g, ''))) continue;
    if (/\b\w+'\w*\b|"/.test(s.replace(/\$\{[^}]*\}/g, ''))) fail('text', rel(f), `straight quote in “${s.slice(0, 60)}”`);
    const word = s.match(british);
    if (word) fail('text', rel(f), `British spelling “${word[0]}” in “${s.slice(0, 60)}”`);
  }
}
pass('text', 'quotes and spelling');

// ---------- voice ----------

try {
  const { stdout } = await run(process.execPath, [join(ROOT, 'scripts/voice.mjs'), '--check'], { env: { ...process.env, ELEVENLABS_API_KEY: '' } });
  pass('voice', stdout.trim().split('\n').pop());
} catch (error) {
  const lines = error.stdout.trim().split('\n');
  for (const l of lines.slice(0, -1).slice(0, 20)) fail('voice', 'public/audio', l);
  fail('voice', 'public/audio', `${lines.pop()} Run \`mise run voice\`.`);
}

// ---------- report ----------

for (const f of failures) console.log(`✗ ${f}`);
console.log(`\n${passed} passed, ${failures.length} failed (${html.length} pages, ${js.length} scripts, ${topics.size} topics).`);
process.exitCode = failures.length ? 1 : 0;
