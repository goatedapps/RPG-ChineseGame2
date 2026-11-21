export function openGameSettings({ panel, openPanel, effects, music, onHome }) {
  openPanel(null, '设置');
  const controls = document.createElement('div');
  controls.className = 'game-settings';

  function toggle(label, preference) {
    const control = document.createElement('button');
    control.type = 'button';
    function update() {
      control.textContent = (preference.get() ? '关闭' : '开启') + label;
    }
    control.onclick = () => {
      preference.set(!preference.get());
      update();
    };
    update();
    return control;
  }

  controls.append(toggle('音效', effects), toggle('音乐', music));
  if (onHome) {
    const home = document.createElement('button');
    home.type = 'button';
    home.textContent = '返回首页';
    home.onclick = onHome;
    controls.append(home);
  }
  panel.append(controls);
}
