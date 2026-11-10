import * as THREE from 'three';
import { createEarthSurface } from './earth.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Layers of the Earth. Cut a slice out of the globe to see the crust,
// mantle, outer core, and inner core, then drill down with the depth slider
// and read how deep, how hot, and solid or liquid. The layers are drawn to
// scale, except the crust, which would be thinner than a line. The second
// view is a slab of crust floating on the mantle: slow currents in the
// mantle pull plates apart at a ridge and push them together, where one
// dives under the other and a mountain grows.

const PARTS = {
  crust: { name: 'Crust', text: 'The thin rocky skin we live on. It’s the thinnest layer: 5 to 50 km thick. (We drew it thicker so you can see it.)' },
  mantle: { name: 'Mantle', text: 'The thickest layer, almost 2,900 km. Its rock is solid but so hot that it flows very slowly, like super-thick toffee.' },
  outerCore: { name: 'Outer core', text: 'Liquid iron and nickel, about 4,000 to 5,700 °C. As it swirls, it makes Earth’s magnetism.' },
  innerCore: { name: 'Inner core', text: 'A solid ball of iron and nickel, about 5,200 °C. It’s squeezed so hard by everything above that it can’t melt.' },
  landCrust: { name: 'Land crust', text: 'Crust under the continents is thick, 30 to 50 km, and lighter, so it floats high.' },
  oceanCrust: { name: 'Ocean crust', text: 'Crust under the oceans is thin, 5 to 10 km, and heavier. When plates crash, it’s the one that dives under.' },
  current: { name: 'Mantle currents', text: 'Hot rock rises, cools, and sinks again, in a slow loop. These currents carry the plates on top of them.' },
  mountain: { name: 'Mountain', text: 'Where two plates push together, the land crumples up into mountains. It takes millions of years.' },
  ridge: { name: 'Ridge', text: 'Where plates pull apart, hot rock rises up and fills the gap, making brand-new ocean crust.' },
};

// Real depths in km. The crust is drawn thicker than real.
const LAYERS = [
  { key: 'crust', from: 0, to: 35, r: [2.42, 2.5], color: 0x8a6a4f, state: 'solid rock', temp: 'from cool at the top to about 500 °C at the bottom' },
  { key: 'mantle', from: 35, to: 2900, r: [1.37, 2.42], color: 0xe0703a, state: 'solid rock that flows very slowly', temp: 'about 500 °C at the top to 4,000 °C at the bottom' },
  { key: 'outerCore', from: 2900, to: 5150, r: [0.48, 1.37], color: 0xf5a623, state: 'liquid metal (iron and nickel)', temp: 'about 4,000 to 5,700 °C' },
  { key: 'innerCore', from: 5150, to: 6371, r: [0, 0.48], color: 0xffe066, state: 'solid metal (iron and nickel)', temp: 'about 5,200 °C' },
];

