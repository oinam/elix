import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// ---------- Kid-friendly descriptions of each part ----------

const PARTS = {
  wall: {
    name: 'Cell wall',
    text: 'A firm coat around the cell, like a shell. Fungi like yeast have one. Animal cells do not.',
  },
  membrane: {
    name: 'Cell membrane',
    text: 'A soft skin just inside the wall. It lets sugar in and lets the gas out.',
  },
  cytoplasm: {
    name: 'Cytoplasm',
    text: 'The jelly inside the cell. This is where sugar gets turned into gas.',
  },
  nucleus: {
    name: 'Nucleus',
    text: 'The control center with the cell’s instructions. Before a bud breaks off, the nucleus makes a copy for it.',
  },
  vacuole: {
    name: 'Vacuole',
    text: 'A big storage bubble. It keeps water and food stored for later.',
  },
  bud: {
    name: 'Bud',
    text: 'A baby yeast cell growing out of its parent! When it is big enough, it breaks off and lives on its own. This is called budding.',
  },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.5, 7.5);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'yeast',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['wall', 'membrane', 'cytoplasm'],
  greeting: 'This yeast is hungry and asleep. Tap Add sugar to wake it up!',
  allPartsLine: 'You found all 6 parts, even the bud!',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const wallMaterial = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true, opacity: 0.35, depthWrite: false });
const membraneMaterial = new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true, opacity: 0.3, depthWrite: false });
const hiddenMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const nucleusMaterial = new THREE.MeshStandardMaterial({ color: 0x9a7cf5, roughness: 0.45 });
const vacuoleMaterial = new THREE.MeshStandardMaterial({ color: 0x9ccfff, roughness: 0.1, transparent: true, opacity: 0.7 });
const speckMaterial = new THREE.PointsMaterial({ size: 0.04 });
const colonyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5 });
const bubbleMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.55 });
const sugarMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fb8c8, roughness: 0.15, metalness: 0.1 });
const deadColor = new THREE.Color(0x8a8f94);

// ---------- The big yeast cell ----------

const CELL = new THREE.Vector3(1.3, 1, 1); // oval
const hero = new THREE.Group();
scene.add(hero);

const wall = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), wallMaterial);
wall.scale.copy(CELL);
wall.renderOrder = 3;
hero.add(tagPart(wall, 'wall'));

const membrane = new THREE.Mesh(new THREE.SphereGeometry(0.92, 48, 32), membraneMaterial);
membrane.scale.copy(CELL);
membrane.renderOrder = 2;
hero.add(tagPart(membrane, 'membrane'));

const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), hiddenMaterial);
core.scale.copy(CELL);
hero.add(tagPart(core, 'cytoplasm'));

const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), nucleusMaterial);
nucleus.position.set(0.35, 0.25, 0.1);
hero.add(tagPart(nucleus, 'nucleus'));

const vacuole = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), vacuoleMaterial);
vacuole.position.set(-0.4, -0.1, 0);
hero.add(tagPart(vacuole, 'vacuole'));

{
  const n = 140;
  const specks = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.85).multiply(CELL);
    specks.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(specks, 3));
  hero.add(new THREE.Points(geo, speckMaterial));
}

// The bud grows out of one end, gets its own nucleus, then breaks off.
const bud = new THREE.Group();
const budWall = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), wallMaterial);
budWall.renderOrder = 3;
bud.add(budWall);
const budNucleus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), nucleusMaterial);
bud.add(budNucleus);
hero.add(tagPart(bud, 'bud'));
let budGrowth = 0;

function placeBud() {
  const g = Math.max(budGrowth, 0.001);
  bud.scale.setScalar(g);
  bud.position.set(CELL.x * 0.95 + 0.5 * g, 0.15, 0);
  budNucleus.visible = g > 0.6;
  bud.visible = g > 0.05;
}
placeBud();

const hide = {};
addLabel('wall', hero, new THREE.Vector3(-0.7, 1.25, 0), hide);
addLabel('membrane', hero, new THREE.Vector3(-1.1, -0.95, 0.3), hide);
addLabel('cytoplasm', hero, new THREE.Vector3(0.2, -0.45, 0.6), hide);
addLabel('nucleus', nucleus, new THREE.Vector3(0, 0.45, 0), hide);
addLabel('vacuole', vacuole, new THREE.Vector3(0, 0.6, 0), hide);
addLabel('bud', bud, new THREE.Vector3(0, 0.9, 0), { hideWith: bud });

// ---------- A crowd of small yeast cells that bud too ----------

const MAX_YEAST = 60;
const colonyMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 14, 10).scale(1.3, 1, 1), colonyMaterial, MAX_YEAST);
colonyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
colonyMesh.frustumCulled = false;
scene.add(colonyMesh);
const colony = [];

