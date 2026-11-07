import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// The spheres work together. A terrarium is a little Earth in a jar: the
// lamp warms the water, vapor rises, condenses on the lid, and falls back as
// rain, while the plant and the snail swap oxygen and carbon dioxide. Take
// the lid off and the water escapes. Big events (a volcano, a storm, a
// forest fire, planting trees) each change all four spheres at once.

const PARTS = {
  glass: { name: 'Glass jar', text: 'A closed jar keeps the water and air inside. That makes it a tiny world of its own, called a terrarium.' },
  soil: { name: 'Soil and pebbles', text: 'The geosphere of the jar. Plants grow their roots in it, and it soaks up rain.' },
  water: { name: 'Water', text: 'The hydrosphere of the jar. Warmed by light, it turns into invisible vapor and rises.' },
  plant: { name: 'Plant', text: 'It drinks water from the soil, uses light to make food, and gives out oxygen for the snail.' },
  snail: { name: 'Snail', text: 'It breathes in oxygen from the plant and breathes out carbon dioxide, which the plant needs.' },
  droplets: { name: 'Drops on the lid', text: 'Vapor cools on the glass and turns back into water drops. That’s condensation. Then they fall like rain.' },
  lamp: { name: 'Lamp (sun)', text: 'It gives light for the plant and warmth that makes the water evaporate, just like the Sun.' },
  volcano: { name: 'Volcano', text: 'A mountain that lets out melted rock, ash, and gas from deep inside the Earth.' },
  river: { name: 'River', text: 'Rain runs into it. Mud, ash, and smoke from events can end up in it too.' },
  forest: { name: 'Forest', text: 'Trees hold the soil with their roots, make oxygen, and give animals a home.' },
};

const EVENTS = {
  volcano: {
    title: '🌋 A volcano erupts!',
    effects: [
      ['🪨', 'Geosphere', 'Hot lava cools into brand-new rock.'],
      ['🌬️', 'Atmosphere', 'Ash and gas shoot high into the air.'],
      ['💧', 'Hydrosphere', 'Ash falls into rivers and makes them muddy.'],
      ['🌱', 'Biosphere', 'Animals run away. Later, the ash makes rich soil for plants.'],
    ],
  },
  storm: {
    title: '⛈️ A big storm!',
    effects: [
      ['🌬️', 'Atmosphere', 'Strong winds and dark clouds.'],
      ['💧', 'Hydrosphere', 'Heavy rain fills the river until it floods.'],
      ['🪨', 'Geosphere', 'Rushing water washes soil away.'],
      ['🌱', 'Biosphere', 'Trees bend and some fall. Animals hide.'],
    ],
  },
  fire: {
    title: '🔥 A forest fire!',
    effects: [
      ['🌱', 'Biosphere', 'Trees burn, and animals lose their homes.'],
      ['🌬️', 'Atmosphere', 'Smoke and carbon dioxide fill the air.'],
      ['🪨', 'Geosphere', 'With no roots to hold it, soil washes away.'],
      ['💧', 'Hydrosphere', 'Ash gets into streams and rivers.'],
    ],
  },
  plant: {
    title: '🌱 People plant trees!',
    effects: [
      ['🌱', 'Biosphere', 'New trees grow, and animals come back.'],
      ['🌬️', 'Atmosphere', 'Trees take in carbon dioxide and give out oxygen.'],
      ['🪨', 'Geosphere', 'Roots hold the soil in place.'],
      ['💧', 'Hydrosphere', 'Roots soak up rain, so rivers stay clean.'],
    ],
  },
};

const VIEWS = {
  jar: { camera: [0, 2.2, 6.4], target: [0, 1.3, 0], line: 'A tiny world in a jar: rock, water, air, and life, all sharing.' },
  events: { camera: [0, 4.2, 8.8], target: [0, 0.6, 0], line: 'Pick an event and watch which spheres it changes.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'interactions',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['glass'],
  outer: ['lamp'],
  greeting: 'This jar is a tiny Earth. Watch the water go round, and see how the plant and the snail help each other!',
  allPartsLine: 'All 10 parts! You see how everything is connected.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

// Round dots, not squares.
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

// A pool of dots we move by hand every frame.
function particles(count, color, size, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTexture, alphaTest: 0.3, transparent: true, opacity, depthWrite: false }));
  points.frustumCulled = false;
  return points;
}
function setDot(points, i, x, y, z) {
  points.geometry.attributes.position.setXYZ(i, x, y, z);
}
const HIDE = -99;

