import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';
import { glass, solid, seeded, blobGeometry, makeNucleus } from './cellparts.js';

// Four kinds of cells, each with a shape that fits its job: a red blood cell
// (a dented disc that folds through tiny tubes and carries oxygen), a nerve
// cell (branches and a long tail for messages), a muscle cell (long, and it
// gets shorter to pull a bone), and a white blood cell (bendy, it squeezes
// out of a blood tube and swallows a germ).

const PARTS = {
  redcell: { name: 'Red blood cell', text: 'A soft disc, dented in the middle on both sides. It’s full of a red stuff (hemoglobin) that grabs oxygen. It has no nucleus, which leaves more room.' },
  capillary: { name: 'Tiny blood tube (capillary)', text: 'The thinnest blood tubes in your body. Some are narrower than a red blood cell, so the cell has to fold to fit.' },
  nucleus: { name: 'Nucleus', text: 'The control center. Nerve, muscle, and white blood cells each have one. A long muscle cell has many!' },
  dendrites: { name: 'Branches (dendrites)', text: 'Short branches that catch messages from other cells. Tap them to send a message!' },
  cellbody: { name: 'Cell body', text: 'The middle of the nerve cell, where its nucleus is. Messages from the branches meet here.' },
  axon: { name: 'Long tail (axon)', text: 'A long, thin wire that carries the message away, very fast. Some reach from your back all the way to your toes!' },
  endings: { name: 'Tail ends (axon endings)', text: 'Little knobs at the end of the tail. They pass the message on to the next cell.' },
  musclecell: { name: 'Muscle cell', text: 'Long and thin, like a thread. Tiny threads inside slide past each other, so it gets shorter and fatter, and pulls. They make its stripes.' },
  tendon: { name: 'Tendon', text: 'A tough strap that ties a muscle to a bone. When the muscle pulls, the tendon pulls the bone.' },
  bone: { name: 'Bone', text: 'Hard and strong. Muscles pull on bones to move them, like the bones in your arm.' },
  whitecell: { name: 'White blood cell', text: 'A soft, bendy germ fighter. It changes shape to squeeze out of blood tubes, then swallows germs, a bit like an Amoeba.' },
  germ: { name: 'Germ (a bacterium)', text: 'A tiny living thing that can make you sick if lots of them get in. White blood cells hunt them down.' },
  vessel: { name: 'Blood tube (blood vessel)', text: 'Blood flows along in here. Its wall is made of cells, with tiny gaps that a white blood cell can squeeze through.' },
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CELLS = {
  red: { camera: V(0, 1.6, 10), target: V(0, -0.4, 0), hint: 'A red blood cell · Drag to spin it', line: 'A red blood cell is a soft, dented disc. Try squeezing it through the tiny tube!' },
  nerve: { camera: V(0.4, 1.6, 12.5), target: V(0.4, 0, 0), hint: 'A nerve cell · Tap its branches to send a message', line: 'A nerve cell has branches and a long, long tail. It carries messages!' },
  muscle: { camera: V(-0.2, 1.4, 10), target: V(-0.2, -0.2, 0), hint: 'A muscle cell, tied to two bones · Slide to squeeze it', line: 'A muscle cell is long, with stripes. Slide to make it squeeze!' },
  white: { camera: V(0, 0.8, 10), target: V(0, 0, 0), hint: 'A white blood cell in a blood tube · Let a germ in!', line: 'A white blood cell, the germ fighter! It’s floating in a blood tube.' },
};
const NAMES = { red: 'a red blood cell', nerve: 'a nerve cell', muscle: 'a muscle cell', white: 'a white blood cell' };

const RIDDLES = [
  ['I’m long and thin, with branches at both ends. I carry messages, fast!', 'nerve'],
  ['I’m a soft, dented disc with no nucleus. I carry oxygen.', 'red'],
  ['I change my shape to squeeze out of blood tubes and catch germs.', 'white'],
  ['I’m long and full of tiny threads. I get shorter to pull your bones.', 'muscle'],
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;
camera.position.copy(CELLS.red.camera);
controls.target.copy(CELLS.red.target);

const explorer = createExplorer({
  topic: 'specialcells',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['vessel', 'capillary', 'whitecell', 'cellbody'], // see-through: taps reach the nucleus inside
  greeting: 'Every cell has a shape that fits its job. Pick a cell and try its job!',
  allPartsLine: 'All 13 parts! You know how each shape does its job.',
  onPart: (key) => { if (key === 'dendrites') sendSignal(); },
});
const { addLabel, tagPart, showLabels, complete, cello } = explorer;

const smooth = (s, a, b) => THREE.MathUtils.smoothstep(s, a, b);
const state = { cell: 'red', time: 0 };
const stepCard = document.getElementById('step-card');
const groups = {};

// ---------- Red blood cell ----------

// The real shape of a red blood cell (Evans and Fung), as half its thickness
// at each distance p from the middle (0 to 1), scaled to radius R.
function redCellGeometry(R) {
  const k = R / 3.91;
  const half = (p) => 0.5 * Math.sqrt(Math.max(1 - p * p, 0)) * (0.81 + 7.83 * p * p - 4.39 * p ** 4) * k;
  const points = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const p = Math.sin((i / N) * Math.PI / 2);
    points.push(new THREE.Vector2(p * R, half(p)));
  }
  for (let i = N - 1; i >= 0; i--) {
    const p = Math.sin((i / N) * Math.PI / 2);
    points.push(new THREE.Vector2(p * R, -half(p)));
  }
  const geo = new THREE.LatheGeometry(points, 64);
  geo.computeVertexNormals();
  return geo;
}

// Skin (surface area) and room inside (volume) of a closed shape.
function measure(geo) {
  const pos = geo.attributes.position;
  const index = geo.index;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0, volume = 0;
  const count = index ? index.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, index ? index.getX(i) : i);
    b.fromBufferAttribute(pos, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(pos, index ? index.getX(i + 2) : i + 2);
    area += new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).length() / 2;
    volume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return { area, volume: Math.abs(volume) };
}

