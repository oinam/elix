import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Shared shapes for the body pages: a heart, a lung, a stomach, a liver, and
// a torso. Each is a smooth ball pushed into shape, about 1 unit from its
// middle to its edge; a page scales and places it.
//
// They all face the reader, as if the person is looking at us: the person's
// left side is on our right. So the heart's tip and the stomach are on our
// right, and the liver's thick end is on our left.

/** A smooth ball pushed into shape: `push` moves each point of a ball that is 1 from middle to edge. */
export function shaped(push, detail = 14) {
  const ball = new THREE.IcosahedronGeometry(1, detail);
  ball.deleteAttribute('uv');
  ball.deleteAttribute('normal');
  const geo = mergeVertices(ball);
  const pos = geo.attributes.position;
  const q = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    push(q.fromBufferAttribute(pos, i));
    pos.setXYZ(i, q.x, q.y, q.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * A heart. Broad on top, where the atria sit, with a dip where the big
 * vessels leave. It narrows to a tip (the apex) at the bottom, under the left
 * ventricle. About 3 wide and 2.9 tall; the middle of the top is near y = 0.8.
 */
export function heartGeometry() {
  return shaped((q) => {
    const down = Math.max(0, -q.y);
    const width = 1.5 * (1 - 0.4 * down);
    const dip = 0.28 * Math.exp(-((q.x / 0.32) ** 2)) * THREE.MathUtils.smoothstep(q.y, 0.2, 1);
    q.set(q.x * width + 0.45 * down ** 1.3, (q.y > 0 ? q.y * 1.3 : q.y * 1.55) - dip - 0.2, q.z * 0.62 * width);
  });
}

/**
 * A lung. Narrow at the top, wide at the bottom, flatter on the side that
 * faces the heart, and hollow underneath, where the breathing muscle (the
 * diaphragm) fits. `out` is +1 or -1: which way (along x) is away from the
 * heart. About 1.4 wide and 2 tall.
 */
export function lungGeometry(out, { hollow = 0.3 } = {}) {
  return shaped((q) => {
    const down = Math.max(0, -q.y);
    const inner = q.x * out < 0 ? 0.62 - 0.22 * THREE.MathUtils.smoothstep(down, 0, 0.8) : 1;
    const width = 0.74 - 0.2 * q.y;
    const dome = hollow * down * down * (1 - q.x * q.x - q.z * q.z);
    q.set(q.x * width * inner, (q.y > 0 ? q.y * 1.15 : q.y * 0.9) + dome - 0.1, q.z * 0.62 * (1 - 0.15 * q.y));
  });
}

/**
 * A stomach: a bag bent like the letter J. Food comes in at the top left and
 * leaves at the narrow end, bottom left. About 1.3 wide and 1.5 tall.
 */
export function stomachGeometry() {
  return shaped((q) => {
    const t = q.y;
    const width = 0.62 * (1 + 0.2 * t) * (t < 0 ? 1 + 0.5 * t : 1);
    q.set(q.x * width + 0.12 - 0.32 * t * t - (t < 0 ? 0.25 * t * t : 0), t * 0.78, q.z * width * 0.8);
  });
}

/**
 * A liver: a smooth wedge, thick on our left and thin on our right, domed on
 * top and flatter underneath. About 2.4 wide.
 */
export function liverGeometry() {
  return shaped((q) => {
    const thick = 0.75 - 0.4 * q.x;
    q.set(q.x * 1.2, (q.y > 0 ? q.y * 0.55 : q.y * 0.32) * thick - 0.12 * q.x, q.z * 0.7 * Math.sqrt(thick));
  });
}

/**
 * A torso: squarer than a ball at the shoulders, a little narrower at the
 * waist. `radius` is half the width at the shoulders, and `depth` is how deep
 * it is front to back, as a share of its width.
 */
export function torsoGeometry(radius, height, depth = 0.6) {
  return shaped((q) => {
    const around = Math.hypot(q.x, q.z) || 1;
    const square = Math.sqrt(1 - q.y * q.y) ** 0.4 / around; // pushes the sides out, so it is less of a ball
    const waist = 1 - 0.1 * Math.exp(-(((q.y + 0.45) / 0.3) ** 2));
    q.set(q.x * square * radius * waist, Math.sign(q.y) * Math.abs(q.y) ** 0.7 * (height / 2), q.z * square * radius * waist * depth);
  }, 18);
}

/** An arm or a leg: a rounded rod, `top` wide at one end and `bottom` wide at the other. */
export function limbGeometry(top, bottom, length) {
  return shaped((q) => {
    const around = Math.hypot(q.x, q.z) || 1;
    const r = THREE.MathUtils.lerp(bottom, top, (q.y + 1) / 2) * Math.sqrt(1 - q.y * q.y) ** 0.3 / around;
    q.set(q.x * r, Math.sign(q.y) * Math.abs(q.y) ** 0.8 * (length / 2), q.z * r);
  }, 8);
}

/**
 * A whole person, standing and facing us, all in one material: a head with a
 * chin, a neck, a torso, and arms and legs that narrow to hands and feet.
 * About 6.9 tall: the top of the head is near y = 3.4 and the feet near -3.5.
 */
export function createFigure(material) {
  const g = new THREE.Group();
  const add = (geo, x, y, rz = 0) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rz;
    g.add(mesh);
  };
  add(shaped((q) => q.set(q.x * 0.58 * (1 - 0.22 * Math.max(0, -q.y)), q.y * 0.66, q.z * 0.62), 8), 0, 2.75);
  add(new THREE.CapsuleGeometry(0.22, 0.3, 6, 20), 0, 2.1);
  add(torsoGeometry(0.84, 3.44, 0.62), 0, 0.7);
  for (const side of [-1, 1]) {
    add(limbGeometry(0.24, 0.14, 2.4), side * 1.12, 0.75, side * 0.16);
    add(new THREE.SphereGeometry(0.19, 20, 14).scale(0.8, 1.15, 0.6), side * 1.33, -0.55, side * 0.16); // hand
    add(limbGeometry(0.33, 0.19, 2.56), side * 0.4, -2.1, side * -0.03);
    add(new THREE.SphereGeometry(0.24, 20, 14).scale(0.95, 0.6, 1.7).translate(0, 0, 0.2), side * 0.44, -3.36); // foot
  }
  return g;
}
