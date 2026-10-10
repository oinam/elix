import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer } from './explorer.js';
import { loadProgress } from './progress.js';

// One cell does every job. Four single-celled organisms, side by side, each
// acting out how it moves, eats, gets rid of waste, and makes more of itself.

const ORGANISMS = ['paramecium', 'amoeba', 'bacterium', 'yeast'];
const NAMES = { paramecium: 'Paramecium', amoeba: 'Amoeba', bacterium: 'Bacterium', yeast: 'Yeast' };

const JOBS = {
  move: {
    title: 'Move',
    ask: 'How does each one move?',
    paramecium: 'Rows with thousands of tiny hairs (cilia), spinning as it swims.',
    amoeba: 'Crawls by pushing out false feet and flowing into them.',
    bacterium: 'Spins its whip-like flagellum like a propeller.',
    yeast: 'It can’t swim or crawl! It just floats wherever the water takes it.',
  },
  eat: {
    title: 'Eat',
    ask: 'How does each one eat?',
    paramecium: 'Its cilia sweep food down the oral groove into its mouth.',
    amoeba: 'Wraps its false feet around food and swallows it whole.',
    bacterium: 'Soaks up food through its wall. No mouth needed!',
    yeast: 'Soaks up sugar through its wall, then turns it into gas.',
  },
  waste: {
    title: 'Get rid of waste',
    ask: 'How does each one get rid of what it doesn’t need?',
    paramecium: 'Star-shaped pumps squirt out extra water. Leftover waste leaves through the waste exit.',
    amoeba: 'A pump squeezes out extra water. Leftover waste is pushed out of the cell.',
    bacterium: 'Waste just seeps out through its wall.',
    yeast: 'Gives off carbon dioxide gas: the bubbles that make bread rise.',
  },
  grow: {
    title: 'Make more',
    ask: 'How does each one make more of itself?',
    paramecium: 'Splits across the middle into two new Paramecia.',
    amoeba: 'Splits in two. The nucleus divides first.',
    bacterium: 'Splits in two, again and again. Very fast!',
    yeast: 'Grows a little bud that breaks off. This is called budding.',
  },
};

// The info card for an organism shows what it does for the current job.
const PARTS = Object.fromEntries(ORGANISMS.map((o) => [o, { name: NAMES[o], text: '' }]));

const RIDDLES = [
  ['I swim using thousands of tiny hairs called cilia.', 'paramecium'],
  ['I have no fixed shape. I move with false feet.', 'amoeba'],
  ['I have no nucleus at all!', 'bacterium'],
  ['I’m a fungus, and I help make bread rise.', 'yeast'],
  ['I make more of me by budding.', 'yeast'],
  ['My shape looks like the sole of a slipper.', 'paramecium'],
  ['I wrap my false feet around food to eat it.', 'amoeba'],
  ['Some of us turn milk into curd.', 'bacterium'],
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.2, 10.5);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'singlecell',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Each of these is just one cell, but it does every job! Pick a job to watch.',
  allPartsLine: 'You tapped all four! Each one is a whole living thing in a single cell.',
});
const { tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const glass = (color, opacity = 0.5) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, transparent: true, opacity, depthWrite: false });
const solid = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const paraBody = glass(0x8fe3cf);
const amoebaBody = glass(0xc2a8ff);
const bactBody = glass(0x7fe0c4, 0.55);
const yeastBody = glass(0xffd28a, 0.6);
const nucleusMat = solid(0x9a7cf5);
const pinkMat = solid(0xff7aa2);
const pumpMat = solid(0x6fc3ff, { emissive: 0x1a4c80 });
const hairMat = solid(0xd8fff2);
const foodMat = solid(0x7be05a);
const wasteMat = solid(0x9a6a3a);
const bubbleMat = glass(0xffffff, 0.6);
const sugarMat = solid(0xffffff, { emissive: 0x9fb8c8 });

// ---------- Mini models ----------

