// Gets the 3D code coming early. Loaded as a plain script in <head>, on every page.
// A topic page asks for all of its shared modules at once, instead of finding
// them one after another as each file arrives. A menu page fetches Three.js
// while she reads, so her first topic opens faster.
// Keep the version the same as the import map in every topic page (npm test checks).
(function () {
  const CDN = 'https://cdn.jsdelivr.net/npm/three@0.186.1/';
  const THREE = ['build/three.module.min.js', 'build/three.core.min.js'];
  // What js/scene.js imports, and what those import.
  const ADDONS = [
    'controls/OrbitControls.js', 'renderers/CSS2DRenderer.js', 'environments/RoomEnvironment.js',
    'postprocessing/GTAOPass.js', 'postprocessing/UnrealBloomPass.js', 'postprocessing/Pass.js',
    'shaders/GTAOShader.js', 'shaders/PoissonDenoiseShader.js', 'shaders/CopyShader.js',
    'shaders/LuminosityHighPassShader.js', 'math/SimplexNoise.js',
  ];
  const OURS = ['scene.js', 'explorer.js', 'materials.js', 'mascot.js', 'voice.js', 'progress.js', 'ask.js'];

  const here = document.currentScript.src;
  const topic = /\/(topics|organisms)\//.test(location.pathname);
  const add = (rel, href) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  };

  THREE.forEach((f) => add(topic ? 'modulepreload' : 'prefetch', CDN + f));
  if (!topic) return;
  ADDONS.forEach((f) => add('modulepreload', CDN + 'examples/jsm/' + f));
  OURS.forEach((f) => add('modulepreload', new URL(f, here).href));
})();
