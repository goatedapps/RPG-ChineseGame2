const dataUrl = new URL('../stage/vendor/lesson-characters.json', import.meta.url);
const writerUrl = new URL('../stage/vendor/hanzi-writer.min.js', import.meta.url);
const dataRequests = new Map();
let writerRequest;

function getStrokeData(url) {
  const key = String(url);
  if (!dataRequests.has(key)) {
    dataRequests.set(key, fetch(url).then((response) => {
      if (!response.ok) throw new Error('Character data unavailable');
      return response.json();
    }).catch((error) => {
      dataRequests.delete(key);
      throw error;
    }));
  }
  return dataRequests.get(key);
}

function getWriter() {
  if (window.HanziWriter) return Promise.resolve(window.HanziWriter);
  writerRequest ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = writerUrl.href;
    function failed() {
      script.remove();
      reject(new Error('Handwriting library unavailable'));
    }
    script.onload = () => {
      if (window.HanziWriter) resolve(window.HanziWriter);
      else failed();
    };
    script.onerror = failed;
    document.head.append(script);
  }).catch((error) => {
    writerRequest = null;
    throw error;
  });
  return writerRequest;
}

export function createWriting(grid, word, guided, onComplete, onError, onMistake, onProgress, options = {}) {
  const characters = [...word];
  grid.dataset.length = String(characters.length);
  const squares = characters.map((_, index) => {
    const square = document.createElement('div');
    square.className = 'writing-square';
    square.setAttribute('aria-label', `第 ${index + 1} 个字的书写格`);
    square.hidden = index !== 0;
    return square;
  });
  grid.replaceChildren(...squares);
  const writers = [];
  let activeIndex = 0;
  let renderedSize = 0;
  let cancelled = false;
  const drawingSize = () => Math.max(58, grid.clientWidth - 2);
  const dimensions = (size) => ({ width: size, height: size, padding: Math.round(size * .075) });
  const setViewBox = (square, size) => square.querySelector('svg')?.setAttribute('viewBox', `0 0 ${size} ${size}`);
  const resize = new ResizeObserver(() => {
    const writer = writers[activeIndex];
    if (!writer || !grid.clientWidth) return;
    const size = drawingSize();
    if (size === renderedSize) return;
    renderedSize = size;
    writer.updateDimensions?.(dimensions(size));
    setViewBox(squares[activeIndex], size);
  });
  resize.observe(grid);

  Promise.all([getStrokeData(options.strokeDataUrl ?? dataUrl), getWriter()]).then(([data, Writer]) => {
    if (cancelled) return;
    if (characters.some((character) => !data[character])) throw new Error('Missing handwriting asset');
    function begin(index) {
      if (cancelled) return;
      activeIndex = index;
      const square = squares[index];
      square.hidden = false;
      square.classList.add('current');
      renderedSize = drawingSize();
      const writer = Writer.create(square, characters[index], {
        ...dimensions(renderedSize), leniency: 1.3,
        showCharacter: false, showOutline: guided,
        strokeColor: '#1b4135', outlineColor: '#8da991', drawingColor: '#294f3e',
        highlightColor: '#759a52',
        charDataLoader: (char, ready) => ready(data[char]),
      });
      writers.push(writer);
      setViewBox(square, renderedSize);
      writer.quiz({
        showHintAfterMisses: options.hintsAfterMisses ?? (guided ? 2 : 5),
        onMistake,
        onComplete: () => {
          if (cancelled) return;
          square.classList.remove('current');
          square.classList.add('complete');
          onProgress(index + 1);
          if (index + 1 === characters.length) onComplete();
          else {
            square.hidden = true;
            begin(index + 1);
          }
        },
      });
    }
    begin(0);
  }).catch(() => { if (!cancelled) onError(); });

  return () => {
    cancelled = true;
    resize.disconnect();
    writers.forEach((writer) => writer.cancelQuiz());
  };
}
