// El televisor: la grilla, los canales y el cambio de canal
// (estática + rollo vertical + un cuadro blanco). Puro, sin DOM.
import { createBuffer, mulberry32 } from './cells.js';
import { writeStatic } from './static.js';

const STEP = 1 / 60;
const STATIC_S = 0.3;
const SETTLE_S = 0.2; // el rollo se engancha después del destello
const OSD_S = 2;
const OSD_FADE = 0.5;
export const BARREL = 0.08;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Grilla para una pantalla de w × h px css. */
export function gridFor(w, h, dpr = 1) {
  const mobile = w < 640;
  const width = Math.max(1, Math.round(w * dpr));
  const height = Math.max(1, Math.round(h * dpr));
  let cols = mobile ? Math.max(24, Math.round(w / 8)) : clamp(Math.round(w / 8.4), 90, 110);
  // en pantallas de 1x, sin celdas de menos de 7 px
  if (!mobile && Math.floor(width / cols) < 7) cols = Math.max(90, Math.floor(width / 7));
  const cw = Math.max(2, Math.floor(width / cols));
  const ch = cw * 2;
  const rows = Math.max(8, Math.floor(height / ch));
  return {
    cols,
    rows,
    cw,
    ch,
    ox: Math.floor((width - cols * cw) / 2),
    oy: Math.floor((height - rows * ch) / 2),
    width,
    height,
    dpr,
    mobile,
    cellW: cw / dpr,
    cellH: ch / dpr,
  };
}

/** De la pantalla curvada (u, v en 0..1, v hacia abajo) a la grilla, en unidades isótropas. */
export function screenToIso(u, v, grid) {
  const x = u * 2 - 1;
  const y = v * 2 - 1;
  const f = (1 + BARREL * (x * x + y * y)) / (1 + BARREL);
  const su = (x * f + 1) / 2;
  const sv = (y * f + 1) / 2;
  return {
    x: (su * grid.width - grid.ox) / grid.cw,
    y: ((sv * grid.height - grid.oy) / grid.ch) * 2,
  };
}

export function createShell({ channels, grid, seed, onChannel = () => {} }) {
  let buf = createBuffer(grid.cols, grid.rows);
  const live = new Map();
  const noise = mulberry32(seed ^ 0x9e3779b9);
  let current = 0;
  let acc = 0;
  let tr = null; // { t, to }
  let settle = SETTLE_S;
  let osd = 0;
  let osdNum = channels[0].meta.number;
  let clock = 0;
  let taps = []; // toques que esperan un paso del canal

  const get = (i) => {
    if (!live.has(i)) live.set(i, channels[i].create(grid, mulberry32((seed + i * 7919) >>> 0)));
    return live.get(i);
  };
  get(0);

  const land = (to) => {
    current = to;
    get(to);
    osd = 0;
    osdNum = channels[to].meta.number;
    onChannel(to);
  };

  // 2 s y se apaga; con movimiento reducido, sin fundido
  const fade = (t, reduced) => (t < OSD_S ? 1 : reduced ? 0 : clamp(1 - (t - OSD_S) / OSD_FADE, 0, 1));

  return {
    get index() {
      return current;
    },
    get buffer() {
      return buf;
    },
    channel: () => get(current),

    /** dir ±1. Con movimiento reducido, corte seco. */
    change(dir, { reduced = false } = {}) {
      const n = channels.length;
      taps = [];
      if (tr) {
        tr.to = (tr.to + dir + n) % n;
      } else {
        const to = (current + dir + n) % n;
        if (reduced) return land(to);
        tr = { t: 0, to };
      }
      // como en el aparato: el número nuevo aparece al apretar
      osd = 0;
      osdNum = channels[tr.to].meta.number;
    },

    /** Muestra el número de canal otra vez (al entrar en pantalla). */
    showOsd() {
      osd = 0;
    },

    /** Un cuadro: avanza la simulación, escribe la grilla y devuelve el tubo. */
    frame(dt, input = {}) {
      dt = clamp(dt, 0, 0.1);
      clock += dt;
      osd += dt;
      let mode = 'channel';
      let roll = 0;
      let jitter = 0;
      let flash = 0;
      if (input.taps?.length && !tr) taps.push(...input.taps);
      if (tr) {
        tr.t += dt;
        if (tr.t < STATIC_S) {
          // la imagen se suelta: rueda cada vez más rápido y tironea
          const p = tr.t / STATIC_S;
          mode = 'static';
          roll = p * p * 1.6;
          jitter = 0.006 + 0.014 * p;
          writeStatic(buf, noise);
        } else {
          // un solo cuadro blanco y el canal nuevo
          land(tr.to);
          tr = null;
          mode = 'flash';
          flash = 1;
          settle = 0;
        }
      }
      if (mode !== 'static') {
        const ch = get(current);
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 4) {
          // cada toque llega a un solo paso
          const now = taps.length ? taps : null;
          if (now) taps = [];
          ch.step(STEP, mode === 'flash' ? { reduced: input.reduced } : { ...input, taps: now });
          acc -= STEP;
          n++;
        }
        if (acc >= STEP) acc = 0;
        ch.write(buf);
        if (mode !== 'flash' && settle < SETTLE_S) {
          settle += dt;
          const k = 1 - clamp(settle / SETTLE_S, 0, 1);
          roll = -0.14 * k * k;
        }
      }
      return {
        mode,
        roll,
        jitter,
        flash,
        time: clock,
        osd: { number: osdNum, alpha: fade(osd, !!input.reduced) },
      };
    },

    resize(next) {
      grid = next;
      buf = createBuffer(next.cols, next.rows);
      live.forEach((ch) => ch.resize(next));
    },

    dispose() {
      live.forEach((ch) => ch.dispose());
      live.clear();
    },
  };
}
