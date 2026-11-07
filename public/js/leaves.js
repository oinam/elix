import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// What leaves do. A slice of leaf: skin on top and bottom, tall food-making
// cells packed with chloroplasts, a spongy layer with air spaces, a vein
// (xylem and phloem), and stomata with guard cells on the underside. With
// sunlight, water, and carbon dioxide, the leaf makes sugar and oxygen. On a
// hot, dry day the guard cells close the stomata; at night the cooking stops.
// A second view zooms into one chloroplast.

const PARTS = {
  epidermis: { name: 'Leaf skin (epidermis)', text: 'The outside layer, on the top and the bottom. It’s clear, so sunlight shines through, and it has a waxy coat to keep water in.' },
  palisade: { name: 'Food-making cells', text: 'Tall cells packed tight just under the top skin, where the sunlight is best. They’re full of chloroplasts.' },
  chloroplast: { name: 'Chloroplast', text: 'The kitchen where food is made. Its green stuff (chlorophyll) traps sunlight. Sunlight, water, and carbon dioxide go in. Sugar and oxygen come out.' },
  spongy: { name: 'Spongy layer', text: 'Round, loose cells with air spaces between them. Carbon dioxide drifts through the spaces to reach the food-making cells.' },
  vein: { name: 'Vein', text: 'A bundle of tubes running through the leaf. It brings water in and takes food out. You can see veins as lines on a leaf.' },
  xylem: { name: 'Water tubes (xylem)', text: 'In the vein. They bring water all the way from the roots, up the stem, and into the leaf.' },
  phloem: { name: 'Food tubes (phloem)', text: 'In the vein. They carry the sugar the leaf made to the rest of the plant.' },
  stoma: { name: 'Stoma', text: 'A tiny hole in the leaf, mostly on the bottom. Carbon dioxide comes in, and oxygen and water vapor go out. Lots of them are called stomata.' },
  guard: { name: 'Guard cells', text: 'Two bean-shaped cells around each stoma. They open it to let air in, and close it to stop the plant from drying up.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const AIM = {
  slab: { camera: [3.2, 2.4, 7.4], target: [0, -0.2, 0] },
  kitchen: { camera: [0, 1.2, 7.5], target: [0, 0, 0] },
};

const explorer = createExplorer({
  topic: 'leaves',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['epidermis'],
  greeting: 'A leaf is a food factory! It needs three things. Can you give it all three?',
  allPartsLine: 'All 9 parts! You know how a leaf makes food.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const sunLight = new THREE.DirectionalLight(0xfff2c0, 0);
sunLight.position.set(-2, 8, 2);
scene.add(sunLight);

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });

const skinMat = mat(0xdff3cc, { transparent: true, opacity: 0.6, depthWrite: false });
const palisadeMat = mat(0x6cc063, { transparent: true, opacity: 0.75 });
const chloroMat = mat(0x2e8b3a, { emissive: 0x1d6b22, emissiveIntensity: 0 });
const spongyMat = mat(0x9fd67e, { transparent: true, opacity: 0.8 });
const veinMat = mat(0xc9e8b0, { transparent: true, opacity: 0.45, depthWrite: false });
const xylemMat = mat(0x5b8def, { emissive: 0x15306b });
const phloemMat = mat(0xff9f43, { emissive: 0x6b3500 });
const guardMat = mat(0x4fae4a);
const holeMat = mat(0x24402a);
const waterMat = mat(0x8fd0ff, { emissive: 0x2a6aa8 });
const co2Mat = mat(0x8a8f99, { emissive: 0x2a2e36 });
const o2Mat = mat(0xe6fbff, { emissive: 0x6fb6c8 });
const sugarMat = mat(0xffd36b, { emissive: 0x8a5200 });
const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false });

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function instanced(geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  transforms.forEach((m, i) => mesh.setMatrixAt(i, m));
  return mesh;
}
const place = (p, s = v(1, 1, 1), q = new THREE.Quaternion()) => new THREE.Matrix4().compose(p, q, s);

