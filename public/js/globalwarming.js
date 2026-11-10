import * as THREE from 'three';
import { createEarthSurface, faceLongitude } from './earth.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Global warming. Yellow sunlight reaches the Earth and turns into heat
// (orange) that heads back out to space. The air, with its greenhouse
// gases, bounces some of that heat back down; add more gas and more heat
// stays, so the thermometer climbs. "What changes" shows a polar bear's ice
// floe, a mountain glacier, and a beach town: warming melts the ice and
// raises the sea. Switch the town from burning fuel to wind and solar, and
// the gases slowly come back down.
//
// The warming is a simple rule of thumb, about 2 °C for each doubling of
// carbon dioxide since 1850, which matches the warming so far.

const PARTS = {
  sunlight: { name: 'Sunlight', text: 'Light from the Sun passes through the air and warms the land and sea.' },
  heat: { name: 'Heat', text: 'The warm Earth gives off heat that tries to escape back to space.' },
  gases: { name: 'Greenhouse gases', text: 'Gases like carbon dioxide and methane in the air. They bounce some heat back down, like a blanket. More gas, thicker blanket.' },
  ice: { name: 'Ice cap', text: 'Floating sea ice near the North Pole. Polar bears hunt from it. As Earth warms, it melts and shrinks.' },
  sea: { name: 'Sea', text: 'Melting land ice adds water, and warm water takes up more room, so the sea slowly rises.' },
  glacier: { name: 'Glacier', text: 'A river of ice on a mountain. Many glaciers are shrinking, and they feed rivers that people drink from.' },
  plant: { name: 'Power plant', text: 'It burns coal or gas to make electricity, and lets out carbon dioxide.' },
  clean: { name: 'Wind and solar', text: 'Wind turbines and solar panels make electricity without burning anything, so no carbon dioxide.' },
};

const VIEWS = {
  globe: { camera: [0, 1.2, 10], target: [-0.6, 0, 0], line: 'Sunlight warms the Earth. The air holds some of that heat in, like a blanket.' },
  coast: { camera: [0, 3.2, 9.5], target: [0, 0.3, 0], line: 'Warming melts ice and raises the sea. Slide the gases and watch!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'globalwarming',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['gases'],
  greeting: 'Earth wears a blanket of air. Let’s see what happens when the blanket gets thicker.',
  allPartsLine: 'All 8 parts! You understand global warming.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });

const dotTexture = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(16, 16, 14, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
})();
function particles(count, color, size) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTexture, alphaTest: 0.3, transparent: true, depthWrite: false }));
  points.frustumCulled = false;
  return points;
}
const HIDE = -99;

const warming = (co2) => 2 * Math.log2(co2 / 280);

// ---------- The blanket ----------

const globeView = new THREE.Group();
scene.add(globeView);
const EARTH = v(1.2, 0, 0);
const ER = 1.5;
const AR = 2.25;
const surface = createEarthSurface();
const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 64, 48), surface.material);
earth.position.copy(EARTH);
earth.rotation.set(0.4, faceLongitude(60), 0); // tipped toward us, to show the ice on top
globeView.add(earth);
// The sea ice reaches farther from the pole the colder it is.
const paintIce = (dt) => surface.setIce(THREE.MathUtils.clamp(66 + dt * 5.5, 60, 88));

const airMat = mat(0x9fd4ff, { transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide, emissive: 0x2a5070 });
const air = new THREE.Mesh(new THREE.SphereGeometry(AR, 48, 32), airMat);
air.position.copy(EARTH);
globeView.add(tagPart(air, 'gases'));

const sun = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffd75e }));
sun.position.set(-5.2, 1.2, -0.5);
globeView.add(sun);
// Light the Earth from where the Sun is in the picture.
const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.2);
sunLight.position.copy(sun.position);
sunLight.target = earth;
globeView.add(sunLight);

// A thermometer beside the Earth.
const thermo = new THREE.Group();
const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 16), mat(0xffffff, { transparent: true, opacity: 0.35 }));
tube.position.y = 1.2;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat(0xff4a3a, { emissive: 0x801000 }));
const column = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), mat(0xff4a3a, { emissive: 0x801000 }));
column.geometry.translate(0, 0.5, 0);
column.position.y = 0.1;
thermo.add(tube, bulb, column);
thermo.position.set(4.3, -1.3, 0);
globeView.add(thermo);

