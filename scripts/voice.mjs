// Makes Cello’s voice clips with ElevenLabs, ahead of time, so the site never
// calls ElevenLabs and the key never leaves this machine.
//
//   mise run voice           # no key yet: a dry run (how many lines, how many characters)
//                            # with ELEVENLABS_API_KEY: makes the missing clips
//   mise run voice -- --list # print every sentence it would voice
//   mise run voices          # British female voices on your account, to pick from
//
// It reads every sentence-like string in public/js/*.js (the home, menu, and
// 404 pages keep their lines inline and stay quiet), cuts them into sentences
// the way js/voice.js does, and keeps one clip per sentence in public/audio/<key>.mp3. Clips that
// no line uses any more are removed. public/audio/manifest.json lists the
// clips, so the page only asks for clips that exist.
//
// Settings (mise.local.toml, or the [env] in mise.toml):
//   ELEVENLABS_API_KEY   needed to make clips
//   ELEVENLABS_VOICE_ID  the voice; if unset, the one in the manifest, or else
//                        the first British female premade voice on the account
//   ELEVENLABS_MODEL     default eleven_multilingual_v2
import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { voiceSentences, voiceKey } from '../public/js/voice.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const AUDIO = join(PUBLIC, 'audio');
const MANIFEST = join(AUDIO, 'manifest.json');
const API = 'https://api.elevenlabs.io';
const KEY = process.env.ELEVENLABS_API_KEY;
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const args = new Set(process.argv.slice(2));

// How a word should sound, where the spelling misleads: Cello is a cell, so
// “sell-o”, not the instrument.
const SAY_AS = [[/\bCello\b/g, 'Sello'], [/\bCello’s\b/g, 'Sello’s']];

// ---------- Collect the lines ----------

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(path)));
    else out.push(path);
  }
  return out;
}

// The string literals in a piece of JS, skipping comments. Each template's
// ${…} parts become \0, so sentences built around them can be dropped.
function strings(code) {
  const found = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') {
      i = code.indexOf('\n', i);
      if (i < 0) break;
      continue;
    } else if (c === '/' && code[i + 1] === '*') {
      i = code.indexOf('*/', i + 2) + 2;
      if (i < 2) break;
      continue;
    } else if (c === '/' && /[(,=:[!&|?{};]\s*$|return\s*$|^\s*$/.test(code.slice(Math.max(0, i - 8), i))) {
      // A regex literal, which may hold quote marks: skip to its closing /.
      let inClass = false;
      for (i++; i < code.length && (code[i] !== '/' || inClass); i++) {
        if (code[i] === '\\') i++;
        else if (code[i] === '[') inClass = true;
        else if (code[i] === ']') inClass = false;
      }
    } else if (c === "'" || c === '"' || c === '`') {
      const before = code.slice(Math.max(0, i - 12), i);
      let text = '';
      let j = i + 1;
      while (j < code.length && code[j] !== c) {
        if (code[j] === '\\') {
          text += code[j + 1];
          j += 2;
        } else if (c === '`' && code[j] === '$' && code[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < code.length && depth) {
            if (code[j] === '{') depth++;
            else if (code[j] === '}') depth--;
            j++;
          }
          text += '\0';
        } else {
          text += code[j++];
        }
      }
      found.push({ text, isName: /\bname:\s*$/.test(before) });
      i = j;
    }
    i++;
  }
  return found;
}

// A sentence worth voicing: reads like words, ends like a sentence.
const looksSpoken = (s) => !s.includes('\0')
  && /^[\p{Lu}\d“‘"(]/u.test(s)
  && /[.!?…][”’)"']*$/.test(s)
  && !/[<>{}#;=\\/_|]/.test(s)
  && s.length <= 400;

async function collect() {
  const sentences = new Map(); // key → sentence
  const add = (s) => { if (looksSpoken(s)) sentences.set(voiceKey(s), s); };
  for (const path of await files(join(PUBLIC, 'js'))) {
    if (!path.endsWith('.js')) continue;
    const code = await readFile(path, 'utf8');
    for (const { text, isName } of strings(code)) {
      // A part's name is read out as the first sentence of its card.
      if (isName && !text.includes('\0')) add(voiceSentences(`${text}.`)[0] ?? '');
      voiceSentences(text).forEach(add);
    }
  }
  return sentences;
}

// ---------- ElevenLabs ----------

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'xi-api-key': KEY, ...init.headers } });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status} on ${path.split('?')[0]}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function britishFemaleVoices() {
  const voices = [];
  let token = '';
  do {
    const q = new URLSearchParams({ page_size: '100', ...(token && { next_page_token: token }) });
    const page = await (await api(`/v2/voices?${q}`)).json();
    voices.push(...page.voices);
    token = page.has_more ? page.next_page_token : '';
  } while (token);
  return voices.filter((v) => /brit|english \(uk\)|\buk\b/i.test(v.labels?.accent ?? '')
    && /female|woman/i.test(v.labels?.gender ?? ''));
}