// Little things moving along paths. Each flow has a kind, and shows only
// when the leaf can do that job right now.
const flows = [];
function flow(parent, points, kind, material, { count = 4, radius = 0.06, speed = 0.16 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), material, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  parent.add(mesh);
  flows.push({ curve: curveOf(points), mesh, count, kind, speed, offset: Math.random(), parent });
}

// ---------- View 1: a slice of leaf ----------

const slab = new THREE.Group();
scene.add(slab);

const W = 6.4;
const D = 3;
const TOP = 1.15;
const BOTTOM = -1.0;

// Top and bottom skin: a layer of flat, clear cells.
const skinCells = [];
for (let x = -W / 2 + 0.25; x < W / 2; x += 0.5) {
  for (let z = -D / 2 + 0.25; z < D / 2; z += 0.5) {
    skinCells.push(place(v(x, TOP, z)));
    skinCells.push(place(v(x, BOTTOM, z)));
  }
}
slab.add(tagPart(instanced(new THREE.BoxGeometry(0.47, 0.2, 0.47), skinMat, skinCells), 'epidermis'));

// Food-making cells: tall columns, each with chloroplasts around its edge.
const columns = [];
const chloros = [];
const PALISADE = [];
for (let x = -W / 2 + 0.22; x < W / 2; x += 0.42) {
  for (let z = -D / 2 + 0.22; z < D / 2; z += 0.42) {
    columns.push(place(v(x, 0.6, z)));
    PALISADE.push(v(x, 0.6, z));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + x;
      chloros.push(place(v(x + Math.cos(a) * 0.14, 0.6 + rand(-0.25, 0.25), z + Math.sin(a) * 0.14), v(0.05, 0.08, 0.05)));
    }
  }
}
slab.add(tagPart(instanced(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), palisadeMat, columns), 'palisade'));
slab.add(tagPart(instanced(new THREE.SphereGeometry(1, 8, 6), chloroMat, chloros), 'chloroplast'));

// Spongy layer: loose round cells, leaving room for air. Keep clear of the vein.
const VEIN_X = 1.1;
const VEIN_Y = -0.35;
const blobs = [];
for (let i = 0; i < 90; i++) {
  const p = v(rand(-W / 2 + 0.2, W / 2 - 0.2), rand(-0.75, 0.05), rand(-D / 2 + 0.2, D / 2 - 0.2));
  if (Math.abs(p.x - VEIN_X) < 0.6) continue;
  const r = rand(0.15, 0.22);
  blobs.push(place(p, v(r, r * 0.85, r)));
}
slab.add(tagPart(instanced(new THREE.SphereGeometry(1, 12, 8), spongyMat, blobs), 'spongy'));

// The vein runs from front to back, with xylem on top and phloem below.
const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, D, 24, 1, true).rotateX(Math.PI / 2), veinMat);
vein.position.set(VEIN_X, VEIN_Y, 0);
slab.add(tagPart(vein, 'vein'));
const tubeAlongZ = (x, y, r, material) => {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, D, 12).rotateX(Math.PI / 2), material);
  t.position.set(x, y, 0);
  return t;
};
[[-0.18, 0.18], [0, 0.22], [0.18, 0.18]].forEach(([dx, dy]) => slab.add(tagPart(tubeAlongZ(VEIN_X + dx, VEIN_Y + dy, 0.09, xylemMat), 'xylem')));
[[-0.15, -0.2], [0.05, -0.24], [0.22, -0.16]].forEach(([dx, dy]) => slab.add(tagPart(tubeAlongZ(VEIN_X + dx, VEIN_Y + dy, 0.065, phloemMat), 'phloem')));

