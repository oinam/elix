import * as THREE from 'three';
import { shaped, heartGeometry, lungGeometry } from './organs.js';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// The heart: four rooms that beat, with the lungs above and the body below.
// Blood from the body (blue here: it needs oxygen) fills the right atrium,
// drops into the right ventricle, and is pumped to the lungs. It comes back
// red, fills the left atrium, drops into the left ventricle, and is pumped
// out to the body. Follow one blood cell, listen to the lub-dub, and change
// the heart rate. The model faces you, so its right side is on your left.

const PARTS = {
  ra: { name: 'Right atrium', text: 'The top room on the heart’s right side. It fills with blood coming back from the body. That blood has dropped off its oxygen.' },
  rv: { name: 'Right ventricle', text: 'The bottom room on the right. It pumps blood up to the lungs, to drop off carbon dioxide and pick up oxygen.' },
  la: { name: 'Left atrium', text: 'The top room on the left. It fills with fresh, oxygen-rich blood coming back from the lungs.' },
  lv: { name: 'Left ventricle', text: 'The strongest room! It pumps oxygen-rich blood all the way around your body, from your head to your toes. That’s far, so its wall is extra thick and strong.' },
  valves: { name: 'Valves', text: 'Little doors between the rooms. They let blood go only one way. When they snap shut, they make the “lub-dub” sound.' },
  venaCava: { name: 'Big veins (vena cava)', text: 'Two big veins that bring blood back from the body into the right atrium.' },
  pulmonaryArtery: { name: 'Lung artery (pulmonary artery)', text: 'Carries blood from the right ventricle to the lungs. It’s the only artery that carries blood low in oxygen.' },
  pulmonaryVeins: { name: 'Lung veins (pulmonary veins)', text: 'Bring fresh, oxygen-rich blood back from the lungs into the left atrium.' },
  aorta: { name: 'Aorta', text: 'The biggest artery in your body. It carries oxygen-rich blood from the left ventricle out to every part of you.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0.6, 0.2, 11.2);
const TARGET_HOME = new THREE.Vector3(0, 0, 0);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'heart',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Lub-dub, lub-dub! This is your heart. Let’s follow the blood around.',
  allPartsLine: 'All 9 parts! You know your heart by heart.',
  onPart: (key) => {
    if (key === 'lv' && explorer.complete('thick')) {
      explorer.cello.say('The left ventricle pumps blood to your whole body, so it needs the thickest, strongest wall!', { mood: 'wow', ms: 6000 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const seeThrough = (color, opacity, extra = {}) => mat(color, { transparent: true, opacity, depthWrite: false, ...extra });

const muscleMat = seeThrough(0xd13c52, 0.45, { roughness: 0.4 });
const blueBlood = mat(0x4a6fd6);
const redBlood = mat(0xd62839);
const blueVessel = seeThrough(0x5b8def, 0.5);
const redVessel = seeThrough(0xe8445a, 0.5);
const valveMat = mat(0xffe3a3, { side: THREE.DoubleSide });
const lungMat = seeThrough(0xff9fb0, 0.6);
const bodyMat = seeThrough(0xffd5bd, 0.5);
const cellMat = mat(0xffffff, { roughness: 0.35 });
const blue = new THREE.Color(0x4a6fd6);
const red = new THREE.Color(0xe02030);
const tripMat = mat(0xfff3a0, { emissive: 0xc8a000 });

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (points, radius, material) => new THREE.Mesh(new THREE.TubeGeometry(curveOf(points), 40, radius, 12, false), material);

// ---------- The heart ----------

const heart = new THREE.Group();
heart.scale.setScalar(1.2);
scene.add(heart);

// The muscle: one heart shape you can see through. Broad on top, where the
// atria sit, with a dip where the big vessels leave. It narrows to a tip
// (the apex) at the bottom, under the left ventricle.
const muscle = new THREE.Mesh(heartGeometry(), muscleMat);
muscle.renderOrder = 2; // drawn after the rooms inside it
heart.add(muscle);

// Each room is a pool of blood inside the muscle. The atria are round. The
// ventricles narrow toward the tip. The left ventricle sits deepest in the
// muscle: its wall is much thicker than the right’s.
const ROOMS = {
  ra: { at: v(-0.7, 0.44, 0), size: [0.45, 0.38, 0.42], grab: [0.62, 0.52, 0.6], blood: blueBlood },
  rv: { at: v(-0.5, -0.42, 0.1), size: [0.56, 0.68, 0.46], lean: 0.34, grab: [0.72, 0.8, 0.6], blood: blueBlood },
  la: { at: v(0.68, 0.46, -0.1), size: [0.42, 0.37, 0.4], grab: [0.6, 0.5, 0.58], blood: redBlood },
  lv: { at: v(0.5, -0.55, 0), size: [0.4, 0.86, 0.4], lean: 0.1, grab: [0.72, 1.05, 0.62], blood: redBlood },
};
// Takes taps anywhere in a room’s part of the heart, wall included; draws nothing.
const grabMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const rooms = {};
Object.entries(ROOMS).forEach(([key, r]) => {
  const g = new THREE.Group();
  g.position.copy(r.at);
  const [sx, sy, sz] = r.size;
  const pool = new THREE.Mesh(shaped((q) => {
    const down = Math.max(0, -q.y);
    const taper = r.lean ? 1 - 0.45 * down : 1;
    q.set(q.x * sx * taper + (r.lean ?? 0) * down ** 1.3, q.y * sy, q.z * sz * taper);
  }), r.blood.clone()); // its own material, so one room glows at a time
  const grab = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12).scale(...r.grab), grabMat);
  g.add(pool, grab);
  heart.add(tagPart(g, key));
  rooms[key] = g;
});

// Valves between each atrium and ventricle, and at the two exits.
const VALVES = [
  [v(-0.62, 0.06, 0.06), 0.24], [v(0.6, 0.08, -0.05), 0.22],
  [v(-0.36, 0.2, 0.3), 0.16], [v(0.38, 0.22, 0.05), 0.17],
];
const valves = VALVES.map(([at, r]) => {
  const valve = new THREE.Group();
  valve.position.copy(at);
  [-1, 1].forEach((side) => {
    const flap = new THREE.Mesh(new THREE.CircleGeometry(r, 16, side > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), valveMat);
    flap.userData.side = side;
    valve.add(flap);
  });
  heart.add(tagPart(valve, 'valves'));
  return valve;
});

// ---------- Lungs and body ----------

const LUNG_L = v(-2.6, 2.7, -0.2);
const LUNG_R = v(2.6, 2.7, -0.2);
const airwayMat = seeThrough(0xf6eadb, 0.75);
// The windpipe comes down and splits in two, one branch for each lung.
const FORK = v(0, 3.45, -0.2);
scene.add(tube([v(0, 4, -0.2), FORK], 0.13, airwayMat));
[LUNG_L, LUNG_R].forEach((at) => {
  const out = Math.sign(at.x); // which way is away from the heart
  const lung = new THREE.Mesh(lungGeometry(out), lungMat);
  lung.position.copy(at).add(v(0, -0.15, 0));
  lung.scale.setScalar(1.2);
  lung.renderOrder = 2; // drawn after the airways inside it
  scene.add(lung);
  // The airways branch again and again inside the lung.
  const door = at.clone().add(v(-out * 0.3, 0.35, 0));
  scene.add(tube([FORK, v(out * 1.2, 3.3, -0.2), door], 0.09, airwayMat));
  [[v(out * 0.15, 0.85, 0), 0.05], [v(out * 0.5, 0.15, 0.05), 0.05], [v(out * 0.1, -0.75, 0), 0.06], [v(out * 0.6, -0.65, -0.05), 0.04]].forEach(([to, r]) => {
    const end = at.clone().add(to);
    scene.add(tube([door, door.clone().lerp(end, 0.5).add(v(out * 0.08, -0.04, 0)), end], r, airwayMat));
  });
  const tag = makeLabel('🫁 Lungs');
  tag.position.copy(at).add(v(out * 0.45, -1.5, 0));
  scene.add(tag);
});

// The body: a patch of cells, with hair-thin vessels (capillaries) running
// between them. Blood goes in red and comes out blue.
const BODY = v(0, -3.4, -0.3);
const nucleusMat = mat(0xd8866a);
const bodyCells = new THREE.Group();
bodyCells.position.copy(BODY);
for (let i = 0; i < 15; i++) {
  const row = i % 2;
  const cell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), bodyMat);
  // Two rows, a little uneven, like cells packed in a tissue.
  cell.position.set(-1.68 + i * 0.24, (row ? -0.37 : 0.37) + Math.sin(i * 2.3) * 0.04, -0.12 + Math.cos(i * 1.7) * 0.08);
  cell.scale.set(1 + Math.sin(i * 1.3) * 0.1, 0.92 + Math.cos(i * 2.1) * 0.08, 0.85);
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), nucleusMat);
  nucleus.position.set(Math.sin(i * 3.1) * 0.06, Math.cos(i * 2.7) * 0.05, 0);
  cell.add(nucleus);
  bodyCells.add(cell);
}
scene.add(bodyCells);
// Capillaries: red where the blood comes in, blue where it leaves.
const capillaryMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, transparent: true, opacity: 0.6, depthWrite: false });
const BODY_IN = BODY.clone().add(v(1.2, 0, 0.3));
const BODY_OUT = BODY.clone().add(v(-1.2, 0, 0.3));
[[0, 0, 0.1], [0.62, 0.3, 0.055], [-0.62, 0.3, 0.055]].forEach(([dy, dz, r]) => {
  const points = [BODY_IN, BODY.clone().add(v(0.6, dy, dz)), BODY.clone().add(v(-0.6, dy, dz)), BODY_OUT];
  const geo = new THREE.TubeGeometry(curveOf(points), 40, r, 10, false);
  const uv = geo.attributes.uv;
  const colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < uv.count; i++) {
    c.set(0xe8445a).lerp(new THREE.Color(0x5b8def), THREE.MathUtils.smoothstep(uv.getX(i), 0.3, 0.7));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, capillaryMat));
});
const bodyTag = makeLabel('🧍 Body cells');
bodyTag.position.copy(BODY).add(v(0, -1, 0));
scene.add(bodyTag);

