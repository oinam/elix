import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Sound. Pluck a guitar string: it vibrates, and the air next to it bunches
// up (compressions) and spreads out (rarefactions) in a wave that travels to
// an ear. You hear it too: pitch and loudness change the real tone. Send the
// sound through air, water, or steel (each faster than the last), or try
// space, where there's nothing to carry it. In a thunderstorm, count the
// seconds from the flash to the rumble to find how far away it is.

const PARTS = {
  string: { name: 'Guitar string', text: 'When you pluck it, it vibrates back and forth, very fast. Every sound starts with a vibration like this.' },
  guitar: { name: 'Guitar body', text: 'The hollow wooden body vibrates along with the string, and makes the sound much louder.' },
  air: { name: 'Air particles', text: 'Tiny bits of air. They don’t travel to your ear; each one just jiggles back and forth and bumps the next one.' },
  compression: { name: 'Compression', text: 'A place where the air particles are bunched up close together. The air is squeezed here.' },
  rarefaction: { name: 'Rarefaction', text: 'A place where the air particles are spread out. Compressions and rarefactions take turns, and that’s a sound wave.' },
  ear: { name: 'Ear', text: 'The wave reaches your ear and makes your eardrum wiggle. Your brain hears that as sound!' },
};

// Real speeds in meters per second, and how fast the wave crosses the screen.
const MEDIA = {
  air: { name: 'air', speed: 343, show: 1.6, count: 1, color: 0xe8f4ff, line: 'Air: sound goes about 343 meters each second. That’s fast!' },
  water: { name: 'water', speed: 1480, show: 4.5, count: 1, color: 0x7fc4ff, line: 'Water: the particles are closer together, so sound goes about 4 times faster than in air.' },
  steel: { name: 'steel', speed: 5900, show: 12, count: 1, color: 0xb8c0cc, line: 'Steel: the particles are packed tight, so sound zooms through, about 17 times faster than in air!' },
  space: { name: 'space', speed: 0, show: 0, count: 0, color: 0x000000, line: 'Space: there’s nothing there, no air at all. So there’s nothing to carry the sound!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.8, 9.5);
const TARGET_HOME = new THREE.Vector3(0, 0.2, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'sound',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['air'],
  greeting: 'Every sound starts with a wiggle. Pluck the string and listen!',
  allPartsLine: 'All 6 parts! You know how sound gets to your ears.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const woodMat = mat(0xc98a4a);
const darkWood = mat(0x6b4429);
const stringMat = mat(0xf2f2f2, { metalness: 0.6, emissive: 0x333333 });
const airMat = mat(0xe8f4ff, { emissive: 0x4f7a98 });
const earMat = mat(0xffc2a4, { emissive: 0x6a2a10, emissiveIntensity: 0 });
const squeezeMat = new THREE.MeshBasicMaterial({ color: 0xff8fab, transparent: true, opacity: 0.32, depthWrite: false });
const spreadMat = new THREE.MeshBasicMaterial({ color: 0x5b8def, transparent: true, opacity: 0.22, depthWrite: false });

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const STRING_X = -4.3;
const EAR_X = 4.4;

// ---------- Guitar ----------

const guitar = new THREE.Group();
guitar.position.set(STRING_X - 0.15, 0, -0.3);
const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16).scale(0.75, 0.95, 0.25), woodMat);
body.position.y = -1.3;
guitar.add(body);
const hole = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), darkWood);
hole.position.set(0, -1.1, 0.26);
guitar.add(hole);
const neck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.8, 0.12), darkWood);
neck.position.y = 1.0;
guitar.add(neck);
scene.add(tagPart(guitar, 'guitar'));

// The string bends sideways (toward the air) when it vibrates.
const STRING_BOTTOM = -1.7;
const STRING_TOP = 2.3;
const stringPoints = Array.from({ length: 30 }, (_, i) => v(STRING_X, STRING_BOTTOM + ((STRING_TOP - STRING_BOTTOM) * i) / 29, 0));
let stringMesh = null;
function drawString(bend) {
  if (stringMesh) {
    scene.remove(stringMesh);
    stringMesh.geometry.dispose();
  }
  const pts = stringPoints.map((p, i) => p.clone().setX(p.x + bend * Math.sin((Math.PI * i) / 29)));
  stringMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.03, 6), stringMat);
  scene.add(tagPart(stringMesh, 'string'));
}
drawString(0);

// ---------- Air ----------

const AIR_LEFT = STRING_X + 0.3;
const AIR_RIGHT = EAR_X - 0.6;
const COLS = 56;
const ROWS = 9;
const DEPTH = 2;
const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), airMat, COLS * ROWS * DEPTH);
air.frustumCulled = false;
scene.add(tagPart(air, 'air'));
const homes = [];
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < ROWS; r++) {
    for (let d = 0; d < DEPTH; d++) {
      homes.push(v(
        AIR_LEFT + ((AIR_RIGHT - AIR_LEFT) * (c + Math.random() * 0.15)) / COLS,
        -1.6 + (3.2 * (r + Math.random() * 0.3)) / ROWS,
        -0.6 + (1.2 * (d + Math.random() * 0.8)) / DEPTH,
      ));
    }
  }
}

