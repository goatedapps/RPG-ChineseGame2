import { createEngine } from '../greenhouse/engine.js?v=spatial-market';
import { bindButtonAudio, createGreenhouseAudio } from '../greenhouse/sounds.js?v=speech-recovery';
import { createVoice } from '../greenhouse/voice.js?v=mandarin-story';
import { createWriting } from '../greenhouse/writing.js?v=dictation-outline';
import { createLessonTestView } from '../greenhouse/lesson-test-view.js?v=numbered-tasks';
import { createLessonTest, restoreLessonTest } from '../greenhouse/lesson-test.js';
import { bindJoystick } from '../shared/joystick.js';
import { createClueReader, dictationButton, speakerButton } from '../shared/speaker.js?v=mandarin-story';
import { vocabularyList } from '../shared/vocabulary.js';
import { createDeveloperMode } from '../shared/developer-mode.js?v=numbered-tasks';
import { showSkippedFinal } from '../shared/skipped-final.js?v=developer-unlock';
import { openGameSettings } from '../shared/settings.js';
import { markLessonComplete } from '../shared/lesson-progress.js';
import { createHelperPlayback } from '../shared/helper-playback.js';
import { playLessonComic } from '../shared/comic.js?v=comic-score';
import { createRadio } from './radio.js';
import { rescueActivity } from './activities.js';
import { art, chapters, ending, objects, opening, title, tutorial } from './story.js';
import { buildTheatre, checkpoints, start } from './world.js';
import { recordedGuides, storyRecordingFor } from './recordings.js';

const $ = (id) => document.getElementById(id);
const key = 'rpg-chinese.p3.l2.rivertheatre';
const strokeDataUrl = new URL('./stroke-data.json', import.meta.url);
const desk = $('workbench');
const panel = $('panel');
const canvas = $('scene');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = createGreenhouseAudio({ trialEffects: true });
const map = () => location.assign('./?level=p3');
const initial = () => ({
  phase: 'prelude', index: 0, tutorial: 0, radio: false, briefing: '', step: 'seek',
  writing: 0, known: [], played: [], passed: false, final: null, practice: null, music: true, effects: true,
});
function load() {
  try {
    const saved = { ...initial(), ...JSON.parse(localStorage.getItem(key)) };
    saved.index = Number.isInteger(saved.index) ? Math.min(chapters.length - 1, Math.max(0, saved.index)) : 0;
    saved.known = Array.isArray(saved.known) ? saved.known : [];
    saved.played = Array.isArray(saved.played) ? saved.played : [];
    return saved;
  } catch { return initial(); }
}
let state = load();
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
}
let engine, active, target, hint, lastRead, currentCue, entries, bank, practice, testCleanup, startup;
let panelCleanup = () => {};
let walked = 0;
let turned = 0;
let stepDistance = 0;
let rescue = 0;

const task = () => chapters[state.index];
const waiting = () => state.radio && state.briefing !== task().id;
const objective = () => state.radio ? (waiting() ? null : task().id) : (state.tutorial >= 2 ? 'radio' : null);
const play = (sound) => audio.cue(sound);
function applyAudio() {
  audio.setEnabled(state.effects);
  audio.setMusicEnabled(state.music);
}
applyAudio();
const helper = createHelperPlayback({
  clipURL: (id) => new URL('./audio/guide-' + id + '.mp3', import.meta.url),
  getPlayed: () => state.played, save, setDucked: audio.setDucked,
});
const voice = createVoice((status) => helper.setSpeaking(status === 'playing'), storyRecordingFor);
const clueReader = createClueReader(voice);
const radio = createRadio($('radio'), {
  onOpen(id) {
    engine?.setActive(false);
    voice.stop();
    if (recordedGuides.includes(id)) helper.play(id);
  },
  onClose() {
    helper.stop();
    if (!active) return;
    state.briefing = task().id;
    save();
    engine.setActive(!desk.open);
    refresh();
  },
  onHint(id) { if (id === task().id) hint = id; },
});

