import { world, drawWorld } from './world.js';
import { createPlayer, stepPlayer, drawPlayer } from './player.js';
import { sectors, words } from './curriculum.js';
import { createAudio } from './audio.js';
import { createPractice } from './practice.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#scene');
const ctx = canvas.getContext('2d');
const intro = $('#intro');
const start = $('#start');
const nearby = $('#nearby');
const replay = $('#replay');
const banner = $('#banner');
const dialog = $('#overlay');
const progress = [...document.querySelectorAll('.flight-line i')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const audio = createAudio();
const steps = [
  'Reach the Storm Walk relay',
  'Find the Growing Bay relay',
  'Reach the Recovery Beacon',
  'Enter the greenhouse',
];
const dew = [
  [390, 339], [902, 345], [1000, 486],
  [1464, 413], [1628, 342], [2270, 336],
  [2755, 407], [2920, 343], [3450, 347],
];
const phases = ['meaning', 'trace', 'dictation'];
const wordSet = new Set(words.map(({ word }) => word));
const saveKey = 'stormroot-p6l1-v1';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const step = 1 / 120;

function restore() {
  try {
    const raw = JSON.parse(localStorage.getItem(saveKey));
    if (raw && typeof raw === 'object') {
      const powered = Number.isInteger(raw.powered) ? clamp(raw.powered, 0, world.checkpoints.length) : 0;
      return {
        powered,
        won: raw.won === true && powered === 3,
        drops: new Set(Array.isArray(raw.drops) ? raw.drops.filter((i) => Number.isInteger(i) && i >= 0 && i < dew.length) : []),
        records: Object.fromEntries(Object.entries(raw.records ?? {}).filter(([word, record]) =>
          wordSet.has(word) && Array.isArray(record)).map(([word, record]) => [word, [...new Set(record.filter((item) => phases.includes(item)))]])),
      };
    }
  } catch {
    // Storage can be disabled on school devices.
  }
  return { powered: 0, won: false, drops: new Set(), records: {} };
}

const save = restore();
function persist() {
  try {
    localStorage.setItem(saveKey, JSON.stringify({ ...save, drops: [...save.drops] }));
  } catch {
    // The current run can continue without storage.
  }
}

const keyboard = new Set();
const pointers = new Map();
const particles = [];
const arrows = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};
let player = createPlayer(world.start.x, world.start.y);
let jumpPressed = false;
let running = false;
let finished = false;
let relayStep = 0;
let canUseRelay = false;
let sound = false;
let camera = 0;
let time = 0;
let flash = 0;
let crossing = 0;
let bannerUntil = 0;
let respawnAt = 0;
let width = 1024;
let scale = 1;
let offsetY = 0;
let density = 1;

function clearInput() {
  keyboard.clear();
  pointers.clear();
  jumpPressed = false;
}

const practice = createPractice({
  dialog,
  panel: $('#panel'),
  onOpen() {
    clearInput();
    audio.setDucked(true);
  },
  onClose() {
    clearInput();
    audio.setDucked(false);
    if (running) nearby.hidden = !canUseRelay;
  },
  onCue: audio.cue,
  onRecord(word, mode) {
    const record = save.records[word] ?? [];
    if (!record.includes(mode)) {
      save.records[word] = [...record, mode];
      persist();
    }
  },
  getRecord: (word) => save.records[word] ?? [],
});

function hud() {
  $('#charge').textContent = save.powered + ' / ' + world.checkpoints.length + ' relays';
  $('#zone').textContent = !running ? 'School rooftop' : (sectors[save.powered]?.title ?? 'Greenhouse');
  $('#objective').textContent = finished ? 'Greenhouse restored' : (running ? steps[save.powered] : 'Restore the greenhouse');
  $('#dew-count').textContent = save.drops.size + ' / ' + dew.length;
  progress.forEach((line, index) => line.classList.toggle('active', index < save.powered));
}

function notice(text, seconds = 3.1) {
  $('#announcer').textContent = text;
  banner.textContent = text;
  banner.hidden = false;
  bannerUntil = time + seconds;
}

function spawn() {
  const point = world.checkpoints[save.powered - 1] ?? world.start;
  player = createPlayer(point.x + (save.powered ? 20 : 0), point.y);
  camera = clamp(player.x - width * .34, 0, world.width - width);
}

function begin(reset = false) {
  if (reset || save.won) {
    save.powered = 0;
    save.won = false;
    save.drops.clear();
    persist();
  }
  clearInput();
  running = true;
  finished = false;
  relayStep = 0;
  canUseRelay = false;
  respawnAt = 0;
  intro.hidden = true;
  nearby.hidden = true;
  replay.hidden = true;
  $('#touch-controls').hidden = false;
  canvas.focus({ preventScroll: true });
  spawn();
  hud();
  audio.setAmbience(true);
  notice(save.powered ? 'Back at the last restored relay.' : 'Head right. Hold jump to clear the roof gaps.', 4);
}

