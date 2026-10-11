import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// A school microscope to take apart by tapping, a look through its eyepiece
// at four slides, and a timeline of how the microscope was invented.
// The view through the eyepiece is drawn in 2D, measured in micrometers (µm):
// a thousand of them make one millimeter.

const PARTS = {
  eyepiece: { name: 'Eyepiece (ocular lens)', text: 'You look in here. Its lens makes things 10 times bigger.' },
  tube: { name: 'Body tube', text: 'Holds the two lenses just the right distance apart.' },
  objectives: { name: 'Objective lenses', text: 'Three lenses: 4×, 10×, and 40×. Turn the wheel they hang from (the nosepiece) to pick one.' },
  stage: { name: 'Stage', text: 'The flat table for the slide. Light shines up through the hole in the middle.' },
  clips: { name: 'Stage clips', text: 'Hold the slide still, so the picture doesn’t slide away.' },
  coarse: { name: 'Coarse focus knob', text: 'The big knob. It moves the tube a lot, to find the picture. Use it first, with the smallest lens.' },
  fine: { name: 'Fine focus knob', text: 'The small knob. It moves just a tiny bit, to make the picture sharp. You need it most with the 40× lens.' },
  arm: { name: 'Arm', text: 'Carry the microscope by its arm, with your other hand under the base.' },
  base: { name: 'Base', text: 'The heavy foot that keeps the microscope steady.' },
  mirror: { name: 'Mirror', text: 'Catches light and bounces it up through the slide. Some microscopes have a little lamp instead.' },
  slide: { name: 'Slide', text: 'A thin strip of glass. What you look at is cut very thin, so light can shine through it.' },
};

// How the microscope was invented. "size" is how small it could see, on the
// scale's rungs: 0 a hair, 1 a cell, 2 bacteria, 3 viruses, 4 atoms.
// Light can't show anything past LIGHT_LIMIT, between bacteria and viruses.
const TIMELINE = [
  { year: 'About 1286', who: 'Eyeglasses', size: 0, sees: 'Things as small as a hair', text: 'People in Italy made the first eyeglasses. They shaped glass into curved pieces called lenses. Lens makers got better and better, and that led to the microscope.' },
  { year: 'About 1590', who: 'The Janssens', size: 0.5, sees: 'A flea, up close', text: 'Hans and Zacharias Janssen made eyeglasses in the Netherlands. They are said to have put two lenses in a tube. Two lenses make things look bigger than one. That’s a compound microscope!' },
  { year: '1625', who: 'It gets a name', size: 0.6, sees: 'Tiny bugs, up close', text: 'Galileo made a microscope too. His friend Giovanni Faber named it a “microscope”, from two Greek words that mean “small” and “look”.' },
  { year: '1665', who: 'Robert Hooke', size: 1, sees: 'Cells!', text: 'Robert Hooke lit up his microscope with a lamp and a glass ball full of water. In a thin slice of cork he saw tiny empty boxes, and called them “cells”. He drew them in a famous book, Micrographia.', slide: 'cork' },
  { year: '1674', who: 'Antonie van Leeuwenhoek', size: 2, sees: 'Bacteria, just barely', text: 'Antonie van Leeuwenhoek made tiny microscopes with just one lens each, smaller than a pea. They made things about 270 times bigger, better than any other microscope of his time! He saw living things swimming in pond water, and later even bacteria.', slide: 'pond' },
  { year: '1830', who: 'Joseph Jackson Lister', size: 2, sees: 'Bacteria, now nice and sharp', text: 'Old lenses gave everything blurry, rainbow-colored edges. Joseph Jackson Lister found how to put lenses together so the picture came out sharp. Now scientists could see what was inside cells.', slide: 'onion' },
  { year: '1870s', who: 'Abbe and Zeiss', size: 2.5, sees: 'The smallest bacteria. That’s as small as light can go!', text: 'Ernst Abbe used math to design better lenses, and Carl Zeiss built them in his workshop. One lens even dips into a drop of oil, for a clearer view. Abbe also found that light has a limit. It can’t show things much smaller than the smallest bacteria.' },
  { year: '1931', who: 'Ruska and Knoll', size: 3, sees: 'Viruses, far smaller than bacteria', text: 'Ernst Ruska and Max Knoll built the first electron microscope. It uses tiny particles called electrons instead of light, so it gets past light’s limit. By 1933 it beat the best light microscope. Later ones showed viruses.' },
  { year: '1981', who: 'Binnig and Rohrer', size: 4, sees: 'Single atoms!', text: 'Gerd Binnig and Heinrich Rohrer built a microscope with no lenses at all! A needle with a super-sharp tip moves just above a surface, so close it can sense each bump. It showed single atoms, the tiny bits everything is made of.' },
  { year: '2017', who: 'Freeze and snap', size: 3.5, sees: 'The shapes of the tiny machines inside cells', text: 'Jacques Dubochet, Joachim Frank, and Richard Henderson won the Nobel Prize for cryo-electron microscopes, some of the most powerful today. Tiny parts of cells are frozen so fast that the water turns to glass, not ice. The microscope snaps thousands of pictures, and a computer puts them together in 3D.' },
  { year: 'Today', who: 'You!', size: 2, sees: 'Cells, and bacteria as tiny specks', text: 'A school microscope has two lenses: 10\u00a0×\u00a040 makes things 400 times bigger. That’s plenty to see cells, and even bacteria as tiny specks. Big labs use electron microscopes that can see atoms.', slide: 'cheek' },
];
const LIGHT_LIMIT = 2.5;

