# work-feedmakers

## Objective
Add the feedmakers.app landing to the "obras" reel. The user asked (2026-10-22): "agregá esta landing a las obras https://feedmakers.app/".

## Current shape of a work (explored)
- **`src/data/works.js`**: `{ key, title, domain, stack: [[layer, text]], video, poster, link }`.
- **`public/works/<key>.mp4`**: h264, 1280×760, 30 fps, 8.5–12 s, 1.1–1.7 Mbps. It is a scroll-through of the live site with no browser chrome.
- **`public/works/<key>.jpg`**: 1280×760 poster.
- **`src/assets/works/<key>-frames.json`**: `{ fps: 6, cols: 130, rows: 48, frames: [string] }` made from the video with the ramp ` .:-=+*#%@`. It is lazy-imported via `WORK_FRAMES` in `Projects.jsx`. The generator script is not in the repo, so it must be rebuilt and validated against an existing work.
- **`src/i18n.jsx`**: es/en `kinds.<key>` and `items.<key>`.
- **`index.html`**: the noscript "Obras" list.

## Evidence about feedmakers.app
- `x-powered-by: Next.js`, `server: nginx`, Tailwind utility classes.
- English copy: "AI Instagram posts in your brand's style". Write the idea in one line and get the image plus caption; 10 free credits.

## Decisions (parent defaults; the user can correct them)
- **Fields:** key `feedmakers`, title `feedmakers`, domain `feedmakers.app`, link `https://feedmakers.app/`.
- **Stack:** `[['front', 'next.js · tailwind']]`, the only stack verifiable from outside. The user may add back or infra layers.
- **Copy (lowercase, like the rest):**
  - kind: es `landing saas`, en `saas landing`.
  - item, es: "landing de feedmakers: escribís la idea en una línea y la ia arma el post de instagram con el estilo de tu marca."
  - item, en: "landing for feedmakers: write the idea in one line and the ai builds the instagram post in your brand's style."
- **Position:** appended last in the reel.
- **SEO:** add an `<li>` to the noscript Obras list. Do not add it to JSON-LD `worksFor` (that list is for employers).

## Constraints
- No commits; the user reviews and pushes. Code comments in Spanish.
- The video and frames JSON stay in the size range of the existing ones (~2 MB mp4, ~400 kB JSON).

## Tasks
- [ ] **F1.** Record the scroll-through video (1280×760, 30 fps, ~10 s, h264 faststart, no audio) and the poster. Route: delegated writer.
- [ ] **F2.** Rebuild the ASCII generator, validate it against an existing work's video and frames, then generate `feedmakers-frames.json`. Route: delegated writer.
- [ ] **F3.** Wire it in: `works.js`, `WORK_FRAMES`, i18n es/en, noscript. Route: delegated writer.
- [ ] **F4.** Checks by the parent:
  - `npm run build`;
  - captures of the obras band (ASCII state, then live video) at 1440×900 and 390×844.

## Acceptance criteria
- feedmakers appears in the obras reel with its ASCII reel, then the real video, its stack, kind, description and a working link.
- Both languages are covered.
- No horizontal scroll, and the build passes.

## Progress
- 2026-10-22: explored; defaults set; F1–F3 delegated to one writer.
- 2026-10-22, F1–F3 done (writer):
  - **Video:** `feedmakers.mp4` is 11.4 s, 1280×760, 30 fps, 1.60 Mbps, 2.28 MB, faststart, yuvj420p like the siblings. It was recorded with headless Chrome on the real GPU through a CDP screencast. Frames were picked by scroll offset, and the page is the Spanish version.
  - **Poster:** `feedmakers.jpg` (121 kB).
  - **Frames:** `feedmakers-frames.json`, 69 frames, 437 kB.
  - **Wiring:** `works.js`, `WORK_FRAMES`, i18n es/en and noscript `<li>`, 15 lines in total.
  - **Generator recovered:** every 5th frame; BT.601 luma; Lanczos resize to 130×48; `floor(L·10/256)`, bright = `@`. Exact agreement with the stored frames: grip 98.89 %, taxes 99.38 %, riestra 98.94 %, oclucrm 99.28 %; the baseline was 40–85 %.
  - **Tools:** the generator and recorder live only in the scratchpad (`feed/ascii/gen.mjs`, `feed/rec/`).
- Writer checks:
  - The frames JSON structure is OK.
  - Headless Chrome at 1440 (ASCII, live, en) and 390: centred, no horizontal scroll, no console errors.
- [x] F4 parent checks:
  - The contact sheet and the obras captures were reviewed: the reel covers hero → gallery → steps → features → pricing → closing.
  - `npm run build` passes: initial 58.86 kB gz (+188 B of copy); lazy `feedmakers-frames` is 46.50 kB gz.
- Note: `.projects` stays 560vh, so the band moves ~24 % faster per px. `~660vh` would restore the per-piece pacing.
- Native review: unavailable. The preflight again asks for the intended-untracked selection, whose schema is not exposed.

## Next step
The user reviews:
- the stack and copy defaults;
- the band pacing (560vh vs ~660vh);
- the reel.
