const ground = [
  [0, 500],
  [595, 1240],
  [1335, 1840],
  [1930, 2550],
  [2645, 3060],
  [3155, 4200],
].map(([x, end]) => ({ x, y: 520, w: end - x, h: 300, kind: 'roof' }));

const ledges = [
  [245, 449, 175], [338, 378, 111], [674, 451, 168], [832, 386, 149],
  [1378, 452, 171], [1562, 382, 168], [1685, 445, 115], [1980, 445, 159],
  [2195, 377, 135], [2680, 447, 147], [2846, 383, 156], [3212, 455, 141],
  [3380, 387, 151], [3542, 450, 120],
].map(([x, y, w]) => ({ x, y, w, h: 18, kind: 'ledge' }));

export const world = {
  width: 4200,
  height: 700,
  start: { x: 120, y: 520 },
  platforms: [...ground, ...ledges],
  checkpoints: [
    { x: 1090, y: 520, sector: 0 },
    { x: 2410, y: 520, sector: 1 },
    { x: 3690, y: 520, sector: 2 },
  ],
  goal: { x: 4010, y: 520 },
};

const tau = Math.PI * 2;
const between = (x, min, max) => x >= min && x <= max;
const wrap = (x, size) => ((x % size) + size) % size;

function randomFrom(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const rng = randomFrom(64532);
const skyline = Array.from({ length: 3 }, (_, layer) => {
  let cursor = -180;
  return Array.from({ length: 42 }, () => {
    const w = 27 + rng() * (48 + layer * 14);
    const h = 31 + rng() * (72 + layer * 48);
    const windows = Array.from({ length: 24 }, () => rng());
    const building = { x: cursor, w, h, roof: rng(), tone: rng(), windows };
    cursor += w + 10 + rng() * 14;
    return building;
  });
});

const cloudBank = Array.from({ length: 28 }, (_, i) => ({
  x: rng() * 3850,
  y: 62 + rng() * 275,
  w: 115 + rng() * 330,
  h: 23 + rng() * 72,
  far: i % 3 === 0,
  speed: 4 + rng() * 8,
}));

const rain = Array.from({ length: 125 }, () => ({
  x: rng(), y: rng(), speed: 440 + rng() * 350, length: 8 + rng() * 15,
}));

const grass = ground.flatMap(({ x, w }, section) => Array.from(
  { length: Math.round(w / 13) },
  (_, i) => ({
    x: x + 14 + i * (w - 27) / Math.round(w / 13) + rng() * 8,
    height: 4 + rng() * (section === 5 ? 22 : 14),
    bend: rng() * 13 - 5,
    color: rng() > .64 ? '#56ad82' : rng() > .5 ? '#277362' : '#4b8d70',
  }),
));

const plants = [
  [22, 520, 1.2], [59, 520, 1.6], [182, 520, .75], [433, 520, 1.1],
  [622, 520, .7], [1008, 520, 1.25], [1174, 520, .8], [1354, 520, .9],
  [1775, 520, 1.4], [1950, 520, .7], [2291, 520, 1.35], [2508, 520, .9],
  [2674, 520, 1.25], [2988, 520, .9], [3172, 520, 1.3], [3322, 520, 1.5],
  [3421, 520, 1.15], [3555, 520, .7], [3765, 520, 1.45], [3843, 520, 1.2],
  [4100, 520, 1.65], [4153, 520, 1.38],
];

const poles = [205, 477, 641, 1164, 1360, 1803, 1960, 2512, 2670, 3040, 3196, 3890, 4155];

function shape(ctx, points, fill, stroke, width = 1) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  if (fill) {
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function line(ctx, points, color, width = 1) {
  shape(ctx, points, null, color, width);
}

function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, tau);
  ctx.fillStyle = color;
  ctx.fill();
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function halo(ctx, x, y, radius, color) {
  const falloff = ctx.createRadialGradient(x, y, 0, x, y, radius);
  falloff.addColorStop(0, color);
  falloff.addColorStop(1, 'transparent');
  rect(ctx, x - radius, y - radius, radius * 2, radius * 2, falloff);
}

function drawSky(ctx, width, height, cameraX, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#081427');
  sky.addColorStop(.38, '#123250');
  sky.addColorStop(.68, '#2e6276');
  sky.addColorStop(1, '#0b2239');
  rect(ctx, 0, 0, width, height, sky);
  halo(ctx, width * .72 - cameraX * .035, 340, width * .64, 'rgba(84,164,171,.30)');
  const moonX = width * .72 - cameraX * .055;
  halo(ctx, moonX, 179, 150, 'rgba(141,216,222,.22)');
  ellipse(ctx, moonX, 179, 51, 51, '#bad5d9');
  ellipse(ctx, moonX - 12, 171, 35, 35, 'rgba(114,163,180,.13)');
  ellipse(ctx, moonX + 18, 195, 19, 13, 'rgba(117,168,182,.13)', -.2);
  const stars = randomFrom(341);
  for (let i = 0; i < 29; i += 1) {
    const x = wrap(stars() * 1550 - cameraX * .035, 1550);
    const y = 30 + stars() * 230;
    const opacity = .11 + stars() * .22;
    if (x < width) ellipse(ctx, x, y, .75, .75, `rgba(209,238,237,${opacity})`);
  }
  for (const cloud of cloudBank) {
    const x = wrap(cloud.x - cameraX * (cloud.far ? .14 : .21) + t * cloud.speed, 3850) - 470;
    if (x + cloud.w < 0 || x > width + cloud.w) continue;
    const color = cloud.far ? 'rgba(17,40,62,.72)' : 'rgba(10,29,49,.67)';
    ctx.beginPath();
    ctx.moveTo(x - cloud.w * .56, cloud.y + cloud.h * .13);
    ctx.bezierCurveTo(x - cloud.w * .48, cloud.y - cloud.h * .29, x - cloud.w * .38, cloud.y - cloud.h * .17, x - cloud.w * .27, cloud.y - cloud.h * .25);
    ctx.bezierCurveTo(x - cloud.w * .17, cloud.y - cloud.h * .92, x + cloud.w * .13, cloud.y - cloud.h * .83, x + cloud.w * .18, cloud.y - cloud.h * .39);
    ctx.bezierCurveTo(x + cloud.w * .38, cloud.y - cloud.h * .56, x + cloud.w * .42, cloud.y - cloud.h * .05, x + cloud.w * .65, cloud.y + cloud.h * .17);
    ctx.bezierCurveTo(x + cloud.w * .36, cloud.y + cloud.h * .5, x - cloud.w * .30, cloud.y + cloud.h * .49, x - cloud.w * .56, cloud.y + cloud.h * .13);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(136,182,206,.055)';
    ctx.stroke();
  }
}

function drawCity(ctx, width, height, cameraX, t) {
  const bases = [448, 505, 585];
  const speeds = [.17, .30, .48];
  const colors = [['#31576b', '#2e5268'], ['#234558', '#27495e'], ['#153549', '#1d3c4f']];
  for (const [layer, buildings] of skyline.entries()) {
    for (const b of buildings) {
      const x = b.x - cameraX * speeds[layer];
      if (x + b.w + 40 < 0 || x > width + 25) continue;
      const roof = bases[layer] - b.h;
      const top = b.roof > .3 ? roof + (b.roof > .8 ? -16 : 6) : roof;
      rect(ctx, x, roof, b.w, height - roof, colors[layer][b.tone > .5 ? 0 : 1]);
      rect(ctx, x + b.w - 8, roof + 7, 8, height - roof, 'rgba(0,11,30,.17)');
      if (b.roof > .65) {
        rect(ctx, x + b.w * .24, top, b.w * .48, roof - top + 8, colors[layer][0]);
        if (b.roof > .86) {
          line(ctx, [x + b.w * .51, roof - 6, x + b.w * .51, roof - 28], '#357086');
          ellipse(ctx, x + b.w * .51, roof - 29, 1.4, 1.4, `rgba(255,142,106,${.46 + .10 * Math.sin(t * 1.3 + b.x)})`);
        }
      } else if (b.roof < .2) {
        shape(ctx, [x - 4, roof + 3, x + b.w * .27, roof - 16, x + b.w * .73, roof - 16, x + b.w + 4, roof + 3], colors[layer][0]);
      }
      const cols = Math.floor(b.w / 12);
      const rows = Math.min(8, Math.floor(b.h / 14));
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const flick = b.windows[(row * 3 + col) % 24];
          if (flick < .37) continue;
          const windowColor = flick > .76 ? 'rgba(236,185,104,.46)' : (flick > .57 ? 'rgba(83,167,175,.30)' : 'rgba(7,25,45,.27)');
          rect(ctx, x + 5 + col * 12, roof + 12 + row * 13, layer === 2 ? 4 : 3, 5, windowColor);
        }
      }
    }
    const mist = ctx.createLinearGradient(0, 330, 0, bases[layer] + 47);
    mist.addColorStop(0, 'transparent');
    mist.addColorStop(1, layer === 2 ? 'rgba(19,53,69,.55)' : 'rgba(108,175,175,.11)');
    rect(ctx, 0, 331, width, bases[layer] - 274, mist);
  }
}

