import { control, dragPiece, element, makeMinigame, pointIn, prop, scrub } from '../shared/minigame.js';

const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;

export function findBridgeLamps(play, onFinish) {
  const game = makeMinigame('望远镜寻灯', '左右拖动镜筒，把灯塔移到中央，稳住片刻。', play, onFinish);
  const lens = element('div', 'moon-lens');
  const panorama = element('div', 'moon-panorama');
  const reticle = element('i', 'moon-reticle');
  const targets = [
    { x: 26, y: 32, name: '西侧灯塔' },
    { x: 74, y: 43, name: '东侧灯塔' },
    { x: 87, y: 62, name: '小梅等候的月台' },
  ];
  const markers = targets.map(({ x, y, name }) => {
    const marker = element('span', 'moon-target', name);
    marker.style.left = x + '%';
    marker.style.top = y + '%';
    return marker;
  });
  panorama.append(...markers);
  lens.append(panorama, reticle);
  game.stage.append(lens);
  let index = 0;
  let timer;
  function focus(value) {
    panorama.style.setProperty('--pan', `-${value * .75}%`);
    const target = targets[index];
    if (!target) return;
    const centred = Math.abs(value * .75 + 12.5 - target.x) < 3.3;
    lens.classList.toggle('in-focus', centred);
    markers[index].classList.add('active');
    if (!centred) {
      clearTimeout(timer);
      timer = undefined;
      return;
    }
    timer ??= game.after(550, () => {
      const marker = markers[index++];
      marker.classList.replace('active', 'found');
      lens.classList.remove('in-focus');
      timer = undefined;
      if (index === targets.length) {
        game.finish('找到小梅等候的月台了。现在看看望远镜旁的记录。', reticle);
        return;
      }
      game.feedback(reticle, 'seal');
      markers[index].classList.add('active');
      game.status.textContent = '找到了' + target.name + '。继续寻找' + targets[index].name + '。';
    });
  }
  scrub(lens, '左右转动望远镜', 35, focus, true);
  return { ...game, focusTarget: lens };
}

export function matchWorkshopWords(play, onFinish) {
  const game = makeMinigame('修理坊配字', '把活字拖到合适的纸条上，也可以先选字，再点空格。', play, onFinish);
  game.stage.classList.add('workshop-puzzle');
  const slips = element('div', 'word-slips');
  const tiles = element('div', 'word-tiles');
  const placed = new Set();
  let selected;
  const pairs = [
    { word: '件', end: '事', instruction: '请帮我做一件事。' },
    { word: '篇', end: '课文', instruction: '请翻到第三页，读这篇课文。' },
  ].map((pair) => {
    const slip = element('div', 'word-slip');
    const line = element('div', 'word-line');
    const gap = control('填入“一' + pair.end + '”的量词', 'word-gap');
    gap.textContent = '＿';
    const note = element('p', 'word-note', pair.instruction);
    note.hidden = true;
    line.append(element('span', '', '一'), gap, element('span', '', pair.end));
    slip.append(line, note);
    slips.append(slip);
    return { ...pair, gap, note };
  });
  function drop(word, pair) {
    if (!word || !pair || placed.has(pair.word)) return;
    if (word !== pair.word) {
      game.feedback(pair.gap, 'wrong');
      game.status.textContent = '再想一想。这个量词和后面的词搭配吗？';
      return;
    }
    placed.add(word);
    pair.gap.textContent = word;
    pair.gap.disabled = true;
    pair.note.hidden = false;
    tiles.querySelector('[data-word="' + word + '"]').disabled = true;
    selected = undefined;
    for (const tile of tiles.children) tile.setAttribute('aria-pressed', 'false');
    if (placed.size === pairs.length) game.finish('配好了。读一读纸条，再看看档案里的留言。', slipFor(pair));
    else {
      game.feedback(slipFor(pair), 'seal');
      game.status.textContent = '搭配正确。再完成另一张纸条。';
      tiles.querySelector('button:not(:disabled)')?.focus();
    }
  }
  const slipFor = ({ gap }) => gap.closest('.word-slip');
  for (const pair of pairs) {
    pair.gap.onclick = () => drop(selected, pair);
  }
  for (const word of ['篇', '件']) {
    const tile = control('选取“' + word + '”', 'word-tile');
    tile.textContent = word;
    tile.dataset.word = word;
    tile.setAttribute('aria-pressed', 'false');
    const select = () => {
      selected = word;
      for (const candidate of tiles.children) candidate.setAttribute('aria-pressed', String(candidate === tile));
      game.feedback(tile, 'pickup');
    };
    dragPiece(tile, (event) => {
      const pair = pairs.find(({ gap }) => {
        const { x, y } = pointIn(event, gap);
        return x >= -.4 && x <= 1.4 && y >= -.35 && y <= 1.35;
      });
      drop(word, pair);
    }, select);
    tiles.append(tile);
  }
  game.stage.append(slips, tiles);
  return { ...game, focusTarget: tiles.firstElementChild };
}

export function lightMoonbridge(play, onFinish) {
  const game = makeMinigame('两岸亮灯', '拖动灯座的铜环，让光束对准对岸的灯塔。', play, onFinish);
  game.stage.classList.add('bridge-lighting');
  const beam = element('div', 'moon-beam');
  const near = element('i', 'bridge-lamp near');
  const far = element('i', 'bridge-lamp far');
  const bridgeLights = [35, 43, 51, 60, 67].map((x) => {
    const light = element('i', 'bridge-lamp span-light');
    light.style.left = x + '%';
    return light;
  });
  const collar = element('div', 'bridge-collar');
  collar.append(prop(art('trial-speed-knob')));
  game.stage.append(beam, near, far, ...bridgeLights, collar);
  let timer;
  let lit = false;
  scrub(collar, '转动铜环，调整灯光', 22, (value) => {
    if (lit) return;
    collar.style.setProperty('--turn', (value - 50) * 2.2 + 'deg');
    beam.style.setProperty('--beam', (-20 + value * .42) + 'deg');
    const aligned = Math.abs(value - 66) <= 5;
    beam.classList.toggle('aligned', aligned);
    if (!aligned) {
      clearTimeout(timer);
      timer = undefined;
      return;
    }
    timer ??= game.after(540, () => {
      lit = true;
      near.classList.add('lit');
      game.feedback(near, 'seal', true);
      bridgeLights.forEach((light, index) => game.after(75 * (index + 1), () => light.classList.add('lit')));
      game.after(475, () => {
        far.classList.add('lit');
        game.finish('两岸的灯都亮了！', far);
      });
    });
  }, true);
  return { ...game, focusTarget: collar };
}