// Stomata on the underside: a hole between two guard cells that bend apart.
const STOMATA = [v(-2.2, BOTTOM - 0.02, 0.4), v(-0.6, BOTTOM - 0.02, -0.6), v(2.4, BOTTOM - 0.02, 0.5)];
const guards = [];
const holes = [];
STOMATA.forEach((s) => {
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20).rotateX(Math.PI / 2).scale(0.5, 1, 1.4), holeMat);
  hole.position.copy(s).add(v(0, -0.11, 0));
  slab.add(tagPart(hole, 'stoma'));
  holes.push(hole);
  [-1, 1].forEach((side) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 8, 16, Math.PI).rotateX(Math.PI / 2).rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2), guardMat);
    g.position.copy(s).add(v(0, -0.11, 0));
    g.userData.side = side;
    slab.add(tagPart(g, 'guard'));
    guards.push(g);
  });
});

// Sunbeams shining down from above.
const rays = [];
for (let i = 0; i < 9; i++) {
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), rayMat);
  ray.position.set(-2.8 + i * 0.7, TOP + 1.5, rand(-1, 1));
  ray.rotation.z = -0.35;
  ray.visible = false;
  slab.add(ray);
  rays.push(ray);
}

// The flows. Carbon dioxide comes in through a stoma and drifts up to a
// food-making cell; oxygen and water vapor go out the same way; water comes
// up from the xylem; sugar goes down into the phloem.
for (let i = 0; i < 9; i++) {
  const s = STOMATA[i % 3];
  const cell = pick(PALISADE);
  const inside = v(s.x + rand(-0.3, 0.3), -0.4, s.z + rand(-0.3, 0.3));
  flow(slab, [s.clone().add(v(rand(-0.4, 0.4), -1.6, rand(-0.3, 0.3))), s.clone().add(v(0, -0.2, 0)), s.clone().add(v(0, 0.2, 0)), inside, cell], 'co2', co2Mat);
  const cell2 = pick(PALISADE);
  flow(slab, [cell2, v(s.x + rand(-0.3, 0.3), -0.3, s.z), s.clone().add(v(0, 0.2, 0)), s.clone().add(v(0, -0.2, 0)), s.clone().add(v(rand(-0.6, 0.6), -1.8, rand(-0.4, 0.4)))], 'o2', o2Mat);
  const near = PALISADE.filter((p) => Math.abs(p.x - VEIN_X) < 1.4);
  flow(slab, [v(VEIN_X, VEIN_Y + 0.2, rand(-1, 1)), v(VEIN_X + rand(-0.3, 0.3), 0.15, rand(-1, 1)), pick(near)], 'water', waterMat, { count: 3 });
  flow(slab, [pick(near), v(VEIN_X + rand(-0.3, 0.3), 0.1, rand(-1, 1)), v(VEIN_X, VEIN_Y - 0.2, rand(-1, 1))], 'sugar', sugarMat, { count: 3 });
}

addLabel('epidermis', slab, v(-W / 2 - 0.2, TOP + 0.3, D / 2));
addLabel('palisade', slab, v(-1.6, 0.7, D / 2 + 0.25));
addLabel('spongy', slab, v(-1.6, -0.4, D / 2 + 0.25));
addLabel('vein', slab, v(VEIN_X, VEIN_Y + 0.7, D / 2 + 0.2));
addLabel('xylem', slab, v(VEIN_X + 0.75, VEIN_Y + 0.2, D / 2 + 0.1));
addLabel('phloem', slab, v(VEIN_X + 0.75, VEIN_Y - 0.25, D / 2 + 0.1));
addLabel('stoma', slab, STOMATA[0].clone().add(v(0, -0.45, 0)));
addLabel('guard', slab, STOMATA[2].clone().add(v(0.4, -0.4, 0)));

// ---------- View 2: inside a chloroplast ----------

const kitchen = new THREE.Group();
kitchen.visible = false;
scene.add(kitchen);

const shell = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 2.6, 8, 32).rotateZ(Math.PI / 2),
  mat(0x8fd47a, { transparent: true, opacity: 0.35, depthWrite: false }));
