import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// Gas exchange in the alveoli. The smallest tube ends in bunches of air sacs
// wrapped in capillaries; blood comes in needing oxygen (blue here) and leaves
// full of it (red). Zoom in on one air sac: oxygen slips through the thin
// walls into red blood cells, and carbon dioxide slips the other way, out
// with the next breath. Hold your breath and the oxygen runs low.

const PARTS = {
  bronchiole: { name: 'Smallest tube (bronchiole)', text: 'The last, tiniest air tube. It brings fresh air into the air sacs, and takes used air out.' },
  alveoli: { name: 'Air sacs (alveoli)', text: 'Tiny bubbles at the end of the air tubes. Your lungs have millions of them. Here, oxygen goes into your blood.' },
  wall: { name: 'Air sac wall', text: 'Super thin: just one layer of cells! So oxygen and carbon dioxide can slip right through.' },
  capillaries: { name: 'Capillaries', text: 'The tiniest blood vessels. They wrap around every air sac like a net. Their walls are just one cell thick too.' },
  redcell: { name: 'Red blood cell', text: 'A tiny disc that carries oxygen. It picks oxygen up in the lungs, and drops it off to cells all over your body.' },
  oxygen: { name: 'Oxygen', text: 'The gas your cells need to get energy from food. It comes in with every breath.' },
  co2: { name: 'Carbon dioxide', text: 'The waste gas your cells make. Blood brings it back to the lungs, and you breathe it out.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const AIM = {
  bunch: { camera: [0, 1.2, 8.4], target: [0, 0.6, 0] },
  one: { camera: [0, 0.6, 7.6], target: [0, 0, 0] },
};

const explorer = createExplorer({
  topic: 'alveoli',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['alveoli', 'wall', 'capillaries'], // taps reach the gases and blood cells inside
  greeting: 'We’re deep inside a lung, at the end of the tiniest tubes. This is where the magic happens!',
  allPartsLine: 'All 7 parts! You know how oxygen gets into your blood.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false });

const airwayMat = seeThrough(0xffd1dc, 0.7);
const sacMat = seeThrough(0xffb6c6, 0.32);
const wallMat = seeThrough(0xff9fb0, 0.28);
const blueVessel = seeThrough(0x5b8def, 0.55);
const redVessel = seeThrough(0xe8445a, 0.55);
const vesselMat = seeThrough(0xd86a7a, 0.3);
const cellMat = mat(0xffffff, { roughness: 0.35 }); // tinted per cell
const o2Mat = mat(0x7fe3ff, { emissive: 0x1d7a9a });
const co2Mat = mat(0x9aa0aa, { emissive: 0x2a2e36 });

const needsO2 = new THREE.Color(0x7a2a5a);
const fullO2 = new THREE.Color(0xff2a3a);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (curve, radius, material, segments = 48) => new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 10, false), material);
const discGeo = new THREE.SphereGeometry(1, 16, 10).scale(1, 0.4, 1);

// ---------- View 1: a bunch of air sacs ----------

const bunch = new THREE.Group();
scene.add(bunch);

const STEM_TOP = v(0, 3.4, 0);
const FORK = v(0, 1.9, 0);
bunch.add(tagPart(tube(curveOf([STEM_TOP, FORK]), 0.16, airwayMat), 'bronchiole'));
const CLUSTERS = [v(-1.5, 0.3, 0), v(1.5, 0.4, 0.2), v(0, -0.3, -0.4)];
const sacs = [];
CLUSTERS.forEach((c) => {
  bunch.add(tagPart(tube(curveOf([FORK, FORK.clone().lerp(c, 0.5).add(v(0, 0.2, 0)), c]), 0.1, airwayMat), 'bronchiole'));
  const group = new THREE.Group();
  group.position.copy(c);
  bunch.add(group);
  for (let i = 0; i < 14; i++) {
    const sac = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.4), 20, 14), sacMat);
    sac.position.copy(new THREE.Vector3().randomDirection().multiplyScalar(rand(0.4, 0.62)));
    group.add(tagPart(sac, 'alveoli'));
  }
  sacs.push(group);
});

