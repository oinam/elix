import * as THREE from 'three';
import { createStage, makeLabel } from './scene.js';
import { createExplorer, bindSlider } from './explorer.js';

// Light meets matter. A flashlight shines at a block in front of a wall:
// clear glass lets the light through, wax paper lets some through and blurs
// it, and wood stops it and leaves a shadow. A mirror bounces a beam at the
// same angle it comes in; aim it to hit a star. A straw in a glass of water
// looks broken at the water line, because light bends (refracts) as it
// leaves the water; pour the water out and it's straight again.

const PARTS = {
  flashlight: { name: 'Flashlight', text: 'It sends light out in a straight line. Light keeps going straight until something bounces or bends it.' },
  block: { name: 'The thing in the way', text: 'Clear glass is transparent: light goes through. Wax paper is translucent: some light gets through, all blurry. Wood is opaque: no light gets through.' },
  shadow: { name: 'Shadow', text: 'A dark patch where light can’t reach, because something opaque is in the way.' },
  mirror: { name: 'Mirror', text: 'A very smooth, shiny surface. Light bounces off it at the same angle it comes in. That’s reflection.' },
  beam: { name: 'Light beam', text: 'The path the light takes. It goes in straight lines between bounces.' },
  straw: { name: 'Straw', text: 'The straw is perfectly straight. It only looks broken because light from the part under water bends when it comes out into the air.' },
  water: { name: 'Water', text: 'Light slows down in water. When it comes out into air, it speeds up and changes direction. That bending is called refraction.' },
  star: { name: 'Target star', text: 'Aim the flashlight so the beam bounces off the mirror and hits this star.' },
};

const VIEWS = {
  through: { camera: [-1.8, 1.8, 8], target: [0.6, 0, 0], line: 'Pick something to put in front of the flashlight. What happens on the wall?' },
  mirror: { camera: [0, 0.6, 9], target: [0, 0.4, 0], line: 'Aim the flashlight. Where does the light bounce?' },
  straw: { camera: [0, 0.4, 6], target: [0, 0, 0], line: 'Look at the straw in the water. Is it really broken?' },
};

const BLOCKS = {
  glass: { light: 1, blur: 0, shadow: 0, line: 'Clear glass is transparent. Almost all the light goes through!' },
  paper: { light: 0.45, blur: 1, shadow: 0, line: 'Wax paper is translucent. Some light gets through, but it’s spread out and blurry.' },
  wood: { light: 0, blur: 0, shadow: 1, line: 'Wood is opaque. No light gets through, so it makes a shadow!' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'lightmatter',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['water'],
  greeting: 'Light can go through things, bounce off them, or bend. Let’s test all three!',
  allPartsLine: 'All 8 parts! You know what light does when it meets things.',
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const caseMat = mat(0x3a3f48);
const lensMat = basic(0xfff3a0);
const beamMat = basic(0xfff3a0, { transparent: true, opacity: 0.55, depthWrite: false });

function flashlight() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 16).rotateZ(Math.PI / 2), caseMat);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.3, 16).rotateZ(Math.PI / 2), caseMat);
  head.position.x = 0.62;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.26, 20).rotateY(Math.PI / 2), lensMat);
  lens.position.x = 0.78;
  g.add(body, head, lens);
  return g;
}

function beamBetween(a, b, width = 0.08) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, 1, 10), beamMat);
  placeBeam(mesh, a, b);
  return mesh;
}
function placeBeam(mesh, a, b) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, a.distanceTo(b), 1);
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
}

// ---------- View 1: through, or not? ----------

const throughView = new THREE.Group();
scene.add(throughView);
const torch1 = flashlight();
torch1.position.set(-3.5, 0, 0);
throughView.add(tagPart(torch1, 'flashlight'));
const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 4), mat(0xf4f0e8));
wall.position.set(3.2, 0, 0);
throughView.add(wall);
const glassMat = mat(0xdff3ff, { transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
const paperMat = mat(0xfaf5e6, { transparent: true, opacity: 0.75 });
const woodMat = mat(0xa8744a);
const block = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 1.4), glassMat);
block.position.set(0, 0, 0);
throughView.add(tagPart(block, 'block'));
// The beam before the block, after it, and the spot and shadow on the wall.
const beamIn = beamBetween(v(-2.7, 0, 0), v(-0.1, 0, 0), 0.25);
const beamOut = beamBetween(v(0.1, 0, 0), v(3.1, 0, 0), 0.25);
throughView.add(beamIn, beamOut);
const spot = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40).rotateY(-Math.PI / 2), basic(0xfff3a0, { transparent: true }));
spot.position.set(3.09, 0, 0);
throughView.add(spot);
const glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40).rotateY(-Math.PI / 2), basic(0xfff3a0, { transparent: true, opacity: 0 }));
glow.position.set(3.07, 0, 0);
throughView.add(glow);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateY(-Math.PI / 2), basic(0x2a2a30, { transparent: true, opacity: 0.85 }));
shadow.position.set(3.01, 0, 0);
shadow.visible = false;
throughView.add(tagPart(shadow, 'shadow'));
const lightAround = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.3, 40).rotateY(-Math.PI / 2), basic(0xfff3a0, { transparent: true, opacity: 0.6 }));
lightAround.position.set(3.05, 0, 0);
lightAround.visible = false;
throughView.add(lightAround);
addLabel('flashlight', torch1, v(0, 0.55, 0), { hideWith: throughView });
addLabel('block', block, v(0, 1.0, 0), { hideWith: throughView });
addLabel('shadow', shadow, v(0, 1.2, 0), { hideWith: shadow });

