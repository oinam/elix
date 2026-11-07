import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer } from './explorer.js';

// Earth's four spheres on a little island: the geosphere (land, rock, a
// mountain), the hydrosphere (sea, river, glacier, clouds), the atmosphere
// (a dome of air with wind), and the biosphere (trees, fish, a deer, a bird).
// Switch a sphere off and see who needed it: without water or air, life
// wilts. "Whole planet" zooms out to the Earth, wrapped in its air.

const PARTS = {
  land: { name: 'Land and soil', text: 'The solid ground: rock, sand, and soil. It’s part of the geosphere, the rocky part of Earth.' },
  mountain: { name: 'Mountain', text: 'A giant pile of rock, pushed up over millions of years. Mountains are geosphere too.' },
  ocean: { name: 'Ocean', text: 'Salty water that covers most of the Earth. All the water on Earth is the hydrosphere.' },
  river: { name: 'River', text: 'Fresh water flowing downhill to the sea. Rivers, lakes, and underground water are hydrosphere too.' },
  glacier: { name: 'Glacier', text: 'A huge, slow river of ice. Frozen water still counts as hydrosphere. Most of Earth’s fresh water is ice!' },
  cloud: { name: 'Cloud', text: 'Tiny drops of water floating in the air. So a cloud is in two spheres at once: hydrosphere and atmosphere!' },
  air: { name: 'Air (atmosphere)', text: 'A blanket of gases around the Earth, held on by gravity. It gives us oxygen, makes the weather, and keeps us warm.' },
  sun: { name: 'Sun', text: 'Not part of Earth, but it powers everything: it warms the air, lifts water into clouds, and gives plants light to make food.' },
  tree: { name: 'Trees', text: 'Living things belong to the biosphere. Trees need soil, water, air, and sunlight, so they use all the other spheres.' },
  fish: { name: 'Fish', text: 'Fish are biosphere, living in the hydrosphere. They breathe oxygen that’s mixed into the water.' },
  deer: { name: 'Deer', text: 'Animals are biosphere too. A deer eats plants, drinks water, and breathes air.' },
};

const SPHERES = {
  geo: { name: 'geosphere', off: 'No geosphere: no ground, no rocks, no soil. Plants have nowhere to grow!' },
  hydro: { name: 'hydrosphere', off: 'No hydrosphere: no sea, no rivers, no rain. Without water, nothing can live.' },
  atmo: { name: 'atmosphere', off: 'No atmosphere: no air to breathe, no weather, and the sky goes black like space.' },
  bio: { name: 'biosphere', off: 'No biosphere: the rocks, water, and air are still here, but nothing is alive. Lonely!' },
};

const ITEMS = [
  { emoji: '🪨', name: 'A rock', sphere: 'geo', why: 'Rocks are the solid Earth: the geosphere.' },
  { emoji: '🐟', name: 'A fish', sphere: 'bio', why: 'Anything alive is in the biosphere, even if it lives in water.' },
  { emoji: '🌊', name: 'A sea wave', sphere: 'hydro', why: 'All the water on Earth is the hydrosphere.' },
  { emoji: '🌬️', name: 'The wind', sphere: 'atmo', why: 'Wind is moving air, and air is the atmosphere.' },
  { emoji: '🍄', name: 'A mushroom', sphere: 'bio', why: 'A mushroom is alive. It’s a fungus, so it’s in the biosphere.' },
  { emoji: '🧊', name: 'A glacier', sphere: 'hydro', why: 'A glacier is frozen water. Ice is hydrosphere too.' },
  { emoji: '🌋', name: 'A volcano', sphere: 'geo', why: 'A volcano is a mountain of rock, made by melted rock from deep inside the Earth.' },
  { emoji: '🫧', name: 'Oxygen gas', sphere: 'atmo', why: 'Oxygen is one of the gases in the air. About 21 out of every 100 bits of air are oxygen.' },
  { emoji: '🏖️', name: 'Sand', sphere: 'geo', why: 'Sand is tiny bits of broken rock.' },
  { emoji: '🦠', name: 'Bacteria', sphere: 'bio', why: 'Even living things too tiny to see are in the biosphere.' },
  { emoji: '💧', name: 'Water under the ground', sphere: 'hydro', why: 'Water hiding in the ground is still water: hydrosphere.' },
  { emoji: '🌳', name: 'A tree', sphere: 'bio', why: 'Trees are alive, so they’re in the biosphere.' },
];

