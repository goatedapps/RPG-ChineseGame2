import { markLessonComplete } from '../shared/lesson-progress.js';
import { findBridgeLamps, lightMoonbridge, matchWorkshopWords } from './minigames.js';
import { createWorld } from './world.js?v=cockpit-race';
import {
  opening,
  parts,
  tasks,
  objects,
} from './story.js?v=story-minigames';
import { words, bank } from './curriculum.js';
import { fieldwork, workshopWriting } from './fieldwork.js?v=story-minigames';
import { mei } from './radio-messages.js';
import { vocabularyList } from '../shared/vocabulary.js';
import { dictationButton, speakerButton } from '../shared/speaker.js?v=radio-briefings';
import { testPart } from './race.js?v=cockpit-race';
import { mountWriting, mountTest } from './assess.js?v=final-skip';
import { createGreenhouseAudio } from '../greenhouse/sounds.js?v=effect-recovery';
import { createVoice } from '../greenhouse/voice.js?v=speech-recovery';
import { createDeveloperMode } from '../shared/developer-mode.js?v=developer-menu';
import { showSkippedFinal } from '../shared/skipped-final.js';

import { playLessonComic } from '../shared/comic.js';
import { bindJoystick } from '../shared/joystick.js';
import { openGameSettings } from '../shared/settings.js?v=direct-entry';

const $ = (id) => document.getElementById(id);
const audio = createGreenhouseAudio({ radioAlerts: true, trialEffects: true, effectsGain: 1.65, musicGain: .8 });
const dialog = $('dialog');
const body = $('dialog-body');
const canvas = $('world');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const saveKey = 'rpg-chinese.p3.l1.moonbridge';
const ending = [
  {
    image: 'ending.webp',
    description: '两道灯光连成一座明亮的月桥。',
    caption: '桥灯亮了！我们一起做到了。',
  },
];
const initial = {
  version: 2,
  introSeen: false,
  workshop: { handbook: 0, shelf: 0 },
  minigames: [],
  fieldDone: [],
  fieldProgress: null,
  seenRadioMessages: [],
  acknowledgedBriefings: [],
  playedMeiClips: [],
  stage: 0,
  part: null,
  won: false,
  storyFinished: false,
  passed: false,
  discoveries: [],
  final: null,
  practice: null,
  music: true,
  effects: true,
};

function limitProgress(value, max) {
  return Number.isInteger(value) ? Math.max(0, Math.min(value, max)) : 0;
}

function readSave() {
  try {
    const value = JSON.parse(localStorage.getItem(saveKey));
    if (![1, 2].includes(value?.version)) return structuredClone(initial);
    const oldArchive = value.stage > 7 || value.fieldDone?.includes?.(7) ? 7
      : value.stage === 7 ? limitProgress(value.fieldProgress?.writing, 7) : 0;
    return {
      ...structuredClone(initial),
      introSeen: value.introSeen === true || value.stage > 0,
      minigames: [4, 7].filter((stage) => value.minigames?.includes?.(stage)),
      workshop: {
        handbook: limitProgress(value.workshop?.handbook ?? oldArchive - 3, 2),
        shelf: limitProgress(value.workshop?.shelf ?? oldArchive - 5, 2),
      },
      stage:
        Number.isInteger(value.stage) &&
        value.stage >= 0 &&
        value.stage <= tasks.length
          ? value.stage
          : 0,
      fieldDone: Object.keys(fieldwork).map(Number).filter((stage) =>
        stage < value.stage || value.fieldDone?.includes?.(stage) === true),
      fieldProgress: value.version === 2 && value.fieldProgress?.stage === value.stage &&
        fieldwork[value.stage] ? {
          stage: value.stage,
          question: limitProgress(value.fieldProgress.question, fieldwork[value.stage].questions.length),
          writing: limitProgress(value.fieldProgress.writing, fieldwork[value.stage].writing.length),
        } : null,
      part: Object.hasOwn(parts, value.part) ? value.part : null,
      won: value.won === true,
      storyFinished: value.storyFinished === true,
      passed: value.passed === true,
      seenRadioMessages: Array.isArray(value.seenRadioMessages)
        ? value.seenRadioMessages.filter((key) => typeof key === 'string')
        : [],
      acknowledgedBriefings: Array.isArray(value.acknowledgedBriefings)
        ? value.acknowledgedBriefings.filter((key) => typeof key === 'string')
        : (Array.isArray(value.seenRadioMessages)
            ? value.seenRadioMessages.filter((key) => typeof key === 'string' && key.endsWith(':guide'))
            : []),
      playedMeiClips: Array.isArray(value.playedMeiClips)
        ? value.playedMeiClips.filter((id) => typeof id === 'string')
        : [],
      discoveries: words
        .map(({ word }) => word)
        .filter(
          (word) =>
            Array.isArray(value.discoveries) &&
            value.discoveries.includes(word),
        ),
      final: value.final ?? null,
      practice: value.practice ?? null,
      music: value.music !== false,
      effects: value.effects !== false,
    };
  } catch {
    return structuredClone(initial);
  }
}
const save = readSave();
if (save.stage >= 9 && save.stage < 12 && !save.part) {
  save.stage = 8;
  save.fieldProgress = null;
}
function persist() {
  try {
    localStorage.setItem(saveKey, JSON.stringify(save));
  } catch {}
}
let mandarinPlaying = false;
let meiPlayback;
const voice = createVoice((status) => {
  mandarinPlaying = status === 'playing';
  if (mandarinPlaying) stopMeiClip();
  updateSpeechMix();
});
let view = 'home';
let world;
let radioBuzz;
let lastRadioAlert;
let lastTaskReadout;
let currentTarget = null;
let hintCount = 0;
let toastTimer;
let disposeWriting = () => {};
let disposeTest = () => {};
let lastFocused;
let driving = false;
let testing = false;
let practicePassed = false;
let practiceSpeed = 68;
let raceStarted = false;
let currentTestView = null;
let devSkipDictation = false;
let moveStart;
const stepSpacing = 1.25;
let footstepDistance = 0;

