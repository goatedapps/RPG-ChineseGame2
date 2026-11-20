import { words } from './curriculum.js';
import { bank } from './bank.js';

const characterFile = new URL('./vendor/lesson-characters.json', import.meta.url);
let characterData;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, className, action) {
  const control = element('button', className, label);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

const modeNames = { meaning: 'Tune the signal', trace: 'Repair the inscription', dictation: 'Hear and write' };

export function createPractice({ dialog, panel, onOpen, onClose, onCue, onRecord, getRecord }) {
  let screen = 0;
  let cancelWriting = () => {};
  const speech = window.speechSynthesis;
  let speechActive = false;
  let shortcuts = [];

  function release() {
    screen += 1;
    cancelWriting();
    cancelWriting = () => {};
    shortcuts = [];
    if (speechActive) speech?.cancel();
    speechActive = false;
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  dialog.addEventListener('close', () => {
    release();
    onClose();
  });

  dialog.addEventListener('keydown', (event) => {
    if (/^[1-4]$/.test(event.key) && shortcuts[Number(event.key) - 1]) {
      event.preventDefault();
      if (!event.repeat) shortcuts[Number(event.key) - 1].click();
    }
  });

  function start(meta, title, copy) {
    release();
    const top = element('div', 'panel-top');
    top.append(element('p', 'panel-meta', meta));
    const dismiss = button('×', 'close', close);
    dismiss.setAttribute('aria-label', 'Return to rooftop');
    top.append(dismiss);
    const heading = element('h2', '', title);
    heading.id = 'overlay-title';
    heading.tabIndex = -1;
    panel.replaceChildren(top, heading);
    if (copy) panel.append(element('p', 'panel-copy', copy));
    if (!dialog.open) {
      dialog.showModal();
      onOpen();
    }
    panel.parentElement.scrollTop = 0;
    heading.focus();
  }

  function speak(texts, status, rate) {
    if (!speech || !window.SpeechSynthesisUtterance) {
      status.textContent = 'Mandarin playback is unavailable on this device.';
      return;
    }
    const voices = speech.getVoices().filter((voice) =>
      /^(?:cmn(?:[-_]|$)|zh$|zh[-_](?:CN|SG|TW|Hans)(?:[-_]|$))/i.test(voice.lang));
    const preferred = voices.find((voice) => /zh[-_](SG|CN|Hans)/i.test(voice.lang)) ?? voices[0];
    if (!preferred) {
      status.textContent = 'No Mandarin voice was found. You can show the word and trace it.';
      return;
    }
    const revision = screen;
    speech.cancel();
    speechActive = true;
    status.textContent = 'Playing Mandarin…';
    for (const [index, text] of texts.entries()) {
      const line = new SpeechSynthesisUtterance(text);
      line.voice = preferred;
      line.lang = preferred.lang;
      line.rate = rate;
      line.onerror = (event) => {
        if (screen === revision && !['canceled', 'interrupted'].includes(event.error)) {
          status.textContent = 'The Mandarin voice could not play. Try again or show the word.';
        }
      };
      if (index === texts.length - 1) {
        line.onend = () => {
          if (screen === revision) {
            speechActive = false;
            if (status.textContent === 'Playing Mandarin…') status.textContent = 'Ready to write.';
          }
        };
      }
      speech.speak(line);
    }
  }

  function statusLine() {
    const node = element('p', 'status');
    node.setAttribute('role', 'status');
    return node;
  }

  function channels(choices, correct, status, complete, lang) {
    const group = element('div', 'channels');
    let resolved = false;
    shortcuts = choices.map((answer, index) => {
      const choice = button('', 'channel', () => {
        if (resolved) return;
        if (answer === correct) {
          resolved = true;
          choice.classList.add('correct');
          onCue('correct');
          complete();
        } else {
          choice.classList.add('wrong');
          status.textContent = 'Try another channel.';
          onCue('wrong');
        }
      });
      const label = element('span', '', answer);
      if (lang) label.lang = lang;
      choice.append(element('strong', '', String(index + 1)), label);
      group.append(choice);
      return choice;
    });
    panel.append(group);
  }

  function actionRow() {
    const row = element('div', 'panel-actions');
    panel.append(row);
    return row;
  }

  function continueWith(row, label, action) {
    const next = button(label, 'launch', action);
    row.append(next);
    next.focus();
  }

  function meaning(meta, word, next, exit) {
    start(meta, modeNames.meaning, 'Read the line and select the matching meaning. Press 1, 2, or 3.');
    const term = element('strong', 'term', word.word);
    term.lang = 'zh-Hans';
    const line = element('p', 'example', word.example);
    line.lang = 'zh-Hans';
    const status = statusLine();
    panel.append(term, line);
    let actions;
    channels(word.choices, word.meaning, status, () => {
      onRecord(word.word, 'meaning');
      status.textContent = 'Signal locked.';
      continueWith(actions, next ? 'Continue' : 'Back to field notes', next ?? exit);
    });
    panel.append(status);
    actions = actionRow();
    const support = button('Show pinyin', 'text-button', () => {
      support.replaceWith(element('span', 'pinyin', word.pinyin));
    });
    actions.append(support);
  }

  function getCharacterData() {
    if (!characterData) {
      characterData = fetch(characterFile).then((response) => {
        if (!response.ok) throw new Error('Could not load lesson characters.');
        return response.json();
      }).catch((error) => {
        characterData = null;
        throw error;
      });
    }
    return characterData;
  }

  function writing(meta, word, dictation, next, exit, guided = false) {
    const trace = !dictation || guided;
    start(meta, trace ? modeNames.trace : modeNames.dictation, trace
      ? 'Fill the squares in order. Follow the highlighted stroke if you get stuck.'
      : 'Play the Mandarin message, then write its target word in the blank squares.');
    const revision = screen;
    const status = statusLine();
    const boards = element('div', 'squares');
    if (trace) {
      const label = element('p', 'pinyin', word.word + ' · ' + word.pinyin);
      label.lang = 'zh-Hans';
      panel.append(label);
    } else {
      const row = actionRow();
      const message = [word.prompt, word.word];
      row.append(button('Play message', 'launch', () => speak(message, status, .9)));
      row.append(button('Play slowly', 'text-button', () => speak(message, status, .68)));
    }
    const slots = Array.from(word.word, () => element('div', 'square'));
    boards.append(...slots);
    panel.append(boards, status);
    const actions = actionRow();
    if (!trace) {
      actions.append(button('Show word and trace', 'text-button', () => writing(meta, word, true, next, exit, true)));
    }
    const finish = (activity) => {
      if (activity) {
        onRecord(word.word, activity);
        onCue('correct');
      }
      actions.replaceChildren();
      continueWith(actions, next ? 'Continue' : 'Back to field notes', next ?? exit);
    };
    getCharacterData().then((data) => {
      if (screen !== revision) return;
      const Writer = window.HanziWriter;
      const characters = Array.from(word.word);
      if (!Writer || characters.some((char) => !data[char])) throw new Error('Stroke practice unavailable.');
      const writers = characters.map((char, index) => {
        const size = Math.max(54, Math.floor(slots[index].getBoundingClientRect().width) - 2);
        slots[index].setAttribute('aria-label', 'Character ' + (index + 1));
        return Writer.create(slots[index], char, {
          width: size, height: size, padding: 7, showCharacter: false, showOutline: trace,
          strokeColor: '#173830', outlineColor: '#9cb09a', highlightColor: '#718d42',
          drawingColor: '#254e41', leniency: 1.27,
          charDataLoader: (character, ready) => ready(data[character]),
        });
      });
      cancelWriting = () => writers.forEach((writer) => writer.cancelQuiz());
      function quiz(index) {
        writers[index].quiz({
          showHintAfterMisses: trace ? 2 : false,
          onComplete: () => {
            if (screen !== revision) return;
            slots[index].classList.add('complete');
            if (index + 1 < writers.length) quiz(index + 1);
            else {
              status.textContent = trace ? 'Inscription repaired.' : 'Message recorded.';
              finish(trace ? 'trace' : 'dictation');
            }
          },
        });
      }
      quiz(0);
    }).catch(() => {
      if (screen !== revision) return;
      status.textContent = 'Stroke practice could not load.';
      actions.replaceChildren(button('Try again', 'text-button', () => writing(meta, word, dictation, next, exit, guided)));
      if (next) actions.append(button('Continue rescue', 'text-button', () => finish()));
    });
  }

  function wordEntry(word) {
    start('Field notes · P6 Lesson 1', word.word, word.meaning);
    const pinyin = element('p', 'pinyin', word.pinyin);
    const example = element('p', 'example', word.example);
    example.lang = 'zh-Hans';
    panel.append(pinyin, example);
    const actions = actionRow();
    const meta = 'Field notes · ' + word.word;
    const exit = () => wordEntry(word);
    actions.append(
      button('Check meaning', 'launch', () => meaning(meta, word, null, exit)),
      button('Trace', 'text-button', () => writing(meta, word, false, null, exit)),
      button('Try dictation', 'text-button', () => writing('Field notes · Dictation', word, true, null, exit)),
      button('All words', 'text-button', journal),
    );
  }

  function journal() {
    start('P6 Lesson 1', 'Field notes', 'Practise any of the 24 Tingxie words or work through a short set from the P6 question bank.');
    const actions = actionRow();
    actions.append(button('Question bank', 'launch', () => showBank(0, 0)));
    const list = element('ul', 'word-list');
    for (const word of words) {
      const practices = getRecord(word.word).length;
      const row = button('', 'word-row', () => wordEntry(word));
      const label = element('b', '', word.word);
      label.lang = 'zh-Hans';
      row.append(label, element('span', '', word.pinyin), element('span', '', word.meaning), element('strong', '', practices + '/3'));
      const entry = element('li');
      entry.append(row);
      list.append(entry);
    }
    panel.append(list);
  }

  function showBank(index, firstCorrect) {
    if (index === bank.length) {
      start('P6 question bank', 'Set complete', 'First try: ' + firstCorrect + ' of ' + bank.length);
      const actions = actionRow();
      actions.append(button('Try again', 'launch', () => showBank(0, 0)), button('All words', 'text-button', journal));
      return;
    }
    const item = bank[index];
    const tag = item.lessonIds.length ? 'Lesson 1' : 'Mixed review';
    start(tag + ' · ' + (index + 1) + ' / ' + bank.length, 'Question bank');
    const prompt = element('p', 'example', item.prompt);
    prompt.lang = 'zh-Hans';
    const status = statusLine();
    panel.append(prompt);
    let missed = false;
    let actions;
    channels(item.choices, item.correct, status, () => {
      status.textContent = 'Correct.';
      continueWith(actions, 'Next question', () => showBank(index + 1, firstCorrect + Number(!missed)));
    }, 'zh-Hans');
    for (const choice of shortcuts) {
      choice.addEventListener('click', () => { missed ||= choice.classList.contains('wrong'); });
    }
    panel.append(status);
    actions = actionRow();
    actions.append(button('All words', 'text-button', journal));
  }

  function relay(sector, index, update, finish) {
    const selected = sector.words.filter((word, position) => word.mode !== 'meaning' || position === 0 || position === 3);
    const word = selected[index];
    const meta = sector.title + ' · ' + (index + 1) + ' / ' + selected.length;
    function next() {
      update(index + 1);
      if (index + 1 < selected.length) relay(sector, index + 1, update, finish);
      else {
        close();
        finish();
      }
    }
    if (word.mode === 'meaning') meaning(meta, word, next);
    else writing(meta, word, word.mode === 'dictation', next);
  }

  function victory(dewCount, restart) {
    start('P6 Lesson 1 · Rescue complete', 'The greenhouse is alive.', 'All three relays are online. The seedlings have their light back.');
    panel.append(element('p', 'status', dewCount + ' / 9 dew drops recovered'));
    const actions = actionRow();
    actions.append(button('Explore field notes', 'launch', journal), button('Replay rooftop', 'text-button', () => {
      close();
      restart();
    }));
  }

  return { close, journal, relay, victory };
}
