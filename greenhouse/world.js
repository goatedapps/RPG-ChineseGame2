import { createKit } from './props.js';

const HALF = 10;
const CEILING = 3.85;
const AMBER = '#f2cd84';

export function createWorld(THREE) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#183442');
  scene.fog = new THREE.Fog('#294856', 17, 33);
  const { group, material, box, tube, pot, round, leaf, plane, plate, texture, imageTexture, imageMaterial, metricSurface, flooring, iconScreen, crumpledPaper, finish } = createKit(THREE, scene);
  const targets = new Map();
  const colliders = [];
  const leaves = [];
  const outsideRain = [];
  const tiledFloors = [];
  let clock = 0;

  const wall = metricSurface('wall-plaster.webp', '#bac3af', '#fff7ed', [.46, .46], { roughness: .89 });
  const wallLow = material('#57716a');
  const navy = material('#183039');
  const ceilingMat = material('#657469', { emissive: '#182126', emissiveIntensity: .21 });
  const trim = material('#365454', { metalness: .19 });
  const metal = material('#284140', { metalness: .24 });
  const counter = metricSurface('worktop-wood.webp', '#a08866', '#fff4df', [.63, 1.18], { roughness: .61 });
  const enamel = metricSurface('cabinet-enamel.webp', '#4c6963', '#b1c0b8', [.77, .77], { roughness: .65 });
  const wood = material('#735e4a');
  const ceramic = material('#bbc7a8');
  const soil = material('#382e24');
  const dark = material('#122224');
  const glass = material('#80b6b4', { transparent: true, opacity: .21, depthWrite: false, roughness: .18 });
  const windowGlass = material('#537f93', { transparent: true, opacity: .32, depthWrite: false, roughness: .27 });
  const rubber = material('#303c31');
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
  const leafOptions = { vertexColors: true, side: THREE.DoubleSide, roughness: .61 };
  const greenLeaf = ['#386845', '#578a4e', '#719b50'].map((color) => material(color, leafOptions));
  const goldenLeaf = ['#679447', '#91ad4e', '#5f864b'].map((color) => material(color, leafOptions));
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
  const windowWeather = new THREE.MeshBasicMaterial({
    map: texture((ctx, w, h) => {
      const veil = ctx.createLinearGradient(0, 0, 0, h);
      veil.addColorStop(0, '#91bed11d');
      veil.addColorStop(.64, '#6aabba00');
      veil.addColorStop(1, '#91c4cb57');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 73; i += 1) {
        const x = ((i * 47) % 103) / 103 * w;
        const y = ((i * 43) % 107) / 107 * h;
        ctx.strokeStyle = i % 4 === 0 ? '#bcdeea69' : '#b3dbe830';
        ctx.lineWidth = i % 6 === 0 ? 1.5 : .8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2 - i % 5, y + 5 + i % 14);
        ctx.stroke();
      }
    }, 420, 220),
    transparent: true, opacity: .47, depthWrite: false,
  });

  function obstacle(x, z, w, d) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  function interact(id, label, at, angle = 0) {
    const object = group(...at, angle);
    object.name = id;
    targets.set(id, { object, label });
    return object;
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
        { color: '#eaf0db', bg: '#1a3939', accent: '#b9c996', size: 59 });
    }
  }

  function bench(x, z, width, depth, cabinet = false) {
    plane([width * 1.52, depth * 2.62, 1], [x, .008, z], floorShadow, null, [-Math.PI / 2, 0, 0]);
    box([width, .11, depth], [x, .98, z], counter);
    box([width - .06, .055, depth - .05], [x, .895, z], wood);
    if (cabinet) {
      box([width - .13, .78, depth - .12], [x, .43, z], enamel);
      for (let local = -width / 2 + .35; local < width / 2 - .14; local += .62) {
        box([.565, .56, .035], [x + local, .46, z + depth / 2 - .055], enamel);
        box([.19, .037, .036], [x + local, .61, z + depth / 2 - .027], ceramic);
      }
    } else {
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          box([.095, .88, .095], [x + sx * (width / 2 - .115), .44, z + sz * (depth / 2 - .11)], metal);
        }
      }
      box([width * .94, .065, depth * .8], [x, .26, z], trim);
    }
    obstacle(x, z, width, depth);
  }

  function crate(x, y, z, width, height, depth, color = wood) {
    box([width, height, depth], [x, y, z], color);
    box([width * 1.04, .074, depth * 1.04], [x, y + height * .48, z], trim);
    for (const dx of [-width * .37, width * .37]) box([.042, height * .75, .026], [x + dx, y, z + depth / 2], wood);
  }

  function shelves(x, z, width, depth, angle = 0) {
    const alongX = Math.abs(angle) < .4;
    function row(localX, y, localZ, size, mat) {
      const a = Math.sin(angle);
      const b = Math.cos(angle);
      box(size, [x + localX * b + localZ * a, y, z - localX * a + localZ * b], mat, null, [0, angle, 0]);
    }
    for (const y of [.19, .87, 1.55, 2.23]) row(0, y, 0, [width, .07, depth], enamel);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) row(sx * (width / 2 - .035), 1.17, sz * (depth / 2 - .035), [.07, 2.35, .07], trim);
    }
    obstacle(x, z, alongX ? width : depth, alongX ? depth : width);
  }

  function plant(parent, size = 1, droop = false, brightLeaves = false) {
    pot([.33 * size, .26 * size, .33 * size], [0, .13 * size, 0], droop ? wood : ceramic, parent);
    tube([.29 * size, .026 * size, .29 * size], [0, .257 * size, 0], soil, parent);
    const canopy = group(0, .27 * size, 0, 0, parent);
    const palette = brightLeaves ? goldenLeaf : greenLeaf;
    const silhouette = droop ? .74 : 1.1;
    const count = droop ? 4 : 7;
    tube([.025 * size, .32 * size * silhouette, .025 * size], [0, .156 * size * silhouette, 0],
      stems[0], canopy, [0, 0, droop ? -.13 : .025]);
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.4 + .4;
      const rise = .065 + i / count * .255;
      const length = (.25 - i * .012) * size;
      const offset = length * .46;
      const tip = droop ? -.49 : (i % 3 === 0 ? .37 : .18);
      const pivot = group(rise * size * (droop ? .12 : 0), rise * size * silhouette, 0, angle, canopy);
      const blade = leaf([length, length, (.117 - i * .005) * size], [offset, Math.sin(tip) * offset, 0],
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
      const cover = imageMaterial(coverImage, color.color.getStyle(), { roughness: .82 });
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
    box([width, 1.1, .19], [0, .55, 0], wallLow, frame);
    box([width, .46, .20], [0, 3.53, 0], trim, frame);
    box([width, 2.16, .06], [0, 2.21, -.05], windowGlass, frame);
    plane([width - .15, 2.14, 1], [0, 2.21, -.016], windowWeather, frame);
    box([width * 1.012, .11, .37], [0, 1.08, .052], trim, frame);
    box([width, .105, .28], [0, 2.05, .06], navy, frame);
    for (let i = 0; i < 5; i += 1) box([.064, 2.18, .27], [(i / 4 - .5) * width, 2.20, .08], trim, frame);
    if (label) plate(label, .71, .29, [leak ? .40 : -.45, 1.49, .119], 0, { size: 65, parent: frame });
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
  const distant = [material('#354f5f'), material('#476778'), material('#2b4253')];
  for (let i = 0; i < 14; i += 1) {
    const height = 2.8 + (i * 19 % 41) / 10;
    const step = -23 + i * 3.45;
    box([2.26, height, 1.36], [step, height / 2 - 3.28, -17.4 - (i % 3)], distant[i % 3]);
    box([1.42, height, 2.25], [-16.3 - (i % 3), height / 2 - 3.28, step], distant[(i + 1) % 3]);
  }

  const spawn = { x: -5.35, z: 8.7, yaw: 0 };
  const contact = material('#102a29', { transparent: true, opacity: .22, depthWrite: false });
  const LEDs = new THREE.MeshBasicMaterial({ color: '#91f2a7' });
  const rubberTan = material('#876846');
  bench(-5.35, 5.87, 2.46, .90, true);
  const prep = new THREE.PointLight('#ffdeb0', 3.1, 6.5, 2);
  prep.position.set(-5.55, 3.26, 6.52);
  scene.add(prep);
  plane([4.8, 3.6, 1], [-5.6, .012, 7.37], contact, null, [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 9; i += 1) box([.105, .015, .036], [-5.81 + i * .12, .025, 7.52], yellow, null, [0, .55, 0]);
  const radio = interact('radio', '对讲机', [-5.35, 1.04, 6.00], -.1);
  box([.34, .45, .155], [0, .25, 0], dark, radio);
  box([.33, .071, .159], [0, .432, 0], trim, radio);
  tube([.036, .27, .036], [-.103, .58, -.047], rubber, radio);
  box([.234, .125, .024], [0, .327, .083], blue, radio);
  for (let i = 0; i < 7; i += 1) box([.219, .008, .020], [0, .103 + i * .017, .08], trim, radio);
  const radioLED = round([.037, .037, .023], [.092, .41, .089], LEDs, radio);
  box([.22, .024, .21], [.55, .019, .17], rubber, radio);
  plate('从这里开始', 1.06, .25, [-5.35, .935, 6.323], 0, { size: 53, color: '#f9e2a7', bg: '#312a23', accent: AMBER });
  box([2.34, .97, .10], [-5.35, 2.53, 3.89], navy);
  plate('校内科学展', 2.22, .82, [-5.35, 2.53, 3.951], 0, { accent: AMBER, bg: '#152d32', size: 68, secondary: '科学组 · 展前准备' });
  box([.15, 1.74, .15], [-6.36, 1.70, 3.86], trim);
  box([.15, 1.74, .15], [-4.33, 1.70, 3.86], trim);
  crate(-6.1, .51, 1.92, .56, .38, .61);
  crate(-3.2, .27, 3.14, .62, .38, .56, wallLow);
  const wallBoard = group(-9.838, 2.28, 4.01, Math.PI / 2);
  box([1.72, 1.00, .07], [0, 0, 0], wood, wallBoard);
  box([1.65, .92, .037], [0, 0, .051], rubberTan, wallBoard);
  plate('今天的值勤', 1.15, .23, [0, .296, .080], 0, { size: 53, parent: wallBoard, accent: AMBER });
  for (let i = 0; i < 4; i += 1) {
    const dx = i * .32 - .51;
    const dy = i % 2 ? -.09 : -.16;
    box([.213, .32, .009], [dx, dy, .078], i % 2 ? paper : ceramic, wallBoard, [0, 0, (i % 3 - 1) * .07]);
    box([.062, .04, .013], [dx, dy + .145, .093], i % 2 ? tape : blue, wallBoard);
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
  box([.34, .046, .215], [0, .025, 0], dark, reel);
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
  box([.31, .069, .22], [0, .037, 0], metal, workLight);
  tube([.048, .37, .048], [0, .23, -.045], dark, workLight);
  box([.38, .26, .18], [0, .48, 0], rubberTan, workLight);
  const bulbFace = box([.30, .184, .018], [0, .48, .098], bright, workLight);
  const workLightGlow = new THREE.PointLight('#ffe2a1', .91, 2.25);
  workLightGlow.position.set(4.09, 1.51, 5.32);
  scene.add(workLightGlow);
  const ordinaryLamp = interact('deskLamp', '台灯', [5.08, 1.06, 4.61], .13);
  tube([.31, .055, .31], [0, .04, 0], trim, ordinaryLamp);
  tube([.034, .35, .034], [0, .24, 0], metal, ordinaryLamp);
  pot([.34, .25, .34], [.03, .44, .013], navy, ordinaryLamp, [0, 0, Math.PI]);
  tube([.31, .025, .31], [.03, .312, .013], dim, ordinaryLamp);
  const tapeRoll = interact('vividTape', '彩色记号带', [5.51, 1.10, 5.13], .29);
  tube([.29, .117, .29], [0, .072, 0], tape, tapeRoll);
  tube([.14, .018, .14], [0, .134, 0], dark, tapeRoll);
  box([.12, .02, .24], [-.049, .011, .16], tape, tapeRoll, [0, .17, 0]);
  const tray = interact('tray', '搬运托盘', [6.48, 1.056, 5.07], -.04);
  box([.65, .056, .44], [0, .03, 0], trim, tray);
  box([.61, .019, .41], [0, .064, 0], yellow, tray);
  for (const side of [-1, 1]) {
    box([.057, .06, .52], [side * .33, .05, 0], metal, tray);
    box([.69, .06, .057], [0, .05, side * .25], metal, tray);
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
  box([.42, .18, .13], [0, .10, 0], amber, seal);
  box([.36, .119, .014], [0, .108, .074], rubber, seal);
  box([.24, .045, .013], [0, .105, .083], paper, seal);
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
  tube([.24, .058, .24], [0, .32, 0], metal, jar);
  tube([.21, .08, .21], [0, .07, 0], yellow, jar);
  const planter = interact('soilPot', '育苗盆', [-3.14, 1.054, -5.87]);
  pot([.53, .31, .53], [0, .15, 0], wood, planter);
  tube([.48, .029, .48], [0, .305, 0], soil, planter);
  const seedDots = group(0, .319, 0, 0, planter);
  for (let i = 0; i < 4; i += 1) round([.067, .028, .036],
    [(i % 2 - .5) * .186, 0, (Math.floor(i / 2) - .5) * .158], amber, seedDots, [0, i * .75, 0]);
  const fan = interact('fan', '循环风扇', [-7.35, 1.06, -6.14], .29);
  tube([.43, .07, .43], [0, .033, 0], metal, fan);
  tube([.061, .45, .061], [0, .249, 0], trim, fan);
  tube([.57, .085, .57], [0, .61, .045], metal, fan, [Math.PI / 2, 0, 0]);
  tube([.475, .088, .475], [0, .61, .064], dark, fan, [Math.PI / 2, 0, 0]);
  const blades = group(0, .61, .127, 0, fan);
  for (let i = 0; i < 4; i += 1) {
    const angle = i * Math.PI / 2;
    round([.073, .21, .027], [Math.sin(angle) * .103, Math.cos(angle) * .103, 0], ceramic, blades, [0, 0, -angle + .2]);
  }
  round([.095, .095, .051], [0, 0, .034], blue, blades);
  const fanFront = group(0, .61, .155, 0, fan);
  for (let i = 0; i < 8; i += 1) box([.01, .43, .014], [0, 0, 0], trim, fanFront, [0, 0, i * Math.PI / 8]);
  box([.09, .09, .097], [0, .61, .18], amber, fan);
  bench(-2.65, -8.86, 1.66, .79);
  const rootCam = interact('rootCam', '根系观测仪', [-2.65, 1.24, -8.70], .04);
  box([.99, .58, .16], [0, .29, 0], dark, rootCam);
  iconScreen('root', '#a4dc9a', .91, .50, [0, .29, .083], 0, rootCam);
  box([.38, .08, .32], [0, -.15, .03], metal, rootCam);
  for (let i = 0; i < 6; i += 1) plant(group(-8.76, 0, -1.53 - i * 1.33, i * .7),
    1.6 + (i % 3) * .26, false, i % 2 === 0);
  for (let i = 0; i < 4; i += 1) plant(group(-6.9 + i * 1.15, 0, -9.19, i * .7),
    1.52 + (i % 3) * .28, false, i % 2 === 0);
  const trough = group(-8.49, .011, -3.72, -.04);
  box([.64, .31, 2.08], [0, .154, 0], wood, trough);
  box([.55, .052, 2.0], [0, .318, 0], soil, trough);
  for (let i = 0; i < 13; i += 1) {
    leaf([.19, .15, .13], [i % 2 ? .16 : -.16, .347 + (i % 3) * .045, -.92 + i * .144],
      greenLeaf[i % 3], trough, [.21, i * 2.4, .28 + i % 4 * .13]);
  }
  box([.063, .063, 4.4], [-9.68, .78, -3.7], trim);
  for (const z of [-1.96, -3.78, -5.64]) box([.15, .11, .078], [-9.64, .79, z], ceramic);

  bench(2.68, -8.56, 2.75, 1.045, true);
  const screen = interact('rehearsalScreen', '彩排播放器', [2.43, 1.09, -8.55], .12);
  box([1.14, .63, .13], [0, .405, 0], dark, screen);
  iconScreen('wave', '#81cbe2', 1.04, .55, [0, .407, .075], 0, screen);
  box([.28, .25, .11], [0, .113, -.04], trim, screen);
  box([.53, .041, .32], [0, .016, -.015], metal, screen);
  book('backupNotes', '备用布置图', 3.72, -8.19, paper, -.13);
  const diorama = interact('exhibitStand', '科学展台', [5.68, 0, -5.90]);
  box([1.98, .17, 1.46], [0, .081, 0], navy, diorama);
  box([1.55, 1.04, 1.10], [0, .64, 0], enamel, diorama);
  box([1.82, .095, 1.37], [0, 1.19, 0], counter, diorama);
  box([1.79, .035, 1.31], [0, 1.252, 0], yellow, diorama);
  plate('种子的力量', 1.245, .37, [0, .813, .567], 0, { size: 61, accent: AMBER, parent: diorama });
  const exhibitPlant = group(0, 1.273, -.09, .13, diorama);
  plant(exhibitPlant, 2.08, false, true);
  obstacle(5.68, -5.90, 1.98, 1.46);
  const exhibitAura = new THREE.PointLight('#e8efae', 0, 4.3);
  exhibitAura.position.set(5.68, 2.2, -5.80);
  scene.add(exhibitAura);
  bench(8.05, -2.21, 2.27, .90, true);
  const desk = book('handoverDesk', '交接纪要', 8.08, -1.938, blue, .1);
  box([.17, .036, .026], [.12, .047, .14], amber, desk, [0, -.4, 0]);
  plate('交接记录', 1.21, .36, [8.11, 2.19, -.172], Math.PI, { size: 63 });
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
    { size: 57, secondary: '春芽科学小组', parent: display });
  const exhibitRug = new THREE.MeshBasicMaterial({ color: '#7b9e77', transparent: true, opacity: .14, depthWrite: false });
  box([2.16, .02, 2.32], [5.68, .016, -5.9], exhibitRug);

  for (const [x, z] of [[-5, .7], [-5, -.7], [.7, 5], [-.7, 5], [.7, -5], [-.7, -5], [5, .7], [5, -.7]]) {
    for (let i = -1; i <= 1; i += 1) box([.055, .013, .36],
      [x + i * (Math.abs(x) > 1 ? .18 : 0), .028, z + i * (Math.abs(x) < 1 ? .18 : 0)],
      marker, null, [0, Math.abs(x) > 1 ? 0 : Math.PI / 2, 0]);
  }

  finish();

  const pickups = ['radio', 'seal', 'brightLamp', 'vividTape', 'tray', 'rehearsalTape'];

  function update(dt, state = {}) {
    const speed = dt > 0 ? Math.min(dt, .125) : 0;
    clock += speed;
    const motion = !state.reducedMotion;
    const completed = state.completed || 0;
    const used = (id) => state.used?.has(id);
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
      radioLED.scale.set(.031 + Math.sin(clock * 3.3) * .006, .031, .023);
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
  }

  update(0, { reducedMotion: true });
  return { scene, spawn, colliders, targets, update };
}