const LIGHT_N = 26;
const light = particles(LIGHT_N, 0xffb300, 0.2);
const HEAT_N = 90;
const heat = particles(HEAT_N, 0xff7a2f, 0.15);
globeView.add(light, heat);
const lightDots = Array.from({ length: LIGHT_N }, () => ({ t: Math.random(), to: v() }));
function aimLight(d) {
  // Somewhere on the sunny side of the Earth.
  const a = Math.PI + (Math.random() - 0.5) * 2.2;
  const b = (Math.random() - 0.5) * 2.2;
  d.to.set(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)).multiplyScalar(ER).add(EARTH);
}
lightDots.forEach(aimLight);
// checked: it already met the air on this trip out (bounced back, or let through).
const heatDots = Array.from({ length: HEAT_N }, () => ({ on: false, pos: v(), dir: v(), out: true, checked: false }));

// Invisible stand-ins, so the moving dots can be tapped.
const ghost = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const lightZone = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 1.6), ghost);
lightZone.position.set(-3, 0.6, 0);
globeView.add(tagPart(lightZone, 'sunlight'));
const heatZone = new THREE.Mesh(new THREE.TorusGeometry((ER + AR) / 2 + 0.3, 0.35, 8, 32), ghost);
heatZone.position.copy(EARTH);
globeView.add(tagPart(heatZone, 'heat'));

addLabel('sunlight', lightZone, v(0, 0.6, 0), { hideWith: globeView });
addLabel('gases', air, v(0, AR + 0.25, 0), { hideWith: globeView });
addLabel('heat', heatZone, v(0, -(ER + AR) / 2 - 0.9, 0), { hideWith: globeView });

// ---------- What changes ----------

const coast = new THREE.Group();
coast.visible = false;
scene.add(coast);
const SEA_BASE = -0.35;
const seaMat = mat(0x2f7fd6, { transparent: true, opacity: 0.8, roughness: 0.2 });
const sea = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 5), seaMat);
sea.geometry.translate(0, -0.5, 0);
coast.add(tagPart(sea, 'sea'));

// Far north: a polar bear on floating ice.
const floe = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.3, 9), mat(0xf4fbff, { emissive: 0x223344 }));
coast.add(tagPart(floe, 'ice'));
const bear = new THREE.Group();
const bearMat = mat(0xf8f4ea);
const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), bearMat);
bearBody.scale.set(1.6, 1, 1);
bearBody.position.y = 0.3;
const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), bearMat);
bearHead.position.set(0.45, 0.38, 0);
bear.add(bearBody, bearHead);
[[-0.25, -0.12], [-0.25, 0.12], [0.25, -0.12], [0.25, 0.12]].forEach(([x, z]) => {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8), bearMat);
  leg.position.set(x, 0.1, z);
  bear.add(leg);
});
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0x222222));
nose.position.set(0.6, 0.38, 0);
bear.add(nose);
coast.add(bear);
const FLOE_AT = v(-3.6, 0, 0);

// A mountain with a glacier, at the back.
const mountain = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 8), mat(0x8d8a86, { flatShading: true }));
mountain.position.set(0, 1.5 - 0.2, -2.2);
const glacier = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 8), mat(0xf4fbff, { flatShading: true, emissive: 0x223344 }));
glacier.geometry.translate(0, -0.8, 0);
glacier.position.set(0, 3 - 0.2 + 0.02, -2.2);
coast.add(mountain, tagPart(glacier, 'glacier'));

// A beach town on the right.
const beach = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 4), [mat(0xe8d49a), mat(0xe8d49a), mat(0xe8d49a), mat(0xe8d49a), mat(0xe8d49a), mat(0xe8d49a)]);
beach.geometry.translate(0, -0.5, 0);
beach.position.set(3.6, 0.0, 0.2);
beach.rotation.z = 0.06;
coast.add(beach);
const houses = [];
[[2.6, 0.9], [3.4, 0.9], [4.2, 0.9], [3.0, -0.3]].forEach(([x, z], i) => {
  const h = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.45), mat([0xf4e3c1, 0xd8e6f4, 0xf4d4d4, 0xe6f4d8][i]));
  box.position.y = 0.2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), mat(0xb5523b));
  roof.position.y = 0.55;
  roof.rotation.y = Math.PI / 4;
  h.add(box, roof);
  h.position.set(x, 0.12 + (x - 2.6) * 0.06, z);
  coast.add(h);
  houses.push(h);
});

