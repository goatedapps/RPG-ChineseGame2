import { createHintPortal } from '../shared/hint-portal.js';
import { art, arrival, objects } from './story.js?v=market-games';
import { buildArchitecture, roofCorridorPosts, roofHeight, squareLanternPosts, squareStallZ } from './architecture.js?v=districts';

export const checkpoints = [
  arrival, { x: 0, z: -10.4 }, { x: 0, z: -17.5 },
  { x: 0, z: -30.5 }, { x: 2, z: -42, yaw: -1.1 },
  { x: 2, z: 5.3, yaw: -.36, pitch: -.07 },
];

const districts = [
  { width: 17, depth: 18, x: 0, z: 0, color: '#dfae8d', paving: 'square-paving' },
  { width: 6, depth: 20, x: 0, z: -19, color: '#636c8e' },
  { width: 20, depth: 22, x: 0, z: -40, color: '#92bbb1', paving: 'market-paving' },
  { width: 24, depth: 16, x: 29, y: roofHeight, z: -42, color: '#93818e' },
];
const ramp = { width: 7, depth: 6, x: 13.5, z: -44 };
function limits({ width, depth, x, z }) {
  return { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
}
function within(rect, x, z) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}
const walkways = [...districts, ramp].map(limits);
function groundHeight(x, z) {
  if (x >= 17) return roofHeight;
  return z >= -47 && z <= -41 ? Math.max(0, x - 10) * roofHeight / 7 : 0;
}

function makeSky(THREE) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      dawn: { value: 0 },
      upper: { value: new THREE.Color('#171932') },
      horizon: { value: new THREE.Color('#565078') },
      sunrise: { value: new THREE.Color('#b26868') },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 direction;
      uniform vec3 upper, horizon, sunrise;
      uniform float dawn;
      void main() {
        vec3 dir = normalize(direction);
        float height = smoothstep(-0.04, 0.67, dir.y);
        float morning = dawn * pow(max(0.0, dot(dir, normalize(vec3(1.0,0.12,-0.4)))), 3.0);
        vec3 color = mix(mix(horizon, sunrise, morning), upper, height);
        float moon = 1.0 - smoothstep(0.014, 0.017, distance(dir, normalize(vec3(-.29,.44,-.8))));
        color += moon * vec3(.80,.71,.54) * (1.0 - .4 * dawn);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(75, 32, 22), material);
  mesh.renderOrder = -10;
  mesh.raycast = () => {};
  return mesh;
}

