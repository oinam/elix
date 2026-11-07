import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// What is a wave? Three waves to make: a rope (transverse: the beads go up
// and down while the wave goes along), a slinky (longitudinal: the coils
// bunch up and spread out, the same way the wave goes), and a pond (tap to
// drop a pebble; the duck bobs in place while the ripples pass). In every
// one, a marked bit only wiggles in place: the energy travels, the stuff
// doesn't.

const PARTS = {
  hand: { name: 'Your hand', text: 'It starts the wave. Shaking puts energy into the rope or slinky, and the wave carries that energy along.' },
  rope: { name: 'Transverse wave', text: 'The rope moves up and down, but the wave moves along. They go across each other. Light waves work like this.' },
  bead: { name: 'One bit of rope', text: 'Watch it! It only goes up and down, in the same place. The wave passes by, but the bead stays put.' },
  slinky: { name: 'Longitudinal wave', text: 'The coils move back and forth, the same way the wave goes. They bunch up (compression) and spread out (rarefaction). Sound works like this.' },
  coil: { name: 'One coil', text: 'It just wiggles back and forth in its own spot, while the bunched-up part travels down the slinky.' },
  ripples: { name: 'Ripples', text: 'Waves on water spread out in circles from where the pebble landed. They carry energy across the pond.' },
  duck: { name: 'Duck', text: 'The duck bobs up and down as the ripples pass, but it doesn’t float away with them. The water stays; the energy moves on.' },
};

const VIEWS = {
  rope: { camera: [0, 1.4, 9], target: [0, 0, 0], button: '👋 Shake it once', line: 'Shake the rope! Keep an eye on the red bead.' },
  slinky: { camera: [0, 1.6, 8.5], target: [0, 0, 0], button: '👉 Push it once', line: 'Push the slinky! Watch the coils bunch up and spread out.' },
  pond: { camera: [0, 5.5, 7.5], target: [0, 0, 0], button: '🪨 Drop a pebble', line: 'Tap the water to drop a pebble. Watch the duck!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'waves',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Waves carry energy from place to place. Let’s make one with a rope!',
  allPartsLine: 'All 7 parts! You know what a wave really is.',
  onEmptyTap: (raycaster) => dropOnPond(raycaster),
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const ropeMat = mat(0xffb978);
const beadMat = mat(0xe8443a, { emissive: 0x5a0a00 });
const handMat = mat(0xffcfa8);
const coilMat = mat(0x9ccfff, { metalness: 0.3 });
const markMat = mat(0xe8443a, { emissive: 0x5a0a00, metalness: 0.3 });
const waterMat = mat(0x4fa9e8, { roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
const duckMat = mat(0xffd75e);
const beakMat = mat(0xff8a2a);
const pebbleMat = mat(0x8a8f99);

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const SPEED = 3; // how fast every wave travels, units per second

// Pulses travel along a line from x = START. Each is { t0, size, keep }.
// A "keep going" wave is a pulse train that runs while the button is on.
const START = -4.5;
const END = 4.5;
let pulses = [];
function displacement(x, time, size = 1) {
  let d = 0;
  pulses.forEach((p) => {
    const front = START + SPEED * (time - p.t0);
    const behind = x - front;
    if (p.keep) {
      // A steady wave, from the hand up to the front.
      const end = p.t1 === undefined ? -Infinity : START + SPEED * (time - p.t1);
      if (x <= front && x >= end) d += p.size * Math.sin((x - front) * 2.2);
    } else {
      d += p.size * Math.exp(-(behind * behind) / 0.35);
    }
  });
  // Waves fade out at the far end instead of bouncing back.
  return d * size * THREE.MathUtils.smoothstep(END + 0.6 - x, 0, 1.2);
}

// ---------- View 1: rope ----------

const ropeView = new THREE.Group();
scene.add(ropeView);
const BEADS = 70;
const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 10, 8), ropeMat, BEADS);
beads.frustumCulled = false;
ropeView.add(tagPart(beads, 'rope'));
const marked = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), beadMat);
ropeView.add(tagPart(marked, 'bead'));
const MARK_X = 0.6;
const ropeHand = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14).scale(1, 1.3, 0.8), handMat);
ropeView.add(tagPart(ropeHand, 'hand'));
const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 12), mat(0x8a6040));
post.position.set(END + 0.3, -0.5, 0);
ropeView.add(post);
addLabel('rope', ropeView, v(-1.8, 1.4, 0), { hideWith: ropeView });
addLabel('bead', ropeView, v(MARK_X, -1.0, 0), { hideWith: ropeView });
addLabel('hand', ropeView, v(START - 0.4, -0.8, 0), { hideWith: ropeView });