// Across the round view, in µm, for each objective (with the 10× eyepiece).
const FIELD = { 4: 4500, 10: 1800, 40: 450 };
// The best focus moves a little with each lens, so the 40× needs the fine knob.
const FOCUS_SHIFT = { 4: 0, 10: 0.8, 40: 1.4 };
// How fast it blurs as you turn away from the best focus. Stronger lenses are fussier.
const BLUR_RATE = { 4: 0.5, 10: 1, 40: 4 };

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(3.6, 3.6, 6.6);
const TARGET_HOME = new THREE.Vector3(0, 2, 0);
camera.position.copy(CAMERA_HOME);
controls.target.copy(TARGET_HOME);

const explorer = createExplorer({
  topic: 'microscope',
  parts: PARTS,
  stage,
  stageEl,
  skins: [],
  greeting: 'This is a microscope! Tap a part to learn its name, or press Look through.',
  allPartsLine: 'All 11 parts! You could set up a microscope in a real lab.',
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Materials ----------

// Each part gets its own material, so a tapped part glows on its own.
const paint = () => new THREE.MeshStandardMaterial({ color: 0x7c6cf0, roughness: 0.45 });
const knob = () => new THREE.MeshStandardMaterial({ color: 0x2b333c, roughness: 0.6 });
const chrome = () => new THREE.MeshStandardMaterial({ color: 0xdfe6ec, metalness: 0.6, roughness: 0.25 });
const glass = new THREE.MeshStandardMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false });
const sampleMat = new THREE.MeshStandardMaterial({ color: 0xb98b5a, roughness: 0.8 });
const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.3, depthWrite: false });

// ---------- The microscope ----------

const scope = new THREE.Group();
scene.add(scope);

const AXIS_Z = 0.2; // the light goes straight up through here

const base = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.3, 2, 4, 0.1), paint());
base.position.set(0, 0.15, 0.1);
scope.add(tagPart(base, 'base'));

const armCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.25, -0.62),
  new THREE.Vector3(0, 1.0, -0.82),
  new THREE.Vector3(0, 1.9, -0.86),
  new THREE.Vector3(0, 2.7, -0.72),
  new THREE.Vector3(0, 3.2, -0.42),
]);
const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 40, 0.17, 14), paint());
scope.add(tagPart(arm, 'arm'));

// The stage: a flat plate with a hole for the light.
const plate = new THREE.Shape();
const W = 0.9, D = 0.8, R = 0.12;
plate.moveTo(-W + R, -D);
plate.lineTo(W - R, -D); plate.quadraticCurveTo(W, -D, W, -D + R);
plate.lineTo(W, D - R); plate.quadraticCurveTo(W, D, W - R, D);
plate.lineTo(-W + R, D); plate.quadraticCurveTo(-W, D, -W, D - R);
plate.lineTo(-W, -D + R); plate.quadraticCurveTo(-W, -D, -W + R, -D);
const hole = new THREE.Path();
hole.absarc(0, 0, 0.13, 0, Math.PI * 2, true);
plate.holes.push(hole);
const stageGroup = new THREE.Group();
const stagePlate = new THREE.Mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.1, bevelEnabled: false }).rotateX(-Math.PI / 2), knob());
stagePlate.position.set(0, 1.5, AXIS_Z);
stageGroup.add(stagePlate);
const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), paint());
bracket.position.set(0, 1.53, -0.72);
stageGroup.add(bracket);
scope.add(tagPart(stageGroup, 'stage'));

const slide = new THREE.Group();
const slideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.025, 0.42), glass);
slideGlass.renderOrder = 2;
slide.add(slideGlass);
const sample = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.006, 32), sampleMat);
sample.position.y = 0.016;
slide.add(sample);
slide.position.set(0, 1.613, AXIS_Z);
scope.add(tagPart(slide, 'slide'));

