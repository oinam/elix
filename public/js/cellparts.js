// Cell parts shared by the cell pages (the cell, cytoplasm, centrioles, and
// plant vs animal): blobby shapes, the nucleus, and the organelles. Each
// builder makes its own materials, so a tapped part glows on its own.
import * as THREE from 'three';

export const glass = (color, opacity = 0.4, extra = {}) => new THREE.MeshStandardMaterial({
  color, roughness: 0.35, transparent: true, opacity, depthWrite: false, ...extra,
});
export const solid = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });

// A seeded random number, so a model looks the same on every visit.
export function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Points spread evenly over a sphere of radius 1.
export function spherePoints(n) {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    points.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r));
  }
  return points;
}

// A soft, lumpy ball: a sphere with gentle bumps, stretched by scale.
export function blobGeometry(radius, { bump = 0.05, seed = 1, scale = [1, 1, 1], detail = 48 } = {}) {
  const geo = new THREE.SphereGeometry(radius, detail, Math.round(detail * 0.7));
  const rand = seeded(seed);
  const waves = [0, 1, 2].map(() => [rand() * 3 + 1, rand() * 3 + 1, rand() * 6]);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1;
    for (const [a, b, c] of waves) r += bump * Math.sin(a * v.x + c) * Math.cos(b * v.y + c * 0.5 + v.z);
    pos.setXYZ(i, v.x * radius * r * scale[0], v.y * radius * r * scale[1], v.z * radius * r * scale[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

// A wiggly thread that stays inside a ball of the given radius.
function randomWalk(rand, radius, steps, stepSize) {
  const points = [];
  const p = new THREE.Vector3((rand() - 0.5) * radius, (rand() - 0.5) * radius, (rand() - 0.5) * radius);
  const dir = new THREE.Vector3().randomDirection();
  for (let i = 0; i < steps; i++) {
    points.push(p.clone());
    dir.add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(1.2)).normalize();
    p.addScaledVector(dir, stepSize);
    if (p.length() > radius) {
      p.setLength(radius);
      dir.negate();
    }
  }
  return points;
}

// One X-shaped chromosome: two copies (chromatids) joined in the middle.
function makeChromosome(size, color) {
  const g = new THREE.Group();
  const mat = solid(color);
  for (const tilt of [0.42, -0.42]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.16, size, 6, 12), mat);
    arm.rotation.z = tilt;
    g.add(arm);
  }
  const middle = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 12, 8), solid(0xffffff));
  g.add(middle);
  return g;
}

// The nucleus: its own skin (nuclear membrane) with pores, the nucleolus,
// and long threads that coil up into X-shaped chromosomes before a cell splits.
export function makeNucleus({
  radius = 1,
  envelopeColor = 0x9a7cf5,
  poreColor = 0x4b2fa6,
  nucleolusColor = 0x5b3fc4,
  threadColor = 0xff7aa2,
  poreCount = 46,
  chromosomeCount = 4,
  seed = 7,
} = {}) {
  const rand = seeded(seed);
  const group = new THREE.Group();

  const envelope = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 28), glass(envelopeColor, 0.5));
  envelope.renderOrder = 3;
  group.add(envelope);

  const poreGeo = new THREE.TorusGeometry(radius * 0.05, radius * 0.016, 6, 14);
  const pores = new THREE.InstancedMesh(poreGeo, solid(poreColor), poreCount);
  const z = new THREE.Vector3(0, 0, 1);
  const m = new THREE.Matrix4();
  spherePoints(poreCount).forEach((n, i) => {
    m.compose(n.clone().multiplyScalar(radius), new THREE.Quaternion().setFromUnitVectors(z, n), new THREE.Vector3(1, 1, 1));
    pores.setMatrixAt(i, m);
  });
  group.add(pores);

  const nucleolus = new THREE.Mesh(blobGeometry(radius * 0.3, { bump: 0.1, seed: seed + 1 }), solid(nucleolusColor));
  nucleolus.position.set(radius * 0.28, radius * 0.22, -radius * 0.1);
  group.add(nucleolus);

  const threadMat = solid(threadColor);
  const threads = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const curve = new THREE.CatmullRomCurve3(randomWalk(rand, radius * 0.72, 22, radius * 0.18));
    threads.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, radius * 0.025, 5), threadMat));
  }
  group.add(threads);

  const chromosomes = new THREE.Group();
  const colors = [0xff7aa2, 0xffb15e, 0x6fd3ff, 0x8de86f];
  for (let i = 0; i < chromosomeCount; i++) {
    const c = makeChromosome(radius * 0.38, colors[i % colors.length]);
    const a = (i / chromosomeCount) * Math.PI * 2;
    c.position.set(Math.cos(a) * radius * 0.42, Math.sin(a) * radius * 0.3 - radius * 0.05, Math.sin(a * 2) * radius * 0.2);
    c.rotation.set(rand() * 0.6, rand() * 3, rand() * 3);
    chromosomes.add(c);
  }
  chromosomes.visible = false;
  group.add(chromosomes);

  // 0: loose threads. 1: coiled into chromosomes.
  function setCoiled(t) {
    threads.visible = t < 0.99;
    threads.scale.setScalar(Math.max(1 - t, 0.001));
    chromosomes.visible = t > 0.01;
    chromosomes.scale.setScalar(Math.max(t, 0.001));
  }

  return { group, envelope, pores, nucleolus, threads, chromosomes, setCoiled };
}

