export function animatePhonePickup({ from, to, parent = document.body, onComplete }) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const gsap = window.gsap;
  if (!gsap || motion.matches) {
    onComplete?.();
    return () => {};
  }

  const phone = document.createElement('div');
  phone.className = 'phone-dock phone-pickup';
  phone.setAttribute('aria-hidden', 'true');
  if (to?.width > 0) phone.style.width = to.width + 'px';
  if (to?.height > 0) phone.style.height = to.height + 'px';
  phone.innerHTML = `
    <div class="phone-dock-glass">
      <span class="phone-dock-chat"></span>
      <span class="phone-pickup-lock"><span>08:12</span></span>
    </div>
  `;
  parent.append(phone);

  const lock = phone.querySelector('.phone-pickup-lock');
  const chat = phone.querySelector('.phone-dock-chat');
  const { width, height } = phone.getBoundingClientRect();
  const endX = to?.x ?? window.innerWidth - width / 2 - 20;
  const endY = to?.y ?? window.innerHeight - height / 2 - 54;
  const startX = from?.x ?? window.innerWidth / 2;
  const startY = from?.y ?? window.innerHeight * .54;
  const startScale = gsap.utils.clamp(.24, 1.8, (from?.height || height * .72) / height);
  const raisedScale = Math.max(1.45, startScale * 1.08);
  let finished = false;
  const timeline = gsap.timeline({ onComplete: finish });

  function cleanup() {
    timeline.kill();
    phone.remove();
    window.removeEventListener('resize', finish);
    motion.removeEventListener?.('change', changeMotion);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete?.();
  }

  function changeMotion(event) {
    if (event.matches) finish();
  }

  gsap.set(phone, {
    x: startX, y: startY, xPercent: -50, yPercent: -50,
    scale: startScale, rotation: from?.rotation ?? -4,
    rotationX: -9, rotationY: -9, transformPerspective: 600, immediateRender: true,
  });
  gsap.set(chat, { autoAlpha: 0, scale: .8, immediateRender: true });
  timeline.to(phone, {
    x: startX + (endX - startX) * .14,
    y: Math.max(raisedScale * height / 2 + 12, startY - Math.min(112, window.innerHeight * .145)),
    scale: raisedScale, rotation: -10, rotationX: 5, rotationY: 14,
    duration: .235, ease: 'power2.out',
  }, 0).to(phone, {
    x: endX, y: endY, scale: 1,
    rotation: 0, rotationX: 0, rotationY: 0,
    duration: .4, ease: 'power2.inOut',
  }, .235).to(lock, {
    autoAlpha: 0, duration: .18, ease: 'power1.in',
  }, .27).to(chat, {
    autoAlpha: 1, scale: 1, duration: .18, ease: 'power2.out',
  }, .36);

  window.addEventListener('resize', finish);
  motion.addEventListener?.('change', changeMotion);
  return cleanup;
}