function drawShed(ctx, t) {
  const x = -29;
  const y = 354;
  shape(ctx, [x, y + 5, x + 38, y - 29, x + 218, y - 29, x + 250, y + 5], '#172d40', '#387080', 2);
  rect(ctx, x + 4, y + 3, 236, 159, '#1b3a49');
  rect(ctx, x + 8, y + 7, 225, 4, '#4c7f83');
  for (let i = 0; i < 12; i += 1) {
    line(ctx, [x + 15 + i * 19, y + 12, x + 15 + i * 19, y + 163], 'rgba(105,145,147,.17)');
  }
  const door = x + 113;
  rect(ctx, door - 58, y + 46, 115, 113, '#122733');
  rect(ctx, door - 48, y + 49, 94, 104, '#233f42');
  halo(ctx, door, y + 37, 83, 'rgba(240,179,108,.23)');
  rect(ctx, door - 11, y + 30, 22, 4, '#ffe3a6');
  rect(ctx, door - 37, y + 65, 31, 55, '#755d44');
  rect(ctx, door + 2, y + 65, 31, 55, '#66593e');
  for (const [ox, oy] of [[-35, 71], [-35, 94], [4, 71], [4, 94]]) {
    rect(ctx, door + ox, y + oy, 27, 20, 'rgba(242,174,89,.4)');
  }
  line(ctx, [door - 53, y + 158, door + 53, y + 158], '#708687', 2);
  drawSign(ctx, 147, 405, 'SCIENCE BLOCK', 'A / ROOFTOP ACCESS');
  line(ctx, [x + 199, y + 30, x + 219, y + 30, x + 219, y + 132, x + 240, y + 132], '#356575', 5);
  drawFlag(ctx, 154, 299, t, '#6fcbb6', 41);
}

