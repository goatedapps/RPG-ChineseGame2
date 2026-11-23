import { control, dragPiece, element, makeMinigame, prop } from '../shared/minigame.js?v=finish-cue';
import { art } from './story.js?v=market-games';

function motionFor(game) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const context = window.gsap?.context(() => {}, game.root);
  return {
    animate(effect) {
      if (!reduced.matches) context?.add(effect);
    },
    activate() {
      const dialog = game.root.closest('dialog');
      dialog?.addEventListener('close', () => context?.revert(), { once: true });
    },
  };
}

const mirrorParts = [
  { word: '歪', clue: '镜面装歪了', gap: '镜面装＿了', image: 'disc' },
  { word: '倾斜', clue: '镜架向左倾斜', gap: '镜架向左＿＿', image: 'lean' },
  { word: '基础', clue: '底座是镜架的基础', gap: '底座是镜架的＿＿', image: 'base' },
  { word: '撑', clue: '木块撑住镜架', gap: '用木块＿住镜架', image: 'brace' },
];

function fixMirror(play, finish) {
  const game = makeMinigame('扶正铜镜', '把词条贴到修理图上的空格。', play, finish);
  const { root, stage, status } = game;
  const { animate, activate } = motionFor(game);
  root.classList.add('mirror-game');
  const work = element('div', 'mirror-work');
  const mirror = prop(art('mirror'), 'mirror-object');
  const beam = element('div', 'mirror-light');
  const board = element('div', 'mirror-diagram');
  const tray = element('div', 'mirror-words');
  tray.setAttribute('role', 'group');
  tray.setAttribute('aria-label', '词条');
  work.append(beam, mirror);
  stage.append(work, board, tray);
  const slots = new Map();
  const tiles = new Map();
  const fixed = new Set();
  let selected;

  function match(part) {
    if (!part || fixed.has(part.word) || !selected) return;
    const slot = slots.get(part.word);
    if (selected.textContent !== part.word) {
      status.textContent = '看看图，再试一处。';
      game.feedback(slot, 'bounce');
      return;
    }
    fixed.add(part.word);
    selected.disabled = true;
    selected.setAttribute('aria-pressed', 'false');
    selected = undefined;
    slot.disabled = true;
    slot.dataset.matched = '';
    slot.lastChild.textContent = part.clue;
    slot.setAttribute('aria-label', part.clue);
    work.style.setProperty('--tilt', (fixed.has('倾斜') ? 0 : -5) + (fixed.has('歪') ? 0 : -7) + 'deg');
    work.classList.toggle('mirror-settled', fixed.has('基础'));
    work.classList.toggle('mirror-braced', fixed.has('撑'));
    animate(() => window.gsap.fromTo(slot, { scale: .94 }, { scale: 1, duration: .3, ease: 'back.out(2)', clearProps: 'transform' }));
    if (fixed.size === mirrorParts.length) {
      work.classList.add('mirror-lit');
      animate(() => window.gsap.fromTo(beam, { opacity: 0, scaleX: .2 }, { opacity: 1, scaleX: 1, duration: .55, clearProps: 'opacity,transform' }));
      game.finish('铜镜稳了，镜光照亮了石阶。', mirror, 'ding');
      return;
    }
    play('ding');
    status.textContent = part.clue + '。';
    [...tiles.values()].find(tile => !tile.disabled)?.focus({ preventScroll: true });
  }

  for (const part of mirrorParts) {
    const slot = control(part.gap, 'mirror-slot');
    slot.append(prop(art('diagram-' + part.image)), element('span', '', part.gap));
    slot.dataset.word = part.word;
    slot.onclick = () => {
      if (selected) match(part);
      else status.textContent = '先选一张词条。';
    };
    slots.set(part.word, slot);
    board.append(slot);
  }

  const order = [...mirrorParts];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const part of order) {
    const tile = control(part.word, 'mirror-word');
    tile.textContent = part.word;
    tile.setAttribute('aria-pressed', 'false');
    function select() {
      selected?.setAttribute('aria-pressed', 'false');
      selected = tile;
      tile.setAttribute('aria-pressed', 'true');
    }
    dragPiece(tile, (event) => {
      const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('.mirror-slot');
      if (!slot || !board.contains(slot)) return;
      select();
      match(mirrorParts.find(item => item.word === slot.dataset.word));
    }, select);
    tiles.set(part.word, tile);
    tray.append(tile);
  }
  return { ...game, focusTarget: game.heading, activate };
}

