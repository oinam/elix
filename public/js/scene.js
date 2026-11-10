// Shared 3D stage: renderer, camera, lights, orbit controls, labels, and the
// animation loop. Each organism page builds its model on top of this.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

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

// The finishing touches are drawn over the finished picture, so the picture
// itself (its colors, and how see-through things mix) stays as it was.

// Soft shading where things touch or fold (a crease, the gap between two
// parts, a thing resting on the ground). Only solid things count: see-through
// ones, flat-colored ones, and parts that are sliced open are left out, so a
// cell's membrane doesn't shade what is inside it. A page can leave a mesh out
// too (userData.noShade), for fine hairs and tangles that would only look dirty.
class ContactShadePass extends GTAOPass {
  constructor(scene, camera) {
    super(scene, camera);
    this.output = GTAOPass.OUTPUT.Off; // work the shading out; drawOver() puts it on
    this.skipped = [];
  }

  drawOver(renderer) {
    // The shadows were just drawn for this frame; don't draw them again.
    renderer.shadowMap.autoUpdate = false;
    this.render(renderer);
    renderer.shadowMap.autoUpdate = true;
    this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
    this.blendMaterial.uniforms.tDiffuse.value = this.pdRenderTarget.texture;
    this._renderPass(renderer, this.blendMaterial, null);
  }

  _overrideVisibility() {
    super._overrideVisibility();
    this.scene.traverse((o) => {
      if (!o.isMesh && !o.isSprite) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const solid = o.isMesh && m.isMeshStandardMaterial && !m.transparent && !m.clippingPlanes?.length && !o.userData.noShade;
      if (solid) return;
      this.skipped.push(o, o.layers.mask);
      o.layers.mask = 0;
    });
  }

  _restoreVisibility() {
    super._restoreVisibility();
    for (let i = 0; i < this.skipped.length; i += 2) this.skipped[i].layers.mask = this.skipped[i + 1];
    this.skipped.length = 0;
  }
}

// A gentle glow around the brightest things: a lamp, a shine on metal or glass.
class GlowPass extends UnrealBloomPass {
  constructor() {
    super(new THREE.Vector2(256, 256), 0.12, 0.4, 0.97);
    this.frame = new THREE.WebGLRenderTarget(256, 256);
  }

  setSize(width, height) {
    super.setSize(width, height);
    this.frame.setSize(width, height);
  }

  drawOver(renderer) {
    // Take a copy of the picture so far, blur its bright spots, and add them on.
    renderer.initRenderTarget(this.frame);
    renderer.setRenderTarget(null);
    renderer.copyFramebufferToTexture(this.frame.texture);
    this.render(renderer, null, this.frame);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(null);
    this._fsQuad.render(renderer);
    renderer.autoClear = autoClear;
  }
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
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    // On a sharp screen (a phone), the shading is worked out at half size: it
    // is soft anyway, and that keeps it quick.
    const part = renderer.getPixelRatio() > 1 ? 0.5 : 1;
    shade.setSize(Math.ceil(size.x * part), Math.ceil(size.y * part));
    glow.setSize(size.x, size.y);
    labelRenderer.setSize(w, h);
  }

  // The finishing touches (see the top of this file).
  const shade = new ContactShadePass(scene, camera);
  shade.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1, thickness: 1, scale: 1.25, samples: 16 });
  shade.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 10, rings: 2, samples: 16 });
  shade.blendIntensity = 1;
  const glow = new GlowPass();
  let effects = true;

  const clock = new THREE.Timer();
  const updaters = [];
  let paused = false;
  let slow = 0;
  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    // Cap the step so a hidden tab doesn't cause a huge jump on return.
    const raw = clock.update().getDelta();
    const dt = Math.min(raw, 0.05);
    // On a device that can't keep up, drop the finishing touches for good.
    if (effects && document.visibilityState === 'visible') {
      slow = raw > 0.045 ? slow + Math.min(raw, 0.25) : Math.max(0, slow - raw);
      if (slow > 1.5) effects = false; // a second and a half of slow frames
    }
    if (!paused) updaters.forEach((fn) => fn(dt));
    controls.update();
    backdrop.position.copy(camera.position);
    backdrop.material.uniforms.base.value.copy(scene.background);
    renderer.render(scene, camera);
    if (effects) {
      if (shade.enabled) shade.drawOver(renderer);
      if (glow.enabled) glow.drawOver(renderer);
    }
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
    shade,
    glow,
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
