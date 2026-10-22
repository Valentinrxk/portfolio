// El televisor 3D: un CRT de 14" de fines de los 90, hecho en código. Un
// frente moldeado (el marco, la franja con el parlante y los controles), el
// bisel aparte que baja en pendiente hasta el vidrio, la tapa de atrás que
// se angosta y baja en la campana, rejillas, patas y la antena telescópica. Sin marcas ni letras: solo íconos.
// Unidades del modelo: el frente mide 1.28 de ancho; el origen es el centro
// de la cara del frente.
import {
  AdditiveBlending,
  CustomBlending,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OneFactor,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  ShadowMaterial,
  SphereGeometry,
  SrcAlphaFactor,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
  ZeroFactor,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TUBE } from './tube.js';
import { bend, grow, loft, plate, ring, rrect } from './loft.js';
import { grilleTexture, plasticNormal, radialTexture, smudges } from './textures.js';

// el frente: plano con esquinas anchas y un canto chico
const FRONT = { w: 1.28, h: 1.12, r: 0.075, edge: 0.024, d: 0.16 };
const TUBE_Y = 0.04;
// el bisel: pendiente desde el vidrio, un borde plano, el canto y la ranura
// hasta el frente
const BEZEL = { pad: 0.068, face: 0.012, edge: 0.004, proud: 0.006, gap: 0.0035, sink: 0.012, lip: 0.008 };
const GLASS_Z = -0.042; // la cara del vidrio, en el borde
const PICTURE_Z = -0.056; // el fósforo: el cuadro queda detrás del espesor del vidrio
// la abertura del frente alrededor del bisel
const SEAM = { w: TUBE.w + 2 * (BEZEL.pad + BEZEL.face + BEZEL.gap), h: TUBE.h + 2 * (BEZEL.pad + BEZEL.face + BEZEL.gap), r: 0.098 };
// la franja de abajo: parlante a la izquierda, controles a la derecha
const STRIP_Y = (TUBE_Y - SEAM.h / 2 + (-FRONT.h / 2 + FRONT.edge)) / 2;
const RECESS = { h: 0.07, r: 0.014, depth: 0.009, round: 0.003 };
const GRILLE = { x: -0.33, w: 0.47, pitch: 0.0085 };
const PANEL = { x: 0.335, w: 0.45 };
const KEY = { w: 0.058, h: 0.032, r: 0.007, travel: 0.006 };
const POWER = { d: 0.04 };
const AT = { prev: 0.19, next: 0.262, ir: 0.368, led: 0.435, power: 0.505 };
// la tapa de atrás, más chica que el frente: un tramo recto y la campana,
// que se angosta y baja (el piso sigue plano)
const REAR = { z0: -FRONT.d, w0: 1.22, top0: 0.528, bottom: -0.554, r0: 0.07, zs: -0.36, ws: 1.212, tops: 0.522, z1: -1.12, w1: 0.8, top1: 0.2, r1: 0.065, back: 0.035 };
const FEET = 0.018;
const FLOOR_Y = -FRONT.h / 2 - 0.012;
const ANTENNA = { z: -0.3, segs: [[0.16, 0.0056], [0.13, 0.0043], [0.1, 0.0032]], spread: 0.56, lean: -0.32 };
/** El fondo total, del frente a la tapa de atrás. */
export const DEPTH = -(REAR.z1 - REAR.back);

/** Colores y terminaciones según el tema; el vidrio no cambia. */
export const PALETTES = {
  // grafito: plástico mate
  dark: {
    body: '#242428', metal: 0, rough: 0.46,
    bezel: '#18181b', bezelRough: 0.4,
    panel: '#111113', key: '#29292d', icon: '#808088',
    grille: '#18181a', grilleMetal: 0, grilleRough: 0.6,
    env: 0.75, shadow: 0.4, contact: 0.62,
  },
  // plata de los 2000: pintura metalizada, con el bisel y el panel carbón
  light: {
    body: '#c9ccd1', metal: 0.6, rough: 0.36,
    bezel: '#28292d', bezelRough: 0.46,
    panel: '#1d1e21', key: '#3b3c41', icon: '#a9abb1',
    grille: '#b9bcc1', grilleMetal: 0.55, grilleRough: 0.42,
    env: 0.9, shadow: 0.26, contact: 0.36,
  },
};

