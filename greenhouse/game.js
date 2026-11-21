import { missions, objects, tutorial } from './story.js';
import { lexicon, practiceBank } from './lexicon.js';
import { createVoice } from './voice.js';
import { createWriting } from './writing.js';
import { createGreenhouseAudio } from './sounds.js';
import { playComic } from './comic.js';
import { evidence } from './evidence.js';
import { createPhone } from './phone.js';
import { createDeveloperMode } from '../shared/developer-mode.js';
import { bindJoystick } from '../shared/joystick.js';
import { openGameSettings } from '../shared/settings.js';
import { animatePhonePickup } from './phone-pickup.js';
import { phoneStory, noteReply, screenChecks, closingMessages, fieldHints, statusReplies } from './phone-story.js';
import { loadLessonTest, restoreLessonTest } from './lesson-test.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#scene');
const desk = $('#workbench');
const panel = $('#panel');
const testScreen = $('#lesson-test');
const reticle = $('#reticle');
const interact = $('#interact');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createGreenhouseAudio();
const entries = missions.flatMap((mission) => mission.dictation);
const lessonWords = new Set(entries.map(({ word }) => word));
const storageKey = 'greenhouse-p6-lesson1-v1';
const musicKey = 'greenhouse-background-music';
const actions = { inspect: '查看', pickup: '拿起', use: '使用', place: '摆放' };
const hintDelay = 30000;
const actionWords = [
  [['每逢', '暴雨', '恶劣', '缝'], [], []],
  [['耀眼'], ['鲜艳'], ['严格', '托']],
  [['产生'], ['柔弱'], ['埋'], ['扎根']],
  [['梦'], ['锻炼'], ['测验', '临时抱佛脚'], []],
  [['优雅', '懒惰', '榜样'], [], ['凭']],
  [['克服'], ['坚强', '意志', '不屈不挠']],
];

function emptySave() {
  return {
    tutorialDone: false, mission: 0, action: 0, phase: 'explore', wordIndex: 0, held: null, written: {},
    phonePicked: false, notePending: false, noteAnswer: '', unlocked: [], endingSeen: false,
    lessonComplete: false, finalStarted: false, finalPassed: false, finalTest: null, practiceTest: null,
  };
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey));
    if (!data || !Number.isInteger(data.mission) || data.mission < 0 || data.mission > missions.length) return emptySave();
    const mission = missions[data.mission];
    const action = Number.isInteger(data.action) ? Math.max(0, Math.min(data.action, mission?.actions.length ?? 0)) : 0;
    let phase = data.phase;
    if (!mission) phase = 'done';
    else if (action < mission.actions.length) phase = 'explore';
    else if (!['question', 'dictation', 'handover'].includes(phase)) phase = 'question';
    let wordIndex = Number.isInteger(data.wordIndex) ? Math.max(0, Math.min(data.wordIndex, mission?.dictation.length ?? 0)) : 0;
    if (phase === 'dictation' && wordIndex === mission.dictation.length) phase = 'handover';
    if (phase === 'explore' || phase === 'question') wordIndex = 0;
    const written = Object.fromEntries(Object.entries(data.written ?? {}).filter(([word, mode]) =>
      lessonWords.has(word) && ['guided', 'independent'].includes(mode)));
    const unlocked = Array.isArray(data.unlocked)
      ? data.unlocked
      : [...missions.slice(0, data.mission).flatMap((item) => item.actions), ...(mission?.actions.slice(0, action) ?? [])]
        .map(({ target }) => target);
    const tutorialDone = data.tutorialDone === true || phase !== 'explore' || data.mission > 0 || action > 0;
    const endingSeen = phase === 'done' && data.endingSeen === true;
    const finalStarted = endingSeen && data.finalStarted === true;
    const lessonComplete = data.lessonComplete === true;
    return {
      tutorialDone, phonePicked: tutorialDone || data.phonePicked === true,
      mission: data.mission, action, phase, wordIndex, written,
      held: Object.hasOwn(objects, data.held) ? data.held : null,
      notePending: data.notePending === true && data.mission === 0 && action === 1 && phase === 'explore',
      noteAnswer: typeof data.noteAnswer === 'string' ? data.noteAnswer.slice(0, 180) : '',
      unlocked: unlocked.filter((id) => Object.hasOwn(screenChecks, id)),
      endingSeen, lessonComplete, finalStarted,
      finalPassed: finalStarted && lessonComplete && data.finalPassed === true,
      finalTest: finalStarted ? data.finalTest ?? null : null,
      practiceTest: lessonComplete ? data.practiceTest ?? null : null,
    };
  } catch {
    return emptySave();
  }
}

let state = load();
let engine;
let roomRequest;
let started = false;
let unavailable = false;
let tutorialIndex = state.phonePicked ? 3 : 0;
let pickingPhone = false;
let walked = 0;
let turned = 0;
let footstepDistance = 0;
let effectsEnabled = true;
let musicEnabled = storedMusic();
let audioStarted = false;
let currentTarget = null;
let cue = { cn: '', en: '' };
let hintTimer;
let activeHintKey;
let hintTarget;
let announceAfterPhone = false;
let finalMessageOpen = false;
let activeTest = null;
let cleanup = () => {};
let afterClose = null;
let last = null;
let responseTimer;
let voiceTween;
let panelVoiceStatus;
let backdropPointer = null;
const phone = createPhone($('#phone'), {
  onToggle: togglePhone,
  onNotify() {
    audio.cue('notification');
    releaseMouse();
  },
});
const developerMode = createDeveloperMode({
  panel, openPanel,
  canSkip: canSkipTask,
  getSkipLabel: () => state.tutorialDone ? '跳过当前任务' : '跳过操作练习',
  onSkip: skipCurrentTask,
  onSkipDictation(enabled) {
    if (enabled && state.phase === 'dictation') {
      moveToHandover(missions[state.mission]);
      save();
      syncPhoneActivity();
    }
  },
});

function storedMusic() {
  try {
    return localStorage.getItem(musicKey) !== 'off';
  } catch {
    return true;
  }
}