// ---------- View 2: slinky ----------

const slinkyView = new THREE.Group();
slinkyView.visible = false;
scene.add(slinkyView);
const COILS = 48;
const coils = new THREE.InstancedMesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32).rotateY(Math.PI / 2), coilMat, COILS);
coils.frustumCulled = false;
slinkyView.add(tagPart(coils, 'slinky'));
const markedCoil = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 32).rotateY(Math.PI / 2), markMat);
slinkyView.add(tagPart(markedCoil, 'coil'));
const MARK_COIL = 24;
const slinkyHand = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14).scale(0.8, 1.3, 1), handMat);
slinkyView.add(tagPart(slinkyHand, 'hand'));
addLabel('slinky', slinkyView, v(-1.5, 1.0, 0), { hideWith: slinkyView });
addLabel('coil', slinkyView, v(0, -0.9, 0), { hideWith: slinkyView });

// ---------- View 3: pond ----------

const pondView = new THREE.Group();
pondView.visible = false;
scene.add(pondView);
const POND = 9;
const pondGeo = new THREE.PlaneGeometry(POND, POND, 90, 90).rotateX(-Math.PI / 2);
const pond = new THREE.Mesh(pondGeo, waterMat);
pondView.add(pond);
// The water itself is tappable as "ripples" only by its own tap handler, so
// a tap anywhere drops a pebble. The ripples part is a ring that follows the
// newest ripple.
const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 64).rotateX(Math.PI / 2), mat(0xffffff, { transparent: true, opacity: 0.5 }));
ring.visible = false;
pondView.add(tagPart(ring, 'ripples'));

const duck = new THREE.Group();
const DUCK_AT = v(2.2, 0, 1.4);
duck.position.copy(DUCK_AT);
const duckBody = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 14).scale(1.3, 0.8, 1), duckMat);
duck.add(duckBody);
const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), duckMat);
duckHead.position.set(0.35, 0.35, 0);
duck.add(duckHead);
const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 10).rotateZ(-Math.PI / 2), beakMat);
beak.position.set(0.58, 0.33, 0);
duck.add(beak);
pondView.add(tagPart(duck, 'duck'));
addLabel('duck', duck, v(0, 0.9, 0), { hideWith: pondView });

const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), pebbleMat);
pebble.visible = false;
pondView.add(pebble);

let ripples = []; // { at, t0, size }
let falling = null; // { at, t }

function rippleHeight(x, z, time) {
  let h = 0;
  ripples.forEach((r) => {
    const dist = Math.hypot(x - r.at.x, z - r.at.z);
    const front = SPEED * 0.8 * (time - r.t0);
    const behind = front - dist;
    if (behind < 0 || behind > 3) return;
    h += r.size * Math.sin(behind * 4) * (1 - behind / 3) / (1 + dist * 0.6);
  });
  return h;
}

function dropAt(point) {
  if (falling) return;
  falling = { at: point.clone().setY(0), t: 0 };
  pebble.position.copy(point).setY(3);
  pebble.visible = true;
}

function dropOnPond(raycaster) {
  if (state.view !== 'pond') return;
  const hit = raycaster.intersectObject(pond)[0];
  if (hit) dropAt(hit.point);
}

// ---------- Controls ----------

const state = { view: 'rope', time: 0, size: 5, keep: false, duckHit: false };
const levelCard = document.getElementById('level-card');
const goButton = document.getElementById('go');
const keepButton = document.getElementById('keep');

function aim() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  ropeView.visible = key === 'rope';
  slinkyView.visible = key === 'slinky';
  pondView.visible = key === 'pond';
  pulses = [];
  if (state.keep) keepButton.click();
  keepButton.disabled = key === 'pond';
  goButton.textContent = VIEWS[key].button;
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 4000, important: false });
}));

const amp = () => 0.12 + state.size * 0.09;

goButton.addEventListener('click', () => {
  if (state.view === 'pond') {
    dropAt(v((Math.random() - 0.5) * 3 - 1, 0, (Math.random() - 0.5) * 3 - 0.5));
    return;
  }
  pulses.push({ t0: state.time, size: amp() });
  sent();
});

bindToggle('keep', (on) => {
  state.keep = on;
  if (on) {
    pulses.push({ t0: state.time, size: amp(), keep: true });
    sent();
  } else {
    const p = pulses.find((x) => x.keep && x.t1 === undefined);
    if (p) p.t1 = state.time;
  }
});

function sent() {
  if (state.size >= 9 && complete('hard')) {
    cello.say('A hard shake puts in more energy, so the wave is bigger!', { mood: 'wow', ms: 5000 });
  }
}

