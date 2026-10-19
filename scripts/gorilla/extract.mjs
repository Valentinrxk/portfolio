/**
 * Extractor del gorila ASCII del usuario: recupera el texto exacto de cada frame del GIF que armó
 * (source-ascii.gif: glifos negros sobre blanco, 11 frames) y lo guarda con tonos para el hero.
 *
 * 1. Grilla: pasos de carácter y de línea por el pico de Fourier de las proyecciones de tinta; el
 *    origen sale de la fase y se confirma contando bitmaps distintos (alineada = pocos).
 * 2. Glifos: cada celda es un bitmap exacto; los que difieren en menos de un píxel de tinta (el
 *    sangrado de un '_' vecino) se funden, y cada glifo se rotula con el ASCII más parecido en la
 *    fuente candidata, tamaño y línea base que mejor los reproducen. El GIF es Menlo Bold 15 px con
 *    hinting de FreeType (verificado aparte: los 13 glifos coinciden bit a bit); Skia no aplica
 *    hinting y corre trazos finos hasta 1 px, así que el error tolera ±1 px. DejaVu Sans Mono, de la
 *    que deriva Menlo, quedaría casi empatada si estuviera instalada.
 * 3. Tonos: 'b' gorila, 'r' aro, patas y base, 'n' red (dentro de la elipse del lecho).
 *
 * Uso: npm run ascii:gorilla -- [--print 0] [--print-tones 0,4]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import omggif from 'omggif';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const GIF = path.join(ROOT, 'scripts/gorilla/source-ascii.gif');
const OUT_JSON = path.join(ROOT, 'src/assets/gorilla.json');
const PLEX = path.join(ROOT, 'public/fonts/IBMPlexMono-Bold-Latin1.woff2');
// Candidatas [nombre, archivo, cara dentro de la colección]; se prueban las que existan
const FONTS = [
  ['Menlo Bold', '/System/Library/Fonts/Menlo.ttc', 1],
  ['SF Mono', '/System/Library/Fonts/SFNSMono.ttf', 0],
  ['Monaco', '/System/Library/Fonts/Monaco.ttf', 0],
  ['Courier New Bold', '/System/Library/Fonts/Supplemental/Courier New Bold.ttf', 0],
  ['PT Mono Bold', '/System/Library/Fonts/Supplemental/PTMono.ttc', 0],
  ['Andale Mono', '/System/Library/Fonts/Supplemental/Andale Mono.ttf', 0],
  ['DejaVu Sans Mono Bold', '/Library/Fonts/DejaVuSansMono-Bold.ttf', 0],
  ['DejaVu Sans Mono Bold', path.join(os.homedir(), 'Library/Fonts/DejaVuSansMono-Bold.ttf'), 0],
];
const CHARSET = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join(''); // ASCII imprimible
const SHIFTS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const SPACE_INK = 0.5; // tinta total (px) bajo la cual la celda es un espacio
const MERGE = 1; // bitmaps a menos de 1 px de tinta (L1) son el mismo glifo
const RIM = { x: 4, top: 2, bottom: 1 }; // grosor del aro (celdas) entre el borde exterior y el lecho
const BODY = 'X%#@'; // relleno denso: por acá se sigue el cuerpo del gorila dentro de la red
const GAP = 4; // en una fila, huecos de hasta 4 celdas entre celdas de cuerpo también son cuerpo
const GRAVITY = [162, 107, 62, 37, 110, 37, 62, 107, 162, 90, 90]; // ms (caída libre, aprobado)
const IMPACT_FRAME = 4;

const round = (v, d = 4) => Number(v.toFixed(d));
const l1 = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0);

/** Frames completos (disposal 2, rect entero) como tinta: 0 papel blanco → 1 negro. */
function decode(file) {
  const gif = new omggif.GifReader(fs.readFileSync(file));
  const { width: w, height: h } = gif;
  const rgba = new Uint8Array(w * h * 4), frames = [], delays = [];
  for (let f = 0; f < gif.numFrames(); f++) {
    const info = gif.frameInfo(f);
    if (info.width !== w || info.height !== h) throw new Error(`Frame ${f} parcial: no soportado`);
    gif.decodeAndBlitFrameRGBA(f, rgba);
    frames.push(Float32Array.from({ length: w * h }, (_, p) => 1 - (0.299 * rgba[p * 4] + 0.587 * rgba[p * 4 + 1] + 0.114 * rgba[p * 4 + 2]) / 255));
    delays.push(info.delay * 10);
  }
  return { w, h, frames, delays };
}