function drawSign(ctx, x, y, title, subtitle) {
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = '600 8px monospace';
  const w = Math.max(ctx.measureText(title).width, ctx.measureText(subtitle).width) + 14;
  rect(ctx, x - w / 2, y, w, 26, '#122934');
  rect(ctx, x - w / 2, y, w, 1, '#5a8989');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d1e1d4';
  ctx.fillText(title, x, y + 5);
  ctx.font = '6px monospace';
  ctx.fillStyle = '#79a6a4';
  ctx.fillText(subtitle, x, y + 16);
  ctx.restore();
}

function drawFlag(ctx, x, y, t, color, width) {
  line(ctx, [x, y - 4, x, y + 44], '#5e8291', 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + width * .35, y + Math.sin(t * 3) * 8, x + width * .75, y - 6, x + width, y + Math.sin(t * 4 + x) * 6 + 1);
  ctx.lineTo(x + width - 4, y + 16 + Math.sin(t * 4 + x) * 6);
  ctx.bezierCurveTo(x + width * .6, y + 13, x + width * .36, y + 20 + Math.sin(t * 3) * 8, x, y + 16);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  rect(ctx, x + 5, y + 4, 12, 2, 'rgba(239,246,203,.65)');
}

function drawWaterTanks(ctx, x, t) {
  for (let i = 0; i < 2; i += 1) {
    const tx = x + i * 95;
    const ty = 362 + i * 31;
    line(ctx, [tx - 35, ty + 78, tx - 35, 520, tx + 36, 520, tx + 36, ty + 78], '#3b6770', 5);
    line(ctx, [tx - 35, ty + 95, tx + 36, 518, tx + 36, ty + 95, tx - 35, 518], '#2b5962', 2);
    const paint = ctx.createLinearGradient(tx - 44, 0, tx + 44, 0);
    paint.addColorStop(0, '#233c43');
    paint.addColorStop(.25, '#49696a');
    paint.addColorStop(.58, '#3b6060');
    paint.addColorStop(1, '#233d49');
    rect(ctx, tx - 44, ty, 88, 82, paint);
    ellipse(ctx, tx, ty + 82, 44, 11, '#30525c');
    ellipse(ctx, tx, ty, 44, 13, '#588084');
    ellipse(ctx, tx, ty - 1, 37, 8, '#3f646e');
    for (let band = 1; band < 4; band += 1) line(ctx, [tx - 43, ty + band * 19, tx + 43, ty + band * 19], '#284852', 2);
    line(ctx, [tx - 43, ty + 64, tx - 64, ty + 64, tx - 64, 492], '#759397', 4);
    line(ctx, [tx - 43, ty + 65, tx - 63, ty + 65, tx - 63, 492], '#487078', 3);
    halo(ctx, tx + 33, ty + 23, 24, 'rgba(206,253,145,.14)');
    rect(ctx, tx + 31, ty + 22, 5, 2, '#d0f591');
    drawFlag(ctx, tx + 23, ty - 46, t + i, '#b37c56', 29);
  }
}

