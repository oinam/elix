import * as THREE from 'three';
import { heartGeometry, lungGeometry, stomachGeometry } from './organs.js';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// Organ systems work together, like a relay race. A blood cell runs laps
// around a loop: it picks up glucose at the digestive system, oxygen at the
// lungs, and drops both at a body cell, where they become energy (plus carbon
// dioxide and water). The carbon dioxide rides back to the lungs and is
// breathed out. Plus a “Which systems?” game from the book’s scenarios.

const PARTS = {
  digestive: { name: 'Digestive system', text: 'Breaks food down into tiny pieces, like glucose (a sugar). Then it hands them to the blood. First runner!' },
  lungs: { name: 'Respiratory system', text: 'The lungs bring oxygen in from the air, and hand it to the blood. They also take carbon dioxide back and breathe it out.' },
  heart: { name: 'Heart', text: 'The pump of the circulatory system. It keeps the blood running around the loop, so the baton never stops.' },
  blood: { name: 'Blood (circulatory system)', text: 'The runner that goes everywhere! It carries glucose and oxygen to every cell, and carries carbon dioxide away.' },
  cell: { name: 'Body cell', text: 'One of the trillions of cells in your body. It needs glucose and oxygen to get energy, so it can do its job.' },
  mito: { name: 'Mitochondria', text: 'Tiny power stations inside the cell. Here, glucose and oxygen are turned into energy. Carbon dioxide and water are left over.' },
  glucose: { name: 'Glucose', text: 'A sugar that comes from your food. It holds the energy your cells need.' },
  oxygen: { name: 'Oxygen', text: 'A gas from the air. Cells need it to get the energy out of glucose.' },
};

const SYSTEMS = {
  digestive: '🍎 Digestive',
  respiratory: '🫁 Respiratory',
  circulatory: '❤️ Circulatory',
  muscular: '💪 Muscular',
  nervous: '🧠 Nervous',
  skeletal: '🦴 Skeletal',
};

const SCENARIOS = [
  {
    text: '🏃 When you run, you breathe heavier and faster. Your heart beats faster too, bringing more oxygen to your cells. Which two systems are working together?',
    need: ['respiratory', 'circulatory'], ok: ['muscular', 'skeletal', 'nervous'],
    why: 'Respiratory (breathing harder) and circulatory (the heart beating faster). Your muscles and bones are running too!',
  },
  {
    text: '🏋️ When you lift weights, your arm muscles bulge, and your brain sends them signals to keep lifting. Which two systems?',
    need: ['muscular', 'nervous'], ok: ['skeletal', 'circulatory', 'respiratory'],
    why: 'Muscular (the arm muscles) and nervous (the brain sending signals). The bones help too!',
  },
  {
    text: '🧃 After exercise you’re hot, tired, and sweaty. A bottle of juice makes you feel better. Which systems are working?',
    need: ['digestive', 'circulatory'], ok: ['respiratory', 'muscular', 'nervous'],
    why: 'Digestive (taking in the juice’s sugar and water) and circulatory (carrying them to your tired cells).',
  },
  {
    text: '🍛 You eat lunch, and an hour later you have energy to play. Which systems got the food to your muscles?',
    need: ['digestive', 'circulatory'], ok: ['respiratory', 'muscular'],
    why: 'Digestive (breaking down lunch) and circulatory (carrying it to your muscles). Your lungs bring the oxygen to use it!',
  },
  {
    text: '⚽ You see a ball coming and kick it. Which systems made that happen?',
    need: ['nervous', 'muscular'], ok: ['skeletal'],
    why: 'Nervous (your eyes and brain spot the ball) and muscular (your leg kicks). Your bones are the levers!',
  },
];

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.3, 12.6);
const TARGET_HOME = new THREE.Vector3(0, 0, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'teamwork',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['cell'],
  greeting: 'Your body is a relay team! Eat, breathe, and press Go to start the race.',
  allPartsLine: 'All 8 parts! You know the whole team.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false });

const trackMat = seeThrough(0xe8445a, 0.35);
const stomachMat = mat(0xf7a072);
const gutMat = mat(0xffb3a1);
const lungMat = mat(0xff9fb0);
const heartMat = mat(0xd62839);
const cellMat = seeThrough(0xb6e3a8, 0.4);
const nucleusMat = mat(0x8a6cc8);
const mitoMat = mat(0xff9f43, { emissive: 0x6b3500, emissiveIntensity: 0.2 });
const runnerMat = mat(0xe02030, { emissive: 0x400000 });
const glucoseMat = mat(0xffd36b, { emissive: 0x8a5200 });
const o2Mat = mat(0x7fe3ff, { emissive: 0x1d7a9a });
const co2Mat = mat(0x9aa0aa, { emissive: 0x2a2e36 });
const waterMat = mat(0x8fd0ff, { emissive: 0x2a6aa8 });
const starMat = mat(0xffe066, { emissive: 0xffc400, emissiveIntensity: 0.9 });
const otherCells = mat(0xe8445a);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const R = 2.5;
// u = 0 at the digestive system (left), going clockwise: lungs at the top
// (0.25), the body cell on the right (0.5), the heart at the bottom (0.75).
const onLoop = (u, out = new THREE.Vector3()) => {
  const a = Math.PI - u * Math.PI * 2;
  return out.set(Math.cos(a) * R, Math.sin(a) * R, 0);
};

// ---------- The team ----------

const track = new THREE.Mesh(new THREE.TorusGeometry(R, 0.16, 12, 96), trackMat);
scene.add(tagPart(track, 'blood'));
// Other blood cells, just running along for company.
const crowd = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 0.5, 1), otherCells, 30);
crowd.frustumCulled = false;
scene.add(tagPart(crowd, 'blood'));

