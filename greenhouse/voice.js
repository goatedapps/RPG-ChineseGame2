const mandarin = /^(?:cmn(?:[-_]|$)|zh$|zh[-_](?:CN|SG|TW|Hans)(?:[-_]|$))/i;

export function createVoice(onChange) {
  const synth = window.speechSynthesis;
  let revision = 0;

  function stop() {
    revision += 1;
    synth?.cancel();
    onChange('idle');
  }

  function speak(text, rate = .87, onState = () => {}) {
    stop();
    const id = revision;
    const report = (status) => {
      if (id !== revision) return;
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
      line.onend = () => report('idle');
      line.onerror = (event) => report(['canceled', 'interrupted'].includes(event.error) ? 'idle' : 'unavailable');
      report('playing');
      synth.speak(line);
    } catch {
      report('unavailable');
    }
  }

  return { speak, stop };
}
