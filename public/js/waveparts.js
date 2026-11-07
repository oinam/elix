import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// Parts of a wave. A strip of sea with a crest, a trough, the calm water
// line, and two measures that follow the wave: amplitude (from the calm line
// up to a crest) and wavelength (crest to crest). A post counts the waves
// going past each second (frequency). The waves keep the same speed, so more
// waves each second makes each one shorter. A boat rocks harder in bigger
// waves, and a big enough wave washes the sandcastle away.

const PARTS = {
  crest: { name: 'Crest', text: 'The very top of a wave. Surfers ride just in front of it!' },
  trough: { name: 'Trough', text: 'The lowest part of a wave, the dip between two crests.' },
  rest: { name: 'Calm water line', text: 'Where the water would sit if there were no waves at all. Waves go up above it and down below it.' },
  amplitude: { name: 'Amplitude', text: 'How far the wave rises from the calm water line up to the crest. A bigger amplitude means a taller wave with more energy.' },
  wavelength: { name: 'Wavelength', text: 'The distance from one crest to the next crest. (Trough to trough works too!)' },
  post: { name: 'Counting post', text: 'Count how many crests go past it in one second. That number is the frequency, measured in hertz (Hz).' },
  boat: { name: 'Boat', text: 'It bobs up and down as the waves pass. Bigger waves carry more energy, so they rock it harder.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(-0.4, 1.2, 11);
const TARGET_HOME = new THREE.Vector3(-0.4, 0.3, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'waveparts',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Every wave has the same parts. Slide the amplitude and frequency, and watch them change!',
  allPartsLine: 'All 7 parts! You can measure any wave now.',
  onPart: (key) => {
    if (key === 'wavelength' && stage.isPaused() && explorer.complete('pause')) {
      explorer.cello.say('Frozen! From this crest to the next one: that’s one wavelength.', { mood: 'wow', ms: 5000 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });
const seaMat = mat(0x3f9de0, { roughness: 0.2, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
const sandMat = mat(0xf2d79a);
const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
const crestMat = mat(0xff5a7a, { emissive: 0x5a0a20 });
const troughMat = mat(0x5b4bd6, { emissive: 0x1a1060 });
const ampMat = mat(0xffd75e, { emissive: 0x6a5000 });
const wlMat = mat(0x22e2cc, { emissive: 0x0a5a50 });
const postMat = mat(0xe8443a);
const boatMat = mat(0xe8443a);
const sailMat = mat(0xffffff, { side: THREE.DoubleSide });

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const LEFT = -6;
const RIGHT = 4.6;
const SPEED = 3; // the waves always travel this fast
const FRONT = 1.3; // z of the front edge, where the measures sit

// ---------- The sea ----------

const seaGeo = new THREE.PlaneGeometry(RIGHT - LEFT, 2.6, 240, 4).rotateX(-Math.PI / 2).translate((LEFT + RIGHT) / 2, 0, 0);
const sea = new THREE.Mesh(seaGeo, seaMat);
scene.add(sea);
// The front edge of the sea, drawn as a line, so the wave shape is clear.
const EDGE = 240;
const edge = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), mat(0xbfe6ff, { emissive: 0x3a7aa8 }), EDGE);
edge.frustumCulled = false;
scene.add(edge);

const beach = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 2.8), sandMat);
beach.position.set(RIGHT + 1, -0.1, 0);
scene.add(beach);

// The calm water line: dashes along the front.
const rest = new THREE.Group();
for (let x = LEFT; x < RIGHT; x += 0.4) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), lineMat);
  dash.position.set(x + 0.11, 0, FRONT + 0.05);
  rest.add(dash);
}
scene.add(tagPart(rest, 'rest'));

// Markers that follow a crest and a trough.
const crest = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 16).rotateX(Math.PI), crestMat);
scene.add(tagPart(crest, 'crest'));
const trough = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 16), troughMat);
scene.add(tagPart(trough, 'trough'));

// The two measures: amplitude (up from the calm line) and wavelength (across).
const measures = new THREE.Group();
scene.add(measures);
const ampBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), ampMat);
measures.add(tagPart(ampBar, 'amplitude'));
const wlBar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.07, 0.07), wlMat);
const wlEnds = [0, 1].map(() => {
  const end = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), wlMat);
  measures.add(tagPart(end, 'wavelength'));
  return end;
});
measures.add(tagPart(wlBar, 'wavelength'));

// The counting post, and a boat.
const POST_X = -3.5;
const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12), postMat);
post.position.set(POST_X, 0.3, -0.9);
scene.add(tagPart(post, 'post'));
const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), postMat);
flag.position.set(POST_X + 0.25, 1.75, -0.9);
scene.add(tagPart(flag, 'post'));

const BOAT_X = 1.4;
const boat = new THREE.Group();
const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.3, 0.3, 4, 1).rotateY(Math.PI / 4).scale(1.4, 1, 0.6), boatMat);
boat.add(hull);
const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), mat(0x8a6040));
mast.position.y = 0.6;
boat.add(mast);
const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([v(0, 0.2, 0), v(0, 1.05, 0), v(0.5, 0.2, 0)]), sailMat);
sail.geometry.computeVertexNormals();
boat.add(sail);
scene.add(tagPart(boat, 'boat'));

// A sandcastle on the beach.
const castle = new THREE.Group();
castle.position.set(RIGHT + 0.6, 0.3, 0);
[[0, 0, 0.5, 0.4], [-0.3, 0, 0.25, 0.6], [0.3, 0, 0.25, 0.6]].forEach(([x, z, w, h]) => {
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.8, w, h, 12), sandMat);
  tower.position.set(x, h / 2, z);
  castle.add(tower);
});
castle.visible = false;
scene.add(castle);

