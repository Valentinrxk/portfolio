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

// el teléfono: el complemento exacto del bloque de escritorio de Trasnoche.css
const phoneLike = () =>
  typeof window !== 'undefined' && !!window.matchMedia && !window.matchMedia('(min-width: 640px)').matches;

/**
 * 深夜テレビ, trasnoche: un televisor viejo que pasa ASCII; cierra adn. Un
 * deslizón rápido (o ◁ ▷, o las flechas) cambia de canal: estática, el cuadro
 * rueda, un destello y el canal nuevo.
 * Arrastrar despacio es tocar el canal. La pantalla es siempre de noche; el
 * aparato sigue el tema del sitio.
 * En el escritorio el aparato es un CRT en 3D (three, lazy): el cuadro de
 * siempre va de textura al vidrio. Si three no arranca, el televisor plano.
 * En el teléfono la pantalla va a sangre, arranca en el arrozal y el aparato
 * se enciende cada vez que vuelve a la vista; ahí three no se descarga nunca.
 */
export default function Trasnoche() {
  const sectionRef = useRef(null);
  const screenRef = useRef(null);
  const engineRef = useRef(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const { t } = useLang();
  const copy = t.tv;

  const [channel, setChannel] = useState(0);
  const [desktop] = useState(desktopLike);
  // '3d' en el escritorio desde el principio: el alto del escenario queda reservado
  const [mode, setMode] = useState(() => (phoneLike() ? 'flat' : '3d'));
  const [fallback, setFallback] = useState(null); // sin WebGL2: un cuadro en <pre>

  useEffect(() => {
    const section = sectionRef.current;
    const screen = screenRef.current;
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
      const seed = (Date.now() ^ (Math.random() * 4294967296)) >>> 0;
      let carried = null; // el canal del montaje anterior, al cruzar los 640 px

      // un canvas nuevo por montaje: un contexto perdido no se vuelve a usar
      const freshCanvas = () => {
        const c = document.createElement('canvas');
        c.className = 'tv__canvas';
        c.setAttribute('aria-hidden', 'true');
        screen.prepend(c);
        return c;
      };

      // el 3D: el cuadro en un canvas suelto y three en el de la pantalla; null si no arranca
      const open3d = async () => {
        const picture = document.createElement('canvas');
        let renderer = null;
        try {
          renderer = R.createRenderer(picture);
        } catch (err) {
          console.warn('tv: webgl2 unavailable', err);
        }
        if (!renderer) return null;
        let canvas = null;
        try {
          const { createStage } = await import('../tv/crt/stage.js');
          if (disposed) throw new Error('disposed');
          canvas = freshCanvas();
          const keys = { prev: screen.querySelector('[data-key="prev"]'), next: screen.querySelector('[data-key="next"]') };
          const stage = createStage(canvas, { picture, keys });
          return { renderer, stage, canvas };
        } catch (err) {
          if (!disposed) console.warn('tv: 3d unavailable', err);
          renderer.dispose();
          canvas?.remove();
          return null;
        }
      };

      // ——— un aparato montado: el plano (teléfono o respaldo) o el 3D ———
      const play = (three) => {
        const stage = three?.stage ?? null;
        const canvas = three ? three.canvas : freshCanvas();
        let renderer = three?.renderer ?? null;
        if (!three) {
          try {
            renderer = R.createRenderer(canvas);
          } catch (err) {
            console.warn('tv: webgl2 unavailable', err);
          }
        }
        if (!renderer) canvas.classList.add('is-off');

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
        let tiltWait = false; // arrancó en el arrozal: el permiso espera a que se vuelva a él

        // ——— la grilla (se rehace al cambiar el tamaño) ———
        const build = () => {
          const r = screen.getBoundingClientRect();
          const dpr = renderer ? Math.min(window.devicePixelRatio || 1, 2) : 1;
          const key = `${Math.round(r.width)}x${Math.round(r.height)}@${dpr}`;
          if (!r.width || !r.height || key === size) return;
          size = key;
          const phone = phoneLike();
          if (stage) {
            // en el 3D, el cuadro mide lo que mide el área de imagen en pantalla
            const pic = stage.resize(r.width, r.height, dpr);
            grid = S.gridFor(pic.w, pic.h, pic.dpr, false, true);
          } else grid = S.gridFor(r.width, r.height, dpr, phone);
          if (!shell) {
            // en el teléfono arranca el canal más lleno, el arrozal; sin WebGL2, el cuadro de CH1
            const lily = Math.max(0, channels.findIndex((c) => c.id === 'lily'));
            const first = !renderer ? 0 : (carried ?? (phone ? lily : 0));
            shell = S.createShell({ channels, grid, seed, start: first, onChannel: (i) => !disposed && setChannel(i) });
            tiltWait = channels[first]?.id === 'lily';
            setChannel(first);
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
        // a la grilla; en el 3D, por el vidrio (null fuera de la imagen)
        const toIso = (x, y) => {
          if (stage) {
            const p = stage.pick(x, y);
            return p && S.screenToIso(p.u, p.v, grid);
          }
          const r = canvas.getBoundingClientRect();
          return S.screenToIso((x - r.left) / r.width, (y - r.top) / r.height, grid);
        };
        // el puntero para los canales: dónde, si aprieta, si es mouse, cuánto lleva quieto
        // (fuera de la imagen del 3D, como si se hubiera ido)
        const pointer = (now) => {
          if (!ptr || !grid) return null;
          const p = toIso(ptr.x, ptr.y);
          if (!p) return null;
          return { x: p.x, y: p.y, down: ptr.down, mouse: ptr.mouse, idle: Math.max(0, now - ptr.moved) / 1000 };
        };
        // CH1: el cursor quieto no atrae; el dedo apoyado, siempre
        const finger = (p) => (p && (!p.mouse || p.down || p.idle * 1000 < REST_MS) ? { x: p.x, y: p.y } : null);

        const change = (dir) => {
          if (!shell) return;
          shell.change(dir, { reduced: !!reducedRef.current });
          // la tecla del aparato se hunde, la aprieten como la aprieten
          stage?.press(dir, !!reducedRef.current);
          wake();
        };

        const onDown = (e) => {
          if (e.button > 0) return;
          const p = local(e);
          const now = performance.now();
          down = { x: p.x, y: p.y, t: now, id: e.pointerId };
          ptr = { x: p.x, y: p.y, id: e.pointerId, mouse: e.pointerType === 'mouse', down: true, moved: now };
          const at = grid && toIso(p.x, p.y);
          if (at) taps.push(at);
        };
        const onMove = (e) => {
          const p = local(e);
          // el aparato 3D se vuelve hacia el mouse
          if (e.pointerType === 'mouse') stage?.aim(e.clientX, e.clientY);
          if (e.pointerType === 'mouse' || (ptr && ptr.id === e.pointerId)) {
            const pressed = e.pointerType === 'mouse' ? e.buttons > 0 : true;
            ptr = { x: p.x, y: p.y, id: e.pointerId, mouse: e.pointerType === 'mouse', down: pressed, moved: performance.now() };
          }
        };
        // iOS pide permiso para la inclinación: se pregunta una vez, al tocar CH3.
        // Si el arrozal fue el canal de arranque, el primer toque (casi siempre un
        // deslizón) no se corta con el diálogo: se pregunta al volver cambiando de canal
        const askTilt = () => {
          const D = window.DeviceOrientationEvent;
          if (askedTilt || !D || typeof D.requestPermission !== 'function') return;
          const lily = channels[shell?.index ?? 0]?.id === 'lily';
          if (tiltWait) {
            if (!lily) tiltWait = false;
            return;
          }
          if (!lily) return;
          askedTilt = true;
          D.requestPermission().catch(() => {});
        };
        const onTilt = (e) => {
          const a = window.screen.orientation?.angle ?? window.orientation ?? 0;
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
          if (e.pointerType === 'mouse') {
            ptr = null;
            stage?.aim(null);
          }
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
            barrel: grid.barrel,
          });
          // en el 3D, el cuadro recién dibujado sube al vidrio en este mismo rAF
          stage?.render(dt, { still });
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

        // ——— el encendido (teléfono): fuera de la vista el aparato se apaga y, al
        // volver a la mitad de la vista, se enciende. La raya y la apertura son del
        // CSS; la nieve, el destello y el número, del televisor ———
        let off = false;
        const canPower = () => !!renderer && !stage && !reducedRef.current && phoneLike();
        const switchOff = () => {
          off = true;
          screen.dataset.power = 'off';
        };
        const switchOn = () => {
          off = false;
          // con movimiento reducido (o si ya es escritorio), corte seco
          if (!canPower()) {
            delete screen.dataset.power;
            return;
          }
          screen.dataset.power = 'on';
          shell?.powerOn();
        };
        if (canPower()) switchOff();

        const io = new IntersectionObserver(
          ([entry]) => {
            const was = onScreen;
            onScreen = entry.isIntersecting;
            if (!onScreen) {
              if (canPower()) switchOff();
            } else if (off && entry.intersectionRatio >= 0.5) switchOn();
            if (onScreen && !was) {
              shell?.showOsd();
              wake();
            }
          },
          { threshold: [0, 0.5] },
        );
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
            mode: stage ? '3d' : 'flat',
            shell: () => shell,
            grid: () => grid,
            channel: () => shell?.channel(),
            change,
            extinguish: () => shell?.channel().debug?.extinguish(),
            // apaga y enciende de nuevo (el reflow reinicia la animación del CSS)
            power: () => {
              switchOff();
              void screen.offsetWidth;
              switchOn();
            },
          };
        }

        return {
          index: () => shell?.index ?? null,
          stop: () => {
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
            delete screen.dataset.power;
            shell?.dispose();
            renderer?.dispose();
            stage?.dispose();
            canvas.remove();
            engineRef.current = null;
          },
        };
      };

      // ——— montar según el ancho; al cruzar los 640 px se desarma todo y se
      // vuelve a montar en el otro modo ———
      let run = null;
      let gen = 0;
      const mount = async () => {
        const id = ++gen;
        if (run) {
          carried = run.index();
          run.stop();
          run = null;
        }
        const three = phoneLike() ? null : await open3d();
        if (disposed || id !== gen) {
          if (three) {
            three.stage.dispose();
            three.renderer.dispose();
            three.canvas.remove();
          }
          return;
        }
        const next = three ? '3d' : 'flat';
        // el atributo ya, para que la grilla se mida con el CSS del modo nuevo
        section.dataset.mode = next;
        setMode(next);
        run = play(three);
      };
      const wide = window.matchMedia('(min-width: 640px)');
      wide.addEventListener('change', mount);
      stop = () => {
        wide.removeEventListener('change', mount);
        gen++;
        run?.stop();
        run = null;
      };
      mount();
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
    <div ref={sectionRef} className="tv" data-mode={mode} role="group" aria-label={name}>
      <div className="tv__frame">
        {/* el canvas lo pone el motor (uno nuevo por montaje) */}
        <div ref={screenRef} className="tv__screen" role="img" aria-label={filmLabel}>
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
          {/* las teclas CH del aparato 3D, para el mouse; el teclado y los
              lectores de pantalla usan las de abajo */}
          <button type="button" className="tv__key" data-key="prev" tabIndex={-1} aria-hidden="true" onClick={() => engineRef.current?.change(-1)} />
          <button type="button" className="tv__key" data-key="next" tabIndex={-1} aria-hidden="true" onClick={() => engineRef.current?.change(1)} />
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