function miniParamecium() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20).scale(1.35, 0.5, 0.55), paraBody);
  body.renderOrder = 2;
  g.add(body);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12).scale(1.4, 0.8, 0.8), nucleusMat);
  g.add(nucleus);
  const pump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), pumpMat);
  pump.position.set(0.7, 0.2, 0);
  g.add(pump);
  const cilia = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.012, 0.14, 3).translate(0, 0.07, 0), hairMat, 180);
  const up = new THREE.Vector3(0, 1, 0);
  const hairs = [];
  for (let i = 0; i < 180; i++) {
    const d = new THREE.Vector3().randomDirection();
    const p = d.clone().multiply(new THREE.Vector3(1.35, 0.5, 0.55));
    const n = d.clone().divide(new THREE.Vector3(1.35, 0.5, 0.55)).normalize();
    hairs.push({ p, q: new THREE.Quaternion().setFromUnitVectors(up, n), u: d.x });
  }
  g.add(cilia);
  return { group: g, body, parts: { pump, cilia, hairs } };
}

function miniAmoeba() {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.85, 40, 28);
  const body = new THREE.Mesh(geo, amoebaBody);
  body.renderOrder = 2;
  g.add(body);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), pinkMat);
  g.add(nucleus);
  const pump = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), pumpMat);
  pump.position.set(-0.35, 0.1, 0.3);
  g.add(pump);
  return { group: g, body, parts: { pump, nucleus, dirs: geo.attributes.position.array.slice() } };
}

function miniBacterium() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 8, 20).rotateZ(Math.PI / 2), bactBody);
  body.renderOrder = 2;
  g.add(body);
  const pts = [];
  for (let i = 0; i < 10; i++) pts.push(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.8), THREE.MathUtils.randFloatSpread(0.25), THREE.MathUtils.randFloatSpread(0.25)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.025, 5, true), pinkMat));
  const tail = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    tail.push(new THREE.Vector3(-t * 1.5, Math.sin(t * Math.PI * 6) * 0.1 * Math.min(1, t * 4), Math.cos(t * Math.PI * 6) * 0.1 * Math.min(1, t * 4)));
  }
  const flagellum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 80, 0.022, 5), hairMat);
  flagellum.position.x = -0.85;
  g.add(flagellum);
  return { group: g, body, parts: { flagellum } };
}

function miniYeast() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 20).scale(1.25, 1, 1), yeastBody);
  body.renderOrder = 2;
  g.add(body);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), nucleusMat);
  nucleus.position.set(0.25, 0.15, 0);
  g.add(nucleus);
  const vac = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), glass(0x9ccfff, 0.7));
  vac.position.set(-0.3, -0.05, 0);
  g.add(vac);
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14), yeastBody);
  bud.visible = false;
  g.add(bud);
  return { group: g, body, parts: { bud } };
}

const BUILD = { paramecium: miniParamecium, amoeba: miniAmoeba, bacterium: miniBacterium, yeast: miniYeast };
const HOME = {
  paramecium: new THREE.Vector3(-2.7, 1.75, 0),
  amoeba: new THREE.Vector3(1.9, 1.75, 0),
  bacterium: new THREE.Vector3(-2.7, -1.15, 0),
  yeast: new THREE.Vector3(1.9, -1.15, 0),
};

const minis = {};
for (const o of ORGANISMS) {
  const mini = BUILD[o]();
  mini.home = HOME[o];
  mini.group.position.copy(mini.home);
  scene.add(mini.group);
  tagPart(mini.group, o);
  // Two half-size copies, shown while it splits in two.
  mini.twins = [BUILD[o]().group, BUILD[o]().group];
  mini.twins.forEach((t) => { t.visible = false; t.scale.setScalar(0.72); scene.add(t); });
  // A name tag that always shows.
  const tag = makeLabel(NAMES[o]);
  tag.position.copy(mini.home).add(new THREE.Vector3(0, -1.15, 0));
  scene.add(tag);
  minis[o] = mini;
}