function element(tag, cls = '', text = '') {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}
function button(text, handler, cls = 'primary') {
  const el = element('button', cls, text);
  el.type = 'button';
  el.onclick = handler;
  return el;
}
function worldState() {
  engine?.setGameState({
    index: state.index, radio: state.radio, hint,
    rescue: state.index === 4 && ['check', 'writing'].includes(state.step) ? 1 : rescue,
  });
}
function showTarget(next) {
  target = next;
  const valid = Boolean(active && next && !radio.isOpen && !desk.open && next.id === objective());
  $('interact').hidden = !valid;
  $('reticle').classList.toggle('targeted', valid);
  if (valid) $('interact').querySelector('span').textContent = objects[next.id].label;
}
function cueRead(force = false) {
  if (!active || desk.open || radio.isOpen || waiting() || !currentCue) return;
  if (!force && (currentCue === lastRead || navigator.userActivation?.hasBeenActive === false)) return;
  lastRead = currentCue;
  voice.speak(currentCue, .86, (status) => {
    $('voice-status').hidden = status !== 'unavailable';
    $('voice-status').textContent = status === 'unavailable' ? '暂时无法播放华语，请阅读任务提示。' : '';
  });
}
function refresh() {
  if (!active) return;
  $('word-count').textContent = state.known.length + ' / ' + entries.size;
  $('mission-number').textContent = state.radio ? (waiting() ? '新消息' : task().region + ' · ' + (state.index + 1) + ' / ' + chapters.length) : '操作练习';
  $('mission-name').textContent = !state.radio ? ['走几步', '看看四周', '拿起对讲机'][state.tutorial] : waiting() ? '对讲机有新消息' : task().title;
  currentCue = !state.radio ? tutorial[state.tutorial] : waiting() ? '打开对讲机。'
    : state.step === 'writing' ? '回到任务地点，完成当前的听写。' : task().cue;
  $('cue-text').textContent = currentCue;
  $('replay-cue').disabled = waiting();
  $('radio').hidden = !state.radio;
  const hasRope = state.index >= 2 && state.index < 4;
  $('held').hidden = !hasRope;
  $('held').textContent = hasRope ? '手上 · 救援绳' : '';
  worldState();
  showTarget(target);
  cueRead();
}
function briefing() {
  if (!state.radio) return;
  radio.receive(task(), waiting());
  if (waiting()) {
    play('notification');
    if (document.pointerLockElement === canvas) document.exitPointerLock?.();
  }
}

function showPanel(content, focus, inspection = false) {
  voice.stop();
  panelCleanup();
  panelCleanup = () => {};
  audio.setMinigame(content.classList.contains('rescue-activity'));
  desk.lang = 'zh-Hans';
  desk.classList.toggle('artifact-inspection', inspection);
  engine?.setActive(false);
  showTarget(null);
  panel.replaceChildren(content);
  if (!desk.open) desk.showModal();
  desk.scrollTop = 0;
  focus.focus({ preventScroll: true });
}
function openPanel(_, text) {
  const sheet = element('article', 'market-panel');
  const heading = element('h2', '', text);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  sheet.append(heading);
  showPanel(sheet, heading);
  return sheet;
}
desk.addEventListener('click', (event) => {
  if (event.target !== desk) return;
  const bounds = desk.getBoundingClientRect();
  if (desk.classList.contains('artifact-inspection') || event.clientX < bounds.left || event.clientX > bounds.right ||
    event.clientY < bounds.top || event.clientY > bounds.bottom) {
    play('ui');
    desk.close();
  }
});
desk.addEventListener('cancel', () => voice.stop());
desk.addEventListener('close', () => {
  if (desk.open) return;
  voice.stop();
  panelCleanup();
  panelCleanup = () => {};
  audio.setMinigame(false);
  desk.classList.remove('artifact-inspection');
  if (active) {
    rescue = state.step === 'puzzle' ? 0 : rescue;
    engine.setActive(!radio.isOpen);
    refresh();
  }
});

