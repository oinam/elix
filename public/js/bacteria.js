import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// ---------- Kid-friendly descriptions of each part ----------

const PARTS = {
  wall: {
    name: 'Cell wall',
    text: 'A tough outer coat, like a shell. It keeps the bacterium in its shape: round, rod, or spiral.',
  },
  membrane: {
    name: 'Cell membrane',
    text: 'A soft skin just inside the wall. It decides what goes into the cell and what comes out.',
  },
  cytoplasm: {
    name: 'Cytoplasm',
    text: 'The jelly that fills the cell. Everything else floats in it.',
  },
  dna: {
    name: 'DNA (no nucleus!)',
    text: 'The cell’s instructions. Bacteria have NO nucleus, so their DNA just floats in the cytoplasm as a tangled loop.',
  },
  ribosomes: {
    name: 'Ribosomes',
    text: 'Tiny builders. They read the DNA’s instructions and build the things the cell needs to live and grow.',
  },
  flagellum: {
    name: 'Flagellum',
    text: 'A long, whip-like tail. It spins like a propeller to push the bacterium along. Not every bacterium has one.',
  },
  pili: {
    name: 'Pili',
    text: 'Short, stiff hairs. They help the bacterium stick to things, like food or your teeth!',
  },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 2.2, 7.5);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'bacteria',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['wall', 'membrane', 'cytoplasm'],
  outer: ['flagellum', 'pili'],
  greeting: 'Bacteria are the tiniest living things. Slide to Body warm and watch them multiply!',
  allPartsLine: 'You found all 7 parts! Remember: no nucleus in bacteria.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const wallMaterial = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true, opacity: 0.3, depthWrite: false });
const membraneMaterial = new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
const hiddenMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const dnaMaterial = new THREE.MeshStandardMaterial({ color: 0xff5c8f, emissive: 0x6a1030, roughness: 0.4 });
const ribosomeMaterial = new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.5 });
const hairMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6 });

// ---------- The three shapes ----------
// Each shape is described by its wall surface and how deep its jelly goes, so
// DNA, ribosomes, and hairs can be scattered on or inside any of them.

function helixCurve(halfLength, radius, turns) {
  const points = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const a = t * turns * Math.PI * 2;
    points.push(new THREE.Vector3((t * 2 - 1) * halfLength, Math.sin(a) * radius, Math.cos(a) * radius));
  }
  return new THREE.CatmullRomCurve3(points);
}

const SPIRAL_PATH = helixCurve(2.2, 0.55, 2.2);

const SHAPES = {
  round: {
    wall: () => new THREE.SphereGeometry(1.15, 48, 32),
    depth: 0.95,
    tail: null,
  },
  rod: {
    wall: () => new THREE.CapsuleGeometry(0.72, 2.3, 12, 32).rotateZ(Math.PI / 2),
    depth: 0.6,
    tail: new THREE.Vector3(-1.87, 0, 0),
  },
  spiral: {
    wall: () => new THREE.TubeGeometry(SPIRAL_PATH, 240, 0.34, 16, false),
    depth: 0.27,
    tail: new THREE.Vector3(-2.2, 0, 0.55),
  },
};

const heroes = {};
const flagella = [];
const sample = new THREE.Vector3();
const normal = new THREE.Vector3();

