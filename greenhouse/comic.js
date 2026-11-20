const panels = [
  { caption: '明天就是科学展。', alt: '两个同学在学校温室里布置科学展，桌上摆着一盆小幼苗。' },
  { caption: '把幼苗放好。', alt: '两个同学把花盆小心地放在窗边，准备放学回家。' },
  { caption: '夜里，暴雨来了。', alt: '夜里的暴雨打在温室西窗上，窗台积了水。' },
  { caption: '对讲机响了。', alt: '一名同学走进科学楼，桌上的对讲机亮了。' },
];

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

export function playComic(container, onFinish) {
  const shell = element('div', 'comic-shell');
  const header = element('header', 'comic-header');
  const title = element('h2', 'comic-title', '序幕');
  title.id = 'comic-title';
  const skip = button('comic-skip', '跳过序幕');
  header.append(title, skip);

  const figure = element('figure', 'comic-panel');
  const art = element('div', 'comic-art');
  const caption = element('figcaption', 'comic-caption');
  figure.append(art, caption);

  const nav = element('nav', 'comic-nav');
  nav.setAttribute('aria-label', '序幕翻页');
  const previous = button('comic-previous', '上一格');
  const next = button('primary comic-next', '下一格');
  const progress = element('div', 'comic-progress');
  const dots = panels.map(() => element('span', 'comic-progress-dot'));
  const announcement = element('span', 'comic-announcement');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  for (const dot of dots) dot.setAttribute('aria-hidden', 'true');
  progress.append(...dots, announcement);
  nav.append(previous, progress, next);
  shell.append(header, figure, nav);

  const focusBefore = document.activeElement;
  const background = [...container.parentElement.children].filter((child) => child !== container && !child.inert);
  for (const child of background) child.inert = true;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loadedPanels = new Map();
  let index = 0;
  let transition;
  let renderVersion = 0;
  let finished = false;

  container.classList.add('comic-screen');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', title.id);
  container.replaceChildren(shell);
  container.hidden = false;

  function preparePanel(page) {
    if (loadedPanels.has(page)) return loadedPanels.get(page);
    const image = element('img', 'comic-image');
    const fallback = element('p', 'comic-fallback', panels[page].alt);
    fallback.hidden = true;
    image.alt = panels[page].alt;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.hidden = false;
    }, { once: true });
    image.src = new URL('./art/comic-' + (page + 1) + '.webp', import.meta.url);
    const content = [image, fallback];
    loadedPanels.set(page, content);
    return content;
  }

  function render(direction) {
    const version = ++renderVersion;
    transition?.kill();
    for (const node of [art, caption]) {
      node.style.removeProperty('opacity');
      node.style.removeProperty('visibility');
      node.style.removeProperty('transform');
    }
    const content = preparePanel(index);
    art.replaceChildren(...content);
    caption.textContent = panels[index].caption;
    announcement.textContent = '第 ' + (index + 1) + ' 格，共 ' + panels.length + ' 格。' + panels[index].caption;
    previous.disabled = index === 0;
    next.textContent = index === panels.length - 1 ? '进入科学楼' : '下一格';
    dots.forEach((dot, page) => dot.classList.toggle('current', page === index));
    if (index + 1 < panels.length) preparePanel(index + 1);

    if (motion.matches || !window.gsap) return;
    window.gsap.set([art, caption], { autoAlpha: 0 });
    content[0].decode().catch(() => {}).then(() => {
      if (finished || version !== renderVersion) return;
      transition = window.gsap.fromTo([art, caption], { autoAlpha: 0, y: direction * 12 }, {
        autoAlpha: 1, y: 0, duration: .43, ease: 'power2.out', stagger: .08,
        overwrite: 'auto', clearProps: 'opacity,visibility,transform',
      });
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

  function goBack() {
    if (index === 0) return;
    index -= 1;
    render(-1);
    if (previous.disabled && document.activeElement === previous) next.focus();
  }

  function advance() {
    if (index === panels.length - 1) {
      finish();
      return;
    }
    index += 1;
    render(1);
  }

  function onKey(event) {
    if (event.key === 'Tab') {
      const controls = previous.disabled ? [skip, next] : [skip, previous, next];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
  skip.addEventListener('click', finish);
  previous.addEventListener('click', goBack);
  next.addEventListener('click', advance);
  render(1);
  next.focus({ preventScroll: true });

  return () => {
    if (cleanUp()) focusBefore?.focus({ preventScroll: true });
  };
}
