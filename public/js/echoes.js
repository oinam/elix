import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { shaped } from './organs.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Echoes. A bat squeaks in a dark cave: the sound spreads out, bounces off a
// moth, and the echo comes back, so the bat knows where to fly. A ship pings
// the sea floor and times the echo to work out the depth, and can map the
// floor spot by spot. A doctor's ultrasound probe uses echoes to show a baby.

const PARTS = {
  bat: { name: 'Bat', text: 'Bats hunt at night. They make very high squeaks and listen for the echoes to find bugs, even in the dark!' },
  moth: { name: 'Moth', text: 'A tasty snack for a bat. The squeak bounces off it and tells the bat where it is.' },
  echo: { name: 'Echo', text: 'Sound that bounced off something and came back. The longer it takes, the farther away the thing is.' },
  ship: { name: 'Ship', text: 'Ships use sonar to find the depth of the sea, fish, and even old shipwrecks.' },
  sonar: { name: 'Sonar ping', text: 'A burst of sound sent down into the water. Sonar stands for SOund NAvigation and Ranging.' },
  seabed: { name: 'Sea floor', text: 'The bottom of the sea. It has mountains and valleys too. Sonar helps map them.' },
  probe: { name: 'Ultrasound probe', text: 'It sends sound waves into the body, too high for us to hear, and listens for the echoes.' },
  baby: { name: 'Baby', text: 'Echoes from the baby make a picture on the screen. Ultrasound is safe for the baby and the mom.' },
};

const VIEWS = {
  bat: { camera: [0, 0.8, 9.5], target: [0, 0.3, 0], button: '📣 Squeak!', line: 'It’s dark in this cave. Squeak, and listen for the echo!' },
  ship: { camera: [0, 0.2, 10.5], target: [0, -1.2, 0], button: '📣 Sonar ping', line: 'Send a ping down to the sea floor, and time the echo.' },
  scan: { camera: [0, 1.2, 8.6], target: [0, 0.5, 0], button: '📣 Scan', line: 'The doctor’s probe sends sound in and listens for echoes.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'echoes',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Sound can bounce, like a ball off a wall! Let’s help a bat find dinner.',
  allPartsLine: 'All 8 parts! You know how echoes help us find things.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
// Pale enough to show against the dark cave wall, with a little glow of their own.
const batMat = mat(0x8f7bb0, { emissive: 0x2a2140 });
const wingMat = mat(0xb9a6d8, { emissive: 0x3a2f55, side: THREE.DoubleSide });
const mothMat = mat(0xe8d2a6);
const caveMat = mat(0x5a4a3a, { side: THREE.BackSide, roughness: 1, envMapIntensity: 0 });
const outMat = new THREE.MeshBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
const backMat = new THREE.MeshBasicMaterial({ color: 0x22e2cc, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
const outLine = new THREE.LineBasicMaterial({ color: 0xffd75e, transparent: true, opacity: 0.9 });
const backLine = new THREE.LineBasicMaterial({ color: 0x22e2cc, transparent: true, opacity: 0.9 });
const seaMat = seeThrough(0x2f7fc8, 0.35);
const floorMat = mat(0xc9a46a);
const hullMat = mat(0xe8443a);
const dotMat = mat(0xffd75e, { emissive: 0x6a5000 });
const bellyMat = seeThrough(0xffd5bd, 0.35);
const probeMat = mat(0x9aa0aa);
const babyMat = mat(0xffb3a1, { transparent: true, opacity: 0 });

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// A ring of sound: a thin circle that grows (going out) or shrinks (coming back).
const circle = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 72 }, (_, i) => v(Math.cos((i / 72) * Math.PI * 2), Math.sin((i / 72) * Math.PI * 2), 0)));
function soundRing(material) {
  const ring = new THREE.LineLoop(circle, material);
  ring.visible = false;
  scene.add(ring);
  return ring;
}

// ---------- View 1: bat ----------

const batView = new THREE.Group();
scene.add(batView);
const cave = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 16).scale(1.4, 0.7, 0.6), caveMat);
batView.add(cave);
const bat = new THREE.Group();
const BAT_HOME = v(-3.8, 0.8, 0);
bat.position.copy(BAT_HOME);
// The bat flies to the right. A furry body, a head with big ears, and two
// wings of thin skin, with a scalloped back edge.
bat.add(new THREE.Mesh(shaped((q) => q.set(q.x * 0.34, q.y * 0.19 * (1 - 0.25 * q.x), q.z * 0.2), 6), batMat));
const batHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), batMat);
batHead.position.set(0.32, 0.1, 0);
bat.add(batHead);
const snout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), batMat);
snout.position.set(0.45, 0.07, 0);
bat.add(snout);
const wingShape = new THREE.Shape();
wingShape.moveTo(0.2, 0);
wingShape.quadraticCurveTo(0.42, 0.45, 0.2, 0.7); // the front edge, out to the wrist
wingShape.quadraticCurveTo(0.1, 1.05, -0.2, 1.3); // and on to the tip
wingShape.quadraticCurveTo(-0.12, 1.0, -0.32, 0.9); // back along three scallops
wingShape.quadraticCurveTo(-0.2, 0.62, -0.38, 0.45);
wingShape.quadraticCurveTo(-0.22, 0.25, -0.3, 0);
const wings = [-1, 1].map((side) => {
  const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape, 8).rotateX(Math.PI / 2).scale(1, 1, side), wingMat);
  wing.position.y = 0.05;
  bat.add(wing);
  return wing;
});
[-1, 1].forEach((side) => {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 8), batMat);
  ear.position.set(0.3, 0.3, side * 0.1);
  ear.rotation.x = side * 0.3;
  bat.add(ear);
});
bat.rotation.set(0.8, 0.3, 0); // banked toward us, so both wings show
bat.scale.setScalar(1.3);
batView.add(tagPart(bat, 'bat'));
const moth = new THREE.Group();
moth.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.15, 4, 8).rotateZ(Math.PI / 2), mothMat));
[-1, 1].forEach((side) => {
  const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), mothMat);
  w.position.z = side * 0.14;
  w.rotation.x = Math.PI / 2;
  moth.add(w);
});
moth.scale.setScalar(1.8);
moth.rotation.x = 0.9; // tipped toward us, so its wings show
batView.add(tagPart(moth, 'moth'));
const batOut = soundRing(outLine);
const batBack = soundRing(backLine);
tagPart(batBack, 'echo');
addLabel('bat', bat, v(0, 0.6, 0), { hideWith: batView });
addLabel('moth', moth, v(0, 0.45, 0), { hideWith: batView });

