import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// Organs team up into organ systems. A see-through body shows six of them:
// follow an apple through the digestive system, take a deep breath, speed up
// the heart, and fill the bladder. A plant shows its root and shoot systems,
// with water climbing the xylem and food moving through the phloem.

const PARTS = {
  brain: { name: 'Brain', text: 'The boss of your body. It thinks, remembers, and sends messages everywhere. Nervous system.' },
  nerves: { name: 'Spinal cord and nerves', text: 'Nerves are like wires. They carry messages between your brain and every part of you, super fast. The spinal cord is the big bundle down your back. Nervous system.' },
  windpipe: { name: 'Windpipe (trachea)', text: 'A tube that carries air from your nose and mouth down to your lungs. Respiratory system.' },
  lungs: { name: 'Lungs', text: 'Two spongy bags. Breathe in, and they fill with air and pass oxygen into your blood. Breathe out, and they push out carbon dioxide. Respiratory system.' },
  heart: { name: 'Heart', text: 'A strong muscle that pumps blood all around your body, day and night. Circulatory system.' },
  vessels: { name: 'Blood vessels', text: 'Tubes that carry blood. Arteries (red here) carry it away from the heart. Veins (blue here) bring it back. Real blood is always red! Circulatory system.' },
  foodPipe: { name: 'Food pipe (esophagus)', text: 'A tube that squeezes food down from your mouth to your stomach. Digestive system.' },
  stomach: { name: 'Stomach', text: 'A stretchy bag. It churns food with strong juices until it turns to mush. Digestive system.' },
  smallIntestine: { name: 'Small intestine', text: 'A long, curly tube. Here the goodness from food soaks into your blood. In a grown-up it’s about 6 meters long! Digestive system.' },
  largeIntestine: { name: 'Large intestine', text: 'A wider tube that soaks up water from what’s left. The rest leaves your body as poop. Digestive system.' },
  kidneys: { name: 'Kidneys', text: 'Two bean-shaped organs that clean your blood. They take out waste and extra water, which becomes urine (pee). Excretory system.' },
  bladder: { name: 'Bladder', text: 'A stretchy bag that holds urine until you go to the bathroom. Excretory system.' },
  bones: { name: 'Bones (skeleton)', text: 'Your skeleton holds you up and helps you move. The skull guards your brain, and the ribs guard your heart and lungs. A grown-up has 206 bones. Skeletal system.' },
  roots: { name: 'Roots', text: 'They hold the plant in the soil and soak up water and minerals. All the roots together make the root system.' },
  stem: { name: 'Stem', text: 'Holds the leaves up to the sunlight. Tubes inside carry water up and food around. Part of the shoot system.' },
  leaves: { name: 'Leaves', text: 'The plant’s kitchen. They make food (sugar) from sunlight, water, and air. That’s photosynthesis! Part of the shoot system.' },
  fruit: { name: 'Fruit', text: 'Grows from a flower and holds the seeds. It gets its food from the leaves, through the phloem. Part of the shoot system.' },
  xylem: { name: 'Water tubes (xylem)', text: 'Tiny tubes that carry water and minerals up, from the roots to the stem and leaves.' },
  phloem: { name: 'Food tubes (phloem)', text: 'Tiny tubes that carry food from the leaves to every part that needs it: up to the fruit and flowers, and down to the roots.' },
};

const SYSTEMS = {
  human: [
    { key: 'all', label: '✨ All', line: 'All six systems at once! Each one has a job, and they all work together.' },
    { key: 'digestive', label: '🍎 Digestive', line: 'Digestive system: breaks food down so your body can use it.' },
    { key: 'circulatory', label: '❤️ Circulatory', line: 'Circulatory system: the heart pumps blood through blood vessels to every part of you.' },
    { key: 'respiratory', label: '🫁 Respiratory', line: 'Respiratory system: brings in air, so your blood can pick up oxygen.' },
    { key: 'skeletal', label: '🦴 Skeletal', line: 'Skeletal system: bones hold you up, protect your organs, and help you move.' },
    { key: 'excretory', label: '🫘 Excretory', line: 'Excretory system: the kidneys clean your blood and make urine (pee).' },
    { key: 'nervous', label: '🧠 Nervous', line: 'Nervous system: the brain and nerves send messages all over your body.' },
  ],
  plant: [
    { key: 'all', label: '✨ All', line: 'A whole plant: the root system and the shoot system, working as a team.' },
    { key: 'root', label: '🥕 Root system', line: 'Root system: holds the plant in the soil and soaks up water and minerals.' },
    { key: 'shoot', label: '🌿 Shoot system', line: 'Shoot system: the stem, leaves, flower, and fruit, above the ground.' },
  ],
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 0.3, 10);
camera.position.copy(CAMERA_HOME);

