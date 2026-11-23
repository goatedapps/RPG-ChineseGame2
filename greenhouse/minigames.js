import { control, dragPiece, element, makeMinigame, pointIn, prop, scrub } from '../shared/minigame.js';

const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
const at = (event, node, margin = .1) => {
  const { x, y } = pointIn(event, node);
  return x >= -margin && x <= 1 + margin && y >= -margin && y <= 1 + margin;
};

export function readRootFootage(play, onFinish) {
  const game = makeMinigame('幼苗救援 · 根系观察', '拖动录像进度，找出幼苗开始在土里扎根的那一天。', play, onFinish);
  const { stage } = game;
  stage.classList.add('root-monitor');
  const screen = control('记录这一帧的生长情况', 'root-frame');
  const frame = prop(art('minigame-root-0'));
  screen.append(frame);
  const timeline = element('div', 'root-timeline');
  const head = element('i', 'root-playhead');
  const day = element('span', 'root-day');
  const days = ['第一天', '第三天', '第五天', '第七天'];
  let index = 0;
  timeline.append(head);
  for (const label of days) timeline.append(element('span', '', label));
  scrub(timeline, '查看生长录像', 0, (value) => {
    const previous = index;
    index = Math.round(value * 3 / 100);
    head.style.left = value + '%';
    day.textContent = days[index];
    frame.src = art('minigame-root-' + index);
    timeline.setAttribute('aria-valuetext', days[index]);
    if (index !== previous) game.feedback(day, 'ui');
  });
  screen.onclick = () => {
    if (index === 2) {
      screen.disabled = true;
      game.finish('第五天，细根伸进土里，幼苗开始扎根了。', screen);
    } else {
      game.feedback(screen, 'wrong');
      game.status.textContent = index < 2
        ? '根还没有伸展开。再往后看看。'
        : '根已经很多了。往前找找第一次扎根的画面。';
    }
  };
  stage.append(screen, day, timeline);
  game.status.textContent += ' 找到后轻触屏幕记录。';
  return { ...game, focusTarget: timeline };
}

export function prepareExhibit(play, onFinish) {
  const game = makeMinigame('科学展开幕', '按布置图摆放：花盆放中央，标签朝前，展灯照着叶子。', play, onFinish);
  const { stage } = game;
  stage.classList.add('exhibit-puzzle');
  const layout = prop(art('page-exhibit'), 'exhibit-plan');
  const pot = control('移动花盆', 'exhibit-piece pot');
  const label = control('转动展品标签', 'exhibit-piece label');
  const lamp = element('div', 'exhibit-piece lamp');
  pot.append(prop(art('minigame-pot')));
  label.append(prop(art('minigame-label')), element('span', 'exhibit-label-ink', '豆苗'));
  lamp.append(prop(art('minigame-lamp')));
  const spot = control('把花盆放在展台中央', 'exhibit-pot-spot');
  const light = element('i', 'exhibit-beam');
  const glow = element('i', 'exhibit-glow');
  let step = 0;
  let selected = false;
  let turns = 0;
  let timer;
  function placePot() {
    if (step !== 0) return;
    step++;
    stage.classList.add('has-pot');
    pot.disabled = true;
    spot.hidden = true;
    label.disabled = false;
    game.feedback(pot, 'seal', true);
    game.status.textContent = '花盆放好了。转一转标签，让正面朝向参观者。';
    label.focus();
  }
  function pickUpPot() {
    selected = true;
    pot.setAttribute('aria-pressed', 'true');
    spot.focus();
  }
  spot.onclick = () => {
    if (selected) placePot();
    else pot.focus();
  };
  dragPiece(pot, (event) => { if (at(event, spot, .2)) placePot(); }, pickUpPot);
  label.disabled = true;
  label.onclick = () => {
    if (step !== 1) return;
    turns++;
    label.style.setProperty('--label-turn', (90 - 45 * turns) + 'deg');
    game.feedback(label, 'seal');
    if (turns < 2) return;
    step++;
    stage.classList.add('has-label');
    label.disabled = true;
    lamp.tabIndex = 0;
    lamp.removeAttribute('aria-disabled');
    game.status.textContent = '标签朝前了。拖动灯罩，把光照在叶子上。';
    lamp.focus();
  };
  scrub(lamp, '转动展灯', 18, (value) => {
    if (step > 2) return;
    lamp.style.setProperty('--lamp-turn', (value - 65) * .8 + 'deg');
    light.style.setProperty('--light-turn', (value - 65) * 1.15 + 'deg');
    const aligned = step === 2 && Math.abs(value - 65) <= 6;
    stage.classList.toggle('light-aligned', aligned);
    if (!aligned) {
      clearTimeout(timer);
      timer = undefined;
      return;
    }
    timer ??= game.after(430, () => {
      step++;
      stage.classList.add('exhibit-ready');
      game.finish('展台准备好了，科学展可以开幕了！', glow);
    });
  }, true);
  lamp.tabIndex = -1;
  lamp.setAttribute('aria-disabled', 'true');
  stage.append(layout, light, glow, spot, pot, label, lamp);
  return { ...game, focusTarget: pot };
}
