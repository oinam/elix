import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer } from './explorer.js';

// Recycling. A belt brings one piece of trash at a time; sort it into the
// paper, glass, metal, plastic, compost, or trash bin. Get it right and it
// flies into the bin, then what it becomes next pops out on top: a
// notebook, a new bottle, a new can, a bench, a little plant. Three ways to
// make less trash (a cloth bag, a refilled bottle, fixing and handing down)
// shrink the week's pile for the landfill.

const PARTS = {
  paper: { name: 'Paper bin', text: 'Newspaper, cardboard, and old paper are mashed with water into pulp and made into new paper. That saves trees.' },
  glass: { name: 'Glass bin', text: 'Glass is crushed, melted, and made into new jars and bottles. It can be recycled again and again, forever.' },
  metal: { name: 'Metal bin', text: 'Cans are melted down and made into new cans. Metal can be recycled over and over, too.' },
  plastic: { name: 'Plastic bin', text: 'Some plastic is shredded into flakes and made into things like benches, pipes, and fleece clothes.' },
  compost: { name: 'Compost heap', text: 'Food scraps rot down with help from worms and tiny living things, into rich soil for plants.' },
  landfill: { name: 'Trash bin', text: 'Things that can’t be recycled or composted go to the landfill. The less we put here, the better.' },
  belt: { name: 'Sorting belt', text: 'At a real recycling center, belts, magnets, and people sort the trash into its different kinds.' },
};

const BINS = {
  paper: { color: 0x5b8def, x: -3.75, makes: 'notebook', line: 'New paper and notebooks!' },
  glass: { color: 0x3a9a5a, x: -2.25, makes: 'bottle', line: 'A brand-new bottle! Glass can go round forever.' },
  metal: { color: 0xffc23d, x: -0.75, makes: 'can', line: 'Melted into a shiny new can!' },
  plastic: { color: 0xff8a3d, x: 0.75, makes: 'bench', line: 'Shredded and made into a park bench!' },
  compost: { color: 0x8a5a36, x: 2.25, makes: 'sprout', line: 'Rotted into rich compost, and a plant grows!' },
  landfill: { color: 0x6b7280, x: 3.75, makes: null, line: 'Into the landfill. It can’t be made into anything new.' },
};

const ITEMS = [
  { name: 'Newspaper', emoji: '📰', bin: 'paper', shape: 'flat', color: 0xd8d4c8 },
  { name: 'Cardboard box', emoji: '📦', bin: 'paper', shape: 'box', color: 0xc49a6c },
  { name: 'Glass jar', emoji: '🫙', bin: 'glass', shape: 'jar', color: 0x9fe0c0 },
  { name: 'Glass bottle', emoji: '🍾', bin: 'glass', shape: 'bottle', color: 0x3a9a5a },
  { name: 'Drink can', emoji: '🥤', bin: 'metal', shape: 'can', color: 0xff5a5a },
  { name: 'Food tin', emoji: '🥫', bin: 'metal', shape: 'can', color: 0xc0c8d4 },
  { name: 'Plastic bottle', emoji: '🧴', bin: 'plastic', shape: 'bottle', color: 0x7ec8ff },
  { name: 'Yogurt pot', emoji: '🥛', bin: 'plastic', shape: 'pot', color: 0xf4f4f4 },
  { name: 'Banana peel', emoji: '🍌', bin: 'compost', shape: 'peel', color: 0xffd75e },
  { name: 'Apple core', emoji: '🍎', bin: 'compost', shape: 'core', color: 0xe8d8b0 },
  { name: 'Eggshells', emoji: '🥚', bin: 'compost', shape: 'shell', color: 0xfff4e0 },
  { name: 'Chip bag', emoji: '🥔', bin: 'landfill', shape: 'flat', color: 0xc0c8d4, why: 'It’s plastic and metal stuck together, so it can’t be recycled in most places.' },
];

