const mandarin = /^(?:cmn(?:[-_]|$)|zh$|zh[-_](?:CN|SG|TW|Hans)(?:[-_]|$))/i;

export function createVoice(onChange, recordingFor = () => undefined) {
  const synth = window.speechSynthesis;
  let revision = 0;
  let activeListener;
  let watchdog;
  let cancelPlayback;

  function stop() {
    revision += 1;
    clearTimeout(watchdog);
    const previous = activeListener;
    activeListener = undefined;
    const cancel = cancelPlayback;
    cancelPlayback = undefined;
    cancel?.();
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
        cancelPlayback = undefined;
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
      cancelPlayback = () => synth.cancel();
      synth.speak(line);
    } catch {
      report('unavailable');
    }
  }

  function speakClue(text, rate, onState = () => {}) {
    const lines = Array.isArray(text) ? text : [text];
    const recordings = lines.map(recordingFor);
    const fallback = (from = 0) => speak(lines.slice(from).join(''), rate, onState);
    if (!recordings.length || recordings.some((url) => !url)) return fallback();

    stop();
    const id = revision;
    let index = 0;
    let current;
    activeListener = onState;
    cancelPlayback = () => current?.pause();
    onChange('playing');
    onState('playing');

    function next() {
      if (id !== revision) return;
      if (index === recordings.length) {
        stop();
        return;
      }
      let clip;
      const failed = () => {
        if (id === revision && current === clip) fallback(index - 1);
      };
      try {
        clip = new Audio(recordings[index++]);
        current = clip;
        clip.addEventListener('ended', next, { once: true });
        clip.addEventListener('error', failed, { once: true });
        void clip.play().catch(failed);
      } catch {
        fallback(Math.max(0, index - 1));
      }
    }
    next();
  }

  return { speak, speakClue, stop };
}
