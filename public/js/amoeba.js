import * as THREE from 'three';
import { createStage } from './scene.js';
import { createExplorer, bindSlider, bindToggle } from './explorer.js';

// ---------- Kid-friendly descriptions of each part ----------

const PARTS = {
  membrane: {
    name: 'Cell membrane',
    text: 'A thin, stretchy skin around the whole cell. It is so soft that the Amoeba can change its shape any way it likes.',
  },
  pseudopod: {
    name: 'Pseudopodium (false foot)',
    text: 'A finger of jelly that pokes out of the cell. The Amoeba uses these "false feet" to crawl and to grab food. It can make a new one anywhere!',
  },
  cytoplasm: {
    name: 'Cytoplasm',
    text: 'The jelly inside the cell. It flows into a false foot to make it longer, and that is how the Amoeba moves.',
  },
  nucleus: {
    name: 'Nucleus',
    text: 'The control center. It tells the cell what to do. When the Amoeba splits in two, the nucleus splits first.',
  },
  foodVacuole: {
    name: 'Food vacuole',
    text: 'A bubble with food inside. The Amoeba wraps its false feet around food and closes it up in here to digest it.',
  },
  vacuole: {
    name: 'Contractile vacuole',
    text: 'A water pump. It slowly fills up with extra water, then squeezes it out of the cell, so the Amoeba does not burst.',
  },
};

// ---------- Stage ----------

const stageEl = document.getElementById('stage');
const stage = createStage(stageEl);
const { scene, camera, controls } = stage;

const CAMERA_HOME = new THREE.Vector3(0, 6.5, 8);
camera.position.copy(CAMERA_HOME);

const RADIUS = 1.25;
const FLATTEN = 0.6; // an Amoeba spreads out flat as it crawls
const FLOOR_Y = -RADIUS * FLATTEN;
const POND_RADIUS = 7;
const MAX_AMOEBAS = 6;
const SENSE_RANGE = 6;

const explorer = createExplorer({
  topic: 'amoeba',
  parts: PARTS,
  stage,
  stageEl,
  skins: ['membrane', 'cytoplasm'],
  greeting: 'Tap the pond floor to drop food. Watch the Amoeba reach for it!',
  allPartsLine: 'You found all 6 parts! You know the Amoeba inside out.',
  // A tap on the membrane far from the middle is really a false foot.
  resolve(hit) {
    const key = hit.object.userData.part;
    const amoeba = hit.object.userData.amoeba;
    if (key !== 'membrane' || !amoeba) return key;
    const local = amoeba.group.worldToLocal(hit.point.clone());
    return Math.hypot(local.x, local.z) > RADIUS * 1.2 ? 'pseudopod' : key;
  },
  onEmptyTap: dropFoodAt,
});
const { addLabel, tagPart, complete, cello } = explorer;

// ---------- Pond floor ----------

const floorMaterial = new THREE.MeshStandardMaterial({ roughness: 1 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(POND_RADIUS + 2, 64), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = FLOOR_Y - 0.02;
scene.add(floor);

// ---------- Shared materials ----------

const bodyMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.35,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});
const nucleusMaterial = new THREE.MeshStandardMaterial({ color: 0xff7aa2, roughness: 0.45 });
const vacuoleMaterial = new THREE.MeshStandardMaterial({ color: 0x6fc3ff, roughness: 0.2, emissive: 0x1a4c80 });
const speckMaterial = new THREE.PointsMaterial({ size: 0.04 });
const hiddenMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const freshFood = new THREE.Color(0x7be05a);
const digestedFood = new THREE.Color(0x8a5a2b);

const nucleusGeo = new THREE.SphereGeometry(0.32, 28, 20);
const vacuoleGeo = new THREE.SphereGeometry(0.2, 20, 14);
const foodVacuoleGeo = new THREE.SphereGeometry(0.16, 16, 12);

// ---------- One Amoeba ----------
// Its body is a sphere whose surface is pushed out wherever a false foot
// (pseudopod) is growing. Every frame we recompute the shape.

const amoebas = [];
let hero = null; // the first Amoeba carries the labels