// ---------- The terrarium ----------

const jarView = new THREE.Group();
scene.add(jarView);
const JAR_R = 1.4;
const JAR_H = 2.6;
const glassMat = mat(0xdff3ff, { transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
const glass = new THREE.Mesh(new THREE.CylinderGeometry(JAR_R, JAR_R, JAR_H, 48, 1, true), glassMat);
glass.position.y = JAR_H / 2;
jarView.add(tagPart(glass, 'glass'));
const lid = new THREE.Mesh(new THREE.CylinderGeometry(JAR_R + 0.05, JAR_R + 0.05, 0.16, 48), mat(0xc49a6c));
const LID_ON = { pos: v(0, JAR_H + 0.08, 0), rot: 0 };
const LID_OFF = { pos: v(2.9, 0.08, -1.3), rot: 0 };
lid.position.copy(LID_ON.pos);
jarView.add(tagPart(lid, 'glass'));

const gravel = new THREE.Mesh(new THREE.CylinderGeometry(JAR_R - 0.02, JAR_R - 0.02, 0.2, 48), mat(0x9a9a96));
gravel.position.y = 0.1;
const soilMat = mat(0x5c3d27);
const soil = new THREE.Mesh(new THREE.CylinderGeometry(JAR_R - 0.02, JAR_R - 0.02, 0.55, 48), soilMat);
soil.position.y = 0.475;
jarView.add(tagPart(gravel, 'soil'), tagPart(soil, 'soil'));
const SOIL_TOP = 0.75;

const POND = v(0.55, SOIL_TOP + 0.02, 0.35);
const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), mat(0x3d8fe0, { roughness: 0.15, emissive: 0x0a2a50 }));
pond.position.copy(POND);
jarView.add(tagPart(pond, 'water'));

const leafMat = mat(0x3f9b4a);
const plant = new THREE.Group();
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.0, 8), mat(0x5a7d36));
stem.position.y = 0.5;
plant.add(stem);
const leaves = [];
for (let i = 0; i < 6; i++) {
  const pivot = new THREE.Group();
  pivot.position.y = 0.3 + i * 0.13;
  pivot.rotation.y = i * 2.3;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), leafMat);
  leaf.scale.set(1.5, 0.2, 0.6);
  leaf.position.x = 0.26;
  pivot.add(leaf);
  pivot.rotation.z = 0.35;
  plant.add(pivot);
  leaves.push(pivot);
}
plant.position.set(-0.45, SOIL_TOP, -0.25);
jarView.add(tagPart(plant, 'plant'));
// Moss tufts.
for (let i = 0; i < 7; i++) {
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), leafMat);
  tuft.scale.y = 0.45;
  const a = i * 0.9 + 2;
  tuft.position.set(Math.cos(a) * 1.0, SOIL_TOP, Math.sin(a) * 1.0);
  jarView.add(tuft);
}

const snail = new THREE.Group();
const shell = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.07, 10, 20), mat(0xd08a4a));
shell.position.y = 0.14;
const snailBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.25, 4, 8).rotateZ(Math.PI / 2), mat(0xc9b99a));
snailBody.position.y = 0.05;
snail.add(shell, snailBody);
jarView.add(tagPart(snail, 'snail'));

const LAMP = v(2.3, 3.4, 0.6);
const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd75e }));
lamp.position.copy(LAMP);
jarView.add(tagPart(lamp, 'lamp'));
const lampLight = new THREE.PointLight(0xfff0c0, 6, 10);
lampLight.position.copy(LAMP);
jarView.add(lampLight);

