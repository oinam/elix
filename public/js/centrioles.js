import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';
import { glass, solid, seeded, makeNucleus, makeCentriolePair } from './cellparts.js';

// Centrioles up close (nine bundles of three tubes), then at work: a cell
// splitting in two, step by step. A plant cell splits without them.

const PARTS = {
  centrioles: { name: 'Centrioles', text: 'Two tiny tubes at right angles, next to the nucleus. When the cell gets ready to split, they help set up the spindle.' },
  microtubules: { name: 'Tiny tubes (microtubules)', text: 'Each centriole is a ring of 9 bundles, with 3 tiny tubes in each bundle. From the end, it looks like a pinwheel.' },
  centrosome: { name: 'Centrosome', text: 'The fuzzy cloud around the two centrioles. Spindle fibers grow out from here.' },
  spindle: { name: 'Spindle fibers', text: 'Long threads that grow from each end of the cell. They grab the chromosomes and pull them apart.' },
  chromosomes: { name: 'Chromosomes', text: 'Each X is a chromosome and its copy. The spindle pulls every X in half, so each new cell gets one of each.' },
  nucleus: { name: 'Nucleus', text: 'The control center. Its skin melts away while the cell splits, then a new nucleus forms in each new cell.' },
  membrane: { name: 'Cell membrane', text: 'The cell’s skin. At the end, an animal cell pinches in the middle to make two cells.' },
};

const STEPS = [
  { name: 'Resting', text: 'Resting: the cell is busy just living. Its centrioles wait by the nucleus.' },
  { name: 'Copy', text: 'Copy: the pair of centrioles makes a copy. Now there are two pairs.', plant: 'Copy: plant cells have no centrioles, but they copy their threads and get ready too.' },
  { name: 'Get ready', text: 'Get ready: the pairs move to opposite ends. The threads coil into X shapes, and the nucleus’s skin melts away.', plant: 'Get ready: the threads coil into X shapes, and the nucleus’s skin melts away.' },
  { name: 'Line up', text: 'Line up: spindle fibers grow from each end, grab the chromosomes, and line them up in the middle.' },
  { name: 'Pull apart', text: 'Pull apart: the fibers pull every X in half, one half to each end.' },
  { name: 'Two cells', text: 'Two cells: a new nucleus forms at each end, and the cell pinches in two!', plant: 'Two cells: a new nucleus forms at each end, and a new wall grows across the middle!' },
];

const COUNT_QUESTIONS = [
  { ask: 'How many bundles of tubes make one centriole?', options: [3, 6, 9, 12], answer: 9 },
  { ask: 'How many tiny tubes are in each bundle?', options: [2, 3, 4, 5], answer: 3 },
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const HOME = {
  close: { camera: new THREE.Vector3(0.8, 2.2, 7.4), target: new THREE.Vector3(0, 0, 0) },
  cell: { camera: new THREE.Vector3(0, 1.2, 9.4), target: new THREE.Vector3(0, 0, 0) },
};
camera.position.copy(HOME.close.camera);

const explorer = createExplorer({
  topic: 'centrioles',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['membrane', 'centrosome', 'nucleus'],
  greeting: 'These two tiny tubes are centrioles! Tap In a cell to see how they help a cell split.',
  allPartsLine: 'All 7 parts! You could teach this to your class.',
});
const { addLabel, tagPart, showLabels, complete, cello } = explorer;

const smooth = (s, a, b) => THREE.MathUtils.smoothstep(s, a, b);

// ---------- Up close: one pair, big ----------

const close = new THREE.Group();
scene.add(close);

const bigPair = makeCentriolePair(2.4);
bigPair.position.set(-0.65, -0.1, 0);
close.add(tagPart(bigPair, 'microtubules'));

const cloudMat = glass(0xc49bff, 0.12);
const cloud = new THREE.Mesh(new THREE.SphereGeometry(2.3, 40, 28), cloudMat);
cloud.renderOrder = 4;
close.add(tagPart(cloud, 'centrosome'));

addLabel('microtubules', close, new THREE.Vector3(-0.65, 1.45, 0.6));
addLabel('centrosome', close, new THREE.Vector3(1.6, 1.6, 0.4));

// ---------- In a cell: the split ----------

const cellView = new THREE.Group();
cellView.visible = false;
scene.add(cellView);

const RX = 2.3, RY = 1.75, RZ = 1.75;

// The membrane is a sphere whose points get stretched, squared off (plant),
// and pinched in the middle as the split goes on.
const membraneGeo = new THREE.SphereGeometry(1, 64, 40);
const directions = membraneGeo.attributes.position.array.slice();
const membraneMat = glass(0x8fe3cf, 0.25);
const membrane = new THREE.Mesh(membraneGeo, membraneMat);
membrane.renderOrder = 5;
cellView.add(tagPart(membrane, 'membrane'));

// A rigid wall around the plant cell, and the new wall that grows between the two.
const wallMat = glass(0x5fcf5f, 0.35);
const wallGeo = new THREE.SphereGeometry(1, 48, 32);
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.renderOrder = 6;
cellView.add(wall);
const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2 * RY, 2 * RZ), glass(0x5fcf5f, 0.6));
cellView.add(plate);