const DARK_RED = new THREE.Color(0x8e1a2b);
const BRIGHT_RED = new THREE.Color(0xe8323f);

const red = new THREE.Group();
scene.add(red);
groups.red = red;

const RBC_R = 1.25;
const rbcGeo = redCellGeometry(RBC_R);
const rbcBase = rbcGeo.attributes.position.array.slice();
const rbcMat = solid(DARK_RED.clone(), { roughness: 0.55 });
const rbc = new THREE.Mesh(rbcGeo, rbcMat);
const HOME_RBC = V(0, 0.7, 0);
rbc.position.copy(HOME_RBC);
red.add(tagPart(rbc, 'redcell'));

// A ball with the same room inside, to compare skins.
const disc = measure(rbcGeo);
const ballRadius = Math.cbrt((3 * disc.volume) / (4 * Math.PI));
const ballArea = 4 * Math.PI * ballRadius ** 2;
const moreSkin = Math.round(((disc.area / ballArea) - 1) * 20) * 5; // to the nearest 5%
const ballMat = solid(DARK_RED.clone(), { roughness: 0.55 });
const ball = new THREE.Mesh(new THREE.SphereGeometry(ballRadius, 40, 28), ballMat);
ball.position.set(1.8, 0.7, 0);
ball.visible = false;
red.add(ball);

// The tiny tube, narrower than the cell is wide.
const TUBE_R = 0.56;
const capMat = glass(0xff9bb5, 0.22, { side: THREE.DoubleSide });
const capillary = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, 4.6, 32, 1, true).rotateZ(Math.PI / 2), capMat);
capillary.position.set(0, -1.7, 0);
capillary.renderOrder = 4;
red.add(tagPart(capillary, 'capillary'));

// Oxygen: little pairs of balls that float in and stick to the cell.
const o2 = new THREE.Group();
const o2Mat = solid(0x9ccfff, { emissive: 0x1a3346 });
const rand = seeded(17);
const o2s = [];
for (let i = 0; i < 26; i++) {
  const m = new THREE.Group();
  for (const x of [-0.05, 0.05]) {
    const atom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), o2Mat);
    atom.position.x = x;
    m.add(atom);
  }
  const start = new THREE.Vector3().randomDirection().multiplyScalar(2.4 + rand() * 1.2);
  const a = rand() * Math.PI * 2;
  const r = 0.35 + rand() * 0.75;
  const end = V(Math.cos(a) * r, (rand() < 0.5 ? 1 : -1) * 0.3, Math.sin(a) * r);
  m.rotation.set(rand() * 3, rand() * 3, 0);
  m.visible = false;
  o2.add(m);
  o2s.push({ m, start, end, delay: rand() * 0.5 });
}
rbc.add(o2);

addLabel('redcell', red, V(0, 1.55, 0), { hideWith: rbc });
addLabel('capillary', red, V(-1.8, -1.05, 0));

const redState = { oxygen: 0, wantOxygen: false, squeeze: -1, spin: 0, fromQ: new THREE.Quaternion() };

// Fold the cell into a cup so it fits the tube: squeeze in (radius shrinks),
// and the edges trail behind. 0 is its normal shape, 1 is fully folded.
function foldRedCell(s) {
  const pos = rbcGeo.attributes.position;
  const fit = 1 - s * (1 - (TUBE_R * 0.92) / RBC_R);
  for (let i = 0; i < pos.count; i++) {
    const x = rbcBase[i * 3], y = rbcBase[i * 3 + 1], z = rbcBase[i * 3 + 2];
    const r = Math.hypot(x, z);
    pos.setXYZ(i, x * fit, y + s * r * 0.75, z * fit);
  }
  pos.needsUpdate = true;
  rbcGeo.computeVertexNormals();
}

