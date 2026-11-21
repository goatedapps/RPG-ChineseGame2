export function speakerButton(click, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button speaker-button';
  button.addEventListener('click', click);
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