function play(name) {
  audio.cue(name);
}
function speaker(text, status) {
  voice.speak(text, 0.86, (state) => {
    if (state === 'unavailable' && status) {
      status.textContent = '这个设备暂时无法播放普通话。';
      status.hidden = false;
    }
  });
}

function readTask(replay = false) {
  if (view !== 'hud' || dialog.open ||
      (!driving && (briefingPending() || !objective()?.cue))) return;
  const instruction = $('control-hint').textContent;
  const taskKey = save.stage + ':' + $('objective').textContent + (driving ? '' : ':' + instruction);
  if (!replay && (taskKey === lastTaskReadout || navigator.userActivation?.hasBeenActive === false)) return;
  lastTaskReadout = taskKey;
  const status = $('voice-status');
  status.textContent = '';
  status.hidden = true;
  speaker(instruction, status);
}
function animate(element, y = 6) {
  if (!window.gsap || reducedMotion.matches) return;
  window.gsap.killTweensOf(element);
  window.gsap.fromTo(
    element,
    { opacity: 0.65, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.22,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
    },
  );
}
function make(tag, text, styles) {
  const el = document.createElement(tag);
  if (text) el.textContent = text;
  if (styles) el.className = styles;
  return el;
}
function button(text, handler, styles) {
  const el = make('button', text, styles);
  el.type = 'button';
  el.onclick = handler;
  return el;
}
function group(...buttons) {
  const el = make('div', '', 'buttons');
  el.append(...buttons);
  return el;
}
function addWords(list) {
  save.discoveries = [...new Set([...save.discoveries, ...list])];
  $('word-count').textContent = save.discoveries.length + ' / ' + words.length;
}
function showToast(text) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.hidden = false;
  animate(toast, 0);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}
function setAudio() {
  audio.setEnabled(save.effects);
  audio.setMusicEnabled(save.music);
}
setAudio();

function setView(next) {
  view = next;
  if (next !== 'hud') {
    stopMeiClip();
    voice.stop();
  }
  for (const id of ['home', 'comic', 'hud', 'assessment'])
    $(id).hidden = id !== next;
  canvas.hidden = next !== 'hud';
  if (next !== 'hud') world?.pause();
  else if (!dialog.open) world?.resume();
  audio.setMusic(
    next === 'home'
      ? 'title'
      : next === 'comic'
        ? 'comic'
        : next === 'hud'
          ? 'game'
          : null,
  );
}
function matchesTest(test) {
  return Array.isArray(test?.queue) && test.queue.length > 0;
}
function returnMap() {
  location.assign('./?level=p3');
}
function showEntryError() {
  setView('home');
  $('boot-status').textContent = '三维场景未能载入。请重试。';
  $('retry-entry').hidden = false;
}
function showComic(content, title, onFinish) {
  setView('comic');
  const closing = content === ending;
  const panels = content.map(({ image, description, caption }) => ({
    image: new URL('./art/' + image, import.meta.url).href,
    alt: description,
    caption,
  }));
  playLessonComic($('comic'), onFinish, {
    panels,
    titleText: title,
    lastLabel: closing
      ? save.passed
        ? '返回星图'
        : '开始课末测试'
      : '进入车站',
    ending: closing,
    onPage(page) {
      if (!closing && page === 1) audio.prepareGameplay();
      else if (!closing && page === 2) play('storm');
      else play('page');
    },
  });
}

let dismissInspection;

function showPanel(appearance, title, language = 'zh-Hans') {
  if (appearance !== 'radio') stopMeiClip();
  dismissInspection = undefined;
  dialog.dataset.appearance = appearance ?? 'panel';
  dialog.lang = language;
  $('dialog-close').hidden = ['artifact', 'fittings', 'radio', 'trial-controls', 'trial-result'].includes(appearance);
  $('dialog-close').setAttribute('aria-label', language === 'en' ? 'Close' : '关闭');
  disposeWriting();
  disposeWriting = () => {};
  voice.stop();
  if (!dialog.open) {
    lastFocused = document.activeElement;
    world?.pause();
    dialog.showModal();
  }
  $('dialog-title').textContent = title;
  body.replaceChildren();
  $('dialog-title').focus();
  animate(body);
}
function closePanel() {
  if (!dialog.open) return;
  stopMeiClip();
  dialog.close();
  if (view === 'hud') world?.resume();
}
$('dialog-close').onclick = closePanel;
dialog.addEventListener('cancel', stopMeiClip);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog || event.target === body) closePanel();
});
dialog.addEventListener('close', () => {
  const onDismiss = dismissInspection;
  dismissInspection = undefined;
  voice.stop();
  onDismiss?.();
  world?.releaseTrial();
  disposeWriting();
  disposeWriting = () => {};
  if (view === 'hud') world?.resume();
  if (lastFocused?.isConnected && !lastFocused.closest('[hidden]'))
    lastFocused.focus();
  readTask();
});

function pendingFieldwork() {
  return save.fieldDone.includes(save.stage) ? null : fieldwork[save.stage];
}

function objective() {
  const task = tasks[save.stage];
  const field = pendingFieldwork();
  if (!field?.cue) return task;
  return { title: field.title, cue: field.cue, item: field.item, guide: field.guide, hint: field.hint };
}

function briefingPending(task = objective()) {
  return Boolean(task?.guide) &&
    (save.stage === 3 || !save.acknowledgedBriefings.includes(radioMessageKey('guide')));
}