const SHOW_TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0, 0.25));
// Lying along the tube, with its edges trailing toward where it came from.
const TRAVEL = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));

document.getElementById('squeeze').addEventListener('click', () => {
  if (redState.squeeze >= 0) return;
  if (ballOn()) setBall(false);
  redState.squeeze = 0;
  redState.fromQ.copy(rbc.quaternion);
  o2.visible = false;
  stepCard.textContent = 'The tube is thinner than the cell. Watch it fold!';
});

function updateRed(dt) {
  // Oxygen floats in, and the cell turns bright red.
  redState.oxygen = THREE.MathUtils.clamp(redState.oxygen + (redState.wantOxygen ? dt : -dt) / 1.6, 0, 1);
  o2s.forEach(({ m, start, end, delay }) => {
    const p = smooth(redState.oxygen, delay, delay + 0.5);
    m.visible = p > 0.01 && p < 0.999;
    m.position.lerpVectors(start, end, p);
  });
  const color = DARK_RED.clone().lerp(BRIGHT_RED, smooth(redState.oxygen, 0.3, 1));
  rbcMat.color.copy(color);
  ballMat.color.copy(color);

  if (redState.squeeze < 0) {
    redState.spin += dt * 0.4;
    rbc.quaternion.setFromAxisAngle(V(0, 1, 0), redState.spin).multiply(SHOW_TILT);
    return;
  }

  // In to the start of the tube, through it, out the other end, and home.
  redState.squeeze = Math.min(redState.squeeze + dt / 6, 1);
  const t = redState.squeeze;
  const start = V(-4.2, -1.7, 0), end = V(4.2, -1.7, 0);
  let s = 0;
  if (t < 0.15) {
    const k = smooth(t, 0, 0.15);
    rbc.position.lerpVectors(HOME_RBC, start, k);
    rbc.quaternion.copy(redState.fromQ).slerp(TRAVEL, k);
  } else if (t < 0.85) {
    const k = (t - 0.15) / 0.7;
    rbc.position.lerpVectors(start, end, k);
    rbc.quaternion.copy(TRAVEL);
    const x = rbc.position.x;
    s = smooth(x, -3.4, -2.3) * (1 - smooth(x, 2.3, 3.4));
  } else {
    const k = smooth(t, 0.85, 1);
    rbc.position.lerpVectors(end, HOME_RBC, k);
    rbc.quaternion.copy(TRAVEL).slerp(SHOW_TILT, k);
  }
  foldRedCell(s);
  if (t > 0.3 && t < 0.7) stepCard.textContent = 'Squeezing through! It bends into a cup shape.';
  if (t > 0.72 && t < 0.85) stepCard.textContent = 'Out the other end. Pop! Back to a disc.';
  if (t >= 1) {
    redState.squeeze = -1;
    redState.spin = 0;
    o2.visible = true;
    stepCard.textContent = CELLS.red.hint;
    if (complete('squeeze')) cello.say('It folded to fit, then popped back! Soft and bendy is just right for tiny tubes.', { mood: 'wow', ms: 5500 });
    else cello.say('Squish, and pop!', { ms: 2000 });
  }
}

bindToggle('oxygen', (on) => {
  redState.wantOxygen = on;
  if (on) {
    stepCard.textContent = 'In your lungs, oxygen sticks to the red stuff inside. The cell turns bright red!';
    if (complete('oxygen')) cello.say('Bright red! Now it carries that oxygen to every part of your body.', { mood: 'wow', ms: 5000 });
    else cello.say('Loaded with oxygen!', { ms: 2000 });
  } else {
    stepCard.textContent = 'It gave its oxygen away to hungry cells. Now it’s dark red, off back to the lungs.';
  }
});

const ballOn = () => document.getElementById('ball').getAttribute('aria-pressed') === 'true';
function setBall(on) {
  document.getElementById('ball').setAttribute('aria-pressed', String(on));
  ball.visible = on;
  HOME_RBC.x = on ? -1.4 : 0;
  if (redState.squeeze < 0) rbc.position.copy(HOME_RBC);
}
document.getElementById('ball').addEventListener('click', () => {
  if (redState.squeeze >= 0) return;
  const on = !ballOn();
  setBall(on);
  if (!on) {
    stepCard.textContent = CELLS.red.hint;
    return;
  }
  stepCard.textContent = `Both hold the same amount inside. The disc has about ${moreSkin}% more skin, so oxygen gets in and out faster.`;
  if (complete('disc')) cello.say('The dented disc wins! More skin means more room for oxygen to pass through.', { mood: 'wow', ms: 5500 });
});

