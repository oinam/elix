import * as THREE from 'three';
import { shaped } from './organs.js';
import { createStage } from './scene.js';
import { createExplorer } from './explorer.js';

// Farming and the land. A forested hill runs down to a river. Clear it for
// farming, then send heavy rain or a strong wind: bare soil washes down
// into the river (which goes muddy) or blows away as dust, and the topsoil
// gets thinner. Crops, a cover crop, and a row of trees hold it in place.
// Harvests are smaller when the topsoil is thin.

const PARTS = {
  forest: { name: 'Forest', text: 'Trees cover the hill. Their leaves soften the rain, and their roots hold the soil tight.' },
  roots: { name: 'Roots', text: 'Roots spread through the soil like a net, holding it together so rain and wind can’t carry it away.' },
  topsoil: { name: 'Topsoil', text: 'The dark, rich top layer, full of the food plants need. It takes hundreds of years to make a few centimeters.' },
  subsoil: { name: 'Rock and subsoil', text: 'Under the topsoil is paler soil and rock. Plants don’t grow well in it.' },
  crops: { name: 'Crops', text: 'Plants grown for food, like wheat or rice. They hold some soil, but the field is bare after harvest.' },
  cover: { name: 'Cover crop', text: 'Plants like clover, grown just to cover the soil between harvests, so it’s never left bare.' },
  hedge: { name: 'Row of trees', text: 'A line of trees at the edge of a field slows the wind, so it can’t blow the soil away. It’s called a windbreak.' },
  river: { name: 'River', text: 'Rain runs down the hill into the river. If it carries soil with it, the river turns muddy.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;
stage.autoShadows(9);

const explorer = createExplorer({
  topic: 'farming',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Farms give us food, but they change the land. Let’s make a farm, and look after its soil!',
  allPartsLine: 'All 8 parts! You know how to look after a farm’s soil.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

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

// ---------- The hill ----------

const D = 3;
const X0 = -4;
const X1 = 2.2;
const H = 1.6;
const BASE = -1.2;
const MAX_SOIL = 0.35;
// Height of the rock surface under the soil at x.
const rockY = (x) => H - ((x - X0) / (X1 - X0)) * H;

// Side profile, pushed out along z.
function prism(points) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
  geo.translate(0, 0, -D / 2);
  return geo;
}
const subsoil = new THREE.Mesh(prism([[X0, BASE], [X1, BASE], [X1, rockY(X1)], [X0, rockY(X0)]]), mat(0xb59a72));
scene.add(tagPart(subsoil, 'subsoil'));

const RICH = new THREE.Color(0x4a3222);
const POOR = new THREE.Color(0xa88a62);
const topsoilMat = mat(0x4a3222);
const topsoil = new THREE.Mesh(new THREE.BufferGeometry(), topsoilMat);
scene.add(tagPart(topsoil, 'topsoil'));
let soil = 1;
let builtSoil = -1;
const surfaceY = (x) => rockY(x) + MAX_SOIL * soil;
function buildSoil() {
  if (Math.abs(builtSoil - soil) < 0.004) return;
  builtSoil = soil;
  const t = Math.max(0.01, MAX_SOIL * soil);
  topsoil.geometry.dispose();
  topsoil.geometry = prism([[X0, rockY(X0)], [X1, rockY(X1)], [X1, rockY(X1) + t], [X0, rockY(X0) + t]]);
  topsoilMat.color.copy(POOR).lerp(RICH, Math.min(1, soil * 1.4));
  placeOnSlope();
  placeCover();
}

// The river at the bottom, and flat land beyond it.
const riverMat = mat(0x3d8fe0, { roughness: 0.2 });
const river = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, D), riverMat);
river.position.set(X1 + 0.5, -0.3, 0);
scene.add(tagPart(river, 'river'));
const bank = new THREE.Mesh(new THREE.BoxGeometry(1.2, -BASE - 0.05 + 0.25, D), mat(0x8a6a4f));
bank.position.set(X1 + 1.6, (BASE + 0.25) / 2 - 0.02, 0);
scene.add(bank);
const riverBed = new THREE.Mesh(new THREE.BoxGeometry(1.0, -BASE - 0.55, D), mat(0x8a6a4f));
riverBed.position.set(X1 + 0.5, (BASE - 0.55) / 2, 0);
scene.add(riverBed);
const CLEAN = new THREE.Color(0x3d8fe0);
const MUDDY = new THREE.Color(0xb48c52);
let mud = 0;

// ---------- Things on the hill ----------

const leafMat = mat(0x3f8f45);
// A crown of leaves: a ball with soft lumps, a little wider at the bottom.
const crownGeo = shaped((q) => {
  const lumps = 1 + 0.12 * Math.sin(5 * q.x + 2 * q.y) * Math.sin(5 * q.z + 1) + 0.1 * Math.sin(6 * q.y + 3 * q.x);
  q.multiplyScalar(0.4 * lumps * (1 - 0.12 * q.y));
}, 9);
function tree(scale = 1) {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.09 * scale, 0.6 * scale, 8), mat(0x7a5236));
  trunk.position.y = 0.3 * scale;
  const crown = new THREE.Mesh(crownGeo, leafMat);
  crown.scale.setScalar(scale);
  crown.rotation.y = Math.random() * 6;
  crown.position.y = 0.85 * scale;
  t.add(trunk, crown);
  return t;
}

