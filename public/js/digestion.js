import * as THREE from 'three';
import { headGeometry, stomachGeometry, STOMACH_PATH, liverGeometry, torsoGeometry } from './organs.js';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// The digestive system. Feed a meal and follow it: chewed in the mouth,
// squeezed down the food pipe, churned in the stomach, soaked into the blood
// in the small intestine, dried out in the large intestine, and out. Stretch
// the whole tube out straight to see how long it is. Build a plate, and see
// what a balanced one looks like.

const PARTS = {
  mouth: { name: 'Mouth', text: 'Digestion starts here! Teeth crush food into small bits, and the tongue mixes it with saliva.' },
  saliva: { name: 'Salivary glands', text: 'They make saliva (spit). It makes food wet and slippery, and starts breaking down starchy food like rice and roti.' },
  esophagus: { name: 'Food pipe (esophagus)', text: 'A tube from your throat to your stomach. Its muscles squeeze food down in a wave, even if you’re upside down!' },
  stomach: { name: 'Stomach', text: 'A stretchy, muscly bag. It churns food with strong acid and juices until it turns into a thick soup.' },
  liver: { name: 'Liver', text: 'A big helper organ. It makes bile, which helps break down fats. Food doesn’t go through it, but its juice does.' },
  pancreas: { name: 'Pancreas', text: 'A helper organ tucked behind the stomach. It sends strong juices into the small intestine to break food down.' },
  small: { name: 'Small intestine', text: 'A long, curly tube. Here food is broken down all the way, and the goodness (nutrients) soaks into your blood.' },
  large: { name: 'Large intestine', text: 'A wider tube around the small one. It soaks up water from what’s left. Friendly bacteria live here too.' },
  rectum: { name: 'Rectum', text: 'The end of the tube. Solid waste (poop) waits here until you go to the bathroom. Out it goes!' },
};

