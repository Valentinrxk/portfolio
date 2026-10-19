import { useEffect, useRef } from 'react';
import { getScrollVelocity } from '../../hooks/useSmoothScroll';
import data from '../../assets/gorilla.json';

const { cols: COLS, rows: ROWS, font: FONT, durations: DUR, impact: IMPACT } = data;
const BED = IMPACT.bed;

const RAMP = '+xX%#@';       // sombreado del pelaje, de la luz a la sombra
const BOIL = 0.06;           // parte del pelaje sombreado que hierve por tick (0 = apagado)
const BOIL_MS = 1000 / 7;    // el hervor lleva su propio reloj, ~7 ticks/s
const RIPPLE_MS = 360;       // la onda que cruza la red al caer
const RING = 0.14;           // ancho del anillo, en radios de la elipse de la cama
const SPARKS = 7;
const SPARK_MS = 450;
const SPARK_GLYPHS = "*'.+`";
const GRAVITY = 70;          // celdas/s²
const FONT_WAIT = 2500;      // si la fuente no llega a tiempo, se dibuja igual

// Mezcla entera (la de mulberry32): azar determinista, sin Math.random
const hash = (n) => {
  let x = (n + 0x6d2b79f5) | 0;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

// Por fila: glifos, tonos y tramos de un mismo tono (los espacios de adentro
// se suman al tramo en curso), para dibujar cada fila con pocas llamadas
const FRAMES = data.frames.map(({ g, t }) => {
  const rows = [];
  const fur = []; // pelaje con glifo de la rampa: las únicas celdas que hierven
  for (let r = 0; r < ROWS; r++) {
    const o = r * COLS;
    const runs = [];
    for (let c = 0; c < COLS; c++) {
      const tone = t[o + c];
      if (tone === ' ') continue;
      const run = runs[runs.length - 1];
      if (run?.tone === tone) run.b = c + 1;
      else runs.push({ tone, a: c, b: c + 1 });
      if (tone === 'b' && RAMP.includes(g[o + c])) fur.push(o + c);
    }
    rows.push({ g: g.slice(o, o + COLS), t: t.slice(o, o + COLS), runs });
  }
  return { rows, fur };
});

// Hervor: en cada tick, ~BOIL del pelaje sombreado pasa a un vecino de la
// rampa (un paso más claro u oscuro). Los contornos no se tocan nunca.
function boil({ rows, fur }, tick) {
  const lines = rows.map((row) => row.g);
  if (!BOIL || tick < 0) return lines;
  const hit = []; // filas tocadas, como arreglos de glifos
  for (const i of fur) {
    const h = hash(Math.imul(i, 0x9e3779b1) ^ tick);
    if (h >= BOIL) continue;
    const r = (i / COLS) | 0;
    const c = i - r * COLS;
    const chars = (hit[r] ??= [...lines[r]]);
    const k = RAMP.indexOf(chars[c]);
    const step = h < BOIL / 2 ? -1 : 1;
    chars[c] = RAMP[k + step] ?? RAMP[k - step];
  }
  hit.forEach((chars, r) => { lines[r] = chars.join(''); });
  return lines;
}

// Onda del impacto: las celdas de la red sobre el anillo de radio R (distancia
// normalizada a la elipse de la cama) salen de la fila y se devuelven aparte
function ripple(line, t, r, R) {
  const dy = (r + 0.5 - BED.cy) / BED.ry;
  const chars = [...line];
  const on = chars.map((_, c) =>
    t[c] === 'n' && Math.abs(Math.hypot((c + 0.5 - BED.cx) / BED.rx, dy) - R) <= RING / 2);
  const a = on.indexOf(true);
  if (a < 0) return [line, null];
  const ring = chars.map((ch, c) => (on[c] ? ch : ' ')).join('').trimEnd();
  return [chars.map((ch, c) => (on[c] ? ' ' : ch)).join(''), { a, text: ring.slice(a) }];
}

// Chispas del impacto n: siempre las mismas para el mismo n
function sparksFor(n) {
  let s = Math.imul(n, 0x9e3779b1);
  const rand = () => hash(s++);
  return Array.from({ length: SPARKS }, () => ({
    glyph: SPARK_GLYPHS[(rand() * SPARK_GLYPHS.length) | 0],
    vx: (rand() < 0.5 ? -1 : 1) * (6 + 10 * rand()),
    vy: -(12 + 12 * rand()),
  }));
}

const rowSeed = (r) => {
  const s = Math.sin(r * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Reproductor del gorila ASCII (gorilla.json) en canvas. Cada frame dura lo
 * suyo (cuelga arriba, cae rápido, aplasta), el pelaje hierve apenas y, al
 * pegar en la cama elástica, una onda cruza la red y saltan chispas rojas.
 * El scroll desarma la señal fila por fila.
 */
export default function AsciiGif({ progressValue = null, theme, className = '' }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);   // sobrevive a los reinicios del efecto
  const colorsRef = useRef(null);
  const redrawRef = useRef(null);

  // Colores del tema: se releen al cambiarlo, sin reiniciar la animación
  useEffect(() => {
    const css = getComputedStyle(canvasRef.current);
    const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    colorsRef.current = {
      ink: read('--ascii-ink', 'gray'),
      net: read('--ascii-net', 'gray'),
      red: read('--red', 'red'),
    };
    redrawRef.current?.();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) frameRef.current = 0;

    let alive = true;
    let started = false;
    let visible = true;
    let raf = null;
    let timer = null;
    let family = 'monospace';
    let W = 0, H = 0, f = 0, cw = 0, ch = 0, x0 = 0, y0 = 0;
    let last = 0, acc = 0, tick = -1, lastP = -1, wasFx = false;
    let impactAt = -Infinity, impacts = 0, sparks = [];
    let glyphs = boil(FRAMES[frameRef.current], -1);

    const render = (now) => {
      ctx.clearRect(0, 0, W, H);
      const { ink, net, red } = colorsRef.current;
      const { rows } = FRAMES[frameRef.current];
      const p = progressValue ? Math.max(0, Math.min(1, progressValue.get())) : 0;
      // La señal se arrastra con la velocidad del scroll
      const k = reduced ? 0 : Math.max(-1, Math.min(1, getScrollVelocity() / 60));
      // Desarme en filas alternadas + arrastre: el mismo corrimiento para toda la fila
      const shift = (r) =>
        (p > 0.01 ? (r % 2 === 0 ? 1 : -1) * p * (0.25 + rowSeed(r)) * W * 1.1 : 0) +
        k * (14 + 34 * rowSeed(r));
      const base = FONT.baseline * f;
      const age = now - impactAt;
      const wave = age < RIPPLE_MS ? age / RIPPLE_MS : -1;

      for (let r = 0; r < ROWS; r++) {
        const { t, runs } = rows[r];
        if (!runs.length) continue;
        const x = x0 + shift(r);
        const y = y0 + r * ch + base;
        let line = glyphs[r];

        if (Math.abs(k) > 0.3) {
          const a = runs[0].a;
          ctx.globalAlpha = Math.abs(k) * 0.5;
          ctx.fillStyle = red;
          ctx.fillText(line.slice(a, runs[runs.length - 1].b), x - k * 9 + a * cw, y);
          ctx.globalAlpha = 1;
        }

        let ring = null;
        if (wave >= 0 && t.includes('n')) [line, ring] = ripple(line, t, r, 1.15 * wave);

        for (const { tone, a, b } of runs) {
          ctx.fillStyle = tone === 'n' ? net : ink;
          ctx.fillText(line.slice(a, b), x + a * cw, y);
        }
        // La red sobre el anillo se enciende en tinta y se hunde un poco
        if (ring) {
          ctx.fillStyle = ink;
          ctx.fillText(ring.text, x + ring.a * cw, y + ch * 0.3 * (1 - wave));
        }
      }

      // Chispas rojas desde el punto de contacto (cada glifo nace en esa celda,
      // centrado en col + 0.5), con gravedad y fundido
      if (age < SPARK_MS) {
        const s = age / 1000;
        const sx = x0 + shift(IMPACT.row) + IMPACT.col * cw;
        const sy = y0 + IMPACT.row * ch + base;
        ctx.fillStyle = red;
        ctx.globalAlpha = 1 - age / SPARK_MS;
        for (const { glyph, vx, vy } of sparks) {
          ctx.fillText(glyph, sx + vx * s * cw, sy + (vy * s + (GRAVITY / 2) * s * s) * ch);
        }
        ctx.globalAlpha = 1;
      }
    };

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Ajuste al contenido: en escritorio, a la derecha y en la misma franja
      // vertical que antes (~11%–88% del alto, lejos de las barras); en móvil,
      // centrado arriba, dejándole la franja de abajo al texto
      const mobile = W < 760;
      f = Math.min(
        (H * (mobile ? 0.66 : 0.77)) / (ROWS * FONT.lineHeight),
        (W * (mobile ? 0.94 : 0.5)) / (COLS * FONT.advance),
      );
      ctx.font = `${FONT.weight} ${f}px ${family}`;
      ctx.textBaseline = 'alphabetic';
      cw = ctx.measureText('M').width;
      ch = (cw * FONT.lineHeight) / FONT.advance;
      const totalW = COLS * cw;
      // En escritorio, el mismo centro que tenía el mono con la grilla anterior
      // (una caja de ~0.96H anclada a la derecha, con el dibujo al medio)
      const box = H * 0.96;
      x0 = mobile ? (W - totalW) / 2 : Math.max(W * 0.38, W * 0.95 - box) + box / 2 - totalW / 2;
      y0 = mobile ? H * 0.05 : (H - ROWS * ch) / 2;
      // Cambiar el tamaño borra el canvas: se redibuja siempre (también estático)
      render(performance.now());
    };

    const loop = (now) => {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(Math.max(now - last, 0), 250); // una pestaña dormida no adelanta nada
      last = now;
      if (!visible) return;

      // Cada frame dura lo suyo; el while absorbe los saltos largos sin deriva
      let dirty = false;
      acc += dt;
      while (acc >= DUR[frameRef.current]) {
        acc -= DUR[frameRef.current];
        frameRef.current = (frameRef.current + 1) % FRAMES.length;
        dirty = true;
        if (frameRef.current === IMPACT.frame) {
          impactAt = now - acc;
          sparks = sparksFor(++impacts);
        }
      }
      const t = BOIL ? Math.floor(now / BOIL_MS) : 0;
      if (t !== tick) {
        tick = t;
        dirty = true;
      }
      if (dirty) glyphs = boil(FRAMES[frameRef.current], tick);

      // Con scroll (desarme o smear cambiando) o con el impacto en curso,
      // se re-renderiza a la frecuencia de la pantalla para que sea fluido
      const p = progressValue ? progressValue.get() : 0;
      const scrolling = Math.abs(getScrollVelocity()) > 0.4 || Math.abs(p - lastP) > 0.0005;
      lastP = p;
      const fx = now - impactAt < SPARK_MS;
      if (dirty || scrolling || fx || wasFx) render(now);
      wasFx = fx;
    };

    const start = () => {
      if (!alive || started) return;
      started = true;
      family = getComputedStyle(canvas).getPropertyValue('--font-ascii').trim() || family;
      resize();
      window.addEventListener('resize', resize);
      if (!reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    redrawRef.current = () => {
      if (started) render(performance.now());
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    // Se mide con la fuente del ASCII cargada; si tarda o falla, se arranca
    // igual y, si llega después, se vuelve a medir con ella
    const fontLoad = (document.fonts?.load(`${FONT.weight} 16px "${FONT.family}"`) ?? Promise.resolve())
      .catch(() => {});
    Promise.race([fontLoad, new Promise((ok) => { timer = setTimeout(ok, FONT_WAIT); })]).then(start);
    fontLoad.then(() => alive && started && resize());

    return () => {
      alive = false;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      redrawRef.current = null;
    };
  }, [progressValue]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