function buildHero(shape) {
  const spec = SHAPES[shape];
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const wall = new THREE.Mesh(spec.wall(), wallMaterial);
  wall.renderOrder = 3;
  group.add(tagPart(wall, 'wall'));

  const membrane = new THREE.Mesh(spec.wall(), membraneMaterial);
  membrane.renderOrder = 2;
  group.add(tagPart(membrane, 'membrane'));
  // Shrink the membrane toward the middle of the wall it sits inside.
  shrinkAlongNormals(membrane.geometry, 0.07);

  const core = new THREE.Mesh(spec.wall(), hiddenMaterial);
  shrinkAlongNormals(core.geometry, spec.depth * 0.45);
  group.add(tagPart(core, 'cytoplasm'));

  const sampler = new MeshSurfaceSampler(membrane).build();
  const inside = (depthMin, depthMax) => {
    sampler.sample(sample, normal);
    return sample.clone().addScaledVector(normal, -THREE.MathUtils.randFloat(depthMin, depthMax) * spec.depth);
  };

  // DNA: one long tangled loop floating in the jelly.
  const loop = shape === 'spiral' ? spiralLoop() : tangle(Array.from({ length: 28 }, () => inside(0.3, 0.85)));
  const dna = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 400, 0.045, 6, true), dnaMaterial);
  group.add(tagPart(dna, 'dna'));

  // Ribosomes: lots of tiny dots.
  const ribosomes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), ribosomeMaterial, 140);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 140; i++) ribosomes.setMatrixAt(i, m.makeTranslation(inside(0.15, 0.9)));
  group.add(tagPart(ribosomes, 'ribosomes'));

  // Pili: short hairs standing out from the wall.
  const wallSampler = new MeshSurfaceSampler(wall).build();
  const hairGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.22, 4).translate(0, 0.11, 0);
  const pili = new THREE.InstancedMesh(hairGeo, hairMaterial, 46);
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  for (let i = 0; i < 46; i++) {
    wallSampler.sample(sample, normal);
    q.setFromUnitVectors(up, normal);
    pili.setMatrixAt(i, m.compose(sample, q, new THREE.Vector3(1, 1, 1)));
  }
  group.add(tagPart(pili, 'pili'));

  // Flagellum: a corkscrew tail that spins.
  let flagellum = null;
  if (spec.tail) {
    const points = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 8;
      const r = 0.16 * Math.min(1, t * 4);
      points.push(new THREE.Vector3(-t * 3.4, Math.sin(a) * r, Math.cos(a) * r));
    }
    flagellum = new THREE.Group();
    flagellum.position.copy(spec.tail);
    flagellum.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 160, 0.03, 6), hairMaterial));
    group.add(tagPart(flagellum, 'flagellum'));
    flagella.push(flagellum);
  }

  // Labels, shown only while this shape is on screen.
  const hide = { hideWith: group };
  addLabel('wall', group, new THREE.Vector3(0.4, 1.45, 0), hide);
  addLabel('membrane', group, new THREE.Vector3(-0.6, -1.25, 0.4), hide);
  addLabel('dna', group, loop[0].clone().setY(loop[0].y + 0.35), hide);
  addLabel('ribosomes', group, inside(0.4, 0.6).setY(-0.35), hide);
  addLabel('cytoplasm', group, new THREE.Vector3(0.9, 0.15, 0.3), hide);
  addLabel('pili', group, new THREE.Vector3(1.5, 0.95, 0), hide);
  if (flagellum) addLabel('flagellum', group, spec.tail.clone().add(new THREE.Vector3(-2.2, 0.45, 0)), hide);

  heroes[shape] = group;
}

// Order points so each one goes to its nearest unused neighbor: a tangle
// of short wiggles instead of long straight lines.
function tangle(points) {
  const ordered = [points.shift()];
  while (points.length) {
    const last = ordered[ordered.length - 1];
    let best = 0;
    points.forEach((p, i) => { if (p.distanceTo(last) < points[best].distanceTo(last)) best = i; });
    ordered.push(points.splice(best, 1)[0]);
  }
  return ordered;
}

// In the spiral, the loop runs along the coil and back, staying inside.
function spiralLoop() {
  const points = [];
  const jitter = () => new THREE.Vector3().randomDirection().multiplyScalar(0.11);
  for (let i = 1; i < 16; i++) points.push(SPIRAL_PATH.getPoint(i / 16).add(jitter()));
  for (let i = 15; i > 0; i--) points.push(SPIRAL_PATH.getPoint(i / 16 - 0.02).add(jitter()));
  return points;
}

// Move every vertex inward along its normal (for an inner layer).
function shrinkAlongNormals(geometry, amount) {
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const nor = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) - nor.getX(i) * amount, pos.getY(i) - nor.getY(i) * amount, pos.getZ(i) - nor.getZ(i) * amount);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

