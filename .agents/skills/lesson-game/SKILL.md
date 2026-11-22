---
name: lesson-game
description: Plan, build, revise, or review a P2, P3, P5, or P6 Chinese lesson game in RPG-ChineseGame2. Use for story proposals, comics, 3D gameplay, object interactions, controls, audio, vocabulary and dictation, assessments, or lesson playtesting.
---

# Build and review lesson games

Start with [AGENTS.md](../../../AGENTS.md) for the current project rules. Use this workflow for the parts of the lesson affected by the request. For a proposal, describe the player experience and learning activities. For a focused fix, trace and verify the affected flow and its immediate dependencies.

## 1. Plan the mission and learning

- Identify the grade and lesson. Read its Tingxie list under `content/<level>/tingxie/` and the grade's question-bank index under `content/<level>/questions/`. Create a coherent storyline based on the Tingxie list.
- Map each required word to an in-world encounter, a meaningful use or comprehension check, a mission dictation, and a final-test item. For a proposal, show how players discover and use the words through actions. Check the finished lesson against the full word list.
- All vocab in the Tingxie word list must have a dictation practice in each story.
- Outline the stakes in the prelude, the places the player will visit, what the helper says before each new task, and what the epilogue shows. Make each task give the player a reason to move, inspect, choose, or act.
- Game will be in simplified Chinese throughout. However, the storyline in each lesson will be 'told' to the player entirely in English via an 'assistant'. This assistant can be a friend that guides you through the mission via a phone or walkie talkie (like P6 lesson 1 and P3 Lesson 1), a robot, a partner for a mission etc. The assistant will be always available at the bottom right corner of the game. After a task has been completed and before a new task is displayed in Chinese, the 'assistant' will have a new alert / notication that explains the next step.

## 2. Reuse the reference lesson and shared components

Open the [P6 Lesson 1 guide](../../../greenhouse/LESSON.md) and [gameplay screenshots](../../../references/p6-lesson1/README.md) before designing a new interaction. Use [P3 Lesson 1](../../../moonbridge/game.js) as an example for paper close-ups, a rotary dial and lever, and recorded radio dialogue. Follow `AGENTS.md` for current language and interface rules when using either example.

| For | Start with |
| --- | --- |
| Desktop and touch exploration | [Scene pointer](../../../shared/scene-pointer.js), [joystick input](../../../shared/joystick.js), and [joystick styling](../../../shared/joystick.css) |
| Comics and hints | [Comic player](../../../shared/comic.js), [comic layout](../../../shared/comic.css), and [golden hint ring](../../../shared/hint-portal.js) |
| Learning interface | [Vocabulary rows](../../../shared/vocabulary.js), [notebook layout](../../../shared/vocabulary.css), [speech controls](../../../shared/speaker.js), and [P6 final-test view](../../../greenhouse/lesson-test-view.js) |
| Game tools and audio | [Settings](../../../shared/settings.js), [Developer mode](../../../shared/developer-mode.js), [menu styling](../../../shared/game-menus.css), and [shared lesson sounds](../../../greenhouse/sounds.js) |
| Lesson entry and progress | [Universe catalog](../../../universe/catalog.js) and [lesson progress](../../../shared/lesson-progress.js) |

Use ImageGen for player-facing artwork as described in `AGENTS.md`. For close-ups, think through what the player does to the object. Use page edges, pictured controls, and tap-outside dismissal where appropriate. Avoid use of buttons UI, including 'X' button to close a screen. Make actionable areas easy to spot and operable by keyboard / tablet. For sound, reuse suitable footsteps and interaction cues, connect music and effects to their settings, and check that speech stays clear against the music. For recorded helper dialogue, keep filenames tied to stable message IDs and verify playback from the helper interface using the [P3 clip mapping](../../../moonbridge/radio-messages.js) as a reference.

## 3. Playtest the affected flow

Serve the repository over HTTP with `python -m http.server 8000`. Open the lesson through its normal player entry point. For a new lesson or full review, follow the sequence below. For a targeted fix, check the changed behavior and nearby steps on the relevant input methods.

1. Enter from the star map on a fresh visit, play through the prelude, and return with saved progress. Confirm the map points to the correct lesson.
2. On desktop, check mouse capture, free look, interaction, and cursor release. On touch, check the joystick, drag-to-look, close-up gestures, and small-screen readability.
3. Run through a helper briefing and hint, a clue, a comprehension check, dictation, and the vocabulary notebook. Verify language, whether the hint points to the right object, and start/stop behavior for dictation audio.
4. Check music and effects with the browser's first-interaction restriction, confirm sound follows the settings, and verify any recorded helper lines open and stop at the expected moments.
5. Check the epilogue, final test, interrupted-test resume, completion and world unlock, and replay confirmation. For a full review, compare the shipped activities with the word coverage from step 1.

Use Developer mode to reach checkpoints when helpful. Exercise the normal player flow for any progression you change. After an authorized deployment, check that the live entry page and changed assets load from GitHub Pages.