// How far out a direction goes on a rounded box (bigger p is boxier).
function boxRadius(x, y, z, p = 6) {
  return 1 / Math.pow(Math.abs(x) ** p + Math.abs(y) ** p + Math.abs(z) ** p, 1 / p);
}
// The plant wall keeps its box shape.
{
  const pos = wallGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = boxRadius(x, y, z) * 1.06;
    pos.setXYZ(i, x * r * RX, y * r * RY, z * r * RZ);
  }
  wallGeo.computeVertexNormals();
}

const nucleus = makeNucleus({ radius: 0.85, chromosomeCount: 0, seed: 12 });
cellView.add(nucleus.group);
tagPart(nucleus.group, 'nucleus');

// The two new nuclei at the end.
const daughters = [-1, 1].map((side) => {
  const n = makeNucleus({ radius: 0.62, chromosomeCount: 0, seed: 20 + side });
  n.group.userData.side = side;
  n.group.visible = false;
  cellView.add(n.group);
  tagPart(n.group, 'nucleus');
  return n;
});

// Centriole pairs: the first, and the copy it makes.
const pairs = [0, 1].map(() => {
  const p = makeCentriolePair(0.34);
  cellView.add(tagPart(p, 'centrioles'));
  return p;
});

// Four chromosomes, each an X made of two copies (chromatids) that come apart.
const rand = seeded(31);
const PAIR_COLORS = [0xff7aa2, 0xffb15e, 0x6fd3ff, 0x8de86f];
const chromosomes = new THREE.Group();
cellView.add(chromosomes);
const xs = PAIR_COLORS.map((color, i) => {
  const halves = [0.42, -0.42].map((tilt) => {
    const g = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.42, 6, 10), solid(color));
    g.add(rod);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), solid(0xffffff));
    g.add(knot);
    g.userData.tilt = tilt;
    chromosomes.add(g);
    return g;
  });
  const a = (i / 4) * Math.PI * 2 + 0.4;
  return {
    halves,
    loose: new THREE.Vector3(Math.cos(a) * 0.4, Math.sin(a) * 0.3, Math.sin(a * 2) * 0.2),
    spin: rand() * 3,
    row: new THREE.Vector3(0, (i - 1.5) * 0.55, i % 2 ? 0.2 : -0.2),
  };
});
tagPart(chromosomes, 'chromosomes');

// Spindle fibers: one to each half-chromosome, and a few that reach across.
const fiberMat = solid(0xdff6ff, { emissive: 0x223344 });
const fiberGeo = new THREE.CylinderGeometry(0.016, 0.016, 1, 5).translate(0, 0.5, 0);
const spindle = new THREE.Group();
cellView.add(spindle);
const fibers = [];
function addFiber(side, end) {
  const mesh = new THREE.Mesh(fiberGeo, fiberMat);
  spindle.add(mesh);
  fibers.push({ mesh, side, end });
}
xs.forEach((x) => x.halves.forEach((half, k) => addFiber(k === 0 ? -1 : 1, () => half.position)));
for (const side of [-1, 1]) {
  for (let k = 0; k < 5; k++) {
    const y = (k - 2) * 0.32;
    addFiber(side, () => new THREE.Vector3(-side * 0.5, y, (k % 2 ? 0.25 : -0.25)));
  }
}
tagPart(spindle, 'spindle');

