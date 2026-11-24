export function createHelperPlayback({ clipURL, getPlayed, save, setDucked }) {
  let playback;
  let speaking = false;

  function updateMix() {
    setDucked(speaking || Boolean(playback?.playing));
  }

  function stop() {
    if (!playback) return;
    const { clip } = playback;
    playback = undefined;
    clip.pause();
    updateMix();
  }

  function play(id) {
    if (id && playback?.id === id) return;
    stop();
    if (!id || getPlayed().includes(id) || document.hidden) return;
    const clip = new Audio(clipURL(id));
    const take = { id, clip, playing: false };
    playback = take;
    clip.addEventListener('playing', () => {
      if (playback !== take) return;
      take.playing = true;
      getPlayed().push(id);
      save();
      updateMix();
    }, { once: true });
    const finish = () => { if (playback === take) stop(); };
    clip.addEventListener('ended', finish, { once: true });
    clip.addEventListener('error', finish, { once: true });
    void clip.play().catch(finish);
  }

  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  return {
    play, stop,
    setSpeaking(active) {
      speaking = active;
      updateMix();
    },
  };
}
