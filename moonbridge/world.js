import { createHintPortal } from '../shared/hint-portal.js';
import { bindScenePointer, MOUSE_LOOK_RATE } from '../shared/scene-pointer.js';
import * as T from '../greenhouse/vendor/three.module.min.js';
import { advanceRace, FORK, MERGE } from './race.js?v=cockpit-race';

const V = (x, y, z) => new T.Vector3(x, y, z);
const between = (x, low, high) => Math.min(high, Math.max(low, x));
const radians = Math.PI / 180;
const points = (coordinates) => coordinates.map(([x, y, z]) => V(x, y, z));
const curve = (coordinates) => new T.CatmullRomCurve3(points(coordinates));
const route = {
  start: curve([
    [0, 0, -1],
    [0, 0, -9],
    [1, 0.2, -18],
    [4, 0.3, -26],
  ]),
  rough: curve([
    [4, 0.3, -26],
    [0.4, 0.1, -34],
    [-3, 0.8, -44],
    [0.6, 0.6, -54],
    [7, 0.35, -62],
  ]),
  smooth: curve([
    [4, 0.3, -26],
    [12, 0.3, -34],
    [18, 0.12, -43],
    [15, 0.3, -53],
    [7, 0.35, -62],
  ]),
  end: curve([
    [7, 0.35, -62],
    [8, 0.22, -71],
    [8.4, 0, -78],
    [8.4, 0, -86],
  ]),
};
const straightSupport = [
  [0, -8],
  [0.4, -18],
  [4, -26],
  [-2, -40],
  [17, -45],
  [7, -62],
  [8, -73],
];
const boxGeo = new T.BoxGeometry();
const wheelGeo = new T.CylinderGeometry(1, 1, 1, 14);
const sphereGeo = new T.SphereGeometry(1, 16, 10);
const lanternGeo = new T.CylinderGeometry(0.82, 1, 1, 8);
const roundedGeo = new T.BoxGeometry(1, 1, 1, 4, 4, 4);
const roundedVertices = roundedGeo.getAttribute('position');
for (let i = 0; i < roundedVertices.count; i++) {
  const p = V(
    roundedVertices.getX(i),
    roundedVertices.getY(i),
    roundedVertices.getZ(i),
  );
  const core = V(
    between(p.x, -0.22, 0.22),
    between(p.y, -0.22, 0.22),
    between(p.z, -0.22, 0.22),
  );
  p.sub(core).normalize().multiplyScalar(0.28).add(core);
  roundedVertices.setXYZ(i, p.x, p.y, p.z);
}
roundedGeo.computeVertexNormals();

function material(color, roughness = 0.9, emissive = 0, intensity = 1) {
  return new T.MeshStandardMaterial({
    color,
    roughness,
    emissive,
    emissiveIntensity: intensity,
  });
}

const color = {
  timber: material(0x6e3e28),
  oak: material(0x98623d),
  trim: material(0xf3b777, 0.63),
  roof: material(0x183147),
  edge: material(0x345665),
  red: material(0x95383b),
  brass: material(0xc58b45, 0.41),
  dark: material(0x1d2632),
  rail: material(0x8babb6, 0.35),
  cart: material(0xf4db9b, 0.52),
  azure: material(0x668ebc, 0.48),
  seat: material(0x8e4653, 0.9),
  stone: material(0x363e59),
  rock: material(0x29344c),
  blueRock: material(0x3f4d68),
  tree: material(0x183d41),
  pink: material(0xa25868),
  lamp: material(0xffcc7e, 0.45, 0xffa648, 2),
  off: material(0x4c5667, 0.68),
  spark: material(0xffe087, 0.4, 0xffa117, 2.7),
  path: material(0x2d7280, 0.61, 0x194c68, 0.6),
  paper: material(0xdfc795),
  creamNose: material(0xd6bd8b, 0.5, 0xff9d4d, 0.17),
  creamSide: material(0xd6bd8b, 0.5),
  blueNose: material(0xabbcde, 0.49, 0x4599cf, 0.22),
  blueSide: material(0xabbcde, 0.49),
  radioFront: material(0xc3b197, 0.65),
  radioBack: material(0xc3b197, 0.65),
  radioSide: material(0xc3b197, 0.65),
  waterfall: new T.MeshBasicMaterial({
    color: 0x77a9d1,
    transparent: true,
    opacity: 0.31,
    depthWrite: false,
  }),
};
const surfaceArtwork = [
  ['timber', 'walnut', 0xb29382],
  ['oak', 'oak', 0xcfb792],
  ['trim', 'brass', 0xe2c29d],
  ['roof', 'tiles', 0xa6bacd],
  ['edge', 'tiles', 0xb2c6c9],
  ['red', 'banner', 0xd4b9a4],
  ['brass', 'brass', 0xcdb590],
  ['rail', 'brass', 0xa3aeb9],
  ['cart', 'cream-enamel', 0xcbb48f],
  ['azure', 'blue-enamel', 0x99b7dc],
  ['seat', 'leather', 0xbca9aa],
  ['stone', 'stone', 0xa7b4c7],
  ['rock', 'slate', 0x657b9c],
  ['blueRock', 'slate', 0x8399bd],
  ['path', 'stone', 0x99b5c3],
  ['tree', 'leaves', 0x8aa2a0],
  ['pink', 'blossoms', 0xcaa09d],
  ['paper', 'paper', 0xcfc19f],
  ['waterfall', 'waterfall', 0x8cb7dc],
  ['lamp', 'lantern-glass', 0xd8bc8a, true],
  ['spark', 'lantern-glass', 0xf6ca84, true],
  ['creamNose', 'cream-nose', 0xe0c9a5, true],
  ['creamSide', 'cream-side', 0xcdb292],
  ['blueNose', 'blue-nose', 0xccd8ed, true],
  ['blueSide', 'blue-side', 0xbcc8e3],
  ['radioFront', 'radio-front', 0xd5c5ad],
  ['radioBack', 'radio-back', 0xd5c5ad],
  ['radioSide', 'radio-side', 0xd5c5ad],
];
for (const face of [color.radioFront, color.radioBack, color.radioSide]) {
  face.alphaTest = 0.47;
}

function loadSurfaceArtwork(renderer) {
  const loader = new T.TextureLoader();
  const textures = new Map();
  for (const [key, file, tint, emissive] of surfaceArtwork) {
    const target = color[key];
    if (!textures.has(file)) {
      const url = new URL('./art/materials/' + file + '.webp', import.meta.url);
      textures.set(
        file,
        loader.loadAsync(url.href).then((texture) => {
          texture.colorSpace = T.SRGBColorSpace;
          texture.anisotropy = Math.min(
            4,
            renderer.capabilities.getMaxAnisotropy(),
          );
          return texture;
        }),
      );
    }
    textures
      .get(file)
      .then((texture) => {
        target.color.setHex(tint);
        target.map = texture;
        if (emissive) {
          target.emissiveMap = texture;
          if (key === 'lamp' || key === 'spark')
            target.emissiveIntensity = key === 'spark' ? 1 : 0.64;
        }
        target.needsUpdate = true;
      })
      .catch(() => {
        // Keep the underlying material visible if an individual texture cannot load.
      });
  }
}