function updateTitleMusic() {
  const playing = audioStarted && musicEnabled;
  $('#title-music').setAttribute('aria-pressed', String(playing));
  $('#title-music').setAttribute('aria-label', playing ? '关闭背景音乐' : '播放背景音乐');
  $('#music-label').textContent = playing ? '关闭音乐' : '开启音乐';
}

function startAudio() {
  if (!audio.start() || audioStarted) return;
  audioStarted = true;
  updateTitleMusic();
}

function setMusicPreference(enabled) {
  musicEnabled = enabled;
  audio.setMusicEnabled(enabled);
  updateTitleMusic();
  try {
    localStorage.setItem(musicKey, enabled ? 'on' : 'off');
  } catch {
    // Background music remains available for the current session.
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Some school browsers disable storage; the session still works.
  }
}

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function makeButton(text, className, click, label) {
  const result = node('button', text, className);
  result.type = 'button';
  if (label) result.setAttribute('aria-label', label);
  result.addEventListener('click', () => click());
  return result;
}

function speakerButton(click, label) {
  const button = makeButton('', 'icon-button speaker-button', click, label);
  const svgNS = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNS, 'svg');
  icon.setAttribute('class', 'speaker-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M4 9v6h4l5 4V5L8 9H4Z M16 9a4 4 0 0 1 0 6 M19 6a8.5 8.5 0 0 1 0 12');
  icon.append(path);
  button.append(icon);
  button.title = label;
  return button;
}

