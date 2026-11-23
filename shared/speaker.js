export function speakerButton(click, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button speaker-button';
  if (click) button.addEventListener('click', click);
  button.setAttribute('aria-label', label);
  const svgNS = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNS, 'svg');
  icon.setAttribute('class', 'speaker-icon');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M4 9v6h4l5 4V5L8 9H4Z M16 9a4 4 0 0 1 0 6 M19 6a8.5 8.5 0 0 1 0 12');
  icon.append(path);
  button.append(icon);
  button.title = label;
  return button;
}


function playbackControl(voice, text, onState, subject) {
  const button = speakerButton(null, '播放' + subject);
  const icon = button.querySelector('path');
  const speaker = icon.getAttribute('d');
  let playing = false;
  function render(state) {
    playing = state === 'playing';
    const label = (playing ? '停止' : '播放') + subject;
    button.title = label;
    button.setAttribute('aria-label', label);
    icon.setAttribute('d', playing ? 'M6 6h12v12H6z' : speaker);
    onState?.(state);
  }
  const start = () => voice.speak(text, .85, render);
  const stop = () => { if (playing) voice.stop(); };
  button.onclick = () => playing ? stop() : start();
  return { button, start, stop };
}

export function dictationButton(voice, text, onState, { autoplay = false } = {}) {
  const control = playbackControl(voice, text, onState, '听写');
  if (autoplay) control.start();
  return control.button;
}

export function createClueReader(voice) {
  const presented = new Set();
  return (id, text) => {
    const control = playbackControl(voice, text, null, '线索');
    control.button.classList.add('clue-speaker');
    return {
      ...control,
      reveal() {
        if (presented.has(id)) return;
        presented.add(id);
        control.start();
      },
    };
  };
}