// ---------- Nerve cell ----------

const nerve = new THREE.Group();
scene.add(nerve);
groups.nerve = nerve;

const NERVE_COLORS = { body: 0xffb978, next: 0xffb978 };
const bodyMat = glass(NERVE_COLORS.body, 0.55);
const BODY = V(-3.2, 0, 0);
const body = new THREE.Mesh(blobGeometry(0.6, { bump: 0.12, seed: 4 }), bodyMat);
body.position.copy(BODY);
body.renderOrder = 3;
nerve.add(tagPart(body, 'cellbody'));

const nerveNucleus = makeNucleus({ radius: 0.27, chromosomeCount: 0, poreCount: 18, seed: 9 });
nerveNucleus.group.position.copy(BODY);
nerve.add(tagPart(nerveNucleus.group, 'nucleus'));

const branchMat = solid(0xff9f5a);
const dendrites = new THREE.Group();
const dendriteTips = [];
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const nRand = seeded(23);
function branch(from, dir, length, radius, depth) {
  const to = from.clone().addScaledVector(dir, length);
  const mid = from.clone().lerp(to, 0.5).add(V((nRand() - 0.5) * 0.15, (nRand() - 0.5) * 0.15, (nRand() - 0.5) * 0.15));
  const curve = new THREE.CatmullRomCurve3([from, mid, to]);
  dendrites.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 6), branchMat));
  if (depth === 0) {
    dendriteTips.push(to);
    return;
  }
  for (const turn of [-0.5, 0.5]) {
    const d = dir.clone().applyAxisAngle(V(0, 0, 1), turn + (nRand() - 0.5) * 0.3);
    d.z += (nRand() - 0.5) * 0.4;
    branch(to, d.normalize(), length * 0.62, radius * 0.7, depth - 1);
  }
}
[110, 150, 185, 215, 250, 290].forEach((deg) => {
  const a = THREE.MathUtils.degToRad(deg);
  const dir = V(Math.cos(a), Math.sin(a), (nRand() - 0.5) * 0.5).normalize();
  const from = BODY.clone().addScaledVector(dir, 0.5);
  branch(from, dir, 0.75, 0.06, 2);
  // An invisible, easy-to-tap pad over each first branch.
  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hitMat);
  pad.position.copy(from.clone().addScaledVector(dir, 0.75));
  dendrites.add(pad);
});
nerve.add(tagPart(dendrites, 'dendrites'));

const AXON_POINTS = [V(-2.65, 0, 0), V(-1.5, 0.18, 0), V(0, -0.12, 0.1), V(1.5, 0.15, 0), V(3, -0.1, 0), V(4.1, 0, 0)];
const axonCurve = new THREE.CatmullRomCurve3(AXON_POINTS);
const axonMat = solid(0xff9f5a);
const axon = new THREE.Mesh(new THREE.TubeGeometry(axonCurve, 120, 0.085, 10), axonMat);
nerve.add(tagPart(axon, 'axon'));

const endings = new THREE.Group();
const endingTips = [];
[-0.6, -0.2, 0.2, 0.6].forEach((a) => {
  const from = V(4.1, 0, 0);
  const to = V(4.1 + Math.cos(a) * 0.7, Math.sin(a) * 0.8, (a > 0 ? 0.15 : -0.15));
  endings.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(from, to), 4, 0.045, 6), branchMat));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), solid(0xffd75e));
  knob.position.copy(to);
  endings.add(knob);
  endingTips.push(to);
});
nerve.add(tagPart(endings, 'endings'));

// The next cell, which the message is passed on to.
const nextMat = glass(NERVE_COLORS.next, 0.3, { emissive: 0x000000 });
const next = new THREE.Mesh(blobGeometry(0.55, { bump: 0.12, seed: 8 }), nextMat);
next.position.set(5.75, 0, 0);
nerve.add(next);

// The message: a glowing spark from a branch tip, through the body, down the tail.
const spark = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
spark.visible = false;
nerve.add(spark);
const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.35, depthWrite: false }));
spark.add(halo);

addLabel('dendrites', nerve, V(-4.6, 1.15, 0));
addLabel('cellbody', nerve, V(-3.2, -0.95, 0));
addLabel('axon', nerve, V(0.6, 0.55, 0));
addLabel('endings', nerve, V(4.6, 1.0, 0));

let signal = null;
function sendSignal() {
  if (signal || state.cell !== 'nerve') return;
  const tip = dendriteTips[Math.floor(Math.random() * dendriteTips.length)];
  const end = endingTips[Math.floor(Math.random() * endingTips.length)];
  const path = new THREE.CatmullRomCurve3([tip, BODY.clone().lerp(tip, 0.4), BODY, ...AXON_POINTS, end]);
  signal = { path, t: 0, flash: 0 };
  spark.visible = true;
  stepCard.textContent = 'A message! It races from the branches, through the body, and down the long tail.';
}
document.getElementById('signal').addEventListener('click', sendSignal);

