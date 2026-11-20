# Greenhouse sound effects

The `sfx/` MP3 files are original sound effects rendered for this project, with no third-party samples.
They combine shaped and filtered noise, short resonant tones, and offset left and right room reflections.
The stereo rain bed layers diffuse wind, wet glass, and scattered droplets.
Footstep files alternate four heel and toe textures.
Paper uses staggered crackle and flutter layers, and the radio cue combines a switch click with band-limited squelch.
The mix was rendered at 44.1 kHz and encoded with LAME as stereo MP3 at 96 kbps for effects and 112 kbps for rain.

The game starts the audio graph after a player gesture, lowers the rain and effects while dialogue plays, and stops background audio on blur or when the tab is hidden.
The rain repeats an eight-second region within the MP3 to avoid codec padding.

## Opening and gameplay music

The `music/` tracks are an original synthesis of felt keys, soft pads, mallets, and low percussion.
The title introduces the melody, the comic adds quicker pulses, and the greenhouse uses a quieter arrangement with more space for instructions.
The music tracks loop over 19.2, 9.6, and 24 seconds, respectively.
They are encoded as stereo MP3 at 44.1 kHz and 64 kbps, totaling approximately 430 KB.
The interface cues `ui-click`, `comic-snap`, and `storm-hit` use the same stereo effects format as the existing cues.
Render the editable score and cues with `python greenhouse/audio/render_music.py` in an environment with NumPy, SciPy, and lameenc.
Music playback starts after a player gesture and can be switched separately from effects.
The score fades between scenes and lowers while Mandarin speech plays.

## Radio dialogue

The `voice/` MP3s were generated locally using [MeloTTS Chinese](https://huggingface.co/myshell-ai/MeloTTS-Chinese), with the [sherpa-onnx conversion](https://k2-fsa.github.io/sherpa/onnx/tts/pretrained_models/vits.html#vits-melo-tts-zh-en-chinese-english-1-speaker).
The model is released under the MIT license.
The 26 clips use an original script, a lightly band-limited radio mix, and stereo MP3 encoding with LAME.
`greenhouse/radio-lines.js` supplies the source text and file basenames.
Regenerate any affected clip when changing its dialogue or reordering mission actions.
Only the finished clips ship with the game.
The browser supplies voices for other prompts and dictation.
