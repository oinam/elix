import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createMascot, celebrate } from './mascot.js';
import { loadProgress, saveProgress, clearProgress } from './progress.js';

// ---------- Kid-friendly descriptions of each part ----------

const PARTS = {
  membrane: {
    name: 'Cell membrane',
    text: 'A soft, stretchy skin that holds everything inside. It is firm enough to keep the slipper shape, but it can still bend.',
  },
  cytoplasm: {
    name: 'Cytoplasm',
    text: 'The jelly that fills the cell. All the other parts float in it.',
  },
  cilia: {
    name: 'Cilia',
    text: 'Thousands of tiny hairs. They row together in waves, like oars on a boat, to make it swim. They also sweep food into the mouth.',
  },
  groove: {
    name: 'Oral groove',
    text: 'A dip on the side, like a funnel. The cilia here sweep food down toward the mouth.',
  },
  mouth: {
    name: 'Mouth (cytostome)',
    text: 'Where food goes in. Each bite gets wrapped up into a little bubble called a food vacuole.',
  },
  foodVacuole: {
    name: 'Food vacuole',
    text: 'A tiny stomach bubble. It carries food around the cell while the food is broken down. It shrinks as the food gets used up.',
  },
  macronucleus: {
    name: 'Macronucleus',
    text: 'The big boss! It controls the everyday work of the cell, like eating and growing.',
  },
  micronucleus: {
    name: 'Micronucleus',
    text: 'A small helper. It keeps a spare copy of the cell\'s instructions, used when making new Paramecia.',
  },
  vacuole: {
    name: 'Contractile vacuole',
    text: 'A star-shaped water pump. Pond water keeps sneaking in, so this pump squeezes the extra water out. Without it, the Paramecium would swell up and burst!',
  },
  analPore: {
    name: 'Waste exit (anal pore)',
    text: 'When the food is used up, the leftover waste is pushed out of the cell here.',
  },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const cell = new THREE.Group();
cell.rotation.order = 'YXZ'; // yaw (turn) first, then roll around the body
scene.add(cell);

const pickables = [];
const labels = [];

function addLabel(key, parent, position) {
  const label = makeLabel(PARTS[key].name);
  label.position.copy(position);
  label.visible = false;
  parent.add(label);
  labels.push(label);
  return label;
}

function tagPart(object, key) {
  object.traverse((o) => { o.userData.part = key; });
  pickables.push(object);
}

// ---------- Body shape ----------
// The body is built around the x axis: +x is the front (anterior), -x the back.
// bodyPoint(u, angle) turns "how far along" (u from -1 to 1) and "which way
// around" (angle) into a point on the slipper-shaped surface.

const HALF_LENGTH = 2.2;
const RADIUS = 0.72;

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// The oral groove twists slightly as it runs along the side.
const grooveCenter = (u) => -0.5 * u;

function grooveDepth(u, angle) {
  const along = Math.exp(-(((u - 0.1) / 0.38) ** 2));
  const around = Math.exp(-((wrapAngle(angle - grooveCenter(u)) / 0.45) ** 2));
  return 0.3 * along * around;
}

function bodyPoint(u, angle, target = new THREE.Vector3()) {
  let r = RADIUS * Math.pow(Math.max(0, 1 - u * u), 0.42) * (1 + 0.1 * u);
  r *= 1 - grooveDepth(u, angle);
  return target.set(u * HALF_LENGTH, Math.sin(angle) * r * 0.85, Math.cos(angle) * r);
}

function bodyGeometry() {
  const geo = new THREE.SphereGeometry(1, 128, 72);
  geo.rotateZ(-Math.PI / 2); // poles now point along x
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    bodyPoint(THREE.MathUtils.clamp(p.x, -1, 1), Math.atan2(p.y, p.z), p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geo.computeVertexNormals();
  return geo;
}

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x8fe3cf,
  roughness: 0.35,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
const body = new THREE.Mesh(bodyGeometry(), bodyMaterial);
body.renderOrder = 2;
cell.add(body);
tagPart(body, 'membrane');
addLabel('membrane', cell, bodyPoint(0.55, Math.PI * 0.75).multiplyScalar(1.12));

// ---------- Cytoplasm specks ----------

const speckMaterial = new THREE.PointsMaterial({ size: 0.035 });

{
  const n = 260;
  const positions = new Float32Array(n * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = THREE.MathUtils.randFloat(-0.85, 0.85);
    bodyPoint(u, Math.random() * Math.PI * 2, p).multiplyScalar(Math.random() * 0.8);
    p.x = u * HALF_LENGTH * 0.9;
    positions.set([p.x, p.y, p.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const specks = new THREE.Points(geo, speckMaterial);
  cell.add(specks);
  addLabel('cytoplasm', cell, new THREE.Vector3(-0.9, -0.15, -0.35));
}

// ---------- Cilia ----------
// Each cilium is one instance of a thin rod. Every frame we tilt each rod back
// and forth. Rods further along the body tilt a little later, which makes the
// rowing "wave" that sweeps down the body.

const MAX_CILIA = 2000;
const CILIUM_LENGTH = 0.15;

const ciliumGeo = new THREE.CylinderGeometry(0.004, 0.009, CILIUM_LENGTH, 4, 1);
ciliumGeo.translate(0, CILIUM_LENGTH / 2, 0);
const ciliaMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const cilia = new THREE.InstancedMesh(ciliumGeo, ciliaMaterial, MAX_CILIA);
cilia.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
cilia.frustumCulled = false;
cell.add(cilia);
tagPart(cilia, 'cilia');

const ciliaData = [];
{
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const pu = new THREE.Vector3();
  const pa = new THREE.Vector3();
  const e = 0.01;
  for (let i = 0; i < MAX_CILIA; i++) {
    const u = THREE.MathUtils.randFloat(-0.97, 0.97);
    const angle = Math.random() * Math.PI * 2;
    bodyPoint(u, angle, p);
    const along = bodyPoint(u + e, angle, pu).sub(p).normalize();
    const around = bodyPoint(u, angle + e, pa).sub(p).normalize();
    const normal = new THREE.Vector3().crossVectors(along, around).normalize();
    if (normal.dot(new THREE.Vector3(0, p.y, p.z)) < 0) normal.negate();

    const baseQuat = new THREE.Quaternion().setFromUnitVectors(up, normal);
    // Rock around an axis at right angles to both the surface normal and the
    // body's length, expressed in the cilium's own frame.
    const axis = new THREE.Vector3()
      .crossVectors(normal, along)
      .normalize()
      .applyQuaternion(baseQuat.clone().invert());
    ciliaData.push({ position: p.clone(), u, baseQuat, axis });
  }
}

const ciliaLabel = addLabel('cilia', cell, new THREE.Vector3(1.6, 0.9, 0.3));

// ---------- Oral groove and mouth ----------

const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6f63, roughness: 0.5 });

const groove = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 12, 8),
  new THREE.MeshStandardMaterial({ color: 0x8fe3cf, transparent: true, opacity: 0 }),
);
groove.position.copy(bodyPoint(0.15, grooveCenter(0.15)));
groove.scale.set(6, 4, 2);
cell.add(groove);
tagPart(groove, 'groove');
addLabel('groove', cell, bodyPoint(0.25, grooveCenter(0.25)).multiplyScalar(1.3));

const MOUTH_U = -0.2;
const mouthSurface = bodyPoint(MOUTH_U, grooveCenter(MOUTH_U));
const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 10, 24), darkMaterial);
mouth.position.copy(mouthSurface).multiplyScalar(0.95);
mouth.lookAt(mouthSurface.clone().multiplyScalar(2));
cell.add(mouth);
tagPart(mouth, 'mouth');
addLabel('mouth', cell, mouthSurface.clone().multiplyScalar(1.35).setX(mouthSurface.x - 0.3));

