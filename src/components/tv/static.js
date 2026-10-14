// Estática en ASCII: la del cambio de canal (fuerte, breve). Puro.
import { G, TONE } from './cells.js';

const RAMP = [...' .,:;-=+*#%@'].map((ch) => G[ch]);
const top = RAMP.length - 1;

/** Cambio de canal: todo el cuadro titila con letras de la rampa. */
export function writeStatic(buf, rng) {
  const { cols, rows, data } = buf;
  for (let r = 0; r < rows; r++) {
    const gain = 0.55 + rng() * 0.6;
    const streak = rng() < 0.08; // una raya de barrido
    for (let c = 0; c < cols; c++) {
      const k = (r * cols + c) * 4;
      let v = rng();
      v = streak ? 0.55 + v * 0.45 : v * v * gain;
      data[k] = RAMP[Math.min(top, 1 + Math.floor(v * top))];
      data[k + 1] = Math.min(255, Math.round((0.18 + v * 1.25) * 127.5));
      data[k + 2] = TONE.STATIC;
      data[k + 3] = 255;
    }
  }
}
