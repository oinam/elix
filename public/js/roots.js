import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// Roots. Slice a root open to see its layers: root hairs, skin, the spongy
// cortex, and the tubes in the middle (xylem in a star, phloem between its
// arms). Water soaks in through the root hairs and climbs the xylem; food
// comes down the phloem. Then meet three kinds of roots: taproots (carrot and
// beet), fibrous roots (grass), and prop roots (corn).

const PARTS = {
  rootHairs: { name: 'Root hairs', text: 'Tiny hairs that poke out into the soil and drink in water and minerals. There are thousands of them!' },
  epidermis: { name: 'Root skin (epidermis)', text: 'The outside layer of cells. It wraps the root, and the root hairs grow out of it.' },
  cortex: { name: 'Cortex', text: 'Big, soft cells that fill most of the root. Water passes through them on its way to the middle. Some roots store food here.' },
  xylem: { name: 'Water tubes (xylem)', text: 'In the very middle of the root. These tubes carry water and minerals up, from the root to the stem.' },
  phloem: { name: 'Food tubes (phloem)', text: 'Around the middle, between the arms of the xylem. They bring food (sugar) down from the leaves, so the root can live and grow.' },
  cap: { name: 'Root cap', text: 'A tough tip, like a helmet. It protects the root as it pushes down through the soil.' },
  tap: { name: 'Taproot', text: 'One big, thick root that grows deep, with tiny roots on its sides. Carrots, radishes, and beets are taproots. They store food, so we eat them!' },
  fibrous: { name: 'Fibrous roots', text: 'Lots of thin roots, all about the same size, spreading out like a mop. Grass, wheat, and rice have fibrous roots. They hold the soil together.' },
  prop: { name: 'Prop roots', text: 'Roots that grow out of the stem, above the ground, and reach down into the soil. They prop up tall corn plants, like finger-shaped supports.' },
};

const VIEWS = {
  inside: { camera: [5.2, 1.6, 4.4], target: [0.6, 0, 0], line: 'Slide the root open to look inside!' },
  tap: { camera: [0, 0.6, 8.5], target: [0, -0.4, 0], line: 'Taproots! One big root goes deep. We eat carrots and beets.' },
  fibrous: { camera: [0, 0.6, 8.5], target: [0, -0.4, 0], line: 'Fibrous roots! Lots of thin roots, like a mop. They hold the soil tight.' },
  prop: { camera: [0, 1.2, 9.5], target: [0, 0.6, 0], line: 'Prop roots grow out of the corn stem and push into the ground. Like legs!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls, renderer } = stage;
renderer.localClippingEnabled = true;

const explorer = createExplorer({
  topic: 'roots',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['epidermis'], // taps through the see-through skin reach the tubes
  greeting: 'Roots are hidden under the ground, but they work hard! Let’s look inside one.',
  allPartsLine: 'All 9 parts! You’re a root expert.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

const cut = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 3.2); // keeps x < 3.2
const skinMat = mat(0xe3c48f, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [cut] });
const hairMat = mat(0xf2dcb0);
const cellMat = mat(0xf6ebcf);
const faceMat = mat(0xead9b0, { side: THREE.DoubleSide });
const capMat = mat(0xc99a5b);
const xylemMat = mat(0x5b8def, { emissive: 0x15306b });
const phloemMat = mat(0xff9f43, { emissive: 0x6b3500 });
const waterMat = mat(0x8fd0ff, { emissive: 0x2a6aa8 });
const sugarMat = mat(0xffd36b, { emissive: 0x8a5200 });
const grainMat = mat(0x8a6040);
const soilMat = mat(0x9a6a42, { transparent: true, opacity: 0.35, depthWrite: false });
const carrotMat = mat(0xff8a2a);
const beetMat = mat(0x9b2a5c);
const greenMat = mat(0x4cb050, { side: THREE.DoubleSide });
const thinRootMat = mat(0xe0c69a);
const propMat = mat(0xd9b96a);
const stalkMat = mat(0x7fb84e);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (points, radius, material, segments = 32) =>
  new THREE.Mesh(new THREE.TubeGeometry(curveOf(points), segments, radius, 8, false), material);
const rand = (a, b) => a + Math.random() * (b - a);

// Spheres placed in one go, as one tappable part.
function cells(points, radius, material, squash = 1) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), material, points.length);
  const m = new THREE.Matrix4();
  points.forEach(([p, r], i) => mesh.setMatrixAt(i, m.compose(p, new THREE.Quaternion(), v(r * squash, r, r))));
  return mesh;
}

// Moving drops along paths.
const flows = [];
function flow(parent, points, { count, material, radius, group }) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), material, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  parent.add(mesh);
  flows.push({ curve: curveOf(points), mesh, count, offset: Math.random(), group });
}