const LESS = {
  bag: 'A cloth bag, used again and again, instead of new plastic bags.',
  bottle: 'One bottle, refilled every day, instead of a new one each time.',
  toys: 'Fixing broken things, and handing down toys and clothes.',
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'recycling',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Trash doesn’t have to be trash! Sort it into the right bins and give it a second life.',
  allPartsLine: 'All 7 parts! You’re a recycling expert.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 5), mat(0xd8d0bc));
floor.position.y = -0.1;
scene.add(floor);

// ---------- Bins ----------

const BIN_Z = -1;
const BIN_H = 1.2;
const fills = {};
const fillLevel = {};
Object.entries(BINS).forEach(([key, b]) => {
  const g = new THREE.Group();
  if (key === 'compost') {
    // A wooden crate of slats.
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 1.0), mat(0x9a6a40));
      slat.position.y = 0.12 + i * 0.26;
      g.add(slat);
    }
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, BIN_H, 20, 1, true), mat(b.color, { side: THREE.DoubleSide }));
    body.position.y = BIN_H / 2;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20).rotateX(-Math.PI / 2), mat(b.color));
    bottom.position.y = 0.01;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 24).rotateX(Math.PI / 2), mat(b.color, { roughness: 0.4 }));
    rim.position.y = BIN_H;
    g.add(body, bottom, rim);
  }
  // What's inside, rising as the bin fills.
  const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 1, 20), mat(key === 'compost' ? 0x4a3222 : 0xffffff, { roughness: 0.9 }));
  if (key !== 'compost') fill.material.color.setHex(b.color).lerp(new THREE.Color(0xffffff), 0.45);
  fill.geometry.translate(0, 0.5, 0);
  fill.scale.y = 0.05;
  g.add(fill);
  fills[key] = fill;
  fillLevel[key] = 0.05;
  g.position.set(b.x, 0, BIN_Z);
  scene.add(tagPart(g, key));
  b.group = g;
  addLabel(key, g, v(0, BIN_H + 0.35, 0));
});

// ---------- The belt ----------

const BELT_Z = 1.3;
const belt = new THREE.Group();
const band = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 0.9), mat(0x3a3f48));
band.position.y = 0.35;
belt.add(band);
const stripes = [];
for (let i = 0; i < 16; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.88), mat(0x6b7280));
  s.position.set(-4 + i * 0.5, 0.41, 0);
  belt.add(s);
  stripes.push(s);
}
[-3.8, 3.8].forEach((x) => {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.8), mat(0x6b7280));
  leg.position.set(x, 0.15, 0);
  belt.add(leg);
});
belt.position.z = BELT_Z;
scene.add(tagPart(belt, 'belt'));
addLabel('belt', belt, v(-3, 0.75, 0));
const ON_BELT = v(0, 0.62, BELT_Z);

// ---------- Item shapes ----------

function makeShape(shape, color) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.4 });
  const add = (geo, pos = [0, 0, 0], mm = m) => { const mesh = new THREE.Mesh(geo, mm); mesh.position.set(...pos); g.add(mesh); return mesh; };
  switch (shape) {
    case 'flat': add(new THREE.BoxGeometry(0.5, 0.05, 0.38)); break;
    case 'box': add(new THREE.BoxGeometry(0.42, 0.32, 0.36)); break;
    case 'jar': add(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16), [0, 0, 0], mat(color, { transparent: true, opacity: 0.7, roughness: 0.1 })); add(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16), [0, 0.18, 0], mat(0xc0c8d4)); break;
    case 'bottle': add(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 16), [0, 0, 0], mat(color, { transparent: true, opacity: 0.8, roughness: 0.15 })); add(new THREE.CylinderGeometry(0.04, 0.09, 0.14, 12), [0, 0.24, 0], mat(color, { transparent: true, opacity: 0.8 })); break;
    case 'can': add(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 16), [0, 0, 0], mat(color, { metalness: 0.5, roughness: 0.3 })); break;
    case 'pot': add(new THREE.CylinderGeometry(0.13, 0.1, 0.18, 16)); break;
    case 'peel': for (let i = 0; i < 3; i++) { const s = add(new THREE.CapsuleGeometry(0.05, 0.25, 4, 8)); s.rotation.z = (i - 1) * 0.6; s.position.y = 0.05; } break;
    case 'core': add(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10)); add(new THREE.SphereGeometry(0.1, 12, 8), [0, 0.12, 0], mat(0xd84a3a)); add(new THREE.SphereGeometry(0.1, 12, 8), [0, -0.12, 0], mat(0xd84a3a)); break;
    case 'shell': [-0.1, 0.1].forEach((x) => add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), [x, 0, 0], mat(color, { side: THREE.DoubleSide }))); break;
    // What things become.
    case 'notebook': add(new THREE.BoxGeometry(0.4, 0.06, 0.5), [0, 0, 0], mat(0x5b8def)); add(new THREE.BoxGeometry(0.36, 0.065, 0.46), [0.01, 0, 0], mat(0xffffff)); break;
    case 'bench': add(new THREE.BoxGeometry(0.6, 0.06, 0.22), [0, 0.15, 0], mat(0xff8a3d)); add(new THREE.BoxGeometry(0.6, 0.18, 0.04), [0, 0.27, -0.1], mat(0xff8a3d)); [-0.25, 0.25].forEach((x) => add(new THREE.BoxGeometry(0.05, 0.15, 0.2), [x, 0.05, 0], mat(0x3a3f48))); break;
    case 'sprout': add(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), [0, 0.15, 0], mat(0x3f9b4a)); [-1, 1].forEach((s) => { const leaf = add(new THREE.SphereGeometry(0.09, 10, 8), [s * 0.08, 0.3, 0], mat(0x5abf3a)); leaf.scale.set(1.4, 0.4, 0.8); }); break;
    default: break;
  }
  return g;
}