const clips = new THREE.Group();
for (const x of [-0.5, 0.5]) {
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.55), chrome());
  clip.position.set(x, 1.64, AXIS_Z - 0.05);
  clip.rotation.y = x * 0.3;
  clips.add(clip);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), knob());
  pin.position.set(x, 1.64, AXIS_Z - 0.32);
  clips.add(pin);
}
scope.add(tagPart(clips, 'clips'));

// The mirror swings to catch the light, or away from it.
const mirror = new THREE.Group();
const fork = new THREE.Group();
for (const x of [-0.38, 0.38]) {
  const prong = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.08), chrome());
  prong.position.set(x, 0.55, AXIS_Z);
  fork.add(prong);
}
mirror.add(fork);
const tilt = new THREE.Group();
tilt.position.set(0, 0.78, AXIS_Z);
const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.07, 32), knob());
tilt.add(rim);
const glassFace = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 32), new THREE.MeshStandardMaterial({ color: 0xeaf6ff, metalness: 0.9, roughness: 0.08 }));
glassFace.position.y = 0.04;
tilt.add(glassFace);
mirror.add(tilt);
scope.add(tagPart(mirror, 'mirror'));

const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.24, 0.66, 24, 1, true), beamMat);
beam.position.set(0, 1.16, AXIS_Z);
scope.add(beam);

// The head moves up and down as you focus: tube, eyepiece, nosepiece, and lenses.
const head = new THREE.Group();
scope.add(head);

const tube = new THREE.Group();
const tubeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.2, 28), paint());
tubeBody.position.set(0, 2.95, AXIS_Z);
tube.add(tubeBody);
const collar = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.55, 0.5, 3, 0.06), paint());
collar.position.set(0, 3.0, -0.12);
tube.add(collar);
head.add(tagPart(tube, 'tube'));

const eyepiece = new THREE.Group();
const ocular = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 24), chrome());
ocular.position.set(0, 3.77, AXIS_Z);
eyepiece.add(ocular);
const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.08, 24), knob());
cup.position.set(0, 4.02, AXIS_Z);
eyepiece.add(cup);
head.add(tagPart(eyepiece, 'eyepiece'));

// The nosepiece turns around its own center, behind the light path, so the
// chosen lens swings to the front, right over the hole.
const NOSE_Y = 2.3;
const nose = new THREE.Group();
nose.position.set(0, NOSE_Y, AXIS_Z - 0.22);
const noseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.14, 32), chrome());
nose.add(noseDisc);
const LENSES = [
  { power: 4, length: 0.3, band: 0xff5a5a },
  { power: 10, length: 0.4, band: 0xffd23f },
  { power: 40, length: 0.52, band: 0x4aa8ff },
];
LENSES.forEach((lens, i) => {
  const angle = (i * Math.PI * 2) / 3;
  const g = new THREE.Group();
  g.position.set(Math.sin(angle) * 0.22, -0.07, Math.cos(angle) * 0.22);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, lens.length, 20), chrome());
  barrel.position.y = -lens.length / 2;
  g.add(barrel);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.05, 20), new THREE.MeshStandardMaterial({ color: lens.band, roughness: 0.4 }));
  band.position.y = -lens.length * 0.45;
  g.add(band);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16), knob());
  tip.position.y = -lens.length - 0.02;
  g.add(tip);
  lens.angle = angle;
  nose.add(g);
});
head.add(tagPart(nose, 'objectives'));

// Focus knobs on both sides of the arm.
const coarseKnobs = new THREE.Group();
const fineKnobs = new THREE.Group();
for (const side of [-1, 1]) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20).rotateZ(Math.PI / 2), knob());
  c.position.set(side * 0.24, 1.1, -0.82);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.6), chrome());
  c.add(ridge);
  coarseKnobs.add(c);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 16).rotateZ(Math.PI / 2), knob());
  f.position.set(side * 0.35, 1.1, -0.82);
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.32), chrome());
  f.add(fridge);
  fineKnobs.add(f);
}
scope.add(tagPart(coarseKnobs, 'coarse'));
scope.add(tagPart(fineKnobs, 'fine'));

