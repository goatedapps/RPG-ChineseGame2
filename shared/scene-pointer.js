export const MOUSE_LOOK_RATE = .0031;

export function bindScenePointer(canvas, { canLook, onLook, onInteract, onRelease }) {
  let drag;
  const locked = () => document.pointerLockElement === canvas;

  function clearDrag() {
    const id = drag?.id;
    drag = undefined;
    if (id != null && canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
  }

  function release() {
    clearDrag();
    if (locked()) document.exitPointerLock?.();
  }

  function requestLock() {
    if (!canLook() || !canvas.requestPointerLock || document.pointerLockElement) return;
    try {
      canvas.requestPointerLock()?.catch(() => {});
    } catch {
      // Dragging remains available when the browser disallows pointer lock.
    }
  }

  function focus(lock = true) {
    canvas.focus({ preventScroll: true });
    if (lock && matchMedia('(pointer: fine)').matches) requestLock();
  }

  function clearInput() {
    clearDrag();
    onRelease();
  }

  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInput();
  });
  document.addEventListener('pointerlockchange', () => {
    if (!locked()) clearInput();
    else if (!canLook()) release();
    else clearDrag();
  });
  document.addEventListener('mousemove', (event) => {
    if (locked() && canLook()) onLook(event.movementX, event.movementY, false);
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (!canLook() || drag || event.button !== 0) return;
    event.preventDefault();
    if (locked()) {
      onInteract();
      return;
    }
    focus(false);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    if (event.pointerType === 'mouse') requestLock();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId || locked() || !canLook()) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    onLook(dx, dy, event.pointerType === 'touch');
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, (event) => {
      if (drag?.id === event.pointerId) clearDrag();
    });
  }

  return { clearDrag, focus, release };
}