// Capillaries: blood comes in from the left (needing oxygen) and leaves on
// the right (full of it), wrapping around each bunch on the way.
const bunchPaths = [];
CLUSTERS.forEach((c) => {
  for (let j = 0; j < 3; j++) {
    const lift = (j - 1) * 0.45;
    const around = (a) => c.clone().add(v(Math.cos(a) * 0.95, lift + Math.sin(a * 2) * 0.15, Math.sin(a) * 0.95));
    const points = [v(-3.6, c.y + lift - 0.4, 0.6), around(Math.PI * 1.1), around(Math.PI * 0.6), around(Math.PI * 0.1), v(3.6, c.y + lift + 0.4, 0.6)];
    const curve = curveOf(points);
    const half = (from, to) => curveOf(Array.from({ length: 12 }, (_, i) => curve.getPointAt(from + ((to - from) * i) / 11)));
    bunch.add(tagPart(tube(half(0, 0.5), 0.05, blueVessel, 32), 'capillaries'));
    bunch.add(tagPart(tube(half(0.5, 1), 0.05, redVessel, 32), 'capillaries'));
    bunchPaths.push(curve);
  }
});
const BUNCH_CELLS = bunchPaths.length * 4;
const bunchCells = new THREE.InstancedMesh(discGeo, cellMat, BUNCH_CELLS);
bunchCells.frustumCulled = false;
bunch.add(tagPart(bunchCells, 'redcell'));

addLabel('bronchiole', bunch, v(0.55, 2.8, 0));
addLabel('alveoli', bunch, CLUSTERS[0].clone().add(v(0, 1.0, 0)));
addLabel('capillaries', bunch, v(2.9, 1.1, 0.6));
addLabel('redcell', bunch, v(-3, -0.4, 0.6));

// ---------- View 2: one air sac, up close ----------

const one = new THREE.Group();
one.visible = false;
scene.add(one);

const SAC = v(0, 0.75, 0);
const R = 1.6;
const sac = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), wallMat);
sac.position.copy(SAC);
one.add(tagPart(sac, 'wall'));
const opening = v(0, SAC.y + R + 1.2, 0);
one.add(tagPart(tube(curveOf([opening, v(0, SAC.y + R - 0.2, 0)]), 0.45, airwayMat, 8), 'bronchiole'));
// Wall cells: a ring of flat cells to show the wall is one cell thick.
const wallCells = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), seeThrough(0xff8fa6, 0.6), 40);
const q = new THREE.Quaternion();
for (let i = 0; i < 40; i++) {
  const a = (i / 40) * Math.PI * 2;
  const p = v(Math.cos(a) * R, Math.sin(a) * R, 0).add(SAC);
  q.setFromUnitVectors(v(0, 1, 0), v(Math.cos(a), Math.sin(a), 0));
  wallCells.setMatrixAt(i, new THREE.Matrix4().compose(p, q, v(0.15, 0.04, 0.15)));
}
one.add(tagPart(wallCells, 'wall'));

// The capillary hugs the bottom of the sac.
const CAP = curveOf([v(-4.4, -1.6, 0.4), v(-2, -1.25, 0.2), v(-0.8, -1.1, 0), v(0.8, -1.1, 0), v(2, -1.25, 0.2), v(4.4, -1.6, 0.4)]);
one.add(tagPart(tube(CAP, 0.32, vesselMat, 64), 'capillaries'));
const ONE_CELLS = 9;
const oneCells = new THREE.InstancedMesh(discGeo, cellMat, ONE_CELLS);
oneCells.frustumCulled = false;
one.add(tagPart(oneCells, 'redcell'));