async function chooseVoice(manifest) {
  if (process.env.ELEVENLABS_VOICE_ID) return process.env.ELEVENLABS_VOICE_ID;
  if (manifest.voice) return manifest.voice;
  const voices = await britishFemaleVoices();
  const pick = voices.find((v) => v.category === 'premade') ?? voices[0];
  if (!pick) throw new Error('No British female voice on this account. Set ELEVENLABS_VOICE_ID (see `mise run voices`).');
  console.log(`Voice: ${pick.name} (${pick.voice_id}). Set ELEVENLABS_VOICE_ID to choose another.`);
  return pick.voice_id;
}

async function makeClip(voice, sentence, key) {
  let text = sentence;
  for (const [from, to] of SAY_AS) text = text.replace(from, to);
  const res = await api(`/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  await writeFile(join(AUDIO, `${key}.mp3`), Buffer.from(await res.arrayBuffer()));
}

// ---------- Run ----------

async function readManifest() {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    return { clips: [] };
  }
}

async function writeManifest(voice, keys) {
  const body = { voice, model: MODEL, clips: [...keys].sort() };
  await writeFile(MANIFEST, `${JSON.stringify(body, null, 2)}\n`);
}

async function main() {
  if (args.has('--voices')) {
    if (!KEY) throw new Error('Set ELEVENLABS_API_KEY in mise.local.toml first.');
    for (const v of await britishFemaleVoices()) {
      console.log(`${v.voice_id}  ${v.name}  (${v.category}; ${Object.values(v.labels ?? {}).join(', ')})`);
    }
    return;
  }

  const sentences = await collect();
  if (args.has('--list')) {
    for (const [key, s] of sentences) console.log(`${key}  ${s}`);
  }
  await mkdir(AUDIO, { recursive: true });
  const manifest = await readManifest();
  const onDisk = new Set((await readdir(AUDIO)).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
  const voice = KEY ? await chooseVoice(manifest) : manifest.voice;
  // A new voice or model means every clip is made again.
  const redo = args.has('--redo') || (KEY && manifest.voice && (manifest.voice !== voice || manifest.model !== MODEL));
  const missing = [...sentences].filter(([key]) => redo || !onDisk.has(key));
  const chars = missing.reduce((n, [, s]) => n + s.length, 0);
  console.log(`${sentences.size} sentences; ${missing.length} to make (${chars.toLocaleString()} characters).`);

  if (!KEY) {
    console.log('Dry run: add ELEVENLABS_API_KEY to mise.local.toml to make the clips.');
    return;
  }

  const made = new Set([...onDisk].filter((k) => sentences.has(k) && !redo));
  let next = 0;
  let failed = 0;
  async function worker() {
    while (next < missing.length) {
      const [key, sentence] = missing[next++];
      try {
        await makeClip(voice, sentence, key);
        made.add(key);
        process.stdout.write(`\r${made.size} of ${sentences.size} clips`);
      } catch (error) {
        failed++;
        console.error(`\n${error.message}\n  (${sentence})`);
        if (/ 40[13] /.test(error.message)) throw error; // bad key or out of credits: stop
      }
    }
  }
  try {
    await Promise.all([worker(), worker()]); // two at a time: what lower ElevenLabs tiers allow
  } finally {
    // Keep what was made, even if a run stops halfway.
    await writeManifest(voice, made);
  }
  for (const key of onDisk) {
    if (!sentences.has(key)) await unlink(join(AUDIO, `${key}.mp3`));
  }
  console.log(`\nDone: ${made.size} clips${failed ? `, ${failed} failed (run again to retry)` : ''}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
