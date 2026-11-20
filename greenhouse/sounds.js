const clips = {
  step: { files: ['step-1', 'step-2', 'step-3', 'step-4'], volume: .23, cooldown: .28 },
  pickup: { files: ['pickup'], volume: .38, cooldown: .12 },
  paper: { files: ['paper-open'], volume: .55, cooldown: .22 },
  radio: { files: ['radio-click'], volume: .34, cooldown: .26 },
  seal: { files: ['seal-press'], volume: .50, cooldown: .22 },
  correct: { files: ['correct'], volume: .31, cooldown: .14 },
  wrong: { files: ['try-again'], volume: .24, cooldown: .23 },
  relay: { files: ['continue'], volume: .35, cooldown: .38 },
  finish: { files: ['exhibit-ready'], volume: .46, cooldown: .85 },
};

const rainFile = 'rain-window';
const soundFiles = new Set([rainFile, ...Object.values(clips).flatMap(({ files }) => files)]);
const maxEffects = 7;

function fileURL(name) {
  return new URL(`./audio/sfx/${name}.mp3`, import.meta.url);
}

export function createGreenhouseAudio() {
  let context;
  let master;
  let effects;
  let room;
  let rain;
  let rainStopTimer;
  let enabling;
  let enabled = false;
  let ambience = false;
  let ducked = false;
  let focused = true;
  let stepIndex = 0;
  const buffers = new Map();
  const voices = new Map();
  const lastCue = new Map();

  function audible() {
    return enabled && focused && !document.hidden && context?.state === 'running';
  }

  function ramp(param, amount, time = .035) {
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(amount, context.currentTime, time);
  }

  function startRain() {
    clearTimeout(rainStopTimer);
    rainStopTimer = undefined;
    const buffer = buffers.get(rainFile);
    if (rain || !buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    // The eight-second repeat sits inside the encoded margins, clear of MP3 priming and padding.
    source.loopStart = .14;
    source.loopEnd = 8.14;
    source.connect(room);
    source.onended = () => source.disconnect();
    source.start(0, source.loopStart);
    rain = source;
  }

  function stopRain() {
    if (!rain || rainStopTimer != null) return;
    rainStopTimer = setTimeout(() => {
      rainStopTimer = undefined;
      rain?.stop();
      rain = undefined;
    }, 180);
  }

  function stopVoice(source, voice) {
    if (voice.stopping) return;
    voice.stopping = true;
    ramp(voice.gain.gain, 0, .012);
    source.stop(context.currentTime + .055);
  }

  function refreshMix() {
    if (!context) return;
    const active = audible();
    ramp(master.gain, active ? .69 : 0);
    ramp(effects.gain, ducked ? .46 : 1, ducked ? .02 : .09);
    if (active && ambience) {
      startRain();
      ramp(room.gain, ducked ? .14 : .37, ducked ? .028 : .10);
    } else {
      ramp(room.gain, 0);
      stopRain();
    }
    if (!active) {
      for (const [source, voice] of voices) stopVoice(source, voice);
    }
  }

  async function load(name) {
    try {
      const response = await fetch(fileURL(name));
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      buffers.set(name, buffer);
      if (name === rainFile) refreshMix();
    } catch {
      // Effects are optional when media fails to load or decode.
    }
  }

  function unlock() {
    if (!enabled || !context || context.state === 'running' || enabling) return;
    enabling = context.resume().catch(() => {}).finally(() => {
      enabling = undefined;
      refreshMix();
    });
  }

  function initialize() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return false;
    context = new Audio();
    master = context.createGain();
    effects = context.createGain();
    room = context.createGain();
    master.gain.value = 0;
    room.gain.value = 0;
    master.connect(context.destination);
    effects.connect(master);
    room.connect(master);
    document.addEventListener('visibilitychange', refreshMix);
    window.addEventListener('blur', () => {
      focused = false;
      refreshMix();
    });
    window.addEventListener('focus', () => {
      focused = true;
      refreshMix();
    });
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    context.addEventListener('statechange', refreshMix);
    for (const file of soundFiles) void load(file);
    return true;
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (enabled && !context) {
      try {
        enabled = initialize();
      } catch {
        enabled = false;
      }
    }
    unlock();
    refreshMix();
    return enabled;
  }

  function cue(request) {
    const name = request === 'dew' ? 'pickup' : request;
    const clip = Object.hasOwn(clips, name) ? clips[name] : undefined;
    if (!clip || !audible()) return;
    const now = context.currentTime;
    if (now - (lastCue.get(name) ?? -Infinity) < clip.cooldown) return;
    const nextFile = name === 'step' ? clip.files[stepIndex % clip.files.length] : clip.files[0];
    const buffer = buffers.get(nextFile) ?? buffers.get(clip.files[0]);
    if (!buffer) return;
    if (voices.size >= maxEffects) {
      if (name === 'step') return;
      const footstep = [...voices].find(([, voice]) => voice.name === 'step');
      if (!footstep) return;
      stopVoice(...footstep);
      voices.delete(footstep[0]);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = clip.volume;
    source.connect(gain);
    gain.connect(effects);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      voices.delete(source);
    };
    voices.set(source, { gain, name });
    lastCue.set(name, now);
    if (name === 'step') stepIndex += 1;
    source.start();
  }

  return {
    setEnabled,
    setAmbience(active) {
      if (ambience === Boolean(active)) return;
      ambience = Boolean(active);
      refreshMix();
    },
    setDucked(value) {
      if (ducked === Boolean(value)) return;
      ducked = Boolean(value);
      refreshMix();
    },
    cue,
  };
}