function drawGreenhouse(ctx, t, powered) {
  const x = 3432;
  const w = 748;
  const roof = 285;
  const wall = 369;
  const base = 520;
  const end = x + w;
  const lit = powered >= 3;
  const glass = ctx.createLinearGradient(x, roof, x, base);
  glass.addColorStop(0, lit ? '#628361' : '#315563');
  glass.addColorStop(.43, lit ? '#465f47' : '#284e59');
  glass.addColorStop(1, lit ? '#233f3b' : '#1e3c48');
  shape(ctx, [x, wall, x + 62, roof, end - 62, roof, end, wall, end, base, x, base], glass, '#609493', 3);
  halo(ctx, end - 157, 439, lit ? 282 : 150, lit ? 'rgba(239,218,118,.31)' : 'rgba(109,202,153,.17)');
  for (let pane = 0; pane < 11; pane += 1) {
    const px = x + (pane + .5) * w / 11;
    const high = x + 62 + (pane + .5) * (w - 124) / 11;
    const gleam = pane % 3 === 0 ? 'rgba(162,201,170,.13)' : 'rgba(98,165,167,.11)';
    shape(ctx, [px + 6, wall + 4, px + 35, wall + 4, px - 24, base - 4, px - 46, base - 4], gleam);
    line(ctx, [high, roof + 2, px, wall + 2, px, base], '#5d8c8d', 2);
    line(ctx, [high - 4, roof + 7, px - 4, wall + 3], 'rgba(170,218,209,.42)');
  }
  line(ctx, [x - 12, wall, end + 12, wall], '#99aba0', 4);
  line(ctx, [x, 433, end, 433], '#567f7f', 2);
  line(ctx, [x, base - 8, end, base - 8], '#759d8c', 3);
  drawSign(ctx, x + 378, wall - 11, 'RESEARCH GREENHOUSE', 'C / BOTANY LAB');
  for (const lx of [x + 106, x + 286, x + 467, x + 648]) {
    line(ctx, [lx, wall + 2, lx, wall + 22], '#51736e', 1.5);
    ellipse(ctx, lx, wall + 26, 9, 4, lit ? '#f8d789' : '#79b49c');
    halo(ctx, lx, wall + 46, lit ? 91 : 49, lit ? 'rgba(255,218,115,.25)' : 'rgba(148,207,163,.14)');
  }
  for (let i = 0; i < 12; i += 1) {
    const px = x + 37 + i * 59;
    const py = 487 - 17 * (i % 3);
    rect(ctx, px - 22, py, 44, 8, '#284640');
    line(ctx, [px - 19, py + 7, px - 23, 520, px + 22, 520, px + 19, py + 7], '#365d53', 2);
    drawPlant(ctx, px, py, .62 + (i % 3) * .2, t, true);
  }
}