Object.keys(SHAPES).forEach(buildHero);

// ---------- The colony: bacteria that double ----------

const MAX_COLONY = 256;
const colonyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.5, transparent: true });
const colonyGeos = {
  round: new THREE.SphereGeometry(0.16, 12, 8),
  rod: new THREE.CapsuleGeometry(0.09, 0.26, 4, 8).rotateZ(Math.PI / 2),
  spiral: new THREE.TubeGeometry(helixCurve(0.3, 0.07, 2), 40, 0.045, 6, false),
};
const colonies = {};
for (const [shape, geo] of Object.entries(colonyGeos)) {
  colonies[shape] = new THREE.InstancedMesh(geo, colonyMaterial, MAX_COLONY);
  colonies[shape].instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  colonies[shape].frustumCulled = false;
  colonies[shape].count = 0;
  scene.add(colonies[shape]);
}

const colony = []; // { position, velocity, rotation, grow }
let growClock = 0;
let deadFade = 0; // > 0 while boiled bacteria fade away

function spawnBacterium(near) {
  const position = near
    ? near.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.3))
    : new THREE.Vector3(3.2, 0.6, 0.5);
  colony.push({
    position,
    velocity: new THREE.Vector3().randomDirection().multiplyScalar(0.15),
    rotation: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
    spin: new THREE.Vector3().randomDirection().multiplyScalar(0.6),
    grow: 0,
  });
}

function restartColony() {
  colony.length = 0;
  dishFullSaid = false;
  deadFade = 0;
  growClock = 0;
  colonyMaterial.opacity = 1;
  spawnBacterium();
}

// Growth speed by temperature: none in the fridge, fastest near body heat,
// and they die when boiled.
function doublingSeconds(temp) {
  if (temp <= 8 || temp >= 55) return Infinity;
  const fromBest = Math.abs(temp - 37);
  return 2.6 + fromBest * 0.22;
}

