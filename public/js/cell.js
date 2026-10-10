import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';
import { glass, solid, blobGeometry, spherePoints, makeNucleus, makeMitochondrion, makeVacuole, makeRibosomes } from './cellparts.js';

// One animal cell, up close: the membrane that chooses what gets in and out,
// and the nucleus, the control center, with its pores, nucleolus, and
// chromosomes.

const PARTS = {
  membrane: { name: 'Cell membrane', text: 'The cell’s thin, soft skin. It holds everything in, and chooses what comes in and goes out. The pink bits are doors for food.' },
  cytoplasm: { name: 'Cytoplasm', text: 'The jelly that fills the cell. All the other parts float in it.' },
  nucleus: { name: 'Nucleus', text: 'The control center. It tells the cell what to do and when. It has its own skin, called the nuclear membrane.' },
  pores: { name: 'Nuclear pores', text: 'Tiny holes in the nucleus’s skin. Orders go out through them, and supplies come in.' },
  nucleolus: { name: 'Nucleolus', text: 'A dark blob inside the nucleus. It makes ribosomes, the cell’s tiny builders.' },
  chromosomes: { name: 'Chromosomes', text: 'Long threads that carry genes: instructions for how a living thing grows and looks. Before a cell splits, they coil up into X shapes.' },
  mitochondria: { name: 'Mitochondria', text: 'Power stations. They use food and oxygen to make energy for the cell.' },
  vacuoles: { name: 'Vacuoles', text: 'Little storage bubbles for water, food, and waste. Animal cells have small ones.' },
};

// The gatekeeper game: should the membrane let it through?
const GATE = [
  { id: 'water', label: '💧 Water', way: 'in', ok: true, how: 'slip', why: 'Water slips right through the membrane.', color: 0x6fc3ff, size: 0.09, count: 5 },
  { id: 'oxygen', label: '🫧 Oxygen', way: 'in', ok: true, how: 'slip', why: 'Oxygen is tiny, so it slips through. Mitochondria need it to make energy.', color: 0xff8a8a, size: 0.08, count: 5 },
  { id: 'sugar', label: '🍬 Sugar (food)', way: 'in', ok: true, how: 'door', why: 'Sugar is food! It comes in through special doors in the membrane.', color: 0xffffff, size: 0.1, count: 3 },
  { id: 'germ', label: '🦠 A germ', way: 'in', ok: false, why: 'A germ is far too big. The membrane keeps it out.', color: 0x8de86f, size: 0.4, count: 1 },
  { id: 'co2', label: '💨 Carbon dioxide (a waste gas)', way: 'out', ok: true, how: 'slip', why: 'It’s waste gas, left over from making energy. Out it goes!', color: 0xc7ccd1, size: 0.08, count: 5 },
  { id: 'waste', label: '🗑️ Waste', way: 'out', ok: true, how: 'door', why: 'The cell gets rid of waste it doesn’t need.', color: 0x9a6a3a, size: 0.1, count: 3 },
  { id: 'jelly', label: '🫙 The cytoplasm', way: 'out', ok: false, why: 'The membrane holds the cell together like a bag, so the jelly stays in.', color: 0xbff0e6, size: 0.45, count: 1 },
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.4, 8.6);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'cell',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['membrane', 'cytoplasm', 'nucleus'],
  greeting: 'This is one animal cell, a lot like the ones in you! Tap a part, or play Gatekeeper.',
  allPartsLine: 'All 8 parts! You know a cell inside out.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- The cell ----------

const R = 2.6;
const SHAPE = [1.08, 0.9, 1];
const cell = new THREE.Group();
scene.add(cell);

const membraneMat = glass(0x8fe3cf, 0.26);
const membrane = new THREE.Mesh(blobGeometry(R, { bump: 0.035, scale: SHAPE, seed: 4 }), membraneMat);
membrane.renderOrder = 5;
cell.add(tagPart(membrane, 'membrane'));

const cytoMat = glass(0xbff0e6, 0.12);
const cytoplasm = new THREE.Mesh(blobGeometry(R * 0.97, { bump: 0.035, scale: SHAPE, seed: 4 }), cytoMat);
cytoplasm.renderOrder = 1;
cell.add(tagPart(cytoplasm, 'cytoplasm'));

// Where a direction meets the membrane.
const surface = (dir) => dir.clone().normalize().multiply(new THREE.Vector3(...SHAPE)).multiplyScalar(R);

// Doors in the membrane (protein channels) for food and waste.
const doorDirs = [[1, 0.3, 0.6], [-1, 0.2, 0.5], [0.2, 1, 0.4], [0.3, -1, 0.5], [0.6, 0.2, 1], [-0.5, -0.3, 1], [0.1, 0.4, -1]]
  .map((d) => new THREE.Vector3(...d).normalize());
