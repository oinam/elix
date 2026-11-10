import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// Blood vessels. Up close: a thick, stretchy artery pulses with each beat,
// branches into capillaries that weave between body cells (oxygen and food
// out, carbon dioxide and waste in), and the blood comes back through a
// thin vein. The vein has valves; squeeze the muscle beside it to push blood
// toward the heart, and turn the valves off to see why they matter. A second
// view shows the vessels in a whole body.

const PARTS = {
  artery: { name: 'Artery', text: 'Carries blood away from the heart. Its wall is thick and stretchy, so it can take the push of every heartbeat. That push is your pulse!' },
  capillary: { name: 'Capillaries', text: 'The tiniest blood vessels, with walls just one cell thick. Oxygen and food slip out to the body cells, and carbon dioxide and waste slip in.' },
  vein: { name: 'Vein', text: 'Brings blood back to the heart. Its wall is thin and not very stretchy. It has valves inside.' },
  valve: { name: 'Valve', text: 'A little flap inside a vein. It lets blood go toward the heart, and shuts to stop it from sliding back.' },
  redcell: { name: 'Red blood cell', text: 'Tiny discs that carry oxygen. They’re so small that they go through capillaries one at a time, in a line!' },
  tissue: { name: 'Body cells', text: 'The cells of your body, like muscle cells. They need oxygen and food all the time, and they make waste to get rid of.' },
  muscle: { name: 'Leg muscle', text: 'When you walk, your muscles squeeze the veins between them. That pushes blood up, back toward the heart.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const AIM = {
  close: { camera: [0, 1.6, 9.4], target: [0, 0.5, 0] },
  body: { camera: [0, 0.5, 9.5], target: [0, 0.3, 0] },
};

const explorer = createExplorer({
  topic: 'bloodvessels',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['artery', 'vein'], // taps reach the cells and valves inside
  greeting: 'Your blood travels on roads called blood vessels. Let’s look at the three kinds!',
  allPartsLine: 'All 7 parts! You know every road your blood takes.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

const arteryMat = seeThrough(0xe8445a, 0.42);
const arteryWall = mat(0xc93a4e, { side: THREE.DoubleSide });
const capMat = seeThrough(0xb85cc0, 0.45);
const veinMat = seeThrough(0x5b8def, 0.32);
const veinWall = mat(0x4a72d0, { side: THREE.DoubleSide });
const valveMat = mat(0xd9e6ff, { side: THREE.DoubleSide });
const tissueMat = seeThrough(0xffd2a8, 0.75);
const muscleMat = mat(0xd9707e);
const cellMat = mat(0xffffff, { roughness: 0.35 });
const o2Mat = mat(0x7fe3ff, { emissive: 0x1d7a9a });
const foodMat = mat(0xffd36b, { emissive: 0x8a5200 });
const wasteMat = mat(0x9aa0aa, { emissive: 0x2a2e36 });
const red = new THREE.Color(0xe02030);
const dark = new THREE.Color(0x6a2a6a);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const rand = (a, b) => a + Math.random() * (b - a);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (curve, radius, material, segments = 48) => new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 16, false), material);

// ---------- View 1: up close ----------

const close = new THREE.Group();
scene.add(close);

const Y = 0.6;
const ART_START = v(-5, Y, 0);
const ART_END = v(-2.3, Y, 0);
const VEIN_START = v(2.3, Y, 0);
const VEIN_END = v(5, Y, 0);

// The artery, with a cut end showing its thick wall.
const artery = new THREE.Group();
close.add(artery);
artery.add(tagPart(tube(curveOf([ART_START, ART_END]), 0.45, arteryMat, 8), 'artery'));
const arteryEnd = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.45, 32).rotateY(-Math.PI / 2), arteryWall);
arteryEnd.position.copy(ART_START);
artery.add(tagPart(arteryEnd, 'artery'));

// The vein, with a thin wall.
const vein = new THREE.Group();
close.add(vein);
vein.add(tagPart(tube(curveOf([VEIN_START, VEIN_END]), 0.5, veinMat, 8), 'vein'));
const veinEnd = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.5, 32).rotateY(Math.PI / 2), veinWall);
veinEnd.position.copy(VEIN_END);
vein.add(tagPart(veinEnd, 'vein'));

// Valves: pairs of flaps hinged on the vein wall, pointing toward the heart.
const VALVE_X = [3.1, 4.3];
const flaps = [];
VALVE_X.forEach((x) => {
  [-1, 1].forEach((side) => {
    const hinge = new THREE.Group();
    hinge.position.set(x, Y + side * 0.46, 0);
    const flap = new THREE.Mesh(new THREE.CircleGeometry(0.46, 20, 0, Math.PI).rotateZ(side > 0 ? Math.PI : 0).scale(0.55, 1, 1), valveMat);
    hinge.add(flap);
    hinge.userData.side = side;
    close.add(tagPart(hinge, 'valve'));
    flaps.push(hinge);
  });
});

