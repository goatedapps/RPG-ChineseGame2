import { dictationButton } from '../shared/speaker.js?v=radio-briefings';
import { createWriting } from '../greenhouse/writing.js';
import {
  createLessonTest,
  restoreLessonTest,
  currentLessonQuestion,
  revealLessonWord,
  completeLessonQuestion,
} from '../greenhouse/lesson-test.js';
import { words } from './curriculum.js';

const sentences = Object.fromEntries(
  words.map(({ word, sentences }) => [word, sentences]),
);
const strokeDataUrl = new URL('./stroke-data.json', import.meta.url);

export function mountWriting(host, word, options) {
  const { guided = false, hints = 5, onComplete } = options;
  host.innerHTML =
    '<div class="writing-layout"><div class="writing-square-host"></div><div class="writing-markers" aria-label="书写进度"></div></div><p class="assessment-note" role="status"></p>';
  const input = host.querySelector('.writing-square-host');
  const marks = host.querySelector('.writing-markers');
  const notice = host.querySelector('[role=status]');
  const markerList = [...word].map((character, index) => {
    const marker = document.createElement('span');
    marker.textContent = guided ? character : (index + 1).toString();
    marker.dataset.current = String(index === 0);
    marks.append(marker);
    return marker;
  });
  const writing = createWriting(
    input,
    word,
    guided,
    onComplete,
    () => {
      notice.textContent = '书写资料暂时无法加载。请关闭后重试。';
    },
    ({ mistakesOnStroke }) => {
      notice.textContent =
        mistakesOnStroke > 0 ? '再试一次，留意笔画的方向。' : '';
    },
    (count) => {
      markerList.forEach((marker, index) => {
        marker.dataset.done = String(index < count);
        marker.dataset.current = String(index === count);
      });
      notice.textContent = '写好了 ' + count + ' 个字。';
    },
    { strokeDataUrl, hintsAfterMisses: hints },
  );
  return writing;
}

export function mountTest(
  host,
  { mode, saved, speak, stopSpeech, cue, onProgress, onPass, onExit, onReplay, onDeveloper },
) {
  let state = saved
    ? restoreLessonTest(sentences, saved)
    : createLessonTest(sentences);
  let stopWriting = () => {};
  function paint() {
    stopWriting();
    stopSpeech();
    const item = currentLessonQuestion(sentences, state);
    if (!item) {
      onPass();
      host.innerHTML =
        '<div class="assessment-card"><p class="tag">月桥亮起来了</p><h2 id="assessment-title" tabindex="-1">全部写对了！</h2><p class="note">你完成了三年级华文第一课。</p><div class="buttons"><button class="gold">返回星图</button></div></div>';
      host.querySelector('button').onclick = onExit;
      host.querySelector('h2').focus();
      return;
    }
    host.innerHTML =
      '<div class="assessment-card"><header class="test-top"><div><p class="tag">月桥竞速</p><h2 id="assessment-title" tabindex="-1">' +
      (mode === 'final' ? '课末测试' : '词语练习') +
      '</h2></div><div class="test-actions"><button class="leave">保存并返回星图</button></div></header>' +
      '<p class="note">' +
      (item.review ? '再试一次 · ' : '') +
      '已完成 ' +
      item.mastered +
      ' / ' +
      item.total +
      '</p>' +
      '<p class="sentence"></p><div class="response"></div>' +
      '<div class="buttons"><button class="reveal">看字</button></div><p class="note reveal-note"></p></div>';
    host.querySelector('.sentence').textContent =
      item.before + (item.revealed ? item.word : '＿＿') + item.after;
    const text = item.before + '，' + (item.revealed ? item.word + '，' : '') + item.after;
    host.querySelector('.buttons').prepend(dictationButton({ speak, stop: stopSpeech }, text));
    const leave = host.querySelector('.leave');
    leave.onclick = onExit;
    if (onReplay) {
      const replay = document.createElement('button');
      replay.type = 'button';
      replay.textContent = '重玩任务';
      replay.onclick = onReplay;
      leave.after(replay);
    }
    if (onDeveloper) {
      const developer = document.createElement('button');
      developer.type = 'button';
      developer.textContent = '开发者模式';
      developer.onclick = onDeveloper;
      host.querySelector('.test-actions').append(developer);
    }
    const reveal = host.querySelector('.reveal');
    reveal.disabled = item.revealed;
    reveal.onclick = () => {
      state = revealLessonWord(state);
      onProgress(state);
      paint();
    };
    if (item.revealed)
      host.querySelector('.reveal-note').textContent =
        '照着写一次。这个词稍后会换个句子再考。';
    stopWriting = mountWriting(host.querySelector('.response'), item.word, {
      guided: item.revealed,
      hints: item.revealed ? 5 : false,
      onComplete: () => {
        cue('correct');
        state = completeLessonQuestion(sentences, state);
        onProgress(state);
        paint();
      },
    });
    host.querySelector('h2').focus();
  }
  onProgress(state);
  paint();
  return () => {
    stopWriting();
    stopSpeech();
  };
}