function syncRadio(notify = false) {
  const radio = $('radio');
  const unread = !radio.hidden && Boolean(objective()?.guide) &&
    !save.seenRadioMessages.includes(radioMessageKey('guide'));
  $('unread').hidden = !unread;
  radio.setAttribute('aria-label', unread
    ? 'Open Mei’s walkie-talkie, new message'
    : 'Open Mei’s walkie-talkie');
  radio.title = unread ? 'New message from Mei' : 'Walkie-talkie';
  if (!unread) radioBuzz?.cancel();
  const key = radioMessageKey('guide');
  if (!unread || !notify || key === lastRadioAlert) return;
  lastRadioAlert = key;
  play('radio');
  world?.releasePointer();
  if (reducedMotion.matches) return;
  radioBuzz?.cancel();
  radioBuzz = radio.animate([
    { transform: 'translateX(0) rotate(0)' },
    { transform: 'translateX(-4px) rotate(-5deg)' },
    { transform: 'translateX(4px) rotate(5deg)' },
    { transform: 'translateX(-3px) rotate(-3deg)' },
    { transform: 'translateX(0) rotate(0)' },
  ], { duration: 270, iterations: 2 });
  navigator.vibrate?.([45, 40, 45]);
}

function update(notifyRadio = false) {
  const task = objective();
  const waiting = briefingPending(task);
  $('objective').textContent = waiting ? '听听小梅怎么说' : (task?.title ?? '月桥重新亮了');
  const checking = Boolean(pendingFieldwork() && save.fieldProgress?.stage === save.stage);
  $('control-hint').textContent = waiting ? '打开对讲机，确认小梅的消息。'
    : checking ? '再次查看线索，继续理解检查与听写。'
      : (task?.cue ?? '');
  const missionNumber =
    save.stage < 4
      ? 1
      : save.stage < 7
        ? 2
        : save.stage < 10
          ? 3
          : save.stage < 12
            ? 4
            : 5;
  $('district').textContent = '任务 ' + missionNumber + ' / 5';
  $('voice-status').hidden = true;
  $('voice-status').textContent = '';
  const item =
    save.stage === 5 || save.stage === 12
      ? '火种'
      : save.stage === 9
        ? parts[save.part]?.name
        : '';
  $('held').textContent = item ? '手上 · ' + item : '';
  $('held').hidden = !item;
  $('radio').hidden = save.stage < 3;
  syncRadio(notifyRadio);
  $('word-count').textContent = save.discoveries.length + ' / ' + words.length;
  $('speak').disabled = waiting || !task?.cue;
  world?.setTargets(
    save.stage === 2
      ? ['radio']
      : task?.item && !waiting
        ? [task.item]
        : [],
  );
  world?.setWorldState({
    radioTaken: save.stage >= 3,
    cargo: save.stage >= 5,
    mounted: save.stage >= 6 && save.stage < 12,
    lit: save.stage >= tasks.length,
  });
  world?.point(null);
  if (!driving) {
    $('hud').classList.remove('is-driving');
    $('reticle').hidden = false;
    $('drive').hidden = true;
  }
  paintAction();
  readTask();
}
function go(stage) {
  save.stage = stage;
  save.fieldProgress = null;
  hintCount = 0;
  currentTarget = null;
  persist();
  update(true);
}
function paintAction() {
  const action = $('action');
  $('reticle').classList.toggle('targeted', Boolean(currentTarget) && !driving);
  if (driving) {
    action.disabled = true;
    return;
  }
  const stage = save.stage;
  if (stage === 1) {
    action.disabled = false;
    action.textContent = '转一下视角';
    return;
  }
  action.disabled = !currentTarget || briefingPending();
  action.textContent = currentTarget
    ? stage === 11 && currentTarget === 'cart'
      ? '上车出发'
      : objects[currentTarget]
    : '互动';
}
function worldEvent(event) {
  if (view !== 'hud' || dialog.open) return;
  if (event.mode === 'race') {
    const { race } = event;
    const routeName = race.route === 'rough' ? '颠簸近路' : '平坦长路';
    const label =
      !race.started ? '等待发车' : race.progress >= 1
        ? '到达终点'
        : race.progress >= race.rival
          ? '暂时领先'
          : '对手在前';
    $('speed').textContent = String(Math.round(race.speed));
    $('speedometer').style.setProperty('--speed', (Math.min(65, race.speed) / 65 * 270) + 'deg');
    $('place').textContent = label;
    $('race-progress').value = race.progress;
    $('race-hint').textContent =
      race.locked ? '已进入' + routeName : '分岔前可选路线';
    $('left-route').disabled = race.locked;
    $('right-route').disabled = race.locked;
    $('left-route').setAttribute(
      'aria-pressed',
      String(race.route === 'rough'),
    );
    $('right-route').setAttribute(
      'aria-pressed',
      String(race.route === 'smooth'),
    );
    return;
  }
  footstepDistance += event.distance ?? 0;
  if (footstepDistance >= stepSpacing) {
    footstepDistance %= stepSpacing;
    play('step');
  }
  if (save.stage === 0 && event.moving) {
    moveStart ??= performance.now();
    if (performance.now() - moveStart > 620) go(1);
  }
  if (save.stage === 1 && event.look) go(2);
  if (Object.hasOwn(event, 'target') && currentTarget !== event.target) {
    currentTarget = event.target;
    paintAction();
  }
}
function endRace(first) {
  driving = false;
  save.won = first;
  go(12);
  play('finish');
  showToast(
    first ? '第一名！把火种送到高灯旁。' : '你到达了终点！把火种送到高灯旁。',
  );
}
function startWorld() {
  closePanel();
  try {
    world ??= createWorld(canvas, worldEvent, endRace, action);
  } catch {
    showEntryError();
    return;
  }
  world.reset(save.stage >= 12);
  lastTaskReadout = undefined;
  if (!save.introSeen) {
    save.introSeen = true;
    persist();
  }
  driving = false;
  practicePassed = false;
  practiceSpeed = 68;
  moveStart = null;
  footstepDistance = 0;
  setView('hud');
  update(true);
  world.focus(!briefingPending());
  audio.prepareGameplay();
}
function restartMission() {
  disposeTest();
  disposeTest = () => {};
  currentTestView = null;
  closePanel();
  lastRadioAlert = undefined;
  Object.assign(save, structuredClone(initial), {
    passed: save.passed,
    discoveries: save.passed ? save.discoveries : [],
    practice: save.practice,
    music: save.music,
    effects: save.effects,
  });
  persist();
  showComic(opening, '序幕', startWorld);
}
function confirmRestart() {
  showPanel(null, '要重玩任务吗？');
  const confirmation = make('div', '', 'restart-confirmation');
  const message = make('p', '这次的任务和课末测试进度将清除。你将从序幕重新开始。');
  message.id = 'restart-message';
  const cancel = button('保留进度', closePanel);
  confirmation.append(
    message,
    group(cancel, button('确认重玩', restartMission, 'gold')),
  );
  body.append(confirmation);
  dialog.setAttribute('aria-describedby', message.id);
  dialog.addEventListener('close', () => dialog.removeAttribute('aria-describedby'), { once: true });
  cancel.focus();
}
function enterLesson() {
  if (save.storyFinished && !save.passed) openTest('final');
  else if (save.introSeen) startWorld();
  else showComic(opening, '序幕', startWorld);
}
$('retry-entry').onclick = startWorld;
$('speak').onclick = () => readTask(true);
const inputEvents = ['pointerup', 'keydown', 'click'];
function readOnFirstInput(input) {
  if (!input.isTrusted || navigator.userActivation?.hasBeenActive === false) return;
  for (const event of inputEvents) document.removeEventListener(event, readOnFirstInput);
  if (!input.target.closest?.('#speak')) readTask();
}
for (const event of inputEvents) document.addEventListener(event, readOnFirstInput, { passive: true });

