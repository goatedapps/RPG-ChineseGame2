import * as THREE from './vendor/three.module.min.js';

const LOOK_RATE = .0031;
const MAX_PITCH = Math.PI * .43;
const MOVE_SPEED = 3;
const BODY_RADIUS = .29;
const EYE_HEIGHT = 1.62;
const REACH = 3.2;

const moveKeys = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const lookKeys = {
  KeyI: [0, -1], KeyK: [0, 1], KeyJ: [-1, 0], KeyL: [1, 0],
};

function overlaps(x, z, colliders) {
  return colliders.some(({ minX, minZ, maxX, maxZ }) => {
    const closestX = THREE.MathUtils.clamp(x, minX, maxX);
    const closestZ = THREE.MathUtils.clamp(z, minZ, maxZ);
    return (x - closestX) ** 2 + (z - closestZ) ** 2 < BODY_RADIUS ** 2;
  });
}

function controlInput(target) {
  return target instanceof Element && target.closest('input, textarea, select, [contenteditable]');
}

function present(object) {
  for (let item = object; item; item = item.parent) {
    if (!item.visible) return false;
  }
  return true;
}

function blocksSight(hit) {
  const { object } = hit;
  if (object.userData.nonOccluding) return false;
  const material = Array.isArray(object.material) ? object.material[hit.face?.materialIndex] : object.material;
  return Boolean(material?.visible && (!material.transparent || material.opacity >= .78));
}

function sleepEngine() {
  const noop = () => {};
  return {
    setActive: noop, setGameState: noop, interact: noop, setVector: noop,
    look: noop, reset: noop, focus: noop, getSelected: () => null,
  };
}