// Drops that condense under the lid and on the top of the glass.
const DROPS = 46;
const dropMat = mat(0xbfe6ff, { roughness: 0.05, transparent: true, opacity: 0.85 });
const lidDrops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), dropMat, DROPS);
const dummy = new THREE.Object3D();
for (let i = 0; i < DROPS; i++) {
  if (i < 28) {
    const r = Math.sqrt(Math.random()) * (JAR_R - 0.1);
    const a = Math.random() * Math.PI * 2;
    dummy.position.set(Math.cos(a) * r, JAR_H - 0.03, Math.sin(a) * r);
  } else {
    const a = Math.random() * Math.PI * 2;
    dummy.position.set(Math.cos(a) * (JAR_R - 0.03), JAR_H - 0.1 - Math.random() * 0.6, Math.sin(a) * (JAR_R - 0.03));
  }
  dummy.updateMatrix();
  lidDrops.setMatrixAt(i, dummy.matrix);
}
jarView.add(tagPart(lidDrops, 'droplets'));

// Vapor rising, and rain falling.
const N = 44;
const vapor = particles(N, 0xffffff, 0.07, 0.65);
const rain = particles(N, 0x5aa9ff, 0.09);
jarView.add(vapor, rain);
const drops = Array.from({ length: N }, () => ({
  t: Math.random(),
  x: 0, z: 0,
  escaped: false,
}));
function newSpot(d) {
  // Most vapor comes off the pond; some from the damp soil.
  if (Math.random() < 0.7) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.45;
    d.x = POND.x + Math.cos(a) * r;
    d.z = POND.z + Math.sin(a) * r;
  } else {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (JAR_R - 0.2);
    d.x = Math.cos(a) * r;
    d.z = Math.sin(a) * r;
  }
}
drops.forEach(newSpot);

// Oxygen from the plant to the snail; carbon dioxide back.
const o2 = particles(6, 0x9cf29c, 0.08);
const co2 = particles(6, 0x9a9a9a, 0.08);
jarView.add(o2, co2);

addLabel('glass', jarView, v(-JAR_R - 0.1, 2.0, 0), { hideWith: jarView });
addLabel('soil', jarView, v(-JAR_R - 0.1, 0.4, 0.3), { hideWith: jarView });
addLabel('water', pond, v(0, 0.3, 0.3), { hideWith: jarView });
addLabel('plant', plant, v(0, 1.25, 0), { hideWith: jarView });
addLabel('snail', snail, v(0, 0.4, 0), { hideWith: jarView });
addLabel('droplets', jarView, v(0, JAR_H + 0.45, 0), { hideWith: lidDrops });
addLabel('lamp', lamp, v(0, 0.6, 0), { hideWith: jarView });

// ---------- Big events ----------

const eventsView = new THREE.Group();
eventsView.visible = false;
scene.add(eventsView);
const GROUND_R = 3.6;
const ground = new THREE.Mesh(new THREE.CylinderGeometry(GROUND_R, GROUND_R, 0.5, 64), [mat(0x9c7b5c), mat(0x7cbf5a), mat(0x9c7b5c)]);
ground.position.y = -0.25;
eventsView.add(ground);
const groundTop = ground.material[1];

const VOLCANO = v(-1.7, 0, -1.2);
const volcano = new THREE.Group();
const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.5, 2.2, 10, 1, true), mat(0x6e625a, { flatShading: true, side: THREE.DoubleSide }));
cone.position.y = 1.1;
const lavaMat = mat(0xff5a1f, { emissive: 0xff3300, emissiveIntensity: 0 });
const crater = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16).rotateX(-Math.PI / 2), lavaMat);
crater.position.y = 2.15;
volcano.add(cone, crater);
// Lava streams down the sides.
const streams = [0.3, 2.4, 4.4].map((a) => {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1, 0.05), lavaMat);
  s.geometry.translate(0, -0.5, 0);
  const pivot = new THREE.Group();
  pivot.position.set(Math.cos(a) * 0.36, 2.18, Math.sin(a) * 0.36);
  pivot.rotation.y = -a + Math.PI / 2;
  s.rotation.x = -0.5;
  s.position.z = 0.02;
  pivot.add(s);
  s.scale.y = 0.001;
  volcano.add(pivot);
  return s;
});
volcano.position.copy(VOLCANO);
eventsView.add(tagPart(volcano, 'volcano'));