addLabel('membrane', cellView, new THREE.Vector3(-1.6, 1.55, 0.5));
addLabel('nucleus', nucleus.group, new THREE.Vector3(0, 0.95, 0.3), { hideWith: nucleus.group });
addLabel('centrioles', pairs[0], new THREE.Vector3(0, 0.35, 0));
addLabel('chromosomes', chromosomes, new THREE.Vector3(0.3, 1.25, 0.3), { hideWith: chromosomes });
addLabel('spindle', spindle, new THREE.Vector3(-1.0, 0.75, 0.3), { hideWith: spindle });

// ---------- Moving through the split ----------

const state = { s: 0, plant: false, view: 'close', playing: false, started: false };

function poleX() {
  return 2.05 * stretch();
}
function stretch() {
  return state.plant ? 1 : 1 + 0.18 * smooth(state.s, 3.4, 4.6);
}

function shapeMembrane() {
  const s = state.s;
  const k = stretch();
  const pinch = state.plant ? 0 : smooth(s, 4.3, 5);
  const pos = membraneGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const dx = directions[i * 3], dy = directions[i * 3 + 1], dz = directions[i * 3 + 2];
    const r = state.plant ? boxRadius(dx, dy, dz) : 1;
    const x = dx * r * RX * k;
    const squeeze = 1 - 0.97 * pinch * Math.exp(-((x / 0.8) ** 2));
    pos.setXYZ(i, x, dy * r * RY * squeeze, dz * r * RZ * squeeze);
  }
  pos.needsUpdate = true;
  membraneGeo.computeVertexNormals();
}

const tmpQ = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

function pose() {
  const s = state.s;
  const px = poleX();

  // Centrioles: copy (0.4 to 1), then move to the two ends (1.3 to 2.3).
  const copy = smooth(s, 0.4, 1);
  const travel = smooth(s, 1.3, 2.3);
  const startA = new THREE.Vector3(-0.2, 1.15, 0.5);
  const startB = new THREE.Vector3(0.35, 1.2, 0.5);
  pairs[0].position.lerpVectors(startA, new THREE.Vector3(-px, 0, 0), travel);
  pairs[1].position.lerpVectors(startB, new THREE.Vector3(px, 0, 0), travel);
  pairs[1].scale.setScalar(Math.max(copy, 0.001));
  pairs.forEach((p) => { p.visible = !state.plant; });
  pairs[1].visible = !state.plant && copy > 0.01;

  // The nucleus: its threads coil up and its skin melts away (1.5 to 2.4).
  const melt = smooth(s, 1.5, 2.4);
  nucleus.group.visible = melt < 0.99;
  nucleus.envelope.material.opacity = 0.5 * (1 - melt);
  nucleus.pores.scale.setScalar(Math.max(1 - melt, 0.001));
  nucleus.nucleolus.scale.setScalar(Math.max(1 - melt, 0.001));
  nucleus.setCoiled(melt);

  // Chromosomes appear as X shapes, line up in the middle, then come apart.
  const appear = smooth(s, 1.7, 2.4);
  const line = smooth(s, 2.6, 3.3);
  const apart = smooth(s, 3.5, 4.4);
  const gone = smooth(s, 4.6, 5);
  chromosomes.visible = appear > 0.01 && gone < 0.99;
  xs.forEach((x) => {
    const center = new THREE.Vector3().lerpVectors(x.loose, x.row, line);
    x.halves.forEach((half, k) => {
      const side = k === 0 ? -1 : 1;
      half.position.copy(center);
      half.position.x += side * (apart * (px - 0.55 - center.x * side) + 0.02);
      half.rotation.set(0, (1 - line) * x.spin, half.userData.tilt * (1 - apart));
      half.scale.setScalar(Math.max(appear * (1 - gone), 0.001));
    });
  });

  // Spindle fibers grow out (2.5 to 3.1), then fade away (4.5 to 4.9).
  const grow = smooth(s, 2.5, 3.1);
  const fade = smooth(s, 4.5, 4.9);
  spindle.visible = grow > 0.01 && fade < 0.99;
  fibers.forEach((f) => {
    const from = new THREE.Vector3(f.side * px, 0, 0);
    const to = from.clone().lerp(f.end(), grow);
    const dir = to.clone().sub(from);
    const length = Math.max(dir.length(), 0.001);
    f.mesh.position.copy(from);
    f.mesh.quaternion.copy(tmpQ.setFromUnitVectors(up, dir.normalize()));
    f.mesh.scale.set(1 - fade, length, 1 - fade);
  });

  // Two new nuclei form at the ends (4.5 to 5).
  const form = smooth(s, 4.5, 5);
  daughters.forEach((d) => {
    d.group.visible = form > 0.01;
    d.group.position.set(d.group.userData.side * (px - 0.75), 0, 0);
    d.group.scale.setScalar(Math.max(form, 0.001));
  });

  // Plant cells keep their wall, and grow a new one across the middle.
  wall.visible = state.plant;
  plate.visible = state.plant && s > 4.3;
  plate.scale.set(1, Math.max(smooth(s, 4.3, 5), 0.001), Math.max(smooth(s, 4.3, 5), 0.001));

  shapeMembrane();
  showLabels();
}

