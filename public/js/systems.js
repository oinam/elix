import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage } from './scene.js';
import { createExplorer, bindToggle } from './explorer.js';

// A bicycle is a system: parts that work together to do a job. Pedal it,
// take parts off and see it stop working, and swap round wheels for square
// ones to see how a part's shape (structure) fits its job (function).

const PARTS = {
  frame: { name: 'Frame', text: 'Strong, light tubes joined in triangles. It holds every other part in the right place.' },
  wheels: { name: 'Wheels and tires', text: 'Round, so they roll smoothly. The rubber tire is full of air. It makes the ride soft and grips the road.' },
  spokes: { name: 'Spokes', text: 'Thin wires, pulled tight. They keep the rim round and carry your weight to the middle of the wheel (the hub).' },
  pedals: { name: 'Pedals and cranks', text: 'Flat steps for your feet, on arms called cranks. Pushing them round and round turns the front gear.' },
  chain: { name: 'Chain', text: 'A loop of small metal links that can bend. It carries your push from the front gear to the back wheel.' },
  gears: { name: 'Gears', text: 'Wheels with teeth. The chain fits their teeth. A small gear at the back spins the wheel faster. A big one makes hills easier.' },
  handlebars: { name: 'Handlebars', text: 'Turn them to steer. They also hold the grips, the brake levers, and the bell.' },
  brakes: { name: 'Brakes', text: 'Rubber pads that squeeze the rim of each wheel. Rubbing slows the wheel down. Squeeze the levers on the handlebars to work them.' },
  seat: { name: 'Seat (saddle)', text: 'A soft seat on a post. Its narrow shape lets your legs move freely while you pedal.' },
  bell: { name: 'Bell', text: 'A little metal dome that rings. Its job is to warn people that you’re coming.' },
};

const RIDDLES = [
  ['I’m a loop of tiny links. I carry your push from the pedals to the back wheel.', 'chain'],
  ['I’m round, so I can roll. My rubber grips the road.', 'wheels'],
  ['I squeeze the wheel’s rim to slow it down.', 'brakes'],
  ['Push me with your feet, and I go round in a circle.', 'pedals'],
  ['I’m made of strong tubes in triangle shapes. Every other part hangs on me.', 'frame'],
  ['I have teeth, but I don’t bite. Pick a small one of me to go faster.', 'gears'],
];
const NAMES = { pedals: 'the pedals', chain: 'the chain', gears: 'the gears', wheels: 'the wheels', brakes: 'the brakes', frame: 'the frame' };

// ---------- Sizes, in the bike's own side view (x forward, y up) ----------

const R = 0.85; // wheel, to the middle of the tire
const TIRE = 0.075;
const SQUARE = 0.85; // half the side of a square wheel
const AXLE_Y = R + TIRE;
const REAR = new THREE.Vector3(-1.45, AXLE_Y, 0);
const FRONT = new THREE.Vector3(1.65, AXLE_Y, 0);
const BRACKET = new THREE.Vector3(-0.1, 0.7, 0); // where the cranks turn
const SEAT_JOINT = new THREE.Vector3(-0.42, 1.95, 0);
// The head tube sits above the front tire, in line with the fork, so the
// tire and the down tube clear each other.
const HEAD_TOP = new THREE.Vector3(0.955, 2.18, 0);
const HEAD_BOTTOM = new THREE.Vector3(1.1, 1.92, 0);
const CRANK = 0.42;
const RING = 0.3; // the front gear
const COGS = { easy: 0.3, fast: 0.14 }; // the back gears
const CHAIN_Z = 0.2;

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(1.4, 2.4, 6.8);
const TARGET_HOME = new THREE.Vector3(0, 1.1, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'systems',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'A bike is a system: lots of parts working together. Press Pedal to ride!',
  allPartsLine: 'All 10 parts! Every one has a shape that fits its job.',
  onPart: (key) => { if (key === 'bell') bellRing = 1; },
});
const { addLabel, tagPart, showLabels, complete, cello } = explorer;

// ---------- Materials ----------