// ---------- Little things: food, waste, bubbles ----------

const bits = []; // { mesh, from, to, life, age, kind }
const bitGeo = new THREE.SphereGeometry(0.06, 8, 6);
const sugarGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);

function spawnBit(kind, from, to, life, material, geo = bitGeo) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(from);
  scene.add(mesh);
  bits.push({ mesh, from: from.clone(), to: to.clone(), life, age: 0, kind });
}

function clearBits() {
  bits.forEach((b) => scene.remove(b.mesh));
  bits.length = 0;
}

function updateBits(dt) {
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i];
    b.age += dt;
    const t = Math.min(b.age / b.life, 1);
    b.mesh.position.lerpVectors(b.from, b.to, b.kind === 'in' ? t * t : t);
    if (b.kind === 'in') b.mesh.scale.setScalar(1 - t * 0.7);
    if (b.kind === 'bubble') b.mesh.position.x += Math.sin(b.age * 6) * 0.01;
    if (t >= 1) {
      scene.remove(b.mesh);
      bits.splice(i, 1);
    }
  }
}

const around = (center, r) => center.clone().add(new THREE.Vector3().randomDirection().setZ(0).normalize().multiplyScalar(r));

// ---------- Acting out each job ----------

const state = { job: 'move', time: 0, spawn: 0 };

function resetPoses() {
  for (const o of ORGANISMS) {
    const m = minis[o];
    m.group.visible = true;
    m.group.position.copy(m.home);
    m.group.rotation.set(0, 0, 0);
    m.group.scale.setScalar(1);
    m.twins.forEach((t) => { t.visible = false; });
  }
  minis.yeast.parts.bud.visible = false;
  clearBits();
}