const VIEWS = {
  island: { camera: [0, 4.5, 10.5], target: [0, 0.4, 0] },
  planet: { camera: [0, 1.5, 8.5], target: [0, 0, 0] },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;
scene.fog.near = 30;
scene.fog.far = 60;

const explorer = createExplorer({
  topic: 'spheres',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['air', 'ocean'],
  outer: ['cloud', 'sun'],
  resolve: (hit) => (hit.object === globe ? globePart(hit) : hit.object.userData.part),
  greeting: 'Earth is a team of four: rock, water, air, and life. Tap around, then switch them off and on!',
  allPartsLine: 'All 11 parts! You know all four spheres.',
  onPart: (key) => {
    if (key === 'cloud' && complete('cloud')) {
      cello.say('A cloud is water floating in the air. It’s in the hydrosphere and the atmosphere at once!', { mood: 'wow', ms: 6000 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

// ---------- The island ----------

const island = new THREE.Group();
scene.add(island);
const geoG = new THREE.Group();
const hydroG = new THREE.Group();
const atmoG = new THREE.Group();
const bioG = new THREE.Group();
island.add(geoG, hydroG, atmoG, bioG);

const R = 4;
const SEA_FLOOR = -0.9;
const SEA = -0.3;
const LAND = -0.12;

// Rock under everything, in layers.
const rockColors = [0x8a6a4f, 0x9c7b5c, 0x7a5c44];
rockColors.forEach((c, i) => {
  const layer = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.25, 64), mat(c));
  layer.position.y = SEA_FLOOR - 0.125 - i * 0.25;
  geoG.add(tagPart(layer, 'land'));
});

// Land: the left side of the disc, with a wavy coast, rising above the sea.
const coast = new THREE.Shape();
const arcFrom = THREE.MathUtils.degToRad(70);
const arcTo = THREE.MathUtils.degToRad(290);
for (let i = 0; i <= 40; i++) {
  const a = arcFrom + (arcTo - arcFrom) * (i / 40);
  const p = [Math.cos(a) * (R - 0.02), Math.sin(a) * (R - 0.02)];
  if (i === 0) coast.moveTo(...p);
  else coast.lineTo(...p);
}
for (let i = 0; i <= 20; i++) {
  const t = i / 20;
  const y = THREE.MathUtils.lerp(Math.sin(arcTo) * R, Math.sin(arcFrom) * R, t);
  coast.lineTo(0.9 + Math.sin(t * Math.PI * 3) * 0.35, y);
}
const landGeo = new THREE.ExtrudeGeometry(coast, { depth: LAND - SEA_FLOOR, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2);
landGeo.translate(0, SEA_FLOOR, 0);
const land = new THREE.Mesh(landGeo, [mat(0x7cbf5a), mat(0x9c7b5c)]);
geoG.add(tagPart(land, 'land'));

// A mountain with a glacier on top.
const MOUNTAIN = v(-2.1, LAND, -0.9);
const mountain = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 7), mat(0x8d8a86, { flatShading: true }));
mountain.position.copy(MOUNTAIN).add(v(0, 1.3, 0));
geoG.add(tagPart(mountain, 'mountain'));
const glacier = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.12, 7), mat(0xf4fbff, { flatShading: true, emissive: 0x223344 }));
glacier.position.copy(MOUNTAIN).add(v(0, 2.6 - 0.56 + 0.02, 0));
glacier.scale.setScalar(1.03);
hydroG.add(tagPart(glacier, 'glacier'));

// The sea fills the right side of the disc.
// Only the sea side, so the land's rocky edge isn't tinted blue.
const water = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.01, R - 0.01, SEA - SEA_FLOOR, 48, 1, false, THREE.MathUtils.degToRad(12), THREE.MathUtils.degToRad(156)), mat(0x3d8fe0, { transparent: true, opacity: 0.6, roughness: 0.2, depthWrite: false }));
water.position.y = (SEA + SEA_FLOOR) / 2;
hydroG.add(tagPart(water, 'ocean'));