// Each part gets its own material, so a tapped part glows on its own.
const paint = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const frameMat = paint(0x22c7b5);
const tireMat = paint(0x2b333c, { roughness: 0.8 });
const rimMat = paint(0xdfe6ec, { metalness: 0.6, roughness: 0.25 });
const spokeMat = paint(0xc9d3dc, { metalness: 0.5, roughness: 0.3 });
const chainMat = paint(0x9aa5b1, { metalness: 0.5, roughness: 0.35 });
const gearMat = paint(0xb8c2cc, { metalness: 0.6, roughness: 0.3 });
const crankMat = paint(0x5d6b78, { metalness: 0.4 });
const pedalMat = paint(0x2b333c);
const barMat = paint(0xdfe6ec, { metalness: 0.6, roughness: 0.25 });
const gripMat = paint(0xffb978);
const brakeMat = paint(0xff5a7a);
const seatMat = paint(0x7c6cf0);
const bellMat = paint(0xffd75e, { metalness: 0.5, roughness: 0.25 });
const roadMat = paint(0x2b3a48, { roughness: 0.9 });
const dashMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });

// A rod from a to b.
const UP = new THREE.Vector3(0, 1, 0);
function rod(a, b, radius, material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 14), material);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  return mesh;
}
const at = (v, z) => new THREE.Vector3(v.x, v.y, z);

// ---------- The road ----------

const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.06, 2.4), roadMat);
road.position.y = -0.03;
scene.add(road);
const DASH_GAP = 1.2;
const dashes = [];
for (let i = 0; i < 12; i++) {
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.08), dashMat);
  dash.position.set(-7 + i * DASH_GAP, 0.006, 0.75);
  scene.add(dash);
  dashes.push(dash);
}

// ---------- The bike ----------

// bounce moves up and down on square wheels; bike tips back on a flat tire.
const bounce = new THREE.Group();
scene.add(bounce);
const bike = new THREE.Group();
bounce.add(bike);

const frame = new THREE.Group();
frame.add(rod(SEAT_JOINT, HEAD_TOP, 0.055, frameMat)); // top tube
frame.add(rod(BRACKET, HEAD_BOTTOM, 0.065, frameMat)); // down tube
frame.add(rod(BRACKET, SEAT_JOINT, 0.06, frameMat)); // seat tube
frame.add(rod(HEAD_BOTTOM, HEAD_TOP, 0.075, frameMat)); // head tube
for (const z of [-0.12, 0.12]) {
  frame.add(rod(at(BRACKET, z * 0.6), at(REAR, z), 0.035, frameMat)); // chain stays
  frame.add(rod(at(SEAT_JOINT, z * 0.4), at(REAR, z), 0.035, frameMat)); // seat stays
  frame.add(rod(at(HEAD_BOTTOM, z * 0.6), at(FRONT, z), 0.04, frameMat)); // fork
}
bike.add(tagPart(frame, 'frame'));
addLabel('frame', frame, new THREE.Vector3(0.35, 1.75, 0));

// Two wheels. Each spins around its axle and can be round or square.
const tireRound = new THREE.TorusGeometry(R, TIRE, 14, 64);
const tireFlat = new THREE.TorusGeometry(R, TIRE * 0.45, 10, 64);
const wheels = [REAR, FRONT].map((axle) => {
  const spin = new THREE.Group();
  spin.position.copy(axle);
  bike.add(spin);

  const round = new THREE.Group();
  const tire = new THREE.Mesh(tireRound, tireMat);
  round.add(tire);
  round.add(new THREE.Mesh(new THREE.TorusGeometry(R - 0.07, 0.03, 8, 64), rimMat));
  spin.add(tagPart(round, 'wheels'));

  const square = new THREE.Group();
  const side = 2 * SQUARE + 0.15;
  for (const [x, y, w, h] of [[0, SQUARE, side, 0.15], [0, -SQUARE, side, 0.15], [SQUARE, 0, 0.15, side], [-SQUARE, 0, 0.15, side]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), tireMat);
    bar.position.set(x, y, 0);
    square.add(bar);
  }
  square.visible = false;
  spin.add(tagPart(square, 'wheels'));

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 16).rotateX(Math.PI / 2), rimMat);
  spin.add(tagPart(hub, 'wheels'));

  const spokes = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const z = i % 2 ? 0.08 : -0.08; // laced to both sides of the hub
    spokes.add(rod(new THREE.Vector3(0, 0, z), new THREE.Vector3(Math.cos(a) * (R - 0.08), Math.sin(a) * (R - 0.08), 0), 0.008, spokeMat));
  }
  spin.add(tagPart(spokes, 'spokes'));
  return { spin, round, square, tire };
});
// Labels sit on the bike, not the wheels, so they don't spin around.
addLabel('wheels', bike, FRONT.clone().add(new THREE.Vector3(0.62, -0.62, 0)));
addLabel('spokes', bike, REAR.clone().add(new THREE.Vector3(-0.35, -0.3, 0.1)));