const riverMat = mat(0x4aa3f0, { roughness: 0.2 });
const river = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 7.0).rotateX(-Math.PI / 2), riverMat);
river.position.set(0.4, 0.012, 0);
river.rotation.y = 0.35;
eventsView.add(tagPart(river, 'river'));
const RIVER_CLEAN = new THREE.Color(0x4aa3f0);
const RIVER_MUDDY = new THREE.Color(0x8a7a5a);

const crownMat = mat(0x3f9b4a);
const forest = new THREE.Group();
const trees = [];
const TREE_SPOTS = [[1.6, -1.4], [2.3, -0.6], [1.9, 0.4], [2.6, 0.9], [1.4, 1.3], [2.1, 1.9], [2.9, -1.4], [1.2, -0.3]];
const SAPLING_SPOTS = [[-1.6, 1.2], [-2.3, 0.6], [-0.9, 1.9], [-2.0, 1.9], [-1.2, 0.4]];
function tree(x, z) {
  const t = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.6, 8), mat(0x7a5236));
  trunk.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.0, 10), crownMat.clone());
  crown.position.y = 1.0;
  t.add(trunk, crown);
  t.position.set(x, 0, z);
  t.userData.crown = crown;
  return t;
}
TREE_SPOTS.forEach(([x, z]) => { const t = tree(x, z); forest.add(t); trees.push(t); });
const saplings = SAPLING_SPOTS.map(([x, z]) => { const t = tree(x, z); t.scale.setScalar(0.001); forest.add(t); return t; });
eventsView.add(tagPart(forest, 'forest'));

const stormClouds = new THREE.Group();
const stormMat = mat(0x4a4f5a, { transparent: true, opacity: 0 });
for (let i = 0; i < 7; i++) {
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.7 + (i % 3) * 0.2, 16, 12), stormMat);
  puff.position.set(-2.4 + i * 0.8, 3.0 + (i % 2) * 0.3, -0.4 + (i % 3) * 0.4);
  puff.scale.y = 0.6;
  stormClouds.add(puff);
}
eventsView.add(stormClouds);

const P = 120;
const ash = particles(P, 0x55504c, 0.16, 0.85);
const smoke = particles(P, 0x777777, 0.18, 0.7);
const storm = particles(P, 0x2f6fc0, 0.09, 0.9);
eventsView.add(ash, smoke, storm);
const dots = Array.from({ length: P }, () => ({ t: Math.random(), a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.6 + Math.random() * 0.8 }));

addLabel('volcano', volcano, v(0, 2.6, 0), { hideWith: eventsView });
addLabel('river', eventsView, v(1.3, 0.2, 2.6), { hideWith: eventsView });
addLabel('forest', trees[2], v(0, 1.8, 0), { hideWith: eventsView });

// ---------- State and controls ----------

