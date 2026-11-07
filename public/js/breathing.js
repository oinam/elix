import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';
import { voiceOn } from './voice.js';

// The respiratory system. A see-through chest breathes all by itself: the
// diaphragm pulls down, the ribs lift, the lungs fill, and air streams in
// through the nose, the voice box, the windpipe, and the bronchi into smaller
// and smaller tubes. Follow one breath step by step, say “aaah” to buzz the
// vocal cords, catch dust in the nose, and see how a mask helps on smoky days.

const PARTS = {
  nose: { name: 'Nose', text: 'Air comes in here. Tiny hairs and sticky mucus catch dust and germs, and the air gets warmed up on its way in.' },
  larynx: { name: 'Voice box (larynx)', text: 'At the top of your windpipe. It has two vocal cords. When air rushes out past them, they buzz. That’s your voice!' },
  trachea: { name: 'Windpipe (trachea)', text: 'A tube from your throat to your chest. Stiff rings keep it open, so air can always get through.' },
  bronchi: { name: 'Bronchi', text: 'The windpipe splits into two tubes, one for each lung. Just one is called a bronchus.' },
  bronchioles: { name: 'Smaller tubes (bronchioles)', text: 'The tubes keep splitting, smaller and smaller, like the branches of an upside-down tree. They carry air to every part of the lungs.' },
  lungs: { name: 'Lungs', text: 'Two spongy bags full of tiny air sacs. Here, oxygen goes into your blood, and carbon dioxide comes out.' },
  diaphragm: { name: 'Diaphragm', text: 'A dome of muscle under your lungs. It pulls down to breathe in, and relaxes up to breathe out.' },
  ribs: { name: 'Ribs', text: 'Bones that make a cage around your lungs and heart to protect them. They lift up and out a little when you breathe in.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(2.4, 2.2, 9.8);
const TARGET_HOME = new THREE.Vector3(0, 1.3, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'breathing',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['ribs', 'lungs'], // taps reach the tubes inside the lungs
  greeting: 'In, and out. You breathe all day without thinking! Let’s follow the air.',
  allPartsLine: 'All 8 parts! You know the whole path of air.',
  onPart: (key) => {
    if (key === 'diaphragm' && explorer.complete('diaphragm')) {
      explorer.cello.say('The diaphragm pulls down, and air rushes in. It relaxes up, and air goes out.', { mood: 'wow', ms: 5500 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false });

const skinMat = seeThrough(0xffd5bd, 0.16);
const noseMat = seeThrough(0xffc2a4, 0.6);
const airwayMat = mat(0xbfe3ff);
const ringMat = mat(0xe8f4ff);
const larynxMat = mat(0xf2b6a0, { emissive: 0x7a2a10, emissiveIntensity: 0 });
const lungMat = seeThrough(0xff9fb0, 0.4);
const lungPink = new THREE.Color(0xff9fb0);
const lungSooty = new THREE.Color(0x9a8a8e);
const twigMat = mat(0xffd1dc);
const diaphragmMat = mat(0xc4534a, { side: THREE.DoubleSide });
const ribMat = seeThrough(0xf3ead2, 0.55);
const airIn = new THREE.Color(0xdff6ff);
const airOut = new THREE.Color(0x9aa0aa);
const airMat = mat(0xdff6ff, { emissive: 0x4f8aa8 });
const tripMat = mat(0xfff3a0, { emissive: 0xc8a000 });
const dustMat = mat(0x9b7a52);
const smokeMat = seeThrough(0x777b82, 0.5);
const maskMat = mat(0x8fd0c8);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (points, radius, material) => new THREE.Mesh(new THREE.TubeGeometry(curveOf(points), 24, radius, 10, false), material);

// ---------- The body ----------

const body = new THREE.Group();
scene.add(body);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 24).scale(0.9, 1.05, 1), skinMat);
head.position.set(0, 3.5, 0);
body.add(head);
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.8, 24), skinMat);
neck.position.y = 2.5;
body.add(neck);
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.35, 1.6, 8, 32).scale(1, 1, 0.6), skinMat);
torso.position.y = 0.6;
body.add(torso);

const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 16).rotateX(Math.PI / 2 + 0.5), noseMat);
nose.position.set(0, 3.42, 0.86);
body.add(tagPart(nose, 'nose'));

// The airway: nostril, behind the nose, down the throat, the voice box, the windpipe.
const NOSTRIL = v(0, 3.25, 0.98);
const THROAT = [NOSTRIL, v(0, 3.4, 0.55), v(0, 3.25, 0.15), v(0, 2.8, 0.02), v(0, 2.3, 0)];
body.add(tagPart(tube(THROAT, 0.08, airwayMat), 'nose'));

