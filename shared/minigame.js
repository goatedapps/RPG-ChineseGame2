export function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

export function prop(src, className = '') {
  const image = element('img', className);
  image.src = src;
  image.alt = '';
  image.draggable = false;
  return image;
}

export function control(label, className = '') {
  const button = element('button', className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  return button;
}

export function makeMinigame(title, instruction, play, onFinish) {
  const root = element('section', 'minigame');
  const heading = element('h2', 'minigame-title', title);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  const stage = element('div', 'minigame-stage');
  const status = element('p', 'minigame-status', instruction);
  status.setAttribute('role', 'status');
  root.append(heading, stage, status);
  const activeEffects = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let finished = false;
  const live = () => root.isConnected && root.closest('dialog')?.open;
  function after(delay, action) {
    return setTimeout(() => { if (live()) action(); }, delay);
  }
  function feedback(node, cue = 'correct', strong = false) {
    play(cue);
    if (!node || reducedMotion.matches) return;
    activeEffects.get(node)?.cancel();
    activeEffects.set(node, node.animate([
      { scale: '1' },
      { scale: strong ? '1.065' : '1.025', offset: .36 },
      { scale: '1' },
    ], { duration: strong ? 290 : 180, easing: 'cubic-bezier(.18,.78,.28,1)' }));
  }
  function finish(message, node = null, cue = 'relay') {
    if (finished || !live()) return;
    finished = true;
    root.dataset.complete = '';
    status.textContent = message;
    feedback(node, cue, true);
    const dialog = root.closest('dialog');
    const completeOnClose = () => {
      clearTimeout(timer);
      onFinish(false);
    };
    dialog.addEventListener('close', completeOnClose, { once: true });
    const timer = after(reducedMotion.matches ? 380 : 730, () => {
      dialog.removeEventListener('close', completeOnClose);
      onFinish(true);
    });
  }
  return { root, heading, stage, status, after, feedback, finish };
}

export function pointIn(event, node) {
  const rect = node.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}

export function dragPiece(piece, onDrop, onTap) {
  let start;
  let dragged = false;
  piece.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || start) return;
    start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    dragged = false;
    piece.setPointerCapture(event.pointerId);
  });
  piece.addEventListener('pointermove', (event) => {
    if (event.pointerId !== start?.id) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.hypot(x, y) < 6 && !dragged) return;
    dragged = true;
    piece.style.translate = x + 'px ' + y + 'px';
    piece.dataset.dragging = '';
  });
  piece.addEventListener('pointerup', (event) => {
    if (event.pointerId !== start?.id) return;
    if (dragged) onDrop(event);
    else onTap(event);
  });
  piece.addEventListener('lostpointercapture', () => {
    start = undefined;
    piece.style.translate = '';
    delete piece.dataset.dragging;
  });
  piece.addEventListener('click', (event) => {
    if (event.detail === 0) onTap(event);
  });
}

// A physical surface with a keyboard equivalent. Scrub the full width or turn from the current position.
export function scrub(surface, label, initial, onChange, relative = false) {
  let value = initial;
  let pointer;
  surface.tabIndex = 0;
  surface.setAttribute('role', 'slider');
  surface.setAttribute('aria-label', label);
  surface.setAttribute('aria-valuemin', '0');
  surface.setAttribute('aria-valuemax', '100');
  function set(next) {
    value = Math.round(Math.max(0, Math.min(100, next)));
    surface.setAttribute('aria-valuenow', value);
    onChange(value);
  }
  surface.onpointerdown = (event) => {
    if (event.button !== 0 || pointer) return;
    const { x } = pointIn(event, surface);
    pointer = { id: event.pointerId, x, value };
    surface.setPointerCapture(event.pointerId);
    if (!relative) set(x * 100);
  };
  surface.onpointermove = (event) => {
    if (event.pointerId !== pointer?.id) return;
    const { x } = pointIn(event, surface);
    set(relative ? pointer.value + (x - pointer.x) * 145 : x * 100);
  };
  surface.onlostpointercapture = () => { pointer = undefined; };
  surface.onkeydown = (event) => {
    const moves = { ArrowRight: 3, ArrowUp: 3, ArrowLeft: -3, ArrowDown: -3, Home: -100, End: 100 };
    if (!Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    set(value + moves[event.key]);
  };
  set(initial);
}