const explorer = createExplorer({
  topic: 'organsystems',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['bones', 'stem'], // taps through the ribs reach the heart and lungs
  greeting: 'This body is a team of organ systems! Pick a system, or tap an organ.',
  allPartsLine: 'All 19 parts! You know how a body and a plant are put together.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const sunLight = new THREE.DirectionalLight(0xfff2c0, 0);
sunLight.position.set(-4, 6, 3);
scene.add(sunLight);

// ---------- Materials ----------

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
const seeThrough = (color, opacity) => mat(color, { transparent: true, opacity, depthWrite: false });

const skin = seeThrough(0xffd5bd, 0.22);
const boneMat = mat(0xf3ead2);
const skullMat = seeThrough(0xf3ead2, 0.35);
const brainMat = mat(0xf7a8c0);
const nerveMat = mat(0xffd75e);
const airwayMat = mat(0xbfe3ff);
const lungMat = mat(0xff9fb0);
const heartMat = mat(0xe8445a);
const artery = seeThrough(0xe8445a, 0.5);
const vein = seeThrough(0x5b8def, 0.5);
const bloodMat = mat(0xd62839, { emissive: 0x5a0a12 });
const gutMat = mat(0xf6b48f);
const stomachMat = mat(0xf7a072);
const smallMat = mat(0xffb3a1);
const largeMat = mat(0xd98a6a);
const kidneyMat = mat(0xb5524c);
const ureterMat = mat(0xf5d36b);
const bladderMat = seeThrough(0xffe27a, 0.8);
const foodMat = mat(0xff4d4d);
const airMat = mat(0xe8f7ff, { emissive: 0x6fa8c8 });
const peeMat = mat(0xffe27a, { emissive: 0x6b5a10 });

const soilMat = seeThrough(0x7a5536, 0.45);
const rootMat = mat(0xb07a4a);
const stemMat = seeThrough(0x5e9e3a, 0.45);
const leafMat = mat(0x4cb050, { side: THREE.DoubleSide, emissive: 0x1d6b22, emissiveIntensity: 0 });
const leafVein = mat(0xb9e7a0);
const xylemMat = mat(0x5b8def);
const phloemMat = mat(0xff9f43);
const waterMat = mat(0x7fc4ff, { emissive: 0x1d4f8a });
const sugarMat = mat(0xffb35c, { emissive: 0x7a3d00 });
const fruitMat = mat(0xff5a5a);
const petalMat = mat(0xff9bb5);
const flowerMid = mat(0xffd75e);

// ---------- Helpers ----------

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const tube = (points, radius, material, closed = false) =>
  new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed), Math.max(16, points.length * 12), radius, 10, closed), material);

// Little things moving along a path: blood cells, air, water, food.
const flows = [];
function flow(parent, points, { count, material, radius, speed, orient = false, closed = false }) {
  const curve = new THREE.CatmullRomCurve3(points, closed);
  const geo = orient ? new THREE.CylinderGeometry(radius, radius, radius * 0.6, 10) : new THREE.SphereGeometry(radius, 10, 8);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  parent.add(mesh);
  const f = { curve, mesh, count, speed, orient, offset: Math.random() };
  flows.push(f);
  return f;
}

// ---------- The human body ----------

const human = new THREE.Group();
scene.add(human);

const systems = {};
for (const key of ['digestive', 'circulatory', 'respiratory', 'skeletal', 'excretory', 'nervous']) {
  systems[key] = new THREE.Group();
  human.add(systems[key]);
}

// The see-through skin, so every organ shows.
const body = new THREE.Group();
const capsule = (r, len, x, y, rz = 0) => {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 20), skin);
  mesh.position.set(x, y, 0);
  mesh.rotation.z = rz;
  return mesh;
};
const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 20), skin);
head.position.y = 2.75;
const torso = capsule(0.82, 1.8, 0, 0.7);
torso.scale.z = 0.62;
body.add(head, capsule(0.22, 0.3, 0, 2.1), torso,
  capsule(0.2, 2, -1.12, 0.75, -0.16), capsule(0.2, 2, 1.12, 0.75, 0.16),
  capsule(0.28, 2, -0.4, -2.1, 0.03), capsule(0.28, 2, 0.4, -2.1, -0.03));
body.children.forEach((c) => { c.renderOrder = 3; });
human.add(body);

// Nervous system: brain, spinal cord, and nerves out to the arms and legs.
const brain = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 20).scale(1.05, 0.8, 0.95), brainMat);
brain.position.set(0, 2.85, 0.02);
systems.nervous.add(tagPart(brain, 'brain'));
const nerves = new THREE.Group();
nerves.add(tube([v(0, 2.45, -0.36), v(0, 1.4, -0.42), v(0, 0, -0.4), v(0, -0.75, -0.32)], 0.055, nerveMat));
for (const s of [-1, 1]) {
  nerves.add(tube([v(0, 1.9, -0.38), v(s * 0.6, 1.85, -0.2), v(s * 1.12, 1.3, 0), v(s * 1.3, -0.25, 0)], 0.025, nerveMat));
  nerves.add(tube([v(0, -0.75, -0.32), v(s * 0.35, -1.2, -0.1), v(s * 0.42, -2.5, 0), v(s * 0.45, -3.2, 0.05)], 0.025, nerveMat));
}
systems.nervous.add(tagPart(nerves, 'nerves'));

