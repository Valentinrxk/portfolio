import { useEffect, useRef } from 'react';
import { getScrollVelocity } from '../../hooks/useSmoothScroll';

const RAMP = ' .:-=+*#%@';

// Cada modo es una forma distinta de no repetirse jamás
const MODES = {
  wave: (x, y, t, s) =>
    Math.sin(x * 0.31 + t * 0.9 + s) * Math.sin(y * 0.47 - t * 0.6) +
    Math.sin((x + y) * 0.19 + t * 1.31) * 0.6,
  noise: (x, y, t, s) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + Math.floor(t * 7) + s) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  },
  flow: (x, y, t, s) =>
    Math.sin(x * 0.42 - t * 1.7 + Math.sin(y * 0.6 + s) * 2.1) +
    Math.sin(y * 0.23 + t * 0.5) * 0.5,
};

/**
 * Pieza generativa ASCII en miniatura. La semilla nace aleatoria en cada
 * visita y el patrón evoluciona sin ciclo: nunca lo mismo dos veces,
 * literalmente.
 */
export default function AsciiVariation({ mode = 'wave', dark = false, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const signal = MODES[mode] ?? MODES.wave;
    const seed = Math.random() * 1000;

    let raf = null;
    let running = true;
    let visible = true;
    let last = 0;
    let cols = 0;
    let rows = 0;
    let cw = 0;
    let W = 0;
    let H = 0;
    const cell = 10;
    const frameTime = 1000 / 14;

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
      ctx.font = `9px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width;
      cols = Math.ceil(W / cw) + 1;
      rows = Math.ceil(H / cell);
    };

    const renderFrame = (t) => {
      ctx.clearRect(0, 0, W, H);
      const shake = Math.min(1, Math.abs(getScrollVelocity()) / 70);
      const accents = [];
      ctx.fillStyle = dark ? 'rgba(206, 207, 213, 0.55)' : 'rgba(53, 53, 60, 0.55)';

      for (let r = 0; r < rows; r++) {
        let line = '';
        for (let c = 0; c < cols; c++) {
          let v = signal(c, r, t, seed) * 0.5 + 0.5;
          if (shake > 0.05) {
            const n = Math.sin(c * 91.7 + r * 47.3 + Math.floor(t * 14)) * 43758.5453;
            v = v * (1 - shake) + (n - Math.floor(n)) * shake;
          }
          const idx = Math.min(RAMP.length - 1, Math.max(0, Math.floor(v * RAMP.length)));
          if (v > 0.94) {
            accents.push([c * cw, r * cell, RAMP[RAMP.length - 1]]);
            line += ' ';
          } else {
            line += RAMP[idx];
          }
        }
        ctx.fillText(line, 0, r * cell);
      }

      ctx.fillStyle = '#e10600';
      for (const [x, y, ch] of accents) {
        ctx.fillText(ch, x, y);
      }
    };

    const draw = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible || now - last < frameTime) return;
      last = now;
      renderFrame(now * 0.001);
    };

    resize();
    window.addEventListener('resize', resize);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    if (reduced) {
      renderFrame(seed);
      running = false;
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      if (raf != null) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mode, dark]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