const forest = new THREE.Group();
const trees = [];
for (let i = 0; i < 14; i++) {
  const t = tree(0.9 + (i % 3) * 0.12);
  t.userData.x = X0 + 0.5 + (i % 7) * 0.85 + (i > 6 ? 0.4 : 0);
  t.userData.z = i > 6 ? -0.6 : 0.6;
  t.userData.fall = 0;
  forest.add(t);
  trees.push(t);
}
scene.add(tagPart(forest, 'forest'));

// Roots show on the cut face at the front, under the front row of trees.
const roots = new THREE.Group();
const rootMat = mat(0xe8d2a8);
trees.slice(0, 7).forEach((t) => {
  const r = new THREE.Group();
  [[-0.35, -0.25], [0, -0.4], [0.35, -0.25], [-0.18, -0.15], [0.2, -0.12]].forEach(([dx, dy]) => {
    const len = Math.hypot(dx, dy);
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.025, len, 5), rootMat);
    root.position.set(dx / 2, dy / 2, 0);
    root.rotation.z = Math.atan2(dx, -dy);
    r.add(root);
  });
  r.userData.x = t.userData.x;
  roots.add(r);
});
scene.add(tagPart(roots, 'roots'));

// Field rows, crops, the cover crop, and the row of trees.
const field = new THREE.Group();
field.visible = false;
const furrowMat = mat(0x3a271a);
const furrows = [];
for (let i = 0; i < 6; i++) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(X1 - X0 - 0.3, 0.03, 0.08), furrowMat);
  f.userData.z = -1.25 + i * 0.5;
  field.add(f);
  furrows.push(f);
}
scene.add(field);

const crops = new THREE.Group();
crops.visible = false;
const cropMat = mat(0x8cc63f);
const cropGeo = new THREE.ConeGeometry(0.07, 0.4, 5);
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 14; j++) {
    const c = new THREE.Mesh(cropGeo, cropMat);
    c.userData.x = X0 + 0.3 + j * 0.42;
    c.userData.z = -1.25 + i * 0.5;
    crops.add(c);
  }
}
scene.add(tagPart(crops, 'crops'));

const cover = new THREE.Mesh(new THREE.BufferGeometry(), mat(0x6fbf4a));
cover.visible = false;
scene.add(tagPart(cover, 'cover'));

const hedge = new THREE.Group();
hedge.visible = false;
for (let i = 0; i < 8; i++) {
  const t = tree(0.75);
  t.userData.x = X0 + 0.3 + i * 0.8;
  t.userData.z = -D / 2 + 0.25;
  hedge.add(t);
}
scene.add(tagPart(hedge, 'hedge'));

function placeOnSlope() {
  const tilt = Math.atan2(H, X1 - X0);
  trees.forEach((t) => { t.position.set(t.userData.x, surfaceY(t.userData.x) - 0.04, t.userData.z); });
  roots.children.forEach((r) => { r.position.set(r.userData.x, surfaceY(r.userData.x) - 0.02, D / 2 + 0.01); });
  furrows.forEach((f) => {
    const mid = (X0 + X1) / 2;
    f.position.set(mid, surfaceY(mid) + 0.005, f.userData.z);
    f.rotation.z = -tilt;
  });
  crops.children.forEach((c) => { c.position.set(c.userData.x, surfaceY(c.userData.x) + 0.2 * c.scale.y, c.userData.z); });
  hedge.children.forEach((t) => { t.position.set(t.userData.x, surfaceY(t.userData.x) - 0.04, t.userData.z); });
}

function placeCover() {
  const top = MAX_SOIL * soil;
  cover.geometry.dispose();
  cover.geometry = prism([[X0, rockY(X0) + top], [X1, rockY(X1) + top], [X1, rockY(X1) + top + 0.05], [X0, rockY(X0) + top + 0.05]]);
}