function toggleSound() {
  sound = !sound && audio.setEnabled(true);
  if (!sound) audio.setEnabled(false);
  $('#sound').setAttribute('aria-pressed', String(sound));
  $('#sound-label').textContent = sound ? 'Sound on' : 'Sound off';
  if (sound) audio.cue('dew');
}

function burst(x, y, count, colour, strength) {
  if (reducedMotion.matches) return;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const speed = (0.45 + Math.random() * .55) * strength;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      colour, life: .38 + Math.random() * .55, size: 1.4 + Math.random() * 2.5 });
  }
}

function completeRelay() {
  const point = world.checkpoints[save.powered];
  save.powered += 1;
  relayStep = 0;
  canUseRelay = false;
  nearby.hidden = true;
  audio.cue('relay');
  burst(point.x, point.y - 62, 38, '#ddff9c', 210);
  flash = .62;
  persist();
  hud();
  notice(save.powered === 3 ? 'All relays restored. Reach the seedlings!' : 'Relay restored. The way ahead is open.');
}

function useRelay() {
  if (!running || !canUseRelay || dialog.open) return;
  practice.relay(sectors[save.powered], relayStep, (next) => { relayStep = next; }, completeRelay);
}

function completeRun() {
  finished = true;
  save.won = true;
  persist();
  audio.cue('finish');
  audio.setAmbience(false);
  burst(world.goal.x, world.goal.y - 70, 60, '#e6ffa3', 240);
  clearInput();
  $('#touch-controls').hidden = true;
  replay.hidden = false;
  hud();
  notice('Greenhouse restored.', 2);
  window.setTimeout(() => {
    if (finished && !dialog.open) practice.victory(save.drops.size, () => begin(true));
  }, reducedMotion.matches ? 80 : 850);
}

start.textContent = save.won ? 'Replay the rescue' : (save.powered ? 'Continue the rescue' : 'Start the rescue');
start.addEventListener('click', () => begin());
replay.addEventListener('click', () => begin(true));
for (const [control, action] of [[nearby, useRelay], [$('#sound'), toggleSound], [$('#journal'), practice.journal]]) {
  control.addEventListener('click', (event) => {
    if (running && event.detail > 0) canvas.focus({ preventScroll: true });
    action();
  });
}

function typingOrButton(target) {
  return target instanceof Element && target.closest('button, input, textarea, select, [contenteditable]');
}

window.addEventListener('keydown', (event) => {
  if (dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyP' && !event.repeat) {
    practice.journal();
    return;
  }
  if (!running || finished) return;
  if (event.code === 'KeyE' && !event.repeat) {
    useRelay();
    return;
  }
  if (!arrows[event.code] || (event.code === 'Space' && typingOrButton(event.target) && !keyboard.size)) return;
  event.preventDefault();
  if (arrows[event.code] === 'jump' && !event.repeat) jumpPressed = true;
  keyboard.add(event.code);
});
window.addEventListener('keyup', (event) => keyboard.delete(event.code));
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearInput();
});
for (const control of document.querySelectorAll('[data-control]')) {
  control.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    control.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, control.dataset.control);
    if (control.dataset.control === 'jump') jumpPressed = true;
  });
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    control.addEventListener(end, (event) => pointers.delete(event.pointerId));
  }
}

function simulatedStep() {
  const controls = [...pointers.values(), ...Array.from(keyboard, (key) => arrows[key])];
  stepPlayer(player, {
    left: controls.includes('left'), right: controls.includes('right'),
    jumpPressed, jumpHeld: controls.includes('jump'),
  }, step, world.platforms);
  jumpPressed = false;
  if (player.jumped) audio.cue('jump');
  if (player.landed) audio.cue('land');

  const point = world.checkpoints[save.powered];
  const limit = point ? point.x + 112 : world.width - 18;
  if (player.x > limit && player.vx > 0) {
    player.vx = 0;
    if (time > crossing && point) {
      notice('Use the relay to open this route.');
      crossing = time + 3;
    }
  }
  player.x = clamp(player.x, 16, limit);

  for (let i = 0; i < dew.length; i += 1) {
    if (save.drops.has(i)) continue;
    const [x, y] = dew[i];
    if (Math.hypot(player.x - x, player.y - 28 - y) < 32) {
      save.drops.add(i);
      burst(x, y, 11, '#92ffe8', 120);
      audio.cue('dew');
      persist();
      hud();
    }
  }
  canUseRelay = Boolean(point && Math.abs(player.x - point.x) < 81 && Math.abs(player.y - point.y) < 32);
  nearby.hidden = !canUseRelay;
  if (player.y > world.height + 32) {
    respawnAt = time + .24;
    canUseRelay = false;
    nearby.hidden = true;
    audio.cue('fall');
    notice('The wind caught you. Try the jump again.');
  } else if (!point && Math.abs(player.x - world.goal.x) < 42 && player.y >= world.goal.y - 38) {
    completeRun();
  }
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  density = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(bounds.width * density));
  canvas.height = Math.max(1, Math.round(bounds.height * density));
  scale = Math.max(bounds.height / world.height, bounds.width / 1560);
  if (bounds.width < 720 && bounds.height > bounds.width) scale = Math.min(scale, bounds.width / 385);
  width = Math.min(world.width, bounds.width / scale);
  offsetY = width < 720 ? (bounds.height - world.height * scale) * .60 : (bounds.height - world.height * scale) * .38;
  camera = clamp(camera, 0, world.width - width);
}
window.addEventListener('resize', resize);
resize();

