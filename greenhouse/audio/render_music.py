"""Render the original score and interface cues; requires Python, NumPy, SciPy, and lameenc."""

from pathlib import Path

import lameenc
import numpy as np
from scipy.signal import butter, sosfilt

RATE = 44100
MARGIN = .12
ART = Path(__file__).parent
RNG = np.random.default_rng(39127)


def time(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def add(mix, signal, start, volume, pan=0):
    beginning = round(start * RATE) % len(mix)
    panning = np.sqrt([(1 - pan) / 2, (1 + pan) / 2])
    stereo = signal[:, None] * volume * panning
    fitting = min(len(stereo), len(mix) - beginning)
    mix[beginning:beginning + fitting] += stereo[:fitting]
    if fitting < len(stereo):
        mix[:len(stereo) - fitting] += stereo[fitting:]


def band(t, low, high):
    return sosfilt(butter(2, [low, high], btype='bandpass', fs=RATE, output='sos'), RNG.standard_normal(len(t)))


def voice(instrument, midi, duration):
    t = time(duration)
    phase = 2 * np.pi * frequency(midi) * t
    if instrument == 'keys':
        body = (
            .78 * np.sin(phase) + .21 * np.sin(phase * 2.002 + .5) * np.exp(-t / .36)
            + .11 * np.sin(phase * 3.013) * np.exp(-t / .19)
            + .058 * np.sin(phase * 4.038) * np.exp(-t / .13)
        )
        signal = body * (1 - np.exp(-t / .012)) * np.exp(-t / .52)
        signal += .055 * band(t, 540, 3200) * (1 - np.exp(-t / .004)) * np.exp(-t / .019)
    elif instrument == 'mallet':
        body = np.sin(phase) + .25 * np.sin(phase * 3.97) * np.exp(-t / .07)
        signal = body * (1 - np.exp(-t / .005)) * np.exp(-t / .20)
    elif instrument == 'bass':
        body = .92 * np.sin(phase) + .24 * np.sin(phase * 2.002) + .09 * np.sin(phase * 3.018)
        signal = body * (1 - np.exp(-t / .025)) * np.exp(-t / .55)
    else:
        vibrato = .045 * np.sin(2 * np.pi * 4.6 * t)
        body = .46 * (np.sin(phase + vibrato) + np.sin(phase * 1.0023 - vibrato - .8))
        body += .21 * np.sin(2 * phase + .7) + .070 * np.sin(3 * phase * .999)
        signal = body * (1 - np.exp(-t / .39)) * (.92 + .08 * np.sin(t * 2.2 + midi))
    return signal * np.minimum((duration - t) / (.44 if instrument == 'pad' else .045), 1)


def note(mix, instrument, midi, start, duration, volume, pan=0):
    add(mix, voice(instrument, midi, duration), start, volume, pan)


def low_pulse(mix, start, gain):
    t = time(.29)
    body = np.sin(2 * np.pi * (43 * t + 1.95 * (1 - np.exp(-t / .03))))
    add(mix, body * (1 - np.exp(-t / .007)) * np.exp(-t / .078), start, gain)
    add(mix, band(t, 105, 940) * (1 - np.exp(-t / .01)) * np.exp(-t / .047), start, gain * .19, -.12)


def room(mix):
    dry = mix.copy()
    for delay, gain in ((.03, .14), (.057, .12), (.082, .085), (.127, .061), (.178, .038), (.229, .024)):
        reflection = sosfilt(butter(1, 3400 if delay < .07 else 1900, fs=RATE, output='sos'), dry[:, ::-1], axis=0)
        mix += gain * np.roll(reflection, round(delay * RATE), axis=0)
    return mix


def encode(path, mix, peak, kbps, loop=False):
    mix *= peak / np.max(np.abs(mix))
    if loop:
        padding = round(MARGIN * RATE)
        mix = np.concatenate((mix[-padding:], mix, mix[:padding]))
    else:
        n = round(.005 * RATE)
        mix[-n:] *= np.linspace(1, 0, n)[:, None]
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(kbps)
    encoder.set_in_sample_rate(RATE)
    encoder.set_channels(2)
    encoder.set_quality(2)
    path.parent.mkdir(exist_ok=True)
    audio = encoder.encode(np.rint(mix * 32767).astype('<i2').tobytes()) + encoder.flush()
    path.write_bytes(audio)
    print(f'{path.name}: {len(mix) / RATE:.2f}s, {len(audio):,} bytes')


def music():
    harmony = (
        (38, (50, 57, 60, 64)), (34, (53, 57, 58, 62)),
        (41, (53, 57, 60, 67)), (33, (52, 57, 62, 64)),
        (38, (50, 57, 60, 65)), (34, (53, 57, 60, 62)),
        (43, (55, 58, 62, 69)), (33, (52, 57, 62, 67)),
    )
    melody = (
        ((.5, 74), (1.5, 77), (2.25, 76), (3.25, 69)),
        ((1, 72), (2.5, 69)), ((.5, 72), (1.75, 76), (3, 79)),
        ((1, 76), (2.75, 72)), ((.5, 74), (1.25, 77), (2.75, 81)),
        ((.25, 79), (1, 77), (2.5, 74)), ((.75, 74), (2.25, 70), (3, 69)),
        ((.5, 72), (1.5, 69), (3, 76)),
    )
    for name, beat, bars in [('title', .6, 8), ('comic', .6, 4), ('game', .75, 8)]:
        mix = np.zeros((round(4 * beat * bars * RATE), 2))
        for bar, (bass, chord) in enumerate(harmony[:bars]):
            beginning = bar * 4 * beat
            for i, midi in enumerate(chord):
                pan = [-.48, .40, -.22, .32][i]
                note(mix, 'pad', midi, beginning + i * .055, (5.1 if name == 'game' else 4.45) * beat, .052, pan)
            note(mix, 'bass', bass, beginning, 1.65 * beat, .16 if name == 'comic' else .078)
            if name == 'game':
                for phase, midi in [(1.25, chord[2] + 12), (3.50, chord[(bar + 1) % 4] + 12)]:
                    note(mix, 'keys', midi, beginning + phase * beat, 1.2, .08, -.23 if phase < 2 else .29)
            else:
                for i, (phase, midi) in enumerate(melody[bar]):
                    note(mix, 'keys', midi, beginning + phase * beat, 1.65, .16, .20 if i % 2 else -.23)
                arpeggio = (1, 2, 0, 3, 2, 1, 3, 2)
                hits = range(8) if name == 'comic' else range(0, 8, 2)
                for i in hits:
                    start = beginning + (.5 * i + .035) * beat
                    note(mix, 'mallet', chord[arpeggio[i]], start, .61, .12 if name == 'comic' else .065, -.32 if i % 3 else .25)
                for phase in ([0, 1.5, 2.75, 3.5] if name == 'comic' else [0, 2.5]):
                    low_pulse(mix, beginning + phase * beat, (.20 if name == 'comic' else .075) * (1 if phase == 0 else .68))
        encode(ART / 'music' / f'{name}.mp3', room(mix), .64, 64, loop=True)


def effects():
    click = np.zeros((round(.14 * RATE), 2))
    t = time(.089)
    shape = (1 - np.exp(-t / .0015)) * np.exp(-t / .015)
    add(click, shape * (.62 * band(t, 720, 4300) + np.sin(2 * np.pi * (685 * t + 1.2 * (1 - np.exp(-t * 45))))), 0, .6, -.09)
    add(click, .45 * shape * band(t, 540, 2450), .012, .45, .23)
    encode(ART / 'sfx' / 'ui-click.mp3', click, .55, 96)

    swipe = np.zeros((round(.34 * RATE), 2))
    t = time(.27)
    env = (1 - np.exp(-t / .018)) * np.exp(-t / .064)
    add(swipe, env * band(t, 560, 5670), .013, .32, -.55)
    add(swipe, env * band(t, 300, 4190), .058, .57, .61)
    low_pulse(swipe, .077, .36)
    encode(ART / 'sfx' / 'comic-snap.mp3', swipe, .58, 96)

    storm = np.zeros((round(.87 * RATE), 2))
    t = time(.7)
    for delay, pan in [(0.00, -.5), (.08, .48), (.16, .07)]:
        body = band(t, 40, 178) + .28 * band(t, 178, 820)
        env = (1 - np.exp(-t / .016)) * np.exp(-t / .175)
        add(storm, body * env, delay, .23, pan)
    low_pulse(storm, .012, .39)
    encode(ART / 'sfx' / 'storm-hit.mp3', storm, .62, 96)


if __name__ == '__main__':
    music()
    effects()
