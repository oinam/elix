import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';
import { glass, solid, blobGeometry, makeNucleus, makeMitochondrion, makeVacuole, makeER, makeGolgi, makeRibosomes } from './cellparts.js';

// The jelly inside a cell and the little parts (organelles) floating in it.
// Shake it, make it flow, take the jelly away, and follow sugar and a
// package through it.

const PARTS = {
  membrane: { name: 'Cell membrane', text: 'The thin skin around the cytoplasm. It keeps the jelly in.' },
  cytoplasm: { name: 'Cytoplasm', text: 'A clear jelly, mostly water, that fills the cell. Every part floats in it, and lots of the cell’s work happens right here.' },
  nucleus: { name: 'Nucleus', text: 'The control center. It floats in the cytoplasm, inside its own skin.' },
  mitochondria: { name: 'Power stations (mitochondria)', text: 'They finish breaking down food to make energy for the cell.' },
  er: { name: 'Tunnels (endoplasmic reticulum)', text: 'Folded tunnels around the nucleus. The dots on them are ribosomes building things, and the tunnels carry them through the cell.' },
  golgi: { name: 'Packing room (Golgi body)', text: 'A stack of flat pockets. It packs things into little bubbles and sends them where they need to go, even out of the cell.' },
  ribosomes: { name: 'Builders (ribosomes)', text: 'Tiny dots that build proteins: the stuff a cell is made of and works with.' },
  lysosomes: { name: 'Cleaners (lysosomes)', text: 'Little bags that break down waste and old, worn-out parts.' },
  vacuoles: { name: 'Storage bubbles (vacuoles)', text: 'They keep water, food, and waste until the cell needs them.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 1.6, 8.6);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'cytoplasm',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['membrane', 'cytoplasm'],
  greeting: 'All this clear jelly is the cytoplasm! Shake the cell and see what happens.',
  allPartsLine: 'All 9 parts! You know what floats in the jelly.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- The cell ----------

const R = 2.6;
const SHAPE = new THREE.Vector3(1.08, 0.9, 1);
const cell = new THREE.Group();
scene.add(cell);

const membraneMat = glass(0x8fe3cf, 0.24);
const membrane = new THREE.Mesh(blobGeometry(R, { bump: 0.035, seed: 11 }), membraneMat);
membrane.scale.copy(SHAPE);
membrane.renderOrder = 5;
cell.add(tagPart(membrane, 'membrane'));

// The jelly: the cytoplasm itself, with free ribosomes floating in it.
const jelly = new THREE.Group();
cell.add(jelly);
const cytoMat = glass(0xbff0e6, 0.14);
const cytoplasm = new THREE.Mesh(blobGeometry(R * 0.97, { bump: 0.035, seed: 11 }), cytoMat);
cytoplasm.scale.copy(SHAPE);
cytoplasm.renderOrder = 1;
jelly.add(tagPart(cytoplasm, 'cytoplasm'));

const NUCLEUS_AT = new THREE.Vector3(0.35, 0.05, 0);
const ribosomes = makeRibosomes(240, R * 0.8, { size: 0.045, avoid: [{ center: NUCLEUS_AT, radius: 1.5 }] });
ribosomes.scale.copy(SHAPE);
jelly.add(tagPart(ribosomes, 'ribosomes'));

// Everything that floats, each with a home it drifts back to.
const bodies = [];
function floater(object, home, { size = 0.3, part, parent = cell, streams = true }) {
  object.position.copy(home);
  parent.add(object);
  const body = { object, base: home.clone(), velocity: new THREE.Vector3(), size, streams, part };
  bodies.push(body);
  return body;
}

const nucleus = makeNucleus({ radius: 0.85, chromosomeCount: 0 });
const er = makeER(1.0, { layers: 3 });
nucleus.group.add(er);
tagPart(nucleus.group, 'nucleus');
tagPart(er, 'er');
floater(nucleus.group, NUCLEUS_AT, { size: 0.85, streams: false });

const mitoGroup = new THREE.Group();
cell.add(tagPart(mitoGroup, 'mitochondria'));
const mitos = [[-1.4, -0.9, 0.7], [1.6, -0.9, 0.4], [1.5, 1.1, 0.5], [-0.6, 1.5, -0.6], [0.2, -1.5, -0.5]].map((p, i) => {
  const m = makeMitochondrion(0.62);
  m.rotation.set(i * 0.7, i * 1.3, i * 0.4);
  tagPart(m, 'mitochondria');
  return floater(m, new THREE.Vector3(...p), { size: 0.35, parent: mitoGroup });
});

const golgi = makeGolgi(0.75);
golgi.rotation.set(0.2, 0.7, 0.3);
tagPart(golgi, 'golgi');
const golgiBody = floater(golgi, new THREE.Vector3(-1.65, 0.75, 0.55), { size: 0.45 });

const lysoGroup = new THREE.Group();
cell.add(lysoGroup);
[[1.9, 0.1, -0.6], [-1.9, -0.1, -0.7], [0.9, -1.3, 1.1], [-0.4, 1.2, 1.3]].forEach((p, i) => {
  const l = new THREE.Mesh(blobGeometry(0.17, { bump: 0.1, seed: 20 + i }), solid(0xc49bff));
  floater(l, new THREE.Vector3(...p), { size: 0.17, parent: lysoGroup });
});
tagPart(lysoGroup, 'lysosomes');

const vacGroup = new THREE.Group();
cell.add(vacGroup);
[[-0.8, -0.4, 1.6, 0.3], [1.2, 0.6, 1.5, 0.24], [0.6, 1.4, -1.1, 0.28]].forEach(([x, y, z, r]) => {
  floater(makeVacuole(r), new THREE.Vector3(x, y, z), { size: r, parent: vacGroup });
});
tagPart(vacGroup, 'vacuoles');

addLabel('membrane', cell, new THREE.Vector3(-2.1, 1.6, 0.4));
addLabel('cytoplasm', cell, new THREE.Vector3(0.6, -1.0, 1.7));
addLabel('nucleus', nucleus.group, new THREE.Vector3(0, 0.4, 0.75));
addLabel('er', nucleus.group, new THREE.Vector3(-0.2, -0.45, 1.25));
addLabel('golgi', golgi, new THREE.Vector3(0, 0.45, 0));
addLabel('mitochondria', mitos[2].object, new THREE.Vector3(0, 0.3, 0));
addLabel('ribosomes', cell, new THREE.Vector3(-1.2, 0.5, 1.5));
addLabel('lysosomes', lysoGroup.children[0], new THREE.Vector3(0, 0.3, 0));
addLabel('vacuoles', vacGroup.children[0], new THREE.Vector3(0, 0.4, 0));

// ---------- How the jelly behaves ----------

const state = { thick: 5, streaming: false, angle: 0, drained: false, drain: 0, shake: 0, time: 0 };
const yAxis = new THREE.Vector3(0, 1, 0);

// Where each part rests with no jelly: in a heap on the floor of a sagging cell.
bodies.forEach((b, i) => {
  if (b.object === nucleus.group) {
    b.heap = new THREE.Vector3(0, -0.6, 0);
  } else {
    const a = i * 2.4;
    const ring = 1.05 + (i % 2) * 0.3;
    b.heap = new THREE.Vector3(Math.cos(a) * ring, -1.0 + (i % 3) * 0.1, Math.sin(a) * ring);
  }
});

function homeOf(b) {
  const home = b.base.clone();
  if (b.streams) home.sub(NUCLEUS_AT).applyAxisAngle(yAxis, state.angle).add(NUCLEUS_AT);
  return home.lerp(b.heap, state.drain);
}

function updateBodies(dt) {
  // Thick jelly slows everything down; runny jelly lets things slosh about.
  const damping = 1 + state.thick * 1.3 + state.drain * 6;
  const jiggle = (1 - state.thick / 12) * (1 - state.drain);
  for (const b of bodies) {
    const pull = homeOf(b).sub(b.object.position).multiplyScalar(7);
    pull.addScaledVector(b.velocity, -damping);
    pull.add(new THREE.Vector3().randomDirection().multiplyScalar(jiggle * 1.5));
    b.velocity.addScaledVector(pull, dt);
    b.object.position.addScaledVector(b.velocity, dt);
    // Bump off the inside of the membrane.
    const scaled = b.object.position.clone().divide(SHAPE);
    const limit = R * 0.92 - b.size;
    if (scaled.length() > limit) {
      scaled.setLength(limit);
      b.object.position.copy(scaled.multiply(SHAPE));
      b.velocity.multiplyScalar(-0.4);
    }
    if (b.streams && state.streaming && !state.drained) b.object.rotation.y += dt * 0.6;
  }
}

function shake() {
  state.shake = 1;
  const kick = 9 / (1 + state.thick * 0.5);
  bodies.forEach((b) => b.velocity.add(new THREE.Vector3().randomDirection().multiplyScalar(kick * (b.object === nucleus.group ? 0.4 : 1))));
}

// ---------- Sugar and packages: things that travel ----------

const movers = []; // { mesh, stops, legTime, t, onDone }
const at = (stop) => (typeof stop === 'function' ? stop() : stop);

function travel(mesh, stops, legTime, onDone) {
  mesh.position.copy(at(stops[0]));
  cell.add(mesh);
  movers.push({ mesh, stops, legTime, t: 0, onDone });
}

function updateMovers(dt) {
  for (let i = movers.length - 1; i >= 0; i--) {
    const m = movers[i];
    m.t += dt;
    const leg = Math.floor(m.t / m.legTime);
    if (m.t < 0) continue;
    if (leg >= m.stops.length - 1) {
      cell.remove(m.mesh);
      movers.splice(i, 1);
      m.onDone?.();
      continue;
    }
    const local = THREE.MathUtils.smoothstep((m.t % m.legTime) / m.legTime, 0, 1);
    m.mesh.position.lerpVectors(at(m.stops[leg]), at(m.stops[leg + 1]), local);
    m.mesh.rotation.y += dt * 3;
    if (m.fade) m.mesh.scale.setScalar(Math.max(1 - m.t / (m.legTime * (m.stops.length - 1)), 0.01));
  }
}

const surface = (dir) => dir.clone().normalize().multiply(SHAPE).multiplyScalar(R * (1 - state.drain * 0.3));
const sugarMat = solid(0xffffff, { emissive: 0x6f7f8c });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd75e });
const pulses = new Map(); // object -> 0..1

