import { control, element, makeMinigame, prop } from '../shared/minigame.js?v=finish-cue';

const compact = (pinyin) => pinyin.toLowerCase().replace(/\s+/g, '').normalize('NFC');
const withoutTones = (pinyin) => pinyin.normalize('NFD').replace(/[\u0300\u0301\u0304\u030c]/g, '');

export function rootLogin(words, play, onFinish) {
  const instructions = '输入上方词语的拼音，不加声调。';
  const game = makeMinigame('根系观察仪 · 登录', instructions, play, onFinish);
  game.root.classList.add('root-login');
  const monitor = prop(new URL('./art/screen-roots.webp', import.meta.url).href, 'root-login-monitor');
  const form = element('form', 'root-login-screen');
  const title = element('div', 'root-login-title', '根系观察仪 · 登录');
  title.setAttribute('aria-hidden', 'true');
  const progress = element('progress', 'root-login-progress');
  progress.max = words.length;
  progress.value = 0;
  progress.setAttribute('aria-label', '已通过的词语');
  const word = element('label', 'root-login-word');
  word.htmlFor = 'root-pinyin';
  word.setAttribute('aria-live', 'polite');
  const field = element('div', 'root-login-field');
  const input = element('input', 'root-login-input');
  input.id = word.htmlFor;
  input.type = 'text';
  input.inputMode = 'text';
  input.enterKeyHint = 'go';
  input.autocomplete = 'off';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  input.setAttribute('aria-label', '拼音密码');
  word.id = 'root-pinyin-word';
  game.status.id = 'root-pinyin-status';
  input.setAttribute('aria-describedby', word.id + ' ' + game.status.id);
  const submit = control('验证拼音', 'root-login-enter');
  submit.type = 'submit';
  submit.textContent = '↵';
  field.append(input, submit);
  form.append(title, progress, word, field, game.status);
  game.stage.replaceWith(monitor, form);

  let index = 0;
  word.textContent = words[index].word;
  form.onsubmit = (event) => {
    event.preventDefault();
    const attempt = compact(input.value);
    if (index === words.length || !attempt) return;
    if (attempt !== compact(withoutTones(words[index].pinyin))) {
      input.setAttribute('aria-invalid', 'true');
      game.status.textContent = '拼音不对，再试一次。';
      game.feedback(field, 'bounce');
      input.focus();
      input.select();
      return;
    }

    input.removeAttribute('aria-invalid');
    input.value = '';
    progress.value = ++index;
    if (index === words.length) {
      input.disabled = true;
      submit.disabled = true;
      game.finish('登录成功，正在打开根系录像。', word, 'ding');
      return;
    }
    game.feedback(word, 'ding', true);
    word.textContent = words[index].word;
    game.status.textContent = '答对了。输入下一个词的拼音。';
    input.focus();
  };
  input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) {
      input.removeAttribute('aria-invalid');
      game.status.textContent = instructions;
    }
  });
  return { ...game, focusTarget: game.heading };
}