kitchen.add(tagPart(shell, 'chloroplast'));
// Stacks of green discs (where sunlight is trapped), joined by thin sheets.
const discs = [];
[-1.6, -0.8, 0, 0.8, 1.6].forEach((x, i) => {
  const z = i % 2 ? 0.35 : -0.35;
  const y = i % 2 ? -0.25 : 0.25;
  for (let k = 0; k < 6; k++) discs.push(place(v(x, y - 0.3 + k * 0.12, z)));
});
kitchen.add(tagPart(instanced(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 24), chloroMat, discs), 'chloroplast'));
for (let i = 0; i < 4; i++) {
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.18), chloroMat);
  sheet.position.set(-1.2 + i * 0.8, 0, 0);
  sheet.rotation.z = i % 2 ? 0.55 : -0.55;
  kitchen.add(sheet);
}

const kitchenRays = [];
for (let i = 0; i < 5; i++) {
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), rayMat);
  ray.position.set(-1.6 + i * 0.8, 2.6, 0);
  ray.rotation.z = -0.3;
  ray.visible = false;
  kitchen.add(ray);
  kitchenRays.push(ray);
}
for (let i = 0; i < 3; i++) {
  const z = rand(-0.3, 0.3);
  flow(kitchen, [v(-4.2, -0.4 + i * 0.4, z), v(-2.6, -0.2 + i * 0.2, z), v(rand(-1, 1), 0, z)], 'water', waterMat, { radius: 0.12, count: 3, speed: 0.2 });
  flow(kitchen, [v(4.2, 0.4 - i * 0.4, z), v(2.6, 0.2 - i * 0.2, z), v(rand(-1, 1), 0, z)], 'co2', co2Mat, { radius: 0.12, count: 3, speed: 0.2 });
  flow(kitchen, [v(rand(-1, 0), 0, z), v(-1.4, -1.2, z), v(-2.4, -2.6, z)], 'sugar', sugarMat, { radius: 0.13, count: 3, speed: 0.2 });
  flow(kitchen, [v(rand(0, 1), 0, z), v(1.4, -1.2, z), v(2.4, -2.6, z)], 'o2', o2Mat, { radius: 0.12, count: 3, speed: 0.2 });
}

// Name tags for what goes in and out, always on in this view.
[['💧 Water in', v(-3.8, 0.7, 0)], ['💨 Carbon dioxide in', v(3.8, 0.9, 0)], ['🍬 Sugar out', v(-2.6, -2.9, 0)], ['🫧 Oxygen out', v(2.6, -2.9, 0)], ['☀️ Sunlight', v(0, 3.3, 0)]]
  .forEach(([text, at]) => {
    const tag = makeLabel(text);
    tag.position.copy(at);
    kitchen.add(tag);
  });

// ---------- Controls ----------

const state = { view: 'slab', sun: false, water: true, dry: false, night: false, open: 1, cooking: 0, airTime: 0 };
const levelCard = document.getElementById('level-card');

const stomataOpen = () => !state.dry && !state.night;
const hasSun = () => state.sun && !state.night;
const making = () => hasSun() && state.water && stomataOpen();

function showRecipe() {
  const mark = (ok, id, text) => { document.getElementById(id).textContent = `${ok ? '✅' : '⬜'} ${text}`; };
  mark(hasSun(), 'r-sun', '☀️ Sunlight');
  mark(state.water, 'r-water', '💧 Water');
  mark(stomataOpen(), 'r-co2', '💨 Carbon dioxide');
  document.getElementById('recipe-out').innerHTML = making()
    ? '<b>Cooking!</b> 🍬 sugar and 🫧 oxygen'
    : '<b>Makes:</b> 🍬 sugar and 🫧 oxygen';
}

function aim() {
  const { camera: c, target: t } = AIM[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  slab.visible = key === 'slab';
  kitchen.visible = key === 'kitchen';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  if (b.dataset.view === 'kitchen') {
    levelCard.textContent = 'Water comes in from the left, carbon dioxide from the right. Sunlight shines in from above.';
    if (complete('kitchen')) cello.say('We’re inside a chloroplast! The green discs trap sunlight to cook up sugar.', { mood: 'wow', ms: 5500 });
  } else {
    levelCard.textContent = 'A slice of leaf. Sunlight comes from the top. Air comes in from the bottom.';
  }
}));

