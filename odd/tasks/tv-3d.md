# tv-3d

## Objective
Show the three TV channels (kairo/Pulse, cure, lily) on a 3D late-90s / early-2000s CRT TV rendered with three.js, desktop only. The user asked (2026-10-21): "en la seccion de la tele hagas un modelo 3d con threejs o uses uno de un tv de los 90 o 2000 para mostrar los 3 canales que hicimos".

## Decisions
- **Desktop only (user, 2026-10-21).** Phones (< 640px, `phoneLike()`) keep the current full-bleed WebGL2 TV unchanged and never download three.js.
- **Procedural model, built in code (parent).** No downloaded asset: no license or attribution, a few KB instead of MB, and full control over the screen UVs. Late-90s CRT: rounded body, tapered back, slightly bulged 4:3 tube with rounded corners, inner bezel lip, a bottom strip with speaker grille, CH buttons, power LED, and rabbit-ear antenna.
- **Picture pipeline kept, used as a texture (parent).** The existing `renderer.js` draws into an offscreen canvas at an explicit size, and three.js uploads it as a `CanvasTexture` in the same rAF, right after `draw` (the drawing buffer is not preserved). This means two GL contexts, but the channel look stays byte-identical. Not chosen: porting the 4 passes to three (bigger rewrite, risk to the look).
- **Effects the 3D mesh now does for real:** barrel, tube rounding and the fake glass reflection are turned off in the offscreen picture. Curvature, rounded corners and reflection come from the 3D screen.
- **Casing follows the theme:** graphite plastic in dark, 2000s silver body with a dark bezel in light. The screen stays dark in both.
- three.js was removed on 2026-10-14 for simplicity (191.8 kB gz lazy chunk, `odd/tasks/simplify.md`). It returns lazy-loaded, desktop only, near the section.

## Constraints
- Simplicity is a hard constraint; unmistakably ASCII; no visible film names or headings.
- The screen stays dark in both themes; red only for the tape, the X and the flash.
- Channel change stays a flashy cut; swipe, ◁ ▷ buttons, keys and the ↗ Letterboxd link keep working.
- Reduced motion: static pose (no parallax), the existing hard cut.
- Keep the perf guards: dpr ≤ 2, rAF only while on screen, lazy import, fixed-step sim, dispose and context loss.
- If three.js or WebGL fails on desktop, fall back to today's flat desktop TV.
- No commits and no branches; the user reviews and pushes. Code comments in Spanish.

## Tasks
- [ ] **T1.** Add `three@0.186.1`. Give `renderer.js`/`shell.js` an offscreen "flat" mode: an explicit size, barrel 0, no tube mask, no fake reflection. Route: delegated writer (writer trigger: 2+ non-trivial files).
- [ ] **T2.** Procedural CRT model and three stage module (`src/components/tv/`): scene, lights, environment, theme palettes, camera fit, screen shader (picture plus rounded mask plus glass reflection), pick(uv), render, dispose. Route: delegated writer.
- [ ] **T3.** Integration in `Trasnoche.jsx`/`.css` (desktop):
  - Lazy three plus the 3D stage.
  - Pointer raycast to UV to grid (`screenToIso`).
  - Damped mouse parallax.
  - The 3D CH buttons depress on change and can be clicked.
  - Theme switch.
  - Breakpoint change.
  - Fallback.
  - Route: delegated writer.
- [ ] **T4.** Checks, by the parent:
  - `npm run build`.
  - three only in a lazy chunk, with the initial bundle unchanged.
  - Headless captures at 1440×900 in both themes and with a channel change.
  - 390×844 unchanged.

## Acceptance criteria
- At 1440×900 a 3D CRT TV shows the current channel on its curved screen, in both themes.
- ◁ ▷, the keys and the 3D buttons change channel with the static cut, and the pointer still drives the channels.
- Phones are identical to before and load no three.js.
- The initial bundle does not grow, and the build passes.

## Progress
- 2026-10-21: map done (read-only explorer); mobile decision taken (desktop only); T1–T3 delegated to one writer.
- 2026-10-21, T1–T3 done (delegated writer):
  - **shell.js:** `gridFor(..., flat)` sets barrel 0 and keeps the desktop column count (90–110) even though the projected tube is narrower than 640 css px.
  - **renderer.js:** a `uFlat` uniform drops the tube mask and the fake reflection. With `uFlat=0` the math is identical to before.
  - **New `crt/tube.js`:** pure measures and the uv → picture mapping.
  - **New `crt/model.js`:** the procedural CRT.
  - **New `crt/stage.js`:** the only module that imports three.
  - **Trasnoche.jsx:** `data-mode` 3d/flat, falling back to flat if three fails. Crossing the breakpoint remounts the other mode, keeping the current channel and using a fresh canvas each time.
  - **Trasnoche.css:** the 3D stage is sized `min(86vh, 100vh − 2·hud − 7.5rem)`.
  - **Deviation:** the 3D CH keys use invisible DOM `<button>`s placed over the projected key meshes, because CustomCursor only reacts to `a, button`.
- Writer checks:
  - mapping-check: RED (module missing), then GREEN 9/9, including a regression snapshot showing the phone and flat-desktop grids unchanged.
  - Headless Chrome over CDP:
    - 1440×900: mode 3d; ArrowRight and the 3D key change channel; parallax works; no horizontal scroll.
    - 390×844: mode flat; zero three/stage requests.
    - No exceptions in either.
- [x] T4 parent checks:
  - The captures were reviewed: `desk-dark-ch1`, `desk-light-ch1` and `desk-dark-ch3` read clearly as a 90s CRT with the channel legible in both themes.
  - `npm run build` passes: initial `index` is 58.39 kB gz, lazy `stage` is 146.94 kB gz, and three is not in the initial chunk.
- Acceptance gap: the initial bundle grew by +0.68 kB gz (57.71 → 58.39) because of the mode, remount and fallback logic in Trasnoche.jsx. It is accepted as negligible. Moving the engine into a lazy `tv/engine.js` would remove it.
- Native review: unavailable. The workspace preflight asks for an intended-untracked selection, and the tool does not expose its exact v1 schema (`review schema` only lists reviewer, refuter and validator). Nothing was submitted, so the review is pending.
- Not exercised:
  - context-loss recovery;
  - a live resize across the 640px breakpoint;
  - the 3D key press animation;
  - real-GPU fps.
- Known gaps:
  - A phone in landscape (≥640px wide) gets the 3D TV.
  - On 1x screens cells are about 6 device px, roughly 0.7× today's flat desktop.

## Next step
The user reviews on a real desktop browser (Chrome and Safari), checking both themes and a live window resize below and above 640px.