// The gears: one at the front, turned by the cranks, and two at the back.
function gear(radius, teeth) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(radius - 0.02, radius - 0.02, 0.03, 32).rotateX(Math.PI / 2), gearMat));
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.03), gearMat);
    tooth.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    tooth.rotation.z = a - Math.PI / 2;
    g.add(tooth);
  }
  return g;
}
const gears = new THREE.Group();
const ring = gear(RING, 24);
ring.position.copy(at(BRACKET, CHAIN_Z));
gears.add(ring);
const cogs = new THREE.Group();
cogs.position.copy(at(REAR, 0));
const bigCog = gear(COGS.easy, 24);
bigCog.position.z = CHAIN_Z - 0.03;
const smallCog = gear(COGS.fast, 12);
smallCog.position.z = CHAIN_Z + 0.03;
cogs.add(bigCog, smallCog);
gears.add(cogs);
bike.add(tagPart(gears, 'gears'));
addLabel('gears', ring, new THREE.Vector3(0, -0.45, 0.1));

// Cranks and pedals turn around the bracket. The pedals stay flat.
const cranks = new THREE.Group();
cranks.position.copy(BRACKET);
const pedals = [];
for (const [z, angle] of [[0.3, 0], [-0.3, Math.PI]]) {
  const arm = new THREE.Group();
  arm.rotation.z = angle;
  arm.add(rod(new THREE.Vector3(0, 0, z), new THREE.Vector3(CRANK, 0, z), 0.035, crankMat));
  const pedal = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.05, 0.22, 2, 0.02), pedalMat);
  pedal.position.set(CRANK, 0, z + Math.sign(z) * 0.12);
  arm.add(pedal);
  pedals.push(pedal);
  cranks.add(arm);
}
cranks.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 14).rotateX(Math.PI / 2), crankMat));
bike.add(tagPart(cranks, 'pedals'));
addLabel('pedals', bike, new THREE.Vector3(BRACKET.x, 0.2, 0.55));

// The chain: links that slide around a loop over the front and back gears.
const chain = new THREE.Group();
const LINKS = 46;
const links = [];
for (let i = 0; i < LINKS; i++) {
  const link = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), chainMat);
  chain.add(link);
  links.push(link);
}
bike.add(tagPart(chain, 'chain'));
addLabel('chain', bike, new THREE.Vector3(-0.85, 1.15, CHAIN_Z), { hideWith: chain });

// A point at distance s along the loop, going the way the chain moves:
// forward along the top, round the front gear, back along the bottom, round
// the back gear.
function chainRuns(cog) {
  const dx = BRACKET.x - REAR.x;
  const dy = BRACKET.y - REAR.y;
  return [Math.hypot(dx, dy + RING - cog), Math.hypot(dx, dy - RING + cog)];
}
function chainPoint(s, cog) {
  const [top, bottom] = chainRuns(cog);
  const arcFront = Math.PI * RING;
  const arcBack = Math.PI * cog;
  const length = top + arcFront + bottom + arcBack;
  s = ((s % length) + length) % length;
  if (s < top) {
    const t = s / top;
    return [THREE.MathUtils.lerp(REAR.x, BRACKET.x, t), THREE.MathUtils.lerp(REAR.y + cog, BRACKET.y + RING, t)];
  }
  s -= top;
  if (s < arcFront) {
    const a = Math.PI / 2 - (s / arcFront) * Math.PI;
    return [BRACKET.x + Math.cos(a) * RING, BRACKET.y + Math.sin(a) * RING];
  }
  s -= arcFront;
  if (s < bottom) {
    const t = s / bottom;
    return [THREE.MathUtils.lerp(BRACKET.x, REAR.x, t), THREE.MathUtils.lerp(BRACKET.y - RING, REAR.y - cog, t)];
  }
  s -= bottom;
  const a = -Math.PI / 2 - (s / arcBack) * Math.PI;
  return [REAR.x + Math.cos(a) * cog, REAR.y + Math.sin(a) * cog];
}
function chainLength(cog) {
  const [top, bottom] = chainRuns(cog);
  return top + bottom + Math.PI * (RING + cog);
}
function placeChain() {
  const cog = COGS[state.gear];
  const length = chainLength(cog);
  links.forEach((link, i) => {
    const s = state.chainAt + (i / LINKS) * length;
    const [x, y] = chainPoint(s, cog);
    const [x2, y2] = chainPoint(s + 0.02, cog);
    link.position.set(x, y, CHAIN_Z);
    link.rotation.z = Math.atan2(y2 - y, x2 - x);
  });
}

