import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// How materials move in a plant. A tree with tubes inside: rain soaks the
// soil and water climbs the xylem from the roots to the leaves; with sunshine
// too, the leaves make sugar and the phloem carries it to the roots and the
// fruit. Cut the trunk open to see the tubes. Leaves let water vapor out, and
// droop when the soil dries.

const PARTS = {
  roots: { name: 'Roots', text: 'They hold the tree in the ground and soak up water and minerals from the soil.' },
  bark: { name: 'Bark', text: 'The tough outside of the trunk. It protects the tree, like a coat of armor.' },
  trunk: { name: 'Trunk (stem)', text: 'A tree’s trunk is its big, woody stem. It holds the branches up high. Tubes inside carry water up and food down.' },
  xylem: { name: 'Water tubes (xylem)', text: 'Tubes that carry water and minerals up, from the roots, through the trunk, to every leaf. They’re blue here, so you can follow them.' },
  phloem: { name: 'Food tubes (phloem)', text: 'Tubes that carry food (sugar) from the leaves to every part of the tree that needs it: the roots, the trunk, and the fruit. Orange here.' },
  leaves: { name: 'Leaves', text: 'The tree’s kitchens. They use sunlight, water, and air to make food (sugar).' },
  fruit: { name: 'Fruit', text: 'Fruit holds the seeds. It grows big and sweet with sugar sent from the leaves, through the phloem.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.2, 11.5);
const TARGET_HOME = new THREE.Vector3(0, 0.6, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'planttransport',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['bark', 'trunk'], // when the trunk is cut open, taps reach the tubes inside
  greeting: 'Hi! This tree looks still, but it’s busy inside. Try making it rain!',
  allPartsLine: 'All 7 parts! You know how a tree moves water and food.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const sunLight = new THREE.DirectionalLight(0xfff2c0, 0);
sunLight.position.set(-4, 7, 3);
scene.add(sunLight);

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

const soilDry = new THREE.Color(0xc08a58);
const soilWet = new THREE.Color(0x7a4a26);
const soilMat = mat(0xc08a58, { transparent: true, opacity: 0.45, depthWrite: false });
const grassMat = mat(0x7cc35a, { transparent: true, opacity: 0.85 });
const barkMat = mat(0x7a5233, { roughness: 0.9 });
const woodMat = mat(0xe9c98f, { transparent: true, opacity: 0.25, depthWrite: false });
const rootMat = mat(0x9b6a40, { roughness: 0.9 });
const leafFresh = new THREE.Color(0x4cb050);
const leafDry = new THREE.Color(0xb3a447);
const leafMat = mat(0x4cb050, { side: THREE.DoubleSide, emissive: 0x2a8a2a, emissiveIntensity: 0 });
const fruitMat = mat(0xe8443a, { roughness: 0.35 });
const xylemMat = mat(0x5b8def, { emissive: 0x15306b });
const phloemMat = mat(0xff9f43, { emissive: 0x6b3500 });
const waterMat = mat(0x8fd0ff, { emissive: 0x2a6aa8 });
const sugarMat = mat(0xffd36b, { emissive: 0x8a5200 });
const vaporMat = mat(0xffffff, { transparent: true, opacity: 0.55, depthWrite: false, emissive: 0x8899aa });
const rainMat = mat(0x9fd6ff, { transparent: true, opacity: 0.8, emissive: 0x2a5a88 });

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (curve, radius, material) =>
  new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 8, false), material);

// Little things moving along a path: water, sugar, vapor.
const m = new THREE.Matrix4();
const flows = [];
function flow(curve, { count, material, radius, group }) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(radius, 10, 8), material, count);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  const f = { curve, mesh, count, offset: Math.random(), group };
  flows.push(f);
  return f;
}

// ---------- Ground ----------

const GROUND = -1.2;
const soil = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.4, 3.4), soilMat);
soil.position.y = GROUND - 1.2;
soil.renderOrder = 2;
scene.add(soil);
const grass = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.06, 3.4), grassMat);
grass.position.y = GROUND;
scene.add(grass);

// ---------- The tree ----------

const tree = new THREE.Group();
scene.add(tree);

// Inside parts show only when the trunk is cut open.
const inside = new THREE.Group();
inside.visible = false;
tree.add(inside);

