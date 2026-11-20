# AGENTS.md

The repository root serves the P6 Lesson 1 first-person greenhouse game on GitHub Pages.
The earlier Stormroot platformer remains available at `stormroot.html`.
Preview it over HTTP with `python -m http.server 8000` because its JavaScript modules and Hanzi data use HTTP requests.
Keep asset and module URLs relative so the game runs under the repository name on GitHub Pages.

The curriculum source is `content/p6/tingxie/1.yaml`.
The greenhouse story and dictation order live in `greenhouse/story.js`, with notebook and bilingual bank data in `greenhouse/lexicon.js`.
Keep all 24 curriculum entries in the lesson and make English help opt-in.
Keep mission cues short, and show dictation sentences with the target word blanked out.
Use the question bank’s lesson tags when selecting practice questions, with untagged questions eligible anywhere in the same primary level.
Keep Hanzi stroke data and its attribution together under `stage/vendor/`.
Keep generated 3D surface textures as small WebP assets under `greenhouse/art/`.