const MEALS = {
  apple: { color: 0xe8443a, line: 'Crunch! An apple. Teeth crush it into little bits.' },
  roti: { color: 0xe8c07a, line: 'A roti! Chew, chew. Saliva starts breaking down its starch right away.' },
  dal: { color: 0xf2b134, line: 'Dal and rice! Chew it well, and mix it with saliva.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const AIM = {
  body: { camera: [0.8, 1.0, 9.8], target: [0, 0.7, 0] },
  stretched: { camera: [0, -0.4, 10.5], target: [0, -0.6, 0] },
};

const explorer = createExplorer({
  topic: 'digestion',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'I’m hungry! Pick a food, and let’s follow it on its journey.',
  allPartsLine: 'All 9 parts! You know the whole food journey.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false });

const skinMat = seeThrough(0xffd5bd, 0.16);
const mouthMat = mat(0xd9576a);
const glandMat = mat(0xf6c27a);
const pipeMat = mat(0xf2a08a);
const stomachMat = mat(0xf08a5d, { transparent: true, opacity: 0.72, depthWrite: false });
const liverMat = mat(0x9b3a32);
const pancreasMat = mat(0xf2d27a);
const smallMat = mat(0xffb3a1);
const largeMat = mat(0xd98a6a, { transparent: true, opacity: 0.9 });
const rectumMat = mat(0xc4785a);
const foodMat = mat(0xe8443a, { emissive: 0x3a0a00 });
const acidMat = mat(0xb6f07a, { emissive: 0x3a6a10, transparent: true, opacity: 0.8 });
const nutrientMat = mat(0xffd36b, { emissive: 0x8a5200 });
const waterMat = mat(0x8fd0ff, { emissive: 0x2a6aa8 });
const bloodMat = seeThrough(0xe8445a, 0.6);
const gutMat = mat(0xffb3a1);
const tickMat = mat(0x3a3a4a);
const poop = new THREE.Color(0x7a4a26);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const curveOf = (points) => new THREE.CatmullRomCurve3(points);
const tube = (points, radius, material, segments = 64) => new THREE.Mesh(new THREE.TubeGeometry(curveOf(points), segments, radius, 12, false), material);

// ---------- The body ----------

const body = new THREE.Group();
scene.add(body);

const head = new THREE.Mesh(headGeometry().scale(0.88, 0.8, 0.84), skinMat);
head.position.set(0, 3.55, 0);
body.add(head);
const torso = new THREE.Mesh(torsoGeometry(1.4, 5.3, 0.55), skinMat);
torso.position.y = 0.15;
body.add(torso);

// The path food takes, in pieces.
const MOUTH = [v(0, 3.3, 0.85), v(0, 3.25, 0.45), v(0, 3.0, 0.15)];
const STOMACH_AT = v(0.5, 0.92, 0.2);
const STOMACH_SIZE = 0.58;
// Food goes through the middle of the stomach, from end to end.
const STOMACH = STOMACH_PATH.map(([x, y]) => v(x, y).multiplyScalar(STOMACH_SIZE).add(STOMACH_AT));
const PIPE = [v(0, 3.0, 0.15), v(0, 2.2, 0), v(0.2, 1.6, 0.08), STOMACH[0].clone()];
const SMALL = [STOMACH[STOMACH.length - 1].clone(), v(-0.1, 0.5, 0.3)];
// The small intestine snakes back and forth in the middle of the belly.
for (let row = 0; row < 6; row++) {
  const y = 0.3 - row * 0.24;
  const dir = row % 2 ? 1 : -1;
  SMALL.push(v(dir * -0.55, y, 0.35 + (row % 2) * 0.05), v(0, y - 0.04, 0.42), v(dir * 0.55, y - 0.1, 0.35));
}
SMALL.push(v(-0.6, -1.25, 0.3), v(-0.88, -1.15, 0.25));
const LARGE = [v(-0.88, -1.15, 0.25), v(-0.95, -0.3, 0.2), v(-0.92, 0.55, 0.2), v(0, 0.7, 0.25), v(0.92, 0.55, 0.2), v(0.95, -0.3, 0.2), v(0.85, -1.15, 0.2), v(0.25, -1.5, 0.15)];
const RECTUM = [v(0.25, -1.5, 0.15), v(0.05, -1.8, 0.1), v(0, -2.2, 0.1)];

body.add(tagPart(tube(MOUTH, 0.16, mouthMat, 12), 'mouth'));
const teeth = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 6, 20, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), mat(0xffffff));
teeth.position.set(0, 3.3, 0.6);
body.add(tagPart(teeth, 'mouth'));
[-1, 1].forEach((side) => {
  const gland = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12).scale(1, 1.3, 0.8), glandMat);
  gland.position.set(side * 0.5, 3.25, 0.3);
  body.add(tagPart(gland, 'saliva'));
});
const pipe = tube(PIPE, 0.09, pipeMat, 32);
body.add(tagPart(pipe, 'esophagus'));
const stomach = new THREE.Mesh(stomachGeometry().scale(STOMACH_SIZE, STOMACH_SIZE, STOMACH_SIZE), stomachMat);
stomach.position.copy(STOMACH_AT);
body.add(tagPart(stomach, 'stomach'));
const liver = new THREE.Mesh(liverGeometry().scale(0.6, 0.6, 0.6), liverMat);
liver.position.set(-0.45, 1.2, 0.15);
liver.rotation.z = -0.2;
body.add(tagPart(liver, 'liver'));
const pancreas = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.7, 4, 12).rotateZ(Math.PI / 2 - 0.2), pancreasMat);
pancreas.position.set(0.25, 0.68, -0.15);
body.add(tagPart(pancreas, 'pancreas'));
const smallTube = tube(SMALL, 0.085, smallMat, 240);
body.add(tagPart(smallTube, 'small'));
const largeTube = tube(LARGE, 0.17, largeMat, 96);
body.add(tagPart(largeTube, 'large'));
body.add(tagPart(tube(RECTUM, 0.14, rectumMat, 16), 'rectum'));

// A few blood vessels by the small intestine, for the food to soak into.
const vessels = [];
for (let i = 0; i < 4; i++) {
  const y = 0.25 - i * 0.4;
  vessels.push(v(-0.4 + i * 0.27, y, 0.65));
  body.add(tube([v(-0.75, y + 0.15, 0.6), v(0, y, 0.68), v(0.75, y - 0.1, 0.6)], 0.025, bloodMat, 16));
}

