const MASTER_LEVEL = 0.58;
const MAX_VOICES = 12;
const RAIN_LEVEL = 0.13;
const DUCKED_RAIN_LEVEL = 0.025;

const COOLDOWNS = {
  jump: 0.085,
  land: 0.13,
  dew: 0.07,
  correct: 0.09,
  wrong: 0.13,
  relay: 0.36,
  fall: 0.25,
  finish: 0.65,
};

function createRainBuffer(context) {
  const length = Math.floor(context.sampleRate * 3.5);
  const fade = Math.floor(context.sampleRate * 0.08);
  const raw = new Float32Array(length + fade);
  let seed = 0x7fa82b32;
  let rain = 0;
  let wind = 0;
  for (let i = 0; i < raw.length; i += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const white = ((seed >>> 0) / 0x100000000) * 2 - 1;
    rain = rain * 0.63 + white * 0.37;
    wind = wind * 0.997 + white * 0.027;
    const swell = 0.88 + 0.12 * Math.sin(2 * Math.PI * i / length);
    raw[i] = (rain * 0.65 + wind * 0.35) * swell;
  }

  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  samples.set(raw.subarray(0, length));
  // The extra tail crosses into the first samples to keep the rain loop seamless.
  for (let i = 0; i < fade; i += 1) {
    const weight = i / fade;
    samples[i] = raw[i] * weight + raw[length + i] * (1 - weight);
  }
  return buffer;
}

export function createAudio() {
  let context;
  let master;
  let effects;
  let rainGain;
  let rainFilter;
  let rainBuffer;
  let rainSource;
  let rainStopTimer;
  let focused = true;
  let enabled = false;
  let ambience = false;
  let ducked = false;
  const voices = new Set();
  const lastCue = new Map();

  function audible() {
    return enabled && focused && !globalThis.document?.hidden;
  }

  function target(param, value, timeConstant = 0.032) {
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value, context.currentTime, timeConstant);
  }

  function startRain() {
    clearTimeout(rainStopTimer);
    if (rainSource) return;

    rainBuffer ??= createRainBuffer(context);
    const source = context.createBufferSource();
    source.buffer = rainBuffer;
    source.loop = true;
    source.connect(rainFilter);
    source.onended = () => source.disconnect();
    source.start();
    rainSource = source;
  }

  function stopRain() {
    clearTimeout(rainStopTimer);
    if (!rainSource) return;

    rainStopTimer = setTimeout(() => {
      rainSource.stop();
      rainSource = null;
    }, 190);
  }

  function suppressVoices() {
    for (const { source, envelope } of voices) {
      target(envelope.gain, 0, 0.009);
      source.stop(context.currentTime + 0.045);
    }
  }

  function refreshMix() {
    if (!context) return;

    const playing = audible();
    target(master.gain, playing ? MASTER_LEVEL : 0);
    target(effects.gain, ducked ? 0.45 : 1);
    if (playing && ambience) {
      startRain();
      target(rainGain.gain, ducked ? DUCKED_RAIN_LEVEL : RAIN_LEVEL);
    } else {
      target(rainGain.gain, 0);
      stopRain();
    }
    if (!playing) suppressVoices();
  }

  function init() {
    const Audio = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Audio) return false;

    context = new Audio();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    effects = context.createGain();
    effects.connect(master);

    rainGain = context.createGain();
    rainGain.gain.value = 0;
    rainGain.connect(master);
    rainFilter = context.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.value = 2050;
    rainFilter.connect(rainGain);

    globalThis.document?.addEventListener('visibilitychange', refreshMix);
    globalThis.addEventListener?.('blur', () => {
      focused = false;
      refreshMix();
    });
    globalThis.addEventListener?.('focus', () => {
      focused = true;
      refreshMix();
    });
    return true;
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled && !context) {
      try {
        if (!init()) enabled = false;
      } catch {
        enabled = false;
        context = null;
      }
    }
    if (enabled && context.state !== 'running') context.resume().catch(() => {});
    refreshMix();
    return enabled;
  }

  function playVoice(source, channel, start, duration, gain, attack = 0.014) {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    channel.connect(envelope);
    envelope.connect(effects);
    const voice = { source, envelope };
    voices.add(voice);
    source.onended = () => {
      source.disconnect();
      if (channel !== source) channel.disconnect();
      envelope.disconnect();
      voices.delete(voice);
    };
    source.start(start);
    source.stop(start + duration + 0.007);
  }

  function tone(start, duration, from, to, gain, wave = 'sine') {
    if (voices.size >= MAX_VOICES) return;
    const oscillator = context.createOscillator();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
    playVoice(oscillator, oscillator, start, duration, gain);
  }

  function notes(start, pitches, spacing, duration, gain) {
    pitches.forEach((pitch, i) => tone(start + i * spacing, duration, pitch, pitch, gain));
  }

  function splash(start, duration, frequency, gain) {
    if (voices.size >= MAX_VOICES) return;
    rainBuffer ??= createRainBuffer(context);
    const noise = context.createBufferSource();
    noise.buffer = rainBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    noise.connect(filter);
    playVoice(noise, filter, start, duration, gain, 0.008);
  }

  const cues = {
    jump: (time) => tone(time, 0.14, 235, 450, 0.069, 'triangle'),
    land: (time) => splash(time, 0.14, 635, 0.075),
    dew: (time) => notes(time, [784, 1174.66], 0.034, 0.14, 0.059),
    correct: (time) => notes(time, [523.25, 659.25, 783.99], 0.06, 0.21, 0.084),
    wrong: (time) => tone(time, 0.19, 321, 235, 0.062, 'triangle'),
    relay: (time) => {
      notes(time, [329.63, 440, 523.25, 659.25], 0.065, 0.31, 0.091);
      tone(time, 0.36, 164.81, 164.81, 0.074);
    },
    fall: (time) => {
      tone(time, 0.34, 295, 112, 0.077, 'triangle');
      splash(time, 0.33, 420, 0.077);
    },
    finish: (time) => {
      notes(time, [392, 523.25, 659.25, 783.99, 1046.5], 0.09, 0.42, 0.083);
      tone(time + 0.36, 0.55, 261.63, 261.63, 0.093);
    },
  };

  return {
    setEnabled,
    cue(name) {
      if (!Object.hasOwn(cues, name) || !audible() || context?.state !== 'running') return;
      const now = context.currentTime;
      if (now - (lastCue.get(name) ?? -Infinity) < COOLDOWNS[name]) return;
      lastCue.set(name, now);
      cues[name](now + 0.006);
    },
    setAmbience(active) {
      if (ambience === active) return;
      ambience = active;
      refreshMix();
    },
    setDucked(value) {
      if (ducked === value) return;
      ducked = value;
      refreshMix();
    },
  };
}
