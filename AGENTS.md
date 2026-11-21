# AGENTS.md

## Lesson structure

- Use the P6 Lesson 1 greenhouse game as the reference for gameplay, teaching, and polish.
- Give each lesson its own HTML entry point and reuse shared gameplay and learning systems where practical.
- A future menu will link the lessons and let players choose any supported level (P2, P3, P5, or P6), then progress through that level in order from Lesson 1.
- Give each lesson a coherent storyline with one overarching mission and a series of related objectives.
- Give each title screen a distinct illustrated identity that fits the story.
- Start each storyline with a short, picture-led prelude that establishes the situation before play begins.
- Give comic art expressive characters, clear action, and exaggerated staging where it suits the story.
- Put dialogue inside comic panels and reveal story beats one at a time with GSAP when the player clicks or taps the scene.
- Use the title, prelude, and first playable moments to establish what is at stake and why the mission needs attention.
- Conclude the storyline with a picture-led epilogue showing what the player's actions achieved.
- Introduce walking, looking around, and opening the in-game phone in a short hands-on tutorial.

## Gameplay and presentation

- Build an immersive, animated first-person 3D space that is compact enough to explore and gives players room to walk around, look freely, examine objects, and pick up or use items.
- Prioritize tablet touch controls and desktop keyboard and mouse controls.
- Make vocabulary drive the actions in the room.
- Let players discover descriptions through what they see, and teach verbs, expressions, and abstract words through actions, consequences, dialogue, or evidence.
- Connect discoveries to comprehension questions and dictation before advancing to the next clue or story checkpoint.
- Give players a reason to keep exploring through visible progress, discoveries, and satisfying feedback when their actions change the scene.
- Keep the interactive phone docked in the bottom-right corner during exploration.
- Notify players of new messages with a ringtone and vibration, then let them open the handset to read the messages.
- Put Ah Ning's casual English messages in the phone chat and keep the on-screen Chinese task cues separate.
- Explain the situation before directing the player, and let exploration reveal discoveries such as the note by the leaking window.
- Offer a contextual hint through the phone after a delay, then give players the option to reveal a gold spiral at the exact target.
- Use the `imagegen`, `game-feel`, and GSAP skills where they help the lesson.
- Use generated artwork throughout the lab, including plants, desks, boards, shelving, and cupboards, and reuse matching assets across repeated objects.
- Show an item close-up directly over the room, with only the item and the words a player needs.
- Open books to the relevant page, use legible handwritten Chinese for personal notes, and let players click or tap outside the item to dismiss it.
- Keep generic titles, outer cards, and redundant controls out of object close-ups.
- Include any picture or diagram that a question refers to.
- Integrate selected learning checks into the story, such as replying to a clue in chat and answering a question to unlock a monitor.

## Curriculum and language

- Treat the lesson's Tingxie wordlist in `content/<level>/tingxie/` as the required curriculum.
- Give students a chance to read, understand, and write every entry.
- Use the supplied stories as optional reference material.
- Offer practice from the supplied question bank.
- Use lesson-tagged questions in their matching lesson, and allow untagged questions in any lesson of the same primary level.
- Write primarily in Chinese for second-language learners and read all key task instructions aloud in Mandarin.
- Keep prompts short, omit instructions that are clear from the interaction, and break longer passages into chunks that appear as needed.
- Use a short text reveal or scroll animation when it helps players follow longer instructions.
- Make English help available on demand through a quiet EN control and use a loudspeaker icon for replaying speech.
- Let the vocabulary notebook fill up as the player progresses, and give every word its meaning, Hanyu Pinyin, and a pronunciation control.
- Use the browser's Speech Synthesis API for Mandarin dictation and Hanzi Writer for stroke-by-stroke practice.
- Give players one large active handwriting box for both touch and mouse input, with progress shown separately for multi-character words.
- Keep the active box at least 248 CSS pixels per side at typical desktop and tablet sizes, a 50% increase over the original 165-pixel maximum.
- During dictation, highlight the next stroke after five unsuccessful attempts at that stroke.
- Show the sentence while it is read aloud, with the target word blanked out.
- Offer normal-speed replay as the only dictation playback option.
- Deliver Ah Ning's chat as text and use Mandarin speech for the task cues and Chinese practice.
- Use stereo MP3s for sound effects.
- Use background music on the title screen, during the prelude, and in gameplay, with separate music and sound-effect controls.
- Keep footsteps and button feedback audible in the mix, and lower the music during speech.

## Asset delivery

- Export illustration and texture WebPs at sizes and quality suited to their on-screen use, with smaller variants where the layout benefits.
- Reuse decoded texture sources for repeated objects while preserving per-material mapping, and keep the live Chinese clue text and handwriting legible.
- Load the cover and its immediate controls first, prepare the 3D room when the player chooses to enter, and fetch practice assets at the first exercise that needs them.
- Fetch audio as the scene needs it, and preserve clean loops, stereo effects, and intelligible Mandarin.
- Subset fonts and Hanzi stroke data to the lesson where practical, retain attribution, and verify assets on tablet and desktop views.

## Current reference implementation

- The public GitHub Pages site serves the P6 Lesson 1 greenhouse game from `index.html`.
- The earlier Stormroot platformer remains available at `stormroot.html`.
- P6 Lesson 1 covers all 24 entries in `content/p6/tingxie/1.yaml`.
- The story and dictation order live in `greenhouse/story.js`, the notebook and bilingual practice data in `greenhouse/lexicon.js`, and the close-ups in `greenhouse/evidence.js`.
- Keep generated art under `greenhouse/art/`, shared lab textures under `greenhouse/art/lab/`, and interaction geometry aligned with the visible objects.
- Phone dialogue, login questions, and hints live in `greenhouse/phone-story.js`.
- Keep Hanzi stroke data and its attribution together under `stage/vendor/`.
- Preview over HTTP with `python -m http.server 8000` and keep asset and module URLs relative to work under the GitHub Pages repository path.