// ---------- Game state ----------

let order = [];
let current = null;
let right = 0;
let tries = 0;
const itemEl = document.getElementById('item');
const answerEl = document.getElementById('answer');
const levelCard = document.getElementById('level-card');
const flying = [];
let arriving = null;

function shuffle() {
  order = [...ITEMS].sort(() => Math.random() - 0.5);
}

function nextItem() {
  if (!order.length) shuffle();
  const item = order.pop();
  const mesh = makeShape(item.shape, item.color);
  mesh.position.copy(ON_BELT).add(v(-4, 0, 0));
  scene.add(mesh);
  current = { item, mesh };
  arriving = { t: 0 };
  tries = 0;
  itemEl.textContent = `${item.emoji} ${item.name}`;
  answerEl.textContent = 'Which bin does it go in?';
}

function sort(bin) {
  if (!current || arriving) return;
  const { item, mesh } = current;
  if (bin !== item.bin) {
    tries++;
    const hint = item.bin === 'landfill'
      ? 'Hmm, not that one. Is it really made of just one thing?'
      : `Not quite. What is it made of? Try again!`;
    answerEl.textContent = hint;
    cello.say(hint, { ms: 3000, important: false });
    return;
  }
  if (tries === 0) right++;
  document.getElementById('sort-count').textContent = `✅ ${right}`;
  const b = BINS[bin];
  answerEl.textContent = item.why ? `Yes! ${item.why}` : `Yes! ${b.line}`;
  levelCard.textContent = `${item.emoji} ${item.name} → ${b.line}`;
  flying.push({ mesh, from: mesh.position.clone(), to: v(b.x, BIN_H + 0.1, BIN_Z), t: 0, bin, makes: b.makes });
  current = null;

  if (bin === 'compost' && complete('compost')) {
    cello.say('Food scraps become compost, and compost feeds new plants. Nothing wasted!', { mood: 'wow', ms: 5500 });
  } else if (bin === 'glass' && complete('glass')) {
    cello.say('Glass can be melted and made new again and again, forever!', { mood: 'wow', ms: 5000 });
  } else if (bin === 'landfill' && complete('trash')) {
    cello.say('Some things can’t be recycled. That’s why it’s best to buy less of them.', { mood: 'oops', ms: 5500 });
  } else if (right >= 10 && complete('sort')) {
    cello.say('Ten things sorted! You’d be a star at a recycling center.', { mood: 'wow', ms: 5000 });
  } else {
    cello.say(b.line, { ms: 2500, important: false });
  }
  setTimeout(nextItem, 1600);
}
document.querySelectorAll('[data-bin]').forEach((btn) => btn.addEventListener('click', () => sort(btn.dataset.bin)));

