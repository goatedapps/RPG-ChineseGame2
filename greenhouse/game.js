import { vocabularyList } from '../shared/vocabulary.js';
import { createClueReader, dictationButton, speakerButton } from '../shared/speaker.js?v=clue-audio';
import { markLessonComplete } from '../shared/lesson-progress.js';
import { missions, objects, tutorial } from './story.js?v=encounter-cues';
import { lexicon, practiceBank } from './lexicon.js';
import { createVoice } from './voice.js?v=clue-audio';
import { createWriting } from './writing.js';
import { createGreenhouseAudio } from './sounds.js?v=minigame-volume';
import { playComic } from './comic.js';
import { evidence } from './evidence.js?v=briefing-flow';
import { createPhone } from './phone.js?v=note-audio';
import { createDeveloperMode } from '../shared/developer-mode.js?v=numbered-tasks';
import { showSkippedFinal } from '../shared/skipped-final.js?v=developer-unlock';
import { bindJoystick } from '../shared/joystick.js';
import { openGameSettings } from '../shared/settings.js?v=direct-entry';
import { animatePhonePickup } from './phone-pickup.js';
import { phoneStory, noteReply, screenChecks, closingMessages, fieldHints, statusReplies } from './phone-story.js?v=encounter-cues';
import { loadLessonTest, restoreLessonTest } from './lesson-test.js';
import { prepareExhibit } from './minigames.js?v=root-login';
import { sealWindow } from './window-match.js?v=encounter-cues';
import { supportSeedling } from './seedling-shuffle.js?v=encounter-cues';
import { rootLogin } from './root-login.js?v=encounter-cues';

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
  [['产生'], ['柔弱'], ['埋', '扎根'], []],
  [['梦'], ['锻炼'], ['测验', '临时抱佛脚'], []],
  [['优雅', '懒惰', '榜样'], [], ['凭']],
  [['克服'], ['坚强', '意志', '不屈不挠']],
];

function emptySave() {
  return {
    introSeen: false, tutorialStep: 0, tutorialDone: false, briefingSeen: null,
    mission: 0, action: 0, phase: 'explore', wordIndex: 0, held: null, written: {},
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
      introSeen: data.introSeen === true || tutorialDone || data.phonePicked === true,
      tutorialStep: Number.isInteger(data.tutorialStep) ? Math.min(2, Math.max(0, data.tutorialStep)) : 0,
      briefingSeen: typeof data.briefingSeen === 'string' ? data.briefingSeen : null,
      mission: data.mission, action, phase, wordIndex, written,
      held: Object.hasOwn(objects, data.held) ? data.held : null,
      notePending: data.notePending === true && data.mission === 0 && action === 1 && phase === 'explore',
      noteAnswer: typeof data.noteAnswer === 'string' ? data.noteAnswer.slice(0, 180) : '',
      unlocked: unlocked.filter((id) => id === 'rootCam' || Object.hasOwn(screenChecks, id)),
      endingSeen, lessonComplete, finalStarted,
      finalPassed: finalStarted && lessonComplete && data.finalPassed === true,
      finalTest: data.finalTest ?? null,
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
let tutorialIndex = state.phonePicked ? 3 : state.tutorialStep;
let pickingPhone = false;
let walked = 0;
let turned = 0;
let footstepDistance = 0;
const effectsKey = 'greenhouse-sound-effects';
let effectsEnabled = storedAudio(effectsKey);
let musicEnabled = storedAudio(musicKey);
let currentTarget = null;
let cue = { cn: '', en: '' };
let hintTimer;
let activeHintKey;
let hintTarget;
let finalMessageOpen = false;
let activeTest = null;
let cleanup = () => {};
let afterClose = null;
let last = null;
let responseTimer;
let responseSpeech;
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
  panel,
  openPanel(title) {
    openPanel(null, title);
    desk.lang = 'en';
    panel.querySelector('.panel-top button').remove();
  },
  onClose: () => desk.close(),
  taskCount: missions.length,
  canJump: () => (started && !pickingPhone) || activeTest?.mode === 'final',
  currentTask: () => state.tutorialDone ? state.mission : -1,
  onJump: jumpToTask,
  onSkipDictation(enabled) {
    if (enabled && activeTest?.mode === 'final') {
      desk.close();
      activeTest.destroy?.();
      activeTest = null;
      void openLessonTest('final');
    } else if (enabled && state.notePending) {
      requestNoteReply(true);
      objective(false);
    } else if (enabled && state.phase === 'dictation') {
      moveToHandover(missions[state.mission]);
      save();
      syncPhoneActivity();
    }
  },
});

