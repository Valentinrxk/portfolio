# trasnoche

## Objective
深夜テレビ, a mobile-first ASCII "late-night TV" below "oficio". Swiping changes the channel, with static and a flash in between. Each channel is one film reference rendered as an abstract ASCII motif, never a recreated scene:
- CH1 回路: the dots program;
- CH2 Cure: the lighter flame and the X;
- CH3 Love Exposure: 愛 written with 1 Corinthians 13;
- CH4 Lily Chou-Chou: the wind-blown rice field with BBS text.

## Problem / why
User (2026-10-14): wants the piece more tied to his film references (Pulse, Cure, Love Exposure, All About Lily Chou-Chou). Concept approved in chat ("dale"). Agreed delivery: TV shell + CH1 first, shown to the user, then the remaining channels.

## Scope (this round)
- TV shell: CRT post (barrel, scanlines, mask, bloom, rolling bar, flicker, vignette, rounded corners), OSD channel number and credits, channel switching (static + roll + flash), input (fast flick / buttons / arrow keys), lifecycle, reduced motion, `<pre>` fallback.
- CH1 回路: dots attract when far and die when too close, leaving a stain. The finger is an immortal dot. Faint lines between near dots form the 回路, the circuit. Red tape seals the channel's frame. When the population dies out, 幽霊に会いたいですか？ types out and the dots respawn.
- CH2–CH4 placeholders: static plus 信号なし.
- `Trasnoche.jsx/.css` replaces `<Suna/>` in App. The sand files stay on disk (unmounted) until the user approves.

## Constraints
- Mobile first (390×844). Unmistakably ASCII. Motifs, not scenes.
- Dark in both themes; red for the tape and the flash; green only on CH4 (later).
- Code comments in Spanish.
- Commits skipped (user commits only on request; mixed uncommitted state on main).

## Tasks
- [ ] T1 `kairo.js` sim + invariants check written first. Route: delegated writer.
- [ ] T2 Grid glyph renderer + CRT post + static/flash. Route: same writer.
- [ ] T3 Section, channel registry, input, i18n `tv`, App wiring. Route: same writer.
- [ ] T4 Verification: invariants, build, mobile and desktop screenshots, reduced motion, throttled fps, console. Route: writer + parent visual review.
- [ ] T5 (after user OK) CH2 Cure, CH3 Love Exposure, CH4 Lily Chou-Chou; delete the sand files.

## Acceptance criteria
- Reads as a vintage TV on a phone at a glance.
- CH1 is recognisable to someone who saw Pulse, and beautiful to someone who didn't.
- Channel change is a satisfying, flashy cut. ≥ 55 fps with 4× CPU throttle.

## Progress
- 2026-10-14: concept approved; doc created. Supersedes `odd/tasks/suna.md` (pending user OK to delete the sand files).

- 2026-10-14: side request: removed "español nativo · inglés c1" from Experience (JSX + CSS). Pending: delete the now-unused `experience.langs` keys (es/en) in `src/i18n.jsx` once the writer is done, to avoid a concurrent edit.

- 2026-10-14: T1–T4 done (delegated writer). Files: `src/components/tv/{cells,static,shell,osd,renderer}.js`, `tv/channels/{kairo,nosignal,index}.js`, `Trasnoche.jsx/.css`; App mounts `<Trasnoche/>`; i18n `sand` → `tv`. Evidence: invariants RED (module missing) → 2 FAIL → 9/9 PASS; build ok; flick/buttons/arrows/reduced-motion channel change verified; p95 frame 2.8 ms at 4× throttle (headless, `--disable-frame-rate-limit`). Parent: reviewed mobile shots (after 15 s, stains, ghost question) — good; removed `experience.langs` keys; re-ran invariants + build (pass).
- Weak: 45° lines render as `\\` pairs; desktop cells small; stains merge into a dark mass after ~4 min; resting desktop cursor counts as a finger; real-phone flick feel unverified.

- 2026-10-14: user didn't recognise the Pulse reference at first (the dots program is a minor scene: Harue shows it to Ryosuke, not Michi as the parent wrongly said), but approved CH1 anyway ("me gustó igual"). Lesson for CH2–CH4: put each film's MOST iconic image at the centre.
- T5 started: CH2 Cure (lighter flame + water ripples + a 1-frame red X + あんた誰？), CH3 Love Exposure (a beating 愛 written with 1 Cor 13:4–8 from the public-domain 口語訳), CH4 Lily Chou-Chou (a green rice field swaying with tilt or cursor, a tiny distant figure with headphones, original BBS lines). CH1 tweaks: desktop cursor only lures while moving, cap and fade the stains, bigger desktop cells. Route: one delegated writer. Sand files stay on disk; ask the user before deleting.