// Respiratory system: windpipe and lungs.
const windpipe = new THREE.Group();
windpipe.add(tube([v(0, 2.4, 0.3), v(0, 2.1, 0.14), v(0, 1.85, 0.12), v(0, 1.6, 0.1)], 0.075, airwayMat));
for (const s of [-1, 1]) windpipe.add(tube([v(0, 1.6, 0.1), v(s * 0.15, 1.52, 0.07), v(s * 0.3, 1.42, 0.04)], 0.05, airwayMat));
systems.respiratory.add(tagPart(windpipe, 'windpipe'));
const lungs = new THREE.Group();
const lungPair = [-1, 1].map((s) => {
  const lung = new THREE.Mesh(new THREE.SphereGeometry(0.4, 28, 20).scale(0.9, 1.5, 0.75), lungMat);
  lung.position.set(s * 0.46, 1.2, 0);
  lungs.add(lung);
  return lung;
});
systems.respiratory.add(tagPart(lungs, 'lungs'));
const airFlows = [-1, 1].map((s) => flow(systems.respiratory,
  [v(0, 2.5, 0.4), v(0, 2.1, 0.14), v(0, 1.6, 0.1), v(s * 0.3, 1.42, 0.04), v(s * 0.46, 1.1, 0.05)],
  { count: 7, material: airMat, radius: 0.045, speed: 0.5 }));

// Circulatory system: the heart and loops of blood vessels.
function teardrop() {
  const geo = new THREE.SphereGeometry(1.1, 40, 28);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= 0) {
      pos.setXYZ(i, pos.getX(i), y * 0.85, pos.getZ(i) * 0.9);
      continue;
    }
    const taper = 1 + y / 1.25;
    pos.setXYZ(i, pos.getX(i) * taper, y * 1.55, pos.getZ(i) * taper * 0.9);
  }
  geo.computeVertexNormals();
  return geo;
}
const heart = new THREE.Group();
const lobe = new THREE.SphereGeometry(0.85, 28, 20);
for (const s of [-1, 1]) {
  const half = new THREE.Mesh(lobe, heartMat);
  half.position.set(s * 0.52, 0.35, 0);
  heart.add(half);
}
const tip = new THREE.Mesh(teardrop(), heartMat);
tip.position.y = -0.2;
heart.add(tip);
heart.position.set(0.14, 1.0, 0.3);
heart.rotation.z = -0.35;
heart.scale.setScalar(0.19);
systems.circulatory.add(tagPart(heart, 'heart'));

// Each loop: red going out from the heart, then blue coming back.
const vessels = new THREE.Group();
const bloodFlows = [];
function vesselLoop(points, cells) {
  const half = Math.floor(points.length / 2);
  vessels.add(tube(points.slice(0, half + 1), 0.04, artery));
  vessels.add(tube([...points.slice(half), points[0]], 0.04, vein));
  bloodFlows.push(flow(vessels, points, { count: cells, material: bloodMat, radius: 0.034, speed: 0.08, orient: true, closed: true }));
}
vesselLoop([v(0.2, 1.1, 0.32), v(0.26, 2.0, 0.22), v(0.18, 2.65, 0.15), v(0, 2.82, 0.15), v(-0.18, 2.65, 0.15), v(-0.25, 2.0, 0.22), v(-0.05, 1.1, 0.32)], 14);
for (const s of [-1, 1]) {
  vesselLoop([v(0.12, 0.95, 0.3), v(s * 0.28, -0.3, 0.25), v(s * 0.36, -1.6, 0.14), v(s * 0.4, -3.05, 0.1),
    v(s * 0.5, -2.9, 0.02), v(s * 0.46, -1.6, 0.05), v(s * 0.38, -0.3, 0.15), v(0.02, 0.92, 0.3)], 18);
  vesselLoop([v(0.15, 1.15, 0.3), v(s * 0.7, 1.75, 0.12), v(s * 1.15, 1.2, 0.06), v(s * 1.3, -0.15, 0.04),
    v(s * 1.38, -0.05, -0.06), v(s * 1.25, 1.2, -0.04), v(s * 0.75, 1.65, 0.02), v(0.05, 1.12, 0.28)], 14);
}
systems.circulatory.add(tagPart(vessels, 'vessels'));

