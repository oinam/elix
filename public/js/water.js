import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Water on Earth. If all of Earth's water fit in 100 cups, 97 would be
// salty sea and 3 fresh; zoom into the fresh water and most of it is ice or
// underground, with about 1 part in 100 in lakes, rivers, and the air. The
// water cycle view is a cut-away landscape: the Sun lifts vapor off the
// sea, a cloud fills up and rains (snow on the mountain), the water runs
// off in a river or soaks down into the groundwater, where a well can pump
// it up. Pump too much and the well runs dry until the rain refills it.

const PARTS = {
  ocean: { name: 'Ocean', text: 'Salty water. It holds about 97 of every 100 cups of Earth’s water. Too salty to drink!' },
  freshwater: { name: 'Fresh water', text: 'Water that isn’t salty. Only about 3 cups out of 100, and most of it is frozen or underground.' },
  ice: { name: 'Ice and glaciers', text: 'Most fresh water is frozen in glaciers and the ice caps at the poles, about 69 out of every 100 cups of fresh water.' },
  groundwater: { name: 'Groundwater', text: 'Water that soaks into the ground and fills the tiny gaps in sand and rock. These wet layers are called aquifers.' },
  river: { name: 'Lakes and rivers', text: 'The fresh water we can see. It’s only about 1 cup in every 100 cups of fresh water.' },
  vapor: { name: 'Water vapor', text: 'Water as an invisible gas. The Sun’s heat turns sea water into vapor, and the salt stays behind. That’s evaporation.' },
  cloud: { name: 'Cloud', text: 'High up, the vapor cools and turns into tiny drops that make a cloud. That’s condensation.' },
  rain: { name: 'Rain and snow', text: 'When the drops in a cloud get big and heavy, they fall. That’s precipitation. Where it’s cold, it falls as snow.' },
  well: { name: 'Well', text: 'A deep hole down to the groundwater. Pump too much and the water underground runs out.' },
};

const STEPS = {
  evaporation: 'Evaporation: the Sun warms the sea, and water rises as invisible vapor. The salt stays behind.',
  condensation: 'Condensation: high up, the vapor cools into tiny drops, and they gather into a cloud.',
  precipitation: 'Precipitation: the drops join up and get heavy, and fall as rain, or as snow where it’s cold.',
  runoff: 'Runoff: rain runs downhill into rivers and back to the sea. Some soaks into the ground.',
};

const CUPS = {
  all: { line: 'All of Earth’s water in 100 cups: 97 salty, 3 fresh.', count: '🌊 97 salty · 🥤 3 fresh' },
  fresh: { line: 'Just the fresh water, in 100 drops: most is ice, and lots is underground.', count: '🧊 69 ice · 🟫 30 underground · 💧 1 lakes, rivers, and air' },
};

const VIEWS = {
  cups: { camera: [0, 4.2, 6.8], target: [0, 0, 0.3], line: 'If all of Earth’s water fit in 100 cups, how many could you drink?' },
  cycle: { camera: [0, 1.8, 10.5], target: [0, 0.5, 0], line: 'The same water goes round and round. Tap the steps to see each one!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'water',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['ocean'],
  resolve: (hit) => {
    if (hit.object === cups) return hit.instanceId < 97 ? 'ocean' : 'freshwater';
    if (hit.object === fresh) return hit.instanceId < 69 ? 'ice' : hit.instanceId < 99 ? 'groundwater' : 'river';
    return hit.object.userData.part;
  },
  greeting: 'Earth is a watery planet! But how much of it can we drink? Let’s find out.',
  allPartsLine: 'All 9 parts! You know where Earth’s water is, and how it goes round.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

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

// ---------- 100 cups ----------

const cupsView = new THREE.Group();
scene.add(cupsView);
const grid = (i) => v(((i % 10) - 4.5) * 0.44, 0, (Math.floor(i / 10) - 4.5) * 0.44);
const cups = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.12, 0.34, 16), mat(0xffffff, { roughness: 0.3 }), 100);
const fresh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0xffffff, { roughness: 0.4 }), 100);
const m4 = new THREE.Matrix4();
for (let i = 0; i < 100; i++) {
  const p = grid(i);
  m4.makeTranslation(p.x, 0.17, p.z);
  cups.setMatrixAt(i, m4);
  cups.setColorAt(i, new THREE.Color(i < 97 ? 0x2f6fb0 : 0xa8e6ff));
  m4.makeTranslation(p.x, 0.15, p.z);
  fresh.setMatrixAt(i, m4);
  fresh.setColorAt(i, new THREE.Color(i < 69 ? 0xf4fbff : i < 99 ? 0x9c7b5c : 0x3d9cf0));
}
cupsView.add(tagPart(cups, 'ocean'), tagPart(fresh, 'ice'));
fresh.visible = false;
const tray = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 4.8), mat(0xe8dcc4));
tray.position.y = -0.05;
cupsView.add(tray);
addLabel('ocean', cupsView, v(-0.4, 0.6, -0.6), { hideWith: cups });
addLabel('freshwater', cupsView, v(1.5, 0.6, 2.4), { hideWith: cups });
addLabel('ice', cupsView, v(0, 0.55, -0.4), { hideWith: fresh });
addLabel('groundwater', cupsView, v(0.6, 0.55, 1.6), { hideWith: fresh });
addLabel('river', cupsView, v(2.2, 0.55, 2.6), { hideWith: fresh });