addLabel('eyepiece', scope, new THREE.Vector3(0, 4.25, AXIS_Z));
addLabel('tube', scope, new THREE.Vector3(-0.75, 3.1, AXIS_Z));
addLabel('objectives', scope, new THREE.Vector3(-0.85, 2.0, AXIS_Z));
addLabel('stage', scope, new THREE.Vector3(-1.15, 1.5, AXIS_Z));
addLabel('clips', scope, new THREE.Vector3(0.8, 1.95, AXIS_Z + 0.2));
addLabel('slide', scope, new THREE.Vector3(0, 1.65, AXIS_Z + 0.45));
addLabel('coarse', scope, new THREE.Vector3(1.0, 1.22, -0.82));
addLabel('fine', scope, new THREE.Vector3(1.2, 0.88, -0.82));
addLabel('arm', scope, new THREE.Vector3(0, 2.6, -1.15));
addLabel('base', scope, new THREE.Vector3(0, 0.15, 1.2));
addLabel('mirror', scope, new THREE.Vector3(0.8, 0.8, AXIS_Z + 0.2));

// ---------- What's on each slide (drawn in µm) ----------

// A repeatable random number for any grid square, so the slide never changes.
function hash(i, j, k = 0) {
  const x = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

function gridRange(v, size, pad = 1) {
  return [Math.floor(v.x0 / size) - pad, Math.ceil(v.x1 / size) + pad];
}

// Cork: rows of empty little boxes. Only the walls are left; the cells are dead.
function drawCork(ctx, v) {
  const CW = 38, CH = 26;
  const point = (i, j) => [i * CW + (hash(i, j, 1) - 0.5) * 12, j * CH + (hash(i, j, 2) - 0.5) * 8];
  const [i0, i1] = gridRange(v, CW);
  const [j0, j1] = [Math.floor(v.y0 / CH) - 1, Math.ceil(v.y1 / CH) + 1];
  // A few cells look darker, as in a real photo.
  ctx.fillStyle = 'rgba(160, 110, 60, 0.18)';
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      if (hash(i, j, 3) > 0.8) {
        ctx.beginPath();
        ctx.moveTo(...point(i, j)); ctx.lineTo(...point(i + 1, j)); ctx.lineTo(...point(i + 1, j + 1)); ctx.lineTo(...point(i, j + 1));
        ctx.fill();
      }
    }
  }
  ctx.beginPath();
  for (let j = j0; j <= j1; j++) {
    ctx.moveTo(...point(i0, j));
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(...point(i, j));
  }
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j < j1; j++) {
      ctx.moveTo(...point(i, j));
      ctx.lineTo(...point(i, j + 1));
    }
  }
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = Math.max(3.5, 1 / v.s);
  ctx.stroke();
}

// Onion skin: long brick-shaped cells, stained pink, each with a nucleus.
function drawOnion(ctx, v) {
  const CW = 230, CH = 62;
  const [j0, j1] = [Math.floor(v.y0 / CH) - 1, Math.ceil(v.y1 / CH) + 1];
  const wall = Math.max(4, 1 / v.s);
  const walls = new Path2D();
  const nuclei = new Path2D();
  for (let j = j0; j < j1; j++) {
    const y = j * CH;
    const shift = hash(j, 7) * CW;
    walls.moveTo(v.x0 - CW, y);
    walls.lineTo(v.x1 + CW, y);
    const [i0, i1] = [Math.floor((v.x0 - shift) / CW) - 1, Math.ceil((v.x1 - shift) / CW) + 1];
    for (let i = i0; i < i1; i++) {
      const x = shift + i * CW + (hash(i, j, 4) - 0.5) * 70;
      walls.moveTo(x, y);
      walls.lineTo(x + (hash(i, j, 5) - 0.5) * 10, y + CH);
      const nx = x + 40 + hash(i, j, 6) * (CW - 110);
      const ny = y + 18 + hash(i, j, 8) * (CH - 36);
      nuclei.ellipse(nx, ny, 11, 8, 0, 0, Math.PI * 2);
      nuclei.closePath();
    }
  }
  ctx.strokeStyle = '#b3346e';
  ctx.lineWidth = wall;
  ctx.stroke(walls);
  ctx.fillStyle = '#8e1f58';
  ctx.fill(nuclei);
}

// Cheek cells: flat, roundish, no walls, stained blue, each with a nucleus.
function drawCheek(ctx, v) {
  const G = 95;
  const [i0, i1] = gridRange(v, G);
  const [j0, j1] = [Math.floor(v.y0 / G) - 1, Math.ceil(v.y1 / G) + 1];
  const line = Math.max(1.5, 1 / v.s);
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      if (hash(i, j, 9) > 0.42) continue;
      const cx = i * G + hash(i, j, 10) * 60;
      const cy = j * G + hash(i, j, 11) * 60;
      const r = 26 + hash(i, j, 12) * 14;
      ctx.beginPath();
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + hash(i, j, 13);
        const rr = r * (0.75 + 0.35 * hash(i, j, 20 + k));
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(110, 150, 230, 0.28)';
      ctx.fill();
      ctx.strokeStyle = '#5476c9';
      ctx.lineWidth = line;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + (hash(i, j, 14) - 0.5) * 10, cy + (hash(i, j, 15) - 0.5) * 10, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2c4a9e';
      ctx.fill();
    }
  }
}

