import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Pollution. A little town by a river and the sea: a factory puffs smoke
// and pipes waste into the river, cars give off fumes, a farm's fertilizer
// washes in and feeds a mat of algae, houses let out sewage, a ship has
// spilled oil, and the landfill keeps growing. Each fix cleans one up; the
// meters show the air, water, and land, and fish come back when the river
// is clean. "Buried trash" fast-forwards a landfill to show how long each
// thing takes to rot away.

const PARTS = {
  factory: { name: 'Factory', text: 'Factories make things we need, but they burn fuel and can let out smoke and dirty water.' },
  smoke: { name: 'Smoke', text: 'Burning fuel gives off smoke and gases that dirty the air, make people cough, and warm the planet.' },
  car: { name: 'Cars', text: 'Car engines burn petrol and give off fumes. Buses, bikes, walking, and electric cars make less.' },
  farm: { name: 'Farm', text: 'Farmers spread fertilizer to help crops grow. Rain can wash the extra into the river.' },
  algae: { name: 'Algae', text: 'Fertilizer feeds tiny green plants called algae. When a thick mat of them dies and rots, it uses up the oxygen in the water, so fish can’t breathe.' },
  sewage: { name: 'Sewage pipe', text: 'Dirty water from toilets and drains. Without cleaning, it carries germs into the river.' },
  oil: { name: 'Oil spill', text: 'Oil from a ship floats on the sea in a slick. It sticks to birds’ feathers and animals’ fur.' },
  landfill: { name: 'Landfill', text: 'A huge pile of buried trash. Some rots quickly, but plastic can stay for hundreds of years.' },
  fish: { name: 'Fish', text: 'Fish need clean water with plenty of oxygen in it. They’re a sign of a healthy river.' },
};

const FIXES = {
  filter: { line: 'Filters in the chimneys catch most of the smoke.', air: 0.4 },
  buses: { line: 'Buses, bikes, and electric cars: much less fumes!', air: 0.3 },
  treat: { line: 'The factory cleans its waste water before it reaches the river.', water: 0.2 },
  sewage: { line: 'A treatment plant cleans the sewage before it goes into the river.', water: 0.22 },
  fertilizer: { line: 'Using only as much fertilizer as the crops need. The algae start to shrink.', water: 0.22 },
  oil: { line: 'Floating fences and skimmers scoop up the oil.', water: 0.16 },
  recycle: { line: 'Recycling and composting: much less trash goes to the landfill.', land: 0.6 },
};

// Rough times to rot away, from scientists’ best guesses, in years.
const TRASH = [
  { name: 'Newspaper', emoji: '📰', years: 0.12, color: 0xd8d4c8, size: [0.5, 0.06, 0.4] },
  { name: 'Apple core', emoji: '🍎', years: 0.17, color: 0xc8a050, size: [0.18, 0.3, 0.18] },
  { name: 'Plastic bag', emoji: '🛍️', years: 20, color: 0xf4f4f4, size: [0.45, 0.04, 0.5] },
  { name: 'Foam cup', emoji: '🥤', years: 50, color: 0xffffff, size: [0.22, 0.3, 0.22] },
  { name: 'Drink can', emoji: '🥫', years: 200, color: 0xc0c8d4, size: [0.18, 0.34, 0.18] },
  { name: 'Plastic bottle', emoji: '🧴', years: 450, color: 0x7ec8ff, size: [0.2, 0.5, 0.2] },
];

const VIEWS = {
  town: { camera: [0, 6.5, 9.5], target: [0, 0, 0.3], line: 'This town is making the air, water, and land dirty. Can you clean it up?' },
  dump: { camera: [0, 1.2, 7.5], target: [0, -0.8, 0], line: 'Bury some trash and fast-forward time. What’s left?' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;
controls.maxDistance = 18;

const explorer = createExplorer({
  topic: 'pollution',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Uh oh, this town is getting dirty! Find where the pollution comes from, and switch on the fixes.',
  allPartsLine: 'All 9 parts! You can spot pollution anywhere.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

const dotTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
})();
function particles(count, color, size, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTexture, alphaTest: 0.3, transparent: true, opacity, depthWrite: false }));
  points.frustumCulled = false;
  return points;
}
const HIDE = -99;