const doorMat = solid(0xff7aa2, { emissive: 0x000000 });
const doors = doorDirs.map((d) => {
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.26, 16, 1, true), doorMat);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 8, 16).rotateX(Math.PI / 2), doorMat);
  door.add(rim);
  door.position.copy(surface(d));
  door.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  door.traverse((o) => { o.userData.part = 'membrane'; });
  membrane.add(door);
  return door;
});

const NUCLEUS_AT = new THREE.Vector3(0.35, 0.1, 0);
const NR = 0.95;
const nucleus = makeNucleus({ radius: NR });
nucleus.group.position.copy(NUCLEUS_AT);
cell.add(nucleus.group);
tagPart(nucleus.envelope, 'nucleus');
tagPart(nucleus.pores, 'pores');
tagPart(nucleus.nucleolus, 'nucleolus');
tagPart(nucleus.threads, 'chromosomes');
tagPart(nucleus.chromosomes, 'chromosomes');

const mitoGroup = new THREE.Group();
const MITO_AT = [[-1.5, 0.7, 0.4], [-1.2, -0.9, 0.6], [1.5, -1.1, 0.3], [-0.5, 1.4, -0.7], [1.2, 1.2, 0.7], [-1.6, -0.2, -0.9]];
const mitos = MITO_AT.map((p, i) => {
  const m = makeMitochondrion(0.62);
  m.position.set(...p);
  m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  m.userData.home = m.position.clone();
  mitoGroup.add(m);
  return m;
});
cell.add(tagPart(mitoGroup, 'mitochondria'));

const vacGroup = new THREE.Group();
[[-0.9, 0.2, 1.3, 0.32], [1.0, -0.5, 1.4, 0.24], [-0.4, -1.4, -0.4, 0.28]].forEach(([x, y, z, r]) => {
  const v = makeVacuole(r);
  v.position.set(x, y, z);
  vacGroup.add(v);
});
cell.add(tagPart(vacGroup, 'vacuoles'));

const ribosomes = makeRibosomes(260, R * 0.82, { avoid: [{ center: NUCLEUS_AT, radius: NR + 0.1 }] });
ribosomes.scale.set(...SHAPE);
cell.add(ribosomes);

addLabel('membrane', cell, new THREE.Vector3(-1.9, 1.75, 0.6));
addLabel('cytoplasm', cell, new THREE.Vector3(-0.9, -1.0, 1.5));
addLabel('nucleus', cell, NUCLEUS_AT.clone().add(new THREE.Vector3(0, NR + 0.2, 0.3)));
addLabel('pores', cell, NUCLEUS_AT.clone().add(new THREE.Vector3(NR * 0.75, -NR * 0.6, 0.4)));
addLabel('nucleolus', cell, NUCLEUS_AT.clone().add(new THREE.Vector3(0.3, 0.2, 0.7)));
addLabel('chromosomes', cell, NUCLEUS_AT.clone().add(new THREE.Vector3(-0.35, -0.2, 0.75)));
addLabel('mitochondria', cell, new THREE.Vector3(1.2, 1.55, 0.7));
addLabel('vacuoles', cell, new THREE.Vector3(-0.9, 0.6, 1.4));

// ---------- Things that move: travelers through the membrane ----------

const travelers = []; // { meshes, paths, time, duration, door }

function travelerMesh(item) {
  if (item.id === 'germ') {
    const g = new THREE.Mesh(new THREE.CapsuleGeometry(item.size * 0.45, item.size, 6, 14).rotateZ(Math.PI / 2), solid(item.color));
    return g;
  }
  if (item.id === 'sugar' || item.id === 'waste') return new THREE.Mesh(new THREE.BoxGeometry(item.size, item.size, item.size), solid(item.color));
  if (item.id === 'jelly') return new THREE.Mesh(blobGeometry(item.size, { bump: 0.15, seed: 9 }), glass(item.color, 0.7));
  return new THREE.Mesh(new THREE.SphereGeometry(item.size, 12, 8), solid(item.color));
}

// Plays what really happens to the item, whatever the answer was.
function sendThrough(item) {
  const meshes = [];
  const paths = [];
  let door = null;
  for (let k = 0; k < item.count; k++) {
    let dir;
    if (item.how === 'door') {
      door = doors[(k * 2 + (item.way === 'out' ? 1 : 0)) % doors.length];
      dir = doorDirs[doors.indexOf(door)];
    } else {
      dir = new THREE.Vector3(0.9 - k * 0.45, 0.25 * Math.sin(k * 2), 1).normalize();
    }
    const edge = surface(dir);
    const far = edge.clone().multiplyScalar(1.75);
    const inside = edge.clone().multiplyScalar(0.62);
    let path;
    if (item.ok) path = item.way === 'in' ? [far, edge, inside] : [inside, edge, far];
    else if (item.way === 'in') path = [far, edge.clone().multiplyScalar(1 + item.size / R + 0.03), far.clone().multiplyScalar(1.1)];
    else path = [inside, edge.clone().multiplyScalar(0.93), inside];
    const mesh = travelerMesh(item);
    mesh.position.copy(path[0]);
    cell.add(mesh);
    meshes.push(mesh);
    paths.push(path.map((p) => p.clone()));
  }
  travelers.push({ meshes, paths, time: -0.0, duration: 2.6, door: item.how === 'door' });
}

