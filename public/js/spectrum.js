import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// The electromagnetic spectrum. Slide from radio waves to gamma rays: the
// wave gets shorter, its energy goes up, and a thing that uses each kind
// appears beside it (a radio tower, a microwave oven, a warm hand, a
// rainbow, the Sun, an X-ray, a radioactive sign). Send sunlight across
// space to Earth, and answer the book's question about microwaves and light.

const BANDS = [
  { key: 'radio', name: 'Radio waves', size: 'as long as a football field, or longer', use: 'They carry radio, TV, and phone signals through the air.', length: 3.2, color: 0xc49bff },
  { key: 'micro', name: 'Microwaves', size: 'about as long as your finger', use: 'A microwave oven uses them to heat food. Wi-Fi and phones use them too.', length: 2.0, color: 0x9ccfff },
  { key: 'infrared', name: 'Infrared', size: 'thinner than a hair', use: 'You feel infrared as heat, from the Sun, a fire, or a warm hand. TV remotes use it too.', length: 1.2, color: 0xff7a5a },
  { key: 'visible', name: 'Visible light', size: 'about 400 to 700 nanometers, far tinier than a hair', use: 'The only waves our eyes can see! All the colors of the rainbow.', length: 0.75, color: 0xffffff },
  { key: 'uv', name: 'Ultraviolet (UV)', size: 'even tinier than visible light', use: 'UV from the Sun gives you a tan or a sunburn. Sunscreen blocks it.', length: 0.45, color: 0xb36bff },
  { key: 'xray', name: 'X-rays', size: 'about as small as an atom', use: 'They pass through skin but not bone, so doctors can see your bones.', length: 0.26, color: 0x7fe3ff },
  { key: 'gamma', name: 'Gamma rays', size: 'smaller than an atom', use: 'The most energy of all. They come from radioactive materials and exploding stars, and they’re dangerous to living things.', length: 0.14, color: 0x8de8a8 },
];

const PARTS = {
  wave: { name: 'Electromagnetic wave', text: 'Light, radio waves, X-rays: all the same kind of wave, just with different wavelengths. They travel even through empty space.' },
  tower: { name: 'Radio tower', text: 'It sends out radio waves. Radios, TVs, and phones catch them and turn them into sound and pictures.' },
  oven: { name: 'Microwave oven', text: 'Microwaves make the water in food jiggle, and that heats the food up.' },
  hand: { name: 'Warm hand', text: 'Your body gives off infrared, which is heat you can’t see. Special cameras can see it!' },
  rainbow: { name: 'Rainbow', text: 'Visible light holds all the colors: red, orange, yellow, green, blue, indigo, and violet.' },
  sun: { name: 'The Sun', text: 'The Sun sends us visible light, infrared (heat), and ultraviolet. Wear sunscreen to block the UV!' },
  xray: { name: 'X-ray picture', text: 'X-rays go through skin and muscle, but bones stop them. So bones show up white on the picture.' },
  gamma: { name: 'Radioactive sign', text: 'This sign warns about gamma rays. They carry so much energy that they can hurt living things.' },
};
const OBJECT_FOR = ['tower', 'oven', 'hand', 'rainbow', 'sun', 'xray', 'gamma'];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.6, 9.5);
const TARGET_HOME = new THREE.Vector3(0, 0.1, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'spectrum',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Light is part of a big family of waves! Slide to meet them all.',
  allPartsLine: 'All 8 parts! You know the whole light family.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const waveMat = mat(0xffffff, { emissive: 0x444444 });
const metalMat = mat(0xb8c0cc, { metalness: 0.5 });
const ovenMat = mat(0xeeeeee);
const glowMat = mat(0xffd36b, { emissive: 0xff8a2a, emissiveIntensity: 0.6 });
const skinIR = mat(0xff5a3a, { emissive: 0xff3a1a, emissiveIntensity: 0.5 });
const sunMat = mat(0xffd75e, { emissive: 0xffa800, emissiveIntensity: 0.9 });
const fleshMat = mat(0x5b8def, { transparent: true, opacity: 0.35, depthWrite: false });
const boneMat = mat(0xffffff, { emissive: 0x8899aa });
const signMat = mat(0xffd75e);
const blackMat = mat(0x22252a);
const earthMat = mat(0x3f8de0);
const photonMat = mat(0xfff3a0, { emissive: 0xffd000 });

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const RAINBOW = [0xe8443a, 0xff8a2a, 0xffd75e, 0x4cb050, 0x5b8def, 0x4b3aa8, 0x9b4ad8];

// ---------- The wave ----------

const WAVE_LEFT = -5;
const WAVE_RIGHT = 1.2;
const DOTS = 1400;
const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), waveMat, DOTS);
dots.frustumCulled = false;
scene.add(tagPart(dots, 'wave'));
addLabel('wave', scene, v(-2, 1.1, 0));