// Digestive system: mouth → food pipe → stomach → small intestine → large intestine.
const MOUTH = v(0, 2.5, 0.48);
const pipePoints = [MOUTH, v(0, 2.2, 0.15), v(0.02, 1.7, -0.12), v(0.06, 1.1, -0.17), v(0.18, 0.72, -0.04), v(0.32, 0.52, 0.1)];
systems.digestive.add(tagPart(tube(pipePoints, 0.065, gutMat), 'foodPipe'));
const STOMACH = v(0.38, 0.4, 0.12);
const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20).scale(1.25, 0.85, 0.75), stomachMat);
stomach.position.copy(STOMACH);
stomach.rotation.z = 0.5;
systems.digestive.add(tagPart(stomach, 'stomach'));
const smallPoints = [v(0.12, 0.12, 0.16)];
for (let row = 0; row < 5; row++) {
  const y = -0.15 - row * 0.16;
  const [a, b] = row % 2 ? [0.4, -0.42] : [-0.42, 0.4];
  smallPoints.push(v(a * 0.5, y + 0.02, 0.24), v(a, y, 0.18), v(b, y - 0.03, 0.18));
}
smallPoints.push(v(-0.5, -0.86, 0.14));
systems.digestive.add(tagPart(tube(smallPoints, 0.065, smallMat), 'smallIntestine'));
const largePoints = [v(-0.5, -0.86, 0.14), v(-0.6, -0.5, 0.1), v(-0.6, -0.02, 0.1), v(0, 0.02, 0.2), v(0.6, -0.02, 0.1),
  v(0.62, -0.5, 0.1), v(0.45, -0.9, 0.06), v(0.12, -1.0, -0.04), v(0, -1.12, -0.14)];
systems.digestive.add(tagPart(tube(largePoints, 0.1, largeMat), 'largeIntestine'));
const food = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), foodMat);
food.visible = false;
systems.digestive.add(food);

// Excretory system: kidneys and their tubes, and the bladder.
const kidneys = new THREE.Group();
const ureters = [];
for (const s of [-1, 1]) {
  const kidney = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14).scale(0.75, 1.25, 0.6), kidneyMat);
  kidney.position.set(s * 0.4, 0.3, -0.3);
  kidney.rotation.z = s * 0.2;
  kidneys.add(kidney);
  const path = [v(s * 0.36, 0.12, -0.28), v(s * 0.3, -0.4, -0.12), v(s * 0.08, -0.92, 0.16)];
  kidneys.add(tube(path, 0.025, ureterMat));
  ureters.push(path);
}
systems.excretory.add(tagPart(kidneys, 'kidneys'));
const bladder = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), bladderMat);
bladder.position.set(0, -1.0, 0.24);
systems.excretory.add(tagPart(bladder, 'bladder'));
const peeFlows = ureters.map((path) => flow(systems.excretory, path, { count: 5, material: peeMat, radius: 0.03, speed: 0.6 }));

// Skeletal system.
const bones = new THREE.Group();
const skull = new THREE.Mesh(new THREE.SphereGeometry(0.58, 32, 20), skullMat);
skull.position.y = 2.78;
skull.renderOrder = 2;
bones.add(skull);
for (let y = 2.3; y > -0.8; y -= 0.13) {
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), boneMat);
  bone.position.set(0, y, -0.42);
  bones.add(bone);
}
for (let i = 0; i < 6; i++) {
  const y0 = 1.8 - i * 0.2;
  for (const s of [-1, 1]) {
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const t = -0.5 * Math.PI + (k / 10) * 0.88 * Math.PI;
      pts.push(v(s * (0.62 - i * 0.01) * Math.cos(t), y0 - 0.14 * (k / 10), 0.42 * Math.sin(t) - 0.05));
    }
    bones.add(tube(pts, 0.03, boneMat));
  }
}
for (const s of [-1, 1]) {
  bones.add(tube([v(s * 0.05, 2.0, 0.25), v(s * 0.45, 2.02, 0.12), v(s * 0.88, 1.92, 0)], 0.035, boneMat));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.9, 10), boneMat);
  arm.position.set(s * 1.12, 0.75, 0);
  arm.rotation.z = s * 0.16;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 10), boneMat);
  leg.position.set(s * 0.4, -2.1, 0);
  leg.rotation.z = -s * 0.03;
  bones.add(arm, leg);
}
const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 28).rotateX(Math.PI / 2 - 0.4), boneMat);
pelvis.scale.z = 0.6;
pelvis.position.y = -0.9;
bones.add(pelvis);
systems.skeletal.add(tagPart(bones, 'bones'));

