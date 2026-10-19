# hero-gorilla

## Objective
Make the hero's ASCII gorilla look much sharper and more striking ("mucho mejor y más llamativo"). The scope is "Nítido + vivo", approved by the user on 2026-10-18.

## Problem
- `src/assets/monito-frames.json` (11 frames, 153×92, fps 13) was made with a luminance ramp plus edge chars, using a script that no longer exists.
  - The body is a periodic `@@@#%` stripe.
  - The face, hands and feet are holes.
  - The trampoline net is `*+=#` mush.
- The drawing only uses cols 43–109 and rows 7–83, but sizing counts all 153 cols, so the gorilla is tiny on mobile.
- `--font-mono` starts with `ui-monospace`, which only Safari resolves, so Chrome and Firefox draw it in thin Courier New.
- The loop runs 30% faster than the source and with flat timing.
- With reduced motion, the canvas goes blank after a resize.

## Why
The hero is the protagonist of the site. Shape-aware glyph matching (Alex Harri, "ASCII characters are not pixels") gives crisp contours. A prototype on the source GIF confirmed it.

## Scope (approved plan: ~/.claude/plans/necesito-que-investigues-como-soft-emerson.md)
- **In:**
  - A reproducible converter (shape vectors + contrast enhancement, tones per cell, boil alternates, volume fill).
  - An ASCII-subset webfont for the canvas only.
  - Content-fit sizing.
  - Tone colors from CSS vars.
  - Retimed bounce, line boil, and an impact ripple with red sparks only at impact.
  - Fixes: reduced-motion resize, and keeping the frame index on theme switch.
- **Out:** manga speed lines, glow/bloom, the red "V" nose, the WebGL TV renderer, any change to `--font-mono`, AsciiPlayer and AsciiField.

## Accepted change (user, 2026-10-18): depth through stroke weight
The user said "too flat, it isn't clear what it is" and asked that edges look different from the fill. Accepted design:
- Three static weights of IBM Plex Mono: 200, 400 and 700.
- The silhouette is a bold outline (weight 700 by preference) made of shape-matched glyphs.
- The interior uses "inflation" shading: a distance transform, normalized locally per limb, with a round profile. It goes from a light rim band (200) to a heavy core (700), so every limb reads as a cylinder and the torso and head read as domes.
- The shading is frontal only, with no directional light, so it stays readable when the theme inverts.
- The trampoline uses weight as perspective: the far rim at 400, the near rim and legs at 700, the net at 200.
- The JSON gets a per-cell weight string `w`.
- The converter writes PNG previews (dark and light) for review.

## Accepted change (user, 2026-10-18): adapt the face, don't convert it
The user said: "la cara sigue siendo imposible de ver… te encerrás en usar el gif original en su totalidad… tendrías que adaptarla".
- **Correction (user, same day): "le estás haciendo una cara en el pecho".**
  - The large white plate is the CHEST (nipples plus pec lines), not the face.
  - The face is on the black HEAD above it: small white highlight strokes for the brow, eyes and nose, about 12–13 × 7 cells of head at 64 rows.
  - The parent had mislabelled the chest as the face since the first comparison.
- The face becomes a hand-authored ASCII stamp anchored per frame on the HEAD. The chest stays a converted light plate with small marks.
- **Second correction (user): "le estás modificando la cabeza entera en lugar de solo la cara".**
  - The 9×5 templates redrew the head outline and crown.
  - New rule: features only (eyes in the logo idiom `o   o`, nostrils, optional brow) inside the source face-highlight bbox plus ≤1 cell.
  - No outline characters; transparent everywhere else.
  - The head silhouette must be cell-identical to the plain conversion outside the footprint.
- It has two expressions: neutral, and impact (squint plus gritted mouth on frame 4).
- Three candidate designs and a larger variant get compared in context, and the best one is picked.