// el vidrio: el cuadro tal cual (sin conversión de color ni tono), el margen
// negro y las esquinas redondas. Al apagar y encender, la imagen se aprieta
// hacia el centro (uScale) y brilla de más; el reflejo lo pone la capa de
// vidrio de adelante
const SCREEN_VS = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SCREEN_FS = `
uniform sampler2D uPicture;
uniform vec2 uSize;
uniform float uMargin;
uniform float uRadius;
uniform vec2 uScale;
uniform float uBeam;
uniform float uWhite;
uniform float uHalo;
uniform float uIdle;
varying vec2 vUv;
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
  // el tubo sin imagen: negro encendido, el gris del fósforo apagado
  vec3 base = mix(vec3(0.012, 0.012, 0.014), vec3(0.046, 0.05, 0.049), uIdle);
  vec2 s = max(uScale, vec2(1e-4));
  float e = box(p, hb * s, uRadius * min(s.x, s.y));
  float ae = fwidth(e) * 0.75 + 1e-6;
  float lit = min(inside, 1.0 - smoothstep(-ae, ae, e));
  vec3 pic = texture2D(uPicture, clamp(p / s, -hb, hb) / (2.0 * hb) + 0.5).rgb;
  vec3 c = mix(pic, vec3(1.0, 0.98, 0.95), uWhite) * uBeam;
  // la raya y el punto encandilan un poco alrededor
  float g = max(e, 0.0) / 0.022;
  c = mix(base, c, lit) + vec3(0.86, 0.9, 1.0) * uHalo * exp(-g * g) * inside;
  gl_FragColor = vec4(c, 1.0);
}`;

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

// luz que se suma sobre el lienzo transparente: el color se suma y el alfa
// queda como estaba (con AdditiveBlending el alfa también suma y oscurece la
// página debajo del plano entero)
const GLOW = { blending: CustomBlending, blendSrc: SrcAlphaFactor, blendDst: OneFactor, blendSrcAlpha: ZeroFactor, blendDstAlpha: OneFactor, transparent: true, depthWrite: false, toneMapped: false };

const mix = (a, b, k) => a + (b - a) * k;
const ease = (t) => t * t * (1.4 - 0.4 * t); // la campana: arranca recta y se cierra hacia atrás

// la tapa de atrás a la profundidad z: ancho, techo y radio
function rearAt(z) {
  if (z >= REAR.zs) {
    const k = (REAR.z0 - z) / (REAR.z0 - REAR.zs);
    return { w: mix(REAR.w0, REAR.ws, k), top: mix(REAR.top0, REAR.tops, k), r: REAR.r0 };
  }
  const t = Math.min(1, (REAR.zs - z) / (REAR.zs - REAR.z1));
  return { w: mix(REAR.ws, REAR.w1, ease(t)), top: mix(REAR.tops, REAR.top1, ease(t)), r: mix(REAR.r0, REAR.r1, t) };
}
const rearRing = (z) => {
  const a = rearAt(z);
  return ring(a.w, a.top - REAR.bottom, a.r, z, 0, (a.top + REAR.bottom) / 2);
};

// un hueco en el frente: el canto que baja y la pared hasta `depth`
const recess = (hole, depth, round) =>
  loft([grow(hole, round, 0, { n: [0, 0, 1] }), ...bend(grow(hole, round, 0), { ...hole, z: -round }, 4, true), { ...hole, z: -depth }], { flip: true });

// una tecla: pared, chanfle vivo y tapa
const keyGeometry = (w, h, r) =>
  loft(
    [ring(w, h, r, 0), ring(w, h, r, 0.009), ring(w, h, r, 0.009, 0, 0, { cut: true }), ring(w - 0.007, h - 0.007, Math.max(0.0012, r - 0.0035), 0.0125)],
    { flip: true, cap: 1 },
  );