function discover() {
  state.known = [...new Set([...state.known, ...task().words])];
}
function showClue(next) {
  const chapter = task();
  const page = element('article', 'rescue-clue');
  const heading = element('h2', 'encounter-heading', chapter.title);
  heading.id = 'panel-title';
  const item = button('', () => {
    discover();
    state.step = next;
    save();
    refresh();
    study();
  }, 'rescue-clue-surface');
  item.setAttribute('aria-label', '读完线索，继续任务');
  const image = element('img', 'encounter-object');
  const illustrated = chapter.id === 'tower';
  image.src = art(illustrated ? 'cover' : objects[chapter.id].image);
  image.alt = illustrated ? '发条虎咬着绳子，逆着水流拉住剧场。' : objects[chapter.id].label;
  const note = element('span', 'rescue-clue-paper');
  if (illustrated) note.append(element('strong', 'rescue-clue-speaker', '胡师傅'));
  note.append(element('span', '', chapter.clue));
  note.append(element('span', 'rescue-clue-arrow', '⌄'));
  item.append(image, note);
  const playback = clueReader(chapter.id, chapter.clue);
  page.append(heading, item, playback.button);
  showPanel(page, item, true);
  playback.reveal();
}
function showActivity() {
  const round = rescueActivity(task(), play, () => {
    state.step = task().id === 'tower' ? 'reveal' : 'check';
    save();
    refresh();
    study();
  }, (value) => {
    rescue = value;
    worldState();
  });
  showPanel(round.root, round.heading, true);
  panelCleanup = round.dispose;
}
function showQuestion(prompt, choices, answer, response, next) {
  const sheet = openPanel(null, '理解检查');
  const status = element('p', 'feedback');
  status.setAttribute('role', 'status');
  const list = element('div', 'market-answers');
  for (const { choice, index } of choices.map((choice, index) => ({ choice, index }))
    .sort((a, b) => (a.index + state.index + 1) % choices.length - (b.index + state.index + 1) % choices.length)) {
    list.append(button(choice, () => {
      if (index !== answer) {
        play('wrong');
        status.textContent = '再想一想。可以回看线索。';
        return;
      }
      for (const control of list.children) control.disabled = true;
      play('correct');
      status.textContent = response || '答对了。';
      const onward = button('继续', next);
      sheet.append(onward);
      onward.focus();
    }, 'market-answer'));
  }
  sheet.append(element('p', 'body', prompt), list, status);
  return sheet;
}
function showCheck() {
  const chapter = task();
  const sheet = showQuestion(chapter.question, chapter.choices, chapter.answer, chapter.why, () => {
    state.step = 'writing';
    save();
    showDictation();
  });
  const review = element('details', 'market-review');
  const playback = clueReader(chapter.id + ':review', chapter.clue);
  review.append(element('summary', '', '回看线索'), element('p', '', chapter.clue), playback.button);
  review.addEventListener('toggle', () => { if (!review.open) playback.stop(); });
  sheet.append(review);
}
function showWriting(word, text, heading, onDone) {
  const sheet = openPanel(null, heading);
  const controls = element('div', 'button-row');
  const status = element('p', 'feedback');
  status.setAttribute('role', 'status');
  const grid = element('div', 'writing-grid');
  const done = element('p', 'writing-progress', '已写 0 / ' + [...word].length);
  const reveal = button('看字', () => { writing.revealOutline(); reveal.disabled = true; }, 'text-button');
  controls.append(dictationButton(voice, text + ' 要写的是：' + word + '。', (value) => {
    if (value === 'unavailable') status.textContent = '暂时无法播放华语。可以轻触播放按钮重试。';
  }, { autoplay: true }), reveal);
  sheet.append(element('p', 'sentence', text.replace(word, '＿'.repeat([...word].length))), controls, grid, done, status);
  const writing = createWriting(grid, word, false, () => {
    voice.stop();
    play('correct');
    reveal.disabled = true;
    status.textContent = '写好了！';
    onDone(sheet);
  }, () => {
    status.textContent = '书写格未能载入。';
    controls.append(button('重试', () => showWriting(word, text, heading, onDone)));
  }, () => { status.textContent = '请再写一笔。'; }, (n) => {
    done.textContent = '已写 ' + n + ' / ' + [...word].length;
  }, { strokeDataUrl, hintsAfterMisses: 5 });
  panelCleanup = writing;
}
function showDictation() {
  const chapter = task();
  const word = chapter.words[state.writing];
  if (!word || dev.skipDictation) {
    advance();
    return;
  }
  showWriting(word, chapter.lines[state.writing], '听写 · ' + (state.writing + 1) + ' / ' + chapter.words.length, (sheet) => {
    state.writing++;
    save();
    const next = button(state.writing === chapter.words.length ? '完成记录' : '继续', showDictation);
    sheet.append(next);
    next.focus();
  });
}
function study() {
  switch (state.step) {
    case 'writing': showDictation(); break;
    case 'check': showCheck(); break;
    case 'puzzle': showActivity(); break;
    case 'reveal': showClue('check'); break;
    default: task().id === 'tower' ? showActivity() : showClue('puzzle');
  }
}
function useObject(id) {
  if (!active || desk.open || radio.isOpen || id !== objective()) return;
  if (id === 'radio') {
    state.radio = true;
    save();
    play('pickup');
    refresh();
    briefing();
    return;
  }
  hint = undefined;
  if (state.step === 'seek' && id === 'tower') {
    state.step = 'puzzle';
    save();
  }
  study();
}
function advance() {
  if (desk.open) desk.close();
  if (state.index === chapters.length - 1) {
    state.phase = 'epilogue';
    save();
    showComic(true);
    return;
  }
  state.index++;
  state.step = 'seek';
  state.writing = 0;
  hint = undefined;
  save();
  briefing();
  refresh();
}

