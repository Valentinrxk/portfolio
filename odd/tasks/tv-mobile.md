# tv-mobile

## Objective
Make the TV section ("adn" / trasnoche) hit hard on mobile. The user said: "el punto principal de esa sección era generar impacto, mobile encima".

## Problem (390×844, parent capture plus a read-only map)
- The default channel CH1 (kairo, Pulse) is minimal by design: about 1% bright cells, single-cell dots and circuit lines that rarely connect. On a portrait phone it reads as an empty dark box.
- The screen is a bezelled box at 92vw × 68svh, not immersive.
- Glyphs are the same size as on desktop; mobile simply shows 39% of the cells.
- The strong effects (static, roll, flash) only fire on a channel change. Nothing happens when the user arrives at the section.

## Approved levers (user, 2026-10-18)
All levers are mobile only (< 640px), where the TV already switches layout.
1. **CRT power-on on arrival.** When the TV enters the viewport it turns on like an old set: a bright horizontal line, then the image expands vertically, then the existing static burst, then a white flash, then the channel.
2. **Full screen.** The screen goes edge to edge with no bezel or margins. The hint and the ◁ ▷ ↗ buttons sit over the bottom of the screen.
3. **Start on the dense channel.** Mobile starts on CH3 (lily, green rice field, about 67% lit) instead of CH1.

Not chosen: bigger glyphs.

## Constraints
- Simplicity is a hard constraint.
- Unmistakably ASCII.
- No visible film names or headings.
- Every screen stays dark in both themes.
- Red only for the tape, the X and the flash.
- Channel change must remain a satisfying, flashy cut.
- Mobile performance: ≥55 fps at 4× CPU throttle, a p95 frame ≤3 ms target (trasnoche.md).
- `touch-action: pan-y` (vertical scroll passes through).
- Swipe, buttons and keys keep working.
- Reduced motion: no power-on animation (a plain cut), consistent with the existing hard-cut behaviour.
- No commits; the user reviews and pushes.
- Code comments in Spanish.

## Tasks
V1–V3 are done (delegated writer). The per-task specs below are kept for reference; the evidence is in Progress.

- [x] **V1.** Full screen on mobile.
  - CSS sizing: 100vw, height between the HUD bars, no radius, no bezel rings.
  - Footer overlaid inside the screen.
  - Shader rounded mask off on mobile; curvature reduced if needed.
  - Route: delegated writer.
- [ ] **V2.** CRT power-on on arrival (mobile).
  - Triggered when the TV becomes ≥50% visible after having been out of view.
  - Line → vertical expand → static burst → flash → channel. Reuse the existing static/flash transition.
  - Route: delegated writer.
- [ ] **V3.** Mobile starts on CH3 (lily). Route: delegated writer.
- [ ] **Check.** Parent captures with headless CDP at 390×844 (TV at rest plus a power-on frame sequence) and 1440×900 (desktop unchanged); `npm run build`.

## Acceptance criteria
- On a 390×844 phone the TV fills the screen between the bars.
- Arriving at the section triggers a visible CRT power-on.
- The first image is the dense lily field.
- Desktop is unchanged.
- No layout shift, no horizontal scroll.
- Build passes.

## Progress
- 2026-10-18: diagnosis done; levers approved; delegated V1–V3.
- 2026-10-18, V1–V3 done (writer):
  - **Trasnoche.css:** phone-only rules via `not all and (min-width: 640px)`. The screen is 100% × (100svh − 2·hud-h) with no radius, bezel or shadow. The footer is a flat `rgba(2,2,2,.6)` 56px strip overlaid on the screen. Power-on CSS: an `::after` line plus `scaleY`/`brightness` keyframes, keyed on `data-power`.
  - **shell.js:** `gridFor(..., bleed)` with `barrel` 0.04 when full-bleed (0.08 otherwise); `createShell({ start })`; `powerOn()` reuses the transition into the current channel with a 0.3 s snow lead.
  - **renderer.js:** `uRadius` is 0 when full-bleed.
  - **Trasnoche.jsx:** `phoneLike()`; lily start found by id (phones with WebGL2); the IntersectionObserver turns the TV off when it leaves and runs the power-on when it is ≥50% visible again; reduced motion is never off.
  - Writer checks: `power-check` 18/18 PASS (RED observed against a HEAD copy); `cpu-bench` sim p95 ≤0.21 ms; build OK.
- Parent fixes (inline, `Trasnoche.jsx`):
  - With lily as the boot channel, the iOS motion-permission prompt no longer fires on the first touch, which is usually a swipe. It waits until the user comes back to lily by changing channel (`tiltWait`).
  - Fixed the shadowed `screen.orientation` by using `window.screen.orientation`.
- Parent checks, headless Chrome with SwiftShader WebGL2 via CDP:
  - 390×844: the screen sits at (0, 39.7) at 390×764, with no horizontal scroll (docW 390).
  - The power-on sequence (line → static → CH 3 lily) was observed.
  - The statement → TV boundary is clean.
  - At 1440×900 the desktop TV is unchanged (4:3 bezel, CH1).
  - Build OK.
- Not measured: real-phone fps. The GPU fills about 45% more pixels (1.19 MP at dpr 2).

## Next step
User review on a real phone.