addLabel('mouth', body, v(0.55, 3.45, 0.8), { hideWith: body });
addLabel('saliva', body, v(-0.95, 3.15, 0.3), { hideWith: body });
addLabel('esophagus', body, v(-0.45, 2.1, 0), { hideWith: body });
addLabel('stomach', body, v(1.3, 1.1, 0.3), { hideWith: body });
addLabel('liver', body, v(-1.2, 1.4, 0.3), { hideWith: body });
addLabel('pancreas', body, v(0.4, 0.4, -0.2), { hideWith: body });
addLabel('small', body, v(0, -0.35, 0.65), { hideWith: body });
addLabel('large', body, v(-1.4, -0.3, 0.2), { hideWith: body });
addLabel('rectum', body, v(0.6, -2.05, 0.1), { hideWith: body });

// ---------- The journey ----------

// The whole path, mouth to end, and where each stage starts along it.
const ALL = [...MOUTH, ...PIPE.slice(1), ...STOMACH.slice(1), ...SMALL.slice(1), ...LARGE.slice(1), ...RECTUM.slice(1)];
const path = curveOf(ALL);
function tAt(point) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 600; i++) {
    const d = path.getPointAt(i / 600).distanceTo(point);
    if (d < bestD) { bestD = d; best = i / 600; }
  }
  return best;
}
const T = {
  pipe: tAt(PIPE[0]), stomach: tAt(STOMACH[0]), small: tAt(SMALL[0]),
  large: tAt(LARGE[0]), rectum: tAt(RECTUM[0]),
};

const STAGES = [
  { key: 'mouth', to: T.pipe, time: 3, word: 'Ingestion' },
  { key: 'pipe', to: T.stomach, time: 2.5, word: 'Digestion', line: 'Gulp! The food pipe squeezes it down to the stomach, in a wave.' },
  { key: 'stomach', to: T.small, time: 5, word: 'Digestion', line: 'The stomach churns it with strong acid and juices, into a thick soup.' },
  { key: 'small', to: T.large, time: 7, word: 'Absorption', line: 'In the small intestine, the goodness soaks into the blood. Energy for your cells!' },
  { key: 'large', to: T.rectum, time: 5, word: 'Absorption', line: 'The large intestine soaks up the water. What’s left gets solid.' },
  { key: 'rectum', to: 1, time: 2.5, word: 'Elimination', line: 'And out it goes, as poop! Flush!' },
];

const food = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), foodMat);
food.visible = false;
scene.add(food);

// Acid bubbles in the stomach, nutrients into the blood, water out of the large intestine.
const bits = Array.from({ length: 24 }, () => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), acidMat);
  b.visible = false;
  scene.add(b);
  return b;
});

// ---------- Stretched out ----------

// Real lengths in a grown-up, in meters, end to end.
const LENGTHS = { pipe: 0.25, stomach: 0.25, small: 6.5, large: 1.5, rectum: 0.5 };
const TOTAL = 0.15 + LENGTHS.pipe + LENGTHS.stomach + LENGTHS.small + LENGTHS.large + LENGTHS.rectum; // ≈ 9 m
const SCALE = 1; // one unit per meter
const LEFT = -TOTAL / 2;
const STRAIGHT_Y = -2.9;
const marks = [[0, 0], [T.pipe, 0.15], [T.stomach, 0.4], [T.small, 0.65], [T.large, 7.15], [T.rectum, 8.65], [1, TOTAL]];
function straightAt(t) {
  for (let i = 1; i < marks.length; i++) {
    if (t <= marks[i][0]) {
      const [t0, m0] = marks[i - 1];
      const [t1, m1] = marks[i];
      return v(LEFT + (m0 + ((t - t0) / (t1 - t0)) * (m1 - m0)) * SCALE, STRAIGHT_Y, 0);
    }
  }
  return v(LEFT + TOTAL * SCALE, STRAIGHT_Y, 0);
}

const SAMPLES = 160;
const bent = Array.from({ length: SAMPLES + 1 }, (_, i) => path.getPointAt(i / SAMPLES));
const straight = bent.map((_, i) => straightAt(i / SAMPLES));
let gut = null;
function buildGut(k) {
  if (gut) {
    scene.remove(gut);
    gut.geometry.dispose();
  }
  gut = tube(bent.map((p, i) => p.clone().lerp(straight[i], k)), 0.1, gutMat, SAMPLES * 2);
  scene.add(gut);
}