const ANAL_U = -0.68;
const analSurface = bodyPoint(ANAL_U, 0.5);
const analPore = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 18), darkMaterial);
analPore.position.copy(analSurface).multiplyScalar(0.95);
analPore.lookAt(analSurface.clone().multiplyScalar(2));
cell.add(analPore);
tagPart(analPore, 'analPore');
addLabel('analPore', cell, analSurface.clone().multiplyScalar(1.4));

// ---------- Nuclei ----------

const macronucleus = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 24),
  new THREE.MeshStandardMaterial({ color: 0x9a7cf5, roughness: 0.45 }),
);
macronucleus.scale.set(0.55, 0.3, 0.3);
macronucleus.position.set(0.25, 0.1, -0.15);
cell.add(macronucleus);
tagPart(macronucleus, 'macronucleus');
addLabel('macronucleus', cell, new THREE.Vector3(0.25, 0.75, -0.15));

const micronucleus = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 20, 14),
  new THREE.MeshStandardMaterial({ color: 0xf06bd8, roughness: 0.4 }),
);
micronucleus.position.set(0.75, 0.3, -0.12);
cell.add(micronucleus);
tagPart(micronucleus, 'micronucleus');
addLabel('micronucleus', cell, new THREE.Vector3(1.05, 0.7, -0.1));