function updateNerve(dt) {
  nerve.rotation.y = Math.sin(performance.now() / 4000) * 0.12;
  if (!signal) return;
  if (signal.t < 1) {
    signal.t = Math.min(signal.t + dt / 2.2, 1);
    spark.position.copy(signal.path.getPointAt(signal.t));
    axonMat.emissive.setRGB(0.25 * Math.sin(signal.t * Math.PI), 0.18 * Math.sin(signal.t * Math.PI), 0);
    if (signal.t >= 1) {
      spark.visible = false;
      signal.flash = 1;
      stepCard.textContent = 'Passed on to the next cell! Real messages go even faster: about 100 meters in one second.';
      if (complete('signal')) cello.say('Zoom! A long tail carries a message a long way, fast.', { mood: 'wow', ms: 5000 });
      else cello.say('Message delivered!', { ms: 2000 });
    }
    return;
  }
  signal.flash = Math.max(signal.flash - dt, 0);
  nextMat.emissive.setRGB(signal.flash * 0.6, signal.flash * 0.45, 0);
  if (signal.flash <= 0) signal = null;
}

// ---------- Muscle cell ----------

const muscle = new THREE.Group();
scene.add(muscle);
groups.muscle = muscle;

const boneMat = solid(0xf1e6cf, { roughness: 0.7 });
const bones = new THREE.Group();
const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 5, 6, 12).rotateZ(Math.PI / 2), boneMat);
upper.position.set(-1.1, -1.1, 0);
bones.add(upper);
const PIVOT = V(1.55, -1.1, 0);
const forearm = new THREE.Group();
forearm.position.copy(PIVOT);
const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 3, 6, 12).rotateZ(Math.PI / 2), boneMat);
fore.position.x = 1.6;
forearm.add(fore);
const joint = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), boneMat);
forearm.add(joint);
bones.add(forearm);
muscle.add(tagPart(bones, 'bone'));

// Stripes across the cell, from the tiny threads inside.
const stripeCanvas = document.createElement('canvas');
stripeCanvas.width = 4;
stripeCanvas.height = 32;
const sctx = stripeCanvas.getContext('2d');
sctx.fillStyle = '#ffd1dc';
sctx.fillRect(0, 0, 4, 32);
sctx.fillStyle = '#e8708f';
sctx.fillRect(0, 0, 4, 12);
const stripes = new THREE.CanvasTexture(stripeCanvas);
stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
stripes.repeat.set(1, 26);
stripes.colorSpace = THREE.SRGBColorSpace;

const ANCHOR = V(-3.1, -0.5, 0);
const ATTACH = V(0.6, 0.42, 0); // on the forearm, just past the elbow
const restLength = ANCHOR.distanceTo(PIVOT.clone().add(ATTACH));
const MUSCLE_R = 0.32;
const muscleCell = new THREE.Group();
const fiber = new THREE.Mesh(new THREE.CapsuleGeometry(MUSCLE_R, restLength - 2 * MUSCLE_R, 8, 24).rotateZ(Math.PI / 2), solid(0xffffff, { map: stripes, roughness: 0.6 }));
muscleCell.add(tagPart(fiber, 'musclecell'));
// Many nuclei, flat against the edge of the long cell.
const nucleiGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const a = i * 2.1;
  const n = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), solid(0x9a7cf5));
  n.scale.set(2, 0.6, 1);
  n.position.set((i / 5 - 0.5) * restLength * 0.75, Math.cos(a) * MUSCLE_R * 0.95, Math.sin(a) * MUSCLE_R * 0.95);
  nucleiGroup.add(n);
}
muscleCell.add(tagPart(nucleiGroup, 'nucleus'));
muscle.add(muscleCell);

const tendonMat = solid(0xf6f1e6, { roughness: 0.4 });
const tendonGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 8).translate(0, 0.5, 0);
const tendons = new THREE.Group();
const tendonA = new THREE.Mesh(tendonGeo, tendonMat);
const tendonB = new THREE.Mesh(tendonGeo, tendonMat);
tendons.add(tendonA, tendonB);
muscle.add(tagPart(tendons, 'tendon'));

addLabel('musclecell', muscleCell, V(0, 0.6, 0));
addLabel('bone', muscle, V(-2.5, -1.55, 0));
addLabel('tendon', muscle, V(-3.6, -0.3, 0));

const upY = V(0, 1, 0);
function stretchBetween(mesh, from, to) {
  const dir = to.clone().sub(from);
  mesh.position.copy(from);
  mesh.scale.set(1, Math.max(dir.length(), 0.001), 1);
  mesh.quaternion.setFromUnitVectors(upY, dir.normalize());
}