// The cord starts at the lantern, runs around the middle, left and right
// hooks, and ends at the tassel. Only the loop nearest the free end lifts.
const hooks = [
  { x: 210, y: 83, label: '中间的绳圈', tip: [215, 157] },
  { x: 96, y: 83, label: '左边的绳圈', tip: [72, 164] },
  { x: 322, y: 83, label: '右边的绳圈', tip: [355, 160] },
];
const cordRoutes = [
  'M200 180 Q185 129 210 98 Q234 74 212 69 Q196 72 193 94 Q155 123 112 95 Q95 83 96 68 Q77 70 82 93 Q105 153 222 130 Q274 121 307 98 Q330 77 322 69 Q303 70 305 95 Q324 129 355 160',
  'M200 180 Q185 129 210 98 Q234 74 212 69 Q196 72 193 94 Q155 123 112 95 Q95 83 96 68 Q77 70 82 93 Q91 129 72 164',
  'M200 180 Q185 129 210 98 Q234 74 212 69 Q196 72 193 94 Q190 127 215 157',
  'M200 180 Q188 160 202 144 Q216 156 202 174',
];
const svg = (tag) => document.createElementNS('http://www.w3.org/2000/svg', tag);

function untangleLantern(play, finish) {
  const game = makeMinigame('解开灯绳', '顺着金色绳头找过去，把绳圈从挂钩上抬下来。', play, finish);
  const { root, stage, status } = game;
  const { animate, activate } = motionFor(game);
  root.classList.add('cord-game');
  const rack = element('div', 'lantern-rail');
  const decorations = [prop(art('festival-lantern'), 'side-lantern left'), prop(art('painted-lantern'), 'side-lantern right')];
  const take = control('取下有两枚手印的旧灯笼', 'take-lantern');
  take.append(prop(art('keepsake')));
  take.disabled = true;
  const ropes = svg('svg');
  ropes.setAttribute('viewBox', '0 0 400 320');
  ropes.setAttribute('preserveAspectRatio', 'none');
  ropes.setAttribute('aria-hidden', 'true');
  ropes.classList.add('lantern-cords');
  const left = svg('path');
  left.setAttribute('d', 'M70 173 Q84 131 97 96 Q121 58 94 72 Q68 83 160 111 Q213 126 227 148');
  const right = svg('path');
  right.setAttribute('d', 'M330 180 Q335 132 322 96 Q299 61 325 70 Q348 80 278 114 Q233 135 223 100');
  left.classList.add('neighbor-cord');
  right.classList.add('neighbor-cord');
  const cord = svg('path');
  cord.classList.add('main-cord');
  const tassel = svg('circle');
  tassel.setAttribute('r', '5.5');
  tassel.classList.add('cord-tip');
  ropes.append(left, right, cord, tassel);

  let count = 0;
  const loops = hooks.map((hook, index) => {
    const loop = control(hook.label, 'cord-loop');
    loop.style.left = hook.x / 4 + '%';
    loop.style.top = hook.y / 3.2 + '%';
    loop.append(element('i'));
    dragPiece(loop, (event) => {
      const rect = stage.getBoundingClientRect();
      if (event.clientY < rect.top + rect.height * hook.y / 320 - 10) lift(index);
      else status.textContent = '把绳圈往上抬，离开挂钩。';
    }, () => lift(index));
    return loop;
  });

  function draw() {
    cord.setAttribute('d', cordRoutes[count]);
    const tip = hooks[hooks.length - 1 - count]?.tip;
    tassel.style.display = tip ? '' : 'none';
    if (tip) {
      tassel.setAttribute('cx', tip[0]);
      tassel.setAttribute('cy', tip[1]);
    }
  }

  function lift(index) {
    if (loops[index].disabled) return;
    if (index !== hooks.length - 1 - count) {
      status.textContent = '绳子还卡着。从金色绳头找起。';
      play('bounce');
      animate(() => window.gsap.fromTo(take, { rotation: -4 }, { rotation: 0, duration: .6, ease: 'elastic.out(1,.45)', overwrite: true, clearProps: 'transform' }));
      return;
    }
    const loop = loops[index];
    loop.disabled = true;
    loop.dataset.free = '';
    count++;
    draw();
    play('ding');
    animate(() => {
      window.gsap.fromTo(cord, { opacity: .42 }, { opacity: 1, duration: .28, clearProps: 'opacity' });
      window.gsap.fromTo(take, { rotation: 3 }, { rotation: 0, duration: .48, ease: 'elastic.out(1,.5)', overwrite: true, clearProps: 'transform' });
    });
    if (count === hooks.length) {
      take.disabled = false;
      take.focus({ preventScroll: true });
      status.textContent = '灯绳松开了。拿起旧灯笼。';
    } else {
      status.textContent = '再顺着绳头找下一处。';
      loops.find(button => !button.disabled)?.focus({ preventScroll: true });
    }
  }

  take.onclick = () => {
    take.disabled = true;
    animate(() => window.gsap.to(take, { yPercent: -15, scale: 1.08, duration: .38, ease: 'power2.out' }));
    game.finish('旧灯笼拿到了。', null, 'pickup');
  };
  draw();
  stage.append(rack, ...decorations, take, ropes, ...loops);
  return { ...game, focusTarget: game.heading, activate };
}