function addYeast(position, size = 1) {
  if (colony.length >= MAX_YEAST) return;
  colony.push({
    position: position.clone(),
    velocity: new THREE.Vector3().randomDirection().multiplyScalar(0.12),
    rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
    size,
    bud: Math.random() * 0.6,
  });
}

// Keep the crowd in a flat band around the big cell, not in front of the camera.
function randomSpot() {
  const angle = Math.random() * Math.PI * 2;
  const r = THREE.MathUtils.randFloat(2.6, 5.2);
  return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r * 0.6, THREE.MathUtils.randFloat(-2.5, 0.5));
}

function keepInBand(p, velocity) {
  const flat = Math.hypot(p.x, p.y / 0.6);
  if (flat < 2.4 || flat > 5.4) velocity.x *= -1, velocity.y *= -1;
  if (p.z < -2.5 || p.z > 0.6) velocity.z *= -1;
  p.z = THREE.MathUtils.clamp(p.z, -2.5, 0.6);
}

// ---------- Gas bubbles and sugar ----------

const MAX_BUBBLES = 260;
const bubbleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), bubbleMaterial, MAX_BUBBLES);
bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
bubbleMesh.frustumCulled = false;
scene.add(bubbleMesh);
const bubbles = [];

function addBubble(from) {
  if (bubbles.length >= MAX_BUBBLES) return;
  bubbles.push({ position: from.clone(), speed: THREE.MathUtils.randFloat(0.6, 1.2), wobble: Math.random() * 6, size: THREE.MathUtils.randFloat(0.6, 1.4) });
}

const MAX_SUGAR = 40;
const sugarMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), sugarMaterial, MAX_SUGAR);
sugarMesh.frustumCulled = false;
scene.add(sugarMesh);
const sugarBits = Array.from({ length: MAX_SUGAR }, () => ({
  position: randomSpot(),
  rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
}));

// ---------- How busy the yeast is ----------

const state = { sugar: 0, rise: 1, dead: false, temp: 30 };

// Asleep when cold, busiest when warm, and killed by heat.
function warmth(temp) {
  if (temp < 10 || temp >= 50) return 0;
  return Math.max(0, 1 - Math.abs(temp - 35) / 25);
}

const activity = () => (state.dead || state.sugar <= 0 ? 0 : warmth(state.temp));

// ---------- Panel meters ----------

const sugarBar = document.getElementById('sugar-bar');
const doughEl = document.getElementById('dough');
const doughOut = document.getElementById('dough-out');

function updateMeters() {
  sugarBar.style.width = `${state.sugar}%`;
  doughEl.style.setProperty('--rise', state.rise.toFixed(3));
  doughOut.textContent = `${state.rise.toFixed(1)}×`;
}

// ---------- Main loop ----------

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const budWorld = new THREE.Vector3();

function update(dt) {
  const busy = activity();

  // Too hot: the yeast dies.
  if (!state.dead && state.temp >= 60) {
    state.dead = true;
    onDied();
  }
  [wallMaterial, colonyMaterial].forEach((mat) => {
    if (state.dead) mat.color.lerp(deadColor, Math.min(1, dt * 2));
  });

  // Sugar gets used up; the gas makes the dough rise.
  state.sugar = Math.max(0, state.sugar - busy * dt * (1.2 + colony.length * 0.03));
  if (busy > 0 && state.rise < 2.5) {
    state.rise = Math.min(2.5, state.rise + busy * dt * 0.05);
    if (state.rise >= 2) onDoughDoubled();
  }
  if (state.sugar <= 0 && hadSugar && !state.dead) onSugarGone();

  // The big cell grows a bud.
  hero.rotation.y = Math.sin(performance.now() / 4000) * 0.4;
  if (busy > 0) {
    budGrowth += busy * dt * 0.13;
    if (budGrowth >= 1) {
      bud.getWorldPosition(budWorld);
      addYeast(budWorld, 1);
      budGrowth = 0;
      onBudded();
    }
  }
  placeBud();
  if (busy > 0 && Math.random() < busy * dt * 4) addBubble(hero.position.clone().add(new THREE.Vector3().randomDirection().multiply(CELL)));

  // The small cells drift, bud, and give off gas.
  colony.forEach((y, i) => {
    y.position.addScaledVector(y.velocity, dt * (state.dead ? 0.1 : 1));
    keepInBand(y.position, y.velocity);
    y.rotation.y += dt * 0.3;
    if (busy > 0) {
      y.bud += busy * dt * 0.09;
      if (y.bud >= 1) {
        y.bud = 0;
        addYeast(y.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.35)), 0.3);
      }
      if (Math.random() < busy * dt * 0.5) addBubble(y.position);
    }
    y.size = Math.min(1, y.size + dt * 0.25);
    colonyMesh.setMatrixAt(i, m.compose(y.position, q.setFromEuler(y.rotation), s.setScalar(y.size)));
  });
  colonyMesh.count = colony.length;
  colonyMesh.instanceMatrix.needsUpdate = true;

  // Bubbles float up, wobble, and pop at the top.
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.position.y += b.speed * dt;
    b.wobble += dt * 3;
    b.position.x += Math.sin(b.wobble) * dt * 0.15;
    if (b.position.y > 4.5) bubbles.splice(i, 1);
  }
  bubbles.forEach((b, i) => bubbleMesh.setMatrixAt(i, m.compose(b.position, q.identity(), s.setScalar(b.size))));
  bubbleMesh.count = bubbles.length;
  bubbleMesh.instanceMatrix.needsUpdate = true;

  // Sugar grains show how much sugar is left.
  const grains = Math.ceil((state.sugar / 100) * MAX_SUGAR);
  sugarBits.forEach((g, i) => {
    g.rotation.x += dt * 0.4;
    sugarMesh.setMatrixAt(i, m.compose(g.position, q.setFromEuler(g.rotation), s.setScalar(1)));
  });
  sugarMesh.count = grains;
  sugarMesh.instanceMatrix.needsUpdate = true;

  updateMeters();
}