// ---------- View 2: ship ----------

const shipView = new THREE.Group();
shipView.visible = false;
scene.add(shipView);
const SEA_W = 10;
const water = new THREE.Mesh(new THREE.BoxGeometry(SEA_W, 5, 2.5), seaMat);
water.position.y = -2.5;
shipView.add(water);
// The sea floor: hills and valleys. Depth in km at each x.
const floorDepth = (x) => 2.6 + Math.sin(x * 0.9) * 0.8 + Math.sin(x * 2.3 + 1) * 0.35;
const floorShape = new THREE.Shape();
floorShape.moveTo(-SEA_W / 2, -5.2);
for (let i = 0; i <= 80; i++) {
  const x = -SEA_W / 2 + (SEA_W * i) / 80;
  floorShape.lineTo(x, -floorDepth(x));
}
floorShape.lineTo(SEA_W / 2, -5.2);
const seabed = new THREE.Mesh(new THREE.ExtrudeGeometry(floorShape, { depth: 2.4, bevelEnabled: false }).translate(0, 0, -1.2), floorMat);
shipView.add(tagPart(seabed, 'seabed'));
const ship = new THREE.Group();
// The hull: a flat deck, a rounded bottom, and a pointed bow at the front.
const hull = new THREE.Mesh(shaped((q) => {
  const bow = 1 - 0.75 * THREE.MathUtils.smoothstep(q.x, 0.2, 1);
  q.set(q.x * 0.75 + 0.12 * Math.max(0, q.y + 0.2), q.y > 0 ? 0.28 : 0.28 + q.y * 0.42, q.z * 0.3 * bow);
}, 8), hullMat);
ship.add(hull);
const cabin = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.3, 0.34, 3, 0.04), mat(0xffffff));
cabin.position.set(-0.15, 0.43, 0);
ship.add(cabin);
const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.3, 14), hullMat);
funnel.position.set(-0.25, 0.7, 0);
ship.add(funnel);
shipView.add(tagPart(ship, 'ship'));
const ping = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), outMat);
ping.renderOrder = 5; // drawn after the see-through water
ping.visible = false;
shipView.add(tagPart(ping, 'sonar'));
const pingBack = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), backMat);
pingBack.renderOrder = 5;
pingBack.visible = false;
shipView.add(tagPart(pingBack, 'echo'));
const mapDots = new THREE.Group();
shipView.add(mapDots);
addLabel('ship', ship, v(0, 0.95, 0), { hideWith: shipView });
addLabel('seabed', shipView, v(3.6, -4.2, 1.2), { hideWith: shipView });
addLabel('sonar', ping, v(0.45, 0, 0), { hideWith: ping });

