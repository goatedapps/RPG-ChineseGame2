const developerPassword = 'greenhouse';

function makeElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function makeButton(text, className) {
  const button = makeElement('button', text, className);
  button.type = 'button';
  return button;
}

export function createDeveloperMode({
  panel,
  openPanel,
  canSkip,
  getSkipLabel,
  onSkip,
  onSkipDictation,
  onClose,
}) {
  let unlocked = false;
  let skipDictation = false;

  function open() {
    openPanel(null, '开发者模式');
    const content = makeElement('div', '', 'developer-menu');
    if (unlocked) showControls(content);
    else showUnlock(content);
    if (onClose) {
      const close = makeButton('关闭菜单', 'text-button developer-footer');
      close.onclick = onClose;
      (content.querySelector('.developer-footer-actions') ?? content).append(close);
    }
    panel.append(content);
    content.querySelector(unlocked ? '#developer-skip-dictation' : '#developer-password').focus({ preventScroll: true });
  }

  function showUnlock(content) {
    const form = makeElement('form', '', 'developer-unlock');
    const label = makeElement('label', '密码');
    const password = makeElement('input');
    password.id = 'developer-password';
    label.htmlFor = password.id;
    password.type = 'password';
    password.required = true;
    password.autocomplete = 'off';
    password.setAttribute('autocapitalize', 'none');
    password.spellcheck = false;
    const error = makeElement('p', '', 'developer-error');
    error.id = 'developer-error';
    error.setAttribute('role', 'alert');
    password.setAttribute('aria-describedby', error.id);
    const submit = makeElement('button', '解锁', 'primary');
    submit.type = 'submit';
    const row = makeElement('div', '', 'developer-password-row');
    row.append(password, submit);
    form.append(makeElement('p', '输入密码后，可使用任务和听写测试工具。', 'developer-description'), label, row, error);
    content.append(form);

    password.addEventListener('input', () => {
      error.textContent = '';
      password.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (password.value !== developerPassword) {
        error.textContent = '密码不正确。';
        password.setAttribute('aria-invalid', 'true');
        password.select();
        return;
      }
      unlocked = true;
      open();
    });
  }

  function showControls(content) {
    const row = makeElement('label', '', 'developer-option');
    const checkbox = makeElement('input');
    checkbox.id = 'developer-skip-dictation';
    checkbox.type = 'checkbox';
    checkbox.setAttribute('role', 'switch');
    checkbox.checked = skipDictation;
    const copy = makeElement('span');
    const label = makeElement('strong', '自动跳过听写');
    label.id = 'developer-dictation-title';
    const description = makeElement('small', '适用于任务听写和课末测试', 'developer-description');
    description.id = 'developer-dictation-description';
    checkbox.setAttribute('aria-labelledby', label.id);
    checkbox.setAttribute('aria-describedby', description.id);
    copy.append(label, description);
    const track = makeElement('span', '', 'settings-track');
    const state = makeElement('span', skipDictation ? '已开启' : '已关闭', 'settings-state');
    track.setAttribute('aria-hidden', 'true');
    state.setAttribute('aria-hidden', 'true');
    row.append(copy, state, checkbox, track);
    checkbox.addEventListener('change', () => {
      if (!unlocked) return;
      skipDictation = checkbox.checked;
      state.textContent = skipDictation ? '已开启' : '已关闭';
      onSkipDictation(skipDictation);
    });

    const skip = makeButton(getSkipLabel(), 'primary');
    skip.id = 'developer-skip-task';
    skip.disabled = !canSkip();
    skip.addEventListener('click', () => {
      if (unlocked && canSkip()) onSkip();
    });

    const lock = makeButton('锁定开发者模式', 'text-button');
    lock.id = 'developer-lock';
    lock.addEventListener('click', () => {
      unlocked = false;
      const wasSkipping = skipDictation;
      skipDictation = false;
      if (wasSkipping) onSkipDictation(false);
      open();
    });

    const task = makeElement('div', '', 'developer-task');
    task.append(makeElement('p', skip.disabled ? '此处没有可跳过的任务。' : '立即前往下一项任务。', 'developer-description'), skip);
    lock.classList.add('developer-footer');
    const footer = makeElement('div', '', 'developer-footer-actions');
    footer.append(lock);
    content.append(row, task, makeElement('p', '这些设置只在本次游玩生效。', 'developer-description'), footer);
  }

  return {
    open,
    get skipDictation() {
      return unlocked && skipDictation;
    },
  };
}
