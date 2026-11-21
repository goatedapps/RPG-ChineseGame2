# Greenhouse sound effects

The `sfx/` MP3 files are original sound effects rendered for this project, with no third-party samples.
They combine shaped and filtered noise, short resonant tones, and offset left and right room reflections.
The stereo rain bed layers diffuse wind, wet glass, and scattered droplets.
Footstep files alternate four heel and toe textures.
Paper uses staggered crackle and flutter layers.
The phone notification is an original three-note synthesized chime, with soft harmonics and short stereo reflections.
The game uses it for new phone messages and hint notifications. Moonbridge preloads a separate `moonbridge-radio-alert.mp3` with a short burst of synthesized squelch and a two-tone call signal.
The mix was rendered at 44.1 kHz and encoded with LAME as stereo MP3 at 96 kbps and 32 kHz for effects, and 112 kbps and 44.1 kHz for rain.

The game starts the audio graph after a player gesture, lowers the rain and effects during Mandarin speech, and stops background audio on blur or when the tab is hidden.
The title prepares the button sound, the prelude prepares its own cues and warms the initial room sounds, and entering the room prepares the remaining effects.
The rain repeats an eight-second region within the MP3 to avoid codec padding.

## Opening and gameplay music

The `music/` tracks are an original synthesis of felt keys, soft pads, mallets, and low percussion.
The title introduces the melody, the comic adds quicker pulses, and the greenhouse uses a quieter arrangement with more space for instructions.
The music tracks loop over 19.2, 9.6, and 24 seconds, respectively.
They are rendered at 44.1 kHz and encoded as stereo MP3 at 24 kHz and 64 kbps, totaling approximately 430 KB.
The interface cues `ui-click`, `comic-snap`, and `storm-hit` use the same stereo effects format as the existing cues.
Render the editable score and cues with `python greenhouse/audio/render_music.py` in an environment with NumPy, SciPy, and lameenc.
Music playback starts after a player gesture and can be switched separately from effects.
The score loads per scene, fades between scenes, and lowers while Mandarin speech plays.

## Speech and phone messages

The browser uses a Mandarin voice for task cues, questions, vocabulary playback, and dictation.
A Ning’s English messages appear as text in the phone chat.
