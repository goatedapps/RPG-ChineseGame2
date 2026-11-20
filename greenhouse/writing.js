const dataUrl = new URL('../stage/vendor/lesson-characters.json', import.meta.url);
let dataRequest;

function getStrokeData() {
  dataRequest ??= fetch(dataUrl).then((response) => {
    if (!response.ok) throw new Error('Character data unavailable');
    return response.json();
  }).catch((error) => {
    dataRequest = null;
    throw error;
  });
  return dataRequest;
}

export function createWriting(grid, word, guided, onComplete, onError, onMistake) {
  const characters = [...word];
  const squares = characters.map((_, index) => {
    const square = document.createElement('div');
    square.className = 'writing-square';
    square.setAttribute('aria-label', `第 ${index + 1} 个字的书写格`);
    return square;
  });
  grid.replaceChildren(...squares);
  let writers = [];
  let cancelled = false;

  getStrokeData().then((data) => {
    if (cancelled) return;
    const Writer = window.HanziWriter;
    if (!Writer || characters.some((character) => !data[character])) throw new Error('Missing handwriting asset');
    writers = characters.map((character, index) => {
      const size = Math.max(58, Math.floor(squares[index].getBoundingClientRect().width) - 2);
      return Writer.create(squares[index], character, {
        width: size, height: size, padding: 7, leniency: 1.3,
        showCharacter: false, showOutline: guided,
        strokeColor: '#1b4135', outlineColor: '#8da991', drawingColor: '#294f3e',
        highlightColor: '#759a52',
        charDataLoader: (char, ready) => ready(data[char]),
      });
    });
    function begin(index) {
      if (cancelled) return;
      squares[index].classList.add('current');
      writers[index].quiz({
        showHintAfterMisses: guided ? 2 : false,
        onMistake,
        onComplete: () => {
          if (cancelled) return;
          squares[index].classList.remove('current');
          squares[index].classList.add('complete');
          if (index + 1 === writers.length) onComplete();
          else begin(index + 1);
        },
      });
    }
    begin(0);
  }).catch(() => { if (!cancelled) onError(); });

  return () => {
    cancelled = true;
    writers.forEach((writer) => writer.cancelQuiz());
  };
}
