import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';
import { solid, glass, seeded, blobGeometry, spherePoints } from './cellparts.js';

// A sheet of cells that follow the rules: they split to fill a gap, then stop
// when it's full. Strong sun and smoke can hurt a cell's instruction book
// (DNA). Most of the time the body fixes it, or a white blood cell clears the
// cell away. Once in a long while one gets missed, stops following the rules,
// and keeps splitting into a lump, until a doctor helps.

const PARTS = {
  cell: { name: 'Body cell', text: 'One tiny worker with a job to do. It grows, rests, and splits only when the body needs a new cell.' },
  nucleus: { name: 'Nucleus', text: 'The control center. Inside is the cell’s instruction book (DNA). It says when to grow, when to rest, and when to stop.' },
  tissue: { name: 'Sheet of cells (tissue)', text: 'Lots of the same kind of cell working together, like the cells in your skin or the lining of your lungs.' },
  sun: { name: 'Sun’s rays (UV light)', text: 'Sunshine is good for us! But too much strong sun can hurt the instruction book in skin cells.' },
  damage: { name: 'Hurt instruction book', text: 'Some of the instructions got mixed up. Don’t worry: the body has helpers that fix this every day.' },
  wbc: { name: 'White blood cell', text: 'A germ fighter and cleaner. It finds cells that are too broken to fix and clears them away.' },
  lump: { name: 'Lump (tumor)', text: 'Cells that don’t follow the stop rule keep splitting, even with no room. Doctors know many ways to help.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 6.6, 7.4);
const TARGET_HOME = new THREE.Vector3(0, 0.2, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'cancer',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'These cells are all following the rules. Try making a scrape, and watch them fix it!',
  allPartsLine: 'All 7 parts! You know how cells keep the rules, and what happens when they don’t.',
});
const { addLabel, tagPart, untagPart, showLabels, complete, cello } = explorer;

// ---------- Colors ----------

const CELL = 0xffb3a7;
const CELL_NEW = 0xffd2c9;
const NUCLEUS = 0x9a7cf5;
const NUCLEUS_HURT = 0x6b5a7a;
const ROGUE = 0xc49bff;
const SPARK = 0xffd75e;
const CREW = 0x8de8a8;

// ---------- The sheet ----------

const sheet = new THREE.Group();
scene.add(sheet);

const COLS = 9;
const ROWS = 7;
const GAP = 0.95;
const slots = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const x = (c - (COLS - 1) / 2 + (r % 2 ? 0.25 : -0.25)) * GAP;
    const z = (r - (ROWS - 1) / 2) * GAP * 0.86;
    slots.push({ pos: new THREE.Vector3(x, 0, z), cell: null });
  }
}
slots.forEach((s) => {
  s.neighbors = slots.filter((o) => o !== s && o.pos.distanceTo(s.pos) < GAP * 1.15);
});

// The layer the cells sit on.
const base = new THREE.Mesh(
  new THREE.BoxGeometry(COLS * GAP + 0.8, 0.16, ROWS * GAP * 0.86 + 0.8),
  solid(0xf3c9a0, { roughness: 0.9 }),
);
base.position.y = -0.3;
sheet.add(tagPart(base, 'tissue'));

const cellGeo = blobGeometry(0.5, { bump: 0.04, seed: 3, scale: [1, 0.55, 1] });
const nucleusGeo = new THREE.SphereGeometry(0.17, 20, 14);
const sparkGeo = new THREE.OctahedronGeometry(0.06);

function makeCell(color = CELL) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(cellGeo, solid(color, { roughness: 0.6 }));
  group.add(body);
  const nucleus = new THREE.Mesh(nucleusGeo, solid(NUCLEUS));
  nucleus.position.y = 0.2;
  group.add(nucleus);
  tagPart(group, 'cell');
  nucleus.userData.part = 'nucleus';
  sheet.add(group);
  return {
    group, body, nucleus,
    state: 'ok', // ok, hurt, fixing, waiting, leaving, rogue
    grow: 1, // 0 to 1 while it's being born
    from: null, // where it was born from
    timer: 0,
    sparks: null,
    crew: null,
  };
}

function placeCell(slot, cell) {
  slot.cell = cell;
  cell.slot = slot;
  cell.group.position.copy(slot.pos);
}

function removeCell(cell) {
  untagPart(cell.group);
  sheet.remove(cell.group);
  if (cell.slot) cell.slot.cell = null;
  cell.slot = null;
}

slots.forEach((s) => placeCell(s, makeCell()));

// ---------- The sun, the shade, and smoke ----------