// Power: a smoky plant, or wind turbines and solar panels.
const plant = new THREE.Group();
const hall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), mat(0x9a8f86));
hall.position.y = 0.25;
const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.1, 10), mat(0x7a6a60));
stack.position.set(0.2, 0.8, 0);
plant.add(hall, stack);
plant.position.set(4.9, 0.3, -1.2);
coast.add(tagPart(plant, 'plant'));
const cleanPower = new THREE.Group();
const turbines = [];
[[4.4, -1.4], [5.3, -0.9]].forEach(([x, z]) => {
  const t = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6, 8), mat(0xf4f4f4));
  mast.position.y = 0.8;
  const hub = new THREE.Group();
  hub.position.set(0, 1.6, 0.06);
  for (let k = 0; k < 3; k++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.01), mat(0xf4f4f4));
    blade.geometry.translate(0, 0.3, 0);
    blade.rotation.z = (k * Math.PI * 2) / 3;
    hub.add(blade);
  }
  t.add(mast, hub);
  t.position.set(x, 0.3, z);
  cleanPower.add(t);
  turbines.push(hub);
});
[[3.2, -1.4], [3.8, -1.6]].forEach(([x, z]) => {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.35), mat(0x2b4c8c, { emissive: 0x0a1a40 }));
  panel.position.set(x, 0.42, z);
  panel.rotation.x = -0.5;
  cleanPower.add(panel);
});
cleanPower.visible = false;
coast.add(tagPart(cleanPower, 'clean'));
const smoke = particles(40, 0x55504c, 0.22);
coast.add(smoke);
const smokeDots = Array.from({ length: 40 }, () => ({ t: Math.random(), a: Math.random() * 6.28 }));

addLabel('ice', floe, v(0, 0.45, 0.6), { hideWith: floe });
addLabel('sea', coast, v(-0.8, 0.1, 1.6), { hideWith: coast });
addLabel('glacier', glacier, v(0.9, -0.3, 0), { hideWith: glacier });
addLabel('plant', plant, v(0, 1.6, 0), { hideWith: plant });
addLabel('clean', cleanPower, v(4.4, 2.2, -1.2), { hideWith: cleanPower });

// ---------- Controls ----------

const levelCard = document.getElementById('level-card');
const state = { view: 'globe', co2: 425, clean: false, warm: warming(425) };
let seaWarned = false;

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  globeView.visible = key === 'globe';
  coast.visible = key === 'coast';
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aimCamera();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

const co2Input = document.getElementById('co2');
function describe(co2) {
  if (co2 <= 290) return 'like 1850';
  if (co2 < 400) return 'less than today';
  if (co2 <= 440) return 'like today';
  if (co2 < 540) return 'more than today';
  return 'lots more than today';
}

function setCo2(co2) {
  state.co2 = co2;
  const w = warming(co2);
  document.getElementById('temp').textContent = w < 0.05
    ? '🌡️ Just right, like in 1850'
    : `🌡️ About ${w.toFixed(1)} °C warmer than in 1850`;
  airMat.opacity = 0.12 + (co2 - 280) / 520 * 0.35;
  airMat.color.setHex(0x9fd4ff).lerp(new THREE.Color(0xd8a070), (co2 - 280) / 520);
  if (co2 >= 650 && complete('trap')) {
    levelCard.textContent = 'A thick blanket: much more heat bounces back down, and the Earth heats up.';
    cello.say('Look how much heat gets trapped now! The thermometer is climbing.', { mood: 'wow', ms: 5000 });
  }
  if (co2 <= 290 && complete('low')) {
    cello.say('Back to how the air was in 1850. In real life, that would take a very long time, so it’s better not to add the gases at all.', { mood: 'wow', ms: 7000 });
  }
}
bindSlider('co2', describe, (co2) => setCo2(co2));

document.getElementById('power').addEventListener('click', (e) => {
  state.clean = !state.clean;
  e.currentTarget.setAttribute('aria-pressed', String(state.clean));
  e.currentTarget.textContent = state.clean ? '🌬️ Power from wind and sun' : '🏭 Power from burning fuel';
  plant.visible = !state.clean;
  cleanPower.visible = state.clean;
  explorer.showLabels();
  if (state.clean) {
    levelCard.textContent = 'Wind and solar power! No more gases added, and forests and oceans slowly soak some up.';
    if (complete('clean')) cello.say('Clean power! The gases stop piling up and slowly come down.', { mood: 'wow', ms: 5000 });
  } else {
    levelCard.textContent = 'Back to burning fuel. The gases start piling up again.';
  }
});

document.getElementById('reset').addEventListener('click', aimCamera);

// ---------- Animation ----------