const HUMAN_LABELS = {
  brain: ['nervous', [0, 3.45, 0]],
  nerves: ['nervous', [1.45, -0.3, 0]],
  windpipe: ['respiratory', [-0.6, 2.05, 0.2]],
  lungs: ['respiratory', [-0.8, 1.35, 0]],
  heart: ['circulatory', [0.5, 0.95, 0.4]],
  vessels: ['circulatory', [0.75, -1.8, 0.2]],
  foodPipe: ['digestive', [0.6, 2.05, 0.1]],
  stomach: ['digestive', [0.95, 0.5, 0.1]],
  smallIntestine: ['digestive', [-0.1, -0.45, 0.3]],
  largeIntestine: ['digestive', [-0.95, -0.3, 0.1]],
  kidneys: ['excretory', [0.85, 0.2, -0.3]],
  bladder: ['excretory', [0, -1.3, 0.35]],
  bones: ['skeletal', [-1.45, -0.2, 0]],
};
for (const [key, [system, spot]] of Object.entries(HUMAN_LABELS)) addLabel(key, systems[system], v(...spot));

// ---------- The plant ----------

const plant = new THREE.Group();
plant.visible = false;
scene.add(plant);
const rootSystem = new THREE.Group();
const shootSystem = new THREE.Group();
const plantFlows = new THREE.Group();
plant.add(rootSystem, shootSystem, plantFlows);

const GROUND = -1.3;
const soil = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.1, 40), soilMat);
soil.position.y = GROUND;
soil.renderOrder = 2;
plant.add(soil);

const roots = new THREE.Group();
roots.add(tube([v(0, GROUND, 0), v(0.03, -2.2, 0), v(-0.02, -3.3, 0)], 0.06, rootMat));
[[-1.7, 1, 1.0], [-2.2, -1, 0.9], [-2.7, 1, 0.7], [-1.9, -1, 0.6, 0.6], [-2.5, 1, 0.5, -0.6]].forEach(([y, s, len, z = 0]) => {
  roots.add(tube([v(0, y, 0), v(s * len * 0.5, y - 0.15, z * 0.5), v(s * len, y - 0.5, z)], 0.032, rootMat));
});
rootSystem.add(tagPart(roots, 'roots'));

const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 4.1, 16), stemMat);
stem.position.y = GROUND + 2.05;
stem.renderOrder = 2;
shootSystem.add(tagPart(stem, 'stem'));
shootSystem.add(tagPart(tube([v(-0.06, GROUND, 0), v(-0.06, 2.75, 0)], 0.04, xylemMat), 'xylem'));
shootSystem.add(tagPart(tube([v(0.06, GROUND, 0), v(0.06, 2.75, 0)], 0.04, phloemMat), 'phloem'));

function leafShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.9, 0.5, 1.1, 2.0, 0, 3.2);
  s.bezierCurveTo(-1.1, 2.0, -0.9, 0.5, 0, 0);
  return s;
}
const leafGeo = new THREE.ExtrudeGeometry(leafShape(), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2, curveSegments: 24 });
const leaves = new THREE.Group();
const LEAVES = [[-0.4, -1, 0.4], [0.35, 1, -0.3], [1.1, -1, -0.4], [1.85, 1, 0.35]].map(([y, side, turn]) => {
  const leaf = new THREE.Group();
  leaf.add(new THREE.Mesh(leafGeo, leafMat));
  leaf.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(v(0, -0.3, 0.07), v(0, 3, 0.07)), 4, 0.04, 6), leafVein));
  leaf.position.set(0, y, 0);
  leaf.rotation.set(0, turn, -side * 1.0);
  leaf.scale.setScalar(0.55);
  leaves.add(leaf);
  return { leaf, y, side };
});
shootSystem.add(tagPart(leaves, 'leaves'));

const fruit = new THREE.Group();
fruit.add(tube([v(0, 1.5, 0), v(0.08, 1.45, 0.3), v(0.12, 1.3, 0.52)], 0.03, mat(0x5e9e3a)));
const berry = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 16), fruitMat);
berry.position.set(0.12, 1.08, 0.56);
fruit.add(berry);
shootSystem.add(tagPart(fruit, 'fruit'));

const flower = new THREE.Group();
flower.position.y = 2.85;
flower.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), flowerMid));
for (let i = 0; i < 6; i++) {
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8).scale(1.8, 0.5, 1), petalMat);
  const a = (i / 6) * Math.PI * 2;
  petal.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
  petal.rotation.y = -a;
  flower.add(petal);
}
flower.rotation.x = 0.5;
shootSystem.add(flower);

