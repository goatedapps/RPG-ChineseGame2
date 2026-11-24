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
- At each story turn, have the helper connect the outcome of the last task to the goal of the next few tasks. State the goal when the player first needs it. Keep directions brief and let discoveries land in the world. Review recorded dialogue together with its transcript so they stay in sync.
- Tie story and vocabulary text to what the player is doing and to a source in the scene. Let the player hear a character speak, open a book or note, or examine something that prompts a brief reaction. Introduce written clues when the player finds the object, and reveal conversations one short turn at a time. Review what triggers each line and why it belongs there.
- Before a minigame opens, use the helper and task HUD to explain the in-world goal. Show any brief instructions for playing inside the minigame when the player first sees the relevant objects or controls.
- Game will be in simplified Chinese throughout. However, the storyline in each lesson will be 'told' to the player entirely in English via an 'assistant'. This assistant can be a friend that guides you through the mission via a phone or walkie talkie (like P6 lesson 1 and P3 Lesson 1), a robot, a partner for a mission etc. The tutorial may begin with the player finding and picking up the helper’s device. Keep the helper available at the bottom right after pickup. After a task has been completed and before a new task is displayed in Chinese, the 'assistant' will have a new alert or notification that explains the next step.
- Automatically read each new task instruction aloud in Mandarin when it appears on the HUD. For tasks with an English briefing, wait until the player has finished with it. Keep the Mandarin replay control available for the active task.
- Automatically read the body of each Chinese clue aloud in Mandarin when the player first picks it up or opens it, including new pages of an in-world book. Speak the clue message only. Leave out headers, labels, signatures, and interaction instructions. Put the small [shared speaker control](../../../shared/speaker.js) beside the clue, including in review views. A tap while reading stops playback. A tap at rest reads from the beginning. Stop when the player closes, hides, or replaces the clue, turns the page, or leaves the screen.
- Keep the shared Developer mode interface in English and let the developer jump to the task numbers shown on the HUD. The skip-dictation switch applies to task dictation and the final test and stays on in the tab until switched off.
- After a developer reaches a lesson’s final test with skipping on, let them enter the next published world from the star map in that tab. Keep saved test progress and award completion credit when the final test is passed.
- Use the shared Developer mode panel on the grade picker and star map. The **Unlock all lessons** switch opens all published worlds for the current tab and preserves normal completion records.

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

- Loop [game-music.mp3](../../../universe/audio/game-music.mp3) while a minigame is in progress. Use the shared audio mixer so the music setting, speech ducking, and recovery after interruptions also apply. Restore the current scene’s music when the player completes or leaves the minigame.
- Use [prelude.mp3](../../../universe/audio/prelude.mp3) for every lesson’s opening comic and [epilogue.mp3](../../../universe/audio/epilogue.mp3) for its closing comic. Call the shared mixer’s `startComic` and pass its optional start hint to the comic player. Respect the music setting and switch tracks when the comic closes.
- Use the shared `correct` cue for successful comprehension, dictation and practice answers, including the final test. It plays [correct.mp3](../../../universe/audio/correct.mp3).
- Use the shared `bindButtonAudio` for button presses and menu actions, including opening or closing the helper and requesting hints. The `ui` cue plays [Diuup.mp3](../../../universe/audio/Diuup.mp3). Play the `pickup` cue when the player actually takes an item. It plays [earn.mp3](../../../universe/audio/earn.mp3). Keep puzzle selections and inspections on their own cues.
- Play [whoosh.mp3](../../../universe/audio/whoosh.mp3) when an available world opens from the star map, including with reduced motion enabled.

## 3. Playtest the affected flow

Serve the repository over HTTP with `python -m http.server 8000`. Open the lesson through its normal player entry point. For a new lesson or full review, follow the sequence below. For a targeted fix, check the changed behavior and nearby steps on the relevant input methods.

1. Enter from the star map on a fresh visit, play through the prelude, and return with saved progress. Confirm the map points to the correct lesson.
2. On desktop, check mouse capture, free look, interaction, and cursor release. On touch, check the joystick, drag-to-look, close-up gestures, and small-screen readability.
3. Run through a helper briefing and hint, a clue, a comprehension check, dictation, and the vocabulary notebook. Verify that the new task is spoken in Mandarin after the briefing and the hint points to the right object. Check that the clue reads only its body when first opened, the speaker stops and restarts it from the beginning, and leaving the clue cancels playback.
4. Enter from the star map with autoplay restricted. Verify that the first tap on the comic enables sound and keeps the opening panel in view. Check music, footsteps, and interaction sounds after returning from a background tab, after a spoken conversation ends, and after dismissing it mid-sentence. Confirm sound follows the settings and recorded helper lines start and stop at the expected moments.
5. Check the epilogue, final test, interrupted-test resume, completion and world unlock, and replay confirmation. For a full review, compare the shipped activities with the word coverage from step 1.

Use Developer mode to reach checkpoints when helpful. Exercise the normal player flow for any progression you change. After an authorized deployment, check that the live entry page and changed assets load from GitHub Pages.