bindToggle('sun', (on) => {
  state.sun = on;
  showRecipe();
  if (on && state.night) cello.say('It’s night! Turn off Night to let the sun shine.', { ms: 4000 });
  else if (on && !making()) cello.say('Sunshine! Now what else does the leaf need?', { ms: 3500, important: false });
});

bindToggle('water', (on) => {
  state.water = on;
  showRecipe();
  cello.say(on ? 'Water comes up the xylem, all the way from the roots.' : 'No water! The leaf can’t make food without it.', { ms: 3500, important: false });
});

bindToggle('dry', (on) => {
  state.dry = on;
  showRecipe();
  if (!on) {
    cello.say('Cooler now. The guard cells open the stomata again.', { ms: 3500, important: false });
    return;
  }
  levelCard.textContent = 'Hot and dry: the guard cells close the stomata to save water. But now no carbon dioxide can get in.';
  if (complete('dry')) cello.say('The guard cells shut the doors! That saves water, but the leaf can’t get carbon dioxide.', { mood: 'wow', ms: 6000 });
});

bindToggle('night', (on) => {
  state.night = on;
  showRecipe();
  if (!on) return;
  levelCard.textContent = 'At night there’s no sunlight, so no food is made. Most stomata close too.';
  if (complete('night')) cello.say('Night time! No sunlight, no cooking. The leaf rests until morning.', { mood: 'wow', ms: 5000 });
});

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const ease = (dt, rate) => 1 - Math.exp(-dt * rate);
let rayTime = 0;

stage.onFrame((dt) => {
  // Guard cells swell apart to open a stoma, and lie flat together to close it.
  state.open += ((stomataOpen() ? 1 : 0) - state.open) * ease(dt, 3);
  guards.forEach((g) => {
    const s = STOMATA[Math.floor(guards.indexOf(g) / 2)];
    g.position.x = s.x + g.userData.side * (0.04 + state.open * 0.08);
  });
  holes.forEach((h) => h.scale.set(0.15 + state.open * 0.85, 1, 1));

  const sun = hasSun();
  sunLight.intensity += ((sun ? 2.4 : 0) - sunLight.intensity) * ease(dt, 3);
  rayTime += dt;
  [...rays, ...kitchenRays].forEach((r, i) => {
    r.visible = sun;
    r.material.opacity = 0.35 + Math.sin(rayTime * 3 + i) * 0.2;
  });
  const cooking = making();
  chloroMat.emissiveIntensity += ((cooking ? 0.6 : 0) - chloroMat.emissiveIntensity) * ease(dt, 2);

  const showing = { co2: state.open > 0.5, o2: cooking, sugar: cooking, water: state.water };
  flows.forEach((f) => {
    const on = f.parent.visible && showing[f.kind];
    f.mesh.visible = on;
    if (!on) return;
    f.offset = (f.offset + dt * f.speed) % 1;
    for (let i = 0; i < f.count; i++) {
      f.curve.getPointAt((i / f.count + f.offset) % 1, p);
      f.mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
    }
    f.mesh.instanceMatrix.needsUpdate = true;
  });

  if (showing.co2) {
    state.airTime += dt;
    if (state.airTime > 4 && complete('air')) {
      cello.say('Sneaky! Carbon dioxide from the air comes in through the stomata, on the bottom of the leaf.', { mood: 'wow', ms: 5500 });
    }
  }
  if (cooking) {
    state.cooking += dt;
    if (state.cooking > 2.5 && complete('food')) {
      levelCard.textContent = 'Photosynthesis! Sunlight + water + carbon dioxide → sugar + oxygen.';
      cello.say('You made food! Sugar goes into the phloem, and oxygen floats out through the stomata.', { mood: 'wow', ms: 6000 });
    }
  }
});

showRecipe();
setView('slab');