// Water climbs from the roots to each leaf. Food goes from the leaves to the
// fruit and flower above, and down to the roots.
plant.updateMatrixWorld(true);
const onLeaf = (leaf, f) => leaf.localToWorld(v(0, f * 3.2, 0.12));
const waterFlows = [];
const foodFlows = [];
LEAVES.forEach(({ leaf, y }) => {
  waterFlows.push(flow(plantFlows, [v(-0.06, -3.2, 0.03), v(-0.06, GROUND, 0.03), v(-0.06, y, 0.03), onLeaf(leaf, 0.35), onLeaf(leaf, 0.8)],
    { count: 9, material: waterMat, radius: 0.045, speed: 0.12 }));
  foodFlows.push(flow(plantFlows, [onLeaf(leaf, 0.8), onLeaf(leaf, 0.35), v(0.06, y, 0.03), v(0.06, GROUND, 0.03), v(0.06, -3.1, 0.03)],
    { count: 7, material: sugarMat, radius: 0.05, speed: 0.1 }));
});
for (const { leaf, y } of [LEAVES[0], LEAVES[1]]) {
  foodFlows.push(flow(plantFlows, [onLeaf(leaf, 0.75), onLeaf(leaf, 0.3), v(0.06, y, 0.03), v(0.06, 1.5, 0.03), v(0.1, 1.42, 0.3), v(0.12, 1.12, 0.56)],
    { count: 6, material: sugarMat, radius: 0.05, speed: 0.12 }));
}
foodFlows.push(flow(plantFlows, [onLeaf(LEAVES[3].leaf, 0.75), onLeaf(LEAVES[3].leaf, 0.3), v(0.06, 1.85, 0.03), v(0.06, 2.8, 0.03)],
  { count: 5, material: sugarMat, radius: 0.05, speed: 0.14 }));

const PLANT_LABELS = {
  roots: [rootSystem, [1.25, -2.4, 0]],
  stem: [shootSystem, [-0.55, -0.85, 0]],
  xylem: [shootSystem, [-0.75, 2.4, 0]],
  phloem: [shootSystem, [0.75, 2.3, 0]],
  leaves: [shootSystem, onLeaf(LEAVES[2].leaf, 0.9).toArray()],
  fruit: [shootSystem, [0.55, 0.75, 0.6]],
};
for (const [key, [parent, spot]] of Object.entries(PLANT_LABELS)) addLabel(key, parent, v(...spot));

// ---------- State ----------

const state = {
  chain: 'human', system: 'all', pace: 2, beat: 0, breath: 0,
  deep: 0, // seconds left in a deep breath
  bladder: 0, bladderTarget: 0, drinking: 0,
  trip: null, // { stage, t } while an apple goes through
  water: false, sun: false, wet: 0, waterTime: 0, foodTime: 0,
};
const seenSystems = new Set(['all']);
const levelCard = document.getElementById('level-card');

const bpm = (pace = state.pace) => 60 + pace * 10;
const breaths = (pace = state.pace) => 12 + Math.round(pace * 2.8);

// ---------- Systems ----------

const systemsEl = document.getElementById('systems');

function renderSystems() {
  systemsEl.replaceChildren(...SYSTEMS[state.chain].map(({ key, label }) => {
    const b = document.createElement('button');
    b.className = 'btn press';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(key === state.system));
    b.addEventListener('click', () => {
      setSystem(key);
      onSystem(key);
    });
    return b;
  }));
}

function setSystem(key) {
  state.system = key;
  if (state.chain === 'human') {
    for (const [name, group] of Object.entries(systems)) group.visible = key === 'all' || key === name;
  } else {
    rootSystem.visible = key !== 'shoot';
    shootSystem.visible = key !== 'root';
    plantFlows.visible = key === 'all';
  }
  [...systemsEl.children].forEach((b, i) => b.setAttribute('aria-pressed', String(SYSTEMS[state.chain][i].key === key)));
  levelCard.textContent = SYSTEMS[state.chain].find((s) => s.key === key).line;
  explorer.showLabels();
}

function onSystem(key) {
  const line = SYSTEMS[state.chain].find((s) => s.key === key).line;
  const first = !seenSystems.has(`${state.chain}-${key}`);
  seenSystems.add(`${state.chain}-${key}`);
  cello.say(line, { mood: first ? 'wow' : 'happy', ms: 4500, important: false });
}

// Show the system an action needs, unless everything is already showing.
function focus(key) {
  if (state.system !== 'all' && state.system !== key) setSystem(key);
}

function setChain(chain) {
  state.chain = chain;
  human.visible = chain === 'human';
  plant.visible = chain === 'plant';
  document.querySelectorAll('[data-chain]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chain === chain)));
  document.getElementById('human-tools').hidden = chain !== 'human';
  document.getElementById('plant-tools').hidden = chain !== 'plant';
  endTrip();
  renderSystems();
  setSystem('all');
}

document.querySelectorAll('[data-chain]').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.chain === state.chain) return;
    setChain(b.dataset.chain);
    cello.say(state.chain === 'plant'
      ? 'Plants have organ systems too! Try watering the soil.'
      : 'Back to the body. Try eating an apple!', { ms: 4000 });
  });
});

// ---------- Eat an apple ----------