/** Paso dominante de una proyección (pico de Fourier) y origen de celda desde la fase. */
function period(signal, lo, hi) {
  const mean = signal.reduce((s, v) => s + v, 0) / signal.length;
  const at = (p) => {
    let re = 0, im = 0;
    signal.forEach((v, i) => { const a = (2 * Math.PI * (i + 0.5)) / p; re += (v - mean) * Math.cos(a); im += (v - mean) * Math.sin(a); });
    return { p, mag: Math.hypot(re, im), center: (Math.atan2(im, re) * p) / (2 * Math.PI) }; // centro de la tinta
  };
  let best = at(lo);
  for (let p = lo; p <= hi; p += 0.01) { const r = at(p); if (r.mag > best.mag) best = r; }
  for (let p = best.p - 0.01; p <= best.p + 0.01; p += 0.0005) { const r = at(p); if (r.mag > best.mag) best = r; }
  const step = Math.round(best.p); // los glifos se repiten idénticos solo con paso entero
  if (Math.abs(best.p - step) > 0.02) throw new Error(`Paso fraccional (${best.p.toFixed(4)} px): no soportado`);
  return { step, origin: ((Math.round(best.center - step / 2) % step) + step) % step, estimate: best.p };
}

function detectGrid({ w, h, frames }) {
  const col = new Float64Array(w), row = new Float64Array(h);
  for (const ink of frames) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { col[x] += ink[y * w + x]; row[y] += ink[y * w + x]; }
  const x = period(col, 4, 64), y = period(row, x.step, 64); // una línea es más alta que ancho un carácter
  return { cw: x.step, ch: y.step, ox: x.origin, oy: y.origin, cols: Math.floor((w - x.origin) / x.step), rows: Math.floor((h - y.origin) / y.step), estimate: [x.estimate, y.estimate] };
}

/** Píxeles de tinta de la celda i (fila mayor) de un frame. */
function cellPx(ink, w, { cw, ch, ox, oy, cols }, i) {
  const px = new Float32Array(cw * ch), x0 = ox + (i % cols) * cw, y0 = oy + Math.floor(i / cols) * ch;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) px[y * cw + x] = ink[(y0 + y) * w + x0 + x];
  return px;
}

/** Bitmaps de celda → grupos exactos → glifos (fundiendo variantes casi iguales). -1 = espacio. */
function cluster({ w, frames }, grid) {
  const index = new Map(), groups = [];
  const ids = frames.map((ink) => Int32Array.from({ length: grid.cols * grid.rows }, (_, i) => {
    const px = cellPx(ink, w, grid, i);
    if (px.reduce((s, v) => s + v, 0) < SPACE_INK) return -1;
    const key = String.fromCharCode(...px.map((v) => Math.round(v * 255)));
    if (!index.has(key)) { index.set(key, groups.length); groups.push({ px, n: 0 }); }
    groups[index.get(key)].n++;
    return index.get(key);
  }));
  const reps = [], classOf = new Int32Array(groups.length);
  for (const g of groups.map((_, i) => i).sort((a, b) => groups[b].n - groups[a].n || a - b)) {
    const k = reps.findIndex((j) => l1(groups[j].px, groups[g].px) < MERGE);
    classOf[g] = k >= 0 ? k : reps.push(g) - 1;
  }
  const spread = Math.max(...groups.map((g, i) => l1(g.px, groups[reps[classOf[i]]].px)));
  return { cells: ids.map((a) => a.map((g) => (g < 0 ? -1 : classOf[g]))), classes: reps.map((g) => groups[g]), groups, classOf, spread };
}

