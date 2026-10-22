// El televisor 3D: un CRT de fines de los 90, hecho en código. El frente
// redondeado, la campana de atrás que se angosta y baja, el bisel hundido
// alrededor del tubo, una franja abajo con el parlante, los botones y la luz,
// y la antena de conejo arriba. Sin marcas ni letras.
// Unidades del modelo: el frente mide 1.3 de ancho; el origen es el centro
// de la cara del frente.
import {
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TUBE } from './tube.js';

export const BODY = { w: 1.3, h: 1.06, d: 0.46, r: 0.055 };
const BELL = { w: 1.0, h: 0.82, d: 0.56, r: 0.1, scale: 0.62, drop: 0.07, overlap: 0.06 };
const LIP = 0.052; // el bisel interior, alrededor del vidrio
const LIP_D = 0.034; // cuánto sobresale: el vidrio queda hundido
const TUBE_Y = BODY.h / 2 - 0.08 - TUBE.h / 2;
const TUBE_Z = 0.006;
const STRIP_Y = (TUBE_Y - TUBE.h / 2 - LIP + (-BODY.h / 2 + BODY.r)) / 2; // la franja de abajo
const KEY = { w: 0.072, h: 0.036, d: 0.026, z: 0.006, travel: 0.011 };
const ANTENNA = { len: 0.35, spread: 0.74, lean: -0.22, z: -0.22 };
/** El fondo total, del frente a la cola de la campana. */
export const DEPTH = BODY.d + BELL.d - BELL.overlap;

/** Plástico del aparato según el tema; el vidrio no cambia. */
export const PALETTES = {
  dark: { body: '#1c1c1f', bezel: '#141416', key: '#2c2c31', metalness: 0, shadow: 0.62 },
  light: { body: '#c4c6c9', bezel: '#2a2a2d', key: '#3a3a3f', metalness: 0.4, shadow: 0.36 },
};

// el vidrio: el cuadro tal cual (sin conversión de color ni tono), el margen
// negro, las esquinas redondas y un brillo apenas
const GLASS_VS = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;

const GLASS_FS = `
uniform sampler2D uPicture;
uniform vec2 uSize;
uniform float uMargin;
uniform float uRadius;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vView;
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 hb = uSize * 0.5 - uMargin;
  float d = box(p, hb, uRadius);
  float aa = fwidth(d) * 0.75;
  float inside = 1.0 - smoothstep(-aa, aa, d);
  vec3 c = mix(vec3(0.012, 0.012, 0.014), texture2D(uPicture, (p + hb) / (2.0 * hb)).rgb, inside);
  // el vidrio curvo: los bordes toman algo del cuarto
  float f = 1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  vec2 e = abs(vUv - 0.5) * 2.0;
  float rim = pow(max(e.x, e.y), 6.0);
  c += vec3(0.62, 0.66, 0.72) * (0.05 * rim + 0.5 * f * f);
  // y una franja de luz en diagonal, arriba a la izquierda
  float t = vUv.x * 0.75 + vUv.y - 1.12;
  c += vec3(0.03) * exp(-t * t / 0.006) * smoothstep(0.85, 0.15, vUv.x);
  gl_FragColor = vec4(c, 1.0);
}`;

// un rectángulo redondeado centrado, para el bisel y el panel
function rounded(path, w, h, r, cx = 0, cy = 0) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