const KEY_TOP = 0.0125;

// los íconos de las teclas: triángulos de canal y el de encendido
function triangle(s, up) {
  const k = up ? 1 : -1;
  return new ShapeGeometry(new Shape([new Vector2(-s, -k * s * 0.55), new Vector2(s, -k * s * 0.55), new Vector2(0, k * s * 0.65)]));
}
function powerIcon(ro, ri) {
  const gap = 0.62;
  const arc = new Shape();
  arc.absarc(0, 0, ro, Math.PI / 2 + gap, Math.PI * 2.5 - gap, false);
  arc.absarc(0, 0, ri, Math.PI * 2.5 - gap, Math.PI / 2 + gap, true);
  const t = (ro - ri) / 2;
  const bar = new Shape(rrect(t * 2, ro * 1.05, t, 0, ro * 0.5).slice(0, -1).map(([x, y]) => new Vector2(x, y)));
  return new ShapeGeometry([arc, bar], 16);
}

/**
 * createTv(picture) → el aparato armado. `picture`: la textura del cuadro.
 * { group, screen, keys: { prev, next, power }, points, bodyPoints,
 *   imageCorners, setPalette(name) → paleta, press(key, p), setPower(curva),
 *   setEnvironment(textura), setLed(on), setSpill([r, g, b], cuánto), dispose() }
 */
