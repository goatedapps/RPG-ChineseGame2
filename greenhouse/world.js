import { createHintPortal } from '../shared/hint-portal.js';
import { createKit } from './props.js';
import { createLabFurniture } from './lab-furniture.js';

const HALF = 10;
const CEILING = 3.85;
const AMBER = '#f2cd84';

function roundedPanel(THREE, width, height, radius) {
  const x = width / 2;
  const y = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.quadraticCurveTo(x, -y, x, -y + radius);
  shape.lineTo(x, y - radius);
  shape.quadraticCurveTo(x, y, x - radius, y);
  shape.lineTo(-x + radius, y);
  shape.quadraticCurveTo(-x, y, -x, y - radius);
  shape.lineTo(-x, -y + radius);
  shape.quadraticCurveTo(-x, -y, -x + radius, -y);
  return shape;
}

function phoneProp(THREE, kit, parent, stand) {
  const { group, material, box, round, texture } = kit;
  const device = group(0, .34, 0, 0, parent);
  device.rotation.x = -.16;
  const shell = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedPanel(THREE, .25, .46, .035), {
    depth: .027, bevelSegments: 2, bevelSize: .004, bevelThickness: .004, curveSegments: 7,
  }), material('#788c8d', { metalness: .62, roughness: .3 }));
  shell.position.z = -.016;
  device.add(shell);

  const bezel = new THREE.Mesh(new THREE.ShapeGeometry(roundedPanel(THREE, .245, .455, .034), 7), material('#101b22'));
  bezel.position.z = .016;
  device.add(bezel);

  const width = .226;
  const height = .436;
  const screenGeometry = new THREE.ShapeGeometry(roundedPanel(THREE, width, height, .029), 7);
  const { position, uv } = screenGeometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, position.getX(index) / width + .5, position.getY(index) / height + .5);
  }
  const screen = texture((ctx, w, h) => {
    const wallpaper = ctx.createLinearGradient(0, h, w, 0);
    wallpaper.addColorStop(0, '#102c3b');
    wallpaper.addColorStop(.55, '#187168');
    wallpaper.addColorStop(1, '#9cbca3');
    ctx.fillStyle = wallpaper;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4bac9369';
    ctx.beginPath();
    ctx.ellipse(.8 * w, .9 * h, .85 * w, .31 * h, -.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3fff8';
    ctx.font = 'bold 43px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('08:12', w / 2, .26 * h);
    ctx.fillStyle = '#ecf7fbdf';
    ctx.beginPath();
    ctx.roundRect(.07 * w, .39 * h, .86 * w, .16 * h, 11);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = 'bold 19px system-ui';
    ctx.fillStyle = '#19362f';
    ctx.fillText('A Ning', .16 * w, .487 * h);
    ctx.fillStyle = '#268b67';
    ctx.beginPath();
    ctx.arc(.85 * w, .47 * h, .031 * w, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2fffa';
    ctx.fillRect(.36 * w, .965 * h, .28 * w, .009 * h);
  }, 192, 384);
  const face = new THREE.Mesh(screenGeometry, new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }));
  face.position.z = .018;
  device.add(face);
  round([.014, .014, .004], [0, .202, .02], material('#101c25'), device);
  box([.008, .051, .012], [.127, .096, 0], stand, device);
  box([.008, .036, .012], [-.127, .074, 0], stand, device);
}