// ---------- View 2: mirror ----------

const mirrorView = new THREE.Group();
mirrorView.visible = false;
scene.add(mirrorView);
const MIRROR_X = 2.5;
const TORCH = v(-3.6, -1.0, 0);
const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 1.6), mat(0xe8eef5, { metalness: 0.3, roughness: 0.1, emissive: 0x3a4a5a }));
mirror.position.set(MIRROR_X + 0.06, 0.4, 0);
mirrorView.add(tagPart(mirror, 'mirror'));
const torch2 = flashlight();
torch2.position.copy(TORCH);
mirrorView.add(tagPart(torch2, 'flashlight'));
const inBeam = beamBetween(TORCH, v(MIRROR_X, 0, 0), 0.06);
const outBeam = beamBetween(v(MIRROR_X, 0, 0), v(-3, 1, 0), 0.06);
mirrorView.add(tagPart(inBeam, 'beam'), tagPart(outBeam, 'beam'));
const normal = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 0.02), basic(0x5b8def));
mirrorView.add(normal);
const STAR = v(-2.6, 2.2, 0);
const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), mat(0xffd75e, { emissive: 0x6a5000 }));
star.position.copy(STAR);
mirrorView.add(tagPart(star, 'star'));
const angleTag = makeLabel('');
mirrorView.add(angleTag);
addLabel('mirror', mirror, v(0, 2.6, 0), { hideWith: mirrorView });
addLabel('beam', mirrorView, v(-1.4, -1.25, 0), { hideWith: mirrorView });
addLabel('star', star, v(0, 0.5, 0), { hideWith: mirrorView });

// ---------- View 3: straw in water ----------

const strawView = new THREE.Group();
strawView.visible = false;
scene.add(strawView);
const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.85, 2.6, 40, 1, true), mat(0xdff3ff, { transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
strawView.add(cup);
const LEVEL = 0.4; // water surface height
const water = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 0.86, LEVEL + 1.25, 40), mat(0x6fb6ff, { transparent: true, opacity: 0.35, depthWrite: false }));
water.position.y = (LEVEL - 1.25) / 2;
strawView.add(tagPart(water, 'water'));
const strawMat = mat(0xff5a7a);
// The straw leans across the glass. Above the water we see it where it is;
// below, light bends at the surface, so we see that part shifted.
const TOP = v(-0.9, 1.9, 0.3);
const AT_SURFACE = v(-0.15, LEVEL, 0.3);
const BOTTOM = v(0.45, -1.1, 0.3);
const strawUp = beamBetween(TOP, AT_SURFACE, 0.06);
strawUp.material = strawMat;
const strawDown = beamBetween(AT_SURFACE, BOTTOM, 0.06);
strawDown.material = strawMat;
strawView.add(tagPart(strawUp, 'straw'), tagPart(strawDown, 'straw'));
const BENT_BOTTOM = v(0.15, -1.1, 0.3);
const BENT_START = AT_SURFACE.clone().add(v(0.18, 0, 0));
// Ray sketch: from the straw tip under water, up to the surface, bending, to your eye.
const rays = new THREE.Group();
rays.visible = false;
const rayMat = basic(0xffd75e);
// Snell's law: going from water into air, the ray tilts farther from
// straight up (sin of the air angle = 1.33 × sin of the water angle).
// A ray from partway down the straw, up to the surface, sideways where you can see it bend.
const FROM = AT_SURFACE.clone().lerp(BOTTOM, 0.5);
const SURF = v(0.85, LEVEL, 0.3);
const inWater = SURF.clone().sub(FROM);
const across = v(inWater.x, 0, inWater.z).normalize();
const waterAngle = Math.atan2(Math.hypot(inWater.x, inWater.z), inWater.y);
const airAngle = Math.asin(Math.min(1, 1.33 * Math.sin(waterAngle)));
const toEye = across.clone().multiplyScalar(Math.sin(airAngle)).add(v(0, Math.cos(airAngle), 0));
const EYE = SURF.clone().add(toEye.clone().multiplyScalar(1.6));
rays.add(beamBetween(FROM, SURF, 0.02), beamBetween(SURF, EYE, 0.02));
rays.children.forEach((r) => { r.material = rayMat; });
// Your eye traces the light straight back, so it sees the tip somewhere else.
const dashed = beamBetween(SURF, SURF.clone().sub(toEye.clone().multiplyScalar(inWater.y / Math.cos(airAngle))), 0.015);
dashed.material = basic(0xffffff, { transparent: true, opacity: 0.6 });
rays.add(dashed);
const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat(0xffffff));
eye.position.copy(EYE);
rays.add(eye);
strawView.add(rays);
addLabel('straw', strawView, v(-1.3, 1.6, 0.3), { hideWith: strawView });
addLabel('water', strawView, v(1.3, -0.6, 0.3), { hideWith: water });

