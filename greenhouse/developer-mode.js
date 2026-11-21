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

export function createDeveloperMode({ panel, openPanel, canSkip, getSkipLabel, onSkip, onSkipDictation }) {
  let unlocked = false;
  let skipDictation = false;

  function open() {
    openPanel(null, '开发者模式');
    if (unlocked) showControls();
    else showUnlock();
  }

  function showUnlock() {
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
    form.append(label, row, error);
    panel.append(form);
    password.focus({ preventScroll: true });

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

  function showControls() {
    const row = makeElement('label', '', 'developer-option');
    const checkbox = makeElement('input');
    checkbox.id = 'developer-skip-dictation';
    checkbox.type = 'checkbox';
    checkbox.checked = skipDictation;
    row.append(makeElement('span', '自动跳过听写'), checkbox);
    checkbox.addEventListener('change', () => {
      if (!unlocked) return;
      skipDictation = checkbox.checked;
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

    const buttons = makeElement('div', '', 'button-row developer-actions');
    buttons.append(skip, lock);
    panel.append(row, buttons);
  }

  return { open, get skipDictation() { return unlocked && skipDictation; } };
}