function drawPlant(ctx, x, y, size, t, muted = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const leafColors = muted ? ['#316956', '#40745c', '#51846b'] : ['#276a59', '#377d63', '#68a986'];
  for (let i = 0; i < 6; i += 1) {
    const side = i % 2 ? 1 : -1;
    const bend = (6 + i * 3) * side + Math.sin(t * 2.1 + x * .089 + i) * (2 + i * .37);
    const tip = -17 - (i % 3) * 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(bend * .18, tip * .51, bend, tip);
    ctx.strokeStyle = muted ? '#3a785c' : '#63a181';
    ctx.lineWidth = .9;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bend - side * 8, tip * .70);
    ctx.quadraticCurveTo(bend - side * 12, tip - 7, bend + side * 11, tip - 4);
    ctx.quadraticCurveTo(bend + side * 11, tip + 9, bend - side * 8, tip * .70);
    ctx.fillStyle = leafColors[i % leafColors.length];
    ctx.fill();
  }
  ctx.restore();
}

function drawRoof(ctx, platform, minX, maxX, t) {
  const { x, y, w } = platform;
  const stone = ctx.createLinearGradient(0, y + 5, 0, y + 185);
  stone.addColorStop(0, '#263f4a');
  stone.addColorStop(.4, '#172d3c');
  stone.addColorStop(1, '#112131');
  shape(ctx, [x, y, x + w, y, x + w, y + 242, x, y + 242], stone);
  rect(ctx, x, y, 6, 250, 'rgba(92,133,143,.28)');
  rect(ctx, x + w - 7, y, 7, 250, 'rgba(10,23,36,.55)');
  const start = x + Math.max(0, Math.floor((minX - x) / 51) * 51);
  for (let bx = start; bx < x + w && bx < maxX; bx += 51) {
    for (let row = 0; row < 6; row += 1) {
      const off = row % 2 ? 25 : 0;
      const end = Math.min(bx + 48 + off, x + w - 4);
      const left = Math.min(bx + off, end);
      const by = y + 23 + row * 27;
      rect(ctx, left, by, end - left, 1, 'rgba(124,158,165,.09)');
      rect(ctx, left, by + 1, 1, 25, 'rgba(124,158,165,.07)');
      rect(ctx, left, by + 25, end - left, 2, 'rgba(5,17,25,.21)');
    }
  }
  rect(ctx, x - 1, y + 2, w + 2, 11, '#405e65');
  rect(ctx, x, y + 4, w, 2, '#6b9a92');
  rect(ctx, x, y, w, 2, '#b0c2a7');
  rect(ctx, x, y + 12, w, 4, '#152e3a');
  for (let wx = x + 42; wx < x + w - 26; wx += 94) {
    if (!between(wx, minX - 65, maxX + 65)) continue;
    const flick = .15 + .04 * Math.sin(t * .9 + wx);
    rect(ctx, wx, y + 101, 50, 43, '#122635');
    rect(ctx, wx + 3, y + 103, 44, 37, `rgba(213,168,90,${flick})`);
    line(ctx, [wx + 25, y + 104, wx + 25, y + 140], '#213646', 2);
    rect(ctx, wx, y + 144, 50, 3, '#4a6265');
  }
  for (const edge of [x + 3, x + w - 35]) {
    rect(ctx, edge, y + 6, 31, 7, '#29414a');
    for (let i = 0; i < 3; i += 1) {
      const sx = edge + 2 + i * 10;
      shape(ctx, [sx, y + 13, sx + 5, y + 13, sx + 10, y + 6, sx + 5, y + 6], '#bca66a');
    }
  }
}