function pointOnPath(path, t) {
  const seg = Math.min(Math.floor(t * (path.length - 1)), path.length - 2);
  const local = t * (path.length - 1) - seg;
  return new THREE.Vector3().lerpVectors(path[seg], path[seg + 1], THREE.MathUtils.smoothstep(local, 0, 1));
}

function updateTravelers(dt) {
  for (let i = travelers.length - 1; i >= 0; i--) {
    const tr = travelers[i];
    tr.time += dt;
    const t = Math.min(tr.time / tr.duration, 1);
    tr.meshes.forEach((m, k) => {
      m.position.copy(pointOnPath(tr.paths[k], t));
      m.rotation.y += dt * 2;
    });
    // Doors glow while food or waste goes through them.
    if (tr.door) doorMat.emissive.setHex(Math.abs(t - 0.5) < 0.2 ? 0xff3d7f : 0x000000);
    if (t >= 1) {
      tr.meshes.forEach((m) => cell.remove(m));
      travelers.splice(i, 1);
      doorMat.emissive.setHex(0x000000);
    }
  }
}

// ---------- Orders from the nucleus ----------

const messages = []; // { mesh, path, time, target }
const messageGeo = new THREE.CapsuleGeometry(0.04, 0.1, 4, 8);
const messageMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });
const porePoints = spherePoints(46).map((p) => p.multiplyScalar(NR).add(NUCLEUS_AT));

function sendOrders() {
  mitos.forEach((m, i) => {
    const start = NUCLEUS_AT.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(NR * 0.4));
    // Leave through the pore nearest to where this order is going.
    const pore = porePoints.reduce((best, p) => (p.distanceTo(m.position) < best.distanceTo(m.position) ? p : best));
    const mesh = new THREE.Mesh(messageGeo, messageMat);
    mesh.position.copy(start);
    cell.add(mesh);
    messages.push({ mesh, path: [start, pore, m.userData.home.clone()], time: -i * 0.25, target: m });
  });
}

function updateMessages(dt) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    msg.time += dt;
    const t = THREE.MathUtils.clamp(msg.time / 2.2, 0, 1);
    msg.mesh.visible = msg.time > 0;
    msg.mesh.position.copy(pointOnPath(msg.path, t));
    if (t >= 1) {
      cell.remove(msg.mesh);
      messages.splice(i, 1);
      msg.target.userData.pulse = 1;
    }
  }
  mitos.forEach((m) => {
    const p = m.userData.pulse ?? 0;
    m.scale.setScalar(1 + 0.35 * Math.sin(p * Math.PI));
    m.userData.pulse = Math.max(0, p - dt * 1.5);
  });
}

// ---------- Gatekeeper ----------

let gateOrder = [...GATE.keys()].sort(() => Math.random() - 0.5);
let gateAt = 0;
let gateRight = 0;
const gateSolved = new Set();
let gateBusy = false;
const gateQuestion = document.getElementById('gate-question');
const gateButtons = document.querySelectorAll('[data-gate]');

function showGate() {
  const item = GATE[gateOrder[gateAt]];
  gateQuestion.textContent = item.way === 'in'
    ? `${item.label} wants to get in. Should the membrane let it through?`
    : `${item.label} wants to get out. Should the membrane let it through?`;
  document.getElementById('gate-count').textContent = `${gateSolved.size} of ${GATE.length} right`;
}

gateButtons.forEach((b) => {
  b.addEventListener('click', () => {
    if (gateBusy) return;
    const item = GATE[gateOrder[gateAt]];
    const right = (b.dataset.gate === 'yes') === item.ok;
    gateBusy = true;
    gateButtons.forEach((x) => { x.disabled = true; });
    sendThrough(item);
    if (right) {
      gateRight++;
      gateSolved.add(item.id);
      if (gateSolved.size === GATE.length && complete('gate')) {
        cello.say(`${item.why} You’re a perfect gatekeeper!`, { mood: 'wow', ms: 6000 });
      } else if (gateRight >= 3 && complete('gate3')) {
        cello.say(`Three right! ${item.why}`, { mood: 'wow', ms: 5000 });
      } else {
        cello.say(`${item.ok ? 'Yes!' : 'Right!'} ${item.why}`, { ms: 4500 });
      }
    } else {
      cello.say(`Oops, watch! ${item.why}`, { mood: 'sad', ms: 4500 });
    }
    setTimeout(() => {
      if (right) {
        gateAt = (gateAt + 1) % gateOrder.length;
        if (gateAt === 0) gateOrder = [...GATE.keys()].sort(() => Math.random() - 0.5);
      }
      gateBusy = false;
      gateButtons.forEach((x) => { x.disabled = false; });
      showGate();
    }, 2700);
  });
});

