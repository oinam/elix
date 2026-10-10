// Everything an explorer page shares, around its own 3D model:
// tap-to-learn parts (labels, glow, info card), the self-ticking "Try this!"
// stars, Cello, and the Labels and Pause buttons.
//
// The page lists its challenges in HTML as <li data-challenge="id">. A
// challenge called "parts" ticks itself when every part has been tapped.
import * as THREE from 'three';
import { makeLabel } from './scene.js';
import { createMascot, celebrate } from './mascot.js';
import { loadProgress, saveProgress, clearProgress } from './progress.js';

export function createExplorer({
  topic,
  parts,
  stage,
  stageEl,
  greeting,
  skins = ['membrane'], // see-through parts; taps go to whatever is inside them
  outer = [], // parts on the outside that win a tap even over a skin
  allPartsLine = `You found all ${Object.keys(parts).length} parts! You know this cell inside out.`,
}) {
  const { scene, camera, renderer } = stage;
  const pickables = [];
  const labels = [];
  const partCount = Object.keys(parts).length;
  const challenges = [...document.querySelectorAll('[data-challenge]')].map((li) => li.dataset.challenge);
  let progress = loadProgress(topic);
  const cello = createMascot(document.getElementById('mascot'));

  // ---------- Parts and labels ----------

  // hideWith: only show the label while that object is visible.
  function addLabel(key, parent, position, { hideWith = null } = {}) {
    const label = makeLabel(parts[key].name);
    label.position.copy(position);
    label.visible = false;
    label.userData.hideWith = hideWith;
    parent.add(label);
    labels.push(label);
    return label;
  }

  function tagPart(object, key) {
    object.traverse((o) => { o.userData.part = key; });
    pickables.push(object);
    return object;
  }

  function untagPart(object) {
    const i = pickables.indexOf(object);
    if (i >= 0) pickables.splice(i, 1);
  }

  const labelsButton = document.getElementById('labels');
  function showLabels() {
    const on = labelsButton?.getAttribute('aria-pressed') === 'true';
    labels.forEach((l) => { l.visible = on && (!l.userData.hideWith || l.userData.hideWith.visible); });
  }

  // ---------- Glow on the tapped part ----------

  let flash = null;
  const glowColor = new THREE.Color(0xffd166);

  function highlight(object) {
    if (flash) flash.materials.forEach((m) => m.emissive.copy(m.userData.baseEmissive));
    const materials = new Set();
    object.traverse((o) => { if (o.material?.emissive) materials.add(o.material); });
    materials.forEach((m) => { m.userData.baseEmissive ??= m.emissive.clone(); });
    flash = { materials: [...materials], time: 1.2 };
  }

  stage.onFrame((dt) => {
    if (!flash) return;
    flash.time -= dt;
    const glow = Math.max(flash.time, 0) * Math.abs(Math.sin(flash.time * 9));
    flash.materials.forEach((m) => m.emissive.copy(m.userData.baseEmissive).lerp(glowColor, Math.min(glow, 1)));
    if (flash.time <= 0) flash = null;
  });

  // ---------- Tap to learn ----------

  const infoEl = document.getElementById('info');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;

  function showInfo(key) {
    document.getElementById('info-title').textContent = parts[key].name;
    document.getElementById('info-text').textContent = parts[key].text;
    infoEl.hidden = false;
    onPartFound(key);
    document.getElementById('info-found').textContent = `⭐ ${progress.parts.length} of ${partCount} parts found`;
  }

  document.getElementById('info-close').addEventListener('click', () => { infoEl.hidden = true; });

  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    // A drag spins the camera; only a tap picks a part.
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables.filter((o) => o.visible), true)
      .filter((h) => h.object.visible && parts[h.object.userData.part]);
    if (!hits.length) return;
    const hit = outer.includes(hits[0].object.userData.part)
      ? hits[0]
      : hits.find((h) => !skins.includes(h.object.userData.part)) ?? hits[0];
    const key = hit.object.userData.part;
    // Glow the whole part, not just the piece that was hit.
    let target = hit.object;
    while (target.parent && target.parent !== scene && target.parent.userData.part === key) target = target.parent;
    showInfo(key);
    highlight(target);
  });

  // ---------- Stars ----------

  function renderProgress() {
    document.querySelectorAll('[data-challenge]').forEach((li) => {
      li.classList.toggle('done', progress.done.includes(li.dataset.challenge));
    });
    document.getElementById('try-count').textContent = `⭐ ${progress.done.length} of ${challenges.length}`;
    const partsCount = document.getElementById('parts-count');
    if (partsCount) partsCount.textContent = `(${progress.parts.length} of ${partCount})`;
  }

  // Returns true the first time a challenge is done.
  function complete(id) {
    if (progress.done.includes(id) || !challenges.includes(id)) return false;
    progress.done.push(id);
    progress.total = challenges.length;
    saveProgress(topic, progress);
    renderProgress();
    if (progress.done.length === challenges.length) {
      celebrate(stageEl, 90);
      setTimeout(() => cello.say("Every star! You're a real scientist! 🔬", { ms: 7000 }), 1200);
    } else {
      celebrate(stageEl, 24);
    }
    return true;
  }

  function onPartFound(key) {
    if (progress.parts.includes(key)) return;
    progress.parts.push(key);
    saveProgress(topic, progress);
    renderProgress();
    if (progress.parts.length === partCount && complete('parts')) {
      cello.say(allPartsLine, { mood: 'wow', ms: 5000 });
    } else {
      cello.say(`You found the ${parts[key].name.toLowerCase()}!`, { ms: 2500 });
    }
  }

  document.getElementById('reset-stars').addEventListener('click', () => {
    clearProgress(topic);
    progress = loadProgress(topic);
    renderProgress();
    cello.say("Fresh start! Let's explore again.");
  });

  // ---------- Shared buttons ----------

  if (labelsButton) bindToggle('labels', showLabels);
  if (document.getElementById('pause')) bindToggle('pause', (on) => stage.setPaused(on));

  renderProgress();
  setTimeout(() => {
    cello.say(progress.done.length ? 'Welcome back! Can you get every star?' : greeting, { ms: 6000 });
  }, 600);

  return { addLabel, tagPart, untagPart, showLabels, complete, cello };
}

// A slider with a live readout in <output id="<id>-out">. Calls onChange now
// and on every move.
export function bindSlider(id, format, onChange) {
  const input = document.getElementById(id);
  const out = document.getElementById(`${id}-out`);
  const update = () => {
    const value = Number(input.value);
    out.textContent = format(value);
    onChange(value);
  };
  input.addEventListener('input', update);
  update();
}

// A button that flips aria-pressed on each click.
export function bindToggle(id, onChange) {
  const button = document.getElementById(id);
  button.addEventListener('click', () => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    onChange(on);
  });
}
