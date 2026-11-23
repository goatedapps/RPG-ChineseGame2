import { createEngine } from '../greenhouse/engine.js?v=shadow-market';
import { createPhone } from '../greenhouse/phone.js?v=shadow-market';
import { createGreenhouseAudio } from '../greenhouse/sounds.js?v=effect-recovery';
import { createVoice } from '../greenhouse/voice.js?v=clue-audio';
import { createWriting } from '../greenhouse/writing.js?v=dictation-outline';
import { createLessonTestView } from '../greenhouse/lesson-test-view.js?v=numbered-tasks';
import { createLessonTest, restoreLessonTest } from '../greenhouse/lesson-test.js';
import { bindJoystick } from '../shared/joystick.js';
import { createClueReader, dictationButton, speakerButton } from '../shared/speaker.js?v=clue-audio';
import { vocabularyList } from '../shared/vocabulary.js';
import { createDeveloperMode } from '../shared/developer-mode.js?v=numbered-tasks';
import { showSkippedFinal } from '../shared/skipped-final.js?v=developer-unlock';
import { openGameSettings } from '../shared/settings.js';
import { markLessonComplete } from '../shared/lesson-progress.js';
import { playLessonComic } from '../shared/comic.js';
import { art, arrival, chapters, ending, objects, opening } from './story.js?v=mission-context';
import { buildShadowMarket, checkpoints } from './world.js';

const $ = (id) => document.getElementById(id);
const key = 'rpg-chinese.p6.l2.shadowmarket';
const strokeDataUrl = new URL('./stroke-data.json', import.meta.url);
const audio = createGreenhouseAudio({ musicGain: .82 });
const voice = createVoice((status) => audio.setDucked(status === 'playing'));
const clueReader = createClueReader(voice);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const desk = $('workbench');
const panel = $('panel');
const canvas = $('scene');
const map = () => location.assign('./?level=p6');
const defaultState = () => ({
  phase: 'prelude', index: 0, phone: false, called: false, briefing: '',
  step: 'seek', question: 0, writing: 0, known: [], passed: false, final: null, practice: null,
  effects: true, music: true,
});
function load() {
  try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return defaultState(); }
}
let state = load();
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
}
let words, bank, engine, active, target, hint, lastRead, currentCue, testCleanup;
let writingCleanup = () => {};
let distance = 0;
let loadPromise;
const chapter = () => chapters[state.index];
const waiting = () => state.called && chapter() && state.briefing !== chapter().id;
const objectiveId = () => !state.phone ? 'phone' : !state.called || waiting() ? null : chapter()?.id;
const play = (name) => audio.cue(name);
function effects() {
  audio.setEnabled(state.effects);
  audio.setMusicEnabled(state.music);
}
effects();

function phoneNotify() {
  play('notification');
  if (document.pointerLockElement === canvas) document.exitPointerLock?.();
}

const phone = createPhone($('phone'), {
  contactName: '阿岚', contactInitial: '岚', onNotify: phoneNotify,
  onToggle(open) {
    if (!active) return;
    engine?.setActive(!open && !desk.open);
    if (open) voice.stop();
    if (!open && waiting()) {
      state.briefing = chapter().id;
      save();
    }
    refresh();
  },
});

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function button(label, handler, classes = 'primary') {
  const item = element('button', classes, label);
  item.type = 'button';
  item.onclick = handler;
  return item;
}
function cueRead(force = false) {
  if (!active || desk.open || phone.isOpen || waiting() || !currentCue) return;
  if (!force && (lastRead === currentCue || navigator.userActivation?.hasBeenActive === false)) return;
  lastRead = currentCue;
  voice.speak(currentCue, .86, (status) => {
    $('voice-status').hidden = status !== 'unavailable';
    $('voice-status').textContent = status === 'unavailable' ? '暂时无法播放华语。可以阅读任务提示。' : '';
  });
}

function worldState() {
  engine?.setGameState({ index: state.index, step: state.step, phone: state.phone, hint });
}
function renderTarget(next) {
  target = next;
  const available = Boolean(next && next.id === objectiveId() && active && !desk.open && !phone.isOpen);
  $('interact').hidden = !available;
  $('reticle').classList.toggle('targeted', available);
  if (available) $('interact').querySelector('span').textContent = objects[next.id].name;
}

