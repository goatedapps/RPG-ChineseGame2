# AGENTS.md

Use this guide for requirements shared across lessons.
Update it whenever shared gameplay, requirements, or project conventions change in a significant way.
Keep it to 200 lines or fewer and link to separate references for lesson-specific details.
Use the [lesson-game skill](.agents/skills/lesson-game/SKILL.md) when planning, building, or reviewing a lesson. This file remains the source for project requirements.

## Lesson structure

- The [universe landing page](index.html) lets students choose P2, P3, P5, or P6 and explore one world per lesson with the shared joystick. Drag the star map to look around and move relative to the camera. Label each planet with its lesson number below it. Show a compact lesson name on the planet itself when the player approaches a world they can enter. Enter available worlds by double-clicking or double-tapping the planet. Enter the prelude on a first visit and resume the saved world or unfinished assessment on later visits. Add playable lessons to the [world catalog](universe/catalog.js) and provide a return link to their level’s star map.
- Use [shared progress](shared/lesson-progress.js) to mark a lesson complete only after passing its final test. Unlock worlds in order within each level and keep completed lessons replayable. Display unpublished lessons as under construction once their prerequisites are met.
- Give each lesson its own HTML entry point and reuse shared gameplay and learning systems where practical.
- Use the [P6 Lesson 1 greenhouse](greenhouse/LESSON.md) as the baseline for gameplay, teaching, and polish. See the [P6 gameplay screenshots](references/p6-lesson1/README.md) for the task HUD, story helper, clues, comprehension, dictation, notebook, and final test.
- Give each lesson a coherent storyline with one overarching mission and an illustrated title that fits its setting.
- Open with a short, picture-led comic that establishes the stakes through clear, expressive action, and close with an illustrated epilogue that shows what the player achieved.
- Use the shared [comic player](shared/comic.js) and [layout](shared/comic.css) for every prelude and epilogue. Put Simplified Chinese dialogue inside centred artwork on the dark background, with progress marks at the lower left. Tap or click the scene to advance, or use the keyboard. Keep visible navigation buttons out of the comic, and use the shared GSAP chapter reveal and reduced-motion behaviour.
- Begin with a hands-on tutorial for walking, looking around, and interacting with the lesson's objects and story guidance.

## Exploration and story guidance

- Build a compact, animated first-person 3D space where the player can walk, look around, examine objects, and pick up or use items.
- Give each walkable area world-space floors, walls, openings, and landmarks. Use artwork as textures, in-world objects, or distant scenery so nearby structures have depth and parallax as the player moves.
- Prioritize tablet touch controls and desktop keyboard and mouse controls. Reuse the greenhouse [joystick input](shared/joystick.js) and [joystick appearance](shared/joystick.css) across 3D lessons. Adapt its movement vector to the lesson rather than reimplementing the control.
- Use the P6 Lesson 1 desktop mouse controls for first-person exploration in every lesson. Reuse the [shared scene pointer](shared/scene-pointer.js). Click the 3D scene to capture the mouse, move the mouse freely to look, and left-click while captured or press E to interact with the object under the reticle. Esc, gameplay overlays, and new story-helper messages release the cursor. Click the scene to recapture it. Support WASD and arrow keys for movement and keep drag-to-look for touch devices and browsers that block pointer lock.
- Use the [mobile game HUD reference](references/mobile-game-hud.jpg) across lessons. Put the title and tools at the top, the current task and Mandarin replay button directly below, the touch joystick at lower left, and the story helper at lower right. Show the current item and interaction near the lower centre. Follow the language rules below for all new UI.
- Make the vocabulary useful for finding objects, taking actions, and interpreting clues. Spread story beats and fieldwork across distinct walkable locations with visible landmarks.
- Tie story and vocabulary text to the player’s current action and an identifiable source in the scene, such as a speaker, a book, a note, or an object that prompts a reaction. Keep conversations to short turns.
- Weave comprehension checks and handwriting into the mission, such as responding to a character or unlocking a computer.
- Use a dedicated in-game story helper to explain the situation, the next action, and contextual hints in natural English. Deliver the helper's messages through a channel that fits the story, such as a companion, radio, notepad, or phone. For radios and phones, briefly shake the device when a new message arrives and show an unread indicator until the message is opened.
- Show and acknowledge each new story briefing before revealing its related task on the HUD. Write the helper’s messages as a conversation that reacts to what just happened and explains why the next action matters. At the start of a sequence of linked tasks, tell the player what they are working toward and how it serves the overall mission. Let exploration reveal clues, and wait for the player to finish the current action before introducing the next one.
- When the player gets stuck, offer a contextual hint first. On request, show the shared [golden hint ring](shared/hint-portal.js) at the exact target. The greenhouse ring renderer is the standard for all lessons.
- Show close-ups as full images of the actual objects with ImageGen artwork. Put readable clues and relevant controls on or near the object itself. Use live text over generated paper for handwritten notes and pages. Keep the close-up free of generic dialog cards.
- Keep object close-ups free of visible interface buttons whenever practical. Tap or click outside the object to return to the world, tap the left or right side of a book to turn pages, and tap an item directly to pick it up. Support Escape and arrow keys as keyboard alternatives. Use the device’s own controls for radio actions. Show any image a question refers to.
- Use the physical controls for machines in close-up. Turn a dial to adjust a setting and operate the pictured lever to start a trial. Present trial results as an inspectable object such as a record on paper. Let players tap the record to continue or tap outside to return to the scene. Leave close buttons off these views.