// The seat, on its post.
const seat = new THREE.Group();
const POST_TOP = new THREE.Vector3(-0.52, 2.32, 0);
seat.add(rod(SEAT_JOINT, POST_TOP, 0.04, barMat));
const saddle = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.1, 0.24, 3, 0.05), seatMat);
saddle.position.set(-0.55, 2.38, 0);
seat.add(saddle);
const nose = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.08, 0.12, 3, 0.04), seatMat);
nose.position.set(-0.18, 2.37, 0);
seat.add(nose);
bike.add(tagPart(seat, 'seat'));
addLabel('seat', seat, new THREE.Vector3(-0.55, 2.62, 0));

// Handlebars: the stem, the bar across, and the grips.
const handlebars = new THREE.Group();
const STEM_TOP = new THREE.Vector3(0.98, 2.36, 0);
handlebars.add(rod(HEAD_TOP, STEM_TOP, 0.045, barMat));
handlebars.add(rod(new THREE.Vector3(0.92, 2.4, -0.5), new THREE.Vector3(0.92, 2.4, 0.5), 0.035, barMat));
for (const z of [-0.45, 0.45]) {
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 14).rotateX(Math.PI / 2), gripMat);
  grip.position.set(0.92, 2.4, z);
  handlebars.add(grip);
}
bike.add(tagPart(handlebars, 'handlebars'));
addLabel('handlebars', handlebars, new THREE.Vector3(0.92, 2.65, -0.5));

// Brakes: pads at each rim, and levers by the grips.
const brakes = new THREE.Group();
const brakeSpots = [
  REAR.clone().add(new THREE.Vector3().subVectors(SEAT_JOINT, REAR).setLength(R - 0.06)),
  FRONT.clone().add(new THREE.Vector3().subVectors(HEAD_BOTTOM, FRONT).setLength(R - 0.06)),
];
brakeSpots.forEach((spot) => {
  for (const z of [-0.07, 0.07]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), brakeMat);
    pad.position.set(spot.x, spot.y, z);
    brakes.add(pad);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 16, Math.PI).rotateY(Math.PI / 2), brakeMat);
  arch.position.set(spot.x, spot.y + 0.03, 0);
  brakes.add(arch);
});
for (const z of [-0.36, 0.36]) {
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.05), brakeMat);
  lever.position.set(1.02, 2.36, z);
  lever.rotation.y = 0.2 * Math.sign(z);
  brakes.add(lever);
}
bike.add(tagPart(brakes, 'brakes'));
addLabel('brakes', bike, new THREE.Vector3(brakeSpots[0].x - 0.1, brakeSpots[0].y + 0.25, 0), { hideWith: brakes });

// The bell, on the handlebars.
const bell = new THREE.Group();
bell.position.set(0.92, 2.45, 0.24);
const dome = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), bellMat);
bell.add(dome);
bell.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8).translate(0, -0.03, 0), bellMat));
bike.add(tagPart(bell, 'bell'));
addLabel('bell', bell, new THREE.Vector3(0, 0.22, 0.1));

// ---------- How it moves ----------

const state = {
  pedaling: false,
  braking: false,
  gear: 'easy',
  chain: true,
  brakes: true,
  air: true,
  square: false,
  crank: 0, // angle
  crankRate: 0,
  wheel: 0, // angle
  spin: 0, // how fast the wheels turn
  chainAt: 0,
  chainOffFor: 0,
};
const PEDAL_RATE = 3; // turns of the cranks, in radians per second
let bellRing = 0; // the bell wiggles after a tap

function speedName() {
  if (state.spin < 0.1) return 'Stopped';
  if (state.spin < 2) return 'Slow';
  if (state.spin < 4.5) return 'Rolling';
  return 'Zoom!';
}
const speedEl = document.getElementById('speed');
let shownSpeed = '';

