import { useEffect, useRef } from 'react';
import { getScrollVelocity } from '../../hooks/useSmoothScroll';
import portraitRaw from '../../assets/ascii-portrait.txt?raw';

const LINES = portraitRaw.replace(/\r/g, '').split('\n').filter((l) => l.length > 0);
const ROWS = LINES.length;
const COLS = Math.max(...LINES.map((l) => l.length));
const RAMP = ' .:-=+*#%@';

// Peso tonal por carácter: decide qué celdas pueden quemar en rojo
const WEIGHT = { '@': 1, '%': 0.9, '#': 0.82, '*': 0.68, '+': 0.55, '=': 0.45, '-': 0.32, ':': 0.22, '.': 0.1, ' ': 0 };

// Fronteras de las tomas del perfil: el retrato glitchea cuando el texto cambia
const BOUNDARIES = [0.38, 0.68];

const hash = (a, b, c) => {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * El retrato, vivo: se materializa desde la estática al entrar a la escena,
 * glitchea en bandas cada vez que cambia una toma (sincronizado con el
 * scrub), respira con una onda por fila y el puntero lo afirma y enciende
 * celdas en rojo.
 */
export default function AsciiPortraitLive({ progressValue = null, dark = false, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = null;
    let running = true;
    let visible = true;
    let last = 0;
    let W = 0;
    let H = 0;
    let cellH = 0;
    let cw = 0;
    let x0 = 0;
    let y0 = 0;
    const mouse = { x: -1e4, y: -1e4 };
    const frameTime = 1000 / 30;

    const setFont = (size) => {
      ctx.font = `${size * 1.06}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono') || 'monospace'}`;
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

      // Contain: el retrato entra completo en el panel
      cellH = H / ROWS;
      setFont(cellH);
      cw = ctx.measureText('M').width;
      if (COLS * cw > W) {
        cellH *= W / (COLS * cw);
        setFont(cellH);
        cw = ctx.measureText('M').width;
      }
      x0 = (W - COLS * cw) / 2;
      y0 = (H - ROWS * cellH) / 2;
    };

    const renderFrame = (t) => {
      ctx.clearRect(0, 0, W, H);
      const p = progressValue ? Math.max(0, Math.min(1, progressValue.get())) : 1;

      // Materialización al entrar + degradación por velocidad de scroll:
      // moverse es ruido, frenar es señal
      const vel = reduced ? 0 : getScrollVelocity();
      const k = Math.max(-1, Math.min(1, vel / 60));
      const turb = reduced
        ? 0
        : Math.max(Math.max(0, 1 - p / 0.12), Math.min(0.55, Math.abs(vel) / 90));

      // Glitch: fuerte cuando el scrub cruza un cambio de toma,
      // más un espasmo breve cada ~5.3s para que nunca esté muerto
      const nearBoundary = Math.max(0, ...BOUNDARIES.map((b) => 1 - Math.abs(p - b) / 0.05));
      const tick = !reduced && (t % 5.3) < 0.16 ? 0.8 : 0;
      const glitch = Math.max(nearBoundary, tick);

      const cycle = Math.floor(t * 6);
      const bandA = Math.floor(hash(cycle, 1, 0) * ROWS);
      const bandB = Math.floor(hash(cycle, 2, 0) * ROWS);
      const noiseSeed = Math.floor(t * 24);

      for (let r = 0; r < ROWS; r++) {
        let line = LINES[r];
        const y = y0 + r * cellH;

        let x = x0 + (reduced ? 0 : Math.sin(r * 0.13 + t * 1.5) * 3);
        x += k * (8 + 22 * hash(r, 7, 0));

        const banded = glitch > 0.05 && (Math.abs(r - bandA) < 3 || Math.abs(r - bandB) < 2);
        if (banded) {
          x += (hash(r, cycle, 3) - 0.5) * 52 * glitch;
        }

        // Estática de entrada: celdas reemplazadas por ruido
        if (turb > 0.01) {
          let noisy = '';
          for (let c = 0; c < line.length; c++) {
            const n = hash(c, r, noiseSeed);
            noisy += n < turb ? RAMP[(n * 971) % 10 | 0] : line[c];
          }
          line = noisy;
        }

        if (banded) {
          ctx.fillStyle = 'rgba(225, 6, 0, 0.55)';
          ctx.fillText(line, x - 3, y);
        }

        ctx.fillStyle = banded ? (dark ? 'rgba(230, 231, 235, 0.92)' : 'rgba(35, 35, 39, 0.9)') : (dark ? 'rgba(236, 237, 241, 1)' : 'rgba(35, 35, 39, 0.9)');
        ctx.fillText(line, x, y);

        // Lente del puntero: las celdas cercanas se afirman y algunas queman
        const dy = y + cellH / 2 - mouse.y;
        if (!reduced && Math.abs(dy) < 100) {
          for (let c = 0; c < line.length; c++) {
            const cx = x + c * cw;
            const dx = cx + cw / 2 - mouse.x;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < 100) {
              const w = WEIGHT[line[c]] ?? 0.5;
              if (w > 0.05) {
                const hot = w > 0.75 && d < 48;
                ctx.fillStyle = hot ? '#e10600' : (dark ? `rgba(230, 231, 235, ${0.7 + (1 - d / 100) * 0.3})` : `rgba(35, 35, 39, ${0.7 + (1 - d / 100) * 0.3})`);
                ctx.fillText(line[c], cx, y);
              }
            }
          }
        }
      }
    };

    const draw = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      // Con scroll activo renderiza a 60fps; en reposo, a 30
      if (now - last < frameTime && Math.abs(getScrollVelocity()) < 0.4) return;
      last = now;
      renderFrame(now * 0.001);
    };

    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -1e4;
      mouse.y = -1e4;
    };

    resize();
    window.addEventListener('resize', resize);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    // Eventos en la sección: los overlays de texto no roban el puntero
    const host = canvas.closest('section') ?? canvas.parentElement;
    if (!reduced) {
      host.addEventListener('pointermove', onPointer);
      host.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(draw);
    } else {
      renderFrame(0);
      running = false;
    }

    return () => {
      running = false;
      if (raf != null) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [progressValue, dark]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
