// El escenario del televisor 3D (solo escritorio): la escena, la luz, la
// cámara que encuadra el aparato, el cuadro del renderer como textura del
// vidrio, el puntero que vuelve del vidrio a la grilla, y la limpieza.
// Este módulo trae three: se pide recién con import(), nunca en el teléfono.
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  DirectionalLight,
  Group,
  LinearFilter,
  NoColorSpace,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEPTH, createTv } from './model.js';
import { pictureAspect, pictureUv } from './tube.js';

const FOV = 30;
const YAW = -0.28; // de tres cuartos: se ve el costado derecho
const ELEVATION = 0.12; // la cámara, apenas desde arriba
const BODY_FILL = 0.77; // el frente ocupa esto del alto del escenario
const SAFE = 0.97; // y el aparato entero, con la antena, entra en esto
const AIM_YAW = 0.1;
const AIM_PITCH = 0.05;
const DAMP = 4; // por segundo
const PRESS_S = 0.22;
const PICTURE_MAX = 1400; // px de dispositivo, de ancho
const KEY_PAD = [3, 8]; // las teclas invisibles, un poco más grandes que las del aparato

// el tema del sitio, como lo lee el CSS: oscuro con data-theme, claro sin él
const themeNow = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

/**
 * createStage(canvas, { picture, keys }) → lanza si three no arranca.
 * `picture`: el canvas del renderer; `keys`: { prev, next }, los botones
 * invisibles que se ponen encima de las teclas CH (el clic y el cursor del
 * sitio, que se abre sobre a y button). El plástico sigue el tema solo.
 * resize(w, h, dpr) → { w, h, dpr } del cuadro · render(dt, { still }) ·
 * pick(x, y) → { u, v } del cuadro | null · aim(x, y) | aim(null) ·
 * press(dir, still) · setTheme(name) · dispose().
 */