// La campana: una caja redondeada que se angosta y baja hacia atrás. Las
// normales se corrigen con la jacobiana del afinamiento: siguen lisas.
function taper(geo, depth, scale, drop) {
  const pos = geo.attributes.position.array;
  const nor = geo.attributes.normal.array;
  const ds = (1 - scale) / depth; // ds/dz
  const dg = drop / depth; // d(bajada)/dz
  for (let i = 0; i < pos.length; i += 3) {
    const [x, y, z] = [pos[i], pos[i + 1], pos[i + 2]];
    const t = (depth / 2 - z) / depth; // 0 adelante, 1 atrás
    const s = 1 - (1 - scale) * t;
    pos[i] = x * s;
    pos[i + 1] = y * s - drop * t;
    const [nx, ny, nz] = [nor[i], nor[i + 1], nor[i + 2]];
    const n = new Vector3(nx, ny, s * nz - x * ds * nx - (y * ds + dg) * ny).normalize();
    nor[i] = n.x;
    nor[i + 1] = n.y;
    nor[i + 2] = n.z;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.normal.needsUpdate = true;
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// el vidrio, combado: cero en los bordes, `bulge` en el centro
function tubeGeometry() {
  const geo = new PlaneGeometry(TUBE.w, TUBE.h, 40, 30);
  const pos = geo.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    const nx = pos[i] / (TUBE.w / 2);
    const ny = pos[i + 1] / (TUBE.h / 2);
    pos[i + 2] = TUBE.bulge * (1 - nx * nx) * (1 - ny * ny);
  }
  geo.computeVertexNormals();
  return geo;
}

// texturas chicas, dibujadas una vez
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  return new CanvasTexture(c);
}

// el parlante: ranuras horizontales (blanco = ranura, para el alphaMap)
const grilleTexture = () =>
  canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    const rows = 6;
    const pitch = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * pitch + pitch * 0.3;
      g.beginPath();
      g.roundRect(4, y, w - 8, pitch * 0.42, pitch * 0.21);
      g.fill();
    }
  });

// la sombra de contacto: un óvalo que se desvanece (en gris opaco: el
// alphaMap lee el verde, no la transparencia del canvas)
const shadowTexture = () =>
  canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.35, '#b3b3b3');
    grad.addColorStop(0.7, '#404040');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });

/**
 * createTv(picture) → el aparato armado. `picture`: la textura del cuadro.
 * { group, screen, keys: { prev, next }, points, bodyPoints, imageCorners,
 *   setPalette(name), press(key, p), dispose() }
 */
