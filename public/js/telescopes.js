import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer } from './explorer.js';

// Telescopes. Follow light through a lens telescope (a big lens bends the
// light to a point, a small eyepiece lens sends it to your eye), a mirror
// telescope (a curved mirror bounces it to a small flat mirror and out the
// side), and a radio telescope (a dish catches radio waves). Then look at
// the Moon with three eyepieces: power = 500 mm ÷ the eyepiece.

const PARTS = {
  lens: { name: 'Big lens', text: 'The big lens at the front gathers lots of light and bends it to meet at one point. That’s refraction at work.' },
  eyepiece: { name: 'Eyepiece', text: 'The small lens you look through. It makes the picture bigger. Swap eyepieces to zoom in more or less.' },
  tube: { name: 'Tube', text: 'It holds the lenses or mirrors in the right places, and keeps stray light out.' },
  mirror: { name: 'Curved mirror', text: 'A big mirror, curved like a shallow bowl. It bounces the light to meet at one point. That’s reflection at work.' },
  flat: { name: 'Small flat mirror', text: 'It turns the light sideways, out to the eyepiece, so your head isn’t in the way.' },
  dish: { name: 'Radio dish', text: 'A giant curved dish. It bounces radio waves from space to a receiver, the same way a curved mirror bounces light.' },
  moon: { name: 'The Moon', text: 'About 384,000 km away. Through a telescope you can see its craters and mountains, like Galileo did.' },
};

const VIEWS = {
  lens: { camera: [0, 1.5, 9], target: [0.5, 0, 0], line: 'Light from far away comes in on the right. Watch the big lens bend it.' },
  mirror: { camera: [0, 1.6, 9], target: [0.5, 0.2, 0], line: 'This one uses a curved mirror at the back. Watch the light bounce.' },
  radio: { camera: [0, 1.0, 9], target: [0, 0.6, 0], line: 'Radio waves from space are invisible. A big dish catches them.' },
  moon: { camera: [0, 0, 6], target: [0, 0, 0], line: 'Pick an eyepiece to zoom in on the Moon.' },
};
const FOCAL = 500; // the telescope's focal length, in mm

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'telescopes',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['tube'],
  greeting: 'Telescopes bring faraway things close! Let’s see how they bend and bounce light.',
  allPartsLine: 'All 7 parts! You know how telescopes work.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const glassMat = mat(0xbfe6ff, { transparent: true, opacity: 0.55, roughness: 0.05 });
const tubeMat = mat(0x5b6b8a, { transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
const mirrorMat = mat(0xe8eef5, { metalness: 0.3, roughness: 0.1, emissive: 0x3a4a5a, side: THREE.DoubleSide });
const dotMat = basic(0xfff3a0);
const eyeMat = mat(0xffffff);

// A thin glowing path through a list of points.
function line(points, color = 0xffd75e) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(points[i - 1], points[i]));
  return new THREE.Mesh(new THREE.TubeGeometry(path, points.length * 16, 0.022, 6, false), basic(color));
}

// Light dots running along each ray path, to show which way light goes.
const runners = [];
function runner(parent, points) {
  const curve = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
  const dots = Array.from({ length: 3 }, (_, i) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dotMat);
    d.userData.t = i / 3;
    parent.add(d);
    return d;
  });
  parent.add(line(points));
  runners.push({ curve, dots, parent });
}

function lensShape(radius, thickness, material) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16).scale(thickness, 1, 1), material);
}

function eyeball(at) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), eyeMat);
  eye.position.copy(at);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), basic(0x22252a));
  pupil.position.copy(at).add(v(0.2, 0, 0));
  return [eye, pupil];
}

// ---------- Lens telescope ----------

const lensView = new THREE.Group();
scene.add(lensView);
const tube1 = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 5, 32, 1, true).rotateZ(Math.PI / 2), tubeMat);
tube1.position.x = 0.1;
lensView.add(tagPart(tube1, 'tube'));
const objective = lensShape(0.82, 0.12, glassMat);
objective.position.x = 2.5;
lensView.add(tagPart(objective, 'lens'));
const eyepiece1 = lensShape(0.28, 0.25, glassMat);
eyepiece1.position.x = -2.3;
lensView.add(tagPart(eyepiece1, 'eyepiece'));
lensView.add(...eyeball(v(-3.1, 0, 0)));
const F1 = v(-1.9, 0, 0);
[0.55, 0, -0.55].forEach((y) => {
  runner(lensView, [v(6, y, 0), v(2.5, y, 0), F1, v(-2.3, -y * 0.09, 0), v(-2.95, -y * 0.09, 0)]);
});
addLabel('lens', objective, v(0, 1.15, 0), { hideWith: lensView });
addLabel('eyepiece', eyepiece1, v(0, -0.6, 0), { hideWith: lensView });
addLabel('tube', tube1, v(0, 1.15, 0), { hideWith: lensView });
const focus1 = makeLabel('Light meets here');
focus1.position.copy(F1).add(v(0, -0.45, 0));
lensView.add(focus1);