function animate(target, from, to, duration = .26) {
  const gsap = window.gsap;
  if (!gsap || motion.matches) return;
  gsap.fromTo(target, from, { ...to, duration, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity,visibility' });
}

function resetTranslation(button, body, text) {
  body.textContent = text;
  body.hidden = true;
  button.hidden = !text;
  button.setAttribute('aria-expanded', 'false');
}

function connectTranslation(button, body) {
  if (body.id) button.setAttribute('aria-controls', body.id);
  button.addEventListener('click', () => {
    body.hidden = !body.hidden;
    button.setAttribute('aria-expanded', String(!body.hidden));
    if (!body.hidden) animate(body, { opacity: 0, y: -4 }, { opacity: 1, y: 0 }, .18);
  });
}

let translationId = 0;

function translation(text) {
  const block = node('p', text, 'translation');
  block.id = 'english-help-' + ++translationId;
  block.lang = 'en';
  block.hidden = true;
  block.dataset.translation = '';
  const control = node('button', 'EN', 'icon-button translation-button');
  control.type = 'button';
  control.setAttribute('aria-label', '英文翻译');
  control.title = 'English';
  control.setAttribute('aria-expanded', 'false');
  connectTranslation(control, block);
  return { control, block };
}

for (const [control, body] of [
  ['#intro-en', '#intro-translation'], ['#cue-en', '#cue-translation'], ['#response-en', '#response-translation'],
]) connectTranslation($(control), $(body));

const voice = createVoice((status) => {
  voiceTween?.kill();
  voiceTween = null;
  const bars = document.querySelectorAll('#wave i');
  window.gsap?.set(bars, { scaleY: status === 'playing' ? .85 : .5 });
  if (status === 'playing' && window.gsap && !motion.matches) {
    voiceTween = window.gsap.to(bars, { scaleY: .33, stagger: .09, duration: .32, repeat: -1, yoyo: true, ease: 'sine.inOut' });
  }
  audio.setDucked(status === 'playing');
  const message = '暂时无法播放华语。你可以阅读中文提示，或再试一次。';
  $('#voice-status').textContent = status === 'unavailable' && !desk.open ? message : '';
  $('#voice-status').hidden = status !== 'unavailable' || desk.open;
  if (panelVoiceStatus) {
    panelVoiceStatus.textContent = status === 'unavailable' ? message : '';
    panelVoiceStatus.hidden = status !== 'unavailable';
  }
});

function discovered() {
  if (state.lessonComplete) return lessonWords;
  const known = new Set(missions.slice(0, state.mission).flatMap((mission) => mission.dictation.map(({ word }) => word)));
  const current = missions[state.mission];
  if (current) {
    const words = state.phase === 'explore'
      ? actionWords[state.mission].slice(0, state.action).flat()
      : current.dictation.map(({ word }) => word);
    words.forEach((word) => known.add(word));
  }
  return known;
}

function worldState() {
  const old = missions.slice(0, state.mission).flatMap((mission) => mission.actions);
  const moves = [...old, ...(missions[state.mission]?.actions.slice(0, state.action) ?? [])];
  const active = nextObject();
  engine?.setGameState({
    completed: state.mission, mission: state.mission, action: state.action,
    used: new Set([...(state.phonePicked ? ['radio'] : []), ...moves.map(({ target }) => target)]),
    held: state.held, last, hintTarget, unlocked: new Set(state.unlocked),
    activeTargets: new Set(active ? [active] : []), reducedMotion: motion.matches,
  });
}

function updateInterface() {
  const wordCount = $('#word-count');
  const counter = discovered().size + ' / ' + entries.length;
  if (wordCount.textContent !== counter) animate(wordCount, { scale: 1.22 }, { scale: 1 });
  wordCount.textContent = counter;
  $('#held').hidden = !state.held;
  $('#held').textContent = state.held ? '手上 · ' + objects[state.held].cn : '';
  reticle.hidden = !started || desk.open || phone.isOpen || pickingPhone;
  updateTarget(currentTarget);
  worldState();
}

function setCue(task, announce) {
  cue = task;
  $('#cue-text').textContent = cue.cn;
  const previousTarget = state.tutorialDone && state.phase === 'explore' && !state.notePending
    ? missions[state.mission].actions[state.action - 1]?.target : null;
  const clueEnglish = evidence[previousTarget]?.lines.map(([, english]) => english).join(' ');
  resetTranslation($('#cue-en'), $('#cue-translation'), [cue.en, clueEnglish].filter(Boolean).join('\n\n'));
  animate($('#cue-text'), { opacity: .25, y: 10 }, { opacity: 1, y: 0 }, .32);
  if (announce && !phone.isOpen) voice.speak(cue.cn);
}

function objective(announce = true) {
  const status = $('#mission-number');
  const title = $('#mission-name');
  if (!state.tutorialDone) {
    status.textContent = '操作练习 · ' + (tutorialIndex + 1) + ' / ' + tutorial.length;
    title.textContent = ['学会行走', '环顾四周', '拿起手机', '查看手机'][tutorialIndex];
    setCue(tutorial[tutorialIndex], announce);
  } else if (state.phase === 'done') {
    status.textContent = '六项任务已完成';
    title.textContent = '温室准备就绪';
    setCue({ cn: '查看阿宁的消息。', en: 'Read Ah Ning’s message.' }, announce);
  } else {
    const mission = missions[state.mission];
    status.textContent = '任务 ' + (state.mission + 1) + ' / ' + missions.length;
    title.textContent = mission.titleCN;
    if (state.notePending) {
      setCue({ cn: '用手机回复阿宁。', en: 'Reply to A Ning on the phone.' }, announce);
    } else if (state.phase === 'explore') {
      setCue(mission.actions[state.action], announce);
    } else {
      setCue({ cn: '打开手机', en: 'Open your phone.' }, announce);
    }
  }
  syncPhoneActivity();
  resetHint();
  updateInterface();
}

function sendMessage(text, key, notify = true, direction = 'incoming') {
  if (text) phone.receive(text, { key, notify, direction });
}

function sendStep(mission, index, notify = true) {
  const action = mission.actions[index];
  if (!action) return;
  sendMessage(phoneStory[mission.id].steps[action.target], 'step:' + mission.id + ':' + action.target, notify);
}

function requestNoteReply(notify) {
  sendMessage(noteReply.prompt, 'note-question', notify);
  phone.setChallenge({
    id: 'window-note',
    prompt: 'Reply to Ah Ning',
    placeholder: 'Write your reply',
    characters: noteReply.characters,
    onSuccess(answer) {
      state.notePending = false;
      state.noteAnswer = answer.slice(0, 180);
      save();
      sendStep(missions[0], state.action, false);
      announceAfterPhone = true;
      objective(false);
    },
  }, { notify: false });
}

function restorePhone() {
  missions.slice(0, state.mission + 1).forEach((mission, index) => {
    const story = phoneStory[mission.id];
    const finished = index < state.mission;
    const completed = finished ? mission.actions.length : state.action;
    const visibleSteps = Math.min(mission.actions.length, completed + 1);
    for (let step = 0; step < visibleSteps; step += 1) {
      if (mission.actions[step - 1]?.target === 'westNote') {
        if (state.notePending) {
          requestNoteReply(false);
          break;
        }
        sendMessage(noteReply.prompt, 'note-question', false);
        if (state.noteAnswer) sendMessage(state.noteAnswer, 'note-answer', false, 'outgoing');
      }
      sendStep(mission, step, false);
    }
    if (completed === mission.actions.length) sendMessage(story.checkpoint, 'check:' + mission.id, false);
    if (finished) sendMessage(statusReplies[mission.id], 'reply:' + mission.id, false, 'outgoing');
  });
  if (state.endingSeen) sendMessage(closingMessages, 'closing', false);
}

function syncPhoneActivity() {
  const mission = missions[state.mission];
  if (!mission || state.phase === 'explore') {
    phone.setActivity(null);
    return;
  }
  const actions = {
    question: ['Open field check', 'Record what you discovered.'],
    dictation: ['Continue dictation', 'Pick up where you left off in the field check.'],
    handover: ['Send handover', 'Send Ah Ning a short update and move the fair forward.'],
  };
  const [label, detail] = actions[state.phase];
  phone.setActivity({
    id: mission.id + ':' + state.phase, label, detail,
    onOpen() {
      phone.close();
      openTask();
    },
  });
}

function releaseMouse() {
  if (document.pointerLockElement === canvas) document.exitPointerLock?.();
}

function takePhone() {
  const from = engine.projectTarget('radio');
  pickingPhone = true;
  state.phonePicked = true;
  last = { id: 'radio', action: 'pickup' };
  save();
  engine.setActive(false);
  voice.stop();
  const host = $('#phone');
  host.dataset.pickingUp = '';
  phone.setVisible(true);
  const dock = host.querySelector('.phone-dock').getBoundingClientRect();
  updateInterface();
  audio.cue('pickup');
  animatePhonePickup({
    from,
    to: { x: dock.left + dock.width / 2, y: dock.top + dock.height / 2, width: dock.width, height: dock.height },
    parent: $('#app'),
    onComplete() {
      pickingPhone = false;
      delete host.dataset.pickingUp;
      tutorialIndex = 3;
      if (!desk.open) engine.setActive(true);
      sendStep(missions[0], 0);
      objective(!desk.open);
    },
  });
}

function togglePhone(open) {
  if (!started) return;
  if (open) {
    engine?.setActive(false);
    voice.stop();
    $('#response').hidden = true;
    if (state.phonePicked && tutorialIndex === 3 && !state.tutorialDone) {
      state.tutorialDone = true;
      announceAfterPhone = true;
      save();
      objective(false);
    }
  } else if (finalMessageOpen) {
    finalMessageOpen = false;
    void openLessonTest('final');
    return;
  } else if (!desk.open && $('#comic-overlay').hidden) {
    engine?.setActive(true);
    if (announceAfterPhone) {
      announceAfterPhone = false;
      replayCue();
    }
  }
  updateInterface();
}

function resetHint() {
  const target = state.notePending ? 'westNote' : nextObject();
  const key = started && state.tutorialDone && target ? `${state.mission}:${state.action}:${target}` : null;
  if (key === activeHintKey) return;
  activeHintKey = key;
  clearTimeout(hintTimer);
  hintTarget = null;
  phone.setHint(null);
  if (!key) return;

  function offerHint() {
    if (key !== activeHintKey) return;
    if (document.hidden || phone.isOpen || desk.open) {
      hintTimer = setTimeout(offerHint, 5000);
      return;
    }
    phone.setHint({
      id: key,
      text: state.notePending
        ? 'Read the first four Chinese characters on the note. They tell you when the window leaks.'
        : fieldHints[target],
      onLocate() {
        if (key !== activeHintKey) return;
        hintTarget = target;
        worldState();
      },
    });
  }
  hintTimer = setTimeout(offerHint, hintDelay);
}

function response(cn, en) {
  const toast = $('#response');
  clearTimeout(responseTimer);
  $('#response-text').textContent = cn;
  resetTranslation($('#response-en'), $('#response-translation'), en);
  toast.hidden = desk.open;
  animate(toast, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });
  responseTimer = window.setTimeout(() => {
    if ($('#response-translation').hidden) toast.hidden = true;
  }, 10500);
}

function nextObject() {
  if (!state.tutorialDone) return tutorialIndex === 2 && !state.phonePicked ? 'radio' : null;
  return state.phase === 'explore' && !state.notePending ? missions[state.mission].actions[state.action].target : null;
}

function updateTarget(target) {
  currentTarget = target;
  const known = target && objects[target.id];
  const canInteract = !!known && started && !desk.open && !phone.isOpen && !pickingPhone;
  reticle.classList.toggle('targeted', canInteract);
  interact.hidden = !canInteract;
  if (!canInteract) return;
  const correct = target.id === nextObject();
  const action = correct ? (state.tutorialDone ? missions[state.mission].actions[state.action].action : 'pickup') : 'inspect';
  const verb = actions[action];
  interact.querySelector('span').textContent = verb + ' · ' + known.cn;
}

function useObject(target) {
  if (!target || !started || desk.open || phone.isOpen || pickingPhone || !objects[target.id]) return;
  const thing = objects[target.id];
  if (target.id === 'radio') {
    if (target.id === nextObject()) takePhone();
    return;
  }
  if (evidence[target.id]) {
    inspectEvidence(target, target.id === nextObject() ? () => completeObject(target, true) : null);
    return;
  }
  if (target.id !== nextObject()) {
    if (target.id === 'westWindow' && state.mission === 0 && state.action === 0) {
      response('窗框在滴水。窗台上压着一张纸。', 'Water is dripping from the frame. There’s a piece of paper on the sill.');
    } else {
      response(thing.descriptionCN, thing.descriptionEN);
    }
    audio.cue('dew');
    return;
  }
  completeObject(target);
}

function completeObject(target, inspected = false) {
  const mission = missions[state.mission];
  const action = mission.actions[state.action];
  last = { id: target.id, action: action.action, mission: state.mission, step: state.action };
  if (action.action === 'pickup') state.held = target.id;
  if (action.action === 'place' || (target.id === 'westWindow' && action.action === 'use') || target.id === 'rehearsalScreen') state.held = null;
  if (target.id === 'weakPlant') state.held = 'weakPlant';
  state.action += 1;
  if (target.id === 'westNote') {
    state.notePending = true;
    requestNoteReply(true);
  }
  if (state.action >= mission.actions.length) {
    state.phase = 'question';
    save();
    audio.cue(target.id === 'westWindow' ? 'seal' : 'relay');
    sendMessage(phoneStory[mission.id].checkpoint, 'check:' + mission.id);
    releaseMouse();
    objective();
    return;
  }
  save();
  if (target.id !== 'westNote') sendStep(mission, state.action);
  if (!inspected) audio.cue(action.action === 'pickup' ? 'dew' : (target.id === 'westWindow' ? 'seal' : 'correct'));
  $('#response').hidden = true;
  objective();
}

function clearPanel() {
  cleanup();
  cleanup = () => {};
  panelVoiceStatus = null;
  voice.stop();
}

function presentPanel(content, focusTarget, inspection = false) {
  clearPanel();
  delete desk.dataset.practice;
  desk.classList.toggle('artifact-inspection', inspection);
  panel.replaceChildren(content);
  if (!desk.open) {
    engine?.setActive(false);
    desk.showModal();
    $('#response').hidden = true;
    reticle.hidden = true;
    interact.hidden = true;
    if (!inspection) animate(desk, { opacity: 0, y: 13 }, { opacity: 1, y: 0 });
  }
  desk.scrollTop = 0;
  focusTarget.focus({ preventScroll: true });
}

function openPanel(label, title, practice) {
  const top = node('div', '', 'panel-top');
  const header = node('div');
  if (label) header.append(node('p', label, 'label'));
  const heading = node('h2', title);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  header.append(heading);
  top.append(header, makeButton('×', 'icon-button', () => desk.close(), started ? '返回场景' : '关闭'));
  presentPanel(top, heading);
  if (practice) desk.dataset.practice = practice;
}

desk.addEventListener('pointerdown', (event) => {
  // Touch browsers can retarget a tap near the paper edge to the paper itself.
  if (event.button === 0 && desk.classList.contains('artifact-inspection') &&
    document.elementFromPoint(event.clientX, event.clientY) === desk) {
    backdropPointer = event.pointerId;
  }
});

desk.addEventListener('pointerup', (event) => {
  if (event.pointerId !== backdropPointer) return;
  backdropPointer = null;
  if (document.elementFromPoint(event.clientX, event.clientY) === desk) desk.close();
});

desk.addEventListener('pointercancel', (event) => {
  if (event.pointerId === backdropPointer) backdropPointer = null;
});

desk.addEventListener('close', () => {
  if (desk.open) return;
  backdropPointer = null;
  desk.classList.remove('artifact-inspection');
  clearPanel();
  if (started && !pickingPhone) {
    engine?.setActive(true);
    engine?.focus(false);
  }
  updateInterface();
  const next = afterClose;
  afterClose = null;
  next?.();
});

function voiceMessage(parent = panel) {
  panelVoiceStatus = node('p', '', 'voice-status');
  panelVoiceStatus.setAttribute('role', 'status');
  panelVoiceStatus.hidden = true;
  parent.append(panelVoiceStatus);
}

function buttonRow(...buttons) {
  const controls = node('div', '', 'button-row');
  controls.append(...buttons);
  return controls;
}

function row(...buttons) {
  const controls = buttonRow(...buttons);
  panel.append(controls);
  return controls;
}

function addTranslation(parent, english, placement = panel) {
  if (!english) return;
  const { control, block } = translation(english);
  parent.append(control);
  placement.append(block);
}

function showEvidence(id, next) {
  const item = evidence[id];
  const sheet = node('article', '', 'artifact-sheet artifact-' + item.kind);
  sheet.tabIndex = -1;
  const monitor = item.kind === 'monitor';
  if (item.art) {
    const art = node('img', '', 'artifact-art');
    art.width = monitor ? 960 : 640;
    art.height = monitor ? 640 : 800;
    art.src = new URL('./art/' + item.art + '.webp', import.meta.url).href;
    art.alt = item.alt ?? '';
    sheet.append(art);
  }
  const content = node('div', '', 'artifact-ink');
  const label = node('p', item.label ?? item.title, 'artifact-label');
  label.id = 'panel-title';
  label.hidden = !item.label;
  content.append(label);
  for (const [chinese] of item.lines) content.append(node('p', chinese, 'artifact-line'));
  sheet.append(content);
  presentPanel(sheet, sheet, true);
  afterClose = next;
  audio.cue(monitor ? 'relay' : 'paper');
  const enter = monitor ? { opacity: 0, scale: .91 } : {
    opacity: 0, transformPerspective: 900, rotationX: item.kind === 'note' ? -70 : -35, scaleY: .73, y: 18,
  };
  animate(sheet, enter, { opacity: 1, scale: 1, scaleY: 1, rotationX: 0, y: 0 }, .44);
}

function inspectEvidence(target, next) {
  const { id } = target;
  if (!screenChecks[id] || state.unlocked.includes(id)) {
    showEvidence(id, next);
    return;
  }
  showQuestion(screenChecks[id], '屏幕登录', () => {
    state.unlocked.push(id);
    save();
    worldState();
    return { label: '打开屏幕', run: () => showEvidence(id, next) };
  });
}

function showQuestion(item, label, onNext, context) {
  openPanel(label, item.cn, 'question');
  const english = [item.en, ...item.choices.map((choice, i) => (i + 1) + '. ' + choice.en)].filter(Boolean).join('\n');
  const support = translation(english);
  const replay = speakerButton(() => voice.speak(item.cn), '重听');
  const controls = row(replay, support.control);
  panel.append(support.block);
  if (context?.cn && !item.image) {
    const note = node('div', '', 'clue-note');
    const hint = translation(context.en);
    const clue = makeButton('回看线索', 'text-button', () => {
      note.hidden = !note.hidden;
      clue.setAttribute('aria-expanded', String(!note.hidden));
      if (!note.hidden) voice.speak(context.cn);
    });
    clue.setAttribute('aria-expanded', 'false');
    note.hidden = true;
    const clueLine = node('div', '', 'clue-line');
    clueLine.append(node('p', context.cn), hint.control);
    note.append(clueLine, hint.block);
    controls.append(clue);
    panel.append(note);
  }
  const layout = node('div', '', 'question-layout');
  if (item.image === 'tray-guide') {
    const figure = node('figure', '', 'question-figure');
    const image = node('img');
    image.src = new URL('./art/tray-guide.webp', import.meta.url).href;
    image.alt = '两只手从下方托住花盆的底部。';
    image.width = 660;
    image.height = 440;
    figure.append(image);
    layout.append(figure);
    layout.classList.add('with-figure');
  }
  const content = node('div', '', 'question-content');
  const choices = node('div', '', 'choices');
  const feedback = node('p', '', 'feedback');
  feedback.setAttribute('role', 'status');
  let correct = false;
  for (const [index, choice] of item.choices.entries()) {
    const option = makeButton('', 'choice', () => {
      if (correct) return;
      choices.querySelector('.wrong')?.classList.remove('wrong');
      if (index !== item.answer) {
        option.classList.add('wrong');
        feedback.textContent = '还不对。再想一想你刚才听见或看见的线索。';
        audio.cue('wrong');
        return;
      }
      correct = true;
      option.classList.add('correct');
      feedback.textContent = item.feedbackCN ?? '答对了。';
      audio.cue('correct');
      const next = onNext();
      if (next) {
        const buttons = row(makeButton(next.label, 'primary', next.run));
        addTranslation(buttons, item.feedbackEN);
        buttons.firstElementChild.focus();
      }
    });
    const number = node('span', String(index + 1), 'choice-number');
    number.setAttribute('aria-hidden', 'true');
    option.setAttribute('aria-label', (index + 1) + '. ' + choice.cn);
    option.append(number, node('span', choice.cn));
    choices.append(option);
  }
  content.append(choices, feedback);
  layout.append(content);
  panel.append(layout);
  voiceMessage();
  voice.speak(item.cn);
}

function sentenceWithGap(sentence, word) {
  const line = node('p', '', 'sentence');
  for (const [index, fragment] of sentence.split(word).entries()) {
    if (index) {
      const gap = node('span', '', 'sentence-gap');
      gap.style.setProperty('--characters', String([...word].length));
      gap.setAttribute('role', 'img');
      gap.setAttribute('aria-label', '空格');
      line.append(gap);
    }
    line.append(document.createTextNode(fragment));
  }
  return line;
}

function showWord(entry, label, complete, guided = false, announce = true) {
  openPanel(label, guided ? '练写' : '听写', 'writing');
  const layout = node('div', '', 'dictation-layout');
  const directions = node('div', '', 'dictation-directions');
  directions.append(sentenceWithGap(entry.sentence, entry.word));
  if (!guided && entry.instructionCN) directions.append(node('p', entry.instructionCN, 'minor'));
  if (guided) directions.append(node('p', entry.word + ' · ' + lexicon[entry.word].pinyin, 'ink-word'));
  const spoken = entry.spokenTarget ?? entry.word + '。';
  const audioLine = entry.sentence + ' 要写的是：' + spoken;
  const play = () => voice.speak(audioLine, .85);
  const buttons = buttonRow(speakerButton(play, '重听听写'));
  directions.append(buttons);
  addTranslation(buttons, [entry.instructionEN, entry.en].filter(Boolean).join('\n'), directions);
  voiceMessage(directions);
  const workspace = node('div', '', 'writing-workspace');
  const grid = node('div', '', 'writing-grid');
  const characters = [...entry.word];
  const progress = node('ol', '', 'writing-progress');
  progress.setAttribute('aria-label', '听写进度');
  const markers = characters.map((_, index) => node('li', String(index + 1)));
  progress.append(...markers);
  function updateProgress(completed) {
    markers.forEach((marker, index) => {
      marker.textContent = index < completed ? characters[index] : String(index + 1);
      marker.classList.toggle('complete', index < completed);
      if (index === completed) marker.setAttribute('aria-current', 'step');
      else marker.removeAttribute('aria-current');
    });
  }
  updateProgress(0);
  const status = node('p', '', 'feedback');
  status.setAttribute('role', 'status');
  const helper = buttonRow();
  workspace.append(grid, progress, status, helper);
  layout.append(directions, workspace);
  panel.append(layout);
  if (!guided) {
    helper.append(makeButton('看字练写', 'text-button', () => showWord(entry, label, complete, true, false)));
  }
  cleanup = createWriting(grid, entry.word, guided, () => {
    audio.cue('correct');
    const next = complete(guided);
    status.textContent = guided ? '已完成描写练习。' : '已写好。';
    helper.replaceChildren(makeButton(next.label, 'primary', next.run));
    helper.firstElementChild.focus();
  }, () => {
    status.textContent = '书写格未能载入。请再试一次。';
    helper.append(makeButton('重新载入书写格', 'text-button', () => showWord(entry, label, complete, guided, false)));
  }, () => {
    status.textContent = guided ? '再试一笔。也可以看看亮起的笔画。' : '这一笔的位置或笔顺不对，请再试。';
  }, (completed) => {
    status.textContent = '';
    updateProgress(completed);
  });
  if (announce) play();
}

function record(word, guided) {
  const mode = guided ? 'guided' : 'independent';
  if (state.written[word] !== 'independent') state.written[word] = mode;
  save();
}

function moveToHandover(mission) {
  state.phase = 'handover';
  state.wordIndex = mission.dictation.length;
}

function openTask() {
  const mission = missions[state.mission];
  if (!mission) return;
  if (state.phase === 'question') {
    showQuestion(mission.question, mission.titleCN, () => {
      if (developerMode.skipDictation) moveToHandover(mission);
      else state.phase = 'dictation';
      save();
      syncPhoneActivity();
      return { label: state.phase === 'handover' ? '完成交接' : '开始听写', run: openTask };
    }, { cn: mission.actions.at(-1).resultCN, en: mission.actions.at(-1).resultEN });
  } else if (state.phase === 'dictation') {
    const entry = mission.dictation[state.wordIndex];
    showWord(entry, mission.titleCN + ' · ' + (state.wordIndex + 1) + ' / ' + mission.dictation.length, (guided) => {
      record(entry.word, guided);
      state.wordIndex += 1;
      if (state.wordIndex === mission.dictation.length) state.phase = 'handover';
      save();
      syncPhoneActivity();
      return { label: state.phase === 'handover' ? '完成交接' : '下一个词', run: openTask };
    });
  } else if (state.phase === 'handover') {
    finishMission();
  }
}

function finishMission() {
  const mission = missions[state.mission];
  sendMessage(statusReplies[mission.id], 'reply:' + mission.id, false, 'outgoing');
  state.mission += 1;
  state.action = 0;
  state.wordIndex = 0;
  state.phase = state.mission === missions.length ? 'done' : 'explore';
  state.held = null;
  save();
  audio.cue(state.phase === 'done' ? 'finish' : 'relay');
  const continueStory = () => {
    if (state.phase === 'done') {
      objective(false);
      showFinale();
    } else {
      sendStep(missions[state.mission], 0);
      objective();
    }
  };
  if (desk.open) {
    afterClose = continueStory;
    desk.close();
  } else {
    continueStory();
  }
}

function showFinale() {
  phone.close();
  engine?.setActive(false);
  voice.stop();
  audio.setMusic('comic');
  playComic($('#comic-overlay'), () => {
    state.endingSeen = true;
    save();
    audio.setMusic('game');
    audio.cue('finish');
    openFinalMessage();
  }, {
    ending: true,
    onPage(page) { if (page > 1) audio.cue('page'); },
  });
}

function openFinalMessage() {
  sendMessage(closingMessages, 'closing');
  finalMessageOpen = true;
  phone.open();
}

function suspendRoom() {
  started = false;
  finalMessageOpen = false;
  announceAfterPhone = false;
  engine?.setActive(false);
  engine?.hide();
  resetHint();
  phone.setVisible(false);
  voice.stop();
  audio.setAmbience(false);
  for (const selector of ['#toolbar', '#mission-ui', '#response', '#play-controls', '#reticle', '#interact']) {
    $(selector).hidden = true;
  }
}

function returnHome() {
  if (desk.open) {
    afterClose = returnHome;
    desk.close();
    return;
  }
  activeTest?.destroy?.();
  activeTest = null;
  testScreen.hidden = true;
  testScreen.replaceChildren();
  suspendRoom();
  audio.setMusic('title');
  updateTitle();
  $('#splash').hidden = false;
  const button = $('#start').disabled ? $('#practice-test') : $('#start');
  if (!button.hidden) button.focus({ preventScroll: true });
}

async function openLessonTest(mode) {
  const final = mode === 'final';
  if (activeTest || (final ? !state.endingSeen || state.finalPassed : !state.lessonComplete)) return;
  const run = {};
  activeTest = run;
  const slot = final ? 'finalTest' : 'practiceTest';
  if (final && !state.finalStarted) {
    state.finalStarted = true;
    save();
  }
  suspendRoom();
  $('#splash').hidden = true;
  testScreen.hidden = false;
  const loading = node('div', '', 'lesson-test-loading');
  const status = node('p', '正在准备测验……');
  status.setAttribute('role', 'status');
  const home = makeButton('返回首页', 'text-button', returnHome);
  loading.append(status, home);
  testScreen.replaceChildren(loading);
  home.focus({ preventScroll: true });

  try {
    const [bank, { createLessonTestView }] = await Promise.all([
      loadLessonTest(), import('./lesson-test-view.js'),
    ]);
    if (activeTest !== run) return;
    state[slot] = restoreLessonTest(bank, state[slot]);
    save();
    run.destroy = createLessonTestView(testScreen, {
      bank, state: state[slot], mode, speak: voice.speak, stopSpeech: voice.stop, cue: audio.cue,
      onProgress(snapshot) {
        state[slot] = snapshot;
        save();
      },
      onPass() {
        if (final) {
          state.finalPassed = true;
          state.lessonComplete = true;
        }
        state[slot] = null;
        save();
      },
      onExit: returnHome,
    });
  } catch {
    if (activeTest !== run) return;
    status.textContent = '测验未能载入。请再试一次。';
    const retry = makeButton('重试', 'primary', () => {
      activeTest = null;
      void openLessonTest(mode);
    });
    home.before(retry);
    testScreen.replaceChildren(loading);
    retry.focus({ preventScroll: true });
  }
}

function showBook() {
  openPanel(null, '词语手册');
  const known = discovered();
  const controls = row(makeButton('练习题库', 'primary', () => showBank(0, 0)));
  addTranslation(controls, 'Vocabulary notebook. Entries appear as you discover them. Tap the speaker to hear a word or tap EN for its English meaning.');
  panel.append(node('p', `已发现 ${known.size} / ${entries.length} 个词语。`, 'body'));
  voiceMessage();
  const list = node('ol', '', 'vocab');
  const examples = new Map();
  for (const [index, entry] of entries.entries()) {
    const line = node('li');
    if (!known.has(entry.word)) {
      line.className = 'locked';
      line.append(node('strong', '待发现'), node('span', '第 ' + (index + 1) + ' 个词', 'vocab-note'));
    } else {
      const data = lexicon[entry.word];
      const term = node('strong', entry.word);
      term.append(node('span', data.pinyin, 'pinyin'));
      const details = node('div', '', 'word-details');
      const definition = node('p', data.cn, 'definition');
      const example = node('p', '', 'word-example');
      example.hidden = true;
      examples.set(entry.word, example);
      details.append(definition, example);
      const buttons = node('span', '', 'row-buttons');
      const hint = translation(data.en);
      const speak = speakerButton(() => voice.speak(data.spoken ?? entry.word), '听' + entry.word + '的发音');
      const review = makeButton('写', 'icon-button', () => showWord(entry, '词语复习', (guided) => {
        record(entry.word, guided);
        return { label: '返回词语手册', run: showBook };
      }), '复习' + entry.word + '的听写');
      if (state.written[entry.word] === 'guided') definition.append(node('span', ' · 可再试听写', 'vocab-note'));
      hint.control.setAttribute('aria-label', entry.word + '的英文意思');
      buttons.append(speak, hint.control, review);
      line.append(term, details, buttons, hint.block);
    }
    list.append(line);
  }
  panel.append(list);
  if (examples.size) void loadExamples();

  async function loadExamples() {
    try {
      const bank = await loadLessonTest();
      for (const [word, example] of examples) {
        example.textContent = bank[word][0];
        example.hidden = false;
      }
    } catch {
      if (!list.isConnected || !desk.open) return;
      const retry = makeButton('重新载入例句', 'text-button', () => {
        retry.remove();
        void loadExamples();
      });
      list.before(retry);
    }
  }
}

function showBank(index, total) {
  if (index === practiceBank.length) {
    openPanel('六年级 · 练习题库', '练习完成');
    panel.append(node('p', '你完成了 ' + total + ' 道题。', 'body'));
    row(makeButton('再练一次', 'primary', () => showBank(0, 0)), makeButton('返回词语手册', 'text-button', showBook));
    return;
  }
  showQuestion(practiceBank[index], '练习题库 · ' + (index + 1) + ' / ' + practiceBank.length, () => ({
    label: index + 1 === practiceBank.length ? '完成练习' : '下一题',
    run: () => showBank(index + 1, total + 1),
  }));
}

function showSettings() {
  openGameSettings({
    panel, openPanel,
    effects: {
      get: () => effectsEnabled,
      set(enabled) {
        effectsEnabled = enabled;
        audio.setEnabled(enabled);
        if (enabled) startAudio();
      },
    },
    music: {
      get: () => musicEnabled,
      set(enabled) {
        setMusicPreference(enabled);
        if (enabled) startAudio();
      },
    },
    onHome: returnHome,
  });
}

function canSkipTask() {
  return started && !pickingPhone && state.phase !== 'done';
}

function skipCurrentTask() {
  if (!canSkipTask()) return;
  if (!state.tutorialDone) {
    tutorialIndex = tutorial.length - 1;
    state.tutorialDone = true;
    state.phonePicked = true;
    save();
    phone.setVisible(true);
    afterClose = () => {
      sendStep(missions[0], 0);
      objective();
    };
    desk.close();
    return;
  }

  for (const { target } of missions[state.mission].actions) {
    if (Object.hasOwn(screenChecks, target) && !state.unlocked.includes(target)) state.unlocked.push(target);
  }
  state.notePending = false;
  announceAfterPhone = false;
  phone.setChallenge(null);
  last = null;
  finishMission();
}

function replayMission() {
  state = { ...emptySave(), lessonComplete: state.lessonComplete, practiceTest: state.practiceTest, written: state.written };
  phone.reset();
  phone.setVisible(false);
  last = null;
  tutorialIndex = 0;
  walked = 0;
  turned = 0;
  footstepDistance = 0;
  engine?.reset();
  save();
  updateTitle();
  beginWithComic();
}

function replayCue() {
  voice.speak(cue.cn);
}

$('#replay-cue').addEventListener('click', replayCue);
$('#book').addEventListener('click', showBook);
$('#settings').addEventListener('click', showSettings);
$('#developer-mode').addEventListener('click', developerMode.open);
interact.addEventListener('click', () => engine?.interact());
window.addEventListener('keydown', (event) => {
  if (!started || desk.open || phone.isOpen || pickingPhone || !$('#comic-overlay').hidden ||
      event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyF') {
    event.preventDefault();
    phone.open();
  }
  if (event.code === 'KeyP') showBook();
  if (event.code === 'KeyR') replayCue();
});

function begin() {
  if (started) return;
  if (unavailable) {
    audio.setMusic('title');
    return;
  }
  if (!engine) {
    $('#start').disabled = true;
    $('#replay-intro').disabled = true;
    $('#start-status').textContent = '正在准备科学楼……';
    void prepareRoom().then(() => {
      if (!unavailable) {
        $('#start').disabled = false;
        $('#replay-intro').disabled = false;
      }
      if (engine) begin();
      else {
        $('#start-status').textContent = '科学楼未能载入。请刷新页面再试。';
        audio.setMusic('title');
      }
    });
    return;
  }
  $('#start-status').textContent = '';
  started = true;
  audio.setMusic('game');
  audio.setAmbience(true);
  $('#splash').hidden = true;
  $('#toolbar').hidden = false;
  $('#mission-ui').hidden = false;
  $('#play-controls').hidden = false;
  phone.setVisible(state.phonePicked);
  if (state.tutorialDone) restorePhone();
  else if (state.phonePicked) sendStep(missions[0], 0);
  engine.show();
  engine.setActive(true);
  engine.focus(state.phase === 'explore' && !state.notePending && (state.tutorialDone || !state.phonePicked));
  objective(state.phase !== 'done');
  if (state.phase === 'done') {
    if (state.endingSeen) openFinalMessage();
    else showFinale();
  }
}

bindJoystick($('#joystick'), (x, forward) => engine?.setVector(x, forward));

function beginWithComic() {
  if (unavailable || started || !$('#comic-overlay').hidden) return;
  audio.setMusic('comic');
  void prepareRoom();
  playComic($('#comic-overlay'), begin, {
    onPage(page) {
      if (page === 1) audio.prepareGameplay();
      else if (page === 2) audio.cue('storm');
      else if (page === 4) audio.cue('notification');
      else if (page > 1) audio.cue('page');
    },
  });
}

audio.setEnabled(effectsEnabled);
audio.setMusicEnabled(musicEnabled);
audio.setMusic('title');
$('#title-music').addEventListener('click', () => {
  setMusicPreference(!audioStarted || !musicEnabled);
  startAudio();
  audio.cue('ui');
});
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (button?.id === 'title-music') return;
  startAudio();
  if (button && !button.matches('.comic-hit,#interact,.choice')) audio.cue('ui');
}, true);