const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
sun.position.set(-4.6, 4.4, -3.2);
scene.add(tagPart(sun, 'sun'));
addLabel('sun', sun, new THREE.Vector3(0, 0.95, 0));

// The hat and sunscreen: a see-through shield over the cells.
const SHIELD_Y = 1.5;
const shield = new THREE.Mesh(
  new THREE.BoxGeometry(COLS * GAP + 0.6, 0.06, ROWS * GAP * 0.86 + 0.6),
  glass(0xffe08a, 0.28),
);
shield.position.y = SHIELD_Y;
shield.renderOrder = 4;
shield.visible = false;
scene.add(shield);

const rayMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.8, depthWrite: false });
const rays = [];
function shootRay(to) {
  const from = sun.position.clone();
  const length = from.distanceTo(to);
  const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, length, 6), rayMat.clone());
  ray.position.copy(from).lerp(to, 0.5);
  ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  scene.add(ray);
  rays.push({ mesh: ray, life: 0.7 });
}

const smokeMat = () => new THREE.MeshStandardMaterial({ color: 0x9aa3ab, transparent: true, opacity: 0.6, depthWrite: false });
const puffs = [];
function puffSmoke() {
  const rand = seeded(Math.floor(performance.now()) % 997 + 1);
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.3 + rand() * 0.25, 14, 10), smokeMat());
    puff.position.set(5.5 + rand() * 1.5, 0.9 + rand() * 0.6, (rand() - 0.5) * 4);
    scene.add(puff);
    puffs.push({ mesh: puff, life: 3, speed: 2.2 + rand() });
  }
}

// ---------- Hurt, fixed, or cleared away ----------

function hurt(cell) {
  cell.state = 'hurt';
  cell.timer = 3;
  cell.nucleus.material.color.set(NUCLEUS_HURT);
  cell.nucleus.userData.part = 'damage';
  const sparks = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: SPARK }));
    s.userData.part = 'damage';
    s.userData.angle = (i / 4) * Math.PI * 2;
    sparks.add(s);
  }
  sparks.position.y = 0.2;
  cell.group.add(sparks);
  cell.sparks = sparks;
  damageMarker.position.copy(cell.slot.pos);
  damageMarker.visible = true;
  showLabels();
}

function heal(cell) {
  if (cell.sparks) cell.group.remove(cell.sparks);
  if (cell.crew) cell.group.remove(cell.crew);
  cell.sparks = null;
  cell.crew = null;
  cell.nucleus.material.color.set(NUCLEUS);
  cell.nucleus.userData.part = 'nucleus';
  cell.state = 'ok';
}

function startFix(cell) {
  cell.state = 'fixing';
  cell.timer = 2.2;
  const crew = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: CREW }));
    c.userData.angle = (i / 5) * Math.PI * 2;
    crew.add(c);
  }
  crew.position.y = 0.2;
  cell.group.add(crew);
  cell.crew = crew;
}

// The first hurt cell gets fixed, the next is cleared away, then either.
let hurtCount = 0;
function decide() {
  hurtCount += 1;
  if (hurtCount === 1) return 'fix';
  if (hurtCount === 2) return 'clean';
  return Math.random() < 0.6 ? 'fix' : 'clean';
}

// One white blood cell, which visits broken cells one at a time.
const wbc = new THREE.Group();
const wbcBody = new THREE.Mesh(blobGeometry(0.42, { bump: 0.12, seed: 11 }), solid(0xf7f7fb, { roughness: 0.7 }));
wbc.add(wbcBody);
const wbcCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), solid(0xb08be8));
wbcCore.position.set(0.08, 0.1, 0.1);
wbc.add(wbcCore);
wbc.visible = false;
scene.add(tagPart(wbc, 'wbc'));
addLabel('wbc', wbc, new THREE.Vector3(0, 0.7, 0), { hideWith: wbc });
const queue = [];
let visit = null; // { cell, phase: 'in' | 'eat' | 'out', t }
const WBC_START = new THREE.Vector3(-6.5, 0.45, 0);
const WBC_END = new THREE.Vector3(6.5, 0.45, 0);

function nextVisit() {
  const cell = queue.shift();
  if (!cell) return;
  visit = { cell, phase: 'in', t: 0, from: WBC_START.clone().setZ(cell.slot.pos.z) };
  wbc.position.copy(visit.from);
  wbc.visible = true;
  showLabels();
}

// A marker for the "Hurt instruction book" label, over the latest hurt cell.
const damageMarker = new THREE.Group();
damageMarker.visible = false;
scene.add(damageMarker);
addLabel('damage', damageMarker, new THREE.Vector3(0, 0.75, 0), { hideWith: damageMarker });