function pulse(object) {
  pulses.set(object, 1);
}

function sparkle(from) {
  for (let k = 0; k < 6; k++) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), sparkMat);
    const to = from.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.7));
    travel(spark, [from.clone(), to], 0.9);
    movers[movers.length - 1].fade = true;
  }
}

function feedSugar() {
  for (let k = 0; k < 4; k++) {
    const dir = new THREE.Vector3(Math.cos(k * 1.7) * 1.2, 0.5 - k * 0.35, 1).normalize();
    const inside = surface(dir).multiplyScalar(0.55);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), sugarMat);
    travel(cube, [surface(dir).multiplyScalar(1.6), surface(dir), inside], 1, () => {
      // The jelly splits each sugar in two, then each half goes to a power station.
      for (const half of [0, 1]) {
        const target = mitos[(k + half * 2) % mitos.length];
        const bit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), sugarMat);
        travel(bit, [inside.clone(), () => target.object.position], 1.2, () => {
          pulse(target.object);
          sparkle(target.object.position.clone());
        });
      }
    });
    movers[movers.length - 1].t = -k * 0.3;
  }
}

const proteinMat = solid(0x6fd3ff, { emissive: 0x1a4c80 });
const bubbleMat = glass(0xff9bb5, 0.8);
function sendPackage() {
  const erPoint = () => nucleus.group.position.clone().add(new THREE.Vector3(-1.1, 0.15, 0.4));
  const made = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), proteinMat);
  travel(made, [erPoint(), erPoint, () => golgiBody.object.position], 1.1, () => {
    pulse(golgiBody.object);
    const out = golgiBody.object.position.clone();
    const edge = surface(out.clone().add(new THREE.Vector3(-0.2, 0.3, 0.5)));
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), bubbleMat);
    travel(bubble, [() => golgiBody.object.position, edge, edge.clone().multiplyScalar(1.12)], 1.3, () => {
      sparkle(edge.clone().multiplyScalar(1.15));
    });
  });
}