stage.onFrame((dt) => {
  // The cranks speed up or slow down smoothly.
  const crankTarget = state.pedaling ? PEDAL_RATE : 0;
  state.crankRate += (crankTarget - state.crankRate) * (1 - Math.exp(-dt * 4));
  state.crank += state.crankRate * dt;

  // With the chain on, every turn of the cranks turns the back wheel:
  // more turns with a small back gear. Without it, the wheels just coast.
  const cog = COGS[state.gear];
  if (state.chain && state.pedaling) {
    let target = (state.crankRate * RING) / cog;
    if (!state.air) target *= 0.45;
    if (state.square) target *= 0.7;
    state.spin += (target - state.spin) * (1 - Math.exp(-dt * 2));
  } else {
    state.spin *= Math.exp(-dt * (state.air ? 0.25 : 1.2));
  }
  if (state.braking && state.brakes) {
    state.spin *= Math.exp(-dt * 4);
    if (state.spin < 0.05) {
      state.spin = 0;
      state.braking = false;
    }
  }
  if (state.spin < 0.01) state.spin = 0;
  state.wheel += state.spin * dt;
  if (state.chain) state.chainAt += state.crankRate * RING * dt;

  // Spin everything. Viewed from this side, forward is clockwise.
  wheels.forEach((w) => { w.spin.rotation.z = -state.wheel; });
  cogs.rotation.z = -state.wheel;
  ring.rotation.z = -state.crank;
  cranks.rotation.z = -state.crank;
  // Each pedal turns back against its crank, so it stays flat.
  pedals.forEach((pedal) => { pedal.rotation.z = state.crank - pedal.parent.rotation.z; });
  if (state.chain) placeChain();

  // The road slides back under the bike.
  const travel = state.spin * AXLE_Y * dt;
  dashes.forEach((d) => {
    d.position.x -= travel;
    if (d.position.x < -7) d.position.x += dashes.length * DASH_GAP;
  });

  // Square wheels lift the bike as they tip onto each corner.
  if (state.square) {
    const a = ((state.wheel % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
    bounce.position.y = SQUARE * Math.SQRT2 * Math.cos(Math.PI / 4 - a) - SQUARE;
  } else {
    bounce.position.y = 0;
  }
  const tip = state.air ? 0 : 0.03;
  bike.rotation.z += (tip - bike.rotation.z) * (1 - Math.exp(-dt * 5));

  if (bellRing > 0) {
    bellRing = Math.max(bellRing - dt * 1.5, 0);
    bell.rotation.x = Math.sin(bellRing * 40) * bellRing * 0.4;
  }

  const name = speedName();
  if (name !== shownSpeed) {
    shownSpeed = name;
    speedEl.textContent = `🚲 ${name}`;
  }
  checkRide(dt);
});

// ---------- Cello reacts to the ride ----------

let saidFlat = false;
function checkRide(dt) {
  if (state.pedaling && state.chain && state.spin > 1 && complete('ride')) {
    cello.say('Your feet push the pedals, the chain turns the wheel. That’s a system working!', { mood: 'wow', ms: 5000 });
  }
  if (state.pedaling && !state.chain) {
    state.chainOffFor += dt;
    if (state.chainOffFor > 1.2 && complete('chain')) {
      cello.say('The pedals spin, but the wheels don’t! Without the chain, your push can’t reach the wheel.', { mood: 'wow', ms: 6000 });
    }
  } else {
    state.chainOffFor = 0;
  }
  if (state.gear === 'fast' && state.pedaling && state.chain && state.spin > 4.5 && complete('gears')) {
    cello.say('Same pedaling, faster wheels! The small back gear turns more times for each push.', { mood: 'wow', ms: 5500 });
  }
  if (state.square && state.spin > 1 && complete('square')) {
    cello.say('Bumpety bump! Round wheels roll smoothly. Their shape fits their job.', { mood: 'wow', ms: 5000 });
  }
  if (!state.air && state.pedaling && state.spin > 0.5 && !saidFlat) {
    saidFlat = true;
    cello.say('A flat tire makes the ride slow and squishy. Pump in some air!', { ms: 4000 });
  }
}

// ---------- Controls ----------

const pedalButton = document.getElementById('pedal');
function setPedaling(on) {
  state.pedaling = on;
  if (on) state.braking = false;
  pedalButton.setAttribute('aria-pressed', String(on));
  pedalButton.textContent = on ? '🦶 Pedaling…' : '🦶 Pedal';
}
pedalButton.addEventListener('click', () => setPedaling(!state.pedaling));

document.getElementById('brake').addEventListener('click', () => {
  const moving = state.spin > 0.5;
  setPedaling(false);
  if (!state.brakes) {
    if (moving && complete('brakes')) {
      cello.say('Oh no, no brakes! The bike keeps rolling. Every part has a job.', { mood: 'wow', ms: 5500 });
    } else {
      cello.say('You squeeze, but nothing happens. There are no brakes!', { mood: 'sad', ms: 3500 });
    }
    return;
  }
  state.braking = true;
  if (moving) cello.say('The pads squeeze the rims, and the wheels slow down.', { ms: 3000 });
});

document.querySelectorAll('[data-gear]').forEach((b) => {
  b.addEventListener('click', () => {
    state.gear = b.dataset.gear;
    document.querySelectorAll('[data-gear]').forEach((g) => g.setAttribute('aria-pressed', String(g === b)));
    cello.say(state.gear === 'fast'
      ? 'Fast gear: the chain moves to the small back gear.'
      : 'Easy gear: the chain moves to the big back gear. Good for hills!', { ms: 3000 });
  });
});

const TAKE_OFF = {
  chain: ['Chain off! Now try pedaling.', 'Chain back on.'],
  brakes: ['Brakes off! Ride, then try to stop.', 'Brakes back on. Safe again!'],
  air: ['Psssss… the air is out of the back tire.', 'Pumped up! The tires are full of air.'],
};
document.querySelectorAll('[data-part-toggle]').forEach((b) => {
  b.addEventListener('click', () => {
    const key = b.dataset.partToggle;
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    state[key] = on;
    if (key === 'chain') chain.visible = on;
    if (key === 'brakes') brakes.visible = on;
    showLabels();
    if (key === 'air') {
      wheels[0].tire.geometry = on ? tireRound : tireFlat;
      if (on) saidFlat = false;
    }
    cello.say(TAKE_OFF[key][on ? 1 : 0], { ms: 3000 });
  });
});

document.querySelectorAll('[data-shape]').forEach((b) => {
  b.addEventListener('click', () => {
    state.square = b.dataset.shape === 'square';
    document.querySelectorAll('[data-shape]').forEach((s) => s.setAttribute('aria-pressed', String(s === b)));
    wheels.forEach((w) => {
      w.round.visible = !state.square;
      w.square.visible = state.square;
    });
    cello.say(state.square ? 'Square wheels! Do you think they’ll roll well? Try pedaling.' : 'Round again. Ahh, smooth!', { ms: 3500 });
  });
});

document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.copy(TARGET_HOME);
});