// ---------- Contractile vacuoles (the water pumps) ----------

const vacuoleMaterial = new THREE.MeshStandardMaterial({
  color: 0x6fc3ff,
  roughness: 0.2,
  emissive: 0x1a4c80,
});

function makeContractileVacuole(x) {
  const group = new THREE.Group();
  group.position.set(x, 0.3, -0.05);
  const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), vacuoleMaterial);
  group.add(bladder);
  const canals = [];
  for (let i = 0; i < 7; i++) {
    const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 0.36, 6), vacuoleMaterial);
    canal.geometry.translate(0, 0.18 + 0.08, 0);
    const holder = new THREE.Group();
    holder.rotation.order = 'YXZ'; // tip over flat, then fan out around the bladder
    holder.rotation.set(Math.PI / 2, (i / 7) * Math.PI * 2, 0);
    holder.add(canal);
    group.add(holder);
    canals.push(canal);
  }
  cell.add(group);
  tagPart(group, 'vacuole');
  return { bladder, canals, phase: 0 };
}

const pumps = [makeContractileVacuole(1.15), makeContractileVacuole(-1.1)];
pumps[1].phase = 0.5; // the two pumps take turns
addLabel('vacuole', cell, new THREE.Vector3(-1.1, 0.8, -0.05));

function updatePumps(dt, period) {
  for (const pump of pumps) {
    pump.phase = (pump.phase + dt / period) % 1;
    const t = pump.phase;
    // Canals slowly fill, then empty into the bladder, which then squeezes shut.
    const canal = t < 0.6 ? 0.6 + 0.9 * (t / 0.6) : 1.5 - 1.1 * ((t - 0.6) / 0.4);
    const bladder = t < 0.6 ? 0.4 + 0.2 * (t / 0.6)
      : t < 0.9 ? 0.6 + 0.8 * ((t - 0.6) / 0.3)
        : 1.4 - 1.0 * ((t - 0.9) / 0.1);
    pump.bladder.scale.setScalar(bladder);
    pump.canals.forEach((c) => c.scale.set(canal, 1, canal));
  }
}

// ---------- Food vacuoles ----------
// Swallowed food travels a loop through the cell, gets digested (changes color
// and shrinks), and the leftovers leave through the anal pore.

const foodPath = new THREE.CatmullRomCurve3([
  mouth.position.clone().multiplyScalar(0.7),
  new THREE.Vector3(-0.9, -0.05, 0.15),
  new THREE.Vector3(-1.45, 0.1, -0.1),
  new THREE.Vector3(-0.7, 0.32, -0.38),
  new THREE.Vector3(0.6, -0.25, -0.3),
  new THREE.Vector3(1.45, 0, 0.05),
  new THREE.Vector3(0.9, -0.3, 0.3),
  new THREE.Vector3(-0.2, -0.38, 0.25),
  new THREE.Vector3(-0.9, -0.2, 0.3),
  analPore.position.clone().multiplyScalar(0.8),
]);

const DIGEST_SECONDS = 16;
const MAX_FOOD_VACUOLES = 14;
const foodVacuoles = [];
const foodVacuoleGeo = new THREE.SphereGeometry(0.1, 16, 12);
const freshFood = new THREE.Color(0x7be05a);
const digestedFood = new THREE.Color(0x8a5a2b);

const foodVacuoleLabel = addLabel('foodVacuole', cell, new THREE.Vector3());

