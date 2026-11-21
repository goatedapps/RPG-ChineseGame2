function element(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function button(cls, text, label) {
  const node = element('button', cls, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
}

export function createPhone(host, { onToggle, onNotify } = {}) {
  host.classList.add('field-phone');
  host.lang = 'en';

  const dock = button('phone-dock', '', 'Open phone');
  const glass = element('span', 'phone-dock-glass');
  const badge = element('span', 'phone-badge');
  badge.hidden = true;
  badge.setAttribute('aria-hidden', 'true');
  glass.setAttribute('aria-hidden', 'true');
  glass.append(element('span', 'phone-dock-chat'));
  dock.append(glass, badge);
  dock.setAttribute('aria-haspopup', 'dialog');
  dock.setAttribute('aria-controls', 'phone-screen');
  dock.setAttribute('aria-expanded', 'false');
  dock.setAttribute('aria-keyshortcuts', 'F');
  dock.title = 'Open phone (F)';

  const alert = button('phone-alert', '');
  alert.hidden = true;
  const alertTitle = element('strong', 'phone-alert-title');
  const alertSummary = element('span', 'phone-alert-summary');
  alert.append(element('span', 'phone-alert-icon'), alertTitle, alertSummary);
  const status = element('span', 'phone-visually-hidden');
  status.setAttribute('role', 'status');

  const sheet = element('dialog', 'phone-sheet');
  sheet.id = 'phone-screen';
  sheet.setAttribute('aria-labelledby', 'phone-contact');
  const screen = element('div', 'phone-glass');
  const header = element('header', 'phone-header');
  const statusBar = element('div', 'phone-statusbar');
  statusBar.setAttribute('aria-hidden', 'true');
  const clock = element('span', 'phone-clock');
  statusBar.append(clock, element('span', 'phone-camera'), element('span', 'phone-battery'));
  const contact = element('div', 'phone-contact-line');
  const closeButton = button('phone-back', '‹', 'Put down phone');
  const avatar = element('span', 'phone-avatar', 'AN');
  avatar.setAttribute('aria-hidden', 'true');
  const heading = element('h2', 'phone-contact', 'Ah Ning');
  heading.id = 'phone-contact';
  contact.append(closeButton, avatar, heading);
  header.append(statusBar, contact);

  const scroll = element('div', 'phone-scroll');
  const inbox = element('div', 'phone-inbox');
  inbox.setAttribute('role', 'log');
  inbox.setAttribute('aria-label', 'Messages');
  const empty = element('p', 'phone-empty', 'No messages yet');
  const hintSlot = element('div', 'phone-hint-slot');
  const activitySlot = element('div', 'phone-activity-slot');
  scroll.append(inbox, empty, hintSlot, activitySlot);

  const composer = element('form', 'phone-composer');
  composer.hidden = true;
  const prompt = element('p', 'phone-prompt');
  prompt.id = 'phone-prompt';
  const replyRow = element('div', 'phone-reply-row');
  const input = element('input', 'phone-reply');
  input.id = 'phone-reply';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('enterkeyhint', 'send');
  input.setAttribute('aria-labelledby', prompt.id);
  input.setAttribute('aria-describedby', 'phone-reply-feedback');
  const send = button('phone-send', 'Send');
  send.type = 'submit';
  replyRow.append(input, send);
  const choices = element('div', 'phone-choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-labelledby', prompt.id);
  const feedback = element('p', 'phone-feedback');
  feedback.id = 'phone-reply-feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  composer.append(prompt, replyRow, choices, feedback);

  const home = button('phone-home', '', 'Put down phone');
  home.append(element('span', 'phone-home-indicator'));
  screen.append(header, scroll, composer, home);
  sheet.append(screen);
  host.replaceChildren(alert, dock, status, sheet);

  const seen = new Set();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.visualViewport;
  const timeFormat = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' });
  let unread = 0;
  let hintUnread = false;
  let activeHint;
  let activeChallenge;
  let activityId;
  let expanded = false;
  let lastBuzz = -Infinity;
  let buzz;

  function time() {
    return timeFormat.format(new Date());
  }

  function scrollToLatest() {
    scroll.scrollTop = scroll.scrollHeight;
  }

  function fitViewport() {
    if (!viewport) return;
    const obscured = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    sheet.style.setProperty('--phone-viewport', `${viewport.height}px`);
    sheet.style.setProperty('--phone-keyboard', `${obscured}px`);
    if (document.activeElement === input) scrollToLatest();
  }

  function appendMessage(text, outgoing = false) {
    if (!text) return;
    const item = element('div', 'phone-bubble ' + (outgoing ? 'outgoing' : 'incoming'));
    const meta = element('span', 'phone-visually-hidden', outgoing ? 'You' : 'Ah Ning');
    item.append(meta, element('p', 'phone-message-text', text), element('time', 'phone-message-time', time()));
    inbox.append(item);
    empty.hidden = true;
    if (expanded) scrollToLatest();
  }

  function updateDock() {
    const total = unread + Number(hintUnread);
    badge.textContent = total > 9 ? '9+' : String(total);
    badge.hidden = total === 0;
    dock.setAttribute('aria-label', total ? `Open phone, ${total} unread ${total === 1 ? 'notification' : 'notifications'}` : 'Open phone');
    alert.hidden = expanded || total === 0;
    alertTitle.textContent = hintUnread ? 'Hint available' : 'Ah Ning';
    alertSummary.textContent = hintUnread ? 'Tap to open.' : unread === 1 ? 'New message' : `${unread} new messages`;
    alert.dataset.kind = hintUnread ? 'hint' : 'message';
  }

  function notify(kind) {
    if (expanded || host.hidden) return;
    status.textContent = kind === 'hint' ? 'Hint available. Open your phone to read it.' : 'New message from Ah Ning.';
    onNotify?.(kind);
    const now = performance.now();
    if (now - lastBuzz < 400) return;
    lastBuzz = now;
    if (!motion.matches) {
      buzz?.cancel();
      buzz = dock.animate([
        { transform: 'translateX(0) rotate(0)' },
        { transform: 'translateX(-4px) rotate(-5deg)' },
        { transform: 'translateX(4px) rotate(5deg)' },
        { transform: 'translateX(-3px) rotate(-3deg)' },
        { transform: 'translateX(0) rotate(0)' },
      ], { duration: 270, iterations: 2 });
      navigator.vibrate?.([45, 40, 45]);
    }
  }

  function receive(textOrArray, { key, notify: ring = true, direction = 'incoming' } = {}) {
    if (key && seen.has(key)) return;
    const messages = (Array.isArray(textOrArray) ? textOrArray : [textOrArray]).filter(Boolean);
    if (messages.length === 0) return;
    if (key) seen.add(key);
    for (const text of messages) appendMessage(text, direction === 'outgoing');
    if (!expanded && ring && direction !== 'outgoing') {
      unread += messages.length;
      updateDock();
      notify('message');
    }
  }

  function open() {
    if (expanded || host.hidden) return;
    expanded = true;
    unread = 0;
    status.textContent = '';
    clock.textContent = time();
    updateDock();
    dock.setAttribute('aria-expanded', 'true');
    sheet.showModal();
    viewport?.addEventListener('resize', fitViewport);
    viewport?.addEventListener('scroll', fitViewport);
    fitViewport();
    closeButton.focus({ preventScroll: true });
    scrollToLatest();
    if (!motion.matches) {
      window.gsap?.fromTo(sheet, { opacity: 0, y: 28, scale: 0.8 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform',
      });
    }
    onToggle?.(true);
  }

  function finishClose() {
    if (!expanded) return;
    expanded = false;
    viewport?.removeEventListener('resize', fitViewport);
    viewport?.removeEventListener('scroll', fitViewport);
    dock.setAttribute('aria-expanded', 'false');
    updateDock();
    if (!host.hidden) dock.focus({ preventScroll: true });
    onToggle?.(false);
  }

  function close() {
    if (!expanded) return;
    sheet.close();
    finishClose();
  }

  function setVisible(visible) {
    host.hidden = !visible;
    if (!visible) close();
  }

  function setHint(hint) {
    if (hint && hint.id === activeHint?.id) return;
    activeHint = hint;
    hintUnread = Boolean(hint);
    hintSlot.replaceChildren();
    updateDock();
    if (!hint) return;

    const card = element('section', 'phone-hint');
    const title = element('strong', 'phone-hint-title', 'Hint available');
    const reveal = button('phone-hint-button', 'Read hint');
    const explanation = element('p', 'phone-hint-text', hint.text);
    const locate = button('phone-hint-button', 'Show the spot');
    explanation.hidden = true;
    locate.hidden = true;
    card.append(title, reveal, explanation, locate);
    hintSlot.append(card);
    reveal.addEventListener('click', () => {
      hintUnread = false;
      updateDock();
      title.textContent = 'Hint';
      reveal.hidden = true;
      explanation.hidden = false;
      locate.hidden = !hint.onLocate;
      (locate.hidden ? closeButton : locate).focus({ preventScroll: true });
      scrollToLatest();
      hint.onReveal?.();
    });
    locate.addEventListener('click', () => {
      close();
      hint.onLocate?.();
    });
    if (expanded) scrollToLatest();
    notify('hint');
  }

  function setActivity(activity) {
    if (activity && activity.id === activityId) return;
    activityId = activity?.id;
    activitySlot.replaceChildren();
    if (!activity) return;
    const control = button('phone-activity', '');
    const content = element('span', 'phone-activity-copy');
    content.append(element('strong', 'phone-activity-title', activity.label));
    if (activity.detail) content.append(element('span', 'phone-activity-detail', activity.detail));
    const chevron = element('span', 'phone-activity-chevron', '›');
    chevron.setAttribute('aria-hidden', 'true');
    control.append(content, chevron);
    control.addEventListener('click', () => activity.onOpen?.());
    activitySlot.append(control);
    if (expanded) scrollToLatest();
  }

  function setFeedback(message) {
    feedback.textContent = message || '';
    feedback.hidden = !message;
    if (!replyRow.hidden) input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  function submit(value) {
    if (!activeChallenge) return;
    const answer = value.trim();
    if (!answer) {
      setFeedback('Type a reply first.');
      return;
    }
    const result = activeChallenge.validate ? activeChallenge.validate(answer) : true;
    if (result !== true) {
      setFeedback(typeof result === 'string' ? result : 'Try that again.');
      return;
    }
    const accepted = activeChallenge;
    appendMessage(answer, true);
    setChallenge(null);
    if (expanded) closeButton.focus({ preventScroll: true });
    accepted.onSuccess?.(answer);
  }

  function setChallenge(challenge, { notify: ring = true } = {}) {
    if (challenge && challenge.id === activeChallenge?.id) return;
    activeChallenge = challenge;
    prompt.textContent = challenge?.prompt || 'Reply';
    input.value = '';
    input.placeholder = challenge?.placeholder || 'Type a reply';
    const options = challenge?.choices || [];
    replyRow.hidden = options.length > 0;
    choices.hidden = options.length === 0;
    choices.replaceChildren(...options.map((choice) => {
      const answer = button('phone-choice', typeof choice === 'string' ? choice : choice.label);
      answer.addEventListener('click', () => submit(typeof choice === 'string' ? choice : choice.value));
      return answer;
    }));
    setFeedback('');
    composer.hidden = !challenge;
    if (!challenge) return;
    if (expanded) scrollToLatest();
    else if (ring) {
      unread += 1;
      updateDock();
      notify('message');
    }
  }

  function reset() {
    close();
    seen.clear();
    inbox.replaceChildren();
    empty.hidden = false;
    unread = 0;
    hintUnread = false;
    status.textContent = '';
    setHint(null);
    setChallenge(null);
    setActivity(null);
  }

  dock.addEventListener('click', open);
  alert.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  home.addEventListener('click', close);
  sheet.addEventListener('close', () => { if (!sheet.open) finishClose(); });
  sheet.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  sheet.addEventListener('click', (event) => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
  });
  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(input.value);
  });
  input.addEventListener('input', () => setFeedback(''));

  return { open, close, setVisible, receive, setChallenge, setHint, setActivity, reset, get isOpen() { return expanded; } };
}
