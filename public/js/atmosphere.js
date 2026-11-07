import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// The air around us. A rocket rises through the five layers of the
// atmosphere, past clouds and a plane, the ozone layer, a weather balloon
// that pops, shooting stars, the northern lights, and the space station,
// while the sky goes dark. Switch the ozone layer off to let UV rays reach
// the ground. "What's in air?" is a box of 100 bits of air to count: 78
// nitrogen, 21 oxygen, and 1 of everything else.

const PARTS = {
  troposphere: { name: 'Troposphere', text: 'The bottom layer, up to about 12 km. It has almost all the air, and all the weather: clouds, rain, and wind.' },
  stratosphere: { name: 'Stratosphere', text: 'From about 12 to 50 km. It’s calm here, and it holds the ozone layer.' },
  ozone: { name: 'Ozone layer', text: 'A layer of a special kind of oxygen. It soaks up most of the Sun’s harmful UV light, like sunscreen for the planet.' },
  mesosphere: { name: 'Mesosphere', text: 'From about 50 to 85 km, and the coldest layer, around −90 °C. Space rocks burn up here as shooting stars.' },
  thermosphere: { name: 'Thermosphere', text: 'From about 85 to 600 km. The air is super thin. The northern lights glow here, and the space station flies here.' },
  exosphere: { name: 'Exosphere', text: 'The very top, where the air fades away into space. Many satellites go round the Earth up here.' },
  plane: { name: 'Airplane', text: 'Big planes fly about 10 to 12 km up, near the top of the troposphere, above most of the bumpy weather.' },
  meteor: { name: 'Shooting star', text: 'A tiny space rock rushing into the air so fast that it burns up in a streak of light. It’s a meteor, not a star!' },
  station: { name: 'Space station', text: 'The International Space Station goes round the Earth about 400 km up, once every 90 minutes.' },
  nitrogen: { name: 'Nitrogen', text: 'About 78 out of every 100 bits of air. Plants need it to grow, but we breathe it in and out without using it.' },
  oxygen: { name: 'Oxygen', text: 'About 21 out of every 100 bits of air. We need it to breathe, and fires need it to burn.' },
  other: { name: 'Other gases', text: 'The last 1 bit: mostly argon, plus a little carbon dioxide (for plants) and water vapor (for clouds).' },
};

// Each layer from bottom to top: real heights in km, and heights on the drawing.
const LAYERS = [
  { key: 'troposphere', km: [0, 12], y: [0, 2.5], color: 0x8fd0ff, temp: 'Gets colder as you go up, down to about −55 °C at the top.' },
  { key: 'stratosphere', km: [12, 50], y: [2.5, 5], color: 0x79b8f0, temp: 'Warms up again, to about 0 °C, because the ozone soaks up sunlight.' },
  { key: 'mesosphere', km: [50, 85], y: [5, 7], color: 0x5a86d0, temp: 'The coldest layer: about −90 °C.' },
  { key: 'thermosphere', km: [85, 600], y: [7, 10], color: 0x3a4fa0, temp: 'The few bits of air get very hot here, but there are so few that you’d still feel cold.' },
  { key: 'exosphere', km: [600, 10000], y: [10, 12.5], color: 0x1f2660, temp: 'Hardly any air at all. This is where Earth’s air fades into space.' },
];
const TOP = 12.5;