## PIVOT (user, 2026-10-18): use the user's own ASCII
The user said: "hice uno que tiene mejor contraste y profundidad que el tuyo", pointing at `~/Downloads/gorilla-ascii.gif`.
- That file is 1044×1926, 11 frames at 100 ms, bold black monospace glyphs on white, about 88 columns.
- Its depth comes from a directional light from the top-left: each limb goes `+` (lit) → `x X %` → `#` → `@` (shadow), with `( ) / \` outlines.
- That beats our frontal weight-shading, which read flat.
- Decision: extract the exact characters from the user's GIF (`scripts/gorilla/extract.mjs`) and render them in IBM Plex Mono Bold, keeping the user's cell aspect.
- Dropped: our converter, the 200/400 weights, the face stamp, the `w` and `a` strings, the subset-font and @ibm/plex-mono devDeps.
- Backups of the old work are in the scratchpad at `backup-converter/`.
- Retimed durations and impact metadata are kept if the frame order matches.

## Constraints
- Simplicity is a hard constraint.
- Unmistakably ASCII.
- Red used sparingly.
- Dark theme is the default; light theme must work.
- Scroll tear and smear keep working.
- No `Co-Authored-By` in commits.

## Source facts
- GIF: `~/Downloads/dd4ll17-3daec74f-7655-4a82-8a9d-003f8848be2a.gif`, 1200×1200, 11 frames, nominal 10 fps (delays are 0).
- Frames are partial rects with disposal 1 (keep), so they must be composited cumulatively. Frame 10 is a 1×1 rect, i.e. a hold of frame 9.
- Frames 4 and 5 cover y 509–978, which may include net deformation.
- Motion is a symmetric bounce: 0 is high, 1–3 fall, 4 is the squash/impact, 5–8 rise, 9–10 are the apex hold.
- Background is paper texture with L > ~200. Ink is black.

## Tasks
- [ ] **T1 converter + data.**
  - `scripts/gorilla/convert.mjs`, `scripts/gorilla/source.gif`, the font TTF + OFL, `npm run ascii:gorilla`.
  - Output: `src/assets/gorilla.json` plus the subset woff2.
  - Route: delegated writer (2+ non-trivial files, needs iteration).
- [x] **T1' extractor** (pivot): `scripts/gorilla/extract.mjs` → `gorilla.json` v2. Evidence is in Progress.
- [x] **T2 font**, final: IBM's unmodified Bold Latin1 woff2 only. The original T2 notes below are superseded.
  - Three `@font-face` rules for 'Plex Mono ASCII' at weights 200, 400 and 700, using woff2 ASCII subsets generated by the converter, plus `--font-ascii`. Only the 700 file is preloaded.
  - The converter rasterizes the same font.
  - Route: same delegated writer as T1.
- [ ] **T3 player base** (`AsciiGif.jsx`, `Hero.jsx`, `variables.css`).
  - New format, content-fit, tone runs from CSS vars, font gate.
  - Reduced-motion resize fix, frame index kept on theme switch.
  - Route: delegated writer.
- [ ] **Preview gate:** parent screenshots (1440×900 and 390×844, dark and light) plus a recording. The user approves before T4.
- [ ] **T4 motion:** retimed durations, line boil (~7 fps, ~30% of contour cells), impact ring through the net plus red sparks, and removal of the always-on sparks. Route: delegated writer.
- [ ] **T5 cleanup:** delete `monito-frames.json`, check bundle and font sizes. Route: inline.

## Acceptance criteria
- Contours read crisply.
- The face is unmistakable: a hand-drawn ASCII gorilla face that reads at hero size and changes expression at impact.
- Hands and feet read as light details.
- The net reads as a lattice.
- The body has volume: no flat block and no periodic stripe.
- Edges and fill read differently through stroke weight: bold outline, light rim and heavy core. Arms and legs read as cylinders.
- The gorilla is clearly bigger, especially on mobile.
- Chrome and Firefox render the shipped font.
- Reduced motion shows a static frame that survives resize.
- Scroll tear and smear work.
- The main chunk does not grow by more than ~15 KB gz.

## Checks
- `npm run ascii:gorilla`, then print frames 0 and 4 and compare them with the old ones.
- `npm run build` (sizes).
- `npm run dev` with Chrome screenshots and a GIF at both sizes and in both themes, with reduced-motion emulation plus resize.
- There is no test runner in the repo, so checks are functional and structural. Test-first does not apply: there is no runnable deterministic test for visual output.

## Delivery
- User (2026-10-18): work directly on `main`, uncommitted. The user reviews the working tree and commits/pushes if they like it. No feature branch, no PR slicing, no work-unit commits.
- Forecast: ~650 authored changed lines (informational only).

## Progress
- 2026-10-18: plan approved; work happens on `main` (base 288a4a0), uncommitted.
- 2026-10-18 (T1/T2, delegated writer): converter written (`scripts/gorilla/convert.mjs`, 537 lines). It covers EDT inflation, 3 weights, `--preview`, `--print-weights`, `--rows`.
  - Output: 55×64 grid, `gorilla.json` 157 KB raw / 9.7 KB gzip.
  - Fonts: 3 woff2 files of ~11 KB each.
  - Checks: deterministic (two runs, same sha256); `npm run build` OK; fonts and preload present in `dist`.
  - Parent review of the previews: outline, net and trampoline are good. The body fill mixes too many glyphs and the depth reads weakly.
  - Iterating fill variants: A current, B monotonic ramp, C weight-only `#`, plus opacity per weight.
