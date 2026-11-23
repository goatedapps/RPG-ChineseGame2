import { createHintPortal } from '../shared/hint-portal.js';
import { art, arrival, objects } from './story.js?v=market-games';

export const checkpoints = [
  arrival, { x: 0, z: -10.4 }, { x: 0, z: -17.5 },
  { x: 0, z: -30.5 }, { x: 2, z: -42, yaw: -1.1 },
  { x: 2, z: 5.3, yaw: -.36, pitch: -.07 },
];

const districts = [
  { width: 17, depth: 18, x: 0, z: 0, image: 'square', paving: '#716063', trim: '#733737' },
  { width: 6, depth: 20, x: 0, z: -19, image: 'alley', paving: '#435267', trim: '#344163' },
  { width: 20, depth: 22, x: 0, z: -40, image: 'market', paving: '#674b59', trim: '#513250' },
  { width: 24, depth: 16, x: 29, z: -42, image: 'roofs', paving: '#6b596b', trim: '#523b59' },
];
const roofPassage = { width: 8, depth: 6, x: 13, z: -44 };
function limits({ width, depth, x, z }) {
  return { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
}
function within(rect, x, z) {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}
const walkways = [...districts, roofPassage].map(limits);

export function buildShadowMarket(THREE, resume = 0) {
  const scene = new THREE.Scene();
  const sky = new THREE.Color('#22213b');
  scene.background = sky;
  scene.fog = new THREE.FogExp2('#41415e', .021);
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
  const backdrops = districts.map(({ image }) => texture(art(image)));
  const stone = texture(art('stone'));
  stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
  stone.repeat.set(6, 6);
  const materials = districts.map(({ paving, trim, width, depth }) => {
    const tiles = stone.clone();
    tiles.repeat.set(width / 4, depth / 4);
    return {
      floor: new THREE.MeshStandardMaterial({ color: paving, map: tiles, roughness: .85 }),
      wall: new THREE.MeshStandardMaterial({ color: trim, map: stone, roughness: .92 }),
    };
  });
  const lantern = new THREE.MeshStandardMaterial({ color: '#ffda86', emissive: '#e58c41', emissiveIntensity: 1.3 });
  const violet = new THREE.MeshStandardMaterial({ color: '#cdb7fb', emissive: '#8155db', emissiveIntensity: 1.5 });
  const metal = new THREE.MeshStandardMaterial({ color: '#644555', roughness: .62 });
  function box(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  }

  districts.forEach(({ width, depth, x, z }, index) => {
    box(width, .14, depth, x, -.071, z, materials[index].floor);
  });
  box(8, .14, 6, 13, -.071, -44, materials[3].floor);
  const xs = [...new Set([-15, 46, ...walkways.flatMap(({ minX, maxX }) => [minX, maxX])])].sort((a,b) => a-b);
  const zs = [...new Set([-57, 15, ...walkways.flatMap(({ minZ, maxZ }) => [minZ, maxZ])])].sort((a,b) => a-b);
  const colliders = [];
  for (let i = 1; i < xs.length; i++) {
    for (let j = 1; j < zs.length; j++) {
      const [minX, maxX, minZ, maxZ] = [xs[i-1], xs[i], zs[j-1], zs[j]];
      if (!walkways.some((rect) => within(rect, (minX + maxX) / 2, (minZ + maxZ) / 2))) {
        colliders.push({ minX, maxX, minZ, maxZ });
      }
    }
  }

  function stall(x, z, material, width = 2.65) {
    box(width, .17, 1.56, x, .79, z, material);
    for (const offset of [-width / 2 + .13, width / 2 - .13]) {
      box(.14, 2.85, .14, x + offset, 1.42, z - .65, metal);
    }
    box(width + .25, .22, 1.83, x, 2.85, z, material);
    artProp('festival-lantern', x + width / 3, 2.15, z + .52, .62);
    colliders.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - .77, maxZ: z + .77 });
  }
  for (const z of [2, -2, -6]) {
    stall(-6, z, materials[0].wall);
    stall(6, z, materials[0].wall);
  }
  for (const [x, z] of [[-7,-33],[7,-33],[-7,-40],[7,-40],[-7,-47]]) stall(x, z, materials[2].wall);
  for (const x of [-2.91, 2.91]) {
    box(.23, 3.3, 19, x, 1.65, -19, materials[1].wall);
    for (const z of [-12.8, -18, -24.2]) {
      box(.18, .44, .4, x * .94, 2.24, z, violet);
    }
  }
  const steps = [];
  const litStone = new THREE.MeshStandardMaterial({ color: '#8379b0', map: stone, emissive: '#6d91dc', emissiveIntensity: .25 });
  for (let z = -18; z > -27; z -= 1.4) {
    steps.push(box(2.05, .028, .91, Math.sin(z) * .21, .012, z, materials[1].wall));
  }
  for (const z of [-49.8, -34.2]) {
    box(23.4, .68, .32, 29, .34, z, materials[3].wall);
  }
  for (const x of [18.5, 23.4, 29.2, 34.5, 39]) {
    box(.28, 1.55, .28, x, .775, -46.6, metal);
    artProp('festival-lantern', x, 1.35, -46.6, .66, -.6);
  }
  for (const [x, z, width] of [[0,-8.8,5.5],[0,-29,5.6]]) {
    for (const side of [-1, 1]) {
      box(.5, 3.15, .64, x + side * width / 2, 1.575, z, metal);
      box(.33, .47, .33, x + side * (width / 2 - .4), 2.53, z, z < -10 ? violet : lantern);
    }
    box(width + .55, .38, .8, x, 3.12, z, metal);
  }
  box(1.48, .91, 1.04, 0, .455, 2.78, materials[0].wall);
  box(1.82, .83, 1.31, 3.6, .415, 1.26, materials[0].wall);
  box(3.6, .83, 1.25, 1.95, .415, -39.19, materials[2].wall);
  colliders.push({ minX: -.74, maxX: .74, minZ: 2.26, maxZ: 3.3 },
    { minX: 2.69, maxX: 4.51, minZ: .61, maxZ: 1.92 },
    { minX: .15, maxX: 3.75, minZ: -39.81, maxZ: -38.56 });

  function artProp(name, x, y, z, height, yaw = 0) {
    const width = { phone: .53, mirror: .71, shadow: .43, 'festival-lantern': .53, keepsake: .66, 'painted-lantern': .44, grandma: .57, vendor: .63, 'lantern-keeper': .36 }[name];
    const map = texture(art(name));
    const material = new THREE.MeshStandardMaterial({
      map, alphaTest: .24, transparent: true, side: THREE.DoubleSide, roughness: .84,
      emissive: name === 'shadow' ? '#30194a' : '#654438', emissiveIntensity: .37,
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
    return [id, { label: name, object: artProp(image, x, base, z, height, id === 'rooftop' ? -Math.PI / 2 : 0) }];
  }));
  artProp('painted-lantern', 2.65, .86, -39, .96);
  artProp('festival-lantern', .55, .86, -39, .85);
  artProp('grandma', 4.9, 0, .92, 1.58);
  artProp('vendor', 1.85, 0, -40.75, 1.85);
  artProp('mirror', 2.65, 0, -19.7, 1.7, -.45);
  artProp('mirror', -2.65, 0, -23.3, 1.72, .55);
  const runner = artProp('shadow', .4, 0, -21.6, 1.45);
  const reunionLight = new THREE.PointLight('#ffd088', 7, 5);
  reunionLight.position.set(3.6, 1.95, 1.4);
  scene.add(reunionLight);

  // Doorways open only when the story has sent the player to the next area.
  const gates = [
    { after: 0, x: 0, z: -9, width: 6, depth: .25 },
    { after: 2, x: 0, z: -29, width: 6, depth: .25 },
    { after: 3, x: 10, z: -44, width: .25, depth: 6 },
  ].map(({ after, x, z, width, depth }) => ({
    after, mesh: box(width, 2.6, depth, x, 1.3, z, metal),
    collider: limits({ width, depth, x, z }),
  }));
  const permanent = colliders.length;
  const skyLight = new THREE.HemisphereLight('#dbcdef', '#695166', 2.1);
  const sun = new THREE.DirectionalLight('#faddb7', 2.3);
  sun.position.set(-8, 9, 4);
  scene.add(skyLight, sun);
  const showHint = createHintPortal(THREE, scene, targets);
  let time = 0;
  let crossingTime = 0;
  function update(dt, state, camera) {
    const index = state.index ?? resume;
    colliders.length = permanent;
    for (const gate of gates) {
      gate.mesh.visible = index <= gate.after;
      if (gate.mesh.visible) colliders.push(gate.collider);
    }
    targets.get('phone').object.visible = !state.phone;
    targets.get('trail').object.visible = index === 0;
    targets.get('rooftop').object.visible = index === 4;
    targets.get('reunion').object.visible = index >= 5;
    const mirrorReady = index > 1 || (index === 1 && ['check', 'writing'].includes(state.step));
    targets.get('mirror').object.rotation.z = mirrorReady ? 0 : -.15;
    for (const step of steps) step.material = mirrorReady ? litStone : materials[1].wall;
    targets.get('keepsake').object.visible = index <= 3;
    if (!state.reducedMotion) time += dt;
    const { x, z } = camera.position;
    if (index !== 2) crossingTime = 0;
    if (index === 2 && z < -17.2) crossingTime += dt;
    const hop = Math.min(crossingTime / 1.5, 1);
    runner.visible = index === 2 && state.step === 'seek' && hop < 1;
    runner.position.y = .725 + (state.reducedMotion ? 0 : .55 * Math.sin(hop * Math.PI));
    runner.position.z = -21.6 - (state.reducedMotion ? 0 : 6.1 * hop);
    reunionLight.visible = index === 5 && state.step !== 'seek';
    const area = x > 10 ? 3 : z < -29 ? 2 : z < -9 ? 1 : 0;
    const backdrop = backdrops[area];
    if (backdrop.image) {
      const ratio = camera.aspect * backdrop.image.height / backdrop.image.width;
      backdrop.repeat.set(Math.min(1, ratio), Math.min(1, 1 / ratio));
      backdrop.offset.set(
        (1 - backdrop.repeat.x) * (.5 - Math.sin(camera.rotation.y) * .34),
        (1 - backdrop.repeat.y) * (.5 - Math.sin(camera.rotation.x) * .34),
      );
    }
    scene.background = backdrop.image ? backdrop : sky;
    showHint(state.hint, camera, time, !state.reducedMotion);
  }
  return { scene, spawn: checkpoints[Math.min(resume, 5)], targets, colliders, ready: Promise.all(loads), update };
}