bindSlider('size', (value) => (value <= 3 ? 'gentle' : value >= 8 ? 'hard!' : 'medium'), (value) => { state.size = value; });

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const m = new THREE.Matrix4();
const pos = pondGeo.attributes.position;
let seenAtMark = 0;

stage.onFrame((dt) => {
  state.time += dt;
  const time = state.time;
  // Old pulses that have left the far end can go.
  pulses = pulses.filter((p) => (p.keep ? p.t1 === undefined || START + SPEED * (time - p.t1) < END + 2 : START + SPEED * (time - p.t0) < END + 3));

  if (state.view === 'rope') {
    for (let i = 0; i < BEADS; i++) {
      const x = START + ((END - START) * i) / (BEADS - 1);
      beads.setMatrixAt(i, m.makeTranslation(x, displacement(x, time), 0));
    }
    beads.instanceMatrix.needsUpdate = true;
    marked.position.set(MARK_X, displacement(MARK_X, time), 0);
    ropeHand.position.set(START - 0.35, displacement(START, time), 0);
    if (Math.abs(marked.position.y) > 0.3) seenAtMark += dt;
    if (seenAtMark > 0.3 && complete('rope')) {
      levelCard.textContent = 'The wave went all the way along, but the red bead only went up and down!';
      cello.say('See? The red bead went up and down, but stayed in its spot. The wave carried the energy along!', { mood: 'wow', ms: 6000 });
    }
  } else if (state.view === 'slinky') {
    const spacing = (END - START) / (COILS - 1);
    let squeeze = 0;
    for (let i = 0; i < COILS; i++) {
      const x = START + spacing * i;
      const dx = displacement(x, time) * 0.5;
      coils.setMatrixAt(i, m.makeTranslation(x + dx, 0, 0));
      squeeze = Math.max(squeeze, Math.abs(dx));
    }
    coils.instanceMatrix.needsUpdate = true;
    const mx = START + spacing * MARK_COIL;
    markedCoil.position.set(mx + displacement(mx, time) * 0.5, 0, 0);
    slinkyHand.position.set(START - 0.45 + displacement(START, time) * 0.5, 0, 0);
    if (squeeze > 0.15 && Math.abs(markedCoil.position.x - mx) > 0.12 && complete('slinky')) {
      levelCard.textContent = 'Bunched up: a compression. Spread out: a rarefaction. Sound travels like this!';
      cello.say('The coils bunch up and spread out, back and forth, the same way the wave goes. That’s how sound travels!', { mood: 'wow', ms: 6500 });
    }
  } else {
    // The pebble falls, then starts a ripple.
    if (falling) {
      falling.t += dt;
      pebble.position.y = 3 - 4.9 * falling.t * falling.t;
      pebble.position.x = falling.at.x;
      pebble.position.z = falling.at.z;
      if (pebble.position.y <= 0) {
        ripples.push({ at: falling.at, t0: time, size: amp() * 0.9 });
        pebble.visible = false;
        falling = null;
        if (complete('pebble')) cello.say('Plop! Ripples spread out in circles. Now watch the duck.', { ms: 4000 });
      }
    }
    ripples = ripples.filter((r) => time - r.t0 < 6);
    for (let i = 0; i < pos.count; i++) pos.setY(i, rippleHeight(pos.getX(i), pos.getZ(i), time));
    pos.needsUpdate = true;
    pondGeo.computeVertexNormals();

    // The duck bobs in place: its x and z never change.
    const h = rippleHeight(DUCK_AT.x, DUCK_AT.z, time);
    duck.position.set(DUCK_AT.x, 0.12 + h, DUCK_AT.z);
    duck.rotation.z = (rippleHeight(DUCK_AT.x + 0.3, DUCK_AT.z, time) - rippleHeight(DUCK_AT.x - 0.3, DUCK_AT.z, time)) * 1.2;
    if (Math.abs(h) > 0.06 && !state.duckHit) {
      state.duckHit = true;
      setTimeout(() => {
        levelCard.textContent = 'The duck went up and down, but it didn’t float away. The water stays; the energy moves on.';
        if (complete('duck')) cello.say('The duck bobbed up and down, but stayed right there! Waves move energy, not water.', { mood: 'wow', ms: 6000 });
        state.duckHit = false;
      }, 1500);
    }

    // The ring follows the newest ripple, so it can be tapped.
    const r = ripples[ripples.length - 1];
    ring.visible = !!r;
    if (r) {
      const radius = Math.max(0.1, SPEED * 0.8 * (time - r.t0));
      ring.position.set(r.at.x, 0.05, r.at.z);
      ring.scale.set(radius, 1, radius);
      ring.visible = radius < POND;
    }
  }
});

setView('rope');
