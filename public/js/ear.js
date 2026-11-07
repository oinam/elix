import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// The ear, cut open from the side. Play a low drum or a high whistle and
// follow it: sound waves go down the ear canal, the eardrum wiggles, three
// tiny bones pass it on, the liquid in the snail-shaped cochlea moves, and
// hair cells turn it into signals that the nerve carries to the brain. High
// sounds wiggle hair cells near the start of the cochlea; low sounds, near
// the end. Too loud hurts; ear muffs help.

const PARTS = {
  pinna: { name: 'Outer ear', text: 'The part you can see. Its curvy shape catches sound and sends it into your ear canal.' },
  canal: { name: 'Ear canal', text: 'A short tunnel into your head. Sound waves travel down it to the eardrum.' },
  eardrum: { name: 'Eardrum', text: 'A thin skin stretched tight, like a drum. When sound reaches it, it wiggles.' },
  bones: { name: 'Hammer, anvil, and stirrup', text: 'The three tiniest bones in your body. They pass the eardrum’s wiggle along, and make it stronger.' },
  cochlea: { name: 'Cochlea', text: 'A tube curled up like a snail shell, full of liquid. The wiggle makes the liquid move inside.' },
  hairs: { name: 'Hair cells', text: 'Thousands of tiny hairs inside the cochlea. When the liquid moves them, they send signals. High sounds move the ones near the start; low sounds, near the end.' },
  nerve: { name: 'Hearing nerve', text: 'It carries the signals from the hair cells to your brain, super fast.' },
  brain: { name: 'Brain', text: 'It turns the signals into the sounds you hear: a drum, a bird, a friend saying hi!' },
};

const SOUNDS = {
  low: { name: 'drum', freq: 140, rings: 0.9, line: 'Boom! A low sound: slow wiggles, far apart.' },
  high: { name: 'whistle', freq: 1800, rings: 0.35, line: 'Tweet! A high sound: fast wiggles, close together.' },
};

const STEPS = [
  { until: 1.4, text: '1 · Sound waves travel down the ear canal.' },
  { until: 2.4, text: '2 · The eardrum wiggles, and the three tiny bones pass it on.' },
  { until: 3.6, text: '3 · The liquid in the cochlea moves, and hair cells wiggle.' },
  { until: 4.6, text: '4 · The nerve carries signals to the brain.' },
  { until: 6, text: '5 · Your brain says: I hear a sound!' },
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.5, 8.6);
const TARGET_HOME = new THREE.Vector3(-0.2, 0.2, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'ear',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['canal', 'cochlea'],
  greeting: 'Your ear is a sound machine! Play a sound and follow it inside.',
  allPartsLine: 'All 8 parts! You know how hearing works.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

const skinMat = mat(0xffc2a4, { side: THREE.DoubleSide });
const canalMat = seeThrough(0xffb79a, 0.35);
const drumMat = mat(0xff9fb0, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
const boneMat = mat(0xf3ead2);
const cochleaMat = seeThrough(0xc49bff, 0.45);
const hairMat = mat(0xffffff, { emissive: 0x222222, transparent: true });
const nerveMat = mat(0xffd75e, { emissive: 0x5a4400 });
const brainMat = mat(0xf7a8c0, { emissive: 0x7a1a3a, emissiveIntensity: 0 });
const ringMat = new THREE.MeshBasicMaterial({ color: 0x5b8def, transparent: true, opacity: 0.6, depthWrite: false });
const pulseMat = mat(0xfff3a0, { emissive: 0xc8a000 });
const muffMat = mat(0x5b8def);
const quiet = new THREE.Color(0xffffff);
const busy = new THREE.Color(0xff8a2a);
const hurt = new THREE.Color(0xe8443a);

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (curve, r, material, seg = 48) => new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 12, false), material);

// ---------- The ear ----------

// Outer ear: a curved shell facing left.
const pinna = new THREE.Group();
pinna.position.set(-3.2, 0.2, 0);
const shell = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16, -Math.PI / 2, Math.PI, 0, Math.PI).scale(0.35, 1.3, 0.9), skinMat);
pinna.add(shell);
const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skinMat);
lobe.position.set(-0.05, -1.3, 0);
pinna.add(lobe);
scene.add(tagPart(pinna, 'pinna'));

const CANAL = curveOf([v(-3.05, 0, 0), v(-2.2, 0.05, 0), v(-1.2, 0, 0)]);
scene.add(tagPart(tube(CANAL, 0.32, canalMat), 'canal'));

const eardrum = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32).rotateY(Math.PI / 2), drumMat);
eardrum.position.set(-1.15, 0, 0);
scene.add(tagPart(eardrum, 'eardrum'));