const TRUNK_TOP = 1.5;
const bark = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, TRUNK_TOP - GROUND, 24), barkMat);
bark.position.y = (TRUNK_TOP + GROUND) / 2;
tree.add(tagPart(bark, 'bark'));
const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.38, TRUNK_TOP - GROUND, 24), woodMat);
wood.position.copy(bark.position);
inside.add(tagPart(wood, 'trunk'));

const CROWNS = [v(-1.55, 2.7, 0.3), v(1.5, 2.9, 0.1), v(0.1, 3.55, -0.2), v(-0.7, 3.2, -0.9), v(0.85, 2.55, 0.9)];
const ROOT_TIPS = [v(-2.5, -2.9, 0.5), v(2.4, -3.0, -0.3), v(-1.0, -3.25, -0.9), v(1.1, -3.1, 1.0), v(0.2, -3.35, 0.2)];

// A branch: out from the top of the trunk to a crown of leaves.
const branchCurves = CROWNS.map((c) => curveOf([v(0, TRUNK_TOP - 0.3, 0), v(c.x * 0.35, TRUNK_TOP + 0.35, c.z * 0.35), c]));
branchCurves.forEach((curve) => tree.add(tagPart(tube(curve, 0.11, barkMat), 'trunk')));

const rootCurves = ROOT_TIPS.map((t) => curveOf([v(0, GROUND + 0.15, 0), v(t.x * 0.45, GROUND - 0.5, t.z * 0.45), t]));
rootCurves.forEach((curve) => {
  tree.add(tagPart(tube(curve, 0.09, rootMat), 'roots'));
  // Little side roots, for the look of it.
  for (let k = 1; k <= 2; k++) {
    const a = curve.getPointAt(k / 3);
    const out = a.clone().add(v((Math.random() - 0.5) * 0.9, -0.5, (Math.random() - 0.5) * 0.9));
    tree.add(tagPart(tube(curveOf([a, a.clone().lerp(out, 0.5).add(v(0, 0.1, 0)), out]), 0.035, rootMat), 'roots'));
  }
});

// Leaves: a cloud of leaves around each crown. Each one keeps a fresh pose
// and a droopy pose, and slides between them as the tree dries out.
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.18, 0.18, 0, 0.45);
  s.quadraticCurveTo(-0.18, 0.18, 0, 0);
  return new THREE.ShapeGeometry(s, 6).rotateX(Math.PI / 2); // points along +z
}
const leafGeo = leafGeometry();
const leaves = [];
const look = new THREE.Object3D();
CROWNS.forEach((c) => {
  const crown = new THREE.Group();
  crown.position.copy(c);
  tree.add(crown);
  for (let i = 0; i < 44; i++) {
    const dir = new THREE.Vector3().randomDirection();
    dir.y = Math.abs(dir.y) * 0.8 + 0.1;
    dir.normalize();
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.copy(dir).multiplyScalar(0.3 + Math.random() * 0.5);
    look.position.copy(leaf.position);
    look.lookAt(leaf.position.clone().add(dir));
    const fresh = look.quaternion.clone();
    look.lookAt(leaf.position.clone().add(v(dir.x * 0.4, -1, dir.z * 0.4)));
    const droopy = look.quaternion.clone();
    leaf.quaternion.copy(fresh);
    crown.add(tagPart(leaf, 'leaves'));
    leaves.push({ leaf, fresh, droopy });
  }
});

// Fruit hangs below three of the crowns.
const FRUITS = [0, 1, 4].map((i) => CROWNS[i].clone().add(v(0.15, -0.55, 0.3)));
FRUITS.forEach((p) => {
  const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), fruitMat);
  fruit.position.copy(p);
  tree.add(tagPart(fruit, 'fruit'));
});

// ---------- The tubes ----------

// Xylem runs near the middle of the trunk, phloem near the bark. Each tube
// goes from a root tip, up the trunk, and out along a branch to a crown.
function tubePath(i, radius, rootIndex) {
  const a = (i / CROWNS.length) * Math.PI * 2;
  const at = (y, r) => v(Math.cos(a) * r, y, Math.sin(a) * r);
  const root = rootCurves[rootIndex];
  const branch = branchCurves[i];
  return [
    ROOT_TIPS[rootIndex], root.getPointAt(0.5),
    at(GROUND - 0.1, radius * 1.4), at(GROUND + 0.5, radius * 1.25), at(TRUNK_TOP - 0.5, radius),
    branch.getPointAt(0.4), branch.getPointAt(0.75), CROWNS[i],
  ];
}