const levelCard = document.getElementById('level-card');
const state = { view: 'jar', sun: 6, lidOn: true, water: 1, cycleTime: 0 };
let ev = null; // { key, t }
let burnt = false;
const tried = new Set();

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  jarView.visible = key === 'jar';
  eventsView.visible = key === 'events';
  ['jar', 'events'].forEach((k) => {
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

bindSlider('sun', (value) => (value === 0 ? 'Off' : `${value} of 10`), (value) => {
  state.sun = value;
  lampLight.intensity = value * 1.0;
  lamp.material.color.setHex(value ? 0xffd75e : 0x6b6450);
  if (value === 0) {
    levelCard.textContent = 'In the dark, the water stops evaporating, and the plant can’t make food or oxygen.';
    if (complete('dark')) cello.say('No light, no oxygen from the plant. Life in the jar needs the lamp, like Earth needs the Sun!', { mood: 'wow', ms: 5500 });
  }
});

document.getElementById('lid').addEventListener('click', (e) => {
  state.lidOn = !state.lidOn;
  e.currentTarget.setAttribute('aria-pressed', String(state.lidOn));
  e.currentTarget.textContent = state.lidOn ? '🫙 Lid on' : '🫙 Lid off';
  lid.position.copy(state.lidOn ? LID_ON.pos : LID_OFF.pos);
  lid.rotation.z = state.lidOn ? LID_ON.rot : LID_OFF.rot;
  levelCard.textContent = state.lidOn
    ? 'Lid on. Now no water can get out, so it goes round and round.'
    : 'Lid off! Watch the vapor. Does it come back down?';
});

document.getElementById('refill').addEventListener('click', () => {
  state.water = 1;
  levelCard.textContent = 'Watered! The pond and soil are wet again.';
});

// Each event starts from a fresh world, except planting, which heals it.
function resetWorld() {
  burnt = false;
  trees.forEach((t) => { t.userData.crown.material.color.setHex(0x3f9b4a); t.rotation.z = 0; t.visible = true; });
  saplings.forEach((t) => t.scale.setScalar(0.001));
  riverMat.color.copy(RIVER_CLEAN);
  river.scale.x = 1;
  groundTop.color.setHex(0x7cbf5a);
  lavaMat.emissiveIntensity = 0;
  lavaMat.color.setHex(0x3a302a);
  streams.forEach((s) => { s.scale.y = 0.001; });
  stormMat.opacity = 0;
  stormClouds.visible = false;
  [ash, smoke, storm].forEach((pts) => { for (let i = 0; i < P; i++) setDot(pts, i, 0, HIDE, 0); pts.geometry.attributes.position.needsUpdate = true; });
}

const effectsEl = document.getElementById('event-effects');
let effectTimers = [];
document.querySelectorAll('[data-event]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.event;
  const wasBurnt = burnt;
  if (key !== 'plant') resetWorld();
  else {
    burnt = false;
    saplings.forEach((t) => t.scale.setScalar(0.001));
    stormClouds.visible = false;
    lavaMat.emissiveIntensity = 0;
    lavaMat.color.setHex(0x3a302a);
    trees.forEach((t) => { t.rotation.z = 0; });
    for (let i = 0; i < P; i++) setDot(storm, i, 0, HIDE, 0);
    storm.geometry.attributes.position.needsUpdate = true;
  }
  ev = { key, t: 0 };
  if (key === 'storm') stormClouds.visible = true;
  document.getElementById('event-title').textContent = EVENTS[key].title;
  effectTimers.forEach(clearTimeout);
  effectsEl.textContent = '';
  // The spheres light up one by one.
  effectTimers = EVENTS[key].effects.map(([emoji, name, text], i) => setTimeout(() => {
    const li = document.createElement('li');
    li.innerHTML = `${emoji} <b>${name}:</b> ${text}`;
    effectsEl.append(li);
  }, 700 + i * 1100));
  levelCard.textContent = `${EVENTS[key].title} Watch all four spheres change.`;
  tried.add(key);
  if (tried.size === 4 && complete('events')) {
    setTimeout(() => cello.say('Four events, and every one changed all four spheres. That’s how connected Earth is!', { mood: 'wow', ms: 6000 }), 4500);
  } else {
    cello.say(EVENTS[key].title, { ms: 2500, important: false });
  }
  if (key === 'plant' && wasBurnt && complete('trees')) {
    setTimeout(() => cello.say('The land is healing! New roots hold the soil, and the air gets more oxygen.', { mood: 'wow', ms: 6000 }), 4500);
  }
}));

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
const lerp = THREE.MathUtils.lerp;
stage.onFrame((dt) => {
  time += dt;
  if (jarView.visible) updateJar(dt);
  if (eventsView.visible && ev) updateEvent(dt);
});

