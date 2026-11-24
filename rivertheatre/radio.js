import { art } from './story.js';

export function createRadio(host, { onOpen, onClose, onHint }) {
  const icon = document.createElement('img');
  icon.src = art('radio');
  icon.alt = '';
  const dock = document.createElement('button');
  dock.type = 'button';
  dock.className = 'rescue-radio';
  dock.lang = 'en';
  dock.setAttribute('aria-label', 'Open walkie-talkie');
  dock.setAttribute('aria-haspopup', 'dialog');
  dock.append(icon);
  const sheet = document.createElement('dialog');
  sheet.className = 'rescue-radio-sheet';
  sheet.lang = 'en';
  sheet.setAttribute('aria-label', 'Stage caller walkie-talkie');
  const unit = document.createElement('div');
  unit.className = 'rescue-radio-unit';
  const image = icon.cloneNode();
  const heading = document.createElement('h2');
  heading.textContent = 'Stage caller';
  const message = document.createElement('p');
  const hint = document.createElement('p');
  hint.className = 'rescue-radio-hint';
  const help = document.createElement('button');
  help.type = 'button';
  help.textContent = 'Need a hint';
  help.className = 'radio-hint-key';
  const mark = document.createElement('button');
  mark.type = 'button';
  mark.textContent = 'Mark the spot';
  mark.className = 'radio-hint-key';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back to rescue';
  back.className = 'radio-talk-key';
  const keys = document.createElement('div');
  keys.className = 'radio-keys';
  keys.append(help, mark, back);
  const device = document.createElement('div');
  device.className = 'rescue-radio-device';
  device.append(image, keys);
  unit.append(heading, device, message, hint);
  sheet.append(unit);
  host.append(dock, sheet);
  let current;
  const seenHints = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function transmit(line, text, animate) {
    line.textContent = text;
    if (!animate || reducedMotion.matches) return;
    const transcript = document.createElement('span');
    transcript.className = 'rescue-transcript';
    transcript.textContent = text;
    const typing = document.createElement('span');
    typing.className = 'rescue-typing';
    typing.setAttribute('aria-hidden', 'true');
    line.replaceChildren(transcript, typing);
    const start = performance.now();
    const duration = Math.min(text.length * 13, 2100);
    function tick(time) {
      if (!sheet.open || !typing.isConnected) return;
      if (time - start >= duration) { line.textContent = text; return; }
      typing.textContent = text.slice(0, Math.floor((time - start) / duration * text.length));
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function open() {
    if (host.hidden || sheet.open || !current) return;
    const unread = dock.dataset.unread === 'true';
    dock.dataset.unread = 'false';
    dock.setAttribute('aria-label', 'Open walkie-talkie');
    hint.textContent = current.hint;
    hint.hidden = mark.hidden = true;
    help.hidden = false;
    sheet.showModal();
    transmit(message, current.guide, unread);
    back.focus();
    onOpen(current.id);
  }
  function receive(chapter, unread) {
    const changed = chapter !== current;
    current = chapter;
    dock.dataset.unread = String(Boolean(unread));
    dock.setAttribute('aria-label', unread ? 'Open walkie-talkie, new message' : 'Open walkie-talkie');
    if (unread && changed) navigator.vibrate?.(120);
  }
  dock.onclick = open;
  back.onclick = () => sheet.close();
  help.onclick = () => {
    if (!hint.hidden) return;
    hint.hidden = mark.hidden = false;
    transmit(hint, current.hint, !seenHints.has(current.id));
    seenHints.add(current.id);
  };
  mark.onclick = () => { onHint(current.id); sheet.close(); };
  sheet.addEventListener('close', onClose);
  sheet.addEventListener('click', (event) => { if (event.target === sheet) sheet.close(); });
  return { receive, open, close: () => sheet.close(), get isOpen() { return sheet.open; } };
}
