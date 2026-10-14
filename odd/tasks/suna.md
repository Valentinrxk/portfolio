# suna

## Objective
Replace 墨流し (below "oficio") with 砂 (suna): a mobile-first ASCII piece where the user's motto "nunca lo mismo dos veces" is set in giant letterforms made of letter-grains. Tilting the phone pours the grains like sand. A finger rakes grooves like a zen garden. Shaking throws everything with a one-frame red flash. Holding still makes the grains climb back and re-form the phrase, never quite the same.

## Problem / why
User rejected the marbling ("no me gusta") and asked for something else, mobile first (2026-10-14). Concept approved in chat ("dale").

## Scope
- `sand.js`: pure sim — phrase mask → homes, grid falling-sand CA with arbitrary gravity, airborne grains (shake), rake, reform assignment.
- WebGL2 instanced glyph renderer (glow, grain, vignette, negative flash); `<pre>` fallback.
- Section `Suna.jsx/.css`: device orientation/motion (iOS permission via "tocá para soltar"), touch/mouse fallbacks, i18n `sand`, App wiring.
- Remove 墨流し: `src/components/ink/`, `Suminagashi.jsx/.css`, i18n `ink`.

## Constraints
- Mobile first (390×844 is the primary design target); desktop secondary.
- Unmistakably ASCII; abstract; about him (his motto). Dark in both themes; red only in the flash; 砂 in Mincho.
- iOS motion events need HTTPS plus a user-gesture permission, so real-phone testing needs an https deploy or tunnel (the user's decision).
- Reduced motion: static phrase.
- Code comments in Spanish.
- Commits skipped (user commits only on request; mixed uncommitted state on main).

## Tasks
- [ ] T1 `sand.js` + invariants check written first (grain conservation, no overlap, settling, reform bijection). Route: delegated writer.
- [ ] T2 Renderer. Route: same writer.
- [ ] T3 Section, input (orientation, motion, touch, mouse), i18n, App, removal of 墨流し. Route: same writer.
- [ ] T4 Verification: invariants, build, mobile-emulated screenshots with synthetic orientation events (formed, pouring, piled, raked, flash, reforming), desktop, reduced motion, CPU-throttled fps, console clean. Route: writer + parent visual review.

## Acceptance criteria
- At rest the phrase reads instantly on a phone.
- Pouring looks like real sand: piles, angle of repose, no grains lost or overlapping.
- Reform is satisfying and different each time.
- ≥ 55 fps under 4× CPU throttle on mobile emulation.

## Progress
- 2026-10-14: concept approved; doc created. Supersedes `odd/tasks/suminagashi.md`.

- 2026-10-14: T1–T4 done (delegated writer). Evidence: invariants RED (module missing) → 1 FAIL → 10/10 PASS; build ok; mobile synthetic tilt/shake/reform ok, 391 grains conserved; reform differs 261/391 cells; 60 fps at 4× CPU throttle; iOS permission button path and drag/tap fallback ok; reduced motion static; ink/Suminagashi deleted. Tuned: mobile uses hand-drawn grid letterforms (raster font illegible at 5-row x-height); faint light bodies under grains so shapes read. Parent review: formed/mid-pour/pile screenshots good; spot-check re-ran invariants + build.
- Weak: real iOS tilt feel and shake threshold unverified (needs HTTPS); HUD bottom bar and [↑] overlap stage corners; pour reads as letter rain rather than a stream.

## Next step
User tries it; real-phone test needs an https preview (user decision).
