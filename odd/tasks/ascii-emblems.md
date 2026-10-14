# ascii-emblems

## Objective
Replace the rejected "por dentro" piece (below "oficio") with "emblemas": each work shown as its real mark in giant ASCII, every region written with the work's own words (the Anthropic boat idiom), pinned to scroll, exploding into loose letters and reassembling into the next work with a one-frame red cut.

## Problem / why
"por dentro" (recorded sites as ASCII vs HTML tags) read as grey mush and needed explaining; the user called it "malisimo" / "muy pete". The user approved this concept in chat ("dale proba").

## Scope
- Real marks: Riestra crest, OCLÜ (ü in a circle), grip, Taxes — fetched from the live sites, turned into region masks.
- Phrases per region from real site copy; background dim, written with the domain.
- WebGL2 instanced letters: shader-driven morph (burst → reassemble), cursor wake like ink in water, click ripple, red/negative flash at each cut, phosphor glow, grain, vignette.
- Sticky scroll section between Experience and Projects; HTML caption (其の一 + title + kind · domain).
- Remove "por dentro": Inside.jsx/.css, components/inside/, scripts/semantic-capture.mjs, src/assets/semantic/, i18n `inside` block.

## Constraints
- Aesthetic as treatment only: dark, vintage, polished, Japanese finish (Mincho numerals, dry cuts). No literal film references.
- Unmistakably ASCII. No AI-sounding copy. Code comments in Spanish (project convention).
- Reduced motion: no flight/flash/wake; snap between works.
- Mobile: own grid, touch ripple.
- Commits: skipped. User's standing preference in this session is to commit only when asked, and main holds a large mixed uncommitted state from earlier work.

## Tasks
- [x] T1 Emblem assets — `scripts/emblems.mjs`, `src/assets/emblems/*.png` region masks, `src/data/emblems.js` phrases + region colors, ASCII previews for review. Route: delegated (preparation + network + image processing). Evidence: `node scripts/emblems.mjs --preview …` exit 0; 4 masks (values 0/85/170/255); parent reviewed desktop previews — crest, circled ö, power button recognisable; grip readable on desktop, weak on mobile. Decisions: Riestra band stays red (it carries the crest's contrast); text must restart at a word boundary per region run per row (boundary mush in previews); mobile uses a denser grid and fits wide marks to width.
- [x] T2 Renderer — WebGL2 instanced glyph renderer with morph, wake, ripple, flash, glow, grain. Route: delegated writer (2+ non-trivial files with T3). Files: `src/components/emblems/{layout,renderer,masks}.js`.
- [x] T3 Section — `Emblems.jsx/.css`, sticky scroll mapping, caption, i18n, App wiring; remove "por dentro". Route: same delegated writer as T2. Inside/inside/semantic-capture/semantic deleted. Hud.jsx: "obras" active from `.emblems` (was stuck on "oficio" across the tall section). Keylines between touching regions added.
- [x] T4 Verification — Route: writer self-verify + parent spot check. Writer: pairing-check 1921 groups pass; build exit 0; 0 console errors desktop/mobile/reduced; exactly 2 negative frames per crossing both directions; ~60 fps mid-burst headless; context loss restore ok; `<pre>` fallback ok; HUD no flicker. Parent: reviewed holds (riestra, oclucrm, grip), mid-burst and negative frame screenshots; changed run word-start to a hash (Riestra field rows all started on the same word); re-ran pairing-check (pass) and `npm run build` (exit 0).
- Review (RDD on by default): no candidate yet — no work-unit commit (commits only on user request). Run the native review on the commit when the user asks to commit.

## Acceptance criteria
- Each mark is recognisable at desktop (≈150+ cols) and mobile (≈56 cols) grids.
- Regions read as words (like "BOAT BOAT"), not ramps.
- Scroll forward/backward morphs reversibly; flash fires once per crossing.
- 60 fps on desktop; no errors; build passes.

## Checks
- `npm run build`
- Playwright screenshots (desktop 1440x900, mobile 390x844, reduced motion)
- Test-first exception: visual WebGL piece with no runnable unit-test harness in the repo; structural + visual checks instead.

## Progress
- 2026-10-13: concept approved; doc created.

- 2026-10-14: T1–T4 done. Known weak spots: grip small on mobile; thin runs cut words short; cursor wake strength tuned on synthetic swipes only.

- 2026-10-14: SUPERSEDED — user: repeats the works section; wants something abstract about him. Replaced by `odd/tasks/suminagashi.md`.

## Next step
None (superseded).