// Pond water: swimmers, crawlers, green algae, and bacteria (only seen at 400×).
const POND = 1600; // the drop is about this wide, in µm
const wrap = (x) => ((((x + POND / 2) % POND) + POND) % POND) - POND / 2;
const swimmers = [
  ...[0, 1, 2].map((n) => ({ kind: 'paramecium', x: (hash(n, 1) - 0.5) * POND, y: (hash(n, 2) - 0.5) * POND, heading: hash(n, 3) * 6.28, speed: 70, turn: 0 })),
  ...[0, 1].map((n) => ({ kind: 'amoeba', x: (hash(n, 4) - 0.5) * 900, y: (hash(n, 5) - 0.5) * 900, heading: hash(n, 6) * 6.28, speed: 8, turn: 0 })),
];
// Start one Paramecium near the middle, so it's easy to find.
swimmers[0].x = 60;
swimmers[0].y = -30;
const algae = [0, 1, 2, 3, 4].map((n) => ({ x: (hash(n, 30) - 0.5) * POND, y: (hash(n, 31) - 0.5) * POND, a: hash(n, 32) * 6.28, cells: 8 + Math.floor(hash(n, 33) * 8) }));

function movePond(dt) {
  for (const s of swimmers) {
    s.turn += (Math.random() - 0.5) * dt * 2;
    s.turn *= 0.98;
    s.heading += s.turn * dt;
    s.x = wrap(s.x + Math.cos(s.heading) * s.speed * dt);
    s.y = wrap(s.y + Math.sin(s.heading) * s.speed * dt);
  }
}

function drawPond(ctx, v, t) {
  const line = Math.max(2, 1 / v.s);
  // The edge of the drop, seen with the weaker lenses.
  ctx.beginPath();
  ctx.arc(0, 0, 1150, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(90, 140, 120, 0.35)';
  ctx.lineWidth = Math.max(10, 1 / v.s);
  ctx.stroke();

  for (const a of algae) {
    for (let k = 0; k < a.cells; k++) {
      const x = a.x + Math.cos(a.a + Math.sin(k * 0.6) * 0.3) * k * 19;
      const y = a.y + Math.sin(a.a + Math.sin(k * 0.6) * 0.3) * k * 19;
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 8, a.a, 0, Math.PI * 2);
      ctx.fillStyle = '#4fae4f';
      ctx.fill();
      ctx.strokeStyle = '#2e7a35';
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }

  // Bacteria are only 1 or 2 µm long, so they only show up at 400×.
  if (v.s > 0.6) {
    ctx.fillStyle = '#4c5a3c';
    for (let n = 0; n < 900; n++) {
      const x = wrap((hash(n, 40) - 0.5) * POND + Math.sin(t * 2.3 + n) * 2);
      const y = wrap((hash(n, 41) - 0.5) * POND + Math.cos(t * 1.9 + n * 1.3) * 2);
      if (x < v.x0 || x > v.x1 || y < v.y0 || y > v.y1) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(hash(n, 42) * 6.28 + t * 0.3);
      ctx.fillRect(-1.6, -0.6, 3.2, 1.2);
      ctx.restore();
    }
  }

  for (const s of swimmers) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.heading);
    if (s.kind === 'paramecium') drawParamecium(ctx, t, line);
    else drawAmoeba(ctx, t + s.x, line);
    ctx.restore();
  }
}

function drawParamecium(ctx, t, line) {
  // A slipper, about 220 µm long, with a groove on one side.
  const body = new Path2D();
  body.moveTo(110, 0);
  body.bezierCurveTo(110, 34, 30, 32, -20, 26);
  body.bezierCurveTo(-80, 22, -110, 18, -110, 0);
  body.bezierCurveTo(-110, -22, -60, -30, 0, -24);
  body.bezierCurveTo(20, -14, 50, -12, 70, -22);
  body.bezierCurveTo(100, -30, 110, -20, 110, 0);
  // Beating cilia all around the edge.
  ctx.strokeStyle = 'rgba(60, 120, 80, 0.6)';
  ctx.lineWidth = line * 0.6;
  ctx.beginPath();
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2;
    const x = Math.cos(a) * 112;
    const y = Math.sin(a) * 30;
    const wave = Math.sin(t * 12 - k * 0.5) * 0.5;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a + wave) * 9, y + Math.sin(a + wave) * 9);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(140, 200, 160, 0.6)';
  ctx.fill(body);
  ctx.strokeStyle = '#3c7a52';
  ctx.lineWidth = line;
  ctx.stroke(body);
  ctx.beginPath();
  ctx.ellipse(-10, 4, 26, 12, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(110, 80, 170, 0.55)';
  ctx.fill();
}