class Amoeba {
  constructor(position, size = 1) {
    this.size = size;
    this.targetSize = 1;
    this.pods = [];
    this.wander = Math.random() * Math.PI * 2;
    this.nextPod = 0.5;
    this.splitting = null;
    this.pump = Math.random();
    this.foodVacuoles = [];
    this.time = Math.random() * 100;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    scene.add(this.group);

    const geo = new THREE.SphereGeometry(1, 72, 48);
    this.directions = geo.attributes.position.array.slice();
    this.body = new THREE.Mesh(geo, bodyMaterial);
    this.body.renderOrder = 2;
    this.body.userData.amoeba = this;
    this.group.add(this.body);
    tagPart(this.body, 'membrane');

    // An invisible core so a tap in the middle can find the cytoplasm.
    this.core = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.7, 16, 12), hiddenMaterial);
    this.core.scale.y = FLATTEN;
    this.group.add(this.core);
    tagPart(this.core, 'cytoplasm');

    this.nucleus = new THREE.Mesh(nucleusGeo, nucleusMaterial);
    this.nucleus.scale.set(1, 0.75, 1);
    this.group.add(this.nucleus);
    tagPart(this.nucleus, 'nucleus');
    // A second nucleus that only shows while the cell splits in two.
    this.nucleus2 = new THREE.Mesh(nucleusGeo, nucleusMaterial);
    this.nucleus2.scale.copy(this.nucleus.scale);
    this.nucleus2.visible = false;
    this.group.add(this.nucleus2);
    tagPart(this.nucleus2, 'nucleus');

    this.vacuole = new THREE.Mesh(vacuoleGeo, vacuoleMaterial);
    this.vacuole.position.set(-0.55, 0.1, 0.45);
    this.group.add(this.vacuole);
    tagPart(this.vacuole, 'vacuole');

    const n = 160;
    const specks = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * RADIUS * 0.85);
      specks.set([v.x, v.y * FLATTEN, v.z], i * 3);
    }
    const speckGeo = new THREE.BufferGeometry();
    speckGeo.setAttribute('position', new THREE.BufferAttribute(specks, 3));
    this.specks = new THREE.Points(speckGeo, speckMaterial);
    this.group.add(this.specks);

    this.group.scale.setScalar(size);
    amoebas.push(this);
  }

  // The longest false foot, if any.
  leadPod() {
    return this.pods.reduce((best, p) => (!best || p.len > best.len ? p : best), null);
  }

  growPod(dir, target, life) {
    const pod = { dir: dir.clone().setY(0).normalize(), len: 0, target, life, age: 0 };
    this.pods.push(pod);
    return pod;
  }

  update(dt, activity, maxPods) {
    this.time += dt;
    this.size += (this.targetSize - this.size) * Math.min(1, dt * 0.15);
    this.group.scale.setScalar(this.size);

    if (this.splitting) this.updateSplit(dt);
    else this.updateCrawl(dt, activity, maxPods);

    this.updatePump(dt);
    this.updateFoodVacuoles(dt);
    this.updateShape();
  }

  updateCrawl(dt, activity, maxPods) {
    const speed = activity / 10;
    // An Amoeba can sense food a fair way off and crawls toward it.
    const food = nearestFood(this.group.position, SENSE_RANGE, this);

    if (food) {
      // Reach for the food with a false foot and flow toward it.
      const toFood = food.mesh.position.clone().sub(this.group.position).setY(0);
      const distance = toFood.length() / this.size;
      let pod = this.pods.find((p) => p.food === food);
      if (!pod && speed > 0) {
        pod = this.growPod(toFood, 0, 99);
        pod.food = food;
      }
      if (pod) {
        pod.dir.copy(toFood).normalize();
        pod.target = Math.max(0, Math.min(distance - RADIUS * 0.6, 2.2));
        // The tip touched it: grab it and pull it into the cell.
        if (RADIUS + pod.len >= distance - 0.2) food.grabbedBy = this;
      }
      if (food.grabbedBy === this) {
        const pull = Math.min(1.6 * dt * this.size, toFood.length());
        food.mesh.position.addScaledVector(toFood.normalize(), -pull);
        if (distance < RADIUS * 0.55) this.swallow(food);
      }
    } else if (speed > 0) {
      // Nothing to eat: explore. Grow a new false foot every so often.
      this.nextPod -= dt * speed;
      if (this.nextPod <= 0 && this.pods.length < maxPods) {
        this.nextPod = THREE.MathUtils.randFloat(0.6, 1.6);
        // Head roughly the same way, and turn back near the edge of the pond.
        const home = this.group.position.length() > POND_RADIUS - 1.5;
        this.wander = home
          ? Math.atan2(-this.group.position.z, -this.group.position.x)
          : this.wander + THREE.MathUtils.randFloatSpread(2.2);
        const dir = new THREE.Vector3(Math.cos(this.wander), 0, Math.sin(this.wander));
        this.growPod(dir, THREE.MathUtils.randFloat(0.7, 1.6), THREE.MathUtils.randFloat(2, 4));
      }
    }

    // Grow and shrink the false feet; the body flows toward the longest ones.
    const flow = new THREE.Vector3();
    for (let i = this.pods.length - 1; i >= 0; i--) {
      const pod = this.pods[i];
      pod.age += dt * Math.max(speed, 0.1);
      if (pod.age > pod.life || (pod.food && !foods.includes(pod.food))) pod.target = 0;
      pod.len += (pod.target - pod.len) * Math.min(1, dt * (0.4 + 2 * speed));
      flow.addScaledVector(pod.dir, pod.len);
      if (pod.target === 0 && pod.len < 0.03) this.pods.splice(i, 1);
    }
    const step = flow.multiplyScalar(0.35 * speed * dt * this.size);
    this.group.position.add(step);
    // As the body catches up, the feet get shorter.
    const caught = step.length() / this.size;
    this.pods.forEach((p) => { p.len = Math.max(0, p.len - caught * 0.6); });
  }

  swallow(food) {
    removeFood(food);
    if (this.foodVacuoles.length >= 8) return;
    const mesh = new THREE.Mesh(foodVacuoleGeo, new THREE.MeshStandardMaterial({ color: freshFood.clone(), roughness: 0.4 }));
    const angle = Math.random() * Math.PI * 2;
    mesh.userData.orbit = { angle, radius: THREE.MathUtils.randFloat(0.35, 0.7), age: 0 };
    this.group.add(mesh);
    tagPart(mesh, 'foodVacuole');
    this.foodVacuoles.push(mesh);
    onEat(food);
  }

  updateFoodVacuoles(dt) {
    for (let i = this.foodVacuoles.length - 1; i >= 0; i--) {
      const v = this.foodVacuoles[i];
      const o = v.userData.orbit;
      o.age += dt;
      o.angle += dt * 0.25;
      const t = Math.min(o.age / 14, 1);
      v.position.set(Math.cos(o.angle) * o.radius, -0.05, Math.sin(o.angle) * o.radius);
      v.material.color.copy(freshFood).lerp(digestedFood, Math.min(t * 1.3, 1));
      v.scale.setScalar(1.2 - 0.8 * t);
      if (t >= 1) {
        this.group.remove(v);
        v.material.dispose();
        explorer.untagPart(v);
        this.foodVacuoles.splice(i, 1);
      }
    }
  }

  updatePump(dt) {
    // Fill slowly, then squeeze the water out all at once.
    this.pump = (this.pump + dt / 5) % 1;
    const t = this.pump;
    this.vacuole.scale.setScalar(t < 0.85 ? 0.3 + 0.9 * (t / 0.85) : 1.2 * (1 - (t - 0.85) / 0.15) + 0.05);
  }

  split() {
    if (this.splitting || this.size < 0.8 || amoebas.length >= MAX_AMOEBAS) return false;
    const angle = Math.random() * Math.PI;
    this.splitting = { t: 0, axis: new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)) };
    this.pods.forEach((p) => { p.target = 0; });
    return true;
  }

  updateSplit(dt) {
    const s = this.splitting;
    s.t = Math.min(s.t + dt / 4, 1);
    // First the nucleus divides, then the body pinches in the middle.
    const apart = THREE.MathUtils.smoothstep(s.t, 0, 0.5) * 0.75;
    this.nucleus2.visible = true;
    this.nucleus.position.copy(s.axis).multiplyScalar(apart);
    this.nucleus2.position.copy(s.axis).multiplyScalar(-apart);
    this.pods.forEach((p) => { p.len *= 0.9; });
    if (s.t < 1) return;

    // Done: this cell becomes one half, and a new Amoeba is the other.
    const offset = s.axis.clone().multiplyScalar(0.95 * this.size);
    const twin = new Amoeba(this.group.position.clone().sub(offset), this.size * 0.62);
    twin.wander = Math.atan2(-s.axis.z, -s.axis.x);
    this.group.position.add(offset);
    this.size *= 0.62;
    this.wander = Math.atan2(s.axis.z, s.axis.x);
    this.splitting = null;
    this.nucleus.position.set(0, 0, 0);
    this.nucleus2.visible = false;
    this.pods = [];
    onSplit();
  }

  updateShape() {
    const pos = this.body.geometry.attributes.position;
    const dirs = this.directions;
    const t = this.time;
    const split = this.splitting ? THREE.MathUtils.smoothstep(this.splitting.t, 0.25, 1) : 0;
    const axis = this.splitting?.axis;
    for (let i = 0; i < pos.count; i++) {
      const x = dirs[i * 3];
      const y = dirs[i * 3 + 1];
      const z = dirs[i * 3 + 2];
      // A slow wobble, so it always looks alive.
      let r = RADIUS * (1 + 0.06 * Math.sin(3 * x + t * 1.3) * Math.cos(2 * z + t) + 0.04 * Math.sin(5 * y + t * 2));
      for (const pod of this.pods) {
        const d = x * pod.dir.x + z * pod.dir.z;
        if (d > 0) r += pod.len * Math.pow(d, 14) * (1 - Math.abs(y));
      }
      if (split) {
        // Stretch along the split line and pinch the middle thin.
        const along = Math.abs(x * axis.x + z * axis.z);
        r *= 1 + 0.55 * split * along * along - 0.75 * split * split * Math.pow(1 - along * along, 3);
      }
      pos.setXYZ(i, x * r, y * r * FLATTEN, z * r);
    }
    pos.needsUpdate = true;
    this.body.geometry.computeVertexNormals();
    this.body.geometry.computeBoundingSphere();
  }
}