// ---------- One thing for each kind of wave ----------

const shows = BANDS.map(() => {
  const g = new THREE.Group();
  g.position.set(3.2, -0.2, 0);
  g.visible = false;
  scene.add(g);
  return g;
});

// Radio tower: a tall mast with rings of signal.
{
  const mast = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 4, 1, true), metalMat);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), mat(0xe8443a, { emissive: 0x7a0a00 }));
  tip.position.y = 1.65;
  shows[0].add(tagPart(new THREE.Group().add(mast, tip), 'tower'));
}
// Microwave oven: a box with a glowing window.
{
  const g = shows[1];
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.1), ovenMat);
  const window1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), glowMat);
  window1.position.set(-0.25, 0, 0.56);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.02), blackMat);
  plate.position.set(0.6, 0, 0.56);
  g.add(tagPart(new THREE.Group().add(box, window1, plate), 'oven'));
}
// A warm hand, glowing like on a heat camera.
function handShape(material) {
  const hand = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.25), material);
  hand.add(palm);
  [-0.33, -0.11, 0.11, 0.33].forEach((x, i) => {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55 + (i === 1 || i === 2 ? 0.15 : 0), 4, 8), material);
    finger.position.set(x, 0.85, 0);
    hand.add(finger);
  });
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), material);
  thumb.position.set(-0.6, 0.1, 0);
  thumb.rotation.z = 0.8;
  hand.add(thumb);
  return hand;
}
shows[2].add(tagPart(handShape(skinIR), 'hand'));
// A rainbow of arcs.
{
  const g = shows[3];
  const arcs = new THREE.Group();
  RAINBOW.forEach((c, i) => {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.5 - i * 0.12, 0.06, 8, 40, Math.PI), mat(c, { emissive: c, emissiveIntensity: 0.3 }));
    arcs.add(arc);
  });
  arcs.position.y = -0.6;
  g.add(tagPart(arcs, 'rainbow'));
}
// The Sun with rays.
{
  const g = shows[4];
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 16), sunMat));
  for (let i = 0; i < 12; i++) {
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), sunMat);
    const a = (i / 12) * Math.PI * 2;
    ray.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0);
    ray.rotation.z = a - Math.PI / 2;
    sun.add(ray);
  }
  g.add(tagPart(sun, 'sun'));
}
// An X-ray of a hand: see-through flesh with bones inside.
{
  const g = shows[5];
  const xray = new THREE.Group();
  xray.add(handShape(fleshMat));
  [-0.33, -0.11, 0.11, 0.33].forEach((x) => {
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 1.3, 4, 6), boneMat);
    bone.position.set(x * 0.9, 0.5, 0.05);
    xray.add(bone);
  });
  g.add(tagPart(xray, 'xray'));
}
// A radioactive sign: three dark blades on yellow.
{
  const g = shows[6];
  const sign = new THREE.Group();
  sign.add(new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), signMat));
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.85, 20, 1, 0, Math.PI / 3), blackMat);
    blade.rotation.z = (i * Math.PI * 2) / 3 + Math.PI / 6;
    blade.position.z = 0.01;
    sign.add(blade);
  }
  const middle = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), blackMat);
  middle.position.z = 0.01;
  sign.add(middle);
  g.add(tagPart(sign, 'gamma'));
}
OBJECT_FOR.forEach((key, i) => addLabel(key, shows[i], v(0, 2.0, 0), { hideWith: shows[i] }));

// ---------- Sunlight to Earth ----------

const trip = new THREE.Group();
trip.visible = false;
scene.add(trip);
const tripSun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), sunMat);
tripSun.position.set(-4.5, -2.4, 0);
const earth = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 14), earthMat);
earth.position.set(3.5, -2.4, 0);
const photon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), photonMat);
trip.add(tripSun, earth, photon);

// ---------- Controls ----------

const state = { band: 0, phase: 0, trip: null };
const infoEl = document.getElementById('band-info');
const energyEl = document.getElementById('energy');
const levelCard = document.getElementById('level-card');

