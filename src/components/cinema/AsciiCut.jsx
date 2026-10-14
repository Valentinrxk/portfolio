import { useEffect, useRef } from 'react';
import { anime, loadAnime, preloadAnime } from '../../lib/anime';
import './AsciiCut.css';

// La escala ASCII del sitio, de lo más liviano a lo más denso
const RAMP = '.:-=+*#%@';

let runCut = null;

/**
 * Corte de montaje hecho de señal: una ola de celdas ASCII sale desde
 * `origin` y tapa la pantalla, detrás salta a destino (`jump`) y la ola
 * se retira revelando la sección nueva. Sin el corte montado, con
 * movimiento reducido o si anime.js todavía no llegó, salta directo.
 */
export function asciiCut(jump, origin) {
  if (runCut) runCut(jump, origin);
  else jump();
}

export default function AsciiCut() {
  const hostRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const host = hostRef.current;
    preloadAnime();
    let grid = { cols: 0, rows: 0, cells: [] };
    let running = null;

    // La grilla se arma a demanda y solo se rehace si cambió el viewport
    const build = () => {
      const size = window.innerWidth < 640 ? 44 : 56;
      const cols = Math.ceil(window.innerWidth / size);
      const rows = Math.ceil(window.innerHeight / size);
      if (cols === grid.cols && rows === grid.rows) return grid;
      host.style.setProperty('--cols', cols);
      host.style.setProperty('--rows', rows);
      const cells = Array.from({ length: cols * rows }, () => document.createElement('i'));
      host.replaceChildren(...cells);
      grid = { cols, rows, cells };
      return grid;
    };

    runCut = (jump, origin) => {
      const a = anime();
      if (!a) {
        jump();
        loadAnime();
        return;
      }
      const { createTimeline, stagger } = a;
      // un corte encima de otro: el primero se completa al instante
      if (running) {
        running.complete();
      }
      const { cols, rows, cells } = build();
      const ox = origin?.x ?? window.innerWidth / 2;
      const oy = origin?.y ?? window.innerHeight / 2;
      const oc = Math.min(cols - 1, Math.max(0, Math.floor((ox / window.innerWidth) * cols)));
      const or = Math.min(rows - 1, Math.max(0, Math.floor((oy / window.innerHeight) * rows)));
      const from = or * cols + oc;

      // cada celda lleva el carácter de su distancia: denso en el origen,
      // liviano en los bordes, con algo de ruido para que no sea un degradé
      const reach = Math.hypot(Math.max(oc, cols - oc), Math.max(or, rows - or));
      cells.forEach((cell, i) => {
        const d = Math.hypot((i % cols) - oc, Math.floor(i / cols) - or) / reach;
        const k = Math.round((1 - d) * (RAMP.length - 1) + (Math.random() - 0.5) * 2.4);
        cell.textContent = RAMP[Math.max(0, Math.min(RAMP.length - 1, k))];
        cell.classList.toggle('is-hot', d < 0.12);
      });

      const wave = { grid: [cols, rows], from, jitter: 22 };
      host.classList.add('is-on');
      running = createTimeline({
        onComplete: () => {
          host.classList.remove('is-on');
          running = null;
        },
      })
        .add(cells, {
          scale: { from: 0, to: 1.04 },
          opacity: { from: 0, to: 1 },
          duration: 240,
          ease: 'outQuad',
          delay: stagger(9, wave),
        })
        .call(jump)
        .add(cells, {
          scale: { to: 0 },
          opacity: { to: 0 },
          duration: 300,
          ease: 'inQuad',
          delay: stagger(9, wave),
        }, '+=90');
    };

    return () => {
      runCut = null;
      running?.complete();
    };
  }, []);

  return <div ref={hostRef} className="cut" aria-hidden="true" />;
}