- 2026-10-14: client: remove the visible "trasnoche", 深夜 and the credits line. Texts should be few and ambiguous or abstract, if any. Forwarded to the T5 writer: keep the functional hint, the ◁ ▷ buttons and the OSD; film metadata stays only in the sr-only alt and aria-labels.

- 2026-10-14: T5 done (delegated writer).
  - New: `tv/texts.js`, `channels/{cure,love,love-bitmap,lily}.js`.
  - `cells.js`: 12-bit glyph index, 16 tones.
  - `renderer.js`: per-frame `bg`.
  - `kairo.js`: soft stain cap of 18.
  - Desktop grid: 90–110 columns.
  - The header and credits are gone; film metadata lives only in aria/sr-only text.
  - The "1/4" counter was also removed (the OSD duplicates it).
  - Evidence:
    - channels-invariants RED (module missing) → 21/21 PASS; kairo invariants PASS;
    - build ok;
    - p95 ≤ 3.0 ms on every channel at 4× throttle;
    - console clean.
  - Parent: reviewed the mobile sheet, the Cure X frame and the Lily gust; re-ran both invariant suites and the build (pass).
  - Weak:
    - the Lily figure reads like a tripod;
    - 愛 is coarse on mobile;
    - a seam in the far/near field on some seeds;
    - the desktop flame is slender.
  - Default kept: the iOS motion-permission prompt on the first touch in CH4 (needed for tilt; the fallback is drag).
  - Unused on disk: `channels/nosignal.js`, `writeSnow`/`writePlate` in `static.js`, and the sand files.

- 2026-10-14: client feedback: remove CH3 愛; the Lily figure stays but must read better; remove the UADE degree from "oficio" (done inline: Experience ROLES + i18n es/en, build ok). He worries the portfolio is losing simplicity — keep changes lean. T6 delegated: delete love channel + dead plumbing, figure variants.

- 2026-10-14: T6 done (delegated writer).
  - CH3 love removed: love.js and love-bitmap.js deleted, VERSE and the ROSE tone removed, the per-frame `bg` override removed.
  - Channels are now kairo, cure, lily.
  - The Lily figure is `.o.` / `/ \` with rice in front, about 3 rows tall on mobile.
  - Evidence: channels-invariants RED (4 channels) → PASS; kairo PASS; build ok; `rg` shows no love leftovers; ▷ cycles 1 → 2 → 3 → 1; console clean.
  - Parent: viewed the figure zoom (reads as a small person, not a tripod); re-ran the invariants and the build.

- 2026-10-14: user: the TV felt random, so it needs a title or intro tied to him. Added inline, same pattern as the other sections: `///` + Scramble h2 + lead.
  - Copy: es "fuera de horario" / "el cine que me enseñó a mirar pantallas.", en "after hours" / "the films that taught me how to look at screens.".
  - Files: Trasnoche.jsx, Trasnoche.css, i18n `tv.title`/`tv.lead`.
  - Evidence: build ok; mobile + desktop screenshots reviewed (`scratchpad/tv-check/out-t7/`).

