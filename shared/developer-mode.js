const developerPassword = 'greenhouse';
const sessionKey = 'rpg-chinese.developer';
const worldsKey = 'rpg-chinese.developer.open-worlds';

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

function settingsForTab() {
  try {
    const value = sessionStorage.getItem(sessionKey);
    const unlocked = value === 'on' || value === 'off';
    return { unlocked, skip: value === 'on', worlds: unlocked && sessionStorage.getItem(worldsKey) === 'on' };
  } catch {
    return { unlocked: false, skip: false, worlds: false };
  }
}

export function developerSkipEnabled() {
  return settingsForTab().skip;
}

export function developerWorldsEnabled() {
  return settingsForTab().worlds;
}

export function createDeveloperMode({ panel, openPanel, taskCount = 0, canJump, currentTask, onJump, onSkipDictation, onUnlockWorlds, onClose }) {
  const settings = settingsForTab();
  function persist() {
    try { sessionStorage.setItem(sessionKey, settings.skip ? 'on' : 'off'); } catch {}
  }
  function setSkipDictation(value) {
    if (!settings.unlocked || settings.skip === value) return;
    settings.skip = value;
    persist();
    onSkipDictation?.(value);
  }

  function open() {
    const saved = settingsForTab();
    if (saved.unlocked) Object.assign(settings, saved);
    openPanel('Developer mode');
    const content = makeElement('div', '', 'developer-menu');
    content.lang = 'en';
    if (settings.unlocked) showControls(content);
    else showUnlock(content);
    const close = makeButton('Close', 'text-button developer-footer');
    close.onclick = onClose;
    content.append(close);
    panel.append(content);
    content.querySelector('input').focus({ preventScroll: true });
  }

  function showUnlock(content) {
    const form = makeElement('form', '', 'developer-unlock');
    const label = makeElement('label', 'Password');
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
    const submit = makeElement('button', 'Unlock', 'primary');
    submit.type = 'submit';
    const row = makeElement('div', '', 'developer-password-row');
    row.append(password, submit);
    form.append(label, row, error);
    content.append(form);

    password.addEventListener('input', () => {
      error.textContent = '';
      password.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (password.value !== developerPassword) {
        error.textContent = 'Incorrect password.';
        password.setAttribute('aria-invalid', 'true');
        password.select();
        return;
      }
      settings.unlocked = true;
      persist();
      open();
    });
  }

  function addSwitch(content, id, title, help, checked, onChange) {
    const row = makeElement('label', '', 'developer-option');
    const checkbox = makeElement('input');
    checkbox.id = id;
    checkbox.type = 'checkbox';
    checkbox.setAttribute('role', 'switch');
    checkbox.checked = checked;
    const copy = makeElement('span');
    const label = makeElement('strong', title);
    label.id = id + '-title';
    const description = makeElement('small', help, 'developer-description');
    description.id = id + '-description';
    checkbox.setAttribute('aria-labelledby', label.id);
    checkbox.setAttribute('aria-describedby', description.id);
    copy.append(label, description);
    const track = makeElement('span', '', 'settings-track');
    const state = makeElement('span', checked ? 'On' : 'Off', 'settings-state');
    track.setAttribute('aria-hidden', 'true');
    state.setAttribute('aria-hidden', 'true');
    row.append(copy, state, checkbox, track);
    checkbox.addEventListener('change', () => {
      state.textContent = checkbox.checked ? 'On' : 'Off';
      onChange(checkbox.checked);
    });
    content.append(row);
  }

  function showControls(content) {
    if (onUnlockWorlds) {
      addSwitch(content, 'developer-open-worlds', 'Unlock all lessons',
        'Open every published lesson in this tab, regardless of progress.', settings.worlds, (enabled) => {
          settings.worlds = enabled;
          try { sessionStorage.setItem(worldsKey, enabled ? 'on' : 'off'); } catch {}
          onUnlockWorlds(enabled);
        });
    }
    addSwitch(content, 'developer-skip-dictation', 'Skip dictation',
      'Skips task dictation and the final test until you turn it off in this tab.', settings.skip, setSkipDictation);
    if (!taskCount) return;
    const task = makeElement('form', '', 'developer-task');
    const taskLabel = makeElement('label', 'Jump to task');
    taskLabel.htmlFor = 'developer-task-number';
    const select = makeElement('select');
    select.id = taskLabel.htmlFor;
    const prompt = makeElement('option', 'Select a task');
    prompt.value = '';
    select.append(prompt);
    const active = currentTask();
    for (let index = 0; index < taskCount; index++) {
      const option = makeElement('option', `Task ${index + 1}${active === index ? ' (current)' : ''}`);
      option.value = String(index + 1);
      select.append(option);
    }
    select.disabled = !canJump();
    const jump = makeButton('Go to task', 'primary');
    jump.id = 'developer-skip-task';
    jump.type = 'submit';
    jump.disabled = true;
    select.addEventListener('change', () => { jump.disabled = !select.value; });
    task.addEventListener('submit', (event) => {
      event.preventDefault();
      const taskNumber = Number(select.value);
      if (settings.unlocked && canJump() && Number.isInteger(taskNumber) && taskNumber >= 1 && taskNumber <= taskCount) onJump(taskNumber - 1);
    });
    const controls = makeElement('div', '', 'developer-jump-row');
    controls.append(select, jump);
    task.append(taskLabel, controls);
    if (select.disabled) task.append(makeElement('p', 'Task jumping is unavailable on this screen.', 'developer-description'));
    content.append(task);
  }

  return {
    open,
    setSkipDictation,
    get skipDictation() { return settings.unlocked && settings.skip; },
  };
}