// Digestive system on the left.
const digestive = new THREE.Group();
digestive.position.set(-R - 1.0, 0, 0);
const stomach = new THREE.Mesh(stomachGeometry().scale(0.5, 0.5, 0.5), stomachMat);
stomach.position.set(0, 0.5, 0);
digestive.add(stomach);
const coil = [];
for (let i = 0; i < 4; i++) coil.push(v(i % 2 ? 0.35 : -0.35, -0.1 - i * 0.18, 0.1));
digestive.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(-0.36, 0.29, 0), ...coil, v(0.6, -0.4, 0)]), 48, 0.07, 8), gutMat));
scene.add(tagPart(digestive, 'digestive'));

// Lungs at the top.
const lungs = new THREE.Group();
lungs.position.set(0, R + 1.0, 0);
[-1, 1].forEach((side) => {
  const lung = new THREE.Mesh(lungGeometry(side, { hollow: 0.1 }).scale(0.55, 0.5, 0.5), lungMat);
  lung.position.x = side * 0.42;
  lungs.add(lung);
});
lungs.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 10).translate(0, 0.5, 0), mat(0xbfe3ff)));
scene.add(tagPart(lungs, 'lungs'));

// The heart at the bottom.
const heart = new THREE.Mesh(heartGeometry().scale(0.3, 0.3, 0.3).translate(0, 0.1, 0), heartMat);
heart.position.set(0, -R, 0);
scene.add(tagPart(heart, 'heart'));

// A body cell on the right, with mitochondria inside.
const cell = new THREE.Group();
cell.position.set(R + 1.25, 0, 0);
cell.add(tagPart(new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 24), cellMat), 'cell'));
const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), nucleusMat);
nucleus.position.set(0.25, 0.3, 0);
cell.add(nucleus);
const mitos = [v(-0.3, -0.25, 0.3), v(0.3, -0.4, 0.2), v(-0.2, 0.4, 0.2)].map((p, i) => {
  const mito = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 4, 10), mitoMat);
  mito.position.copy(p);
  mito.rotation.z = i * 1.1;
  cell.add(tagPart(mito, 'mito'));
  return mito;
});
scene.add(cell);
const MITO = cell.position.clone().add(mitos[0].position);

// The runner and its batons.
const runner = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12).scale(1, 0.5, 1), runnerMat);
scene.add(tagPart(runner, 'blood'));
const baton = (material, part) => {
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), material);
  b.visible = false;
  scene.add(part ? tagPart(b, part) : b);
  return b;
};
const glucose = baton(glucoseMat, 'glucose');
const oxygen = baton(o2Mat, 'oxygen');
const co2 = baton(co2Mat);
const water = baton(waterMat);
const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), starMat);
star.visible = false;
scene.add(star);

