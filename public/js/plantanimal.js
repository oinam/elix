import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';
import { glass, solid, blobGeometry, makeNucleus, makeMitochondrion, makeVacuole, makeCentriolePair, makeChloroplast } from './cellparts.js';

// A leaf cell and an animal cell, side by side. Spot what's different, sort
// who has what, shine some sun on them, and dry them out or soak them.

const PARTS = {
  wall: { name: 'Cell wall', text: '🌿 Plant cells only. A hard box outside the membrane. It keeps the cell firm and gives it its shape.' },
  chloroplasts: { name: 'Chloroplasts', text: '🌿 Plant cells only. The green parts. They use sunlight to make food (sugar) for the plant.' },
  bigvacuole: { name: 'Big vacuole', text: '🌿 Plant cells have one big one. It’s full of water, and it pushes out on the wall to keep the plant firm.' },
  centrioles: { name: 'Centrioles', text: '🐾 Animal cells. Two tiny tubes that help the cell split. Most plant cells don’t have them.' },
  vacuoles: { name: 'Small vacuoles', text: '🐾 Animal cells have a few small vacuoles, for storing water, food, and waste.' },
  nucleus: { name: 'Nucleus', text: '🤝 Both. The control center. In a plant cell, the big vacuole pushes it to one side.' },
  membrane: { name: 'Cell membrane', text: '🤝 Both. The thin skin that chooses what goes in and out. In plant cells, it’s just inside the wall.' },
  cytoplasm: { name: 'Cytoplasm', text: '🤝 Both. The jelly that fills the cell.' },
  mitochondria: { name: 'Mitochondria', text: '🤝 Both. Power stations that turn food into energy. Plants need energy too!' },
};

// The parts only one of the two cells has.
const DIFFERENCES = ['wall', 'chloroplasts', 'bigvacuole', 'centrioles'];

const SORT = [
  { thing: 'a cell wall', answer: 'plant', why: 'Only plant cells. It’s a hard box that keeps them firm.' },
  { thing: 'chloroplasts', answer: 'plant', why: 'Only plant cells. They use sunlight to make food.' },
  { thing: 'one big vacuole', answer: 'plant', why: 'Plant cells. Animal cells only have small ones.' },
  { thing: 'centrioles', answer: 'animal', why: 'Animal cells. Most plant cells don’t have them.' },
  { thing: 'a nucleus', answer: 'both', why: 'Both! It’s the control center.' },
  { thing: 'a cell membrane', answer: 'both', why: 'Both! In a plant cell, it sits just inside the wall.' },
  { thing: 'cytoplasm', answer: 'both', why: 'Both! The jelly fills them both.' },
  { thing: 'mitochondria', answer: 'both', why: 'Both! Plants need energy too, even though they make their own food.' },
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.2, 8.3);
camera.position.copy(CAMERA_HOME);

const found = new Set();
const explorer = createExplorer({
  topic: 'plantanimal',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['membrane', 'cytoplasm'],
  greeting: 'A plant cell and an animal cell! Can you spot what’s different?',
  allPartsLine: 'All 9 parts! You can tell a plant cell from an animal cell.',
  onPart: (key) => spotted(key),
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- The plant cell (from a leaf) ----------

const plant = new THREE.Group();
plant.position.set(-2.35, 0, 0);
scene.add(plant);

const PW = 2.5, PH = 3.1, PD = 1.9;
const wallMat = glass(0x5fcf5f, 0.38);
const wall = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, PD, 4, 0.22), wallMat);
wall.renderOrder = 6;
plant.add(tagPart(wall, 'wall'));

// Taps near the edge of the plant cell hit the wall. Taps in the middle go
// through it, to the parts inside.
const meshRaycast = THREE.Mesh.prototype.raycast;
wall.raycast = function (raycaster, intersects) {
  const hits = [];
  meshRaycast.call(this, raycaster, hits);
  for (const hit of hits) {
    const p = this.worldToLocal(hit.point.clone());
    if (Math.abs(p.x) > PW * 0.4 || Math.abs(p.y) > PH * 0.43) intersects.push(hit);
  }
};

// Everything inside the wall; it shrinks away from the wall when dried out.
const plantInside = new THREE.Group();
plant.add(plantInside);
const plantMembraneMat = glass(0x8fe3cf, 0.22);
const plantMembrane = new THREE.Mesh(new RoundedBoxGeometry(PW * 0.94, PH * 0.95, PD * 0.92, 4, 0.3), plantMembraneMat);
plantMembrane.renderOrder = 5;
plantInside.add(tagPart(plantMembrane, 'membrane'));
const plantCytoMat = glass(0xbff0e6, 0.12);
const plantCyto = new THREE.Mesh(new RoundedBoxGeometry(PW * 0.9, PH * 0.92, PD * 0.88, 4, 0.3), plantCytoMat);
plantCyto.renderOrder = 1;
plantInside.add(tagPart(plantCyto, 'cytoplasm'));