function drawAmoeba(ctx, t, line) {
  // A blob about 300 µm across, always changing shape.
  ctx.beginPath();
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const r = 120 + 30 * Math.sin(3 * a + t * 0.7) + 22 * Math.sin(5 * a - t * 0.5) + 40 * Math.pow(Math.max(0, Math.cos(a)), 6);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(175, 155, 225, 0.45)';
  ctx.fill();
  ctx.strokeStyle = '#6a52b0';
  ctx.lineWidth = line;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-20, 10, 18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200, 80, 130, 0.6)';
  ctx.fill();
}

const SLIDES = {
  cork: { name: 'cork', focus: 61.1, tint: 0xb98b5a, bg: '#f6ecd9', draw: drawCork },
  onion: { name: 'onion skin', focus: 46.1, tint: 0xe68bb0, bg: '#fbe3ec', draw: drawOnion },
  cheek: { name: 'cheek cells', focus: 54.1, tint: 0x8fb4ff, bg: '#eef3fb', draw: drawCheek },
  pond: { name: 'pond water', focus: 38.1, tint: 0x9fdc9a, bg: '#eef7e8', draw: drawPond },
};

// ---------- Looking through the eyepiece ----------

const state = { slide: 'cork', power: 4, coarse: 20, fine: 0, light: true, looking: false, time: 0, pan: { x: 0, y: 0 } };
const viewEl = document.getElementById('view');
const lensEl = document.getElementById('lens');
const canvas = document.getElementById('view-canvas');
const ctx = canvas.getContext('2d');
const hintEl = document.getElementById('hint');
const magEl = document.getElementById('mag');
let dirty = true;
let lensSize = 300;

function sizeLens() {
  const { clientWidth: w, clientHeight: h } = stageEl;
  lensSize = Math.round(Math.min(w, h) * 0.84);
  lensEl.style.width = lensEl.style.height = `${lensSize}px`;
  const px = Math.round(lensSize * Math.min(window.devicePixelRatio, 2));
  canvas.width = canvas.height = px;
  dirty = true;
  updateBlur();
}
new ResizeObserver(sizeLens).observe(stageEl);

function focusError() {
  return state.coarse + state.fine - (SLIDES[state.slide].focus + FOCUS_SHIFT[state.power]);
}

// Blur in pixels, for a lens about 500 pixels across.
function blurAmount() {
  return Math.min(Math.abs(focusError()) * BLUR_RATE[state.power], 14);
}

const isSharp = () => blurAmount() < 1.2;

function updateBlur() {
  canvas.style.filter = `blur(${(blurAmount() * lensSize) / 500}px)`;
}

function draw() {
  const size = canvas.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!state.light) {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, size, size);
    return;
  }
  const slideInfo = SLIDES[state.slide];
  ctx.fillStyle = slideInfo.bg;
  ctx.fillRect(0, 0, size, size);
  const field = FIELD[state.power];
  const s = size / field; // pixels per µm
  ctx.setTransform(s, 0, 0, s, size / 2 - state.pan.x * s, size / 2 - state.pan.y * s);
  const half = field / 2;
  slideInfo.draw(ctx, { x0: state.pan.x - half, x1: state.pan.x + half, y0: state.pan.y - half, y1: state.pan.y + half, s }, state.time);
}

// Drag the picture to move the slide around.
let drag = null;
lensEl.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  lensEl.setPointerCapture(e.pointerId);
});
lensEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const perPixel = FIELD[state.power] / lensSize;
  state.pan.x = THREE.MathUtils.clamp(state.pan.x - (e.clientX - drag.x) * perPixel, -1400, 1400);
  state.pan.y = THREE.MathUtils.clamp(state.pan.y - (e.clientY - drag.y) * perPixel, -1400, 1400);
  drag = { x: e.clientX, y: e.clientY };
  dirty = true;
});
lensEl.addEventListener('pointerup', () => { drag = null; checkView(); });
lensEl.addEventListener('pointercancel', () => { drag = null; });

// Is a swimmer or crawler in the round view right now?
function swimmerInView() {
  const r = FIELD[state.power] / 2;
  return swimmers.find((s) => Math.hypot(s.x - state.pan.x, s.y - state.pan.y) < r * 0.85);
}

// ---------- Cello reacts to what's in view ----------

