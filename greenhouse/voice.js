const mandarin = /^(?:cmn(?:[-_]|$)|zh$|zh[-_](?:CN|SG|TW|Hans)(?:[-_]|$))/i;

export function createVoice(onChange) {
  const synth = window.speechSynthesis;
  let revision = 0;
  let activeListener;
  let watchdog;

  function stop() {
    revision += 1;
    clearTimeout(watchdog);
    synth?.cancel();
    const previous = activeListener;
    activeListener = undefined;
    onChange('idle');
    previous?.('idle');
  }

  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeListener) stop();
  });

  function speak(text, rate = .87, onState = () => {}) {
    stop();
    const id = revision;
    let terminal = false;
    activeListener = onState;
    const report = (status) => {
      if (id !== revision || terminal) return;
      if (status !== 'playing') {
        terminal = true;
        clearTimeout(watchdog);
        activeListener = undefined;
      }
      onChange(status);
      onState(status);
    };
    if (!synth || !window.SpeechSynthesisUtterance) {
      report('unavailable');
      return;
    }
    try {
      const voices = synth.getVoices();
      const choices = voices.filter((voice) => mandarin.test(voice.lang));
      const preferred = choices.find((voice) => /(?:SG|CN|Hans)(?:[-_]|$)/i.test(voice.lang)) ?? choices[0];
      if (voices.length && !preferred) {
        report('unavailable');
        return;
      }
      const line = new SpeechSynthesisUtterance(text);
      line.lang = preferred?.lang ?? 'zh-CN';
      if (preferred) line.voice = preferred;
      line.rate = rate;
      let started = false;
      line.onstart = () => { started = true; };
      line.onend = () => report('idle');
      line.onerror = (event) => report(['canceled', 'interrupted'].includes(event.error) ? 'idle' : 'unavailable');
      const deadline = performance.now() + 8000 + ([...text].length * 550 / rate);
      function checkPlayback() {
        if (id !== revision) return;
        if (!synth.speaking && !synth.pending) {
          report(started ? 'idle' : 'unavailable');
        } else if (performance.now() >= deadline) stop();
        else watchdog = setTimeout(checkPlayback, 1200);
      }
      report('playing');
      // System speech can end without notifying the page, leaving the game mix ducked.
      watchdog = setTimeout(checkPlayback, 4000);
      synth.speak(line);
    } catch {
      report('unavailable');
    }
  }

  return { speak, stop };
}