function showBook() {
  const sheet = openPanel(null, '词语手册');
  const { list } = vocabularyList([...entries.values()], new Set(state.known), (item) => ({
    pinyin: item.pinyin, meaning: item.meaning, sentence: item.example,
    controls: [
      speakerButton(() => voice.speak(item.word), '听' + item.word + '的发音'),
      button('练写', () => showWriting(item.word, item.sentences[0], '词语复习', (section) =>
        section.append(button('返回词语手册', showBook))), 'text-button'),
    ],
  }));
  sheet.append(button('题库练习', () => showPractice()), list);
}
function showPractice(index = 0) {
  const record = practice[index % practice.length];
  const sheet = showQuestion(record.prompt, record.choices, record.answer, '', () => showPractice(index + 1));
  sheet.append(button('返回词语手册', showBook, 'text-button'));
}
function suspend() {
  active = false;
  voice.stop();
  helper.stop();
  engine?.setActive(false);
  engine?.hide();
  if (desk.open) desk.close();
  if (radio.isOpen) radio.close();
  for (const id of ['toolbar', 'mission-ui', 'play-controls', 'reticle', 'radio']) $(id).hidden = true;
}
function showComic(isEnding) {
  suspend();
  $('splash').hidden = true;
  playLessonComic($('comic-overlay'), () => {
    state.phase = isEnding ? 'final' : 'world';
    save();
    if (isEnding) showTest('final');
    else void startWorld();
  }, {
    panels: isEnding ? ending : opening, ending: isEnding,
    titleText: title + (isEnding ? ' · 尾声' : ' · 序幕'),
    lastLabel: isEnding ? '开始课末测试' : '走进码头广场',
    startLabel: audio.startComic(isEnding),
    onPage: () => play('page'),
  });
}
function showTest(mode) {
  suspend();
  audio.setMusic(null);
  const host = $('lesson-test');
  host.hidden = false;
  testCleanup?.();
  testCleanup = undefined;
  if (mode === 'final' && dev.skipDictation) {
    showSkippedFinal(host, {
      cardClass: 'lesson-test-sheet', headingId: 'lesson-test-title', onExit: map,
      onResume() { dev.setSkipDictation(false); showTest(mode); }, onDeveloper: dev.open,
    });
    return;
  }
  const assessment = state[mode] ? restoreLessonTest(bank, state[mode]) : createLessonTest(bank);
  state[mode] = assessment;
  save();
  testCleanup = createLessonTestView(host, {
    bank, mode, state: assessment, speak: voice.speak, stopSpeech: voice.stop, cue: play, strokeDataUrl,
    awardArt: art('ending-show'), lessonLabel: '第二课', autoDictation: mode === 'practice',
    showReplayOnPass: mode === 'final',
    onProgress(value) { state[mode] = value; save(); },
    onPass() {
      if (mode === 'final') {
        state.passed = true;
        markLessonComplete('p3', 2);
      } else state.practice = null;
      save();
    },
    onExit() {
      if (mode === 'final') { map(); return; }
      host.hidden = true;
      testCleanup?.();
      if (state.phase === 'final') showTest('final');
      else void startWorld();
    },
    onReplay: confirmReplay, onDeveloper: mode === 'final' ? dev.open : undefined,
  });
}
function confirmReplay() {
  const sheet = openPanel(null, '要重玩任务吗？');
  sheet.append(element('p', 'body', '这次的任务进度将清除。你将从序幕重新开始。'),
    button('保留进度', () => desk.close(), 'text-button'), button('确认重玩', () => {
      testCleanup?.();
      $('lesson-test').hidden = true;
      state = { ...initial(), passed: state.passed, practice: state.practice, music: state.music, effects: state.effects };
      hint = currentCue = lastRead = undefined;
      rescue = walked = turned = stepDistance = 0;
      engine?.reset(start);
      save();
      showComic(false);
    }));
}