/** Una cara de una colección TTC como TTF suelto (Skia registra solo la primera). */
function ttcFace(buf, face) {
  if (buf.toString('latin1', 0, 4) !== 'ttcf') return buf;
  const off = buf.readUInt32BE(12 + 4 * face), n = buf.readUInt16BE(off + 4);
  const recs = Array.from({ length: n }, (_, t) => off + 12 + 16 * t);
  const out = Buffer.alloc(recs.reduce((s, rec) => s + ((buf.readUInt32BE(rec + 12) + 3) & ~3), 12 + 16 * n));
  buf.copy(out, 0, off, off + 12);
  let pos = 12 + 16 * n;
  recs.forEach((rec, t) => {
    const at = buf.readUInt32BE(rec + 8), len = buf.readUInt32BE(rec + 12);
    buf.copy(out, 12 + 16 * t, rec, rec + 8); // etiqueta y checksum; después el offset nuevo y el largo
    out.writeUInt32BE(pos, 20 + 16 * t);
    out.writeUInt32BE(len, 24 + 16 * t);
    buf.copy(out, pos, at, at + len);
    pos += (len + 3) & ~3;
  });
  return out;
}

/** Rasteriza un carácter en una celda con 1 px de margen (geometría { size, by } en px, x = 0). */
function glyph(ctx, family, chr, { size, by }) {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#000';
  ctx.font = `${size}px "${family}"`;
  ctx.fillText(chr, 1, by + 1);
  const d = ctx.getImageData(0, 0, width, height).data;
  return Float32Array.from({ length: width * height }, (_, i) => 1 - d[i * 4] / 255);
}

/** Error cuadrático entre una celda y una imagen de ancho rw en (x0, y0), tolerando ±1 px (hinting). */
function cellErr(px, { cw, ch }, img, rw, x0, y0, shifts = SHIFTS) {
  return Math.min(...shifts.map(([dx, dy]) => {
    let e = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) e += (px[y * cw + x] - img[(y0 + dy + y) * rw + x0 + dx + x]) ** 2;
    return e;
  }));
}

/** Para cada bitmap, todo el ASCII ordenado por error: [{ chr, err }]. */
function rank(ctx, family, gx, bitmaps, grid) {
  const renders = [...CHARSET].map((chr) => [chr, glyph(ctx, family, chr, gx)]);
  return bitmaps.map((b) => renders.map(([chr, img]) => ({ chr, err: cellErr(b.px, grid, img, grid.cw + 2, 1, 1) })).sort((a, b) => a.err - b.err));
}

/** Fuente, tamaño y línea base que mejor reproducen los glifos, con el rótulo de cada glifo. */
function identify(classes, grid) {
  const ctx = createCanvas(grid.cw + 2, grid.ch + 2).getContext('2d');
  const fits = FONTS.filter(([, file]) => fs.existsSync(file)).map(([name, file, face], i) => {
    const family = `Candidate ${i}`;
    GlobalFonts.register(ttcFace(fs.readFileSync(file), face), family);
    ctx.font = `100px "${family}"`;
    const s0 = (grid.cw * 100) / ctx.measureText('M').width; // tamaño cuyo avance es el paso de carácter
    let best = { total: Infinity };
    for (const ds of [-0.5, -0.25, 0, 0.25, 0.5]) for (let by = Math.ceil(grid.ch / 2); by <= grid.ch; by++) {
      const gx = { size: round(s0 + ds, 2), by }, ranks = rank(ctx, family, gx, classes, grid);
      const total = ranks.reduce((s, r) => s + r[0].err, 0);
      if (total < best.total) best = { name, family, gx, ranks, total };
    }
    // Línea base exacta (sin tolerancia) con los rótulos ya fijos, para el re-render; después se re-rotula
    const plain = (by) => best.ranks.reduce((s, r, k) => s + cellErr(classes[k].px, grid, glyph(ctx, family, r[0].chr, { ...best.gx, by }), grid.cw + 2, 1, 1, [[0, 0]]), 0);
    const gx = { ...best.gx, by: [best.gx.by - 1, best.gx.by + 1].reduce((a, by) => (plain(by) < plain(a) ? by : a), best.gx.by) };
    const ranks = rank(ctx, family, gx, classes, grid);
    return { name, family, gx, ranks, total: ranks.reduce((s, r) => s + r[0].err, 0) };
  });
  if (!fits.length) throw new Error('No hay fuentes candidatas instaladas');
  return fits.sort((a, b) => a.total - b.total);
}