const VIEWS = {
  layers: { line: 'Ride a rocket up through the layers of the sky.' },
  gases: { camera: [0, 1, 7.5], target: [0, 0, 0], line: 'Here are 100 bits of air, zooming around. What are they?' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;
scene.fog.near = 40;
scene.fog.far = 80;
controls.maxDistance = 20;

const explorer = createExplorer({
  topic: 'atmosphere',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['troposphere', 'stratosphere', 'mesosphere', 'thermosphere', 'exosphere'],
  resolve: (hit) => (hit.object === balls ? gasOf(hit.instanceId) : hit.object.userData.part),
  greeting: 'We live at the bottom of an ocean of air! Let’s ride up through it.',
  allPartsLine: 'All 12 parts! You know the air from top to bottom.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function kmToY(km) {
  const l = LAYERS.find((x) => km <= x.km[1]) ?? LAYERS[4];
  return THREE.MathUtils.mapLinear(km, l.km[0], l.km[1], l.y[0], l.y[1]);
}
function yToKm(y) {
  const l = LAYERS.find((x) => y <= x.y[1]) ?? LAYERS[4];
  return THREE.MathUtils.mapLinear(y, l.y[0], l.y[1], l.km[0], l.km[1]);
}

// ---------- Layers of air ----------

const layersView = new THREE.Group();
scene.add(layersView);

// The ground is the top of a huge ball, so it curves away.
const ground = new THREE.Mesh(new THREE.SphereGeometry(60, 96, 48), mat(0x6fb14f));
ground.position.y = -60;
layersView.add(ground);

// Each layer is a see-through curved band behind the rocket.
LAYERS.forEach((l) => {
  const h = l.y[1] - l.y[0];
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, h, 48, 1, true, Math.PI * 0.75, Math.PI * 0.5),
    basic(l.color, { transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),
  );
  band.position.set(0, (l.y[0] + l.y[1]) / 2, 2);
  layersView.add(tagPart(band, l.key));
  addLabel(l.key, layersView, v(-3.6, l.y[0] + h * 0.55, -4.2), { hideWith: layersView });
});

// The ozone layer: a glowing strip in the stratosphere, about 15 to 35 km up.
const ozoneMat = basic(0xc792ff, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
const ozone = new THREE.Mesh(new THREE.CylinderGeometry(8.9, 8.9, kmToY(35) - kmToY(15), 48, 1, true, Math.PI * 0.75, Math.PI * 0.5), ozoneMat);
ozone.position.set(0, (kmToY(15) + kmToY(35)) / 2, 2);
layersView.add(tagPart(ozone, 'ozone'));
addLabel('ozone', layersView, v(2.8, kmToY(25), -4.6), { hideWith: ozone });

// The rocket you ride.
const rocket = new THREE.Group();
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 16), mat(0xf4f0e8));
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 16), mat(0xff5a7a));
nose.position.y = 0.5;
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 12).rotateX(Math.PI), basic(0xffb347));
flame.position.y = -0.55;
rocket.add(body, nose, flame);
[0, 2.1, 4.2].forEach((a) => {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.16), mat(0xff5a7a));
  fin.position.set(Math.cos(a) * 0.18, -0.3, Math.sin(a) * 0.18);
  fin.rotation.y = -a;
  rocket.add(fin);
});
rocket.position.set(0, 0.45, 0);
layersView.add(rocket);

// Things at their real heights.
const clouds = new THREE.Group();
[[-2.6, 0.9, -1], [2.2, 1.3, -1.5], [-0.8, 1.6, -2.2]].forEach(([x, y, z]) => {
  const c = new THREE.Group();
  [[0, 0, 0.35], [0.35, -0.05, 0.27], [-0.32, -0.06, 0.25]].forEach(([dx, dy, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(0xffffff, { emissive: 0x333333 }));
    puff.position.set(dx, dy, 0);
    c.add(puff);
  });
  c.position.set(x, y, z);
  clouds.add(c);
});
layersView.add(clouds);

const plane = new THREE.Group();
const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.6, 4, 10).rotateZ(Math.PI / 2), mat(0xe8eef5));
const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.8), mat(0xc0c8d4));
const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), mat(0xc0c8d4));
tail.position.set(-0.32, 0.1, 0);
plane.add(fuselage, wing, tail);
plane.position.set(2, kmToY(10.5), -1);
layersView.add(tagPart(plane, 'plane'));

const balloon = new THREE.Group();
const bag = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(0xffffff, { emissive: 0x444444 }));
const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.5), basic(0x888888));
string.position.y = -0.5;
const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat(0xff9f43));
box.position.y = -0.78;
balloon.add(bag, string, box);
balloon.position.set(-1.6, 0.6, 0.5);
layersView.add(balloon);
const POP_KM = 35;