export function createEngine({
  canvas, worldFactory, onTarget = () => {}, onInteract = () => {},
  onMove = () => {}, onLook = () => {}, onStatus = () => {},
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'),
}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, powerPreference: 'high-performance',
    });
  } catch {
    onStatus({ type: 'unsupported', message: '这台设备暂时无法显示三维场景。请换一个支持 WebGL 2 的浏览器再试。' });
    return sleepEngine();
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const { scene, targets, colliders, spawn, update, ready } = worldFactory(THREE);
  const camera = new THREE.PerspectiveCamera(65, 1, .065, 110);
  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH;
  const screenCenter = new THREE.Vector2(0, 0);
  const touchDirection = new THREE.Vector2();
  const velocity = new THREE.Vector2();
  const keys = new Set();
  const targetObjects = new Map();
  const meshes = [];
  for (const [id, target] of targets) targetObjects.set(target.object, { id, label: target.label ?? id });
  scene.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });

  let active = false;
  let rendering = true;
  let selected = null;
  let state = { used: new Set(), completed: 0 };
  let drag = null;
  let yaw = spawn.yaw ?? 0;
  let pitch = spawn.pitch ?? -.022;
  let nextRay = 0;
  let previous = 0;
  let stride = 0;
  let bob = 0;

  function applyView() {
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.updateMatrixWorld();
  }

  function reset() {
    keys.clear();
    velocity.set(0, 0);
    touchDirection.set(0, 0);
    drag = null;
    yaw = spawn.yaw ?? 0;
    pitch = spawn.pitch ?? -.022;
    stride = 0;
    bob = 0;
    camera.position.set(spawn.x, EYE_HEIGHT, spawn.z);
    applyView();
    choose(null);
    nextRay = 0;
  }
  reset();

  function targetFor(object) {
    for (let item = object; item; item = item.parent) {
      if (targetObjects.has(item)) return targetObjects.get(item);
    }
    return null;
  }

  function scan() {
    raycaster.setFromCamera(screenCenter, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      if (!present(hit.object)) continue;
      const target = targetFor(hit.object);
      if (target) return { ...target, distance: hit.distance };
      if (blocksSight(hit)) break;
    }
    return null;
  }

  function projectTarget(id) {
    const object = targets.get(id)?.object;
    if (!object || !present(object)) return null;
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return null;
    const center = bounds.getCenter(new THREE.Vector3());
    camera.updateMatrixWorld();
    const top = center.clone().setY(bounds.max.y).project(camera);
    const bottom = center.clone().setY(bounds.min.y).project(camera);
    const point = center.project(camera);
    if (Math.abs(point.z) > 1) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
      height: Math.abs(top.y - bottom.y) * rect.height / 2,
    };
  }

  function choose(next) {
    const changed = selected?.id !== next?.id;
    selected = next;
    if (changed) onTarget(selected);
  }

  function interact() {
    if (!active || !rendering) return false;
    choose(scan());
    if (!selected) return false;
    onInteract(selected);
    return true;
  }

  function releaseInput() {
    keys.clear();
    touchDirection.set(0, 0);
    drag = null;
  }

  function setActive(nextActive) {
    const next = Boolean(nextActive);
    if (next === active) return;
    active = next;
    releaseInput();
    velocity.set(0, 0);
    if (!next) {
      choose(null);
      if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    } else {
      nextRay = 0;
    }
  }

  function look(dx, dy) {
    if (!active || !rendering || !Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) return;
    yaw -= THREE.MathUtils.clamp(dx, -240, 240) * LOOK_RATE;
    pitch = THREE.MathUtils.clamp(pitch - THREE.MathUtils.clamp(dy, -240, 240) * LOOK_RATE, -MAX_PITCH, MAX_PITCH);
    applyView();
    onLook({ dx, dy });
  }

  function setVector(x, y) {
    if (!active || !rendering || !Number.isFinite(x) || !Number.isFinite(y)) return;
    touchDirection.set(x, y).clampLength(0, 1);
  }

  function requestLock() {
    if (!active || !rendering || !canvas.requestPointerLock || document.pointerLockElement === canvas) return;
    try {
      canvas.requestPointerLock()?.catch(() => {});
    } catch {
      // Browsers can deny pointer lock while still accepting drag controls.
    }
  }

  function focus(lock = true) {
    canvas.focus({ preventScroll: true });
    if (lock && window.matchMedia('(pointer: fine)').matches) requestLock();
  }

  window.addEventListener('keydown', (event) => {
    if (!active || event.metaKey || event.ctrlKey || event.altKey || controlInput(event.target)) return;
    if (event.code === 'KeyE') {
      event.preventDefault();
      if (!event.repeat) interact();
    } else if (moveKeys[event.code] || lookKeys[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', releaseInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseInput();
  });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) drag = null;
    else releaseInput();
  });
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === canvas) look(event.movementX, event.movementY);
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!active || !rendering || drag || event.button !== 0) return;
    event.preventDefault();
    if (document.pointerLockElement === canvas) {
      interact();
      return;
    }
    focus(false);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    if (event.pointerType === 'mouse') requestLock();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId || document.pointerLockElement === canvas) return;
    const gain = event.pointerType === 'touch' ? 1.35 : 1;
    look((event.clientX - drag.x) * gain, (event.clientY - drag.y) * gain);
    if (drag) {
      drag.x = event.clientX;
      drag.y = event.clientY;
    }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, (event) => {
      if (drag?.id === event.pointerId) drag = null;
    });
  }
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    rendering = false;
    releaseInput();
    velocity.set(0, 0);
    choose(null);
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
    onStatus({ type: 'contextlost', message: '三维场景已暂停，等待图形恢复。' });
  });
  canvas.addEventListener('webglcontextrestored', () => {
    rendering = true;
    nextRay = 0;
    onStatus({ type: 'contextrestored', message: '画面已恢复。' });
  });

  const move = new THREE.Vector2();
  const keyMove = new THREE.Vector2();
  function tickMovement(dt, quiet) {
    move.copy(touchDirection);
    keyMove.set(0, 0);
    for (const key of keys) {
      const direction = moveKeys[key];
      if (direction) {
        keyMove.x += direction[0];
        keyMove.y += direction[1];
      }
      const turn = lookKeys[key];
      if (turn) look(turn[0] * dt * 510, turn[1] * dt * 510);
    }
    move.add(keyMove.clampLength(0, 1)).clampLength(0, 1);
    const damp = 1 - Math.exp(-dt * (move.lengthSq() > 0 ? 14 : 22));
    velocity.x += (move.x * MOVE_SPEED - velocity.x) * damp;
    velocity.y += (move.y * MOVE_SPEED - velocity.y) * damp;

    const { x, z } = camera.position;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const nextX = x + (velocity.x * cos - velocity.y * sin) * dt;
    if (!overlaps(nextX, z, colliders)) camera.position.x = nextX;
    const nextZ = z - (velocity.x * sin + velocity.y * cos) * dt;
    if (!overlaps(camera.position.x, nextZ, colliders)) camera.position.z = nextZ;

    const distance = Math.hypot(camera.position.x - x, camera.position.z - z);
    if (distance > .003) {
      stride += distance;
      onMove({ distance, x: camera.position.x, z: camera.position.z });
    }
    const bobTarget = quiet ? 0 : Math.sin(stride * 6.5) * Math.min(.018, distance * .33);
    bob = quiet ? 0 : THREE.MathUtils.lerp(bob, bobTarget, damp);
    camera.position.y = EYE_HEIGHT + bob;
  }

  let width = 0;
  let height = 0;
  function resize() {
    const availableWidth = canvas.clientWidth || 1;
    const availableHeight = canvas.clientHeight || 1;
    if (width === availableWidth && height === availableHeight) return;
    width = availableWidth;
    height = availableHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2200000 / (width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(canvas);
  resize();

  function quietMotion() {
    if (typeof reducedMotion === 'function') return reducedMotion();
    if (typeof reducedMotion === 'boolean') return reducedMotion;
    return Boolean(reducedMotion?.matches);
  }

  function frame(now) {
    const dt = Math.min(.045, Math.max(0, (now - (previous || now)) / 1000));
    previous = now;
    if (!rendering) return;
    const quiet = quietMotion();
    if (active) tickMovement(dt, quiet);
    state.reducedMotion = quiet;
    update?.(dt, state, camera);
    renderer.render(scene, camera);
    if (active && now >= nextRay) {
      nextRay = now + 66;
      choose(scan());
    }
  }
  function show() {
    renderer.setAnimationLoop(frame);
  }

  return {
    show, ready, setActive, interact, setVector, look, reset, focus, projectTarget,
    setGameState(next) {
      state = { ...next };
      nextRay = 0;
    },
    getSelected: () => selected,
  };
}