// ---------- Blood vessels ----------

heart.updateMatrixWorld(true);
const world = (key, offset = v(0, 0, 0)) => heart.localToWorld(ROOMS[key].at.clone().add(offset));

const SVC = [v(-1.1, 2.5, 0.05), v(-1.05, 1.6, 0.05), world('ra', v(0, 0.3, 0))];
const IVC = [BODY.clone().add(v(-1.2, 0, 0.3)), v(-2, -2.2, 0.1), v(-2.2, -0.8, 0), v(-1.95, 0.15, 0), world('ra', v(-0.25, -0.05, 0))];
const PA_TRUNK = [world('rv', v(0.1, 0.4, 0.2)), v(-0.05, 1.3, 0.45), v(0, 1.85, 0.35)];
const PA_L = [v(0, 1.85, 0.35), v(-1.2, 2.3, 0.1), LUNG_L.clone().add(v(0.4, -0.2, 0.2))];
const PA_R = [v(0, 1.85, 0.35), v(1.2, 2.3, 0.1), LUNG_R.clone().add(v(-0.4, -0.2, 0.2))];
const PV_L = [LUNG_L.clone().add(v(0.5, -0.5, -0.2)), v(-0.9, 1.6, -0.6), world('la', v(-0.15, 0.1, -0.2))];
const PV_R = [LUNG_R.clone().add(v(-0.5, -0.5, -0.2)), v(1.7, 1.5, -0.4), world('la', v(0.2, 0.1, -0.2))];
const AORTA = [world('lv', v(-0.1, 0.5, 0.05)), v(0.4, 1.4, 0.05), v(0.45, 2.2, -0.2), v(1.15, 2.15, -0.5), v(1.7, 1.2, -0.6), v(1.95, -0.6, -0.5), v(1.8, -2.2, -0.2), BODY.clone().add(v(1.2, 0, 0.3))];

