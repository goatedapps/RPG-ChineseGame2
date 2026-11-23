import { control, element, makeMinigame, prop } from '../shared/minigame.js';

const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
const rounds = [{ swaps: 4, speed: .58 }, { swaps: 5, speed: .44 }, { swaps: 6, speed: .33 }];
const positions = ['左边', '中间', '右边'];
const pairs = [[0, 1], [1, 2], [0, 2]];
const pick = (items) => items[Math.floor(Math.random() * items.length)];

export function supportSeedling(play, onFinish) {
  const game = makeMinigame('幼苗救援', '', play, onFinish);
  const { stage } = game;
  game.root.classList.add('seedling-shuffle');
  stage.classList.add('seedling-stage');
  const indicator = element('span', 'seedling-round');
  indicator.setAttribute('aria-hidden', 'true');
  stage.append(indicator);
  const pots = positions.map((_, index) => {
    const button = control('', 'seedling-shell');
    const plant = prop(art('minigame-pot'), 'seedling-pot');
    const cover = prop(art('seedling-cloche'), 'seedling-cover');
    button.append(plant, cover);
    button.disabled = true;
    button.onclick = () => choose(index);
    stage.append(button);
    return { button, plant, cover };
  });

  const gsap = window.gsap;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animated = () => Boolean(gsap) && !reduceMotion.matches;
  const live = () => game.root.isConnected && game.root.closest('dialog')?.open;
  let round = 0;
  let weak;
  let slots;
  let timeline;
  let phase = 'preview';
  const x = (slot) => (slot - 1) * 100;

  function place(pot, slot) {
    if (gsap) gsap.set(pot.button, { xPercent: x(slot), yPercent: 0 });
    else pot.button.style.left = 5 + slot * 30 + '%';
  }

  function preview() {
    phase = 'preview';
    stage.dataset.phase = phase;
    weak = Math.floor(Math.random() * pots.length);
    slots = [...pots];
    indicator.textContent = '第 ' + (round + 1) + ' 轮';
    game.status.textContent = indicator.textContent + '，记住茎弯的幼苗。';
    pots.forEach((pot, index) => {
      place(pot, index);
      pot.button.disabled = true;
      pot.button.removeAttribute('data-result');
      pot.button.removeAttribute('data-swap');
      pot.plant.src = art(index === weak ? 'minigame-fragile' : 'minigame-pot');
      pot.button.setAttribute('aria-label', positions[index] + (index === weak ? '的弯茎幼苗' : '的健壮幼苗'));
    });
    // Keep the reveal on screen until the image has decoded, including the first visit.
    Promise.allSettled(pots.map(({ plant, cover }) => Promise.allSettled([plant.decode(), cover.decode()])))
      .then(() => { if (live()) game.after(1550, coverPlants); });
  }

  function coverPlants() {
    phase = 'cover';
    stage.dataset.phase = phase;
    pots.forEach(({ button }) => button.setAttribute('aria-label', '盖着罩子的花盆'));
    game.status.textContent = '看好花盆的位置。';
    if (!animated()) {
      game.after(280, shufflePots);
      return;
    }
    timeline = gsap.timeline({ onComplete: () => { if (live()) shufflePots(); } });
    timeline.fromTo(pots.map(pot => pot.cover), { yPercent: -48, autoAlpha: .7 }, {
      yPercent: 0, autoAlpha: 1, duration: .4, stagger: .06, ease: 'power2.in', clearProps: 'transform,opacity,visibility',
    });
  }

  function shufflePots() {
    phase = 'shuffle';
    stage.dataset.phase = phase;
    const { swaps, speed } = rounds[round];
    const moves = [];
    let last;
    for (let i = 0; i < swaps; i++) {
      last = pick(pairs.filter(pair => i === 0 ? pair.includes(weak) : pair !== last));
      moves.push(last);
    }
    if (!animated()) {
      function next(index) {
        if (index === moves.length) { ready(); return; }
        const [a, b] = moves[index];
        const first = slots[a];
        const second = slots[b];
        first.button.dataset.swap = 'first';
        second.button.dataset.swap = 'second';
        game.after(200 + speed * 340, () => {
          [slots[a], slots[b]] = [second, first];
          place(first, b);
          place(second, a);
          game.after(200, () => {
            first.button.removeAttribute('data-swap');
            second.button.removeAttribute('data-swap');
            next(index + 1);
          });
        });
      }
      next(0);
      return;
    }
    timeline = gsap.timeline({ onComplete: () => { if (live()) ready(); } });
    for (const [i, [a, b]] of moves.entries()) {
      const first = slots[a].button;
      const second = slots[b].button;
      const time = i * (speed + .08);
      const distance = b - a === 2 ? 30 : 25;
      timeline.set(first, { zIndex: 0 }, time);
      timeline.set(second, { zIndex: 1 }, time);
      for (const [node, destination, rise] of [[first, b, -distance], [second, a, distance]]) {
        timeline.to(node, { xPercent: x(destination), duration: speed, ease: 'sine.inOut' }, time);
        timeline.to(node, { yPercent: rise, duration: speed / 2, ease: 'sine.out' }, time);
        timeline.to(node, { yPercent: 0, duration: speed / 2, ease: 'sine.in' }, time + speed / 2);
      }
      [slots[a], slots[b]] = [slots[b], slots[a]];
    }
  }

  function ready() {
    phase = 'pick';
    stage.dataset.phase = phase;
    game.status.textContent = '哪一盆的茎是弯的？';
    slots.forEach(({ button }, index) => {
      button.setAttribute('aria-label', '选择' + positions[index] + '的花盆');
      button.disabled = false;
      stage.append(button);
    });
    slots[0].button.focus({ preventScroll: true });
  }

  function choose(index) {
    if (phase !== 'pick') return;
    const correct = index === weak;
    const { button, cover } = pots[index];
    phase = 'result';
    stage.dataset.phase = phase;
    slots.forEach(({ button: pot }) => { pot.disabled = true; });
    button.dataset.result = correct ? 'right' : 'wrong';
    play(correct ? 'ding' : 'bounce');
    game.status.textContent = correct ? '找到了！' : '它的茎很直。再试这一轮。';
    if (animated()) {
      timeline = gsap.timeline();
      timeline.fromTo(cover, { yPercent: 0, autoAlpha: 1 }, {
        yPercent: -44, autoAlpha: 0, duration: .36, ease: 'power2.out', clearProps: 'transform,opacity,visibility',
      });
    }
    game.after(correct && round === rounds.length - 1 ? 780 : 1050, () => {
      if (correct) round++;
      if (round === rounds.length) game.finish('三轮都找对了，幼苗安全了！', button);
      else preview();
    });
  }

  function activate() {
    game.root.closest('dialog')?.addEventListener('close', () => timeline?.kill(), { once: true });
    preview();
  }

  return { ...game, focusTarget: game.heading, activate };
}
