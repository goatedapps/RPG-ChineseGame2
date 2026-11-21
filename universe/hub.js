import { bindJoystick } from '../shared/joystick.js';
import { lessonCompleted } from '../shared/lesson-progress.js';
import { getWorlds, levels } from './catalog.js';

const $ = (id) => document.getElementById(id);
const gradeKeys = Object.keys(levels);
const dialog = $('world-directory');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const statusText = {
  open: '可以进入',
  complete: '已完成',
  building: '建设中',
  locked: '尚未解锁',
};
let currentLevel;
let worlds = [];
let nearby;
let statusTimer;
let universe;
let generation = 0;
let leaving = false;

function add(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function linkAsset(path) {
  return new URL(path, import.meta.url).href;
}
function setAddress(level) {
  const address = new URL(location.href);
  if (level) address.searchParams.set('level', level);
  else address.searchParams.delete('level');
  history.replaceState(null, '', address);
}
function animateTitle() {
  if (motion.matches || !window.gsap) return;
  window.gsap.fromTo(
    '.hero-copy > *',
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.62,
      stagger: 0.09,
      clearProps: 'opacity,transform',
    },
  );
}

function mapStatus(text = '', duration = 0) {
  clearTimeout(statusTimer);
  $('map-status').textContent = text;
  if (duration) statusTimer = setTimeout(mapStatus, duration);
}
function refreshWorlds(level) {
  worlds = getWorlds(level, lessonCompleted);
  const completed = worlds.filter(({ status }) => status === 'complete').length;
  $('completion').textContent =
    '已完成 ' + completed + ' / ' + worlds.length + ' 课';
}
async function openLevel(level) {
  if (!gradeKeys.includes(level)) return;
  const ticket = ++generation;
  if (dialog.open) dialog.close();
  universe?.destroy();
  universe = undefined;
  currentLevel = level;
  leaving = false;
  $('warp').hidden = true;
  setAddress(level);
  refreshWorlds(level);
  $('map-title').textContent = levels[level].label + '星域';
  document.title = levels[level].label + '星域 · 华文宇宙';
  $('choose').hidden = true;
  $('map').hidden = false;
  $('map').inert = false;
  $('universe').hidden = false;
  $('joystick').hidden = false;
  $('map').classList.remove('map-unavailable');
  nearby = undefined;
  mapStatus();
  $('map-title').focus();
  if (!motion.matches && window.gsap)
    window.gsap.fromTo(
      '.map-hud',
      { opacity: 0 },
      { opacity: 1, duration: 0.36, clearProps: 'opacity' },
    );
  try {
    const { createUniverse } = await import('./map.js?v=touch-controls');
    if (ticket !== generation) return;
    universe = createUniverse($('universe'), levels[level], worlds, {
      onNearby: (world) => { nearby = world; },
      onActivate: enterWorld,
      planetImages: Object.values(levels).map(({ image }) => image),
    });
    universe.flyTo(
      worlds.find((world) => world.status === 'open')?.number ?? 1,
    );
  } catch {
    if (ticket !== generation) return;
    $('universe').hidden = true;
    $('joystick').hidden = true;
    $('map').classList.add('map-unavailable');
    mapStatus('这个设备暂时无法显示三维星图。请从世界目录进入。');
  }
}
function backToLevels() {
  ++generation;
  if (dialog.open) dialog.close();
  universe?.destroy();
  universe = undefined;
  setAddress();
  $('map').hidden = true;
  $('choose').hidden = false;
  $('warp').hidden = true;
  leaving = false;
  document.title = '华文宇宙 · 选择年级';
  $('grades')
    .querySelector('[data-level="' + currentLevel + '"]')
    ?.focus();
  currentLevel = undefined;
}
function openDirectory() {
  if (leaving) return;
  $('world-list').replaceChildren(
    ...worlds.map((world) => {
      const row = add('button', '', 'world-row');
      row.type = 'button';
      row.dataset.status = world.status;
      row.append(
        add(
          'span',
          world.title === world.lesson
            ? world.lesson
            : world.lesson + ' · ' + world.title,
        ),
        add('small', statusText[world.status]),
      );
      row.onclick = () => {
        dialog.close();
        if (universe) universe.flyTo(world.number);
        else enterWorld(world);
      };
      return row;
    }),
  );
  universe?.setStick(0, 0);
  dialog.showModal();
}
function enterWorld(world) {
  if (leaving || !world) return;
  if (!world.href || !['open', 'complete'].includes(world.status)) {
    mapStatus(
      world.status === 'locked' ? '完成上一课后，就能解锁这里。' : '这个世界还在建设中。',
      2800,
    );
    return;
  }
  leaving = true;
  $('map').inert = true;
  $('warp-kicker').textContent =
    levels[currentLevel].label + ' · ' + world.lesson;
  $('warp-title').textContent = world.title;
  $('warp-detail').textContent = world.transition;
  const warp = $('warp');
  warp.style.setProperty(
    '--portal-color',
    '#' + levels[currentLevel].accent.toString(16),
  );
  warp.style.setProperty(
    '--destination',
    'url("' + linkAsset(world.art) + '")',
  );
  const navigate = () => location.assign(new URL(world.href, document.baseURI));
  if (motion.matches || !window.gsap) {
    navigate();
    return;
  }
  universe?.warp(world.number);
  const timeline = window.gsap.timeline({ onComplete: navigate });
  timeline.call(
    () => {
      warp.hidden = false;
    },
    [],
    0.23,
  );
  timeline.fromTo(
    warp,
    { opacity: 0 },
    { opacity: 1, duration: 0.31, ease: 'power2.out' },
    0.23,
  );
  timeline.fromTo(
    '.warp-rings i',
    { scale: 0.24, opacity: 0 },
    {
      scale: 1.44,
      opacity: 0.86,
      duration: 0.68,
      stagger: 0.06,
      ease: 'power2.out',
    },
    0.22,
  );
  timeline.fromTo(
    '#warp-copy',
    { y: 13, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.37, ease: 'power2.out' },
    0.56,
  );
  timeline.to('#warp-copy', { delay: 0.28, opacity: 0, duration: 0.2 });
}

$('back').onclick = backToLevels;
$('directory').onclick = openDirectory;
$('close-directory').onclick = () => dialog.close();
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyE' && currentLevel && !dialog.open && !event.repeat)
    enterWorld(nearby);
});
window.addEventListener('pageshow', (event) => {
  if (event.persisted && currentLevel) openLevel(currentLevel);
});
bindJoystick($('joystick'), (x, forward) => universe?.setStick(x, forward));
$('grades').addEventListener('click', (event) => {
  const grade = event.target.closest('a[data-level]');
  if (!grade || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  void openLevel(grade.dataset.level);
});
animateTitle();
const firstLevel = new URL(location.href).searchParams.get('level');
if (gradeKeys.includes(firstLevel)) openLevel(firstLevel);
