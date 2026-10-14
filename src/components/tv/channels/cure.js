// CH2 キュア (Cure, 黒沢清, 1997): la llama del encendedor de Mamiya.
// El agua derramada abre anillos en el piso; quieto frente a la llama, el
// trance. Una X roja aparece un solo cuadro, cada tanto. Puro, sin DOM.
// Coordenadas isótropas: x en anchos de celda, y = fila × 2.
import { G, TONE, put, putText, shade, textWidth, hash2, noise2 } from '../cells.js';
import { WHO } from '../texts.js';

export const X_MIN = 10; // s entre X
export const X_MAX = 16;
export const TRANCE_S = 3; // quieto frente a la llama

const FIRE = [...'.:;-=+*#%@'].map((ch) => G[ch]);
const RIPPLE = [...'.oO0o.'].map((ch) => G[ch]);
const MIRROR = [...'.-~=='].map((ch) => G[ch]);
const RING_EVERY = [1.7, 2.6]; // s, sin trance
const RING_SYNC = 1.5; // s, en trance
const FOLLOW = 7; // 1/s: el encendedor sigue al dedo con atraso
const WHO_TYPE = 0.26;
const WHO_HOLD = 2.8;
const WHO_ERASE = 0.11;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

export function paramsFor({ cols, rows }) {
  const W = cols;
  const H = rows * 2;
  const fh = Math.max(7, Math.round(rows * 0.31)); // alto de la llama, en filas
  return {
    W,
    H,
    fh,
    wide: 2.7, // media lengua en lo más ancho, en columnas
    reach: 6, // la ventana de la llama: ± columnas
    horizon: Math.round(rows * 0.66), // el piso
    floorY: H * 0.87,
    ringSpeed: Math.max(2.6, W * 0.055),
    ringMax: Math.max(W * 1.1, 40),
    squash: 0.3, // el piso en perspectiva
    rest: { x: W / 2, y: H * 0.56 },
  };
}

