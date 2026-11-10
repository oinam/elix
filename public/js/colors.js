import * as THREE from 'three';
import { shaped } from './organs.js';
import { createStage } from './scene.js';
import { createExplorer } from './explorer.js';

// Colors of light. A prism fans white light out into a rainbow, and a second,
// upside-down prism mixes it back into white. Fruit under colored light: a
// red apple reflects only red, so under green or blue light it looks black.
// Three colored lamps on a dark wall: red and green make yellow, and all
// three make white.

const PARTS = {
  beam: { name: 'White light', text: 'Sunlight or a flashlight beam. It looks white, but it’s really every color mixed together.' },
  prism: { name: 'Prism', text: 'A block of glass shaped like a triangle. It bends light, and bends each color a different amount, so they spread apart.' },
  rainbow: { name: 'Spectrum', text: 'All the colors of white light, spread out: red, orange, yellow, green, blue, indigo, and violet. Red bends the least; violet bends the most.' },
  apple: { name: 'Red apple', text: 'It reflects red light and soaks up (absorbs) all the other colors. So it looks red, but only if there’s red light to reflect!' },
  banana: { name: 'Banana', text: 'It reflects red and green light, and our eyes see that mix as yellow.' },
  leaf: { name: 'Green leaf', text: 'It reflects green light and absorbs the rest. Under red light it looks almost black.' },
  lamp: { name: 'Colored lamp', text: 'It gives off just one color of light. Shine colored lights together and they add up to new colors.' },
  wall: { name: 'Where lights mix', text: 'Where lights overlap, their colors add: red + green = yellow, green + blue = cyan, red + blue = magenta, and all three = white!' },
};

const VIEWS = {
  prism: { camera: [0, 0.6, 9], target: [0, 0, 0], line: 'White light goes in, a rainbow comes out!' },
  fruit: { camera: [0, 1.6, 6.5], target: [0, 0.2, 0], line: 'Change the light color. What happens to the fruit?' },
  mix: { camera: [0, 0.4, 8], target: [0, 0.2, 0], line: 'Turn on colored lamps, and watch where their light overlaps.' },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const explorer = createExplorer({
  topic: 'colors',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['prism'],
  greeting: 'White light has a secret: it’s every color mixed together! Let’s split it with a prism.',
  allPartsLine: 'All 8 parts! You know where colors come from.',
  onPart: (key) => {
    if (key === 'rainbow' && explorer.complete('rainbow')) {
      explorer.cello.say('Red, orange, yellow, green, blue, indigo, violet! All hiding inside white light.', { mood: 'wow', ms: 5500 });
    }
  },
});
const { addLabel, tagPart, complete, cello } = explorer;

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const RAINBOW = [0xff2a2a, 0xff8a1a, 0xffe03a, 0x3ad040, 0x3a7aff, 0x4b2ab8, 0x9b3ae8];
const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...extra });

// A straight beam of light between two points.
function beam(a, b, color, width = 0.05) {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(width, width, len, 8), basic(color, { transparent: true, opacity: 0.9 }));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

// ---------- View 1: prism ----------

const prismView = new THREE.Group();
scene.add(prismView);
const glass = mat(0xdff3ff, { transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false });
const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 3).rotateX(Math.PI / 2), glass);
prism.position.set(-1, 0, 0);
prism.rotation.z = Math.PI; // point up, like a real prism on a table
prismView.add(tagPart(prism, 'prism'));
// The beam enters the left face, crosses the glass, and leaves by the right face.
prismView.add(tagPart(beam(v(-5, -1.0, 0), v(-1.39, -0.23, 0), 0xffffff, 0.07), 'beam'));
prismView.add(beam(v(-1.39, -0.23, 0), v(-0.61, -0.23, 0), 0xffffff, 0.05));

const SCREEN_X = 4.2;
const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.4, 1.6), mat(0xf4f0e8));
screen.position.set(SCREEN_X + 0.05, 0, 0);
prismView.add(screen);

// One-prism rays fan out to the screen; two-prism rays come back together.
const fan = new THREE.Group();
const spots = new THREE.Group();
const OUT = v(-0.61, -0.23, 0);
RAINBOW.forEach((c, i) => {
  const end = v(SCREEN_X, 0.2 - i * 0.32, 0);
  fan.add(beam(OUT, end, c, 0.035));
  const spot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.9), basic(c));
  spot.position.set(SCREEN_X - 0.01, end.y, 0);
  spots.add(spot);
});
prismView.add(fan, tagPart(spots, 'rainbow'));

