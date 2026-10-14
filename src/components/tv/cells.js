// La grilla del televisor: cada celda son 4 bytes (letra, brillo, tono, fondo).
// La letra usa 12 bits: los 8 bajos van en el byte 0 y los 4 altos, arriba
// del tono (byte 2, 4 bits). Puro, sin DOM: canales, renderer y <pre>.
import { KAIRO_QUESTION, NO_SIGNAL, WHO, POSTS } from './texts.js';

// ASCII imprimible; después, las letras anchas (japonés) en dos mitades
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
// todas las anchas que usan los canales (primero las de CH1: índices estables)
const WIDE_TEXT = KAIRO_QUESTION + NO_SIGNAL + WHO + POSTS.join('');

/** GLYPHS[i] = { ch, half }: half 0 angosta, 1 mitad izquierda, 2 derecha. */
export const GLYPHS = ASCII.map((ch) => ({ ch, half: 0 }));
/** G[letra] → índice (las anchas: su mitad izquierda; la derecha es +1). */
export const G = {};
ASCII.forEach((ch, i) => {
  G[ch] = i;
});
for (const ch of new Set(WIDE_TEXT)) {
  if (ch.charCodeAt(0) <= 126) continue;
  G[ch] = GLYPHS.length;
  GLYPHS.push({ ch, half: 1 }, { ch, half: 2 });
}

export const isWide = (ch) => GLYPHS[G[ch]]?.half === 1;
export const textWidth = (s) => [...s].reduce((w, ch) => w + (isWide(ch) ? 2 : 1), 0);

// tonos: índice a la paleta del renderer (hasta 16)
export const TONE = { PALE: 0, RED: 1, WALL: 2, STATIC: 3, GHOST: 4, AMBER: 5, GREEN: 6, HAZE: 7, WATER: 8 };
// su color en el tubo, que es siempre de noche: fósforo pálido sobre vidrio oscuro
export const PALETTE = {
  PALE: '#e6e7eb',
  RED: '#e10600',
  WALL: '#a7acb2',
  STATIC: '#dfe3e8',
  GHOST: '#c9ced6',
  AMBER: '#d8c49c',
  GREEN: '#8fc27a',
  HAZE: '#6f8c68',
  WATER: '#aab4b8',
};

// brillo: 0..2 en un byte (1 = 127.5)
export const BRIGHT_MAX = 2;
const enc = (b) => (b <= 0 ? 0 : b >= BRIGHT_MAX ? 255 : Math.round(b * 127.5));

export function createBuffer(cols, rows) {
  return { cols, rows, data: new Uint8Array(cols * rows * 4) };
}

/** Todo vacío; shade es el fondo de la celda (1 = la pared, 0 = negro). */
export function clear(buf, shade = 1) {
  const d = buf.data;
  const s = Math.round(Math.min(1, Math.max(0, shade)) * 255);
  for (let k = 0; k < d.length; k += 4) {
    d[k] = 0;
    d[k + 1] = 0;
    d[k + 2] = 0;
    d[k + 3] = s;
  }
}

export function put(buf, c, r, g, b, tone) {
  if (c < 0 || r < 0 || c >= buf.cols || r >= buf.rows) return;
  const k = (r * buf.cols + c) * 4;
  buf.data[k] = g & 255;
  buf.data[k + 1] = enc(b);
  buf.data[k + 2] = (tone & 15) | ((g >> 8) << 4);
}

/** La letra y el tono de la celda que empieza en el byte k. */
export const glyphAt = (data, k) => data[k] | ((data[k + 2] >> 4) << 8);
export const toneAt = (data, k) => data[k + 2] & 15;

export function shade(buf, c, r, s) {
  if (c < 0 || r < 0 || c >= buf.cols || r >= buf.rows) return;
  buf.data[(r * buf.cols + c) * 4 + 3] = Math.round(Math.min(1, Math.max(0, s)) * 255);
}

/** Texto desde (c, r); las anchas ocupan dos celdas. Devuelve la columna final. */
export function putText(buf, c, r, str, b, tone) {
  for (const ch of str) {
    const g = G[ch] ?? G['?'];
    if (GLYPHS[g].half === 1) {
      put(buf, c, r, g, b, tone);
      put(buf, c + 1, r, g + 1, b, tone);
      c += 2;
    } else {
      put(buf, c, r, g, b, tone);
      c += 1;
    }
  }
  return c;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido fijo por celda, en [0, 1). */
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor suave en [0, 1): hash2 interpolado. */
export function noise2(x, y, seed = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  let fx = x - x0;
  let fy = y - y0;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