bindSlider('band', (value) => BANDS[value].name, (value) => {
  state.band = value;
  const b = BANDS[value];
  shows.forEach((g, i) => { g.visible = i === value; });
  infoEl.textContent = `Wavelength: ${b.size}. ${b.use}`;
  energyEl.textContent = `⚡ Energy: ${'⚡'.repeat(value + 1)}`;
  levelCard.textContent = `${b.name}: ${b.use}`;
  explorer.showLabels();
  const firsts = { radio: 'radio', visible: 'visible', xray: 'xray', gamma: 'gamma' };
  if (firsts[b.key] && complete(firsts[b.key])) {
    const lines = {
      radio: 'Radio waves are the longest. Some are longer than a football field!',
      visible: 'This is the only part our eyes can see. Such a tiny slice of the family!',
      xray: 'X-rays go right through skin, but bones stop them. That’s how doctors see your bones.',
      gamma: 'Gamma rays: the shortest waves, with the most energy of all. Careful!',
    };
    cello.say(lines[b.key], { mood: 'wow', ms: 5000 });
  }
});

document.getElementById('trip').addEventListener('click', () => {
  state.trip = { t: 0 };
  trip.visible = true;
  levelCard.textContent = 'Sunlight crosses 150 million km of empty space to reach us…';
});

// The book's question: how are microwaves and the Sun's light alike?
const ANSWERS = [
  { text: 'Both are waves in the light family, and both travel at the speed of light.', right: true },
  { text: 'Both need air to travel through.', right: false, why: 'Not quite! Sunlight crosses empty space, where there’s no air at all.' },
  { text: 'Both are kinds of sound.', right: false, why: 'Not quite! Sound needs something to travel through. These don’t.' },
];
const alikeEl = document.getElementById('alike');
const alikeAnswer = document.getElementById('alike-answer');
alikeEl.replaceChildren(...ANSWERS.map((a) => {
  const b = document.createElement('button');
  b.className = 'btn press';
  b.textContent = a.text;
  b.style.gridColumn = '1 / -1';
  b.addEventListener('click', () => {
    if (a.right) {
      alikeAnswer.textContent = 'Yes! They’re both electromagnetic waves. They carry energy, need nothing to travel through, and go at the same speed. Only their wavelengths are different.';
      if (complete('alike')) cello.say('Right! Microwaves and sunlight are cousins in the same wave family.', { mood: 'wow', ms: 5000 });
    } else {
      alikeAnswer.textContent = a.why;
    }
  });
  return b;
}));

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Animation ----------

const m = new THREE.Matrix4();
const color = new THREE.Color();

stage.onFrame((dt) => {
  const b = BANDS[state.band];
  state.phase += dt * Math.PI * 2 * 0.6; // every kind wiggles at the same easy pace on screen
  const k = (Math.PI * 2) / b.length;
  for (let i = 0; i < DOTS; i++) {
    const x = WAVE_LEFT + ((WAVE_RIGHT - WAVE_LEFT) * i) / (DOTS - 1);
    m.makeTranslation(x, 0.7 * Math.sin(k * x - state.phase), 0);
    dots.setMatrixAt(i, m);
    // One color per kind. Visible light is white: all its colors mixed. (Each
    // color has its own wavelength, so the rainbow beside it shows them apart.)
    dots.setColorAt(i, color.set(b.color));
  }
  dots.instanceMatrix.needsUpdate = true;
  dots.instanceColor.needsUpdate = true;

  // The tower turns and the Sun spins.
  shows[0].children.forEach((c) => { c.rotation.y += dt * 0.3; });
  shows[4].rotation.z += dt * 0.3;

  if (state.trip) {
    state.trip.t += dt / 4; // 8 minutes and 20 seconds, squeezed into 4 seconds
    const k2 = Math.min(1, state.trip.t);
    photon.position.lerpVectors(tripSun.position, earth.position, k2);
    const seconds = Math.round(k2 * 500);
    levelCard.textContent = `Sunlight on its way: ${Math.floor(seconds / 60)} min ${seconds % 60} s`;
    if (k2 >= 1) {
      state.trip = null;
      levelCard.textContent = 'Sunlight takes about 8 minutes and 20 seconds to reach Earth, across empty space!';
      if (complete('sun')) cello.say('About 8 minutes! The light hitting you right now left the Sun 8 minutes ago.', { mood: 'wow', ms: 5500 });
      setTimeout(() => { trip.visible = false; }, 2500);
    }
  }
});
