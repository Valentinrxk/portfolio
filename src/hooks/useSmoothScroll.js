import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Instancia única a nivel módulo: el HUD y el [↑] scrollean por acá
let lenis = null;
let velocity = 0;

/** Velocidad instantánea del scroll (px/frame). Los canvas ASCII la usan
 *  para degradar la señal mientras te movés: ruido en movimiento,
 *  señal al frenar. Con reduced-motion queda en 0. */
export function getScrollVelocity() {
  return velocity;
}

/** Scroll programático por el mismo carril suave. */
export function smoothScrollTo(y) {
  if (lenis) {
    lenis.scrollTo(y, { duration: 1.2 });
  } else {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
}

/**
 * Scroll inercial con Lenis. Touch queda nativo (default de Lenis),
 * el teclado y los medios externos interrumpen sin pelear, y con
 * reduced-motion no se instancia nada.
 */
export default function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return undefined;

    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    lenis.on('scroll', (e) => {
      velocity = e.velocity;
    });

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });

    // El splash bloquea el scroll (body.intro-lock): pausar Lenis
    // mientras dura para que el wheel de salteo no acumule desplazamiento
    const syncLock = () => {
      if (!lenis) return;
      if (document.body.classList.contains('intro-lock')) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };
    syncLock();
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      lenis.destroy();
      lenis = null;
      velocity = 0;
    };
  }, []);
}
