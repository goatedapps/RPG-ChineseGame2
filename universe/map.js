import * as T from '../greenhouse/vendor/three.module.min.js';
import { createHintPortal } from '../shared/hint-portal.js';

const V = (x, y, z) => new T.Vector3(x, y, z);
const UP = V(0, 1, 0);
const clamp = T.MathUtils.clamp;
const doubleTapWindow = 500;
const access = (world) =>
  world.status === 'open' || world.status === 'complete';

function orbitalPosition(number) {
  if (number === 1) return V(0, 0, 0);
  const rank = number - 1;
  const angle = 0.72 + rank * 0.72;
  const radius = 6.4 + rank * 0.55;
  return V(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function makeRing(radius, thickness, hue, opacity) {
  const mat = new T.MeshBasicMaterial({
    color: hue,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const ring = new T.Mesh(new T.TorusGeometry(radius, thickness, 6, 64), mat);
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function makeLabel(text, { width, height, fontSize, muted = false }) {
  const sheet = document.createElement('canvas');
  const ctx = sheet.getContext('2d');
  const font = 'bold ' + fontSize + 'px system-ui, sans-serif';
  ctx.font = font;
  sheet.width = width ?? Math.ceil(ctx.measureText(text).width + 76);
  sheet.height = height;
  ctx.beginPath();
  ctx.roundRect(10, 10, sheet.width - 20, height - 20, (height - 20) / 2);
  ctx.fillStyle = '#18172edb';
  ctx.fill();
  ctx.strokeStyle = muted ? '#70708c' : '#eec793';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = muted ? '#c0bcd1' : '#ffe7b9';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, sheet.width / 2, height / 2);
  return new T.Sprite(
    new T.SpriteMaterial({
      map: new T.CanvasTexture(sheet),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
}

function randomStars() {
  const positions = [];
  let seed = 613;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < 860; i++)
    positions.push(
      (random() - 0.5) * 145,
      random() * 48 - 25,
      (random() - 0.5) * 145,
    );
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  return new T.Points(
    geometry,
    new T.PointsMaterial({
      color: 0xc8bcff,
      size: 0.19,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
}

export function createUniverse(
  canvas,
  level,
  worlds,
  { onNearby, onActivate, planetImages },
) {
  const renderer = new T.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.45));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(52, 1, 0.06, 170);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const loader = new T.TextureLoader();
  const accent = level.accent;
  const textures = [];
  const starfield = randomStars();
  scene.add(starfield);
  const planetMaps = planetImages.map((image) => {
    const texture = loader.load(
      new URL('./art/' + image, import.meta.url).href,
    );
    texture.colorSpace = T.SRGBColorSpace;
    textures.push(texture);
    return texture;
  });
  const gradeTexture = planetImages.indexOf(level.image);
  const hover = new T.Vector3();
  const screenUp = new T.Vector3();
  const stick = new T.Vector2();
  const velocity = new T.Vector3();
  const player = new T.Group();
  const start = V(0, 0, 4.9);
  const viewFocus = start.clone();
  player.position.copy(start);
  const body = new T.Mesh(
    new T.OctahedronGeometry(0.33),
    new T.MeshBasicMaterial({ color: 0xffe5aa }),
  );
  body.position.y = 0.37;
  const border = makeRing(0.51, 0.022, 0xffd99a, 0.91);
  border.position.y = 0.07;
  player.add(body, border);
  scene.add(player);
  for (const radius of [3.75, 7.4, 11.8, 16.3]) {
    scene.add(makeRing(radius, 0.014, accent, 0.2));
  }

  const entries = new Map();
  for (const world of worlds) {
    const root = new T.Group();
    root.position.copy(orbitalPosition(world.number));
    const ready = access(world);
    const main = world.number === 1;
    const planet = new T.Sprite(
      new T.SpriteMaterial({
        map: planetMaps[
          (gradeTexture + (main ? 0 : world.number - 1)) % planetMaps.length
        ],
        color: ready
          ? 0xffffff
          : world.status === 'building'
            ? 0x9b899b
            : 0x6c6f97,
        transparent: true,
        opacity: ready ? 1 : 0.78,
        depthWrite: false,
        alphaTest: 0.025,
      }),
    );
    planet.position.y = main ? 2.12 : 1.7;
    planet.scale.setScalar(main ? 4.4 : 3.12 + (world.number % 5) * 0.14);
    root.add(planet);
    const ring = makeRing(
      main ? 2.32 : 1.86,
      ready ? 0.041 : 0.021,
      ready ? accent : 0x8179a5,
      ready ? 0.93 : 0.46,
    );
    ring.position.y = 0.02;
    root.add(ring);
    const orbit = makeRing(
      main ? 2.68 : 2.13,
      0.018,
      accent,
      ready ? 0.66 : 0.25,
    );
    orbit.position.y = -0.12;
    root.add(orbit);
    const label = makeLabel(String(world.number).padStart(2, '0'), {
      width: 128,
      height: 64,
      fontSize: 25,
      muted: world.status === 'locked',
    });
    label.scale.set(1.08, 0.54, 1);
    root.add(label);
    let name;
    if (world.href) {
      name = makeLabel(world.title, { height: 76, fontSize: 46 });
      const artwork = name.material.map.image;
      const scale = Math.min(1 / 155, (planet.scale.x * 0.65) / artwork.width);
      name.scale.set(artwork.width * scale, artwork.height * scale, 1);
      name.renderOrder = 1;
      name.visible = false;
      root.add(name);
    }
    scene.add(root);
    entries.set(world.number, {
      world,
      root,
      planet,
      ring,
      orbit,
      label,
      name,
      object: root,
      hintAnchor: [0, 1.87, 0],
    });
    planet.userData.worldNumber = world.number;
  }
  const routeGeometry = new T.BufferGeometry().setFromPoints(
    [...entries.values()].map(({ root }) =>
      root.position.clone().add(V(0, 0.06, 0)),
    ),
  );
  const route = new T.Line(
    routeGeometry,
    new T.LineDashedMaterial({
      color: accent,
      transparent: true,
      opacity: 0.48,
      dashSize: 0.37,
      gapSize: 0.25,
    }),
  );
  route.computeLineDistances();
  scene.add(route);
  const showHint = createHintPortal(T, scene, entries);
  const portals = [...entries.values()].map(({ planet }) => planet);
  const ray = new T.Raycaster();
  const cursor = new T.Vector2();
  const keys = new Set();
  const keyNames = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
  };
  let lastFrame = 0;
  let elapsed = 0;
  let raf;
  let pointer;
  let pendingTap;
  let nearby;
  let target;
  let travelPosition;
  let leaving = false;
  let frameZoom = 1;
  let heading = 0;
  let tilt = 0;

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function clearTap() {
    clearTimeout(pendingTap?.timer);
    pendingTap = undefined;
  }

  function flyTo(number) {
    clearTap();
    if (leaving) return;
    const item = entries.get(number);
    if (!item) return;
    target = number;
    travelPosition = item.root.position
      .clone()
      .add(V(0, 0, 2.18).applyAxisAngle(UP, heading));
    if (reduce.matches) player.position.copy(travelPosition);
  }

  function startGesture(id, type, x, y) {
    if (leaving || pointer) return false;
    pointer = { id, type, startX: x, startY: y, x, y, dragged: false };
    return true;
  }
  function ownsGesture(id, type) {
    return pointer?.id === id && pointer.type === type;
  }
  function gestureDistance(x, y) {
    return Math.hypot(x - pointer.startX, y - pointer.startY);
  }
  function moveGesture(x, y) {
    if (leaving) return;
    if (!pointer.dragged) {
      if (gestureDistance(x, y) < 8) return;
      pointer.dragged = true;
      travelPosition = null;
      clearTap();
    }
    heading -= (x - pointer.x) * 0.006;
    tilt = clamp(tilt + (y - pointer.y) * 0.005, -0.42, 0.47);
    pointer.x = x;
    pointer.y = y;
  }
  function cancelGesture() {
    pointer = null;
    clearTap();
  }
  function endGesture(x, y, timeStamp) {
    const isTap = !pointer.dragged && gestureDistance(x, y) < 8;
    const { type } = pointer;
    pointer = null;
    if (!isTap || leaving) return;
    const box = canvas.getBoundingClientRect();
    cursor.set(
      ((x - box.left) * 2) / box.width - 1,
      1 - ((y - box.top) * 2) / box.height,
    );
    ray.setFromCamera(cursor, camera);
    const hit = ray.intersectObjects(portals).find(({ uv }) =>
      uv && Math.hypot(uv.x - 0.5, uv.y - 0.5) <= 0.5,
    );
    const picked = hit?.object.userData.worldNumber;
    if (!picked) {
      clearTap();
      return;
    }
    if (pendingTap?.number === picked && pendingTap.type === type &&
        timeStamp <= pendingTap.deadline) {
      clearTap();
      onActivate(entries.get(picked).world);
      return;
    }
    clearTap();
    // Delay the single-tap flight so the planet stays under the second tap.
    pendingTap = {
      number: picked,
      type,
      deadline: timeStamp + doubleTapWindow,
      timer: setTimeout(() => flyTo(picked), doubleTapWindow),
    };
  }
  function cancelPointer(event) {
    if (event.pointerType !== 'touch' && ownsGesture(event.pointerId, event.pointerType))
      cancelGesture();
  }
  const pointerEvents = {
    pointerdown(event) {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (startGesture(event.pointerId, event.pointerType, event.clientX, event.clientY))
        canvas.setPointerCapture(event.pointerId);
    },
    pointermove(event) {
      if (event.pointerType !== 'touch' && ownsGesture(event.pointerId, event.pointerType))
        moveGesture(event.clientX, event.clientY);
    },
    pointerup(event) {
      if (event.pointerType !== 'touch' && ownsGesture(event.pointerId, event.pointerType))
        endGesture(event.clientX, event.clientY, event.timeStamp);
    },
    pointercancel: cancelPointer,
    lostpointercapture: cancelPointer,
  };
  function handleTouch(event, action) {
    const contact = Array.from(event.changedTouches).find(({ identifier }) =>
      ownsGesture(identifier, 'touch'),
    );
    if (!contact) return;
    if (event.cancelable) event.preventDefault();
    action(contact.clientX, contact.clientY, event.timeStamp);
  }
  const touchEvents = {
    touchstart(event) {
      const { identifier, clientX, clientY } = event.changedTouches[0];
      if (startGesture(identifier, 'touch', clientX, clientY) && event.cancelable)
        event.preventDefault();
    },
    touchmove: (event) => handleTouch(event, moveGesture),
    touchend: (event) => handleTouch(event, endGesture),
    touchcancel: (event) => handleTouch(event, cancelGesture),
  };
  // Handle touch directly so camera gestures do not depend on pointer capture.
  const canvasEvents = Object.entries({ ...pointerEvents, ...touchEvents });
  for (const [type, handler] of canvasEvents) {
    canvas.addEventListener(type, handler, { passive: false });
  }

  function setKey(event, held) {
    if (!keyNames[event.code]) return;
    if (
      held &&
      (event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        document.querySelector('dialog[open]'))
    )
      return;
    event.preventDefault();
    if (held) keys.add(keyNames[event.code]);
    else keys.delete(keyNames[event.code]);
  }
  const down = (event) => setKey(event, true);
  const up = (event) => setKey(event, false);
  function stopInput() {
    cancelGesture();
    keys.clear();
    stick.set(0, 0);
  }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', stopInput);

  function updateNearest() {
    if (leaving) return;
    let distance = 3.05;
    let closest;
    for (const [id, item] of entries) {
      const ahead = item.root.position.distanceTo(player.position);
      if (ahead < distance) {
        closest = id;
        distance = ahead;
      }
    }
    if (closest !== nearby) {
      nearby = closest;
      onNearby(entries.get(nearby)?.world);
    }
  }

  function updateWorlds(nextWorlds) {
    for (const world of nextWorlds) {
      const item = entries.get(world.number);
      if (item.world.status === world.status) continue;
      const ready = access(world);
      item.world = world;
      item.planet.material.color.setHex(ready ? 0xffffff : world.status === 'building' ? 0x9b899b : 0x6c6f97);
      item.planet.material.opacity = ready ? 1 : .78;
      item.ring.material.color.setHex(ready ? accent : 0x8179a5);
      item.ring.material.opacity = ready ? .93 : .46;
      item.orbit.material.opacity = ready ? .66 : .25;
      item.ring.geometry.dispose();
      item.ring.geometry = new T.TorusGeometry(world.number === 1 ? 2.32 : 1.86, ready ? .041 : .021, 6, 64);
      const label = makeLabel(String(world.number).padStart(2, '0'), {
        width: 128, height: 64, fontSize: 25, muted: world.status === 'locked',
      });
      item.label.material.map.dispose();
      item.label.material.map = label.material.map;
      label.material.dispose();
    }
    onNearby(entries.get(nearby)?.world);
  }

  function frame(now) {
    const dt = Math.min(0.11, (now - (lastFrame || now)) / 1000);
    lastFrame = now;
    elapsed += dt;
    if (!leaving) {
      const x = stick.x + Number(keys.has('right')) - Number(keys.has('left'));
      const forward =
        stick.y + Number(keys.has('up')) - Number(keys.has('down'));
      velocity
        .set(x, 0, -forward)
        .clampLength(0, 1)
        .applyAxisAngle(UP, heading);
      if (velocity.lengthSq() > 0.01) travelPosition = null;
      if (travelPosition) {
        velocity.copy(travelPosition).sub(player.position);
        const length = velocity.length();
        if (length < 0.14) {
          player.position.copy(travelPosition);
          travelPosition = null;
          velocity.set(0, 0, 0);
        } else velocity.normalize();
      }
      player.position.addScaledVector(
        velocity,
        dt * (travelPosition ? 10 : 5.6),
      );
      player.position.x = clamp(player.position.x, -17.5, 17.5);
      player.position.z = clamp(player.position.z, -17.5, 17.5);
      updateNearest();
    }
    const item = entries.get(leaving ? target : nearby);
    hover.copy(leaving && item ? item.root.position : player.position);
    if (!leaving) {
      hover.x -= Math.sin(heading) * 1.65;
      hover.z -= Math.cos(heading) * 1.65;
    }
    viewFocus.lerp(hover, reduce.matches ? 1 : Math.min(1, dt * 4.5));
    const portrait = camera.aspect < 1;
    const height = portrait ? 13.65 : 11.75;
    const depth = portrait ? 13.8 * 1.19 : 13.8;
    const distance = Math.hypot(height, depth) * frameZoom;
    const elevation = Math.atan2(height, depth) + tilt;
    const horizontal = distance * Math.cos(elevation);
    camera.position.set(
      viewFocus.x + Math.sin(heading) * horizontal,
      viewFocus.y + distance * Math.sin(elevation),
      viewFocus.z + Math.cos(heading) * horizontal,
    );
    camera.up.copy(UP);
    camera.lookAt(viewFocus);
    if (!reduce.matches) {
      starfield.rotation.y = elapsed * 0.013;
      body.rotation.y = elapsed * 1.1;
      body.position.y = 0.37 + Math.sin(elapsed * 2.9) * 0.09;
      for (const [id, { planet, orbit }] of entries) {
        planet.position.y =
          (id === 1 ? 2.12 : 1.7) + Math.sin(elapsed * 1.7 + id) * 0.13;
        orbit.scale.setScalar(1 + Math.sin(elapsed * 1.6 + id) * 0.045);
      }
    }
    showHint(
      leaving ? target : item && access(item.world) ? nearby : null,
      camera,
      elapsed,
      !reduce.matches,
    );
    screenUp.copy(UP).applyQuaternion(camera.quaternion);
    for (const [id, { world, planet, label, name }] of entries) {
      label.position.copy(planet.position)
        .addScaledVector(screenUp, -(planet.scale.y / 2 + 0.24));
      if (name) {
        name.visible = !leaving && id === nearby && access(world);
        if (name.visible) {
          name.position.copy(planet.position)
            .addScaledVector(screenUp, planet.scale.y * 0.18);
        }
      }
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    flyTo,
    updateWorlds,
    stopInput,
    setStick(x, forward) {
      stick.set(x, forward);
    },
    warp(number) {
      leaving = true;
      target = number;
      stopInput();
      if (!reduce.matches && window.gsap) {
        const magnification = { value: 1 };
        window.gsap.to(magnification, {
          value: 0.27,
          duration: 0.72,
          ease: 'power3.in',
          onUpdate: () => {
            frameZoom = magnification.value;
          },
        });
      }
    },
    destroy() {
      clearTap();
      cancelAnimationFrame(raf);
      observer.disconnect();
      for (const [type, handler] of canvasEvents) {
        canvas.removeEventListener(type, handler);
      }
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', stopInput);
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        if (obj.material?.map && !textures.includes(obj.material.map))
          obj.material.map.dispose();
        obj.material?.dispose();
      });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    },
  };
}