function refresh() {
  if (!active) return;
  const task = chapter();
  $('word-count').textContent = state.known.length + ' / ' + words.size;
  $('mission-number').textContent = state.called ? `任务 ${state.index + 1} / ${chapters.length}` : '操作练习';
  $('mission-name').textContent = !state.phone ? '拿起智能手机' : !state.called ? '拨打阿岚' : waiting() ? '阿岚有新消息' : task?.title ?? '';
  currentCue = !state.phone ? '看看灯笼广场，拿起前面矮桌上的智能手机。'
    : !state.called ? '打开手机，拨打阿岚的号码。'
      : waiting() ? '打开手机，先看看阿岚说了什么。'
        : state.step === 'seek' ? task?.cue : '再查看' + (objects[task?.id]?.name ?? '线索') + '，完成记录和听写。';
  $('cue-text').textContent = currentCue ?? '';
  $('replay-cue').disabled = Boolean(waiting());
  const holdingLantern = state.index === 4 || (state.index === 5 && state.step === 'seek');
  $('held').hidden = !holdingLantern;
  $('held').textContent = holdingLantern ? '手上 · 旧灯笼' : '';
  phone.setVisible(state.phone);
  if (state.phone && !state.called) {
    phone.setActivity({ id: 'call', label: '拨打阿岚', detail: '阿岚 · 家人', onOpen: callLan });
  } else phone.setActivity(null);
  phone.setHint(state.called && !waiting() && task ? {
    id: task.id, text: task.hint, onLocate() { hint = task.id; worldState(); },
  } : null);
  worldState();
  renderTarget(target);
  cueRead();
}

function sendBriefing(notify = true) {
  const task = chapter();
  if (task && state.called) phone.receive(task.guide, { key: task.id, notify });
}
function callLan() {
  state.called = true;
  save();
  sendBriefing(false);
  refresh();
}

function showPanel(content, focus, inspection = false) {
  voice.stop();
  desk.lang = 'zh-Hans';
  writingCleanup();
  writingCleanup = () => {};
  panel.replaceChildren(content);
  desk.classList.toggle('artifact-inspection', inspection);
  engine?.setActive(false);
  renderTarget(null);
  if (!desk.open) desk.showModal();
  desk.scrollTop = 0;
  focus.focus({ preventScroll: true });
}
function openPanel(_, title) {
  const sheet = element('article', 'market-panel');
  const heading = element('h2', '', title);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  sheet.append(heading);
  showPanel(sheet, heading);
}
desk.addEventListener('click', (event) => {
  if (event.target !== desk) return;
  const { left, right, top, bottom } = desk.getBoundingClientRect();
  if (desk.classList.contains('artifact-inspection') || event.clientX < left || event.clientX > right ||
      event.clientY < top || event.clientY > bottom) {
    voice.stop();
    desk.close();
  }
});
desk.addEventListener('cancel', () => voice.stop());
desk.addEventListener('close', () => {
  if (desk.open) return;
  writingCleanup();
  writingCleanup = () => {};
  voice.stop();
  desk.classList.remove('artifact-inspection');
  if (!active) return;
  engine?.setActive(!phone.isOpen);
  refresh();
});
function wrapUp() {
  active = false;
  engine?.setActive(false);
  engine?.hide();
  phone.setVisible(false);
  if (desk.open) desk.close();
  $('toolbar').hidden = $('mission-ui').hidden = $('play-controls').hidden = $('reticle').hidden = true;
}

function discover(task) {
  state.known = [...new Set([...state.known, ...task.words])];
}
function advance() {
  if (desk.open) desk.close();
  state.index++;
  if (state.index === 5) engine?.reset(checkpoints[5]);
  state.step = 'seek';
  state.question = state.writing = 0;
  hint = undefined;
  if (state.index === chapters.length) {
    state.phase = 'epilogue';
    save();
    showComic(true);
  } else {
    save();
    sendBriefing();
    refresh();
  }
}
function study(task) {
  if (state.step === 'writing') {
    showDictation(task);
    return;
  }
  if (state.step === 'check') {
    showCheck(task);
    return;
  }
  const object = objects[task.id];
  const heading = element('h2', '', object.name);
  heading.id = 'panel-title';
  const picture = element('img', 'clue-object');
  picture.src = art(object.art);
  picture.alt = '';
  picture.draggable = false;
  const read = button('', () => {
    state.step = 'check';
    save();
    showCheck(task);
  }, 'clue-touch');
  read.setAttribute('aria-label', '读完线索，继续');
  read.append(picture, element('span', '', '轻触物件继续'));
  const sheet = element('article', 'market-clue');
  const copy = element('div', 'clue-copy');
  const playback = clueReader(task.id, task.clue);
  copy.append(element('p', '', task.clue), playback.button);
  sheet.append(heading, read, copy);
  showPanel(sheet, read, true);
  playback.reveal();
  play(task.id === 'mirror' ? 'seal' : 'paper');
}