// ---------- The cell that stops following the rules ----------

const lump = new THREE.Group();
lump.visible = false;
scene.add(lump);
addLabel('lump', lump, new THREE.Vector3(0, 1.6, 0), { hideWith: lump });
const lumpCells = [];
const LUMP_MAX = 34;
const lumpSpots = spherePoints(120).filter((p) => p.y > 0.05);
let rogue = null;

function breakRule() {
  const hurtCells = slots.map((s) => s.cell).filter((c) => c && c.state === 'hurt');
  const okCells = slots.map((s) => s.cell).filter((c) => c && c.state === 'ok' && c.grow >= 1);
  // Away from the edge, so the lump has room to show.
  const middle = okCells.filter((c) => Math.abs(c.slot.pos.x) < 2.5 && Math.abs(c.slot.pos.z) < 1.6);
  const cell = hurtCells[0] ?? middle[Math.floor(Math.random() * middle.length)] ?? okCells[0];
  if (!cell) return false;
  heal(cell);
  cell.state = 'rogue';
  cell.body.material.color.set(ROGUE);
  untagPart(cell.group);
  tagPart(cell.group, 'lump');
  rogue = cell;
  lump.position.copy(cell.slot.pos);
  lump.visible = true;
  showLabels();
  return true;
}

function growLump() {
  if (!rogue || doctoring > 0 || lumpCells.length >= LUMP_MAX) return;
  const k = lumpCells.length + 1;
  const spot = lumpSpots[(k * 37) % lumpSpots.length];
  const radius = 0.35 + Math.cbrt(k) * 0.32;
  const mesh = new THREE.Mesh(cellGeo, solid(ROGUE, { roughness: 0.6 }));
  mesh.scale.setScalar(0.7);
  mesh.position.set(spot.x * radius, 0.1 + spot.y * radius * 0.9, spot.z * radius);
  mesh.rotation.y = k;
  mesh.userData.grow = 0;
  lump.add(mesh);
  tagPart(mesh, 'lump');
  lumpCells.push(mesh);
}

function doctorHelps() {
  if (!rogue) return;
  doctoring = 1.2;
}

// ---------- The stop rule: split only into empty spaces ----------

let healing = false; // true after a scrape; 'quiet' after the doctor, so Cello's line stays up
let doctoring = 0; // seconds left while the lump shrinks away

function tick() {
  // Healthy cells split into an empty space next to them, and only then.
  slots.forEach((slot) => {
    if (slot.cell || Math.random() > 0.45) return;
    const parent = slot.neighbors.map((n) => n.cell).find((c) => c && c.state === 'ok' && c.grow >= 1);
    if (!parent) return;
    const baby = makeCell(CELL_NEW);
    placeCell(slot, baby);
    baby.grow = 0;
    baby.from = parent.slot.pos.clone();
    baby.group.position.copy(baby.from);
  });
  // The rule-breaker splits whether there is room or not.
  growLump();
  if (lumpCells.length === 8) {
    cello.say('That cell keeps splitting, even with no room. Too many cells make a lump (a tumor).', { mood: 'wow', ms: 6000 });
  }
}

function sheetIsFull() {
  return slots.every((s) => s.cell && s.cell.grow >= 1);
}

// ---------- Controls ----------

const stepCard = document.getElementById('step-card');
function updateCard() {
  const empty = slots.filter((s) => !s.cell).length;
  const hurtNow = slots.filter((s) => s.cell && ['hurt', 'fixing', 'waiting', 'leaving'].includes(s.cell.state)).length;
  let text;
  if (rogue) text = `One cell isn’t following the stop rule. Lump: ${lumpCells.length + 1} ${lumpCells.length ? 'cells' : 'cell'}`;
  else if (empty) text = `Filling the gap: ${empty} empty ${empty === 1 ? 'space' : 'spaces'} left`;
  else if (hurtNow) text = `The body is taking care of ${hurtNow} hurt ${hurtNow === 1 ? 'cell' : 'cells'}`;
  else text = 'Every cell is following the rules ✨';
  if (stepCard.textContent !== text) stepCard.textContent = text;
}

document.getElementById('scrape').addEventListener('click', () => {
  // Take away a small patch of cells around a spot near the middle.
  const center = slots[Math.floor(Math.random() * slots.length)].pos.clone().multiplyScalar(0.5);
  let taken = 0;
  slots.forEach((s) => {
    if (s.cell && s.cell.state === 'ok' && s.pos.distanceTo(center) < 1.25) {
      removeCell(s.cell);
      taken += 1;
    }
  });
  if (!taken) return;
  healing = true;
  cello.say('Ouch, a scrape! Watch the cells next to the gap split to fill it.', { ms: 4500 });
});