const bigVacuole = new THREE.Mesh(blobGeometry(1, { bump: 0.04, seed: 3, scale: [0.82, 1.18, 0.62] }), glass(0x9ccfff, 0.45));
bigVacuole.position.set(0.18, -0.1, 0);
bigVacuole.renderOrder = 2;
plantInside.add(tagPart(bigVacuole, 'bigvacuole'));

const plantNucleus = makeNucleus({ radius: 0.34, chromosomeCount: 0, poreCount: 24, seed: 41 });
plantNucleus.group.position.set(-0.78, 0.95, 0.25);
plantInside.add(tagPart(plantNucleus.group, 'nucleus'));

const chloroGroup = new THREE.Group();
plantInside.add(chloroGroup);
const CHLORO_AT = [
  [-0.85, -0.3, 0.55], [-0.9, 0.3, -0.5], [-0.75, -1.15, 0.2], [0.2, 1.3, 0.5], [0.85, 1.05, -0.45],
  [0.95, 0.2, 0.55], [0.95, -0.75, -0.3], [0.35, -1.3, 0.55], [-0.3, -1.35, -0.5], [-0.15, 1.3, -0.55],
];
const chloroplasts = CHLORO_AT.map((p, i) => {
  const c = makeChloroplast(0.42);
  c.position.set(...p);
  c.rotation.set(i * 0.9, i * 1.7, i * 0.5);
  chloroGroup.add(c);
  return c;
});
tagPart(chloroGroup, 'chloroplasts');

const plantMitos = new THREE.Group();
[[-0.55, -0.75, -0.6], [0.7, 1.2, 0.35]].forEach((p, i) => {
  const m = makeMitochondrion(0.4);
  m.position.set(...p);
  m.rotation.set(i, i * 2, 0.4);
  plantMitos.add(m);
});
plantInside.add(tagPart(plantMitos, 'mitochondria'));

// ---------- The animal cell (like the ones in you) ----------

const animal = new THREE.Group();
animal.position.set(2.35, 0, 0);
scene.add(animal);

const animalBody = new THREE.Group();
animal.add(animalBody);
const animalMembraneMat = glass(0x8fe3cf, 0.26);
const animalMembrane = new THREE.Mesh(blobGeometry(1.45, { bump: 0.05, seed: 8, scale: [1.05, 0.95, 0.9] }), animalMembraneMat);
animalMembrane.renderOrder = 5;
animalBody.add(tagPart(animalMembrane, 'membrane'));
const animalCytoMat = glass(0xbff0e6, 0.12);
const animalCyto = new THREE.Mesh(blobGeometry(1.4, { bump: 0.05, seed: 8, scale: [1.05, 0.95, 0.9] }), animalCytoMat);
animalCyto.renderOrder = 1;
animalBody.add(tagPart(animalCyto, 'cytoplasm'));

const animalNucleus = makeNucleus({ radius: 0.45, chromosomeCount: 0, poreCount: 30, seed: 42 });
animalNucleus.group.position.set(0.05, 0.05, 0);
animalBody.add(tagPart(animalNucleus.group, 'nucleus'));

const centrioles = makeCentriolePair(0.26);
centrioles.position.set(0.55, 0.55, 0.35);
animalBody.add(tagPart(centrioles, 'centrioles'));

const smallVacuoles = new THREE.Group();
[[-0.75, 0.35, 0.45, 0.17], [0.65, -0.55, 0.45, 0.14], [-0.35, -0.75, -0.35, 0.15]].forEach(([x, y, z, r]) => {
  const v = makeVacuole(r);
  v.position.set(x, y, z);
  smallVacuoles.add(v);
});
animalBody.add(tagPart(smallVacuoles, 'vacuoles'));

const animalMitos = new THREE.Group();
[[-0.85, -0.25, -0.2], [0.85, 0.05, -0.35], [-0.2, 0.85, 0.3], [0.25, -0.85, 0.15]].forEach((p, i) => {
  const m = makeMitochondrion(0.4);
  m.position.set(...p);
  m.rotation.set(i * 0.8, i * 1.4, i * 0.3);
  animalMitos.add(m);
});
animalBody.add(tagPart(animalMitos, 'mitochondria'));

