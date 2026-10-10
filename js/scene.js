// Shared 3D stage: renderer, camera, lights, orbit controls, labels, and the
// animation loop. Each organism page builds its model on top of this.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createStage(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0x000000, 14, 30);

  // The water color comes from the page theme (--stage-bg in css/style.css).
  window.elixTheme.watch(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').trim();
    scene.background.set(color);
    scene.fog.color.set(color);
  });

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 3, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 16;

  scene.add(new THREE.HemisphereLight(0xcdefff, 0x1a3346, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 6, 4);
  scene.add(sun);

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Clock();
  const updaters = [];
  let paused = false;

  renderer.setAnimationLoop(() => {
    // Cap the step so a hidden tab doesn't cause a huge jump on return.
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!paused) updaters.forEach((fn) => fn(dt));
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    onFrame: (fn) => updaters.push(fn),
    setPaused: (value) => { paused = value; },
    isPaused: () => paused,
  };
}

export function makeLabel(text) {
  const el = document.createElement('div');
  el.className = 'label';
  el.textContent = text;
  return new CSS2DObject(el);
}