/** Re-render completo de cada frame con la fuente identificada: error de cada celda con tinta. */
function validate({ w, h, frames }, grid, fit, labelOf) {
  const { cw, ch, ox, oy, cols, rows } = grid, out = [];
  const ctx = createCanvas(w + 2, h + 2).getContext('2d'); // 1 px de margen para la tolerancia
  frames.forEach((ink, f) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w + 2, h + 2);
    ctx.fillStyle = '#000';
    ctx.font = `${fit.gx.size}px "${fit.family}"`;
    for (let i = 0; i < cols * rows; i++) if (labelOf(f, i) !== ' ') ctx.fillText(labelOf(f, i), 1 + ox + (i % cols) * cw, 1 + oy + Math.floor(i / cols) * ch + fit.gx.by);
    const d = ctx.getImageData(0, 0, w + 2, h + 2).data, img = Float32Array.from({ length: (w + 2) * (h + 2) }, (_, p) => 1 - d[p * 4] / 255);
    for (let i = 0; i < cols * rows; i++) {
      const px = cellPx(ink, w, grid, i), energy = px.reduce((s, v) => s + v * v, 0); // error de dejarla vacía
      if (energy > 0.25 || labelOf(f, i) !== ' ') out.push({ chr: labelOf(f, i), energy, err: cellErr(px, grid, img, w + 2, 1 + ox + (i % cols) * cw, 1 + oy + Math.floor(i / cols) * ch) });
    }
  });
  return out;
}

/** Tonos por celda: 'b' gorila, 'r' aro, patas y base, 'n' red dentro de la elipse del lecho. */
function tones(text, C, R) {
  // Cama de referencia: el bloque inferior de filas con tinta, en los frames donde es más corto
  const blocks = text.map((g) => { let r1 = R - 1; while (r1 > 0 && !g[r1].trim()) r1--; let r0 = r1; while (r0 > 0 && g[r0 - 1].trim()) r0--; return [r0, r1]; });
  const len = Math.min(...blocks.map(([r0, r1]) => r1 - r0));
  const refs = text.map((_, f) => f).filter((f) => blocks[f][1] - blocks[f][0] === len);
  const ref = text[refs[0]], top = blocks[refs[0]][0];
  const same = refs.filter((f) => text[f].slice(top).join('\n') === ref.slice(top).join('\n'));
  // Borde exterior: ancho total de la cama y, en la columna central, la corrida desde el borde de atrás
  let L = C, Rt = 0, bottom = top;
  for (let r = top; r < R; r++) for (let c = 0; c < C; c++) if (ref[r][c] !== ' ') { L = Math.min(L, c); Rt = Math.max(Rt, c + 1); }
  while (bottom < R && ref[bottom][Math.floor((L + Rt) / 2)] !== ' ') bottom++;
  const bed = { cx: (L + Rt) / 2, cy: (top + RIM.top + bottom - RIM.bottom) / 2, rx: (Rt - L) / 2 - RIM.x, ry: (bottom - RIM.bottom - top - RIM.top) / 2 };
  const inBed = (c, r) => ((c + 0.5 - bed.cx) / bed.rx) ** 2 + ((r + 0.5 - bed.cy) / bed.ry) ** 2 < 1;
  const t = text.map((g) => {
    // El gorila entra a la cama desde la fila de arriba y crece por celdas distintas de la referencia;
    // dentro del lecho solo por relleno denso, porque lo demás que cambia es la red deformada
    const body = new Set(), stack = [];
    for (let c = 0; c < C; c++) if (top > 0 && g[top - 1][c] !== ' ') stack.push([c, top - 1]);
    while (stack.length) {
      const [c, r] = stack.pop();
      for (const [x, y] of [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]]) {
        if (y < top || y >= R || x < 0 || x >= C || body.has(y * C + x)) continue;
        const chr = g[y][x];
        if (chr === ' ' || chr === ref[y][x] || (inBed(x, y) && !BODY.includes(chr))) continue;
        body.add(y * C + x);
        stack.push([x, y]);
      }
    }
    return g.map((line, r) => {
      const isBody = [...line].map((_, c) => body.has(r * C + c));
      for (let c = 0, last = -Infinity; c < C; c++) if (isBody[c]) { if (c - last <= GAP + 1) isBody.fill(true, last + 1, c); last = c; }
      return [...line].map((chr, c) => (chr === ' ' ? ' ' : r < top || isBody[c] ? 'b' : inBed(c, r) ? 'n' : 'r')).join('');
    });
  });
  return { t, bed, top, refs, same };
}

