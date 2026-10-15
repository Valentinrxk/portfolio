# depth

## Objective
Replace gradient-based shading with depth built from layered, deeper gray planes. The user (2026-10-15): "no me gusta el degradé a un gris más oscuro, tenés que jugar con los tonos de gris más oscuros para generar profundidades".

## Findings
- In dark mode (the default) the whole site is one flat mid gray `#343439` (`--silver-300` mirrored).
- Shading comes from two gradients:
  - the global film-layer vignette (`App.css` radial gradient to `--vignette-ink`);
  - the oficio background (`Experience.css` linear gradient silver-300 → silver-400).

## Scope
- Remove the background gradients: the vignette and the oficio linear gradient.
- Dark-mode depth scale with deeper tones: base (recessed) → surface → raised → high. Raised planes get a hairline top highlight and a deep shadow.
- Apply the planes across the sections and the HUD.
- Light mode uses the same plane logic with the existing silver steps, also without gradients.

## Constraints
- Contact (bordo) stays as is unless it clashes.
- The obras section (inverted `--graphite`) stays as is.
- Simplicity: tokens over one-off colors. Contrast stays at least AA for text.
- No commits (the user commits).

## Tasks
- [x] D1 Depth tokens + plane application + gradient removal. Route: delegated writer; parent reviewed screenshots.
  - **Dark depth:** `#141416` / `#1b1b1e` / `#232327` / `#2c2c31`, plus a plane edge and plane shadows.
  - **Light depth:** silver-400..100.
  - **Seams:** `main > section + section` gets a `--seam` margin, so a recessed trench shows between sections.
  - **Planes:**
    - hero, oficio and adn are surfaces;
    - the HUD bars and oficio rows are raised, with a top highlight;
    - the TV bezel is high.
  - **Removed:** the vignette element and its CSS, the oficio gradient, `--vignette-ink`.
  - **Contrast fixes:**
    - dark `--steel-600` → `#92939c` (AA on all planes);
    - obras `.frame__stack dt` → `--silver-500`.
  - **Evidence:**
    - 28 before/after shots, 0 errors;
    - contrast: dark ink 11.3–14.9, dim 4.55–6.0;
    - only intended gradients left (the `[◐]` half-fill, the Contact bordo radial);
    - build ok.
  - **Parent (inline):** replaced the hardcoded base colors in `theme.jsx`, `index.html` and `site.webmanifest` (dark `#343439` → `#141416`, light `#cfd0d6` → `#bfc0c7`); build ok.
  - **Open (pre-existing, light mode):** `--steel-600` dim text is 2.5–3.65:1 on the light planes.

## Next step
User review. RDD review before reporting complete.