function drawLedge(ctx, { x, y, w }) {
  line(ctx, [x + 24, y + 17, x + 35, y + 44, x + 57, y + 17, x + w - 50, y + 17, x + w - 29, y + 44, x + w - 17, y + 17], '#3e6270', 3);
  shape(ctx, [x, y + 2, x + w, y + 2, x + w - 7, y + 14, x + 7, y + 14], '#233e4b');
  rect(ctx, x, y, w, 4, '#86b4a0');
  rect(ctx, x, y + 4, w, 3, '#537c7f');
  rect(ctx, x + 7, y + 9, 16, 2, '#beaa73');
  rect(ctx, x + w - 23, y + 9, 16, 2, '#beaa73');
}

function drawRail(ctx, { x, y, w }, minX, maxX) {
  x += 16;
  w -= 32;
  const next = x + w;
  line(ctx, [x, y - 29, next, y - 29], '#315765', 2);
  line(ctx, [x, y - 11, next, y - 11], '#315565', 1);
  for (let rail = x; rail < next + 2; rail += 35) {
    if (!between(rail, minX - 1, maxX + 1)) continue;
    line(ctx, [rail, y, rail, y - 33], '#426878', 2);
    ellipse(ctx, rail, y - 34, 2, 1.5, '#739394');
  }
}

function drawLightpost(ctx, x, t) {
  const top = 424 + Math.sin(x) * 8;
  line(ctx, [x, 520, x, top, x + 15, top], '#51757a', 4);
  line(ctx, [x + 2, 519, x + 2, top + 1], '#294653', 2);
  const opacity = .21 + .025 * Math.sin(t * 3 + x);
  halo(ctx, x + 14, top + 11, 78, `rgba(245,187,95,${opacity})`);
  const cone = ctx.createLinearGradient(0, top, 0, 525);
  cone.addColorStop(0, 'rgba(246,196,112,.18)');
  cone.addColorStop(1, 'rgba(246,196,112,.02)');
  shape(ctx, [x + 10, top + 6, x + 19, top + 6, x + 61, 520, x - 34, 520], cone);
  shape(ctx, [x + 6, top + 3, x + 13, top - 3, x + 20, top + 3, x + 20, top + 7, x + 6, top + 7], '#304b4a');
  rect(ctx, x + 7, top + 6, 12, 3, '#ffe6a0');
}