// ---------- The town ----------

const town = new THREE.Group();
scene.add(town);
const W = 10;
const Dp = 6.4;
const ground = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, Dp), [mat(0x8a6a4f), mat(0x8a6a4f), mat(0x7cbf5a), mat(0x8a6a4f), mat(0x8a6a4f), mat(0x8a6a4f)]);
ground.position.y = -0.2;
town.add(ground);
const grassMat = ground.material[2];

const RIVER_Z = 0.4;
const SEA_X = 2.8;
const riverMat = mat(0x3d8fe0, { roughness: 0.25 });
const river = new THREE.Mesh(new THREE.BoxGeometry(SEA_X + W / 2, 0.06, 0.9), riverMat);
river.position.set((SEA_X - W / 2) / 2, 0.01, RIVER_Z);
town.add(river);
const sea = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - SEA_X, 0.06, Dp), riverMat);
sea.position.set((SEA_X + W / 2) / 2, 0.01, 0);
town.add(sea);
const CLEAN = new THREE.Color(0x3d8fe0);
const DIRTY = new THREE.Color(0x6a7a52);

// Factory with two chimneys and a waste pipe to the river.
const factory = new THREE.Group();
const hall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.1), mat(0x9a8f86));
hall.position.y = 0.45;
const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.2), mat(0x5a524c));
roof.position.y = 0.95;
factory.add(hall, roof);
const chimneys = [-0.5, 0.3].map((x) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.3, 12), mat(0x7a6a60));
  c.position.set(x, 1.45, -0.2);
  factory.add(c);
  return c;
});
const wastePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8).rotateX(Math.PI / 2), mat(0x5a5a5a));
wastePipe.position.set(0.6, 0.08, 0.9);
factory.add(wastePipe);
factory.position.set(-3.2, 0, -1.2);
town.add(tagPart(factory, 'factory'));
const filters = chimneys.map((c) => {
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 12), mat(0x3a9a5a));
  f.position.copy(c.position).add(v(0, 0.7, 0));
  f.visible = false;
  factory.add(f);
  return f;
});

// The road and cars.
const road = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, 0.7), mat(0x45474d));
road.position.set(0, 0.015, 2.3);
town.add(road);
const cars = [];
const carColors = [0xff5a5a, 0x5b8def, 0xffd75e, 0x9b6bff];
for (let i = 0; i < 4; i++) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.28), mat(carColors[i]));
  body.position.y = 0.14;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.24), mat(carColors[i]));
  top.position.set(-0.03, 0.29, 0);
  car.add(body, top);
  car.userData.x = -W / 2 + i * 2.6;
  car.userData.lane = i % 2 ? 2.15 : 2.45;
  car.userData.dir = i % 2 ? 1 : -1;
  town.add(tagPart(car, 'car'));
  cars.push(car);
}
const bus = new THREE.Group();
const busBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.32), mat(0x3a9a5a));
busBody.position.y = 0.2;
bus.add(busBody);
bus.visible = false;
town.add(tagPart(bus, 'car'));
const bikes = [];
for (let i = 0; i < 3; i++) {
  const bike = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), mat(0x3a3f48));
  bike.visible = false;
  town.add(bike);
  bikes.push(bike);
}

// Farm: a field and a sprayer, above the river.
const farm = new THREE.Group();
const fieldMat = mat(0x6b4a2a);
const field = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.5), fieldMat);
field.position.y = 0.03;
farm.add(field);
for (let i = 0; i < 6; i++) {
  const row = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.08), mat(0x8cc63f));
  row.position.set(0, 0.1, -0.6 + i * 0.24);
  farm.add(row);
}
farm.position.set(0.6, 0, -1.4);
town.add(tagPart(farm, 'farm'));

