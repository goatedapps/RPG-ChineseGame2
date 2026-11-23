# P6 Lesson 1 · 暴雨后的温室

The greenhouse is the reference implementation for the shared lesson requirements in [AGENTS.md](../AGENTS.md).
The public GitHub Pages site opens the universe at [`index.html`](../index.html). The greenhouse has its own entry at [`p6-lesson1.html`](../p6-lesson1.html).
The mission follows a student preparing the school science exhibition after a downpour, from finding the west-window leak to rescuing the bean seedling and preparing its display.

## Story and interactions

- The tutorial introduces walking, looking around, picking up the phone, and opening its chat.
- The phone lifts from the table into the bottom-right dock, then expands when opened.
- Ah Ning sends casual written English messages in the phone chat, with a ringtone and vibration for new messages.
- The player inspects the west-window note and replies in Chinese with Hanzi Writer. The root camera asks for the seedling task’s vocabulary as tone-free pinyin passwords before revealing the footage. A comprehension question unlocks the rehearsal monitor.
- The phone offers a contextual hint after a delay, then lets the player reveal a glowing golden portal at the target.
- The closing comic leads to Ah Ning's final message, and dismissing that message opens the final test.

## Source and implementation

- The lesson covers all 24 entries in [`content/p6/tingxie/1.yaml`](../content/p6/tingxie/1.yaml).
- Keep [`lesson-test-sentences.json`](lesson-test-sentences.json), used by the test and notebook, in sync with the Chinese `sentenceBank` entries in the source.
- [`story.js`](story.js) defines the mission and dictation sequence, [`lexicon.js`](lexicon.js) supplies the notebook and bilingual question-bank material, and [`evidence.js`](evidence.js) defines object close-ups.
- [`phone-story.js`](phone-story.js) contains Ah Ning's dialogue, monitor login questions, and hints.
- Scene art lives in [`art/`](art/) and repeated lab textures in [`art/lab/`](art/lab/).
- The lesson uses the Hanzi stroke data and attribution under [`stage/vendor/`](../stage/vendor/).