// ---------- Weather ----------

const RAIN_N = 120;
const rain = particles(RAIN_N, 0x2f6fc0, 0.08);
const RUN_N = 60;
const runoff = particles(RUN_N, 0x9fd8ff, 0.09);
const silt = particles(RUN_N, 0x6b4a2a, 0.11);
const DUST_N = 90;
const dust = particles(DUST_N, 0xa88a62, 0.16, 0.7);
scene.add(rain, runoff, silt, dust);
const rainDots = Array.from({ length: RAIN_N }, () => ({ x: X0 + Math.random() * (X1 - X0 + 1.5), z: (Math.random() - 0.5) * D, t: Math.random() }));
const runDots = Array.from({ length: RUN_N }, () => ({ t: Math.random(), z: (Math.random() - 0.5) * D * 0.9 }));
const dustDots = Array.from({ length: DUST_N }, () => ({ t: Math.random(), x0: X0 + Math.random() * (X1 - X0), z: (Math.random() - 0.5) * D, h: Math.random() }));
const cloud = new THREE.Group();
const cloudMat = mat(0x6a7280, { transparent: true, opacity: 0 });
for (let i = 0; i < 6; i++) {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7, 14, 10), cloudMat);
  puff.position.set(X0 + 0.6 + i * 1.2, 3.3 + (i % 2) * 0.25, (i % 3) * 0.4 - 0.4);
  puff.scale.y = 0.55;
  cloud.add(puff);
}
scene.add(cloud);

addLabel('forest', trees[3], v(0, 1.5, 0), { hideWith: forest });
addLabel('roots', roots.children[2], v(0, -0.5, 0.05), { hideWith: roots });
addLabel('topsoil', scene, v(X0 + 0.4, rockY(X0) + 0.15, D / 2 + 0.05));
addLabel('subsoil', scene, v(X0 + 0.9, BASE + 0.6, D / 2 + 0.05));
addLabel('crops', crops.children[40], v(0, 0.55, 0), { hideWith: crops });
addLabel('cover', cover, v(-1, 1.2, 0.8), { hideWith: cover });
addLabel('hedge', hedge.children[5], v(0, 1.2, 0), { hideWith: hedge });
addLabel('river', river, v(0, 0.55, 0.9));

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const state = { land: 'forest', crops: false, growth: 0, cover: false, hedge: false, weather: null, weatherT: 0, lost: 0, harvests: 0 };
const statusEl = document.getElementById('farm-status');

function protection(kind) {
  if (state.land === 'forest') return 1;
  let p = 0;
  if (state.cover) p = Math.max(p, kind === 'rain' ? 0.92 : 0.85);
  if (state.crops) p = Math.max(p, 0.55 * state.growth);
  if (state.hedge) p = kind === 'wind' ? Math.max(p, 0.88) : Math.min(1, p + 0.15);
  return p;
}

function showStatus() {
  const bars = Math.max(0, Math.round(soil * 5));
  const cropText = state.land === 'forest' ? '🌲 Forest' : state.crops ? `🌾 Crops ${Math.round(state.growth * 100)}% grown` : '🟫 Bare field';
  statusEl.textContent = `🟫 Topsoil: ${'▮'.repeat(bars)}${'▯'.repeat(5 - bars)} · ${cropText}`;
  document.getElementById('crops').setAttribute('aria-pressed', String(state.crops));
  document.getElementById('cover').setAttribute('aria-pressed', String(state.cover));
  document.getElementById('hedge').setAttribute('aria-pressed', String(state.hedge));
}

function needsField() {
  if (state.land === 'field') return true;
  levelCard.textContent = 'First, clear some forest to make a field.';
  cello.say('We need a field first! Tap “Clear for farming”.', { ms: 3500, important: false });
  return false;
}

document.getElementById('clear').addEventListener('click', () => {
  if (state.land === 'field') return;
  state.land = 'field';
  trees.forEach((t, i) => { t.userData.fall = -i * 0.08; });
  field.visible = true;
  levelCard.textContent = 'The trees are cut and the soil is ploughed. A field, ready for crops, but bare for now.';
  if (complete('clear')) cello.say('A new farm! But look: the soil is bare, and the roots are gone.', { mood: 'wow', ms: 5000 });
  explorer.showLabels();
  showStatus();
});