bindToggle('shade', (on) => {
  shield.visible = on;
  cello.say(on ? 'Hat and sunscreen on! Now try the strong sun.' : 'Shade off.', { ms: 3000 });
});

document.getElementById('sun').addEventListener('click', () => {
  const okCells = slots.map((s) => s.cell).filter((c) => c && c.state === 'ok' && c.grow >= 1);
  const targets = okCells.sort(() => Math.random() - 0.5).slice(0, 2);
  if (shield.visible) {
    targets.forEach((c) => shootRay(c.slot.pos.clone().setY(SHIELD_Y)));
    if (complete('shade')) cello.say('Blocked! Hats, shade, and sunscreen keep strong sun off your skin cells.', { mood: 'wow', ms: 5000 });
    else cello.say('Blocked again. The cells are safe in the shade.', { ms: 3000 });
    return;
  }
  targets.forEach((c) => {
    shootRay(c.slot.pos.clone().setY(0.2));
    hurt(c);
  });
  if (targets.length) cello.say('Too much strong sun hurt the instruction book in a cell. Let’s see what the body does.', { ms: 4500 });
});

document.getElementById('smoke').addEventListener('click', () => {
  puffSmoke();
  const okCells = slots.map((s) => s.cell).filter((c) => c && c.state === 'ok' && c.grow >= 1);
  const cell = okCells[Math.floor(Math.random() * okCells.length)];
  if (cell) setTimeout(() => { if (cell.state === 'ok' && cell.slot) hurt(cell); }, 900);
  cello.say('Smoke from cigarettes can hurt cells, like the ones in your lungs. That’s why it’s best never to smoke.', { ms: 5500 });
});