/** Geometría para Plex Mono Bold (avance 0.6 em) que conserva el aspecto de celda del usuario. */
function plexFont({ cw, ch }) {
  GlobalFonts.registerFromPath(PLEX, 'Plex ASCII');
  const ctx = createCanvas(8, 8).getContext('2d');
  ctx.font = '1000px "Plex ASCII"';
  const advance = ctx.measureText('M').width / 1000, bar = ctx.measureText('|');
  if (Math.abs(advance - 0.6) > 1e-3) throw new Error(`Fuente inesperada (avance ${advance})`);
  const lineHeight = round((0.6 * ch) / cw), asc = bar.actualBoundingBoxAscent / 1000, desc = bar.actualBoundingBoxDescent / 1000;
  // La línea base centra en la celda la caja completa de '|' (de ascendente a descendente)
  return { family: 'IBM Plex Mono', weight: 700, advance: 0.6, lineHeight, baseline: round((lineHeight - asc - desc) / 2 + asc) };
}

/** Caja { c0, c1, r0, r1 } de las celdas (fila mayor, ancho `cols`) que cumplen `hit`. */
function bbox(list, cols, hit) {
  const box = { c0: Infinity, c1: -1, r0: Infinity, r1: -1 };
  list.forEach((v, i) => {
    if (!hit(v)) return;
    const c = i % cols, r = Math.floor(i / cols);
    Object.assign(box, { c0: Math.min(box.c0, c), c1: Math.max(box.c1, c), r0: Math.min(box.r0, r), r1: Math.max(box.r1, r) });
  });
  return box;
}

