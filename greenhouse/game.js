import { createEngine } from './engine.js';
import { createWorld } from './world.js';
import { missions, objects, tutorial } from './story.js';
import { lexicon, practiceBank } from './lexicon.js';
import { createVoice } from './voice.js';
import { createWriting } from './writing.js';
import { createAudio } from '../stage/audio.js';

const $ = (selector) => document.querySelector(selector);
const canvas = $('#scene');
const desk = $('#workbench');
const panel = $('#panel');
const reticle = $('#reticle');
const interact = $('#interact');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createAudio();
const entries = missions.flatMap((mission) => mission.dictation);
const lessonWords = new Set(entries.map(({ word }) => word));
const storageKey = 'greenhouse-p6-lesson1-v1';
const actions = { inspect: '查看', pickup: '拿起', use: '使用', place: '摆放' };
const roomNames = {
  radio: '准备室', westWindow: '温室', eastWindow: '温室', seal: '储藏室',
  brightLamp: '储藏室', deskLamp: '储藏室', vividTape: '储藏室', tray: '储藏室',
  weakPlant: '温室', sturdyPlant: '温室', fan: '温室', seedJar: '温室', soilPot: '温室', rootCam: '温室',
  diary: '准备室', exerciseLog: '准备室', testSheet: '准备室', rehearsalTape: '准备室',
  rehearsalScreen: '展览室', backupNotes: '展览室', exhibitStand: '展览室', handoverDesk: '展览室',
};
const englishRooms = { 准备室: 'prep room', 储藏室: 'storeroom', 温室: 'greenhouse', 展览室: 'exhibition room' };
const actionWords = [
  [['每逢', '暴雨', '恶劣', '缝'], [], []],
  [['耀眼'], ['鲜艳'], ['严格', '托']],
  [['产生'], ['柔弱'], ['埋'], ['扎根']],
  [['梦'], ['锻炼'], ['测验', '临时抱佛脚'], []],
  [['优雅', '懒惰', '榜样'], [], ['凭']],
  [['克服'], ['坚强', '意志', '不屈不挠']],
];

function emptySave() {
  return { tutorialDone: false, mission: 0, action: 0, phase: 'explore', wordIndex: 0, held: null, written: {} };
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
    return {
      tutorialDone: data.tutorialDone === true || phase !== 'explore' || data.mission > 0 || action > 0,
      mission: data.mission, action, phase, wordIndex, written,
      held: Object.hasOwn(objects, data.held) ? data.held : null,
    };
  } catch {
    return emptySave();
  }
}

let state = load();
let engine;
let started = false;
let unavailable = false;
let tutorialIndex = 0;
let walked = 0;
let turned = 0;
let currentTarget = null;
let cue = { cn: '', en: '' };
let cleanup = () => {};
let afterClose = null;
let last = null;
let responseTimer;
let voiceTween;
let panelVoiceStatus;

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

function resetTranslation(button, body, text) {
  body.textContent = text;
  body.hidden = true;
  button.hidden = !text;
  button.setAttribute('aria-expanded', 'false');
}

function connectTranslation(button, body) {
  button.addEventListener('click', () => {
    body.hidden = !body.hidden;
    button.setAttribute('aria-expanded', String(!body.hidden));
    if (!body.hidden) animate(body, { opacity: 0, y: -4 }, { opacity: 1, y: 0 }, .18);
  });
}

function translation(text) {
  const block = node('p', text, 'translation');
  block.lang = 'en';
  block.hidden = true;
  block.dataset.translation = '';
  const control = makeButton('?', 'icon-button', () => {}, '英文翻译');
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
  const active = !state.tutorialDone && tutorialIndex === 2 ? 'radio'
    : (state.tutorialDone && state.phase === 'explore' ? missions[state.mission].actions[state.action].target : null);
  engine?.setGameState({
    completed: state.mission, mission: state.mission, action: state.action,
    used: new Set([...(state.tutorialDone ? ['radio'] : []), ...moves.map(({ target }) => target)]),
    held: state.held, last, activeTargets: new Set(active ? [active] : []), reducedMotion: motion.matches,
  });
}