function radioMessageKey(kind) {
  // The first radio exchange belongs to the lookout task.
  if (save.stage === 3) return '4:field:' + kind;
  const variant = pendingFieldwork()?.cue ? 'field' : 'task';
  return save.stage + ':' + variant + ':' + kind;
}

function updateSpeechMix() {
  audio.setDucked(mandarinPlaying || Boolean(meiPlayback?.playing));
}

function stopMeiClip() {
  if (!meiPlayback) return;
  const { clip } = meiPlayback;
  meiPlayback = undefined;
  clip.pause();
  updateSpeechMix();
}

function playMeiClip(id) {
  if (save.playedMeiClips.includes(id) || meiPlayback?.id === id) return;
  stopMeiClip();
  const clip = new Audio(new URL('./audio/mei/' + id + '.mp3', import.meta.url).href);
  const playback = { id, clip, playing: false };
  meiPlayback = playback;
  clip.addEventListener('playing', () => {
    if (meiPlayback !== playback) return;
    playback.playing = true;
    save.playedMeiClips.push(id);
    persist();
    updateSpeechMix();
  }, { once: true });
  const finish = () => {
    if (meiPlayback === playback) {
      meiPlayback = undefined;
      updateSpeechMix();
    }
  };
  clip.addEventListener('ended', finish, { once: true });
  clip.addEventListener('error', finish, { once: true });
  void clip.play().catch(finish);
}

function radioMessage({ id, text }, kind, onDisplayed) {
  playMeiClip(id);
  const message = make('p', text, 'helper-message');
  message.lang = 'en';
  const key = radioMessageKey(kind);
  const seen = save.seenRadioMessages.includes(key);
  function markRead() {
    if (!seen) {
      save.seenRadioMessages.push(key);
      persist();
    }
    onDisplayed?.();
  }
  if (seen || reducedMotion.matches) {
    markRead();
    return message;
  }

  // Reserve the final text layout and expose the complete message to screen readers.
  const full = make('span', text, 'helper-transcript');
  const typed = make('span', '', 'helper-typing');
  typed.setAttribute('aria-hidden', 'true');
  message.replaceChildren(full, typed);

  const characters = Array.from(text);
  const duration = Math.min(characters.length * 15, 2200);
  const start = performance.now();
  function type(now) {
    const count = Math.floor((now - start) / duration * characters.length);
    if (!message.isConnected || !dialog.open) return;
    if (count >= characters.length || reducedMotion.matches) {
      message.textContent = text;
      markRead();
      return;
    }
    typed.textContent = characters.slice(0, count).join('');
    requestAnimationFrame(type);
  }
  requestAnimationFrame(type);
  return message;
}

function openRadio() {
  if (save.stage < 3 || driving || testing) return;
  const stage = save.stage;
  const task = objective();
  const guide = task?.guide;
  if (!guide) return;
  showPanel('radio', 'Mei’s Walkie-Talkie', 'en');
  const scene = make('div', '', 'radio-closeup');
  const device = fieldImage('radio-closeup', 'radio-closeup-device');
  device.alt = '';
  const transmission = make('div', '', 'radio-transmission');
  const wave = make('span', '', 'radio-airwaves');
  wave.setAttribute('aria-hidden', 'true');
  wave.append(make('i'), make('i'), make('i'));
  const places = {
    spark: mei.sparkHint,
    cart: mei.cartHint,
    lever: mei.leverHint,
    handbook: mei.handbookHint,
    shelf: mei.fittingsHint,
    beacon: mei.beaconHint,
  };
  const hintTask = stage === 3 ? fieldwork[4] : task;
  const hint = hintTask.hint ?? places[hintTask.item] ?? guide;
  const pending = briefingPending(task);
  const key = radioMessageKey('guide');
  let showLocation = false;
  const art = make('span', '', 'radio-face-art');
  art.append(device);
  const prompt = make('span', 'Get a hint', 'radio-hint-label');
  const help = button('', () => {
    if (hintCount === 0) {
      hintCount = 1;
      showHint();
    } else {
      showLocation = true;
      closePanel();
    }
  }, 'radio-hint');
  help.disabled = true;
  help.append(art, prompt);
  scene.append(help, transmission);
  transmission.append(wave);
  body.append(scene);

  const message = radioMessage(guide, 'guide', () => {
    help.disabled = false;
    syncRadio();
  });
  transmission.append(message);
  function showHint() {
    message.after(radioMessage(hint, 'hint'));
    prompt.textContent = 'Show location';
  }
  if (hintCount > 0) showHint();

  dismissInspection = () => {
    if (pending && !help.disabled) {
      if (!save.acknowledgedBriefings.includes(key)) save.acknowledgedBriefings.push(key);
      if (stage === 3) {
        const usedHint = hintCount;
        go(4);
        hintCount = usedHint;
      } else {
        persist();
        update();
      }
    }
    if (showLocation) world.point(hintTask.item);
  };
}
$('radio').onclick = openRadio;