addLabel('digestive', scene, v(-R - 1.0, 1.15, 0));
addLabel('lungs', scene, v(1.05, R + 1.0, 0));
addLabel('heart', scene, v(0.85, -R - 0.2, 0));
addLabel('blood', scene, v(-1.9, -1.9, 0.2));
addLabel('cell', scene, v(R + 1.25, 1.25, 0));
addLabel('mito', cell, v(-0.35, -0.65, 0.4));
[['🍎 Food comes in', v(-R - 1.0, -1.0, 0)], ['🌬️ Air in, carbon dioxide out', v(2.2, R + 1.3, 0)]].forEach(([text, at]) => {
  const tag = makeLabel(text);
  tag.position.copy(at);
  scene.add(tag);
});

// ---------- The relay ----------

const state = {
  running: false, u: 0, food: 0, air: 0,
  carry: { glucose: false, oxygen: false, co2: false },
  energy: 0, burst: 0, puff: 0, beat: 0, warned: false, laps: 0,
};
const levelCard = document.getElementById('level-card');
const energyEl = document.getElementById('energy');
const suppliesEl = document.getElementById('supplies');

function showSupplies() {
  suppliesEl.textContent = `🍬 Glucose ready: ${state.food} · 🫧 Oxygen ready: ${state.air}`;
  const stars = Math.round(state.energy);
  energyEl.textContent = stars ? `⚡ Energy: ${'⭐'.repeat(stars)}` : '⚡ Energy: none yet';
}

document.getElementById('eat').addEventListener('click', () => {
  state.food = Math.min(9, state.food + 3);
  showSupplies();
  cello.say('Yum! The digestive system breaks the food into glucose.', { ms: 3500, important: false });
});

document.getElementById('breathe').addEventListener('click', () => {
  state.air = Math.min(9, state.air + 3);
  state.puff = 1;
  showSupplies();
  cello.say('Big breath! The lungs bring in oxygen.', { ms: 3000, important: false });
});

