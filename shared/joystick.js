// Positive values move right or forward.
export function bindJoystick(joystick, onMove) {
  let owner;

  function move(event) {
    if (owner !== event.pointerId) return;
    const bounds = joystick.getBoundingClientRect();
    const x =
      (event.clientX - bounds.left - bounds.width / 2) / (bounds.width * 0.38);
    const y =
      (event.clientY - bounds.top - bounds.height / 2) / (bounds.height * 0.38);
    const length = Math.max(1, Math.hypot(x, y));
    const horizontal = x / length;
    const vertical = y / length;
    joystick.style.setProperty(
      '--stick-x',
      horizontal * bounds.width * 0.29 + 'px',
    );
    joystick.style.setProperty(
      '--stick-y',
      vertical * bounds.height * 0.29 + 'px',
    );
    onMove(horizontal, -vertical);
  }

  joystick.addEventListener('pointerdown', (event) => {
    if (owner !== undefined || event.button !== 0) return;
    event.preventDefault();
    owner = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    move(event);
  });
  joystick.addEventListener('pointermove', move);

  function release() {
    if (owner === undefined) return;
    const pointer = owner;
    owner = undefined;
    if (joystick.hasPointerCapture(pointer))
      joystick.releasePointerCapture(pointer);
    joystick.style.removeProperty('--stick-x');
    joystick.style.removeProperty('--stick-y');
    onMove(0, 0);
  }

  for (const eventName of [
    'pointerup',
    'pointercancel',
    'lostpointercapture',
  ]) {
    joystick.addEventListener(eventName, (event) => {
      if (owner === event.pointerId) release();
    });
  }
  window.addEventListener('blur', release);
}