// ---------- The water cycle ----------

const cycleView = new THREE.Group();
cycleView.visible = false;
scene.add(cycleView);
const D = 3;
const COAST = 1.4;
const ROCK_TOP = -1.5;
const AQ_TOP = -0.5;
const GROUND = 0;

const bedrock = new THREE.Mesh(new THREE.BoxGeometry(10, 1.0, D), mat(0x77736e));
bedrock.position.y = ROCK_TOP - 0.5;
cycleView.add(bedrock);
// The aquifer: sandy rock, with water filling it up to the water table.
const sand = new THREE.Mesh(new THREE.BoxGeometry(5 + COAST, AQ_TOP - ROCK_TOP, D), mat(0xc9b07a));
sand.position.set((-5 + COAST) / 2, (AQ_TOP + ROCK_TOP) / 2, 0);
cycleView.add(sand);
const aquifer = new THREE.Mesh(new THREE.BoxGeometry(5 + COAST, 1, D + 0.02), mat(0x4a90d9, { transparent: true, opacity: 0.75 }));
aquifer.geometry.translate(0, 0.5, 0);
aquifer.position.set((-5 + COAST) / 2, ROCK_TOP, 0);
cycleView.add(tagPart(aquifer, 'groundwater'));
const soil = new THREE.Mesh(new THREE.BoxGeometry(5 + COAST, GROUND - AQ_TOP, D), [mat(0x8a6a4f), mat(0x8a6a4f), mat(0x7cbf5a), mat(0x8a6a4f), mat(0x8a6a4f), mat(0x8a6a4f)]);
soil.position.set((-5 + COAST) / 2, (GROUND + AQ_TOP) / 2, 0);
cycleView.add(soil);
const sea = new THREE.Mesh(new THREE.BoxGeometry(5 - COAST, GROUND - 0.08 - ROCK_TOP, D), mat(0x2f7fd6, { transparent: true, opacity: 0.75, roughness: 0.2 }));
sea.position.set((5 + COAST) / 2, (GROUND - 0.08 + ROCK_TOP) / 2, 0);
cycleView.add(tagPart(sea, 'ocean'));

const MOUNTAIN = v(-3.4, GROUND, -0.3);
const mountain = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 8), mat(0x8d8a86, { flatShading: true }));
mountain.position.copy(MOUNTAIN).add(v(0, 1.3, 0));
const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 8), mat(0xf4fbff, { flatShading: true, emissive: 0x223344 }));
snowCap.position.copy(MOUNTAIN).add(v(0, 2.6 - 0.55 + 0.02, 0));
snowCap.scale.setScalar(1.04);
cycleView.add(mountain, tagPart(snowCap, 'ice'));

// The river runs from the mountain to the sea.
const riverCurve = new THREE.CatmullRomCurve3([v(-2.6, GROUND + 0.01, 0.2), v(-1.6, GROUND + 0.01, 0.9), v(-0.2, GROUND + 0.01, 0.6), v(COAST + 0.1, GROUND + 0.01, 1.0)]);
const river = new THREE.Mesh(new THREE.TubeGeometry(riverCurve, 40, 0.12, 6, false), mat(0x4aa3f0, { roughness: 0.2 }));
river.scale.y = 0.15;
cycleView.add(tagPart(river, 'river'));