const algaeMat = mat(0x5abf3a, { transparent: true, opacity: 0.9 });
const algae = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), algaeMat);
algae.scale.set(1.3, 1, 0.38);
algae.position.set(1.4, 0.05, RIVER_Z);
town.add(tagPart(algae, 'algae'));

// Houses and their sewage pipe.
const houses = new THREE.Group();
[[-1.3, 1.3], [-0.5, 1.4], [0.3, 1.3]].forEach(([x, z], i) => {
  const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), mat([0xf4e3c1, 0xd8e6f4, 0xf4d4d4][i]));
  h.position.set(x, 0.2, z);
  const r = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), mat(0xb5523b));
  r.position.set(x, 0.55, z);
  r.rotation.y = Math.PI / 4;
  houses.add(h, r);
});
town.add(houses);
const sewagePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 8).rotateX(Math.PI / 2), mat(0x7a6a5a));
sewagePipe.position.set(-0.5, 0.08, 0.95);
town.add(tagPart(sewagePipe, 'sewage'));
const plant = new THREE.Group();
const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 20), mat(0x9fb4c8));
tank.position.set(-0.5, 0.1, 1.85);
plant.add(tank);
plant.visible = false;
town.add(plant);

// The ship and its oil slick.
const ship = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.42), mat(0x3a3f48));
hull.position.y = 0.15;
const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), mat(0xf4f0e8));
cabin.position.set(-0.3, 0.42, 0);
ship.add(hull, cabin);
ship.position.set(4.0, 0, -1.6);
town.add(ship);
const oilMat = mat(0x1a1a1f, { roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 });
const oil = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), oilMat);
oil.scale.set(1.1, 1, 0.8);
oil.position.set(3.9, 0.05, -0.6);
town.add(tagPart(oil, 'oil'));
const boom = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 32).rotateX(Math.PI / 2), mat(0xffa64d));
boom.scale.set(1.1, 1, 0.85);
boom.position.copy(oil.position);
boom.visible = false;
town.add(boom);

// Landfill heap with bits of trash.
const landfill = new THREE.Group();
const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a6a52));
landfill.add(heap);
const trashColors = [0xff5a5a, 0x5b8def, 0xffd75e, 0xffffff, 0x9b6bff, 0x3a9a5a];
for (let i = 0; i < 26; i++) {
  const bit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), mat(trashColors[i % 6]));
  const a = i * 2.4;
  const h = (i % 5) / 5;
  bit.position.set(Math.cos(a) * Math.cos(h) * 0.98, Math.sin(h * 1.4) * 0.98, Math.sin(a) * Math.cos(h) * 0.98);
  bit.rotation.set(i, i * 2, 0);
  landfill.add(bit);
}
landfill.scale.set(1.1, 0.8, 0.9);
landfill.position.set(-3.6, 0, 1.4);
town.add(tagPart(landfill, 'landfill'));

// Fish come back when the river is clean.
const fishes = [];
for (let i = 0; i < 4; i++) {
  const f = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0xff9f43));
  b.scale.set(1.7, 0.7, 0.7);
  const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4).rotateZ(Math.PI / 2), mat(0xff9f43));
  t.position.x = -0.2;
  f.add(b, t);
  f.userData.phase = i * 1.6;
  town.add(tagPart(f, 'fish'));
  fishes.push(f);
}

// Smoke, fumes, waste, sewage, and farm runoff.
const SMOKE_N = 80;
const smoke = particles(SMOKE_N, 0x55504c, 0.32, 0.65);
const fumes = particles(40, 0x8a8a8a, 0.14, 0.55);
const waste = particles(30, 0x6b5a3a, 0.1);
const sewageDots = particles(30, 0x8a7a5a, 0.1);
const runoff = particles(30, 0x9cd84a, 0.1);
town.add(smoke, fumes, waste, sewageDots, runoff);
const smokeDots = Array.from({ length: SMOKE_N }, (_, i) => ({ t: Math.random(), c: i % 2, a: Math.random() * Math.PI * 2 }));
const fumeDots = Array.from({ length: 40 }, (_, i) => ({ t: Math.random(), car: i % 4 }));
const flowDots = Array.from({ length: 30 }, () => ({ t: Math.random(), o: Math.random() }));
// Invisible box over the chimneys, so the smoke can be tapped.
const smokeZone = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
smokeZone.position.set(-3.0, 3.1, -1.4);
town.add(tagPart(smokeZone, 'smoke'));