// ---------- Which part am I? ----------

let order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
let current = 0;
const solved = new Set();
const riddleEl = document.getElementById('riddle');
const riddleCount = document.getElementById('riddle-count');

function showRiddle() {
  riddleEl.textContent = `“${RIDDLES[order[current]][0]}”`;
  riddleCount.textContent = `${solved.size} of ${RIDDLES.length} solved`;
}

document.querySelectorAll('[data-answer]').forEach((b) => {
  b.addEventListener('click', () => {
    const [clue, answer] = RIDDLES[order[current]];
    if (b.dataset.answer !== answer) {
      cello.say(`Not ${NAMES[b.dataset.answer]}. Try again!`, { mood: 'sad', ms: 2200 });
      return;
    }
    solved.add(clue);
    if (solved.size === RIDDLES.length && complete('riddles')) {
      cello.say('You solved every riddle! You know what each part does.', { mood: 'wow', ms: 5500 });
    } else {
      cello.say(['Yes!', 'Correct!', 'You got it!', 'Spot on!'][solved.size % 4], { ms: 1800 });
    }
    current = (current + 1) % order.length;
    if (current === 0) order = [...RIDDLES.keys()].sort(() => Math.random() - 0.5);
    showRiddle();
  });
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { road: 0x2b3a48, frame: 0x22c7b5 },
  light: { road: 0xb9c7d1, frame: 0x17a596 },
};
window.elixTheme.watch((theme) => {
  const c = THEME_COLORS[theme];
  roadMat.color.set(c.road);
  frameMat.color.set(c.frame);
});

// ---------- Start ----------

placeChain();
showRiddle();