const VIEWS = {
  globe: { camera: [2.6, 2.0, 8.6], target: [0, 0, 0], line: 'Under your feet is a hot, layered planet. Cut it open and dig down!' },
  plates: { camera: [0, 0.6, 9.5], target: [0, -0.6, 0], line: 'The crust is cracked into plates that ride on the mantle. Speed up time!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'earthlayers',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'Let’s dig to the middle of the Earth! Cut it open first, then slide down.',
  allPartsLine: 'All 9 parts! You know the Earth inside out.',
  onPart: (key) => {
    if ((key === 'crust' || key === 'landCrust' || key === 'oceanCrust') && complete('crust')) {
      cello.say('The crust! It’s the thinnest layer, and it’s where we all live.', { mood: 'wow', ms: 5000 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

// ---------- The globe, with a slice cut out ----------

const globeView = new THREE.Group();
scene.add(globeView);
const earth = new THREE.Group();
// Turn the cut toward the camera.
earth.rotation.y = 2.75;
globeView.add(earth);

// The surface: whole, or with a quarter missing. The map is slid around so
// India faces us before the cut, and the cut ball keeps the same map.
const R = 2.5;
const surface = createEarthSurface({ doubleSided: true });
const surfaceMat = surface.material;
const mapped = (geo, span) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * span - 0.16);
  return geo;
};
const whole = new THREE.Mesh(mapped(new THREE.SphereGeometry(R, 64, 48), 1), surfaceMat);
const cutSurface = new THREE.Mesh(mapped(new THREE.SphereGeometry(R, 64, 48, 0, Math.PI * 1.5), 0.75), surfaceMat);
cutSurface.visible = false;
earth.add(tagPart(whole, 'crust'), tagPart(cutSurface, 'crust'));

// Inside: each layer is a ball, plus half-rings on the two cut faces.
const inside = new THREE.Group();
inside.visible = false;
earth.add(inside);
const layerMats = {};
LAYERS.forEach((layer) => {
  const m = mat(layer.color, { side: THREE.DoubleSide, emissive: layer.color, emissiveIntensity: layer.key === 'crust' ? 0 : 0.25 });
  layerMats[layer.key] = m;
  const [r0, r1] = layer.r;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r1 - 0.005, 48, 32, 0, Math.PI * 1.5), m);
  inside.add(tagPart(ball, layer.key));
  [Math.PI / 2, Math.PI].forEach((angle) => {
    const face = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64, 1, -Math.PI / 2, Math.PI), m);
    face.rotation.y = angle;
    inside.add(tagPart(face, layer.key));
  });
});

// The drill goes straight down the edge where the two cut faces meet.
const drill = new THREE.Group();
const bit = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 16).rotateX(Math.PI), mat(0xb0b8c4, { metalness: 0.6, roughness: 0.3 }));
bit.position.y = 0.2;
drill.add(bit);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), mat(0x6b7280));
shaft.geometry.translate(0, 0.5, 0);
drill.add(shaft);
earth.add(drill);

// Depth in km to a height on the drawing, layer by layer.
function depthToY(km) {
  const layer = LAYERS.find((l) => km <= l.to) ?? LAYERS[3];
  const t = (km - layer.from) / (layer.to - layer.from);
  return THREE.MathUtils.lerp(layer.r[1], layer.r[0], t);
}

addLabel('crust', earth, v(0, R + 0.25, 0), { hideWith: globeView });
LAYERS.slice(1).forEach((l) => {
  const mid = (l.r[0] + l.r[1]) / 2;
  // On the cut face, fanned out so the labels don't stack.
  addLabel(l.key, inside, v(0.01, -mid * 0.5, -mid * 0.87), { hideWith: inside });
});

// ---------- Moving plates ----------

const platesView = new THREE.Group();
platesView.visible = false;
scene.add(platesView);
const DEPTH = 1.6;
const mantleBlock = new THREE.Mesh(new THREE.BoxGeometry(10, 2.6, DEPTH), mat(0xe0703a, { emissive: 0x8a2a00, emissiveIntensity: 0.3 }));
mantleBlock.position.y = -2.0;
platesView.add(tagPart(mantleBlock, 'current'));

const TRENCH = -0.6;
const RIDGE = 3.2;
const landMat = mat(0x8a6a4f);
const oceanMat = mat(0x4b4f58);
const landCrust = new THREE.Mesh(new THREE.BoxGeometry(5 + TRENCH, 0.95, DEPTH), [landMat, landMat, mat(0x6fb14f), landMat, landMat, landMat]);
landCrust.position.set((-5 + TRENCH) / 2, -0.25, 0);
platesView.add(tagPart(landCrust, 'landCrust'));
const OCEAN_TOP = -0.45;
const oceanA = new THREE.Mesh(new THREE.BoxGeometry(RIDGE - TRENCH, 0.25, DEPTH), oceanMat);
oceanA.position.set((TRENCH + RIDGE) / 2, OCEAN_TOP - 0.125, 0);
const oceanB = new THREE.Mesh(new THREE.BoxGeometry(5 - RIDGE, 0.25, DEPTH), oceanMat);
oceanB.position.set((RIDGE + 5) / 2, OCEAN_TOP - 0.125, 0);
// The ocean plate diving under the land.
// A bit deeper than the blocks, so it shows on the front face as it dives.
const slab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, DEPTH + 0.04), oceanMat);
slab.geometry.translate(-0.9, 0, 0);
slab.position.set(TRENCH, OCEAN_TOP - 0.125, 0);
slab.rotation.z = 0.55;
platesView.add(tagPart(oceanA, 'oceanCrust'), tagPart(oceanB, 'oceanCrust'), tagPart(slab, 'oceanCrust'));
const sea = new THREE.Mesh(new THREE.BoxGeometry(5 - TRENCH, 0.45, DEPTH), mat(0x3d8fe0, { transparent: true, opacity: 0.45, depthWrite: false }));
sea.position.set((TRENCH + 5) / 2, OCEAN_TOP + 0.225, 0);
platesView.add(sea);