function showCheck(task) {
  const check = task.checks[state.question];
  if (!check) {
    state.step = 'writing';
    save();
    showDictation(task);
    return;
  }
  openPanel(null, '理解检查');
  const sheet = panel.firstElementChild;
  const status = element('p', 'feedback');
  status.setAttribute('role', 'status');
  sheet.append(element('p', 'body', check.prompt), status);
  const choices = element('div', 'market-answers');
  const start = (state.index + state.question + 1) % check.choices.length;
  for (let n = 0; n < check.choices.length; n++) {
    const index = (n + start) % check.choices.length;
    const option = button(check.choices[index], () => {
      if (index !== check.answer) {
        status.textContent = '再想一想。可以回看刚才的记录。';
        play('wrong');
        return;
      }
      for (const other of choices.children) other.disabled = true;
      status.textContent = check.feedback;
      state.question++;
      save();
      play('correct');
      sheet.append(button('继续', () => showCheck(task)));
    }, 'market-answer');
    choices.append(option);
  }
  const review = element('details', 'market-review');
  review.append(element('summary', '', '回看线索'));
  const playback = clueReader(task.id, task.clue);
  review.append(element('p', '', task.clue), playback.button);
  review.addEventListener('toggle', () => {
    if (!review.open) playback.stop();
    else if (review.isConnected && desk.open) playback.reveal();
  });
  sheet.append(choices, review);
}
function showWriting(entry, title, done, back = undefined) {
  openPanel(null, title);
  const sheet = panel.firstElementChild;
  const status = element('p', 'feedback');
  status.setAttribute('role', 'status');
  const grid = element('div', 'writing-grid');
  const progress = element('p', 'writing-progress', '已写 0 / ' + [...entry.word].length);
  const line = entry.sentences[0];
  const blank = line.replaceAll(entry.word, '＿'.repeat([...entry.word].length));
  const controls = element('div', 'button-row');
  const playbackStatus = element('p', 'feedback', '暂时无法播放华语。可以轻触播放按钮重试。');
  playbackStatus.setAttribute('role', 'status');
  playbackStatus.hidden = true;
  const reveal = button('看字', () => {
    writingCleanup.revealOutline();
    reveal.disabled = true;
  }, 'text-button');
  const playback = dictationButton(voice, line + ' 要写的是：' + entry.word + '。', (status) => {
    playbackStatus.hidden = status !== 'unavailable';
  }, { autoplay: true });
  controls.append(playback, reveal);
  if (back) controls.append(button('返回词语手册', back, 'text-button'));
  sheet.append(element('p', 'sentence', blank), controls, playbackStatus, grid, progress, status);
  writingCleanup = createWriting(grid, entry.word, false, () => {
    voice.stop();
    reveal.disabled = true;
    status.textContent = '写好了！';
    play('correct');
    done(sheet);
  }, () => {
    status.textContent = '书写格未能载入。';
    controls.append(button('重试', () => showWriting(entry, title, done, back)));
  }, () => { status.textContent = '请再试一笔。'; }, (n) => {
    progress.textContent = '已写 ' + n + ' / ' + [...entry.word].length;
  }, { strokeDataUrl, hintsAfterMisses: 5 });
}
function showDictation(task) {
  const word = task.words[state.writing];
  if (!word || dev.skipDictation) {
    advance();
    return;
  }
  showWriting(words.get(word), '听写 · ' + (state.writing + 1) + ' / ' + task.words.length, (sheet) => {
    state.writing++;
    save();
    const next = button(state.writing === task.words.length ? '完成记录' : '继续', () => showDictation(task));
    sheet.append(next);
    next.focus();
  });
}

