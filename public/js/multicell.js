import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Levels of organization: cell → tissue → organ → organ system → organism,
// shown for a human (heart) and a plant (leaf).

const LEVELS = ['Cell', 'Tissue', 'Organ', 'Organ system', 'Organism'];

const CHAINS = {
  human: {
    things: ['muscleCell', 'muscleTissue', 'heart', 'circulatory', 'human'],
    lines: [
      'One heart muscle cell. It can squeeze and relax.',
      'Lots of muscle cells side by side make muscle tissue.',
      'Tissues working together make an organ: the heart!',
      'The heart and blood vessels make the circulatory system.',
      'All the organ systems together make a whole human: you!',
    ],
  },
  plant: {
    things: ['leafCell', 'leafTissue', 'leaf', 'shoot', 'plant'],
    lines: [
      'One leaf cell, with green chloroplasts that catch sunlight.',
      'Lots of leaf cells packed together make leaf tissue.',
      'Tissues working together make an organ: a leaf!',
      'Stem, leaves, and flower make the shoot system.',
      'The shoot and the roots together make a whole plant.',
    ],
  },
};

const PARTS = {
  muscleCell: { name: 'Muscle cell', text: 'One heart muscle cell. It squeezes (contracts) and relaxes, over and over, for your whole life. The stripes help it squeeze.' },
  muscleTissue: { name: 'Muscle tissue', text: 'Many cells of the same kind working together make a tissue. When all these muscle cells squeeze at once, the whole tissue squeezes.' },
  heart: { name: 'Heart (an organ)', text: 'Different tissues working together make an organ. The heart is mostly muscle tissue. It pumps blood all day and all night.' },
  circulatory: { name: 'Circulatory system', text: 'Organs that work together make an organ system. The heart pumps blood through tubes called blood vessels, to every part of the body and back.' },
  human: { name: 'Human body (an organism)', text: 'All the organ systems working together make one whole living thing: you! Your body is made of trillions of cells.' },
  leafCell: { name: 'Leaf cell', text: 'A plant cell from a leaf. Its green dots, called chloroplasts, use sunlight to make food. A stiff cell wall gives it a boxy shape.' },
  leafTissue: { name: 'Leaf tissue', text: 'Many leaf cells packed side by side make a tissue. Together they catch lots of sunlight.' },
  leaf: { name: 'Leaf (an organ)', text: 'A leaf is an organ. Its tissues make food from sunlight, air, and water. The veins carry water in and food out.' },
  shoot: { name: 'Shoot system', text: 'The stem, leaves, and flowers work together as the shoot system. The stem holds the leaves up to the light and carries water and food.' },
  plant: { name: 'Plant (an organism)', text: 'The shoot system and the root system together make one whole plant. The roots hold it in the soil and drink up water.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.8, 9);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'multicell',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Start with one cell, then tap Zoom out to see what cells build!',
  allPartsLine: 'You tapped every level for both! From one cell to a whole living thing.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const sun = new THREE.DirectionalLight(0xfff2c0, 0);
sun.position.set(-4, 6, 3);
scene.add(sun);

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const muscle = mat(0xff7f86);
const muscleCellMat = mat(0xff7f86, { transparent: true, opacity: 0.6, depthWrite: false });
const muscleDark = mat(0xc9475a);
const nucleusMat = mat(0x9a7cf5);
const heartMat = mat(0xe8445a);
// See-through vessels, so the blood cells flowing inside show.
const artery = mat(0xe8445a, { transparent: true, opacity: 0.45, depthWrite: false });
const vein = mat(0x5b8def, { transparent: true, opacity: 0.45, depthWrite: false });
const bloodMat = mat(0xd62839, { emissive: 0x5a0a12 });
const skin = mat(0xffc9a8, { transparent: true, opacity: 0.32, depthWrite: false });
const cellWall = mat(0x6fbf73, { transparent: true, opacity: 0.35, depthWrite: false });
const chloroplast = mat(0x2e9d3a, { emissive: 0x0f5a1a, emissiveIntensity: 0 });
const vacuoleMat = mat(0xbfe6ff, { transparent: true, opacity: 0.55, depthWrite: false });
const leafMat = mat(0x4cb050, { side: THREE.DoubleSide, emissive: 0x1d6b22, emissiveIntensity: 0 });
const veinMat = mat(0xb9e7a0);
const stemMat = mat(0x5e9e3a);
const rootMat = mat(0xb07a4a);
const soilMat = mat(0x7a5536, { transparent: true, opacity: 0.45, depthWrite: false });
const petalMat = mat(0xff9bb5);
const flowerMid = mat(0xffd75e);

// ---------- Builders ----------

function muscleCell() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3, 8, 24).rotateZ(Math.PI / 2), muscleCellMat);
  body.renderOrder = 2;
  g.add(body);
  for (let i = 0; i < 12; i++) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.022, 6, 32), muscleDark);
    stripe.rotation.y = Math.PI / 2;
    stripe.position.x = -1.45 + i * 0.27;
    g.add(stripe);
  }
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12).scale(1.6, 1, 1), nucleusMat);
  g.add(nucleus);
  return g;
}