const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 12), mat(0xff5a1f, { emissive: 0xff3300, emissiveIntensity: 0.8 }));
ridge.position.set(RIDGE, OCEAN_TOP + 0.05, 0);
platesView.add(tagPart(ridge, 'ridge'));

const mountain = new THREE.Group();
const peak = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 8), mat(0x8d8a86, { flatShading: true }));
peak.geometry.translate(0, 0.8, 0);
const snow = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 8), mat(0xf4fbff, { flatShading: true }));
snow.geometry.translate(0, 1.3 + 0.01, 0);
mountain.add(peak, snow);
mountain.position.set(-1.5, 0.22, 0);
mountain.scale.y = 0.15;
platesView.add(tagPart(mountain, 'mountain'));

// Stripes on the plates show which way they move.
const stripeMat = mat(0xd9dde3);
const stripes = [];
for (let i = 0; i < 10; i++) {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, DEPTH + 0.08), stripeMat);
  s.userData.k = i / 10;
  s.userData.plate = i < 7 ? 'A' : 'B';
  platesView.add(s);
  stripes.push(s);
}

// Two loops of hot rock in the mantle: up at the ridge, down at the trench.
const flow = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(80 * 3), 3)),
  new THREE.PointsMaterial({ color: 0xfff1a8, size: 0.12 }),
);
flow.frustumCulled = false;
platesView.add(flow);
const LOOPS = [
  { cx: (TRENCH + RIDGE) / 2, rx: (RIDGE - TRENCH) / 2, dir: 1 },
  { cx: (RIDGE + 5) / 2, rx: (5 - RIDGE) / 2, dir: -1 },
];