// A mitochondrion: a bean with folds inside, where food becomes energy.
export function makeMitochondrion(length = 0.6, { color = 0xff9f5a, foldColor = 0xc2552a } = {}) {
  const group = new THREE.Group();
  const r = length * 0.26;
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(r, length, 8, 18).rotateZ(Math.PI / 2), glass(color, 0.75));
  shell.renderOrder = 2;
  group.add(shell);
  const folds = [];
  const n = 7;
  for (let i = 0; i <= n * 6; i++) {
    const t = i / (n * 6);
    folds.push(new THREE.Vector3((t - 0.5) * length * 1.05, Math.sin(t * n * Math.PI * 2) * r * 0.75, 0));
  }
  const fold = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(folds), 120, r * 0.12, 5), solid(foldColor));
  group.add(fold);
  return group;
}

// A see-through storage bubble.
export function makeVacuole(radius = 0.3, color = 0x9ccfff, opacity = 0.55) {
  const mesh = new THREE.Mesh(blobGeometry(radius, { bump: 0.06, seed: Math.round(radius * 100) }), glass(color, opacity));
  mesh.renderOrder = 2;
  return mesh;
}

// One centriole: a short tube made of nine bundles of three tiny tubes.
export function makeCentriole(length = 0.5, { color = 0xffd75e } = {}) {
  const group = new THREE.Group();
  const radius = length * 0.32;
  const tubeR = length * 0.035;
  const geo = new THREE.CylinderGeometry(tubeR, tubeR, length, 8);
  const mat = solid(color);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    // Each bundle of three is tilted, like the blades of a pinwheel.
    for (let k = 0; k < 3; k++) {
      const along = (k - 1) * tubeR * 1.9;
      const tangent = a + Math.PI / 2 - 0.6;
      const tube = new THREE.Mesh(geo, mat);
      tube.position.set(Math.cos(a) * radius + Math.cos(tangent) * along, 0, Math.sin(a) * radius + Math.sin(tangent) * along);
      group.add(tube);
    }
  }
  return group;
}

// Two centrioles at right angles to each other.
export function makeCentriolePair(length = 0.5, options = {}) {
  const group = new THREE.Group();
  const a = makeCentriole(length, options);
  const b = makeCentriole(length, options);
  b.rotation.z = Math.PI / 2;
  b.position.set(length * 0.55, length * 0.05, 0);
  group.add(a, b);
  return group;
}

// A chloroplast: a green bean with stacks of coins (grana) inside, where
// sunlight is used to make food.
export function makeChloroplast(length = 0.55, { color = 0x5fcf5f, stackColor = 0x1f8a3a } = {}) {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(length / 2, 24, 16).scale(1, 0.45, 0.62), glass(color, 0.7));
  shell.renderOrder = 2;
  group.add(shell);
  const coin = new THREE.CylinderGeometry(length * 0.08, length * 0.08, length * 0.03, 12);
  const mat = solid(stackColor);
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < 4; k++) {
      const c = new THREE.Mesh(coin, mat);
      c.position.set((s - 1.5) * length * 0.2, (k - 1.5) * length * 0.04, ((s % 2) - 0.5) * length * 0.12);
      group.add(c);
    }
  }
  return group;
}

// Rough ER: folded sheets wrapped around the nucleus, dotted with ribosomes.
export function makeER(innerRadius = 1.2, { color = 0x6fc3ff, dotColor = 0x2f4d8a, layers = 3, seed = 3 } = {}) {
  const rand = seeded(seed);
  const group = new THREE.Group();
  const mat = glass(color, 0.65, { side: THREE.DoubleSide });
  const dots = [];
  for (let i = 0; i < layers; i++) {
    const r = innerRadius + i * 0.16;
    const start = rand() * Math.PI * 2;
    const arc = Math.PI * (0.7 + rand() * 0.4);
    const sheet = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.42, 48, 1, true, start, arc), mat);
    sheet.rotation.x = (rand() - 0.5) * 0.6;
    sheet.rotation.z = (rand() - 0.5) * 0.6;
    group.add(sheet);
    for (let k = 0; k < 40; k++) {
      const a = start + rand() * arc;
      const p = new THREE.Vector3(Math.sin(a) * (r + 0.03), (rand() - 0.5) * 0.4, Math.cos(a) * (r + 0.03));
      dots.push(p.applyEuler(sheet.rotation));
    }
  }
  const ribosomes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 4), solid(dotColor), dots.length);
  const m = new THREE.Matrix4();
  dots.forEach((p, i) => ribosomes.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  group.add(ribosomes);
  return group;
}

// The Golgi body: a stack of curved pockets that pack things up, with little
// bubbles (vesicles) carrying them away.
export function makeGolgi(size = 0.7, { color = 0xff9bb5 } = {}) {
  const group = new THREE.Group();
  const mat = solid(color);
  for (let i = 0; i < 5; i++) {
    const w = size * (1 - Math.abs(i - 2) * 0.13);
    const sac = new THREE.Mesh(new THREE.CapsuleGeometry(size * 0.06, w, 6, 12).rotateZ(Math.PI / 2), mat);
    sac.scale.set(1, 1, 2.2);
    sac.position.y = (i - 2) * size * 0.15;
    // Curve the stack a little, like a bent pile of pancakes.
    sac.position.z = -Math.abs(i - 2) * size * 0.04;
    group.add(sac);
  }
  for (let i = 0; i < 4; i++) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(size * 0.07, 10, 8), mat);
    bubble.position.set((i % 2 ? 1 : -1) * size * (0.62 + i * 0.05), (i - 1.5) * size * 0.18, 0);
    group.add(bubble);
  }
  return group;
}

// Lots of tiny dots spread through a ball: free ribosomes.
export function makeRibosomes(count, radius, { color = 0x2f4d8a, seed = 5, avoid = [] } = {}) {
  const rand = seeded(seed);
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), solid(color), count);
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    do {
      p.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).multiplyScalar(radius);
    } while (p.length() > radius || avoid.some((a) => p.distanceTo(a.center) < a.radius));
    mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z));
  }
  return mesh;
}
