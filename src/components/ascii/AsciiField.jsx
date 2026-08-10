import { useEffect, useRef } from 'react';

const DEFAULT_RAMP = ' .:-=+*#%@';

/**
 * Campo ASCII procedural sobre canvas — motor propio inspirado en la técnica
 * de ascii-studio (luminancia → rampa de caracteres), pero generativo:
 * capas de senos hacen de "señal", el mouse perturba el campo y las celdas
 * más intensas se encienden en rojo/bordó.
 *
 * `turbulence` (0..1): 1 = estática pura (ruido), 0 = señal calma.
 * Puede scrubearse pasando un MotionValue en `turbulenceValue`.
 */
export default function AsciiField({
  ink = 'rgba(35, 35, 39, 0.55)',
  accent = '#e10600',
  accent2 = '#6d0f16',
  cell = 14,
  fontSize = 12,
  fps = 24,
  turbulence = 0.18,
  turbulenceValue = null,
  interactive = true,
  ramp = DEFAULT_RAMP,
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = ramp.split('');

    let raf = null;
    let running = true;
    let visible = true;
    let last = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let cw = cell * 0.62;
    const mouse = { x: -1e4, y: -1e4, active: false };
    const frameTime = 1000 / fps;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`;
      ctx.textBaseline = 'top';
      // Avance real del carácter mono: la grilla se calcula con esto,
      // no con una estimación, para cubrir el ancho exacto
      cw = ctx.measureText('M').width;
      cols = Math.ceil(rect.width / cw) + 1;
      rows = Math.ceil(rect.height / cell);
    };

    // Señal: tres capas de senos desfasados — barato y orgánico
    const signal = (x, y, t) => {
      const v =
        Math.sin(x * 0.35 + t * 0.9) * Math.sin(y * 0.42 - t * 0.6) +
        Math.sin((x + y) * 0.21 + t * 1.4) * 0.6 +
        Math.sin(Math.sqrt(x * x + y * y) * 0.28 - t) * 0.5;
      return v / 2.1; // ~[-1, 1]
    };

    const renderFrame = (now) => {
      const turb = turbulenceValue ? turbulenceValue.get() : turbulence;
      const t = now * 0.001;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, w, h);

      const accents = [];
      ctx.fillStyle = ink;

      for (let r = 0; r < rows; r++) {
        let line = '';
        for (let c = 0; c < cols; c++) {
          let v = signal(c, r, t) * 0.5 + 0.5; // [0, 1]

          if (turb > 0.001) {
            // Estática: ruido determinístico por celda re-sembrado por frame
            const n = Math.sin(c * 12.9898 + r * 78.233 + Math.floor(t * fps)) * 43758.5453;
            v = v * (1 - turb) + (n - Math.floor(n)) * turb;
          }

          if (interactive && mouse.active) {
            const dx = c * cw - mouse.x;
            const dy = r * cell - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 22500) {
              v = Math.min(1, v + (1 - d2 / 22500) * 0.9);
            }
          }

          const idx = Math.min(chars.length - 1, Math.floor(v * chars.length));
          if (v > 0.93) {
            accents.push([c * cw, r * cell, chars[chars.length - 1], v > 0.975]);
            line += ' ';
          } else {
            line += chars[idx];
          }
        }
        ctx.fillText(line, 0, r * cell);
      }

      // Segundo pase: celdas encendidas (pocas) en rojo/bordó
      for (const [x, y, ch, hot] of accents) {
        ctx.fillStyle = hot ? accent : accent2;
        ctx.fillText(ch, x, y);
      }
      ctx.fillStyle = ink;
    };

    // El guard va ANTES de re-agendar: si no, reduced-motion y las
    // instancias fuera de viewport dejan un rAF girando para siempre
    const draw = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible || now - last < frameTime) return;
      last = now;
      renderFrame(now);
    };

    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };

    resize();
    window.addEventListener('resize', resize);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    // Los listeners van en la sección contenedora: los overlays de
    // contenido (position:absolute encima del canvas) no roban el puntero
    const host = canvas.closest('section') ?? canvas.parentElement;
    if (interactive && !reduced) {
      host.addEventListener('pointermove', onPointer);
      host.addEventListener('pointerleave', onLeave);
    }

    if (reduced) {
      // Un solo frame quieto, sin agendar nada
      renderFrame(1e9);
      running = false;
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      running = false;
      if (raf != null) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [ink, accent, accent2, cell, fontSize, fps, turbulence, turbulenceValue, interactive, ramp]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