function drawGoal(ctx, t, powered) {
  const { x, y } = world.goal;
  const grown = powered >= 3;
  const spread = grown ? 115 : 40;
  halo(ctx, x, y - 66, grown ? 148 : 67, grown ? 'rgba(222,248,149,.38)' : 'rgba(150,207,134,.11)');
  ellipse(ctx, x, y - 2, 43, 7, 'rgba(7,24,21,.62)');
  shape(ctx, [x - 29, y - 30, x + 29, y - 30, x + 20, y - 2, x - 20, y - 2], '#89664d', '#ad9a78', 1);
  ellipse(ctx, x, y - 30, 30, 6, '#263a30');
  line(ctx, [x - 29, y - 29, x + 29, y - 29], '#c8ab77', 3);
  drawPlant(ctx, x, y - 32, grown ? 2.16 : .82, t);
  if (!grown) return;
  for (let i = 0; i < 18; i += 1) {
    const angle = i * 2.4 + t * .34;
    const px = x + Math.cos(angle) * spread * (.24 + i / 28);
    const py = y - 42 - wrap(t * (12 + i % 5) + i * 11, 97);
    const alpha = .38 + Math.sin(i + t * 1.4) * .25;
    ellipse(ctx, px, py, 1.4 + i % 2, 1, `rgba(228,246,163,${alpha})`);
  }
}

function drawRain(ctx, width, height, cameraX, t, reducedMotion) {
  const count = reducedMotion ? 26 : Math.min(rain.length, Math.floor(width * .115));
  const offset = cameraX * .28;
  ctx.lineWidth = .85;
  for (let level = 0; level < 3; level += 1) {
    ctx.beginPath();
    for (let i = level; i < count; i += 3) {
      const drop = rain[i];
      const x = wrap(drop.x * (width + 80) - offset - t * drop.speed * .25, width + 80) - 34;
      const y = wrap(drop.y * (height + 70) + t * drop.speed, height + 70) - 35;
      const length = drop.length + level * 3;
      ctx.moveTo(x, y);
      ctx.lineTo(x - length * .31, y + length);
    }
    ctx.strokeStyle = `rgba(152,207,228,${(reducedMotion ? .075 : .105) + level * .027})`;
    ctx.stroke();
  }
}

export function drawWorld(ctx, view) {
  const { width, height, cameraX = 0, time = 0, flash = 0, powered = 0, reducedMotion = false } = view;
  const t = reducedMotion ? 0 : time;
  drawSky(ctx, width, height, cameraX, t);
  drawCity(ctx, width, height, cameraX, t);

  const minX = cameraX - 70;
  const maxX = cameraX + width + 70;
  const visible = (x, w = 0) => x + w >= minX && x <= maxX;
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const roof of ground) {
    if (visible(roof.x, roof.w)) drawRail(ctx, roof, minX, maxX);
  }
  if (visible(0, 245)) drawShed(ctx, t);
  if (visible(1070, 200)) drawWaterTanks(ctx, 1115, t);
  if (visible(2250, 230)) drawWaterTanks(ctx, 2290, t + 2);
  if (visible(3430, 750)) drawGreenhouse(ctx, t, powered);
  for (const pole of poles) {
    if (visible(pole, 15)) drawLightpost(ctx, pole, t);
  }
  for (const roof of ground) {
    if (visible(roof.x, roof.w)) drawRoof(ctx, roof, minX, maxX, t);
  }
  for (const ledge of ledges) {
    if (visible(ledge.x, ledge.w)) drawLedge(ctx, ledge);
  }
  for (const tuft of grass) {
    if (!visible(tuft.x)) continue;
    ctx.beginPath();
    ctx.moveTo(tuft.x - 1, 521);
    ctx.quadraticCurveTo(tuft.x, 514, tuft.x + tuft.bend + Math.sin(t * 2.2 + tuft.x * .1) * 3, 520 - tuft.height);
    ctx.quadraticCurveTo(tuft.x + tuft.bend * .52, 519, tuft.x + 2, 521);
    ctx.fillStyle = tuft.color;
    ctx.fill();
  }
  for (const [x, y, size] of plants) {
    if (visible(x)) drawPlant(ctx, x, y, size, t);
  }
  if (visible(world.goal.x)) drawGoal(ctx, t, powered);
  ctx.restore();
  drawRain(ctx, width, height, cameraX, t, reducedMotion);
  if (flash > 0 && !reducedMotion) {
    rect(ctx, 0, 0, width, height, `rgba(189,218,239,${Math.min(.13, flash * .13)})`);
  }
}