export function createStage(canvas, { picture, keys: keyEls = {} }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  let env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.55;

  const keyLight = new DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(-2.4, 3.6, 4.2);
  scene.add(keyLight);

  // el cuadro del renderer: se sube tal cual, sin espacio de color ni mipmaps
  const texture = new CanvasTexture(picture);
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  let texW = picture.width;
  let texH = picture.height;

  const tv = createTv(texture);
  tv.setPalette(themeNow());
  const themes = new MutationObserver(() => tv.setPalette(themeNow()));
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // el giro es alrededor del medio del aparato, no de la cara del frente
  const pivot = new Group();
  pivot.rotation.order = 'YXZ';
  tv.group.position.z = DEPTH / 2;
  pivot.add(tv.group);
  scene.add(pivot);

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 50);
  let W = 1;
  let H = 1;
  const aimAt = { x: 0, y: 0 };
  const aimNow = { x: 0, y: 0 };
  const presses = { prev: -1, next: -1 }; // segundos desde que se apretó; -1, quieta

  const v = new Vector3();
  const ndc = new Vector2();
  const ray = new Raycaster();
  let keyAt = ''; // dónde quedaron las teclas invisibles

  const pose = (yaw, pitch) => {
    pivot.rotation.set(pitch, YAW + yaw, 0);
    pivot.updateMatrixWorld(true);
  };

  // la caja en NDC de unos puntos del modelo
  const extent = (points) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of points) {
      tv.group.localToWorld(v.copy(p)).project(camera);
      x0 = Math.min(x0, v.x);
      x1 = Math.max(x1, v.x);
      y0 = Math.min(y0, v.y);
      y1 = Math.max(y1, v.y);
    }
    return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
  };

  const place = (d, ty) => {
    camera.position.set(0, ty + d * Math.sin(ELEVATION), d * Math.cos(ELEVATION));
    camera.lookAt(0, ty, 0);
    camera.updateMatrixWorld(true);
  };

  // encuadre: el frente a BODY_FILL del alto y, si no entra todo, más lejos;
  // el aparato entero, centrado (la pose quieta, sin el puntero)
  const fit = () => {
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    pose(0, 0);
    const half = Math.tan((FOV * Math.PI) / 360);
    let d = 4;
    let ty = 0;
    for (let i = 0; i < 5; i++) {
      place(d, ty);
      const body = extent(tv.bodyPoints);
      const all = extent(tv.points);
      ty += ((all.y0 + all.y1) / 2) * d * half;
      d *= Math.max(body.h / (2 * BODY_FILL), all.h / (2 * SAFE), all.w / (2 * SAFE));
    }
    place(d, ty);
  };

  // el área de imagen en px css, para que el cuadro tenga la densidad de hoy
  const pictureSize = () => {
    const c = tv.imageCorners.map((p) => {
      tv.group.localToWorld(v.copy(p)).project(camera);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    });
    const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const aspect = pictureAspect();
    const w = Math.max(len(c[0], c[1]), len(c[3], c[2]), len(c[0], c[3]) * aspect, len(c[1], c[2]) * aspect);
    return { w, h: w / aspect };
  };

  // la caja en px css de una tecla CH, con la pose de este cuadro
  const keyBox = (mesh) => {
    const box = mesh.geometry.boundingBox || (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      mesh.localToWorld(v).project(camera);
      x0 = Math.min(x0, ((v.x + 1) / 2) * W);
      x1 = Math.max(x1, ((v.x + 1) / 2) * W);
      y0 = Math.min(y0, ((1 - v.y) / 2) * H);
      y1 = Math.max(y1, ((1 - v.y) / 2) * H);
    }
    return [x0 - KEY_PAD[0], y0 - KEY_PAD[1], x1 - x0 + KEY_PAD[0] * 2, y1 - y0 + KEY_PAD[1] * 2].map(Math.round);
  };

  // los botones invisibles siguen a las teclas (solo se tocan si se movieron)
  const placeKeys = () => {
    const boxes = ['prev', 'next'].map((w) => keyBox(tv.keys[w]));
    const at = boxes.join(';');
    if (at === keyAt) return;
    keyAt = at;
    ['prev', 'next'].forEach((w, i) => {
      const el = keyEls[w];
      if (!el) return;
      const [x, y, bw, bh] = boxes[i];
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = `${bw}px`;
      el.style.height = `${bh}px`;
    });
  };

  const onRestored = () => {
    // el entorno vivía en la GPU: se rehace
    env.dispose();
    env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
  };
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    resize(w, h, dpr) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      renderer.setPixelRatio(Math.min(dpr || 1, 2));
      renderer.setSize(W, H, false);
      fit();
      const pic = pictureSize();
      return { w: pic.w, h: pic.h, dpr: Math.min(dpr || 1, PICTURE_MAX / pic.w) };
    },

    render(dt, { still = false } = {}) {
      // el aparato mira hacia el puntero, amortiguado; quieto con movimiento reducido
      const k = still ? 1 : 1 - Math.exp(-DAMP * dt);
      aimNow.x += ((still ? 0 : aimAt.x) - aimNow.x) * k;
      aimNow.y += ((still ? 0 : aimAt.y) - aimNow.y) * k;
      pose(aimNow.x * AIM_YAW, aimNow.y * AIM_PITCH);
      for (const which of ['prev', 'next']) {
        const t = presses[which];
        if (t < 0) continue;
        const nt = t + dt;
        // baja rápido y vuelve más despacio
        const p = nt < 0.06 ? nt / 0.06 : Math.max(0, 1 - (nt - 0.06) / (PRESS_S - 0.06));
        tv.press(which, p);
        presses[which] = nt >= PRESS_S ? -1 : nt;
      }
      // el cuadro recién dibujado (el buffer no se conserva: mismo cuadro de rAF)
      if (picture.width !== texW || picture.height !== texH) {
        texture.dispose();
        texW = picture.width;
        texH = picture.height;
      }
      texture.needsUpdate = true;
      renderer.render(scene, camera);
      placeKeys();
    },

    /** Del puntero (px de la ventana) al cuadro: { u, v } en 0..1, v hacia abajo; null fuera de la imagen. */
    pick(x, y) {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set(((x - r.left) / r.width) * 2 - 1, 1 - ((y - r.top) / r.height) * 2);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(tv.screen, false)[0];
      return hit?.uv ? pictureUv(hit.uv.x, hit.uv.y) : null;
    },

    /** El mouse (px de la ventana): el aparato se vuelve hacia él. null: vuelve al centro. */
    aim(x, y) {
      const r = canvas.getBoundingClientRect();
      if (x == null || !r.width || !r.height) {
        aimAt.x = 0;
        aimAt.y = 0;
        return;
      }
      aimAt.x = Math.max(-1, Math.min(1, ((x - r.left) / r.width) * 2 - 1));
      aimAt.y = Math.max(-1, Math.min(1, ((y - r.top) / r.height) * 2 - 1));
    },

    /** La tecla CH del lado de dir se hunde un momento (sin animación con movimiento reducido). */
    press(dir, still = false) {
      if (still) return;
      presses[dir > 0 ? 'next' : 'prev'] = 0;
    },

    setTheme(name) {
      tv.setPalette(name);
    },

    dispose() {
      canvas.removeEventListener('webglcontextrestored', onRestored);
      themes.disconnect();
      Object.values(keyEls).forEach((el) => el?.removeAttribute('style'));
      tv.dispose();
      texture.dispose();
      env.dispose();
      room.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