// The vessels live in the scene, not in the heart’s group.
const vessel = (points, r, material, part) => scene.add(tagPart(tube(points, r, material), part));
vessel(SVC, 0.16, blueVessel, 'venaCava');
vessel(IVC, 0.16, blueVessel, 'venaCava');
vessel(PA_TRUNK, 0.17, blueVessel, 'pulmonaryArtery');
vessel(PA_L, 0.12, blueVessel, 'pulmonaryArtery');
vessel(PA_R, 0.12, blueVessel, 'pulmonaryArtery');
vessel(PV_L, 0.11, redVessel, 'pulmonaryVeins');
vessel(PV_R, 0.11, redVessel, 'pulmonaryVeins');
vessel(AORTA, 0.19, redVessel, 'aorta');

// ---------- Blood flow ----------

// Two loops, one through each lung. Each loop has a blue half (body to
// lungs) and a red half (lungs to body). They meet in the middle of the
// body’s cells.
const RA = world('ra');
const RV = world('rv');
const LA = world('la');
const LV = world('lv');
function loop(lung, paIn, pvOut) {
  return [
    curveOf([BODY, BODY.clone().add(v(-0.6, 0, 0)), ...IVC, RA, RV, ...PA_TRUNK, ...paIn.slice(1), lung]),
    curveOf([lung, ...pvOut, LA, LV, ...AORTA, BODY.clone().add(v(0.6, 0, 0)), BODY]),
  ];
}
const loops = [loop(LUNG_L, PA_L, PV_L), loop(LUNG_R, PA_R, PV_R)];