- 2026-10-14: lead changed to "lo que moldeó mi criterio." / "what shaped my taste." ("criterio" is the portfolio's main theme; the hero says "el criterio no se descarga").
- 2026-10-14: after the parent's objective review, the user approved two things.
  - Move the TV out of the professional path, as part of "adn": `#skills`, after the statement and cards.
  - Show the film's Japanese title in-screen for about 2 s on each channel change, OSD-style.
  - T7 delegated: integrate into Skills (TV header becomes an h3 sub-heading without `///`; keep the Skills parallax scoped to the statement grid), remove the standalone mount in App, add the OSD title, check the HUD.

- 2026-10-14: T7 done (delegated writer).
  - The TV is mounted inside Skills `#skills` after a `.dna__statement` wrapper, which is now the `useScroll` target (parallax identical, measured against the HEAD copy). App no longer mounts it standalone.
  - The header is an h3 without `///`.
  - The in-screen Japanese title shows for 2 s and fades over 0.5 s, hidden during static (shell, osd, renderer).
  - Evidence: channels-invariants RED → PASS; kairo PASS; build ok; HUD shows "adn" across the TV; console clean.
  - Parent: reviewed the mobile screenshots. Fixed inline the `[↑]` covering ▷ on mobile (`.tv__foot` padding-right at < 640 px); verified both buttons are hit-testable; build ok.

- 2026-10-14: user: no Japanese titles; they're pointless if they're in Japanese.
  - In-screen titles are now the English names he uses himself: "pulse", "cure", "all about lily chou-chou".
  - i18n `tv.channels` is now `{ name, director (romanised), year }`; the Japanese title and romaji fields are removed. The aria label uses the name.
  - Evidence: channels-invariants PASS; build ok; mobile screenshot shows the Lily title fits; 0 page errors.
- 2026-10-14: simplicity audit delegated (read-only), at the user's request.

- 2026-10-14: user: remove the film names entirely; the heading is just "cosas que forjaron mi criterio" ("si la ven, la ven"). T9 delegated:
  - delete the in-screen title code (osd/shell/renderer/Trasnoche);
  - the h3 becomes es "cosas que forjaron mi criterio" / en "things that forged my taste", with no lead;
  - film metadata stays only in aria.

- 2026-10-14: T9 done.
  - The in-screen title code is deleted (osd `drawTitle`, the shell `cap`/`title`, the renderer's second OSD slot, Trasnoche `titleFor`).
  - The heading is now only the h3: "cosas que forjaron mi criterio" / "things that forged my taste".
  - Evidence: invariants RED → PASS; kairo PASS; build ok; no `rg` hits; console clean.
  - Parent: reviewed the mobile screenshot; re-ran the invariants and the build.

- 2026-10-14: user: link to the film. A tap on the screen was rejected (the tap is each channel's interaction), so it's a `↗` link in the dial after ◁ ▷.
  - Opens the current channel's Letterboxd page in a new tab (`noopener noreferrer`). The slugs were verified by search: `pulse-2001` (Kurosawa; `pulse-2001-1` is a different film), `cure`, `all-about-lily-chou-chou`.
  - The aria-label is "ver en letterboxd: <name>".
  - i18n `tv.film` and `channels[].url`.
  - Evidence: build ok; Playwright checked the href for each channel; 0 errors; the footer screenshot was reviewed and the `↗` sized up to 1.1rem.

- 2026-10-14: user: remove the TV title, and adapt the TV and its channels to light and dark mode. T11 delegated:
  - remove the header/h3 and `tv.title`;
  - the TV follows the site theme instead of a forced `#0a0b0b` band;
  - in light mode the screen is the mirrored negative: light glass, dark ink, ink-style glow, dark scanlines, darker amber and green, stains darker than the wall;
  - live theme switching without reload.

- 2026-10-14: T11 done (delegated writer).
  - New `tv/palette.js` (dark/light keyed by TONE). The renderer swaps the palette live: ink over glass in light, subtractive ink bleed, graphite flash.
  - The OSD takes colours; the TV header is removed; the TV uses theme tokens (no black band); Skills gets a negative margin so the TV overlaps the statement padding.
  - Evidence: invariants 17/17 (palette RED → PASS); kairo PASS; build ok; live toggle without reload; console clean.
  - Parent: reviewed the light CH1 stains, light CH3 and the light transition; re-ran the tests and the build.
- 2026-10-14: RDD.
  - The earlier doc-only candidate was approved low risk and acknowledged (burned).
  - For the T11 candidate (base = the user's commit 0a941e4 "fix"), STATUS asks for an `intended_untracked_selection` (schema `gentle-ai.review-intended-untracked-selection/v1`) for `src/components/tv/palette.js`.
  - The schema is undocumented locally. Three guessed JSON shapes were refused with `invalid_request`.
  - Review BLOCKED; no PASS invented. Surfaced to the user. It unblocks once palette.js is tracked (the user's commit) or the schema is known.

- 2026-10-14: user: the CH2 fire was too dark to be correct in light mode, since a flame emits light.
  - Fix (inline): `cure.js` meta `scene: 'dark'`.
  - Trasnoche's `applyPalette(number)` picks the channel's scene palette over the site theme. The swap happens when the OSD number changes, under the channel-change static. `retheme()` resets it.
  - The casing still follows the theme.
  - Evidence: build ok; invariants PASS; mobile screenshots: CH2 is a dark scene with a bright flame inside the silver set in light mode, CH3 goes back to light; theme toggle while on CH2 stays dark; 0 errors.

- 2026-10-14: user: make the other two channels dark scenes too ("queda raro sino").
  - Inline: kairo and lily get `scene: 'dark'`. All screens are now dark in both themes; only the casing follows the theme.
  - Evidence: build ok; invariants PASS; light-mode mobile screenshot of CH3 dark; 0 errors.
  - T13 delegated: remove the now-dead light-screen palette and renderer branches (no visual change; before/after screenshots).

## Next step
Review T13. The user commits when he wants. The real phone test needs an https preview (user decision).