addLabel('crest', crest, v(0, 0.45, 0));
addLabel('trough', trough, v(0, -0.45, 0));
addLabel('amplitude', ampBar, v(-0.75, 0, 0), { hideWith: measures });
addLabel('wavelength', wlBar, v(0, 0.3, 0), { hideWith: measures });
addLabel('rest', rest, v(RIGHT - 1.4, 0.22, FRONT));
addLabel('post', post, v(0, 1.9, 0));
addLabel('boat', boat, v(0, 1.4, 0));

// ---------- Controls ----------

const state = { amp: 0.4, freq: 0.5, phase: 0, castle: 0, count: 0, lastSign: 0, counted: [] };
const readout = document.getElementById('readout');
const wavelength = () => SPEED / state.freq;

function showReadout() {
  readout.textContent = `Amplitude ${state.amp.toFixed(1)} m · Wavelength ${wavelength().toFixed(1)} m · Frequency ${state.freq} Hz`;
}

bindSlider('amp', (value) => `${(value * 0.1).toFixed(1)} m`, (value) => {
  state.amp = value * 0.1;
  showReadout();
  if (value >= 10 && complete('tall')) cello.say('Huge waves! A big amplitude means lots of energy. Look at the boat rock!', { mood: 'wow', ms: 5000 });
  if (value <= 1 && complete('calm')) cello.say('Calm sea. A tiny amplitude carries only a little energy.', { mood: 'wow', ms: 4500 });
});

bindSlider('freq', (value) => `${value * 0.25} Hz`, (value) => {
  state.freq = value * 0.25;
  showReadout();
  if (value >= 6 && complete('fast')) {
    cello.say('More waves each second, so each wave is shorter! High frequency means a short wavelength.', { mood: 'wow', ms: 6000 });
  }
});

bindToggle('ruler', (on) => {
  measures.visible = on;
  explorer.showLabels();
});

document.getElementById('castle').addEventListener('click', () => {
  castle.visible = true;
  state.castle = 0;
  castle.rotation.set(0, 0, 0);
  castle.scale.setScalar(1);
  cello.say(state.amp >= 0.8 ? 'A sandcastle! Uh oh, the waves are big today…' : 'A sandcastle! Can the waves reach it? Try a big amplitude.', { ms: 4000 });
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const m = new THREE.Matrix4();
const pos = seaGeo.attributes.position;
const k = () => (Math.PI * 2) / wavelength();
const height = (x) => state.amp * Math.sin(k() * x - state.phase);

// Where the crest nearest to x0 is right now.
function crestNear(x0, offset = Math.PI / 2) {
  const n = Math.round((k() * x0 - state.phase - offset) / (Math.PI * 2));
  return (offset + Math.PI * 2 * n + state.phase) / k();
}

stage.onFrame((dt) => {
  state.phase += dt * Math.PI * 2 * state.freq;

  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i)));
  pos.needsUpdate = true;
  seaGeo.computeVertexNormals();
  for (let i = 0; i < EDGE; i++) {
    const x = LEFT + ((RIGHT - LEFT) * i) / (EDGE - 1);
    edge.setMatrixAt(i, m.makeTranslation(x, height(x), FRONT));
  }
  edge.instanceMatrix.needsUpdate = true;

  // Markers follow a crest and the trough after it.
  const cx = crestNear(-1.2);
  const tx = crestNear(cx + wavelength() / 2, -Math.PI / 2);
  crest.position.set(cx, state.amp + 0.3, FRONT);
  trough.position.set(tx, -state.amp - 0.3, FRONT);

  // Amplitude: from the calm line up to that crest. Wavelength: crest to crest.
  ampBar.position.set(cx - 0.3, state.amp / 2, FRONT + 0.1);
  ampBar.scale.y = Math.max(0.05, state.amp);
  const top = state.amp + 0.75;
  wlBar.position.set(cx + wavelength() / 2, top, FRONT + 0.1);
  wlBar.scale.x = wavelength();
  wlEnds[0].position.set(cx, top, FRONT + 0.1);
  wlEnds[1].position.set(cx + wavelength(), top, FRONT + 0.1);
  measures.visible = document.getElementById('ruler').getAttribute('aria-pressed') === 'true' && cx + wavelength() < RIGHT + 1.5;

  // The flag dips when a crest passes the post.
  const atPost = height(POST_X);
  flag.material.emissive.setHex(atPost > state.amp * 0.9 ? 0x6a1010 : 0x000000);

  // The boat rides the wave and tilts with it.
  boat.position.set(BOAT_X, height(BOAT_X) + 0.05, 0);
  boat.rotation.z = Math.atan((height(BOAT_X + 0.2) - height(BOAT_X - 0.2)) / 0.4);

  // Big waves wash the sandcastle away.
  if (castle.visible) {
    if (state.amp >= 0.8) state.castle = Math.min(1, state.castle + dt * 0.4);
    castle.scale.y = 1 - state.castle * 0.85;
    castle.rotation.z = -state.castle * 0.5;
    if (state.castle >= 1) {
      castle.visible = false;
      if (complete('castle')) cello.say('Splash! Big waves carry lots of energy, enough to wash a sandcastle away!', { mood: 'wow', ms: 5500 });
    }
  }
});

showReadout();
explorer.showLabels();