function addFoodVacuole() {
  if (foodVacuoles.length >= MAX_FOOD_VACUOLES) return;
  const mesh = new THREE.Mesh(
    foodVacuoleGeo,
    new THREE.MeshStandardMaterial({ color: freshFood.clone(), roughness: 0.4 }),
  );
  cell.add(mesh);
  tagPart(mesh, 'foodVacuole');
  foodVacuoles.push({ mesh, age: 0 });
  onEat();
}

const wastes = [];
const wasteGeo = new THREE.SphereGeometry(0.04, 8, 6);

function updateFoodVacuoles(dt) {
  for (let i = foodVacuoles.length - 1; i >= 0; i--) {
    const v = foodVacuoles[i];
    v.age += dt;
    const t = Math.min(v.age / DIGEST_SECONDS, 1);
    foodPath.getPointAt(t, v.mesh.position);
    v.mesh.material.color.copy(freshFood).lerp(digestedFood, Math.min(t * 1.4, 1));
    v.mesh.scale.setScalar(1.25 - 0.8 * t);
    if (t >= 1) {
      cell.remove(v.mesh);
      v.mesh.material.dispose();
      pickables.splice(pickables.indexOf(v.mesh), 1);
      foodVacuoles.splice(i, 1);
      spitWaste();
    }
  }
  const oldest = foodVacuoles[0];
  foodVacuoleLabel.element.style.opacity = oldest ? 1 : 0;
  if (oldest) foodVacuoleLabel.position.copy(oldest.mesh.position).add(new THREE.Vector3(0, 0.3, 0));
}

function spitWaste() {
  const mesh = new THREE.Mesh(
    wasteGeo,
    new THREE.MeshStandardMaterial({ color: digestedFood, transparent: true }),
  );
  analPore.getWorldPosition(mesh.position);
  scene.add(mesh);
  const out = analPore.getWorldDirection(new THREE.Vector3());
  wastes.push({ mesh, velocity: out.multiplyScalar(0.5), life: 3 });
}

function updateWastes(dt) {
  for (let i = wastes.length - 1; i >= 0; i--) {
    const w = wastes[i];
    w.life -= dt;
    w.mesh.position.addScaledVector(w.velocity, dt);
    w.velocity.multiplyScalar(0.98);
    w.mesh.material.opacity = Math.max(w.life / 3, 0);
    if (w.life <= 0) {
      scene.remove(w.mesh);
      w.mesh.material.dispose();
      wastes.splice(i, 1);
    }
  }
}

// ---------- Food in the water (bacteria and yeast) ----------

const foodGeo = new THREE.CapsuleGeometry(0.035, 0.07, 4, 8);
const foodColors = [0x9be15d, 0xd7e35a, 0x6ed38a];
const foods = [];
const MAX_FOODS = 60;

function dropFood() {
  const center = cell.position;
  for (let i = 0; i < 12 && foods.length < MAX_FOODS; i++) {
    const mesh = new THREE.Mesh(
      foodGeo,
      new THREE.MeshStandardMaterial({ color: foodColors[i % foodColors.length], roughness: 0.5 }),
    );
    const angle = Math.random() * Math.PI * 2;
    const distance = THREE.MathUtils.randFloat(1.4, 3.2);
    mesh.position.set(
      center.x + Math.cos(angle) * distance,
      center.y + THREE.MathUtils.randFloat(-1, 1),
      center.z + Math.sin(angle) * distance,
    );
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    scene.add(mesh);
    foods.push({ mesh, spin: new THREE.Vector3().randomDirection().multiplyScalar(2) });
  }
}

const mouthWorld = new THREE.Vector3();
const toMouth = new THREE.Vector3();
const swirl = new THREE.Vector3();
const bodyAxis = new THREE.Vector3();