function objectHotspot(label, className, activate) {
  const control = button('', activate, 'object-hotspot ' + className);
  control.setAttribute('aria-label', label);
  control.title = label;
  return control;
}

function handbook() {
  if (save.workshop.handbook === 1) {
    writeWorkshop('handbook', finishHandbook);
    return;
  }
  showPanel('artifact', '司机手册');
  play('paper');
  let page = 0;
  let readThird = false;
  const title = make('p', '', 'artifact-heading');
  const description = make('p', '', 'artifact-ink');
  const pageNumber = make('p', '', 'artifact-page-number');
  const sheet = artifactPage('ledger-paper', title, description, pageNumber);
  sheet.setAttribute('aria-live', 'polite');
  const previous = objectHotspot('上一页', 'page-left', () => turn(-1));
  const next = objectHotspot('下一页', 'page-right', () => turn(1));
  sheet.append(previous, next);
  sheet.onkeydown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    turn(event.key === 'ArrowLeft' ? -1 : 1);
  };
  sheet.tabIndex = 0;

  function turn(direction) {
    const target = page + direction;
    if (target < 0 || target > 2) return;
    page = target;
    render();
    play('paper');
  }

  function render() {
    title.textContent = [
      '好司机先练习', '检查车铃与车灯', '火种架和车扣',
    ][page];
    description.textContent = [
      '老师傅讲了一件事：希望将来当司机，就要先学会检查灯车。',
      '轻敲车铃，再看看灯是否亮了。',
      '稳轮夹适合颠簸的近路。快轮扣适合平坦的长路。' + workshopWriting.handbook.line,
    ][page];
    pageNumber.textContent = (page + 1) + ' / 3';
    previous.disabled = page === 0;
    next.disabled = page === 2;
    readThird ||= page === 2;
    sheet.focus({ preventScroll: true });
  }

  body.append(sheet);
  render();
  dismissInspection = () => {
    if (readThird && save.stage === 7) queueMicrotask(() => writeWorkshop('handbook', finishHandbook));
  };
}

function finishHandbook() {
  go(8);
  closePanel();
}

function writeWorkshop(location, complete) {
  const { title, line, words: targets } = workshopWriting[location];
  const index = save.workshop[location];
  if (index >= targets.length || devSkipDictation) {
    complete();
    return;
  }
  const term = words.find(({ word }) => word === targets[index]);
  showDictation(term, title + ' · 听写 ' + (index + 1) + ' / ' + targets.length, () => {
    save.workshop[location]++;
    persist();
    writeWorkshop(location, complete);
  }, undefined, line);
}

function choosePart() {
  showPanel('fittings', '挑选车扣');
  const shelf = make('figure', '', 'fitting-shelf');
  const image = fieldImage('workshop', 'fitting-image');
  image.alt = '工作台上摆着两个车扣。';
  const caption = make('figcaption', '', 'fitting-notes');
  shelf.append(image);
  for (const [id, part] of Object.entries(parts)) {
    const label = part.name + '。' + part.line;
    shelf.append(objectHotspot(label, 'fitting-' + id, () => {
      play('pickup');
      writeWorkshop('shelf', () => {
        save.part = id;
        go(9);
        closePanel();
      });
    }));
    caption.append(make('span', id === 'stabilizer' ? '稳轮夹 · 颠簸近路' : '快轮扣 · 平坦长路'));
  }
  shelf.append(caption);
  body.append(shelf, make('p', workshopWriting.shelf.line, 'fitting-notes fitting-clue'));
}
function runTrial(success, power, onResult) {
  if (testing) return;
  testing = true;
  closePanel();
  $('hud').classList.add('trial-playing');
  world.startTrial({
    success,
    power: power / 100,
    play,
    complete() {
      testing = false;
      $('hud').classList.remove('trial-playing');
      onResult();
    },
  });
}

function firstRun() {
  runTrial(false, 68, () => showTrialNote(
    '第一次试跑',
    '灯车一颠，火种就弹出了架子，砰的一声落在木板上。',
    '轻触记录或放下记录，继续任务。',
    closePanel,
    () => go(7),
  ));
}

function showTrialNote(title, result, instruction, onTap, onDismiss) {
  showPanel('trial-result', title);
  const sheet = artifactPage('repair-paper',
    make('h2', title, 'artifact-heading'),
    make('p', result, 'artifact-ink'),
    make('p', instruction, 'trial-note-instruction'),
  );
  sheet.append(objectHotspot(instruction, 'trial-note-hotspot', onTap));
  body.append(sheet);
  dismissInspection = onDismiss;
}