// ---------- Mirror telescope ----------

const mirrorView = new THREE.Group();
mirrorView.visible = false;
scene.add(mirrorView);
const tube2 = new THREE.Mesh(tube1.geometry, tubeMat);
tube2.position.x = 0.1;
mirrorView.add(tagPart(tube2, 'tube'));
// A shallow bowl at the back, hollow side facing the open end. A sphere's
// mirror focuses at half its radius: 7.4 / 2 = 3.7, right at the flat mirror.
const BOWL_R = 7.4;
const bowl = new THREE.Mesh(new THREE.SphereGeometry(BOWL_R, 40, 12, 0, Math.PI * 2, 0, 0.12).rotateZ(Math.PI / 2), mirrorMat);
bowl.position.x = -2.3 + BOWL_R;
mirrorView.add(tagPart(bowl, 'mirror'));
const flat = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.45), mirrorMat);
flat.position.set(1.4, 0, 0);
flat.rotation.z = Math.PI / 4;
mirrorView.add(tagPart(flat, 'flat'));
const eyepiece2 = lensShape(0.22, 0.25, glassMat);
eyepiece2.rotation.z = Math.PI / 2;
eyepiece2.position.set(1.4, 1.05, 0);
mirrorView.add(tagPart(eyepiece2, 'eyepiece'));
const eye2 = eyeball(v(1.4, 1.75, 0));
eye2[1].position.copy(eye2[0].position).add(v(0, -0.2, 0));
mirrorView.add(...eye2);
[0.55, 0.25, -0.55].forEach((y) => {
  runner(mirrorView, [v(6, y, 0), v(-2.2, y, 0), v(1.4, y * 0.06, 0), v(1.4, 1.5, 0)]);
});
addLabel('mirror', mirrorView, v(-2.3, 1.2, 0), { hideWith: mirrorView });
addLabel('flat', flat, v(0.5, -0.5, 0), { hideWith: mirrorView });

// ---------- Radio telescope ----------

const radioView = new THREE.Group();
radioView.visible = false;
scene.add(radioView);
const dish = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 12, 0, Math.PI * 2, 0, 0.5).rotateX(Math.PI), mat(0xf4f4f4, { side: THREE.DoubleSide }));
dish.position.y = 3.2;
radioView.add(tagPart(dish, 'dish'));
const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 1.6, 12), mat(0x9aa0aa));
stand.position.y = -1.6;
radioView.add(stand);
const RECEIVER = v(0, 1.2, 0);
const receiver = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), mat(0x5b8def, { emissive: 0x1a3a8a, emissiveIntensity: 0 }));
receiver.position.copy(RECEIVER);
radioView.add(receiver);
[-1.4, 1.4].forEach((x) => {
  const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 6), mat(0x9aa0aa));
  strut.position.set(x / 2, 0.55, 0);
  strut.rotation.z = x > 0 ? 0.75 : -0.75;
  radioView.add(strut);
});
// Long, wavy radio waves coming straight down, bouncing to the receiver.
const radioWaves = [-1.6, -0.8, 0.8, 1.6].map((x) => {
  const bottom = 3.2 - Math.sqrt(16 - x * x);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const y = 4.2 - (i / 40) * (4.2 - bottom);
    pts.push(v(x + Math.sin(i * 0.9) * 0.08, y, 0));
  }
  pts.push(RECEIVER.clone());
  const wave = line(pts, 0xc49bff);
  radioView.add(wave);
  return wave;
});
addLabel('dish', radioView, v(2.6, -0.2, 0), { hideWith: radioView });
const receiverTag = makeLabel('Receiver');
receiverTag.position.copy(RECEIVER).add(v(0, 0.35, 0));
radioView.add(receiverTag);

// ---------- Looking at the Moon ----------

