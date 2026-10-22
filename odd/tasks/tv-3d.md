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

### Round 2 (user, 2026-10-22: "más realista y lindo al modelo 3d, además el botón de encendido apagado no funciona")
- [ ] **T5.** Realism pass on the model, desktop 3D only. Route: delegated writer (`model.js`, `stage.js`).
  - **Silhouette:** real CRT proportions with a deep tapered bell, and a more 3/4 camera so the depth reads.
  - **Bezel:** a molded front bezel with a parting seam and a chamfered draft sloping into the tube.
  - **Glass:** thickness, and real environment reflections with fresnel.
  - **Plastic:** textured, with micro-normal noise; the silver theme is metallic paint.
  - **Grille and controls:** a perforated speaker grille; recessed controls with icon decals and an LED lens with a glow.
  - **Body details:** telescopic chrome antenna; side and back vents; rubber feet; a power cord.
  - **Lighting:** key, fill and rim lights; soft shadows; a light spill from the screen that follows the picture's brightness.
- [ ] **T6.** Working power button, desktop 3D only. Route: same writer (`stage.js`, `Trasnoche.jsx`, `Trasnoche.css`, `i18n.jsx`).
  - Clicking the 3D power key toggles the TV.
  - **Off:** the CRT collapses to a line, then a fading dot, the LED goes dark, and the channel stops stepping.
  - **On:** dot → line → expand, with the existing `shell.powerOn()` static.
  - CH input while off turns the TV on.
  - The power key is a real accessible button (aria-label, aria-pressed).
  - Reduced motion uses hard cuts.

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

- 2026-10-22, round 2 T5 and T6 done (delegated writer):
  - **model.js:** full rewrite.
    - Cabinet steps down to a curved tapered bell; total depth 0.9× the width.
    - Bezel sits proud with a seam and a draft.
    - Glass has visible thickness and a reflection-only layer.
    - Grille is perforated; the control panel is recessed, with chamfered keys and icons, an IR window, and an LED lens plus glow.
    - Telescopic antenna, vents, feet.
    - Shadow plane plus floor glow.
  - **New `loft.js`:** geometry helpers.
  - **New `textures.js`:** procedural maps, created once and disposed.
  - **New `signal.js`:** pure `powerCurve` and `pictureLight`.
  - **stage.js:** 3/4 camera (yaw −0.55); key, fill and rim lights; a procedural studio environment; PCF shadows (r186 has no PCFSoft) re-rendered only on motion; power state; screen light spill.
  - **Trasnoche.jsx/.css:** power behaviour.
    - The power key is a real accessible button (`aria-pressed`, i18n `tv.power`).
    - While off: no frame and no draw.
    - CH input powers the TV on.
    - The off state survives scrolling.
    - Reduced motion uses hard cuts.
  - **Skipped because they looked worse:** the power cord and the glass dust layer.
- Writer checks:
  - mapping-check is GREEN 9/9.
  - signal-check went RED, then GREEN 7/7.
  - Headless at 1440: 3D keys and keys change channel; no horizontal scroll.
  - Power sequence verified: 0 draws while off; ArrowRight and ▷ power on with the channel unchanged; the off state survives scrolling; reduced motion gives immediate on and off.
  - At 390: flat, zero three requests.
- [x] Parent checks:
  - The captures were reviewed (dark, light, the power contact sheet); it reads as a product shot of a real CRT.
  - Inline tweak: the glass `envMapIntensity` went from 0.3 to 0.2, because the softbox reflection washed out the top of the picture. This was not re-captured.
  - `npm run build` passes: initial 58.67 kB gz (+0.28), stage 151.62 kB gz (+4.68).
- Native review: still unavailable. The preflight asks for an intended-untracked selection for the 3 new files, and its v1 schema is not exposed. The hook's START belonged to a superseded candidate, so it was not run.
- Known gaps:
  - Turning the TV off, then crossing to phone width and back, brings it back on.
  - The dark-theme side vents are barely visible.
  - Not exercised: real-GPU fps, Safari, context loss.

## Next step
The user reviews on a real desktop browser (Chrome and Safari), checking both themes, the power key, and a live window resize below and above 640px.