function speedDial() {
  const dial = make('div', '', 'trial-dial');
  dial.tabIndex = 0;
  dial.setAttribute('role', 'slider');
  dial.setAttribute('aria-label', '试跑速度');
  dial.setAttribute('aria-valuemin', '0');
  dial.setAttribute('aria-valuemax', '100');
  dial.append(fieldImage('trial-speed-knob', 'trial-dial-knob'));
  const readout = make('output', '', 'trial-speed');
  readout.setAttribute('aria-hidden', 'true');
  const limits = make('div', '', 'trial-scale');
  limits.setAttribute('aria-hidden', 'true');
  for (const value of ['0', '50', '100']) limits.append(make('span', value));
  const control = make('div', '', 'trial-speed-control');
  control.append(limits, dial, readout);
  const sweep = 270;
  let drag;

  function setSpeed(value) {
    practiceSpeed = Math.round(Math.min(100, Math.max(0, value)));
    readout.textContent = '速度 ' + practiceSpeed;
    dial.setAttribute('aria-valuenow', practiceSpeed);
    dial.style.setProperty('--knob-angle', (practiceSpeed / 100 - .5) * sweep + 'deg');
  }
  function pointerAngle(event) {
    const box = dial.getBoundingClientRect();
    return Math.atan2(event.clientX - box.left - box.width / 2,
      box.top + box.height / 2 - event.clientY) * 180 / Math.PI;
  }
  dial.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    const angle = pointerAngle(event);
    drag = { id: event.pointerId, angle, speed: practiceSpeed };
    dial.focus({ preventScroll: true });
    dial.setPointerCapture(event.pointerId);
  });
  dial.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const angle = pointerAngle(event);
    const turn = ((angle - drag.angle + 540) % 360) - 180;
    drag.angle = angle;
    drag.speed = Math.min(100, Math.max(0, drag.speed + turn * 100 / sweep));
    setSpeed(drag.speed);
  });
  dial.addEventListener('pointerup', (event) => {
    if (drag?.id === event.pointerId) drag = undefined;
  });
  dial.addEventListener('lostpointercapture', () => { drag = undefined; });
  dial.addEventListener('keydown', (event) => {
    const changes = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10, Home: -100, End: 100 };
    if (!Object.hasOwn(changes, event.key)) return;
    event.preventDefault();
    setSpeed(practiceSpeed + changes[event.key]);
  });
  setSpeed(practiceSpeed);
  return control;
}

function practiceRun() {
  if (testing) return;
  if (practicePassed || save.fieldProgress?.stage === 10) {
    openFieldwork();
    return;
  }
  showPanel('trial-controls', '试跑台');
  const part = parts[save.part];
  const note = make(
    'p',
    part.name + '已装好。转动旋钮调速，再操作红色试跑杆。',
    'trial-station-note',
  );
  const launch = button('拉下试跑杆', () => {
    if (testing) return;
    const ok = testPart(save, practiceSpeed / 100);
    runTrial(ok, practiceSpeed, () => {
      practicePassed = ok;
      showTrialNote('试跑结果', ok
        ? '灯车颠了一下，火种还是稳稳地留在架子上！'
        : '灯车一颠，火种就掉了出来。把速度调到中间，再试一次。',
      ok ? '轻触这页，翻看试跑记录。' : '轻触这页，回到试跑台。', () => {
        world.releaseTrial();
        practiceRun();
      });
    });
  }, 'trial-lever');
  launch.prepend(fieldImage('test-lever-v2', 'trial-lever-art'));
  let pull;
  launch.onpointerdown = (event) => {
    if (event.button !== 0 || pull) return;
    pull = { id: event.pointerId, y: event.clientY };
    launch.setPointerCapture(event.pointerId);
  };
  launch.onpointerup = (event) => {
    if (pull?.id === event.pointerId && event.clientY - pull.y >= 14) launch.click();
  };
  launch.onlostpointercapture = () => { pull = undefined; };
  const controls = make('div', '', 'trial-station-controls');
  controls.append(speedDial(), launch);
  const station = make('section', '', 'trial-station');
  station.append(controls, note);
  body.append(station);
}

function pronounce(label, text, status) {
  return speakerButton(() => speaker(text, status), label);
}

function fieldImage(name, className = 'field-image') {
  const image = make('img', '', className);
  image.src = new URL('./art/' + name + '.webp', import.meta.url).href;
  image.alt = '';
  return image;
}

function artifactPage(paper, ...content) {
  const page = make('article', '', 'artifact-page');
  page.style.setProperty('--artifact', 'url("' + new URL('./art/' + paper + '.webp', import.meta.url).href + '")');
  page.append(...content);
  return page;
}

function fieldArtifact(field) {
  const vocabulary = [...field.words].sort((a, b) => b.length - a.length);
  const terms = new RegExp('(' + vocabulary.join('|') + ')', 'g');
  const heading = make('p', field.heading, 'artifact-heading');
  const lines = field.clue.split('\n\n').map((paragraph) => {
    const line = make('p', '', 'artifact-ink');
    paragraph.split(terms).forEach((part, index) => {
      line.append(index % 2 ? make('mark', part) : document.createTextNode(part));
    });
    return line;
  });
  if (field.signature) lines.push(make('p', field.signature, 'artifact-signature'));
  return artifactPage(field.paper, heading, ...lines);
}

function playCloseup(build, complete) {
  const game = build(play, complete);
  showPanel('artifact', game.heading.textContent);
  body.append(game.root);
  game.focusTarget.focus({ preventScroll: true });
}

function openFieldwork() {
  const field = pendingFieldwork();
  if (!field) return;
  if (save.fieldProgress?.stage === save.stage) {
    fieldCheck(field);
    return;
  }
  const minigame = { 4: findBridgeLamps, 7: matchWorkshopWords }[save.stage];
  if (minigame && !save.minigames.includes(save.stage)) {
    const stage = save.stage;
    playCloseup(minigame, (stillOpen) => {
      save.minigames.push(stage);
      persist();
      if (stillOpen) openFieldwork();
    });
    return;
  }
  showPanel('artifact', field.title);
  play('paper');
  addWords(field.words);
  persist();
  body.append(fieldArtifact(field));
  dismissInspection = () => {
    save.fieldProgress = { stage: save.stage, question: 0, writing: 0 };
    persist();
    update();
  };
}

