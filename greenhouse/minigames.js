import { control, dragPiece, element, makeMinigame, pointIn, prop, scrub } from '../shared/minigame.js';

const art = (name) => new URL('./art/' + name + '.webp', import.meta.url).href;
const at = (event, node, margin = .1) => {
  const { x, y } = pointIn(event, node);
  return x >= -margin && x <= 1 + margin && y >= -margin && y <= 1 + margin;
};

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