const SHARP_LINES = {
  cork: 'Those empty little boxes are what Robert Hooke saw in 1665. He called them cells!',
  onion: 'Each long brick is one onion cell. The dark dot inside is its nucleus.',
  cheek: 'These come from inside a cheek! No hard walls, so they’re roundish and floppy.',
  pond: 'Look closely. Some of those things are moving!',
};
let lastSaid = '';
function sayOnce(key, text, options) {
  if (lastSaid === key) return;
  lastSaid = key;
  cello.say(text, options);
}

function checkView() {
  if (!state.looking) return;
  if (!state.light) {
    sayOnce('dark', 'It’s dark in there! Turn the light on.', { mood: 'sad' });
    return;
  }
  if (!isSharp()) {
    if (state.power === 40 && Math.abs(focusError()) < 3) {
      sayOnce('fine', 'So close! Strong lenses need the fine focus knob.', { ms: 4000 });
    } else if (blurAmount() > 6) {
      sayOnce('blurry', 'All blurry! Turn the coarse focus knob slowly.', { ms: 4000 });
    }
    return;
  }
  let first = complete('sharp');
  if (state.slide === 'cork') first = complete('cork') || first;
  if (state.power === 40) first = complete('zoom') || first;
  const swimmer = state.slide === 'pond' ? swimmerInView() : null;
  if (swimmer && state.power >= 10) first = complete('pond') || first;

  if (state.slide === 'pond' && state.power === 40 && !swimmer) {
    sayOnce('bacteria', 'See the tiny dark specks wiggling? Those are bacteria!', { mood: 'wow', ms: 5000 });
  } else if (swimmer) {
    const name = swimmer.kind === 'paramecium' ? 'a Paramecium, swimming with its hairs' : 'an Amoeba, crawling along';
    sayOnce(`swim-${swimmer.kind}`, `You found ${name}!`, { mood: 'wow', ms: 4500 });
  } else if (state.power === 40 && first) {
    sayOnce('zoom', 'Sharp at 400 times bigger! Great focusing.', { mood: 'wow' });
  } else {
    sayOnce(`sharp-${state.slide}`, SHARP_LINES[state.slide], { mood: first ? 'wow' : 'happy', ms: 5000 });
  }
}

function updateReadouts() {
  magEl.textContent = `${10 * state.power}×`;
  const text = isSharp() ? 'Sharp! ✨' : blurAmount() < 4 ? 'Almost…' : 'Blurry';
  document.getElementById('coarse-out').textContent = text;
  document.getElementById('fine-out').textContent = '';
  hintEl.textContent = state.looking
    ? `Looking at ${SLIDES[state.slide].name} · Drag to move the slide`
    : 'Tap a part to learn about it · Press Look through to peek';
}

// ---------- Controls ----------

function setLooking(on) {
  state.looking = on;
  viewEl.hidden = !on;
  document.getElementById('look').setAttribute('aria-pressed', String(on));
  document.getElementById('look').textContent = on ? '🔬 Back to the microscope' : '👁️ Look through';
  document.getElementById('info').hidden = true;
  dirty = true;
  updateReadouts();
  if (on) {
    lastSaid = '';
    checkView();
  }
}

document.getElementById('look').addEventListener('click', () => setLooking(!state.looking));

bindToggle('light', (on) => {
  state.light = on;
  dirty = true;
  if (!on && !state.looking) cello.say('The mirror swung away. No light can reach the slide now.', { ms: 3500 });
  if (on) lastSaid = '';
  checkView();
});