const MAX_BEND = 1.7; // how far the forearm bone swings up, in radians
const muscleState = { pull: 0, angle: 0 };
function updateMuscle(dt) {
  muscleState.angle += (muscleState.pull * MAX_BEND - muscleState.angle) * (1 - Math.exp(-dt * 6));
  forearm.rotation.z = muscleState.angle;
  forearm.updateMatrixWorld();
  const end = forearm.localToWorld(ATTACH.clone());
  muscle.worldToLocal(end);
  const length = ANCHOR.distanceTo(end);
  const k = length / restLength;
  muscleCell.position.lerpVectors(ANCHOR, end, 0.5);
  muscleCell.rotation.z = Math.atan2(end.y - ANCHOR.y, end.x - ANCHOR.x);
  // Shorter and fatter: it keeps the same amount inside.
  muscleCell.scale.set(k, 1 / Math.sqrt(k), 1 / Math.sqrt(k));
  stretchBetween(tendonA, V(-3.35, -0.95, 0), ANCHOR.clone().add(V(0.05, 0, 0)));
  const onBone = forearm.localToWorld(V(ATTACH.x, 0.1, 0));
  muscle.worldToLocal(onBone);
  stretchBetween(tendonB, onBone, end);
  return k;
}

bindSlider('pull', (v) => (v < 5 ? 'Relaxed' : v < 95 ? 'Squeezing…' : 'All the way!'), (v) => {
  muscleState.pull = v / 100;
  if (state.cell !== 'muscle') return;
  const shorter = Math.round((1 - lengthAt(v / 100)) * 100);
  stepCard.textContent = v < 5
    ? CELLS.muscle.hint
    : `${shorter}% shorter, and fatter. A real muscle is thousands of these, all pulling at once.`;
  if (v >= 95 && complete('pull')) {
    cello.say('It got shorter and fatter, and pulled the bone up! That’s how you bend your arm.', { mood: 'wow', ms: 6000 });
  }
});

// How long the muscle is, compared to resting, when the slider is at p.
function lengthAt(p) {
  const a = p * MAX_BEND;
  const end = PIVOT.clone().add(ATTACH.clone().applyAxisAngle(V(0, 0, 1), a));
  return ANCHOR.distanceTo(end) / restLength;
}

// ---------- White blood cell ----------

const white = new THREE.Group();
scene.add(white);
groups.white = white;

const VESSEL_Y = 1.3, VESSEL_R = 1.1;
const vesselMat = glass(0xff9bb5, 0.2, { side: THREE.DoubleSide });
const vessel = new THREE.Mesh(new THREE.CylinderGeometry(VESSEL_R, VESSEL_R, 9, 40, 1, true).rotateZ(Math.PI / 2), vesselMat);
vessel.position.y = VESSEL_Y;
vessel.renderOrder = 4;
white.add(tagPart(vessel, 'vessel'));

// Red blood cells drifting along inside.
const flowGeo = redCellGeometry(0.34);
const flow = [];
const fRand = seeded(41);
for (let i = 0; i < 9; i++) {
  const m = new THREE.Mesh(flowGeo, solid(0xc22a3a));
  m.position.set(-4.5 + i, VESSEL_Y + (fRand() - 0.5) * 1.2, (fRand() - 0.5) * 1.1);
  m.rotation.set(fRand() * 3, fRand() * 3, 0);
  white.add(tagPart(m, 'redcell'));
  flow.push(m);
}

const WBC_R = 0.6;
const wbcGeo = new THREE.SphereGeometry(WBC_R, 48, 32);
const wbcDirs = wbcGeo.attributes.position.array.slice();
const wbcMat = glass(0xd9ccff, 0.75);
const wbc = new THREE.Group();
const wbcSkin = new THREE.Mesh(wbcGeo, wbcMat);
wbcSkin.renderOrder = 3;
wbc.add(tagPart(wbcSkin, 'whitecell'));
// Its nucleus looks like a few beads joined up.
const beads = new THREE.Group();
[V(-0.2, 0.05, 0), V(0, -0.1, 0.05), V(0.2, 0.06, -0.03)].forEach((p) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), solid(0x7a4fd6));
  b.position.copy(p);
  beads.add(b);
});
wbc.add(tagPart(beads, 'nucleus'));
white.add(wbc);

const germ = new THREE.Group();
const germBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 10).rotateZ(Math.PI / 2), solid(0x5fcf5f));
germ.add(germBody);
const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.25, 0, 0), V(0.4, 0.06, 0), V(0.55, -0.05, 0), V(0.68, 0.04, 0)]), 12, 0.018, 4), solid(0x3f9f4f));
germ.add(tail);
germ.visible = false;
white.add(tagPart(germ, 'germ'));

