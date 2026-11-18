# Mehrana signature demo

One page on Unique Cake & Cafe content showing the four candidate signature features. Local only, not published, `noindex`.

Run: `node server.mjs` → http://127.0.0.1:4610 (or the `signature-demo` entry in mehrana-marketing's `.claude/launch.json`). After editing `src/index.html`, run `node tools/build.mjs`; it writes `public/index.html` with the first film picture inlined.

| # | Feature | File | Weight |
|---|---|---|---|
| 1 | Liquid glass header, mega menu, dock. Chromium bends the picture at the glass rim (SVG displacement, after React Bits GlassSurface); Safari/Firefox get frosted glass. Rim light follows the pointer; header turns milky over light sections. | `public/glass.js` | 9 KB |
| 2 | Scroll film (from unique-cake-entrance): 720p streams at once, 1080p swaps in on big screens. | `public/scroll-film.js` | 6 KB + 6 MB / 20 MB video |
| 3 | Photo deck slider: drag or arrows, depth stack, light streak on arrival. | `public/deck.js` | 5 KB |
| 4 | Mouse effect matched to nk.studio's hero: frosted grey disc (42px) trails the pointer, small rose dot on the tip, only inside the section, normal arrow stays; grey wireframe dome room and dish-shaped floor mesh behind the words; the client's object (a cake) as a neon wireframe crossing the heading; the scene turns slightly toward the pointer; floor rises and the cake drops in on first sight. 2D canvas, no Three.js (nk.studio loads ~1.5 MB). Disc lag measured against nk.studio: ~28px on arrival, ~4px after 120ms (nk ~6px). | `public/field.js` | 13 KB |

Text comes from uniquecakeandcafe.online (same copy as the entrance film demo); photos are the cafe's own (`unique-cake-cafe-reference/assets`).