// ---------- Food (algae and bacteria) ----------

const foodGeo = new THREE.CapsuleGeometry(0.07, 0.12, 4, 8);
const foodColors = [0x9be15d, 0xd7e35a, 0x6ed38a];
const foods = [];
const MAX_FOODS = 40;

function addFood(position, dropped) {
  if (foods.length >= MAX_FOODS) return;
  const mesh = new THREE.Mesh(
    foodGeo,
    new THREE.MeshStandardMaterial({ color: foodColors[foods.length % foodColors.length], roughness: 0.5 }),
  );
  mesh.position.copy(position).setY(FLOOR_Y + 0.1);
  mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
  scene.add(mesh);
  foods.push({ mesh, dropped });
}

function removeFood(food) {
  scene.remove(food.mesh);
  food.mesh.material.dispose();
  foods.splice(foods.indexOf(food), 1);
}

function nearestFood(from, reach, amoeba) {
  let best = null;
  let bestDistance = reach;
  for (const f of foods) {
    if (f.grabbedBy && f.grabbedBy !== amoeba) continue;
    const d = Math.hypot(f.mesh.position.x - from.x, f.mesh.position.z - from.z);
    if (d < bestDistance) {
      best = f;
      bestDistance = d;
    }
  }
  return best;
}

const floorHit = [];