// A river from the foot of the mountain to the sea.
const riverPath = new THREE.CatmullRomCurve3([v(-1.4, LAND + 0.02, -0.3), v(-0.9, LAND + 0.02, 0.4), v(-0.2, LAND + 0.02, 0.6), v(0.9, LAND + 0.02, 1.0)]);
const riverPoints = riverPath.getPoints(30);
const riverGeo = new THREE.BufferGeometry();
const rv = [];
for (let i = 0; i < riverPoints.length - 1; i++) {
  const a = riverPoints[i];
  const b = riverPoints[i + 1];
  const side = v(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(0.06 + i * 0.004);
  const sideB = side.clone().multiplyScalar(1.03);
  rv.push(...a.clone().add(side).toArray(), ...a.clone().sub(side).toArray(), ...b.clone().add(sideB).toArray());
  rv.push(...a.clone().sub(side).toArray(), ...b.clone().sub(sideB).toArray(), ...b.clone().add(sideB).toArray());
}
riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
riverGeo.computeVertexNormals();
const river = new THREE.Mesh(riverGeo, mat(0x4aa3f0, { roughness: 0.2, side: THREE.DoubleSide }));
hydroG.add(tagPart(river, 'river'));

// Clouds drift around inside the air.
const clouds = new THREE.Group();
const cloudMat = mat(0xffffff, { emissive: 0x333333 });
[[-1.5, 2.6, 0.8, 0], [1.8, 2.9, -1.2, 2.1], [0.4, 2.5, 1.9, 4.2]].forEach(([x, y, z, a]) => {
  const c = new THREE.Group();
  [[0, 0, 0, 0.45], [0.45, -0.05, 0.1, 0.35], [-0.42, -0.08, 0, 0.32], [0.15, 0.22, -0.05, 0.3]].forEach(([dx, dy, dz, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat);
    puff.position.set(dx, dy, dz);
    c.add(puff);
  });
  c.position.set(x, y, z);
  c.userData.angle = a;
  c.userData.radius = Math.hypot(x, z);
  clouds.add(tagPart(c, 'cloud'));
});
hydroG.add(clouds);

// The air: a see-through dome, and streaks of wind.
const dome = new THREE.Mesh(
  new THREE.SphereGeometry(R + 2, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
  mat(0x9fd4ff, { transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, emissive: 0x2a5070 }),
);
dome.position.y = SEA_FLOOR - 0.76;
atmoG.add(tagPart(dome, 'air'));
const windMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
const winds = [];
for (let i = 0; i < 4; i++) {
  const pts = [];
  for (let j = 0; j <= 16; j++) pts.push(v(j * 0.12, Math.sin(j * 0.6) * 0.08, 0));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), windMat.clone());
  line.position.set(-3 + i * 1.6, 1.6 + (i % 2) * 0.9, -1.5 + i * 0.9);
  atmoG.add(line);
  winds.push(line);
}

const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd75e }));
sun.position.set(3.6, 4.2, -3);
island.add(tagPart(sun, 'sun'));

// ---------- Life ----------

const trunkMat = mat(0x7a5236);
const leafMat = mat(0x3f9b4a);
const trees = new THREE.Group();
[[-0.9, -1.8], [-1.6, 1.2], [-2.6, 0.9], [-0.3, -0.9], [-3.2, 0.6], [-1.1, 2.4]].forEach(([x, z], i) => {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), trunkMat);
  trunk.position.y = 0.25;
  const crown = new THREE.Mesh(i % 2 ? new THREE.ConeGeometry(0.32, 0.8, 10) : new THREE.SphereGeometry(0.33, 14, 10), leafMat);
  crown.position.y = i % 2 ? 0.85 : 0.72;
  t.add(trunk, crown);
  t.position.set(x, LAND, z);
  trees.add(t);
});
bioG.add(tagPart(trees, 'tree'));

const fishMat = mat(0xff9f43);
const fishes = [];
for (let i = 0; i < 3; i++) {
  const f = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), fishMat);
  body.scale.set(1.6, 0.8, 0.6);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4).rotateZ(Math.PI / 2), fishMat);
  tail.position.x = -0.3;
  f.add(body, tail);
  f.userData.phase = (i / 3) * Math.PI * 2;
  bioG.add(tagPart(f, 'fish'));
  fishes.push(f);
}