// The three little bones, linked in a chain.
const bones = new THREE.Group();
bones.position.set(-0.75, 0.15, 0);
const hammer = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.4, 4, 8), boneMat);
hammer.position.set(-0.25, 0, 0);
hammer.rotation.z = 0.4;
const anvil = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.25, 4, 8), boneMat);
anvil.position.set(0.05, 0.18, 0);
anvil.rotation.z = -1.0;
const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16, Math.PI).rotateZ(-Math.PI / 2), boneMat);
stirrup.position.set(0.3, 0, 0);
bones.add(hammer, anvil, stirrup);
scene.add(tagPart(bones, 'bones'));

// The cochlea: a tube curled into a snail shell. Its start (the base) is
// next to the stirrup; its end (the tip) is in the middle of the curl.
const COCHLEA_AT = v(0.9, -0.15, 0);
const spiral = [];
for (let i = 0; i <= 60; i++) {
  const t = i / 60;
  const a = Math.PI - t * Math.PI * 2 * 2.5;
  const r = 0.75 - t * 0.6;
  spiral.push(v(COCHLEA_AT.x + Math.cos(a) * r, COCHLEA_AT.y + Math.sin(a) * r, t * 0.3));
}
const COCHLEA = curveOf(spiral);
scene.add(tagPart(tube(COCHLEA, 0.13, cochleaMat, 120), 'cochlea'));

const HAIRS = 40;
const hairs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 6), hairMat, HAIRS);
const hairT = [];
const hairM = new THREE.Matrix4();
for (let i = 0; i < HAIRS; i++) {
  const t = 0.04 + (i / (HAIRS - 1)) * 0.92;
  hairT.push(t);
  hairs.setColorAt(i, quiet);
}
hairs.renderOrder = 3; // drawn after the see-through cochlea, so their colors stay bright
scene.add(tagPart(hairs, 'hairs'));

const NERVE = curveOf([COCHLEA_AT.clone().add(v(0, 0, 0.3)), v(1.8, 0.4, 0.2), v(2.6, 1.1, 0), v(3.05, 1.35, 0)]);
scene.add(tagPart(tube(NERVE, 0.06, nerveMat, 32), 'nerve'));
const brain = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16).scale(1.2, 0.9, 1), brainMat);
brain.position.set(3.5, 1.55, 0);
scene.add(tagPart(brain, 'brain'));

// Ear muffs: a cushion over the outer ear.
const muff = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2).scale(0.6, 1.5, 1.2), muffMat);
muff.position.set(-3.5, 0.1, 0);
muff.visible = false;
scene.add(muff);

// Sound rings coming in from the left, and signal pulses on the nerve.
const RINGS = 6;
const rings = Array.from({ length: RINGS }, () => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40).rotateY(Math.PI / 2), ringMat);
  ring.visible = false;
  scene.add(ring);
  return ring;
});
const pulses = Array.from({ length: 4 }, () => {
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), pulseMat);
  pulse.visible = false;
  scene.add(pulse);
  return pulse;
});

addLabel('pinna', pinna, v(-0.3, 1.75, 0));
addLabel('canal', scene, v(-2.1, -0.6, 0));
addLabel('eardrum', scene, v(-1.15, -0.75, 0));
addLabel('bones', scene, v(-0.5, 0.9, 0));
addLabel('cochlea', scene, v(0.9, -1.15, 0));
addLabel('hairs', scene, v(1.85, -0.45, 0.3));
addLabel('nerve', scene, v(2.1, 0.35, 0.2));
addLabel('brain', scene, v(3.5, 2.4, 0));

// ---------- Sound you can hear ----------

let audio = null;
function play(freq, volume) {
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = freq < 500 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    if (freq < 500) osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.5); // a drum thump drops in pitch
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.8);
  } catch {
    // No sound here; the picture still works.
  }
}

// ---------- Controls ----------

const state = { sound: null, t: 0, loud: 4, muffs: false, slow: false, done: false };
const levelCard = document.getElementById('level-card');

bindSlider('loud', (value) => (value <= 3 ? 'soft' : value >= 9 ? 'too loud!' : 'medium'), (value) => { state.loud = value; });
bindToggle('muffs', (on) => {
  state.muffs = on;
  muff.visible = on;
  cello.say(on ? 'Ear muffs on! They soak up a lot of the sound before it gets in.' : 'Ear muffs off.', { ms: 3500, important: false });
});
bindToggle('slow', (on) => { state.slow = on; });

// How strong the sound is once it's inside, after any ear muffs.
const strength = () => (state.loud / 10) * (state.muffs ? 0.35 : 1);