// ---------- Labels ----------

const plantTag = makeLabel('🌿 Plant cell (from a leaf)');
plantTag.position.set(0, -PH / 2 - 0.35, 0);
plant.add(plantTag);
const animalTag = makeLabel('🐾 Animal cell (like yours)');
animalTag.position.set(0, -1.85, 0);
animal.add(animalTag);

addLabel('wall', plant, new THREE.Vector3(-0.6, PH / 2 + 0.25, 0.5));
addLabel('chloroplasts', chloroplasts[5], new THREE.Vector3(0, 0.3, 0));
addLabel('bigvacuole', plantInside, new THREE.Vector3(0.15, -0.1, 0.75));
addLabel('nucleus', plantNucleus.group, new THREE.Vector3(0, 0.45, 0.2));
addLabel('membrane', animalBody, new THREE.Vector3(-0.9, 1.25, 0.3));
addLabel('cytoplasm', animalBody, new THREE.Vector3(0.6, -0.5, 0.9));
addLabel('centrioles', centrioles, new THREE.Vector3(0, 0.3, 0));
addLabel('vacuoles', smallVacuoles.children[0], new THREE.Vector3(0, 0.3, 0));
addLabel('mitochondria', animalMitos.children[1], new THREE.Vector3(0, 0.3, 0));

// ---------- Spot the difference ----------

const spotCount = document.getElementById('spot-count');
function showSpotCount() {
  spotCount.textContent = `(${found.size} of ${DIFFERENCES.length})`;
}

function spotted(key) {
  if (!DIFFERENCES.includes(key) || found.has(key)) return;
  found.add(key);
  showSpotCount();
  if (found.size === DIFFERENCES.length && complete('spot')) {
    setTimeout(() => cello.say('All 4 differences! Wall, chloroplasts, and a big vacuole for plants. Centrioles for animals.', { mood: 'wow', ms: 6500 }), 2600);
  }
}

// ---------- Who has it? ----------

let sortOrder = [...SORT.keys()].sort(() => Math.random() - 0.5);
let sortAt = 0;
const sorted = new Set();
const sortQuestion = document.getElementById('sort-question');

function showSort() {
  sortQuestion.textContent = `Who has ${SORT[sortOrder[sortAt]].thing}?`;
  document.getElementById('sort-count').textContent = `${sorted.size} of ${SORT.length}`;
}

document.querySelectorAll('[data-sort]').forEach((b) => {
  b.addEventListener('click', () => {
    const item = SORT[sortOrder[sortAt]];
    if (b.dataset.sort !== item.answer) {
      const hint = item.answer === 'both' ? 'Look at both cells closely!' : 'Look for it in both cells!';
      cello.say(`Not quite. ${hint}`, { mood: 'sad', ms: 3000 });
      return;
    }
    sorted.add(item.thing);
    if (sorted.size === SORT.length && complete('sort')) {
      cello.say(`${item.why} You sorted them all!`, { mood: 'wow', ms: 6000 });
    } else {
      cello.say(item.why, { ms: 4000 });
    }
    sortAt = (sortAt + 1) % sortOrder.length;
    if (sortAt === 0) sortOrder = [...SORT.keys()].sort(() => Math.random() - 0.5);
    showSort();
  });
});

// ---------- Sunshine ----------

const sunLight = new THREE.DirectionalLight(0xfff1a8, 0);
sunLight.position.set(-4, 6, 3);
scene.add(sunLight);
const SUNNY_GREEN = new THREE.Color(0xc8ff7a);
const chloroMats = new Set();
chloroGroup.traverse((o) => { if (o.material) chloroMats.add(o.material); });
const sugars = []; // { mesh, from, to, age }
const sugarGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
const sugarMat = solid(0xffffff, { emissive: 0x8a8a7a });
const state = { sun: false, spawn: 0, water: 5, time: 0 };

bindToggle('sun', (on) => {
  state.sun = on;
  document.getElementById('hint').textContent = on
    ? 'The white bits are sugar: food made from sunlight'
    : 'Tap the parts only one cell has · Drag to spin';
  if (!on) return;
  if (complete('sun')) {
    cello.say('Only the plant cell makes food! Its chloroplasts turn sunlight into sugar. Animal cells can’t, so you have to eat!', { mood: 'wow', ms: 7000 });
  } else {
    cello.say('Sunshine! The chloroplasts get busy making sugar.', { ms: 3000 });
  }
});