const deerMat = mat(0xb07a45);
const deer = new THREE.Group();
const deerBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.2), deerMat);
deerBody.position.y = 0.38;
const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), deerMat);
neck.position.set(0.24, 0.55, 0);
neck.rotation.z = -0.3;
const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.1), deerMat);
head.position.set(0.32, 0.68, 0);
deer.add(deerBody, neck, head);
[[-0.18, -0.07], [-0.18, 0.07], [0.18, -0.07], [0.18, 0.07]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.05), deerMat);
  leg.position.set(x, 0.14, z);
  deer.add(leg);
});
deer.position.set(-0.4, LAND, 1.7);
deer.rotation.y = 0.6;
bioG.add(tagPart(deer, 'deer'));

const bird = new THREE.Group();
const wingMat = mat(0x3a3f48, { side: THREE.DoubleSide });
const wings = [-1, 1].map((s) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1), wingMat);
  w.geometry.translate(0.15, 0, 0);
  w.rotation.y = s > 0 ? 0 : Math.PI;
  const pivot = new THREE.Group();
  pivot.add(w);
  bird.add(pivot);
  return pivot;
});
bioG.add(bird);

// Things that wilt when water or air is gone.
const healthy = { leaf: new THREE.Color(0x3f9b4a), deer: new THREE.Color(0xb07a45), land: new THREE.Color(0x7cbf5a) };
const wilted = { leaf: new THREE.Color(0x8a6d3b), deer: new THREE.Color(0x8a8580), land: new THREE.Color(0xc2a878) };

addLabel('mountain', mountain, v(0, 1.5, 0), { hideWith: geoG });
addLabel('land', geoG, v(-2.8, LAND + 0.15, 2.4), { hideWith: geoG });
addLabel('ocean', hydroG, v(2.6, SEA + 0.1, 1.8), { hideWith: hydroG });
addLabel('glacier', glacier, v(0.55, 0.3, 0), { hideWith: glacier });
addLabel('river', hydroG, v(0.3, LAND + 0.1, 1.15), { hideWith: river });
addLabel('cloud', clouds.children[1], v(0, 0.6, 0), { hideWith: clouds });
addLabel('air', atmoG, v(0, 4.5, 0), { hideWith: atmoG });
addLabel('sun', sun, v(0, 0.8, 0), { hideWith: island });
addLabel('tree', trees.children[1], v(0, 1.4, 0), { hideWith: trees });
addLabel('fish', fishes[0], v(0, 0.35, 0), { hideWith: fishes[0] });
addLabel('deer', deer, v(0, 0.95, 0), { hideWith: deer });

// ---------- The whole planet ----------

const planet = new THREE.Group();
planet.visible = false;
scene.add(planet);
const EARTH_R = 2.2;
const globeGeo = new THREE.SphereGeometry(EARTH_R, 96, 64);
const colors = [];
const p = new THREE.Vector3();
const OCEAN = new THREE.Color(0x2f7fd6);
const GREEN = new THREE.Color(0x5aa64a);
const DRY = new THREE.Color(0xc9a66b);
const ICE = new THREE.Color(0xf4fbff);
// Made-up continents from a few overlapping waves; about 30% land, like Earth.
function landiness(q) {
  return Math.sin(q.x * 3.1 + 1.3) * Math.cos(q.z * 2.7 - 0.4) + Math.sin(q.y * 3.6 + q.x * 2.3) * 0.7 + Math.cos(q.z * 4.1 - q.y * 1.5 + q.x) * 0.5;
}
for (let i = 0; i < globeGeo.attributes.position.count; i++) {
  p.fromBufferAttribute(globeGeo.attributes.position, i).divideScalar(EARTH_R);
  const c = Math.abs(p.y) > 0.86 ? ICE : landiness(p) > -0.1 ? (Math.abs(p.y) < 0.3 ? DRY : GREEN) : OCEAN;
  colors.push(c.r, c.g, c.b);
}
globeGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
const globe = new THREE.Mesh(globeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
planet.add(tagPart(globe, 'land'));
const sky = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.12, 48, 32), mat(0x9fd4ff, { transparent: true, opacity: 0.12, depthWrite: false, emissive: 0x4a90c0 }));
planet.add(tagPart(sky, 'air'));
const planetClouds = new THREE.Group();
for (let i = 0; i < 14; i++) {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (i % 3) * 0.06, 12, 8), cloudMat);
  puff.scale.set(1.8, 1, 0.35);
  const lat = Math.sin(i * 2.4) * 1.0;
  const lon = i * 1.9;
  puff.position.setFromSphericalCoords(EARTH_R * 1.04, Math.PI / 2 - lat, lon);
  puff.lookAt(0, 0, 0);
  planetClouds.add(puff);
}
planet.add(tagPart(planetClouds, 'cloud'));