function fieldCheck(field) {
  const progress = save.fieldProgress;
  const item = field.questions[progress.question];
  if (!item) {
    fieldDictation(field);
    return;
  }
  showPanel(null, '理解检查');
  const clue = fieldArtifact(field);
  clue.hidden = true;
  const reviewClue = button('回看线索', () => {
    clue.hidden = !clue.hidden;
    reviewClue.setAttribute('aria-expanded', String(!clue.hidden));
  });
  reviewClue.setAttribute('aria-expanded', 'false');
  const status = make('p', '', 'dialog-note');
  status.setAttribute('role', 'status');
  const options = make('div', '', 'options');
  const prompt = item.prompt.replaceAll('__', '');
  for (const choice of item.choices) {
    const control = button(choice.replaceAll('__', ''), () => {
      options.querySelector('.wrong')?.classList.remove('wrong');
      if (choice !== item.correct) {
        control.classList.add('wrong');
        status.textContent = '再回看线索，试试另一个答案。';
        play('wrong');
        return;
      }
      for (const option of options.children) option.disabled = true;
      control.classList.add('correct');
      status.textContent = item.feedback ?? '答对了。';
      play('correct');
      progress.question++;
      persist();
      const next = button(progress.question === field.questions.length ? '开始听写' : '下一题',
        () => fieldCheck(field), 'gold');
      body.append(group(next));
      next.focus();
    });
    options.append(control);
  }
  body.append(
    make('p', field.title + ' · ' + (progress.question + 1) + ' / ' + field.questions.length, 'tag'),
    make('p', prompt, 'dialog-copy'),
    group(pronounce('重听题目', prompt), reviewClue),
    clue, options, status,
  );
}

function fieldDictation(field) {
  const progress = save.fieldProgress;
  const target = field.writing[progress.writing];
  if (!target || devSkipDictation) {
    finishFieldwork(field);
    return;
  }
  const term = words.find(({ word }) => word === target);
  const sentence = field.clue.match(/[^。！？]+[。！？]?/g)
    ?.find((line) => line.includes(target))?.trim();
  showDictation(term, '听写 · ' + (progress.writing + 1) + ' / ' + field.writing.length, () => {
    progress.writing++;
    persist();
    fieldDictation(field);
  }, undefined, sentence);
}

function showDictation(term, title, onComplete, onBack, text = term.sentences[0]) {
  showPanel(null, title);
  const sentence = make('p', text.replaceAll(term.word, '＿'.repeat([...term.word].length)), 'sentence');
  const status = make('p', '', 'note');
  const writing = make('div', '', 'field-writing');
  const audioLine = text + ' 要写的是：' + term.word + '。';
  const playback = dictationButton(voice, audioLine, (state) => {
    status.textContent = state === 'unavailable' ? '这个设备暂时无法播放普通话。' : '';
  });
  body.append(sentence, group(playback,
    button('看字', () => { sentence.textContent = text; })), writing, status);
  if (onBack) body.append(group(button('返回词语手册', onBack)));
  disposeWriting = mountWriting(writing, term.word, {
    hints: 5,
    onComplete: () => {
      play('correct');
      onComplete();
    },
  });
}

function finishFieldwork(field) {
  const stage = save.stage;
  save.fieldDone.push(stage);
  save.fieldProgress = null;
  persist();
  if (stage === 10) go(11);
  else {
    hintCount = 0;
    update(true);
  }
  closePanel();
  showToast(briefingPending() ? '记录已完成。' : field.done);
}
function enterRace() {
  if (driving || save.stage !== 11) return;
  driving = true;
  raceStarted = false;
  $('hud').classList.add('is-driving');
  $('reticle').hidden = true;
  $('drive').hidden = false;
  $('district').textContent = '任务 4 / 5 · 月桥';
  $('objective').textContent = '把火种送过桥';
  $('control-hint').textContent =
    '举手发车，再连点踏板加速。';
  $('action').disabled = true;
  closePanel();
  world.startRace(save.part);
  $('accelerator').textContent = '举手发车';
  $('accelerator').focus({ preventScroll: true });
  play('relay');
  readTask();
}

function accelerateRace() {
  if (!driving || dialog.open) return;
  if (!raceStarted) {
    raceStarted = true;
    $('accelerator').textContent = '连点加速';
    $('control-hint').textContent = '连点踏板或空格键加速。';
    const hand = $('race-hand');
    if (!reducedMotion.matches) {
      hand.animate([
        { opacity: 0, transform: 'translateY(75%) rotate(9deg)' },
        { opacity: 1, transform: 'translateY(0) rotate(0)', offset: .45 },
        { opacity: 0, transform: 'translateY(75%) rotate(9deg)' },
      ], { duration: 630 });
    }
    play('wheels');
  }
  world.tapAccelerator();
}
function endStory() {
  play('finish');
  go(tasks.length);
  save.storyFinished = true;
  persist();
  showComic(ending, '尾声', () => {
    if (save.passed) returnMap();
    else openTest('final');
  });
}
function action() {
  if (view !== 'hud' || dialog.open || driving || testing || briefingPending()) return;
  if (save.stage === 1) {
    world.lookNudge();
    return;
  }
  const target = world.currentTarget();
  if (!target || target !== objective()?.item) return;
  if (target === pendingFieldwork()?.item && save.stage !== 10) {
    openFieldwork();
    return;
  }
  switch (save.stage) {
    case 2:
      play('pickup');
      go(3);
      showToast('拿到了对讲机。');
      break;
    case 4:
      play('pickup');
      go(5);
      showToast('拿到了火种。');
      break;
    case 5:
      play('seal');
      go(6);
      showToast('火种放进了架子。');
      break;
    case 6:
      firstRun();
      break;
    case 7:
      handbook();
      break;
    case 8:
      choosePart();
      break;
    case 9:
      play('seal');
      go(10);
      showToast(parts[save.part].name + '装好了。');
      break;
    case 10:
      practiceRun();
      break;
    case 11:
      enterRace();
      break;
    case 12:
      playCloseup(lightMoonbridge, () => {
        closePanel();
        endStory();
      });
      break;
  }
}
$('action').onclick = action;
$('accelerator').onclick = accelerateRace;
window.addEventListener('keydown', (event) => {
  if (driving && !dialog.open && event.code === 'Space' && !event.target.closest?.('button')) {
    event.preventDefault();
    if (!event.repeat) accelerateRace();
    return;
  }
  if (event.repeat || view !== 'hud' || dialog.open) return;
  if (event.code === 'KeyE') action();
  if (event.code === 'KeyF') openRadio();
  if (driving && event.code === 'ArrowLeft') world.chooseRoute('rough');
  if (driving && event.code === 'ArrowRight') world.chooseRoute('smooth');
});
bindJoystick($('joystick'), (x, forward) => world?.setStick(x, -forward));
$('left-route').onclick = () => world.chooseRoute('rough');
$('right-route').onclick = () => world.chooseRoute('smooth');

