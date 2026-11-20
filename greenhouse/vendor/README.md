# Browser dependencies

This folder contains browser builds copied without modification from their published npm packages.
The npm registry’s SHA-512 integrity values were verified before the files were extracted.
No third-party requests are needed to load the engine or the animation library during play.

Three.js 0.183.0 includes `three.module.min.js` and its relative import `three.core.min.js` from the [official Three.js release](https://github.com/mrdoob/three.js/releases/tag/r183).
The upstream MIT license is in `LICENSE.three.txt`.

GSAP 3.13.0 includes `dist/gsap.min.js` from the [official npm package](https://www.npmjs.com/package/gsap/v/3.13.0).
The minified file retains its original copyright notice and links to the [GSAP standard license](https://gsap.com/standard-license/).