function updateColony(dt) {
  const temp = settings.temp;
  if (temp >= 90 && colony.length && deadFade === 0) {
    deadFade = 2;
    onBoiled();
  }
  if (deadFade > 0) {
    deadFade -= dt;
    colonyMaterial.opacity = Math.max(deadFade / 2, 0);
    if (deadFade <= 0) {
      colony.length = 0;
      deadFade = -1; // stays dead until "Start with one"
    }
  } else if (deadFade === 0) {
    growClock += dt;
    if (growClock >= doublingSeconds(temp) && colony.length) {
      growClock = 0;
      // Every bacterium splits in two at once: 1, 2, 4, 8, 16…
      const parents = colony.slice(0, MAX_COLONY - colony.length);
      parents.forEach((b) => spawnBacterium(b.position));
      onDoubled();
    }
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const mesh = colonies[settings.shape];
  const moving = deadFade === 0 && temp > 8 ? 1 : 0.15;
  colony.forEach((b, i) => {
    b.grow = Math.min(1, b.grow + dt * 1.5);
    b.position.addScaledVector(b.velocity, dt * moving);
    // Keep them in the dish, away from the big bacterium in the middle.
    const d = b.position.length();
    if (d > 6.5 || d < 2.4) b.velocity.reflect(b.position.clone().normalize()).multiplyScalar(1);
    if (d < 2.4) b.position.setLength(2.4);
    if (d > 6.5) b.position.setLength(6.5);
    b.rotation.x += b.spin.x * dt * moving;
    b.rotation.y += b.spin.y * dt * moving;
    mesh.setMatrixAt(i, m.compose(b.position, q.setFromEuler(b.rotation), s.setScalar(b.grow)));
  });
  for (const [shape, c] of Object.entries(colonies)) c.count = shape === settings.shape ? colony.length : 0;
  mesh.instanceMatrix.needsUpdate = true;
  counterEl.textContent = `🦠 × ${colony.length}`;
}

// ---------- Stars and Cello ----------

const counterEl = document.getElementById('counter');
const triedShapes = new Set();
let dishFullSaid = false;

function onDoubled() {
  const n = colony.length;
  if (n >= 64 && complete('grow')) {
    cello.say(`${n} bacteria from just one! Every one split in two, again and again.`, { mood: 'wow', ms: 5000 });
  } else if (n >= MAX_COLONY) {
    if (!dishFullSaid) cello.say('The dish is full!', { important: false });
    dishFullSaid = true;
  } else {
    cello.say(`${n / 2} became ${n}!`, { ms: 1500, important: false });
  }
}

function onBoiled() {
  complete('boil');
  cello.say('Boiling killed the bacteria. That’s why we boil milk and water! Tap Start with one to grow more.', { mood: 'sad', ms: 7000 });
}

// ---------- Controls ----------

const settings = { shape: 'rod', temp: 25 };

const TEMP_NAMES = [[8, '🧊 Fridge'], [30, '🏠 Room'], [45, '🤒 Body warm'], [89, '♨️ Hot'], [101, '🔥 Boiling']];
const tempName = (t) => TEMP_NAMES.find(([max]) => t <= max)[1];

bindSlider('temp', (v) => `${tempName(v)} · ${v} °C`, (v) => {
  const wasCold = settings.temp <= 8;
  settings.temp = v;
  if (v <= 8 && !wasCold && colony.length >= 2 && deadFade === 0) {
    complete('fridge');
    cello.say('Brrr! In the fridge they stop growing. They are not dead, just very slow. That’s why we keep food cold.', { mood: 'wow', ms: 7000 });
  } else if (v >= 30 && v <= 45 && wasCold) {
    cello.say('Warm again, so they start multiplying!', { important: false });
  }
});

function setShape(shape) {
  settings.shape = shape;
  for (const [name, group] of Object.entries(heroes)) group.visible = name === shape;
  document.querySelectorAll('[data-shape]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.shape === shape)));
  explorer.showLabels();
  triedShapes.add(shape);
  if (triedShapes.size === 3 && complete('shapes')) {
    cello.say('Round, rod, and spiral: the three main shapes of bacteria!', { mood: 'wow', ms: 5000 });
  }
}

const SHAPE_LINES = {
  round: 'Round bacteria are called cocci. They often stick together in clumps or chains.',
  rod: 'Rod bacteria are called bacilli. The ones that turn milk into curd are rods!',
  spiral: 'Spiral bacteria are called spirilla. They twist through water like a corkscrew.',
};

document.querySelectorAll('[data-shape]').forEach((button) => {
  button.addEventListener('click', () => {
    setShape(button.dataset.shape);
    cello.say(SHAPE_LINES[button.dataset.shape], { ms: 5000 });
  });
});

document.getElementById('restart').addEventListener('click', () => {
  restartColony();
  cello.say('Back to just one bacterium. Make it warm to watch it multiply!', { ms: 3500 });
});
document.getElementById('xray').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  wallMaterial.opacity = on ? 0.1 : 0.3;
  membraneMaterial.opacity = on ? 0.12 : 0.35;
});
document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { wall: 0x7fe0c4, membrane: 0xb4f0de, hair: 0xd8fff2, colony: 0x8de8a8 },
  light: { wall: 0x2fa889, membrane: 0x55c7a6, hair: 0x1f6f5c, colony: 0x2f9a6a },
};

window.elixTheme.watch((theme) => {
  const colors = THEME_COLORS[theme];
  wallMaterial.color.set(colors.wall);
  membraneMaterial.color.set(colors.membrane);
  hairMaterial.color.set(colors.hair);
  colonyMaterial.color.set(colors.colony);
});

// ---------- Main loop ----------

setShape('rod');
triedShapes.clear();
triedShapes.add('rod');
restartColony();

stage.onFrame((dt) => {
  Object.values(heroes).forEach((g) => { g.rotation.y += dt * 0.12; });
  flagella.forEach((f) => { f.rotation.x += dt * 9; });
  updateColony(dt);
});