// ---------- View 3: ultrasound ----------

const scanView = new THREE.Group();
scanView.visible = false;
scene.add(scanView);
const belly = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 24).scale(1.2, 1, 0.9), bellyMat);
scanView.add(belly);
const probe = new THREE.Group();
probe.position.set(0, 2.1, 0.4);
// The probe: a handle that widens to a curved face, which touches the skin.
const handle = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve([
  [0, -0.12], [0.2, -0.1], [0.3, -0.02], [0.3, 0.1], [0.17, 0.3], [0.14, 0.6], [0.15, 0.95], [0.1, 1.05], [0, 1.07],
].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(36).map((q) => q.setX(Math.max(0, q.x))), 24).scale(1, 1, 0.55), probeMat);
probe.add(handle);
scanView.add(tagPart(probe, 'probe'));
// A curled-up baby: a big head, a curved body, and an arm and a leg tucked in.
const baby = new THREE.Group();
baby.position.set(0, -0.2, 0);
const babyHead = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), babyMat);
babyHead.position.set(0.45, 0.35, 0);
const babyBody = new THREE.Mesh(shaped((q) => q.set(q.x * 0.5 + 0.2 * q.y * q.y, q.y * 0.62, q.z * 0.42), 8), babyMat);
babyBody.position.set(-0.2, -0.1, 0);
const tucked = (points, radius) => new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => v(...p))), 20, radius, 10), babyMat);
baby.add(babyHead, babyBody,
  tucked([[-0.3, -0.55, 0.25], [0.25, -0.75, 0.3], [0.3, -0.4, 0.3]], 0.12),
  tucked([[0, 0.1, 0.35], [0.3, -0.15, 0.4], [0.5, 0, 0.35]], 0.08));
scanView.add(tagPart(baby, 'baby'));
const scanRings = [0, 1, 2].map(() => soundRing(outLine));
addLabel('probe', probe, v(0.6, 0.6, 0), { hideWith: scanView });
addLabel('baby', baby, v(0, 1.0, 0), { hideWith: scanView });

// ---------- Controls ----------

const state = {
  view: 'bat', t: 0,
  batPing: null, // { t, out: radius, back: null | { t } }
  chase: null, // the bat flying to the moth
  moth: v(2.5, 0.6, 0), mothT: 0,
  shipX: -3, sonar: null, mapped: new Set(),
  scan: null, babyShown: 0,
};
const levelCard = document.getElementById('level-card');
const readout = document.getElementById('echo-readout');
const pingButton = document.getElementById('ping');
const moveControl = document.getElementById('move-control');

function aim() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  batView.visible = key === 'bat';
  shipView.visible = key === 'ship';
  scanView.visible = key === 'scan';
  [batOut, batBack, ...scanRings].forEach((r) => { r.visible = false; });
  moveControl.style.display = key === 'ship' ? '' : 'none';
  pingButton.textContent = VIEWS[key].button;
  readout.textContent = '';
  levelCard.textContent = VIEWS[key].line;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 4000, important: false });
}));

bindSlider('move', (value) => `${value} km`, (value) => {
  state.shipX = -4 + value * 0.8;
});

pingButton.addEventListener('click', () => {
  if (state.view === 'bat') {
    if (state.batPing || state.chase) return;
    state.batPing = { t: 0, back: null };
  } else if (state.view === 'ship') {
    if (state.sonar) return;
    state.sonar = { t: 0, x: state.shipX, depth: floorDepth(state.shipX) };
    readout.textContent = 'Ping! Timing the echo…';
  } else {
    if (state.scan) return;
    state.scan = { t: 0 };
  }
});

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const RING_SPEED = 3;
const WATER_SPEED = 1.5; // 1 unit is 1 km; sound in water takes 0.67 s per km, shown at real speed