function drawMarker(point, index, now) {
  const active = index === save.powered;
  const restored = index < save.powered;
  const pulse = reducedMotion.matches ? 1 : .75 + .25 * Math.sin(now * 4);
  const colour = restored ? '#d1ff90' : (active ? '#ffcd7b' : '#68837a');
  const { x, y } = point;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#172e36';
  ctx.fillRect(-13, -57, 26, 57);
  ctx.fillStyle = '#203c42';
  ctx.fillRect(-20, -68, 40, 17);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.strokeRect(-18, -72, 36, 20);
  ctx.shadowColor = colour;
  ctx.shadowBlur = active || restored ? 15 * pulse : 0;
  ctx.fillStyle = colour;
  ctx.fillRect(-11, -65, 22 * pulse, 5);
  ctx.beginPath();
  ctx.moveTo(0, -91);
  ctx.lineTo(8, -83);
  ctx.lineTo(0, -75);
  ctx.lineTo(-8, -83);
  ctx.closePath();
  ctx.fill();
  if (active) {
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('RELAY ' + (index + 1), 0, -108);
  }
  ctx.restore();
}

function drawGate(point, now) {
  const x = point.x + 112;
  const y = point.y;
  const gate = ctx.createLinearGradient(x - 16, y, x + 16, y);
  gate.addColorStop(0, '#f8bb6d00');
  gate.addColorStop(.5, '#ffca768b');
  gate.addColorStop(1, '#f8bb6d00');
  ctx.fillStyle = gate;
  ctx.fillRect(x - 16, y - 139, 32, 140);
  ctx.strokeStyle = '#ffd383a8';
  ctx.beginPath();
  for (let i = 0; i < 18; i += 1) {
    const phase = reducedMotion.matches ? 0 : now * 5;
    const k = x + Math.sin(i * 1.6 + phase) * (i % 2 ? 4 : 8);
    if (i) ctx.lineTo(k, y - i * 8);
    else ctx.moveTo(k, y);
  }
  ctx.stroke();
}

function drawDew(now) {
  for (let i = 0; i < dew.length; i += 1) {
    if (save.drops.has(i) || dew[i][0] < camera - 30 || dew[i][0] > camera + width + 30) continue;
    const [x, y] = dew[i];
    ctx.save();
    ctx.translate(x, y + (reducedMotion.matches ? 0 : Math.sin(now * 4 + i) * 5));
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = '#84ffe3';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#c2ffee';
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -4, 3, 3);
    ctx.restore();
  }
}

function frameDraw(dt) {
  const follow = player.x - width * (player.facing > 0 ? .39 : .57);
  const target = running ? follow : 90 + (reducedMotion.matches ? 0 : Math.sin(time * .23) * 65);
  camera = clamp(camera + (target - camera) * (1 - Math.exp(-dt * 5.4)), 0, world.width - width);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fill = ctx.createLinearGradient(0, 0, 0, canvas.height);
  fill.addColorStop(0, '#081427');
  if (offsetY > 0) fill.addColorStop(Math.min(.99, offsetY * density / canvas.height), '#081427');
  fill.addColorStop(1, '#0b2239');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(density * scale, 0, 0, density * scale, 0, offsetY * density);
  drawWorld(ctx, { width, height: world.height, cameraX: camera, time, flash, powered: save.powered, reducedMotion: reducedMotion.matches });
  ctx.save();
  ctx.translate(-camera, 0);
  for (const [index, point] of world.checkpoints.entries()) {
    if (point.x > camera - 40 && point.x < camera + width + 40) drawMarker(point, index, time);
  }
  const point = world.checkpoints[save.powered];
  if (point && point.x + 112 < camera + width + 20 && point.x + 112 > camera - 20) drawGate(point, time);
  drawDew(time);
  drawPlayer(ctx, player, time, reducedMotion.matches);
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 95 * dt;
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = p.colour;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.restore();
}

hud();
let previous = performance.now();
let accumulator = 0;
function frame(now) {
  const dt = Math.min(.05, (now - previous) / 1000);
  previous = now;
  time += dt;
  flash = Math.max(0, flash - dt * 2.1);
  if (time >= bannerUntil) banner.hidden = true;
  if (running && !dialog.open) {
    if (respawnAt && time >= respawnAt) {
      respawnAt = 0;
      spawn();
    }
    if (!respawnAt && !finished) {
      accumulator += dt;
      while (accumulator >= step && !finished && !respawnAt) {
        simulatedStep();
        accumulator -= step;
      }
    }
  }
  frameDraw(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