// Which part of the globe was tapped, from the color under the finger.
function globePart(hit) {
  const c = new THREE.Color().fromBufferAttribute(globeGeo.attributes.color, hit.face.a);
  if (c.r > 0.85) return 'glacier';
  if (c.b > c.r && c.b > c.g) return 'ocean';
  return 'land';
}

// ---------- Switching spheres ----------

const on = { geo: true, hydro: true, atmo: true, bio: true };
const toggled = new Set();
const levelCard = document.getElementById('level-card');
let health = 1;

function stageColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').trim();
}

function applySpheres() {
  geoG.visible = on.geo;
  hydroG.visible = on.hydro;
  river.visible = on.geo;
  glacier.visible = on.geo;
  clouds.visible = on.atmo;
  atmoG.visible = on.atmo;
  bioG.visible = on.bio;
  trees.visible = on.geo;
  deer.visible = on.geo;
  fishes.forEach((f) => { f.visible = on.hydro; });
  bird.visible = on.atmo;
  scene.background.set(on.atmo ? stageColor() : 0x05070d);
  explorer.showLabels();
}
window.elixTheme.watch(() => { if (!on.atmo) scene.background.set(0x05070d); });

document.querySelectorAll('[data-sphere]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.sphere;
  on[key] = !on[key];
  b.setAttribute('aria-pressed', String(on[key]));
  if (planetMode) setPlanet(false);
  applySpheres();
  if (!on[key]) {
    toggled.add(key);
    levelCard.textContent = SPHERES[key].off;
    cello.say(SPHERES[key].off, { mood: key === 'bio' ? 'happy' : 'oops', ms: 5000 });
    if ((key === 'hydro' || key === 'atmo') && on.bio && complete('life')) {
      setTimeout(() => cello.say('Look, the plants wilt and the animals go gray. Life needs water and air!', { mood: 'wow', ms: 5500 }), 2500);
    }
  } else {
    levelCard.textContent = `The ${SPHERES[key].name} is back!`;
    if (toggled.size === 4 && Object.values(on).every(Boolean) && complete('toggle')) {
      cello.say('All four switched off and back on. Each sphere needs the others!', { mood: 'wow', ms: 5000 });
    }
  }
}));

let planetMode = false;
function setPlanet(value) {
  planetMode = value;
  document.getElementById('planet').setAttribute('aria-pressed', String(value));
  island.visible = !value;
  planet.visible = value;
  if (value) scene.background.set(0x05070d);
  else applySpheres();
  explorer.showLabels();
  aimCamera();
}

document.getElementById('planet').addEventListener('click', () => {
  setPlanet(!planetMode);
  if (planetMode) {
    levelCard.textContent = 'Here’s the whole Earth. Rock and water under a thin blanket of air, with life all over it.';
    if (complete('planet')) cello.say('Our whole planet! The air is just a thin layer, like the skin on an apple.', { mood: 'wow', ms: 5500 });
  } else {
    levelCard.textContent = 'Back on the island.';
  }
});

function aimCamera() {
  const { camera: c, target: t } = VIEWS[planetMode ? 'planet' : 'island'];
  camera.position.set(...c);
  controls.target.set(...t);
}
document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Which sphere? ----------

let order = [...ITEMS].sort(() => Math.random() - 0.5);
let current = 0;
let right = 0;
let tried = false;
const itemEl = document.getElementById('sort-item');
const answerEl = document.getElementById('sort-answer');
const countEl = document.getElementById('sort-count');