addLabel('vessel', white, V(-3.2, VESSEL_Y + 1.35, 0));
addLabel('whitecell', wbc, V(0, 0.85, 0));
addLabel('germ', germ, V(0, 0.35, 0), { hideWith: germ });

const WBC_HOME = V(-2.4, VESSEL_Y, 0);
wbc.position.copy(WBC_HOME);
const GERM_START = V(2.4, -1.8, 0.2);
const WALL_Y = VESSEL_Y - VESSEL_R;
let hunt = null;

document.getElementById('germ').addEventListener('click', () => {
  hunt = { t: 0, caught: false, from: null };
  wbc.position.copy(WBC_HOME);
  germ.position.copy(GERM_START);
  germ.scale.setScalar(0.001);
  germ.visible = true;
  document.getElementById('germ').textContent = '🦠 Let another germ in';
  stepCard.textContent = 'A germ got in, outside the blood tube! The white blood cell has spotted it.';
  cello.say('Uh-oh, a germ! Watch the white blood cell go after it.', { ms: 3500 });
});

// Wobble the skin, and stretch it toward where it's going.
function shapeWhiteCell(time, reach, squish) {
  const pos = wbcGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = wbcDirs[i * 3] / WBC_R, y = wbcDirs[i * 3 + 1] / WBC_R, z = wbcDirs[i * 3 + 2] / WBC_R;
    let r = 1 + 0.07 * Math.sin(3 * x + time * 1.7) * Math.cos(2 * y + time * 1.3) + 0.05 * Math.sin(4 * z - time);
    // A foot (pseudopod) pushes out toward the target.
    const along = x * reach.x + y * reach.y + z * reach.z;
    r += Math.max(along, 0) ** 3 * reach.length() * 0.9;
    pos.setXYZ(i, x * WBC_R * r * squish.x, y * WBC_R * r * squish.y, z * WBC_R * r * squish.z);
  }
  pos.needsUpdate = true;
  wbcGeo.computeVertexNormals();
}

function updateWhite(dt, time) {
  flow.forEach((m) => {
    m.position.x += dt * 0.7;
    if (m.position.x > 4.4) m.position.x -= 9;
    m.rotation.x += dt * 0.6;
  });
  const reach = V(0, 0, 0);
  const squish = V(1, 1, 1);
  if (hunt) {
    hunt.t += dt;
    const t = hunt.t;
    germ.scale.setScalar(Math.max(smooth(t, 0, 0.6) * (1 - smooth(t, 6.4, 7.4)), 0.001));
    // The germ wiggles about until it's caught.
    if (!hunt.caught) {
      germ.position.set(GERM_START.x + Math.sin(t * 1.3) * 0.25, GERM_START.y + Math.sin(t * 2.1) * 0.15, GERM_START.z);
      germ.rotation.z = Math.sin(t * 3) * 0.4;
    }
    const gap = V(0.9, WALL_Y, 0);
    if (t < 1.4) {
      // Roll along the tube toward the germ.
      wbc.position.lerpVectors(WBC_HOME, V(0.9, VESSEL_Y - 0.25, 0), smooth(t, 0, 1.4));
      reach.set(0.5, -0.2, 0);
    } else if (t < 3.2) {
      // Squeeze down through a gap in the wall: thin in the middle.
      const k = smooth(t, 1.4, 3.2);
      wbc.position.lerpVectors(V(0.9, VESSEL_Y - 0.25, 0), V(0.9, WALL_Y - 0.9, 0), k);
      const near = Math.exp(-(((wbc.position.y - gap.y) / 0.5) ** 2));
      squish.set(1 - 0.5 * near, 1 + 0.6 * near, 1 - 0.5 * near);
      reach.set(0, -0.6, 0);
      if (t > 2 && t - dt <= 2) stepCard.textContent = 'It squeezes through a tiny gap in the wall. So bendy!';
    } else if (t < 5.2) {
      // Crawl over to the germ, pushing out a foot toward it.
      const k = smooth(t, 3.2, 5.2);
      const target = germ.position.clone().add(V(-0.45, 0.2, 0));
      wbc.position.lerpVectors(V(0.9, WALL_Y - 0.9, 0), target, k);
      reach.copy(germ.position.clone().sub(wbc.position).normalize().multiplyScalar(0.7));
      if (t > 3.3 && t - dt <= 3.3) stepCard.textContent = 'Now it crawls after the germ, like an Amoeba.';
    } else {
      // Wrap around it and swallow it.
      if (!hunt.caught) {
        hunt.caught = true;
        hunt.from = germ.position.clone();
        stepCard.textContent = 'Gulp! It wraps around the germ and swallows it.';
      }
      const k = smooth(t, 5.2, 6.2);
      germ.position.lerpVectors(hunt.from, wbc.position, k);
      germ.rotation.z += dt * 2;
      if (t > 7.4) {
        germ.visible = false;
        hunt = null;
        stepCard.textContent = 'Germ gone! It gets broken down inside the white blood cell.';
        if (complete('germ')) cello.say('Got it! Bendy cells can squeeze anywhere to catch germs.', { mood: 'wow', ms: 5000 });
        else cello.say('Another germ caught!', { ms: 2000 });
      }
    }
  } else if (wbc.position.distanceTo(WBC_HOME) < 0.01) {
    wbc.position.x = WBC_HOME.x + Math.sin(time * 0.6) * 0.3;
  }
  shapeWhiteCell(time, reach, squish);
}

