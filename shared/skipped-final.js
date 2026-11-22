export function showSkippedFinal(host, { cardClass, headingId, onExit, onResume }) {
  const card = document.createElement('article');
  card.className = cardClass;
  const heading = document.createElement('h2');
  heading.id = headingId;
  heading.tabIndex = -1;
  heading.textContent = '已跳过课末测试';
  const message = document.createElement('p');
  message.textContent = '开发者模式已跳过听写。已有测验进度会保留。';
  const actions = document.createElement('div');
  actions.className = 'button-row buttons';
  for (const [label, action] of [['返回星图', onExit], ['参加课末测试', onResume]]) {
    const control = document.createElement('button');
    control.type = 'button';
    control.className = 'primary gold';
    control.textContent = label;
    control.onclick = action;
    actions.append(control);
  }
  card.append(heading, message, actions);
  host.replaceChildren(card);
  host.setAttribute('aria-labelledby', headingId);
  heading.focus({ preventScroll: true });
}