// ---------- Controls ----------

const state = { view: 'through', block: 'glass', aim: 0, water: true };
const levelCard = document.getElementById('level-card');
const TOOLS = { through: 'through-tools', mirror: 'mirror-tools', straw: 'straw-tools' };

function aimCamera() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setView(key) {
  state.view = key;
  throughView.visible = key === 'through';
  mirrorView.visible = key === 'mirror';
  strawView.visible = key === 'straw';
  Object.entries(TOOLS).forEach(([k, id]) => {
    const el = document.getElementById(id);
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

function setBlock(key) {
  state.block = key;
  const b = BLOCKS[key];
  block.material = key === 'glass' ? glassMat : key === 'paper' ? paperMat : woodMat;
  beamOut.visible = b.light > 0;
  beamOut.material = b.blur ? beamMat.clone() : beamMat;
  if (b.blur) beamOut.material.opacity = 0.25;
  spot.visible = b.light > 0 && !b.blur;
  glow.material.opacity = b.blur ? 0.45 : 0;
  shadow.visible = b.shadow > 0;
  lightAround.visible = b.shadow > 0;
  document.querySelectorAll('[data-block]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.block === key)));
  explorer.showLabels();
}

document.querySelectorAll('[data-block]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.block;
  setBlock(key);
  levelCard.textContent = BLOCKS[key].line;
  if (complete(key)) cello.say(BLOCKS[key].line, { mood: 'wow', ms: 4500 });
  else cello.say(BLOCKS[key].line, { ms: 4000, important: false });
}));

// Aim: the beam hits the mirror and bounces back at the same angle.
function updateMirror() {
  const a = THREE.MathUtils.degToRad(state.aim);
  const hit = v(MIRROR_X, TORCH.y + (MIRROR_X - TORCH.x) * Math.tan(a), 0);
  torch2.rotation.z = a;
  placeBeam(inBeam, TORCH.clone().add(v(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0)), hit);
  const out = v(-Math.cos(a), Math.sin(a), 0);
  const end = hit.clone().add(out.clone().multiplyScalar(6.5));
  placeBeam(outBeam, hit, end);
  normal.position.set(MIRROR_X - 1.2, hit.y, 0);
  angleTag.position.copy(hit).add(v(-1.3, 0.35, 0));
  angleTag.element.textContent = `In ${Math.abs(state.aim)}°, out ${Math.abs(state.aim)}°`;
  // Did the bounce hit the star? Distance from the star to the outgoing line.
  const toStar = STAR.clone().sub(hit);
  const along = toStar.dot(out);
  const miss = toStar.clone().sub(out.clone().multiplyScalar(along)).length();
  const hitStar = along > 0 && miss < 0.35;
  star.material.emissive.setHex(hitStar ? 0xffaa00 : 0x6a5000);
  if (hitStar && complete('mirror')) {
    levelCard.textContent = `The light hit the mirror at ${Math.abs(state.aim)}° and bounced off at ${Math.abs(state.aim)}°. Same angle in and out!`;
    cello.say('Bullseye! The light bounced off the mirror at the same angle it came in.', { mood: 'wow', ms: 5000 });
  }
}
bindSlider('aim', (value) => `${value}°`, (value) => {
  state.aim = value;
  updateMirror();
});

function showStraw() {
  water.visible = state.water;
  if (state.water) {
    placeBeam(strawDown, BENT_START, BENT_BOTTOM);
  } else {
    placeBeam(strawDown, AT_SURFACE, BOTTOM);
  }
  rays.visible = state.water && document.getElementById('rays').getAttribute('aria-pressed') === 'true';
  explorer.showLabels();
}

document.getElementById('water').addEventListener('click', (e) => {
  state.water = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(state.water));
  showStraw();
  if (!state.water) {
    levelCard.textContent = 'No water: the straw looks straight. It was never really broken!';
    if (complete('straw')) cello.say('See? Straight! The water bent the light, and that made the straw look broken.', { mood: 'wow', ms: 5500 });
  } else {
    levelCard.textContent = 'Water back in. The light bends at the surface, so the straw looks broken again.';
  }
});

document.getElementById('rays').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  showStraw();
  if (on) levelCard.textContent = 'Light from the straw bends at the water’s surface on its way to your eye. Your eye thinks it came in a straight line (dotted), so the straw looks moved.';
});

document.getElementById('reset').addEventListener('click', aimCamera);

setBlock('glass');
updateMirror();
showStraw();
setView('through');
