// Cello, a friendly cell who reacts to what you do, plus a confetti burst for
// big moments. No Three.js needed, so the home page can use it too.
import { speak, addVoiceToggle } from './voice.js';

const MOUTHS = {
  happy: '<path d="M47 76 Q60 90 73 76" fill="none" stroke-width="4" stroke-linecap="round" style="stroke:var(--ink)"/>',
  wow: '<ellipse cx="60" cy="80" rx="6" ry="7" style="fill:var(--ink)"/>',
  sad: '<path d="M48 84 Q60 74 72 84" fill="none" stroke-width="4" stroke-linecap="round" style="stroke:var(--ink)"/>',
};

const BODY = `
  <g stroke-width="3" stroke-linecap="round" style="stroke:var(--ink)">
    <path d="M38 20 L33 9"/><path d="M60 13 L60 2"/><path d="M82 20 L87 9"/>
    <path d="M17 44 L6 39"/><path d="M103 44 L114 39"/>
  </g>
  <path d="M60 14 C88 12 106 34 104 62 C102 90 84 106 58 104 C32 102 14 86 16 58 C18 32 34 16 60 14 Z"
        stroke-width="4" style="fill:var(--teal);stroke:var(--ink)"/>
  <circle cx="84" cy="36" r="8" stroke-width="3" style="fill:var(--purple);stroke:var(--ink)"/>
  <g class="eye"><ellipse cx="46" cy="56" rx="9" ry="11" style="fill:#fff;stroke:var(--ink)" stroke-width="3"/>
    <circle cx="48" cy="58" r="4.5" style="fill:var(--ink)"/></g>
  <g class="eye"><ellipse cx="74" cy="56" rx="9" ry="11" style="fill:#fff;stroke:var(--ink)" stroke-width="3"/>
    <circle cx="76" cy="58" r="4.5" style="fill:var(--ink)"/></g>
  <circle cx="34" cy="74" r="5" style="fill:var(--pink)" opacity=".8"/>
  <circle cx="86" cy="74" r="5" style="fill:var(--pink)" opacity=".8"/>
`;

export function createMascot(dock) {
  const bubble = document.createElement('div');
  bubble.className = 'bubble quiet';
  bubble.setAttribute('aria-live', 'polite');
  dock.append(bubble);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 112');
  svg.setAttribute('class', 'mascot');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `${BODY}<g class="mouth">${MOUTHS.happy}</g>`;
  dock.append(svg);
  const mouth = svg.querySelector('.mouth');
  addVoiceToggle();

  let timer = null;
  let busyUntil = 0;

  // ms = 0 keeps the bubble up. important = false skips it if Cello is mid-sentence.
  function say(text, { mood = 'happy', ms = 3500, important = true } = {}) {
    const now = performance.now();
    if (!important && now < busyUntil) return;
    busyUntil = now + Math.min(ms || 3500, 2500);
    mouth.innerHTML = MOUTHS[mood];
    bubble.textContent = text;
    speak(text);
    bubble.classList.remove('quiet');
    svg.classList.remove('talk');
    void svg.getBoundingClientRect(); // restart the bob animation
    svg.classList.add('talk');
    clearTimeout(timer);
    if (ms) {
      timer = setTimeout(() => {
        bubble.classList.add('quiet');
        mouth.innerHTML = MOUTHS.happy;
      }, ms);
    }
  }

  return { say };
}

const BURST_COLORS = ['--teal', '--purple', '--yellow', '--pink', '--blue', '--green', '--orange'];

export function celebrate(container, count = 48) {
  const { width, height } = container.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'burst';
    piece.setAttribute('aria-hidden', 'true');
    const angle = Math.random() * Math.PI * 2;
    const reach = 120 + Math.random() * Math.min(width, height) * 0.45;
    piece.style.left = `${width / 2}px`;
    piece.style.top = `${height / 2}px`;
    piece.style.background = `var(${BURST_COLORS[i % BURST_COLORS.length]})`;
    piece.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * reach}px`);
    container.append(piece);
    setTimeout(() => piece.remove(), 1700);
  }
}