// See-through bands that follow one compression and one rarefaction.
const squeezeBand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 1.4), squeezeMat);
const spreadBand = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 1.4), spreadMat);
squeezeBand.visible = false;
spreadBand.visible = false;
scene.add(tagPart(squeezeBand, 'compression'), tagPart(spreadBand, 'rarefaction'));

// ---------- Ear ----------

const ear = new THREE.Group();
ear.position.set(EAR_X, 0, 0);
const outer = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 12, 32, Math.PI * 1.6).rotateY(Math.PI / 2).rotateX(Math.PI * 0.2), earMat);
outer.scale.set(1, 1.3, 1);
ear.add(outer);
const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), earMat);
lobe.position.y = -0.7;
ear.add(lobe);
const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), mat(0xffd5bd, { transparent: true, opacity: 0.4, depthWrite: false }));
head.position.x = 1.2;
ear.add(head);
scene.add(tagPart(ear, 'ear'));

addLabel('string', scene, v(STRING_X - 0.7, 2.0, 0));
addLabel('guitar', scene, v(STRING_X - 0.2, -2.6, 0));
addLabel('air', scene, v(0, 1.95, 0));
addLabel('compression', squeezeBand, v(0, -2.05, 0));
addLabel('rarefaction', spreadBand, v(0, 2.05, 0));
addLabel('ear', scene, v(EAR_X, 1.25, 0));

// ---------- Sound you can hear ----------

let audio = null;
function context() {
  try {
    audio ??= new AudioContext();
    return audio;
  } catch {
    return null;
  }
}

function playPluck(freq, volume) {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
  gain.connect(ctx.destination);
  // A string makes its note plus quieter higher notes; that's what makes it sound like a guitar.
  [[1, 1], [2, 0.4], [3, 0.2]].forEach(([n, level]) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq * n;
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(now);
    osc.stop(now + 1.9);
  });
}

function playThunder() {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  const length = 2.5;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = last * 0.98 + (Math.random() * 2 - 1) * 0.02; // rumbly, low noise
    data[i] = last * 6;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.8, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(now);
}

// ---------- Controls ----------

const PITCHES = [110, 147, 196, 262, 330, 440, 587, 784]; // notes from low A to high G
const state = {
  pitch: 3, loud: 5, medium: 'air', time: 0,
  wave: null, // { t0, strength } for the newest pluck
  heard: false, storm: null,
};
const levelCard = document.getElementById('level-card');
const speedEl = document.getElementById('speed');

const freq = () => PITCHES[state.pitch - 1];

bindSlider('pitch', (value) => `${PITCHES[value - 1]} Hz`, (value) => {
  state.pitch = value;
  if (value >= 8 && complete('high')) cello.say('Eek, so high! The string vibrates super fast, so the air waves are close together.', { mood: 'wow', ms: 5500 });
});

bindSlider('loud', (value) => (value <= 3 ? 'quiet' : value >= 9 ? 'LOUD!' : 'medium'), (value) => {
  state.loud = value;
  if (value >= 10 && complete('loud')) cello.say('Loud! A bigger vibration makes a bigger squeeze in the air. That’s a bigger amplitude.', { mood: 'wow', ms: 5500 });
});

function showSpeed() {
  const m = MEDIA[state.medium];
  speedEl.textContent = m.speed ? `Sound in ${m.name}: about ${m.speed.toLocaleString()} meters each second.` : 'Sound in space: none at all. Space is silent!';
}