function act(dt) {
  state.time += dt;
  state.spawn -= dt;
  const t = state.time;
  const { paramecium: pa, amoeba: am, bacterium: ba, yeast: ye } = minis;

  // Things that always happen: cilia beat, flagellum spins, amoeba wobbles.
  const ciliaSpeed = state.job === 'move' || state.job === 'eat' ? 9 : 4;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 0, 1);
  pa.parts.hairs.forEach((h, i) => {
    q.setFromAxisAngle(axis, Math.sin(t * ciliaSpeed - h.u * 6) * 0.5).premultiply(h.q);
    pa.parts.cilia.setMatrixAt(i, m4.compose(h.p, q, new THREE.Vector3(1, 1, 1)));
  });
  pa.parts.cilia.instanceMatrix.needsUpdate = true;
  ba.parts.flagellum.rotation.x += dt * (state.job === 'move' ? 14 : 5);
  shapeAmoeba(am, t, state.job === 'move' || state.job === 'eat');

  const pump = (mesh, speed) => mesh.scale.setScalar(0.6 + 0.6 * Math.pow(Math.max(0, Math.sin(t * speed)), 3));

  if (state.job === 'move') {
    // Paramecium swims a little loop; bacterium darts; amoeba creeps; yeast drifts.
    pa.group.position.copy(pa.home).add(new THREE.Vector3(Math.cos(t * 0.8) * 0.5, Math.sin(t * 0.8) * 0.25, 0));
    pa.group.rotation.order = 'ZYX'; // roll around its body, then face the way it swims
    pa.group.rotation.set(t * 2, 0, Math.atan2(Math.cos(t * 0.8) * 0.25, -Math.sin(t * 0.8) * 0.5));
    ba.group.position.copy(ba.home).add(new THREE.Vector3(Math.sin(t * 1.6) * 0.45, 0, 0));
    ba.group.rotation.z = Math.cos(t * 1.6) > 0 ? 0 : Math.PI;
    am.group.position.copy(am.home).add(new THREE.Vector3(Math.sin(t * 0.3) * 0.3, 0, 0));
    ye.group.position.copy(ye.home).add(new THREE.Vector3(Math.sin(t * 0.5) * 0.08, Math.sin(t * 0.7) * 0.08, 0));
  }

  if (state.job === 'eat' && state.spawn <= 0) {
    state.spawn = 0.5;
    // Food comes in from outside. Paramecium's goes to its mouth on the side.
    const mouth = pa.home.clone().add(new THREE.Vector3(-0.1, -0.2, 0.4));
    spawnBit('in', around(pa.home, 1.6), mouth, 1.4, foodMat);
    spawnBit('in', around(am.home, 1.5), am.home.clone(), 1.8, foodMat);
    spawnBit('in', around(ba.home, 1.2), around(ba.home, 0.45), 1.2, foodMat, sugarGeo);
    spawnBit('in', around(ye.home, 1.4), around(ye.home, 0.8), 1.2, sugarMat, sugarGeo);
  }

  if (state.job === 'waste') {
    pump(pa.parts.pump, 4);
    pump(am.parts.pump, 3);
    if (state.spawn <= 0) {
      state.spawn = 0.35;
      spawnBit('out', pa.home.clone().add(pa.parts.pump.position), around(pa.home, 1.5).setY(pa.home.y + 0.9), 1.2, pumpMat);
      spawnBit('out', am.home.clone().add(am.parts.pump.position), around(am.home, 1.6), 1.4, pumpMat);
      spawnBit('out', around(ba.home, 0.4), around(ba.home, 1.3), 1.4, wasteMat);
      spawnBit('bubble', around(ye.home, 0.7), ye.home.clone().add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), 1.6, 0)), 1.6, bubbleMat);
    }
  } else {
    pa.parts.pump.scale.setScalar(1);
    am.parts.pump.scale.setScalar(1);
  }

  if (state.job === 'grow') {
    // A 5-second loop: stretch, split (or bud), then start again.
    const c = (t % 5) / 5;
    for (const o of ['paramecium', 'amoeba', 'bacterium']) {
      const m = minis[o];
      const dir = new THREE.Vector3(o === 'paramecium' ? 1 : 1, 0, 0);
      if (c < 0.45) {
        m.group.visible = true;
        m.group.scale.set(1 + c * 0.9, 1 - c * 0.3, 1);
        m.twins.forEach((tw) => { tw.visible = false; });
      } else {
        m.group.visible = false;
        const apart = THREE.MathUtils.smoothstep(c, 0.45, 0.8) * 0.75 + (o === 'amoeba' ? 0.45 : 0.6);
        m.twins.forEach((tw, i) => {
          tw.visible = c < 0.95;
          tw.position.copy(m.home).addScaledVector(dir, (i ? 1 : -1) * apart);
        });
      }
    }
    const bud = ye.parts.bud;
    bud.visible = c > 0.05 && c < 0.95;
    const g = THREE.MathUtils.smoothstep(c, 0.05, 0.6);
    bud.scale.setScalar(Math.max(g, 0.01));
    bud.position.set(1.0 + 0.3 * g + THREE.MathUtils.smoothstep(c, 0.7, 0.95) * 0.9, 0.2, 0);
  }

  updateBits(dt);
}

function shapeAmoeba(am, t, busy) {
  const pos = am.body.geometry.attributes.position;
  const d = am.parts.dirs;
  const reach = busy ? 0.35 + 0.3 * Math.sin(t * 0.9) : 0.1;
  for (let i = 0; i < pos.count; i++) {
    const x = d[i * 3] / 0.85;
    const y = d[i * 3 + 1] / 0.85;
    const z = d[i * 3 + 2] / 0.85;
    let r = 0.85 * (1 + 0.07 * Math.sin(3 * x + t * 1.4) * Math.cos(2 * y + t));
    if (x > 0) r += reach * Math.pow(x, 10);
    pos.setXYZ(i, x * r, y * r * 0.8, z * r * 0.8);
  }
  pos.needsUpdate = true;
  am.body.geometry.computeVertexNormals();
}

// ---------- Jobs ----------

