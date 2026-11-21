const iconPaths = {
  effects: 'M4 9v6h4l5 4V5L8 9H4Zm12 0a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12',
  music: 'M9 17V6l11-2v11M9 17a3 2 0 1 1-3-2c1.7 0 3 .9 3 2Zm11-2a3 2 0 1 1-3-2c1.7 0 3 .9 3 2Z',
  home: 'm3 10 9-7 9 7M5 9v11h14V9m-9 11v-6h4v6',
  arrow: 'm9 6 6 6-6 6',
};

function icon(name, className = 'settings-icon') {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(namespace, 'path');
  path.setAttribute('d', iconPaths[name]);
  svg.append(path);
  return svg;
}

export function openGameSettings({ panel, openPanel, effects, music, onHome }) {
  openPanel(null, '设置');
  const controls = document.createElement('div');
  controls.className = 'game-settings';
  const sound = document.createElement('div');
  sound.className = 'settings-sound';
  controls.append(sound);

  function toggle(label, name, preference) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'settings-toggle';
    control.setAttribute('role', 'switch');
    control.setAttribute('aria-label', label);

    const text = document.createElement('span');
    text.textContent = label;
    const state = document.createElement('span');
    state.className = 'settings-state';
    state.setAttribute('aria-hidden', 'true');
    const track = document.createElement('span');
    track.className = 'settings-track';
    track.setAttribute('aria-hidden', 'true');

    control.append(icon(name), text, state, track);
    function update() {
      const enabled = preference.get();
      control.setAttribute('aria-checked', String(enabled));
      state.textContent = enabled ? '开启' : '关闭';
    }
    control.onclick = () => {
      preference.set(!preference.get());
      update();
    };
    update();
    return control;
  }

  sound.append(toggle('音效', 'effects', effects), toggle('背景音乐', 'music', music));
  if (onHome) {
    const home = document.createElement('button');
    home.type = 'button';
    home.className = 'settings-home';
    home.append(icon('home'), '返回首页', icon('arrow', 'settings-arrow'));
    home.onclick = onHome;
    controls.append(home);
  }
  panel.append(controls);
}