export function createTv(picture) {
  const group = new Group();
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = group, { cast = true, receive = true } = {}) => {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    parent.add(m);
    return m;
  };

  // ——— texturas ———
  const grain = keep(plasticNormal());
  grain.repeat.set(9, 9);
  const blots = keep(smudges(128, 0.82));
  blots.repeat.set(0.9, 0.9);
  const grilleMap = keep(grilleTexture(GRILLE.w, RECESS.h, GRILLE.pitch));
  const contactMap = keep(radialTexture([[0, '#fff'], [0.4, '#a6a6a6'], [0.72, '#363636'], [1, '#000']]));
  const glowMap = keep(radialTexture([[0, '#fff'], [0.18, '#9a9a9a'], [0.5, '#222'], [1, '#000']]));

  // ——— materiales ———
  const plastic = (extra) => keep(new MeshStandardMaterial({ normalMap: grain, normalScale: new Vector2(0.1, 0.1), roughnessMap: blots, ...extra }));
  const body = plastic();
  const bezel = plastic({ normalScale: new Vector2(0.05, 0.05) });
  const panel = plastic({ normalScale: new Vector2(0.08, 0.08) });
  const key = keep(new MeshStandardMaterial({ roughness: 0.42 }));
  const icon = keep(new MeshStandardMaterial({ roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const seam = keep(new MeshStandardMaterial({ color: 0x050506, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  const dark = keep(new MeshStandardMaterial({ color: 0x050607, roughness: 0.12 })); // vidrio oscuro: el espesor del tubo y la ventanita del control remoto
  const grille = keep(new MeshStandardMaterial({ map: grilleMap, bumpMap: grilleMap, bumpScale: 0.6 }));
  const rubber = keep(new MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.88 }));
  const chrome = keep(new MeshStandardMaterial({ color: 0xdcdde1, metalness: 1, roughness: 0.18 }));
  // la luz de encendido: el rojo del sitio, sin tono (si no, ACES la vuelve naranja)
  const led = keep(new MeshStandardMaterial({ color: 0x2a0503, roughness: 0.16, emissive: 0xe10600, emissiveIntensity: 1, toneMapped: false }));
  const ledGlow = keep(new SpriteMaterial({ map: glowMap, color: 0xe10600, ...GLOW, opacity: 0.55 }));
  const floorShadow = keep(new ShadowMaterial({ opacity: 0.4, depthWrite: false }));
  const contact = keep(new MeshBasicMaterial({ color: 0x000000, alphaMap: contactMap, transparent: true, depthWrite: false }));
  const spillFloor = keep(new MeshBasicMaterial({ map: glowMap, ...GLOW, opacity: 0 }));
  // el vidrio de adelante: solo refleja (negro sumado no cambia el cuadro de abajo)
  const glass = keep(new MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0, envMapIntensity: 0.2, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  const screenMat = keep(new ShaderMaterial({
    vertexShader: SCREEN_VS,
    fragmentShader: SCREEN_FS,
    toneMapped: false,
    uniforms: {
      uPicture: { value: picture },
      uSize: { value: new Vector2(TUBE.w, TUBE.h) },
      uMargin: { value: TUBE.margin },
      uRadius: { value: TUBE.radius },
      uScale: { value: new Vector2(1, 1) },
      uBeam: { value: 1 },
      uWhite: { value: 0 },
      uHalo: { value: 0 },
      uIdle: { value: 0 },
    },
  }));

  // ——— el frente: la cara con sus huecos, el canto y el costado ———
  const faceRing = ring(FRONT.w - 2 * FRONT.edge, FRONT.h - 2 * FRONT.edge, FRONT.r - FRONT.edge, 0, 0, 0, { n: [0, 0, 1] });
  const seamHole = ring(SEAM.w, SEAM.h, SEAM.r, 0, 0, TUBE_Y);
  const grilleHole = ring(GRILLE.w, RECESS.h, RECESS.r, 0, GRILLE.x, STRIP_Y);
  const panelHole = ring(PANEL.w, RECESS.h, RECESS.r, 0, PANEL.x, STRIP_Y);
  const outline = (r, d) => rrect(r.w + 2 * d, r.h + 2 * d, r.r + d, r.x, r.y);
  const back = ring(FRONT.w, FRONT.h, FRONT.r, -FRONT.d + 0.006);
  const behind = { ...grow(rearRing(REAR.z0), -0.014), z: -FRONT.d };
  const front = keep(mergeGeometries([
    plate(rrect(faceRing.w, faceRing.h, faceRing.r), [outline(seamHole, BEZEL.edge), outline(grilleHole, RECESS.round), outline(panelHole, RECESS.round)]),
    loft([faceRing, ...bend(faceRing, ring(FRONT.w, FRONT.h, FRONT.r, -FRONT.edge), 6, true), back, ...bend(back, ring(FRONT.w - 0.012, FRONT.h - 0.012, FRONT.r - 0.006, -FRONT.d), 3, false), behind]),
    recess(seamHole, BEZEL.sink, BEZEL.edge),
    recess(grilleHole, RECESS.depth, RECESS.round),
    recess(panelHole, RECESS.depth, RECESS.round),
  ]));
  add(front, body);

  // ——— la tapa de atrás: escalón contra el frente, el tramo recto y la campana ———
  const rear = [];
  const r0 = grow(rearRing(REAR.z0), -0.012);
  rear.push(r0, ...bend(r0, rearRing(REAR.z0 - 0.012), 3, true), rearRing(REAR.zs));
  for (let i = 1; i <= 14; i++) rear.push(rearRing(mix(REAR.zs, REAR.z1, i / 14)));
  const last = rear[rear.length - 1];
  rear.push(...bend(last, grow(last, -REAR.back, REAR.z1 - REAR.back), 5, false));
  add(keep(loft(rear, { cap: -1 })), body);

  // ——— el bisel: del vidrio sube en pendiente, un borde plano, el canto y
  // la ranura hasta el frente ———
  const lip = ring(TUBE.w - 2 * BEZEL.lip, TUBE.h - 2 * BEZEL.lip, 0.05, GLASS_Z + 0.002, 0, TUBE_Y);
  const top = ring(TUBE.w + 2 * BEZEL.pad, TUBE.h + 2 * BEZEL.pad, 0.085, BEZEL.proud, 0, TUBE_Y);
  const slope = grow(top, -0.007, BEZEL.proud - 0.005);
  const rim = grow(top, BEZEL.face - BEZEL.edge, BEZEL.proud);
  const outer = grow(top, BEZEL.face, BEZEL.proud - BEZEL.edge);
  add(keep(loft([lip, slope, ...bend(slope, top, 3, false), rim, ...bend(rim, outer, 4, true), { ...outer, z: -BEZEL.sink }])), bezel);
  // la ranura entre el bisel y el frente
  add(keep(loft([{ ...outer, z: -BEZEL.sink }, { ...seamHole, z: -BEZEL.sink }])), seam, 0, 0, 0, group, { cast: false });
  // el espesor del vidrio, del cuadro al frente del vidrio
  add(keep(loft([{ ...lip, z: PICTURE_Z - 0.001 }, lip])), dark, 0, 0, 0, group, { cast: false });

  // ——— el tubo: el cuadro atrás y el vidrio que refleja adelante ———
  const tubeGeo = keep(tubeGeometry());
  const screen = add(tubeGeo, screenMat, 0, TUBE_Y, PICTURE_Z, group, { cast: false, receive: false });
  add(tubeGeo, glass, 0, TUBE_Y, GLASS_Z, group, { cast: false, receive: false });

  // ——— la franja: el parlante y el panel, hundidos ———
  const plateZ = -RECESS.depth;
  add(keep(new PlaneGeometry(GRILLE.w + 0.01, RECESS.h + 0.01)), grille, GRILLE.x, STRIP_Y, plateZ, group, { cast: false });
  add(keep(new PlaneGeometry(PANEL.w + 0.01, RECESS.h + 0.01)), panel, PANEL.x, STRIP_Y, plateZ, group, { cast: false });
  const well = (w, h, r, x) => add(keep(plate(rrect(w, h, r))), seam, x, STRIP_Y, plateZ + 0.0002, group, { cast: false });
  well(KEY.w + 0.006, KEY.h + 0.006, KEY.r + 0.003, AT.prev);
  well(KEY.w + 0.006, KEY.h + 0.006, KEY.r + 0.003, AT.next);
  well(POWER.d + 0.006, POWER.d + 0.006, POWER.d / 2 + 0.003, AT.power);
  well(0.019, 0.019, 0.0095, AT.led);
  add(keep(plate(rrect(0.05, 0.02, 0.004))), dark, AT.ir, STRIP_Y, plateZ + 0.0004, group, { cast: false });

  const chKey = keep(keyGeometry(KEY.w, KEY.h, KEY.r));
  const roundKey = keep(keyGeometry(POWER.d, POWER.d, POWER.d / 2));
  const prev = add(chKey, key, AT.prev, STRIP_Y, plateZ);
  const next = add(chKey, key, AT.next, STRIP_Y, plateZ);
  const power = add(roundKey, key, AT.power, STRIP_Y, plateZ);
  add(keep(triangle(0.0062, false)), icon, 0, 0, KEY_TOP + 0.0002, prev, { cast: false });
  add(keep(triangle(0.0062, true)), icon, 0, 0, KEY_TOP + 0.0002, next, { cast: false });
  add(keep(powerIcon(0.0074, 0.0054)), icon, 0, -0.0006, KEY_TOP + 0.0002, power, { cast: false });

  // la luz: una lente chica y su resplandor
  const lens = add(keep(new SphereGeometry(0.0066, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), led, AT.led, STRIP_Y, plateZ, group, { cast: false });
  lens.rotation.x = Math.PI / 2;
  lens.scale.y = 0.75;
  const glow = new Sprite(ledGlow);
  glow.position.set(AT.led, STRIP_Y, plateZ + 0.008);
  glow.scale.set(0.07, 0.07, 1);
  group.add(glow);

  // ——— rejillas: al costado de la campana y arriba, ranuras oscuras ———
  const fr = new Matrix4();
  const T = new Vector3();
  const B = new Vector3();
  const N = new Vector3();
  const P = new Vector3();
  const slots = (geo, frames) => {
    const m = keep(new InstancedMesh(geo, seam, frames.length));
    frames.forEach((f, i) => m.setMatrixAt(i, f));
    group.add(m);
  };
  const side = [];
  for (const z of [-0.69, -0.88]) {
    const a = rearAt(z);
    const dx = (rearAt(z + 0.005).w - rearAt(z - 0.005).w) / 2 / 0.01; // dx/dz del costado
    T.set(-dx, 0, -1).normalize();
    N.set(1, 0, -dx).normalize();
    for (let i = 0; i < 9; i++) {
      P.set(a.w / 2, -0.42 + i * 0.046, z).addScaledVector(N, 0.0012);
      side.push(fr.clone().makeBasis(T, B.set(0, 1, 0), N).setPosition(P));
    }
  }
  slots(keep(plate(rrect(0.15, 0.013, 0.0065))), side);
  const roof = [];
  for (let i = 0; i < 11; i++) {
    const z = -0.5 - i * 0.034;
    const s = (rearAt(z + 0.005).top - rearAt(z - 0.005).top) / 0.01; // la pendiente del techo
    B.set(0, -s, -1).normalize();
    N.set(0, 1, -s).normalize();
    for (const x of [-0.2, 0.2]) {
      P.set(x, rearAt(z).top, z).addScaledVector(N, 0.0012);
      roof.push(fr.clone().makeBasis(T.set(1, 0, 0), B, N).setPosition(P));
    }
  }
  slots(keep(plate(rrect(0.3, 0.012, 0.006))), roof);

  // ——— las patas de goma ———
  const foot = keep(new CylinderGeometry(0.03, 0.033, FEET, 20));
  for (const [x, z] of [[-0.5, -0.09], [0.5, -0.09], [-0.32, -0.98], [0.32, -0.98]]) add(foot, rubber, x, FLOOR_Y + FEET / 2, z);

  // ——— la antena: una base que gira y dos varillas telescópicas ———
  const baseY = rearAt(ANTENNA.z).top - 0.003;
  const disc = keep(loft([ring(0.12, 0.12, 0.06, 0), ring(0.12, 0.12, 0.06, 0.01), ...bend(ring(0.12, 0.12, 0.06, 0.01), ring(0.094, 0.094, 0.047, 0.022), 4, false)], { flip: true, cap: 1 }).rotateX(-Math.PI / 2));
  add(disc, bezel, 0, baseY, ANTENNA.z);
  add(keep(new SphereGeometry(0.026, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), bezel, 0, baseY + 0.02, ANTENNA.z);
  const knuckle = keep(new SphereGeometry(0.0105, 16, 10));
  const tip = keep(new SphereGeometry(0.0072, 14, 10));
  const rods = ANTENNA.segs.map(([len, r]) => keep(new CylinderGeometry(r, r, len, 12).translate(0, len / 2, 0)));
  const collars = ANTENNA.segs.map(([, r]) => keep(new CylinderGeometry(r * 1.35, r * 1.35, 0.009, 12)));
  const tips = [-1, 1].map((sideX) => {
    const arm = new Group();
    arm.position.set(sideX * 0.012, baseY + 0.034, ANTENNA.z);
    arm.rotation.set(ANTENNA.lean, 0, -sideX * ANTENNA.spread);
    group.add(arm);
    add(knuckle, chrome, 0, 0, 0, arm);
    let y = 0;
    ANTENNA.segs.forEach(([len], i) => {
      add(rods[i], chrome, 0, y, 0, arm);
      if (i) add(collars[i - 1], chrome, 0, y + 0.004, 0, arm);
      y += len - 0.012;
    });
    return add(tip, chrome, 0, y + 0.012, 0, arm);
  });

  // ——— el piso: la sombra de la luz, la sombra de contacto y el resplandor ———
  const floorPlane = keep(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const shadowFloor = add(floorPlane, floorShadow, 0, FLOOR_Y, -0.4, group, { cast: false });
  shadowFloor.scale.set(5, 1, 5);
  const blob = add(floorPlane, contact, 0, FLOOR_Y + 0.001, -DEPTH / 2, group, { cast: false, receive: false });
  blob.scale.set(1.85, 1, DEPTH + 0.5);
  blob.renderOrder = -1;
  const spillGlow = add(floorPlane, spillFloor, 0, FLOOR_Y + 0.002, 0.14, group, { cast: false, receive: false });
  spillGlow.scale.set(1.5, 1, 0.56);

  // la luz que la imagen echa: entre el fósforo y el vidrio, así ilumina la
  // pendiente del bisel sin dejar un punto brillante en el vidrio
  const spill = new PointLight(0xffffff, 0, 2, 2);
  spill.position.set(0, TUBE_Y, GLASS_Z - 0.006);
  group.add(spill);

  // ——— puntos para encuadrar ———
  group.updateMatrixWorld(true);
  const bodyPoints = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      bodyPoints.push(new Vector3((sx * FRONT.w) / 2, (sy * FRONT.h) / 2, 0), new Vector3((sx * FRONT.w) / 2, (sy * FRONT.h) / 2, -FRONT.d));
      bodyPoints.push(new Vector3((sx * REAR.w1) / 2, sy > 0 ? REAR.top1 : REAR.bottom, -DEPTH));
    }
    bodyPoints.push(new Vector3(sx * 0.53, FLOOR_Y, -0.09));
  }
  const points = [...bodyPoints, ...tips.map((t) => t.localToWorld(new Vector3())), new Vector3(0, FLOOR_Y, 0.44)];
  const hw = TUBE.w / 2 - TUBE.margin;
  const hh = TUBE.h / 2 - TUBE.margin;
  const edgeZ = PICTURE_Z + TUBE.bulge * (1 - (hw / (TUBE.w / 2)) ** 2) * (1 - (hh / (TUBE.h / 2)) ** 2);
  // arriba a la izquierda, arriba a la derecha, abajo a la derecha, abajo a la izquierda
  const imageCorners = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map(([x, y]) => new Vector3(x, TUBE_Y + y, edgeZ));

  const keys = { prev, next, power };
  const u = screenMat.uniforms;

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
      body.metalness = p.metal;
      body.roughness = p.rough;
      bezel.color.set(p.bezel);
      bezel.roughness = p.bezelRough;
      panel.color.set(p.panel);
      panel.roughness = p.bezelRough + 0.08;
      key.color.set(p.key);
      icon.color.set(p.icon);
      grille.color.set(p.grille);
      grille.metalness = p.grilleMetal;
      grille.roughness = p.grilleRough;
      floorShadow.opacity = p.shadow;
      contact.opacity = p.contact;
      return p;
    },

    /** p 0..1: cuánto está hundida la tecla. */
    press(which, p) {
      const k = keys[which];
      if (k) k.position.z = plateZ - KEY.travel * p;
    },

    /** El tubo según powerCurve (signal.js). */
    setPower(c) {
      u.uScale.value.set(c.sx, c.sy);
      u.uBeam.value = c.beam;
      u.uWhite.value = c.white;
      u.uHalo.value = c.halo;
      u.uIdle.value = c.idle;
    },

    /** El entorno del vidrio, propio: así su intensidad no es la de toda la escena. */
    setEnvironment(texture) {
      glass.envMap = texture;
      glass.needsUpdate = true;
    },

    setLed(on) {
      led.emissiveIntensity = on ? 1 : 0;
      ledGlow.opacity = on ? 0.55 : 0;
      glow.visible = on;
    },

    /** La luz del cuadro hacia adelante: [r, g, b] en 0..1 y cuánto llega (0 apagado). */
    setSpill(rgb, k) {
      const l = Math.max(rgb[0], rgb[1], rgb[2], 1e-4);
      spill.color.setRGB(rgb[0] / l, rgb[1] / l, rgb[2] / l);
      spill.intensity = 2.5 * l * k;
      spillFloor.color.setRGB(rgb[0] / l, rgb[1] / l, rgb[2] / l);
      spillFloor.opacity = Math.min(0.16, 0.7 * l * k);
    },

    dispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
    },
  };
}