async function startWorld() {
  $('splash').hidden = false;
  $('start-status').textContent = '正在载入河边剧场……';
  if (!engine) {
    let unsupported = false;
    const spawn = state.radio ? checkpoints[state.index] : start;
    engine = createEngine({
      canvas, worldFactory: (THREE) => buildTheatre(THREE, spawn), reducedMotion: motion,
      onTarget: showTarget, onInteract: ({ id }) => useObject(id),
      onMove({ distance }) {
        stepDistance += distance;
        if (stepDistance >= .75) { stepDistance %= .75; play('step'); }
        if (state.radio || state.tutorial !== 0) return;
        walked += distance;
        if (walked < .52) return;
        state.tutorial = 1;
        save();
        refresh();
      },
      onLook({ dx, dy }) {
        if (state.radio || state.tutorial !== 1) return;
        turned += Math.abs(dx) + Math.abs(dy);
        if (turned < 24) return;
        state.tutorial = 2;
        save();
        refresh();
      },
      onStatus({ type, message }) {
        if (type === 'unsupported') { unsupported = true; $('start-status').textContent = message; }
      },
    });
    if (unsupported) { engine = undefined; $('retry-entry').hidden = false; return; }
    try { await engine.ready; }
    catch (error) {
      engine = undefined;
      $('start-status').textContent = '剧场未能载入。请再试一次。';
      $('retry-entry').hidden = false;
      console.error(error);
      return;
    }
  }
  active = true;
  $('splash').hidden = true;
  for (const id of ['toolbar', 'mission-ui', 'play-controls', 'reticle']) $(id).hidden = false;
  audio.setMusic('game');
  audio.prepareGameplay();
  engine.show();
  engine.setActive(true);
  refresh();
  briefing();
  engine.focus(false);
}

const preferences = (name) => ({ get: () => state[name], set(value) { state[name] = value; applyAudio(); save(); } });
$('settings').onclick = () => openGameSettings({
  panel: { append: (node) => panel.firstElementChild.append(node) },
  openPanel, onHome: map, effects: preferences('effects'), music: preferences('music'),
  lessonActions: [
    { label: '重玩任务', run: confirmReplay }, { label: '词语练习', run: () => showTest('practice') },
  ],
});
const dev = createDeveloperMode({
  panel,
  openPanel(text) { openPanel(null, text); desk.lang = 'en'; },
  onClose: () => desk.close(),
  taskCount: chapters.length,
  canJump: () => active || (state.phase === 'final' && !$('lesson-test').hidden),
  currentTask: () => state.radio ? state.index : -1,
  onJump(index) {
    testCleanup?.();
    $('lesson-test').hidden = true;
    Object.assign(state, { phase: 'world', radio: true, index, tutorial: 2, briefing: '', step: 'seek', writing: 0 });
    hint = lastRead = undefined;
    rescue = 0;
    save();
    desk.close();
    engine?.reset(checkpoints[index]);
    void startWorld();
  },
  onSkipDictation(enabled) {
    if (enabled && state.phase === 'final' && !$('lesson-test').hidden) showTest('final');
  },
});
$('developer-mode').onclick = dev.open;
$('book').onclick = showBook;
$('interact').onclick = () => engine?.interact();
$('replay-cue').onclick = () => cueRead(true);
$('retry-entry').onclick = () => { if (entries) void startWorld(); else void initialise(); };
bindJoystick($('joystick'), (x, y) => engine?.setVector(x, y));
document.addEventListener('keydown', (event) => {
  if (active && !desk.open && !radio.isOpen && event.code === 'KeyF' && !event.repeat) {
    if (state.radio) play('ui');
    radio.open();
  }
  cueRead();
});
bindButtonAudio(play, (control) => (control.id === 'interact' && objective() === 'radio') || control.classList.contains('take-rope'));
document.addEventListener('pointerup', () => cueRead(), { passive: true });

async function initialise() {
  $('retry-entry').hidden = true;
  try {
    startup ??= Promise.all(['words.json', 'practice.json'].map(async (name) => {
      const response = await fetch(new URL('./' + name, import.meta.url));
      if (!response.ok) throw new Error('课程未能载入');
      return response.json();
    }));
    const [words, questions] = await startup;
    entries = new Map(words.map((item) => [item.word, item]));
    bank = Object.fromEntries(words.map((item) => [item.word, item.sentences]));
    practice = questions;
    if (state.phase === 'world') await startWorld();
    else if (state.phase === 'final') showTest('final');
    else showComic(state.phase === 'epilogue');
  } catch (error) {
    startup = undefined;
    $('start-status').textContent = '课程未能载入。请再试一次。';
    $('retry-entry').hidden = false;
    console.error(error);
  }
}
void initialise();