const larynx = new THREE.Group();
larynx.position.set(0, 2.15, 0.02);
larynx.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.32, 20), larynxMat));
const cords = [-1, 1].map((side) => {
  const cord = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.22), mat(0xfff0e8));
  cord.position.set(side * 0.06, 0.02, 0.0);
  larynx.add(cord);
  return cord;
});
body.add(tagPart(larynx, 'larynx'));

const TRACHEA_TOP = 1.98;
const SPLIT = v(0, 0.95, 0);
const trachea = tube([v(0, TRACHEA_TOP, 0), SPLIT], 0.11, airwayMat);
body.add(tagPart(trachea, 'trachea'));
for (let y = TRACHEA_TOP - 0.06; y > SPLIT.y + 0.05; y -= 0.11) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 20).rotateX(Math.PI / 2), ringMat);
  ring.position.y = y;
  body.add(tagPart(ring, 'trachea'));
}

// Two lungs, each with a bronchus and a tree of smaller tubes.
const lungs = [];
const tips = [[], []]; // where the smallest tubes end, per lung
[-1, 1].forEach((side, s) => {
  const lung = new THREE.Group();
  lung.position.set(side * 0.78, 0.35, 0);
  body.add(lung);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24).scale(side < 0 ? 0.68 : 0.74, 1.15, 0.6), lungMat);
  lung.add(tagPart(bag, 'lungs'));
  lungs.push(lung);

  const start = SPLIT.clone().sub(lung.position);
  const end = v(-side * 0.2, 0.35, 0);
  lung.add(tagPart(tube([start, start.clone().lerp(end, 0.5).add(v(0, 0.05, 0)), end], 0.075, airwayMat), 'bronchi'));

  // Branch three times: each tube splits in two.
  function branch(from, dir, length, radius, depth) {
    const to = from.clone().add(dir.clone().multiplyScalar(length));
    lung.add(tagPart(tube([from, from.clone().lerp(to, 0.5), to], radius, twigMat), 'bronchioles'));
    if (depth === 0) {
      tips[s].push(to);
      return;
    }
    [-0.5, 0.5].forEach((turn) => {
      const d = dir.clone().applyAxisAngle(v(0, 0, 1), turn + rand(-0.15, 0.15)).applyAxisAngle(v(0, 1, 0), rand(-0.6, 0.6));
      branch(to, d, length * 0.68, radius * 0.7, depth - 1);
    });
  }
  [v(side * 0.3, 0.9, 0), v(side * 0.6, -0.2, 0.1), v(side * 0.1, -1, -0.1)].forEach((d) => branch(end, d.normalize(), 0.42, 0.045, 3));
});

// Ribs: arcs around the chest.
const ribs = new THREE.Group();
body.add(ribs);
for (let i = 0; i < 6; i++) {
  const rib = new THREE.Mesh(new THREE.TorusGeometry(1.25 - Math.abs(i - 2) * 0.06, 0.04, 6, 40, Math.PI * 1.7).rotateX(Math.PI / 2).rotateY(Math.PI * 0.65), ribMat);
  rib.scale.z = 0.62;
  rib.position.y = 1.35 - i * 0.32;
  ribs.add(tagPart(rib, 'ribs'));
}

// The diaphragm: a dome of muscle under the lungs.
const diaphragm = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.42).scale(1, 0.85, 0.62), diaphragmMat);
const DIAPHRAGM_Y = -1.25;
diaphragm.position.y = DIAPHRAGM_Y;
body.add(tagPart(diaphragm, 'diaphragm'));

// A mask over the nose and mouth.
const mask = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.3, Math.PI * 0.45).scale(1.1, 0.8, 1), maskMat);
mask.position.set(0, 3.3, 0.45);
mask.visible = false;
body.add(mask);

// ---------- Air ----------

// Air paths: nostril, throat, windpipe, a bronchus, out to a tube tip.
body.updateMatrixWorld(true);
const airPaths = [];
tips.forEach((list, s) => {
  list.filter((t, i) => i % 3 === 0).forEach((tip) => {
    const lung = lungs[s];
    const world = (p) => lung.localToWorld(p.clone());
    airPaths.push(curveOf([...THROAT, v(0, TRACHEA_TOP, 0), SPLIT, world(v(-Math.sign(lung.position.x) * 0.2, 0.35, 0)), world(tip)]));
  });
});
const AIR = airPaths.length * 3;
const air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), airMat, AIR);
air.frustumCulled = false;
scene.add(air);

