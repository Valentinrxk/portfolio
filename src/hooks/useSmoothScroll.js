import { useEffect } from 'react';

// Estado a nivel módulo para que smoothScrollTo (HUD) comparta el mismo lerp
const state = {
  active: false,
  target: 0,
  current: 0,
  raf: null,
};

const maxScroll = () =>
  Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const clamp = (v) => Math.min(Math.max(v, 0), maxScroll());

function loop() {
  // Si algo externo movió la página (teclado, anclas, find-in-page),
  // esa entrada gana: adoptamos la posición y soltamos el lerp
  if (Math.abs(window.scrollY - state.current) > 2) {
    state.current = state.target = window.scrollY;
    state.raf = null;
    return;
  }

  state.current += (state.target - state.current) * 0.095;

  if (Math.abs(state.target - state.current) < 0.5) {
    state.current = state.target;
    window.scrollTo(0, state.current);
    state.raf = null;
    return;
  }

  window.scrollTo(0, state.current);
  state.raf = requestAnimationFrame(loop);
}

function kick() {
  if (state.raf == null) {
    state.raf = requestAnimationFrame(loop);
  }
}

/** Scroll programático (nav del HUD) por el mismo carril suave. */
export function smoothScrollTo(y) {
  if (state.active) {
    state.current = window.scrollY;
    state.target = clamp(y);
    kick();
  } else {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
}

/**
 * Scroll inercial tipo dolly: la rueda alimenta un target y un lerp
 * lo persigue en rAF. Solo puntero fino y sin reduced-motion;
 * en touch el scroll queda nativo.
 */
export default function useSmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return undefined;

    state.active = true;
    state.target = state.current = window.scrollY;

    const onWheel = (e) => {
      if (e.ctrlKey) return; // no interferir con el zoom
      // Durante el splash el wheel solo lo saltea: acumular target acá
      // catapultaría la página apenas se desbloquee el scroll
      if (document.body.classList.contains('intro-lock')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      state.target = clamp(state.target + e.deltaY * unit);
      kick();
    };

    // Scroll por otros medios con el lerp en reposo: re-sincronizar
    const onScroll = () => {
      if (state.raf == null) {
        state.target = state.current = window.scrollY;
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      state.active = false;
      if (state.raf != null) cancelAnimationFrame(state.raf);
      state.raf = null;
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
}