function muscleTissue() {
  const g = new THREE.Group();
  const geo = new THREE.CapsuleGeometry(0.17, 1.15, 4, 10).rotateZ(Math.PI / 2);
  const cells = new THREE.InstancedMesh(geo, muscle, 96);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      for (let layer = 0; layer < 3; layer++) {
        const x = (col - 1.5) * 1.55 + (row % 2) * 0.75;
        m.makeTranslation(x, (row - 3.5) * 0.36, (layer - 1) * 0.38);
        cells.setMatrixAt(i++, m);
      }
    }
  }
  g.add(cells);
  return g;
}

function heart(scale = 1) {
  const g = new THREE.Group();
  const lobe = new THREE.SphereGeometry(0.85, 32, 24);
  const left = new THREE.Mesh(lobe, heartMat);
  left.position.set(-0.52, 0.35, 0);
  const right = new THREE.Mesh(lobe, heartMat);
  right.position.set(0.52, 0.35, 0);
  const tip = new THREE.Mesh(teardrop(), heartMat);
  tip.position.y = -0.2;
  const aorta = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.6, 0), new THREE.Vector3(0.2, 1.5, 0), new THREE.Vector3(0.9, 1.75, 0), new THREE.Vector3(1.3, 1.2, 0),
  ]), 20, 0.2, 12), artery);
  const vena = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 0.7, 0), new THREE.Vector3(-0.7, 1.6, 0),
  ]), 8, 0.17, 12), vein);
  g.add(left, right, tip, aorta, vena);
  g.scale.setScalar(scale);
  return g;
}

// A ball whose bottom half tapers to a rounded point: the bottom of the heart.
function teardrop() {
  const geo = new THREE.SphereGeometry(1.1, 40, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= 0) {
      // Tuck the top half inside the two lobes.
      pos.setXYZ(i, pos.getX(i), y * 0.85, pos.getZ(i) * 0.9);
      continue;
    }
    const taper = 1 + y / 1.25;
    pos.setXYZ(i, pos.getX(i) * taper, y * 1.55, pos.getZ(i) * taper * 0.9);
  }
  geo.computeVertexNormals();
  return geo;
}

// A loop of blood vessels: red going out from the heart, blue coming back,
// with blood cells flowing around it.
function vesselLoop(points, radius, cells) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points, true);
  const half = Math.floor(points.length / 2);
  const out = new THREE.CatmullRomCurve3(points.slice(0, half + 1));
  const back = new THREE.CatmullRomCurve3([...points.slice(half), points[0]]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(out, 80, radius, 8), artery));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(back, 80, radius, 8), vein));
  const blood = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, radius * 0.5, 12), bloodMat, cells);
  blood.frustumCulled = false;
  g.add(blood);
  flows.push({ curve, blood, cells, offset: 0 });
  return g;
}

const flows = [];

function circulatory(scale = 1) {
  const g = new THREE.Group();
  g.add(heart(0.55));
  g.add(vesselLoop([
    new THREE.Vector3(0.4, 0.5, 0), new THREE.Vector3(1.4, 2.2, 0.2), new THREE.Vector3(3, 1.5, 0), new THREE.Vector3(3.2, -1, -0.2),
    new THREE.Vector3(1.8, -2.6, 0), new THREE.Vector3(-0.4, -2.8, 0.2), new THREE.Vector3(-2.6, -1.8, 0), new THREE.Vector3(-3.1, 0.8, -0.2),
    new THREE.Vector3(-1.6, 2.3, 0), new THREE.Vector3(-0.4, 0.6, 0),
  ], 0.12, 36));
  g.scale.setScalar(scale);
  return g;
}