// ---------- Step card and challenges ----------

const stepCard = document.getElementById('step-card');
function stepIndex() {
  return Math.min(Math.floor(state.s + 0.5), 5);
}
function showStep() {
  if (state.view === 'close') {
    stepCard.textContent = 'A pair of centrioles, up close · Drag to spin';
    return;
  }
  const step = STEPS[stepIndex()];
  stepCard.textContent = (state.plant && step.plant) || step.text;
}

function checkProgress() {
  if (state.view !== 'cell') return;
  if (state.s >= 1 && !state.plant && complete('copy')) {
    cello.say('Two pairs now! One for each new cell.', { mood: 'wow', ms: 4000 });
  }
  if (state.s >= 5) {
    if (state.plant && complete('plant')) {
      cello.say('No centrioles, no pinching! A plant cell builds a new wall across the middle instead.', { mood: 'wow', ms: 6500 });
    } else if (!state.plant && complete('split')) {
      cello.say('One cell became two! Each one got a nucleus and a pair of centrioles.', { mood: 'wow', ms: 6000 });
    }
  }
}

const timeInput = document.getElementById('time');
bindSlider('time', (v) => STEPS[Math.min(Math.floor(v / 10 + 0.5), 5)].name, (v) => {
  state.s = v / 10;
  if (state.started && state.view !== 'cell') setView('cell');
  pose();
  showStep();
  checkProgress();
});

bindToggle('play', (on) => {
  state.playing = on;
  if (!on) return;
  if (state.view !== 'cell') setView('cell');
  if (state.s >= 5) {
    state.s = 0;
    timeInput.value = 0;
  }
  cello.say('Watch closely! Here it goes…', { ms: 2500 });
});

function stopPlaying() {
  state.playing = false;
  document.getElementById('play').setAttribute('aria-pressed', 'false');
}

// ---------- Views ----------

const fly = { t: 1, from: new THREE.Vector3(), fromTarget: new THREE.Vector3(), to: new THREE.Vector3(), toTarget: new THREE.Vector3() };
function flyTo(position, target) {
  Object.assign(fly, { t: 0, from: camera.position.clone(), fromTarget: controls.target.clone(), to: position.clone(), toTarget: target.clone() });
}

function setView(view) {
  state.view = view;
  close.visible = view === 'close';
  cellView.visible = view === 'cell';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  document.getElementById('endon').disabled = view !== 'close';
  document.getElementById('plant').disabled = view !== 'cell';
  if (view === 'cell') {
    document.getElementById('endon').setAttribute('aria-pressed', 'false');
    bigPair.children[1].visible = true;
  }
  document.getElementById('info').hidden = true;
  flyTo(HOME[view].camera, HOME[view].target);
  showStep();
}

document.querySelectorAll('[data-view]').forEach((b) => {
  b.addEventListener('click', () => {
    if (state.view === b.dataset.view) return;
    setView(b.dataset.view);
    if (b.dataset.view === 'cell') cello.say('Here are the centrioles, next to the nucleus. Slide the Step, or press Play!', { ms: 4500 });
    else stopPlaying();
  });
});

