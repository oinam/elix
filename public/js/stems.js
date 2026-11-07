import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// Stems. A woody stem and a soft stem, cut across, side by side: the woody
// one has its tubes in rings (bark, phloem, cambium, xylem, pith), the soft
// one in little bundles. Make the cambium grow new tubes. Then grow a tree
// ring by ring (rainy years make wide rings, dry years thin ones) and guess
// the age of a mystery stump.

const PARTS = {
  bark: { name: 'Bark', text: 'The tough outside of a woody stem. It protects the tree from bugs, weather, and bumps.' },
  phloem: { name: 'Food tubes (phloem)', text: 'Just inside the bark. They carry food (sugar) from the leaves down to the rest of the plant.' },
  cambium: { name: 'Cambium', text: 'A very thin layer that makes new cells. New xylem grows on its inside, and new phloem on its outside. That’s how a stem gets thicker!' },
  xylem: { name: 'Water tubes (xylem)', text: 'They carry water and minerals up from the roots. In a tree trunk, old xylem piles up year after year. That’s wood!' },
  pith: { name: 'Pith', text: 'Soft, spongy cells in the very middle of the stem.' },
  epidermis: { name: 'Stem skin (epidermis)', text: 'A soft stem has a thin, green skin instead of bark. Its tubes come in little bundles, like straws in a ring.' },
  spring: { name: 'Light ring (spring wood)', text: 'Grows in spring, when there’s lots of water. The tree grows fast, so the cells are big and light.' },
  summer: { name: 'Dark ring (late summer wood)', text: 'Grows in late summer and fall, with less rain. The tree grows slowly, so the cells are small, packed, and dark.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const AIM = {
  stems: { camera: [0, 4.2, 5.4], target: [0, 0, 0] },
  rings: { camera: [0, 5.2, 3.6], target: [0, 0, 0.1] },
};

const explorer = createExplorer({
  topic: 'stems',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Two stems, cut across! One is woody, like a tree. One is soft, like a sunflower.',
  allPartsLine: 'All 8 parts! You can read a stem like a book.',
});
const { addLabel, tagPart, untagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, side: THREE.DoubleSide, ...extra });
const C = (hex) => new THREE.Color(hex);

const barkMat = mat(0x6b4429, { roughness: 0.95 });
const cambiumMat = mat(0x8fd05a, { emissive: 0x2a5a10, emissiveIntensity: 0.4 });
const pithMat = mat(0xf4e6c4);
const springMat = mat(0xeccf98);
const summerMat = mat(0xb98a50);
// Tree rings always keep their real wood colors.
const ringSpringMat = mat(0xeccf98);
const ringSummerMat = mat(0xa87a42);
const ringPhloemMat = mat(0xa8744a);
const phloemMat = mat(0xa8744a);
const skinMat = mat(0x5fa83a);
const softMat = mat(0xe6f2cc);
const bundleXylemMat = mat(0xd9d3a2);
const bundlePhloemMat = mat(0xb9d98c);

// Colors for “Color the tubes”: real colors, and follow-me colors.
const TINTS = [
  [springMat, C(0xeccf98), C(0x8fb4ff)],
  [summerMat, C(0xb98a50), C(0x4f7fe0)],
  [bundleXylemMat, C(0xd9d3a2), C(0x5b8def)],
  [phloemMat, C(0xa8744a), C(0xff9f43)],
  [bundlePhloemMat, C(0xb9d98c), C(0xff9f43)],
];

// ---------- Building a slice of stem ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const H = 0.5; // thickness of each slice

// A flat ring on top of the slice, from inner to outer radius.
function ringFace(inner, outer, material) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96).rotateX(-Math.PI / 2), material);
  mesh.position.y = H / 2;
  return mesh;
}

// A woody slice: pith in the middle, a light and a dark ring for every year,
// then cambium, phloem, and bark. Returns the group and its tagged meshes.
function woodySlice(years, { ringParts = false } = {}) {
  const group = new THREE.Group();
  const tagged = [];
  const add = (mesh, part) => { group.add(mesh); tagged.push(tagPart(mesh, part)); return mesh; };
  let r = 0.16;
  add(ringFace(0, r, pithMat), 'pith');
  years.forEach((w) => {
    add(ringFace(r, r + w * 0.65, ringParts ? ringSpringMat : springMat), ringParts ? 'spring' : 'xylem');
    add(ringFace(r + w * 0.65, r + w, ringParts ? ringSummerMat : summerMat), ringParts ? 'summer' : 'xylem');
    r += w;
  });
  const layer = (w, material, part) => { add(ringFace(r, r + w, material), part); r += w; };
  layer(0.035, cambiumMat, 'cambium');
  layer(0.07, ringParts ? ringPhloemMat : phloemMat, 'phloem');
  layer(0.13, barkMat, 'bark');
  add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, H, 96, 1, true), barkMat), 'bark');
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r, 96).rotateX(Math.PI / 2), summerMat);
  bottom.position.y = -H / 2;
  group.add(bottom);
  return { group, tagged, radius: r };
}

