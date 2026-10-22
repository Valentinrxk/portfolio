// Lo que sale del tubo del televisor 3D: el apagado y el encendido (la imagen
// que se aprieta en una raya, la raya en un punto y el punto que se apaga
// despacio; y al revés) y la luz que el cuadro echa hacia adelante. Puro, sin
// three: el escenario lo lleva al vidrio y a la luz de enfrente.
import { PALETTE, TONE, glyphAt, toneAt } from '../cells.js';

/** Lo que dura el apagado, con el resplandor del fósforo al final. */
export const POWER_OFF_S = 1.05;
/** Lo que dura el encendido: lo mismo que POWER_S en tv/shell.js (la nieve espera). */
export const POWER_ON_S = 0.3;

const LINE = 0.006; // el alto de la raya, en altos de imagen
const DOT = 0.014; // el ancho del punto, en anchos de imagen
// al apagar: la imagen se aprieta, la raya se achica y el punto se apaga
const SQUEEZE_S = 0.25;
const SHRINK_S = 0.2;
// al encender: el punto, la raya que se abre a lo ancho y la imagen a lo alto
const DOT_S = 0.06;
const WIDEN_S = 0.09;

const mix = (a, b, k) => a + (b - a) * k;
const easeIn = (k) => k * k;
const easeOut = (k) => 1 - (1 - k) ** 3;

const ON = { sx: 1, sy: 1, beam: 1, white: 0, halo: 0, idle: 0, done: true };
const OFF = { sx: DOT, sy: LINE, beam: 0, white: 1, halo: 0, idle: 1, done: true };

/**
 * El tubo t segundos después de apagar (on = false) o de encender (on = true).
 * sx, sy: la escala de la imagen (1, entera); beam: cuánto brilla; white:
 * cuánto se va al blanco; halo: el resplandor alrededor de la raya o el punto;
 * idle: el vidrio sin señal (0, el negro de la imagen; 1, el gris del tubo
 * apagado); done: ya terminó.
 */
export function powerCurve(t, on) {
  t = Math.max(0, t);
  if (on) {
    if (t >= POWER_ON_S) return { ...ON };
    if (t < DOT_S) {
      const k = t / DOT_S;
      return { sx: DOT, sy: LINE, beam: 2.5 * k, white: 1, halo: 0.8 * k, idle: 1 - k, done: false };
    }
    if (t < DOT_S + WIDEN_S) {
      const k = easeOut((t - DOT_S) / WIDEN_S);
      return { sx: mix(DOT, 1, k), sy: LINE, beam: 2.5, white: 1, halo: mix(0.8, 0.5, k), idle: 0, done: false };
    }
    // como en el teléfono: se abre pasada de brillo y se asienta
    const k = (t - DOT_S - WIDEN_S) / (POWER_ON_S - DOT_S - WIDEN_S);
    const e = easeOut(k);
    return { sx: 1, sy: mix(LINE, 1, e), beam: mix(3, 1, k), white: 1 - e, halo: 0.5 * (1 - k), idle: 0, done: false };
  }
  if (t >= POWER_OFF_S) return { ...OFF };
  if (t < SQUEEZE_S) {
    const e = easeIn(t / SQUEEZE_S);
    // se aprieta y se pasa de brillo; el blanco llega al final, ya casi raya
    return { sx: 1, sy: mix(1, LINE, e), beam: 1 + 0.8 * e, white: 0.9 * e * e * e, halo: 0.35 * e, idle: 0, done: false };
  }
  if (t < SQUEEZE_S + SHRINK_S) {
    const k = (t - SQUEEZE_S) / SHRINK_S;
    return { sx: mix(1, DOT, easeIn(k)), sy: LINE, beam: mix(1.8, 2.5, k), white: mix(0.9, 1, k), halo: mix(0.35, 0.9, k), idle: 0, done: false };
  }
  // el fósforo: el punto se apaga despacio y el vidrio vuelve a su gris
  const k = (t - SQUEEZE_S - SHRINK_S) / (POWER_OFF_S - SQUEEZE_S - SHRINK_S);
  const f = Math.exp(-3.5 * k) * (1 - k);
  return { sx: DOT, sy: LINE, beam: 2.5 * f, white: 1, halo: 0.9 * f, idle: k, done: false };
}

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const GLASS = rgb('#101112'); // el fondo encendido, como en renderer.js
const INK = 0.32; // cuánto de su celda pinta una letra, en promedio
const TONES = [];
for (const [name, id] of Object.entries(TONE)) TONES[id] = rgb(PALETTE[name]);

/**
 * La luz promedio del cuadro, [r, g, b] en 0..1, contada en la CPU sobre la
 * grilla (nunca leyendo la GPU): el fondo de cada celda y sus letras, con el
 * fósforo que se satura hacia el blanco como en el renderer. `stride`: una
 * celda de cada tantas.
 */
export function pictureLight(data, cols, rows, stride = 1) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const cells = cols * rows;
  for (let i = 0; i < cells; i += stride) {
    const k = i * 4;
    const s = data[k + 3] / 255;
    r += GLASS[0] * s;
    g += GLASS[1] * s;
    b += GLASS[2] * s;
    if (glyphAt(data, k) > 0) {
      const v = data[k + 1] / 127.5;
      const tone = TONES[toneAt(data, k)] || TONES[0];
      const hot = Math.max(v - 1, 0) * 0.4;
      r += (tone[0] * v + hot) * INK;
      g += (tone[1] * v + hot) * INK;
      b += (tone[2] * v + hot) * INK;
    }
    n++;
  }
  return n ? [r / n, g / n, b / n] : [0, 0, 0];
}