function updateJar(dt) {
  const rate = state.sun / 10;
  const wet = state.water > 0.05;
  const vp = vapor.geometry.attributes.position;
  const rp = rain.geometry.attributes.position;
  drops.forEach((d, i) => {
    // 0–0.55 rising as vapor, 0.55–0.75 a drop on the lid, 0.75–1 falling.
    if (rate > 0 && (wet || d.t > 0.01)) d.t += dt * rate * 0.12;
    if (d.t >= 1) {
      d.t -= 1;
      d.escaped = false;
      newSpot(d);
      if (!wet) d.t = 0;
    }
    vp.setXYZ(i, d.x, HIDE, d.z);
    rp.setXYZ(i, d.x, HIDE, d.z);
    if (d.t <= 0.01 && !wet) return;
    if (d.t < 0.55) {
      const y = lerp(SOIL_TOP + 0.05, JAR_H - 0.05, d.t / 0.55);
      vp.setXYZ(i, d.x + Math.sin(time * 2 + i) * 0.04, y, d.z);
    } else if (!state.lidOn || d.escaped) {
      // No lid: the vapor floats away and is lost.
      if (!d.escaped) {
        d.escaped = true;
        state.water = Math.max(0, state.water - 0.012);
      }
      vp.setXYZ(i, d.x * (1 + (d.t - 0.55) * 2), lerp(JAR_H, JAR_H + 2.5, (d.t - 0.55) / 0.45), d.z * (1 + (d.t - 0.55) * 2));
    } else if (d.t > 0.75) {
      rp.setXYZ(i, d.x, lerp(JAR_H - 0.05, SOIL_TOP + 0.05, (d.t - 0.75) / 0.25), d.z);
    }
  });
  vp.needsUpdate = true;
  rp.needsUpdate = true;
  lidDrops.visible = state.lidOn && rate > 0 && wet;

  // A full trip round the jar takes about 8 seconds at full light.
  if (state.lidOn && rate > 0 && wet) {
    state.cycleTime += dt * rate;
    if (state.cycleTime > 6 && complete('cycle')) {
      cello.say('The water went round: up as vapor, onto the lid, and back down as rain. It never leaves the jar!', { mood: 'wow', ms: 6000 });
    }
  }
  if (!state.lidOn && state.water < 0.5 && complete('lid')) {
    cello.say('The vapor floated away, so the jar is drying out. A lid keeps the water in, like Earth’s gravity keeps its water.', { mood: 'oops', ms: 6500 });
  }

  // Pond shrinks, soil dries, plant droops.
  pond.scale.set(0.2 + 0.8 * state.water, 1, 0.2 + 0.8 * state.water);
  pond.visible = state.water > 0.02;
  soilMat.color.setHex(0x5c3d27).lerp(new THREE.Color(0xa88a68), 1 - Math.min(1, state.water * 2));
  const health = Math.min(1, state.water * 3);
  leafMat.color.setHex(0x8a6d3b).lerp(new THREE.Color(0x3f9b4a), health);
  leaves.forEach((l) => { l.rotation.z = lerp(-0.6, 0.35, health); });
  document.getElementById('jar-water').textContent = `💧 Water: ${'🟦'.repeat(Math.round(state.water * 5))}${'⬜'.repeat(5 - Math.round(state.water * 5))}`;

  // The snail creeps round; gases swap between it and the plant.
  const sa = time * 0.15;
  snail.position.set(Math.cos(sa) * 0.95, SOIL_TOP, Math.sin(sa) * 0.95 * 0.8 + 0.1);
  snail.rotation.y = -sa;
  const plantTop = plant.position.clone().add(v(0, 0.8, 0));
  const snailAt = snail.position.clone().add(v(0, 0.2, 0));
  for (let i = 0; i < 6; i++) {
    const k = (time * 0.25 + i / 6) % 1;
    const arc = Math.sin(k * Math.PI) * 0.5;
    if (state.sun > 0 && health > 0.3) {
      const p = plantTop.clone().lerp(snailAt, k);
      setDot(o2, i, p.x, p.y + arc, p.z);
    } else setDot(o2, i, 0, HIDE, 0);
    const q = snailAt.clone().lerp(plantTop, k);
    setDot(co2, i, q.x, q.y + arc, q.z);
  }
  o2.geometry.attributes.position.needsUpdate = true;
  co2.geometry.attributes.position.needsUpdate = true;
}