addLabel('factory', factory, v(0, 1.3, 0.6), { hideWith: town });
addLabel('smoke', smokeZone, v(0, 0.6, 0), { hideWith: smokeZone });
addLabel('car', cars[0], v(0, 0.55, 0), { hideWith: cars[0] });
addLabel('farm', farm, v(0, 0.45, -0.5), { hideWith: town });
addLabel('algae', algae, v(0, 0.3, 0), { hideWith: algae });
addLabel('sewage', sewagePipe, v(0, 0.35, 0), { hideWith: town });
addLabel('oil', oil, v(0, 0.35, 0), { hideWith: oil });
addLabel('landfill', landfill, v(0, 1.3, 0), { hideWith: town });
addLabel('fish', fishes[0], v(0, 0.3, 0), { hideWith: fishes[0] });

// ---------- Buried trash ----------

const dump = new THREE.Group();
dump.visible = false;
scene.add(dump);
const dirt = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 2), mat(0x7a5a3e));
dirt.position.y = -1.2;
dump.add(tagPart(dirt, 'landfill'));
const grass = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 2), mat(0x7cbf5a));
grass.position.y = 0.06;
dump.add(grass);
const trashItems = TRASH.map((t, i) => {
  const geo = t.size[1] < 0.1 ? new THREE.BoxGeometry(...t.size) : new THREE.CylinderGeometry(t.size[0], t.size[0] * 0.85, t.size[1], 16);
  const m = new THREE.Mesh(geo, mat(t.color, { transparent: true }));
  m.position.set(-2.7 + i * 1.08, -1.3 + (i % 2) * 0.5, 1.02);
  m.rotation.z = (i % 3 - 1) * 0.3;
  const label = makeLabel(`${t.emoji} ${t.name}`);
  label.position.set(0, 0.45, 0);
  m.add(label);
  m.userData.label = label;
  dump.add(m);
  return m;
});
// The labels here are always on: they tell you what's buried.
const trashLabelsOn = () => trashItems.forEach((m) => { m.userData.label.visible = dump.visible && m.visible; });

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const fixes = new Set();
const state = { view: 'town', air: 0, water: 0, land: 0, years: 0 };

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  town.visible = key === 'town';
  dump.visible = key === 'dump';
  ['town', 'dump'].forEach((k) => {
    const el = document.getElementById(`${k}-tools`);
    el.hidden = false;
    el.style.display = k === key ? '' : 'none';
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  trashLabelsOn();
  skyColor();
  explorer.showLabels();
  aimCamera();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

function score() {
  let air = 0.3;
  let water = 0.2;
  let land = 0.35;
  fixes.forEach((f) => {
    air += FIXES[f].air ?? 0;
    water += FIXES[f].water ?? 0;
    land += FIXES[f].land ?? 0;
  });
  return { air: Math.min(1, air), water: Math.min(1, water), land: Math.min(1, land) };
}

const bar = (x) => '▮'.repeat(Math.round(x * 5)) + '▯'.repeat(5 - Math.round(x * 5));
function showMeters() {
  const s = score();
  document.getElementById('meters').textContent = `🌬️ Air ${bar(s.air)} · 💧 Water ${bar(s.water)} · 🟫 Land ${bar(s.land)}`;
}

function skyColor() {
  const base = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').trim());
  const haze = state.view === 'town' ? (1 - state.air) * 0.55 : 0;
  scene.background.copy(base).lerp(new THREE.Color(0x8a8270), haze);
}
window.elixTheme.watch(skyColor);

function applyFixes() {
  filters.forEach((f) => { f.visible = fixes.has('filter'); });
  bus.visible = fixes.has('buses');
  bikes.forEach((b) => { b.visible = fixes.has('buses'); });
  cars.forEach((c, i) => { c.visible = !fixes.has('buses') || i === 0; });
  plant.visible = fixes.has('sewage');
  boom.visible = fixes.has('oil');
  explorer.showLabels();
  showMeters();
}

document.querySelectorAll('[data-fix]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.fix;
  if (fixes.has(key)) fixes.delete(key);
  else fixes.add(key);
  const on = fixes.has(key);
  b.setAttribute('aria-pressed', String(on));
  applyFixes();
  levelCard.textContent = on ? FIXES[key].line : 'Fix switched off. The pollution comes back.';
  const s = score();
  if (on) cello.say(FIXES[key].line, { ms: 3500, important: false });
  if (s.air >= 1 && complete('air')) cello.say('Clear blue sky! Less burning means cleaner air.', { mood: 'wow', ms: 5000 });
  if (s.water >= 0.99 && complete('water')) cello.say('The river is clean, and the fish are back!', { mood: 'wow', ms: 5000 });
  if (key === 'recycle' && on && complete('land')) cello.say('Recycling and composting shrink the landfill. Less trash to bury!', { mood: 'wow', ms: 5000 });
  if (fixes.size === Object.keys(FIXES).length && complete('all')) {
    setTimeout(() => cello.say('The whole town is clean! Every fix helped a different part of the Earth.', { mood: 'wow', ms: 6000 }), 3000);
  }
}));

