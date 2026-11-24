import { createHintPortal } from '../shared/hint-portal.js';
import { art, objects } from './story.js';

export const start = { x: 0, z: 4.7, pitch: -.12 };
export const checkpoints = [
  { x: -1.8, z: -1.15, pitch: -.06 }, { x: 1.75, z: -12.2, pitch: -.23 },
  { x: 1.5, z: -24.55, pitch: -.07 }, { x: 2.55, z: -37.25, pitch: -.08 },
  { x: 2.55, z: -44.55, pitch: -.13 },
];

export function buildTheatre(THREE, spawn = start) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c5a29a');
  scene.fog = new THREE.FogExp2('#c5a29a', .022);
  const loads = [];
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  function texture(name) {
    if (!textures.has(name)) {
      const tex = new THREE.Texture();
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textures.set(name, tex);
      loads.push(loader.loadAsync(art(name)).then((image) => {
        tex.image = image.image;
        tex.needsUpdate = true;
      }));
    }
    return textures.get(name);
  }
  function surface(name, color, repeats = [1, 1]) {
    const map = texture(name).clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(...repeats);
    return new THREE.MeshStandardMaterial({ map, color, roughness: .87 });
  }
  const paving = surface('paving', '#fff2d0', [3, 4]);
  const wood = surface('wood', '#ffe1a9');
  const workshop = surface('wood', '#ffc479', [4, 4]);
  const stone = surface('stone', '#c3ebde', [2, 4]);
  const walkway = surface('wood', '#d4f1df', [3, 6]);
  const rock = surface('stone', '#7b9e8c');
  const red = surface('wood', '#d06342');
  const gold = surface('wood', '#ffe672');
  const banner = surface('wood', '#cf482d');
  const water = surface('water', '#8bdacd', [8, 15]);
  water.roughness = .42;
  water.emissive.set('#24515a');
  water.emissiveIntensity = .35;
  const sun = new THREE.DirectionalLight('#ffdeaa', 1.85);
  sun.position.set(-8, 15, 6);
  const sky = new THREE.HemisphereLight('#f7e3ce', '#576d7d', 1.6);
  const skyline = new THREE.Mesh(
    new THREE.SphereGeometry(95, 44, 22, 0, Math.PI * 2, 0, 1.95),
    new THREE.MeshBasicMaterial({ map: texture('sky'), side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false }),
  );
  skyline.renderOrder = -1;
  skyline.userData.nonOccluding = true;
  scene.add(sun, sky, skyline);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, x, y, z, material, parent = scene) {
    const mesh = new THREE.Mesh(cube, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function image(name, x, y, z, height, aspect, parent = scene) {
    const material = new THREE.MeshStandardMaterial({
      map: texture(name), side: THREE.DoubleSide, alphaTest: .4,
      roughness: .9, emissive: '#443523', emissiveIntensity: .14,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), material);
    mesh.position.set(x, y + height / 2, z);
    mesh.userData.nonOccluding = true;
    parent.add(mesh);
    return mesh;
  }
  const colliders = [
    { minX: -30, maxX: -5, minZ: -56, maxZ: 10 },
    { minX: 4.65, maxX: 40, minZ: -56, maxZ: 10 },
    { minX: -30, maxX: 40, minZ: 6, maxZ: 12 },
    { minX: -30, maxX: 40, minZ: -57, maxZ: -49.7 },
  ];
  function solid(w, h, d, x, y, z, mat) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    return box(w, h, d, x, y, z, mat);
  }

  // Four connected sections of the riverbank, with gates across their shared path.
  box(10, .65, 14.2, -.1, -.325, -1.1, paving);
  box(10, .65, 13, -.1, -.325, -14.55, workshop);
  box(10, .65, 13, -.1, -.325, -27.45, stone);
  box(10, .65, 16.2, -.1, -.325, -41.95, walkway);
  box(65, .2, 66, 20, -.82, -17, water);

  function arch(z, material, height = 3.1) {
    for (const x of [-3.85, 3.85]) {
      solid(.48, height, .6, x, height / 2, z, material);
      box(.75, .22, .9, x, .12, z, stone);
    }
    box(8.3, .43, .72, 0, height, z, material);
    box(8.8, .16, 1.1, 0, height + .25, z, gold);
  }
  arch(-6.9, red);
  arch(-20, wood, 3.3);
  arch(-33.65, stone, 3.9);
  function sign(text, x, y, z) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 104;
    const context = canvas.getContext('2d');
    context.fillStyle = '#23392e';
    context.fillRect(0, 0, 384, 104);
    context.strokeStyle = '#cd9b59';
    context.lineWidth = 4;
    context.strokeRect(7, 7, 370, 90);
    context.fillStyle = '#fff0c5';
    context.font = 'bold 46px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 192, 54, 350);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.24, .61), new THREE.MeshBasicMaterial({ map }));
    plaque.position.set(x, y, z);
    scene.add(plaque);
  }
  sign('码头广场', 0, 3.05, -1.28);
  sign('道具工坊', 0, 3.15, -6.52);
  sign('回声塔', 0, 3.36, -19.59);
  sign('瀑布栈道', 0, 4, -33.24);

  // Dock crates and stage banners.
  solid(1.45, .9, .9, .3, .45, 2.18, wood);
  solid(1.65, .9, .8, -1.8, .45, -3.9, wood);
  for (const x of [-3.35, 3.4]) box(.75, 1.35, .08, x, 2.65, -5.7, banner);
  // Workshop has its own orange canopy, narrow service openings and stored props.
  for (const z of [-9, -13, -17.7]) {
    solid(.3, 3.65, .3, -4.4, 1.825, z, red);
    solid(.3, 3.65, .3, 4.2, 1.825, z, red);
    box(8.9, .18, .3, -.1, 3.52, z, wood);
  }
  box(9.15, .2, 11.9, -.08, 3.85, -13.5, gold);
  for (const z of [-10, -12.5, -16.3]) solid(.92, 1.65, 1.68, -3.9, .825, z, wood);
  solid(1.3, .63, .95, 1.75, .315, -15, red);
  image('puppets', -1.85, 0, -15.6, 1.52, 1.35);
  // Jade tower and an open lookout with a view downriver.
  solid(2.8, 6.8, 3.9, -3.48, 3.4, -26, stone);
  for (const y of [2.2, 4.35, 6.8]) {
    box(3.15, .28, 4.2, -3.48, y, -26, gold);
    box(.65, .89, .04, -1.99, y - .81, -25.3, wood).rotation.y = Math.PI / 2;
  }
  solid(1.65, .88, .95, 1.5, .44, -27.3, stone);
  for (const z of [-23, -30.5]) box(.13, 3.05, .13, 3.75, 1.55, z, red);
  // Waterfall boardwalk, flags and the winch platform.
  for (let z = 4; z >= -49; z -= 2.6) {
    box(.2, 1.05, .2, 4.5, .5, z, wood);
    box(.15, .14, 2.64, 4.5, .85, z - 1.25, wood);
    if (z < -34 && Math.round(z) % 2) {
      box(.09, 2.9, .09, 4.35, 1.45, z, red);
      box(.6, .39, .07, 4.03, 2.63, z, banner);
    }
  }
  for (const x of [-4.8, -4.2, 5.1]) {
    for (const [i, z] of [-9,-21,-34,-49].entries()) {
      const pillar = box(1.3 + (i % 2), 5 + i, 2.6, x, 1.65, z, rock);
      pillar.rotation.z = .08 * (i - 2);
    }
  }
  for (const [x, z, height, width] of [[21,4,9,4],[23,-6,13,4.6],[21,-17,10,3.4],[26,-27,18,5],[22,-40,12,3.8],[18,-48,15,4.5]]) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(width * .58, width, height, 7), rock);
    ridge.position.set(x, height / 2 - 1.7, z);
    ridge.rotation.z = -.13;
    scene.add(ridge);
  }
  const fallingWater = surface('water', '#c2e9dd', [4, 2]);
  const falls = box(32, 5.4, .15, 13, -3.34, -49.93, fallingWater);
  box(54, .25, 35, 18, -6, -67, water);
  const theatre = new THREE.Group();
  scene.add(theatre);
  box(5.4, .46, 2.85, 0, -.1, 0, red, theatre);
  box(5.65, .15, 3.03, 0, .18, 0, gold, theatre);
  const stage = image('barge', 0, .12, 0, 2.75, 1.52, theatre);
  const cast = image('cast', .8, .3, .34, 1.13, 1.38, theatre);
  const tiger = image('tiger', -2.35, -.19, .69, 1.47, 1.67, theatre);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 8), gold);
  line.visible = false;
  scene.add(line);
  const reel = new THREE.Vector3(2.55, 1.05, -47);
  const stageRope = new THREE.Vector3();
  const upright = new THREE.Vector3(0, 1, 0);

  const targets = new Map(Object.entries(objects).map(([id, data]) => {
    const object = image(data.image, data.x, data.y, data.z, data.height,
      { radio: .59, crew: .72, rope: 1.48, tower: 1.12, flag: .88, winch: 1.34 }[id]);
    return [id, { object, label: data.label }];
  }));
  const gates = [-8.2, -21.1, -34].map((z, index) => ({
    index, mesh: box(9.75, 1.3, .18, -.08, .65, z, index === 2 ? stone : red),
    bounds: { minX: -5, maxX: 4.65, minZ: z - .12, maxZ: z + .12 },
  }));
  const fixed = colliders.length;
  const showHint = createHintPortal(THREE, scene, targets);
  let lastIndex = -1;
  let clock = 0;
  let theatreZ = -9;
  let theatreX = 9;
  const basePositions = [-9, -19, -31, -41, -47, -43];
  function update(dt, state, camera) {
    skyline.position.copy(camera.position);
    const index = state.index ?? 0;
    if (lastIndex !== index) {
      lastIndex = index;
      colliders.length = fixed;
      for (const gate of gates) {
        gate.mesh.visible = index <= gate.index;
        if (gate.mesh.visible) colliders.push(gate.bounds);
      }
    }
    targets.get('radio').object.visible = !state.radio;
    if (!state.reducedMotion) {
      clock += dt;
      water.map.offset.y = (clock * .13) % 1;
      fallingWater.map.offset.y = -(clock * .3) % 1;
      falls.rotation.x = Math.sin(clock * .8) * .012;
    }
    const rescue = state.rescue ?? 0;
    const desired = rescue > 0 ? -47 + rescue * 4 : basePositions[Math.min(5, index)];
    const blend = state.reducedMotion ? 1 : 1 - Math.exp(-dt * 2.9);
    theatreZ += (desired - theatreZ) * blend;
    theatreX += (9 - rescue * 3 - theatreX) * blend;
    theatre.position.set(theatreX, -.42 + Math.sin(clock * 2.55) * .12, theatreZ);
    theatre.rotation.y = -.78 + rescue * .3;
    line.visible = index === 4;
    if (line.visible) {
      stageRope.set(theatreX, theatre.position.y + .55, theatreZ);
      line.position.addVectors(reel, stageRope).multiplyScalar(.5);
      const direction = stageRope.sub(reel);
      line.scale.y = direction.length();
      line.quaternion.setFromUnitVectors(upright, direction.normalize());
    }
    for (const sprite of [stage, cast, tiger]) sprite.rotation.y = -1.05;
    showHint(state.hint, camera, clock, !state.reducedMotion);
  }
  return { scene, targets, colliders, spawn, update, ready: Promise.all(loads) };
}
