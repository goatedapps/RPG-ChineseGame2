import { control, dragPiece, element, makeMinigame, pointIn, prop } from '../shared/minigame.js';
import { art } from './story.js';

function animateWhileOpen(root, draw) {
  const start = performance.now();
  function frame(time) {
    if (!root.isConnected || !root.closest('dialog')?.open || 'complete' in root.dataset) return;
    draw((time - start) / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function crossSteps(play, finish) {
  const game = makeMinigame('越过浮梯', '等踏板升进金色标记，再轻触踏板跃过去。', play, finish);
  const { stage } = game;
  stage.classList.add('floating-steps');
  const ledge = element('div', 'stair-ledge');
  const slots = Array.from({ length: 5 }, (_, i) => {
    const socket = element('div', 'step-socket');
    socket.style.left = 13 + i * 18 + '%';
    socket.style.top = 63 - i * 6.5 + '%';
    const step = control('第' + (i + 1) + '块浮梯踏板', 'floating-step');
    socket.append(step);
    stage.append(socket);
    return { socket, step };
  });
  let landed = 0;
  let height = 0;
  const brace = control('插入撑住斜坡的木柱', 'brace-prop');
  brace.hidden = true;
  brace.append(element('span', '', '木柱'));
  function support() {
    if (brace.disabled) return;
    brace.disabled = true;
    stage.classList.add('braced');
    game.finish('斜坡撑稳了。回程可以走这条路。', ledge);
  }
  dragPiece(brace, (event) => {
    const { x } = pointIn(event, stage);
    if (x > .48) support();
    else game.feedback(brace, 'wrong');
  }, support);
  stage.append(ledge, brace);
  for (const [i, { step, socket }] of slots.entries()) {
    step.disabled = i !== 0;
    socket.classList.toggle('active', i === 0);
    step.onclick = () => {
      if (i !== landed) return;
      if (Math.abs(height) > .56) {
        game.feedback(step, 'wrong');
        game.status.textContent = '还没对齐。等踏板回到金色标记，再跳。';
        return;
      }
      step.disabled = true;
      socket.classList.replace('active', 'landed');
      socket.style.setProperty('--float', '0px');
      landed++;
      game.feedback(step, 'step');
      const next = slots[landed];
      if (next) {
        next.step.disabled = false;
        next.socket.classList.add('active');
        next.step.focus();
        game.status.textContent = '踩稳了！看准下一块踏板，再往前蹦。';
      } else {
        game.status.textContent = '斜坡向一边倾斜。把木柱拖到右侧斜坡下撑住它。';
        brace.hidden = false;
        brace.focus();
      }
    };
  }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  animateWhileOpen(game.root, (t) => {
    const active = slots[landed];
    if (!active) return;
    height = motion.matches ? 0 : Math.sin(t * 3 + landed * .7);
    active.socket.style.setProperty('--float', height * 25 + 'px');
    active.socket.classList.toggle('aligned', Math.abs(height) <= .56);
  });
  return { ...game, focusTarget: slots[0].step };
}

export function guidePassengers(play, finish) {
  const game = makeMinigame('扶他们上渡船', '把干外套递给奶奶。', play, finish);
  const { stage } = game;
  stage.classList.add('shelter-game');
  const grandma = prop(art('grandma'), 'shelter-grandma');
  const child = prop(art('child'), 'shelter-child');
  const coat = control('拿起干外套', 'shelter-coat');
  coat.append(prop(art('coat')));
  const shoulder = control('把干外套递给奶奶', 'shelter-shoulder');
  const hand = control('小男孩的手', 'shelter-hand');
  const arm = control('奶奶的胳膊', 'shelter-arm');
  shoulder.append(element('span', '', '递外套'));
  hand.append(element('span', '', '手'));
  arm.append(element('span', '', '胳膊'));
  hand.hidden = true;
  arm.hidden = true;
  let action = 0;
  let holding = false;
  function giveCoat() {
    if (action) return;
    action++;
    stage.classList.add('coat-given');
    coat.disabled = true;
    shoulder.hidden = true;
    hand.hidden = arm.hidden = false;
    game.feedback(grandma, 'pickup');
    game.status.textContent = '奶奶换上了干外套。先牵住小男孩的手。';
    hand.focus();
  }
  dragPiece(coat, (event) => {
    const { x, y } = pointIn(event, stage);
    if (x < .56 && y < .78) giveCoat();
    else game.feedback(coat, 'wrong');
  }, () => {
    holding = true;
    coat.setAttribute('aria-pressed', 'true');
    shoulder.focus();
  });
  shoulder.onclick = () => {
    if (holding) giveCoat();
    else coat.focus();
  };
  hand.onclick = () => {
    if (action !== 1) return;
    action++;
    hand.classList.add('assisted');
    hand.disabled = true;
    game.feedback(child, 'relay');
    game.status.textContent = '牵住手了。现在走到奶奶身旁，挽住她的胳膊。';
    arm.focus();
  };
  arm.onclick = () => {
    if (action !== 2) {
      game.feedback(arm, 'wrong');
      game.status.textContent = '先让小男孩牵住你的手，再去挽奶奶的胳膊。';
      return;
    }
    action++;
    arm.classList.add('assisted');
    arm.disabled = true;
    game.finish('你牵着小男孩的手，挽着奶奶的胳膊。大家安全上船了。', grandma);
  };
  stage.append(grandma, child, coat, shoulder, hand, arm);
  return { ...game, focusTarget: coat };
}

export function dockFerry(play, finish) {
  const game = makeMinigame('把渡船拉回家', '等船影摆到金色标记之间，再拖动铜把手收绳。', play, finish);
  const { stage } = game;
  stage.classList.add('winch-game');
  const berth = element('div', 'berth-timing');
  const ferry = element('i', 'ferry-marker');
  const zone = element('i', 'berth-zone');
  const winch = control('转动绞盘收缆绳', 'ferry-winch');
  winch.append(prop(art('winch')));
  const progress = element('progress', 'ferry-progress');
  progress.max = 4;
  progress.value = 0;
  progress.setAttribute('aria-label', '回收缆绳的进度');
  berth.append(zone, ferry);
  stage.append(berth, winch, progress);
  let pulls = 0;
  let swing = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function pull() {
    if (pulls >= 4) return;
    if (Math.abs(swing) > .55) {
      game.feedback(winch, 'wrong');
      game.status.textContent = '缆绳拉紧了。等船影回到金色区域，再转绞盘。';
      return;
    }
    pulls++;
    progress.value = pulls;
    stage.style.setProperty('--crank', pulls * 43 + 'deg');
    game.feedback(winch, 'seal');
    if (pulls === 4) {
      stage.classList.add('docked');
      game.finish('渡船稳稳地靠岸了！', ferry);
    } else game.status.textContent = '收紧一段缆绳。等渡船回到标记之间，再拉一次。';
  }
  dragPiece(winch, pull, pull);
  animateWhileOpen(game.root, (t) => {
    swing = motion.matches ? 0 : Math.sin(t * 2.25);
    berth.style.setProperty('--swing', (50 + swing * (38 - pulls * 4)) + '%');
    berth.classList.toggle('aligned', Math.abs(swing) <= .55);
  });
  return { ...game, focusTarget: winch };
}