// Leg muscles on either side of the vein.
const muscles = [-1, 1].map((side) => {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.6, 6, 16).rotateZ(Math.PI / 2), muscleMat);
  m.position.set(3.7, Y + side * 0.95, 0);
  m.userData.side = side;
  close.add(tagPart(m, 'muscle'));
  return m;
});

// Body cells in the middle, with capillaries weaving between them.
const tissue = [];
for (let x = -1.5; x <= 1.5; x += 0.75) {
  for (let y = -0.4; y <= 1.8; y += 0.73) {
    tissue.push(v(x + rand(-0.08, 0.08), y + rand(-0.08, 0.08), rand(-0.3, 0.3)));
  }
}
// Each cell is a soft, rounded blob with a nucleus inside.
const tissueMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.29, 20, 14), tissueMat, tissue.length);
const nuclei = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0xd8866a), tissue.length);
tissue.forEach((p, i) => {
  const m = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
  nuclei.setMatrixAt(i, m);
  tissueMesh.setMatrixAt(i, m.scale(v(1 + rand(-0.1, 0.1), 1 + rand(-0.1, 0.1), 0.9)));
});
tissueMesh.renderOrder = 2; // drawn after the nuclei inside
close.add(tagPart(tissueMesh, 'tissue'), tagPart(nuclei, 'tissue'));

// Three paths of blood: down the artery, along a capillary, up the vein.
const LANES = [-0.75, 0.6, 1.95].map((y, k) => {
  const wiggle = (x) => v(x, y + Math.sin(x * 3 + k) * 0.18, Math.cos(x * 2 + k) * 0.25);
  const cap = [-1.8, -1.1, -0.4, 0.4, 1.1, 1.8].map(wiggle);
  close.add(tagPart(tube(curveOf(cap), 0.07, capMat, 40), 'capillary'));
  // Little branches joining the artery and vein to this capillary.
  close.add(tagPart(tube(curveOf([ART_END, v(-2.05, (Y + y) / 2, 0), cap[0]]), 0.13, arteryMat, 16), 'artery'));
  close.add(tagPart(tube(curveOf([cap[5], v(2.05, (Y + y) / 2, 0), VEIN_START]), 0.14, veinMat, 16), 'vein'));
  const path = curveOf([ART_START.clone().add(v(0, 0, (k - 1) * 0.14)), ART_END, v(-2.05, (Y + y) / 2, 0), ...cap, v(2.05, (Y + y) / 2, 0), VEIN_START, VEIN_END.clone().add(v(0, (k - 1) * 0.15, 0))]);
  return { path, cap: curveOf(cap) };
});

// Where each lane enters the capillary and the vein, 0 to 1.
function tAtX(curve, x) {
  for (let i = 0; i <= 400; i++) if (curve.getPointAt(i / 400).x >= x) return i / 400;
  return 1;
}
LANES.forEach((lane) => {
  lane.capStart = tAtX(lane.path, -1.8);
  lane.capEnd = tAtX(lane.path, 1.8);
  lane.veinStart = tAtX(lane.path, VEIN_START.x);
});

const PER_LANE = 16;
const cells = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 8).scale(1, 0.45, 1), cellMat, PER_LANE * LANES.length);
cells.frustumCulled = false;
close.add(tagPart(cells, 'redcell'));
const cellT = Array.from({ length: cells.count }, (_, i) => (Math.floor(i / LANES.length) / PER_LANE));

// Deliveries: oxygen and food out of the capillaries; waste back in.
const swaps = [];
LANES.forEach((lane) => {
  for (let j = 0; j < 4; j++) {
    const at = lane.cap.getPointAt(rand(0.1, 0.9));
    const cell = tissue.reduce((best, t) => (t.distanceTo(at) < best.distanceTo(at) ? t : best));
    swaps.push({ from: at, to: cell, material: j % 2 ? foodMat : o2Mat });
    swaps.push({ from: cell, to: lane.cap.getPointAt(rand(0.1, 0.9)), material: wasteMat });
  }
});
const swapMeshes = swaps.map((s) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), s.material);
  mesh.userData.t = Math.random();
  close.add(mesh);
  return mesh;
});