const TRIP = [
  { curve: new THREE.CatmullRomCurve3(pipePoints.concat([STOMACH])), time: 2.5, line: 'Chomp! Your teeth crush the apple. Then the food pipe squeezes it down.' },
  { curve: null, time: 3, line: 'In the stomach, strong juices churn the food into mush.' },
  { curve: new THREE.CatmullRomCurve3([STOMACH, ...smallPoints]), time: 5.5, line: 'In the small intestine, the goodness soaks into your blood.' },
  { curve: new THREE.CatmullRomCurve3(largePoints), time: 3.5, line: 'The large intestine soaks up water. What’s left leaves the body as poop!' },
];
const appleRed = new THREE.Color(0xff4d4d);
const mushy = new THREE.Color(0xc9a46a);

document.getElementById('eat').addEventListener('click', () => {
  if (state.chain !== 'human') return;
  focus('digestive');
  state.trip = { stage: 0, t: 0 };
  food.visible = true;
  food.scale.setScalar(1);
  foodMat.color.copy(appleRed);
  tripStage();
});

function tripStage() {
  const { line } = TRIP[state.trip.stage];
  levelCard.textContent = `${state.trip.stage + 1} of 4 · ${line}`;
  cello.say(line, { ms: 4500 });
}

function endTrip() {
  state.trip = null;
  food.visible = false;
  stomach.scale.setScalar(1);
}

function moveFood(dt) {
  const trip = state.trip;
  if (!trip) return;
  const step = TRIP[trip.stage];
  trip.t = Math.min(1, trip.t + dt / step.time);
  if (step.curve) step.curve.getPointAt(trip.t, food.position);
  if (trip.stage === 1) {
    // Churn: the stomach squeezes and the food wobbles inside.
    const churn = Math.sin(trip.t * Math.PI * 8);
    stomach.scale.setScalar(1 + churn * 0.05);
    food.position.copy(STOMACH).add(v(Math.sin(trip.t * 20) * 0.1, Math.cos(trip.t * 15) * 0.06, 0));
    foodMat.color.copy(appleRed).lerp(mushy, trip.t);
  }
  if (trip.stage === 2) food.scale.setScalar(1 - trip.t * 0.45);
  if (trip.t < 1) return;
  trip.stage += 1;
  trip.t = 0;
  stomach.scale.setScalar(1);
  if (trip.stage < TRIP.length) {
    tripStage();
    return;
  }
  endTrip();
  levelCard.textContent = 'Done! Your body used the goodness from the apple for energy and growing.';
  if (complete('eat')) cello.say('All the way through! Mouth, food pipe, stomach, small intestine, and large intestine. That’s the digestive system.', { mood: 'wow', ms: 6500 });
}

// ---------- Breathe and run ----------

document.getElementById('breathe').addEventListener('click', () => {
  if (state.chain !== 'human') return;
  focus('respiratory');
  state.deep = 4;
  levelCard.textContent = 'Breathe in… the lungs fill with air. Breathe out… the air goes back out.';
  if (complete('breathe')) cello.say('Whoosh! Your lungs puff up as they fill with air, and the oxygen goes into your blood.', { mood: 'wow', ms: 5000 });
  else cello.say('Breathe in… and out.', { ms: 3000, important: false });
});

const paceText = (pace) => `❤️ ${bpm(pace)} · 🌬️ ${breaths(pace)} a minute`;
bindSlider('pace', paceText, (value) => {
  state.pace = value;
  if (value >= 9 && complete('run')) {
    cello.say('Running! Your muscles need more oxygen. So you breathe faster, and your heart pumps faster. Two systems, one team!', { mood: 'wow', ms: 6500 });
  }
});

// ---------- Drink water ----------

const drinkButton = document.getElementById('drink');
let drinks = 0;
drinkButton.addEventListener('click', () => {
  if (state.chain !== 'human') return;
  focus('excretory');
  if (state.bladderTarget >= 1) {
    state.bladderTarget = 0;
    drinkButton.textContent = '🚰 Drink water';
    levelCard.textContent = 'Empty again. Your kidneys keep cleaning your blood all day long.';
    cello.say('Ahh, all better! The bladder is empty again.', { ms: 3500 });
    return;
  }
  drinks += 1;
  state.drinking = 2.2;
  state.bladderTarget = Math.min(1, state.bladderTarget + 0.34);
  levelCard.textContent = 'The kidneys clean your blood. Waste and extra water trickle down to the bladder.';
  if (state.bladderTarget >= 1) {
    drinkButton.textContent = '🚽 Bathroom break';
    if (complete('kidneys')) cello.say('The bladder is full! Time for a bathroom break. That’s the excretory system at work.', { mood: 'wow', ms: 5500 });
    else cello.say('Full! Time for a bathroom break.', { ms: 3000 });
  } else if (drinks === 1) {
    cello.say('Glug, glug! Watch the kidneys send urine down to the bladder.', { ms: 4000 });
  }
});

// ---------- Water and sunshine ----------