function updatePulses(dt) {
  pulses.forEach((p, object) => {
    object.scale.setScalar(1 + 0.3 * Math.sin(p * Math.PI));
    if (p <= 0) pulses.delete(object);
    else pulses.set(object, Math.max(0, p - dt * 1.6));
  });
}

// ---------- Controls ----------

const shook = new Set();
document.getElementById('shake').addEventListener('click', () => {
  shake();
  if (state.drained) {
    cello.say('With no jelly, the parts just rattle around in a heap!', { mood: 'sad', ms: 3500 });
    return;
  }
  shook.add(state.thick <= 3 ? 'runny' : state.thick >= 7 ? 'thick' : 'middle');
  if (shook.has('runny') && shook.has('thick') && complete('shake')) {
    cello.say('Runny jelly lets the parts slosh around. Thick jelly holds them still. Real cytoplasm can be runny in some places and thick in others!', { mood: 'wow', ms: 8000 });
  } else if (state.thick <= 3) {
    cello.say('Whee! In runny jelly, everything sloshes about.', { ms: 3500 });
  } else if (state.thick >= 7) {
    cello.say('In thick jelly, the parts barely move. It holds them in place.', { ms: 3500 });
  } else {
    cello.say('Wobble wobble! Now try runny jelly, and thick jelly.', { ms: 3500 });
  }
});