// New things pop out of the bins with a label, then fade.
const popped = [];
function popOut(bin, makes) {
  const b = BINS[bin];
  if (!makes) return;
  const thing = makeShape(makes, b.color);
  thing.position.set(b.x, BIN_H + 0.5, BIN_Z);
  thing.scale.setScalar(0.01);
  const label = makeLabel(b.line.split('!')[0].replace('Into the landfill. ', '') + '!');
  label.position.set(0, 0.6, 0);
  thing.add(label);
  scene.add(thing);
  popped.push({ thing, label, t: 0 });
}

// ---------- Make less trash ----------

const less = new Set();
const heap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7a6a52));
heap.position.set(4.45, 0, 0.2);
scene.add(tagPart(heap, 'landfill'));
const heapLabel = makeLabel('Trash pile');
heapLabel.position.set(0, 0.7, 0);
heap.add(heapLabel);
function showWeek() {
  const bags = 5 - less.size * 1.3;
  const n = Math.max(1, Math.round(bags));
  document.getElementById('week').textContent = `🗑️ Trash this week: ${'🛍️'.repeat(n)}`;
  heapTarget = 0.3 + (n / 5) * 0.7;
}
let heapTarget = 1;
document.querySelectorAll('[data-less]').forEach((btn) => btn.addEventListener('click', () => {
  const key = btn.dataset.less;
  if (less.has(key)) less.delete(key);
  else less.add(key);
  btn.setAttribute('aria-pressed', String(less.has(key)));
  showWeek();
  levelCard.textContent = less.has(key) ? LESS[key] : 'Switched off. A bit more trash again.';
  if (less.size === 3 && complete('less')) {
    cello.say('Reduce and reuse first, then recycle what’s left. The trash pile is tiny now!', { mood: 'wow', ms: 5500 });
  } else if (less.has(key)) {
    cello.say(LESS[key], { ms: 3500, important: false });
  }
}));

function aimCamera() {
  camera.position.set(0, 3.6, 7.8);
  controls.target.set(0, 0.6, 0);
}
document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

stage.onFrame((dt) => {
  // The belt rolls while a new item arrives.
  if (arriving) {
    arriving.t = Math.min(1, arriving.t + dt * 1.4);
    const e = 1 - (1 - arriving.t) ** 3;
    current.mesh.position.x = ON_BELT.x - 4 * (1 - e);
    stripes.forEach((s) => { s.position.x = ((s.position.x + 4 + dt * 2.8) % 8) - 4; });
    if (arriving.t >= 1) arriving = null;
  }
  if (current) current.mesh.rotation.y += dt * 0.6;

  // Sorted items arc into their bin.
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += dt * 1.6;
    const t = Math.min(1, f.t);
    f.mesh.position.lerpVectors(f.from, f.to, t);
    f.mesh.position.y += Math.sin(t * Math.PI) * 1.2;
    if (t >= 1) {
      f.mesh.scale.multiplyScalar(0.8);
      f.mesh.position.y -= dt * 2;
      if (f.mesh.scale.x < 0.1) {
        scene.remove(f.mesh);
        flying.splice(i, 1);
        fillLevel[f.bin] = Math.min(BIN_H - 0.1, fillLevel[f.bin] + 0.12);
        popOut(f.bin, f.makes);
      }
    }
  }
  Object.entries(fills).forEach(([k, m]) => { m.scale.y += (fillLevel[k] - m.scale.y) * Math.min(1, dt * 4); });

  for (let i = popped.length - 1; i >= 0; i--) {
    const p = popped[i];
    p.t += dt;
    p.thing.scale.setScalar(Math.min(1.4, p.t * 4));
    p.thing.rotation.y += dt;
    p.thing.position.y += dt * 0.1;
    if (p.t > 2.8) {
      p.label.element.remove();
      scene.remove(p.thing);
      popped.splice(i, 1);
    }
  }

  const s = heap.scale.x + (heapTarget - heap.scale.x) * Math.min(1, dt * 3);
  heap.scale.setScalar(s);
});

shuffle();
nextItem();
showWeek();
heap.scale.setScalar(heapTarget);
aimCamera();