// ---------- Picking a cell ----------

const fly = { t: 1, from: new THREE.Vector3(), fromTarget: new THREE.Vector3(), to: new THREE.Vector3(), toTarget: new THREE.Vector3() };
function flyTo(position, target) {
  Object.assign(fly, { t: 0, from: camera.position.clone(), fromTarget: controls.target.clone(), to: position.clone(), toTarget: target.clone() });
}

function setCell(cell, { say = true } = {}) {
  state.cell = cell;
  Object.entries(groups).forEach(([key, g]) => { g.visible = key === cell; });
  document.querySelectorAll('[data-cell]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cell === cell)));
  document.querySelectorAll('[data-for]').forEach((d) => { d.hidden = d.dataset.for !== cell; });
  document.getElementById('info').hidden = true;
  stepCard.textContent = CELLS[cell].hint;
  flyTo(CELLS[cell].camera, CELLS[cell].target);
  showLabels();
  if (say) cello.say(CELLS[cell].line, { ms: 4000 });
}

document.querySelectorAll('[data-cell]').forEach((b) => {
  b.addEventListener('click', () => { if (state.cell !== b.dataset.cell) setCell(b.dataset.cell); });
});

document.getElementById('reset').addEventListener('click', () => {
  flyTo(CELLS[state.cell].camera, CELLS[state.cell].target);
});

// ---------- Match the shape to the job ----------

let order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
let current = 0;
let right = 0;
const solved = new Set();
const riddleEl = document.getElementById('riddle');
const riddleCount = document.getElementById('riddle-count');

function showRiddle() {
  riddleEl.textContent = `“${RIDDLES[order[current]][0]}”`;
  riddleCount.textContent = `${solved.size} of ${RIDDLES.length}`;
}

document.querySelectorAll('[data-answer]').forEach((b) => {
  b.addEventListener('click', () => {
    const [clue, answer] = RIDDLES[order[current]];
    if (b.dataset.answer !== answer) {
      cello.say(`Not ${NAMES[b.dataset.answer]}. Think about its shape, and try again!`, { mood: 'sad', ms: 2600 });
      return;
    }
    solved.add(clue);
    right++;
    setCell(answer, { say: false });
    if (solved.size === RIDDLES.length && complete('match')) {
      cello.say('All four! Every shape fits its job.', { mood: 'wow', ms: 5000 });
    } else {
      cello.say([`Yes, ${NAMES[answer]}!`, 'Correct!', 'You got it!', 'Spot on!'][right % 4], { ms: 2000 });
    }
    current = (current + 1) % order.length;
    if (current === 0) order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
    showRiddle();
  });
});

// ---------- Every frame ----------

stage.onFrame((dt) => {
  state.time += dt;
  if (state.cell === 'red') updateRed(dt);
  if (state.cell === 'nerve') updateNerve(dt);
  if (state.cell === 'white') updateWhite(dt, state.time);
});

// The camera and the muscle follow even while paused.
const clockFree = new THREE.Clock();
function follow() {
  const dt = Math.min(clockFree.getDelta(), 0.05);
  if (fly.t < 1) {
    fly.t = Math.min(fly.t + dt / 1.1, 1);
    const e = smooth(fly.t, 0, 1);
    camera.position.lerpVectors(fly.from, fly.to, e);
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, e);
  }
  updateMuscle(dt);
  requestAnimationFrame(follow);
}

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { tube: 0xff9bb5, white: 0xd9ccff, next: 0xffb978 },
  light: { tube: 0xd94f78, white: 0x9c84e8, next: 0xe08a3c },
};
window.elixTheme.watch((theme) => {
  const c = THEME_COLORS[theme];
  capMat.color.set(c.tube);
  vesselMat.color.set(c.tube);
  wbcMat.color.set(c.white);
  nextMat.color.set(c.next);
  bodyMat.color.set(c.next);
});

// ---------- Start ----------

setCell('red', { say: false });
fly.t = 1;
camera.position.copy(CELLS.red.camera);
controls.target.copy(CELLS.red.target);
showRiddle();
shapeWhiteCell(0, V(0, 0, 0), V(1, 1, 1));
requestAnimationFrame(follow);