function showItem() {
  const item = order[current % order.length];
  itemEl.textContent = `${item.emoji} ${item.name}`;
  answerEl.textContent = 'Which sphere does it belong to?';
  countEl.textContent = right ? `✅ ${right}` : '';
  tried = false;
}

const groupOf = { geo: geoG, hydro: hydroG, atmo: atmoG, bio: bioG };
document.querySelectorAll('[data-answer]').forEach((b) => b.addEventListener('click', () => {
  const item = order[current % order.length];
  if (b.dataset.answer === item.sphere) {
    if (!tried) right++;
    answerEl.textContent = `Yes! ${item.why}`;
    countEl.textContent = `✅ ${right}`;
    pulse(groupOf[item.sphere]);
    if (right >= 8 && complete('sort')) cello.say('Eight in a row! You can sort anything into its sphere.', { mood: 'wow', ms: 5000 });
    else cello.say(`Yes! ${item.why}`, { ms: 3500, important: false });
    current++;
    if (current % order.length === 0) order = [...ITEMS].sort(() => Math.random() - 0.5);
    setTimeout(showItem, 2600);
  } else {
    tried = true;
    answerEl.textContent = 'Not quite. Is it alive? Is it water? Is it air? Or is it rock? Try another one.';
    cello.say('Nearly! Ask yourself: is it alive, water, air, or rock?', { ms: 3500, important: false });
  }
}));

// A quick bob of the sphere that was the answer.
let pulsing = null;
function pulse(group) {
  if (planetMode) return;
  pulsing = { group, t: 0 };
}

// ---------- Animation ----------

let time = 0;
stage.onFrame((dt) => {
  time += dt;
  clouds.children.forEach((c) => {
    c.userData.angle += dt * 0.08;
    c.position.x = Math.cos(c.userData.angle) * c.userData.radius;
    c.position.z = Math.sin(c.userData.angle) * c.userData.radius;
  });
  winds.forEach((w, i) => {
    w.position.x += dt * (0.6 + i * 0.1);
    if (w.position.x > 3) w.position.x = -4.6;
    w.material.opacity = 0.7 * Math.sin(Math.PI * Math.min(1, Math.max(0, (w.position.x + 4.6) / 7.6)));
  });
  fishes.forEach((f, i) => {
    const a = time * 0.5 + f.userData.phase;
    f.position.set(2.3 + Math.cos(a) * (0.9 + i * 0.15), -0.62 + Math.sin(a * 2) * 0.05, 0.2 + Math.sin(a) * (0.9 + i * 0.15));
    f.rotation.y = -a - Math.PI / 2;
  });
  const b = time * 0.4;
  bird.position.set(Math.cos(b) * 2.6, 2.3 + Math.sin(b * 3) * 0.1, Math.sin(b) * 2.6);
  bird.rotation.y = -b;
  wings[0].rotation.x = Math.sin(time * 10) * 0.5;
  wings[1].rotation.x = -Math.sin(time * 10) * 0.5;
  deer.children[2].position.y = 0.68 - Math.max(0, Math.sin(time * 0.7)) * 0.2;

  // Life wilts without water or air, and perks back up when they return.
  const target = on.hydro && on.atmo && on.geo ? 1 : 0;
  health += (target - health) * Math.min(1, dt * 2);
  leafMat.color.copy(wilted.leaf).lerp(healthy.leaf, health);
  deerMat.color.copy(wilted.deer).lerp(healthy.deer, health);
  land.material[0].color.copy(wilted.land).lerp(healthy.land, on.hydro ? 1 : health);
  trees.children.forEach((t) => { t.scale.y = 0.75 + 0.25 * health; });

  planet.rotation.y += dt * 0.12;
  planetClouds.rotation.y += dt * 0.04;

  if (pulsing) {
    pulsing.t += dt;
    pulsing.group.position.y = Math.sin(Math.min(pulsing.t, 0.6) / 0.6 * Math.PI) * 0.35;
    if (pulsing.t > 0.6) { pulsing.group.position.y = 0; pulsing = null; }
  }
});

applySpheres();
showItem();
aimCamera();