const xylemCurves = CROWNS.map((c, i) => curveOf(tubePath(i, 0.09, i)));
const phloemCurves = CROWNS.map((c, i) => curveOf(tubePath(i, 0.22, (i + 2) % ROOT_TIPS.length).reverse()));
const fruitCurves = FRUITS.map((p, k) => {
  const c = CROWNS[[0, 1, 4][k]];
  return curveOf([c, c.clone().lerp(p, 0.5).add(v(0.08, 0.05, 0)), p]);
});

xylemCurves.forEach((curve) => inside.add(tagPart(tube(curve, 0.025, xylemMat), 'xylem')));
[...phloemCurves, ...fruitCurves].forEach((curve) => inside.add(tagPart(tube(curve, 0.025, phloemMat), 'phloem')));

xylemCurves.forEach((curve) => flow(curve, { count: 14, material: waterMat, radius: 0.05, group: 'water' }));
phloemCurves.forEach((curve) => flow(curve, { count: 12, material: sugarMat, radius: 0.05, group: 'sugar' }));
fruitCurves.forEach((curve) => flow(curve, { count: 3, material: sugarMat, radius: 0.05, group: 'sugar' }));

// Water vapor drifts out of the leaves.
CROWNS.forEach((c) => {
  const out = v(c.x, 0, c.z).normalize().multiplyScalar(0.8);
  flow(curveOf([c, c.clone().add(out).add(v(0, 1, 0)), c.clone().add(out.multiplyScalar(1.6)).add(v(0, 2.2, 0))]),
    { count: 5, material: vaporMat, radius: 0.09, group: 'vapor' });
});

// ---------- Rain ----------

const DROPS = 180;
const rain = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 5), rainMat, DROPS);
rain.frustumCulled = false;
rain.visible = false;
scene.add(rain);
const drops = Array.from({ length: DROPS }, () => v((Math.random() - 0.5) * 7, GROUND + Math.random() * 7, (Math.random() - 0.5) * 3));

// ---------- Labels ----------

addLabel('roots', tree, ROOT_TIPS[0].clone().add(v(0, -0.25, 0)));
addLabel('bark', tree, v(-0.55, 0, 0.3));
addLabel('trunk', inside, v(0.5, -0.3, 0.3), { hideWith: inside });
addLabel('xylem', inside, v(-0.6, 0.9, 0.4), { hideWith: inside });
addLabel('phloem', inside, v(0.65, 0.6, 0.4), { hideWith: inside });
addLabel('leaves', tree, CROWNS[2].clone().add(v(0, 0.75, 0)));
addLabel('fruit', tree, FRUITS[1].clone().add(v(0.35, -0.15, 0)));

// ---------- Controls ----------

const state = {
  rain: false, sun: false, speed: 4,
  wet: 1, // how wet the soil is, 0 to 1; it starts damp
  rained: false,
  water: 1, // how much water the tree holds; the leaves droop as it runs out
  climbing: 0, making: 0, // seconds of water climbing, and of food making
};
const levelCard = document.getElementById('level-card');

bindToggle('rain', (on) => {
  state.rain = on;
  state.rained ||= on;
  rain.visible = on;
  if (on) {
    cello.say(document.getElementById('cut').getAttribute('aria-pressed') === 'true'
      ? 'Splash! The roots drink up the water. Watch it climb the blue tubes!'
      : 'Splash! Water is climbing inside the tree. Cut the trunk open to see it!', { ms: 4500 });
  } else {
    cello.say('The rain stopped. The soil will slowly dry out.', { ms: 3500, important: false });
  }
});

bindToggle('sun', (on) => {
  state.sun = on;
  if (on && state.water < 0.4) cello.say('Sunny! But the leaves need water to make food. Make it rain!', { ms: 4500 });
  else if (on) cello.say('Sunshine! The leaves can start making food.', { ms: 3000, important: false });
  else cello.say('No sun, no food making. The leaves rest.', { ms: 3000, important: false });
});