addLabel('artery', close, v(-3.7, Y + 0.75, 0), { hideWith: close });
addLabel('capillary', close, v(0, 2.55, 0), { hideWith: close });
addLabel('vein', close, v(2.7, Y - 0.75, 0.3), { hideWith: close });
addLabel('valve', close, v(4.3, Y + 0.05, 0.6), { hideWith: close });
addLabel('muscle', close, v(3.7, Y + 1.55, 0), { hideWith: close });
addLabel('tissue', close, v(-1.5, -1.0, 0.3), { hideWith: close });
addLabel('redcell', close, v(-4.6, Y - 0.7, 0), { hideWith: close });
[['❤️ From the heart', v(-5.2, Y + 1.2, 0)], ['Back to the heart ❤️', v(5.2, Y + 1.2, 0)]].forEach(([text, at]) => {
  const tag = makeLabel(text);
  tag.position.copy(at);
  close.add(tag);
});

// ---------- View 2: the whole body ----------

const body = new THREE.Group();
body.visible = false;
scene.add(body);
const skin = seeThrough(0xffd5bd, 0.18);
const part = (geo, at) => { const mesh = new THREE.Mesh(geo, skin); mesh.position.copy(at); body.add(mesh); return mesh; };
part(new THREE.SphereGeometry(0.55, 24, 16), v(0, 3.1, 0));
part(new THREE.CapsuleGeometry(0.75, 1.6, 6, 16), v(0, 1.0, 0));
[-1, 1].forEach((side) => {
  part(new THREE.CapsuleGeometry(0.2, 1.9, 6, 12), v(side * 1.05, 1.0, 0)).rotation.z = side * 0.12;
  part(new THREE.CapsuleGeometry(0.26, 2.2, 6, 12), v(side * 0.38, -1.75, 0));
});
const heartMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), mat(0xd62839));
heartMesh.position.set(0.12, 1.55, 0.15);
body.add(heartMesh);
const H = heartMesh.position;
// Arteries in front, veins just behind, along the same routes.
const ROUTES = [
  [v(0, 2.2, 0), v(0.12, 2.75, 0), v(0.15, 3.2, 0.1)],
  [v(-0.12, 2.25, 0), v(-0.15, 2.75, 0), v(-0.15, 3.2, 0.1)],
  [v(0.5, 1.95, 0), v(1.0, 1.6, 0), v(1.15, 0.4, 0), v(1.2, -0.15, 0)],
  [v(-0.5, 1.95, 0), v(-1.0, 1.6, 0), v(-1.15, 0.4, 0), v(-1.2, -0.15, 0)],
  [v(0, 0.6, 0), v(0.38, -0.7, 0), v(0.4, -2.4, 0), v(0.4, -3.0, 0.1)],
  [v(0, 0.6, 0), v(-0.38, -0.7, 0), v(-0.4, -2.4, 0), v(-0.4, -3.0, 0.1)],
];
ROUTES.forEach((route) => {
  [[0.12, arteryWall, 'artery', 0.05, 0.08], [-0.12, veinWall, 'vein', 0.06, -0.08]].forEach(([dz, material, key, radius, dx]) => {
    const points = [H, ...route].map((p) => p.clone().add(v(Math.sign(p.x || 1) * dx, 0, dz)));
    body.add(tagPart(tube(curveOf(points), radius, material, 32), key));
    // Twigs branching off, getting smaller.
    const c = curveOf(points);
    for (let k = 1; k < 4; k++) {
      const a = c.getPointAt(k / 4);
      body.add(tagPart(tube(curveOf([a, a.clone().add(v(rand(-0.3, 0.3), rand(-0.3, 0.1), 0))]), radius * 0.5, material, 6), key));
    }
  });
});
addLabel('artery', body, v(1.6, 1.4, 0.2), { hideWith: body });
addLabel('vein', body, v(-1.6, 1.4, -0.2), { hideWith: body });

// ---------- Controls ----------

const state = { view: 'close', beat: 0, pulse: 0, squeeze: 0, valves: true, deliverTime: 0, backTime: 0 };
const levelCard = document.getElementById('level-card');

function aim() {
  const { camera: c, target: t } = AIM[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  close.visible = key === 'close';
  body.visible = key === 'body';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  if (b.dataset.view === 'body') {
    levelCard.textContent = 'Red: arteries, carrying oxygen-rich blood out. Blue: veins, bringing blood back.';
    if (complete('body')) cello.say('Blood vessels go everywhere: your head, your arms, your toes! They branch smaller and smaller.', { mood: 'wow', ms: 5500 });
  } else {
    levelCard.textContent = 'Artery, capillaries, vein: the roads your blood travels on.';
  }
}));

function needClose() {
  if (state.view !== 'close') setView('close');
}

document.getElementById('pulse').addEventListener('click', () => {
  needClose();
  state.pulse = 4;
  levelCard.textContent = 'Each heartbeat pushes blood, and the stretchy artery bulges. Feel it on your wrist or neck!';
  if (complete('pulse')) cello.say('Thump, thump! Each heartbeat makes the artery bulge. Put two fingers on your wrist to feel yours.', { mood: 'wow', ms: 6000 });
});

