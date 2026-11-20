const panels = [
  {
    dialogue: ['明天就是', '科学展！'],
    english: ['The science fair', 'is tomorrow!'],
    alt: '阿宁捧着幼苗，另一名同学正把科学展的彩旗挂起来。',
    bubble: [25, 18.6, 34],
  },
  {
    dialogue: ['小心！'],
    english: ['Look out!'],
    alt: '夜里，一道闪电划过天空。暴雨打在窗户上，雨水流向幼苗。',
    bubble: [65.3, 29.5, 31],
    effect: { chinese: '轰隆！', english: 'KRA-KOOM!', bubble: [86, 10.3, 18] },
  },
  {
    dialogue: ['糟了！', '温室漏水了！'],
    english: ['Oh no!', 'The greenhouse is leaking!'],
    alt: '第二天早上，阿宁发现花盆旁积了水，幼苗的叶子耷拉着。',
    bubble: [28.7, 21.1, 39],
  },
  {
    dialogue: ['科学展快开门了！', '快拿对讲机！'],
    english: ['The fair opens soon!', 'Grab the walkie-talkie!'],
    alt: '科学楼桌上亮起了红灯，对讲机开始闪烁。',
    bubble: [63.2, 23.4, 33],
    effect: { chinese: '滋滋……', english: 'KSSSH…', bubble: [86, 11.1, 17] },
  },
];

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

export function playComic(container, onFinish, { onPage = () => {} } = {}) {
  const title = element('h2', 'comic-hidden', '暴雨后的温室序幕');
  title.id = 'comic-title';
  const frame = element('div', 'comic-frame');
  const hit = button('comic-hit');
  const english = button('comic-language', 'EN');
  english.setAttribute('aria-label', '切换英文对白 / English dialogue');
  english.setAttribute('aria-pressed', 'false');
  const skip = button('comic-skip', '跳过序幕');
  const actions = element('div', 'comic-actions');
  actions.append(english, skip);
  const hint = element('p', 'comic-hint');
  const progress = element('div', 'comic-progress');
  const dots = panels.map(() => element('span', 'comic-progress-dot'));
  progress.setAttribute('aria-hidden', 'true');
  progress.append(...dots);
  const rail = element('div', 'comic-rail');
  rail.append(progress, hint);
  const announcement = element('p', 'comic-hidden');
  announcement.setAttribute('role', 'status');

  const focusBefore = document.activeElement;
  const background = [...container.parentElement.children].filter((child) => child !== container && !child.inert);
  for (const child of background) child.inert = true;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const loadedPanels = new Map();
  let index = 0;
  let shownPage = -1;
  let activeScene;
  let transition;
  let finished = false;
  let useEnglish = false;

  container.classList.add('comic-screen');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');
  container.setAttribute('aria-labelledby', title.id);
  container.replaceChildren(title, frame, hit, actions, rail, announcement);
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
    image.addEventListener('error', () => {
      image.hidden = true;
      fallback.hidden = false;
    }, { once: true });
    image.src = new URL('./art/comic-storm-' + (page + 1) + '.webp', import.meta.url);
    const speech = balloon('comic-speech', data.bubble);
    drawing.append(image, fallback, speech);
    const effect = data.effect ? balloon('comic-sound', data.effect.bubble) : null;
    if (effect) drawing.append(effect);
    scene.append(drawing);
    const result = { scene, drawing, image, speech, effect };
    loadedPanels.set(page, result);
    return result;
  }

  function letter(page, art) {
    const data = panels[page];
    const lines = useEnglish ? data.english : data.dialogue;
    const lang = useEnglish ? 'en' : 'zh-Hans';
    art.speech.lang = lang;
    art.speech.replaceChildren(...lines.map((line) => element('span', '', line)));
    if (art.effect) {
      art.effect.lang = lang;
      art.effect.textContent = data.effect[useEnglish ? 'english' : 'chinese'];
      return art.effect.textContent + ' ' + lines.join(' ');
    }
    return lines.join(' ');
  }

  function announce(page) {
    const art = loadedPanels.get(page);
    announcement.textContent = '第 ' + (page + 1) + ' 幅，共 ' + panels.length + ' 幅。' + letter(page, art);
    dots.forEach((dot, position) => dot.classList.toggle('current', position === page));
    hit.setAttribute('aria-label', page === panels.length - 1 ? '进入科学楼' : '继续看序幕');
    hint.textContent = page === panels.length - 1 ? '点按画面，进入科学楼' : '点按画面，继续';
  }

  function render(direction) {
    const page = index;
    const art = preparePanel(page);
    preparePanel(Math.min(page + 1, panels.length - 1));
    art.image.decode().catch(() => {}).then(() => {
      if (finished || page !== index || shownPage === page) return;
      transition?.kill();
      const outgoing = activeScene;
      activeScene = art.scene;
      shownPage = page;
      announce(page);
      if (outgoing) outgoing.setAttribute('aria-hidden', 'true');
      art.scene.removeAttribute('aria-hidden');
      frame.replaceChildren(...(outgoing ? [outgoing, art.scene] : [art.scene]));
      onPage(page + 1);

      const gsap = window.gsap;
      if (!gsap || motion.matches) {
        outgoing?.remove();
        return;
      }

      transition = gsap.timeline({ onComplete: () => outgoing?.remove() });
      transition.fromTo(art.scene, {
        clipPath: direction > 0 ? revealClip.next : revealClip.previous,
      }, {
        clipPath: revealClip.ready, duration: .28, ease: 'power3.inOut', clearProps: 'clipPath',
      }, 0);
      transition.fromTo(art.drawing, { scale: page === 1 ? 1.07 : 1.035 }, {
        scale: 1, duration: .44, ease: 'power3.out', clearProps: 'transform',
      }, 0);
      if (art.effect) {
        transition.fromTo(art.effect, { scale: 1.13 }, {
          scale: 1, duration: .27, ease: 'back.out(1.7)', clearProps: 'transform',
        }, .16);
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
      const first = hit;
      const last = skip;
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
  hit.addEventListener('click', advance);
  skip.addEventListener('click', finish);
  english.addEventListener('click', () => {
    useEnglish = !useEnglish;
    english.setAttribute('aria-pressed', String(useEnglish));
    if (shownPage >= 0) announce(shownPage);
  });
  hit.setAttribute('aria-label', '继续看序幕');
  render(1);
  hit.focus({ preventScroll: true });

  return () => {
    if (cleanUp()) focusBefore?.focus({ preventScroll: true });
  };
}