function swap(holder, slice) {
  if (holder.slice) {
    holder.slice.tagged.forEach(untagPart);
    holder.remove(holder.slice.group);
  }
  holder.slice = slice;
  holder.add(slice.group);
}

// ---------- View 1: woody and soft stems ----------

const stemsView = new THREE.Group();
scene.add(stemsView);

const woody = new THREE.Group();
woody.position.x = -1.75;
stemsView.add(woody);
const woodyYears = [0.2, 0.18, 0.2, 0.16];
swap(woody, woodySlice(woodyYears));

// A soft stem: green skin, soft filling, and a ring of bundles. Each bundle
// has phloem on the outside, xylem on the inside, and cambium between.
const soft = new THREE.Group();
soft.position.x = 1.75;
stemsView.add(soft);
const SOFT_R = 1.25;
soft.add(tagPart(ringFace(SOFT_R - 0.06, SOFT_R, skinMat), 'epidermis'));
soft.add(tagPart(new THREE.Mesh(new THREE.CylinderGeometry(SOFT_R, SOFT_R, H, 96, 1, true), skinMat), 'epidermis'));
const softFill = ringFace(0, SOFT_R - 0.06, softMat);
softFill.position.y -= 0.002;
soft.add(tagPart(softFill, 'pith'));
const bundles = [];
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  const bundle = new THREE.Group();
  bundle.position.set(Math.cos(a) * 0.88, H / 2 + 0.003, Math.sin(a) * 0.88);
  bundle.rotation.y = a;
  const half = (start, material) => new THREE.Mesh(new THREE.CircleGeometry(0.16, 24, start, Math.PI).rotateX(-Math.PI / 2), material);
  // Phloem faces outward, xylem faces the middle.
  bundle.add(tagPart(half(Math.PI / 2, bundlePhloemMat), 'phloem'));
  bundle.add(tagPart(half(-Math.PI / 2, bundleXylemMat), 'xylem'));
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.32).rotateX(-Math.PI / 2), cambiumMat);
  strip.position.y = 0.002;
  bundle.add(tagPart(strip, 'cambium'));
  soft.add(bundle);
  bundles.push(bundle);
}

addLabel('bark', woody, v(-1.4, 0.4, 0.5), { hideWith: stemsView });
addLabel('xylem', woody, v(0.3, 0.45, 0.2), { hideWith: stemsView });
addLabel('pith', woody, v(0, 0.45, -0.1), { hideWith: stemsView });
addLabel('epidermis', soft, v(1.1, 0.4, 0.6), { hideWith: stemsView });
addLabel('phloem', soft, v(0.88, 0.5, -0.3), { hideWith: stemsView });
addLabel('cambium', soft, v(-0.88, 0.5, 0.25), { hideWith: stemsView });

// ---------- View 2: tree rings ----------

const ringsView = new THREE.Group();
ringsView.visible = false;
scene.add(ringsView);
const stump = new THREE.Group();
ringsView.add(stump);

const WET = 0.085;
const DRY = 0.03;
let years = [WET, WET];
let mystery = null; // the right answer while a mystery stump is out

function buildStump(list, { scale = true } = {}) {
  const slice = woodySlice(list, { ringParts: true });
  swap(stump, slice);
  // Keep a big tree on screen: shrink the slice once it gets wide.
  if (scale) stump.scale.setScalar(Math.min(1, 1.9 / slice.radius));
}

const ageEl = document.getElementById('age');
function showAge() {
  ageEl.textContent = mystery ? '' : `🎂 ${years.length} ${years.length === 1 ? 'year' : 'years'}`;
}

addLabel('spring', ringsView, v(-0.6, 0.5, 0.9), { hideWith: ringsView });
addLabel('summer', ringsView, v(0.7, 0.5, -0.7), { hideWith: ringsView });

// ---------- Controls ----------

const state = { view: 'stems', grownStem: 0, pulse: 0 };
const levelCard = document.getElementById('level-card');

function aim() {
  const { camera: c, target: t } = AIM[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  stemsView.visible = key === 'stems';
  ringsView.visible = key === 'rings';
  document.getElementById('stem-tools').style.display = key === 'stems' ? '' : 'none';
  document.getElementById('ring-tools').hidden = false;
  document.getElementById('ring-tools').style.display = key === 'rings' ? '' : 'none';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  if (b.dataset.view === 'rings') {
    if (mystery) endMystery();
    levelCard.textContent = 'A slice of a tree trunk. Every light ring and dark ring together is one year.';
    cello.say('A slice of tree trunk! Grow it one year at a time and watch the rings.', { ms: 4500 });
  } else {
    levelCard.textContent = 'Two stems, cut across. Spot the differences!';
  }
}));