function updateFoods(dt, power) {
  mouth.getWorldPosition(mouthWorld);
  bodyAxis.set(1, 0, 0).applyQuaternion(cell.quaternion);
  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    const pos = f.mesh.position;
    // Tiny random wobble, like real things floating in water.
    pos.x += (Math.random() - 0.5) * 0.02;
    pos.y += (Math.random() - 0.5) * 0.02;
    pos.z += (Math.random() - 0.5) * 0.02;
    f.mesh.rotation.x += f.spin.x * dt;
    f.mesh.rotation.y += f.spin.y * dt;

    toMouth.subVectors(mouthWorld, pos);
    const distance = toMouth.length();
    if (power > 0 && distance < 2.8) {
      // The cilia make a whirlpool that pulls food toward the mouth.
      const pull = (power * 1.6) / (distance + 0.35);
      swirl.crossVectors(toMouth, bodyAxis).normalize().multiplyScalar(pull * 0.35);
      pos.addScaledVector(toMouth.normalize(), pull * dt);
      pos.addScaledVector(swirl, dt);
    }
    if (distance < 0.16) {
      scene.remove(f.mesh);
      f.mesh.material.dispose();
      foods.splice(i, 1);
      addFoodVacuole();
    }
  }
}

// ---------- Swimming ----------

const POOL_RADIUS = 6;
const swim = {
  on: true,
  yaw: 0,
  roll: 0,
  backing: 0, // seconds left of backing up
  turning: 0, // seconds left of turning
  turnRate: 0,
};

function bump() {
  if (swim.backing > 0 || swim.turning > 0) return;
  swim.backing = 1.1;
}

let wanderTime = 0;

function updateSwim(dt, power) {
  const reversing = swim.backing > 0;
  if (reversing) {
    swim.backing -= dt;
    if (swim.backing <= 0) {
      swim.turning = 0.9;
      swim.turnRate = (Math.random() < 0.5 ? -1 : 1) * THREE.MathUtils.randFloat(1.4, 2.4);
    }
  } else if (swim.turning > 0) {
    swim.turning -= dt;
    swim.yaw += swim.turnRate * dt;
  }

  // A Paramecium spins around its long axis as it swims. When Swim is off it
  // holds still, so the labels stay put while you look around.
  if (swim.on || reversing) swim.roll += (reversing ? -1 : 1) * power * 2.2 * dt;

  if (swim.on && power > 0) {
    wanderTime += dt;
    if (!reversing && swim.turning <= 0) swim.yaw += Math.sin(wanderTime * 0.35) * 0.25 * dt;
    const forward = new THREE.Vector3(Math.cos(swim.yaw), 0, -Math.sin(swim.yaw));
    const speed = power * 1.3 * (reversing ? -0.7 : 1);
    cell.position.addScaledVector(forward, speed * dt);
    cell.position.y = Math.sin(wanderTime * 0.5) * 0.4;

    // Bumped into the edge of the pond? Back up and try another way.
    const flat = new THREE.Vector3(cell.position.x, 0, cell.position.z);
    if (!reversing && swim.turning <= 0 && flat.length() > POOL_RADIUS && flat.dot(forward) > 0) {
      bump();
      cello.say('Oops, the edge of the pond! Back up and turn.', { mood: 'wow', important: false });
    }
  }

  cell.rotation.set(swim.roll, swim.yaw, 0);
}

// ---------- Cilia animation ----------

const tmpQuat = new THREE.Quaternion();
const beatQuat = new THREE.Quaternion();
const tmpMatrix = new THREE.Matrix4();
const one = new THREE.Vector3(1, 1, 1);
let beatPhase = 0;
const CILIA_LEAN = -0.7;

function updateCilia(dt, settings) {
  const direction = swim.backing > 0 ? -1 : 1;
  beatPhase += dt * settings.speed * 1.1 * Math.PI * 2 * direction;
  cilia.count = settings.count;
  for (let i = 0; i < settings.count; i++) {
    const c = ciliaData[i];
    const phase = beatPhase - c.u * 9;
    // Quick "power stroke" one way, slower "recovery stroke" back.
    const s = Math.sin(phase);
    const beat = 0.55 * (s + 0.35 * Math.sin(2 * phase)) * Math.min(settings.speed, 1);
    // Cilia lean toward the back of the body, then row around that lean.
    beatQuat.setFromAxisAngle(c.axis, (CILIA_LEAN + beat) * direction);
    tmpQuat.multiplyQuaternions(c.baseQuat, beatQuat);
    tmpMatrix.compose(c.position, tmpQuat, one);
    cilia.setMatrixAt(i, tmpMatrix);
  }
  cilia.instanceMatrix.needsUpdate = true;
}

// ---------- Highlight a tapped part ----------