// One breath, followed step by step.
const TRIP = [
  { to: 1 / 6, line: 'Air comes in through your nose. Hairs and mucus catch the dust.' },
  { to: 2 / 6, line: 'Down the throat, past the voice box (larynx).' },
  { to: 3 / 6, line: 'Down the windpipe (trachea). Its rings keep it open.' },
  { to: 4 / 6, line: 'The windpipe splits into two bronchi, one for each lung.' },
  { to: 5 / 6, line: 'The tubes get smaller and smaller, to reach every part of the lung.' },
  { to: 1, line: 'At the very end: tiny air sacs. Oxygen jumps into your blood here!' },
];
const tripBall = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), tripMat);
tripBall.visible = false;
scene.add(tripBall);
const tripPath = airPaths[airPaths.length - 1];

// Dust that gets caught in the nose, and smoke all around.
const dust = Array.from({ length: 14 }, () => {
  const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), dustMat);
  d.visible = false;
  scene.add(d);
  return d;
});
const SMOKE = 40;
const smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), smokeMat, SMOKE);
smoke.frustumCulled = false;
smoke.visible = false;
scene.add(smoke);
const puffs = Array.from({ length: SMOKE }, () => ({ p: v(rand(-2.5, 2.5), rand(2.4, 4.6), rand(0.6, 2.4)), t: Math.random() }));

addLabel('nose', body, v(0.55, 3.45, 0.9));
addLabel('larynx', body, v(-0.7, 2.15, 0.1));
addLabel('trachea', body, v(0.55, 1.55, 0.1));
addLabel('bronchi', body, v(0, 0.75, 0.5));
addLabel('bronchioles', body, v(1.45, -0.15, 0.4));
addLabel('lungs', body, v(-1.35, 1.2, 0.3));
addLabel('diaphragm', body, v(1.2, -1.2, 0.5));
addLabel('ribs', body, v(-1.5, -0.4, 0.4));

// ---------- Controls ----------

const state = {
  pace: 1, phase: 0, // the breath: 0–0.45 breathing in, 0.45–1 breathing out
  trip: null, aah: 0, dust: 0, smoke: false, mask: false, soot: 0, maskTime: 0, watched: 0,
};
const levelCard = document.getElementById('level-card');
const perMinute = () => 12 + state.pace * 3;

bindSlider('pace', (value) => `${perMinute()} breaths a minute`, (value) => {
  state.pace = value;
  if (value >= 10 && complete('run')) {
    cello.say('Running! Your muscles need lots more oxygen, so you breathe faster and deeper.', { mood: 'wow', ms: 5500 });
  }
});

document.getElementById('follow').addEventListener('click', () => {
  state.trip = { step: 0, t: 0 };
  tripBall.visible = true;
  tripStep();
});

function tripStep() {
  const { line } = TRIP[state.trip.step];
  levelCard.textContent = `${state.trip.step + 1} of 6 · ${line}`;
  cello.say(line, { ms: 3800 });
}

// A buzzy “aaah”: air rushing out past the vocal cords.
let audio = null;
function buzz() {
  if (!voiceOn()) return;
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 240;
    const lfo = audio.createOscillator();
    const wobble = audio.createGain();
    lfo.frequency.value = 5;
    wobble.gain.value = 6;
    lfo.connect(wobble).connect(osc.frequency);
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, audio.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, audio.currentTime + 1.4);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    lfo.start();
    osc.stop(audio.currentTime + 1.5);
    lfo.stop(audio.currentTime + 1.5);
  } catch {
    // No sound here; the picture still buzzes.
  }
}

document.getElementById('aah').addEventListener('click', () => {
  state.aah = 1.5;
  state.phase = 0.5; // a voice rides on air going out
  buzz();
  levelCard.textContent = 'Air rushing out makes the vocal cords in your voice box buzz.';
  if (complete('voice')) cello.say('Aaah! Air going out makes your vocal cords buzz. That’s your voice!', { mood: 'wow', ms: 5000 });
});

document.getElementById('dust').addEventListener('click', () => {
  state.dust = 6;
  dust.forEach((d, i) => {
    d.visible = true;
    d.userData.from = v(rand(-1.2, 1.2), rand(2.6, 4), rand(2, 3));
    d.userData.to = NOSTRIL.clone().add(v(rand(-0.08, 0.08), rand(0, 0.15), rand(-0.25, 0)));
    d.userData.delay = i * 0.08;
  });
  cello.say('Dusty! Watch your nose.', { ms: 2500, important: false });
});

bindToggle('smoke', (on) => {
  state.smoke = on;
  smoke.visible = on;
  if (on && !state.mask) {
    levelCard.textContent = 'Smoky air has tiny bits that can hurt your lungs and make breathing hard.';
    cello.say('Cough! Smoky air isn’t good for lungs. What could help?', { ms: 4500 });
  } else if (!on) {
    cello.say('Fresh air again. Lungs clean themselves, slowly.', { ms: 3500, important: false });
  }
});