// Oxygen drifts from inside the sac down into the blood; carbon dioxide goes
// up from the blood into the sac and out through the opening.
const GAS = 18;
function gasPaths(down) {
  return Array.from({ length: GAS }, () => {
    const inSac = SAC.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(rand(0.3, 1.2)));
    const atBlood = CAP.getPointAt(rand(0.42, 0.58)).add(v(0, 0.05, rand(-0.15, 0.15)));
    return down
      ? curveOf([opening.clone().add(v(rand(-0.2, 0.2), 0, 0)), inSac, atBlood])
      : curveOf([atBlood, inSac, opening.clone().add(v(rand(-0.2, 0.2), 0.3, 0))]);
  });
}
const o2Paths = gasPaths(true);
const co2Paths = gasPaths(false);
const o2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), o2Mat, GAS);
const co2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), co2Mat, GAS);
[o2, co2].forEach((g) => { g.frustumCulled = false; });
one.add(tagPart(o2, 'oxygen'), tagPart(co2, 'co2'));
const gasT = Array.from({ length: GAS }, () => Math.random());

addLabel('wall', one, v(-R - 0.3, SAC.y + 0.4, 0.3), { hideWith: one });
addLabel('capillaries', one, v(3.2, -1.0, 0.4), { hideWith: one });
addLabel('redcell', one, v(-3, -2.1, 0.4), { hideWith: one });
addLabel('oxygen', one, v(-0.7, SAC.y + 0.2, 1.2), { hideWith: one });
addLabel('co2', one, v(0.9, SAC.y + 0.6, 1.2), { hideWith: one });
addLabel('bronchiole', one, v(0.7, opening.y - 0.3, 0), { hideWith: one });

// ---------- Controls ----------

const state = {
  view: 'bunch', pace: 2, hold: false,
  air: 1, // how fresh the air in the sacs is; drops while you hold your breath
  stale: 0, // how much carbon dioxide has built up
  phase: 0, flow: 0, picked: 0, swapped: false, holdTime: 0, exhaleTime: 0, swapTime: 0,
};
const levelCard = document.getElementById('level-card');
const pickedEl = document.getElementById('picked');

function aim() {
  const { camera: c, target: t } = AIM[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  bunch.visible = key === 'bunch';
  one.visible = key === 'one';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  if (b.dataset.view === 'one') {
    levelCard.textContent = 'One air sac, with a capillary underneath. Watch the gases swap!';
    if (complete('zoom')) cello.say('One air sac, up close! Its wall is only one cell thick.', { mood: 'wow', ms: 4500 });
  } else {
    levelCard.textContent = 'At the end of the smallest tubes: bunches of tiny air sacs, like grapes.';
  }
}));

bindSlider('pace', (value) => (value <= 3 ? 'resting' : value >= 8 ? 'exercising!' : 'walking'), (value) => {
  state.pace = value;
  if (value >= 10 && complete('exercise')) {
    cello.say('Exercising! Blood rushes through faster, and you breathe harder to keep up.', { mood: 'wow', ms: 5000 });
  }
});

bindToggle('hold', (on) => {
  state.hold = on;
  if (on) {
    levelCard.textContent = 'Holding your breath: no fresh air comes in, and carbon dioxide piles up.';
    cello.say('Holding… The oxygen in the air sacs is running low!', { ms: 4000 });
  } else {
    cello.say('Phew! A big breath of fresh air.', { ms: 3000 });
  }
});

document.getElementById('exhale').addEventListener('click', () => {
  if (state.hold) document.getElementById('hold').click();
  state.exhaleTime = 2;
  setView('one');
});

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const t3 = new THREE.Vector3();
const color = new THREE.Color();
const ease = (dt, rate) => 1 - Math.exp(-dt * rate);
const up = v(0, 1, 0);