function notebook() {
  showPanel(null, '词语手册');
  const known = new Set(save.discoveries);
  const status = make('p', '', 'note');
  const { list } = vocabularyList(words, known, (term) => {
    const review = button('写', () => showDictation(term, '词语复习', () => {
      notebook();
      showToast('写好了！');
    }, notebook), 'icon-button');
    review.setAttribute('aria-label', '复习' + term.word + '的听写');
    return {
      pinyin: term.pinyin,
      meaning: term.meaning,
      sentence: term.sentences[0],
      controls: [pronounce('听' + term.word + '的发音', term.word, status), review],
    };
  });
  body.append(
    make('p', '已发现 ' + known.size + ' / ' + words.length + ' 个词语。'),
    group(button('练习题库', () => showBank(), 'gold')),
    status,
    list,
  );
}
$('book').onclick = notebook;

function showBank(index = 0) {
  const q = bank[index];
  showPanel(null, '题库练习');
  body.append(
    make('p', '第 ' + (index + 1) + ' 题，共 ' + bank.length + ' 题', 'tag'),
    make('p', q.prompt, 'dialog-copy'),
  );
  const options = make('div', '', 'options');
  const status = make('p', '', 'dialog-note');
  status.setAttribute('role', 'status');
  for (const answer of q.choices) {
    options.append(
      button(answer, () => {
        options
          .querySelectorAll('button')
          .forEach((node) =>
            node.setAttribute(
              'aria-pressed',
              String(node.textContent === answer),
            ),
          );
        const correct = answer === q.correct;
        status.textContent = correct ? '答对了。' : '再读一读，试另一个答案。';
        play(correct ? 'correct' : 'wrong');
      }),
    );
  }
  body.append(
    options,
    status,
    group(button('下一题', () => showBank((index + 1) % bank.length), 'gold')),
  );
}
function openTest(mode, skip = devSkipDictation) {
  disposeTest();
  disposeTest = () => {};
  closePanel();
  setView('assessment');
  currentTestView = mode;
  if (mode === 'final' && skip) {
    showSkippedFinal($('assessment-body'), {
      cardClass: 'assessment-card', headingId: 'assessment-title', onExit: returnMap,
      onResume: () => openTest(mode, false),
    });
    return;
  }
  const key = mode === 'final' ? 'final' : 'practice';
  disposeTest = mountTest($('assessment-body'), {
    mode,
    saved: save[key],
    speak: voice.speak,
    stopSpeech: voice.stop,
    cue: play,
    onProgress: (state) => {
      save[key] = state;
      persist();
    },
    onPass: () => {
      if (currentTestView === 'final') {
        save.passed = true;
        markLessonComplete('p3', 1);
      } else save.practice = null;
      persist();
      play('finish');
    },
    onExit: returnMap,
    onReplay: mode === 'final' ? confirmRestart : undefined,
    onDeveloper: mode === 'final' ? developer.open : undefined,
  });
}
function settings() {
  audio.start();
  function preference(key) {
    return {
      get: () => save[key],
      set(enabled) {
        save[key] = enabled;
        setAudio();
        persist();
      },
    };
  }
  openGameSettings({
    panel: body,
    openPanel: showPanel,
    effects: preference('effects'),
    music: preference('music'),
    onHome: returnMap,
    lessonActions: [
      { label: '重玩任务', run: save.passed ? restartMission : confirmRestart },
      ...(save.passed ? [
        { label: matchesTest(save.practice) ? '继续词语练习' : '词语练习', run: () => openTest('practice') },
        { label: '题库练习', run: () => showBank() },
      ] : []),
    ],
  });
}
document.querySelectorAll('[data-settings]').forEach((control) => {
  control.onclick = settings;
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest('button');
  if (!control || control.matches('.comic-hit,#action,#accelerator,.options button')) return;
  play('ui');
});

const developer = createDeveloperMode({
  panel: body,
  openPanel: showPanel,
  canSkip: () => view === 'hud' && !driving && save.stage < tasks.length,
  getSkipLabel: () => '跳过当前任务',
  onSkip: () => {
    const field = pendingFieldwork();
    if (field) {
      addWords(field.words);
      finishFieldwork(field);
      return;
    }
    if (save.stage === 8) save.part = 'stabilizer';
    if (save.stage === 11) {
      world.reset(true);
      go(12);
      closePanel();
      return;
    }
    if (save.stage === 12) {
      closePanel();
      endStory();
      return;
    }
    go(save.stage + 1);
    closePanel();
  },
  onSkipDictation: (value) => {
    devSkipDictation = value;
    if (value && currentTestView === 'final') openTest('final');
  },
});
$('developer').onclick = () => {
  if (!driving && !testing) developer.open();
};
for (const panel of [...opening, ...ending].slice(1)) {
  const image = new Image();
  image.src = new URL('./art/' + panel.image, import.meta.url).href;
}
enterLesson();