bindToggle('tint', (on) => {
  TINTS.forEach(([material, real, follow]) => material.color.copy(on ? follow : real));
  if (!on) return;
  levelCard.textContent = 'Blue is xylem, orange is phloem. Woody stem: rings. Soft stem: bundles.';
  if (complete('tint')) cello.say('In the woody stem, the tubes make rings. In the soft stem, they come in bundles!', { mood: 'wow', ms: 6000 });
});

document.getElementById('grow-stem').addEventListener('click', () => {
  if (state.grownStem >= 5) {
    cello.say('That stem is nice and thick! Real stems take a whole year for each ring.', { ms: 4500 });
    return;
  }
  state.grownStem += 1;
  woodyYears.push(0.12);
  swap(woody, woodySlice(woodyYears));
  bundles.forEach((b) => b.scale.setScalar(1 + state.grownStem * 0.08));
  state.pulse = 1.5;
  levelCard.textContent = 'The cambium made new xylem on its inside, and new phloem on its outside.';
  if (complete('cambium')) cello.say('Look! The cambium made new tubes, so the stem got thicker.', { mood: 'wow', ms: 5000 });
  else cello.say('A bit thicker!', { ms: 2000, important: false });
});

function grow(widths) {
  if (mystery) endMystery();
  if (years.length + widths.length > 40) {
    cello.say('What a big old tree! Start a new one to grow more.', { ms: 4000 });
    return;
  }
  years = years.concat(widths);
  buildStump(years);
  showAge();
  if (years.length >= 10 && complete('grow')) {
    cello.say(`${years.length} years old! Count the dark rings, and you’ll get the same number.`, { mood: 'wow', ms: 5000 });
  }
}

document.getElementById('wet-year').addEventListener('click', () => {
  grow([WET]);
  cello.say('A rainy year: lots of water, so a nice wide ring.', { ms: 3500, important: false });
});

document.getElementById('dry-year').addEventListener('click', () => {
  grow([DRY]);
  levelCard.textContent = 'A dry year makes a thin ring. Look at the outside edge!';
  if (complete('dry')) cello.say('See that thin ring at the edge? Not much rain, so the tree grew only a little.', { mood: 'wow', ms: 5500 });
  else cello.say('A dry year: a thin ring.', { ms: 2500, important: false });
});

document.getElementById('ten-years').addEventListener('click', () => {
  grow(Array.from({ length: 10 }, () => (Math.random() < 0.2 ? DRY : WET * (0.8 + Math.random() * 0.4))));
});

document.getElementById('sapling').addEventListener('click', () => {
  if (mystery) endMystery();
  years = [WET];
  buildStump(years);
  showAge();
  cello.say('A brand new tree, just one year old.', { ms: 3000, important: false });
});

// Mystery stump: count the rings and pick an answer.
const guessesEl = document.getElementById('guesses');
const mysteryText = document.getElementById('mystery-text');

function endMystery() {
  mystery = null;
  guessesEl.replaceChildren();
  mysteryText.textContent = 'How old was this tree? Count the dark rings!';
  buildStump(years);
  showAge();
}

document.getElementById('mystery').addEventListener('click', () => {
  mystery = 4 + Math.floor(Math.random() * 6);
  buildStump(Array.from({ length: mystery }, () => (Math.random() < 0.25 ? DRY * 1.6 : WET * 1.4)));
  showAge();
  const answers = new Set([mystery]);
  while (answers.size < 3) answers.add(Math.max(2, mystery + Math.floor(Math.random() * 7) - 3));
  guessesEl.replaceChildren(...[...answers].sort((a, b) => a - b).map((n) => {
    const b = document.createElement('button');
    b.className = 'btn press';
    b.textContent = `${n} years`;
    b.addEventListener('click', () => guess(n));
    return b;
  }));
  mysteryText.textContent = 'How old was this tree? Count the dark rings, from the middle out.';
  cello.say('Mystery stump! How old was this tree?', { ms: 3500 });
});

function guess(n) {
  if (n === mystery) {
    mysteryText.textContent = `Yes! ${n} dark rings, so ${n} years old.`;
    if (complete('count')) cello.say('You got it! You can tell a tree’s age just by counting its rings.', { mood: 'wow', ms: 5000 });
    else cello.say('Right again! You’re a ring reader.', { ms: 3000 });
    guessesEl.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  } else {
    cello.say('So close! Count the dark rings again, from the middle out.', { ms: 4000 });
  }
}

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

stage.onFrame((dt) => {
  // The cambium glows for a moment after it grows.
  state.pulse = Math.max(0, state.pulse - dt);
  cambiumMat.emissiveIntensity = 0.4 + Math.sin(state.pulse * 10) * state.pulse * 0.6;
});

buildStump(years);
showAge();
setView('stems');
