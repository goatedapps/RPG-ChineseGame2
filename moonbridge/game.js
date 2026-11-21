import { markLessonComplete } from '../shared/lesson-progress.js';
import { createWorld } from './world.js';
import {
  opening,
  parts,
  tasks,
  objects,
} from './story.js';
import { words, bank } from './curriculum.js';
import { fieldwork } from './fieldwork.js';
import { vocabularyList } from '../shared/vocabulary.js';
import { speakerButton } from '../shared/speaker.js';
import { testPart } from './race.js';
import { mountWriting, mountTest } from './assess.js';
import { createGreenhouseAudio } from '../greenhouse/sounds.js';
import { createVoice } from '../greenhouse/voice.js';
import { createDeveloperMode } from '../shared/developer-mode.js';

import { playLessonComic } from '../shared/comic.js';
import { bindJoystick } from '../shared/joystick.js';
import { openGameSettings } from '../shared/settings.js';

const $ = (id) => document.getElementById(id);
const audio = createGreenhouseAudio();
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
  fieldDone: [],
  fieldProgress: null,
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
    return {
      ...structuredClone(initial),
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
const voice = createVoice((status) => audio.setDucked(status === 'playing'));
let view = 'home';
let world;
let radioUnread = false;
let currentTarget = null;
let hintCount = 0;
let toastTimer;
let disposeWriting = () => {};
let disposeTest = () => {};
let lastFocused;
let driving = false;
let testing = false;
let currentTestView = null;
let devSkipDictation = false;
let moveStart;

function play(name) {
  audio.cue(name);
}
function speaker(text, status) {
  voice.speak(text, 0.86, (state) => {
    if (state === 'unavailable' && status)
      status.textContent = '这个设备暂时无法播放普通话。';
  });
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
function canReplay() {
  return save.storyFinished && save.stage === tasks.length;
}
function home() {
  disposeTest();
  disposeTest = () => {};
  currentTestView = null;
  closePanel();
  setView('home');
  $('start').textContent =
    canReplay()
      ? '重玩任务'
      : save.stage
        ? '继续冒险'
        : '开始冒险';
  $('resume-test').hidden = !save.storyFinished || save.passed;
  $('home-book').hidden = !save.discoveries.length;
  $('practice').hidden = !save.passed;
  $('practice').textContent = matchesTest(save.practice)
    ? '继续词语练习'
    : '词语练习';
  $('bank').hidden = !save.storyFinished && !save.passed;
  $('start').focus();
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
        ? '回到首页'
        : '开始课末测试'
      : '进入车站',
    ending: closing,
    onPage: () => play('page'),
  });
}

