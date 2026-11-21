const revealClip = {
  ready: 'polygon(-10% 0%, 110% 0%, 110% 100%, -10% 100%)',
  next: 'polygon(-10% 0%, 0% 0%, -10% 100%, -10% 100%)',
  previous: 'polygon(110% 0%, 110% 0%, 110% 100%, 100% 100%)',
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(className, text) {
  const node = element('button', className, text);
  node.type = 'button';
  return node;
}

function balloon(className, [x, y, width]) {
  const node = element('p', 'comic-lettering ' + className);
  node.style.setProperty('--balloon-x', x + '%');
  node.style.setProperty('--balloon-y', y + '%');
  node.style.setProperty('--balloon-width', width + '%');
  return node;
}

export function playLessonComic(
  container,
  onFinish,
  { panels, titleText, lastLabel, onPage = () => {}, ending = false },
) {
  const title = element('h2', 'comic-hidden', titleText);
  title.id = 'comic-title';
  const frame = element('div', 'comic-frame');
  const hit = button('comic-hit');
  const progress = element('div', 'comic-progress');
  const dots = panels.map(() => element('span', 'comic-progress-dot'));
  progress.setAttribute('aria-hidden', 'true');
  progress.append(...dots);
  const rail = element('div', 'comic-rail');
  rail.append(progress);
  const announcement = element('p', 'comic-hidden');
  announcement.setAttribute('role', 'status');

  const focusBefore = document.activeElement;
  const background = [...container.parentElement.children].filter(
    (child) => child !== container && !child.inert,
  );
  for (const child of background) child.inert = true;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loadedPanels = new Map();
  let index = 0;
  let shownPage = -1;
  let activeScene;
  let transition;
  let finished = false;

  container.classList.add('comic-screen');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', title.id);
  container.replaceChildren(title, frame, hit, rail, announcement);
  container.hidden = false;

  function preparePanel(page) {
    if (loadedPanels.has(page)) return loadedPanels.get(page);
    const data = panels[page];
    const scene = element('figure', 'comic-panel');
    scene.dataset.page = page + 1;
    const drawing = element('div', 'comic-drawing');
    const image = element('img', 'comic-image');
    image.alt = data.alt;
    image.draggable = false;
    image.decoding = 'async';
    const fallback = element('p', 'comic-fallback', data.alt);
    fallback.hidden = true;
    image.addEventListener(
      'error',
      () => {
        image.hidden = true;
        fallback.hidden = false;
      },
      { once: true },
    );
    image.sizes = 'min(calc(100vw - 1.2rem), calc((100dvh - 6rem) * 1.5))';
    if (data.srcset) image.srcset = data.srcset;
    image.src = data.image;
    drawing.append(image, fallback);
    if (data.bubble) {
      const speech = balloon('comic-speech', data.bubble);
      speech.replaceChildren(
        ...data.dialogue.map((line) => element('span', '', line)),
      );
      drawing.append(speech);
    }
    if (data.caption)
      drawing.append(element('p', 'comic-caption', data.caption));
    const effect = data.effect
      ? balloon('comic-sound', data.effect.bubble)
      : null;
    if (effect) {
      effect.textContent = data.effect.chinese;
      drawing.append(effect);
    }
    scene.append(drawing);
    const result = { scene, drawing, image, effect };
    loadedPanels.set(page, result);
    return result;
  }

  function announce(page) {
    const data = panels[page];
    const description = [
      data.alt,
      data.effect?.chinese,
      data.dialogue?.join(' '),
      data.caption,
    ]
      .filter(Boolean)
      .join(' ');
    announcement.textContent =
      '第 ' + (page + 1) + ' 幅，共 ' + panels.length + ' 幅。' + description;
    dots.forEach((dot, position) =>
      dot.classList.toggle('current', position === page),
    );
    hit.setAttribute(
      'aria-label',
      page === panels.length - 1 ? lastLabel : '继续看漫画',
    );
  }

  function render(direction) {
    const page = index;
    const art = preparePanel(page);
    preparePanel(Math.min(page + 1, panels.length - 1));
    art.image
      .decode()
      .catch(() => {})
      .then(() => {
        if (finished || page !== index || shownPage === page) return;
        transition?.kill();
        const outgoing = activeScene;
        activeScene = art.scene;
        shownPage = page;
        announce(page);
        if (outgoing) outgoing.setAttribute('aria-hidden', 'true');
        art.scene.removeAttribute('aria-hidden');
        frame.replaceChildren(
          ...(outgoing ? [outgoing, art.scene] : [art.scene]),
        );
        onPage(page + 1);

        const gsap = window.gsap;
        if (!gsap || motion.matches) {
          outgoing?.remove();
          return;
        }

        transition = gsap.timeline({ onComplete: () => outgoing?.remove() });
        transition.fromTo(
          art.scene,
          {
            clipPath: direction > 0 ? revealClip.next : revealClip.previous,
          },
          {
            clipPath: revealClip.ready,
            duration: 0.28,
            ease: 'power3.inOut',
            clearProps: 'clipPath',
          },
          0,
        );
        transition.fromTo(
          art.drawing,
          { scale: !ending && page === 1 ? 1.07 : 1.035 },
          {
            scale: 1,
            duration: 0.44,
            ease: 'power3.out',
            clearProps: 'transform',
          },
          0,
        );
        if (art.effect) {
          transition.fromTo(
            art.effect,
            { scale: 1.13 },
            {
              scale: 1,
              duration: 0.27,
              ease: 'back.out(1.7)',
              clearProps: 'transform',
            },
            0.16,
          );
        }
      });
  }

  function cleanUp() {
    if (finished) return false;
    finished = true;
    transition?.kill();
    container.removeEventListener('keydown', onKey);
    container.hidden = true;
    container.replaceChildren();
    for (const child of background) child.inert = false;
    return true;
  }

  function finish() {
    if (cleanUp()) onFinish();
  }

  function advance() {
    if (index !== shownPage) return;
    if (index === panels.length - 1) {
      finish();
      return;
    }
    index += 1;
    render(1);
  }

  function goBack() {
    if (index === 0 || index !== shownPage) return;
    index -= 1;
    render(-1);
  }

  function onKey(event) {
    if (event.repeat && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      hit.focus();
      return;
    }
    if (!['Escape', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (event.key === 'Escape') finish();
    else if (event.key === 'ArrowLeft') goBack();
    else advance();
  }

  container.addEventListener('keydown', onKey);
  hit.addEventListener('click', advance);
  hit.setAttribute('aria-label', '继续看漫画');
  render(1);
  hit.focus({ preventScroll: true });

  return () => {
    if (cleanUp()) focusBefore?.focus({ preventScroll: true });
  };
}