## Curriculum and language

- Use the lesson's Tingxie wordlist in `content/<level>/tingxie/` as the required curriculum and teach every entry through clues and actions in context. Follow P6 Lesson 1’s pattern of object clues, usage checks with feedback, and handwriting. Keep standalone word lists in the notebook. Give every Tingxie entry at least one mission dictation before the separate final assessment.
- Use the supplied stories as optional references.
- Include practice from the supplied question bank, with lesson-tagged questions used in their matching lesson and untagged questions eligible anywhere in that primary level.
- **Across all levels and every lesson, use Chinese for player-facing game content and English for the dedicated story helper.** Use Simplified Chinese for text and Mandarin for spoken content. Use English for the helper’s storyline narration, next-action guidance, contextual hints, and walkie-talkie interface. Developer mode uses English.
- Apply the Chinese language rule to titles, menus, buttons, tutorial prompts, comic dialogue and captions, other character dialogue, object labels, vocabulary definitions, exercises, tests, feedback, and settings. Use Chinese for helper controls outside the walkie-talkie. Use English for every walkie-talkie label, control, and status message. Open the walkie-talkie as an illustrated close-up and have its dialogue appear from the speaker. Keep Mandarin task instructions and audio controls in the task interface.
- Use concise Chinese for learning and task cues. Automatically read each new task instruction aloud in Mandarin when it appears on the HUD, after any helper briefing. Keep a manual replay control. Keep Hanyu Pinyin as pronunciation support in the vocabulary notebook.
- Keep visible and spoken instructions brief, omit directions the interface already makes clear, and reveal longer text in short chunks.
- Use the story helper and task HUD to give the in-world goal before a minigame. Present its play instructions inside the minigame once the player sees the relevant controls.
- Use the [shared vocabulary rows](shared/vocabulary.js) and [layout](shared/vocabulary.css). Show discovery progress and reveal each word with its Chinese meaning, Hanyu Pinyin, pronunciation control, sentence-bank example, and writing review.
- Use browser Speech Synthesis for Mandarin dictation, show the sentence with the target word blanked out, and offer normal-speed playback through one button that starts dictation on the first press and stops it on the next.
- Use Hanzi Writer for Chinese handwriting, with one large active box at a time and separate progress markers for multi-character words.
- Keep the handwriting box at least 248 CSS pixels per side at typical tablet and desktop sizes.
- In dictation, show the next stroke after five unsuccessful attempts at that stroke.

## Completion and replay

- Start the final test when the player dismisses the closing story beat.
- Build final and practice tests from the lesson's sentence bank, with one Chinese fill-in-the-blank Hanzi Writer question for every vocabulary entry.
- Offer **看字** (Show word) as explicit help and retry each revealed word at the end in a different sentence until the player writes it unaided.
- Keep unaided test attempts free of automatic stroke hints, and save test progress so the player can resume. Ask for confirmation before replay discards an unfinished run and starts from the prelude.
- Celebrate a passed final test and let the player return to the star map. Keep replay and practice available from the lesson settings and the notebook on the HUD.
- Preserve lesson completion and practice access when the player replays the mission.

## Developer mode

- Put Settings and Developer mode in the top-right game toolbar. Reuse the greenhouse [settings menu](shared/settings.js), [Developer mode panel](shared/developer-mode.js), and [menu styling](shared/game-menus.css). Use the shared labeled switches for music and effects, and the separate return-home action during gameplay. Connect these controls to the lesson’s existing preferences and save flow.
- Use English for Developer mode. Require the password `greenhouse` when opening Developer mode for the first time in a browser tab.
- Reuse the Developer mode panel and connect its controls to each lesson's progression.
- Let developers jump to a numbered task using the same numbers as the lesson HUD. Let them skip mission dictation and the final test with one switch that stays on in the current tab until turned off. Make Developer mode available from an in-progress or skipped final test.
- Advance the scene and story together when skipping, and award handwriting credit only for work the player completes.
- Preserve unfinished assessment progress when a developer skips the final test. Leave practice tests and normal completion credit on the regular assessment flow.
- When a developer reaches the final test with skipping enabled, let them enter the next published lesson from the star map in the same tab. Keep this access tied to the skip switch.

## Assets and delivery

- Across all levels and lessons, use ImageGen as the default source for player-facing artwork, including the full 3D environment, buildings, scenery, props, vehicles, characters, textures, illustrated UI icons, and comics. Match the approved art direction throughout the lesson.
- For 3D objects, generate consistent front, side, back, or other views as needed. Use the generated views as textures, model references, or sprite views according to how the player sees and interacts with the asset.
- Use geometry for volume, lighting, collision, and interaction, and use CSS and SVG for layout, accessible controls, and simple interface indicators. Give visible decorative surfaces and recognisable objects generated artwork by default. Treat plain geometry and code-drawn artwork as temporary placeholders unless there is a specific technical reason to keep them.
- Use game-feel and GSAP techniques where they improve feedback and motion.
- Reuse scene assets, size WebP artwork for its on-screen use, and load the room, handwriting data, and audio when needed.
- Use stereo MP3 sound effects, audible footsteps and interaction feedback, and background music for the title, prelude, and gameplay.
- Provide separate controls for music and effects, and lower the music during speech.
- Keep Hanzi stroke data with its attribution and verify the lesson on tablet and desktop.
- Preview over HTTP with `python -m http.server 8000` and keep asset and module URLs relative for GitHub Pages.