function dropFoodAt(raycaster) {
  floorHit.length = 0;
  raycaster.intersectObject(floor, false, floorHit);
  if (!floorHit.length) return;
  const point = floorHit[0].point;
  if (Math.hypot(point.x, point.z) > POND_RADIUS) return;
  addFood(point, true);
}

function dropFoodNearby() {
  for (const amoeba of amoebas) {
    const angle = Math.random() * Math.PI * 2;
    const distance = THREE.MathUtils.randFloat(RADIUS + 0.8, RADIUS + 2) * amoeba.size;
    addFood(amoeba.group.position.clone().add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)), true);
  }
}

// ---------- The first Amoeba, with labels ----------

hero = new Amoeba(new THREE.Vector3(0, 0, 0));
addLabel('membrane', hero.group, new THREE.Vector3(-0.9, 0.75, -0.6));
addLabel('nucleus', hero.nucleus, new THREE.Vector3(0, 0.55, 0));
addLabel('vacuole', hero.vacuole, new THREE.Vector3(-0.3, 0.45, 0.1));
addLabel('cytoplasm', hero.group, new THREE.Vector3(0.6, -0.1, 0.7));
const podLabel = addLabel('pseudopod', hero.group, new THREE.Vector3());
const foodVacuoleLabel = addLabel('foodVacuole', hero.group, new THREE.Vector3());