const meteors = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 1.2, 6), basic(0xfff1a8, { transparent: true }));
  m.rotation.z = 0.9;
  m.userData.t = i * 0.25;
  layersView.add(tagPart(m, 'meteor'));
  meteors.push(m);
}

// Northern lights: wavy green curtains.
const auroraMat = basic(0x5dffa0, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
const auroraGeo = new THREE.PlaneGeometry(6, 1.6, 40, 1);
const aurora = new THREE.Mesh(auroraGeo, auroraMat);
aurora.position.set(-0.5, kmToY(180), -3.5);
layersView.add(aurora);
const auroraBase = auroraGeo.attributes.position.array.slice();

const station = new THREE.Group();
const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10).rotateZ(Math.PI / 2), mat(0xe8eef5));
station.add(core);
[-0.35, 0.35].forEach((x) => {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.6), mat(0x2b4c8c, { emissive: 0x0a1a40 }));
  panel.position.x = x;
  station.add(panel);
});
station.position.set(1.8, kmToY(400), -0.8);
layersView.add(tagPart(station, 'station'));

const satellite = station.clone();
satellite.scale.setScalar(0.6);
satellite.position.set(-2.2, kmToY(2000), -1.2);
layersView.add(satellite);

// Stars, high up, that you only see once the sky goes dark.
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 300; i++) starPos.push((Math.random() - 0.5) * 30, 6 + Math.random() * 14, -6 - Math.random() * 6);
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0 }));
layersView.add(stars);

// UV rays from the Sun. The ozone layer stops most of them.
const UV_N = 40;
const uv = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(UV_N * 3), 3)),
  new THREE.PointsMaterial({ color: 0xb36bff, size: 0.12 }),
);
uv.frustumCulled = false;
layersView.add(uv);
const uvDots = Array.from({ length: UV_N }, (_, i) => ({ x: -3 + (i % 8) * 0.85, t: Math.random() }));

addLabel('plane', plane, v(0, 0.35, 0), { hideWith: layersView });
addLabel('meteor', meteors[0], v(0, 0.6, 0), { hideWith: layersView });
addLabel('station', station, v(0, 0.35, 0), { hideWith: layersView });

// ---------- What's in air? ----------

const gasesView = new THREE.Group();
gasesView.visible = false;
scene.add(gasesView);
const BOX = v(2.4, 1.5, 1.5);
const boxLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX.x * 2, BOX.y * 2, BOX.z * 2)), new THREE.LineBasicMaterial({ color: 0x9fb4c8 }));
gasesView.add(boxLines);
const GAS = [
  { key: 'nitrogen', n: 78, color: 0x5b8def },
  { key: 'oxygen', n: 21, color: 0xff5a5a },
  { key: 'other', n: 1, color: 0xffd75e },
];
const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 14, 10), mat(0xffffff, { roughness: 0.4 }), 100);
const ballData = [];
let idx = 0;
GAS.forEach((g, gi) => {
  for (let i = 0; i < g.n; i++, idx++) {
    balls.setColorAt(idx, new THREE.Color(g.color));
    ballData.push({
      gas: g.key,
      p: v((Math.random() - 0.5) * BOX.x * 1.8, (Math.random() - 0.5) * BOX.y * 1.8, (Math.random() - 0.5) * BOX.z * 1.8),
      vel: v(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.2),
      // Where it sits when counted: one row of ten after another, by gas.
      home: gi === 2 ? v(2.95, -1.2, 0) : v(-2.9 + (i % 10) * 0.26 + gi * 2.9, -1.2 + Math.floor(i / 10) * 0.26, 0),
    });
  }
});
gasesView.add(tagPart(balls, 'nitrogen'));
function gasOf(i) { return ballData[i]?.gas ?? 'nitrogen'; }
addLabel('nitrogen', gasesView, v(-1.7, 1.0, 0), { hideWith: gasesView });
addLabel('oxygen', gasesView, v(1.2, -0.3, 0), { hideWith: gasesView });
addLabel('other', gasesView, v(2.95, -0.8, 0), { hideWith: gasesView });

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const state = { view: 'layers', y: 0, ozone: true, sorted: false, sort: 0 };
const visited = new Set();
let popped = false;