function human() {
  const g = new THREE.Group();
  const limb = (r, len, x, y, rz) => {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), skin);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rz;
    return mesh;
  };
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), skin);
  head.position.y = 2.55;
  g.add(head, limb(0.62, 1.5, 0, 1.0, 0), limb(0.2, 1.5, -0.95, 1.05, -0.25), limb(0.2, 1.5, 0.95, 1.05, 0.25),
    limb(0.25, 1.7, -0.35, -1.25, 0.05), limb(0.25, 1.7, 0.35, -1.25, -0.05));
  g.children.forEach((c) => { c.renderOrder = 2; });
  const h = heart(0.22);
  h.position.set(0.15, 1.35, 0.1);
  g.add(h);
  // Blood vessels to the head and down to the feet.
  g.add(vesselLoop([
    new THREE.Vector3(0.2, 1.4, 0.1), new THREE.Vector3(0.25, 2.3, 0.1), new THREE.Vector3(0, 2.75, 0.1), new THREE.Vector3(-0.25, 2.3, 0.1),
    new THREE.Vector3(-0.1, 1.4, 0.1), new THREE.Vector3(-0.3, 0.2, 0.1), new THREE.Vector3(-0.4, -1.9, 0.1), new THREE.Vector3(0.4, -1.9, 0.1),
    new THREE.Vector3(0.3, 0.2, 0.1),
  ], 0.045, 30));
  g.position.y = -0.4;
  return g;
}

function leafCell() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.7, 1.7, 4, 0.25), cellWall);
  wall.renderOrder = 2;
  const vac = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.0, 1.0, 4, 0.35), vacuoleMat);
  vac.renderOrder = 1;
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), nucleusMat);
  nucleus.position.set(-0.95, 0.4, 0.35);
  g.add(wall, vac, nucleus);
  const chloro = new THREE.SphereGeometry(0.14, 12, 8).scale(1.5, 0.8, 1);
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(chloro, chloroplast);
    const side = i % 6;
    const along = (Math.floor(i / 6) - 1) * 0.75;
    const spots = [[along, 0.68, 0.3], [along, -0.68, -0.3], [along, 0.3, 0.68], [along, -0.3, -0.68], [along, 0.68, -0.4], [along, -0.68, 0.45]];
    c.position.set(...spots[side]);
    c.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(c);
  }
  return g;
}

function leafTissue() {
  const g = new THREE.Group();
  const cellGeo = new RoundedBoxGeometry(0.8, 0.55, 0.55, 2, 0.08);
  const cells = new THREE.InstancedMesh(cellGeo, cellWall, 60);
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), chloroplast, 360);
  const m = new THREE.Matrix4();
  let i = 0;
  let d = 0;
  for (let x = 0; x < 6; x++) {
    for (let y = 0; y < 5; y++) {
      for (let z = 0; z < 2; z++) {
        const p = new THREE.Vector3((x - 2.5) * 0.86, (y - 2) * 0.6, (z - 0.5) * 0.6);
        cells.setMatrixAt(i++, m.makeTranslation(p));
        for (let k = 0; k < 6; k++) {
          dots.setMatrixAt(d++, m.makeTranslation(p.clone().add(new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(0.6), THREE.MathUtils.randFloatSpread(0.38), THREE.MathUtils.randFloatSpread(0.38)))));
        }
      }
    }
  }
  cells.renderOrder = 2;
  g.add(dots, cells);
  return g;
}

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.9, 0.5, 1.1, 2.0, 0, 3.2);
  s.bezierCurveTo(-1.1, 2.0, -0.9, 0.5, 0, 0);
  return s;
}

function leaf(scale = 1) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(leafShape(), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 24 }), leafMat);
  g.add(blade);
  const mid = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, -0.4, 0.07), new THREE.Vector3(0, 3, 0.07)), 4, 0.035, 6), veinMat);
  g.add(mid);
  for (let i = 1; i <= 4; i++) {
    for (const side of [-1, 1]) {
      const y = i * 0.6;
      const v = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, y, 0.07), new THREE.Vector3(side * 0.35, y + 0.15, 0.07), new THREE.Vector3(side * 0.62 * Math.sin((i / 5) * Math.PI) + side * 0.1, y + 0.45, 0.07)), 8, 0.018, 5), veinMat);
      g.add(v);
    }
  }
  g.scale.setScalar(scale);
  return g;
}

function shoot(scale = 1) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 4.6, 12), stemMat);
  stem.position.y = 0.3;
  g.add(stem);
  [[-1.2, 1, 0.55], [-0.4, -1, 0.6], [0.4, 1, 0.5], [1.1, -1, 0.45], [1.7, 1, 0.35]].forEach(([y, side, s]) => {
    const l = leaf(s);
    l.position.set(0, y, 0);
    l.rotation.z = -side * 1.0;
    l.rotation.y = side * 0.4;
    g.add(l);
  });
  const flower = new THREE.Group();
  flower.position.y = 2.65;
  flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), flowerMid));
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8).scale(1.8, 0.5, 1), petalMat);
    const a = (i / 6) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3);
    petal.rotation.y = -a;
    flower.add(petal);
  }
  flower.rotation.x = 0.5;
  g.add(flower);
  g.scale.setScalar(scale);
  return g;
}

