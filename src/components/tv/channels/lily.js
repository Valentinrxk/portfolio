// CH3 リリイ・シュシュのすべて (All About Lily Chou-Chou, 岩井俊二, 2001):
// el arrozal verde bajo un cielo nublado, el viento que lo peina en olas, una
// figura lejana con auriculares, y arriba, el foro que se escribe solo.
// Puro, sin DOM. Coordenadas isótropas: x en anchos de celda, y = fila × 2.
import { G, TONE, put, putText, shade, hash2, noise2 } from '../cells.js';
import { POSTS } from '../texts.js';

export const LEAN_MAX = 1.3;
const TYPE_S = 0.085; // s por letra
const PAUSE = [1.6, 3.4]; // s entre mensajes
const GUST_V = 26; // unidades de suelo por s
const GUST_EVERY = [4, 9]; // ráfagas solas, s

// la figura (3 × 3): la cabeza entre los auriculares, los hombros y, adelante,
// el arroz que la tapa de la cintura para abajo. Los espacios borran.
const FIGURE = ['.o.', '/ \\', '"""'];
const FIGURE_B = [[0.32, 0.62, 0.32], [0.5, 0, 0.5], [0.55, 0.55, 0.55]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function layoutFor({ cols, rows }) {
  const band = clamp(Math.round(rows * 0.17), 5, 7);
  const horizon = Math.round(rows * 0.36);
  return {
    W: cols,
    H: rows * 2,
    band0: 1,
    band1: band, // última fila de la franja
    horizon,
    margin: Math.max(3, Math.round(cols * 0.07)),
    figC: Math.round(cols * 0.63),
    figR: horizon + 2, // la fila del arroz que la tapa
  };
}

function create(grid, rng) {
  let cols = grid.cols;
  let rows = grid.rows;
  let L = layoutFor(grid);
  const seed = Math.floor(rng() * 4294967296);
  let t = 0;
  let reduced = false;
  let stalks = [];
  let wind = 0.2;
  let gusts = [];
  let nextGust = GUST_EVERY[0] + rng() * (GUST_EVERY[1] - GUST_EVERY[0]);
  let cool = 0;
  let lastPx = null;
  let still = null; // el campo quieto (movimiento reducido)
  // el foro
  const order = POSTS.map((p, i) => [hash2(i, 5, seed), p]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  let post = 0;
  let lines = []; // { text, n }
  let typing = null;
  let wait = 0.8;

  const depthOf = (rb) => (rb - L.horizon) / Math.max(1, rows - 1 - L.horizon);
  const persp = (d) => 0.32 + 0.68 * clamp(d, 0, 1.3);
  const riceTone = (d) => (d < 0.12 ? TONE.HAZE : TONE.GREEN);

  // matas de arroz: lejos, una hoja; cerca, tres en abanico (\|/), las más
  // cercanas con una fila más de puntas
  const plant = () => {
    stalks = [];
    for (let rb = L.horizon; rb < rows + 1; rb++) {
      const d = depthOf(rb);
      // el paso de hojas sueltas a matas, escalonado: sin costura
      const wide = d >= 0.28 + 0.16 * hash2(rb, 11, seed);
      const step = wide ? 3 : 1;
      const shift = wide ? Math.floor(hash2(rb, 3, seed) * 3) : 0;
      for (let c = shift - (wide ? 1 : 0); c < cols + 1; c += step) {
        if (!wide && hash2(c, rb, seed) > 0.995) continue;
        const h = hash2(rb, c, seed + 1);
        stalks.push({
          c,
          rb,
          d,
          wide,
          tall: d >= 0.62,
          ear: hash2(c, rb, seed + 5) < 0.35, // una espiga que cuelga
          ph: h * 6.283,
          fan: 0.42 + 0.22 * hash2(c, rb, seed + 6), // cuánto se abren las hojas
          k: 18 + 10 * hash2(c, rb, seed + 2),
          th: 0,
          w: 0,
        });
      }
    }
  };
  plant();

  // la ola que pasa por un tallo, 0..1: también lo ilumina
  const crest = (s, tt) => {
    const sign = wind >= 0 ? 1 : -1;
    const xe = (s.c + 0.5 - L.W / 2) / persp(s.d);
    const z = (1 - Math.min(1, s.d)) * 14;
    const a = 0.5 + 0.5 * Math.sin(0.21 * xe - sign * 1.5 * tt + 0.33 * z + s.ph * 0.15);
    const b = 0.5 + 0.5 * Math.sin(0.09 * xe - sign * 0.8 * tt - 0.21 * z + 1.7);
    return Math.min(1, a * a * a + 0.45 * b * b);
  };

  // la fuerza del viento sobre un tallo
  const force = (s, tt) => {
    const sign = wind >= 0 ? 1 : -1;
    const xe = (s.c + 0.5 - L.W / 2) / persp(s.d);
    const z = (1 - Math.min(1, s.d)) * 14;
    const mag = 0.2 + 0.55 * Math.abs(wind);
    const a = 0.5 + 0.5 * Math.sin(0.21 * xe - sign * 1.5 * tt + 0.33 * z + s.ph * 0.15);
    const b = 0.5 + 0.5 * Math.sin(0.09 * xe - sign * 0.8 * tt - 0.21 * z + 1.7);
    let f = wind * 0.5 + sign * mag * (a * a * a + 0.45 * b * b);
    for (const g of gusts) {
      const front = g.x + g.dir * GUST_V * g.age;
      const u = (xe - front) / 7;
      f += g.s * g.dir * 1.25 * Math.exp(-u * u);
      // una ráfaga fuerte agacha todo el campo
      if (g.s > 0.6) f += (g.s - 0.35) * g.dir * 1.5 * Math.exp(-g.age / 1.1) * Math.min(1, g.age / 0.2);
    }
    return clamp(f, -1.2, 1.2);
  };

  const gust = (x, dir, s) => {
    gusts.push({ x, dir: dir >= 0 ? 1 : -1, s: clamp(s, 0, 1), age: 0 });
    if (gusts.length > 12) gusts.shift();
  };

  const freeze = () => {
    still = new Float32Array(stalks.length);
    stalks.forEach((s, i) => {
      still[i] = force(s, 0) * 0.8;
    });
  };

  const typeStep = (dt) => {
    const max = L.band1 - L.band0 - 1;
    if (typing) {
      typing.t += dt;
      typing.n = Math.min([...typing.text].length, Math.floor(typing.t / TYPE_S));
      if (typing.n === [...typing.text].length) {
        typing = null;
        wait = PAUSE[0] + rng() * (PAUSE[1] - PAUSE[0]);
      }
      return;
    }
    wait -= dt;
    if (wait > 0) return;
    typing = { text: order[post++ % order.length], n: 0, t: 0 };
    lines.push(typing);
    while (lines.length > max) lines.shift();
  };

  return {
    id: 'lily',

    step(dt, input = {}) {
      reduced = !!input.reduced;
      if (reduced) {
        if (!still || still.length !== stalks.length) freeze();
        return;
      }
      still = null;
      t += dt;
      // ——— el viento: inclinación, cursor, o el viento solo ———
      const p = input.pointer;
      const tilt = num(input.tilt);
      const amb = 0.22 + 0.24 * (noise2(t * 0.06, 0.5, seed) - 0.5);
      let want = amb;
      if (tilt != null && Math.abs(tilt) > 2) want = clamp((tilt - Math.sign(tilt) * 2) / 28, -1, 1);
      else if (p && p.mouse && !p.down && num(p.x) != null) want = clamp(((p.x / L.W) - 0.5) * 1.8, -1, 1);
      wind = clamp(wind + (want - wind) * ease(1.3, dt), -1, 1);
      // arrastrar (o mover el cursor) de costado manda una ráfaga
      cool -= dt;
      const px = p && num(p.x) != null ? clamp(p.x, -L.W, L.W * 2) : null;
      if (px != null && lastPx != null && (p.down || p.mouse)) {
        const vx = (px - lastPx) / dt;
        if (Math.abs(vx) > 14 && cool <= 0) {
          const y = num(p.y) ?? L.horizon * 2;
          const d = clamp(depthOf(Math.floor(y / 2)), 0, 1);
          gust((px - L.W / 2) / persp(d), Math.sign(vx), Math.abs(vx) / 120);
          cool = 0.18;
        }
      }
      lastPx = px;
      // y ráfagas solas, a favor del viento
      nextGust -= dt;
      if (nextGust <= 0) {
        const dir = wind >= 0 ? 1 : -1;
        gust((-dir * L.W) / 0.6, dir, 0.22 + rng() * 0.22);
        nextGust = GUST_EVERY[0] + rng() * (GUST_EVERY[1] - GUST_EVERY[0]);
      }
      for (const g of gusts) g.age += dt;
      gusts = gusts.filter((g) => g.age < 5);
      // ——— los tallos: resortes ———
      for (const s of stalks) {
        const f = force(s, t);
        s.w += (s.k * (f - s.th) - 3.4 * s.w) * dt;
        s.th += s.w * dt;
        if (s.th > LEAN_MAX || s.th < -LEAN_MAX) {
          s.th = clamp(s.th, -LEAN_MAX, LEAN_MAX);
          s.w = 0;
        }
      }
      typeStep(dt);
    },

    write(buf) {
      const d8 = buf.data;
      const tt = reduced ? 0 : t;
      // 1 · fondo: la franja negra, el cielo pálido, el campo
      for (let r = 0; r < rows; r++) {
        const s = r >= L.band0 && r <= L.band1 ? 0 : r < L.horizon ? 0.95 : 0.55 + 0.25 * (1 - depthOf(r));
        for (let c = 0; c < cols; c++) {
          const k = (r * cols + c) * 4;
          d8[k] = 0;
          d8[k + 1] = 0;
          d8[k + 2] = TONE.PALE;
          d8[k + 3] = Math.round(s * 255);
        }
      }
      // 2 · el cielo nublado: nubes de - y ~, apenas
      for (let r = L.band1 + 1; r < L.horizon; r++) {
        for (let c = 0; c < cols; c++) {
          const n = noise2((c + tt * 0.35) * 0.08, r * 0.45, seed + 7);
          if (n < 0.58 || hash2(c, r, seed + 9) < 0.25) continue;
          const g = hash2(c, r, seed + 8) < 0.7 ? G['-'] : G['~'];
          put(buf, c, r, g, 0.05 + (n - 0.58) * 0.4, TONE.PALE);
        }
      }
      // 3 · el campo: de lejos a cerca; la figura, entre medio
      const drawFigure = () => {
        FIGURE.forEach((row, i) => {
          const r = L.figR - (FIGURE.length - 1) + i;
          const tone = i === FIGURE.length - 1 ? riceTone(depthOf(r)) : TONE.PALE;
          [...row].forEach((ch, j) => {
            const c = L.figC - 1 + j;
            put(buf, c, r, G[ch], FIGURE_B[i][j], tone);
            shade(buf, c, r, 0.4);
          });
        });
      };
      let drawn = false;
      stalks.forEach((s, i) => {
        if (!drawn && s.rb > L.figR) {
          drawFigure();
          drawn = true;
        }
        const th = still ? still[i] : s.th;
        const near = Math.min(1, s.d);
        const lean = th * (0.35 + 0.85 * near);
        // las hojas dobladas por la ola brillan: el viento se ve pasar
        const wave = crest(s, tt);
        const sheen = 0.5 + 0.62 * wave + 0.25 * Math.min(1, Math.abs(th) * 0.8);
        const base = Math.min(1.15, (0.56 + 0.6 * Math.pow(near, 0.7)) * sheen);
        const tone = riceTone(near);
        if (s.rb >= rows + 1) return;
        if (!s.wide) {
          // lejos: una hoja, textura fina
          const h = hash2(s.c, s.rb, seed + 3);
          const ch = lean > 0.38 ? '/' : lean < -0.38 ? '\\' : h < 0.45 ? "'" : h < 0.8 ? ',' : '"';
          put(buf, s.c, s.rb, G[ch], base * 0.9, tone);
          return;
        }
        // cerca: tres hojas en abanico que se doblan juntas
        const leaf = (a) => (a < -0.42 ? '\\' : a > 0.42 ? '/' : '|');
        put(buf, s.c - 1, s.rb, G[leaf(-s.fan + lean)], base * 0.8, tone);
        put(buf, s.c, s.rb, G[leaf(lean * 0.9)], base * 0.9, tone);
        put(buf, s.c + 1, s.rb, G[leaf(s.fan + lean)], base * 0.8, tone);
        if (s.tall) {
          const off = Math.round(lean * 1.1);
          const ch = s.ear ? (Math.abs(lean) > 0.7 ? ',' : Math.abs(lean) > 0.3 ? "'" : '"') : leaf(lean * 1.3);
          put(buf, s.c + off, s.rb - 1, G[ch], Math.min(1.1, base * 1.05), tone);
        }
      });
      if (!drawn) drawFigure();
      // 4 · el foro: renglones que suben y se apagan
      const max = L.band1 - L.band0 - 1;
      const shown = reduced ? order.slice(0, max).map((text) => ({ text, n: [...text].length })) : lines;
      shown.forEach((ln, i) => {
        const r = L.band0 + 1 + i + (max - shown.length);
        const age = shown.length - 1 - i;
        const b = [1.0, 0.68, 0.46, 0.3, 0.2][Math.min(4, age)];
        const text = [...ln.text].slice(0, ln.n).join('');
        const end = putText(buf, L.margin, r, text, b, TONE.PALE);
        if (!reduced && ln === typing && Math.floor(tt * 2.4) % 2 === 0) put(buf, end, r, G._, b, TONE.PALE);
      });
    },

    resize(g) {
      cols = g.cols;
      rows = g.rows;
      L = layoutFor(g);
      plant();
      still = null;
      gusts = [];
      lastPx = null;
    },

    dispose() {
      stalks = [];
    },

    /** Introspección (pruebas y gancho de desarrollo). */
    state() {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      for (const s of stalks) {
        min = Math.min(min, s.th);
        max = Math.max(max, s.th);
        sum += s.th;
      }
      const cells = [];
      FIGURE.forEach((row, i) => {
        [...row].forEach((ch, j) => {
          cells.push([L.figC - 1 + j, L.figR - (FIGURE.length - 1) + i, ch]);
        });
      });
      return {
        t,
        stalks: stalks.length,
        wind,
        gusts: gusts.map((g) => ({ s: g.s, dir: g.dir, age: g.age })),
        lean: { min, max, mean: sum / Math.max(1, stalks.length) },
        figure: { c: L.figC, r: L.figR, cells },
        lines: lines.map((l) => l.text),
        layout: L,
      };
    },

    debug: {
      gust(dir = 1, s = 1) {
        gust((-dir * L.W) / 0.6, dir, s);
      },
    },
  };
}

export default {
  id: 'lily',
  meta: { number: 3, key: 'lily', scene: 'dark' },
  create,
};