// ---------- View 1: inside a root ----------

// The root lies on its side: the tip (and root cap) on the left, the stem
// off to the right. The slider moves the cut face to the left.
const inside = new THREE.Group();
scene.add(inside);

const R = 1.2;
const LEFT = -3.2;
const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 6.4, 40, 1, true).rotateZ(Math.PI / 2), skinMat);
inside.add(tagPart(body, 'epidermis'));

const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2).scale(1.1, 1, 1), capMat);
cap.position.x = LEFT;
inside.add(tagPart(cap, 'cap'));

// The cut face: a disk of cells that slides along with the cut.
const face = new THREE.Group();
inside.add(face);
const backing = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 48).rotateY(Math.PI / 2), faceMat);
backing.position.x = -0.02;
face.add(tagPart(backing, 'cortex'));

const ring = [];
for (let i = 0; i < 56; i++) {
  const a = (i / 56) * Math.PI * 2;
  ring.push([v(0, Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05)), 0.07]);
}
face.add(tagPart(cells(ring, 0.07, hairMat, 0.4), 'epidermis'));

const cortex = [];
for (let r = 0.64; r < R - 0.12; r += 0.16) {
  const n = Math.floor((Math.PI * 2 * r) / 0.16);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r * 3;
    cortex.push([v(0.01, Math.cos(a) * r, Math.sin(a) * r), 0.075]);
  }
}
face.add(tagPart(cells(cortex, 0.075, cellMat, 0.35), 'cortex'));

// Xylem: a star with four arms. Phloem: a patch between each pair of arms.
const xylemCells = [[v(0.02, 0, 0), 0.12]];
const phloemCells = [];
for (let k = 0; k < 4; k++) {
  const a = (k / 4) * Math.PI * 2;
  [0.18, 0.31, 0.43].forEach((r, j) => xylemCells.push([v(0.02, Math.cos(a) * r, Math.sin(a) * r), 0.075 - j * 0.015]));
  const b = a + Math.PI / 4;
  for (let j = 0; j < 4; j++) {
    const r = 0.36 + (j % 2) * 0.08;
    const bb = b + (j < 2 ? -0.18 : 0.18);
    phloemCells.push([v(0.02, Math.cos(bb) * r, Math.sin(bb) * r), 0.04]);
  }
}
face.add(tagPart(cells(xylemCells, 0.1, xylemMat, 0.5), 'xylem'));
face.add(tagPart(cells(phloemCells, 0.04, phloemMat, 0.5), 'phloem'));

// The same tubes run the whole length of the root.
const XYLEM_LINE = [v(LEFT + 0.3, 0, 0), v(3.4, 0, 0)];
const strands = new THREE.Group();
inside.add(strands);
strands.add(tagPart(tube(XYLEM_LINE, 0.1, xylemMat), 'xylem'));
const PHLOEM_LINES = [0, 1, 2, 3].map((k) => {
  const b = (k / 4) * Math.PI * 2 + Math.PI / 4;
  return [v(3.4, Math.cos(b) * 0.4, Math.sin(b) * 0.4), v(LEFT + 0.4, Math.cos(b) * 0.4, Math.sin(b) * 0.4)];
});
PHLOEM_LINES.forEach((line) => strands.add(tagPart(tube(line, 0.04, phloemMat), 'phloem')));
strands.traverse((o) => {
  if (o.material) {
    o.material = o.material.clone();
    o.material.clippingPlanes = [cut];
  }
});

// Root hairs poke out all around, near the tip. Each one has a path that
// water follows: in at the tip of the hair, through the cortex, into the
// xylem, and off toward the stem.
const hairs = [];
for (let i = 0; i < 70; i++) {
  const x = rand(LEFT + 0.6, 2.8);
  const a = rand(0, Math.PI * 2);
  const len = rand(0.5, 1.2);
  const dir = v(0, Math.cos(a), Math.sin(a));
  const base = dir.clone().multiplyScalar(R - 0.02).setX(x);
  const tip = dir.clone().multiplyScalar(R + len).setX(x + rand(-0.15, 0.15));
  const hair = tube([base, base.clone().lerp(tip, 0.5).add(v(rand(-0.06, 0.06), 0, 0)), tip], 0.025, hairMat, 8);
  hair.userData.x = x;
  inside.add(tagPart(hair, 'rootHairs'));
  hairs.push({ hair, x, base, tip });
}

