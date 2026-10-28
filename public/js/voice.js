// Cello’s voice: short recorded clips, one per sentence, made ahead of time by
// scripts/voice.mjs (`mise run voice`) and served from /audio/. A line plays
// sentence by sentence; a sentence with no clip (most lines with numbers in
// them) is skipped, so the bubble still shows it.
//
// voiceSentences() and voiceKey() are shared with the generator, so both cut
// a line the same way and name each clip the same way. Nothing here touches
// the page until speak() or addVoiceToggle() runs.

// Emoji, and the joiners and variation selectors inside them, aren’t spoken.
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}︎️‍⃣]/gu;

// The spoken sentences of a line, tidied: no emoji, single spaces.
export function voiceSentences(text) {
  const clean = String(text).replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  return (clean.match(/[^.!?…]+(?:[.!?…]+[”’)"']*|$)/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => /\p{L}/u.test(s));
}

// A short, stable name for a sentence’s clip (FNV-1a, 32 bits, as hex).
export function voiceKey(sentence) {
  let h = 0x811c9dc5;
  for (let i = 0; i < sentence.length; i++) {
    h ^= sentence.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ---------- In the page ----------

const KEY = 'elix-voice';
let loading = null; // the manifest’s set of clip keys, once asked for
let current = null; // the clip playing now
let turn = 0; // bumps on every speak(), so an older line stops queueing

function loadClips() {
  loading ??= fetch('/audio/manifest.json')
    .then((r) => (r.ok ? r.json() : { clips: [] }))
    .catch(() => ({ clips: [] }))
    .then((m) => new Set(m.clips ?? []));
  return loading;
}

export function voiceOn() {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

function setVoiceOn(on) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // Private browsing can block storage; the toggle still works for this visit.
  }
  if (!on) stopSpeaking();
}

export function stopSpeaking() {
  turn++;
  current?.pause();
}

// Says a line out loud, if Voice is on and its clips exist. A new line cuts
// off the one before. Each clip gets its own Audio, so a late event from the
// last line can't end this one early.
export async function speak(text) {
  if (!voiceOn()) return;
  const mine = ++turn;
  current?.pause();
  const have = await loadClips();
  const keys = voiceSentences(text).map(voiceKey).filter((k) => have.has(k));
  for (const key of keys) {
    if (mine !== turn) return;
    const clip = new Audio(`/audio/${key}.mp3`);
    current = clip;
    const done = new Promise((resolve) => {
      for (const type of ['ended', 'error', 'pause']) clip.addEventListener(type, resolve, { once: true });
    });
    try {
      await clip.play();
    } catch {
      return; // browsers block sound until the first tap, so the greeting may stay quiet
    }
    await done;
  }
}

// A Voice on/off button in the top bar, next to Light/Dark. Only shows up
// once there are clips to play.
export async function addVoiceToggle() {
  const theme = document.querySelector('.topbar [data-theme-toggle]');
  if (!theme || document.querySelector('[data-voice-toggle]')) return;
  if (!(await loadClips()).size) return;
  const button = document.createElement('button');
  button.className = 'theme-toggle voice-toggle press';
  button.dataset.voiceToggle = '';
  const render = () => {
    const on = voiceOn();
    button.innerHTML = on ? '🔊<span class="wide-only">&nbsp;Voice</span>' : '🔇<span class="wide-only">&nbsp;Quiet</span>';
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Cello’s voice is on. Tap to turn it off' : 'Cello’s voice is off. Tap to turn it on');
  };
  button.addEventListener('click', () => {
    setVoiceOn(!voiceOn());
    render();
  });
  render();
  theme.before(button);
}