function create(grid, rng) {
  let cols = grid.cols;
  let rows = grid.rows;
  let P = paramsFor(grid);
  const seed = Math.floor(rng() * 4294967296);
  let t = 0;
  let steps = 0;
  let reduced = false;
  // el encendedor (posición del agarre) y su llama
  let lx = P.rest.x;
  let ly = P.rest.y;
  let vx = 0;
  let lean = 0;
  let px = null; // el puntero del paso anterior
  let py = null;
  let still = 0;
  let trance = 0;
  let deep = false;
  let heat = new Float32Array(cols * rows);
  let flame = { c0: 0, r0: 0, c1: 0, r1: 0, sum: 0 };
  let flameT = 0; // el tiempo de la llama: en trance, más lento
  // la X
  let nextX = X_MIN + rng() * (X_MAX - X_MIN);
  let xPending = false;
  let xTriggers = 0;
  let xFrames = 0;
  let lastX = false;
  const xLog = [];
  // los anillos
  let rings = [];
  let nextRing = 0.4;
  // あんた誰？
  let who = { phase: 'idle', t: 0, n: 0, next: 22 + rng() * 10 };

  const bounds = () => ({
    x0: P.reach + 0.5,
    x1: cols - P.reach - 0.5,
    y0: (P.fh + 3) * 2,
    y1: (rows - 5) * 2,
  });

  const trigger = (cause) => {
    if (reduced) return;
    xPending = true;
    xTriggers++;
    xLog.push({ t, cause });
    if (xLog.length > 200) xLog.shift();
    nextX = t + X_MIN + rng() * (X_MAX - X_MIN);
  };

  // ——— la llama: un campo de calor que sube ———
  const burn = (ft) => {
    heat.fill(0);
    const gc = Math.floor(lx);
    const gr = Math.floor(ly / 2);
    const base = gr - 1; // la boca de la chimenea
    const calm = 1 - 0.75 * trance;
    const breath = noise2(ft * 1.3, 3.1, seed);
    const tall = P.fh * (0.86 + 0.18 * breath + 0.12 * trance);
    let c0 = cols;
    let r0 = rows;
    let c1 = -1;
    let r1 = -1;
    let sum = 0;
    for (let r = base; r >= base - Math.ceil(tall * 1.2) - 1; r--) {
      if (r < 0) break;
      const y = (base - r + 0.5) / tall;
      if (y > 1.2) break;
      // la lengua: la base redonda, lo más ancho a un quinto, una punta larga
      const hw =
        y < 0.2 ? P.wide * (0.42 + 0.58 * Math.sqrt(y / 0.2)) : P.wide * Math.pow(Math.max(0, (1 - y) / 0.8), 1.1);
      const sway = (noise2(ft * 2.1, 7.7, seed) - 0.5) * 1.5 * y * y * calm;
      const axis = gc + 0.5 + lean * 2.8 * Math.pow(y, 1.4) + sway;
      for (let c = gc - P.reach; c <= gc + P.reach; c++) {
        if (c < 0 || c >= cols) continue;
        // titila hacia arriba: el ruido sube con el tiempo
        const n = noise2(c * 0.9, (r + ft * 5.5) * 0.8, seed + 11);
        const dx = (c + 0.5 - axis) / Math.max(0.3, hw);
        let core = 1 - dx * dx;
        // la punta se desprende a veces: una lengüita suelta
        if (y >= 0.95) core = Math.abs(c + 0.5 - axis) < 0.6 && n > 0.62 - 0.2 * (1 - calm) ? 0.35 * (1.2 - y) * calm * 5 : 0;
        if (core <= 0) continue;
        const h = Math.pow(core, 0.7) * (1 - 0.5 * Math.pow(Math.min(1, y), 1.6)) * (0.7 + 0.55 * n * (0.4 + 0.6 * calm));
        if (h < 0.02) continue;
        const v = Math.min(1.4, h);
        heat[r * cols + c] = v;
        sum += v;
        c0 = Math.min(c0, c);
        c1 = Math.max(c1, c);
        r0 = Math.min(r0, r);
        r1 = Math.max(r1, r);
      }
    }
    flame = { c0, r0, c1, r1, sum };
  };

  const updateRings = (dt) => {
    const sync = trance > 0.6;
    const cx = lx;
    nextRing -= dt;
    if (nextRing <= 0) {
      const jitter = sync ? 0 : (rng() - 0.5) * 5;
      rings.push({ x: cx + jitter, r: 0, a: sync ? 1 : 0.75 + rng() * 0.35 });
      nextRing = sync ? RING_SYNC : RING_EVERY[0] + rng() * (RING_EVERY[1] - RING_EVERY[0]);
    }
    for (const g of rings) {
      g.r += P.ringSpeed * dt * (sync ? 0.85 : 1);
      // en trance, todos los anillos vuelven a un mismo centro
      if (sync) g.x += (cx - g.x) * ease(1.5, dt);
    }
    rings = rings.filter((g) => g.r < P.ringMax);
  };

  const updateWho = (dt) => {
    const n = [...WHO].length;
    who.t += dt;
    if (who.phase === 'idle') {
      if (t >= who.next) who = { ...who, phase: 'typing', t: 0, n: 0 };
    } else if (who.phase === 'typing') {
      who.n = Math.min(n, 1 + Math.floor(who.t / WHO_TYPE));
      if (who.t > n * WHO_TYPE) who = { ...who, phase: 'hold', t: 0 };
    } else if (who.phase === 'hold') {
      if (who.t > WHO_HOLD) who = { ...who, phase: 'erasing', t: 0 };
    } else if (who.phase === 'erasing') {
      who.n = Math.max(0, n - Math.floor(who.t / WHO_ERASE));
      if (who.n === 0) who = { phase: 'idle', t: 0, n: 0, next: t + 55 + rng() * 35 };
    }
  };

  const setGrid = (g) => {
    const fx = g.cols / cols;
    const fy = g.rows / rows;
    cols = g.cols;
    rows = g.rows;
    P = paramsFor(g);
    lx *= fx;
    ly *= fy;
    px = null;
    rings = [];
    heat = new Float32Array(cols * rows);
    const b = bounds();
    lx = clamp(lx, b.x0, b.x1);
    ly = clamp(ly, b.y0, b.y1);
    burn(flameT);
  };

  burn(0);
  // el agua ya venía abriendo anillos
  for (let i = 0; i < 60 * 14; i++) updateRings(1 / 60);

  // ——— cuadro ———
  const drawLighter = (buf, dim) => {
    const gc = Math.floor(lx);
    const gr = Math.floor(ly / 2);
    const b = 0.34 * dim;
    const hi = 0.5 * dim;
    // la chimenea con sus agujeros, la bisagra, el cuerpo
    put(buf, gc - 1, gr - 1, G['['], hi, TONE.PALE);
    put(buf, gc + 1, gr - 1, G[']'], hi, TONE.PALE);
    putText(buf, gc - 2, gr, '.===.', hi, TONE.PALE);
    put(buf, gc - 2, gr + 1, G['|'], b, TONE.PALE);
    put(buf, gc + 2, gr + 1, G['|'], b * 0.7, TONE.PALE);
    put(buf, gc - 2, gr + 2, G['|'], b, TONE.PALE);
    put(buf, gc + 2, gr + 2, G['|'], b * 0.7, TONE.PALE);
    putText(buf, gc - 2, gr + 3, "'---'", b * 0.8, TONE.PALE);
    for (let c = gc - 1; c <= gc + 1; c++) for (let r = gr + 1; r <= gr + 2; r++) put(buf, c, r, 0, 0, TONE.PALE);
  };

  return {
    id: 'cure',

    step(dt, input = {}) {
      reduced = !!input.reduced;
      t += dt;
      steps++;
      const b = bounds();
      if (reduced) {
        // quieto: la llama no titila, nada se mueve
        lx = clamp(P.rest.x, b.x0, b.x1);
        ly = clamp(P.rest.y, b.y0, b.y1);
        lean = 0;
        trance = 0;
        still = 0;
        px = null;
        burn(0);
        return;
      }
      const p = input.pointer;
      const tx = clamp(p ? p.x : P.rest.x, b.x0, b.x1);
      const ty = clamp(p ? p.y + 0.6 : P.rest.y, b.y0, b.y1);
      const ox = lx;
      const k = ease(p ? FOLLOW : 1.2, dt);
      lx += (tx - lx) * k;
      ly += (ty - ly) * k;
      vx = (lx - ox) / dt;
      // la llama se recuesta contra el movimiento
      lean += (clamp(-vx * 0.075, -1, 1) - lean) * ease(6, dt);
      // quieto frente a la llama: el trance
      if (p) {
        const moved = px == null ? 0 : Math.hypot(p.x - px, p.y - py) / dt;
        still = moved < 2.5 ? still + dt : 0;
        px = p.x;
        py = p.y;
      } else {
        still = 0;
        px = null;
      }
      const want = smooth(TRANCE_S, TRANCE_S + 1.2, still);
      trance += (want - trance) * ease(want > trance ? 3 : 6, dt);
      if (trance > 0.95) deep = true;
      if (deep && trance < 0.6) {
        deep = false;
        trigger('trance');
      }
      flameT += dt * (1 - 0.72 * trance);
      if (t >= nextX) trigger('timer');
      updateRings(dt);
      updateWho(dt);
      burn(flameT);
    },

    write(buf) {
      const d8 = buf.data;
      const dim = 1 - 0.35 * trance;
      const ft = reduced ? 0 : flameT;
      const tt = reduced ? 0 : t;
      const gc = Math.floor(lx);
      const gr = Math.floor(ly / 2);
      const fy = (gr - 1 - P.fh * 0.45) * 2; // el centro de la luz
      const fx = gc + 0.5;
      const glow = 0.85 + 0.15 * noise2(ft * 3, 1.7, seed);
      // 1 · la oscuridad: pared y piso
      for (let r = 0; r < rows; r++) {
        const floor = r >= P.horizon;
        for (let c = 0; c < cols; c++) {
          const k = (r * cols + c) * 4;
          const dl = Math.hypot(c + 0.5 - fx, (r + 0.5) * 2 - fy);
          const light = Math.exp(-(dl * dl) / 260) * glow;
          d8[k] = 0;
          d8[k + 1] = 0;
          d8[k + 2] = TONE.PALE;
          d8[k + 3] = Math.round(clamp((floor ? 0.32 : 0.5) * (1 - 0.6 * trance) + light * 0.6, 0, 1) * 255);
        }
      }
      // un polvo apenas, donde llega la luz
      for (let r = 0; r < P.horizon; r++) {
        for (let c = 0; c < cols; c++) {
          const dl = Math.hypot(c + 0.5 - fx, (r + 0.5) * 2 - fy);
          if (dl > 13 || hash2(c, r, seed + 3) > 0.22) continue;
          const b = 0.16 * Math.exp(-(dl * dl) / 50) * glow * dim;
          if (b > 0.025) put(buf, c, r, G['.'], b, TONE.AMBER);
        }
      }
      // 2 · el agua: anillos en perspectiva, muy tenues
      const floorY = P.floorY;
      for (let r = P.horizon; r < rows; r++) {
        const y = (r + 0.5) * 2;
        const fade = smooth(P.horizon, P.horizon + 2.5, r);
        for (let c = 0; c < cols; c++) {
          let best = 0;
          let gi = -1;
          for (const g of reduced ? [] : rings) {
            const dx = c + 0.5 - g.x;
            const dy = (y - floorY) / P.squash;
            const d = Math.hypot(dx, dy);
            const s = Math.abs(dy) / (d || 1);
            const bw = 1.25 * (1 + 0.9 * s * s); // arriba y abajo, algo más gruesos: siguen visibles
            const u = (d - g.r) / bw;
            if (u <= -1 || u >= 1) continue;
            const a = g.a * Math.pow(1 - g.r / P.ringMax, 1.3) * smooth(0, 3, g.r) * (1 - u * u);
            if (a > best) {
              best = a;
              gi = Math.min(RIPPLE.length - 1, Math.floor(((u + 1) / 2) * RIPPLE.length));
            }
          }
          if (gi < 0 || best < 0.05) continue;
          // la cresta grande solo en los anillos fuertes
          const g = RIPPLE[gi] === G['0'] && best < 0.7 ? G.O : RIPPLE[gi] === G.O && best < 0.35 ? G.o : RIPPLE[gi];
          const dl = Math.hypot(c + 0.5 - fx, y - fy);
          const lit = Math.exp(-(dl * dl) / 500);
          put(buf, c, r, g, (0.05 + 0.2 * best) * fade * dim + lit * 0.1 * best, lit > 0.5 ? TONE.AMBER : TONE.WATER);
        }
      }
      // estático: anillos quietos
      if (reduced) {
        for (const R of [P.ringMax * 0.12, P.ringMax * 0.26, P.ringMax * 0.42, P.ringMax * 0.6]) {
          for (let r = P.horizon; r < rows; r++) {
            const dy = ((r + 0.5) * 2 - floorY) / P.squash;
            for (let c = 0; c < cols; c++) {
              const d = Math.hypot(c + 0.5 - lx, dy);
              const s = Math.abs(dy) / (d || 1);
              const u = (d - R) / (1.25 * (1 + 0.9 * s * s));
              if (u <= -1 || u >= 1) continue;
              const gi = Math.min(RIPPLE.length - 1, Math.floor(((u + 1) / 2) * RIPPLE.length));
              put(buf, c, r, RIPPLE[gi], 0.16 * (1 - R / P.ringMax) * (1 - u * u) + 0.05, TONE.WATER);
            }
          }
        }
      }
      // 3 · la llama, reflejada en el agua (rota por los anillos)
      if (gr + 3 < P.horizon) {
        for (let j = 0; j < rows - P.horizon - 1; j++) {
          const rr = P.horizon + 1 + j;
          const src = gr - 1 - Math.round(j / 0.55);
          if (src < 0 || src < flame.r0) break;
          const wob = Math.round(Math.sin(rr * 1.9 + tt * 2.2) * 0.8);
          for (let c = gc - 3; c <= gc + 3; c++) {
            const h = heat[src * cols + c] || 0;
            if (h < 0.15) continue;
            const g = MIRROR[Math.min(MIRROR.length - 1, Math.floor(h * MIRROR.length * 0.8))];
            put(buf, c + wob, rr, g, h * 0.3 * (1 - j / 10) * dim, TONE.AMBER);
          }
        }
      }
      // 4 · el encendedor
      drawLighter(buf, dim);
      // 5 · la llama
      for (let r = flame.r0; r <= flame.r1; r++) {
        for (let c = flame.c0; c <= flame.c1; c++) {
          const h = heat[r * cols + c];
          if (h < 0.06) continue;
          const g = FIRE[Math.min(FIRE.length - 1, Math.floor(h * (FIRE.length - 0.01)))];
          put(buf, c, r, g, 0.22 + h * 1.05, TONE.AMBER);
        }
      }
      // 6 · あんた誰？, abajo, como un subtítulo
      if (who.phase !== 'idle' && !reduced) {
        const text = [...WHO].slice(0, who.n).join('');
        const c0 = Math.floor((cols - textWidth(WHO)) / 2);
        const r = rows - 3;
        for (let c = c0 - 1; c < c0 + textWidth(WHO) + 1; c++) put(buf, c, r, 0, 0, TONE.PALE);
        putText(buf, c0, r, text, 0.42, TONE.GHOST);
      }
      // 7 · la X: un solo cuadro, dos tajos de \ y / de lado a lado
      lastX = false;
      if (xPending) {
        xPending = false;
        xFrames++;
        lastX = true;
        const thick = Math.max(3, Math.round(cols * 0.085));
        for (let r = 0; r < rows; r++) {
          const along = ((r + 0.5) / rows) * cols;
          for (const [x, g] of [[along, G['\\']], [cols - along, G['/']]]) {
            for (let c = Math.floor(x - thick / 2); c <= Math.ceil(x + thick / 2); c++) {
              const e = Math.abs(c + 0.5 - x) / (thick / 2);
              if (e > 1 || (e > 0.7 && hash2(c, r, seed + 9) < 0.4)) continue;
              put(buf, c, r, g, 1.35 + 0.5 * hash2(r, c, seed + 8), TONE.RED);
              shade(buf, c, r, 0.2);
            }
          }
        }
      }
    },

    resize(g) {
      setGrid(g);
    },

    dispose() {
      rings = [];
    },

    /** Introspección (pruebas y gancho de desarrollo). */
    state() {
      const gc = Math.floor(lx);
      const gr = Math.floor(ly / 2);
      return {
        t,
        steps,
        trance,
        still,
        xTriggers,
        xFrames,
        lastX,
        xLog: xLog.slice(),
        flame: { ...flame },
        lighter: { c0: gc - 2, c1: gc + 2, r0: gr - 1, r1: gr + 3, x: lx, y: ly },
        heat,
        rings: rings.length,
        who: who.phase,
        params: P,
      };
    },

    debug: {
      x() {
        trigger('debug');
      },
      who() {
        who = { phase: 'typing', t: 0, n: 0, next: t };
      },
    },
  };
}

export default {
  id: 'cure',
  meta: { number: 2, key: 'cure' },
  create,
};
