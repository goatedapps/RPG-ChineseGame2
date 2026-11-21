import { dictationButton } from '../shared/speaker.js?v=radio-briefings';
import { currentLessonQuestion, revealLessonWord, completeLessonQuestion } from './lesson-test.js';
import { createWriting } from './writing.js';

const helpEN = '看字 (Show word) reveals the answer. That word comes back at the end.';
const poster = new URL('./art/science-poster.webp', import.meta.url);

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function button(className, text, action) {
  const control = node('button', className, text);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

export function createLessonTestView(host, { bank, state: initialState, mode, speak, stopSpeech, cue, onProgress, onPass, onExit }) {
  const title = mode === 'practice' ? '词语练习' : '课末测试';
  let state = initialState;
  let stopWriting = () => {};
  let motion;
  let englishOpen = false;
  let destroyed = false;
  host.setAttribute('aria-labelledby', 'lesson-test-title');

  function save(nextState) {
    state = nextState;
    onProgress(state);
  }

  function clearPage() {
    stopWriting();
    stopWriting = () => {};
    stopSpeech();
    motion?.revert();
    motion = undefined;
  }

  function celebrate() {
    const sheet = node('article', 'lesson-test-sheet lesson-test-award');
    const art = node('img', 'lesson-test-award-art');
    art.src = poster.href;
    art.alt = '';
    art.width = 480;
    art.height = 720;
    const copy = node('div', 'lesson-test-award-copy');
    const seal = node('span', 'lesson-test-seal', '✓');
    seal.setAttribute('aria-hidden', 'true');
    const heading = node('h2', '', mode === 'practice' ? '词语练习完成！' : '第一课完成！');
    heading.id = 'lesson-test-title';
    heading.tabIndex = -1;
    const message = node('p', '', '所有词语，你都能独立写出来了。');
    const home = button('lesson-test-next', '返回首页', onExit);
    copy.append(seal, heading, message, home);
    sheet.append(art, copy);
    host.replaceChildren(sheet);
    onPass();
    heading.focus({ preventScroll: true });
    cue('finish');
    speak(heading.textContent);
    const gsap = window.gsap;
    if (gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      motion = gsap.context(() => {
        gsap.fromTo(seal, { scale: 1.36, rotation: -16, opacity: 0 },
          { scale: 1, rotation: -8, opacity: 1, ease: 'back.out(1.6)', duration: .43 });
        gsap.fromTo([heading, message], { y: 10, opacity: 0 },
          { y: 0, opacity: 1, ease: 'power2.out', duration: .35, stagger: .085 });
      }, sheet);
    }
  }

  function render(first = false) {
    if (destroyed) return;
    clearPage();
    const question = currentLessonQuestion(bank, state);
    if (!question) {
      celebrate();
      return;
    }

    const sheet = node('article', 'lesson-test-sheet');
    const header = node('header', 'lesson-test-header');
    const heading = node('h2', '', title);
    heading.id = 'lesson-test-title';
    heading.tabIndex = -1;
    const counter = node('p', 'lesson-test-counter', `已掌握 ${question.mastered} / ${question.total}`);
    const bar = node('progress', 'lesson-test-progress');
    bar.setAttribute('aria-label', '已掌握的词语');
    bar.max = question.total;
    bar.value = question.mastered;
    const saveAndLeave = button('lesson-test-pause', '保存并返回首页', onExit);
    header.append(heading, counter, saveAndLeave, bar);

    const layout = node('div', 'lesson-test-layout');
    const prompt = node('div', 'lesson-test-prompt');
    const promptTools = node('div', 'lesson-test-tools');
    const spokenGap = question.revealed ? question.word : '，空格，';
    const read = dictationButton({ speak, stop: stopSpeech }, question.before + spokenGap + question.after);
    read.classList.add('lesson-test-icon', 'lesson-test-speaker');
    const translation = node('p', 'lesson-test-translation', helpEN);
    translation.lang = 'en';
    translation.id = 'lesson-test-english';
    translation.hidden = !englishOpen;
    const english = button('lesson-test-icon lesson-test-en', 'EN', () => {
      englishOpen = !englishOpen;
      translation.hidden = !englishOpen;
      english.setAttribute('aria-expanded', String(englishOpen));
    });
    english.title = 'English';
    english.setAttribute('aria-label', '英文说明');
    english.setAttribute('aria-controls', translation.id);
    english.setAttribute('aria-expanded', String(englishOpen));
    if (question.review) promptTools.append(node('p', 'lesson-test-review', '再试一次'));
    promptTools.append(read, english);
    const sentence = node('p', 'lesson-test-sentence');
    sentence.tabIndex = -1;
    const gap = node('span', 'lesson-test-gap', question.revealed ? question.word : '');
    const characters = [...question.word];
    gap.style.setProperty('--characters', characters.length);
    if (!question.revealed) gap.setAttribute('aria-label', '空格');
    sentence.append(question.before, gap, question.after);

    const help = node('div', 'lesson-test-help');
    if (question.revealed) {
      help.append(node('p', 'lesson-test-revealed', '这个词稍后再试。'));
    } else {
      const showWord = button('lesson-test-show-word', '看字', () => {
        save(revealLessonWord(state));
        render();
      });
      help.append(showWord);
    }
    prompt.append(promptTools, sentence, translation, help);

    const writing = node('div', 'lesson-test-writing');
    const grid = node('div', 'lesson-test-grid');
    const progress = node('ol', 'writing-progress');
    progress.setAttribute('aria-label', '书写进度');
    const markers = characters.map((_, index) => node('li', '', String(index + 1)));
    progress.append(...markers);
    const status = node('p', 'lesson-test-feedback');
    status.id = 'lesson-test-status';
    status.setAttribute('role', 'status');
    const controls = node('div', 'lesson-test-controls');
    const next = button('lesson-test-next', '继续', () => render());
    next.disabled = true;
    controls.append(next);
    writing.append(grid, progress, status, controls);
    layout.append(prompt, writing);
    sheet.append(header, layout);
    host.replaceChildren(sheet);
    host.scrollTop = 0;
    (first ? heading : sentence).focus({ preventScroll: true });

    function updateCharacters(completed) {
      markers.forEach((marker, index) => {
        marker.textContent = index < completed ? characters[index] : String(index + 1);
        marker.classList.toggle('complete', index < completed);
        if (index === completed) marker.setAttribute('aria-current', 'step');
        else marker.removeAttribute('aria-current');
      });
    }

    updateCharacters(0);
    stopWriting = createWriting(grid, question.word, question.revealed, () => {
      save(completeLessonQuestion(bank, state));
      const remaining = currentLessonQuestion(bank, state);
      const mastered = remaining?.mastered ?? question.total;
      counter.textContent = `已掌握 ${mastered} / ${question.total}`;
      bar.value = mastered;
      gap.textContent = question.word;
      gap.removeAttribute('aria-label');
      help.querySelector('button')?.remove();
      status.textContent = '写对了！';
      if (!remaining) next.textContent = '完成测验';
      next.disabled = false;
      cue('correct');
    }, () => {
      status.textContent = '书写格未能载入。';
      controls.replaceChildren(button('lesson-test-next', '重新载入书写格', () => render()));
    }, () => {
      status.textContent = '这一笔再试一次。';
    }, (completed) => {
      status.textContent = '';
      updateCharacters(completed);
    }, { hintsAfterMisses: question.revealed ? 2 : false });
  }

  render(true);
  return () => {
    if (destroyed) return;
    destroyed = true;
    clearPage();
    host.replaceChildren();
    host.removeAttribute('aria-labelledby');
  };
}