function useObject(id) {
  if (!active || desk.open || phone.isOpen || id !== objectiveId()) return;
  if (id === 'phone') {
    state.phone = true;
    save();
    play('pickup');
    refresh();
    return;
  }
  const task = chapter();
  if (state.step === 'seek') {
    discover(task);
    state.step = 'clue';
    save();
    worldState();
  }
  study(task);
}

function showBook() {
  openPanel(null, '词语手册');
  const sheet = panel.firstElementChild;
  const all = [...words.values()];
  const { list } = vocabularyList(all, new Set(state.known), (item) => ({
    pinyin: item.pinyin, meaning: item.meaning, sentence: item.example,
    controls: [
      speakerButton(() => voice.speak(item.word), '听' + item.word + '的发音'),
      button('练写', () => showWriting(item, '词语复习', (section) => section.append(button('返回词语手册', showBook)), showBook), 'text-button'),
    ],
  }));
  sheet.append(element('p', '', '已发现 ' + state.known.length + ' / ' + words.size + ' 个词语。'),
    button('题库练习', () => showPractice()), list);
}
async function showPractice(index = 0) {
  const previousSheet = panel.firstElementChild;
  const data = await fetch(new URL('./practice.json', import.meta.url)).then(r => {
    if (!r.ok) throw Error('题库未能载入');
    return r.json();
  }).catch(() => null);
  if (!active || !desk.open || panel.firstElementChild !== previousSheet) return;
  openPanel(null, '题库练习');
  const sheet = panel.firstElementChild;
  if (!data) { sheet.append(element('p', '', '题库未能载入，请重试。'), button('重试', () => showPractice(index))); return; }
  const item = data[index % data.length];
  const status = element('p', 'feedback');
  sheet.append(element('p', 'body', item.prompt), status);
  const choices = element('div', 'market-answers');
  item.choices.forEach((choice, n) => choices.append(button(choice, () => {
    status.textContent = n === item.answer ? '答对了。' : '再想一想。';
    play(n === item.answer ? 'correct' : 'wrong');
  }, 'market-answer')));
  sheet.append(choices, button('下一题', () => showPractice(index + 1)), button('返回词语手册', showBook, 'text-button'));
}

function replay() {
  if (desk.open) desk.close();
  testCleanup?.();
  $('lesson-test').hidden = true;
  state = { ...defaultState(), passed: state.passed, practice: state.practice, music: state.music, effects: state.effects };
  save();
  engine?.reset(arrival);
  hint = undefined;
  distance = 0;
  active = false;
  phone.reset();
  lastRead = undefined;
  showComic(false);
}
function confirmReplay() {
  openPanel(null, '要重玩任务吗？');
  const sheet = panel.firstElementChild;
  sheet.append(element('p', 'body', '这次的任务和课末测试进度将清除。你将从序幕重新开始。'),
    button('保留进度', () => desk.close(), 'text-button'), button('确认重玩', replay));
}
function showTest(mode) {
  wrapUp();
  audio.setMusic(null);
  const host = $('lesson-test');
  host.hidden = false;
  testCleanup?.();
  testCleanup = undefined;
  if (mode === 'final' && dev.skipDictation) {
    showSkippedFinal(host, {
      cardClass: 'lesson-test-sheet', headingId: 'lesson-test-title', onExit: map,
      onResume() { dev.setSkipDictation(false); showTest(mode); },
      onDeveloper: dev.open,
    });
    return;
  }
  const slot = mode === 'final' ? 'final' : 'practice';
  const assessment = state[slot] ? restoreLessonTest(bank, state[slot]) : createLessonTest(bank);
  state[slot] = assessment;
  save();
  testCleanup = createLessonTestView(host, {
    bank, mode, state: assessment,
    speak: voice.speak, stopSpeech: voice.stop, cue: play, strokeDataUrl, awardArt: art('ending'), lessonLabel: '第二课',
    autoDictation: mode === 'practice',
    showReplayOnPass: mode === 'final',
    onProgress(progress) { state[slot] = progress; save(); },
    onPass() {
      if (mode === 'final') {
        state.passed = true;
        markLessonComplete('p6', 2);
      } else state.practice = null;
      save();
    },
    onExit: map, onReplay: confirmReplay,
    onDeveloper: mode === 'final' ? dev.open : undefined,
  });
}

