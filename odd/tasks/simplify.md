# simplify

## Objective
Recover simplicity, a hard constraint for the user ("el portfolio pierde simplicidad y eso no tiene que pasar"). Apply the approved items from the 2026-10-14 read-only audit.

## Approved (user, 2026-10-14)
- **S1 invisible cleanup:** dead code, deps, CSS and i18n.
- **S2 remove the AI panel and three.js;** one line about MCP/voice stays in the OCLÜ row.
- **S3 oficio:** one line per role (when · org · role); details live only in obras.
- **S4 chrome:** remove the signal meter, `[↑]` ScrollToTop and the click bursts; keep `[@]` and `[◐]`.
- **S5 adn:** remove the 3 generative cards; adn = "nunca lo mismo dos veces" + the TV.
- **S6 copy:** keep only one negation ("el criterio no se descarga"; the adn motto stays per S5). Remove or rewrite the echoes.

## Not approved / out of scope
- Intro once per session: user said NO.
- Shortening scroll sections: not approved.
- `public/*.png` (6 files, ~6.9 MB) and root `SKILL.md` / `ascii-art.txt`: pending user confirmation (may be used externally).

## Copy decisions (S3/S6, parent proposal; user to review)
- hero.sub: removed (es "código, estética y la obsesión por no parecerse a nada." / en equivalent).
- OCLÜ row extra line: es "ia en producción: servidores mcp y presupuestos dictados por voz." / en "ai in production: mcp servers and voice-dictated quotes."
- projects.items:
  - oclucrm: es "crm para clínicas: pacientes, turnos y administración en una sola pantalla."
  - grip: es "landing para grip®, agencia de marketing de buenos aires."
  - taxes: es "facturación electrónica, sueldos e impuestos para estudios y pymes, con app móvil."
  - riestra: unchanged.
- contact.kicker: es "¿tenés un proyecto?" / en "got a project?"

## Tasks
- [x] S1–S6. Route: one delegated writer (2+ non-trivial files); the parent reviewed screenshots.
  - Deleted:
    - sand/, Suna.*, tv/channels/nosignal.js
    - AiPanel.*, AiScene.jsx
    - ScrollToTop.*, ClickBurst.*
    - ascii/AsciiVariation.jsx
    - the empty scripts/ dir
  - Uninstalled: three, playwright-core, pngjs. playwright-core is copied to `scratchpad/node_modules` for the checks.
  - Backups of the untracked deletions are in `scratchpad/simplify/deleted-backup/`.
  - Mobile adn: larger words (16vw) and a 12vh row gap so the zigzag fills the frame without the cards.
  - Evidence:
    - build ok;
    - initial gzip 134.91 → 126.25 kB; the lazy three.js chunk (191.8 kB gz) and the >500 kB warning are gone;
    - TV invariants PASS;
    - `rg` finds no references to the deleted symbols;
    - HUD nav lands on all 5 sections; `[◐]` works; console clean;
    - mobile page height 13,099 → 11,538 px (oficio 2,536 → 974).
  - Parent:
    - reviewed the mobile oficio, adn and hero screenshots;
    - removed the now-unused `--chrome` variable from variables.css inline (rg 0 refs, build ok);
    - re-ran the invariants and the build.

## Checks
- `npm run build` with chunk sizes before/after (three.js chunk gone).
- TV invariants (`channels-invariants`, `kairo-invariants`).
- Screenshots: mobile and desktop, es and en, every section plus the HUD, light and dark.
- Console clean; HUD navigation lands correctly.
- Test-first exception: removals and copy, no runnable behavioural RED; structural and visual checks instead.

## Constraints
- Code comments in Spanish.
- No commits (user commits only on request).
- Before uninstalling `playwright-core`, copy it to the scratchpad so the verification scripts keep working.

## Progress
- 2026-10-14: approved; doc created.

- 2026-10-14: S1–S6 done.

## Next step
Waiting on the user: `public/*.png` and the root `SKILL.md` / `ascii-art.txt` (confirm they're unused externally). Commits only when the user asks.
