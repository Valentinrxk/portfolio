// GSAP fuera del paquete inicial: el texto real se pinta sin él y la
// decodificación arranca cuando llega (se pide al montar, mientras corre
// la intro). Se carga una sola vez y se comparte.
let gsapNow = null;
let pending = null;

export function loadGsap() {
  if (gsapNow) return Promise.resolve(gsapNow);
  pending ??= import('gsap').then((core) => {
    gsapNow = core.gsap ?? core.default;
    return gsapNow;
  });
  return pending;
}

/** GSAP si ya llegó; `null` mientras tanto. */
export const gsapIfReady = () => gsapNow;