function updateTitle() {
  const done = state.phase === 'done';
  const assessmentReady = done && state.finalStarted && !state.finalPassed;
  let label = state.phonePicked ? '继续任务' : '进入科学楼';
  if (state.finalPassed) label = '重玩任务';
  else if (assessmentReady) label = '继续测验';
  else if (done && state.endingSeen) label = '查看最后消息';
  $('#start-label').textContent = label;
  $('#start').disabled = unavailable && !assessmentReady;
  $('#replay-intro').hidden = done || !state.phonePicked;
  $('#practice-test').hidden = !state.lessonComplete;
  $('#home-book').hidden = !state.lessonComplete;
  $('#practice-test-label').textContent = state.practiceTest ? '继续温习测验' : '温习测验';
  $('.cover-warning').toggleAttribute('data-completed', state.lessonComplete || done);
  $('#cover-situation').textContent = state.lessonComplete ? '第一课已完成！' : done ?
    '科学展顺利开幕了。' : '科学展快开门了。西窗还在漏水！';
  const english = state.lessonComplete ? 'Lesson 1 complete! Take a practice test or revisit the mission.' : done ?
    'The science fair is open. Finish the lesson with a vocabulary test.' :
    'The science fair is about to open. The west window is still leaking. Head into the science wing.';
  resetTranslation($('#intro-en'), $('#intro-translation'), english);
}