bindToggle('run', (on) => {
  state.running = on;
  if (on && !state.food && !state.air) cello.say('The runner is off! But nothing to carry yet. Try Eat and Breathe.', { ms: 4500 });
  else if (on) cello.say('Go! The blood runs the loop, carrying batons.', { ms: 3000, important: false });
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// Things that happen as the runner passes each station.
function arrive(at) {
  if (at === 0 && state.food > 0 && !state.carry.glucose) {
    state.food -= 1;
    state.carry.glucose = true;
    levelCard.textContent = '1 · The digestive system passes glucose (from food) to the blood.';
  } else if (at === 0.25) {
    if (state.carry.co2) {
      state.carry.co2 = false;
      state.puff = 1;
      state.laps += 1;
      levelCard.textContent = '4 · The blood hands carbon dioxide to the lungs, and you breathe it out. One lap done!';
      if (complete('relay')) cello.say('One whole relay! Digestive, respiratory, and circulatory systems, all passing the baton.', { mood: 'wow', ms: 6000 });
    }
    if (state.air > 0 && !state.carry.oxygen) {
      state.air -= 1;
      state.carry.oxygen = true;
      if (!state.laps) levelCard.textContent = '2 · The lungs pass oxygen to the blood.';
    }
  } else if (at === 0.5) {
    if (state.carry.glucose && state.carry.oxygen) {
      state.carry.glucose = false;
      state.carry.oxygen = false;
      state.carry.co2 = true;
      state.burst = 1.6;
      state.energy = Math.min(5, state.energy + 1);
      levelCard.textContent = '3 · In the cell, glucose + oxygen → energy! Carbon dioxide and water are left over.';
      if (state.energy >= 5 && complete('energy')) cello.say('Five stars of energy! This cell can work, grow, and play.', { mood: 'wow', ms: 5000 });
    } else if (state.carry.glucose && !state.carry.oxygen) {
      levelCard.textContent = 'Glucose, but no oxygen: the cell can’t get the energy out. Breathe!';
      if (complete('noair')) cello.say('Glucose but no oxygen? No energy! That’s why you need to breathe AND eat.', { mood: 'wow', ms: 5500 });
    } else if (state.carry.oxygen && !state.carry.glucose) {
      levelCard.textContent = 'Oxygen, but no glucose: nothing to get energy from. Eat something!';
      cello.say('Oxygen but no food! The cell needs both.', { ms: 3500 });
    }
  }
  showSupplies();
}

// ---------- Animation ----------

const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const STATIONS = [0, 0.25, 0.5, 0.75];

stage.onFrame((dt) => {
  // The heart beats and the crowd of blood cells flows, always.
  state.beat = (state.beat + dt * 1.2) % 1;
  heart.scale.setScalar(1 + Math.pow(Math.max(0, Math.sin(state.beat * Math.PI * 2)), 6) * 0.12);
  for (let i = 0; i < crowd.count; i++) {
    onLoop((i / crowd.count + state.beat * 0.05 + performance.now() / 40000) % 1, p);
    crowd.setMatrixAt(i, m.makeTranslation(p.x, p.y, 0.05));
  }
  crowd.instanceMatrix.needsUpdate = true;

  if (state.running) {
    const before = state.u;
    state.u = (state.u + dt * 0.09) % 1;
    STATIONS.forEach((s) => {
      const crossed = before <= s ? state.u > s || state.u < before : state.u > s && state.u < before;
      if (crossed) arrive(s);
    });
  }
  onLoop(state.u, runner.position);
  runner.position.z = 0.2;

  // Batons ride on top of the runner.
  glucose.visible = state.carry.glucose;
  oxygen.visible = state.carry.oxygen;
  co2.visible = state.carry.co2;
  glucose.position.copy(runner.position).add(v(-0.13, 0.17, 0.1));
  oxygen.position.copy(runner.position).add(v(0.13, 0.17, 0.1));
  co2.position.copy(runner.position).add(v(0, 0.2, 0.1));

  // Energy burst in the cell, with water left over.
  state.burst = Math.max(0, state.burst - dt);
  star.visible = state.burst > 0;
  water.visible = state.burst > 0;
  if (state.burst > 0) {
    star.position.copy(MITO).add(v(0, (1.6 - state.burst) * 0.6, 0.5));
    star.rotation.y += dt * 6;
    star.scale.setScalar(0.6 + Math.sin(state.burst * 6) * 0.3);
    water.position.copy(MITO).add(v(0.4 + (1.6 - state.burst) * 0.4, -0.3, 0.5));
  }
  mitoMat.emissiveIntensity = 0.2 + state.burst * 0.5;

  // A puff from the lungs when breathing.
  state.puff = Math.max(0, state.puff - dt);
  lungs.scale.setScalar(1 + state.puff * 0.12);

  // Cells use their energy, slowly.
  if (state.energy > 0) state.energy = Math.max(0, state.energy - dt * 0.03);
  if (Math.round(state.energy) !== state.shown) {
    state.shown = Math.round(state.energy);
    showSupplies();
  }
});

// ---------- Which systems? ----------

const choicesEl = document.getElementById('choices');
const answerEl = document.getElementById('answer');
const gameCount = document.getElementById('game-count');
let round = 0;
let right = 0;
const picked = new Set();

function showScenario() {
  const sc = SCENARIOS[round % SCENARIOS.length];
  document.getElementById('scenario').textContent = sc.text;
  answerEl.textContent = '';
  picked.clear();
  choicesEl.replaceChildren(...Object.entries(SYSTEMS).map(([key, label]) => {
    const b = document.createElement('button');
    b.className = 'btn press';
    b.textContent = label;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      if (picked.has(key)) picked.delete(key);
      else picked.add(key);
      b.setAttribute('aria-pressed', String(picked.has(key)));
    });
    return b;
  }));
  gameCount.textContent = right ? `✅ ${right}` : '';
}

document.getElementById('check').addEventListener('click', () => {
  const sc = SCENARIOS[round % SCENARIOS.length];
  const hasAll = sc.need.every((k) => picked.has(k));
  const noWrong = [...picked].every((k) => sc.need.includes(k) || sc.ok.includes(k));
  if (hasAll && noWrong) {
    answerEl.textContent = `Yes! ${sc.why}`;
    right += 1;
    gameCount.textContent = `✅ ${right}`;
    if (right >= 3 && complete('game')) cello.say('Three right! You can spot organ systems working together anywhere.', { mood: 'wow', ms: 5000 });
    else cello.say('That’s it! Teamwork!', { ms: 2500, important: false });
  } else if (!picked.size) {
    answerEl.textContent = 'Tap the systems you think are working, then Check.';
  } else {
    answerEl.textContent = hasAll ? 'Close! One of those isn’t really part of it. Try again.' : 'Close! Think about what’s happening in the story, and try again.';
    cello.say('Almost! Read the story again for clues.', { ms: 3000, important: false });
  }
});

document.getElementById('next').addEventListener('click', () => {
  round += 1;
  showScenario();
});

showScenario();
showSupplies();