const WELL_X = -0.7;
const well = new THREE.Group();
const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 10), mat(0x6b7280, { metalness: 0.4 }));
pipe.position.y = -0.5;
const pump = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.22), mat(0x3a7a4a));
pump.position.y = 0.55;
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), mat(0x3a3f48));
handle.geometry.translate(0.3, 0, 0);
handle.position.set(0.08, 0.78, 0);
const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8).rotateZ(Math.PI / 2), mat(0x3a7a4a));
spout.position.set(-0.2, 0.6, 0);
const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.2, 14), mat(0xb0b8c4, { metalness: 0.3 }));
bucket.position.set(-0.32, 0.1, 0);
const bucketWater = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.02, 14), mat(0x3d9cf0));
bucketWater.position.set(-0.32, 0.02, 0);
well.add(pipe, pump, handle, spout, bucket, bucketWater);
// Right at the front, so the pipe shows in the cut-away.
well.position.set(WELL_X, GROUND, D / 2 - 0.03);
cycleView.add(tagPart(well, 'well'));
const PIPE_BOTTOM = GROUND - 1.4;

const sun = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd75e }));
sun.position.set(4.2, 4.2, -1);
cycleView.add(sun);

const cloud = new THREE.Group();
const cloudMat = mat(0xffffff, { emissive: 0x333333 });
[[0, 0, 0, 0.55], [0.6, -0.1, 0.1, 0.45], [-0.6, -0.12, 0, 0.42], [0.2, 0.3, -0.1, 0.4], [-0.25, 0.25, 0.15, 0.38]].forEach(([x, y, z, r]) => {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat);
  puff.position.set(x, y, z);
  cloud.add(puff);
});
cloud.position.set(-2.0, 3.3, 0);
cycleView.add(tagPart(cloud, 'cloud'));

const VAPOR_N = 50;
const vapor = particles(VAPOR_N, 0xffffff, 0.12, 0.7);
const RAIN_N = 70;
const rain = particles(RAIN_N, 0x2f6fc0, 0.12);
const snowDots = particles(RAIN_N, 0xffffff, 0.12);
const RUN_N = 24;
const runoff = particles(RUN_N, 0x9fd8ff, 0.1);
const SEEP_N = 16;
const seep = particles(SEEP_N, 0x3d8fe0, 0.09);
cycleView.add(vapor, rain, snowDots, runoff, seep);
// Dots are hard to tap, so invisible boxes stand in for the vapor and the rain.
const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const vaporZone = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2), ghost);
vaporZone.position.set(COAST + 1.9, 1.5, 0);
const rainZone = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.4, 1.4), ghost);
rainZone.position.y = 1.6;
cycleView.add(tagPart(vaporZone, 'vapor'), tagPart(rainZone, 'rain'));
const vaporDots = Array.from({ length: VAPOR_N }, () => ({ t: Math.random(), x: COAST + 0.3 + Math.random() * 3.2, z: (Math.random() - 0.5) * 2 }));
const rainDots = Array.from({ length: RAIN_N }, () => ({ t: Math.random(), x: 0, z: 0, ox: (Math.random() - 0.5) * 2.2, oz: (Math.random() - 0.5) * 1.4 }));
const runDots = Array.from({ length: RUN_N }, (_, i) => ({ t: i / RUN_N }));
const seepDots = Array.from({ length: SEEP_N }, () => ({ t: Math.random(), x: -4 + Math.random() * 4.5, z: (Math.random() - 0.5) * 2 }));

