// CH1 回路 (Kairo, 黒沢清, 2001): el programa de los puntos.
// Si dos se acercan demasiado, mueren; si se alejan demasiado, se buscan.
// Puro, sin DOM. Coordenadas isótropas: x en anchos de celda, y = fila × 2.
import { G, TONE, put, putText, textWidth, hash2 } from '../cells.js';

const QUESTION = '幽霊に会いたいですか？';
const WANDER = 0.9; // rad/s de deriva
const SEEK = 0.85;
const LURE = 1.1;
const TURN = 2.4; // rad/s
const TRAIL = 4;
const TRAIL_S = 1.3;
const STAIN_IN = 0.9; // la mancha se embebe
const STAIN_HOLD = 45; // s enteras
const STAIN_FADE = 150; // s hasta irse
const STAIN_OUT = 2.5; // pasado el tope, las más viejas se van en esto
const BURST_FRAMES = 2; // cuadros dibujados, no pasos

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** Letra para un trazo (dc columnas, dr filas): el ángulo se mide en píxeles. */
export function lineGlyph(dc, dr) {
  let a = (Math.atan2(dr * 2, dc) * 180) / Math.PI;
  if (a < 0) a += 180;
  if (a >= 180) a -= 180;
  if (a < 22.5 || a >= 157.5) return '-';
  if (a < 67.5) return '\\';
  if (a < 112.5) return '|';
  return '/';
}

export function paramsFor({ cols, rows }) {
  const W = cols;
  const H = rows * 2;
  const s = Math.sqrt(W * H) / 54; // 1 ≈ teléfono
  const rDie = 1.9 + 0.35 * s;
  const rLine = 10.5 * Math.pow(s, 0.85);
  return {
    W,
    H,
    s,
    rDie,
    rDanger: rDie * 2.6,
    rLine,
    rFar: rLine * 1.5,
    rLure: Math.max(W, H) * 0.95,
    speed: 2.1 * Math.pow(s, 0.8),
    target: clamp(Math.round((W * H) / 160), 14, 26),
    // tope blando: más de 18 y las viejas se borran rápido; el duro, por si acaso
    stainCap: 18,
    maxStains: 32,
    // el área de los puntos: adentro de la cinta
    x0: 3.5,
    x1: W - 3.5,
    y0: 5,
    y1: H - 5,
  };
}