function showPanel(backdrop, title) {
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
  dialog.close();
  if (view === 'hud') world?.resume();
}
$('dialog-close').onclick = closePanel;
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closePanel();
});
dialog.addEventListener('close', () => {
  disposeWriting();
  disposeWriting = () => {};
  voice.stop();
  if (view === 'hud') world?.resume();
  if (lastFocused?.isConnected && !lastFocused.closest('[hidden]'))
    lastFocused.focus();
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

function update() {
  const task = objective();
  $('objective').textContent = task?.title ?? '月桥重新亮了';
  $('control-hint').textContent = task?.cue ?? '';
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
  $('unread').hidden = !radioUnread;
  $('word-count').textContent = save.discoveries.length + ' / ' + words.length;
  $('speak').disabled = !task?.cue;
  world?.setTargets(
    save.stage === 2
      ? ['radio']
      : task?.item && save.stage !== 3
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
    $('reticle').hidden = false;
    $('drive').hidden = true;
  }
  paintAction();
}
function go(stage) {
  save.stage = stage;
  save.fieldProgress = null;
  hintCount = 0;
  currentTarget = null;
  radioUnread = Boolean(objective()?.guide);
  if (radioUnread) play('notification');
  persist();
  update();
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
  action.disabled = !currentTarget || stage === 3;
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
      race.progress >= 1
        ? '到达终点'
        : race.progress >= race.rival
          ? '暂时领先'
          : '对手在前';
    $('speed').textContent = '时速 ' + Math.round(race.speed);
    $('place').textContent = label;
    $('race-progress').value = race.progress;
    $('race-hint').textContent =
      (race.locked ? '已进入' : '分岔前可选路线：') + routeName;
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
  if (event.moving) play('step');
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
    world ??= createWorld(canvas, worldEvent, endRace);
  } catch {
    home();
    $('boot-status').textContent =
      '这个浏览器暂时无法开启三维场景。请换一个支持三维图形的浏览器。';
    return;
  }
  world.reset(save.stage === 12);
  radioUnread = Boolean(objective()?.guide);
  driving = false;
  moveStart = null;
  setView('hud');
  update();
  audio.prepareGameplay();
}
function restartMission() {
  closePanel();
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
function start() {
  audio.start();
  $('boot-status').textContent = '';
  if (canReplay()) {
    if (save.passed) restartMission();
    else confirmRestart();
  } else if (save.stage > 0 && save.stage < tasks.length) {
    startWorld();
  } else showComic(opening, '序幕', startWorld);
}
$('start').onclick = start;
$('speak').onclick = () => {
  const status = $('voice-status');
  status.textContent = '';
  status.hidden = false;
  if (objective()?.cue) speaker(objective().cue, status);
};

function openRadio() {
  if (save.stage < 3 || driving) return;
  const stage = save.stage;
  const task = objective();
  const guide = task?.guide;
  if (!guide) return;
  radioUnread = false;
  $('unread').hidden = true;
  showPanel(null, '小梅的对讲机');
  const message = make('p', guide, 'helper-message');
  message.lang = 'en';
  body.append(message);
  if (stage === 3) {
    body.append(
      group(
        button(
          '收到',
          () => {
            go(4);
            closePanel();
          },
          'gold',
        ),
      ),
    );
    return;
  }
  const status = make('p', '', 'dialog-note');
  status.setAttribute('role', 'status');
  const help = button('再给一点提示', () => {
    hintCount++;
    if (hintCount === 1) {
      const additional = make('p', guide, 'helper-message');
      additional.lang = 'en';
      const places = {
        spark:
          'The spark is on the right side of the same table where you found the radio.',
        cart: 'Look for the brass bell on the cart in the middle of the station.',
        lever: 'The red handle is on the left-hand workbench.',
        handbook: 'The handbook is on the worktable in the west workshop, just beside the archive.',
        shelf:
          'The shelf at the back of the west workshop holds the two fittings, one brass and one blue.',
        beacon:
          'Look right from the track. The tall brass lamp has an empty socket.',
      };
      additional.textContent = task.hint ?? places[task.item] ?? guide;
      status.before(additional);
      status.textContent = '需要时可再点一次，显示位置。';
    } else {
      world.point(task.item);
      closePanel();
    }
  });
  body.append(
    group(
      button('听华文提示', () => speaker(task.cue, status)),
      help,
    ),
    status,
  );
}
$('radio').onclick = openRadio;

function handbook() {
  showPanel(null, '司机手册');
  play('paper');
  let page = 1;
  const title = make('p', '', 'dialog-copy');
  const description = make('p', '', 'note');
  const previous = button('上一页', () => {
    page--;
    render();
    play('paper');
  });
  const next = button('下一页', () => {
    page++;
    render();
    play('paper');
  });
  const see = button(
    '读完了',
    () => {
      if (page === 3 && save.stage === 7) {
        go(8);
        closePanel();
      }
    },
    'gold',
  );
  function render() {
    title.textContent = [
      '第一篇课文 · 好司机先练习',
      '第二页 · 检查车铃与车灯',
      '第三页 · 火种架和车扣',
    ][page - 1];
    description.textContent = [
      '老师傅讲了一件事：希望将来当司机，就要先学会检查灯车。',
      '轻敲车铃，再看看灯是否亮了。',
      '稳轮夹适合颠簸的近路。快轮扣适合平坦的长路。先装好，再试跑。',
    ][page - 1];
    previous.disabled = page === 1;
    next.disabled = page === 3;
    see.disabled = page !== 3;
  }
  body.append(
    title,
    description,
    group(
      previous,
      next,
      button('重听页码', () =>
        speaker('把手册翻到第三页，读一读。', description),
      ),
      see,
    ),
  );
  render();
  speaker('把手册翻到第三页，读一读。');
}
function choosePart() {
  showPanel(null, '挑选车扣');
  body.append(fieldImage('workshop'), make('p', '想走哪条路？看看两个车扣有什么不同。'));
  for (const [id, part] of Object.entries(parts)) {
    const item = make('div', '', 'part');
    item.append(make('i', part.icon), make('p', part.line));
    body.append(
      item,
      button('拿取' + part.name, () => {
        save.part = id;
        play('pickup');
        go(9);
        closePanel();
      }),
    );
  }
}
function runVisual(ok) {
  const strip = make('div', '', 'test-strip');
  strip.setAttribute('aria-hidden', 'true');
  const icon = make('span', '◆', 'test-cart');
  const flame = make('span', '✦', 'test-spark');
  icon.append(flame);
  strip.append(icon);
  body.append(strip);
  if (!window.gsap || reducedMotion.matches) {
    icon.style.left = ok ? '82%' : '50%';
    flame.hidden = !ok;
    return;
  }
  window.gsap
    .timeline()
    .to(icon, {
      left: ok ? '82%' : '47%',
      duration: 0.62,
      ease: 'power2.inOut',
    })
    .to(icon, { rotation: ok ? 0 : -8, duration: 0.15 }, '-=.20')
    .to(
      flame,
      { y: ok ? 0 : -35, x: ok ? 0 : 36, opacity: ok ? 1 : 0, duration: 0.31 },
      '-=.08',
    );
}
function firstRun() {
  if (testing) return;
  showPanel(null, '第一次试跑');
  runVisual(false);
  play('wrong');
  body.append(make('p', '灯车一颠，火种就弹出了架子。', 'dialog-copy'));
  body.append(
    group(
      button(
        '查看司机手册',
        () => {
          go(7);
          closePanel();
        },
        'gold',
      ),
    ),
  );
}
function practiceRun() {
  if (testing) return;
  if (save.fieldProgress?.stage === 10) {
    openFieldwork();
    return;
  }
  showPanel(null, '试跑台');
  const part = parts[save.part];
  const note = make(
    'p',
    part.name + '已装好。把速度调好，再拉下试跑杆。',
    'dialog-copy',
  );
  const range = document.createElement('input');
  range.type = 'range';
  range.min = 0;
  range.max = 100;
  range.value = 68;
  range.id = 'test-power';
  range.setAttribute('aria-label', '试跑速度');
  const value = make('output', '速度 68');
  range.oninput = () => {
    value.textContent = '速度 ' + range.value;
  };
  const launch = button(
    '拉下试跑杆',
    () => {
      if (testing) return;
      testing = true;
      const ok = testPart(save, Number(range.value) / 100);
      launch.disabled = true;
      range.disabled = true;
      body.querySelector('.test-strip')?.remove();
      runVisual(ok);
      play(ok ? 'correct' : 'wrong');
      note.textContent = ok
        ? '这一次，火种稳稳地留在架子上！'
        : '火种又晃了。把速度调到中间，再试一次。';
      testing = false;
      if (ok) body.append(group(button('查看试跑记录', openFieldwork, 'gold')));
      else {
        launch.disabled = false;
        range.disabled = false;
      }
    },
    'gold',
  );
  body.append(note, value, range, group(launch));
}
function pronounce(label, text, status) {
  return speakerButton(() => speaker(text, status), label);
}

function fieldImage(name) {
  const image = make('img', '', 'field-image');
  image.src = new URL('./art/' + name + '.webp', import.meta.url).href;
  image.alt = '';
  return image;
}

function openFieldwork() {
  const field = pendingFieldwork();
  if (!field) return;
  if (save.fieldProgress?.stage === save.stage) {
    fieldCheck(field);
    return;
  }
  showPanel(null, field.title);
  play('paper');
  if (field.image) body.append(fieldImage(field.image));
  addWords(field.words);
  persist();
  const pronunciation = make('p', '', 'note');
  const vocab = make('dl', '', 'field-words');
  for (const term of words.filter(({ word }) => field.words.includes(word))) {
    const label = make('dt', term.word);
    label.append(pronounce('听' + term.word + '的发音', term.word, pronunciation));
    vocab.append(label, make('dd', term.meaning));
  }
  body.append(
    make('p', field.clue, 'dialog-copy'),
    pronounce('朗读线索', field.clue, pronunciation),
    vocab,
    pronunciation,
    group(button('检查理解', () => {
      save.fieldProgress = { stage: save.stage, question: 0, writing: 0 };
      persist();
      fieldCheck(field);
    }, 'gold')),
  );
}

function fieldCheck(field) {
  const progress = save.fieldProgress;
  const item = field.questions[progress.question];
  if (!item) {
    fieldDictation(field);
    return;
  }
  showPanel(null, '理解检查');
  const clue = make('p', field.clue, 'field-clue');
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
  showDictation(term, '听写 · ' + (progress.writing + 1) + ' / ' + field.writing.length, () => {
    progress.writing++;
    persist();
    fieldDictation(field);
  });
}

function showDictation(term, title, onComplete, onBack) {
  showPanel(null, title);
  const text = term.sentences[0];
  const sentence = make('p', text.replaceAll(term.word, '＿'.repeat([...term.word].length)), 'sentence');
  const status = make('p', '', 'note');
  const writing = make('div', '', 'field-writing');
  const audioLine = text + ' 要写的是：' + term.word + '。';
  body.append(sentence, group(pronounce('重听听写', audioLine, status),
    button('看字', () => { sentence.textContent = text; })), writing, status);
  if (onBack) body.append(group(button('返回词语手册', onBack)));
  disposeWriting = mountWriting(writing, term.word, {
    hints: 5,
    onComplete: () => {
      play('correct');
      onComplete();
    },
  });
  speaker(audioLine, status);
}

function finishFieldwork(field) {
  const stage = save.stage;
  save.fieldDone.push(stage);
  save.fieldProgress = null;
  persist();
  if (stage === 10) go(11);
  else {
    hintCount = 0;
    radioUnread = Boolean(objective()?.guide);
    update();
  }
  closePanel();
  showToast(field.done);
}
function enterRace() {
  if (driving || save.stage !== 11) return;
  driving = true;
  $('reticle').hidden = true;
  $('drive').hidden = false;
  $('district').textContent = '任务 4 / 5 · 月桥';
  $('objective').textContent = '把火种送过桥';
  $('control-hint').textContent =
    '按前方加速，按后方刹车。到分岔前可以换路线。';
  $('action').disabled = true;
  closePanel();
  world.startRace(save.part);
  play('relay');
}
function launchPanel() {
  showPanel(null, '月桥竞速');
  body.append(
    make('p', '对手举手示意。你也准备好了吗？', 'dialog-copy'),
    make(
      'p',
      '按向前加速，按向后减速。分岔前可以选左边的颠簸近路或右边的平坦长路。',
      'note',
    ),
    group(button('举手，准备出发', enterRace, 'gold')),
  );
}
function endStory() {
  play('finish');
  go(tasks.length);
  save.storyFinished = true;
  persist();
  showComic(ending, '尾声', () => {
    if (save.passed) home();
    else openTest('final');
  });
}
function action() {
  if (view !== 'hud' || dialog.open || driving) return;
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
      launchPanel();
      break;
    case 12:
      endStory();
      break;
  }
}
$('action').onclick = action;
window.addEventListener('keydown', (event) => {
  if (event.repeat || view !== 'hud' || dialog.open) return;
  if (event.code === 'KeyE') action();
  if (event.code === 'KeyF') openRadio();
  if (driving && event.code === 'ArrowLeft') world.chooseRoute('rough');
  if (driving && event.code === 'ArrowRight') world.chooseRoute('smooth');
});
bindJoystick($('joystick'), (x, forward) => {
  world?.setStick(x, -forward);
  if (driving && Math.abs(x) > 0.65 && Math.abs(forward) < 0.5) {
    world.chooseRoute(x < 0 ? 'rough' : 'smooth');
  }
});
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
$('home-book').onclick = notebook;

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
$('bank').onclick = () => showBank();
function openTest(mode) {
  disposeTest();
  closePanel();
  setView('assessment');
  currentTestView = mode;
  const key = mode === 'final' ? 'final' : 'practice';
  disposeTest = mountTest($('assessment-body'), {
    mode,
    saved: save[key],
    speak: speaker,
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
    onExit: home,
  });
}
$('resume-test').onclick = () => {
  audio.start();
  openTest('final');
};
$('practice').onclick = () => {
  audio.start();
  openTest('practice');
};
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
    onHome: view === 'hud' ? home : undefined,
  });
}
document.querySelectorAll('[data-settings]').forEach((control) => {
  control.onclick = settings;
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
  },
});
$('developer').onclick = () => {
  if (!driving) developer.open();
};
for (const panel of [...opening, ...ending].slice(1)) {
  const image = new Image();
  image.src = new URL('./art/' + panel.image, import.meta.url).href;
}
home();