const actions = {
  step: { label: '一只脚压住松动的石板', text: '踩稳了，石板不晃了。', motion: [{ y: -10 }, { y: 10, scale: .96 }] },
  hop: { label: '双脚离地跳过小缝', text: '双脚一蹦，就过了石缝。', motion: [{ xPercent: -13, yPercent: 14 }, { yPercent: -14, xPercent: 0 }, { xPercent: 13, yPercent: 14 }] },
  dash: { label: '快跑穿过长廊', text: '风一停，就迅速跑了过去。', motion: [{ xPercent: -22 }, { xPercent: 23, duration: .32 }] },
  walk: { label: '慢慢往前走', text: '这是慢慢走。', motion: [{ xPercent: -6 }, { xPercent: 6, duration: .52 }] },
  hands: { label: '握住对方伸出来的手', text: '两只手牵在一起了。', motion: [{ scale: .93 }, { scale: 1.06 }] },
  arms: { label: '把胳膊绕进奶奶弯着的手臂', text: '挽着奶奶的胳膊，一起回广场。', motion: [{ xPercent: 5, rotation: -5 }, { xPercent: 0, rotation: 0, scale: 1.05 }] },
};
const roofRounds = [
  { word: '踩', answer: 'step', choices: ['hop', 'step', 'walk'] },
  { word: '蹦', answer: 'hop', choices: ['hop', 'dash', 'step'] },
  { word: '迅速', answer: 'dash', choices: ['walk', 'dash'] },
  { word: '牵', answer: 'hands', choices: ['arms', 'hands'] },
  { word: '挽', answer: 'arms', choices: ['hands', 'arms'] },
];

function guideShadows(play, finish) {
  const game = makeMinigame('提灯过巷', '看灯笼上的词，点选相应的动作。', play, finish);
  const { root, stage, status } = game;
  const { animate, activate } = motionFor(game);
  root.classList.add('rooftop-game');
  const lamp = element('div', 'rooftop-lantern');
  lamp.append(prop(art('keepsake')));
  const word = element('span', 'rooftop-word');
  word.setAttribute('aria-live', 'polite');
  lamp.append(word);
  const path = element('div', 'rooftop-path');
  const lights = roofRounds.map(() => element('i'));
  path.setAttribute('aria-hidden', 'true');
  path.append(...lights);
  const options = element('div', 'rooftop-actions');
  const result = element('div', 'rooftop-result');
  result.hidden = true;
  const pose = element('img', 'rooftop-pose');
  pose.alt = '';
  result.append(pose);
  stage.append(lamp, path, options, result);
  let round = 0;

  function prompt(focus = false) {
    const item = roofRounds[round];
    word.textContent = item.word;
    result.hidden = true;
    options.hidden = false;
    options.replaceChildren(...item.choices.map((id) => {
      const choice = control(actions[id].label, 'rooftop-action');
      choice.append(prop(art('action-' + id)));
      choice.onclick = () => respond(id, item);
      return choice;
    }));
    if (focus) options.querySelector('button').focus({ preventScroll: true });
  }

  function respond(id, item) {
    if (options.hidden) return;
    options.hidden = true;
    result.hidden = false;
    pose.removeAttribute('style');
    pose.src = art('action-' + id);
    pose.alt = actions[id].label;
    const correct = id === item.answer;
    status.textContent = actions[id].text + (correct ? '' : ' 再试一次。');
    if (correct) {
      lights[round].classList.add('lit');
      round++;
    }
    animate(() => {
      window.gsap.timeline({ defaults: { duration: .24, ease: 'power2.inOut' } })
        .set(pose, { clearProps: 'transform' })
        .set(pose, actions[id].motion[0])
        .to(pose, { keyframes: actions[id].motion.slice(1) });
    });
    if (round === roofRounds.length) {
      game.finish('灯笼照亮了出口，影子跟着回到广场。', null, 'ding');
      return;
    }
    play(correct ? 'ding' : 'bounce');
    game.after(correct ? 660 : 1000, () => {
      status.textContent = '看灯笼上的词，点选相应的动作。';
      prompt(true);
    });
  }

  prompt();
  return { ...game, focusTarget: game.heading, activate };
}

export const marketMinigames = { mirror: fixMirror, keepsake: untangleLantern, rooftop: guideShadows };