const faceGeo = new T.PlaneGeometry();
function artworkFace(parent, mat, x, y, z, width, height, yaw = 0) {
  return mesh(parent, faceGeo, mat, [x, y, z], [width, height, 1], [0, yaw, 0]);
}

function mesh(parent, geometry, mat, xyz, size, rotation = [0, 0, 0]) {
  const object = new T.Mesh(geometry, mat);
  object.position.set(...xyz);
  object.scale.set(...size);
  object.rotation.set(...rotation);
  parent.add(object);
  return object;
}
const box = (parent, mat, x, y, z, w, h, d, yaw = 0) =>
  mesh(parent, boxGeo, mat, [x, y, z], [w, h, d], [0, yaw, 0]);
const ball = (parent, mat, x, y, z, w, h, d) =>
  mesh(parent, sphereGeo, mat, [x, y, z], [w, h, d]);

function groupAt(parent, x, y, z) {
  const group = new T.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function light(parent, hue, intensity, distance, x, y, z) {
  const lamp = new T.PointLight(hue, intensity, distance, 1.9);
  lamp.position.set(x, y, z);
  parent.add(lamp);
  return lamp;
}
function lantern(parent, x, y, z, scale = 1, mat = color.lamp) {
  const item = groupAt(parent, x, y, z);
  item.scale.setScalar(scale);
  box(item, color.brass, 0, 0.31, 0, 0.32, 0.11, 0.32);
  box(item, color.brass, 0, -0.29, 0, 0.31, 0.12, 0.31);
  const bulb = mesh(item, lanternGeo, mat, [0, 0, 0], [0.15, 0.5, 0.15]);
  for (const dx of [-0.117, 0.117]) {
    for (const dz of [-0.117, 0.117])
      box(item, color.brass, dx, 0, dz, 0.023, 0.58, 0.023);
  }
  return bulb;
}
function post(parent, x, y, z, lit, height = 2.35) {
  box(parent, color.dark, x, y + height * 0.48, z, 0.11, height, 0.11);
  box(parent, color.brass, x, y + 0.15, z, 0.29, 0.27, 0.29);
  box(parent, color.brass, x, y + height - 0.16, z, 0.23, 0.13, 0.23);
  return lantern(
    parent,
    x,
    y + height + 0.19,
    z,
    1,
    lit ? color.lamp : color.off,
  );
}
function beam(parent, mat, a, b, width, height) {
  const center = a.clone().lerp(b, 0.5);
  const direction = b.clone().sub(a);
  const piece = box(
    parent,
    mat,
    center.x,
    center.y,
    center.z,
    width,
    height,
    direction.length() + 0.05,
  );
  piece.quaternion.setFromUnitVectors(V(0, 0, 1), direction.normalize());
}
function cloth(parent, x, y, z, tint, w = 0.8, h = 1.05) {
  const flag = box(parent, tint, x, y, z, w, h, 0.026);
  box(parent, color.trim, x, y + h / 2 + 0.035, z, w + 0.09, 0.045, 0.055);
  box(parent, color.trim, x, y - h / 2 + 0.04, z, w * 0.87, 0.025, 0.035);
  const emblem = box(
    parent,
    color.trim,
    x,
    y,
    z + 0.025,
    w * 0.24,
    w * 0.24,
    0.019,
  );
  emblem.rotation.z = Math.PI / 4;
  return flag;
}
function roof(parent, x, y, z, width, length) {
  for (const flip of [-1, 1]) {
    const tile = box(
      parent,
      color.roof,
      x + flip * width * 0.25,
      y,
      z,
      width * 0.57,
      0.19,
      length + 1,
    );
    tile.rotation.z = -flip * 0.31;
    const edge = box(
      parent,
      color.edge,
      x + flip * width * 0.53,
      y - width * 0.083,
      z,
      0.28,
      0.23,
      length + 1.45,
    );
    edge.rotation.z = flip * 0.22;
    for (let u = -length / 2; u < length / 2 + 0.5; u += 0.53) {
      const ridge = box(
        parent,
        color.edge,
        x + flip * width * 0.25,
        y + 0.105,
        z + u,
        width * 0.56,
        0.04,
        0.065,
      );
      ridge.rotation.z = tile.rotation.z;
    }
  }
  box(parent, color.edge, x, y + width * 0.085, z, 0.23, 0.24, length + 1.25);
}

function depot(parent, x, z, far = false) {
  const deck = groupAt(parent, x, 0, z);
  box(deck, color.stone, 0, -0.57, 0, 13, 0.85, 13.8);
  for (let i = 0; i < 36; i++)
    box(
      deck,
      i % 4 ? color.oak : color.timber,
      0,
      -0.11,
      (i - 17.5) * 0.381,
      12.7,
      0.2,
      0.37,
    );
  for (const s of [-1, 1]) {
    const sections = far ? [[-6.3, 6.3]] : [[-6.3, -.55], [2.3, 6.3]];
    for (const [from, to] of sections) {
      const middle = (from + to) / 2;
      for (const h of [0.48, 1])
        box(deck, color.timber, s * 6.18, h, middle, 0.14, 0.13, to - from);
    }
    for (let p = -5.7; p <= 5.9; p += 1.22) {
      if (!far && p > -.55 && p < 2.3) continue;
      box(deck, color.timber, s * 6.18, 0.54, p, 0.19, 1.18, 0.19);
      box(deck, color.trim, s * 6.18, 1.1, p, 0.26, 0.1, 0.26);
    }
    for (const p of far ? [-4.5, 3.95] : [0.45, 5.7]) {
      box(deck, color.timber, s * 4.9, 2.1, p, 0.39, 4.3, 0.43);
      box(deck, color.brass, s * 4.9, 0.21, p, 0.53, 0.42, 0.54);
      box(deck, color.trim, s * 4.9, 3.94, p, 0.6, 0.21, 0.58);
      lantern(deck, s * 4.38, 3.02, p, 1.2);
      cloth(deck, s * 4.04, 3.1, p + 0.155, s > 0 ? color.red : color.edge);
    }
    for (const p of [-5.6, -2.3]) post(deck, s * 5.9, 0, p, true, 1.85);
  }
  box(deck, color.timber, 0, 4.12, far ? -0.25 : 3.0, 10.45, 0.26, 0.28);
  roof(deck, 0, 4.53, far ? -0.25 : 3.0, 11.55, far ? 9.6 : 6.0);
  for (const x1 of far ? [-4.8, 4.8] : []) {
    box(deck, color.oak, x1, 0.24, 5.6, 2.6, 0.48, 0.6);
    box(deck, color.timber, x1, 0.64, 5.85, 2.6, 0.53, 0.11);
  }
  return deck;
}
const wingZ = 6.1;
const landings = [
  [-6.03, 6.03, -0.72, 11.82],
  [-10.75, -5.7, 5.01, 7.18],
  [5.7, 10.75, 5.01, 7.18],
  [-18.15, -10.25, 2.4, 9.8],
  [10.25, 18.15, 2.4, 9.8],
];
const nearFurniture = [
  [1.4, 4.57, 4, 5.26],
  [-5.6, -2.41, 1.55, 2.88],
  [-16.6, -13.4, 3.4, 4.55],
  [-17.95, -16.75, 5.2, 7.1],
  [15.05, 16.6, 3.95, 5.4],
  [.95, 2.9, -.8, .1],
];
const farFurniture = [[11.96, 12.82, -89.45, -88.55], [11.5, 13.05, -85.25, -84.3]];
function inArea(x, z, [left, right, front, back]) {
  return x >= left && x <= right && z >= front && z <= back;
}

function walkable(x, z, far) {
  const ground = far ? inArea(x, z, [2.65, 14.14, -94, -82.35]) :
    landings.some((area) => inArea(x, z, area));
  const furniture = far ? farFurniture : nearFurniture;
  return ground && !furniture.some((area) => inArea(x, z, area));
}

function landingWing(parent, side) {
  const x = side * 14.25;
  const path = groupAt(parent, 0, 0, wingZ);
  const span = side * 8.3;
  const indigo = side === 1;
  const trim = indigo ? color.edge : color.red;
  box(path, color.timber, span, -.28, 0, 4.7, .28, 2.65);
  for (let i = 0; i < 14; i++)
    box(path, i % 3 ? color.oak : color.timber, side * (5.98 + .345 * i), -.1, 0, .327, .19, 2.5);
  for (const z of [-1.19, 1.19]) {
    box(path, trim, span, .72, z, 4.5, .16, .15);
    for (const px of [6.28, 8.35, 10.35]) {
      box(path, color.timber, side * px, .35, z, .19, .92, .19);
      if (px !== 8.35)
        lantern(path, side * px, 1.01, z, .69, indigo ? color.path : color.lamp);
    }
  }
  const wing = groupAt(parent, x, 0, wingZ);
  cliff(parent, x, wingZ, 5.42, -.62, 29, color.blueRock);
  box(wing, color.stone, 0, -.33, 0, 8.6, .48, 8.06);
  for (let index = 0; index < 22; index++)
    box(wing, index % 4 ? color.oak : color.timber, 0, -.10, (index - 10.5) * .365, 8.38, .19, .35);
  for (const z of [-3.83, 3.83]) {
    box(wing, color.timber, 0, .61, z, 8.45, .17, .17);
    for (const p of [-3.94, -2, 0, 2, 3.94]) post(wing, p, 0, z, p === 0, 1.31);
  }
  box(wing, color.timber, side * 4.02, .61, 0, .17, .17, 7.8);
  for (const z of [-2, 0, 2]) post(wing, side * 4.02, 0, z, z === 0, 1.38);
  if (indigo) {
    const scope = groupAt(wing, 1.57, 0, -1.46);
    const barrel = new T.CylinderGeometry(.2, .31, 1.82, 16);
    for (const [px, pz] of [[-.57, .43], [.57, .43], [0, -.65]])
      beam(scope, color.timber, V(px, -.02, pz), V(0, 1.07, 0), .14, .14);
    mesh(scope, barrel, color.brass, [0, 1.43, 0], [1, 1, 1], [1.04, 0, -.53]);
    ball(scope, color.azure, .21, 1.91, .76, .45, .29, .28);
    box(scope, color.timber, -.49, 1.05, .41, .47, .055, .38);
    box(scope, color.paper, -.49, 1.083, .41, .42, .033, .34);
    for (const px of [-2.9, 3.1]) {
      post(wing, px, 0, -2.9, true, 2.68);
      cloth(wing, px, 2, -2.78, color.edge, .65, 1.25);
    }
  } else {
    roof(wing, -.2, 3.95, -1.3, 7.3, 3.8);
    for (const px of [-3.54, 3.36]) {
      box(wing, color.timber, px, 1.82, -2.98, .29, 3.63, .29);
      box(wing, color.timber, px, 1.82, .15, .29, 3.63, .29);
      cloth(wing, px, 2.7, .34, color.red, .69, .91);
      lantern(wing, px, 2.65, .25, .82);
    }
    table(wing, -.65, -2.09);
    box(wing, color.timber, -.48, 1.045, -2.11, .63, .09, .43);
    box(wing, color.paper, -.48, 1.10, -2.11, .54, .055, .35);
    box(wing, color.dark, -2.04, 1.17, -2.12, .42, .24, .34);
    box(wing, color.rail, -2.11, 1.32, -2.13, .53, .14, .28);
    for (const h of [.23, .84, 1.43])
      box(wing, color.timber, -3.1, h, .3, .65, .13, 1.92);
    for (const z of [-.57, 1.18])
      box(wing, color.trim, -3.1, .93, z, .31, 1.87, .14);
    box(wing, color.brass, -3.05, .98, .06, .42, .18, .34);
    box(wing, color.azure, -3.05, .98, .55, .42, .18, .32);
    crate(wing, 2.85, 0, 2.78);
  }
}

function noticeBoard(parent, texture, x, y, z, width = 1.65) {
  box(parent, color.timber, x, y, z - .06, width + .24, 1.38, .18);
  for (const side of [-1, 1])
    box(parent, color.timber, x + side * width * .44, y / 2, z - .07, .13, y, .17);
  artworkFace(parent, texture, x, y, z + .047, width, 1.18);
}

function table(parent, x, z) {
  box(parent, color.oak, x, 0.92, z, 3.2, 0.19, 1.3);
  for (const dx of [-1.34, 1.34])
    for (const dz of [-0.51, 0.51])
      box(parent, color.timber, x + dx, 0.44, z + dz, 0.15, 0.9, 0.14);
  box(parent, color.timber, x, 0.28, z, 2.95, 0.12, 0.14);
}
function crate(parent, x, y, z) {
  box(parent, color.oak, x, y + 0.37, z, 0.94, 0.74, 0.83);
  for (const dx of [-0.41, 0.41])
    box(parent, color.timber, x + dx, y + 0.37, z + 0.434, 0.09, 0.75, 0.06);
  for (const dy of [0.12, 0.62])
    box(parent, color.trim, x, y + dy, z + 0.445, 0.9, 0.085, 0.06);
}
function device(parent, x, y, z) {
  const item = groupAt(parent, x, y, z);
  mesh(item, roundedGeo, color.brass, [0, 0.198, 0], [0.3, 0.387, 0.14]);
  artworkFace(item, color.radioFront, 0, 0.198, 0.071, 0.348, 0.402);
  artworkFace(item, color.radioBack, 0, 0.198, -0.071, 0.348, 0.402, Math.PI);
  artworkFace(
    item,
    color.radioSide,
    0.151,
    0.198,
    0,
    0.151,
    0.402,
    Math.PI / 2,
  );
  artworkFace(
    item,
    color.radioSide,
    -0.151,
    0.198,
    0,
    0.151,
    0.402,
    -Math.PI / 2,
  );
  mesh(item, wheelGeo, color.brass, [0.099, 0.409, 0], [0.033, 0.061, 0.033]);
  mesh(item, wheelGeo, color.brass, [0.099, 0.508, 0], [0.011, 0.178, 0.011]);
  ball(item, color.brass, 0.099, 0.6, 0, 0.024, 0.024, 0.024);
  return item;
}
function canister(parent, x, y, z) {
  const item = groupAt(parent, x, y, z);
  mesh(item, wheelGeo, color.brass, [0, 0.045, 0], [0.21, 0.09, 0.21]);
  mesh(item, wheelGeo, color.brass, [0, 0.55, 0], [0.21, 0.09, 0.21]);
  mesh(item, lanternGeo, color.spark, [0, 0.31, 0], [0.158, 0.46, 0.158]);
  for (const x1 of [-0.17, 0.17])
    box(item, color.brass, x1, 0.28, 0, 0.025, 0.48, 0.027);
  return item;
}
function cart(parent, blue = false) {
  const object = groupAt(parent, 0, 0, 0);
  const bodyMat = blue ? color.azure : color.cart;
  box(object, color.dark, 0, 0.29, 0, 1.52, 0.25, 2.55);
  mesh(object, roundedGeo, bodyMat, [0, 0.52, 0], [1.72, 0.46, 2.72]);
  box(object, color.brass, 0, 0.51, 1.32, 1.27, 0.075, 0.08);
  box(object, color.brass, 0, 0.67, -0.99, 1.43, 0.11, 0.31);
  mesh(object, roundedGeo, bodyMat, [0, 0.83, -1.12], [1.39, 0.62, 0.6]);
  artworkFace(
    object,
    blue ? color.blueNose : color.creamNose,
    0,
    0.83,
    -1.426,
    1.24,
    0.54,
    Math.PI,
  );
  const sideArt = blue ? color.blueSide : color.creamSide;
  artworkFace(object, sideArt, 0.863, 0.519, 0, 2.16, 0.371, Math.PI / 2);
  artworkFace(object, sideArt, -0.863, 0.519, 0, 2.16, 0.371, -Math.PI / 2);
  mesh(object, roundedGeo, color.seat, [0, 0.8, 0.32], [1.12, 0.2, 0.62]);
  mesh(object, roundedGeo, color.seat, [0, 1.02, 0.64], [1.12, 0.59, 0.23]);
  box(object, color.brass, 0, 1.01, 0.78, 1.02, 0.055, 0.045);
  box(object, color.brass, -0.58, 1.02, -0.53, 0.06, 0.53, 0.07);
  mesh(object, wheelGeo, color.brass, [-0.58, 1.3, -0.53], [0.14, 0.16, 0.14]);
  const wheels = [];
  for (const px of [-0.85, 0.85])
    for (const pz of [-0.79, 0.8]) {
      const spin = groupAt(object, px, 0.3, pz);
      mesh(
        spin,
        wheelGeo,
        color.dark,
        [0, 0, 0],
        [0.28, 0.19, 0.28],
        [0, 0, Math.PI / 2],
      );
      mesh(
        spin,
        wheelGeo,
        color.brass,
        [Math.sign(px) * 0.1, 0, 0],
        [0.15, 0.07, 0.15],
        [0, 0, Math.PI / 2],
      );
      const bar = box(
        spin,
        color.trim,
        Math.sign(px) * 0.146,
        0,
        0,
        0.02,
        0.07,
        0.29,
      );
      bar.rotation.x = 0.6;
      wheels.push(spin);
    }
  const cargo = canister(object, 0.5, 0.69, 0.92);
  cargo.visible = blue;
  return { object, wheels, cargo };
}

function flora(parent, x, y, z, shape = 1) {
  box(
    parent,
    color.timber,
    x,
    y + 0.62 * shape,
    z,
    0.14 * shape,
    1.25 * shape,
    0.13 * shape,
  );
  const leaf = shape % 0.6 < 0.38 ? color.pink : color.tree;
  for (const [dx, dy, dz] of [
    [0, 1.57, 0],
    [-0.39, 1.25, 0.12],
    [0.38, 1.34, -0.16],
    [0.25, 1.69, 0.09],
  ]) {
    ball(
      parent,
      leaf,
      x + dx * shape,
      y + dy * shape,
      z + dz * shape,
      0.48 * shape,
      0.27 * shape,
      0.41 * shape,
    );
  }
}

function cliff(parent, x, z, radius, top, depth, tint) {
  const low = top - depth / 2;
  const rockGeo = new T.CylinderGeometry(0.72, 1, 1, 7, 1);
  mesh(
    parent,
    rockGeo,
    tint,
    [x, low, z],
    [radius, depth, radius],
    [0, 0.18, 0],
  );
  mesh(
    parent,
    rockGeo,
    color.blueRock,
    [x + radius * 0.25, low - 0.4, z - radius * 0.3],
    [radius * 0.42, depth, radius * 0.48],
    [0, 0.44, 0],
  );
  return rockGeo;
}
function nightLandscape(scene, fixed) {
  scene.background = new T.Color(0x18284c);
  scene.fog = new T.FogExp2(0x192e54, 0.01);
  const skyMat = new T.MeshBasicMaterial({ color: 0xcde7ff, fog: false });
  const moon = groupAt(scene, 23, 33, -146);
  ball(moon, skyMat, 0, 0, 0, 9, 9, 9);
  const moonHalo = new T.MeshBasicMaterial({
    color: 0x6daae7,
    transparent: true,
    opacity: 0.19,
    fog: false,
  });
  ball(moon, moonHalo, 0, 0, 1, 11, 11, 8);
  let seed = 381;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const sky = new T.BufferGeometry();
  const stars = new Float32Array(630);
  for (let i = 0; i < stars.length; i += 3) {
    stars.set([(rand() - 0.5) * 350, 18 + rand() * 115, -129 - rand() * 60], i);
  }
  sky.setAttribute('position', new T.BufferAttribute(stars, 3));
  scene.add(
    new T.Points(
      sky,
      new T.PointsMaterial({
        color: 0x9cb9e8,
        size: 0.28,
        transparent: true,
        opacity: 0.74,
        fog: false,
      }),
    ),
  );
  const rockGeo = new T.CylinderGeometry(0.49, 1, 1, 7, 3);
  const ridges = rockGeo.getAttribute('position');
  for (let i = 0; i < ridges.count; i++) {
    const point = V(ridges.getX(i), ridges.getY(i), ridges.getZ(i));
    if (point.x * point.x + point.z * point.z < 0.01) continue;
    const angle = Math.atan2(point.x, point.z);
    const cut =
      1 + Math.cos(angle * 7 + point.y * 8) * 0.16 + Math.sin(angle * 3) * 0.07;
    ridges.setXYZ(
      i,
      point.x * cut,
      point.y + Math.cos(angle * 2 + 1) * 0.06,
      point.z * cut,
    );
  }
  rockGeo.computeVertexNormals();
  for (let i = 0; i < 43; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (19 + rand() * 54);
    const z = -8 - rand() * 133;
    const r = 3 + rand() * 12;
    const bottom = -39 - rand() * 12;
    const top = -10 + rand() * 26;
    const h = top - bottom;
    mesh(
      fixed,
      rockGeo,
      i % 3 ? color.rock : color.blueRock,
      [x, bottom + h / 2, z],
      [r, h, r * 0.79],
      [0, rand() * 3, 0],
    );
    if (i % 5 === 0 && r > 6) {
      for (let k = 0; k < 3; k++) {
        const px = x + (k - 1) * 2.6;
        const py = top + 0.7;
        box(fixed, color.timber, px, py, z, 2.0, 1.48, 2.0);
        roof(fixed, px, py + 0.83, z, 2.22, 1.66);
        box(fixed, color.lamp, px, py, z + 1.03, 0.5, 0.52, 0.04);
      }
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = (i % 2 ? 1 : -1) * (26 + i * 2.5);
    const z = -22 - i * 9.5;
    for (let j = 0; j < 3; j++)
      box(
        fixed,
        color.waterfall,
        x + j * 0.15,
        -16,
        z,
        0.11 + j * 0.08,
        25 + j * 1.7,
        0.09,
      );
  }
  const mistMat = new T.MeshBasicMaterial({
    color: 0x446799,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  for (let i = 0; i < 15; i++)
    ball(
      fixed,
      mistMat,
      (rand() - 0.5) * 133,
      -18 - rand() * 8,
      -4 - rand() * 122,
      7 + rand() * 10,
      0.66 + rand() * 1.3,
      3 + rand() * 5,
    );
  return moon;
}

function track(parent, path, alternate = false) {
  const count = Math.ceil(path.getLength() / 0.64);
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = path.getPoint(t);
    const direction = path.getTangent(t);
    const angle = Math.atan2(direction.x, direction.z);
    box(
      parent,
      alternate ? color.roof : color.path,
      p.x,
      p.y - 0.2,
      p.z,
      4.05,
      0.36,
      0.69,
      angle,
    );
    if (i % 2 === 0)
      box(parent, color.timber, p.x, p.y - 0.008, p.z, 2.14, 0.22, 0.16, angle);
    if (i === count) continue;
    const next = path.getPoint((i + 1) / count);
    const normal = V(direction.z, 0, -direction.x);
    const nDir = path.getTangent((i + 1) / count);
    const nNorm = V(nDir.z, 0, -nDir.x);
    for (const side of [-1, 1]) {
      const a = p.clone().addScaledVector(normal, side * 0.66);
      const b = next.clone().addScaledVector(nNorm, side * 0.66);
      a.y += 0.14;
      b.y += 0.14;
      beam(parent, color.rail, a, b, 0.1, 0.1);
      if (i % 3 === 0) {
        const x = p.x + normal.x * side * 1.96,
          z = p.z + normal.z * side * 1.96;
        box(parent, color.trim, x, p.y + 0.52, z, 0.1, 0.9, 0.1);
      }
      a.copy(p).addScaledVector(normal, side * 1.95);
      b.copy(next).addScaledVector(nNorm, side * 1.95);
      a.y += 0.92;
      b.y += 0.92;
      beam(parent, color.timber, a, b, 0.1, 0.1);
    }
  }
}

function batch(source, parent) {
  source.updateMatrixWorld(true);
  const groups = new Map();
  source.traverse((child) => {
    if (!child.isMesh) return;
    const id = child.geometry.uuid + child.material.uuid;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(child);
  });
  for (const items of groups.values()) {
    const instances = new T.InstancedMesh(
      items[0].geometry,
      items[0].material,
      items.length,
    );
    items.forEach((item, i) => instances.setMatrixAt(i, item.matrixWorld));
    instances.instanceMatrix.needsUpdate = true;
    parent.add(instances);
  }
}

function scenePoint(progress, style) {
  if (progress < FORK) return route.start.getPoint(progress / FORK);
  if (progress < MERGE)
    return route[style].getPoint((progress - FORK) / (MERGE - FORK));
  return route.end.getPoint((progress - MERGE) / (1 - MERGE));
}

export function createWorld(canvas, notify, finished, onInteract) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  loadSurfaceArtwork(renderer);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(68, 1, 0.065, 245);
  const fixed = new T.Group();
  const effects = new T.Group();
  scene.add(effects);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.3));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const hemi = new T.HemisphereLight(0xa5caff, 0x56415b, 2.1);
  const sun = new T.DirectionalLight(0xa5bdff, 2.3);
  sun.position.set(-14, 35, -57);
  scene.add(hemi, sun);
  const moon = nightLandscape(scene, fixed);
  new T.TextureLoader().load(
    new URL('./art/cover.webp', import.meta.url).href,
    (texture) => {
      texture.colorSpace = T.SRGBColorSpace;
      const colorPlate = new T.ShaderMaterial({
        uniforms: { plate: { value: texture } },
        vertexShader:
          'varying vec2 picture; void main(){picture=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: `
        uniform sampler2D plate;
        varying vec2 picture;
        void main() {
          float side = smoothstep(0.0,.13,picture.x) * smoothstep(0.0,.13,1.0-picture.x);
          float edges = side * smoothstep(0.0,.10,picture.y) * smoothstep(0.0,.12,1.0-picture.y);
          gl_FragColor = vec4(texture2D(plate,picture).rgb,edges);
          #include <colorspace_fragment>
        }
      `,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      const backdrop = new T.Mesh(new T.PlaneGeometry(257, 171.33), colorPlate);
      backdrop.position.set(24, 30, -155);
      scene.add(backdrop);
      moon.visible = false;
      if (!active) renderer.render(scene, camera);
    },
  );

  cliff(fixed, 0, 3, 10, -0.7, 35, color.rock);
  cliff(fixed, 8, -88, 11, -0.7, 37, color.rock);
  depot(fixed, 0, 5.3);
  depot(fixed, 8.4, -88, true);
  landingWing(fixed, -1);
  landingWing(fixed, 1);
  const pictureLoader = new T.TextureLoader();
  function fieldTexture(name) {
    const map = pictureLoader.load(new URL('./art/' + name + '.webp', import.meta.url).href);
    map.colorSpace = T.SRGBColorSpace;
    return new T.MeshStandardMaterial({ map, roughness: .88, color: 0xdcc9b3 });
  }
  noticeBoard(fixed, fieldTexture('archive'), -14.8, 2.03, 3.3, 2.12);
  noticeBoard(fixed, fieldTexture('dispatch'), 2, 1.7, -.41);
  table(fixed, 12.22, -84.77);
  box(fixed, color.timber, 12.22, 1.04, -84.77, .55, .065, .48);
  box(fixed, color.paper, 12.22, 1.095, -84.77, .52, .055, .45);
  light(scene, 0xa5d9ff, 26, 13, 14.3, 3.4, 4.1);
  light(scene, 0xffad57, 35, 13, -15.1, 3.3, 4.45);
  light(scene, 0xffbf71, 20, 8, 12.3, 2.8, -84.35);
  for (const edge of [-1, 1])
    for (let i = 0; i < 6; i++)
      flora(
        fixed,
        edge * (6.9 + i * 0.38),
        -0.8,
        i < 2 ? 1.65 + i : 8.15 + (i - 2) * 1.16,
        1 + (i % 3) * 0.32,
      );
  for (let i = 0; i < 5; i++)
    flora(fixed, i % 2 ? 15 : 1.3, -0.6, -83 - i * 2.5, 1.25 + i * 0.18);
  for (const [x, z] of straightSupport) {
    box(fixed, color.rock, x, -12, z, 1.15, 24, 1.28);
    box(fixed, color.blueRock, x, -0.7, z, 2.52, 1.62, 1.65);
    beam(fixed, color.blueRock, V(x, -5, z), V(x + 2.4, -0.3, z), 0.5, 0.58);
    beam(fixed, color.blueRock, V(x, -5, z), V(x - 2.4, -0.3, z), 0.5, 0.58);
  }
  Object.entries(route).forEach(([name, path]) =>
    track(fixed, path, name === 'rough'),
  );
  for (const x of [-0.66, 0.66])
    box(fixed, color.rail, x, 0.13, 3, 0.1, 0.11, 8.3);
  for (let z = -1; z <= 8; z += 0.55)
    box(fixed, color.timber, 0, 0.04, z, 2.18, 0.17, 0.15);
  for (const x of [7.74, 9.06])
    box(fixed, color.rail, x, 0.11, -89, 0.1, 0.1, 7);
  for (let z = -93; z <= -85; z += 0.67)
    box(fixed, color.timber, 8.4, 0.05, z, 2.18, 0.15, 0.16);

  table(fixed, 3.0, 4.6);
  table(fixed, -4.0, 2.2);
  for (const [x, y, z] of [
    [4.9, 0, 1],
    [-4.8, 0, 7.9],
    [-4.6, 0.74, 8.05],
    [5.05, 0, 8.54],
  ])
    crate(fixed, x, y, z);
  const lever = groupAt(fixed, -3.75, 1.015, 2.16);
  box(lever, color.dark, 0, .055, 0, .64, .11, .43);
  for (const x of [-.25, .25])
    for (const z of [-.16, .16])
      mesh(lever, wheelGeo, color.brass, [x, .118, z], [.052, .023, .052]);
  mesh(lever, wheelGeo, color.brass, [0, .17, 0], [.14, .22, .14], [Math.PI / 2, 0, 0]);
  const quadrant = new T.TorusGeometry(.27, .024, 8, 26, Math.PI * .86);
  for (const z of [-.087, .087])
    mesh(lever, quadrant, color.rail, [0, .14, z], [1, 1, 1], [0, 0, .22]);
  const handle = groupAt(effects, -3.75, 1.185, 2.16);
  const grip = V(-.29, .46, 0);
  beam(handle, color.dark, V(0, 0, 0), grip, .067, .066);
  mesh(handle, wheelGeo, color.red, grip.toArray(), [.15, .34, .15], [0, 0, Math.PI / 2]);
  for (const x of [-.66, .66])
    box(fixed, color.rail, x, .187, 1.45, .17, .08, .3);
  cloth(fixed, -4.69, 2.21, 5.8, color.red, 1.2, 1.02);

  const radio = device(effects, 2.77, 1.015, 4.82);
  radio.scale.setScalar(1.28);
  radio.rotation.y = -0.24;
  const spark = canister(effects, 3.9, 1.025, 4.59);
  const playerCart = cart(effects);
  playerCart.object.position.set(0, 0.03, 3.32);
  const trialCanister = canister(effects, 0, 0, 0);
  trialCanister.visible = false;
  const reachTexture = new T.TextureLoader().load(
    new URL('./art/lever-hand.webp', import.meta.url).href,
  );
  reachTexture.colorSpace = T.SRGBColorSpace;
  const reachHand = new T.Sprite(new T.SpriteMaterial({
    map: reachTexture, depthTest: false, depthWrite: false, toneMapped: false,
  }));
  reachHand.center.set(.29, .57);
  reachHand.visible = false;
  reachHand.renderOrder = 6;
  scene.add(reachHand);
  const opponent = cart(effects, true);
  opponent.object.position.set(-2.62, 0.03, 1.5);
  const lampRoot = groupAt(effects, 12.4, 0, -89);
  box(lampRoot, color.timber, 0, 0.38, 0, 0.71, 0.75, 0.7);
  const beacon = post(lampRoot, 0, 0.64, 0, false, 2.0);
  const bridgeLamps = [];
  for (const path of [route.start, route.smooth, route.end]) {
    for (let i = 0; i < 7; i++) {
      const p = path.getPoint((i + 0.3) / 7);
      const n = path.getTangent((i + 0.3) / 7);
      const x = p.x + n.z * 2.08,
        z = p.z - n.x * 2.08;
      bridgeLamps.push(post(effects, x, p.y, z, false, 1.75));
    }
  }
  light(scene, 0xffad57, 52, 14, 4.8, 3.1, 5.1);
  light(scene, 0xffc080, 37, 13, -4.6, 3.0, 5.56);
  light(scene, 0xfed88f, 28, 11, 4, 2.5, -0.8);
  light(scene, 0xffae69, 51, 15, 12.6, 3.7, -90);
  const lampGlow = light(scene, 0xffbd63, 0, 17, 12.4, 3.08, -89);
  batch(fixed, scene);

  const positions = {
    radio: radio.position.clone().add(V(0, 0.25, 0)),
    spark: V(3.9, 1.33, 4.59),
    handbook: V(-14.73, 1.15, 3.98),
    shelf: V(-17.3, 1.11, 6.45),
    signal: V(15.35, 1.2, 5.05),
    archive: V(-14.8, 1.72, 3.32),
    dispatch: V(2, 1.55, -.41),
    arrival: V(12.22, 1.13, -84.77),
    cart: V(0, 0.86, 3.32),
    lever: V(-4.04, 1.63, 2.16),
    launch: V(0, 0.7, 1.1),
    beacon: V(12.4, 1.6, -89),
  };
  const radioReach = 2.85;
  const radioArea = new T.Sphere(positions.radio, radioReach);
  const meshBounds = new T.Box3();
  const radioOccluders = [];
  // Only bench-area meshes can block the short ray used for radio pickup.
  fixed.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    meshBounds.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
    if (meshBounds.intersectsSphere(radioArea)) radioOccluders.push(object);
  });
  const radioRay = new T.Raycaster();
  const radioScreen = new T.Vector3();
  const radioDirection = new T.Vector3();
  const hintTargets = new Map(
    Object.entries(positions).map(([id, position]) => {
      const object = new T.Object3D();
      object.position.copy(position);
      return [id, { object, hintAnchor: [0, 0.61, 0] }];
    }),
  );
  const showHint = createHintPortal(T, scene, hintTargets);
  const cue = { visible: false, id: null };
  let targets = [];
  let carrying = false;
  let active = false;
  let mode = 'walk';
  let yaw = -0.28;
  let pitch = -0.07;
  let race;
  let trial;
  let last = 0;
  let raf = 0;
  let finishId;
  let tick = 0;
  const player = V(0.2, 1.65, 9.8);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const forward = V(0, 0, -1);
  const input = new Set();
  const stick = new T.Vector2();
  const desired = V(0, 0, 0);
  const aim = V(0, 0, 0);
  const keys = new Map([
    ['ArrowUp', 'up'],
    ['KeyW', 'up'],
    ['ArrowLeft', 'left'],
    ['KeyA', 'left'],
    ['ArrowDown', 'down'],
    ['KeyS', 'down'],
    ['ArrowRight', 'right'],
    ['KeyD', 'right'],
  ]);

  function resize() {
    const width = canvas.clientWidth || innerWidth;
    const height = canvas.clientHeight || innerHeight;
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resize);
  resize();

  function key(event, pressed) {
    const name = keys.get(event.code);
    if (!name || !active || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    if (pressed) input.add(name);
    else input.delete(name);
  }
  window.addEventListener('keydown', (event) => key(event, true));
  window.addEventListener('keyup', (event) => key(event, false));
  function clearMovement() {
    input.clear();
    stick.set(0, 0);
  }
  const pointer = bindScenePointer(canvas, {
    canLook: () => active && mode === 'walk',
    onLook(dx, dy, touch) {
      if ((!dx && !dy) || !Number.isFinite(dx) || !Number.isFinite(dy)) return;
      const turn = touch ? dx * .006 : between(dx, -240, 240) * MOUSE_LOOK_RATE;
      const tilt = touch ? dy * .005 : between(dy, -240, 240) * MOUSE_LOOK_RATE;
      yaw -= turn;
      pitch = between(pitch - tilt, -.98, .98);
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      notify({ mode, look: true });
    },
    onInteract,
    onRelease: clearMovement,
  });

  function canReachRadio() {
    if (!radio.visible) return false;
    const center = positions.radio;
    radioDirection.copy(center).sub(camera.position);
    const distance = radioDirection.length();
    if (distance > radioReach) return false;
    radioScreen.copy(center).project(camera);
    if (Math.abs(radioScreen.x) > 0.56 || Math.abs(radioScreen.y) > 0.48 ||
        radioScreen.z < -1 || radioScreen.z > 1) return false;
    radioRay.set(camera.position, radioDirection.normalize());
    radioRay.far = distance - 0.1;
    return radioRay.intersectObjects(radioOccluders, false).length === 0;
  }

  function currentTarget() {
    if (mode !== 'walk') return null;
    camera.getWorldDirection(forward);
    let selected,
      score = -Infinity;
    for (const id of targets) {
      const p = positions[id];
      if (!p || (id === 'radio' && !canReachRadio())) continue;
      aim.copy(p).sub(player);
      const length = aim.length();
      if (length > 4.95) continue;
      const dot = aim.normalize().dot(forward);
      if (dot < 0.37 && length > 1.8) continue;
      const value = dot * 2.5 - length * 0.25;
      if (value > score) {
        selected = id;
        score = value;
      }
    }
    return selected ?? null;
  }

  function positionCart(model, progress, style, offset = 0) {
    const p = scenePoint(progress, style);
    const next = scenePoint(Math.min(0.9999, progress + 0.003), style);
    if (progress >= 0.9999) {
      next.copy(p).add(p.clone().sub(scenePoint(0.998, style)));
    }
    const tangent = next.clone().sub(p).normalize();
    model.object.position
      .copy(p)
      .add(V(tangent.z * offset, 0.11, -tangent.x * offset));
    model.object.rotation.y = Math.atan2(-tangent.x, -tangent.z);
    return tangent;
  }

  const leverView = V(-3.25, 1.91, 3.74);
  const leverFocus = V(-3.9, 1.45, 2.17);
  const trackView = V(-1.94, 1.88, 5);
  const trackFocus = V(.3, .64, 1.95);
  const trialImpact = V(1.38, .09, 2.04);
  const trialRelease = V(.5, .74, 3.16);
  const gripPosition = V(0, 0, 0);
  const viewRight = V(0, 0, 0);

  function stopTrial() {
    if (!trial) return;
    playerCart.object.position.set(0, .03, 3.32);
    playerCart.object.rotation.set(0, 0, 0);
    for (const wheel of playerCart.wheels) wheel.rotation.x = 0;
    playerCart.cargo.visible = trial.cargo;
    trialCanister.visible = false;
    reachHand.visible = false;
    handle.rotation.z = 0;
    trial = undefined;
    mode = 'walk';
  }

  function animateTrial(dt) {
    const current = trial;
    const { success, power, play, complete } = current;
    const t = current.time += Math.min(dt, .12);
    const smooth = T.MathUtils.smoothstep;
    const reach = smooth(t, .22, .72);
    const pull = smooth(t, .72, 1.18);
    const release = smooth(t, 1.2, 1.49);
    const toTrack = reducedMotion.matches ? Number(t >= 1.62) : smooth(t, 1.42, 2.05);

    handle.rotation.z = -1.2 * pull;
    camera.position.copy(leverView).lerp(trackView, toTrack);
    camera.lookAt(leverFocus.clone().lerp(trackFocus, toTrack));
    reachHand.visible = t >= .2 && t < 1.5;
    if (reachHand.visible) {
      handle.localToWorld(gripPosition.copy(grip));
      viewRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const offset = Math.max(1 - reach, release);
      reachHand.position.copy(gripPosition).addScaledVector(viewRight, .02 + offset * .75);
      reachHand.position.y += .025 - offset * .37;
      reachHand.position.z += .13 + offset * .16;
      const image = reachTexture.image;
      reachHand.scale.set(.55 * (image ? image.width / image.height : 1.7), .49, 1);
      reachHand.material.rotation = pull * -.15;
    }

    const rollStart = 2.06;
    const bump = 2.78;
    const land = 3.31;
    const speed = .86 + power * .55;
    const distance = 1.08 * smooth(t, rollStart, bump) + 1.43 * speed * smooth(t, bump, 3.62);
    const jolt = t >= bump ? Math.sin((t - bump) * 18) * Math.exp(-(t - bump) * 8) : 0;
    playerCart.object.position.set(0, .03 + Math.max(jolt, 0) * .17, 3.32 - distance);
    playerCart.object.rotation.x = jolt * .15;
    for (const wheel of playerCart.wheels) wheel.rotation.x = distance / .28;

    const thrown = !success && t >= bump;
    playerCart.cargo.visible = !thrown && current.cargo;
    trialCanister.visible = thrown;
    if (thrown) {
      const flight = between((t - bump) / (land - bump), 0, 1);
      trialCanister.position.copy(trialRelease).lerp(trialImpact, flight);
      trialCanister.position.y += Math.sin(Math.PI * flight) * .76;
      trialCanister.rotation.set(flight * 1.23, flight * .8, -flight * .62);
    }
    if (!reducedMotion.matches && t >= land && !success)
      camera.position.y += Math.sin((t - land) * 40) * Math.exp(-(t - land) * 15) * .027;

    for (const [beat, when] of [
      ['lever', 1.18],
      ['wheels', rollStart],
      ['jolt', bump],
      ['impact', land],
    ]) {
      if (t < when || current.beats.has(beat)) continue;
      current.beats.add(beat);
      if (beat !== 'impact' || thrown) play(beat);
    }
    if (t >= 4.1 && !current.done) {
      current.done = true;
      complete();
    }
  }

  function frame(now) {
    if (!active) return;
    const elapsed = Math.min(0.6, (now - (last || now)) / 1000);
    const dt = mode === 'race' ? elapsed : Math.min(0.125, elapsed);
    last = now;
    tick += dt;
    if (mode === 'walk') {
      camera.rotation.set(pitch, yaw, 0, 'YXZ');
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      desired.set(0, 0, 0);
      if (input.has('up')) desired.add(forward);
      if (input.has('down')) desired.sub(forward);
      if (input.has('right')) desired.add(V(-forward.z, 0, forward.x));
      if (input.has('left')) desired.add(V(forward.z, 0, -forward.x));
      desired.addScaledVector(forward, -stick.y);
      desired.addScaledVector(V(-forward.z, 0, forward.x), stick.x);
      const startX = player.x;
      const startZ = player.z;
      if (desired.lengthSq() > 0) {
        desired
          .clampLength(0, 1)
          .multiplyScalar(dt * 4.15)
          .add(player);
        const far = player.z < -70;
        if (walkable(desired.x, player.z, far)) player.x = desired.x;
        if (walkable(player.x, desired.z, far)) player.z = desired.z;
      }
      const distance = Math.hypot(player.x - startX, player.z - startZ);
      const moving = distance > 0;
      camera.position.set(
        player.x,
        player.y +
          (moving && !reducedMotion.matches ? Math.sin(tick * 14) * 0.042 : 0),
        player.z,
      );
      notify({ mode, moving, distance, target: currentTarget() });
    } else if (mode === 'trial') {
      animateTrial(elapsed);
    } else {
      race = advanceRace(race, dt);
      if (race.progress >= FORK && !race.locked)
        race = { ...race, locked: true };
      const tangent = positionCart(playerCart, race.progress, race.route, 0.68);
      positionCart(opponent, race.rival, 'smooth', -1.06);
      const p = playerCart.object.position;
      camera.position
        .copy(p)
        .addScaledVector(tangent, 0.45)
        .add(V(0, 1.35, 0));
      camera.lookAt(
        p
          .clone()
          .addScaledVector(tangent, 8)
          .add(V(0, 1.04, 0)),
      );
      for (const wheel of playerCart.wheels)
        wheel.rotation.x += race.speed * dt * 0.42;
      for (const wheel of opponent.wheels) wheel.rotation.x += 12 * dt;
      notify({ mode, race });
      if (race.progress >= 1 && !finishId) {
        const first = race.rival < 1;
        finishId = requestAnimationFrame(() => {
          finishId = undefined;
          mode = 'walk';
          playerCart.object.visible = true;
          player.set(8.55, 1.65, -87.4);
          yaw = -0.98;
          pitch = -0.08;
          input.clear();
          finished(first);
        });
      }
    }
    showHint(cue.visible ? cue.id : null, camera, tick, !reducedMotion.matches);
    if (!carrying) spark.rotation.y = tick * 0.55;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    active = false;
    pointer.release();
    cancelAnimationFrame(raf);
    if (finishId) cancelAnimationFrame(finishId);
    finishId = undefined;
    clearMovement();
    last = 0;
  }
  function resume() {
    if (active) return;
    active = true;
    resize();
    raf = requestAnimationFrame(frame);
  }
  function reset(far = false) {
    stopTrial();
    mode = 'walk';
    playerCart.object.visible = true;
    player.set(far ? 8.55 : 0.2, 1.65, far ? -87.4 : 9.8);
    yaw = far ? -0.98 : -0.28;
    pitch = -0.07;
    playerCart.object.position.set(0, 0.03, 3.32);
    playerCart.object.rotation.y = 0;
    opponent.object.position.set(-2.62, 0.03, 1.5);
    opponent.object.rotation.y = 0;
    cue.visible = false;
    input.clear();
  }
  return {
    pause,
    resume,
    reset,
    focus: pointer.focus,
    releasePointer: pointer.release,
    currentTarget,
    setTargets(ids) {
      targets = ids;
    },
    point(id) {
      cue.id = id;
      cue.visible = !!id;
    },
    interact(id) {
      return positions[id] && currentTarget() === id;
    },
    setStick(x, y) {
      stick.set(x, y);
    },
    lookNudge() {
      yaw += 0.13;
      notify({ mode, look: true });
    },
    approachTutorial() {
      return player.distanceTo(positions.radio) < 5;
    },
    setWorldState({ radioTaken, cargo, mounted, lit }) {
      carrying = cargo;
      radio.visible = !radioTaken;
      spark.visible = !cargo;
      playerCart.cargo.visible = mounted;
      for (const bulb of bridgeLamps)
        bulb.material = lit ? color.lamp : color.off;
      beacon.material = lit ? color.spark : color.off;
      lampGlow.intensity = lit ? 62 : 0;
    },
    startTrial({ success, power, play, complete }) {
      stopTrial();
      trial = { success, power, play, complete, time: 0, done: false, beats: new Set(),
        cargo: playerCart.cargo.visible };
      mode = 'trial';
      cue.visible = false;
      clearMovement();
      pointer.release();
    },
    releaseTrial() {
      if (trial?.done) stopTrial();
    },
    startRace(part) {
      mode = 'race';
      pointer.release();
      playerCart.object.visible = false;
      race = {
        part,
        route: part === 'runner' ? 'smooth' : 'rough',
        speed: 0,
        started: false,
        boost: 0,
        progress: 0,
        rival: 0,
        locked: false,
      };
      cue.visible = false;
      input.clear();
    },
    tapAccelerator() {
      if (mode !== 'race' || race.progress >= 1) return;
      race.started = true;
      race.boost = Math.min(1, race.boost + .3);
    },
    chooseRoute(style) {
      if (mode === 'race' && !race.locked) race = { ...race, route: style };
    },
    preview() {
      resize();
      camera.position.set(0.2, 1.65, 9.8);
      camera.rotation.set(-0.07, -0.28, 0, 'YXZ');
      renderer.render(scene, camera);
    },
  };
}