addLabel('ocean', sea, v(0.3, 1.0, 0), { hideWith: cycleView });
addLabel('ice', snowCap, v(0.6, 0.3, 0), { hideWith: cycleView });
addLabel('groundwater', cycleView, v(-3.3, -1.1, D / 2 + 0.05), { hideWith: cycleView });
addLabel('river', cycleView, v(-0.6, 0.25, 1.4), { hideWith: cycleView });
addLabel('well', well, v(0, 1.1, 0), { hideWith: cycleView });
addLabel('cloud', cloud, v(0, 0.95, 0), { hideWith: cycleView });
addLabel('vapor', cycleView, v(3.4, 1.4, 0), { hideWith: cycleView });
addLabel('rain', cycleView, v(-1.2, 1.6, 0.5), { hideWith: cycleView });

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const state = { view: 'cups', heat: 5, cloud: 0.3, raining: false, table: 0.75, wasDry: false, focus: null, focusT: 0 };
const seen = new Set();

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  cupsView.visible = key === 'cups';
  cycleView.visible = key === 'cycle';
  ['cups', 'cycle'].forEach((k) => {
    const el = document.getElementById(`${k}-tools`);
    el.hidden = false;
    el.style.display = k === key ? '' : 'none';
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aimCamera();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

function setCups(key) {
  cups.visible = key === 'all';
  fresh.visible = key === 'fresh';
  document.querySelectorAll('[data-cups]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cups === key)));
  document.getElementById('cups-count').textContent = CUPS[key].count;
  levelCard.textContent = CUPS[key].line;
  explorer.showLabels();
}
document.querySelectorAll('[data-cups]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.cups;
  setCups(key);
  popIn = 0;
  if (key === 'fresh' && complete('fresh')) {
    cello.say('Most fresh water is frozen ice! And lots is underground. Lakes and rivers are just 1 drop out of 100.', { mood: 'wow', ms: 6500 });
  } else {
    cello.say(CUPS[key].line, { ms: 4000, important: false });
  }
}));

document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.step;
  state.focus = key;
  state.focusT = 0;
  levelCard.textContent = STEPS[key];
  if (key === 'precipitation') state.cloud = Math.max(state.cloud, 0.95);
  if (key === 'condensation') state.cloud = Math.min(0.9, state.cloud + 0.3);
  seen.add(key);
  if (seen.size === 4 && complete('cycle')) {
    cello.say('Evaporation, condensation, precipitation, runoff, and round again. That’s the water cycle!', { mood: 'wow', ms: 6500 });
  } else {
    cello.say(STEPS[key], { ms: 5000, important: false });
  }
}));

bindSlider('heat', (h) => (h === 0 ? 'Off' : `${h} of 10`), (h) => {
  state.heat = h;
  sun.material.color.setHex(h ? 0xffd75e : 0x8a8370);
  sun.scale.setScalar(0.6 + h * 0.06);
});

function showWell() {
  aquifer.scale.y = Math.max(0.02, state.table);
  const bars = Math.round(state.table * 5);
  document.getElementById('well-level').textContent = `🟦 Groundwater: ${'▮'.repeat(bars)}${'▯'.repeat(5 - bars)}`;
}