bindToggle('cut', (on) => {
  inside.visible = on;
  barkMat.transparent = on;
  barkMat.opacity = on ? 0.18 : 1;
  barkMat.depthWrite = !on;
  barkMat.needsUpdate = true;
  explorer.showLabels();
  if (!on) return;
  levelCard.textContent = 'Blue tubes carry water up (xylem). Orange tubes carry food (phloem). Real ones aren’t colored!';
  if (complete('cut')) cello.say('Look inside! Two kinds of tubes: xylem for water and phloem for food.', { mood: 'wow', ms: 5500 });
});

bindSlider('speed', (value) => (value <= 3 ? 'slow' : value >= 8 ? 'zoom!' : 'medium'), (value) => {
  state.speed = value;
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const p = new THREE.Vector3();
const ease = (dt, rate) => 1 - Math.exp(-dt * rate);

function moveFlow(f, dt, visible) {
  f.mesh.visible = visible;
  if (!visible) return;
  f.offset = (f.offset + dt * state.speed * 0.025) % 1;
  for (let i = 0; i < f.count; i++) {
    const t = (i / f.count + f.offset) % 1;
    f.curve.getPointAt(t, p);
    const s = f.group === 'vapor' ? 0.5 + t : 1;
    m.makeScale(s, s, s).setPosition(p);
    f.mesh.setMatrixAt(i, m);
  }
  f.mesh.instanceMatrix.needsUpdate = true;
}

stage.onFrame((dt) => {
  // Rain falls and soaks the soil; without it, the soil slowly dries.
  if (state.rain) {
    drops.forEach((d, i) => {
      d.y -= dt * 7;
      if (d.y < GROUND) d.y += 7;
      m.makeTranslation(d.x, d.y, d.z);
      rain.setMatrixAt(i, m);
    });
    rain.instanceMatrix.needsUpdate = true;
  }
  state.wet += ((state.rain ? 1 : 0) - state.wet) * ease(dt, state.rain ? 0.8 : 0.07);
  soilMat.color.copy(soilDry).lerp(soilWet, state.wet);

  // The tree drinks while the soil is wet, and dries out when it isn't.
  const drinking = state.wet > 0.2;
  state.water += ((drinking ? 1 : 0) - state.water) * ease(dt, drinking ? 0.6 : 0.15);
  const droop = THREE.MathUtils.smoothstep(1 - state.water, 0.3, 0.9);
  leaves.forEach(({ leaf, fresh, droopy }) => leaf.quaternion.slerpQuaternions(fresh, droopy, droop));
  leafMat.color.copy(leafFresh).lerp(leafDry, droop);

  const making = state.sun && state.water > 0.5;
  sunLight.intensity += ((state.sun ? 2.6 : 0) - sunLight.intensity) * ease(dt, 3);
  leafMat.emissiveIntensity += ((making ? 0.35 : 0) - leafMat.emissiveIntensity) * ease(dt, 2);

  flows.forEach((f) => moveFlow(f, dt, f.group === 'water' ? drinking : making));

  if (drinking && state.rain) {
    state.climbing += dt;
    if (state.climbing > 4 && complete('water')) {
      cello.say('Up, up, up! The xylem carries water from the roots all the way to the leaves.', { mood: 'wow', ms: 5500 });
    }
  }
  if (making) {
    state.making += dt;
    if (state.making > 3 && complete('food')) {
      levelCard.textContent = 'The leaves make sugar. The phloem carries it down to the roots and out to the fruit.';
      cello.say('Yum! The leaves made sugar. The phloem takes it down to the roots and into the fruit.', { mood: 'wow', ms: 6000 });
    }
    if (state.making > 9 && complete('vapor')) {
      levelCard.textContent = 'Leaves let water out as vapor. That pulls more water up the xylem, like a straw!';
      cello.say('See the puffs? Leaves let out water vapor. That pulls more water up, like sipping a straw!', { mood: 'wow', ms: 6500 });
    }
  }
  if (droop > 0.7 && state.rained && complete('droop')) {
    cello.say('Oh no, the leaves are drooping! No water in the soil means no water in the tubes. Make it rain!', { mood: 'wow', ms: 6000 });
  }
});