const PER_LOOP = 22;
const cells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.08, 10, 8), cellMat, PER_LOOP * 2);
cells.frustumCulled = false;
scene.add(cells);

// Where along a curve a point is, 0 to 1.
function tAt(curve, point) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 200; i++) {
    const d = curve.getPointAt(i / 200).distanceTo(point);
    if (d < bestD) { bestD = d; best = i / 200; }
  }
  return best;
}

// One blood cell, step by step. s runs 0–1 on the blue half, 1–2 on the red.
const [blueHalf, redHalf] = loops[0];
const TRIP = [
  { to: tAt(blueHalf, RA), line: 'Blood from the body comes into the right atrium. It’s low on oxygen.' },
  { to: tAt(blueHalf, RV), line: 'Down through a valve, into the right ventricle.' },
  { to: 1, line: 'Squeeze! The right ventricle pumps it up to the lungs.' },
  { to: 1, line: 'In the lungs, it drops off carbon dioxide and picks up oxygen. Now it’s red!', pause: true },
  { to: 1 + tAt(redHalf, LA), line: 'Back to the heart, into the left atrium.' },
  { to: 1 + tAt(redHalf, LV), line: 'Down through a valve, into the strong left ventricle.' },
  { to: 2, line: 'Big squeeze! Out through the aorta, to the whole body.' },
  { to: 2, line: 'The body’s cells take the oxygen and give back carbon dioxide. Then around again!', pause: true },
];
const tripBall = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), tripMat);
tripBall.visible = false;
scene.add(tripBall);

// ---------- Labels ----------

addLabel('ra', rooms.ra, v(-0.5, 0.35, 0.4));
addLabel('rv', rooms.rv, v(-0.45, -0.45, 0.5));
addLabel('la', rooms.la, v(0.45, 0.35, 0.4));
addLabel('lv', rooms.lv, v(0.5, -0.5, 0.6));
addLabel('valves', heart, VALVES[0][0].clone().add(v(-0.1, 0, 0.5)));
addLabel('venaCava', scene, v(-1.6, 1.9, 0.2));
addLabel('pulmonaryArtery', scene, v(-0.8, 2.55, 0.3));
addLabel('pulmonaryVeins', scene, v(2.3, 1.85, -0.3));
addLabel('aorta', scene, v(0.85, 2.55, -0.2));

// ---------- Controls ----------

const state = { bpm: 80, beat: 0, flow: 0, trip: null, listen: false, lastBeat: 0 };
const levelCard = document.getElementById('level-card');

bindSlider('bpm', (value) => `${value} beats a minute`, (value) => {
  state.bpm = value;
  if (value <= 60 && complete('slow')) {
    cello.say('Slow and steady, like when you’re fast asleep. Your body needs less oxygen then.', { mood: 'wow', ms: 5000 });
  }
  if (value >= 160 && complete('fast')) {
    cello.say('Racing! After a sprint, your muscles need lots of oxygen, so your heart pumps faster.', { mood: 'wow', ms: 5500 });
  }
});

// Lub-dub: two soft thumps per beat.
let audio = null;
function thump(at, pitch) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.setValueAtTime(pitch, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, at + 0.12);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + 0.2);
}
function lubDub() {
  try {
    const now = audio.currentTime;
    thump(now, 70);
    thump(now + 0.22, 90);
  } catch {
    // No sound here; the picture still beats.
  }
}