const ruler = new THREE.Group();
ruler.visible = false;
scene.add(ruler);
const rulerBar = new THREE.Mesh(new THREE.BoxGeometry(TOTAL * SCALE, 0.04, 0.04), tickMat);
rulerBar.position.set(0, STRAIGHT_Y - 0.45, 0);
ruler.add(rulerBar);
for (let mtr = 0; mtr <= 9; mtr++) {
  const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.03), tickMat);
  tick.position.set(LEFT + mtr * SCALE, STRAIGHT_Y - 0.45, 0);
  ruler.add(tick);
}

// Name tags along the stretched-out tube.
const rulerTags = [
  ['👄 Mouth', 0], ['Stomach', 0.5], ['Small intestine: about 6½ m', 3.9], ['Large intestine', 7.9], ['End', TOTAL],
].map(([text, at], i) => {
  const tag = makeLabel(text);
  tag.position.set(LEFT + at * SCALE, STRAIGHT_Y + (i % 2 ? 0.5 : 0.85), 0);
  scene.add(tag);
  return tag;
});

// ---------- Controls ----------

const state = { trip: null, stretched: 0, stretchTarget: 0, fast: false, plate: [] };
const levelCard = document.getElementById('level-card');

function aim(key) {
  const { camera: c, target: t } = AIM[key];
  camera.position.set(...c);
  controls.target.set(...t);
}

document.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
  if (state.stretchTarget) document.getElementById('stretch').click();
  const meal = MEALS[b.dataset.meal];
  STAGES[0].line = meal.line;
  foodMat.color.set(meal.color);
  food.scale.setScalar(1);
  food.visible = true;
  state.trip = { stage: 0, t: 0, from: 0 };
  showStage();
}));

function showStage() {
  const s = STAGES[state.trip.stage];
  levelCard.textContent = `${s.word} · ${s.line}`;
  cello.say(s.line, { ms: 4200 });
}

bindToggle('speed', (on) => { state.fast = on; });

bindToggle('stretch', (on) => {
  state.stretchTarget = on ? 1 : 0;
  if (on) {
    state.trip = null;
    food.visible = false;
    levelCard.textContent = 'Stretched out, a grown-up’s digestive system is about 9 meters long. Each tick is 1 meter!';
    aim('stretched');
    if (complete('stretch')) cello.say('About 9 meters! That’s nearly as long as a bus, coiled up in your belly.', { mood: 'wow', ms: 5500 });
  } else {
    aim('body');
  }
});

// Build a plate.
const FOODS = {
  grain: '🍚', veg: '🥦', fruit: '🍌', protein: '🫘', dairy: '🥛', junk: '🍟',
};
const plateEl = document.getElementById('plate');
const verdictEl = document.getElementById('plate-verdict');

function judgePlate() {
  const count = (k) => state.plate.filter((f) => f === k).length;
  plateEl.textContent = state.plate.length ? state.plate.map((k) => FOODS[k]).join(' ') : 'Your plate is empty.';
  const junk = count('junk');
  const balanced = count('grain') && (count('veg') || count('fruit')) && count('protein') && junk <= 1;
  if (junk >= 3) {
    verdictEl.textContent = '😣 Too much junk food: lots of fat, salt, and sugar, and hardly any fiber. That can cause tummy aches and constipation.';
    if (complete('junk')) cello.say('Ouch, my tummy! Too much junk food, and not enough fiber to keep food moving. A little now and then is okay.', { mood: 'wow', ms: 6500 });
  } else if (balanced) {
    verdictEl.textContent = '😋 Balanced! Grains for energy, veggies and fruit for fiber and vitamins, and dal or eggs to grow strong.';
    if (complete('plate')) cello.say('A balanced plate! Your digestive system loves that. Don’t forget to drink water too.', { mood: 'wow', ms: 5500 });
  } else if (state.plate.length) {
    const need = [!count('grain') && 'grains', !(count('veg') || count('fruit')) && 'veggies or fruit', !count('protein') && 'dal or eggs'].filter(Boolean);
    verdictEl.textContent = need.length ? `Add some ${need.join(' and ')}.` : 'Maybe less junk food?';
  } else {
    verdictEl.textContent = '';
  }
}