hairs.filter((h, i) => i % 5 === 0).forEach(({ base, tip, x }) => {
  flow(inside, [tip, base, base.clone().multiplyScalar(0.5).setX(x + 0.2), v(x + 0.5, 0, 0), v(3.4, 0, 0)],
    { count: 6, material: waterMat, radius: 0.06, group: 'water' });
});
PHLOEM_LINES.forEach((line) => flow(inside, line, { count: 7, material: sugarMat, radius: 0.05, group: 'food' }));

// Soil grains around the root, for the feel of being underground.
const grains = [];
for (let i = 0; i < 50; i++) {
  const a = rand(0, Math.PI * 2);
  const r = rand(R + 0.4, R + 2.2);
  grains.push([v(rand(LEFT - 0.8, 3.4), Math.cos(a) * r, Math.sin(a) * r), rand(0.03, 0.08)]);
}
inside.add(cells(grains, 0.1, grainMat));

addLabel('rootHairs', inside, v(-1.2, R + 1.3, 0));
addLabel('epidermis', inside, v(0.8, -R - 0.15, 0.4));
addLabel('cap', inside, v(LEFT - 0.9, -0.5, 0));
addLabel('cortex', face, v(0.05, 0.8, 0.5), { hideWith: face });
addLabel('xylem', face, v(0.1, 0, 0), { hideWith: face });
addLabel('phloem', face, v(0.1, -0.45, -0.35), { hideWith: face });

// ---------- Plant views share a soil block ----------

function plantView(depth = 3.2) {
  const g = new THREE.Group();
  g.visible = false;
  const soil = new THREE.Mesh(new THREE.BoxGeometry(7, depth, 2.6), soilMat);
  soil.position.y = -depth / 2;
  soil.renderOrder = 2;
  g.add(soil);
  scene.add(g);
  return g;
}

function leafyTop(g, x, y, count, height) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const tilt = rand(0.15, 0.45);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.07, height * rand(0.7, 1.1), 6), greenMat);
    blade.geometry.translate(0, height / 2, 0);
    blade.position.set(x, y, 0);
    blade.rotation.set(Math.sin(a) * tilt, 0, Math.cos(a) * tilt);
    g.add(blade);
  }
}

// Taproots: a carrot and a beet.
const tapView = plantView();
const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3, 24).rotateX(Math.PI), carrotMat);
carrot.position.set(-1.4, -1.5, 0);
tapView.add(tagPart(carrot, 'tap'));
for (let i = 0; i < 8; i++) {
  const y = rand(-0.6, -2.6);
  const side = i % 2 ? 1 : -1;
  const r = 0.42 * (1 + y / 3);
  tapView.add(tagPart(tube([v(-1.4 + side * r, y), v(-1.4 + side * (r + 0.3), y - 0.15, rand(-0.2, 0.2)), v(-1.4 + side * (r + 0.55), y - 0.4)], 0.015, thinRootMat, 8), 'tap'));
}
leafyTop(tapView, -1.4, 0, 9, 1.4);

const beet = new THREE.Group();
beet.position.set(1.5, -0.55, 0);
beet.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16).scale(1, 0.9, 1), beetMat));
const beetTail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.8, 16).rotateX(Math.PI), beetMat);
beetTail.position.y = -1.2;
beet.add(beetTail);
tapView.add(tagPart(beet, 'tap'));
leafyTop(tapView, 1.5, 0, 7, 1.2);
addLabel('tap', tapView, v(-0.4, -1.4, 0.5), { hideWith: tapView });

// Fibrous roots: two tufts of grass.
const fibrousView = plantView();
[-1.3, 1.3].forEach((x) => {
  for (let i = 0; i < 36; i++) {
    const a = rand(0, Math.PI * 2);
    const end = v(x + Math.cos(a) * rand(0.3, 1.4), rand(-1.4, -2.9), Math.sin(a) * rand(0.2, 0.9));
    const mid = v(x + (end.x - x) * 0.45, end.y * 0.45, end.z * 0.45).add(v(rand(-0.15, 0.15), 0, 0));
    fibrousView.add(tagPart(tube([v(x, 0), mid, end], 0.022, thinRootMat, 12), 'fibrous'));
  }
  leafyTop(fibrousView, x, 0, 22, 1.6);
});
addLabel('fibrous', fibrousView, v(0, -1.8, 0.5), { hideWith: fibrousView });