function main() {
  const { values: args } = parseArgs({ options: { print: { type: 'string' }, 'print-tones': { type: 'string' } } });
  const img = decode(GIF), grid = detectGrid(img), { cw, ch, cols, rows } = grid;
  const { cells, classes, groups, classOf, spread } = cluster(img, grid);
  const shifted = [1, cw - 1].map((d) => cluster(img, { ...grid, ox: (grid.ox + d) % cw, cols: cols - 1 }).groups.length);
  console.log(`grilla: celda ${cw} × ${ch} px (Fourier ${grid.estimate.map((v) => v.toFixed(4)).join(' × ')}), origen (${grid.ox}, ${grid.oy}), ${cols} × ${rows} celdas; demoras ${[...new Set(img.delays)]} ms`);
  console.log(`alineación: ${groups.length} bitmaps distintos (corrida ±1 px: ${shifted.join('/')}) → ${classes.length} glifos + espacio (variantes a ≤ ${spread.toFixed(3)} px de tinta)`);

  const fits = identify(classes, grid), fit = fits[0], labels = fit.ranks.map((r) => r[0].chr);
  if (new Set(labels).size !== labels.length) throw new Error(`Dos glifos con el mismo rótulo: ${labels.join('')}`);
  console.log('fuentes (error total):', fits.map((f) => `${f.name} ${f.gx.size} px base ${f.gx.by}: ${f.total.toFixed(1)}`).join(' · '));
  console.log('rótulos (error | 2.º):', fit.ranks.map((r) => `${r[0].chr} ${r[0].err.toFixed(1)} | ${r[1].chr} ${r[1].err.toFixed(1)}`).join(' · '));

  // Validación: una celda falla si el re-render deja sin explicar más de la mitad de su tinta;
  // hay confusión si otro carácter reproduce mejor su bitmap
  const labelOf = (f, i) => (cells[f][i] < 0 ? ' ' : labels[cells[f][i]]);
  const errs = validate(img, grid, fit, labelOf), sum = (k) => errs.reduce((s, e) => s + e[k], 0);
  const worst = errs.reduce((a, b) => (b.err > a.err ? b : a));
  const own = rank(createCanvas(cw + 2, ch + 2).getContext('2d'), fit.family, fit.gx, groups, grid);
  const confused = own.flatMap((r, g) => (r[0].chr === labels[classOf[g]] ? [] : [`${labels[classOf[g]]}→${r[0].chr} ×${groups[g].n}`]));
  console.log(`validación (${errs.length} celdas): error medio ${(sum('err') / errs.length).toFixed(2)} px² (${((100 * sum('err')) / sum('energy')).toFixed(1)} % de la tinta), `
    + `máx ${worst.err.toFixed(2)} ('${worst.chr}'); sobre el umbral (½ de su tinta): ${errs.filter((e) => e.err > e.energy / 2).length}; confusiones: ${confused.join(', ') || 'ninguna'}`);

  // Recorte a la unión de celdas con tinta de los 11 frames
  const { c0, c1, r0, r1 } = bbox(cells.reduce((u, a) => u.map((k, i) => Math.max(k, a[i]))), cols, (k) => k >= 0);
  const C = c1 - c0 + 1, R = r1 - r0 + 1;
  const text = cells.map((_, f) => Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => labelOf(f, (r0 + r) * cols + c0 + c)).join('')));
  const counts = {};
  for (const chr of text.flat().join('').replaceAll(' ', '')) counts[chr] = (counts[chr] || 0) + 1;
  console.log(`recorte: ${C} × ${R} (cols ${c0}–${c1}, filas ${r0}–${r1}); caracteres: ${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);

  // Tonos y orden del rebote por la fila de los pies: 0 alto bajando, 1–3 caen, 4 impacto, 5–8 suben, 9–10 ápice
  const { t, bed, top, refs, same } = tones(text, C, R);
  const feet = t.map((g) => bbox([...g.join('')], C, (tone) => tone === 'b').r1);
  const ok = feet.length === 11 && [1, 2, 3, 4].every((f) => feet[f] > feet[f - 1]) && [5, 6, 7, 8].every((f) => feet[f] < feet[f - 1])
    && Math.max(feet[9], feet[10]) <= Math.min(feet[0], feet[8]);
  console.log(`cama: desde la fila ${top}, idéntica en ${same.length}/${refs.length} frames sin contacto (${refs.join(', ')}); lecho cx ${bed.cx} cy ${bed.cy} rx ${bed.rx} ry ${bed.ry}`);
  console.log(`rebote (fila de los pies): ${feet.join(' ')} → ${ok ? 'coincide con el original: duraciones de caída libre' : 'NO coincide: quedan las del GIF'}`);
  const hit = bbox([...t[IMPACT_FRAME].join('')], C, (tone) => tone === 'b'); // centro inferior del gorila
  const impact = { frame: IMPACT_FRAME, col: Math.round((hit.c0 + hit.c1) / 2), row: hit.r1, bed: { cx: round(bed.cx), cy: round(bed.cy), rx: round(bed.rx), ry: round(bed.ry) } };

  const json = { version: 2, font: plexFont(grid), cols: C, rows: R, durations: ok ? GRAVITY : img.delays, impact, frames: text.map((g, f) => ({ g: g.join(''), t: t[f].join('') })) };
  const out = JSON.stringify(json);
  fs.writeFileSync(OUT_JSON, out);
  console.log(`${path.relative(ROOT, OUT_JSON)}: alto de línea ${json.font.lineHeight} em, base ${json.font.baseline} em, impacto (${impact.col}, ${impact.row}); `
    + `${(out.length / 1024).toFixed(1)} KB, gzip ${(zlib.gzipSync(out).length / 1024).toFixed(1)} KB`);
  for (const f of args.print?.split(',') ?? []) console.log(`\nframe ${f}\n${text[f].map((l) => l.trimEnd()).join('\n')}`);
  for (const f of args['print-tones']?.split(',') ?? []) console.log(`\ntonos ${f}\n${t[f].map((l) => l.trimEnd()).join('\n')}`);
}

main();
