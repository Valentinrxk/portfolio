// anime.js no hace falta para el primer pintado: solo lo usan el corte de
// navegación y el mail de contacto. Se pide una vez, cuando hay tiempo
// ocioso o cuando alguno de los dos lo necesita, y se comparte.
let mod = null;
let pending = null;

export function loadAnime() {
  if (mod) return Promise.resolve(mod);
  pending ??= import('animejs').then(({ animate, createTimeline, stagger, spring }) => {
    mod = { animate, createTimeline, stagger, spring };
    return mod;
  });
  return pending;
}

/** El módulo si ya llegó; `null` mientras tanto. */
export const anime = () => mod;

/** Pedirlo apenas el navegador esté ocioso. */
export function preloadAnime() {
  const go = () => {
    loadAnime();
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 2500 });
  else setTimeout(go, 1200);
}