document.getElementById('forest').addEventListener('click', () => {
  Object.assign(state, { land: 'forest', crops: false, growth: 0, cover: false, hedge: false });
  soil = 1;
  mud = 0;
  trees.forEach((t) => { t.userData.fall = 0; t.visible = true; t.rotation.z = 0; });
  forest.visible = true;
  roots.visible = true;
  field.visible = false;
  crops.visible = false;
  cover.visible = false;
  hedge.visible = false;
  buildSoil();
  levelCard.textContent = 'Back to a forest, with all its topsoil. (In real life, that would take hundreds of years!)';
  explorer.showLabels();
  showStatus();
});

document.getElementById('crops').addEventListener('click', () => {
  if (!needsField()) return;
  state.crops = !state.crops;
  state.growth = 0;
  crops.visible = state.crops;
  levelCard.textContent = state.crops ? 'Seeds planted! Watch them grow. Thin soil means a smaller harvest.' : 'Crops pulled up. Bare field again.';
  explorer.showLabels();
  showStatus();
});

document.getElementById('cover').addEventListener('click', () => {
  if (!needsField()) return;
  state.cover = !state.cover;
  cover.visible = state.cover;
  levelCard.textContent = state.cover ? 'A cover crop carpets the soil, so it’s never bare.' : 'Cover crop gone.';
  explorer.showLabels();
  showStatus();
});

document.getElementById('hedge').addEventListener('click', () => {
  if (!needsField()) return;
  state.hedge = !state.hedge;
  hedge.visible = state.hedge;
  levelCard.textContent = state.hedge ? 'A row of trees along the field. It blocks the wind.' : 'Row of trees gone.';
  explorer.showLabels();
  showStatus();
});

document.getElementById('harvest').addEventListener('click', () => {
  if (!state.crops || state.growth < 1) {
    levelCard.textContent = state.crops ? 'Not ready yet. Wait until the crops are fully grown.' : 'Plant some crops first!';
    return;
  }
  const baskets = Math.max(1, Math.round(soil * 6));
  state.crops = false;
  state.growth = 0;
  crops.visible = false;
  state.harvests++;
  levelCard.textContent = `Harvest: ${'🧺'.repeat(baskets)} ${baskets} baskets. ${soil < 0.6 ? 'Thin soil, small harvest.' : 'Rich soil, big harvest!'} The field is bare again.`;
  if (complete('harvest')) cello.say(`${baskets} baskets of food! Healthy topsoil means a bigger harvest.`, { mood: 'wow', ms: 5000 });
  else cello.say(`${baskets} baskets.`, { ms: 2500, important: false });
  explorer.showLabels();
  showStatus();
});

document.querySelectorAll('[data-weather]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.weather;
  state.weather = key;
  state.weatherT = 0;
  state.lost = 0;
  state.startProt = protection(key);
  levelCard.textContent = key === 'rain' ? 'Heavy rain! Watch what runs down the hill.' : 'A strong wind! Watch the soil.';
}));

function weatherOver() {
  const key = state.weather;
  state.weather = null;
  const lost = state.lost;
  if (state.land === 'forest') {
    levelCard.textContent = `The forest held on. Roots and leaves kept the soil safe from the ${key}.`;
    return;
  }
  if (lost < 0.03) {
    levelCard.textContent = `Almost no soil lost. The ${key === 'rain' ? 'plants held it' : 'trees blocked the wind'}!`;
    if (complete('protect')) cello.say('Your field kept its soil! Plants and trees protect the land.', { mood: 'wow', ms: 5000 });
  } else if (key === 'rain') {
    levelCard.textContent = 'The rain washed topsoil down the hill and into the river. Now the river is muddy.';
    if (complete('erode')) cello.say('The soil washed into the river! Bare soil has no roots to hold it.', { mood: 'oops', ms: 5500 });
  } else {
    levelCard.textContent = 'The wind blew the dry topsoil away in a cloud of dust.';
    if (complete('dust')) cello.say('A dust storm! The wind carried the bare soil away.', { mood: 'oops', ms: 5000 });
  }
  if (soil < 0.3) {
    setTimeout(() => cello.say('Most of the topsoil is gone. Not much will grow here now. It takes hundreds of years to come back.', { mood: 'oops', ms: 6500 }), 3000);
  }
}

document.getElementById('reset').addEventListener('click', () => {
  camera.position.set(0.8, 3.4, 9.2);
  controls.target.set(-0.4, 0.4, 0);
});

// ---------- Animation ----------

