// Las texturas del televisor 3D, dibujadas una vez en código: el granulado
// del plástico, las manchas suaves del vidrio, la chapa agujereada del
// parlante y los degradés de la sombra y del brillo.
import {
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { mulberry32 } from '../cells.js';

// ruido de valor que empalma consigo mismo: octavas de [celdas, peso]
function field(size, octaves, seed) {
  const out = new Float32Array(size * size);
  const rnd = mulberry32(seed);
  let total = 0;
  for (const [cells, amp] of octaves) {
    const g = Float32Array.from({ length: cells * cells }, rnd);
    const step = size / cells;
    for (let y = 0; y < size; y++) {
      const fy = y / step;
      const y0 = Math.floor(fy);
      const y1 = (y0 + 1) % cells;
      let ty = fy - y0;
      ty = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = x / step;
        const x0 = Math.floor(fx);
        const x1 = (x0 + 1) % cells;
        let tx = fx - x0;
        tx = tx * tx * (3 - 2 * tx);
        const a = g[y0 * cells + x0];
        const b = g[y0 * cells + x1];
        const c = g[y1 * cells + x0];
        const d = g[y1 * cells + x1];
        out[y * size + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      }
    }
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

const repeatable = (tex) => {
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
};

/** El granulado del plástico inyectado: un mapa de normales que se repite. */
export function plasticNormal(size = 256) {
  const h = field(size, [[64, 0.6], [128, 1]], 0x51a571c);
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  const k = 3.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * k;
      const ny = (at(x, y - 1) - at(x, y + 1)) * k;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      data[i] = Math.round((nx / l) * 127.5 + 127.5);
      data[i + 1] = Math.round((ny / l) * 127.5 + 127.5);
      data[i + 2] = Math.round((1 / l) * 127.5 + 127.5);
      data[i + 3] = 255;
    }
  }
  return repeatable(new DataTexture(data, size, size));
}

/** Manchas grandes y suaves, para variar la aspereza (el verde: three lee g). */
export function smudges(size = 128, lo = 0.7) {
  const h = field(size, [[4, 1], [8, 0.6], [16, 0.3]], 0x7e1e5c0);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < h.length; i++) {
    // el ruido de valor se junta en el medio: se estira antes de bajarlo a lo..1
    const s = Math.min(1, Math.max(0, (h[i] - 0.5) * 2.4 + 0.5));
    const v = Math.round((lo + (1 - lo) * s) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  return repeatable(new DataTexture(data, size, size));
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return new CanvasTexture(c);
}

/**
 * La chapa del parlante: agujeros redondos en tresbolillo (negro) sobre la
 * chapa (blanco). `w` × `h` en unidades del modelo, `pitch` entre agujeros.
 * Sirve de color y de relieve a la vez.
 */
export function grilleTexture(w, h, pitch) {
  const px = 1024 / w;
  const tex = canvasTexture(1024, Math.round(h * px), (g, cw, ch) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = '#000';
    const p = pitch * px;
    const dy = p * 0.866;
    const rows = Math.floor((ch - p * 0.5) / dy);
    const top = (ch - (rows - 1) * dy) / 2;
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 ? p / 2 : 0;
      const cols = Math.floor((cw - p * 0.6 - shift) / p);
      const left = (cw - (cols - 1) * p - shift) / 2 + shift / 2;
      for (let c = 0; c < cols; c++) {
        g.beginPath();
        g.arc(left + c * p, top + r * dy, p * 0.33, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Un óvalo que se desvanece, en gris opaco (el alphaMap lee el verde). */
export const radialTexture = (stops) =>
  canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    stops.forEach(([at, c]) => grad.addColorStop(at, c));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
