export function showSkippedFinal(host, { cardClass, headingId, onExit, onResume, onDeveloper }) {
  const card = document.createElement('article');
  card.className = cardClass;
  card.lang = 'en';
  const heading = document.createElement('h2');
  heading.id = headingId;
  heading.tabIndex = -1;
  heading.textContent = 'Final test skipped';
  const message = document.createElement('p');
  message.textContent = 'Your test progress is saved. The next available lesson opens on the star map while skipping is on in this tab.';
  const actions = document.createElement('div');
  actions.className = 'button-row buttons';
  for (const [label, action] of [['Return to star map', onExit], ['Turn off skipping and take the test', onResume], ['Developer mode', onDeveloper]]) {
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