// Place blood cells along a path, colored by how much oxygen they hold.
function moveCells(mesh, paths, perPath, offset, exchangeAt) {
  for (let i = 0; i < mesh.count; i++) {
    const path = paths[i % paths.length];
    const t = (Math.floor(i / paths.length) / perPath + offset + (i % paths.length) * 0.13) % 1;
    path.getPointAt(t, p);
    path.getTangentAt(t, t3);
    const filled = THREE.MathUtils.smoothstep(t, exchangeAt[0], exchangeAt[1]) * (0.25 + state.air * 0.75);
    color.copy(needsO2).lerp(fullO2, filled);
    mesh.setColorAt(i, color);
    m.compose(p, q.setFromUnitVectors(up, t3).multiply(new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2)), v(0.13, 0.13, 0.13));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
}

stage.onFrame((dt) => {
  const speed = 0.05 + state.pace * 0.012;
  state.flow = (state.flow + dt * speed) % 1;

  // Breathing keeps the air fresh; holding your breath uses it up.
  state.air += ((state.hold ? 0 : 1) - state.air) * ease(dt, state.hold ? 0.18 : 1.2);
  state.stale += ((state.hold ? 1 : 0) - state.stale) * ease(dt, state.hold ? 0.25 : 0.8);
  state.phase += dt * (state.hold ? 0 : 0.3 + state.pace * 0.06) * Math.PI * 2;
  const swell = 1 + Math.sin(state.phase) * 0.05;
  sacs.forEach((s) => s.scale.setScalar(swell));
  sac.scale.setScalar(swell);

  moveCells(bunchCells, bunchPaths, 4, state.flow, [0.35, 0.65]);
  moveCells(oneCells, [CAP], ONE_CELLS, state.flow * 1.6, [0.4, 0.6]);

  // Gases: oxygen comes in only while breathing; carbon dioxide leaves only
  // while breathing, and gathers in the sac while you hold your breath.
  const gasSpeed = dt * (0.18 + state.pace * 0.02) * (state.exhaleTime > 0 ? 2 : 1);
  state.exhaleTime = Math.max(0, state.exhaleTime - dt);
  for (let i = 0; i < GAS; i++) {
    gasT[i] = (gasT[i] + gasSpeed) % 1;
    const shownO2 = i / GAS < state.air;
    o2Paths[i].getPointAt(gasT[i], p);
    const s1 = shownO2 ? 1 : 0;
    o2.setMatrixAt(i, m.makeScale(s1, s1, s1).setPosition(p));
    // Held breath: carbon dioxide stops at the middle of the sac.
    const tc = state.hold ? Math.min(gasT[i], 0.5 + (i / GAS) * 0.1) : gasT[i];
    co2Paths[i].getPointAt(tc, p);
    co2.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
  }
  o2.instanceMatrix.needsUpdate = true;
  co2.instanceMatrix.needsUpdate = true;

  // Count the oxygen picked up, roughly one per blood cell going by.
  if (!state.hold) state.picked += dt * speed * 60;
  pickedEl.textContent = `🫧 ${Math.floor(state.picked)} oxygen picked up`;

  if (state.view === 'one') {
    state.swapTime += dt;
    if (state.swapTime > 4 && !state.hold && complete('swap')) {
      cello.say('Oxygen slips through the thin walls into the red blood cells. Now they’re bright red!', { mood: 'wow', ms: 5500 });
    }
  }
  if (state.exhaleTime > 0 && state.view === 'one' && complete('out')) {
    cello.say('Whoosh! The carbon dioxide goes up the tube and out of your body.', { mood: 'wow', ms: 5000 });
  }
  if (state.hold) {
    state.holdTime += dt;
    if (state.holdTime > 5 && complete('hold')) {
      levelCard.textContent = 'No fresh air: less oxygen for the blood, and carbon dioxide builds up. Time to breathe!';
      cello.say('The oxygen is running out, and carbon dioxide is piling up. That’s why you have to breathe!', { mood: 'wow', ms: 6000 });
    }
  } else {
    state.holdTime = 0;
  }
});

setView('bunch');
