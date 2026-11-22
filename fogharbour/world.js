import { createHintPortal } from '../shared/hint-portal.js';
import { art, labels, arrival } from './story.js?v=harbour-sign';
import { signFace } from './signs.js';

export function buildHarbour(THREE, resume = 0, hasPhone = false) {
  const scene = new THREE.Scene();
  const skyColor = new THREE.Color('#415a74');
  scene.background = skyColor;
  scene.fog = new THREE.FogExp2('#53718b', .033);
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const loads = [];
  function texture(url) {
    if (!textures.has(url)) {
      const tex = loader.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textures.set(url, tex);
    }
    return textures.get(url);
  }
  const backgrounds = ['harbour', 'stairs', 'shelter', 'berth'].map((id) => {
    const url = art(id);
    const tex = new THREE.Texture();
    tex.colorSpace = THREE.SRGBColorSpace;
    loads.push(loader.loadAsync(url).then(({ image }) => {
      tex.image = image;
      tex.needsUpdate = true;
    }).catch(() => {}));
    return tex;
  });
  const oak = texture(new URL('../moonbridge/art/materials/oak.webp', import.meta.url).href);
  const wood = new THREE.MeshStandardMaterial({ map: oak, color: '#b2ad91', roughness: .9 });
  const trim = new THREE.MeshStandardMaterial({ color: '#365d60', map: oak, roughness: .75 });
  const brass = new THREE.MeshStandardMaterial({ color: '#a06637', roughness: .61, metalness: .25 });
  const fabric = new THREE.MeshStandardMaterial({ color: '#9a4f39', roughness: .94, side: THREE.DoubleSide });
  const lamp = new THREE.MeshBasicMaterial({ color: '#ffc884' });
  const box = (w, h, d, x, y, z, material = wood) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };
  const colliders = [
    { minX: -12, maxX: -3.45, minZ: -42, maxZ: 9 },
    { minX: 3.45, maxX: 12, minZ: -42, maxZ: 9 },
    { minX: -4, maxX: 4, minZ: 4.8, maxZ: 9 },
    { minX: -4, maxX: 4, minZ: -42, maxZ: -32.4 },
  ];
  for (let z = 5; z > -33; z -= .68) {
    box(7.15, .11, .66, 0, -.056, z);
  }
  for (const x of [-3.4, 3.4]) {
    box(.18, .15, 37.8, x, .82, -13.65, trim);
    box(.13, .12, 37.8, x, .38, -13.65, brass);
    for (let z = 4.6; z > -32.7; z -= 1.85)
      box(.20, 1.12, .20, x, .48, z, trim);
  }

  function awning(x, z, breadth, depth) {
    for (const dx of [-breadth / 2, breadth / 2]) {
      for (const dz of [-depth / 2, depth / 2]) {
        box(.16, 3.62, .17, x + dx, 1.81, z + dz, trim);
      }
    }
    box(breadth + .4, .13, depth + .65, x, 3.65, z, trim);
    box(breadth + .16, .27, .08, x, 3.43, z + depth / 2, fabric);
  }
  awning(0, 2.1, 6.3, 4.7);
  awning(0, -17.9, 6.4, 7.6);
  awning(0, -29.3, 6.3, 5.4);
  for (const z of [1.2, -5.8, -12.8, -17, -21.8, -26, -30.9]) {
    const x = z > -10 ? 2.8 : -2.85;
    box(.16, 2.9, .16, x, 1.45, z, trim);
    box(.47, .51, .43, x, 2.47, z, lamp);
    box(.56, .10, .51, x, 2.77, z, brass);
    box(.53, .09, .48, x, 2.17, z, brass);
  }
  box(2.5, .18, 1.12, -.65, .73, .96);
  for (const x of [-1.67, .43]) box(.17, .73, .62, x, .34, .96, trim);
  colliders.push({ minX: -1.9, maxX: .6, minZ: .44, maxZ: 1.52 });
  box(2, .14, .53, -1.8, .46, -17.65, trim);
  box(1.7, .14, .73, .55, .67, -30, trim);
  for (const x of [-.12, 1.25]) box(.13, .67, .56, x, .33, -30);
  const clouds = new THREE.MeshBasicMaterial({ color: '#9aaab5', transparent: true, opacity: .24, fog: true });
  const cloudShelf = box(58, .08, 58, 0, -2.25, -12, clouds);
  cloudShelf.raycast = () => {};
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? -1 : 1;
    const z = -3 - i * 3.4;
    const x = side * (6 + (i % 3) * 1.55);
    const island = new THREE.Mesh(new THREE.CylinderGeometry(1.8, .38, 2.25, 6), trim);
    island.position.set(x, -1.21 - (i % 3) * .62, z);
    scene.add(island);
    box(2.65, .16, 2.24, x, island.position.y + 1.2, z);
    box(.31, .41, .31, x + .61, island.position.y + 1.47, z, lamp);
  }

  const targets = new Map();
  function item(id, image, x, y, z, w, h) {
    const object = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      map: typeof image === 'string' ? texture(image) : image,
      transparent: true, alphaTest: .28, side: THREE.DoubleSide, roughness: .92,
      emissive: '#4a4339', emissiveIntensity: .2,
    });
    const visual = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    visual.userData.nonOccluding = true;
    object.add(visual);
    object.position.set(x, y, z);
    scene.add(object);
    targets.set(id, { object, label: labels[id] });
    return object;
  }
  const phone = item('phone', art('phone'), -.61, 1.07, 1.25, .47, .64);
  for (const [id, x, z] of [['markers', 1.64, -1.8], ['stairs', .92, -8.3]]) {
    const face = new THREE.Texture();
    face.colorSpace = THREE.SRGBColorSpace;
    face.anisotropy = 4;
    const sign = item(id, face, x, 1.38, z, 2.36, 2.62);
    // Keep the post on the deck and show the lettering only from the approach.
    const material = sign.children[0].material;
    material.side = THREE.FrontSide;
    const back = new THREE.Mesh(sign.children[0].geometry, material.clone());
    back.material.side = THREE.BackSide;
    back.material.map = texture(art('sign'));
    back.userData.nonOccluding = true;
    sign.add(back);
    loads.push(signFace(id).then((canvas) => { face.image = canvas; face.needsUpdate = true; }).catch(() => {
      material.map = texture(art('sign'));
      material.needsUpdate = true;
    }));
  }
  const coat = item('coat', art('coat'), -.85, 1.43, -15.7, .95, 1.48);
  item('escort', art('grandma'), -.7, 1.43, -20.2, 1.03, 1.79);
  const child = new THREE.Mesh(new THREE.PlaneGeometry(.71, 1.28), new THREE.MeshStandardMaterial({
    map: texture(art('child')), transparent: true, alphaTest: .3, side: THREE.DoubleSide,
  }));
  child.position.set(.34, 1.05, -20.35);
  scene.add(child);
  item('winch', art('winch'), .45, 1.24, -25.3, 1.45, 1.53);
  item('handover', new URL('../moonbridge/art/ledger-paper.webp', import.meta.url).href, .63, 1.12, -29.86, 1.11, .75);
  const ferry = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.56, .52, 5.1), wood);
  ferry.add(hull);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.57, .36, .16), trim);
  rail.position.set(0, .42, 2.38);
  ferry.add(rail);
  ferry.position.set(5.1, -.19, -25.2);
  scene.add(ferry);

  const gates = [
    { at: 1, z: -10.2 },
    { at: 3, z: -22.2 },
    { at: 4, z: -26.9 },
  ].map(({ at, z }) => ({
    at,
    beam: box(6.5, .11, .15, 0, .77, z, brass),
    collider: { minX: -3.48, maxX: 3.48, minZ: z - .14, maxZ: z + .14 },
  }));
  const permanent = colliders.length;
  scene.add(new THREE.HemisphereLight('#dce8ff','#684d46', 2.15));
  const key = new THREE.DirectionalLight('#ffd4a1', 2.05);
  key.position.set(-5, 7, 3);
  scene.add(key);
  const showHint = createHintPortal(THREE, scene, targets);
  let clock = 0;
  function update(dt, state, camera) {
    const index = state.index ?? resume;
    const solved = state.step && state.step !== 'seek';
    const complete = (stage) => index > stage || (index === stage && solved);
    colliders.length = permanent;
    for (const { at, beam, collider } of gates) {
      beam.visible = !complete(at);
      if (beam.visible) colliders.push(collider);
    }
    phone.visible = !(state.phone ?? hasPhone);
    coat.visible = index <= 2;
    ferry.position.x = complete(4) ? 4.62 : 5.4;
    if (!state.reducedMotion) clock += dt;
    ferry.position.y = -.21 + Math.sin(clock * 1.65) * .11;
    const chapter = index === 0 ? 0 : index === 1 ? 1 : index < 4 ? 2 : 3;
    const backdrop = backgrounds[chapter];
    if (backdrop.image) {
      const aspect = camera.aspect * backdrop.image.height / backdrop.image.width;
      backdrop.repeat.set(Math.min(1, aspect), Math.min(1, 1 / aspect));
      backdrop.offset.set(
        (1 - backdrop.repeat.x) * (.5 - Math.sin(camera.rotation.y) * .37),
        (1 - backdrop.repeat.y) * (.5 - Math.sin(camera.rotation.x) * .37),
      );
      scene.background = backdrop;
    } else scene.background = skyColor;
    showHint(state.hint, camera, clock, !state.reducedMotion);
  }
  const spawn = resume === 0 ? arrival : { x: resume >= 2 ? 0 : .78, z: [-5.7, -13.5, -17.6, -23.2, -27.65][Math.min(resume, 5) - 1] };
  return { scene, spawn, targets, colliders, ready: Promise.all(loads), update };
}
