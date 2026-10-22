// El tubo del televisor 3D: el vidrio 4:3 y, adentro, el área de imagen con
// las esquinas redondas. El shader del vidrio y el puntero usan las mismas
// medidas, así lo que se ve y lo que se toca coinciden. Puro, sin three.

/** En unidades del modelo: ancho y alto del vidrio, margen negro, radio de la imagen y comba. */
export const TUBE = { w: 0.98, h: 0.735, margin: 0.03, radius: 0.055, bulge: 0.024 };

/** ¿(x, y) cae dentro del rectángulo de semiejes hw × hh, centrado, con esquinas de radio r? */
export function insideRounded(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return out + Math.min(Math.max(qx, qy), 0) - r <= 0;
}

/** Ancho / alto del cuadro: el área de imagen, sin el margen. */
export const pictureAspect = (tube = TUBE) => (tube.w - 2 * tube.margin) / (tube.h - 2 * tube.margin);

/**
 * De la uv de la malla del vidrio (0..1, v hacia arriba) al cuadro (0..1,
 * v hacia abajo, como el canvas). null en el margen o en las esquinas.
 */
export function pictureUv(u, v, tube = TUBE) {
  const x = (u - 0.5) * tube.w;
  const y = (v - 0.5) * tube.h;
  const hw = tube.w / 2 - tube.margin;
  const hh = tube.h / 2 - tube.margin;
  if (!insideRounded(x, y, hw, hh, tube.radius)) return null;
  return { u: (x + hw) / (2 * hw), v: (hh - y) / (2 * hh) };
}
