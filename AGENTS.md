# AGENTS.md

Stormroot is a static P6 Lesson 1 browser game served from the repository root on GitHub Pages.
Preview it over HTTP with `python -m http.server 8000` because its JavaScript modules and Hanzi data use HTTP requests.
Keep asset and module URLs relative so the game runs under the repository name on GitHub Pages.

The curriculum source is `content/p6/tingxie/1.yaml`; `stage/curriculum.js` groups those entries for the playable stage.
Use the question bank’s lesson tags when selecting practice questions, with untagged questions eligible anywhere in the same primary level.
Keep Hanzi stroke data and its attribution together under `stage/vendor/`.