function updateEvent(dt) {
  ev.t += dt;
  const t = ev.t;
  const ramp = Math.min(1, t / 2);
  if (ev.key === 'volcano') {
    lavaMat.color.setHex(0xff5a1f);
    lavaMat.emissiveIntensity = 1.5 + Math.sin(time * 8) * 0.3;
    streams.forEach((s, i) => { s.scale.y = Math.max(0.001, Math.min(1.3, (t - i * 0.4) * 0.5)); });
    riverMat.color.copy(RIVER_CLEAN).lerp(RIVER_MUDDY, Math.min(1, t / 6));
    const top = VOLCANO.clone().add(v(0, 2.2, 0));
    dots.forEach((d, i) => {
      d.t += dt * 0.25 * d.s;
      if (d.t > 1) d.t -= 1;
      const k = d.t;
      const spread = k * 2.2 * d.r;
      setDot(ash, i, top.x + Math.cos(d.a) * spread + k * 1.5, top.y + k * 3.2, top.z + Math.sin(d.a) * spread);
    });
    ash.geometry.attributes.position.needsUpdate = true;
  } else if (ev.key === 'storm') {
    stormMat.opacity = Math.min(0.92, ramp);
    trees.forEach((tr, i) => { tr.rotation.z = Math.sin(time * 3 + i) * 0.18 * ramp; });
    river.scale.x = 1 + Math.min(3, t * 0.5);
    riverMat.color.copy(RIVER_CLEAN).lerp(RIVER_MUDDY, Math.min(0.7, t / 8));
    dots.forEach((d, i) => {
      d.t += dt * 1.6 * d.s;
      if (d.t > 1) d.t -= 1;
      const x = -3 + d.r * 6;
      const z = -1.2 + ((d.a / (Math.PI * 2)) * 2.6);
      setDot(storm, i, x + d.t * 0.4, 2.8 - d.t * 2.8, z);
    });
    storm.geometry.attributes.position.needsUpdate = true;
  } else if (ev.key === 'fire') {
    trees.forEach((tr, i) => {
      const c = tr.userData.crown.material.color;
      const burn = Math.min(1, Math.max(0, t - i * 0.3) / 3);
      if (burn < 0.7) c.setHex(0x3f9b4a).lerp(new THREE.Color(Math.sin(time * 20 + i) > 0 ? 0xff7a1f : 0xffc23d), burn / 0.7);
      else c.setHex(0xff7a1f).lerp(new THREE.Color(0x2a2522), (burn - 0.7) / 0.3);
    });
    groundTop.color.setHex(0x7cbf5a).lerp(new THREE.Color(0x6b5a45), Math.min(1, t / 5));
    riverMat.color.copy(RIVER_CLEAN).lerp(RIVER_MUDDY, Math.min(0.6, t / 8));
    burnt = t > 3;
    dots.forEach((d, i) => {
      d.t += dt * 0.3 * d.s;
      if (d.t > 1) d.t -= 1;
      const tr = trees[i % trees.length].position;
      const fade = t < 8 ? 1 : Math.max(0, 1 - (t - 8) / 4);
      setDot(smoke, i, tr.x + d.t * 1.2 + Math.cos(d.a) * 0.2, fade > 0 ? 1 + d.t * 3 : HIDE, tr.z + Math.sin(d.a) * 0.2);
    });
    smoke.geometry.attributes.position.needsUpdate = true;
  } else if (ev.key === 'plant') {
    // Burnt trees are replanted too; new saplings grow on the open land.
    trees.forEach((tr) => tr.userData.crown.material.color.lerp(new THREE.Color(0x3f9b4a), Math.min(1, dt * 1.2)));
    saplings.forEach((s, i) => s.scale.setScalar(Math.max(0.001, Math.min(0.8, (t - i * 0.4) * 0.3))));
    groundTop.color.lerp(new THREE.Color(0x7cbf5a), Math.min(1, dt));
    riverMat.color.lerp(RIVER_CLEAN, Math.min(1, dt));
    river.scale.x = Math.max(1, river.scale.x - dt);
    for (let i = 0; i < P; i++) { setDot(smoke, i, 0, HIDE, 0); setDot(ash, i, 0, HIDE, 0); }
    smoke.geometry.attributes.position.needsUpdate = true;
    ash.geometry.attributes.position.needsUpdate = true;
  }
}

resetWorld();
setView('jar');
