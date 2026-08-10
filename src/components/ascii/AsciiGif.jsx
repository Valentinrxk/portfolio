import { useEffect, useRef } from 'react';
import data from '../../assets/monito-frames.json';

const FRAMES = data.frames.map((f) => f.split('\n'));
const { fps, rows: ROWS } = data;

/**
 * Reproductor de animación ASCII pre-renderizada (pipeline estilo
 * ascii-studio: gif → frames de caracteres). Corre en canvas, enciende
 * chispas rojas sobre el trazo denso y el scroll desarma la señal
 * fila por fila.
 */
export default function AsciiGif({ progressValue = null, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = null;
    let running = true;
    let visible = true;
    let last = 0;
    let frame = 0;
    let W = 0;
    let H = 0;
    let cellH = 0;
    let cw = 0;
    let x0 = 0;
    let y0 = 0;
    const frameTime = 1000 / fps;

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

      cellH = (H * 0.92) / ROWS;
      ctx.font = `${cellH * 1.05}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width;

      const totalW = data.cols * cw;
      const mobile = W < 760;
      x0 = mobile ? (W - totalW) / 2 : Math.max(W * 0.38, W - totalW - W * 0.05);
      y0 = (H - ROWS * cellH) / 2;
    };

    const rowSeed = (r) => {
      const s = Math.sin(r * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, W, H);
      const p = progressValue ? Math.max(0, Math.min(1, progressValue.get())) : 0;
      const lines = FRAMES[frame];

      for (let r = 0; r < lines.length; r++) {
        const line = lines[r];
        if (!line) continue;
        const y = y0 + r * cellH;

        let x = x0;
        if (p > 0.01) {
          const dir = r % 2 === 0 ? 1 : -1;
          x += dir * p * (0.25 + rowSeed(r)) * W * 1.1;
        }

        ctx.fillStyle = 'rgba(35, 35, 39, 0.78)';
        ctx.fillText(line, x, y);

        // Chispas rojas solo sobre el trazo denso, distintas por frame
        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if ((ch === '@' || ch === '%') && (r * 31 + c * 17 + frame * 7) % 29 === 0) {
            ctx.fillStyle = '#e10600';
            ctx.fillText(ch, x + c * cw, y);
            ctx.fillStyle = 'rgba(35, 35, 39, 0.78)';
          }
        }
      }
    };

    const draw = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible || now - last < frameTime) return;
      last = now;
      frame = (frame + 1) % FRAMES.length;
      renderFrame();
    };

    resize();
    window.addEventListener('resize', resize);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    if (reduced) {
      renderFrame();
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
  }, [progressValue]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