const triedJobs = new Set(['move']);
const jobCard = document.getElementById('job-card');

const JOB_LINES = {
  move: 'Watch how each one moves. One of them can’t move by itself!',
  eat: 'Two of them swallow food. Two just soak it up!',
  waste: 'Blue drops are extra water being pumped out. Bubbles are gas.',
  grow: 'Three split in two. One grows a bud instead. Can you spot it?',
};

function setJob(job) {
  state.job = job;
  state.time = 0;
  state.spawn = 0;
  resetPoses();
  for (const o of ORGANISMS) PARTS[o].text = JOBS[job][o];
  document.querySelectorAll('[data-job]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.job === job)));
  jobCard.textContent = `${JOBS[job].title}: ${JOBS[job].ask} Tap one to find out.`;
  document.getElementById('info').hidden = true;
}

document.querySelectorAll('[data-job]').forEach((b) => {
  b.addEventListener('click', () => {
    setJob(b.dataset.job);
    triedJobs.add(b.dataset.job);
    if (triedJobs.size === 4 && complete('jobs')) {
      cello.say('Move, eat, get rid of waste, make more: one cell does every job!', { mood: 'wow', ms: 6000 });
    } else {
      cello.say(JOB_LINES[b.dataset.job], { ms: 5000 });
    }
  });
});

// ---------- Who am I? ----------

let order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
let current = 0;
let right = 0;
const solved = new Set();
const riddleEl = document.getElementById('riddle');
const riddleCount = document.getElementById('riddle-count');

function showRiddle() {
  riddleEl.textContent = `“${RIDDLES[order[current]][0]}”`;
  riddleCount.textContent = `${solved.size} of ${RIDDLES.length} solved`;
}

document.querySelectorAll('[data-answer]').forEach((b) => {
  b.addEventListener('click', () => {
    const [clue, answer] = RIDDLES[order[current]];
    if (b.dataset.answer === answer) {
      solved.add(clue);
      right++;
      if (solved.size === RIDDLES.length && complete('quiz')) {
        cello.say('You solved every riddle! You really know your single cells.', { mood: 'wow', ms: 6000 });
      } else if (right >= 3 && complete('quiz3')) {
        cello.say('Three right! You’re getting good at this.', { mood: 'wow' });
      } else {
        cello.say(['Yes!', 'Correct!', 'You got it!', 'Spot on!'][right % 4], { ms: 1800 });
      }
      current = (current + 1) % order.length;
      if (current === 0) order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
      showRiddle();
    } else {
      cello.say(`Not ${NAMES[b.dataset.answer]}. Try again!`, { mood: 'sad', ms: 2200 });
    }
  });
});

// ---------- Meet them up close ----------

const PAGES = ['paramecium', 'amoeba', 'bacteria', 'yeast'];
function checkExplorers() {
  let all = true;
  PAGES.forEach((page) => {
    const progress = loadProgress(page);
    const el = document.getElementById(`visit-${page}`);
    if (el) el.textContent = progress.done.length ? `⭐ ${progress.done.length}` : '';
    if (!progress.done.length) all = false;
  });
  if (all && complete('explorer')) {
    cello.say('You earned stars with all four organisms. Super scientist!', { mood: 'wow', ms: 5000 });
  }
}

// ---------- Controls ----------

document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { para: 0x8fe3cf, amoeba: 0xc2a8ff, bact: 0x7fe0c4, hair: 0xd8fff2 },
  light: { para: 0x4cc4a6, amoeba: 0x9a7be8, bact: 0x2fa889, hair: 0x1f7f6b },
};
window.elixTheme.watch((theme) => {
  const c = THEME_COLORS[theme];
  paraBody.color.set(c.para);
  amoebaBody.color.set(c.amoeba);
  bactBody.color.set(c.bact);
  hairMat.color.set(c.hair);
});

// ---------- Start ----------

setJob('move');
showRiddle();
checkExplorers();
stage.onFrame(act);