- Open: IBM Plex OFL has the Reserved Font Name "Plex", so a subset is a Modified Version. Plan: ship IBM's unmodified `split/woff2/*-Latin1.woff2` files instead (18 KB each, about +21 KB total) and drop the ASCII subsets.

- 2026-10-18 (T1', delegated writer): `scripts/gorilla/extract.mjs` (319 lines) recovers the user's GIF exactly.
  - Font: Menlo Bold 15 px, 9×18 px grid; crop 102×101.
  - Characters: 13 glyphs; 0 confusions over 30,369 cells.
  - Frame order matches the source bounce, so the gravity durations are kept.
  - Tones: b/r/n. Impact: frame 4, contact (50, 83), bed {51, 81.5, 47, 6.5}.
  - Sizes: `gorilla.json` 228 KB raw / 11.6 KB gzip. Deterministic. Build OK.
  - Removed: `convert.mjs`, `source.gif`, the 200/400 fonts, `subset-font`, `@ibm/plex-mono`.
  - Parent review: the Plex Mono Bold re-render is near-identical to the user's Menlo Bold; the dark preview reads well.
- T2 is done: only `IBMPlexMono-Bold-Latin1.woff2` (unmodified, OFL) + `@font-face` 700 + preload.
- T3+T4 (player) delegated together, because the static look is now the user's own asset.
  - Included: CSS-var tones, content-fit, retimed durations, run-based drawing, tear/smear kept, impact ripple plus red sparks only at impact, subtle fur boil (`BOIL` constant), reduced-motion redraw fix.
  - Mobile caveat: 101 rows on a phone gives about 4.6 px glyphs (similar to today).

- 2026-10-18 (T3+T4 done, delegated writer).
  - `AsciiGif.jsx` (301 lines) plays v2 with CSS-var tones, run-based drawing, retimed durations, impact ripple plus sparks, and `BOIL` 0.06.
  - Theme change no longer restarts the animation; resize always redraws.
  - `monito-frames.json` deleted.
  - Build: main chunk 57.35 KB gzip (+10.2).
- User feedback, parent fixes inline in `AsciiGif.jsx` `resize()`:
  - "muy a la derecha": the desktop centre is restored to the old layout's (box 0.96H anchored at max(0.38W, 0.95W − box), centre at box/2), i.e. about 68% of W at 1440.
  - "muy pegado al borde inferior" / "muy grandote": desktop height 0.9H → 0.77H. Same band as before (about 11%–88% of H); about 350×690 px at 1440×900.
- Browser checks use headless Chrome via CDP (scratchpad `shots/cdp-shots.mjs`), because the user rejected the claude-in-chrome tool.

## Next step
Waiting on the user's verdict on size and position. A mobile hero tweak may follow; tv-mobile is in progress as a separate feature.
