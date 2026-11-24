import { art } from './story.js';

function element(tag, cls, text) {
  const node = document.createElement(tag);
  node.className = cls;
  if (text) node.textContent = text;
  return node;
}
function key(text, activate, cls = 'rescue-key') {
  const control = element('button', cls, text);
  control.type = 'button';
  control.onclick = activate;
  return control;
}

export function rescueActivity(task, play, complete, progress) {
  const root = element('article', 'rescue-activity');
  const heading = element('h2', '', task.title);
  heading.id = 'panel-title';
  heading.tabIndex = -1;
  const hint = element('p', 'rescue-activity-prompt');
  const visual = element('div', 'rescue-activity-stage');
  const readout = element('p', 'rescue-activity-status');
  readout.setAttribute('role', 'status');
  root.append(heading, hint, visual, readout);
  let dispose = () => {};

  if (task.id === 'crew') {
    hint.textContent = '把三张姓名牌交给管钥匙、带工具和打信号的人。';
    const names = ['李小雨', '吴大山', '陈小树'];
    const jobs = ['钥匙', '工具', '信号'];
    const list = element('div', 'rescue-choice-grid');
    const roster = element('div', 'rescue-roster');
    let active;
    let matches = 0;
    const chips = names.map((name) => key(name, () => {
      active = name;
      for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.textContent === name));
      readout.textContent = '已拿起「' + name + '」的牌子。';
    }));
    const roles = jobs.map((job, index) => key(job, () => {
      if (!active) { readout.textContent = '先拿一张姓名牌。'; return; }
      const expected = ['陈小树','李小雨','吴大山'][index];
      if (active !== expected) { play('wrong'); readout.textContent = '再看看名单。'; return; }
      const chip = chips.find((item) => item.textContent === active);
      chip.disabled = true;
      chip.setAttribute('aria-pressed', 'false');
      roles[index].textContent = job + ' · ' + active;
      roles[index].disabled = true;
      active = undefined;
      play('ding');
      if (++matches === jobs.length) complete();
      else readout.textContent = '配对了！再找下一位。';
    }));
    const note = element('details', 'market-review');
    note.append(element('summary', '', '回看名单'), element('p', '', task.clue));
    list.append(...chips);
    roster.append(...roles);
    visual.append(list, roster, note);
  } else if (task.id === 'rope') {
    hint.textContent = '搬开一双画着胖熊的箱子。';
    visual.classList.add('rope-stack');
    let cleared = 0;
    const cards = ['胖熊', '瘦猴', '胖熊', '木鞋'];
    for (const label of cards) {
      const crate = key(label, () => {
        if (label !== '胖熊') { play('wrong'); readout.textContent = '这箱不挡路。再找找。'; return; }
        crate.disabled = true;
        crate.classList.add('crate-cleared');
        play('seal');
        if (++cleared === 2) {
          const rope = key('拿起救援绳', () => { play('pickup'); complete(); });
          rope.classList.add('take-rope');
          visual.append(rope);
          rope.focus();
          readout.textContent = '';
        } else readout.textContent = '还剩一个胖熊箱。';
      }, 'rescue-key crate');
      visual.append(crate);
    }
  } else if (task.id === 'tower') {
    hint.textContent = '转动望远镜的黄铜旋钮，对准水上的剧场。';
    const view = element('div', 'telescope-view');
    view.style.backgroundImage = 'url(' + art('cover') + ')';
    const dial = key('转动调焦旋钮', () => adjust(1), 'rescue-key brass-wheel');
    dial.setAttribute('aria-label', '转动调焦旋钮');
    let focus = 0;
    function adjust(amount) {
      focus = Math.min(4, Math.max(0, focus + amount));
      view.style.setProperty('--lens-blur', (4 - focus) * 2 + 'px');
      dial.style.setProperty('--turn', focus * 44 + 'deg');
      play('lever');
      if (focus !== 4 || dial.disabled) return;
      dial.disabled = true;
      play('ding');
      const reveal = key('看清了！', () => complete());
      visual.append(reveal);
      reveal.focus();
    }
    dial.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      adjust(event.key === 'ArrowRight' ? 1 : -1);
    });
    visual.append(view, dial);
  } else if (task.id === 'flag') {
    hint.textContent = '红旗指向哪边？把绳子送到那边。';
    const stage = element('div', 'rescue-throw');
    const img = element('img', 'rescue-boat');
    img.src = art('barge');
    img.alt = '水上剧场';
    const pennant = element('img', 'rescue-pennant');
    pennant.src = art('flag');
    pennant.alt = '红旗指向舞台左边';
    stage.append(img, pennant);
    const hatches = element('div', 'rescue-choice-grid');
    ['舞台左边', '舞台中间', '舞台右边'].forEach((text, i) => hatches.append(key(text, () => {
      if (i) { play('wrong'); readout.textContent = '看红旗指向哪边。'; return; }
      play('relay');
      complete();
    })));
    visual.append(stage, hatches);
  } else {
    hint.textContent = '先退到线后。等发条虎用力时转动绞盘。';
    const winch = element('div', 'rescue-winch');
    const image = element('img', 'rescue-winch-image');
    image.src = art('winch');
    image.alt = '';
    const position = key('往后退两步', () => {
      position.hidden = true;
      wheel.hidden = false;
      wheel.focus();
      readout.textContent = '绞盘亮起时，转动它。';
      started = performance.now();
      frame = requestAnimationFrame(tick);
    });
    const quiet = matchMedia('(prefers-reduced-motion: reduce)');
    let started;
    let frame;
    let turns = 0;
    let beat = 0;
    const wheel = key('', () => {
      if (!quiet.matches && (beat < .36 || beat > .72)) {
        play('wrong');
        readout.textContent = '等绞盘亮起来，再转一次。';
        return;
      }
      progress(++turns / 4);
      play('lever');
      started = performance.now();
      beat = 0;
      wheel.style.setProperty('--turn', turns * 90 + 'deg');
      readout.textContent = '剧场正在向河湾靠过来。' + turns + ' / 4';
      if (turns === 4) { play('finish'); complete(); }
    }, 'rescue-winch-control');
    wheel.setAttribute('aria-label', '转动绞盘');
    wheel.hidden = true;
    function tick(now) {
      beat = ((now - started) / 1700) % 1;
      wheel.classList.toggle('golden', quiet.matches || (beat >= .36 && beat <= .72));
      frame = requestAnimationFrame(tick);
    }
    dispose = () => cancelAnimationFrame(frame);
    winch.append(image, wheel);
    visual.append(winch, position);
  }
  return { root, heading, dispose };
}
