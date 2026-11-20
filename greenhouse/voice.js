import { radioLines } from './radio-lines.js';

const mandarin = /^(?:cmn(?:[-_]|$)|zh$|zh[-_](?:CN|SG|TW|Hans)(?:[-_]|$))/i;
const recordings = new Map(radioLines.map(([id, text]) => [
  text, new URL('./audio/voice/' + id + '.mp3', import.meta.url).href,
]));

export function createVoice(onChange) {
  const synth = window.speechSynthesis;
  const clip = new Audio();
  clip.preload = 'none';
  let revision = 0;

  function stop() {
    revision += 1;
    synth?.cancel();
    clip.onended = null;
    clip.onerror = null;
    clip.pause();
    onChange('idle');
  }

  function synthesize(text, rate, report, id) {
    if (!synth || !window.SpeechSynthesisUtterance) {
      report('unavailable');
      return;
    }
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
    line.onstart = () => { if (id === revision) report('playing'); };
    line.onend = () => { if (id === revision) report('idle'); };
    line.onerror = (event) => {
      if (id === revision && !['canceled', 'interrupted'].includes(event.error)) report('unavailable');
    };
    report('playing');
    try {
      synth.speak(line);
    } catch {
      report('unavailable');
    }
  }

  function speak(text, rate = .87, onState = () => {}) {
    stop();
    const id = revision;
    const report = (status) => {
      onChange(status);
      onState(status);
    };
    const recording = recordings.get(text);
    if (!recording) {
      synthesize(text, rate, report, id);
      return;
    }
    let fallbackStarted = false;
    const fallback = () => {
      if (revision !== id || fallbackStarted) return;
      fallbackStarted = true;
      clip.onended = null;
      clip.onerror = null;
      clip.pause();
      synthesize(text, rate, report, id);
    };
    if (clip.src !== recording) clip.src = recording;
    else if (clip.readyState) clip.currentTime = 0;
    clip.onended = () => { if (revision === id) report('idle'); };
    clip.onerror = fallback;
    report('playing');
    try {
      clip.play().catch(fallback);
    } catch {
      fallback();
    }
  }

  return { speak, stop };
}