function showComic(isEnding) {
  wrapUp();
  $('splash').hidden = true;
  audio.setMusic('comic');
  playLessonComic($('comic-overlay'), () => {
    state.phase = isEnding ? 'final' : 'world';
    save();
    if (isEnding) showTest('final');
    else void startWorld();
  }, {
    titleText: isEnding ? '影子集市 · 尾声' : '影子集市 · 序幕',
    panels: isEnding ? ending : opening, ending: isEnding,
    lastLabel: isEnding ? '开始课末测试' : '走进灯笼广场',
    onPage: () => play('page'),
  });
}

async function startWorld() {
  $('splash').hidden = false;
  $('start-status').textContent = '正在载入夜市……';
  if (!engine) {
    let unsupported = false;
    engine = createEngine({
      canvas, reducedMotion: motion, worldFactory: (THREE) => buildShadowMarket(THREE, state.index),
      onTarget: renderTarget, onInteract: ({ id }) => useObject(id),
      onMove({ distance: walked }) {
        distance += walked;
        if (distance >= .77) { distance %= .77; play('step'); }
      },
      onStatus({ type, message }) {
        if (type === 'unsupported') {
          unsupported = true;
          $('start-status').textContent = message;
          $('retry-entry').hidden = false;
        }
      },
    });
    if (unsupported) { engine = undefined; return; }
    await engine.ready;
  }
  active = true;
  $('splash').hidden = true;
  $('toolbar').hidden = $('mission-ui').hidden = $('play-controls').hidden = $('reticle').hidden = false;
  audio.setMusic('game');
  engine.show();
  engine.setActive(true);
  refresh();
  sendBriefing(Boolean(waiting()));
  engine.focus(false);
}

const preferences = (name) => ({ get: () => state[name], set(value) { state[name] = value; effects(); save(); } });
$('settings').onclick = () => {
  openGameSettings({
    panel: { append: node => panel.firstElementChild.append(node) }, openPanel, onHome: map,
    effects: preferences('effects'), music: preferences('music'),
    lessonActions: [
      { label: '重玩任务', run: confirmReplay },
      { label: '词语练习', run: () => showTest('practice') },
    ],
  });
};
const dev = createDeveloperMode({
  panel,
  openPanel(title) { openPanel(null, title); desk.lang = 'en'; },
  onClose: () => desk.close(),
  taskCount: chapters.length,
  canJump: () => active || (state.phase === 'final' && !$('lesson-test').hidden),
  currentTask: () => active && state.called ? state.index : -1,
  onJump(index) {
    testCleanup?.();
    testCleanup = undefined;
    $('lesson-test').hidden = true;
    Object.assign(state, { phase: 'world', index, phone: true, called: true, briefing: '', step: 'seek', question: 0, writing: 0 });
    phone.reset();
    hint = undefined;
    lastRead = undefined;
    save();
    desk.close();
    engine?.reset(checkpoints[index]);
    void startWorld();
  },
  onSkipDictation(value) {
    if (value && state.phase === 'final' && !$('lesson-test').hidden) showTest('final');
  },
});
$('developer-mode').onclick = dev.open;
$('book').onclick = showBook;
$('interact').onclick = () => engine?.interact();
$('replay-cue').onclick = () => cueRead(true);
$('retry-entry').onclick = () => { if (words) void startWorld(); else void initialise(); };
bindJoystick($('joystick'), (x, y) => engine?.setVector(x, y));
document.addEventListener('keydown', (event) => {
  if (active && !desk.open && event.code === 'KeyF') phone.open();
  cueRead();
});
document.addEventListener('pointerup', () => cueRead(), { passive: true });

async function initialise() {
  $('retry-entry').hidden = true;
  try {
    loadPromise ??= fetch(new URL('./words.json', import.meta.url)).then((response) => {
      if (!response.ok) throw Error('词语未能载入');
      return response.json();
    });
    const entries = await loadPromise;
    words = new Map(entries.map((entry) => [entry.word, entry]));
    bank = Object.fromEntries(entries.map((entry) => [entry.word, entry.sentences]));
    if (state.phase === 'world') await startWorld();
    else if (state.phase === 'final') showTest('final');
    else showComic(state.phase === 'epilogue');
  } catch {
    loadPromise = undefined;
    $('start-status').textContent = '课程未能载入。请再试一次。';
    $('retry-entry').hidden = false;
  }
}
void initialise();