document.querySelectorAll('[data-medium]').forEach((b) => b.addEventListener('click', () => {
  state.medium = b.dataset.medium;
  document.querySelectorAll('[data-medium]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const m = MEDIA[state.medium];
  air.visible = m.count > 0;
  airMat.color.set(m.color);
  state.wave = null;
  showSpeed();
  levelCard.textContent = m.line;
  cello.say(m.line, { ms: 4500, important: false });
}));

document.getElementById('pluck').addEventListener('click', () => {
  state.wave = { t0: state.time, strength: state.loud / 10 };
  state.heard = false;
  if (state.medium === 'space') {
    if (complete('space')) cello.say('The string wiggles, but there’s no air to carry the sound. In space, nobody can hear it!', { mood: 'wow', ms: 6000 });
    else cello.say('Silence! No air, no sound.', { ms: 2500, important: false });
    levelCard.textContent = 'The string vibrates, but there’s nothing around it to pass the wiggle along.';
    return;
  }
  // Delay the sound a little in air, less in water and steel, so you hear the difference.
  const delay = (AIR_RIGHT - AIR_LEFT) / MEDIA[state.medium].show;
  setTimeout(() => playPluck(freq(), 0.04 + state.loud * 0.02), delay * 1000);
});

document.getElementById('storm').addEventListener('click', () => {
  if (state.storm) return;
  const seconds = 3 + Math.floor(Math.random() * 4) * 3; // 3, 6, 9, or 12 seconds: 1 to 4 km
  state.storm = { flash: 0.35, wait: seconds, t: 0, sky: scene.background.clone() };
  levelCard.textContent = 'Flash! Count the seconds until you hear the thunder…';
  cello.say('Flash! Count with me…', { ms: 2500 });
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const m4 = new THREE.Matrix4();
const p = new THREE.Vector3();
const flashColor = new THREE.Color(0xffffff);

stage.onFrame((dt) => {
  state.time += dt;
  const w = state.wave;
  const med = MEDIA[state.medium];
  const age = w ? state.time - w.t0 : Infinity;
  // The vibration dies away over about four seconds.
  const fade = w ? Math.max(0, 1 - age / 4) : 0;
  const visualLength = 2.6 / Math.sqrt(state.pitch); // higher pitch, shorter waves
  const k = (Math.PI * 2) / visualLength;
  const amp = (w ? w.strength : 0) * 0.5;

  // The string wobbles quickly while it's ringing.
  drawString(fade > 0 ? amp * fade * Math.sin(age * (10 + state.pitch * 4)) : 0);

  // Air particles jiggle back and forth where the wave has reached.
  const front = AIR_LEFT + med.show * age;
  const omega = med.show * k;
  if (air.visible) {
    for (let i = 0; i < homes.length; i++) {
      const h = homes[i];
      let dx = 0;
      if (w && h.x < front) {
        const behind = front - h.x;
        const tail = Math.max(0, 1 - behind / (med.show * 4)); // the wave's end, when the string stopped
        dx = amp * tail * Math.sin(k * (h.x - AIR_LEFT) - omega * age);
      }
      p.copy(h).setX(h.x + dx);
      air.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
    }
    air.instanceMatrix.needsUpdate = true;
  }

  // Bands mark one compression and one rarefaction behind the front.
  const reached = w && air.visible && front > AIR_LEFT + 1;
  squeezeBand.visible = !!reached && fade > 0.1;
  spreadBand.visible = squeezeBand.visible;
  if (squeezeBand.visible) {
    const target = Math.min(front - visualLength, (AIR_LEFT + AIR_RIGHT) / 2);
    const phaseAt = (x, offset) => {
      const n = Math.round((k * (x - AIR_LEFT) - omega * age - offset) / (Math.PI * 2));
      return AIR_LEFT + (offset + Math.PI * 2 * n + omega * age) / k;
    };
    // Particles crowd together where the wave's phase is half a turn, and
    // spread apart where it's zero.
    squeezeBand.position.x = phaseAt(target, Math.PI);
    spreadBand.position.x = phaseAt(target, 0);
  }

  // The ear glows when the wave arrives.
  const arrived = w && air.visible && front >= AIR_RIGHT && age < (AIR_RIGHT - AIR_LEFT) / med.show + 2;
  earMat.emissiveIntensity = arrived ? 0.5 : 0;
  if (arrived && !state.heard) {
    state.heard = true;
    if (complete('pluck')) {
      levelCard.textContent = 'The air bunched up and spread out, passing the wiggle all the way to the ear.';
      cello.say('You heard it! The air passed the wiggle along, bit by bit, all the way to the ear.', { mood: 'wow', ms: 5500 });
    }
    if (state.medium === 'steel' && complete('steel')) {
      cello.say('Zoom! Sound goes much faster through steel than through air.', { mood: 'wow', ms: 4500 });
    }
  }

  // Thunderstorm: a flash, then thunder after a few seconds.
  const storm = state.storm;
  if (storm) {
    storm.t += dt;
    if (storm.flash > 0) {
      storm.flash -= dt;
      scene.background.copy(storm.sky).lerp(flashColor, storm.flash > 0 ? 0.7 : 0);
    }
    const counted = Math.floor(storm.t);
    if (storm.t < storm.wait) {
      levelCard.textContent = `⚡ Counting… ${counted} ${counted === 1 ? 'second' : 'seconds'}`;
    } else {
      playThunder();
      const km = storm.wait / 3;
      levelCard.textContent = `Boom! ${storm.wait} seconds. Sound goes about 1 km in 3 seconds, so the storm is about ${km} km away.`;
      if (complete('storm')) cello.say(`Rumble! ${storm.wait} seconds, divided by 3, makes about ${km} kilometers away. Light got here first!`, { mood: 'wow', ms: 7000 });
      else cello.say(`About ${km} kilometers away!`, { ms: 3500, important: false });
      state.storm = null;
    }
  }
});

showSpeed();