// ---------- Zoom, coil, and orders ----------

const hintEl = document.getElementById('hint');
const view = { zoomed: false, coil: 0, coilTarget: 0, fly: null };

function flyTo(position, target) {
  view.fly = { from: camera.position.clone(), fromTarget: controls.target.clone(), to: position, toTarget: target, t: 0 };
}

bindToggle('zoom', (on) => {
  view.zoomed = on;
  document.getElementById('zoom').textContent = on ? '🔙 Zoom back out' : '🔍 Zoom into the nucleus';
  hintEl.textContent = on ? 'Inside the nucleus · Tap a part to learn about it' : 'Drag to spin · Tap a part to learn about it';
  if (on) {
    flyTo(NUCLEUS_AT.clone().add(new THREE.Vector3(0.4, 0.5, 2.6)), NUCLEUS_AT.clone());
    if (complete('zoom')) cello.say('Welcome to the control center! See the pores, the dark nucleolus, and the long threads?', { mood: 'wow', ms: 6000 });
    else cello.say('Back in the nucleus!', { ms: 2000 });
  } else {
    flyTo(CAMERA_HOME.clone(), new THREE.Vector3());
  }
});

bindToggle('coil', (on) => {
  view.coilTarget = on ? 1 : 0;
  if (!on) {
    cello.say('The X shapes uncoil into long, thin threads again.', { ms: 3000 });
    return;
  }
  if (complete('coil')) {
    cello.say('Before a cell splits, its threads coil up into X shapes. Each X is a chromosome and its copy, so both new cells get one!', { mood: 'wow', ms: 7000 });
  } else {
    cello.say('Coiling up, ready to split!', { ms: 2500 });
  }
  if (!view.zoomed) document.getElementById('zoom').click();
});

document.getElementById('orders').addEventListener('click', () => {
  sendOrders();
  if (complete('orders')) {
    cello.say('The nucleus sends orders out through its pores. They tell the cell what to make and do!', { mood: 'wow', ms: 6000 });
  } else {
    cello.say('More orders, coming through the pores!', { ms: 2500 });
  }
});

document.getElementById('reset').addEventListener('click', () => {
  if (view.zoomed) document.getElementById('zoom').click();
  else flyTo(CAMERA_HOME.clone(), new THREE.Vector3());
});

// ---------- Every frame ----------

stage.onFrame((dt) => {
  updateTravelers(dt);
  updateMessages(dt);
  const t = performance.now() / 1000;
  mitos.forEach((m, i) => {
    m.position.copy(m.userData.home).add(new THREE.Vector3(Math.sin(t * 0.6 + i) * 0.05, Math.cos(t * 0.5 + i * 2) * 0.05, 0));
  });
  nucleus.chromosomes.rotation.y += dt * 0.2;
});

// Camera moves, fades, and coiling keep going even while paused.
const clockFree = new THREE.Clock();
function follow() {
  const dt = Math.min(clockFree.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 5);
  if (view.fly) {
    view.fly.t = Math.min(view.fly.t + dt / 1.2, 1);
    const e = THREE.MathUtils.smoothstep(view.fly.t, 0, 1);
    camera.position.lerpVectors(view.fly.from, view.fly.to, e);
    controls.target.lerpVectors(view.fly.fromTarget, view.fly.toTarget, e);
    if (view.fly.t >= 1) view.fly = null;
  }
  // Zoomed in, the outside goes faint so the nucleus is easy to see.
  membraneMat.opacity += ((view.zoomed ? 0.06 : 0.26) - membraneMat.opacity) * k;
  cytoMat.opacity += ((view.zoomed ? 0.03 : 0.12) - cytoMat.opacity) * k;
  nucleus.envelope.material.opacity += ((view.zoomed ? 0.22 : 0.5) - nucleus.envelope.material.opacity) * k;
  view.coil += (view.coilTarget - view.coil) * k;
  nucleus.setCoiled(view.coil);
  requestAnimationFrame(follow);
}

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { membrane: 0x8fe3cf, cytoplasm: 0xbff0e6 },
  light: { membrane: 0x2fa889, cytoplasm: 0x7fd6c2 },
};
window.elixTheme.watch((theme) => {
  membraneMat.color.set(THEME_COLORS[theme].membrane);
  cytoMat.color.set(THEME_COLORS[theme].cytoplasm);
});

// ---------- Start ----------

showGate();
requestAnimationFrame(follow);