export function createTv(picture) {
  const group = new Group();
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // ——— materiales ———
  const body = keep(new MeshStandardMaterial({ roughness: 0.5 }));
  const bezel = keep(new MeshStandardMaterial({ roughness: 0.55 }));
  const key = keep(new MeshStandardMaterial({ roughness: 0.42 }));
  const grilleMap = keep(grilleTexture());
  const grille = keep(new MeshStandardMaterial({ color: 0x050506, roughness: 0.9, alphaMap: grilleMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  // la luz de encendido: el rojo del sitio, sin tono (si no, ACES la vuelve naranja)
  const led = keep(new MeshBasicMaterial({ color: '#e10600', toneMapped: false }));
  const chrome = keep(new MeshStandardMaterial({ color: 0xd9dadd, metalness: 1, roughness: 0.22 }));
  const shadowMap = keep(shadowTexture());
  const shadow = keep(new MeshBasicMaterial({ color: 0x000000, alphaMap: shadowMap, transparent: true, depthWrite: false }));
  const glass = keep(new ShaderMaterial({
    vertexShader: GLASS_VS,
    fragmentShader: GLASS_FS,
    toneMapped: false,
    uniforms: {
      uPicture: { value: picture },
      uSize: { value: new Vector2(TUBE.w, TUBE.h) },
      uMargin: { value: TUBE.margin },
      uRadius: { value: TUBE.radius },
    },
  }));

  // ——— el cuerpo: el frente y la campana ———
  add(keep(new RoundedBoxGeometry(BODY.w, BODY.h, BODY.d, 5, BODY.r)), body, 0, 0, -BODY.d / 2);
  const bell = keep(taper(new RoundedBoxGeometry(BELL.w, BELL.h, BELL.d, 5, BELL.r), BELL.d, BELL.scale, BELL.drop));
  add(bell, body, 0, -0.04, -BODY.d - BELL.d / 2 + BELL.overlap);

  // ——— el bisel hundido y el vidrio ———
  const lipShape = rounded(new Shape(), TUBE.w + LIP * 2, TUBE.h + LIP * 2, 0.07);
  lipShape.holes.push(rounded(new Shape(), TUBE.w, TUBE.h, 0.05));
  const lip = keep(new ExtrudeGeometry(lipShape, { depth: LIP_D - 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3, curveSegments: 10 }));
  add(lip, bezel, 0, TUBE_Y, 0.006);
  const screen = add(keep(tubeGeometry()), glass, 0, TUBE_Y, TUBE_Z);

  // ——— la franja: parlante a la izquierda; botones y luz a la derecha ———
  add(keep(new PlaneGeometry(0.36, 0.074)), grille, -0.36, STRIP_Y, 0.0015);
  const panel = keep(new ShapeGeometry(rounded(new Shape(), 0.46, 0.074, 0.03), 6));
  add(panel, bezel, 0.33, STRIP_Y, 0.0012);
  const keyGeo = keep(new RoundedBoxGeometry(KEY.w, KEY.h, KEY.d, 2, 0.009));
  const prev = add(keyGeo, key, 0.17, STRIP_Y, KEY.z);
  const next = add(keyGeo, key, 0.255, STRIP_Y, KEY.z);
  const round = keep(new CylinderGeometry(1, 1, 1, 24));
  const power = add(round, key, 0.49, STRIP_Y, 0.006);
  power.scale.set(0.022, 0.018, 0.022);
  power.rotation.x = Math.PI / 2;
  const lamp = add(round, led, 0.405, STRIP_Y, 0.003);
  lamp.scale.set(0.0085, 0.008, 0.0085);
  lamp.rotation.x = Math.PI / 2;

  // ——— la antena de conejo: una cúpula y dos varillas en V ———
  const dome = add(keep(new SphereGeometry(0.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), body, 0, BODY.h / 2 - 0.004, ANTENNA.z);
  dome.scale.y = 0.62;
  const rod = keep(new CylinderGeometry(0.0042, 0.0068, ANTENNA.len, 8).translate(0, ANTENNA.len / 2, 0));
  const tip = keep(new SphereGeometry(0.011, 12, 8));
  const tips = [-1, 1].map((side) => {
    const arm = new Group();
    arm.position.set(side * 0.018, BODY.h / 2 + 0.035, ANTENNA.z);
    arm.rotation.set(ANTENNA.lean, 0, -side * ANTENNA.spread);
    group.add(arm);
    add(rod, chrome, 0, 0, 0, arm);
    return add(tip, chrome, 0, ANTENNA.len, 0, arm);
  });

  // ——— la sombra en el piso ———
  const floor = add(keep(new PlaneGeometry(1.8, 1.35)), shadow, 0, -BODY.h / 2 - 0.002, -DEPTH / 2 + 0.06);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;

  // ——— puntos para encuadrar ———
  group.updateMatrixWorld(true);
  const bodyPoints = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      bodyPoints.push(new Vector3((sx * BODY.w) / 2, (sy * BODY.h) / 2, 0), new Vector3((sx * BODY.w) / 2, (sy * BODY.h) / 2, -BODY.d));
      const s = BELL.scale;
      bodyPoints.push(new Vector3((sx * BELL.w * s) / 2, (sy * BELL.h * s) / 2 - 0.04 - BELL.drop, -DEPTH));
    }
  }
  const points = [...bodyPoints, ...tips.map((t) => t.localToWorld(new Vector3())), new Vector3(0, -BODY.h / 2, 0.22)];
  const hw = TUBE.w / 2 - TUBE.margin;
  const hh = TUBE.h / 2 - TUBE.margin;
  const edgeZ = TUBE_Z + TUBE.bulge * (1 - (hw / (TUBE.w / 2)) ** 2) * (1 - (hh / (TUBE.h / 2)) ** 2);
  // arriba a la izquierda, arriba a la derecha, abajo a la derecha, abajo a la izquierda
  const imageCorners = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => new Vector3(x, TUBE_Y + y, edgeZ));

  const keys = { prev, next };

  return {
    group,
    screen,
    keys,
    points,
    bodyPoints,
    imageCorners,

    setPalette(name) {
      const p = PALETTES[name] || PALETTES.dark;
      body.color.set(p.body);
      body.metalness = p.metalness;
      bezel.color.set(p.bezel);
      key.color.set(p.key);
      shadow.opacity = p.shadow;
    },

    /** p 0..1: cuánto está hundida la tecla. */
    press(which, p) {
      const k = keys[which];
      if (k) k.position.z = KEY.z - KEY.travel * p;
    },

    dispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
    },
  };
}