bindToggle('listen', (on) => {
  state.listen = on;
  if (!on) return;
  try {
    audio ??= new AudioContext();
  } catch {
    // Sound isn't available; nothing to play.
  }
  levelCard.textContent = 'Lub: the valves between the rooms shut. Dub: the valves at the exits shut.';
  if (complete('listen')) cello.say('Lub-dub! That’s the sound of the valves snapping shut, like little doors.', { mood: 'wow', ms: 5000 });
});

document.getElementById('follow').addEventListener('click', () => {
  state.trip = { step: 0, s: 0, hold: 0 };
  tripBall.visible = true;
  tripMat.color.copy(blue);
  tripMat.emissive.copy(blue).multiplyScalar(0.4);
  tripStep();
});

function tripStep() {
  const { line } = TRIP[state.trip.step];
  levelCard.textContent = `${state.trip.step + 1} of 8 · ${line}`;
  cello.say(line, { ms: 4200 });
}

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const color = new THREE.Color();

function pointAt(loopIndex, s, out) {
  const [a, b] = loops[loopIndex];
  return s < 1 ? a.getPointAt(s, out) : b.getPointAt(Math.min(s - 1, 1), out);
}

stage.onFrame((dt) => {
  // One beat: the atria squeeze first, then the ventricles.
  const beatsPerSecond = state.bpm / 60;
  state.beat = (state.beat + dt * beatsPerSecond) % 1;
  const atria = Math.max(0, Math.sin((state.beat / 0.2) * Math.PI)) * (state.beat < 0.2 ? 1 : 0);
  const ventricles = state.beat > 0.2 && state.beat < 0.55 ? Math.sin(((state.beat - 0.2) / 0.35) * Math.PI) : 0;
  rooms.ra.scale.setScalar(1 - atria * 0.12);
  rooms.la.scale.setScalar(1 - atria * 0.12);
  rooms.rv.scale.setScalar(1 - ventricles * 0.12);
  rooms.lv.scale.setScalar(1 - ventricles * 0.1);
  muscle.scale.setScalar(1 - ventricles * 0.035);
  // Valves between the rooms close while the ventricles squeeze; the exit
  // valves open then.
  const squeezing = ventricles > 0.05;
  valves.forEach((valve, i) => {
    const open = i < 2 ? !squeezing : squeezing;
    valve.children.forEach((flap) => {
      flap.rotation.z = THREE.MathUtils.lerp(flap.rotation.z, open ? flap.userData.side * 1.1 : 0, 0.3);
    });
  });

  // Sound: lub as the ventricles start to squeeze, dub follows.
  if (state.listen && audio && state.beat >= 0.2 && state.lastBeat < 0.2) lubDub();
  state.lastBeat = state.beat;

  // Blood cells go around the loops, faster with a faster heart, in spurts.
  state.flow = (state.flow + dt * beatsPerSecond * 0.09 * (0.5 + ventricles)) % 2;
  for (let i = 0; i < cells.count; i++) {
    const loopIndex = i % 2;
    const s = ((Math.floor(i / 2) / PER_LOOP) * 2 + state.flow) % 2;
    pointAt(loopIndex, s, p);
    // Blue until the lungs, red until the body.
    const k = s < 1 ? THREE.MathUtils.smoothstep(s, 0.96, 1) : 1 - THREE.MathUtils.smoothstep(s, 1.96, 2);
    cells.setColorAt(i, color.copy(blue).lerp(red, k));
    cells.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
  }
  cells.instanceMatrix.needsUpdate = true;
  cells.instanceColor.needsUpdate = true;

  // One blood cell, step by step.
  const trip = state.trip;
  if (trip) {
    const step = TRIP[trip.step];
    if (step.pause) {
      trip.hold += dt;
      tripMat.color.copy(trip.step === 3 ? red : blue);
      tripMat.emissive.copy(tripMat.color).multiplyScalar(0.4);
    } else {
      trip.s = Math.min(step.to, trip.s + dt * 0.12);
    }
    pointAt(0, Math.min(trip.s, 1.999), tripBall.position);
    if ((step.pause && trip.hold > 3) || (!step.pause && trip.s >= step.to)) {
      trip.hold = 0;
      if (trip.step === TRIP.length - 1) {
        state.trip = null;
        tripBall.visible = false;
        if (complete('trip')) cello.say('All the way around! Body, right side, lungs, left side, body. Your blood does that about once a minute.', { mood: 'wow', ms: 6500 });
      } else {
        trip.step += 1;
        tripStep();
      }
    }
  }
});