const missBtn = document.getElementById('miss');
const doctorBtn = document.getElementById('doctor');
missBtn.addEventListener('click', () => {
  if (rogue || !breakRule()) return;
  missBtn.disabled = true;
  doctorBtn.disabled = false;
  cello.say('Once in a long while, a hurt cell gets missed. Its stop rule is broken, so it keeps splitting.', { ms: 5500 });
});
doctorBtn.addEventListener('click', () => {
  doctorBtn.disabled = true;
  doctorHelps();
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Every frame ----------

let clock = 0;
stage.onFrame((dt) => {
  clock += dt;
  if (clock > 0.7) {
    clock = 0;
    tick();
  }

  slots.forEach((slot) => {
    const cell = slot.cell;
    if (!cell) return;
    // Newborn cells slide from their parent into the space and grow.
    if (cell.grow < 1) {
      cell.grow = Math.min(cell.grow + dt * 1.4, 1);
      const g = THREE.MathUtils.smoothstep(cell.grow, 0, 1);
      cell.group.position.lerpVectors(cell.from, slot.pos, g);
      cell.group.scale.setScalar(0.4 + 0.6 * g);
      if (cell.grow >= 1) cell.body.material.color.set(CELL);
    }
    if (cell.sparks) cell.sparks.children.forEach((s) => {
      s.userData.angle += dt * 2;
      s.position.set(Math.cos(s.userData.angle) * 0.26, 0.05 * Math.sin(clock * 9 + s.userData.angle), Math.sin(s.userData.angle) * 0.26);
      s.rotation.y += dt * 4;
    });
    if (cell.crew) cell.crew.children.forEach((c) => {
      c.userData.angle -= dt * 3;
      c.position.set(Math.cos(c.userData.angle) * 0.22, 0.1, Math.sin(c.userData.angle) * 0.22);
    });
    if (cell.state === 'hurt') {
      cell.timer -= dt;
      if (cell.timer <= 0) {
        if (decide() === 'fix') startFix(cell);
        else {
          cell.state = 'waiting';
          queue.push(cell);
          if (!visit) nextVisit();
        }
      }
    } else if (cell.state === 'fixing') {
      cell.timer -= dt;
      if (cell.timer <= 0) {
        heal(cell);
        if (complete('fix')) cello.say('Fixed! Tiny helpers mended its instruction book. Your body does this every day.', { mood: 'wow', ms: 5000 });
        else cello.say('Another one fixed!', { ms: 2000, important: false });
      }
    }
  });
  if (damageMarker.visible && !slots.some((s) => s.cell && s.cell.sparks)) {
    damageMarker.visible = false;
    showLabels();
  }

  // The white blood cell rolls in, clears the cell away, and rolls on.
  if (visit) {
    const { cell } = visit;
    const at = cell.slot ? cell.slot.pos.clone().setY(0.45) : wbc.position.clone();
    visit.t += dt;
    wbc.rotation.y += dt * 1.5;
    if (visit.phase === 'in') {
      const k = Math.min(visit.t / 2.2, 1);
      wbc.position.lerpVectors(visit.from, at, THREE.MathUtils.smoothstep(k, 0, 1));
      if (k >= 1) { visit.phase = 'eat'; visit.t = 0; cell.state = 'leaving'; }
    } else if (visit.phase === 'eat') {
      cell.group.scale.setScalar(Math.max(1 - visit.t, 0.01));
      if (visit.t >= 1) {
        removeCell(cell);
        visit.phase = 'out';
        visit.t = 0;
        visit.from = wbc.position.clone();
        if (complete('clean')) cello.say('A white blood cell cleared the broken cell away. Now a neighbor splits to fill the space.', { mood: 'wow', ms: 5500 });
      }
    } else {
      const k = Math.min(visit.t / 2.2, 1);
      wbc.position.lerpVectors(visit.from, WBC_END.clone().setZ(visit.from.z), THREE.MathUtils.smoothstep(k, 0, 1));
      if (k >= 1) {
        visit = null;
        wbc.visible = false;
        showLabels();
        nextVisit();
      }
    }
  }

  // The lump's new cells pop in.
  lumpCells.forEach((m) => {
    if (m.userData.grow < 1) {
      m.userData.grow = Math.min(m.userData.grow + dt * 2, 1);
      m.scale.setScalar(0.7 * m.userData.grow);
    }
  });

  // The doctor takes the lump away, and the gap fills with healthy cells.
  if (doctoring > 0) {
    doctoring -= dt;
    const s = Math.max(doctoring / 1.2, 0.01);
    lump.scale.setScalar(s);
    if (rogue) rogue.group.scale.setScalar(s);
    if (doctoring <= 0) {
      lumpCells.forEach((m) => { untagPart(m); lump.remove(m); });
      lumpCells.length = 0;
      lump.scale.setScalar(1);
      lump.visible = false;
      removeCell(rogue);
      rogue = null;
      showLabels();
      missBtn.disabled = false;
      healing = 'quiet';
      if (complete('doctor')) cello.say('The doctor took the lump away, and healthy cells fill the space. Doctors have lots of ways to help, and many people get better.', { mood: 'wow', ms: 7000 });
      else cello.say('All better. Healthy cells are filling the space.', { ms: 3500 });
    }
  }

  rays.forEach((r) => {
    r.life -= dt;
    r.mesh.material.opacity = Math.max(r.life / 0.7, 0) * 0.8;
  });
  for (let i = rays.length - 1; i >= 0; i--) {
    if (rays[i].life <= 0) { scene.remove(rays[i].mesh); rays[i].mesh.geometry.dispose(); rays.splice(i, 1); }
  }
  puffs.forEach((p) => {
    p.life -= dt;
    p.mesh.position.x -= p.speed * dt;
    p.mesh.position.y += 0.15 * dt;
    p.mesh.material.opacity = Math.max(p.life / 3, 0) * 0.6;
  });
  for (let i = puffs.length - 1; i >= 0; i--) {
    if (puffs[i].life <= 0) { scene.remove(puffs[i].mesh); puffs[i].mesh.geometry.dispose(); puffs.splice(i, 1); }
  }

  if (healing && sheetIsFull()) {
    const quiet = healing === 'quiet';
    healing = false;
    if (quiet) {
      // The doctor's line is still up; let it finish.
    } else if (complete('heal')) cello.say('All full! The cells got the “stop, no more room” signal, so they stopped splitting.', { mood: 'wow', ms: 5500 });
    else cello.say('Full again, so the cells stopped. That’s the stop rule!', { ms: 3500 });
  }
  updateCard();
});

// ---------- Labels that stay put ----------

const middle = slots[Math.floor(slots.length / 2)].pos;
const labelSpot = new THREE.Group();
labelSpot.position.copy(middle);
scene.add(labelSpot);
addLabel('cell', labelSpot, new THREE.Vector3(-1.9, 0.6, 1.6));
addLabel('nucleus', labelSpot, new THREE.Vector3(1.9, 0.7, 1.6));
addLabel('tissue', labelSpot, new THREE.Vector3(0, -0.2, 3.4));

updateCard();