bindToggle('mask', (on) => {
  state.mask = on;
  mask.visible = on;
  cello.say(on ? 'A good mask catches lots of the tiny smoke bits.' : 'Mask off.', { ms: 3500, important: false });
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const ease = (dt, rate) => 1 - Math.exp(-dt * rate);

stage.onFrame((dt) => {
  // The breath: in for a bit less than half, then out.
  state.phase = (state.phase + dt * (perMinute() / 60)) % 1;
  const inhaling = state.phase < 0.45;
  const fill = inhaling ? Math.sin((state.phase / 0.45) * Math.PI / 2) : Math.cos(((state.phase - 0.45) / 0.55) * Math.PI / 2);
  const depth = 0.08 + state.pace * 0.012;
  lungs.forEach((l) => l.scale.set(1 + fill * depth, 1 + fill * depth * 1.3, 1 + fill * depth));
  diaphragm.position.y = DIAPHRAGM_Y - fill * (0.15 + state.pace * 0.02);
  diaphragm.scale.y = 1 - fill * 0.35;
  ribs.position.y = fill * 0.06;
  ribs.scale.set(1 + fill * depth * 0.4, 1, 1 + fill * depth * 0.6);

  // Air streams in while breathing in, and back out (with carbon dioxide).
  airMat.color.copy(inhaling ? airIn : airOut);
  for (let i = 0; i < AIR; i++) {
    const path = airPaths[i % airPaths.length];
    const lag = Math.floor(i / airPaths.length) * 0.12;
    const t = THREE.MathUtils.clamp(fill * 1.15 - lag, 0, 1);
    path.getPointAt(t, p);
    const s = t > 0.02 && t < 0.98 ? 1 : 0;
    air.setMatrixAt(i, m.makeScale(s, s, s).setPosition(p));
  }
  air.instanceMatrix.needsUpdate = true;

  // The voice box buzzes.
  state.aah = Math.max(0, state.aah - dt);
  const shake = state.aah > 0 ? Math.sin(performance.now() / 12) * 0.012 : 0;
  cords.forEach((c, i) => { c.position.x = (i ? 1 : -1) * (0.04 + shake); });
  larynxMat.emissiveIntensity = state.aah > 0 ? 0.6 : 0;

  // Follow one breath.
  if (state.trip) {
    const trip = state.trip;
    const from = trip.step ? TRIP[trip.step - 1].to : 0;
    trip.t = Math.min(1, trip.t + dt / 3);
    tripPath.getPointAt(from + (TRIP[trip.step].to - from) * trip.t, tripBall.position);
    if (trip.t >= 1) {
      if (trip.step === TRIP.length - 1) {
        state.trip = null;
        tripBall.visible = false;
        if (complete('breath')) cello.say('All the way in! Nose, voice box, windpipe, bronchi, smaller tubes, and air sacs.', { mood: 'wow', ms: 6000 });
      } else {
        trip.step += 1;
        trip.t = 0;
        tripStep();
      }
    }
  }

  // Dust flies in and sticks in the nose.
  if (state.dust > 0) {
    state.dust -= dt;
    const age = 6 - state.dust;
    dust.forEach((d) => {
      const t = THREE.MathUtils.clamp((age - d.userData.delay) / 1.5, 0, 1);
      d.position.lerpVectors(d.userData.from, d.userData.to, t);
      d.visible = state.dust > 0;
    });
    if (age > 2 && complete('dust')) {
      levelCard.textContent = 'Nose hairs and sticky mucus trap dust, so it doesn’t reach your lungs.';
      cello.say('Caught! Nose hairs and sticky mucus trap the dust. Achoo!', { mood: 'wow', ms: 5000 });
    }
  }

  // Smoke drifts toward the nose. A mask stops most of it.
  if (state.smoke) {
    puffs.forEach((puff, i) => {
      puff.t = (puff.t + dt * 0.25) % 1;
      const stop = state.mask ? 0.75 : 1;
      p.lerpVectors(puff.p, NOSTRIL, Math.min(puff.t, stop));
      const s = 1 - puff.t * 0.6;
      smoke.setMatrixAt(i, m.makeScale(s, s, s).setPosition(p));
    });
    smoke.instanceMatrix.needsUpdate = true;
  }
  state.soot += ((state.smoke && !state.mask ? 1 : 0) - state.soot) * ease(dt, state.smoke ? 0.15 : 0.05);
  lungMat.color.copy(lungPink).lerp(lungSooty, state.soot * 0.8);
  if (state.smoke && state.mask) {
    state.maskTime += dt;
    if (state.maskTime > 2.5 && complete('mask')) {
      levelCard.textContent = 'Masks, fewer fires and fumes, and more trees all help keep air clean.';
      cello.say('Much better! The mask catches the smoke before it gets in.', { mood: 'wow', ms: 5000 });
    }
  }
});