function updateInterface() {
  const wordCount = $('#word-count');
  const counter = discovered().size + ' / ' + entries.length;
  if (wordCount.textContent !== counter) animate(wordCount, { scale: 1.22 }, { scale: 1 });
  wordCount.textContent = counter;
  $('#held').hidden = !state.held;
  $('#held').textContent = state.held ? '手上 · ' + objects[state.held].cn : '';
  $('#resume-task').hidden = !state.tutorialDone || !['question', 'dictation', 'handover'].includes(state.phase);
  reticle.hidden = !started || desk.open;
  updateTarget(currentTarget);
  worldState();
}

function setCue({ cn, en }, announce = true, prefix = '') {
  cue = { cn, en, prefix };
  $('#cue-text').textContent = cn;
  resetTranslation($('#cue-en'), $('#cue-translation'), en);
  animate($('#cue-text'), { opacity: .25, y: -3 }, { opacity: 1, y: 0 });
  if (announce) voice.speak(prefix ? prefix + ' ' + cn : cn);
}

function objective(announce = true, briefing = false, previous = '') {
  const status = $('#mission-number');
  const title = $('#mission-name');
  if (!state.tutorialDone) {
    status.textContent = '操作练习 · ' + (tutorialIndex + 1) + ' / 3';
    title.textContent = ['学会行走', '环顾四周', '拿起对讲机'][tutorialIndex];
    setCue(tutorial[tutorialIndex], announce, previous);
  } else if (state.phase === 'done') {
    status.textContent = '六项任务已完成';
    title.textContent = '温室准备就绪';
    setCue({ cn: '展览室已经布置好。你可以继续参观，或打开词语手册复习。', en: 'The exhibition room is ready. Keep exploring or open the vocabulary notebook to review.' }, announce);
  } else {
    const mission = missions[state.mission];
    status.textContent = '任务 ' + (state.mission + 1) + ' / ' + missions.length;
    title.textContent = mission.titleCN;
    if (state.phase === 'explore') {
      const action = mission.actions[state.action];
      setCue(briefing ? { cn: mission.cn + ' ' + action.cn, en: mission.en + ' ' + action.en } : action, announce, previous);
    } else {
      setCue({ cn: '打开交接记录，完成这一项任务的理解题和听写。', en: 'Open the handover notes to finish this task’s question and dictation.' }, announce);
    }
  }
  $('#nudge').hidden = state.phase !== 'explore';
  updateInterface();
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
  if (!state.tutorialDone) return tutorialIndex === 2 ? 'radio' : null;
  return state.phase === 'explore' ? missions[state.mission].actions[state.action].target : null;
}

function updateTarget(target) {
  currentTarget = target;
  const known = target && objects[target.id];
  const canInteract = !!known && started && !desk.open;
  reticle.classList.toggle('targeted', canInteract);
  interact.hidden = !canInteract;
  if (!canInteract) return;
  const correct = target.id === nextObject();
  const action = correct && state.tutorialDone ? missions[state.mission].actions[state.action].action : 'inspect';
  const verb = !state.tutorialDone && correct ? '拿起' : actions[action];
  interact.querySelector('span').textContent = verb + ' · ' + known.cn;
}

function useObject(target) {
  if (!target || !started || desk.open || !objects[target.id]) return;
  const thing = objects[target.id];
  if (target.id !== nextObject()) {
    response(thing.descriptionCN, thing.descriptionEN);
    audio.cue('dew');
    return;
  }
  if (!state.tutorialDone) {
    last = { id: 'radio', action: 'pickup' };
    state.tutorialDone = true;
    save();
    audio.cue('dew');
    response('对讲机已接通。', 'The radio is connected.');
    objective(true, true);
    return;
  }
  const mission = missions[state.mission];
  const action = mission.actions[state.action];
  last = { id: target.id, action: action.action, mission: state.mission, step: state.action };
  if (action.action === 'pickup') state.held = target.id;
  if (action.action === 'place' || (target.id === 'westWindow' && action.action === 'use') || target.id === 'rehearsalScreen') state.held = null;
  if (target.id === 'weakPlant') state.held = 'weakPlant';
  state.action += 1;
  if (state.action >= mission.actions.length) {
    state.phase = 'question';
    save();
    audio.cue('relay');
    objective(false);
    openTask({ cn: action.resultCN, en: action.resultEN });
    return;
  }
  save();
  audio.cue(action.action === 'pickup' ? 'dew' : 'correct');
  response(action.resultCN, action.resultEN);
  objective(true, false, action.resultCN);
}