stage.onFrame((dt) => {
  state.t += dt;

  // ----- Bat -----
  // The moth flutters about; the bat flaps.
  wings.forEach((w, i) => { w.rotation.x = Math.sin(state.t * 12) * 0.5 * (i ? 1 : -1); });
  if (!state.chase) {
    state.mothT += dt;
    moth.position.copy(state.moth).add(v(Math.sin(state.mothT * 1.3) * 0.6, Math.sin(state.mothT * 2.1) * 0.4, 0));
  }
  moth.rotation.y = Math.sin(state.t * 20) * 0.3;

  const bp = state.batPing;
  if (bp && batView.visible) {
    bp.t += dt;
    const radius = bp.t * RING_SPEED;
    batOut.visible = radius < 9;
    batOut.position.copy(bat.position);
    batOut.scale.setScalar(Math.max(0.05, radius));
    batOut.material.opacity = 0.7 * Math.max(0, 1 - radius / 9);
    const dist = bat.position.distanceTo(moth.position);
    if (!bp.back && radius >= dist) bp.back = { t: 0, from: moth.position.clone(), dist };
    if (bp.back) {
      bp.back.t += dt;
      // The echo shrinks back toward the bat from the moth.
      const r = Math.max(0.05, bp.back.dist - bp.back.t * RING_SPEED);
      batBack.visible = r > 0.06;
      batBack.position.copy(bat.position);
      batBack.scale.setScalar(r);
      if (r <= 0.06) {
        state.batPing = null;
        batOut.visible = false;
        batBack.visible = false;
        levelCard.textContent = 'The echo came back! The bat heard how long it took, so it knows where the moth is.';
        if (complete('squeak')) cello.say('The squeak bounced off the moth and came back. Now the bat knows where it is!', { mood: 'wow', ms: 5000 });
        state.chase = { t: 0, to: moth.position.clone() };
      }
    }
  }
  if (state.chase && batView.visible) {
    state.chase.t += dt / 1.4;
    const k = Math.min(1, state.chase.t);
    bat.position.lerpVectors(BAT_HOME, state.chase.to, k);
    if (k >= 1) {
      moth.visible = false;
      if (complete('catch')) cello.say('Gotcha! The bat found its dinner in the dark, just by listening.', { mood: 'wow', ms: 5000 });
      setTimeout(() => {
        moth.visible = true;
        state.moth = v(1 + Math.random() * 3, Math.random() * 1.6 - 0.4, 0);
        bat.position.copy(BAT_HOME);
      }, 1500);
      state.chase = null;
    }
  }

  // ----- Ship -----
  ship.position.set(state.shipX, Math.sin(state.t * 1.5) * 0.05, 0);
  const so = state.sonar;
  if (so && shipView.visible) {
    so.t += dt;
    const down = so.t * WATER_SPEED;
    ping.visible = down < so.depth;
    ping.position.set(so.x, -down, 0);
    pingBack.visible = down >= so.depth && down < so.depth * 2;
    pingBack.position.set(so.x, -(so.depth * 2 - down), 0);
    if (down >= so.depth * 2) {
      state.sonar = null;
      pingBack.visible = false;
      const seconds = (so.depth * 2) / WATER_SPEED;
      const meters = Math.round(so.depth * 1000 / 10) * 10;
      readout.textContent = `Echo after ${seconds.toFixed(1)} s. Half of that is ${(seconds / 2).toFixed(1)} s. ${(seconds / 2).toFixed(1)} × 1,500 m/s ≈ ${meters.toLocaleString()} m deep.`;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), dotMat);
      dot.renderOrder = 5;
      dot.position.set(so.x, -so.depth + 0.12, 0.9);
      mapDots.add(dot);
      state.mapped.add(Math.round(so.x * 10));
      if (complete('ping')) cello.say(`The echo took ${seconds.toFixed(1)} seconds. Half for the way down, times the speed of sound in water: about ${meters.toLocaleString()} meters deep!`, { mood: 'wow', ms: 7000 });
      if (state.mapped.size >= 5 && complete('map')) cello.say('Five spots mapped! That’s how people drew maps of the sea floor, ping by ping.', { mood: 'wow', ms: 5500 });
    }
  }

  // ----- Ultrasound -----
  const sc = state.scan;
  if (sc && scanView.visible) {
    sc.t += dt;
    scanRings.forEach((ring, i) => {
      const local = sc.t - i * 0.4;
      ring.visible = local > 0 && local < 1.2;
      ring.position.set(0, 2.0 - local * 2.2, 0.4);
      ring.rotation.x = Math.PI / 2;
      ring.scale.setScalar(0.3 + local * 0.9);
    });
    state.babyShown = Math.min(1, state.babyShown + dt * 0.4);
    if (sc.t > 2.5) {
      state.scan = null;
      levelCard.textContent = 'The echoes made a picture of the baby. Ultrasound is too high for us to hear!';
      if (complete('scan')) cello.say('Hello, baby! The echoes bounced off the baby and made a picture. No cuts, no ouch.', { mood: 'wow', ms: 5500 });
    }
  }
  babyMat.opacity = state.babyShown * 0.9;
  probe.rotation.z = state.scan ? Math.sin(state.t * 3) * 0.15 : 0;
});

setView('bat');