let time = 0;
const lerp = THREE.MathUtils.lerp;
stage.onFrame((dt) => {
  time += dt;

  // Trees topple when the forest is cleared.
  if (state.land === 'field' && forest.visible) {
    let allDown = true;
    trees.forEach((t) => {
      t.userData.fall += dt * 1.2;
      const f = THREE.MathUtils.clamp(t.userData.fall, 0, 1);
      t.rotation.z = -f * f * (Math.PI / 2);
      if (f < 1) allDown = false;
      t.visible = f < 1;
    });
    if (allDown) { forest.visible = false; roots.visible = false; explorer.showLabels(); }
  }

  if (state.crops && state.growth < 1) {
    state.growth = Math.min(1, state.growth + dt * 0.2 * Math.max(0.3, soil));
    if (Math.round(state.growth * 100) % 5 === 0) showStatus();
  }
  const g = Math.max(0.05, state.growth);
  crops.children.forEach((c) => { c.scale.set(1, g, 1); });
  cropMat.color.setHex(0x8cc63f).lerp(new THREE.Color(0xe8c84a), Math.max(0, state.growth - 0.7) / 0.3);

  // Weather: soil lost depends on what's protecting it.
  const w = state.weather;
  if (w) {
    state.weatherT += dt;
    if (state.weatherT > 6) weatherOver();
  }
  const raining = w === 'rain';
  const windy = w === 'wind';
  cloudMat.opacity = lerp(cloudMat.opacity, raining ? 0.9 : 0, Math.min(1, dt * 2));
  let washing = 0;
  if (w) {
    const loss = (1 - protection(w)) * dt * (raining ? 0.06 : 0.05);
    if (soil > 0.08) {
      soil = Math.max(0.08, soil - loss);
      state.lost += loss;
    }
    washing = raining ? 1 - protection('rain') : 0;
    if (raining) mud = Math.min(1, mud + washing * dt * 0.4);
    buildSoil();
    showStatus();
  }
  mud = Math.max(0, mud - dt * 0.03);
  riverMat.color.copy(CLEAN).lerp(MUDDY, mud);

  const rp = rain.geometry.attributes.position;
  rainDots.forEach((d, i) => {
    if (!raining) { rp.setXYZ(i, 0, HIDE, 0); return; }
    d.t = (d.t + dt * 1.4) % 1;
    const ground = d.x < X1 ? surfaceY(d.x) : 0;
    rp.setXYZ(i, d.x, lerp(3.1, ground, d.t), d.z);
  });
  rp.needsUpdate = true;

  // Water runs down the slope; muddy when it's carrying soil.
  const up = runoff.geometry.attributes.position;
  const sp = silt.geometry.attributes.position;
  runDots.forEach((d, i) => {
    up.setXYZ(i, 0, HIDE, 0);
    sp.setXYZ(i, 0, HIDE, 0);
    if (!raining) return;
    d.t = (d.t + dt * 0.35) % 1;
    const x = lerp(X0 + 0.3, X1 + 0.4, d.t);
    const y = x < X1 ? surfaceY(x) + 0.04 : -0.05;
    const muddy = i / RUN_N < washing;
    (muddy ? sp : up).setXYZ(i, x, y, d.z);
  });
  up.needsUpdate = true;
  sp.needsUpdate = true;

  // Dust blows off bare soil in the wind.
  const dp = dust.geometry.attributes.position;
  const blowing = windy ? 1 - protection('wind') : 0;
  dustDots.forEach((d, i) => {
    if (!windy || i / DUST_N > blowing) { dp.setXYZ(i, 0, HIDE, 0); return; }
    d.t = (d.t + dt * 0.4) % 1;
    const x = d.x0 + d.t * 5;
    dp.setXYZ(i, x, surfaceY(Math.min(X1, d.x0)) + 0.1 + d.t * (1 + d.h * 1.5), d.z + Math.sin(time * 3 + i) * 0.1);
  });
  dp.needsUpdate = true;
  if (windy) {
    hedge.children.forEach((t, i) => { t.rotation.z = Math.sin(time * 4 + i) * 0.06; });
    crops.children.forEach((c, i) => { c.rotation.z = -0.25 + Math.sin(time * 6 + i) * 0.1; });
    trees.forEach((t, i) => { if (state.land === 'forest') t.rotation.z = Math.sin(time * 4 + i) * 0.05; });
  } else {
    if (state.land === 'forest') trees.forEach((t) => { t.rotation.z = 0; });
    crops.children.forEach((c) => { c.rotation.z = 0; });
  }
  if (state.crops) placeOnSlope();
});

buildSoil();
showStatus();
camera.position.set(0.8, 3.4, 9.2);
controls.target.set(-0.4, 0.4, 0);