// Prop roots: a corn plant, with roots coming out of the stem above ground.
const propView = plantView(2.6);
const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 4.6, 16), stalkMat);
stalk.position.y = 2.3;
propView.add(stalk);
for (let i = 0; i < 6; i++) {
  const y = 1 + i * 0.6;
  const side = i % 2 ? 1 : -1;
  const leafPath = [v(0, y), v(side * 0.7, y + 0.4, 0.1), v(side * 1.5, y + 0.1, 0.2), v(side * 1.9, y - 0.5, 0.2)];
  const leaf = new THREE.Mesh(new THREE.TubeGeometry(curveOf(leafPath), 16, 0.08, 4, false).scale(1, 0.4, 1), greenMat);
  leaf.position.y = y * 0.6;
  propView.add(leaf);
}
const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.6, 6, 12), mat(0xf5d15a));
cob.position.set(0.25, 2.2, 0.1);
cob.rotation.z = -0.35;
propView.add(cob);
[0.35, 0.7].forEach((y, row) => {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + row * 0.4;
    const out = v(Math.cos(a), 0, Math.sin(a) * 0.7);
    const start = out.clone().multiplyScalar(0.15).setY(y);
    const bend = out.clone().multiplyScalar(0.6 + row * 0.2).setY(y - 0.25);
    const end = out.clone().multiplyScalar(0.9 + row * 0.35).setY(-0.5);
    propView.add(tagPart(tube([start, bend, end], 0.04, propMat, 12), 'prop'));
  }
});
for (let i = 0; i < 20; i++) {
  const a = rand(0, Math.PI * 2);
  const end = v(Math.cos(a) * rand(0.4, 1.6), rand(-1.2, -2.3), Math.sin(a) * rand(0.2, 0.8));
  propView.add(tube([v(0, 0), end.clone().multiplyScalar(0.5), end], 0.02, thinRootMat, 10));
}
addLabel('prop', propView, v(1.3, 0.5, 0.4), { hideWith: propView });

// ---------- Controls ----------

const state = { view: 'inside', slice: 0, water: false, food: false, waterTime: 0, foodTime: 0 };
const views = { inside, tap: tapView, fibrous: fibrousView, prop: propView };
const levelCard = document.getElementById('level-card');
const sliceControl = document.getElementById('slice-control');

function aim() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  Object.entries(views).forEach(([k, g]) => { g.visible = k === key; });
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  sliceControl.style.display = key === 'inside' ? '' : 'none';
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.view;
  setView(key);
  levelCard.textContent = VIEWS[key].line;
  if (key !== 'inside' && complete(key)) cello.say(VIEWS[key].line, { mood: 'wow', ms: 5000 });
  else cello.say(VIEWS[key].line, { ms: 4000, important: false });
}));

bindSlider('slice', (value) => (value === 0 ? 'whole' : `${value * 10}%`), (value) => {
  state.slice = value;
  const x = 3.2 - value * 0.42;
  cut.constant = x;
  face.position.x = x;
  hairs.forEach(({ hair, x: hx }) => { hair.visible = hx < x; });
  if (value >= 6 && complete('slice')) {
    levelCard.textContent = 'Xylem (blue) is in the middle. Phloem (orange) is around it.';
    cello.say('Look! The xylem makes a star in the middle, and the phloem sits between its arms.', { mood: 'wow', ms: 6000 });
  }
});

function needInside() {
  if (state.view !== 'inside') setView('inside');
}

bindToggle('water', (on) => {
  state.water = on;
  if (!on) return;
  needInside();
  cello.say('Slurp! The root hairs drink water from the soil. Watch it go to the middle.', { ms: 4500 });
});

bindToggle('food', (on) => {
  state.food = on;
  if (!on) return;
  needInside();
  cello.say('Food from the leaves comes down the phloem, to feed the root.', { ms: 4500 });
});

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();

stage.onFrame((dt) => {
  flows.forEach((f) => {
    const on = state.view === 'inside' && (f.group === 'water' ? state.water : state.food);
    f.mesh.visible = on;
    if (!on) return;
    f.offset = (f.offset + dt * 0.12) % 1;
    for (let i = 0; i < f.count; i++) {
      f.curve.getPointAt((i / f.count + f.offset) % 1, p);
      // Past the cut, a drop has left with the cut-off piece.
      m.makeTranslation(p.x, p.y, p.z).scale(p.x > cut.constant + 0.05 ? v(0, 0, 0) : v(1, 1, 1));
      f.mesh.setMatrixAt(i, m);
    }
    f.mesh.instanceMatrix.needsUpdate = true;
  });

  if (state.view === 'inside' && state.water) {
    state.waterTime += dt;
    if (state.waterTime > 5 && complete('water')) {
      cello.say('From root hair, to cortex, to xylem! Now the water heads up to the stem.', { mood: 'wow', ms: 5500 });
    }
  }
  if (state.view === 'inside' && state.food) {
    state.foodTime += dt;
    if (state.foodTime > 4 && complete('food')) {
      cello.say('Food delivered! Roots can’t make their own food, so the leaves send it down.', { mood: 'wow', ms: 5500 });
    }
  }
});

setView('inside');