let time = 0;
let drift = 0;
const lerp = THREE.MathUtils.lerp;
stage.onFrame((dt) => {
  time += dt;

  // With clean power, the gases slowly come back down (forests and oceans soak some up).
  if (state.clean && state.co2 > 330) {
    drift += dt;
    if (drift >= 0.8) {
      drift = 0;
      co2Input.value = String(Math.max(330, state.co2 - 5));
      co2Input.dispatchEvent(new Event('input'));
    }
  }

  state.warm += (warming(state.co2) - state.warm) * Math.min(1, dt * 1.2);
  const w = state.warm;
  column.scale.y = 0.4 + w * 0.5;

  if (globeView.visible) updateGlobe(dt);
  if (coast.visible) updateCoast(dt, w);
});

function updateGlobe(dt) {
  earth.rotation.y += dt * 0.1;
  paintIce(state.warm);
  // Chance that heat bounces back down off the air.
  const bounce = 0.25 + ((state.co2 - 280) / 520) * 0.55;
  const lp = light.geometry.attributes.position;
  lightDots.forEach((d, i) => {
    d.t += dt * 0.45;
    if (d.t >= 1) {
      d.t -= 1;
      const free = heatDots.find((h) => !h.on);
      if (free) {
        free.on = true;
        free.out = true;
        free.checked = false;
        free.pos.copy(d.to);
        free.dir.copy(d.to).sub(EARTH).normalize().add(v(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6)).normalize();
      }
      aimLight(d);
    }
    const q = sun.position.clone().lerp(d.to, d.t);
    lp.setXYZ(i, q.x, q.y, q.z);
  });
  lp.needsUpdate = true;

  const hp = heat.geometry.attributes.position;
  heatDots.forEach((h, i) => {
    if (!h.on) { hp.setXYZ(i, 0, HIDE, 0); return; }
    h.pos.addScaledVector(h.dir, dt * (h.out ? 1.1 : -1.1));
    const r = h.pos.distanceTo(EARTH);
    if (h.out && r >= AR && !h.checked) {
      h.checked = true;
      if (Math.random() < bounce) h.out = false;
    }
    if (!h.out && r <= ER) {
      // Back on the ground: it warms the Earth, then heads out again.
      h.out = true;
      h.checked = false;
      h.dir.copy(h.pos).sub(EARTH).normalize();
    }
    if (r > AR + 2.5) h.on = false;
    hp.setXYZ(i, h.pos.x, h.pos.y, h.pos.z);
  });
  hp.needsUpdate = true;
}

function updateCoast(dt, w) {
  const seaY = SEA_BASE + w * 0.155;
  sea.position.y = seaY;
  const melt = THREE.MathUtils.clamp(1 - w / 3.2, 0.12, 1);
  floe.scale.set(melt, 1, melt);
  floe.position.set(FLOE_AT.x, seaY, FLOE_AT.z);
  bear.position.set(FLOE_AT.x - 0.15, seaY + 0.15, FLOE_AT.z);
  bear.rotation.y = Math.sin(time * 0.3) * 0.4;
  glacier.scale.setScalar(THREE.MathUtils.clamp(1 - w / 3.6, 0.15, 1));
  if (melt <= 0.3 && complete('ice')) {
    levelCard.textContent = 'The sea ice has nearly melted. The polar bear has hardly anywhere left to hunt.';
    cello.say('Oh no, the poor polar bear! Its ice is almost gone.', { mood: 'oops', ms: 5000 });
  }
  const wet = houses.some((h) => seaY > h.position.y - 0.02);
  if (wet && !seaWarned) {
    seaWarned = true;
    levelCard.textContent = 'The sea has reached the beach houses! In real life it rises slowly, over many years.';
    if (complete('sea')) cello.say('The sea reached the houses! That’s why towns by the sea worry about warming.', { mood: 'oops', ms: 5500 });
  }
  if (!wet) seaWarned = false;
  turbines.forEach((t, i) => { t.rotation.z += dt * (2 + i); });
  const sp = smoke.geometry.attributes.position;
  smokeDots.forEach((d, i) => {
    d.t = (d.t + dt * 0.3) % 1;
    if (state.clean) { sp.setXYZ(i, 0, HIDE, 0); return; }
    sp.setXYZ(i, plant.position.x + 0.2 + d.t * 0.8 + Math.cos(d.a) * d.t * 0.2, plant.position.y + 1.4 + d.t * 1.8, plant.position.z + Math.sin(d.a) * d.t * 0.2);
  });
  sp.needsUpdate = true;
}

setCo2(425);
setView('globe');
