import { useEffect, useRef } from 'react';
import { getScrollVelocity } from '../../hooks/useSmoothScroll';

/**
 * Reproductor genérico de animación ASCII pre-renderizada (pipeline
 * estilo ascii-studio). Llena el contenedor tipo cover, recortando el
 * sobrante, y enciende chispas rojas sobre el trazo denso.
 */
export default function AsciiPlayer({
  data,
  ink = 'rgba(230, 231, 235, 0.8)',
  accent = '#e10600',
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = data.frames.map((f) => f.split('\n'));

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
    const frameTime = 1000 / data.fps;

    const setFont = (size) => {
      ctx.font = `${size * 1.05}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`;
      ctx.textBaseline = 'top';
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

      // Cover: la grilla llena el contenedor y el sobrante se recorta
      cellH = H / data.rows;
      setFont(cellH);
      cw = ctx.measureText('M').width;
      if (data.cols * cw < W) {
        cellH *= W / (data.cols * cw);
        setFont(cellH);
        cw = ctx.measureText('M').width;
      }
      x0 = (W - data.cols * cw) / 2;
      y0 = (H - data.rows * cellH) / 2;
    };

    const rowSeed = (r) => {
      const s = Math.sin(r * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, W, H);
      const k = Math.max(-1, Math.min(1, getScrollVelocity() / 60));
      const lines = frames[frame];

      for (let r = 0; r < lines.length; r++) {
        const line = lines[r];
        if (!line) continue;
        const y = y0 + r * cellH;
        if (y < -cellH || y > H) continue;

        const x = x0 + k * (10 + 26 * rowSeed(r));

        if (Math.abs(k) > 0.3) {
          ctx.fillStyle = `rgba(225, 6, 0, ${Math.abs(k) * 0.4})`;
          ctx.fillText(line, x - k * 8, y);
        }

        ctx.fillStyle = ink;
        ctx.fillText(line, x, y);

        for (let c = 0; c < line.length; c++) {
          const ch = line[c];
          if ((ch === '@' || ch === '%') && (r * 31 + c * 17 + frame * 7) % 43 === 0) {
            ctx.fillStyle = accent;
            ctx.fillText(ch, x + c * cw, y);
            ctx.fillStyle = ink;
          }
        }
      }
    };

    const draw = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible) return;

      if (now - last >= frameTime) {
        last = now;
        frame = (frame + 1) % frames.length;
        renderFrame();
      } else if (Math.abs(getScrollVelocity()) > 0.4) {
        // smear fluido mientras la banda se arrastra
        renderFrame();
      }
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
  }, [data, ink, accent]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
