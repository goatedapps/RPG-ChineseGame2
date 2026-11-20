const clips = {
  step: { files: ['step-1', 'step-2', 'step-3', 'step-4'], volume: .42, cooldown: .28 },
  pickup: { files: ['pickup'], volume: .38, cooldown: .12 },
  paper: { files: ['paper-open'], volume: .55, cooldown: .22 },
  radio: { files: ['radio-click'], volume: .34, cooldown: .26 },
  seal: { files: ['seal-press'], volume: .50, cooldown: .22 },
  correct: { files: ['correct'], volume: .31, cooldown: .14 },
  wrong: { files: ['try-again'], volume: .24, cooldown: .23 },
  relay: { files: ['continue'], volume: .35, cooldown: .38 },
  finish: { files: ['exhibit-ready'], volume: .46, cooldown: .85 },
  ui: { files: ['ui-click'], volume: .29, cooldown: .075 },
  page: { files: ['comic-snap'], volume: .37, cooldown: .15 },
  storm: { files: ['storm-hit'], volume: .42, cooldown: .55 },
};

const tracks = {
  title: { duration: 19.2, volume: .38 },
  comic: { duration: 9.6, volume: .44 },
  game: { duration: 24, volume: .24 },
};

const rainFile = 'rain-window';
const musicLoopStart = .145;
const soundFiles = new Set([rainFile, ...Object.values(clips).flatMap(({ files }) => files)]);
const maxEffects = 7;

function fileURL(category, name) {
  return new URL(`./audio/${category}/${name}.mp3`, import.meta.url);
}

export function createGreenhouseAudio() {
  let context;
  let master;
  let effects;
  let room;
  let music;
  let rain;
  let musicVoice;
  let musicScene = null;
  let rainStopTimer;
  let enabling;
  let enabled = false;
  let musicEnabled = true;
  let ambience = false;
  let ducked = false;
  let focused = true;
  let stepIndex = 0;
  const buffers = new Map();
  const pendingMusic = new Map();
  const musicBuffers = new Map();
  const voices = new Map();
  const lastCue = new Map();

  function audible() {
    return focused && !document.hidden && context?.state === 'running';
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

  function refreshMusic(active) {
    const next = active && musicEnabled ? musicScene : null;
    const buffer = musicBuffers.get(next);
    if (musicVoice?.name === next || (next && !buffer)) return;

    if (musicVoice) {
      ramp(musicVoice.gain.gain, 0, .15);
      musicVoice.source.stop(context.currentTime + .70);
      musicVoice = undefined;
    }
    if (!next) return;

    const { duration, volume } = tracks[next];
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    // The encoded clip includes margins so the musical repeat stays away from MP3 priming and padding.
    source.loopStart = musicLoopStart;
    source.loopEnd = musicLoopStart + duration;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(music);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(0, source.loopStart);
    ramp(gain.gain, volume, .16);
    musicVoice = { name: next, source, gain };
  }

  function refreshMix() {
    if (!context) return;
    const active = audible();
    const effectActive = active && enabled;
    ramp(master.gain, active ? .69 : 0);
    ramp(effects.gain, ducked ? .46 : 1, ducked ? .02 : .09);
    ramp(music.gain, ducked ? .28 : 1, ducked ? .04 : .21);
    refreshMusic(active);
    if (effectActive && ambience) {
      startRain();
      ramp(room.gain, ducked ? .14 : .37, ducked ? .028 : .10);
    } else {
      ramp(room.gain, 0);
      stopRain();
    }
    if (!effectActive) {
      for (const [source, voice] of voices) stopVoice(source, voice);
    }
  }

  async function load(name) {
    try {
      const response = await fetch(fileURL('sfx', name));
      if (!response.ok) return;
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      buffers.set(name, buffer);
      if (name === rainFile) refreshMix();
    } catch {
      // Effects are optional when media fails to load or decode.
    }
  }

  function prepareMusic(name) {
    if (!name || musicBuffers.has(name)) return;
    let entry = pendingMusic.get(name);
    if (!entry) {
      const data = fetch(fileURL('music', name)).then((response) => response.ok ? response.arrayBuffer() : null)
        .catch(() => null);
      entry = { data, decoding: false };
      pendingMusic.set(name, entry);
    }
    if (!context || entry.decoding) return;
    entry.decoding = true;
    void entry.data.then(async (data) => {
      if (data) musicBuffers.set(name, await context.decodeAudioData(data));
    }).catch(() => {}).finally(() => {
      pendingMusic.delete(name);
      refreshMix();
    });
  }

  function unlock() {
    if ((!enabled && !musicEnabled) || !context || context.state === 'running' || enabling) return;
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
    music = context.createGain();
    master.gain.value = 0;
    room.gain.value = 0;
    master.connect(context.destination);
    effects.connect(master);
    room.connect(master);
    music.connect(master);
    document.addEventListener('visibilitychange', refreshMix);
    window.addEventListener('blur', () => {
      focused = false;
      refreshMix();
    });
    window.addEventListener('focus', () => {
      focused = true;
      refreshMix();
    });
    window.addEventListener('pointerup', unlock);
    window.addEventListener('keydown', unlock);
    context.addEventListener('statechange', refreshMix);
    for (const file of soundFiles) void load(file);
    if (musicEnabled) prepareMusic(musicScene);
    return true;
  }

  function start() {
    if (!enabled && !(musicEnabled && musicScene)) return false;
    if (!context) {
      try {
        if (!initialize()) return false;
      } catch {
        return false;
      }
    }
    unlock();
    refreshMix();
    return true;
  }

  function cue(request) {
    const name = request === 'dew' ? 'pickup' : request;
    const clip = Object.hasOwn(clips, name) ? clips[name] : undefined;
    if (!clip || !enabled || !audible()) return;
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
    start,
    setEnabled(value) {
      enabled = Boolean(value);
      refreshMix();
    },
    setMusicEnabled(value) {
      musicEnabled = Boolean(value);
      if (musicEnabled) prepareMusic(musicScene);
      refreshMix();
    },
    setMusic(name) {
      const next = Object.hasOwn(tracks, name) ? name : null;
      if (musicScene === next) return;
      musicScene = next;
      if (musicEnabled) {
        prepareMusic(next);
        if (next === 'title') prepareMusic('comic');
      }
      refreshMix();
    },
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