function plant() {
  const g = new THREE.Group();
  const s = shoot(0.8);
  s.position.y = 0.9;
  g.add(s);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 40), soilMat);
  soil.position.y = -1.05;
  soil.renderOrder = 2;
  g.add(soil);
  // Roots branch down into the soil.
  const root = (from, dir, len, depth) => {
    const to = from.clone().addScaledVector(dir, len);
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.2), 0, THREE.MathUtils.randFloatSpread(0.2)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, mid, to), 8, 0.05 * depth, 5), rootMat));
    if (depth > 0.4) {
      for (const side of [-1, 1]) {
        root(from.clone().lerp(to, 0.6), dir.clone().add(new THREE.Vector3(side * 0.7, -0.1, THREE.MathUtils.randFloatSpread(0.6))).normalize(), len * 0.6, depth * 0.65);
      }
    }
  };
  root(new THREE.Vector3(0, -0.95, 0), new THREE.Vector3(0, -1, 0), 1.7, 1);
  return g;
}

// ---------- The ten levels ----------

const BUILDERS = {
  human: [muscleCell, muscleTissue, () => heart(1.1), () => circulatory(0.9), human],
  plant: [leafCell, leafTissue, () => { const l = leaf(1.1); l.position.y = -1.7; return l; }, () => { const s = shoot(1); s.position.y = -0.4; return s; }, () => { const p = plant(); p.position.y = -0.5; return p; }],
};

const LABEL_SPOTS = {
  human: [[0, 0.9, 0], [0, 1.8, 0], [0, 1.7, 0], [2.8, 2.2, 0], [1.3, 2.7, 0]],
  plant: [[0, 1.3, 0], [0, 1.8, 0], [0, 3.3, 0], [1.1, 2.5, 0], [1.4, 2.1, 0]],
};

const levels = {};
for (const [chain, builders] of Object.entries(BUILDERS)) {
  levels[chain] = builders.map((build, i) => {
    const group = build();
    group.visible = false;
    scene.add(group);
    const key = CHAINS[chain].things[i];
    tagPart(group, key);
    addLabel(key, scene, new THREE.Vector3(...LABEL_SPOTS[chain][i]), { hideWith: group });
    return group;
  });
}

// ---------- Moving between levels ----------

const state = { chain: 'human', level: 0, pace: 4, beat: 0 };
const seen = { human: new Set([0]), plant: new Set() };
let pop = null; // { from, to, t }

const levelCard = document.getElementById('level-card');

function show(chain, level) {
  const from = levels[state.chain][state.level];
  const to = levels[chain][level];
  if (from === to) return;
  state.chain = chain;
  state.level = level;
  pop = { from, to, t: 0 };
  to.visible = true;
  to.scale.setScalar(0.01);
  renderLevelUI();
  onLevel(chain, level);
}

function updatePop(dt) {
  if (!pop) return;
  pop.t = Math.min(1, pop.t + dt / 0.6);
  const out = Math.max(0, 1 - pop.t * 2.2);
  pop.from.scale.setScalar(baseScale(pop.from) * Math.max(out, 0.01));
  pop.from.visible = out > 0;
  // Bouncy grow-in.
  const t = pop.t;
  const grow = t < 0.35 ? 0 : 1 + Math.sin((t - 0.35) / 0.65 * Math.PI) * 0.12 * (1 - t) - (1 - (t - 0.35) / 0.65) ** 3;
  pop.to.scale.setScalar(baseScale(pop.to) * Math.max(grow, 0.01));
  if (pop.t >= 1) {
    pop.to.scale.setScalar(baseScale(pop.to));
    pop = null;
  }
  explorer.showLabels();
}

// Remember each level's own size so the pop returns to it.
const baseScales = new Map();
function baseScale(group) {
  if (!baseScales.has(group)) baseScales.set(group, group.scale.x || 1);
  return baseScales.get(group);
}
Object.values(levels).flat().forEach(baseScale);