function clearPanel() {
  cleanup();
  cleanup = () => {};
  panelVoiceStatus = null;
  voice.stop();
}

function openPanel(label, title) {
  clearPanel();
  const top = node('div', '', 'panel-top');
  top.append(node('p', label, 'label'), makeButton('×', 'icon-button', () => desk.close(), '返回场景'));
  const heading = node('h2', title);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  panel.replaceChildren(top, heading);
  const opened = !desk.open;
  if (opened) {
    engine?.setActive(false);
    desk.showModal();
    $('#response').hidden = true;
    reticle.hidden = true;
    interact.hidden = true;
    animate(desk, { opacity: 0, y: 13 }, { opacity: 1, y: 0 });
  }
  desk.scrollTop = 0;
  heading.focus({ preventScroll: true });
  return { top, heading };
}

desk.addEventListener('close', () => {
  if (desk.open) return;
  clearPanel();
  if (started) {
    engine?.setActive(true);
    engine?.focus(false);
  }
  updateInterface();
  const next = afterClose;
  afterClose = null;
  next?.();
});

function voiceMessage() {
  panelVoiceStatus = node('p', '', 'voice-status');
  panelVoiceStatus.setAttribute('role', 'status');
  panelVoiceStatus.hidden = true;
  panel.append(panelVoiceStatus);
}

function row(...buttons) {
  const controls = node('div', '', 'button-row');
  controls.append(...buttons);
  panel.append(controls);
  return controls;
}

function addTranslation(parent, english) {
  if (!english) return;
  const { control, block } = translation(english);
  parent.append(control);
  panel.append(block);
}