export function buildShadowMarket(THREE, resume = 0) {
  const scene = new THREE.Scene();
  const sky = makeSky(THREE);
  scene.add(sky);
  scene.fog = new THREE.FogExp2('#4b4462', .0215);
  const loader = new THREE.TextureLoader();
  const loads = [];
  const textures = new Map();
  function texture(url) {
    if (!textures.has(url)) {
      const map = new THREE.Texture();
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      textures.set(url, map);
      loads.push(loader.loadAsync(url).then((loaded) => {
        map.image = loaded.image;
        map.needsUpdate = true;
      }).catch(() => {}));
    }
    return textures.get(url);
  }

  const standard = (color, source, extra = {}) => new THREE.MeshStandardMaterial({
    color, map: texture(art(source)), roughness: .86, ...extra,
  });
  const materials = {
    timber: standard('#bda0a3', 'world-timber'),
    roofTile: standard('#9ca0bc', 'world-tile'),
    plaster: standard('#afa9c5', 'world-plaster'),
    lattice: standard('#bd99a4', 'world-lattice', { emissive: '#4e2520', emissiveIntensity: .25 }),
    squareSilk: standard('#ffb898', 'square-silk', { side: THREE.DoubleSide, emissive: '#491a10', emissiveIntensity: .32 }),
    marketCloth: standard('#91c2ad', 'market-canopy', { side: THREE.DoubleSide, emissive: '#14342d', emissiveIntensity: .31 }),
    brick: standard('#a2a1ba', 'world-brick'),
    lantern: standard('#ffd58d', 'world-cloth', { emissive: '#e98938', emissiveIntensity: 1.65 }),
    violet: standard('#b4c6ff', 'world-plaster', { emissive: '#666bff', emissiveIntensity: 1.32 }),
    jade: standard('#b7ffe0', 'market-canopy', { emissive: '#72dfae', emissiveIntensity: 1.31 }),
  };
  const anchors = buildArchitecture(THREE, scene, materials);
  function box(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }
  districts.forEach(({ width, depth, x, y = 0, z, color, paving = 'stone' }) => {
    const tiles = texture(art(paving)).clone();
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(width / 3.9, depth / 3.9);
    const surface = new THREE.MeshStandardMaterial({ color, map: tiles, roughness: .64, metalness: .16 });
    box(width, .3, depth, x, y - .15, z, surface);
  });
  const rampAngle = Math.atan2(roofHeight, ramp.width);
  box(Math.hypot(ramp.width, roofHeight), .2, ramp.depth, ramp.x,
    roofHeight / 2 - .1 / Math.cos(rampAngle), ramp.z, materials.timber).rotation.z = rampAngle;
  box(95, .55, 106, 18, -5.3, -34, materials.brick);

  const colliders = [];
  const xs = [...new Set([-15, 46, ...walkways.flatMap(({ minX, maxX }) => [minX, maxX])])].sort((a,b) => a-b);
  const zs = [...new Set([-57, 15, ...walkways.flatMap(({ minZ, maxZ }) => [minZ, maxZ])])].sort((a,b) => a-b);
  for (let i = 1; i < xs.length; i++) {
    for (let j = 1; j < zs.length; j++) {
      const [minX, maxX, minZ, maxZ] = [xs[i - 1], xs[i], zs[j - 1], zs[j]];
      if (!walkways.some((rect) => within(rect, (minX + maxX) / 2, (minZ + maxZ) / 2))) {
        colliders.push({ minX, maxX, minZ, maxZ });
      }
    }
  }
  const block = (x, z, width, depth) => colliders.push(limits({ x, z, width, depth }));
  for (const side of [-1, 1]) {
    block(side * 6, squareStallZ, 1.72, 2.56);
    for (const z of [-33.15, -39.75, -46.25]) {
      if (side === -1 || z !== -46.25) block(side * 7, z, 1.72, 3.22);
    }
    for (const z of [-31, -38, -44.6, -49.45]) block(side * 4.5, z, .35, .35);
  }
  block(0, 2.78, 1.48, 1.04);
  block(3.6, 1.26, 1.82, 1.31);
  block(1.95, -39.19, 3.6, 1.25);
  for (const [x, z] of squareLanternPosts) block(x, z, .77, .77);
  for (const [x, z] of roofCorridorPosts) block(x, z, .47, .47);

  const stepStone = standard('#70759b', 'world-brick');
  const litStone = standard('#b5c4f4', 'world-brick', { emissive: '#6d91dc', emissiveIntensity: .48 });
  const steps = [];
  for (let z = -18; z > -27; z -= 1.4) {
    steps.push(box(2.05, .085, 1.09, Math.sin(z) * .21, .042, z, stepStone));
  }

  function artProp(name, x, y, z, height, yaw = 0) {
    const width = { phone: .53, mirror: .71, shadow: .43, 'festival-lantern': .53, keepsake: .66,
      'painted-lantern': .44, grandma: .57, vendor: .63, 'lantern-keeper': .36 }[name];
    const material = standard('#ffffff', name, {
      alphaTest: .23, transparent: true, side: THREE.DoubleSide,
      emissive: name === 'shadow' ? '#30194a' : '#654438', emissiveIntensity: .36,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * width, height), material);
    mesh.position.set(x, y + height / 2, z);
    mesh.rotation.y = yaw;
    mesh.userData.nonOccluding = true;
    scene.add(mesh);
    return mesh;
  }
  const targets = new Map(Object.entries(objects).map(([id, { name, art: image, at, base = 0, height }]) => {
    const [x, z] = at;
    const facing = id === 'rooftop' ? -Math.PI / 2 : 0;
    const object = artProp(image, x, groundHeight(x, z) + base, z, height, facing);
    return [id, { label: name, object }];
  }));
  artProp('painted-lantern', 2.65, .92, -39, .96);
  artProp('festival-lantern', .55, .92, -39, .85);
  artProp('grandma', 4.9, 0, .92, 1.58);
  artProp('vendor', 1.85, 0, -40.75, 1.85);
  artProp('mirror', 2.65, 0, -19.7, 1.7, -.45);
  artProp('mirror', -2.65, 0, -23.3, 1.72, .55);
  const runner = artProp('shadow', .4, 0, -21.6, 1.45);

  const gates = [
    { after: 0, x: 0, z: -9, width: 6, depth: .25 },
    { after: 2, x: 0, z: -29, width: 6, depth: .25 },
    { after: 3, x: 10, z: -44, width: .25, depth: 6 },
  ].map(({ after, x, z, width, depth }) => ({
    after, mesh: box(width, 2.75, depth, x, 1.375, z, materials.lattice),
    collider: limits({ width, depth, x, z }),
  }));
  const permanent = colliders.length;
  const moon = new THREE.DirectionalLight('#aabaff', 1.34);
  moon.position.set(-9, 14, -7);
  const ambient = new THREE.HemisphereLight('#c0c3e8', '#7d5e70', 1.82);
  scene.add(ambient, moon);
  const palettes = [
    ['#ffe0c0', '#956247', '#f8cfa9', 2.12, 1.33],
    ['#aebfff', '#615a8b', '#9badff', 1.53, 1.38],
    ['#bbdfce', '#527a6d', '#aac7c1', 1.57, .93],
    ['#d9c1e0', '#9b6a70', '#fac1b0', 1.84, 1.54],
  ].map(([sky, ground, direct, fill, key]) => ({
    sky: new THREE.Color(sky), ground: new THREE.Color(ground), direct: new THREE.Color(direct), fill, key,
  }));
  const lightColors = { amber: '#ffc080', blue: '#798fff', jade: '#91e2b5' };
  const localLights = Array.from({ length: 4 }, () => {
    const lamp = new THREE.PointLight('#ffd397', 11, 7.4);
    scene.add(lamp);
    return lamp;
  });
  let lightX = Infinity;
  let lightZ = Infinity;
  function lightScene(x, z) {
    if (Math.hypot(lightX - x, lightZ - z) < .8) return;
    lightX = x;
    lightZ = z;
    const nearest = anchors.map((item) => ({ ...item, distance: (item.x - x) ** 2 + (item.z - z) ** 2 }));
    nearest.sort((a, b) => a.distance - b.distance);
    localLights.forEach((lamp, index) => {
      const anchor = nearest[index];
      lamp.position.set(anchor.x, anchor.y - .16, anchor.z);
      lamp.color.set(lightColors[anchor.color]);
    });
  }
  const reunionLight = new THREE.PointLight('#ffd088', 7, 5);
  reunionLight.position.set(3.6, 1.95, 1.4);
  scene.add(reunionLight);

  const showHint = createHintPortal(THREE, scene, targets);
  let time = 0;
  let crossingTime = 0;
  let previousIndex = -1;
  let previousStep;
  function update(dt, state, camera) {
    const index = state.index ?? resume;
    if (index !== previousIndex || state.step !== previousStep) {
      previousIndex = index;
      previousStep = state.step;
      colliders.length = permanent;
      for (const gate of gates) {
        gate.mesh.visible = index <= gate.after;
        if (gate.mesh.visible) colliders.push(gate.collider);
      }
      const mirrorReady = index > 1 || (index === 1 && ['check', 'writing'].includes(state.step));
      targets.get('mirror').object.rotation.z = mirrorReady ? 0 : -.15;
      for (const step of steps) step.material = mirrorReady ? litStone : stepStone;
      targets.get('trail').object.visible = index === 0;
      targets.get('rooftop').object.visible = index === 4;
      targets.get('reunion').object.visible = index >= 5;
      targets.get('keepsake').object.visible = index <= 3;
      reunionLight.visible = index === 5 && state.step !== 'seek';
    }
    targets.get('phone').object.visible = !state.phone;
    if (!state.reducedMotion) time += dt;
    const { x, z } = camera.position;
    if (index !== 2) crossingTime = 0;
    if (index === 2 && z < -17.2) crossingTime += dt;
    const hop = Math.min(crossingTime / 1.5, 1);
    runner.visible = index === 2 && state.step === 'seek' && hop < 1;
    runner.position.y = .725 + (state.reducedMotion ? 0 : .55 * Math.sin(hop * Math.PI));
    runner.position.z = -21.6 - (state.reducedMotion ? 0 : 6.1 * hop);
    sky.position.copy(camera.position);
    sky.material.uniforms.dawn.value = THREE.MathUtils.clamp((x - 9) / 15, 0, 1);
    const palette = palettes[x >= 17 ? 3 : z < -29 ? 2 : z < -9 ? 1 : 0];
    const blend = 1 - Math.exp(-dt * 4);
    ambient.color.lerp(palette.sky, blend);
    ambient.groundColor.lerp(palette.ground, blend);
    moon.color.lerp(palette.direct, blend);
    ambient.intensity = THREE.MathUtils.lerp(ambient.intensity, palette.fill, blend);
    moon.intensity = THREE.MathUtils.lerp(moon.intensity, palette.key, blend);
    lightScene(x, z);
    showHint(state.hint, camera, time, !state.reducedMotion);
  }
  return { scene, spawn: checkpoints[Math.min(resume, 5)], targets, colliders, ready: Promise.all(loads), update, groundHeight };
}