function aimCamera() {
  if (state.view === 'gases') {
    camera.position.set(...VIEWS.gases.camera);
    controls.target.set(...VIEWS.gases.target);
  } else {
    camera.position.set(0, state.y + 1.2, 8);
    controls.target.set(0, state.y + 0.6, 0);
  }
}

function setView(key) {
  state.view = key;
  layersView.visible = key === 'layers';
  gasesView.visible = key === 'gases';
  ['layers', 'gases'].forEach((k) => {
    const el = document.getElementById(`${k}-tools`);
    el.hidden = false;
    el.style.display = k === key ? '' : 'none';
  });
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  skyColor();
  explorer.showLabels();
  aimCamera();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

// The sky gets darker the higher you go.
const SPACE = new THREE.Color(0x05070d);
function skyColor() {
  const base = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').trim());
  const dark = state.view === 'layers' ? THREE.MathUtils.smoothstep(state.y, 2, 8) : 0;
  scene.background.copy(base).lerp(SPACE, dark);
  stars.material.opacity = dark;
}
window.elixTheme.watch(skyColor);

const layerNow = document.getElementById('layer-now');
const layerFacts = document.getElementById('layer-facts');
bindSlider('height', (s) => {
  const km = yToKm((s / 1000) * TOP);
  return `${Math.round(km).toLocaleString('en-US')} km`;
}, (s) => {
  const y = (s / 1000) * TOP;
  const dy = y - state.y;
  state.y = y;
  rocket.position.y = y + 0.45;
  camera.position.y += dy;
  controls.target.y += dy;
  skyColor();
  const km = yToKm(y);
  const layer = LAYERS.find((l) => y <= l.y[1]) ?? LAYERS[4];
  layerNow.textContent = `🚀 ${PARTS[layer.key].name}`;
  layerFacts.textContent = layer.temp;
  if (!visited.has(layer.key)) {
    visited.add(layer.key);
    if (s > 0) cello.say(`Welcome to the ${PARTS[layer.key].name.toLowerCase()}!`, { ms: 2500, important: false });
  }
  if (km >= POP_KM && !popped) {
    popped = true;
    balloon.visible = false;
    levelCard.textContent = 'Pop! Up here the air is so thin that the balloon swelled up until it burst.';
    if (complete('pop')) cello.say('Pop! The air is so thin up here that the balloon got too big and burst.', { mood: 'wow', ms: 5000 });
  }
  if (km < POP_KM && popped) {
    popped = false;
    balloon.visible = true;
  }
  if (layer.key === 'mesosphere' && complete('meteor')) {
    cello.say('Shooting stars! Tiny space rocks burn up here in the mesosphere.', { mood: 'wow', ms: 5000 });
  }
  if (s >= 1000 && complete('space')) {
    levelCard.textContent = 'The air has faded away. You’re in space! Look back at the thin blue layer we live in.';
    cello.say('We made it to space! All the air we breathe is in that thin layer below.', { mood: 'wow', ms: 5500 });
  }
});

document.getElementById('ozone').addEventListener('click', (e) => {
  state.ozone = !state.ozone;
  e.currentTarget.setAttribute('aria-pressed', String(state.ozone));
  e.currentTarget.textContent = state.ozone ? '🛡️ Ozone layer on' : '🛡️ Ozone layer off';
  ozone.visible = state.ozone;
  explorer.showLabels();
  if (!state.ozone) {
    levelCard.textContent = 'No ozone layer: the purple UV rays come all the way down. Ouch, sunburn!';
    if (complete('ozone')) cello.say('Without the ozone layer, UV light reaches the ground. It burns skin and hurts plants and animals.', { mood: 'oops', ms: 6000 });
  } else {
    levelCard.textContent = 'The ozone layer is back, soaking up the UV rays high above us.';
  }
});

document.getElementById('sort').addEventListener('click', (e) => {
  state.sorted = !state.sorted;
  e.currentTarget.setAttribute('aria-pressed', String(state.sorted));
  e.currentTarget.textContent = state.sorted ? '🫧 Let them go' : '🧮 Count them';
  if (state.sorted) {
    document.getElementById('mix').textContent = '🔵 Nitrogen 78 · 🔴 Oxygen 21 · 🟡 Other 1';
    levelCard.textContent = 'Out of 100 bits of air: 78 nitrogen, 21 oxygen, and just 1 of everything else.';
    if (complete('mix')) cello.say('78 nitrogen, 21 oxygen, and 1 other. Most of the air isn’t oxygen at all!', { mood: 'wow', ms: 5500 });
  } else {
    document.getElementById('mix').textContent = '';
    levelCard.textContent = VIEWS.gases.line;
  }
});

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
const m4 = new THREE.Matrix4();
stage.onFrame((dt) => {
  time += dt;
  if (layersView.visible) {
    flame.scale.y = 0.8 + Math.sin(time * 30) * 0.2;
    clouds.children.forEach((c, i) => { c.position.x += dt * 0.1 * (i % 2 ? 1 : -1); if (Math.abs(c.position.x) > 3.5) c.position.x *= -0.95; });
    plane.position.x -= dt * 0.5;
    if (plane.position.x < -3.5) plane.position.x = 3.5;
    // The weather balloon rises with you, until it pops.
    if (!popped) balloon.position.y = Math.min(kmToY(POP_KM) - 0.3, 0.6 + state.y * 0.95);
    meteors.forEach((m, i) => {
      m.userData.t = (m.userData.t + dt * 0.35) % 1;
      const t = m.userData.t;
      m.position.set(2.5 - t * 3 + i * 0.6 - 1, kmToY(80) - t * 1.4 + (i % 2) * 0.4, -1.5 - i * 0.3);
      m.material.opacity = Math.sin(t * Math.PI);
    });
    const pos = auroraGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = auroraBase[i * 3];
      pos.setZ(i, Math.sin(x * 1.3 + time * 1.5) * 0.4);
    }
    pos.needsUpdate = true;
    auroraMat.opacity = 0.35 + Math.sin(time * 2) * 0.12;
    station.position.x = 1.8 + Math.sin(time * 0.3) * 1.2;
    // UV rays fall from the top; the ozone layer stops them unless it's off.
    const stopAt = state.ozone ? kmToY(25) : 0.02;
    const up = uv.geometry.attributes.position;
    uvDots.forEach((d, i) => {
      d.t = (d.t + dt * 0.35) % 1;
      const y = THREE.MathUtils.lerp(TOP, stopAt, d.t);
      up.setXYZ(i, d.x + (i % 5) * 0.1, y, -0.6 - (i % 3) * 0.4);
    });
    up.needsUpdate = true;
  }
  if (gasesView.visible) {
    state.sort += ((state.sorted ? 1 : 0) - state.sort) * Math.min(1, dt * 3);
    ballData.forEach((b, i) => {
      if (!state.sorted) {
        b.p.addScaledVector(b.vel, dt);
        ['x', 'y', 'z'].forEach((k) => {
          if (Math.abs(b.p[k]) > BOX[k] - 0.11) { b.vel[k] *= -1; b.p[k] = Math.sign(b.p[k]) * (BOX[k] - 0.11); }
        });
      }
      const at = b.p.clone().lerp(b.home, state.sort);
      m4.makeTranslation(at.x, at.y, at.z);
      balls.setMatrixAt(i, m4);
    });
    balls.instanceMatrix.needsUpdate = true;
  }
});

setView('layers');