function updateHeroLabels() {
  const pod = hero.leadPod();
  podLabel.element.style.opacity = pod && pod.len > 0.4 ? 1 : 0;
  if (pod) podLabel.position.copy(pod.dir).multiplyScalar(RADIUS + pod.len).setY(0.45);
  const vacuole = hero.foodVacuoles[0];
  foodVacuoleLabel.element.style.opacity = vacuole ? 1 : 0;
  if (vacuole) foodVacuoleLabel.position.copy(vacuole.position).setY(0.5);
}

// ---------- Stars and Cello ----------

const YUMS = ['Gulp!', 'Yum, algae!', 'Wrapped it up!', 'Into a food vacuole!'];

function onEat(food) {
  if (food.dropped && complete('eat')) {
    cello.say('Gulp! The false feet wrapped around the food and closed it in a food vacuole.', { ms: 5000 });
  } else if (Math.random() < 0.35) {
    cello.say(YUMS[Math.floor(Math.random() * YUMS.length)], { ms: 1800, important: false });
  }
}

function onSplit() {
  if (complete('split')) {
    cello.say('One Amoeba became two! Each half got its own nucleus.', { mood: 'wow', ms: 5000 });
  } else if (amoebas.length >= 4 && complete('family')) {
    cello.say(`Look, ${amoebas.length} Amoebas! They all came from just one.`, { mood: 'wow', ms: 5000 });
  } else {
    cello.say(`Now there are ${amoebas.length}!`, { ms: 2000, important: false });
  }
}

// ---------- Controls ----------

const settings = { activity: 6, pods: 2 };

bindSlider('activity', (v) => (v === 0 ? 'resting' : `${v} / 10`), (v) => {
  settings.activity = v;
  if (v === 0) cello.say('Resting. No false feet, so it stays still.', { mood: 'sad', important: false });
});
bindSlider('pods', (v) => `${v} at a time`, (v) => {
  settings.pods = v;
  if (v >= 5 && complete('many')) {
    cello.say('Five false feet at once! It can reach in every direction.', { mood: 'wow', ms: 4500 });
  }
});

bindToggle('xray', (on) => { bodyMaterial.opacity = on ? 0.2 : 0.5; });
document.getElementById('feed').addEventListener('click', dropFoodNearby);
document.getElementById('split').addEventListener('click', () => {
  // Split the biggest Amoeba that is ready.
  const ready = amoebas.filter((a) => !a.splitting && a.size >= 0.8).sort((a, b) => b.size - a.size)[0];
  if (amoebas.length >= MAX_AMOEBAS) {
    cello.say('The pond is full! Six Amoebas is plenty.', { important: false });
  } else if (!ready) {
    cello.say('They need to grow a bit first. Give them a few seconds!', { important: false });
  } else {
    ready.split();
    cello.say('Watch the nucleus split first…', { ms: 2500 });
  }
});
document.getElementById('reset').addEventListener('click', () => {
  controls.target.set(0, 0, 0);
  camera.position.copy(CAMERA_HOME);
});

// ---------- Theme ----------

const THEME_COLORS = {
  dark: { body: 0xc2a8ff, specks: 0xe6dcff, floor: 0x10283a },
  light: { body: 0x9a7be8, specks: 0x6a4fc2, floor: 0xb6d9e6 },
};

window.elixTheme.watch((theme) => {
  const colors = THEME_COLORS[theme];
  bodyMaterial.color.set(colors.body);
  speckMaterial.color.set(colors.specks);
  floorMaterial.color.set(colors.floor);
});

// ---------- Main loop ----------

// Amoebas that bump into each other slide apart.
function separate() {
  for (let i = 0; i < amoebas.length; i++) {
    for (let j = i + 1; j < amoebas.length; j++) {
      const a = amoebas[i].group.position;
      const b = amoebas[j].group.position;
      const gap = RADIUS * 1.9 * (amoebas[i].size + amoebas[j].size) / 2;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 0.01;
      if (d < gap) {
        const push = (gap - d) * 0.05;
        a.x -= (dx / d) * push; a.z -= (dz / d) * push;
        b.x += (dx / d) * push; b.z += (dz / d) * push;
      }
    }
  }
}

stage.onFrame((dt) => {
  amoebas.forEach((a) => a.update(dt, settings.activity, settings.pods));
  separate();
  updateHeroLabels();
});