const back = new THREE.Group();
back.visible = false;
const prism2 = prism.clone();
prism2.position.set(1.8, 0, 0);
prism2.rotation.z = 0; // upside down: it bends the colors back together
back.add(tagPart(prism2, 'prism'));
RAINBOW.forEach((c, i) => {
  const mid = v(1.41, 0.05 - i * 0.06, 0);
  back.add(beam(OUT, mid, c, 0.035));
});
back.add(beam(v(1.41, -0.13, 0), v(2.19, -0.13, 0), 0xffffff, 0.05));
back.add(tagPart(beam(v(2.19, -0.13, 0), v(SCREEN_X, -0.6, 0), 0xffffff, 0.07), 'beam'));
const whiteSpot = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.9), basic(0xffffff));
whiteSpot.position.set(SCREEN_X - 0.01, -0.6, 0);
back.add(whiteSpot);
prismView.add(back);

addLabel('beam', prismView, v(-3.6, -0.35, 0), { hideWith: prismView });
addLabel('prism', prismView, v(-1, 1.2, 0), { hideWith: prismView });
addLabel('rainbow', prismView, v(SCREEN_X, 0.75, 0), { hideWith: prismView });

// ---------- View 2: fruit under colored light ----------

const fruitView = new THREE.Group();
fruitView.visible = false;
scene.add(fruitView);
const table = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 2.6), mat(0xf4f0e8));
table.position.y = -0.6;
fruitView.add(table);
// An apple: a ball with a dimple on top and a little one underneath, and a stalk.
const apple = new THREE.Mesh(shaped((q) => {
  const middle = Math.exp(-((Math.hypot(q.x, q.z) / 0.45) ** 2));
  q.set(q.x * 0.54, (q.y - (q.y > 0 ? 0.4 : -0.2) * middle) * 0.5, q.z * 0.54);
}, 10), mat(0xff1a1a));
apple.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.3, 8).translate(0.02, 0.4, 0), mat(0x6b4a2a)));
apple.position.set(-1.5, 0, 0);
fruitView.add(tagPart(apple, 'apple'));
// A banana: long and curved, thinner toward both ends.
const banana = new THREE.Mesh(shaped((q) => {
  const thick = 0.17 * (1 - 0.5 * q.x ** 4);
  q.set(q.x * 0.8, q.y * thick + 0.32 * q.x * q.x, q.z * thick);
}, 10), mat(0xffe81a));
banana.position.set(0, -0.33, 0);
fruitView.add(tagPart(banana, 'banana'));
// A leaf: pointed at both ends, and folded a little along its middle.
const leaf = new THREE.Mesh(shaped((q) => {
  const across = q.z * 0.36 * (1 - q.x * q.x) ** 0.35;
  q.set(q.x * 0.62, q.y * 0.03 + 0.35 * Math.abs(across) + 0.08 * q.x * q.x, across);
}, 10), mat(0x1ac42a));
leaf.rotation.x = 0.5;
leaf.position.set(1.5, -0.4, 0);
leaf.rotation.z = 0.2;
fruitView.add(tagPart(leaf, 'leaf'));
addLabel('apple', apple, v(0, 0.75, 0), { hideWith: fruitView });
addLabel('banana', banana, v(0, 0.75, 0), { hideWith: fruitView });
addLabel('leaf', leaf, v(0, 0.6, 0), { hideWith: fruitView });
// The stage's own lights get tinted by the chosen light color.
const lights = scene.children.filter((o) => o.isLight);
const LIGHTS = { white: 0xffffff, red: 0xff0000, green: 0x00ff00, blue: 0x0000ff };

// ---------- View 3: mixing lights ----------

const mixView = new THREE.Group();
mixView.visible = false;
scene.add(mixView);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), basic(0x15181c));
wall.position.z = -0.5;
mixView.add(tagPart(wall, 'wall'));
const LAMPS = {
  red: { color: 0xff0000, at: v(-0.75, 0.75) },
  green: { color: 0x00ff00, at: v(0.75, 0.75) },
  blue: { color: 0x0000ff, at: v(0, -0.55) },
};
const lampOn = { red: true, green: false, blue: false };
Object.entries(LAMPS).forEach(([key, lamp]) => {
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.35, 48), basic(lamp.color, { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  pool.position.set(lamp.at.x, lamp.at.y, -0.45);
  mixView.add(tagPart(pool, 'wall'));
  lamp.pool = pool;
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16, 1, true).rotateX(-Math.PI / 2), mat(0x3a3f48, { side: THREE.DoubleSide }));
  body.position.set(lamp.at.x * 1.6, lamp.at.y * 1.4 - 0.2, 2.2);
  body.lookAt(lamp.at.x, lamp.at.y, -0.5);
  mixView.add(tagPart(body, 'lamp'));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), basic(lamp.color));
  bulb.position.copy(body.position);
  mixView.add(tagPart(bulb, 'lamp'));
  lamp.bulb = bulb;
});
addLabel('lamp', mixView, v(-1.2, 1.1, 2.2), { hideWith: mixView });
addLabel('wall', mixView, v(0, 2.2, -0.4), { hideWith: mixView });