function create(grid, rng) {
  let P = paramsFor(grid);
  let cols = grid.cols;
  let rows = grid.rows;
  const seed = Math.floor(rng() * 4294967296);
  let nextId = 0;
  let t = 0;
  let phase = 'live';
  let phaseT = 0;
  let typed = 0;
  let dots = [];
  let stains = [];
  let bursts = [];
  let events = [];
  let spawned = [];
  let finger = null;
  let presence = 0;
  let held = 0; // cuánto lleva el dedo apoyado
  let spawnT = 2;
  let refill = 0; // tras la pregunta, vuelven más rápido
  let tape = [];
  let wall = null; // por celda: letra y brillo base
  let field = null; // oscuridad de las manchas por celda
  let fieldDirty = true;
  let fieldAge = 0;
  let steps = 0;

  const newDot = (x, y, th) => ({
    id: nextId++,
    x,
    y,
    th,
    v: 0.75 + rng() * 0.5,
    f1: 0.25 + rng() * 0.6,
    f2: 0.7 + rng() * 0.9,
    p1: rng() * Math.PI * 2,
    p2: rng() * Math.PI * 2,
    fear: rng() * 0.16, // algunos se animan más
    age: 0,
    hes: -1, // la duda antes del dedo
    cell: -1,
    trail: [],
  });

  // ——— la pared, la cinta ———
  const buildWall = () => {
    wall = new Float32Array(cols * rows * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const h = hash2(c, r, seed);
        const i = (r * cols + c) * 2;
        if (h < 0.15) {
          wall[i] = G['.'];
          wall[i + 1] = 0.1 + hash2(c, r, seed + 1) * 0.07;
        } else if (h < 0.19) {
          wall[i] = G[':'];
          wall[i + 1] = 0.09 + hash2(c, r, seed + 2) * 0.05;
        } else if (h < 0.198) {
          wall[i] = G["'"];
          wall[i + 1] = 0.1;
        }
      }
    }
  };

  // cinta roja: un poco torcida, gastada, con un corte
  const buildTape = () => {
    tape = [];
    const R = (k) => hash2(k, 77, seed);
    const strip = (cells, glyph, key) => {
      const gap = 0.3 + R(key) * 0.4;
      cells.forEach(([c, r], i) => {
        const f = i / cells.length;
        if (Math.abs(f - gap) < 1.2 / cells.length) return; // el corte
        const worn = hash2(i, key, seed) < 0.06;
        tape.push({ c, r, g: worn ? G['-'] : G[glyph], b: 0.26 + hash2(i, key + 9, seed) * 0.12 });
      });
    };
    const top = [];
    const bottom = [];
    const left = [];
    const right = [];
    // una tira lateral quedó corta: se despegó
    const torn = Math.floor(rows * (0.62 + R(1) * 0.2));
    for (let c = 2; c <= cols - 3; c++) {
      top.push([c, 1]);
      bottom.push([c, rows - 2]);
    }
    for (let r = 2; r <= rows - 3; r++) {
      left.push([1, r]);
      if (r < torn) right.push([cols - 2, r]);
    }
    strip(top, '=', 11);
    strip(bottom, '=', 12);
    strip(left, '|', 13);
    strip(right, '|', 14);
    // dos tiras cruzan esquinas opuestas: una columna por fila (el trazo
    // de / o \ a toda altura empalma con el de la fila siguiente), doble ancho
    const len = Math.max(5, Math.round(rows * 0.22));
    const corner = (c0, r0, dc, dr, key) => {
      const cells = [];
      for (let i = 0; i < len; i++) cells.push([c0 + dc * i, r0 + dr * i], [c0 + dc * (i + 1), r0 + dr * i]);
      strip(cells, dc * dr > 0 ? '\\' : '/', key);
    };
    if (R(3) < 0.5) {
      corner(0, len, 1, -1, 21); // arriba a la izquierda
      corner(cols - 1, rows - 1 - len, -1, 1, 22); // abajo a la derecha
    } else {
      corner(cols - 1, len, -1, -1, 23); // arriba a la derecha
      corner(0, rows - 1 - len, 1, 1, 24); // abajo a la izquierda
    }
  };

  // ——— manchas (シミ): humo vertical, irregular ———
  const addStain = (x, y) => {
    const k = stains.length;
    stains.push({
      x,
      y,
      r: P.rDie * 0.85,
      born: t,
      str: 0,
      // dos manchas menores, arriba y abajo
      ox1: (hash2(k, nextId, seed) - 0.5) * 1.6,
      ox2: (hash2(nextId, k, seed) - 0.5) * 1.6,
      up: 0.9 + hash2(k, 3, seed + nextId) * 0.7,
    });
    if (stains.length > P.maxStains) stains.shift();
    fieldDirty = true;
  };

  const buildField = () => {
    if (!field || field.length !== cols * rows) field = new Float32Array(cols * rows);
    field.fill(0);
    const keep = new Float32Array(cols * rows).fill(1);
    for (const s of stains) {
      if (s.str <= 0.002) continue;
      const sx = s.r;
      const sy = s.r * 1.55;
      const blobs = [
        [0, 0, 1],
        [s.ox1, -sy * s.up, 0.62],
        [s.ox2, sy * 0.95, 0.7],
      ];
      for (const [bx, by, bs] of blobs) {
        const cx = s.x + bx;
        const cy = s.y + by;
        const rx = sx * bs;
        const ry = sy * bs;
        const c0 = Math.max(0, Math.floor(cx - rx * 3));
        const c1 = Math.min(cols - 1, Math.ceil(cx + rx * 3));
        const r0 = Math.max(0, Math.floor((cy - ry * 3) / 2));
        const r1 = Math.min(rows - 1, Math.ceil((cy + ry * 3) / 2));
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const dx = (c + 0.5 - cx) / rx;
            const dy = ((r + 0.5) * 2 - cy) / ry;
            const g = Math.exp(-0.5 * (dx * dx + dy * dy)) * (0.8 + 0.4 * hash2(c, r, seed + 5));
            keep[r * cols + c] *= 1 - Math.min(1, g * 1.25 * s.str);
          }
        }
      }
    }
    for (let i = 0; i < field.length; i++) field[i] = 1 - keep[i];
    fieldDirty = false;
    fieldAge = 0;
  };

  // ——— vida ———
  const cellOf = (x, y) => clamp(Math.floor(y / 2), 0, rows - 1) * cols + clamp(Math.floor(x), 0, cols - 1);

  const spawn = () => {
    const n = dots.length;
    let best = null;
    for (let k = 0; k < 8; k++) {
      const side = Math.floor(rng() * 4);
      const u = rng();
      const x = side === 0 ? P.x0 : side === 1 ? P.x1 : P.x0 + u * (P.x1 - P.x0);
      const y = side === 2 ? P.y0 : side === 3 ? P.y1 : P.y0 + u * (P.y1 - P.y0);
      let nd = Infinity;
      for (const d of dots) nd = Math.min(nd, Math.hypot(d.x - x, d.y - y));
      if (!best || nd > best.nd) best = { x, y, nd, side };
      if (nd > P.rFar * 0.6) break;
    }
    const inward = [0, Math.PI, Math.PI / 2, -Math.PI / 2][best.side];
    const d = newDot(best.x, best.y, inward + (rng() - 0.5) * 1.2);
    dots.push(d);
    spawned.push(d.id);
    return n + 1;
  };

  const seedDots = () => {
    dots = [];
    for (let i = 0; i < P.target; i++) {
      let x = 0;
      let y = 0;
      for (let k = 0; k < 30; k++) {
        x = P.x0 + rng() * (P.x1 - P.x0);
        y = P.y0 + rng() * (P.y1 - P.y0);
        if (dots.every((d) => Math.hypot(d.x - x, d.y - y) > P.rLine * 0.55)) break;
      }
      const d = newDot(x, y, rng() * Math.PI * 2);
      d.age = 2;
      dots.push(d);
    }
  };

  const kill = (a, b, isFinger) => {
    const ax = a.x;
    const ay = a.y;
    const bx = b.x;
    const by = b.y;
    const x = (ax + bx) / 2;
    const y = (ay + by) / 2;
    events.push({ a: a.id, b: isFinger ? 'finger' : b.id, ax, ay, bx, by, d: Math.hypot(ax - bx, ay - by), t });
    addStain(x, y);
    if (!reduced) bursts.push({ x, y, shown: 0, age: 0 });
  };

  let reduced = false;

  const move = (dt) => {
    const k = reduced ? 0.3 : 1;
    for (const d of dots) {
      let nd = Infinity;
      let nx = 0;
      let ny = 0;
      for (const o of dots) {
        if (o === d) continue;
        const dx = o.x - d.x;
        const dy = o.y - d.y;
        const dd = Math.hypot(dx, dy);
        if (dd < nd) {
          nd = dd;
          nx = dx;
          ny = dy;
        }
      }
      d.th += (Math.sin(t * d.f1 + d.p1) + 0.6 * Math.sin(t * d.f2 + d.p2)) * WANDER * dt * k;
      let vx = Math.cos(d.th);
      let vy = Math.sin(d.th);
      // soledad: lejos de todos, busca al más cercano
      if (nd > P.rFar && nd < Infinity) {
        const w = SEEK * Math.min(1, 0.3 + (nd - P.rFar) / P.rFar);
        vx += (nx / nd) * w;
        vy += (ny / nd) * w;
      }
      // miedo: muy cerca, se aparta (no siempre a tiempo)
      if (nd < P.rDanger) {
        const w = d.fear * (1 - nd / P.rDanger);
        vx -= (nx / nd) * w;
        vy -= (ny / nd) * w;
      }
      // el dedo: atrae a todos; cerca, dudan antes del último paso
      let slow = 1;
      if (finger) {
        const fx = finger.x - d.x;
        const fy = finger.y - d.y;
        const fd = Math.hypot(fx, fy) || 1e-6;
        if (fd < P.rLure) {
          const w = LURE * presence * (0.1 + 0.9 * (1 - fd / P.rLure) ** 2.5);
          vx += (fx / fd) * w;
          vy += (fy / fd) * w;
          slow = 0.32 + 0.68 * smooth(P.rDie, P.rDie * 6, fd);
        }
        if (fd < P.rDie * 2.3 && d.hes < 0) d.hes = 0.8 + rng() * 1.8;
        else if (fd > P.rDanger) d.hes = -1;
        if (d.hes > 0) {
          d.hes = Math.max(0, d.hes - dt);
          slow *= d.hes > 0 ? 0.06 : 1;
        }
      } else d.hes = -1;
      // las paredes
      const edge = 4;
      if (d.x < P.x0 + edge) vx += ((P.x0 + edge - d.x) / edge) * 1.2;
      if (d.x > P.x1 - edge) vx -= ((d.x - (P.x1 - edge)) / edge) * 1.2;
      if (d.y < P.y0 + edge) vy += ((P.y0 + edge - d.y) / edge) * 1.2;
      if (d.y > P.y1 - edge) vy -= ((d.y - (P.y1 - edge)) / edge) * 1.2;
      const want = Math.atan2(vy, vx);
      const diff = wrap(want - d.th);
      const turn = TURN * dt * (finger ? 1.6 : 1);
      d.th += clamp(diff, -turn, turn);
      const sp = d.v * P.speed * slow * k * smooth(0, 1, d.age + 0.3);
      d.x = clamp(d.x + Math.cos(d.th) * sp * dt, P.x0, P.x1);
      d.y = clamp(d.y + Math.sin(d.th) * sp * dt, P.y0, P.y1);
      d.age += dt;
      const cell = cellOf(d.x, d.y);
      if (cell !== d.cell) {
        if (d.cell >= 0) d.trail.unshift({ cell: d.cell, t });
        if (d.trail.length > TRAIL) d.trail.pop();
        d.cell = cell;
      }
    }
  };

  const deaths = () => {
    const dead = new Set();
    for (let i = 0; i < dots.length; i++) {
      if (dead.has(i)) continue;
      for (let j = i + 1; j < dots.length; j++) {
        if (dead.has(j)) continue;
        const a = dots[i];
        const b = dots[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) <= P.rDie) {
          dead.add(i);
          dead.add(j);
          kill(a, b, false);
          break;
        }
      }
    }
    if (finger) {
      dots.forEach((d, i) => {
        if (!dead.has(i) && Math.hypot(d.x - finger.x, d.y - finger.y) <= P.rDie) {
          dead.add(i);
          kill(d, finger, true);
        }
      });
    }
    if (dead.size) dots = dots.filter((_, i) => !dead.has(i));
  };

  const respawn = (dt) => {
    if (dots.length >= P.target) {
      spawnT = Math.max(spawnT, 0.8);
      return;
    }
    // con el dedo apoyado llegan menos; si se queda, ya no viene nadie
    if (finger && refill <= 0 && held > 14) return;
    spawnT -= dt * (finger && refill <= 0 ? 0.5 : 1);
    if (spawnT > 0) return;
    spawn();
    const deficit = 1 - dots.length / P.target;
    if (refill > 0) {
      refill--;
      spawnT = 0.25 + rng() * 0.45;
    } else spawnT = (1.6 + rng() * 2.6) * (1 - 0.55 * deficit);
  };

  const ghost = (dt) => {
    phaseT += dt;
    const n = [...QUESTION].length;
    if (phase === 'void' && phaseT > 1.8) {
      phase = 'typing';
      phaseT = 0;
      typed = 0;
    } else if (phase === 'typing') {
      typed = Math.min(n, 1 + Math.floor(phaseT / 0.17));
      if (typed === n && phaseT > n * 0.17) {
        phase = 'hold';
        phaseT = 0;
      }
    } else if (phase === 'hold' && phaseT > 3.4) {
      phase = 'erasing';
      phaseT = 0;
    } else if (phase === 'erasing') {
      typed = Math.max(0, n - Math.floor(phaseT / 0.07));
      if (typed === 0 && phaseT > 0.6) {
        phase = 'live';
        phaseT = 0;
        refill = Math.ceil(P.target * 0.7);
        spawnT = 0;
      }
    }
  };

  const setGrid = (g) => {
    const old = P;
    cols = g.cols;
    rows = g.rows;
    P = paramsFor(g);
    const fx = P.W / old.W;
    const fy = P.H / old.H;
    for (const d of dots) {
      d.x = clamp(d.x * fx, P.x0, P.x1);
      d.y = clamp(d.y * fy, P.y0, P.y1);
      d.cell = -1;
      d.trail = [];
    }
    if (dots.length > P.target) dots.length = P.target;
    for (const s of stains) {
      s.x *= fx;
      s.y *= fy;
      s.r = P.rDie * 0.85;
    }
    bursts = [];
    buildWall();
    buildTape();
    fieldDirty = true;
  };

  buildWall();
  buildTape();
  seedDots();

  // ——— cuadro ———
  const PRI = { WALL: 0, LINE: 1, TRAIL: 2, DOT: 3, BURST: 4, TEXT: 5 };
  let pri = new Uint8Array(cols * rows);
  let lum = new Float32Array(cols * rows);

  const writeCell = (buf, c, r, g, b, tone, p) => {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    const i = r * cols + c;
    if (p < pri[i] || (p === pri[i] && b < lum[i])) return;
    pri[i] = p;
    lum[i] = b;
    put(buf, c, r, g, b, tone);
  };

  const line = (buf, ax, ay, bx, by, b) => {
    const c0 = Math.floor(ax);
    const r0 = Math.floor(ay / 2);
    const c1 = Math.floor(bx);
    const r1 = Math.floor(by / 2);
    const g = G[lineGlyph(bx - ax, (by - ay) / 2)];
    const n = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let i = 1; i < n; i++) {
      const f = i / n;
      // un pulso recorre el circuito
      const pulse = Math.max(0, Math.cos((f - ((t * 0.45) % 1)) * Math.PI * 2)) ** 12;
      writeCell(buf, Math.round(c0 + (c1 - c0) * f), Math.round(r0 + (r1 - r0) * f), g, b * (1 + pulse * 0.9), TONE.PALE, PRI.LINE);
    }
  };

  return {
    id: 'kairo',

    step(dt, input = {}) {
      reduced = !!input.reduced;
      t += dt;
      steps++;
      events = [];
      spawned = [];
      if (input.finger) {
        finger = { x: input.finger.x, y: input.finger.y };
        presence = Math.min(1, presence + dt / 0.25);
        held += dt;
      } else {
        finger = null;
        presence = 0;
        held = 0;
      }
      for (const b of bursts) b.age += dt;
      bursts = bursts.filter((b) => b.shown < BURST_FRAMES && b.age < 0.5);
      if (phase === 'live') {
        move(dt);
        deaths();
        // el último murió: no queda nadie
        if (dots.length === 0 && events.length) {
          phase = 'void';
          phaseT = 0;
        } else respawn(dt);
      } else ghost(dt);
      // manchas: se embeben rápido, se van en minutos
      let fresh = false;
      stains = stains.filter((s) => {
        const age = t - s.born;
        s.str = age < STAIN_IN ? age / STAIN_IN : 1 - clamp((age - STAIN_HOLD) / STAIN_FADE, 0, 1);
        if (s.out != null) {
          s.out += dt;
          s.str *= 1 - clamp(s.out / STAIN_OUT, 0, 1);
          fresh = true;
        }
        if (age < STAIN_IN + 0.1) fresh = true;
        return age < STAIN_HOLD + STAIN_FADE && !(s.out >= STAIN_OUT);
      });
      // nunca una masa: pasado el tope, las más viejas empiezan a irse
      for (let i = 0; i < stains.length - P.stainCap; i++) if (stains[i].out == null) stains[i].out = 0;
      fieldAge++;
      if (fieldDirty || (fresh && fieldAge >= 3) || fieldAge >= 90) buildField();
    },

    write(buf) {
      if (pri.length !== cols * rows) {
        pri = new Uint8Array(cols * rows);
        lum = new Float32Array(cols * rows);
      }
      if (!field || field.length !== cols * rows) buildField();
      pri.fill(0);
      lum.fill(0);
      const d8 = buf.data;
      // 1 · la pared; las manchas la borran y oscurecen
      for (let i = 0; i < cols * rows; i++) {
        const k = i * 4;
        const dark = field[i];
        const g = wall[i * 2];
        const shimmer = 0.85 + 0.15 * Math.sin(t * 0.37 + (i % 97) * 0.61);
        d8[k] = dark > 0.3 ? 0 : g;
        d8[k + 1] = Math.max(0, Math.round(wall[i * 2 + 1] * (1 - dark * 2.4) * shimmer * 127.5));
        d8[k + 2] = TONE.WALL;
        d8[k + 3] = Math.round((1 - 0.9 * dark) * 255);
      }
      // 2 · la cinta
      for (const s of tape) writeCell(buf, s.c, s.r, s.g, s.b, TONE.RED, PRI.LINE);
      // 3 · el circuito: cada uno, con sus dos más cercanos (y el dedo, con tres)
      const all = finger ? [...dots, { x: finger.x, y: finger.y, finger: true, age: 2 }] : dots;
      const edges = new Set();
      all.forEach((a, i) => {
        const reach = a.finger ? P.rLine * 1.25 : P.rLine;
        const near = [];
        all.forEach((b, j) => {
          if (j === i || (b.finger && !a.finger)) return;
          const dd = Math.hypot(a.x - b.x, a.y - b.y);
          if (dd < reach) near.push([dd, j]);
        });
        near.sort((p, q) => p[0] - q[0]);
        for (const [, j] of near.slice(0, a.finger ? 3 : 2)) edges.add(i < j ? i * 64 + j : j * 64 + i);
      });
      for (const e of edges) {
        const a = all[Math.floor(e / 64)];
        const b = all[e % 64];
        const reach = b.finger ? P.rLine * 1.25 : P.rLine;
        const near = Math.max(0, 1 - Math.hypot(a.x - b.x, a.y - b.y) / reach);
        const fade = Math.min(smooth(0, 1, a.age), smooth(0, 1, b.age));
        line(buf, a.x, a.y, b.x, b.y, (0.07 + 0.3 * near ** 1.3) * fade * (b.finger ? 1.35 : 1));
      }
      // 4 · rastros y puntos
      for (const d of dots) {
        const fade = smooth(0, 1, d.age);
        d.trail.forEach((s, n) => {
          const b = 0.4 * (1 - n / TRAIL) * (1 - clamp((t - s.t) / TRAIL_S, 0, 1)) * fade;
          if (b > 0.01) writeCell(buf, s.cell % cols, Math.floor(s.cell / cols), G['.'], b, TONE.PALE, PRI.TRAIL);
        });
      }
      for (const d of dots) {
        let nd = Infinity;
        for (const o of all) if (o !== d) nd = Math.min(nd, Math.hypot(o.x - d.x, o.y - d.y));
        const danger = nd < P.rDie * 1.8;
        writeCell(buf, Math.floor(d.x), Math.floor(d.y / 2), danger ? G['@'] : G.o, (danger ? 1.08 : 0.95) * smooth(0, 1, d.age), TONE.PALE, PRI.DOT);
      }
      if (finger) writeCell(buf, Math.floor(finger.x), Math.floor(finger.y / 2), G.o, 1.3 * presence + 0.2, TONE.PALE, PRI.DOT);
      // 5 · la muerte: dos cuadros de luz
      for (const b of bursts) {
        const c = Math.floor(b.x);
        const r = Math.floor(b.y / 2);
        if (b.shown++ === 0) {
          writeCell(buf, c, r, G['#'], 2, TONE.PALE, PRI.BURST);
          for (const [dc, dr, g] of [[-1, 0, '-'], [1, 0, '-'], [0, -1, '|'], [0, 1, '|'], [-2, 0, '-'], [2, 0, '-']]) {
            writeCell(buf, c + dc, r + dr, G[g], Math.abs(dc) === 2 ? 1.1 : 1.7, TONE.PALE, PRI.BURST);
          }
        } else {
          writeCell(buf, c, r, G['*'], 1.2, TONE.PALE, PRI.BURST);
          for (const [dc, dr, g] of [[-3, 0, '.'], [3, 0, '.'], [0, -2, "'"], [0, 2, '.'], [-2, -1, '`'], [2, -1, "'"], [-2, 1, ','], [2, 1, ',']]) {
            writeCell(buf, c + dc, r + dr, G[g], 1.0, TONE.PALE, PRI.BURST);
          }
        }
      }
      // 6 · la pregunta
      if (phase !== 'live' && phase !== 'void') {
        const text = [...QUESTION].slice(0, typed).join('');
        const c0 = Math.floor((cols - textWidth(QUESTION)) / 2);
        const r = Math.floor(rows / 2);
        const end = putText(buf, c0, r, text, 0.62, TONE.GHOST);
        const blink = phase !== 'erasing' && Math.floor(t * 2.2) % 2 === 0;
        if (blink && end < cols) put(buf, end, r, G._, 0.62, TONE.GHOST);
      }
    },

    resize(g) {
      setGrid(g);
    },

    dispose() {
      dots = [];
      stains = [];
      bursts = [];
    },

    /** Introspección (pruebas y gancho de desarrollo). */
    state() {
      return {
        phase,
        t,
        steps,
        bursts: bursts.map((b) => b.shown),
        dots: dots.map((d) => ({ id: d.id, x: d.x, y: d.y })),
        finger: finger && { ...finger },
        stains: stains.map((s) => ({ x: s.x, y: s.y, str: s.str })),
        events,
        spawned,
        target: P.target,
        params: P,
      };
    },

    debug: {
      /** Puntos en estas posiciones (isótropas), y nada más. */
      place(list) {
        dots = list.map((p) => {
          const d = newDot(p.x, p.y, 0);
          d.age = 2;
          return d;
        });
      },
      /** Todos mueren de a pares, cada par con su mancha. */
      extinguish() {
        const left = dots.slice();
        while (left.length > 1) {
          const a = left.shift();
          let k = 0;
          left.forEach((b, i) => {
            if (Math.hypot(b.x - a.x, b.y - a.y) < Math.hypot(left[k].x - a.x, left[k].y - a.y)) k = i;
          });
          kill(a, left.splice(k, 1)[0], false);
        }
        if (left.length) kill(left[0], left[0], false);
        events = [];
        dots = [];
        phase = 'void';
        phaseT = 0;
      },
    },
  };
}

export default {
  id: 'kairo',
  meta: { number: 1, key: 'kairo' },
  create,
};