addLabel('landCrust', landCrust, v(-1, 0.75, 0), { hideWith: platesView });
addLabel('oceanCrust', oceanA, v(0.6, 0.6, 0), { hideWith: platesView });
addLabel('current', platesView, v(1.3, -2.9, DEPTH / 2), { hideWith: platesView });
addLabel('mountain', mountain, v(0, 1.9, 0), { hideWith: platesView });
addLabel('ridge', ridge, v(0, 0.75, 0), { hideWith: platesView });

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const state = { view: 'globe', cut: false, depth: 0, speed: 3, years: 0, grown: 0.15 };
const reached = new Set();

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  globeView.visible = key === 'globe';
  platesView.visible = key === 'plates';
  ['globe', 'plates'].forEach((k) => {
    const el = document.getElementById(`${k}-tools`);
    el.hidden = false;
    el.style.display = k === key ? '' : 'none';
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aimCamera();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

function setCut(on) {
  state.cut = on;
  whole.visible = !on;
  cutSurface.visible = on;
  inside.visible = on;
  const b = document.getElementById('cut');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? '🔪 Close it up' : '🔪 Cut it open';
  explorer.showLabels();
}
document.getElementById('cut').addEventListener('click', () => {
  setCut(!state.cut);
  if (state.cut) {
    levelCard.textContent = 'Four layers: crust, mantle, outer core, and inner core. Slide down to dig!';
    if (complete('cut')) cello.say('Wow, look inside! The Earth is in layers, like a peach with a stone in the middle.', { mood: 'wow', ms: 5500 });
  }
});

const layerNow = document.getElementById('layer-now');
const layerFacts = document.getElementById('layer-facts');
bindSlider('depth', (km) => `${km.toLocaleString('en-US')} km`, (km) => {
  state.depth = km;
  if (km > 0 && !state.cut) setCut(true);
  drill.position.y = depthToY(km);
  shaft.scale.y = R + 0.6 - drill.position.y;
  const layer = LAYERS.find((l) => km <= l.to) ?? LAYERS[3];
  const name = PARTS[layer.key].name;
  layerNow.textContent = km >= 6371 ? '🎯 The center of the Earth!' : `⛏️ ${name}`;
  layerFacts.textContent = `It’s ${layer.state}, ${layer.temp}.`;
  Object.entries(layerMats).forEach(([k, m]) => { m.emissiveIntensity = k === layer.key ? 0.7 : k === 'crust' ? 0 : 0.25; });
  if (!reached.has(layer.key)) {
    reached.add(layer.key);
    if (km > 0) cello.say(`Now we’re in the ${name.toLowerCase()}!`, { ms: 2500, important: false });
  }
  if (layer.key === 'outerCore' && complete('liquid')) {
    cello.say('The outer core is liquid metal! It swirls around and makes Earth a giant magnet.', { mood: 'wow', ms: 5500 });
  }
  if (km >= 6371 && complete('center')) {
    cello.say('You made it to the center: 6,371 km down, and about 5,200 °C!', { mood: 'wow', ms: 5500 });
  }
});

bindSlider('time', (s) => (s === 0 ? 'Stopped' : `×${s}`), (s) => { state.speed = s; });

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
stage.onFrame((dt) => {
  time += dt;
  if (globeView.visible) {
    earth.rotation.y = 2.75 + (state.cut ? 0 : time * 0.15);
    bit.rotation.y += dt * 8;
  }
  if (platesView.visible) updatePlates(dt);
});

function updatePlates(dt) {
  const speed = state.speed / 10;
  state.years += dt * speed * 2;
  document.getElementById('years').textContent = `⏳ ${state.years.toFixed(1)} million years`;
  // Plate A moves left toward the trench and dives; plate B moves right.
  stripes.forEach((s) => {
    s.userData.k = (s.userData.k + dt * speed * 0.06) % 1;
    const k = s.userData.k;
    if (s.userData.plate === 'A') {
      const x = RIDGE - k * (RIDGE - TRENCH + 1.4);
      if (x >= TRENCH) s.position.set(x, OCEAN_TOP + 0.01, 0);
      else {
        const along = TRENCH - x;
        s.position.set(TRENCH - along * Math.cos(0.55), OCEAN_TOP + 0.01 - along * Math.sin(0.55), 0);
      }
      s.rotation.z = x >= TRENCH ? 0 : 0.55;
    } else {
      s.position.set(RIDGE + k * (5 - RIDGE), OCEAN_TOP + 0.01, 0);
    }
  });
  // The mountain grows as the plates push together, up to its full height.
  if (speed > 0) state.grown = Math.min(1, state.grown + dt * speed * 0.06);
  mountain.scale.y = state.grown;
  if (state.grown >= 1 && complete('mountain')) {
    levelCard.textContent = 'Millions of years of pushing built a mountain! The Himalayas grew this way.';
    cello.say('A mountain! The ocean plate dives under, and the land crumples up.', { mood: 'wow', ms: 5500 });
  }
  const pos = flow.geometry.attributes.position;
  for (let i = 0; i < 80; i++) {
    const loop = LOOPS[i % 2];
    const a = (i / 80) * Math.PI * 2 * 2 + time * speed * 0.5 * loop.dir;
    pos.setXYZ(i, loop.cx + Math.cos(a) * loop.rx * 0.85, -1.9 + Math.sin(a) * 0.9, DEPTH / 2 + 0.02);
  }
  pos.needsUpdate = true;
}

setView('globe');
