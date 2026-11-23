import { control, dragPiece, element, makeMinigame } from '../shared/minigame.js';

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sealWindow(vocabulary, play, onFinish) {
  const game = makeMinigame('西窗', '', play, onFinish);
  game.root.classList.add('window-match');
  const frame = element('div', 'match-window');
  const warmth = element('div', 'window-warmth');
  frame.append(warmth);
  const tray = element('div', 'tape-tray');
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', '写有词语的密封条');
  game.stage.append(frame, tray);

  const gsap = window.gsap;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const animation = gsap?.context(() => {}, game.root);
  let selected;
  let remaining = vocabulary.length;
  const gaps = new Map();
  const tiles = new Map();
  const anchors = [[28, 41.6], [72, 41.6], [28, 79.5], [72, 79.5]];

  function animate(effect) {
    if (!motion.matches) animation?.add(effect);
  }

  function select(tile) {
    if (tile.disabled) return;
    selected?.setAttribute('aria-pressed', 'false');
    selected = tile;
    selected.setAttribute('aria-pressed', 'true');
    play('pickup');
  }

  function reject(tile, gap, dragOrigin) {
    game.status.textContent = '这条密封条不合适。';
    play('wrong');
    const mark = gap.querySelector('.gap-meaning');
    mark.classList.add('mismatch');
    game.after(380, () => mark.classList.remove('mismatch'));
    animate(() => {
      gsap.fromTo(mark, { x: 0 }, { keyframes: [{ x: -5 }, { x: 5 }, { x: 0 }], duration: .24, overwrite: true, clearProps: 'transform' });
      if (!dragOrigin) return;
      const home = tile.parentElement.getBoundingClientRect();
      gsap.fromTo(tile, { x: dragOrigin.left - home.left, y: dragOrigin.top - home.top }, {
        x: 0, y: 0, duration: .28, ease: 'power2.out', overwrite: true, clearProps: 'transform',
      });
    });
  }

  function match(tile, gap, dragOrigin) {
    if (!tile || !gap || tile.disabled || gap.disabled) return;
    if (tile.dataset.word !== gap.dataset.word) {
      reject(tile, gap, dragOrigin);
      return;
    }

    const from = dragOrigin ?? tile.getBoundingClientRect();
    tile.disabled = true;
    tile.setAttribute('aria-pressed', 'false');
    gap.disabled = true;
    gap.dataset.sealed = '';
    gap.setAttribute('aria-label', gap.dataset.meaning + '，已贴好：' + tile.dataset.word);
    const patch = element('span', 'window-patch', tile.dataset.word);
    const droplets = gap.querySelectorAll('.window-drop');
    gsap?.killTweensOf(droplets);
    gap.append(patch);
    selected = undefined;
    animate(() => {
      const to = patch.getBoundingClientRect();
      gsap.timeline()
        .fromTo(patch, {
          x: from.left + from.width / 2 - to.left - to.width / 2,
          y: from.top + from.height / 2 - to.top - to.height / 2,
          scaleX: from.width / to.width, scaleY: from.height / to.height, rotation: -5,
        }, { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, duration: .26, ease: 'power2.out', clearProps: 'transform' })
        .fromTo(gap.querySelector('.patch-flash'), { autoAlpha: .86, scale: .82 }, { autoAlpha: 0, scale: 1.28, duration: .26 }, '-=.10');
    });
    play('seal');
    remaining--;
    if (remaining === 0) {
      frame.classList.add('window-dry');
      animate(() => gsap.to(warmth, { opacity: 1, duration: .45, ease: 'power2.out' }));
      game.finish('窗缝封好了，窗台不再滴水。');
    } else {
      game.status.textContent = tile.dataset.word + '贴好了。';
      [...tiles.values()].find(candidate => !candidate.disabled)?.focus({ preventScroll: true });
    }
  }

  for (const [{ word, meaning }, [x, y]] of shuffle(vocabulary).map((item, i) => [item, anchors[i]])) {
    const gap = control(meaning, 'match-gap');
    gap.lang = 'en';
    gap.dataset.word = word;
    gap.dataset.meaning = meaning;
    gap.style.left = x + '%';
    gap.style.top = y + '%';
    gap.append(element('span', 'gap-meaning', meaning), element('i', 'window-crack'),
      element('i', 'window-drop'), element('i', 'window-drop'), element('i', 'patch-flash'));
    gap.onclick = () => {
      if (!selected) {
        game.status.textContent = '先选一条密封条。';
        [...tiles.values()].find(tile => !tile.disabled)?.focus({ preventScroll: true });
        return;
      }
      match(selected, gap);
    };
    frame.append(gap);
    gaps.set(word, gap);
  }

  for (const { word } of shuffle(vocabulary)) {
    const slot = element('div', 'tape-slot');
    const tile = control(word, 'match-tape');
    tile.textContent = word;
    tile.dataset.word = word;
    tile.setAttribute('aria-pressed', 'false');
    dragPiece(tile, (event) => {
      const gap = document.elementFromPoint(event.clientX, event.clientY)?.closest('.match-gap');
      if (!gap || !frame.contains(gap) || gap.disabled) return;
      select(tile);
      match(tile, gap, tile.getBoundingClientRect());
    }, () => select(tile));
    slot.append(tile);
    tray.append(slot);
    tiles.set(word, tile);
  }

  function activate() {
    game.root.closest('dialog')?.addEventListener('close', () => animation?.revert(), { once: true });
    animate(() => {
      gsap.fromTo([...tiles.values()], { y: 9, opacity: .35 }, {
        y: 0, opacity: 1, duration: .28, stagger: .045, clearProps: 'transform,opacity',
      });
      for (const [i, gap] of [...gaps.values()].entries()) {
        gsap.fromTo(gap.querySelectorAll('.window-drop'), { y: 0, opacity: .95 }, {
          y: 25, opacity: 0, duration: .9 + i * .075, delay: i * .13, stagger: .36, repeat: -1, ease: 'power1.in',
        });
      }
    });
    function drip() {
      if (!remaining) return;
      play('drip');
      game.after(1750 - remaining * 245, drip);
    }
    game.after(500, drip);
  }

  return { ...game, focusTarget: tiles.values().next().value, activate };
}
