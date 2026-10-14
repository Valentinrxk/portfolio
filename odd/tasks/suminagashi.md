# suminagashi

## Objective
Replace the "emblemas" section (below "oficio") with 墨流し — an abstract, interactive ASCII marbling pool about the user himself: his motto "nunca lo mismo dos veces" written along ink rings, dropped and combed in real time with exact marbling math, then "printed" into a unique, numbered sheet with his red seal that the visitor can download.

## Problem / why
User (2026-10-14): the emblems repeat the works section; wants something abstract about him and what he likes. Concept pitched and approved in chat ("ok...").

## Scope
- Marbling engine (`marble.js`): ops DROP / STROKE (localized tine) / VORTEX with forward + inverse transforms (Jaffer & Lu mathematical marbling); CPU backward evaluation for tests and the no-WebGL fallback.
- WebGL2 renderer: per-cell backward mapping over the op list (op texture) → drop id + local polar coords → glyph along the ring from the motto; glyph pass with phosphor glow, grain, vignette; print mode (paper + dark ink).
- Section `Suminagashi.jsx/.css`: seeded auto-composition per visit, click/hold = drops (alternating ink/clear rings), drag = comb, "imprimir" = flash + paper print + ロメロ seal + edition number, download .png/.txt, "otra vez".
- Remove "emblemas": `src/components/emblems/`, `Emblems.jsx/.css`, `src/data/emblems.js`, `src/assets/emblems/`, `scripts/emblems.mjs`; undo its Hud.jsx tweak; i18n `emblems` → `ink`.

## Constraints
- Unmistakably ASCII; abstract; no works, no film scenes. Japanese finish as treatment (Mincho, hanko, washi paper), dark both themes.
- Reduced motion: no bloom/flash/drift. Mobile: tap drop, horizontal drag combs, vertical scrolls.
- Code comments in Spanish (project convention).
- Commits: skipped. The user commits only on request, and main holds a mixed uncommitted state.

## Tasks
- [ ] T1 Marbling math `marble.js` + roundtrip check (forward∘inverse ≈ id) written first. Route: delegated writer.
- [ ] T2 Renderer (backward mapping pass + glyph pass + print mode). Route: same writer.
- [ ] T3 Section, interactions, print/download, i18n, App wiring, removal of emblems. Route: same writer.
- [ ] T4 Verification: roundtrip check, build, screenshots (auto-composition, after drops, after comb, print, mobile, reduced motion), console clean. Route: writer + parent spot check.

## Acceptance criteria
- Rings read as text along circles at rest; combing produces continuous marbled feathers (no tearing).
- Each visit composes differently; print shows a unique edition number, ロメロ seal, date.
- PNG/TXT download works. 60 fps desktop while combing with ≥ 300 ops.

## Progress
- 2026-10-14: concept approved; doc created. Supersedes `odd/tasks/ascii-emblems.md`.

- 2026-10-14: writer pass 1 done. Checks: roundtrip FAIL→PASS (35627, max err 1e-10 px); build ok; 60 fps at 619 ops; GPU↔CPU mirror 100%; png/txt downloads ok; fallback ok. Motto lives in `t.skills.lines` (not hero). Parent visual review: NOT good enough — blobs of jumbled words, empty tray, rings unreadable. Sent back for pass 2: fill tray (7–11 centers × 8–20 taps), thin rings, tangent linework glyphs, motto only on ~1/4 rings, bigger seal.

- 2026-10-14: REJECTED by user ("no me gusta. pensá otra cosa orientada a mobile principalmente"). Writer stopped mid pass 2; build still passes. Code stays until a replacement is approved.

## Next step
None — superseded by the next approved concept.