// ---------- Stars and Cello ----------

let hadSugar = false;
let doughSaid = false;

function onBudded() {
  if (complete('bud')) {
    cello.say('The bud broke off! Now it is a brand-new yeast cell. That is called budding.', { mood: 'wow', ms: 5500 });
  } else if (Math.random() < 0.4) {
    cello.say('Another baby yeast!', { ms: 1600, important: false });
  }
}

function onDoughDoubled() {
  if (doughSaid) return;
  doughSaid = true;
  complete('dough');
  cello.say('The dough doubled! All those gas bubbles make bread soft and full of holes.', { mood: 'wow', ms: 6000 });
}

function onSugarGone() {
  hadSugar = false;
  cello.say('All the sugar is gone, so the yeast stops. Add more sugar!', { mood: 'sad', ms: 4000 });
}

function onDied() {
  complete('hot');
  cello.say('Too hot! The heat killed the yeast, so no more bubbles. That is why bakers use warm water, not boiling.', { mood: 'sad', ms: 7000 });
}

// ---------- Controls ----------

document.getElementById('sugar').addEventListener('click', () => {
  if (state.dead) {
    cello.say('This yeast is dead. Tap Start again for fresh yeast.', { mood: 'sad' });
    return;
  }
  state.sugar = Math.min(100, state.sugar + 40);
  sugarBits.forEach((g) => g.position.copy(randomSpot()));
  hadSugar = true;
  const busy = warmth(state.temp);
  if (complete('sugar')) {
    cello.say(busy > 0
      ? 'Yum! The yeast eats sugar and gives off gas. See the bubbles?'
      : 'Sugar added! But the water is too cold. Warm it up to wake the yeast.', { ms: 5500 });
  } else if (busy === 0) {
    cello.say('It is too cold for the yeast. Warm it up!', { important: false });
  }
});

const TEMP_NAMES = [[9, '🧊 Cold'], [24, '🌤️ Cool'], [44, '♨️ Warm'], [59, '🥵 Very hot'], [100, '🔥 Too hot']];
const tempName = (t) => TEMP_NAMES.find(([max]) => t <= max)[1];

bindSlider('temp', (v) => `${tempName(v)} · ${v} °C`, (v) => { state.temp = v; });

function startAgain() {
  state.sugar = 0;
  state.rise = 1;
  state.dead = false;
  hadSugar = false;
  doughSaid = false;
  budGrowth = 0;
  colony.length = 0;
  bubbles.length = 0;
  for (let i = 0; i < 10; i++) addYeast(randomSpot());
  applyTheme(window.elixTheme.current());
}

document.getElementById('restart').addEventListener('click', () => {
  startAgain();
  cello.say('Fresh yeast, fresh dough. Add sugar and keep it warm!', { ms: 3500 });
});
document.getElementById('xray').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  wallMaterial.opacity = on ? 0.12 : 0.35;
  membraneMaterial.opacity = on ? 0.1 : 0.3;
});
document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { wall: 0xffd28a, membrane: 0xffe7bd, specks: 0xfff1d6, colony: 0xffcf7a },
  light: { wall: 0xe0a33c, membrane: 0xf0c070, specks: 0xa86f12, colony: 0xf0bf62 },
};

function applyTheme(theme) {
  const colors = THEME_COLORS[theme];
  if (!state.dead) {
    wallMaterial.color.set(colors.wall);
    colonyMaterial.color.set(colors.colony);
  }
  membraneMaterial.color.set(colors.membrane);
  speckMaterial.color.set(colors.specks);
}

window.elixTheme.watch(applyTheme);

startAgain();
stage.onFrame(update);