// ---------- Controls ----------

const state = { view: 'prism' };
const levelCard = document.getElementById('level-card');
const TOOLS = { prism: 'prism-tools', fruit: 'fruit-tools', mix: 'mix-tools' };

function aim() {
  const { camera: c, target: t } = VIEWS[state.view];
  camera.position.set(...c);
  controls.target.set(...t);
}

function setLight(key) {
  lights.forEach((l) => l.color.set(LIGHTS[key]));
  document.querySelectorAll('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === key)));
}

function setView(key) {
  state.view = key;
  prismView.visible = key === 'prism';
  fruitView.visible = key === 'fruit';
  mixView.visible = key === 'mix';
  Object.entries(TOOLS).forEach(([k, id]) => {
    const el = document.getElementById(id);
    el.hidden = false;
    el.style.display = k === key ? '' : 'none';
  });
  if (key !== 'fruit') setLight('white');
  document.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === key)));
  levelCard.textContent = VIEWS[key].line;
  explorer.showLabels();
  aim();
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  setView(b.dataset.view);
  cello.say(VIEWS[b.dataset.view].line, { ms: 3500, important: false });
}));

document.getElementById('second').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  back.visible = on;
  fan.visible = !on;
  spots.visible = !on;
  if (!on) return;
  levelCard.textContent = 'The second prism bends the colors back together, and they make white again!';
  if (complete('rejoin')) cello.say('White again! Put all the colors back together, and you get white light.', { mood: 'wow', ms: 5000 });
});

const FRUIT_LINES = {
  white: 'White light has every color, so each fruit can reflect its own color.',
  red: 'Red light only: the apple reflects it and looks red. The leaf has no green to reflect, so it looks dark.',
  green: 'Green light only: the leaf looks green, but the apple has no red to reflect. It looks black!',
  blue: 'Blue light only: none of them can reflect much blue, so they all look dark.',
};
document.querySelectorAll('[data-light]').forEach((b) => b.addEventListener('click', () => {
  const key = b.dataset.light;
  setLight(key);
  levelCard.textContent = FRUIT_LINES[key];
  if ((key === 'green' || key === 'blue') && complete('dark')) {
    cello.say('The apple looks black! It can only reflect red, and there’s no red light to reflect.', { mood: 'wow', ms: 6000 });
  } else {
    cello.say(FRUIT_LINES[key], { ms: 4500, important: false });
  }
}));

function showLamps() {
  Object.entries(LAMPS).forEach(([key, lamp]) => {
    lamp.pool.visible = lampOn[key];
    lamp.bulb.material.color.set(lampOn[key] ? lamp.color : 0x333333);
  });
  document.querySelectorAll('[data-lamp]').forEach((b) => b.setAttribute('aria-pressed', String(lampOn[b.dataset.lamp])));
  if (lampOn.red && lampOn.green && lampOn.blue) {
    levelCard.textContent = 'All three overlap in the middle: white!';
    if (complete('white')) cello.say('Red, green, and blue light together make white! Your TV screen uses this trick.', { mood: 'wow', ms: 5500 });
  } else if (lampOn.red && lampOn.green) {
    levelCard.textContent = 'Red + green light = yellow. Surprise!';
    if (complete('yellow')) cello.say('Red and green light make yellow! Light mixes differently from paint.', { mood: 'wow', ms: 5000 });
  } else if (lampOn.green && lampOn.blue) {
    levelCard.textContent = 'Green + blue light = cyan, a bright sky blue.';
  } else if (lampOn.red && lampOn.blue) {
    levelCard.textContent = 'Red + blue light = magenta, a bright pink-purple.';
  }
}
document.querySelectorAll('[data-lamp]').forEach((b) => b.addEventListener('click', () => {
  lampOn[b.dataset.lamp] = !lampOn[b.dataset.lamp];
  showLamps();
}));

document.getElementById('reset').addEventListener('click', aim);

stage.onFrame((dt) => {
  apple.rotation.y += dt * 0.3;
});

showLamps();
setView('prism');
