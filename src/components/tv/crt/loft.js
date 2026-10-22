// Las superficies del televisor 3D: anillos (rectángulos de esquinas redondas
// en planos z) cosidos en una piel de normales lisas. Así salen el gabinete,
// la campana, el bisel y las teclas, cada parte con sus radios: el plano, el
// canto y el chanfle no redondean igual, que es lo que hace que no parezca
// una caja redondeada genérica.
import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry, Vector2 } from 'three';

const SEG = 8; // puntos por esquina

/**
 * El contorno de un rectángulo w × h, esquinas de radio r, centrado en (x, y):
 * empieza y termina abajo al medio (la costura queda abajo, donde no se ve).
 * Siempre 4·SEG + 6 puntos, para que dos anillos cualesquiera se cosan.
 */
export function rrect(w, h, r, x = 0, y = 0) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts = [[x, y - h / 2]];
  const corners = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2],
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= SEG; i++) {
      const a = a0 + (i / SEG) * (Math.PI / 2);
      pts.push([x + cx + r * Math.cos(a), y + cy + r * Math.sin(a)]);
    }
  }
  pts.push([x, y - h / 2]);
  return pts;
}

/** Un anillo: { w, h, r, x, y, z }, más `cut` (arista viva antes) y `n` (normal fija). */
export const ring = (w, h, r, z, x = 0, y = 0, extra = {}) => ({ w, h, r, z, x, y, ...extra });

/** El mismo anillo, crecido d por lado (los radios también). */
export const grow = (a, d, z = a.z, extra = {}) => ({ ...a, w: a.w + 2 * d, h: a.h + 2 * d, r: Math.max(0, a.r + d), z, cut: false, n: null, ...extra });

const mix = (a, b, k) => a + (b - a) * k;

/**
 * Un canto redondo de a a b, en `steps` anillos (sin a). `plane`: primero se
 * mueve en el plano y después en z (de una cara a una pared); si no, al revés.
 */
export function bend(a, b, steps = 5, plane = true) {
  const out = [];
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    const ks = plane ? Math.sin(t) : 1 - Math.cos(t);
    const kz = plane ? 1 - Math.cos(t) : Math.sin(t);
    out.push({
      w: mix(a.w, b.w, ks),
      h: mix(a.h, b.h, ks),
      r: mix(a.r, b.r, ks),
      x: mix(a.x ?? 0, b.x ?? 0, ks),
      y: mix(a.y ?? 0, b.y ?? 0, ks),
      z: mix(a.z, b.z, kz),
    });
  }
  return out;
}

/**
 * Cose los anillos en orden. La cara de afuera queda a la derecha de la
 * marcha: de adentro hacia afuera mira a +z; de adelante hacia atrás, hacia
 * afuera (al revés con `flip`). `cap`: tapa plana en el último anillo, que
 * mira hacia `cap` (±1 en z).
 */
export function loft(rings, { flip = false, cap = 0 } = {}) {
  const pos = [];
  const uv = [];
  const idx = [];
  const fixed = [];
  let prev = null;
  let v = 0;
  let span = 0; // el perímetro del primer anillo: u va de 0 a span en todos
  const n = rrect(1, 1, 0.1).length;
  const row = (pts, z, cut) => {
    const base = pos.length / 3;
    if (prev) {
      let d = 0;
      for (let i = 0; i < n; i++) d += Math.hypot(pts[i][0] - prev.pts[i][0], pts[i][1] - prev.pts[i][1], z - prev.z);
      v += d / n;
    }
    // u a lo largo, en proporción al perímetro de cada anillo: si no, entre
    // anillos de largo distinto la textura se tuerce hacia la costura
    const along = [0];
    for (let i = 1; i < n; i++) along.push(along[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    if (!span) span = along[n - 1];
    pts.forEach(([x, y], i) => {
      pos.push(x, y, z);
      uv.push((along[i] / along[n - 1]) * span, v);
    });
    if (prev && !cut) {
      for (let i = 0; i < n - 1; i++) {
        const a = prev.base + i;
        const b = base + i;
        if (flip) idx.push(a, b + 1, b, a, a + 1, b + 1);
        else idx.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    prev = { base, pts, z };
    return base;
  };
  for (const r of rings) {
    const base = row(rrect(r.w, r.h, r.r, r.x, r.y), r.z, r.cut);
    if (r.n) fixed.push([base, r.n]);
  }
  if (cap) {
    // la tapa: el último anillo otra vez (arista viva) y un abanico al centro
    const last = rings[rings.length - 1];
    const pts = rrect(last.w, last.h, last.r, last.x, last.y);
    const base = pos.length / 3;
    pts.forEach(([x, y]) => {
      pos.push(x, y, last.z);
      uv.push(x, y);
    });
    const c = base + n;
    pos.push(last.x ?? 0, last.y ?? 0, last.z);
    uv.push(last.x ?? 0, last.y ?? 0);
    for (let i = 0; i < n - 1; i++) {
      if (cap > 0) idx.push(c, base + i, base + i + 1);
      else idx.push(c, base + i + 1, base + i);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  // la costura: el primer y el último punto de cada anillo, la misma normal
  for (let b = 0; b < pos.length / 3 - (cap ? n + 1 : 0); b += n) {
    const i = b;
    const j = b + n - 1;
    const sx = nor.getX(i) + nor.getX(j);
    const sy = nor.getY(i) + nor.getY(j);
    const sz = nor.getZ(i) + nor.getZ(j);
    const l = Math.hypot(sx, sy, sz) || 1;
    nor.setXYZ(i, sx / l, sy / l, sz / l);
    nor.setXYZ(j, sx / l, sy / l, sz / l);
  }
  // donde la piel sigue en una cara plana, la normal de la cara
  for (const [base, [x, y, z]] of fixed) for (let i = 0; i < n; i++) nor.setXYZ(base + i, x, y, z);
  return geo;
}

/** Una cara plana en z = 0 con agujeros: contornos de rrect, como arrays de puntos. */
export function plate(outer, holes = []) {
  const shape = new Shape(outer.slice(0, -1).map(([x, y]) => new Vector2(x, y)));
  shape.holes = holes.map((h) => new Shape(h.slice(0, -1).map(([x, y]) => new Vector2(x, y))));
  return new ShapeGeometry(shape, 1);
}
