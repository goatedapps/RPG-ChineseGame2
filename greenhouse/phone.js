import { createWriting } from './writing.js';

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

export function createPhone(host, { onToggle, onNotify, onDismiss, onReadMessage, onLeaveChat, contactName = '阿宁', contactInitial = '宁' } = {}) {
  host.classList.add('field-phone');
  host.lang = 'zh-Hans';

  const dock = button('phone-dock', '', '打开手机');
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
  dock.title = '打开手机（F）';

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
  const avatar = element('span', 'phone-avatar', contactInitial);
  avatar.setAttribute('aria-hidden', 'true');
  const heading = element('h2', 'phone-contact', contactName);
  heading.id = 'phone-contact';
  heading.tabIndex = -1;
  contact.append(avatar, heading);
  header.append(statusBar, contact);

  const scroll = element('div', 'phone-scroll');
  const inbox = element('div', 'phone-inbox');
  inbox.setAttribute('role', 'log');
  inbox.setAttribute('aria-label', '消息');
  const empty = element('p', 'phone-empty', '暂无消息');
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
  const send = button('phone-send', '发送');
  send.type = 'submit';
  const handwrittenReply = button('phone-reply phone-handwritten-reply', '手写回复');
  handwrittenReply.setAttribute('aria-labelledby', prompt.id);
  replyRow.append(input, handwrittenReply, send);
  const choices = element('div', 'phone-choices');
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-labelledby', prompt.id);
  const feedback = element('p', 'phone-feedback');
  feedback.id = 'phone-reply-feedback';
  feedback.setAttribute('role', 'status');
  feedback.hidden = true;
  composer.append(prompt, replyRow, choices, feedback);

  const writing = element('section', 'phone-writing');
  writing.hidden = true;
  const writingHeader = element('div', 'phone-writing-header');
  const writingBack = button('phone-writing-back', '返回聊天', '返回聊天');
  const writingTitle = element('h3', 'phone-writing-title', '手写回复');
  writingTitle.tabIndex = -1;
  writingHeader.append(writingBack, writingTitle);
  const writingGrid = element('div', 'writing-grid');
  const writingProgress = element('ol', 'writing-progress');
  writingProgress.setAttribute('aria-label', '书写进度');
  const writingStatus = element('p', 'phone-feedback');
  writingStatus.setAttribute('role', 'status');
  writingStatus.hidden = true;
  const retryWriting = button('phone-writing-back', '再试一次');
  retryWriting.hidden = true;
  const sendWriting = button('phone-send phone-send-written', '发送');
  sendWriting.disabled = true;
  writing.append(writingHeader, writingGrid, writingProgress, writingStatus, retryWriting, sendWriting);

  const home = button('phone-home', '', '放下手机');
  home.append(element('span', 'phone-home-indicator'));
  screen.append(header, scroll, composer, writing, home);
  sheet.append(screen);
  host.replaceChildren(alert, dock, status, sheet);

  const seen = new Set();
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.visualViewport;
  const timeFormat = new Intl.DateTimeFormat('zh-SG', { hour: 'numeric', minute: '2-digit', hourCycle: 'h23' });
  let unread = 0;
  let hintUnread = false;
  let hintRevealed = false;
  let activeHint;
  let activeChallenge;
  let activityId;
  let expanded = false;
  let lastBuzz = -Infinity;
  let buzz;
  let stopWriting;
  let writtenAnswer = '';
  let latestIncoming;

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
    const meta = element('span', 'phone-visually-hidden', outgoing ? '你' : contactName);
    const message = element('p', 'phone-message-text', text);
    message.lang = outgoing ? 'zh-Hans' : 'en';
    item.append(meta, message, element('time', 'phone-message-time', time()));
    inbox.append(item);
    empty.hidden = true;
    if (expanded) scrollToLatest();
  }

  function updateDock() {
    const total = unread + Number(hintUnread);
    badge.textContent = total > 9 ? '9+' : String(total);
    badge.hidden = total === 0;
    dock.setAttribute('aria-label', total ? `打开手机，${total} 条未读消息` : '打开手机');
    alert.hidden = expanded || total === 0;
    alertTitle.textContent = hintUnread ? '有新提示' : contactName;
    alertSummary.textContent = hintUnread ? '轻触查看。' : unread === 1 ? '新消息' : `${unread} 条新消息`;
    alert.dataset.kind = hintUnread ? 'hint' : 'message';
  }

  function notify(kind) {
    if (expanded || host.hidden) return;
    status.textContent = kind === 'hint' ? '有新提示，请打开手机查看。' : contactName + '发来了新消息。';
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
    if (direction === 'outgoing') return;
    latestIncoming = key;
    if (expanded && writing.hidden) onReadMessage?.(latestIncoming);
    if (!expanded && ring) {
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
    heading.focus({ preventScroll: true });
    scrollToLatest();
    if (!motion.matches) {
      window.gsap?.fromTo(sheet, { opacity: 0, y: 28, scale: 0.8 }, {
        opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform',
      });
    }
    onToggle?.(true);
    onReadMessage?.(latestIncoming);
  }

  function finishClose() {
    if (!expanded) return;
    expanded = false;
    onLeaveChat?.();
    backToChat();
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
    hintUnread = false;
    hintRevealed = false;
    hintSlot.replaceChildren();
    updateDock();
    if (!hint) return;

    const card = element('section', 'phone-hint');
    const title = element('strong', 'phone-hint-title', '提示');
    const reveal = button('phone-hint-button', '查看提示');
    const explanation = element('p', 'phone-hint-text', hint.text);
    explanation.lang = 'en';
    const locate = button('phone-hint-button', '标出位置');
    explanation.hidden = true;
    locate.hidden = true;
    card.append(title, reveal, explanation, locate);
    hintSlot.append(card);
    reveal.addEventListener('click', () => {
      hintUnread = false;
      hintRevealed = true;
      updateDock();
      title.textContent = '提示';
      reveal.hidden = true;
      explanation.hidden = false;
      locate.hidden = !hint.onLocate;
      (locate.hidden ? home : locate).focus({ preventScroll: true });
      scrollToLatest();
      hint.onReveal?.();
    });
    locate.addEventListener('click', () => {
      close();
      hint.onLocate?.();
    });
    if (expanded) scrollToLatest();
  }

  function remindAboutHint() {
    if (!activeHint || hintRevealed) return;
    hintUnread = true;
    updateDock();
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

  function writingFeedback(message) {
    writingStatus.textContent = message;
    writingStatus.hidden = !message;
  }

  function backToChat() {
    if (writing.hidden) return;
    writing.hidden = true;
    sheet.classList.remove('is-writing');
    scroll.hidden = false;
    composer.hidden = !activeChallenge;
    if (expanded) {
      handwrittenReply.focus({ preventScroll: true });
      scrollToLatest();
    }
  }

  function resetWriting() {
    stopWriting?.();
    stopWriting = undefined;
    writtenAnswer = '';
    writingGrid.replaceChildren();
    writingProgress.replaceChildren();
    retryWriting.hidden = true;
    sendWriting.disabled = true;
    writingFeedback('');
  }

  function startWriting() {
    resetWriting();
    const characters = [...activeChallenge.characters];
    const markers = characters.map((_, index) => element('li', '', String(index + 1)));
    writingProgress.append(...markers);
    markers[0].setAttribute('aria-current', 'step');
    stopWriting = createWriting(writingGrid, activeChallenge.characters, false, () => {
      writtenAnswer = activeChallenge.characters;
      handwrittenReply.textContent = writtenAnswer;
      handwrittenReply.lang = 'zh-Hans';
      sendWriting.disabled = false;
      if (!writing.hidden) sendWriting.focus({ preventScroll: true });
      activeChallenge.onWritten?.();
    }, () => {
      writingFeedback('书写格未能载入。');
      retryWriting.hidden = false;
    }, () => {
      writingFeedback('请再写一遍这一笔。');
    }, (completed) => {
      const marker = markers[completed - 1];
      marker.textContent = characters[completed - 1];
      marker.lang = 'zh-Hans';
      marker.classList.add('complete');
      marker.removeAttribute('aria-current');
      markers[completed]?.setAttribute('aria-current', 'step');
      writingFeedback('');
    });
  }

  function openWriting() {
    if (!expanded || !activeChallenge?.characters) return;
    onLeaveChat?.();
    writing.hidden = false;
    sheet.classList.add('is-writing');
    scroll.hidden = true;
    composer.hidden = true;
    if (!stopWriting) startWriting();
    if (!motion.matches) writing.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    writingTitle.focus({ preventScroll: true });
  }

  function submit(value) {
    if (!activeChallenge) return;
    const answer = value.trim();
    if (!answer) {
      setFeedback('请先填写回复。');
      return;
    }
    const result = activeChallenge.validate ? activeChallenge.validate(answer) : true;
    if (result !== true) {
      const message = typeof result === 'string' ? result : '请再试一次。';
      if (writing.hidden) setFeedback(message);
      else writingFeedback(message);
      return;
    }
    const accepted = activeChallenge;
    appendMessage(answer, true);
    setChallenge(null);
    if (expanded) heading.focus({ preventScroll: true });
    accepted.onSuccess?.(answer);
  }

  function setChallenge(challenge, { notify: ring = true } = {}) {
    if (challenge && challenge.id === activeChallenge?.id) return;
    backToChat();
    resetWriting();
    activeChallenge = challenge;
    prompt.textContent = challenge?.prompt || '回复';
    input.value = '';
    input.placeholder = challenge?.placeholder || '输入回复';
    const options = challenge?.choices || [];
    const useHandwriting = Boolean(challenge?.characters);
    replyRow.hidden = options.length > 0;
    choices.hidden = options.length === 0;
    input.hidden = useHandwriting;
    send.hidden = useHandwriting;
    handwrittenReply.hidden = !useHandwriting;
    handwrittenReply.textContent = challenge?.placeholder || '手写回复';
    handwrittenReply.removeAttribute('lang');
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
    latestIncoming = undefined;
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
  home.addEventListener('click', close);
  sheet.addEventListener('close', () => { if (!sheet.open) finishClose(); });
  sheet.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (writing.hidden) close();
    else backToChat();
  });
  sheet.addEventListener('click', (event) => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) {
      onDismiss?.();
      close();
    }
  });
  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeChallenge?.characters) submit(input.value);
  });
  input.addEventListener('input', () => setFeedback(''));
  handwrittenReply.addEventListener('click', openWriting);
  writingBack.addEventListener('click', backToChat);
  retryWriting.addEventListener('click', startWriting);
  sendWriting.addEventListener('click', () => submit(writtenAnswer));

  return { open, close, setVisible, receive, setChallenge, setHint, remindAboutHint, setActivity, reset, get isOpen() { return expanded; } };
}