bindSlider('thick', (v) => (v <= 3 ? 'Runny' : v >= 7 ? 'Thick' : 'Medium'), (v) => {
  state.thick = v;
  cytoMat.userData.opacity = 0.08 + v * 0.016;
});

bindToggle('stream', (on) => {
  state.streaming = on;
  if (!on) return;
  if (state.drained) {
    cello.say('There’s no jelly to flow! Bring the jelly back first.', { mood: 'sad', ms: 3500 });
    return;
  }
  if (complete('stream')) {
    cello.say('Round and round! The jelly flows and carries the parts with it. Plant cells do this all the time.', { mood: 'wow', ms: 6000 });
  } else {
    cello.say('Flowing again!', { ms: 2000 });
  }
});

bindToggle('drain', (on) => {
  state.drained = on;
  if (!on) {
    cello.say('Phew! The jelly is back, and every part floats where it should.', { ms: 4000 });
    return;
  }
  if (complete('drain')) {
    cello.say('Without jelly, the parts fall in a heap and the cell sags like an empty bag. The cytoplasm fills the cell and holds everything in place!', { mood: 'wow', ms: 8000 });
  } else {
    cello.say('Uh-oh, everything falls in a heap again!', { mood: 'sad', ms: 3000 });
  }
});

document.getElementById('sugar').addEventListener('click', () => {
  if (state.drained) {
    cello.say('A cell needs its jelly to work. Bring it back first!', { mood: 'sad', ms: 3500 });
    return;
  }
  feedSugar();
  setTimeout(() => {
    if (complete('sugar')) {
      cello.say('The jelly splits each sugar in two. Then the power stations, the mitochondria, finish the job and make energy! ✨', { mood: 'wow', ms: 7000 });
    } else {
      cello.say('Yum! More energy coming up! ✨', { ms: 2500 });
    }
  }, 2200);
});

document.getElementById('package').addEventListener('click', () => {
  if (state.drained) {
    cello.say('A cell needs its jelly to work. Bring it back first!', { mood: 'sad', ms: 3500 });
    return;
  }
  sendPackage();
  setTimeout(() => {
    if (complete('package')) {
      cello.say('Builders on the tunnels made it, the packing room wrapped it in a bubble, and out it went!', { mood: 'wow', ms: 7000 });
    } else {
      cello.say('Another package, wrapped and sent!', { ms: 2500 });
    }
  }, 3600);
});

document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Every frame ----------

stage.onFrame((dt) => {
  state.time += dt;
  if (state.streaming && !state.drained) state.angle += dt * 0.5;
  state.drain += ((state.drained ? 1 : 0) - state.drain) * (1 - Math.exp(-dt * 2.5));
  updateBodies(dt);
  updateMovers(dt);
  updatePulses(dt);

  // The membrane wobbles when shaken, and sags with no jelly inside.
  state.shake = Math.max(0, state.shake - dt * 1.2);
  const wobble = 1 + Math.sin(state.time * 28) * 0.05 * state.shake;
  const d = state.drain;
  membrane.scale.set(SHAPE.x * (1 + d * 0.04) * wobble, SHAPE.y * (1 - d * 0.33) / wobble, SHAPE.z * (1 + d * 0.04) * wobble);
  membrane.position.y = -d * 0.42;
  cytoMat.opacity = cytoMat.userData.opacity * (1 - d);
  jelly.scale.set(1 - d * 0.45, 1 - d * 0.78, 1 - d * 0.45);
  jelly.position.y = -d * 1.05;
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { membrane: 0x8fe3cf, cytoplasm: 0xbff0e6 },
  light: { membrane: 0x2fa889, cytoplasm: 0x7fd6c2 },
};
window.elixTheme.watch((theme) => {
  membraneMat.color.set(THEME_COLORS[theme].membrane);
  cytoMat.color.set(THEME_COLORS[theme].cytoplasm);
});