let flash = null;

function highlight(object) {
  if (flash) flash.materials.forEach((m) => m.emissive.copy(m.userData.baseEmissive));
  const materials = new Set();
  object.traverse((o) => { if (o.material?.emissive) materials.add(o.material); });
  materials.forEach((m) => {
    m.userData.baseEmissive ??= m.emissive.clone();
  });
  flash = { materials: [...materials], time: 1.2 };
}

function updateFlash(dt) {
  if (!flash) return;
  flash.time -= dt;
  const glow = Math.max(flash.time, 0) * Math.abs(Math.sin(flash.time * 9));
  flash.materials.forEach((m) => {
    m.emissive.copy(m.userData.baseEmissive).lerp(new THREE.Color(0xffd166), Math.min(glow, 1));
  });
  if (flash.time <= 0) flash = null;
}

// ---------- Tapping parts ----------

const infoEl = document.getElementById('info');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function showInfo(key) {
  document.getElementById('info-title').textContent = PARTS[key].name;
  document.getElementById('info-text').textContent = PARTS[key].text;
  infoEl.hidden = false;
  onPartFound(key);
  document.getElementById('info-found').textContent = `⭐ ${progress.parts.length} of ${PART_COUNT} parts found`;
}

document.getElementById('info-close').addEventListener('click', () => { infoEl.hidden = true; });

stage.renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
stage.renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
  const rect = stage.renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables.filter((o) => o.visible), true);
  if (!hits.length) return;
  // The skin is see-through, so prefer whatever is inside it.
  const hit = hits[0].object.userData.part === 'cilia'
    ? hits[0]
    : hits.find((h) => h.object.userData.part !== 'membrane') ?? hits[0];
  let target = hit.object;
  while (target.parent && target.parent !== cell && target.parent !== scene) target = target.parent;
  showInfo(hit.object.userData.part);
  highlight(target);
});

// ---------- Stars and Cello ----------
// "Try this!" ticks itself off as each experiment happens, and Cello cheers.

const TOPIC = 'paramecium';
const CHALLENGES = ['eat', 'stop', 'salty', 'bump', 'parts'];
const PART_COUNT = Object.keys(PARTS).length;
let progress = loadProgress(TOPIC);
const cello = createMascot(document.getElementById('mascot'));

function renderProgress() {
  document.querySelectorAll('[data-challenge]').forEach((li) => {
    li.classList.toggle('done', progress.done.includes(li.dataset.challenge));
  });
  document.getElementById('try-count').textContent = `⭐ ${progress.done.length} of ${CHALLENGES.length}`;
  document.getElementById('parts-count').textContent = `(${progress.parts.length} of ${PART_COUNT})`;
}

// Returns true the first time a challenge is done.
function complete(id) {
  if (progress.done.includes(id)) return false;
  progress.done.push(id);
  progress.total = CHALLENGES.length;
  saveProgress(TOPIC, progress);
  renderProgress();
  if (progress.done.length === CHALLENGES.length) {
    celebrate(stageEl, 90);
    setTimeout(() => cello.say("Every star! You're a real scientist! 🔬", { ms: 7000 }), 1200);
  } else {
    celebrate(stageEl, 24);
  }
  return true;
}

const YUMS = ['Yum!', 'Om nom nom!', 'Crunchy bacteria!', 'Another food vacuole!'];

function onEat() {
  if (complete('eat')) {
    cello.say('Yum! The cilia swept that food right into the mouth.');
  } else if (Math.random() < 0.3) {
    cello.say(YUMS[Math.floor(Math.random() * YUMS.length)], { ms: 1800, important: false });
  }
}

function onPartFound(key) {
  if (progress.parts.includes(key)) return;
  progress.parts.push(key);
  saveProgress(TOPIC, progress);
  renderProgress();
  if (progress.parts.length === PART_COUNT && complete('parts')) {
    cello.say('You found all 10 parts! You know this cell inside out.', { mood: 'wow', ms: 5000 });
  } else {
    cello.say(`You found the ${PARTS[key].name.toLowerCase()}!`, { ms: 2500 });
  }
}

document.getElementById('reset-stars').addEventListener('click', () => {
  clearProgress(TOPIC);
  progress = loadProgress(TOPIC);
  renderProgress();
  cello.say("Fresh start! Let's explore again.");
});