function setSlide(key) {
  state.slide = key;
  state.pan = { x: 0, y: 0 };
  sampleMat.color.set(SLIDES[key].tint);
  document.querySelectorAll('[data-slide]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.slide === key)));
  dirty = true;
  lastSaid = '';
  updateBlur();
  updateReadouts();
}

document.querySelectorAll('[data-slide]').forEach((b) => {
  b.addEventListener('click', () => {
    setSlide(b.dataset.slide);
    if (state.looking) checkView();
    else cello.say(`A slide of ${SLIDES[b.dataset.slide].name}! Press Look through to see it.`, { ms: 3000 });
  });
});

const noseTarget = { angle: 0 };
function setPower(power) {
  state.power = power;
  const lens = LENSES.find((l) => l.power === power);
  noseTarget.angle = -lens.angle;
  document.querySelectorAll('[data-obj]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.obj) === power)));
  dirty = true;
  lastSaid = '';
  updateBlur();
  updateReadouts();
}

document.querySelectorAll('[data-obj]').forEach((b) => {
  b.addEventListener('click', () => {
    setPower(Number(b.dataset.obj));
    if (state.looking) checkView();
    else cello.say(`10 × ${state.power} = ${10 * state.power} times bigger!`, { ms: 2500 });
  });
});

function onFocus() {
  updateBlur();
  updateReadouts();
  checkView();
}
bindSlider('coarse', () => '', (value) => { state.coarse = value; onFocus(); });
bindSlider('fine', () => '', (value) => { state.fine = value; onFocus(); });

document.getElementById('reset').addEventListener('click', () => {
  if (state.looking) setLooking(false);
  controls.target.copy(TARGET_HOME);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Timeline ----------

const listEl = document.getElementById('timeline');
const seen = new Set();
const tlCard = document.getElementById('tl-card');
const tlLook = document.getElementById('tl-look');
let tlSlide = null;

TIMELINE.forEach((stop, i) => {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.className = 'btn press';
  b.setAttribute('aria-pressed', 'false');
  b.innerHTML = `<span class="year"></span><span></span>`;
  b.firstChild.textContent = stop.year;
  b.lastChild.textContent = stop.who;
  b.addEventListener('click', () => showStop(i));
  li.append(b);
  listEl.append(li);
});

// Where a size sits along the scale: the middle of each of the five rungs.
const scalePercent = (size) => ((size + 0.5) / 5) * 100;
document.getElementById('tl-limit').style.left = `${scalePercent(LIGHT_LIMIT)}%`;
document.getElementById('tl-limit-name').style.left = `${scalePercent(LIGHT_LIMIT)}%`;

let current = -1;
function showStop(i) {
  const stop = TIMELINE[i];
  const passedLight = current >= 0 && TIMELINE[current].size <= LIGHT_LIMIT && stop.size > LIGHT_LIMIT;
  current = i;
  [...listEl.querySelectorAll('.btn')].forEach((b, k) => {
    b.setAttribute('aria-pressed', String(k === i));
    if (k === i) b.classList.add('seen');
  });
  tlCard.hidden = false;
  document.getElementById('tl-text').textContent = stop.text;
  document.getElementById('tl-sees').textContent = stop.sees;
  document.getElementById('tl-marker').style.left = `${scalePercent(stop.size)}%`;
  document.getElementById('tl-prev').disabled = i === 0;
  document.getElementById('tl-next').disabled = i === TIMELINE.length - 1;
  tlSlide = stop.slide ?? null;
  tlLook.hidden = !tlSlide;
  if (tlSlide) tlLook.textContent = `👁️ Look at ${SLIDES[tlSlide].name}`;
  seen.add(i);
  document.getElementById('timeline-count').textContent = `(${seen.size} of ${TIMELINE.length})`;
  if (seen.size === TIMELINE.length && complete('timeline')) {
    cello.say('You walked the whole timeline, from eyeglasses to today’s frozen snapshots!', { mood: 'wow', ms: 5500 });
  } else if (passedLight) {
    cello.say('Whoa, past light’s limit! Now we can see even smaller things.', { mood: 'wow', ms: 4500 });
  }
}

document.getElementById('tl-prev').addEventListener('click', () => showStop(Math.max(current - 1, 0)));
document.getElementById('tl-next').addEventListener('click', () => showStop(Math.min(current + 1, TIMELINE.length - 1)));

tlLook.addEventListener('click', () => {
  setSlide(tlSlide);
  if (!state.looking) setLooking(true);
  else checkView();
});

// ---------- Every frame ----------

const knobSpin = { coarse: 0, fine: 0 };
stage.onFrame((dt) => {
  state.time += dt;
  if (state.slide === 'pond') {
    movePond(dt);
    if (state.looking) dirty = true;
  }
});

// Moving parts follow the controls even while paused.
const clockFree = new THREE.Clock();
function follow() {
  const dt = Math.min(clockFree.getDelta(), 0.05);
  const k = 1 - Math.exp(-dt * 10);
  // Turning the knobs down lowers the tube toward the slide.
  const y = 0.42 - (state.coarse + state.fine) * 0.0042;
  head.position.y += (y - head.position.y) * k;
  knobSpin.coarse += (state.coarse * 0.12 - knobSpin.coarse) * k;
  knobSpin.fine += (state.fine * 1.5 - knobSpin.fine) * k;
  coarseKnobs.children.forEach((c) => { c.rotation.x = knobSpin.coarse; });
  fineKnobs.children.forEach((f) => { f.rotation.x = knobSpin.fine; });
  nose.rotation.y += (noseTarget.angle - nose.rotation.y) * k;
  tilt.rotation.x += ((state.light ? 0.55 : -1.1) - tilt.rotation.x) * k;
  beam.visible = state.light;
  if (dirty && state.looking) {
    draw();
    dirty = false;
  }
  requestAnimationFrame(follow);
}

// ---------- Start ----------

setSlide('cork');
setPower(4);
updateReadouts();
requestAnimationFrame(follow);
