// Shared 3D stage: renderer, camera, lights, orbit controls, labels, and the
// animation loop. Each organism page builds its model on top of this.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// See-through things (cell membranes, glass, water) get a soft bright edge,
// the way a soap bubble does: more solid where the surface turns away from
// you. It fades out with the material, so a hidden part stays hidden.
THREE.ShaderChunk.opaque_fragment = `
#if defined( STANDARD ) && ! defined( OPAQUE )
  float elixRim = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 2.2 );
  float elixOn = smoothstep( 0.02, 0.2, diffuseColor.a ) * ( 1.0 - smoothstep( 0.8, 0.98, diffuseColor.a ) );
  outgoingLight += diffuseColor.rgb * elixRim * 0.3 * elixOn;
  diffuseColor.a += ( 1.0 - diffuseColor.a ) * elixRim * 0.6 * elixOn;
#endif
${THREE.ShaderChunk.opaque_fragment}`;

// The backdrop: the stage color, lighter above and deeper below, like light
// coming down through water. It follows scene.background, so a page can still
// change that color (night, space, a storm).
function makeBackdrop() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
    fog: false,
    uniforms: { base: { value: new THREE.Color() } },
    vertexShader: `
      varying vec3 dir;
      void main() {
        dir = normalize( position );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: `
      uniform vec3 base;
      varying vec3 dir;
      void main() {
        float up = smoothstep( -0.5, 0.6, normalize( dir ).y );
        vec3 deep = base * vec3( 0.6, 0.8, 0.9 );
        // A pale color lightens toward white; a dark one stays its own color, only brighter.
        vec3 light = mix( base * 2.6, mix( base, vec3( 1.0 ), 0.45 ), smoothstep( 0.1, 0.6, base.g ) );
        gl_FragColor = vec4( mix( deep, light, up ), 1.0 );
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), material);
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  return dome;
}

// A soft round dot, for specks that drift in the water.
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

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
  // Keeps bright colors from washing out to white, without dulling the pastels.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.inset = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '1'; // under the hint, info card, and Cello
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2;
  controls.maxDistance = 16;

  // Light: a soft room all around (for gentle reflections on shiny things),
  // sky light from above, a warm sun in front, and a cool light from behind
  // that picks out edges.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xcdefff, 0x1a3346, 1.15));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
  sun.position.set(3, 6, 4);
  // Only things a page asks for cast shadows (castShadows(), addGround()).
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 24 });
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfe4ff, 0.9);
  rim.position.set(-4, 3, -5);
  scene.add(rim);

  const backdrop = makeBackdrop();
  scene.add(backdrop);

  // On tall, narrow screens (phones), widen the view so the scene still
  // fits from side to side instead of being cut off.
  const FOV = 45;
  const MIN_ASPECT = 1.2;
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    camera.aspect = w / h;
    camera.fov = camera.aspect >= MIN_ASPECT
      ? FOV
      : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * MIN_ASPECT / camera.aspect));
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  const clock = new THREE.Timer();
  const updaters = [];
  let paused = false;

  renderer.setAnimationLoop(() => {
    // Cap the step so a hidden tab doesn't cause a huge jump on return.
    const dt = Math.min(clock.update().getDelta(), 0.05);
    if (!paused) updaters.forEach((fn) => fn(dt));
    controls.update();
    backdrop.position.copy(camera.position);
    backdrop.material.uniforms.base.value.copy(scene.background);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  // Solid things under `root` cast a shadow (see-through ones don't).
  function castShadows(root) {
    root.traverse((o) => {
      if (o.isMesh && !o.material.transparent && o.material.visible !== false) o.castShadow = true;
    });
  }

  // For scenes of solid things on the ground (a town, a tree, a table): every
  // solid thing casts a shadow and catches them, including things added later.
  // `size` is how far from the middle the shadows reach.
  function autoShadows(size = 8) {
    // From the side, so the shadows fall beside things, where you can see them.
    sun.position.set(5, 8, 1.5).setLength(size * 2.2);
    Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, far: size * 5 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.normalBias = 0.004 * size;
    const mark = () => scene.traverse((o) => {
      if (!o.isMesh || o === backdrop || o.userData.noShadow) return;
      const solid = !o.material.transparent && !o.material.isMeshBasicMaterial && !o.material.isShadowMaterial;
      o.castShadow = solid;
      o.receiveShadow = solid || o.material.isShadowMaterial;
    });
    queueMicrotask(mark); // once the page has built its scene
    setInterval(mark, 400);
  }

  // An invisible floor at height y that only shows the shadows falling on it.
  function addGround(y = 0, size = 30) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = y;
    ground.receiveShadow = true;
    scene.add(ground);
    return ground;
  }

  // Tiny specks drifting slowly upward, so water looks deep and alive.
  function addMotes({ count = 70, spread = [14, 8, 10], size = 0.09, opacity = 0.5 } = {}) {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) positions[i * 3 + k] = (Math.random() - 0.5) * spread[k];
      speeds[i] = 0.04 + Math.random() * 0.1;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const motes = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: dotTexture(), size, transparent: true, opacity, depthWrite: false,
    }));
    motes.frustumCulled = false;
    scene.add(motes);
    let t = 0;
    updaters.push((dt) => {
      t += dt;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += speeds[i] * dt;
        positions[i * 3] += Math.sin(t * 0.5 + i) * 0.02 * dt;
        if (positions[i * 3 + 1] > spread[1] / 2) positions[i * 3 + 1] = -spread[1] / 2;
      }
      geometry.attributes.position.needsUpdate = true;
    });
    return motes;
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    sun,
    castShadows,
    autoShadows,
    addGround,
    addMotes,
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