function renderLevelUI() {
  document.querySelectorAll('[data-level]').forEach((b) => {
    b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.level));
  });
  document.querySelectorAll('[data-chain]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.chain === state.chain));
  });
  document.querySelectorAll('[data-level] .what').forEach((el, i) => {
    el.textContent = PARTS[CHAINS[state.chain].things[i]].name.replace(/ \(.*\)/, '');
  });
  levelCard.textContent = `${state.level + 1} of 5 · ${LEVELS[state.level]}: ${CHAINS[state.chain].lines[state.level]}`;
  document.getElementById('zoom-in').disabled = state.level === 0;
  document.getElementById('zoom-out').disabled = state.level === 4;

  // One slider, two meanings.
  const human = state.chain === 'human';
  document.getElementById('pace-name').textContent = human ? 'Heartbeat' : 'Sunlight';
  document.getElementById('pace-low').textContent = human ? 'Resting' : 'Cloudy';
  document.getElementById('pace-high').textContent = human ? 'Running' : 'Sunny';
  document.getElementById('pace-out').textContent = paceText(state.pace);
}

const paceText = (v) => (state.chain === 'human' ? `${60 + v * 12} beats a minute` : ['☁️ Cloudy', '⛅ Bright', '☀️ Sunny'][Math.min(2, Math.floor(v / 4))]);

// ---------- Stars and Cello ----------

function onLevel(chain, level) {
  seen[chain].add(level);
  if (seen[chain].size === 5 && complete(chain)) {
    cello.say(chain === 'human'
      ? 'Cell → tissue → organ → organ system → you! Every level, done.'
      : 'Cell → tissue → organ → organ system → plant! Plants are built the same way.', { mood: 'wow', ms: 6000 });
    return;
  }
  cello.say(CHAINS[chain].lines[level], { ms: 4000, important: false });
}

// ---------- Controls ----------

document.querySelectorAll('[data-level]').forEach((b) => {
  b.addEventListener('click', () => show(state.chain, Number(b.dataset.level)));
});
document.querySelectorAll('[data-chain]').forEach((b) => {
  b.addEventListener('click', () => show(b.dataset.chain, 0));
});
document.getElementById('zoom-out').addEventListener('click', () => show(state.chain, Math.min(4, state.level + 1)));
document.getElementById('zoom-in').addEventListener('click', () => show(state.chain, Math.max(0, state.level - 1)));

bindSlider('pace', paceText, (v) => {
  state.pace = v;
  if (state.chain === 'human' && v >= 8 && complete('race')) {
    cello.say('Thump-thump-thump! After running, your heart beats faster to send more blood around.', { mood: 'wow', ms: 5500 });
  }
  if (state.chain === 'plant' && v >= 9 && complete('sun')) {
    cello.say('Full sunshine! The green chloroplasts are busy making food for the plant.', { mood: 'wow', ms: 5500 });
  }
});

document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { skin: 0xffd5bd, wall: 0x8fe39a },
  light: { skin: 0xe7a27c, wall: 0x4fa75a },
};
window.elixTheme.watch((theme) => {
  skin.color.set(THEME_COLORS[theme].skin);
  cellWall.color.set(THEME_COLORS[theme].wall);
});

// ---------- Main loop ----------

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const p = new THREE.Vector3();
const tangent = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

stage.onFrame((dt) => {
  updatePop(dt);
  const current = levels[state.chain][state.level];
  if (!pop) current.scale.setScalar(baseScale(current));

  if (state.chain === 'human') {
    // Heartbeat: a quick squeeze, then a rest.
    const bpm = 60 + state.pace * 12;
    state.beat += dt * (bpm / 60) * Math.PI * 2;
    const squeeze = Math.pow(Math.max(0, Math.sin(state.beat)), 6);
    if (!pop) {
      if (state.level === 0) current.scale.set(1 - squeeze * 0.08, 1 + squeeze * 0.1, 1 + squeeze * 0.1);
      else current.scale.setScalar(baseScale(current) * (1 + squeeze * 0.05));
    }
    // Blood flows faster with a faster heart.
    flows.forEach((f) => {
      f.offset = (f.offset + dt * (bpm / 60) * 0.06) % 1;
      for (let i = 0; i < f.cells; i++) {
        const t = (i / f.cells + f.offset) % 1;
        f.curve.getPointAt(t, p);
        f.curve.getTangentAt(t, tangent);
        f.blood.setMatrixAt(i, m.compose(p, q.setFromUnitVectors(up, tangent), one));
      }
      f.blood.instanceMatrix.needsUpdate = true;
    });
    sun.intensity = 0;
  } else {
    // Sunlight: chloroplasts and leaves glow as they make food.
    const light = state.pace / 10;
    sun.intensity = light * 2.5;
    chloroplast.emissiveIntensity = light * 0.9;
    leafMat.emissiveIntensity = light * 0.35;
    if (!pop && state.level >= 2) current.rotation.y = Math.sin(performance.now() / 1500) * 0.25;
  }
});

renderLevelUI();
levels.human[0].visible = true;