function drawLockedDisplay(ctx, width, height) {
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#183843');
  background.addColorStop(1, '#0c242b');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#55989873';
  ctx.lineWidth = 1;
  ctx.strokeRect(9, 9, width - 18, height - 18);
  const center = width / 2;
  ctx.strokeStyle = '#b4d6c5';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(center, 80, 12, Math.PI, 2 * Math.PI);
  ctx.lineTo(center + 12, 87);
  ctx.moveTo(center - 12, 80);
  ctx.lineTo(center - 12, 87);
  ctx.stroke();
  ctx.fillStyle = '#b4d6c5';
  ctx.beginPath();
  ctx.roundRect(center - 19, 85, 38, 30, 4);
  ctx.fill();
  ctx.fillStyle = '#12333b';
  ctx.beginPath();
  ctx.arc(center, 98, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillRect(center - 1, 98, 2, 7);
  ctx.fillStyle = '#eaf5e8';
  ctx.font = '600 24px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('需要登录', center, 150);
}

export function createWorld(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#183442');
  scene.fog = new THREE.Fog('#294856', 17, 33);
  const kit = createKit(THREE, scene);
  const { group, material, box, tube, pot, round, leaf, plane, plate, texture, imageTexture, imageMaterial, metricSurface, flooring, crumpledPaper, finish } = kit;
  const targets = new Map();
  const colliders = [];
  const leaves = [];
  const outsideRain = [];
  const tiledFloors = [];
  let clock = 0;

  const labSurface = (name, fallback, tint, scale, options) =>
    metricSurface('lab/' + name + '.webp', fallback, tint, scale, options);
  const wall = labSurface('ivory-plaster', '#bac3af', '#fff9ed', [.55, .55], { roughness: .91 });
  const wallLow = labSurface('sage-enamel', '#57716a', '#a0b3a6', [.54, .9], { roughness: .79 });
  const navy = labSurface('powder-coated-steel', '#183039', '#728b94', [1.1, 1.1]);
  const ceilingMat = labSurface('acoustic-ceiling', '#657469', '#c6d0c5', [2.3, 2.3],
    { emissive: '#182126', emissiveIntensity: .12 });
  const trim = labSurface('powder-coated-steel', '#365454', '#e4ece6', [1.45, 1.45], { metalness: .15 });
  const metal = labSurface('instrument-body', '#284140', '#e3e6df', [1.8, 1.8], { metalness: .2 });
  const counter = labSurface('tabletop', '#a08866', '#fff2da', [.67, 1.18], { roughness: .61 });
  const enamel = labSurface('sage-enamel', '#4c6963', '#e8f0e5', [1.05, 1.05], { roughness: .65 });
  const wood = labSurface('honey-oak', '#735e4a', '#d4b189', [1.35, 1.75]);
  const ceramic = imageMaterial('lab/speckled-ceramic.webp', '#bbc7a8', { roughness: .42 });
  const terracotta = imageMaterial('lab/terracotta.webp', '#a87452', { roughness: .88 });
  const soil = labSurface('potting-soil', '#382e24', '#eee0d1', [6, 6], { roughness: .96 });
  const dark = labSurface('instrument-body', '#122224', '#747e87', [2.5, 2.5]);
  const glass = material('#80b6b4', { transparent: true, opacity: .21, depthWrite: false, roughness: .18 });
  const windowGlass = material('#537f93', { transparent: true, opacity: .32, depthWrite: false, roughness: .27 });
  const rubber = labSurface('rubber-grip', '#303c31', '#c3cac5', [4, 4]);
  const amber = material('#de9b4f', { emissive: '#a35e23', emissiveIntensity: .35 });
  const tape = material('#ee8b3c', { emissive: '#ff8e43', emissiveIntensity: .19 });
  const marker = material('#943c37');
  const paper = material('#e9dfb7');
  const yellow = material('#c5ae55', { emissive: '#9f702a', emissiveIntensity: .22 });
  const blue = material('#449b8c', { emissive: '#175851', emissiveIntensity: .22 });
  const bulb = new THREE.MeshBasicMaterial({ color: '#d8edd3' });
  const bright = new THREE.MeshBasicMaterial({ color: '#fff5c3' });
  const dim = new THREE.MeshBasicMaterial({ color: '#849187' });
  const stems = [material('#426a41'), material('#577c42')];
  const leafOptions = { vertexColors: true, side: THREE.DoubleSide, alphaTest: .45, roughness: .62 };
  const matureLeaf = imageMaterial('lab/leaf-mature.webp', '#386845', leafOptions);
  const youngLeaf = imageMaterial('lab/leaf-young.webp', '#719b50', leafOptions);
  const droopingLeaf = imageMaterial('lab/leaf-drooping.webp', '#87964f', leafOptions);
  const deepLeaf = imageMaterial('lab/leaf-deep.webp', '#467149', leafOptions);
  const greenLeaf = [matureLeaf, deepLeaf, youngLeaf];
  const goldenLeaf = [youngLeaf, matureLeaf, deepLeaf];
  const droopingLeaves = [droopingLeaf, youngLeaf, droopingLeaf];
  const floorShadow = new THREE.MeshBasicMaterial({
    map: texture((ctx, w, h) => {
      const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gradient.addColorStop(0, '#10242496');
      gradient.addColorStop(.45, '#16262374');
      gradient.addColorStop(1, '#10242400');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }, 128, 128),
    transparent: true, depthWrite: false,
  });
  const sun = new THREE.DirectionalLight('#bfd7ed', 1.42);
  sun.position.set(-6, 8, -3);
  scene.add(sun, new THREE.HemisphereLight('#d6ebfa', '#5b6558', 2.0));
  const fill = new THREE.DirectionalLight('#ffdcac', .58);
  fill.position.set(5, 3, 9);
  scene.add(fill);
  const windowWeather = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  imageTexture('lab/rain-glass.webp', (map) => {
    map.wrapS = THREE.RepeatWrapping;
    map.repeat.x = 3;
    windowWeather.map = map;
    windowWeather.opacity = .32;
    windowWeather.needsUpdate = true;
  });

  function obstacle(x, z, w, d) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  const { bench, crate, shelves } = createLabFurniture(kit, obstacle, { floorShadow, counter, wood, enamel, metal, trim });

  function interact(id, label, at, angle = 0) {
    const object = group(...at, angle);
    object.name = id;
    targets.set(id, { object, label });
    return object;
  }

  const lockedDisplay = new THREE.MeshBasicMaterial({
    map: texture(drawLockedDisplay, 384, 208), toneMapped: false,
  });

  function monitorDisplay(file, size, at, parent) {
    const display = plane(size, at, lockedDisplay, parent);
    const footage = new THREE.MeshBasicMaterial({ color: '#31574d', toneMapped: false });
    let requested = false;
    return (unlocked) => {
      if (unlocked && !requested) {
        requested = true;
        imageTexture(file, (map) => {
          footage.map = map;
          footage.color.set('#ffffff');
          footage.needsUpdate = true;
        });
      }
      display.material = unlocked ? footage : lockedDisplay;
    };
  }

  function floor(x, z, color, grout) {
    const tiles = flooring(color, grout, 7);
    tiledFloors.push(tiles);
    plane([10, 10, 1], [x, 0, z], tiles.surface, null, [-Math.PI / 2, 0, 0]);
    box([10, .18, 10], [x, CEILING, z], ceilingMat);
    for (const lx of [-3.4, -.3, 2.8]) box([.15, .17, 9.8], [x + lx, CEILING - .16, z], trim);
    for (const lz of [-3.15, 2.4]) {
      box([3.0, .105, .23], [x + .1, CEILING - .28, z + lz], metal);
      box([2.84, .027, .145], [x + .1, CEILING - .34, z + lz], bulb);
    }
  }

  function wallSegment(axis, fixed, start, end, openGlass = false) {
    const midpoint = (start + end) / 2;
    const length = end - start;
    const alongX = axis === 'z';
    const block = (height, y, mat, thickness = .18) => box(
      alongX ? [length, height, thickness] : [thickness, height, length],
      alongX ? [midpoint, y, fixed] : [fixed, y, midpoint], mat);
    block(.98, .49, wallLow);
    block(.12, .08, navy, .245);
    block(.09, 1.02, trim, .225);
    block(2.45, 2.27, openGlass ? glass : wall, openGlass ? .07 : .18);
    if (openGlass) {
      block(.11, 3.45, trim, .26);
      for (let offset = start; offset <= end + .001; offset += length / Math.ceil(length / 1.48)) {
        box(alongX ? [.075, 2.51, .26] : [.26, 2.51, .075],
          alongX ? [offset, 2.25, fixed] : [fixed, 2.25, offset], trim);
      }
    }
    block(.42, CEILING - .22, navy, .25);
    obstacle(alongX ? midpoint : fixed, alongX ? fixed : midpoint, alongX ? length : .25, alongX ? .25 : length);
  }

  function interior(axis, center, labels, glassSide) {
    const alongX = axis === 'z';
    const gap = 1.29;
    const start = center < 0 ? -HALF : 0;
    const end = center < 0 ? 0 : HALF;
    const x = alongX ? center : 0;
    const z = alongX ? 0 : center;
    wallSegment(axis, 0, start, center - gap, glassSide);
    wallSegment(axis, 0, center + gap, end, glassSide);
    box(alongX ? [2.58, .018, .9] : [.9, .018, 2.58], [x, .013, z], trim);
    box(alongX ? [2.58, .62, .30] : [.30, .62, 2.58], [x, 3.54, z], trim);
    for (const side of [-1, 1]) {
      box(alongX ? [.11, 3.2, .34] : [.34, 3.2, .11],
        [x + (alongX ? side * gap : 0), 1.6, z + (alongX ? 0 : side * gap)], trim);
      plate(labels[side > 0 ? 0 : 1], 1.56, .43,
        [x + (alongX ? 0 : side * .162), 3.32, z + (alongX ? side * .162 : 0)],
        alongX ? (side > 0 ? 0 : Math.PI) : side * Math.PI / 2,
        { color: '#eaf0db', bg: '#1a3939', accent: '#b9c996', size: 59, art: 'lab/nameplate.webp' });
    }
  }

  function plant(parent, size = 1, droop = false, brightLeaves = false) {
    const vessel = droop ? terracotta : ceramic;
    pot([.33 * size, .26 * size, .33 * size], [0, .13 * size, 0], vessel, parent);
    tube([.346 * size, .029 * size, .346 * size], [0, .244 * size, 0], vessel, parent);
    tube([.29 * size, .026 * size, .29 * size], [0, .257 * size, 0], soil, parent);
    const canopy = group(0, .27 * size, 0, 0, parent);
    const palette = droop ? droopingLeaves : (brightLeaves ? goldenLeaf : greenLeaf);
    const silhouette = droop ? .74 : 1.1;
    const count = droop ? 4 : 7;
    const stemWidth = (droop ? .013 : .019) * size;
    tube([stemWidth, .32 * size * silhouette, stemWidth], [0, .156 * size * silhouette, 0],
      stems[0], canopy, [0, 0, droop ? -.13 : .025]);
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.4 + .4;
      const rise = .065 + i / count * .255;
      const length = (.25 - i * .012) * size;
      const offset = length * .46;
      const tip = droop ? -.49 : (i % 3 === 0 ? .37 : .18);
      const pivot = group(rise * size * (droop ? .12 : 0), rise * size * silhouette, 0, angle, canopy);
      const width = ((droop ? .106 : .151) - i * .006) * size;
      const blade = leaf([length, length, width], [offset, Math.sin(tip) * offset, 0],
        palette[i % palette.length], pivot, [0, 0, tip]);
      leaves.push({ leaf: blade, base: tip, phase: i + leaves.length });
    }
    return canopy;
  }

  function book(id, label, x, z, color, angle = 0, coverImage) {
    const object = interact(id, label, [x, 1.065, z], angle);
    box([.35, .012, .46], [0, -.008, 0], color, object);
    box([.318, .037, .434], [.011, .017, 0], paper, object);
    box([.037, .052, .46], [-.159, .016, 0], color, object);
    for (let i = 0; i < 3; i += 1) {
      box([.0015, .0014, .417], [.171, .003 + i * .012, 0], rubberTan, object);
    }
    box([.35, .012, .46], [0, .042, 0], color, object);
    if (coverImage) {
      const cover = imageMaterial(coverImage, color.color.getStyle(), { alphaTest: .4, roughness: .82 });
      plane([.345, .451, 1], [0, .050, 0], cover, object, [-Math.PI / 2, 0, 0]);
    } else {
      plate(label, .28, .17, [0, .05, -.093], 0, {
        size: 63, parent: object, bg: '#e6dbb6', color: '#243637', accent: '#7b8f72',
      }).rotation.x = -Math.PI / 2;
    }
    return object;
  }

  floor(-5, 5, '#7e8d81', '#434f4d');
  floor(5, 5, '#8c8f7c', '#4d554c');
  floor(-5, -5, '#637d6e', '#3b5954');
  floor(5, -5, '#9a947e', '#575648');
  imageTexture('floor-terrazzo.webp', (map) => {
    tiledFloors.forEach((tile) => tile.setImage(map.image));
    map.dispose();
  });
  interior('z', -5, ['温室', '准备室'], true);
  interior('z', 5, ['展示室', '储藏室'], false);
  interior('x', -5, ['温室', '展示室'], true);
  interior('x', 5, ['准备室', '储藏室'], false);
  wallSegment('z', HALF, -HALF, HALF);
  wallSegment('x', HALF, -HALF, HALF);
  wallSegment('x', -HALF, 0, HALF);

  function outsideWindow(axis, fixed, center, width, id, label, leak = false) {
    const at = axis === 'x' ? [fixed, 0, center] : [center, 0, fixed];
    const angle = axis === 'x' ? Math.PI / 2 : 0;
    const frame = id ? interact(id, label + ' · 窗框', at, angle) : group(...at, angle);
    if (id) targets.get(id).hintAnchor = [leak ? .46 : -.45, 1.14, .34];
    box([width, 1.1, .19], [0, .55, 0], wallLow, frame);
    box([width, .46, .20], [0, 3.53, 0], trim, frame);
    box([width, 2.16, .06], [0, 2.21, -.05], windowGlass, frame);
    plane([width - .15, 2.14, 1], [0, 2.21, -.016], windowWeather, frame);
    box([width * 1.012, .11, .37], [0, 1.08, .052], trim, frame);
    box([width, .105, .28], [0, 2.05, .06], navy, frame);
    for (let i = 0; i < 5; i += 1) box([.064, 2.18, .27], [(i / 4 - .5) * width, 2.20, .08], trim, frame);
    if (label) plate(label, .71, .29, [leak ? .40 : -.45, 1.49, .119], 0,
      { size: 65, parent: frame, art: 'lab/nameplate.webp' });
    for (let i = 0; i < 15; i += 1) {
      const x = ((i * 41 % 101) / 101 - .5) * (width - .10);
      const y = 1.22 + (i * 109 % 101) / 101 * 1.95;
      const rain = box([.008, .11 + (i % 4) * .10, .009], [x, y, .002], new THREE.MeshBasicMaterial({
        color: '#addde9', transparent: true, opacity: .18 + (i % 4) * .045, depthWrite: false,
      }), frame, [0, 0, -.12]);
      outsideRain.push({ rain, offset: (y - 1.12) / 2.08, speed: .31 + (i % 4) * .044 });
    }
    const localLeak = group(.46, 1.04, .17, 0, frame);
    const water = material('#6eafbc', { transparent: true, opacity: .66, depthWrite: false, emissive: '#35778f', emissiveIntensity: .36 });
    if (leak) {
      box([.28, .04, .021], [0, .045, .028], dark, localLeak);
      for (let i = 0; i < 4; i += 1) {
        const drop = round([.019, .07, .019], [i * .06 - .10, -.05 - i * .17, .13 + i * .04], water, localLeak);
        outsideRain.push({ rain: drop, offset: i * .25, speed: .91, leak: true });
      }
      round([.96, .016, .61], [.58, .018, .51], water, frame);
    }
    const installed = box([.34, .096, .078], [0, .045, .065], yellow, localLeak);
    installed.visible = false;
    obstacle(at[0], at[2], axis === 'x' ? .26 : width, axis === 'x' ? width : .26);
    return installed;
  }

  const fixedSeal = outsideWindow('x', -HALF, -5, 10, 'westWindow', '西窗', true);
  const westNote = interact('westNote', '皱巴巴的便条', [-9.73, 1.137, -4.73], -.1);
  const noteSurface = imageMaterial('paper-crumpled.webp', '#ecd9a2', {
    roughness: .95, flatShading: true, vertexColors: true, side: THREE.DoubleSide,
  });
  crumpledPaper([.289, .143, .352], [0, 0, 0], noteSurface, westNote);
  outsideWindow('z', -HALF, -5, 10, 'eastWindow', '东窗');
  outsideWindow('z', -HALF, 5, 10);
  const courtyard = new THREE.MeshBasicMaterial({ color: '#294856', fog: false, toneMapped: false });
  const sideCourtyard = courtyard.clone();
  imageTexture('lab/school-courtyard.webp', (map) => {
    courtyard.color.set('#c3d4d9');
    courtyard.map = map;
    courtyard.needsUpdate = true;
    const westMap = map.clone();
    westMap.repeat.x = -1;
    westMap.offset.x = 1;
    westMap.needsUpdate = true;
    sideCourtyard.color.copy(courtyard.color);
    sideCourtyard.map = westMap;
    sideCourtyard.needsUpdate = true;
  });
  plane([40, 20.8, 1], [1.5, 1.1, -17.6], courtyard);
  plane([37, 19.2, 1], [-16.9, 1.05, -10], sideCourtyard, null, [0, Math.PI / 2, 0]);

  const spawn = { x: -5.35, z: 8.7, yaw: 0 };
  const contact = material('#102a29', { transparent: true, opacity: .22, depthWrite: false });
  const rubberTan = material('#876846');
  const instrumentBody = metricSurface('lab/instrument-body.webp', '#28413f', '#dce8de', [2.6, 2.6], {
    roughness: .63, metalness: .24,
  });
  const cork = imageMaterial('lab/cork-board.webp', '#9f774c', { roughness: .93 });
  const noticePaper = imageMaterial('paper-crumpled.webp', '#ded2b4', { roughness: .91 });
  const tapeSurface = imageMaterial('lab/marking-tape.webp', '#ee8b3c', { roughness: .78 });
  const traySurface = imageMaterial('lab/tray-surface.webp', '#a39e7c', { roughness: .7 });
  const sealSurface = imageMaterial('lab/weatherstrip.webp', '#373b34', { roughness: .86 });
  bench(-5.35, 5.87, 2.46, .90, true);
  const prep = new THREE.PointLight('#ffdeb0', 3.1, 6.5, 2);
  prep.position.set(-5.55, 3.26, 6.52);
  scene.add(prep);
  plane([4.8, 3.6, 1], [-5.6, .012, 7.37], contact, null, [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i += 1) box([.105, .015, .036], [-5.81 + i * .12, .025, 7.52], yellow, null, [0, .55, 0]);
  const phone = interact('radio', '手机', [-5.35, 1.04, 6.00], -.1);
  phoneProp(THREE, kit, phone, instrumentBody);
  box([.30, .038, .24], [-5.35, 1.051, 6], instrumentBody, null, [0, -.1, 0]);
  box([.19, .105, .075], [-5.35, 1.107, 5.956], instrumentBody, null, [-.16, -.1, 0]);
  plate('从这里开始', 1.06, .25, [-5.35, .935, 6.323], 0, { size: 53, color: '#f9e2a7', bg: '#312a23', accent: AMBER });
  box([2.34, .97, .10], [-5.35, 2.53, 3.89], navy);
  plate('校内科学展', 2.22, .82, [-5.35, 2.53, 3.951], 0,
    { accent: AMBER, size: 68, secondary: '科学组 · 展前准备', art: 'lab/chalkboard.webp' });
  box([.15, 1.74, .15], [-6.36, 1.70, 3.86], trim);
  box([.15, 1.74, .15], [-4.33, 1.70, 3.86], trim);
  crate(-6.1, .51, 1.92, .56, .38, .61);
  crate(-3.2, .27, 3.14, .62, .38, .56, wallLow);
  const wallBoard = group(-9.838, 2.28, 4.01, Math.PI / 2);
  box([1.72, 1.00, .07], [0, 0, 0], wood, wallBoard);
  plane([1.63, .92, 1], [0, 0, .052], cork, wallBoard);
  plate('今天的值勤', 1.15, .23, [0, .296, .080], 0,
    { size: 53, parent: wallBoard, accent: AMBER, art: 'lab/nameplate.webp' });
  for (let i = 0; i < 4; i += 1) {
    const dx = i * .32 - .51;
    const dy = i % 2 ? -.09 : -.16;
    plane([.213, .32, 1], [dx, dy, .078], noticePaper, wallBoard, [0, 0, (i % 3 - 1) * .07]);
    round([.032, .035, .033], [dx, dy + .133, .096], i % 2 ? tape : blue, wallBoard);
    for (let row = 0; row < 3; row += 1) box([.125 - row * .014, .009, .013], [dx, dy + .035 - row * .056, .093], trim, wallBoard);
  }
  bench(-7.88, 2.75, 2.55, .98);
  book('diary', '阿宁的日记', -8.67, 3.001, wood, -.18, 'book-diary.webp');
  book('exerciseLog', '晨练记录', -8.12, 3.105, blue, .10, 'book-exercise.webp');
  book('testSheet', '科学测验卷', -7.657, 3.057, ceramic, -.1, 'book-test.webp');
  const reel = interact('rehearsalTape', '彩排录像', [-7.14, 1.052, 3.03], .3);
  const reelCover = imageMaterial('book-rehearsal.webp', '#ae7857', { roughness: .84 });
  box([.319, .022, .433], [-.006, .005, -.08], wood, reel);
  plane([.319, .433, 1], [-.006, .018, -.08], reelCover, reel, [-Math.PI / 2, 0, 0]);
  box([.34, .046, .215], [0, .025, 0], instrumentBody, reel);
  box([.258, .018, .13], [0, .051, -.008], yellow, reel);
  for (const dx of [-.076, .075]) tube([.078, .027, .078], [dx, .056, .015], paper, reel);
  plate('准备记录', 1.09, .38, [-8.0, 2.22, .16], 0, { size: 62 });
  shelves(-8.97, 7.46, 2.22, .78, Math.PI / 2);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let i = 0; i < 3; i += 1) crate(-8.93, .38 + shelf * .68, 6.72 + i * .64, .5, .31, .53, i % 2 ? wood : wallLow);
  }
  plant(group(-8.85, 0, 5.14, .44), 2.25);

  bench(5.66, 4.81, 3.96, 1.26, true);
  const workLight = interact('brightLamp', '检修灯', [4.08, 1.06, 5.08], -.07);
  box([.31, .069, .22], [0, .037, 0], instrumentBody, workLight);
  tube([.048, .37, .048], [0, .23, -.045], dark, workLight);
  box([.38, .26, .18], [0, .48, 0], instrumentBody, workLight);
  for (const x of [-.178, .178]) {
    box([.028, .232, .043], [x, .48, .084], rubber, workLight);
    round([.033, .035, .027], [x, .48, .116], metal, workLight);
  }
  const bulbFace = plane([.317, .198, 1], [0, .48, .109], bright, workLight);
  imageTexture('lab/work-light.webp', (map) => {
    for (const face of [bright, dim]) {
      face.map = map;
      face.needsUpdate = true;
    }
  });
  const workLightGlow = new THREE.PointLight('#ffe2a1', .91, 2.25);
  workLightGlow.position.set(4.09, 1.51, 5.32);
  scene.add(workLightGlow);
  const ordinaryLamp = interact('deskLamp', '台灯', [5.08, 1.06, 4.61], .13);
  const lampReflector = imageMaterial('lab/desk-light.webp', '#c4b486', {
    roughness: .63, emissive: '#987b51', emissiveIntensity: .24,
  });
  tube([.31, .055, .31], [0, .04, 0], instrumentBody, ordinaryLamp);
  tube([.034, .35, .034], [0, .24, 0], metal, ordinaryLamp, [0, 0, -.17]);
  pot([.34, .235, .34], [.03, .435, .013], navy, ordinaryLamp, [0, 0, Math.PI]);
  tube([.337, .024, .337], [.03, .31, .013], lampReflector, ordinaryLamp);
  round([.055, .018, .03], [.086, .073, .071], rubber, ordinaryLamp);
  const tapeRoll = interact('vividTape', '彩色记号带', [5.51, 1.10, 5.13], .29);
  tube([.29, .117, .29], [0, .072, 0], tapeSurface, tapeRoll);
  tube([.155, .014, .155], [0, .134, 0], paper, tapeRoll);
  tube([.122, .011, .122], [0, .143, 0], dark, tapeRoll);
  box([.12, .02, .24], [-.049, .011, .16], tapeSurface, tapeRoll, [0, .17, 0]);
  const tray = interact('tray', '搬运托盘', [6.48, 1.056, 5.07], -.04);
  box([.65, .056, .44], [0, .03, 0], trim, tray);
  box([.61, .019, .41], [0, .064, 0], traySurface, tray);
  for (const side of [-1, 1]) {
    box([.057, .06, .52], [side * .33, .05, 0], instrumentBody, tray);
    box([.69, .06, .057], [0, .05, side * .25], metal, tray);
    box([.028, .039, .20], [side * .403, .08, 0], rubber, tray);
    for (const z of [-.087, .087]) {
      box([.095, .034, .034], [side * .366, .08, z], metal, tray);
    }
  }
  const guide = group(6.76, 1.34, 4.52, -.16);
  guide.rotation.x = -.16;
  box([.81, .60, .042], [0, 0, 0], navy, guide);
  const guideLabel = plate('托住盆底', .75, .54, [0, 0, .025], 0, { size: 52, parent: guide });
  imageTexture('tray-guide.webp', (map) => {
    const ratio = map.image.width / map.image.height;
    const width = Math.min(.75, .54 * ratio);
    guideLabel.visible = false;
    plane([width, width / ratio, 1], [0, 0, .027], new THREE.MeshBasicMaterial({ map, toneMapped: false }), guide);
  });
  shelves(6.73, 8.95, 3.35, .83);
  shelves(9.18, 4.86, 2.83, .70, Math.PI / 2);
  for (let shelf = 0; shelf < 3; shelf += 1) {
    for (let i = 0; i < 4; i += 1) crate(5.53 + i * .793, .39 + shelf * .68, 8.90, .53, .32, .59, (i + shelf) % 2 ? wallLow : wood);
  }
  const seal = interact('seal', '密封条', [8.99, 1.61, 4.77], -Math.PI / 2);
  box([.42, .18, .13], [0, .10, 0], noticePaper, seal);
  box([.36, .119, .018], [0, .115, .076], sealSurface, seal);
  box([.40, .026, .034], [0, .046, .072], amber, seal);
  plate('密封条', .165, .049, [0, .103, .088], 0, {
    size: 54, color: '#1e3029', bg: '#ded2b3', accent: '#bb995e', parent: seal,
  });
  crate(9.15, .44, 4.02, .41, .37, .61, wood);
  crate(9.15, .44, 5.48, .45, .37, .52, navy);
  crate(9.12, 1.10, 4.02, .43, .36, .52, rubberTan);
  crate(9.13, 1.10, 5.48, .44, .37, .47, wallLow);
  crate(9.10, 1.79, 4.02, .44, .36, .47, wallLow);
  crate(9.10, 1.79, 5.64, .42, .36, .47, wood);
  crate(9.12, 2.41, 4.52, .47, .27, .71, trim);
  crate(9.13, 2.39, 5.61, .42, .23, .46, wood);
  plate('检修用品', 1.32, .38, [9.572, 2.82, 4.88], -Math.PI / 2, { size: 60, accent: AMBER });
  crate(2.34, .19, 7.33, .69, .34, .68, wallLow);
  crate(3.06, .18, 7.33, .57, .32, .68, wood);

  bench(-5.25, -6.17, 4.95, 1.14);
  const weak = interact('weakPlant', '细弱的幼苗', [-5.37, 1.06, -5.88]);
  const weakCanopy = plant(weak, 1.23, true, true);
  const sturdy = interact('sturdyPlant', '健壮的盆栽', [-6.8, 1.055, -5.90]);
  plant(sturdy, 1.65, false, true);
  const jar = interact('seedJar', '种子罐', [-4.0, 1.059, -5.84]);
  tube([.23, .32, .23], [0, .17, 0], glass, jar);
  tube([.24, .058, .24], [0, .32, 0], instrumentBody, jar);
  tube([.19, .026, .19], [0, .036, 0], ceramic, jar);
  for (let index = 0; index < 9; index += 1) {
    const angle = index * 2.4;
    const radius = .041 + (index % 3) * .019;
    round([.04, .023, .028], [Math.cos(angle) * radius, .061 + (index % 2) * .012, Math.sin(angle) * radius],
      index % 2 ? amber : yellow, jar, [0, angle, 0]);
  }
  plate('备用种子', .17, .081, [0, .163, .117], 0, {
    size: 58, color: '#23322b', bg: '#ded3ad', accent: '#bba171', parent: jar,
  });
  const planter = interact('soilPot', '育苗盆', [-3.14, 1.054, -5.87]);
  pot([.53, .31, .53], [0, .15, 0], terracotta, planter);
  tube([.55, .033, .55], [0, .291, 0], terracotta, planter);
  tube([.48, .029, .48], [0, .305, 0], soil, planter);
  const seedDots = group(0, .319, 0, 0, planter);
  for (let i = 0; i < 4; i += 1) round([.067, .028, .036],
    [(i % 2 - .5) * .186, 0, (Math.floor(i / 2) - .5) * .158], amber, seedDots, [0, i * .75, 0]);
  const fan = interact('fan', '循环风扇', [-7.35, 1.06, -6.14], .29);
  tube([.43, .07, .43], [0, .033, 0], instrumentBody, fan);
  tube([.061, .45, .061], [0, .249, 0], trim, fan);
  tube([.57, .085, .57], [0, .61, .045], instrumentBody, fan, [Math.PI / 2, 0, 0]);
  const rotorBehind = imageMaterial('lab/fan-grille.webp', '#162826', { roughness: .75, side: THREE.DoubleSide });
  const grille = new THREE.Mesh(new THREE.CircleGeometry(.258, 32), rotorBehind);
  grille.position.set(0, .61, .102);
  fan.add(grille);
  const blades = group(0, .61, .127, 0, fan);
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    round([.073, .21, .027], [Math.sin(angle) * .103, Math.cos(angle) * .103, 0], ceramic, blades, [0, 0, -angle + .2]);
  }
  round([.095, .095, .051], [0, 0, .034], blue, blades);
  const fanFront = group(0, .61, .155, 0, fan);
  for (let i = 0; i < 8; i += 1) box([.01, .43, .014], [0, 0, 0], trim, fanFront, [0, 0, i * Math.PI / 8]);
  round([.11, .11, .055], [0, .61, .17], instrumentBody, fan);
  bench(-2.65, -8.86, 1.66, .79);
  const rootCam = interact('rootCam', '根系观测仪', [-2.65, 1.24, -8.70], .04);
  box([.99, .58, .16], [0, .29, 0], instrumentBody, rootCam);
  const showRoots = monitorDisplay('lab/root-display.webp', [.91, .50, 1], [0, .29, .083], rootCam);
  box([.38, .08, .32], [0, -.15, .03], instrumentBody, rootCam);
  for (let i = 0; i < 6; i += 1) plant(group(-8.76, 0, -1.53 - i * 1.33, i * .7),
    1.6 + (i % 3) * .26, false, i % 2 === 0);
  for (let i = 0; i < 4; i += 1) plant(group(-6.9 + i * 1.15, 0, -9.19, i * .7),
    1.52 + (i % 3) * .28, false, i % 2 === 0);
  const trough = group(-8.49, .011, -3.72, -.04);
  const planterSlats = imageMaterial('lab/crate-slats.webp', '#735e4a', { roughness: .91 });
  box([.64, .31, 2.08], [0, .154, 0], planterSlats, trough);
  for (const x of [-.304, .304]) box([.058, .046, 2.12], [x, .32, 0], wood, trough);
  for (const z of [-1.027, 1.027]) box([.59, .046, .058], [0, .32, z], wood, trough);
  box([.55, .052, 2.0], [0, .318, 0], soil, trough);
  for (let i = 0; i < 16; i += 1) {
    const base = .23 + i % 4 * .16;
    const blade = leaf([.25, .19, .18], [i % 2 ? .14 : -.14, .36 + (i % 3) * .052, -.91 + i * .12],
      greenLeaf[i % 3], trough, [.21, i * 2.4, base]);
    leaves.push({ leaf: blade, base, phase: i + leaves.length });
  }
  box([.063, .063, 4.4], [-9.68, .78, -3.7], trim);
  for (const z of [-1.96, -3.78, -5.64]) box([.15, .11, .078], [-9.64, .79, z], ceramic);

  bench(2.68, -8.56, 2.75, 1.045, true);
  const screen = interact('rehearsalScreen', '彩排播放器', [2.43, 1.09, -8.55], .12);
  box([1.14, .63, .13], [0, .405, 0], dark, screen);
  const showRehearsal = monitorDisplay('lab/rehearsal-display.webp', [1.04, .55, 1], [0, .407, .075], screen);
  box([.28, .25, .11], [0, .113, -.04], trim, screen);
  box([.53, .041, .32], [0, .016, -.015], metal, screen);
  book('backupNotes', '备用布置图', 3.72, -8.19, paper, -.13, 'page-exhibit.webp');
  const diorama = interact('exhibitStand', '科学展台', [5.68, 0, -5.90]);
  box([1.98, .17, 1.46], [0, .081, 0], navy, diorama);
  box([1.55, 1.04, 1.10], [0, .64, 0], enamel, diorama);
  box([1.82, .095, 1.37], [0, 1.19, 0], counter, diorama);
  box([1.79, .035, 1.31], [0, 1.252, 0], yellow, diorama);
  plate('种子的力量', 1.245, .37, [0, .813, .567], 0,
    { size: 61, accent: AMBER, parent: diorama, art: 'lab/nameplate.webp' });
  const exhibitPlant = group(0, 1.273, -.09, .13, diorama);
  plant(exhibitPlant, 2.08, false, true);
  obstacle(5.68, -5.90, 1.98, 1.46);
  const exhibitAura = new THREE.PointLight('#e8efae', 0, 4.3);
  exhibitAura.position.set(5.68, 2.2, -5.80);
  scene.add(exhibitAura);
  bench(8.05, -2.21, 2.27, .90, true);
  const desk = book('handoverDesk', '交接纪要', 8.08, -1.938, blue, .1);
  box([.17, .036, .026], [.12, .047, .14], amber, desk, [0, -.4, 0]);
  plate('交接记录', 1.21, .36, [8.11, 2.19, -.172], Math.PI, { size: 63, art: 'lab/nameplate.webp' });
  const posterPanel = group(9.835, 2.28, -6.94, -Math.PI / 2);
  box([2.22, 2.62, .1], [0, 0, 0], wood, posterPanel);
  plate('植物观察', 2.11, 2.48, [0, 0, .056], 0, { size: 68, secondary: '扎根 · 成长', parent: posterPanel });
  imageTexture('science-poster.webp', (map) => {
    plane([2.08, 2.45, 1], [0, 0, .069], new THREE.MeshBasicMaterial({ map, toneMapped: false }), posterPanel);
  });
  plant(group(8.82, 0, -8.13, .21), 2.16, false, true);
  const display = group(9.82, 2.23, -4.54, -Math.PI / 2);
  box([.92, .72, .071], [0, 0, 0], trim, display);
  plate('开放日', .84, .65, [0, 0, .041], 0,
    { size: 57, secondary: '春芽科学小组', parent: display, art: 'lab/chalkboard.webp' });
  const exhibitRug = imageMaterial('lab/exhibit-mat.webp', '#54745f', { roughness: .95 });
  box([2.16, .02, 2.32], [5.68, .016, -5.9], exhibitRug);

  for (const [x, z] of [[-5, .7], [-5, -.7], [.7, 5], [-.7, 5], [.7, -5], [-.7, -5], [5, .7], [5, -.7]]) {
    for (let i = -1; i <= 1; i += 1) box([.055, .013, .36],
      [x + i * (Math.abs(x) > 1 ? .18 : 0), .028, z + i * (Math.abs(x) < 1 ? .18 : 0)],
      marker, null, [0, Math.abs(x) > 1 ? 0 : Math.PI / 2, 0]);
  }

  const showHint = createHintPortal(THREE, scene, targets);
  finish();

  const pickups = ['seal', 'brightLamp', 'vividTape', 'tray', 'rehearsalTape'];

  function update(dt, state = {}, camera) {
    const speed = dt > 0 ? Math.min(dt, .125) : 0;
    clock += speed;
    const motion = !state.reducedMotion;
    const completed = state.completed || 0;
    const used = (id) => state.used?.has(id);
    showRoots(state.unlocked?.has('rootCam') || used('rootCam'));
    showRehearsal(state.unlocked?.has('rehearsalScreen') || used('rehearsalScreen'));
    phone.visible = !used('radio');
    for (const id of pickups) {
      const { object } = targets.get(id);
      const collected = used(id);
      const size = collected ? .005 : 1;
      const scale = THREE.MathUtils.lerp(object.scale.x, size, motion ? Math.min(speed * 15, 1) : 1);
      object.scale.setScalar(scale);
      object.visible = !collected || scale > .055;
    }
    const sealed = completed > 0 || (state.mission === 0 && state.action >= 3);
    fixedSeal.visible = sealed;
    for (const line of outsideRain) {
      if (line.leak) {
        line.rain.visible = !sealed;
        if (motion) line.rain.position.y = -((clock * line.speed + line.offset) % 1) * 1.03;
      } else if (motion) line.rain.position.y = 1.15 + (1 - (clock * line.speed + line.offset) % 1) * 2.05;
    }
    if (motion) {
      for (const { leaf, base, phase } of leaves) leaf.rotation.z = base + .09 * Math.sin(clock * 1.9 + phase);
    }
    const fanStopped = completed >= 3 || (state.mission === 2 && state.action >= 1) || used('fan');
    if (!fanStopped && motion) blades.rotation.z -= speed * 13;
    weakCanopy.rotation.z = fanStopped || !motion ? .13 : .32 + Math.sin(clock * 5.2) * .18;
    const sheltered = completed >= 3 || (state.mission === 2 && state.action >= 2) || used('weakPlant');
    weak.position.x += ((sheltered ? -5.04 : -5.37) - weak.position.x) * (motion ? Math.min(speed * 5, 1) : 1);
    weak.position.z += ((sheltered ? -6.43 : -5.88) - weak.position.z) * (motion ? Math.min(speed * 5, 1) : 1);
    seedDots.visible = !(completed >= 3 || (state.mission === 2 && state.action >= 3) || used('soilPot'));
    const lampDimmed = used('brightLamp') || completed >= 2;
    workLightGlow.intensity = lampDimmed ? .19 : .91;
    bulbFace.material = lampDimmed ? dim : bright;
    const ready = completed >= 5 || (state.mission === 4 && state.action >= 3) || used('exhibitStand');
    exhibitPlant.visible = ready;
    const goalIntensity = ready ? (completed >= 6 ? 3.55 : 2.30) : 0;
    exhibitAura.intensity += (goalIntensity - exhibitAura.intensity) * (motion ? Math.min(speed * 4, 1) : 1);
    showHint(state.hintTarget, camera, clock, motion);
  }

  update(0, { reducedMotion: true });
  return { scene, spawn, colliders, targets, update, ready: kit.ready() };
}