$('#start').addEventListener('click', () => {
  if (state.finalPassed) replayMission();
  else if (state.finalStarted) void openLessonTest('final');
  else if (state.phonePicked) begin();
  else beginWithComic();
});
$('#practice-test').addEventListener('click', () => void openLessonTest('practice'));
$('#home-book').addEventListener('click', showBook);
$('#replay-intro').addEventListener('click', beginWithComic);
updateTitle();

function prepareRoom() {
  roomRequest ??= Promise.all([import('./engine.js'), import('./world.js')]).then(async ([{ createEngine }, { createWorld }]) => {
    const room = createEngine({
      canvas, worldFactory: createWorld, reducedMotion: motion,
      onTarget: updateTarget,
      onInteract: useObject,
      onMove({ distance }) {
        footstepDistance += distance;
        if (footstepDistance >= .72) {
          footstepDistance %= .72;
          audio.cue('step');
        }
        if (!started || state.tutorialDone || tutorialIndex !== 0) return;
        walked += distance;
        if (walked > .85) {
          tutorialIndex = 1;
          audio.cue('dew');
          objective();
        }
      },
      onLook({ dx, dy }) {
        if (!started || state.tutorialDone || tutorialIndex !== 1) return;
        turned += Math.abs(dx) + Math.abs(dy);
        if (turned > 92) {
          tutorialIndex = 2;
          objective();
        }
      },
      onStatus({ type, message }) {
        if (type === 'unsupported') {
          unavailable = true;
          $('#start').disabled = true;
          $('#start-status').textContent = message;
        } else if (type === 'contextlost' || type === 'contextrestored') {
          response(message, type === 'contextlost' ? 'The 3D view paused while graphics recover.' : 'The 3D view has recovered.');
        }
      },
    });
    await room.ready;
    engine = room;
    if (!unavailable) worldState();
  }).catch(() => {
    roomRequest = null;
  });
  return roomRequest;
}