const moonView = new THREE.Group();
moonView.visible = false;
scene.add(moonView);
const moon = new THREE.Group();
moon.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat(0xd8d4c8, { roughness: 0.95 })));
for (let i = 0; i < 40; i++) {
  const crater = new THREE.Mesh(new THREE.CircleGeometry(0.03 + Math.random() * 0.12, 16), mat(0x9a968c, { roughness: 1 }));
  const dir = new THREE.Vector3().randomDirection();
  if (dir.z < 0) dir.z = -dir.z; // keep them on the side we see
  crater.position.copy(dir).multiplyScalar(1.002);
  crater.lookAt(dir.clone().multiplyScalar(2));
  moon.add(crater);
}
moonView.add(tagPart(moon, 'moon'));
// A dark circle around the view, like looking through the eyepiece.
const ringView = new THREE.Mesh(new THREE.RingGeometry(2.3, 12, 64), basic(0x0b0d12));
ringView.position.z = 1.8;
moonView.add(ringView);
const sky = new THREE.Mesh(new THREE.CircleGeometry(8, 64), basic(0x0b0d12));
sky.position.z = -3;
moonView.add(sky);
addLabel('moon', moonView, v(0, -1.9, 1.9), { hideWith: moonView });

// ---------- Controls ----------

const state = { view: 'lens', eye: 25, seen: new Set(), moonScale: 0.4 };
const levelCard = document.getElementById('level-card');
const powerEl = document.getElementById('power');

function aim() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  lensView.visible = key === 'lens';
  mirrorView.visible = key === 'mirror';
  radioView.visible = key === 'radio';
  moonView.visible = key === 'moon';
  controls.enabled = key !== 'moon';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aim();
  state.seen.delete(key);
  state.viewTime = 0;
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 4000, important: false });
}));

function showPower() {
  const power = FOCAL / state.eye;
  powerEl.textContent = `${FOCAL} mm ÷ ${state.eye} mm = ${power} times bigger`;
  document.querySelectorAll('[data-eye]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.eye) === state.eye)));
  return power;
}

document.querySelectorAll('[data-eye]').forEach((b) => b.addEventListener('click', () => {
  state.eye = Number(b.dataset.eye);
  const power = showPower();
  if (state.view !== 'moon') setView('moon');
  levelCard.textContent = `${power} times bigger! A shorter eyepiece zooms in more.`;
  if (power >= 100 && complete('zoom')) cello.say('100 times bigger! Look at all those craters. Galileo would be jealous!', { mood: 'wow', ms: 5000 });
  else cello.say(`${power} times bigger!`, { ms: 2500, important: false });
}));

document.getElementById('reset').addEventListener('click', aim);

// ---------- Animation ----------

const p = new THREE.Vector3();
const LINES = {
  lens: 'The big lens bent the light to meet at one point, and the eyepiece sent it to your eye!',
  mirror: 'The curved mirror bounced the light to a point. The flat mirror sent it out the side to your eye!',
  radio: 'The dish bounced the radio waves to the receiver. Scientists listen to stars and galaxies this way!',
};

stage.onFrame((dt) => {
  runners.forEach((r) => {
    if (!r.parent.visible) return;
    r.dots.forEach((d) => {
      d.userData.t = (d.userData.t + dt * 0.25) % 1;
      r.curve.getPointAt(d.userData.t, p);
      d.position.copy(p);
    });
  });
  radioWaves.forEach((w, i) => { w.position.y = Math.sin(performance.now() / 300 + i) * 0.03; });
  receiver.material.emissiveIntensity = radioView.visible ? 0.4 + Math.sin(performance.now() / 150) * 0.3 : 0;

  // A few seconds of watching earns the star for that telescope.
  if (state.view in LINES) {
    state.viewTime = (state.viewTime ?? 0) + dt;
    if (state.viewTime > 4 && !state.seen.has(state.view)) {
      state.seen.add(state.view);
      if (complete(state.view)) cello.say(LINES[state.view], { mood: 'wow', ms: 6000 });
    }
  }

  // The Moon grows smoothly to the chosen power.
  const target = 0.25 + (FOCAL / state.eye) * 0.018;
  state.moonScale += (target - state.moonScale) * Math.min(1, dt * 3);
  moon.scale.setScalar(state.moonScale);
  moon.rotation.y += dt * 0.02;
});

showPower();
setView('lens');
