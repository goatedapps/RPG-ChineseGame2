# AGENTS.md

Use this guide for requirements shared across lessons.
Update it whenever shared gameplay, requirements, or project conventions change in a significant way.
Keep it to 200 lines or fewer and link to separate references for lesson-specific details.

## Lesson structure

- The planned menu lets students choose P2, P3, P5, or P6 and progress in order from Lesson 1 within each level.
- Give each lesson its own HTML entry point and reuse shared gameplay and learning systems where practical.
- Use the [P6 Lesson 1 greenhouse](greenhouse/LESSON.md) as the baseline for gameplay, teaching, and polish.
- Give each lesson a coherent storyline with one overarching mission and an illustrated title that fits its setting.
- Open with a short, picture-led comic that establishes the stakes through clear, expressive action, and close with an illustrated epilogue that shows what the player achieved.
- Put dialogue inside the comic panels and use GSAP to reveal one story beat at a time as the player taps or clicks the scene.
- Begin with a hands-on tutorial for walking, looking around, and interacting with the lesson's objects and story guidance.

## Exploration and story guidance

- Build a compact, animated first-person 3D space where the player can walk, look around, examine objects, and pick up or use items.
- Prioritize tablet touch controls and desktop keyboard and mouse controls.
- Make the vocabulary useful for finding objects, taking actions, and interpreting clues.
- Weave comprehension checks and handwriting into the mission, such as responding to a character or unlocking a computer.
- Help the player understand the situation and next action in natural English through a channel that fits the story, such as a companion, computer, notepad, or phone.
- Explain why the current task matters, let exploration reveal clues, and wait for the player to finish the current action before introducing the next one.
- When the player gets stuck, offer a contextual hint first and an optional visual cue at the exact target as a second step.
- Show item close-ups directly, with the relevant page, note, or object and only the words the player needs.
- Let players tap or click outside a close-up to dismiss it, and show any image a question refers to.

## Curriculum and language

- Use the lesson's Tingxie wordlist in `content/<level>/tingxie/` as the required curriculum and give students practice reading, understanding, and writing every entry.
- Use the supplied stories as optional references.
- Include practice from the supplied question bank, with lesson-tagged questions used in their matching lesson and untagged questions eligible anywhere in that primary level.
- Use concise Chinese for learning and task cues, read key task cues aloud in Mandarin, and offer English help through an EN control.
- Keep visible and spoken instructions brief, omit directions the interface already makes clear, and reveal longer text in short chunks.
- Fill the vocabulary notebook as entries are discovered, with each word's meaning, Hanyu Pinyin, pronunciation control, and a sentence-bank example below its meaning.
- Use browser Speech Synthesis for Mandarin dictation, show the sentence with the target word blanked out, and offer normal-speed replay through a speaker icon.
- Use Hanzi Writer for Chinese handwriting, with one large active box at a time and separate progress markers for multi-character words.
- Keep the handwriting box at least 248 CSS pixels per side at typical tablet and desktop sizes.
- In dictation, show the next stroke after five unsuccessful attempts at that stroke.

## Completion and replay

- Start the final test when the player dismisses the closing story beat.
- Build final and practice tests from the lesson's sentence bank, with one Chinese fill-in-the-blank Hanzi Writer question for every vocabulary entry.
- Offer **看字** (Show word) as explicit help and retry each revealed word at the end in a different sentence until the player writes it unaided.
- Keep unaided test attempts free of automatic stroke hints, and save test progress so the player can resume.
- Celebrate a passed final test and return the player to the home screen, where they can take a practice test, replay the mission, and open the completed notebook.
- Preserve lesson completion and practice access when the player replays the mission.

## Developer mode

- Put Developer mode in the top-right game toolbar in place of the old help instructions.
- Require the password `greenhouse` and keep Developer mode locked by default on every page load.
- Reuse the Developer mode panel and connect its controls to each lesson's progression.
- Let developers skip the current task and turn on automatic skipping of mission dictation.
- Advance the scene and story together when skipping, and award handwriting credit only for work the player completes.
- Keep final and practice tests on their regular assessment flow.

## Assets and delivery

- Use ImageGen for scene and comic art where useful, and use game-feel and GSAP techniques where they improve feedback and motion.
- Reuse scene assets, size WebP artwork for its on-screen use, and load the room, handwriting data, and audio when needed.
- Use stereo MP3 sound effects, audible footsteps and interaction feedback, and background music for the title, prelude, and gameplay.
- Provide separate controls for music and effects, and lower the music during speech.
- Keep Hanzi stroke data with its attribution and verify the lesson on tablet and desktop.
- Preview over HTTP with `python -m http.server 8000` and keep asset and module URLs relative for GitHub Pages.
