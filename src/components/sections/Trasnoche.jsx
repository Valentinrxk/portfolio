import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useLang } from '../../i18n';
import './Trasnoche.css';

const FLICK_MS = 250;
const FLICK_PX = 32;
const FLICK_V = 0.3; // px/ms
const REST_MS = 1500; // el cursor quieto deja de ser un dedo (CH1)

const desktopLike = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/**
 * 深夜テレビ, trasnoche: un televisor viejo que pasa ASCII; cierra adn. Un
 * deslizón rápido (o ◁ ▷, o las flechas) cambia de canal: estática, el cuadro
 * rueda, un destello y el canal nuevo.
 * Arrastrar despacio es tocar el canal. La pantalla es siempre de noche; el
 * aparato sigue el tema del sitio (eso lo resuelve el CSS).
 */
export default function Trasnoche() {
  const sectionRef = useRef(null);
  const screenRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const { t } = useLang();
  const copy = t.tv;

  const [channel, setChannel] = useState(0);
  const [desktop] = useState(desktopLike);
  const [fallback, setFallback] = useState(null); // sin WebGL2: un cuadro en <pre>

  useEffect(() => {
    const section = sectionRef.current;
    const screen = screenRef.current;
    const canvas = canvasRef.current;
    let disposed = false;
    let stop = () => {};

    const start = async () => {
      const [R, S, C, O, list] = await Promise.all([
        import('../tv/renderer.js'),
        import('../tv/shell.js'),
        import('../tv/cells.js'),
        import('../tv/osd.js'),
        import('../tv/channels/index.js'),
      ]);
      if (disposed) return;
      const channels = list.default;
      let renderer = null;
      try {
        renderer = R.createRenderer(canvas);
      } catch (err) {
        console.warn('tv: webgl2 unavailable', err);
      }

      const seed = (Date.now() ^ (Math.random() * 4294967296)) >>> 0;
      let grid = null;
      let shell = null;
      let size = '';
      let osdFor = 0;
      let raf = null;
      let onScreen = false;
      let last = 0;
      let ptr = null; // el dedo (o el cursor) en px de pantalla
      let down = null; // el gesto, para medir el deslizón
      let taps = []; // toques nuevos, en la grilla
      let tilt = null; // inclinación izquierda-derecha, en grados
      let askedTilt = false;

      // ——— la grilla (se rehace al cambiar el tamaño) ———
      const build = () => {
        const r = screen.getBoundingClientRect();
        const dpr = renderer ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const key = `${Math.round(r.width)}x${Math.round(r.height)}@${dpr}`;
        if (!r.width || !r.height || key === size) return;
        size = key;
        grid = S.gridFor(r.width, r.height, dpr);
        if (!shell) {
          shell = S.createShell({ channels, grid, seed, onChannel: (i) => !disposed && setChannel(i) });
        } else shell.resize(grid);
        if (renderer) {
          renderer.layout(grid);
          osdFor = 0;
        } else paintFallback();
      };

      // sin WebGL2: CH1 unos segundos después de empezar, quieto
      const paintFallback = () => {
        const ch = channels[0].create(grid, C.mulberry32(seed));
        for (let i = 0; i < 360; i++) ch.step(1 / 60, {});
        const buf = C.createBuffer(grid.cols, grid.rows);
        ch.write(buf);
        const rows = [];
        for (let r = 0; r < grid.rows; r++) {
          const runs = [];
          for (let c = 0; c < grid.cols; c++) {
            const k = (r * grid.cols + c) * 4;
            const glyph = C.GLYPHS[C.glyphAt(buf.data, k)];
            const ch2 = glyph.half === 2 ? '' : glyph.ch;
            const tone = C.toneAt(buf.data, k) === C.TONE.RED ? 'red' : buf.data[k + 1] < 40 ? 'dim' : 'ink';
            const prev = runs[runs.length - 1];
            if (prev && prev.tone === tone) prev.text += ch2;
            else runs.push({ tone, text: ch2 });
          }
          rows.push(runs);
        }
        setFallback({ font: grid.cellW / 0.6, line: grid.cellH, rows });
      };

      // ——— entrada ———
      const local = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX, y: e.clientY, u: (e.clientX - r.left) / r.width, v: (e.clientY - r.top) / r.height };
      };
      const toIso = (x, y) => {
        const r = canvas.getBoundingClientRect();
        return S.screenToIso((x - r.left) / r.width, (y - r.top) / r.height, grid);
      };
      // el puntero para los canales: dónde, si aprieta, si es mouse, cuánto lleva quieto
      const pointer = (now) => {
        if (!ptr || !grid) return null;
        const p = toIso(ptr.x, ptr.y);
        return { x: p.x, y: p.y, down: ptr.down, mouse: ptr.mouse, idle: Math.max(0, now - ptr.moved) / 1000 };
      };
      // CH1: el cursor quieto no atrae; el dedo apoyado, siempre
      const finger = (p) => (p && (!p.mouse || p.down || p.idle * 1000 < REST_MS) ? { x: p.x, y: p.y } : null);

      const change = (dir) => {
        if (!shell) return;
        shell.change(dir, { reduced: !!reducedRef.current });
        wake();
      };

      const onDown = (e) => {
        if (e.button > 0) return;
        const p = local(e);
        const now = performance.now();
        down = { x: p.x, y: p.y, t: now, id: e.pointerId };
        ptr = { x: p.x, y: p.y, id: e.pointerId, mouse: e.pointerType === 'mouse', down: true, moved: now };
        if (grid) taps.push(toIso(p.x, p.y));
      };
      const onMove = (e) => {
        const p = local(e);
        if (e.pointerType === 'mouse' || (ptr && ptr.id === e.pointerId)) {
          const pressed = e.pointerType === 'mouse' ? e.buttons > 0 : true;
          ptr = { x: p.x, y: p.y, id: e.pointerId, mouse: e.pointerType === 'mouse', down: pressed, moved: performance.now() };
        }
      };
      // iOS pide permiso para la inclinación: se pregunta una vez, al tocar CH3
      const askTilt = () => {
        const D = window.DeviceOrientationEvent;
        if (askedTilt || !D || typeof D.requestPermission !== 'function') return;
        if (channels[shell?.index ?? 0]?.id !== 'lily') return;
        askedTilt = true;
        D.requestPermission().catch(() => {});
      };
      const onTilt = (e) => {
        const a = screen.orientation?.angle ?? window.orientation ?? 0;
        const v = a === 90 ? e.beta : a === -90 || a === 270 ? -e.beta : e.gamma;
        tilt = typeof v === 'number' && Number.isFinite(v) ? v : null;
      };
      const onUp = (e) => {
        if (ptr && ptr.id === e.pointerId) ptr.down = false;
        if (e.pointerType !== 'mouse') askTilt();
        if (down && down.id === e.pointerId) {
          const dt = performance.now() - down.t;
          const dx = e.clientX - down.x;
          const dy = e.clientY - down.y;
          // deslizón: rápido, horizontal y con velocidad
          if (dt < FLICK_MS && Math.abs(dx) > FLICK_PX && Math.abs(dx) > Math.abs(dy) * 1.4 && Math.abs(dx) / Math.max(dt, 1) > FLICK_V) {
            change(dx < 0 ? 1 : -1);
          }
        }
        down = null;
        if (e.pointerType !== 'mouse') ptr = null;
      };
      const onCancel = () => {
        down = null;
        ptr = null;
      };
      const onLeave = (e) => {
        if (e.pointerType === 'mouse') ptr = null;
      };

      // flechas: con la sección enfocada o a la vista
      const onKey = (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const el = e.target;
        if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
        const r = screen.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const inside = section.contains(document.activeElement);
        if (!inside && (mid < 0 || mid > window.innerHeight)) return;
        e.preventDefault();
        change(e.key === 'ArrowRight' ? 1 : -1);
      };

      // ——— cuadro ———
      const tick = (now) => {
        raf = null;
        if (!shell || !renderer) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (import.meta.env.DEV && window.__tv?.paused) {
          schedule();
          return;
        }
        const still = !!reducedRef.current;
        const p = pointer(now);
        const f = shell.frame(dt, { finger: finger(p), pointer: p, taps: taps.length ? taps : null, tilt, reduced: still });
        taps = [];
        if (f.osd.number !== osdFor) {
          osdFor = f.osd.number;
          renderer.osd(O.drawOsd(osdFor, grid));
        }
        renderer.draw({
          data: shell.buffer.data,
          time: f.time,
          roll: still ? 0 : f.roll,
          jitter: still ? 0 : f.jitter,
          flash: still ? 0 : f.flash,
          flicker: still ? 0 : 1,
          band: still ? 0 : 1,
          osdAlpha: f.osd.alpha,
          barrel: S.BARREL,
        });
        if (import.meta.env.DEV) window.__tv?.afterDraw?.(f);
        schedule();
      };
      const schedule = () => {
        if (raf == null && onScreen) raf = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (raf != null || !onScreen) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      };

      build();
      let resizeTimer = null;
      const ro = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(build, 120);
      });
      ro.observe(screen);

      const io = new IntersectionObserver(([entry]) => {
        const was = onScreen;
        onScreen = entry.isIntersecting;
        if (onScreen && !was) {
          shell?.showOsd();
          wake();
        }
      });
      io.observe(section);

      if (renderer) {
        screen.addEventListener('pointerdown', onDown);
        screen.addEventListener('pointermove', onMove);
        screen.addEventListener('pointerup', onUp);
        screen.addEventListener('pointercancel', onCancel);
        screen.addEventListener('pointerleave', onLeave);
        window.addEventListener('keydown', onKey);
        window.addEventListener('deviceorientation', onTilt);
      }

      engineRef.current = { change };

      if (import.meta.env.DEV) {
        // gancho para las pruebas de desarrollo: nada de esto llega a producción
        window.__tv = {
          ...(window.__tv || {}),
          shell: () => shell,
          grid: () => grid,
          channel: () => shell?.channel(),
          change,
          extinguish: () => shell?.channel().debug?.extinguish(),
        };
      }

      stop = () => {
        if (raf != null) cancelAnimationFrame(raf);
        clearTimeout(resizeTimer);
        ro.disconnect();
        io.disconnect();
        screen.removeEventListener('pointerdown', onDown);
        screen.removeEventListener('pointermove', onMove);
        screen.removeEventListener('pointerup', onUp);
        screen.removeEventListener('pointercancel', onCancel);
        screen.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('deviceorientation', onTilt);
        shell?.dispose();
        renderer?.dispose();
        engineRef.current = null;
      };
    };

    // el motor se pide recién cuando la sección se acerca
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      start();
    }, { rootMargin: '800px 0px' });
    near.observe(section);

    return () => {
      disposed = true;
      near.disconnect();
      stop();
    };
  }, []);

  // la película del canal: solo para lectores de pantalla
  const film = copy.channels[channel];
  const filmLabel = `${film.name}, ${film.director}, ${film.year}`;
  const live = !fallback;
  // el nombre del grupo: la primera frase de la descripción
  const name = copy.alt.slice(0, copy.alt.indexOf('.'));

  return (
    <div ref={sectionRef} className="tv" role="group" aria-label={name}>
      <div className="tv__frame">
        <div ref={screenRef} className="tv__screen" role="img" aria-label={filmLabel}>
          <canvas ref={canvasRef} className={`tv__canvas ${fallback ? 'is-off' : ''}`} aria-hidden="true" />
          {fallback && (
            <pre className="tv__pre" aria-hidden="true" style={{ fontSize: `${fallback.font}px`, lineHeight: `${fallback.line}px` }}>
              {fallback.rows.map((runs, r) => (
                <span key={r}>
                  {runs.map((run, k) => (
                    <span key={k} className={`is-${run.tone}`}>{run.text}</span>
                  ))}
                  {'\n'}
                </span>
              ))}
            </pre>
          )}
        </div>

        {live && (
          <footer className="tv__foot">
            <p className="tv__hint" aria-hidden="true">{desktop ? copy.hintDesktop : copy.hint}</p>
            <div className="tv__dial">
              <button type="button" className="tv__btn" aria-label={copy.prev} onClick={() => engineRef.current?.change(-1)}>
                <span aria-hidden="true">◁</span>
              </button>
              <button type="button" className="tv__btn" aria-label={copy.next} onClick={() => engineRef.current?.change(1)}>
                <span aria-hidden="true">▷</span>
              </button>
              {/* la película del canal, para el que quiera saber cuál es */}
              <a
                className="tv__btn tv__btn--film"
                href={film.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${copy.film}: ${film.name}`}
              >
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </footer>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{filmLabel}</p>
      <p className="sr-only">{copy.alt}</p>
    </div>
  );
}