function showQuestion(item, label, onNext, context) {
  openPanel(label, '读懂线索');
  const english = [context?.en, item.en, ...item.choices.map((choice, i) => (i + 1) + '. ' + choice.en)].filter(Boolean).join('\n');
  const support = translation(english);
  row(makeButton('重听提问', 'text-button', () => voice.speak(item.cn)), support.control);
  panel.append(support.block);
  if (context?.cn) panel.append(node('p', context.cn, 'clue-note'));
  panel.append(node('p', item.cn, 'body'));
  const choices = node('div', '', 'choices');
  const feedback = node('p', '', 'feedback');
  feedback.setAttribute('role', 'status');
  let correct = false;
  for (const [index, choice] of item.choices.entries()) {
    const option = makeButton((index + 1) + '. ' + choice.cn, 'choice', () => {
      if (correct) return;
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
    choices.append(option);
  }
  panel.append(choices, feedback);
  voiceMessage();
  voice.speak([context?.cn, item.cn].filter(Boolean).join(' '));
}

function showWord(entry, label, complete, guided = false, announce = true) {
  openPanel(label, guided ? '照着笔顺练习' : '听写记录');
  const guide = guided ? '按笔顺书写。每写完一个字，下一格会亮起。'
    : (entry.instructionCN ?? '先听一句话，再听要写的词语。请按笔顺把它写在方格里。');
  const guideEN = guided ? 'Write in stroke order. The next square lights up when a character is complete.'
    : (entry.instructionEN ?? 'Listen to the sentence and then the target word. Write it in stroke order.');
  panel.append(node('p', guide, 'body'));
  if (guided) panel.append(node('p', entry.word + ' · ' + lexicon[entry.word].pinyin, 'ink-word'));
  const spoken = entry.spokenTarget ?? entry.word + '。';
  const audioLine = entry.sentence + ' 要写的是：' + spoken;
  const play = (slow) => voice.speak(audioLine, slow ? .68 : .85);
  const buttons = row(makeButton('播放听写', 'primary', () => play(false)),
    makeButton('慢速播放', 'text-button', () => play(true)));
  addTranslation(buttons, guideEN + (entry.en ? '\n句意 / Sentence: ' + entry.en : ''));
  voiceMessage();
  const grid = node('div', '', 'writing-grid');
  const status = node('p', '', 'feedback');
  status.setAttribute('role', 'status');
  panel.append(grid, status);
  const helper = row();
  if (!guided) {
    helper.append(makeButton('显示词语，先练习', 'text-button', () => showWord(entry, label, complete, true, false)));
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
  });
  if (announce) play(false);
}

function record(word, guided) {
  const mode = guided ? 'guided' : 'independent';
  if (state.written[word] !== 'independent') state.written[word] = mode;
  save();
}

function openTask(context) {
  const mission = missions[state.mission];
  if (!mission) return showEnding();
  if (state.phase === 'question') {
    showQuestion(mission.question, '任务交接 · ' + mission.titleCN, () => {
      state.phase = 'dictation';
      save();
      return { label: '开始听写', run: openTask };
    }, context ?? { cn: mission.actions.at(-1).resultCN, en: mission.actions.at(-1).resultEN });
  } else if (state.phase === 'dictation') {
    const entry = mission.dictation[state.wordIndex];
    showWord(entry, mission.titleCN + ' · 听写 ' + (state.wordIndex + 1) + ' / ' + mission.dictation.length, (guided) => {
      record(entry.word, guided);
      state.wordIndex += 1;
      if (state.wordIndex === mission.dictation.length) state.phase = 'handover';
      save();
      return { label: state.phase === 'handover' ? '完成交接' : '下一个词', run: openTask };
    });
  } else if (state.phase === 'handover') {
    finishMission();
  }
}

function finishMission() {
  state.mission += 1;
  state.action = 0;
  state.wordIndex = 0;
  state.phase = state.mission === missions.length ? 'done' : 'explore';
  state.held = null;
  save();
  worldState();
  audio.cue(state.phase === 'done' ? 'finish' : 'relay');
  if (state.phase === 'done') {
    objective(false);
    showEnding();
    return;
  }
  if (desk.open) {
    afterClose = () => objective(true, true);
    desk.close();
  } else {
    objective(true, true);
  }
}

function showEnding() {
  openPanel('六年级 · 第一课', '温室准备就绪');
  panel.append(node('p', '窗缝堵好了，幼苗也到了安全的地方。明天来参观的同学可以看到完整的科学展。', 'body'));
  const guided = Object.values(state.written).filter((value) => value === 'guided').length;
  panel.append(node('p', guided ? `24 个词已收录。其中 ${guided} 个用过描写提示，可以在手册中再试听写。` : '24 个词都已收录。回到词语手册，可以重听和复习。', 'body'));
  const controls = row(makeButton('打开词语手册', 'primary', showBook),
    makeButton('返回展览室', 'text-button', () => desk.close()),
    makeButton('重玩任务', 'text-button', replay));
  addTranslation(controls, 'The window is sealed, the seedling is safe, and the exhibit is ready for tomorrow. All 24 words are in your notebook.');
  voiceMessage();
  voice.speak('交接完成。窗缝堵好了，幼苗也到了安全的地方。科学展准备就绪！');
}

function showBook() {
  openPanel('六年级 · 第一课', '词语手册');
  const known = discovered();
  const controls = row(makeButton('练习题库', 'primary', () => showBank(0, 0)));
  addTranslation(controls, 'Vocabulary notebook. Entries appear as you discover them. Tap the speaker to hear a word or tap its question mark for its English meaning.');
  panel.append(node('p', `已发现 ${known.size} / ${entries.length} 个词语。点击发音按钮，听一听词语怎么念。`, 'body'));
  voiceMessage();
  const list = node('ol', '', 'vocab');
  for (const [index, entry] of entries.entries()) {
    const line = node('li');
    if (!known.has(entry.word)) {
      line.className = 'locked';
      line.append(node('strong', '待发现'), node('span', '第 ' + (index + 1) + ' 个词', 'vocab-note'));
    } else {
      const data = lexicon[entry.word];
      const term = node('strong', entry.word);
      term.append(node('span', data.pinyin, 'pinyin'));
      const definition = node('span', data.cn, 'definition');
      const buttons = node('span', '', 'row-buttons');
      const hint = translation(data.en);
      const speak = makeButton('◖))', 'icon-button', () => voice.speak(data.spoken ?? entry.word), '听' + entry.word + '的发音');
      const review = makeButton('写', 'icon-button', () => showWord(entry, '词语复习', (guided) => {
        record(entry.word, guided);
        return { label: '返回词语手册', run: showBook };
      }), '复习' + entry.word + '的听写');
      if (state.written[entry.word] === 'guided') definition.append(node('span', ' · 可再试听写', 'vocab-note'));
      hint.control.setAttribute('aria-label', entry.word + '的英文意思');
      buttons.append(speak, hint.control, review);
      line.append(term, definition, buttons, hint.block);
    }
    list.append(line);
  }
  panel.append(list);
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

function showHelp() {
  openPanel('科学楼', '操作帮助');
  const help = [
    '电脑：用 W、A、S、D 或方向键移动。点击场景后，用鼠标转向。也可以按住画面拖动。',
    '平板：用左下角摇杆行走，用手指拖动画面转向。对准物品后，点按出现的按钮。',
    '对准物品后按 E 互动。按 Esc 释放鼠标。按 P 打开词语手册，按 R 重听任务；任务旁的问号可以打开英文翻译。',
  ];
  help.forEach((line) => panel.append(node('p', line, 'body')));
  const controls = row(makeButton('返回科学楼', 'primary', () => desk.close()));
  if (state.phase === 'done') controls.append(makeButton('重玩任务', 'text-button', replay));
  addTranslation(controls, 'Desktop: use WASD or arrows, click the scene for mouse look, or click and drag. Tablet: move with the left joystick and drag the scene to look. Aim at objects and press E or tap the action button. Escape releases the mouse. P opens the notebook and R replays the current task. Question-mark buttons show English help.');
}

function replay() {
  state = { ...emptySave(), written: state.written };
  last = null;
  tutorialIndex = 0;
  walked = 0;
  turned = 0;
  engine?.reset();
  save();
  afterClose = () => objective(true);
  desk.close();
}

function nudge() {
  const id = nextObject();
  if (!id) {
    voice.speak(cue.cn);
    return;
  }
  const room = roomNames[id];
  const hint = '去' + room + '找找。把准星对准你想查看的物品。';
  response(hint, 'Look in the ' + englishRooms[room] + '. Aim the crosshair at the object you want to inspect.');
  voice.speak(hint);
}

function replayCue() {
  voice.speak([cue.prefix, cue.cn].filter(Boolean).join(' '));
}

$('#replay-cue').addEventListener('click', replayCue);
$('#nudge').addEventListener('click', nudge);
$('#book').addEventListener('click', showBook);
$('#help').addEventListener('click', showHelp);
$('#resume-task').addEventListener('click', () => openTask());
interact.addEventListener('click', () => engine?.interact());
window.addEventListener('keydown', (event) => {
  if (!started || desk.open || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'KeyP') showBook();
  if (event.code === 'KeyR') replayCue();
});

function begin() {
  if (unavailable || !engine || started) return;
  started = true;
  audio.setEnabled(true);
  audio.setAmbience(true);
  $('#splash').hidden = true;
  $('#toolbar').hidden = false;
  $('#mission-ui').hidden = false;
  $('#play-controls').hidden = false;
  engine.setActive(true);
  engine.focus(true);
  objective(true, true);
  if (state.phase === 'done') showEnding();
}

const joystick = $('#joystick');
let stickOwner;

function moveStick(event) {
  if (stickOwner !== event.pointerId) return;
  const bounds = joystick.getBoundingClientRect();
  let x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * .38);
  let y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height * .38);
  const length = Math.max(1, Math.hypot(x, y));
  x /= length;
  y /= length;
  joystick.style.setProperty('--stick-x', x * bounds.width * .29 + 'px');
  joystick.style.setProperty('--stick-y', y * bounds.height * .29 + 'px');
  engine?.setVector(x, -y);
}

joystick.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (stickOwner !== undefined) return;
  stickOwner = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  moveStick(event);
});
joystick.addEventListener('pointermove', moveStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  joystick.addEventListener(type, (event) => {
    if (stickOwner !== event.pointerId) return;
    stickOwner = undefined;
    joystick.style.removeProperty('--stick-x');
    joystick.style.removeProperty('--stick-y');
    engine?.setVector(0, 0);
  });
}

$('#start').addEventListener('click', begin);
if (state.tutorialDone) $('#start').textContent = state.phase === 'done' ? '重返科学楼' : '继续任务';

engine = createEngine({
  canvas, worldFactory: createWorld, reducedMotion: motion,
  onTarget: updateTarget,
  onInteract: useObject,
  onMove({ distance }) {
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
      audio.cue('dew');
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

if (engine && !unavailable) {
  $('#start-status').textContent = '';
  engine.setActive(false);
  worldState();
}
