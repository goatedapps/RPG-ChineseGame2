function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function vocabularyList(entries, known, getEntry) {
  const list = node('ol', '', 'vocab');
  const examples = new Map();
  entries.forEach((entry, index) => {
    const { word } = entry;
    const line = node('li');
    if (!known.has(word)) {
      line.className = 'locked';
      line.append(node('strong', '待发现'), node('span', '第 ' + (index + 1) + ' 个词', 'vocab-note'));
    } else {
      const { pinyin, meaning, sentence, reminder, controls, extra } = getEntry(entry);
      const term = node('strong', word);
      term.append(node('span', pinyin, 'pinyin'));
      const definition = node('p', meaning, 'definition');
      if (reminder) definition.append(node('span', ' · ' + reminder, 'vocab-note'));
      const example = node('p', sentence, 'word-example');
      example.hidden = !sentence;
      examples.set(word, example);
      const details = node('div', '', 'word-details');
      details.append(definition, example);
      const buttons = node('span', '', 'row-buttons');
      buttons.append(...controls);
      line.append(term, details, buttons);
      if (extra) line.append(extra);
    }
    list.append(line);
  });
  return { list, examples };
}