document.getElementById('pump').addEventListener('click', () => {
  const waterTop = ROCK_TOP + state.table;
  handleKick = 1;
  if (waterTop > PIPE_BOTTOM + 0.05) {
    state.table = Math.max(0, state.table - 0.12);
    bucketWater.position.y = Math.min(0.18, bucketWater.position.y + 0.05);
    levelCard.textContent = 'Splash! Water from deep underground. The water underground drops a little each time.';
    if (complete('well')) cello.say('Water from the ground! That’s groundwater, pumped up from the aquifer.', { mood: 'wow', ms: 5000 });
  } else {
    state.wasDry = true;
    levelCard.textContent = 'The well is dry! The water underground dropped below the pipe. Wait for rain to refill it.';
    cello.say('Nothing comes out! We used it faster than the rain could put it back.', { mood: 'oops', ms: 5500 });
  }
  showWell();
});

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
let popIn = 1;
let handleKick = 0;
const lerp = THREE.MathUtils.lerp;
stage.onFrame((dt) => {
  time += dt;
  if (cupsView.visible) {
    // New cups pop up one row at a time.
    popIn = Math.min(1.2, popIn + dt * 0.8);
    const mesh = cups.visible ? cups : fresh;
    for (let i = 0; i < 100; i++) {
      const p = grid(i);
      const s = THREE.MathUtils.clamp(popIn * 10 - Math.floor(i / 10), 0.001, 1);
      m4.makeScale(s, s, s).setPosition(p.x, mesh === cups ? 0.17 * s : 0.15 * s, p.z);
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  if (cycleView.visible) updateCycle(dt);
});

function updateCycle(dt) {
  const heat = state.heat / 10;
  const boost = (key) => (state.focus === key ? 2.5 : 1);
  state.focusT += dt;
  if (state.focusT > 6) state.focus = null;

  // Evaporation: vapor rises off the sea and drifts to the cloud.
  const vp = vapor.geometry.attributes.position;
  vaporDots.forEach((d, i) => {
    if (heat > 0) d.t += dt * heat * 0.25 * boost('evaporation');
    if (d.t >= 1) {
      d.t -= 1;
      d.x = COAST + 0.3 + Math.random() * 3.2;
      state.cloud = Math.min(1, state.cloud + 0.006 * boost('condensation'));
    }
    if (heat <= 0 && d.t < 0.02) { vp.setXYZ(i, 0, HIDE, 0); return; }
    const k = d.t;
    vp.setXYZ(i, lerp(d.x, cloud.position.x + 1, k * k), lerp(GROUND, cloud.position.y - 0.2, k), d.z * (1 - k * 0.6));
  });
  vp.needsUpdate = true;

  // Condensation: the cloud swells and darkens as it fills.
  cloud.scale.setScalar(0.6 + state.cloud * 0.7);
  cloudMat.color.setHex(0xffffff).lerp(new THREE.Color(0x7a8494), Math.max(0, state.cloud - 0.5) * 1.6);
  if (state.cloud >= 0.95 && !state.raining) {
    state.raining = true;
    levelCard.textContent = 'The cloud is full and heavy. Here comes the rain, and snow on the mountain!';
    if (complete('rain')) cello.say('The cloud got so full that it rains! And on the cold mountain top, it snows.', { mood: 'wow', ms: 5500 });
  }
  if (state.cloud <= 0.2) state.raining = false;
  cloud.position.x = -2.0 + Math.sin(time * 0.2) * 0.6;
  vaporZone.visible = heat > 0;
  rainZone.visible = state.raining;
  rainZone.position.x = cloud.position.x;

  // Precipitation: rain over the land, snow over the mountain top.
  const rp = rain.geometry.attributes.position;
  const sp = snowDots.geometry.attributes.position;
  rainDots.forEach((d, i) => {
    rp.setXYZ(i, 0, HIDE, 0);
    sp.setXYZ(i, 0, HIDE, 0);
    if (!state.raining) { d.t = Math.random(); return; }
    d.t += dt * 0.7 * boost('precipitation');
    if (d.t >= 1) {
      d.t -= 1;
      d.x = cloud.position.x + d.ox * cloud.scale.x;
      d.z = d.oz;
      state.cloud = Math.max(0, state.cloud - 0.0008);
      state.table = Math.min(1, state.table + 0.001);
      if (state.wasDry && ROCK_TOP + state.table > PIPE_BOTTOM + 0.3 && complete('dry')) {
        state.wasDry = false;
        cello.say('The rain soaked into the ground and filled the aquifer again. Now the well works!', { mood: 'wow', ms: 5500 });
      }
      showWell();
    }
    const x = d.x || cloud.position.x + d.ox;
    const y = lerp(cloud.position.y - 0.3, GROUND + 0.05, d.t);
    // It's cold up on the mountain, so it snows there.
    const onMountain = Math.abs(x - MOUNTAIN.x) < 1.0 && y > 1.2;
    (onMountain ? sp : rp).setXYZ(i, x + (onMountain ? Math.sin(time * 3 + i) * 0.05 : 0), y, d.z);
  });
  rp.needsUpdate = true;
  sp.needsUpdate = true;

  // Runoff down the river, and water soaking into the ground.
  const up = runoff.geometry.attributes.position;
  runDots.forEach((d, i) => {
    d.t = (d.t + dt * 0.12 * boost('runoff')) % 1;
    const p = riverCurve.getPointAt(d.t);
    up.setXYZ(i, p.x, p.y + 0.04, p.z);
  });
  up.needsUpdate = true;
  const sk = seep.geometry.attributes.position;
  seepDots.forEach((d, i) => {
    d.t = (d.t + dt * 0.2 * (state.raining ? 1.5 : 0.4)) % 1;
    sk.setXYZ(i, d.x, lerp(GROUND - 0.05, ROCK_TOP + state.table, d.t), D / 2 + 0.03);
  });
  sk.needsUpdate = true;

  handleKick = Math.max(0, handleKick - dt * 3);
  handle.rotation.z = -handleKick * 0.6;
  bucketWater.position.y = Math.max(0.02, bucketWater.position.y - dt * 0.004);
}

setCups('all');
showWell();
setView('cups');