function updateSun(dt) {
  sunLight.intensity += ((state.sun ? 2.2 : 0) - sunLight.intensity) * (1 - Math.exp(-dt * 4));
  // Chloroplasts brighten in the sun. (Color, not glow: the glow is for taps.)
  const glow = state.sun ? 0.5 + 0.2 * Math.sin(state.time * 4) : 0;
  chloroMats.forEach((m) => {
    m.userData.sunBase ??= m.color.clone();
    m.color.copy(m.userData.sunBase).lerp(SUNNY_GREEN, glow);
  });
  state.spawn -= dt;
  if (state.sun && state.spawn <= 0) {
    state.spawn = 0.35;
    const from = chloroplasts[Math.floor(Math.random() * chloroplasts.length)].position.clone();
    const to = plantMitos.children[Math.floor(Math.random() * plantMitos.children.length)].position.clone();
    const mesh = new THREE.Mesh(sugarGeo, sugarMat);
    mesh.position.copy(from);
    plantInside.add(mesh);
    sugars.push({ mesh, from, to, age: 0 });
  }
  for (let i = sugars.length - 1; i >= 0; i--) {
    const s = sugars[i];
    s.age += dt;
    const t = Math.min(s.age / 2.2, 1);
    s.mesh.position.lerpVectors(s.from, s.to, THREE.MathUtils.smoothstep(t, 0, 1));
    s.mesh.rotation.y += dt * 3;
    if (t >= 1) {
      plantInside.remove(s.mesh);
      sugars.splice(i, 1);
    }
  }
}

// ---------- Water ----------

const tried = new Set();
bindSlider('water', (v) => (v <= 1 ? 'Dried out' : v >= 9 ? 'Soaking' : v === 5 ? 'Just right' : v < 5 ? 'A bit dry' : 'Wet'), (v) => {
  state.water = v;
  if (v <= 1 && !tried.has('dry')) {
    tried.add('dry');
    complete('dry');
    cello.say('Thirsty! The plant cell’s vacuole shrinks, and the inside pulls away from the wall. That’s why plants droop. The animal cell shrivels up.', { mood: 'sad', ms: 8000 });
  } else if (v >= 9 && !tried.has('soak')) {
    tried.add('soak');
    complete('soak');
    cello.say('The plant cell’s vacuole swells and presses on the wall, but the wall stops it from bursting. The animal cell has no wall, so too much water could make it burst!', { mood: 'wow', ms: 9000 });
  } else if (v > 1 && v < 9) {
    tried.delete('dry');
    tried.delete('soak');
  }
});

function updateWater(dt) {
  const w = state.water;
  const k = 1 - Math.exp(-dt * 3);
  // Plant: the inside shrinks away from the wall when dry, and fills it when wet.
  const inside = w >= 5 ? 1 + (w - 5) * 0.008 : 0.7 + w * 0.06;
  const vac = w >= 5 ? 1 + (w - 5) * 0.03 : 0.45 + w * 0.11;
  plantInside.scale.setScalar(plantInside.scale.x + (inside - plantInside.scale.x) * k);
  bigVacuole.scale.setScalar(bigVacuole.scale.x + (vac - bigVacuole.scale.x) * k);
  // Animal: shrivels when dry, swells (and wobbles) when soaking.
  const size = 0.72 + w * 0.056;
  const shake = w >= 9 ? Math.sin(state.time * 30) * 0.015 : 0;
  const s = animalBody.scale.x + (size - animalBody.scale.x) * k;
  animalBody.scale.set(s + shake, s * (w <= 1 ? 0.9 : 1) - shake, s);
}

// ---------- Controls ----------

document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Every frame ----------

stage.onFrame((dt) => {
  state.time += dt;
  updateSun(dt);
  updateWater(dt);
  chloroplasts.forEach((c, i) => { c.rotation.y += dt * 0.2 * (i % 2 ? 1 : -1); });
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { membrane: 0x8fe3cf, cytoplasm: 0xbff0e6, wall: 0x5fcf5f },
  light: { membrane: 0x2fa889, cytoplasm: 0x7fd6c2, wall: 0x3fae4f },
};
window.elixTheme.watch((theme) => {
  const c = THEME_COLORS[theme];
  plantMembraneMat.color.set(c.membrane);
  animalMembraneMat.color.set(c.membrane);
  plantCytoMat.color.set(c.cytoplasm);
  animalCytoMat.color.set(c.cytoplasm);
  wallMat.color.set(c.wall);
});

// ---------- Start ----------

showSort();
showSpotCount();