document.querySelectorAll('[data-food]').forEach((b) => b.addEventListener('click', () => {
  if (state.plate.length >= 10) {
    cello.say('That plate is full! Clear it to start again.', { ms: 3000, important: false });
    return;
  }
  state.plate.push(b.dataset.food);
  judgePlate();
}));
document.getElementById('clear-plate').addEventListener('click', () => {
  state.plate = [];
  judgePlate();
});

document.getElementById('reset').addEventListener('click', () => aim(state.stretchTarget ? 'stretched' : 'body'));

// ---------- Animation ----------

const ease = (dt, rate) => 1 - Math.exp(-dt * rate);
const startColor = new THREE.Color();

stage.onFrame((dt) => {
  // Stretching: the organs fade and a single tube unrolls into a line.
  const before = state.stretched;
  state.stretched += (state.stretchTarget - state.stretched) * ease(dt, 2);
  if (Math.abs(state.stretched - state.stretchTarget) < 0.002) state.stretched = state.stretchTarget;
  if (state.stretched !== before || (state.stretched > 0 && !gut)) buildGut(state.stretched);
  if (gut) gut.visible = state.stretched > 0.01;
  body.visible = state.stretched < 0.5;
  ruler.visible = state.stretched > 0.95;
  rulerTags.forEach((tag) => { tag.visible = ruler.visible; });

  // The stomach churns gently, harder while food is in it.
  const churning = state.trip && STAGES[state.trip.stage].key === 'stomach';
  const wobble = Math.sin(performance.now() / (churning ? 120 : 600)) * (churning ? 0.06 : 0.015);
  stomach.scale.set(1 + wobble, 1 - wobble, 1);

  const trip = state.trip;
  if (!trip) {
    bits.forEach((b) => { b.visible = false; });
    return;
  }
  const s = STAGES[trip.stage];
  trip.t = Math.min(1, trip.t + (dt / s.time) * (state.fast ? 2.5 : 1));
  const along = trip.from + (s.to - trip.from) * trip.t;
  path.getPointAt(along, food.position);
  if (s.key === 'mouth') food.scale.setScalar(1 - trip.t * 0.35); // chewed smaller
  if (s.key === 'stomach') {
    food.position.copy(STOMACH_AT).add(v(Math.sin(trip.t * 25) * 0.15, Math.cos(trip.t * 19) * 0.1, 0.1));
    if (trip.t > 0.85) path.getPointAt(along, food.position);
    foodMat.color.lerp(startColor.set(0xd8b070), dt);
  }
  if (s.key === 'large' || s.key === 'rectum') foodMat.color.lerp(poop, dt * 1.5);
  if (s.key === 'small') food.scale.setScalar(0.65 - trip.t * 0.15);

  // Little bits: acid in the stomach, nutrients into the blood, water out.
  bits.forEach((b, i) => {
    const phase = (trip.t * 3 + i / bits.length) % 1;
    if (s.key === 'stomach') {
      b.material = acidMat;
      b.position.copy(STOMACH_AT).add(v(Math.cos(i) * 0.3, -0.2 + phase * 0.4, Math.sin(i) * 0.15));
      b.visible = true;
    } else if (s.key === 'small') {
      b.material = nutrientMat;
      b.position.lerpVectors(food.position, vessels[i % vessels.length], phase);
      b.visible = true;
    } else if (s.key === 'large') {
      b.material = waterMat;
      b.position.copy(food.position).add(v(Math.cos(i * 2.4) * phase * 0.6, Math.sin(i * 2.4) * phase * 0.6, 0.2));
      b.visible = true;
    } else {
      b.visible = false;
    }
  });

  if (s.key === 'small' && trip.t > 0.5 && complete('absorb')) {
    cello.say('Look! The nutrients slip into the blood, which carries them to every cell.', { mood: 'wow', ms: 5000 });
  }
  if (trip.t >= 1) {
    if (trip.stage === STAGES.length - 1) {
      state.trip = null;
      food.visible = false;
      levelCard.textContent = 'Ingestion, digestion, absorption, elimination. The whole journey!';
      if (complete('meal')) cello.say('The whole journey! Eat it, break it down, soak it up, and get rid of the rest.', { mood: 'wow', ms: 6000 });
    } else {
      trip.from = s.to;
      trip.stage += 1;
      trip.t = 0;
      showStage();
    }
  }
});

aim('body');