renderProgress();
setTimeout(() => {
  cello.say(progress.done.length
    ? 'Welcome back! Can you get every star?'
    : "Hi! I'm Cello. Tap Drop food to feed this Paramecium!", { ms: 6000 });
}, 600);

// ---------- Controls ----------

const settings = { speed: 6, count: 1200, water: 0 };

function bindSlider(id, format, onChange) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}-out`);
  const update = () => {
    const value = Number(input.value);
    out.textContent = format(value);
    onChange(value);
  };
  input.addEventListener('input', update);
  update();
}

// Saltier water means less water sneaks in, so the pumps can slow down.
const pumpPeriod = (water = settings.water) => THREE.MathUtils.lerp(3, 14, water / 100);

bindSlider('speed', (v) => (v === 0 ? 'stopped' : `${v} / 10`), (v) => {
  settings.speed = v;
  if (v === 0) {
    complete('stop');
    cello.say('Uh oh! No rowing means no swimming, and no food comes to the mouth.', { mood: 'sad', ms: 5000 });
  }
});
bindSlider('count', (v) => `${v}`, (v) => {
  settings.count = v;
  if (v === 0) cello.say('No cilia at all? Now it can only drift.', { mood: 'sad', important: false });
});
bindSlider('water', (v) => `pump every ${pumpPeriod(v).toFixed(0)} s`, (v) => {
  const wasSalty = settings.water >= 70;
  settings.water = v;
  if (v >= 70 && !wasSalty) {
    complete('salty');
    cello.say('Salty water! Less water sneaks in, so the pumps can slow down.', { mood: 'wow', ms: 5000 });
  }
});

function bindToggle(id, onChange) {
  const button = document.getElementById(id);
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    onChange(on);
  });
}

bindToggle('swim', (on) => { swim.on = on; });
function showLabels() {
  const on = document.getElementById('labels').getAttribute('aria-pressed') === 'true';
  labels.forEach((l) => { l.visible = on && (l !== ciliaLabel || cilia.visible); });
}

bindToggle('labels', showLabels);
bindToggle('xray', (on) => {
  cilia.visible = !on;
  showLabels();
  bodyMaterial.opacity = on ? 0.14 : 0.42;
});
bindToggle('pause', (on) => stage.setPaused(on));
document.getElementById('feed').addEventListener('click', dropFood);
document.getElementById('bump').addEventListener('click', () => {
  bump();
  complete('bump');
  cello.say('Ouch! Back up, turn, and try a new way!', { mood: 'wow' });
});

const CAMERA_OFFSET = new THREE.Vector3(0, 3, 7);
document.getElementById('reset').addEventListener('click', () => {
  controls.target.copy(cell.position);
  camera.position.copy(cell.position).add(CAMERA_OFFSET);
});

// ---------- Theme ----------
// Pale cilia and specks show up on dark water; light water needs deeper colors.

const THEME_COLORS = {
  dark: { body: 0x8fe3cf, cilia: 0xe4fff6, specks: 0xc8f5e6 },
  light: { body: 0x4cc4a6, cilia: 0x1f7f6b, specks: 0x2f8f7a },
};

window.elixTheme.watch((theme) => {
  const colors = THEME_COLORS[theme];
  bodyMaterial.color.set(colors.body);
  ciliaMaterial.color.set(colors.cilia);
  speckMaterial.color.set(colors.specks);
});

// ---------- Main loop ----------

const lastTarget = new THREE.Vector3();

stage.onFrame((dt) => {
  // How hard the cilia are rowing: depends on beat speed and how many there are.
  const power = (settings.speed / 10) * Math.sqrt(settings.count / MAX_CILIA);
  updateSwim(dt, power);
  updateCilia(dt, settings);
  updatePumps(dt, pumpPeriod());
  updateFoods(dt, power);
  updateFoodVacuoles(dt);
  updateWastes(dt);
  updateFlash(dt);

  // Keep the camera gently following the swimmer.
  lastTarget.copy(controls.target);
  controls.target.lerp(cell.position, 1 - Math.exp(-2.5 * dt));
  camera.position.add(lastTarget.sub(controls.target).negate());
});