document.querySelectorAll('[data-sound]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.sound;
  state.sound = key;
  state.t = 0;
  state.done = false;
  play(SOUNDS[key].freq, 0.03 + strength() * 0.25);
  cello.say(SOUNDS[key].line, { ms: 3000, important: false });
}));

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const p = new THREE.Vector3();
const tangent = new THREE.Vector3();
const q = new THREE.Quaternion();
const up = v(0, 1, 0);
const color = new THREE.Color();

stage.onFrame((dt) => {
  const s = state.sound ? SOUNDS[state.sound] : null;
  if (s) state.t += dt * (state.slow ? 0.4 : 1);
  const t = state.t;
  const power = strength();
  const wiggleSpeed = s ? (state.sound === 'high' ? 60 : 18) : 0;

  // 1. Rings travel in from the left and shrink into the canal.
  rings.forEach((ring, i) => {
    const local = s ? t - i * s.rings * 0.25 : -1;
    const on = local > 0 && local < 1.4;
    ring.visible = !!on;
    if (!on) return;
    const k = local / 1.4;
    ring.position.set(-5.2 + k * 4.0, 0, 0);
    const size = THREE.MathUtils.lerp(1.4, 0.28, Math.min(1, k * 1.4));
    ring.scale.set(1, size, size);
    ring.material.opacity = 0.3 + power * 0.5;
  });

  // 2. The eardrum and the bones wiggle.
  const shaking = s && t > 1.2 && t < 3.6;
  const wiggle = shaking ? Math.sin(t * wiggleSpeed) * power : 0;
  eardrum.scale.set(1 + wiggle * 0.3, 1, 1);
  eardrum.position.x = -1.15 + wiggle * 0.04;
  bones.rotation.z = wiggle * 0.12;

  // 3. Hair cells along the cochlea: high sounds near the start, low sounds near the end.
  const center = state.sound === 'high' ? 0.15 : 0.8;
  for (let i = 0; i < HAIRS; i++) {
    COCHLEA.getPointAt(hairT[i], p);
    COCHLEA.getTangentAt(hairT[i], tangent);
    const near = Math.exp(-((hairT[i] - center) ** 2) / 0.012);
    const active = s && t > 2.2 && t < 4 ? near * power : 0;
    const bend = active * Math.sin(t * wiggleSpeed) * 0.9;
    q.setFromUnitVectors(up, v(-tangent.y, tangent.x, 0).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), bend));
    hairM.compose(p.clone().add(v(0, 0, 0.12)), q, v(1, 1 + active, 1));
    hairs.setMatrixAt(i, hairM);
    color.copy(quiet).lerp(power > 0.85 ? hurt : busy, Math.min(1, active * 1.5));
    hairs.setColorAt(i, color);
  }
  hairs.instanceMatrix.needsUpdate = true;
  hairs.instanceColor.needsUpdate = true;

  // 4. Signals race along the nerve to the brain.
  pulses.forEach((pulse, i) => {
    const local = t - 3.4 - i * 0.18;
    pulse.visible = !!s && local > 0 && local < 1;
    if (pulse.visible) NERVE.getPointAt(local, pulse.position);
  });

  // 5. The brain lights up.
  brainMat.emissiveIntensity = s && t > 4.4 && t < 5.8 ? 0.6 : 0;

  if (s) {
    const step = STEPS.find((x) => t < x.until);
    if (step) levelCard.textContent = step.text;
    if (t >= 4.5 && !state.done) {
      state.done = true;
      const loud = power > 0.85;
      if (complete('listen')) cello.say(`Your brain says: that’s a ${s.name}! Ear canal, eardrum, bones, cochlea, nerve, brain.`, { mood: 'wow', ms: 6000 });
      if (state.sound === 'low' && complete('low')) cello.say('A low sound wiggles the hair cells near the end of the snail, in the middle of the curl.', { mood: 'wow', ms: 5500 });
      if (state.sound === 'high' && complete('high')) cello.say('A high sound wiggles different hair cells, near the start of the snail. That’s how you tell high from low!', { mood: 'wow', ms: 6000 });
      if (loud) {
        levelCard.textContent = 'Too loud! Loud sounds can hurt hair cells, and they don’t grow back.';
        if (complete('loud')) cello.say('Ouch, too loud! Very loud sounds can hurt your hair cells for good. Turn it down, or cover your ears.', { mood: 'wow', ms: 6500 });
      }
      if (state.muffs && state.loud >= 9 && complete('muffs')) {
        cello.say('The ear muffs made it much quieter inside. Your hair cells say thank you!', { mood: 'wow', ms: 5000 });
      }
    }
    if (t >= 6) {
      state.sound = null;
      state.done = false;
    }
  }
});