bindToggle('endon', (on) => {
  // Hide the second centriole so the first one's ring is easy to see.
  bigPair.children[1].visible = !on;
  if (on) {
    flyTo(new THREE.Vector3(-0.65, 6.4, 0.01), new THREE.Vector3(-0.65, 0, 0));
    if (complete('endon')) cello.say('A pinwheel! Nine bundles in a ring. Can you count the tubes in one bundle?', { mood: 'wow', ms: 6000 });
    else cello.say('The pinwheel again!', { ms: 2000 });
  } else {
    flyTo(HOME.close.camera, HOME.close.target);
  }
});

bindToggle('plant', (on) => {
  state.plant = on;
  state.s = 0;
  timeInput.value = 0;
  document.getElementById('time-out').textContent = STEPS[0].name;
  pose();
  showStep();
  cello.say(on
    ? 'A plant cell has a hard wall and no centrioles. Can it still split? Press Play!'
    : 'Back to an animal cell, with its centrioles.', { ms: 4500 });
});

document.getElementById('reset').addEventListener('click', () => {
  document.getElementById('endon').setAttribute('aria-pressed', 'false');
  bigPair.children[1].visible = true;
  flyTo(HOME[state.view].camera, HOME[state.view].target);
});

// ---------- Count them ----------

let question = 0;
const questionEl = document.getElementById('count-question');
const countButtons = [...document.querySelectorAll('[data-count]')];
function showQuestion() {
  const q = COUNT_QUESTIONS[question];
  questionEl.textContent = q.ask;
  countButtons.forEach((b, i) => { b.textContent = String(q.options[i]); });
}
countButtons.forEach((b, i) => {
  b.addEventListener('click', () => {
    const q = COUNT_QUESTIONS[question];
    if (q.options[i] !== q.answer) {
      cello.say(question === 0 ? 'Not quite. Look end-on and count the bundles in the ring!' : 'Not quite. Zoom in on one bundle and count!', { mood: 'sad', ms: 3500 });
      return;
    }
    if (question === 0) {
      question = 1;
      showQuestion();
      cello.say('Yes, 9 bundles! Now, how many tubes in each one?', { ms: 3500 });
    } else if (complete('count')) {
      cello.say('9 bundles of 3 tubes: that’s 27 tiny tubes in one centriole!', { mood: 'wow', ms: 5500 });
      question = 0;
      showQuestion();
    } else {
      cello.say('Right again! 9 × 3 = 27 tubes.', { ms: 3000 });
      question = 0;
      showQuestion();
    }
  });
});

// ---------- Every frame ----------

stage.onFrame((dt) => {
  // Spin the pair around the first centriole, so the end-on view stays put.
  if (document.getElementById('endon').getAttribute('aria-pressed') !== 'true') bigPair.rotation.y += dt * 0.15;
  if (state.playing) {
    state.s = Math.min(state.s + dt * 0.4, 5);
    timeInput.value = Math.round(state.s * 10);
    document.getElementById('time-out').textContent = STEPS[stepIndex()].name;
    pose();
    showStep();
    checkProgress();
    if (state.s >= 5) stopPlaying();
  }
  xs.forEach((x, i) => x.halves.forEach((half) => { half.children[0].rotation.y = Math.sin(performance.now() / 700 + i) * 0.15; }));
});

// The camera keeps moving even while paused.
const clockFree = new THREE.Clock();
function follow() {
  const dt = Math.min(clockFree.getDelta(), 0.05);
  if (fly.t < 1) {
    fly.t = Math.min(fly.t + dt / 1.1, 1);
    const e = smooth(fly.t, 0, 1);
    camera.position.lerpVectors(fly.from, fly.to, e);
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
  }
  requestAnimationFrame(follow);
}

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { membrane: 0x8fe3cf, fiber: 0xdff6ff, cloud: 0xc49bff },
  light: { membrane: 0x2fa889, fiber: 0x4f6b7d, cloud: 0x8a63e0 },
};
window.elixTheme.watch((theme) => {
  const c = THEME_COLORS[theme];
  membraneMat.color.set(c.membrane);
  fiberMat.color.set(c.fiber);
  cloudMat.color.set(c.cloud);
});

// ---------- Start ----------

setView('close');
camera.position.copy(HOME.close.camera);
fly.t = 1;
showQuestion();
pose();
state.started = true;
requestAnimationFrame(follow);