function storedAudio(key) {
  try {
    return localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

function startAudio() {
  audio.start();
}

function setMusicPreference(enabled) {
  musicEnabled = enabled;
  audio.setMusicEnabled(enabled);
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

function animate(target, from, to, duration = .26) {
  const gsap = window.gsap;
  if (!gsap || motion.matches) return;
  gsap.fromTo(target, from, { ...to, duration, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity,visibility' });
}

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
const clueReader = createClueReader(voice);

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
  animate($('#cue-text'), { opacity: .25, y: 10 }, { opacity: 1, y: 0 }, .32);
  if (announce && !phone.isOpen) voice.speak(cue.cn);
}

function briefingKey() {
  if (!state.phonePicked || state.phase === 'done') return null;
  const mission = missions[state.mission];
  if (state.notePending) return 'note-question';
  if (state.phase === 'question') return 'check:' + mission.id;
  const target = state.phase === 'explore' && mission.actions[state.action]?.target;
  return target ? 'step:' + mission.id + ':' + target : null;
}

function waitingForBriefing() {
  const key = briefingKey();
  return Boolean(key && state.briefingSeen !== key);
}

function objective(announce = true) {
  const status = $('#mission-number');
  const title = $('#mission-name');
  if (!state.tutorialDone) {
    status.textContent = '操作练习 · ' + (tutorialIndex + 1) + ' / ' + tutorial.length;
    title.textContent = ['学会行走', '环顾四周', '拿起手机', '查看手机'][tutorialIndex];
    setCue(tutorial[tutorialIndex], announce);
  } else if (waitingForBriefing()) {
    status.textContent = '';
    title.textContent = '阿宁有新消息';
    setCue({ cn: '打开手机，先看看阿宁说了什么。' }, false);
  } else if (state.phase === 'done') {
    status.textContent = '六项任务已完成';
    title.textContent = '温室准备就绪';
    setCue(state.finalPassed ? { cn: '第一课已完成。' } : { cn: '查看阿宁的消息。', en: 'Read Ah Ning’s message.' }, announce);
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
  if (developerMode.skipDictation) {
    state.notePending = false;
    phone.setChallenge(null);
    sendStep(missions[0], state.action, notify);
    save();
    return;
  }
  sendMessage(noteReply.prompt, 'note-question', notify);
  phone.setChallenge({
    id: 'window-note',
    prompt: '回复阿宁',
    placeholder: '手写回复',
    characters: noteReply.characters,
    onWritten() { audio.cue('correct'); },
    onSuccess(answer) {
      audio.cue('relay');
      state.notePending = false;
      state.noteAnswer = answer.slice(0, 180);
      save();
      sendStep(missions[0], state.action, false);
      objective(false);
    },
  }, { notify: false });
}

function restorePhone() {
  const unreadKey = waitingForBriefing() ? briefingKey() : null;
  missions.slice(0, state.mission + 1).forEach((mission, index) => {
    const story = phoneStory[mission.id];
    const finished = index < state.mission;
    const completed = finished ? mission.actions.length : state.action;
    const visibleSteps = Math.min(mission.actions.length, completed + 1);
    for (let step = 0; step < visibleSteps; step += 1) {
      if (mission.actions[step - 1]?.target === 'westNote') {
        if (state.notePending) {
          requestNoteReply(unreadKey === 'note-question');
          break;
        }
        sendMessage(noteReply.prompt, 'note-question', false);
        if (state.noteAnswer) sendMessage(state.noteAnswer, 'note-answer', false, 'outgoing');
      }
      const key = 'step:' + mission.id + ':' + mission.actions[step].target;
      sendStep(mission, step, key === unreadKey);
    }
    if (completed === mission.actions.length) {
      const key = 'check:' + mission.id;
      sendMessage(story.checkpoint, key, key === unreadKey);
    }
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
  if (state.phase === 'dictation' && developerMode.skipDictation) {
    moveToHandover(mission);
    save();
  }
  const actions = {
    question: ['打开检查记录', '记录你的发现。'],
    dictation: ['继续听写', '接着写完检查记录。'],
    handover: ['提交交接记录', '把检查结果交给阿宁。'],
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
    hideResponse();
    if (state.phonePicked && tutorialIndex === 3 && !state.tutorialDone) {
      state.tutorialDone = true;
      save();
      objective(false);
    }
  } else if (finalMessageOpen) {
    finalMessageOpen = false;
    void openLessonTest('final');
    return;
  } else if (!desk.open && $('#comic-overlay').hidden) {
    engine?.setActive(true);
    if (waitingForBriefing()) {
      state.briefingSeen = briefingKey();
      save();
      objective();
    }
  }
  updateInterface();
}

function resetHint() {
  const target = state.notePending ? 'westNote' : nextObject();
  const key = started && state.tutorialDone && !waitingForBriefing() && target
    ? `${state.mission}:${state.action}:${target}` : null;
  if (key === activeHintKey) return;
  activeHintKey = key;
  clearTimeout(hintTimer);
  hintTarget = null;
  phone.setHint(key ? {
    id: key,
    text: state.notePending
      ? 'Read the first four Chinese characters on the note. They tell you when the window leaks.'
      : fieldHints[target],
    onLocate() {
      if (key !== activeHintKey) return;
      hintTarget = target;
      worldState();
    },
  } : null);
  if (!key) return;

  function offerHint() {
    if (key !== activeHintKey) return;
    if (document.hidden || phone.isOpen || desk.open) {
      hintTimer = setTimeout(offerHint, 5000);
      return;
    }
    phone.remindAboutHint();
  }
  hintTimer = setTimeout(offerHint, hintDelay);
}

function hideResponse() {
  $('#response').hidden = true;
  responseSpeech?.stop();
  responseSpeech?.button.remove();
  responseSpeech = undefined;
}

function response(cn, clue = false) {
  const toast = $('#response');
  clearTimeout(responseTimer);
  hideResponse();
  $('#response-text').textContent = cn;
  toast.hidden = desk.open;
  if (clue && !toast.hidden) {
    responseSpeech = clueReader('object:' + cn, cn);
    toast.append(responseSpeech.button);
    responseSpeech.reveal();
  }
  animate(toast, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });
  responseTimer = window.setTimeout(hideResponse, 10500);
}

function nextObject() {
  if (waitingForBriefing()) return null;
  if (!state.tutorialDone) return tutorialIndex === 2 && !state.phonePicked ? 'radio' : null;
  return state.phase === 'explore' && !state.notePending ? missions[state.mission].actions[state.action].target : null;
}

function updateTarget(target) {
  currentTarget = target;
  const known = target && objects[target.id];
  const canInteract = !!known && started && !desk.open && !phone.isOpen && !pickingPhone && !waitingForBriefing();
  reticle.classList.toggle('targeted', canInteract);
  interact.hidden = !canInteract;
  if (!canInteract) return;
  const correct = target.id === nextObject();
  const action = correct ? (state.tutorialDone ? missions[state.mission].actions[state.action].action : 'pickup') : 'inspect';
  const verb = actions[action];
  interact.querySelector('span').textContent = verb + ' · ' + known.cn;
}

function useObject(target) {
  if (!target || !started || desk.open || phone.isOpen || pickingPhone || waitingForBriefing() || !objects[target.id]) return;
  const thing = objects[target.id];
  if (target.id === 'radio') {
    if (target.id === nextObject()) takePhone();
    return;
  }
  if (target.id === nextObject()) {
    const current = missions[state.mission]?.actions[state.action];
    const game = {
      westWindow: (play, finish) => sealWindow(
        missions[state.mission].dictation.map(({ word }) => ({ word, meaning: lexicon[word].en })), play, finish,
      ),
      weakPlant: supportSeedling,
      exhibitStand: current?.action === 'place' ? prepareExhibit : undefined,
    }[target.id];
    if (game) {
      playCloseup(game, () => completeObject(target, true));
      return;
    }
  }
  if (evidence[target.id]) {
    inspectEvidence(target, target.id === nextObject() ? () => completeObject(target, true) : null);
    return;
  }
  if (target.id !== nextObject()) {
    if (target.id === 'westWindow' && state.mission === 0 && state.action === 0) {
      response('窗框在滴水。窗台上压着一张纸。', true);
    } else {
      response(thing.descriptionCN, true);
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
  if (target.id === 'soilPot') response(action.resultCN, true);
  else hideResponse();
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
  audio.setMinigame(content.classList.contains('minigame'));
  desk.lang = 'zh-Hans';
  delete desk.dataset.practice;
  desk.classList.toggle('artifact-inspection', inspection);
  panel.replaceChildren(content);
  if (!desk.open) {
    engine?.setActive(false);
    desk.showModal();
    hideResponse();
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
  if (document.elementFromPoint(event.clientX, event.clientY) === desk) {
    voice.stop();
    desk.close();
  }
});
desk.addEventListener('cancel', () => voice.stop());

desk.addEventListener('pointercancel', (event) => {
  if (event.pointerId === backdropPointer) backdropPointer = null;
});

desk.addEventListener('close', () => {
  if (desk.open) return;
  audio.setMinigame(false);
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

function playCloseup(build, next, showResult) {
  const game = build(audio.cue, (stillOpen) => {
    if (stillOpen && showResult) showResult();
    else if (stillOpen) {
      afterClose = next;
      desk.close();
    } else next();
  });
  afterClose = null;
  presentPanel(game.root, game.focusTarget, true);
  game.activate?.();
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
  const clue = clueReader(id, item.lines.map(([chinese]) => chinese).join(''));
  content.append(clue.button);
  sheet.append(content);
  presentPanel(sheet, sheet, true);
  clue.reveal();
  afterClose = next;
  audio.cue(monitor ? 'relay' : 'paper');
  const enter = monitor ? { opacity: 0, scale: .91 } : {
    opacity: 0, transformPerspective: 900, rotationX: item.kind === 'note' ? -70 : -35, scaleY: .73, y: 18,
  };
  animate(sheet, enter, { opacity: 1, scale: 1, scaleY: 1, rotationX: 0, y: 0 }, .44);
}

function inspectEvidence(target, next) {
  const { id } = target;
  if (id === 'rootCam' && next) {
    const words = missions[state.mission].dictation.map(({ word }) => ({ word, pinyin: lexicon[word].pinyin }));
    function unlock() {
      if (state.unlocked.includes(id)) return;
      state.unlocked.push(id);
      save();
      worldState();
    }
    playCloseup(
      (play, finish) => rootLogin(words, play, finish),
      () => { unlock(); next(); },
      () => { unlock(); showEvidence(id, next); },
    );
    return;
  }
  if (id === 'rootCam' && state.mission <= 2 && !state.unlocked.includes(id)) {
    response('根系观察仪还没解锁。先安顿好幼苗。');
    return;
  }
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
  const controls = row(dictationButton(voice, item.cn, undefined, { autoplay: true }));
  if (context?.cn && !item.image) {
    const note = node('div', '', 'clue-note');
    const playback = clueReader('review:' + context.cn, context.cn);
    const clue = makeButton('回看线索', 'text-button', () => {
      note.hidden = !note.hidden;
      clue.setAttribute('aria-expanded', String(!note.hidden));
      if (note.hidden) playback.stop();
      else playback.reveal();
    });
    clue.setAttribute('aria-expanded', 'false');
    note.hidden = true;
    note.append(node('p', context.cn), playback.button);
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

function showWord(entry, label, complete, guided = false) {
  openPanel(label, guided ? '练写' : '听写', 'writing');
  const layout = node('div', '', 'dictation-layout');
  const directions = node('div', '', 'dictation-directions');
  directions.append(sentenceWithGap(entry.sentence, entry.word));
  if (!guided && entry.instructionCN) directions.append(node('p', entry.instructionCN, 'minor'));
  if (guided) directions.append(node('p', entry.word + ' · ' + lexicon[entry.word].pinyin, 'ink-word'));
  const spoken = entry.spokenTarget ?? entry.word + '。';
  const audioLine = entry.sentence + ' 要写的是：' + spoken;
  const buttons = buttonRow(dictationButton(voice, audioLine));
  directions.append(buttons);
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
    helper.append(makeButton('看字练写', 'text-button', () => showWord(entry, label, complete, true)));
  }
  cleanup = createWriting(grid, entry.word, guided, () => {
    audio.cue('correct');
    const next = complete(guided);
    status.textContent = guided ? '已完成描写练习。' : '已写好。';
    helper.replaceChildren(makeButton(next.label, 'primary', next.run));
    helper.firstElementChild.focus();
  }, () => {
    status.textContent = '书写格未能载入。请再试一次。';
    helper.append(makeButton('重新载入书写格', 'text-button', () => showWord(entry, label, complete, guided)));
  }, () => {
    status.textContent = guided ? '再试一笔。也可以看看亮起的笔画。' : '这一笔的位置或笔顺不对，请再试。';
  }, (completed) => {
    status.textContent = '';
    updateProgress(completed);
  });
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
    }, { cn: mission.actions.at(-1).resultCN });
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

function returnMap() {
  location.assign('./?level=p6');
}

async function openLessonTest(mode) {
  const final = mode === 'final';
  if (activeTest || (final ? !state.endingSeen || state.finalPassed : !state.lessonComplete)) return;
  const run = { mode };
  activeTest = run;
  const slot = final ? 'finalTest' : 'practiceTest';
  if (final && !state.finalStarted) {
    state.finalStarted = true;
    save();
  }
  suspendRoom();
  $('#splash').hidden = true;
  testScreen.hidden = false;
  if (final && developerMode.skipDictation) {
    showSkippedFinal(testScreen, {
      cardClass: 'lesson-test-sheet', headingId: 'lesson-test-title', onExit: returnMap,
      onResume() {
        developerMode.setSkipDictation(false);
        activeTest = null;
        void openLessonTest(mode);
      },
      onDeveloper: developerMode.open,
    });
    return;
  }
  const loading = node('div', '', 'lesson-test-loading');
  const status = node('p', '正在准备测验……');
  status.setAttribute('role', 'status');
  const home = makeButton('返回星图', 'text-button', returnMap);
  loading.append(status, home);
  testScreen.replaceChildren(loading);
  home.focus({ preventScroll: true });

  try {
    const [bank, { createLessonTestView }] = await Promise.all([
      loadLessonTest(), import('./lesson-test-view.js?v=numbered-tasks'),
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
          markLessonComplete('p6', 1);
        }
        state[slot] = null;
        save();
      },
      onExit: returnMap,
      onReplay: final ? confirmReplay : undefined,
      onDeveloper: final ? developerMode.open : undefined,
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
  row(makeButton('练习题库', 'primary', () => showBank(0, 0)));
  panel.append(node('p', `已发现 ${known.size} / ${entries.length} 个词语。`, 'body'));
  voiceMessage();
  const { list, examples } = vocabularyList(entries, known, (entry) => {
    const { word } = entry;
    const data = lexicon[word];
    const speak = speakerButton(() => voice.speak(data.spoken ?? word), '听' + word + '的发音');
    const review = makeButton('写', 'icon-button', () => {
      showWord(entry, '词语复习', (guided) => {
        record(word, guided);
        return { label: '返回词语手册', run: showBook };
      });
    }, '复习' + word + '的听写');
    return {
      pinyin: data.pinyin,
      meaning: data.cn,
      reminder: state.written[word] === 'guided' ? '可再试听写' : '',
      controls: [speak, review],
    };
  });
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
        try {
          localStorage.setItem(effectsKey, enabled ? 'on' : 'off');
        } catch {}
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
    onHome: returnMap,
    lessonActions: [
      { label: '重玩任务', run: confirmReplay },
      ...(state.phase !== 'done' ? [{ label: '重看序幕', run: () => {
        afterClose = () => {
          suspendRoom();
          beginWithComic();
        };
        desk.close();
      } }] : []),
      ...(state.lessonComplete ? [{ label: '温习测验', run: () => {
        afterClose = () => { void openLessonTest('practice'); };
        desk.close();
      } }] : []),
    ],
  });
}

const taskCheckpoints = [
  { x: -8.6, z: -2.9, yaw: .49, pitch: -.22 },
  { x: 4.05, z: 7.3, pitch: -.23 },
  { x: -7.4, z: -4.05, pitch: -.23 },
  { x: -8.67, z: 5.25, pitch: -.23 },
  { x: 2.45, z: -6.55, pitch: -.25 },
  { x: 5.68, z: -3.65, pitch: -.2 },
];

function jumpToTask(mission) {
  activeTest?.destroy?.();
  activeTest = null;
  testScreen.hidden = true;
  Object.assign(state, {
    mission, action: 0, phase: 'explore', wordIndex: 0, held: null, notePending: false, briefingSeen: null,
    introSeen: true, tutorialDone: true, phonePicked: true, endingSeen: false, finalStarted: false, finalPassed: false,
  });
  phone.reset();
  afterClose = null;
  last = null;
  save();
  desk.close();
  const spawn = taskCheckpoints[mission];
  if (!started) begin(spawn);
  else {
    engine.reset(spawn);
    phone.setVisible(true);
    restorePhone();
    objective();
  }
}

function confirmReplay() {
  if (state.finalPassed) {
    replayMission();
    return;
  }
  openPanel(null, '要重玩任务吗？');
  panel.append(
    node('p', '这次的任务和课末测试进度将清除。你将从序幕重新开始。', 'body'),
    buttonRow(
      makeButton('保留进度', 'text-button', () => desk.close()),
      makeButton('确认重玩', 'primary', replayMission),
    ),
  );
}

function replayMission() {
  activeTest?.destroy?.();
  activeTest = null;
  testScreen.hidden = true;
  testScreen.replaceChildren();
  afterClose = null;
  if (desk.open) desk.close();
  suspendRoom();
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

function showEntryError() {
  $('#splash').hidden = false;
  $('#start-status').textContent = '科学楼未能载入。请重试。';
  $('#retry-entry').hidden = false;
}

function begin(spawn) {
  if (started) return;
  if (unavailable) {
    showEntryError();
    return;
  }
  if (!engine) {
    $('#splash').hidden = false;
    $('#start-status').textContent = '正在准备科学楼……';
    void prepareRoom().then(() => {
      if (engine && !unavailable) begin(spawn);
      else showEntryError();
    });
    return;
  }
  $('#start-status').textContent = '';
  if (spawn) engine.reset(spawn);
  started = true;
  audio.setMusic('game');
  audio.setAmbience(true);
  audio.prepareGameplay();
  $('#splash').hidden = true;
  $('#toolbar').hidden = false;
  $('#mission-ui').hidden = false;
  $('#play-controls').hidden = false;
  phone.setVisible(state.phonePicked);
  if (state.tutorialDone) restorePhone();
  else if (state.phonePicked) sendStep(missions[0], 0);
  engine.show();
  engine.setActive(true);
  engine.focus(state.phase === 'explore' && !state.notePending && !waitingForBriefing());
  objective(state.phase !== 'done');
  if (state.phase === 'done' && !state.finalPassed) {
    if (state.endingSeen) openFinalMessage();
    else showFinale();
  }
}

bindJoystick($('#joystick'), (x, forward) => engine?.setVector(x, forward));

function beginWithComic() {
  if (started || !$('#comic-overlay').hidden) return;
  if (unavailable) {
    showEntryError();
    return;
  }
  $('#splash').hidden = true;
  audio.setMusic('comic');
  void prepareRoom();
  playComic($('#comic-overlay'), () => {
    if (!state.introSeen) {
      state.introSeen = true;
      save();
    }
    begin();
  }, {
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
document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button');
  if (button && !button.matches('.comic-hit,#interact,.choice,.seedling-shell,.root-login-enter')) audio.cue('ui');
}, true);

$('#retry-entry').onclick = () => location.reload();
if (state.finalStarted && !state.finalPassed) void openLessonTest('final');
else if (state.introSeen) begin();
else beginWithComic();

function prepareRoom() {
  roomRequest ??= Promise.all([import('./engine.js?v=desktop-pointer'), import('./world.js')]).then(async ([{ createEngine }, { createWorld }]) => {
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
          state.tutorialStep = 1;
          save();
          audio.cue('dew');
          objective();
        }
      },
      onLook({ dx, dy }) {
        if (!started || state.tutorialDone || tutorialIndex !== 1) return;
        turned += Math.abs(dx) + Math.abs(dy);
        if (turned > 92) {
          tutorialIndex = 2;
          state.tutorialStep = 2;
          save();
          objective();
        }
      },
      onStatus({ type, message }) {
        if (type === 'unsupported') {
          unavailable = true;
          showEntryError();
        } else if (type === 'contextlost' || type === 'contextrestored') {
          response(message);
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