bindToggle('water', (on) => {
  state.water = on;
  if (state.system !== 'all') setSystem('all');
  cello.say(on ? 'Splash! The roots soak up the water. Watch it climb.' : 'No more water. The leaves will start to droop.', { ms: 3500 });
});
bindToggle('sun', (on) => {
  state.sun = on;
  if (state.system !== 'all') setSystem('all');
  if (on && !state.water) cello.say('Sunny! But leaves need water to make food too. Try watering the soil!', { ms: 4500 });
  else if (on) cello.say('Sunshine! The leaves start making food.', { ms: 3000 });
});

// ---------- Look ----------

document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

const THEME_COLORS = {
  dark: { skin: 0xffd5bd },
  light: { skin: 0xe7a27c },
};
window.elixTheme.watch((theme) => {
  skin.color.set(THEME_COLORS[theme].skin);
});

// ---------- Every frame ----------

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const one = new THREE.Vector3(1, 1, 1);
const p = new THREE.Vector3();
const tangent = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function moveFlow(f, dt, visible) {
  f.mesh.visible = visible;
  if (!visible) return;
  f.offset = (((f.offset + dt * f.speed) % 1) + 1) % 1;
  for (let i = 0; i < f.count; i++) {
    const t = (i / f.count + f.offset) % 1;
    f.curve.getPointAt(t, p);
    if (f.orient) {
      f.curve.getTangentAt(t, tangent);
      m.compose(p, q.setFromUnitVectors(up, tangent), one);
    } else {
      m.makeTranslation(p.x, p.y, p.z);
    }
    f.mesh.setMatrixAt(i, m);
  }
  f.mesh.instanceMatrix.needsUpdate = true;
}

stage.onFrame((dt) => {
  if (state.chain === 'human') {
    // Heartbeat: a quick squeeze, then a rest. Blood flows faster with it.
    state.beat += dt * (bpm() / 60) * Math.PI * 2;
    const squeeze = Math.pow(Math.max(0, Math.sin(state.beat)), 6);
    heart.scale.setScalar(0.19 * (1 + squeeze * 0.12));
    bloodFlows.forEach((f) => { f.speed = (bpm() / 60) * 0.07; moveFlow(f, dt, true); });

    // Breathing all the time, plus one big deep breath on demand.
    state.breath += dt * (breaths() / 60) * Math.PI * 2;
    let fill = 0.5 + 0.5 * Math.sin(state.breath);
    let size = 0.06 + state.pace * 0.006;
    if (state.deep > 0) {
      state.deep = Math.max(0, state.deep - dt);
      fill = Math.sin(((4 - state.deep) / 4) * Math.PI);
      size = 0.3;
    }
    lungPair.forEach((lung) => lung.scale.set(1 + fill * size, 1 + fill * size * 0.6, 1 + fill * size));
    const inhaling = state.deep > 2;
    airFlows.forEach((f) => { f.speed = inhaling ? 0.5 : -0.5; moveFlow(f, dt, state.deep > 0); });

    // Kidneys trickle into the bladder.
    state.drinking = Math.max(0, state.drinking - dt);
    peeFlows.forEach((f) => moveFlow(f, dt, state.drinking > 0));
    state.bladder += (state.bladderTarget - state.bladder) * (1 - Math.exp(-dt * 2));
    bladder.scale.setScalar(1 + state.bladder * 0.9);

    moveFood(dt);
  } else {
    // Water climbs while the soil is wet; leaves droop without it.
    state.wet += ((state.water ? 1 : 0) - state.wet) * (1 - Math.exp(-dt * 0.8));
    waterFlows.forEach((f) => moveFlow(f, dt, state.water));
    LEAVES.forEach(({ leaf, side }) => { leaf.rotation.z = -side * (1.0 + (1 - state.wet) * 0.45); });
    const making = state.water && state.sun;
    foodFlows.forEach((f) => moveFlow(f, dt, making));
    sunLight.intensity = state.sun ? 2.5 : 0;
    leafMat.emissiveIntensity += ((making ? 0.45 : 0) - leafMat.emissiveIntensity) * (1 - Math.exp(-dt * 2));

    if (state.water) {
      state.waterTime += dt;
      if (state.waterTime > 2.5 && complete('water')) {
        cello.say('Up, up, up! The xylem carries water from the roots all the way to the leaves.', { mood: 'wow', ms: 5500 });
      }
    }
    if (making) {
      state.foodTime += dt;
      if (state.foodTime > 3 && complete('food')) {
        levelCard.textContent = 'Photosynthesis! Leaves make food from sunlight, water, and air. The phloem carries it everywhere.';
        cello.say('The leaves are making food! The phloem carries it up to the fruit and flower, and down to the roots.', { mood: 'wow', ms: 6500 });
      }
    }
  }
});

// ---------- Start ----------

setChain('human');