const yearsOf = (s) => (s === 0 ? 0 : 10 ** ((s / 100) * 3) - 1 + 0.01);
bindSlider('years', (s) => {
  const y = yearsOf(s);
  if (y === 0) return 'Today';
  if (y < 1) return `${Math.max(1, Math.round(y * 12))} months`;
  return `${Math.round(y).toLocaleString('en-US')} years`;
}, (s) => {
  state.years = yearsOf(s);
  const left = [];
  trashItems.forEach((m, i) => {
    const life = TRASH[i].years;
    const k = state.years / life;
    m.visible = k < 1;
    m.scale.setScalar(Math.max(0.05, 1 - k * 0.7));
    m.material.opacity = Math.max(0.3, 1 - k * 0.6);
    if (k < 1) left.push(`${TRASH[i].emoji} ${TRASH[i].name}`);
  });
  trashLabelsOn();
  document.getElementById('trash-left').textContent = left.length ? `Still there: ${left.join(', ')}` : 'All gone at last!';
  if (state.years >= 450 && complete('trash')) {
    levelCard.textContent = 'The plastic bottle took about 450 years to break down. That’s longer than 5 people’s whole lives, one after another!';
    cello.say('About 450 years for one plastic bottle! That’s why we reuse and recycle plastic.', { mood: 'wow', ms: 6000 });
  }
});

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
const lerp = THREE.MathUtils.lerp;
stage.onFrame((dt) => {
  time += dt;
  const target = score();
  ['air', 'water', 'land'].forEach((k) => { state[k] += (target[k] - state[k]) * Math.min(1, dt * 1.5); });
  if (!town.visible) return;
  skyColor();
  riverMat.color.copy(DIRTY).lerp(CLEAN, state.water);
  grassMat.color.setHex(0x9aa05a).lerp(new THREE.Color(0x7cbf5a), state.land);

  // Smoke: thick without filters.
  const smokeAmount = fixes.has('filter') ? 0.15 : 1;
  const sp = smoke.geometry.attributes.position;
  smokeDots.forEach((d, i) => {
    d.t = (d.t + dt * 0.25) % 1;
    if (i / SMOKE_N > smokeAmount) { sp.setXYZ(i, 0, HIDE, 0); return; }
    const c = chimneys[d.c].position.clone().add(factory.position);
    sp.setXYZ(i, c.x + d.t * 1.4 + Math.cos(d.a) * d.t * 0.4, c.y + 0.7 + d.t * 2.2, c.z + Math.sin(d.a) * d.t * 0.4);
  });
  sp.needsUpdate = true;
  smokeZone.visible = smokeAmount > 0.5;

  // Cars drive along the road and puff fumes; a bus and bikes replace most of them.
  cars.forEach((c) => {
    c.userData.x += c.userData.dir * dt * 1.1;
    if (c.userData.x > W / 2 - 0.3) c.userData.x = -W / 2 + 0.3;
    if (c.userData.x < -W / 2 + 0.3) c.userData.x = W / 2 - 0.3;
    c.position.set(c.userData.x, 0, c.userData.lane);
    c.rotation.y = c.userData.dir > 0 ? 0 : Math.PI;
  });
  const bx = ((time * 0.8) % (W - 1)) - (W - 1) / 2;
  bus.position.set(bx, 0, 2.45);
  bikes.forEach((b, i) => { b.position.set(((time * 0.5 + i * 2.8) % (W - 1)) - (W - 1) / 2, 0.1, 2.12); });
  const fp = fumes.geometry.attributes.position;
  fumeDots.forEach((d, i) => {
    d.t = (d.t + dt * 0.8) % 1;
    const c = cars[d.car];
    if (!c.visible) { fp.setXYZ(i, 0, HIDE, 0); return; }
    fp.setXYZ(i, c.position.x - c.userData.dir * (0.3 + d.t * 0.6), 0.15 + d.t * 0.5, c.position.z);
  });
  fp.needsUpdate = true;

  // Factory waste, sewage, and farm runoff flowing into the river.
  const flows = [
    [waste, !fixes.has('treat'), factory.position.clone().add(v(0.6, 0.06, 1.4)), v(-2.4, 0.06, RIVER_Z)],
    [sewageDots, !fixes.has('sewage'), v(-0.5, 0.06, 1.25), v(-0.3, 0.06, RIVER_Z)],
    [runoff, !fixes.has('fertilizer'), v(0.6, 0.08, -0.7), v(1.0, 0.06, RIVER_Z)],
  ];
  flows.forEach(([pts, on, from, to]) => {
    const p = pts.geometry.attributes.position;
    flowDots.forEach((d, i) => {
      d.t = (d.t + dt * 0.5) % 1;
      if (!on) { p.setXYZ(i, 0, HIDE, 0); return; }
      const q = from.clone().lerp(to, d.t);
      p.setXYZ(i, q.x + (d.o - 0.5) * 0.4, q.y, q.z + (d.o - 0.5) * 0.15);
    });
    p.needsUpdate = true;
  });

  // Algae shrink when there's less fertilizer; oil shrinks when it's cleaned.
  const algaeTarget = fixes.has('fertilizer') ? 0.02 : 1;
  algae.scale.x = lerp(algae.scale.x, 1.3 * algaeTarget, Math.min(1, dt));
  algae.scale.z = lerp(algae.scale.z, 0.38 * algaeTarget, Math.min(1, dt));
  algae.visible = algae.scale.x > 0.05;
  const oilTarget = fixes.has('oil') ? 0.02 : 1;
  oil.scale.x = lerp(oil.scale.x, 1.1 * oilTarget, Math.min(1, dt * 0.8));
  oil.scale.z = lerp(oil.scale.z, 0.8 * oilTarget, Math.min(1, dt * 0.8));
  oil.visible = oil.scale.x > 0.05;
  boom.scale.set(oil.scale.x + 0.05, 1, oil.scale.z + 0.05);
  const landTarget = fixes.has('recycle') ? 0.45 : 1;
  const ls = lerp(landfill.scale.y / 0.8, landTarget, Math.min(1, dt));
  landfill.scale.set(1.1 * ls, 0.8 * ls, 0.9 * ls);

  // Fish: swimming when the water's clean, gone when it isn't.
  fishes.forEach((f, i) => {
    f.visible = state.water > 0.75 + i * 0.05;
    const a = time * 0.6 + f.userData.phase;
    f.position.set(-4 + ((a * 0.8) % 6.5), 0.03, RIVER_Z + Math.sin(a * 2) * 0.25);
  });
  explorer.showLabels();
});

applyFixes();
setView('town');