document.getElementById('squeeze').addEventListener('click', () => {
  needClose();
  state.squeeze = 1.4;
  if (state.valves && complete('squeeze')) {
    cello.say('Squeeze! The muscle pushes blood up the vein, and the valves stop it from sliding back.', { mood: 'wow', ms: 5500 });
  }
});

bindToggle('valves', (on) => {
  state.valves = on;
  document.getElementById('valves').textContent = on ? '🚪 Valves on' : '🚪 Valves off';
  needClose();
  if (on) cello.say('Valves back on. Blood only goes one way again.', { ms: 3500, important: false });
  else cello.say('Uh oh, no valves! Watch the blood in the vein.', { ms: 3500 });
});

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const tangent = new THREE.Vector3();
const q = new THREE.Quaternion();
const color = new THREE.Color();
const up = v(0, 1, 0);

stage.onFrame((dt) => {
  // Heartbeat: the artery bulges with each push, harder while feeling the pulse.
  state.beat = (state.beat + dt * 1.25) % 1;
  const push = Math.pow(Math.max(0, Math.sin(state.beat * Math.PI * 2)), 4);
  state.pulse = Math.max(0, state.pulse - dt);
  const bulge = 1 + push * (state.pulse > 0 ? 0.2 : 0.08);
  artery.scale.set(1, bulge, bulge);
  artery.position.y = Y * (1 - bulge);

  // The muscle squeezes in, then relaxes.
  state.squeeze = Math.max(0, state.squeeze - dt);
  const squeezing = state.squeeze > 0.4;
  muscles.forEach((mu) => { mu.position.y = Y + mu.userData.side * (squeezing ? 0.7 : 0.95); });

  // Blood cells: fast in the artery (in spurts), slow in the capillaries,
  // slow up the vein. Without valves and without a squeeze, blood in the
  // vein slides backward.
  let backward = false;
  for (let i = 0; i < cells.count; i++) {
    const lane = LANES[i % LANES.length];
    let t = cellT[i];
    let speed;
    if (t < lane.capStart) speed = 0.05 + push * 0.12;
    else if (t < lane.capEnd) speed = 0.02;
    else if (squeezing) speed = 0.12;
    else if (!state.valves && t > lane.veinStart + 0.02) { speed = -0.035; backward = true; } else speed = 0.025;
    t += dt * speed;
    if (t > 1) t -= 1;
    if (speed < 0) t = Math.max(t, lane.veinStart);
    cellT[i] = t;
    lane.path.getPointAt(t, p);
    lane.path.getTangentAt(t, tangent);
    const k = THREE.MathUtils.smoothstep(t, lane.capStart, lane.capEnd);
    cells.setColorAt(i, color.copy(red).lerp(dark, k));
    const size = t > lane.capStart && t < lane.capEnd ? 0.06 : 0.09;
    m.compose(p, q.setFromUnitVectors(up, tangent), v(size, size, size));
    cells.setMatrixAt(i, m);
  }
  cells.instanceMatrix.needsUpdate = true;
  cells.instanceColor.needsUpdate = true;

  // Valves swing wide while a squeeze pushes blood toward the heart, and
  // rest nearly shut against backflow. With valves off, they lie flat.
  const open = !state.valves ? 1.45 : squeezing ? 1.2 : 0.35;
  flaps.forEach((hinge) => {
    hinge.rotation.z = THREE.MathUtils.lerp(hinge.rotation.z, hinge.userData.side * open, 0.2);
  });

  // Deliveries in the capillaries.
  swapMeshes.forEach((mesh, i) => {
    mesh.userData.t = (mesh.userData.t + dt * 0.3) % 1;
    mesh.position.lerpVectors(swaps[i].from, swaps[i].to, mesh.userData.t);
  });

  if (state.view === 'close') {
    state.deliverTime += dt;
    if (state.deliverTime > 8 && complete('deliver')) {
      levelCard.textContent = 'Blue dots: oxygen. Yellow: food. Gray: carbon dioxide and waste, going back.';
      cello.say('Special delivery! Oxygen and food go out to the body cells, and waste comes back in.', { mood: 'wow', ms: 5500 });
    }
  }
  if (backward) {
    state.backTime += dt;
    if (state.backTime > 2.5 && complete('novalve')) {
      levelCard.textContent = 'Without valves, blood in the veins slides back down. Valves keep it moving toward the heart.';
      cello.say('Oh no, it’s sliding backward! That’s why veins need valves.', { mood: 'wow', ms: 5000 });
    }
  }
});

setView('close');
