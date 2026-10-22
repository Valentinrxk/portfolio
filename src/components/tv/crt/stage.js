// El escenario del televisor 3D (solo escritorio): la escena, las luces y la
// sombra, la cámara que encuadra el aparato de tres cuartos, el cuadro del
// renderer como textura del vidrio, el encendido, el puntero que vuelve del
// vidrio a la grilla, y la limpieza.
// Este módulo trae three: se pide recién con import(), nunca en el teléfono.
import {
  ACESFilmicToneMapping,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  NoColorSpace,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { DEPTH, createTv } from './model.js';
import { POWER_OFF_S, POWER_ON_S, pictureLight, powerCurve } from './signal.js';
import { pictureAspect, pictureUv } from './tube.js';

const FOV = 24; // un lente largo, de foto de producto
const YAW = -0.55; // de tres cuartos: se ve el costado derecho y la campana
const ELEVATION = 0.26; // la cámara, un poco desde arriba
const BODY_FILL = 0.74; // el aparato (sin la antena) ocupa esto del alto del escenario
const SAFE = 0.96; // y entero, con la antena, entra en esto
const AIM_YAW = 0.1;
const AIM_PITCH = 0.05;
const DAMP = 4; // por segundo
const PRESS_S = 0.22;
const PICTURE_MAX = 1400; // px de dispositivo, de ancho
const KEY_PAD = [3, 8]; // las teclas invisibles, un poco más grandes que las del aparato
const PICTURE_S = 0.45; // al apagar, la imagen se ve hasta que la raya se vuelve punto
const SPILL_EVERY = 4; // cuadros entre una medición de la luz del cuadro y la otra
const FLASH = [1, 0.984, 0.969];

// el tema del sitio, como lo lee el CSS: oscuro con data-theme, claro sin él
const themeNow = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

// El estudio que se refleja (solo para el entorno, PMREM): un cuarto oscuro,
// una caja de luz grande arriba a la izquierda (la principal), una tira fría
// atrás a la derecha (el contraluz), un rebote tenue adelante a la derecha y
// una luz de techo. El vidrio, el cromo y la pintura plateada muestran esto.
function studio() {
  const scene = new Scene();
  const quad = new PlaneGeometry(1, 1);
  const box = new BoxGeometry(1, 1, 1);
  const mats = [];
  const mat = (color, k, back = false) => {
    const m = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), ...(back ? { side: BackSide } : {}) });
    mats.push(m);
    return m;
  };
  const room = new Mesh(box, mat(0x2a2a2f, 1, true));
  room.scale.set(16, 9, 16);
  room.position.y = 3.9;
  scene.add(room);
  const panel = (color, k, [w, h], [x, y, z], at = [0, 0.3, 0]) => {
    const m = new Mesh(quad, mat(color, k));
    m.scale.set(w, h, 1);
    m.position.set(x, y, z);
    m.lookAt(...at);
    scene.add(m);
  };
  panel(0xfff1e0, 6, [3, 4.6], [-5, 1.7, 2.6]);
  panel(0xd6e2ff, 6, [0.9, 4.4], [4.8, 2.2, -3.4]);
  panel(0xffffff, 1.4, [2.8, 1.8], [4.4, 0.4, 4.6]);
  panel(0xffffff, 2.2, [3.2, 3.2], [0.4, 5.6, 0.8], [0, 0, 0]);
  return {
    scene,
    dispose() {
      quad.dispose();
      box.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}

/**
 * createStage(canvas, { picture, keys }) → lanza si three no arranca.
 * `picture`: el canvas del renderer; `keys`: { prev, next, power }, los
 * botones que se ponen encima de las teclas del aparato (el clic y el cursor
 * del sitio, que se abre sobre a y button). El plástico sigue el tema solo.
 * resize(w, h, dpr) → { w, h, dpr } del cuadro · render(dt, { still, fresh,
 * cells, flash }) → true si algo se sigue moviendo · pick(x, y) → { u, v }
 * del cuadro | null · aim(x, y) | aim(null) · press(dir | 'power', still) ·
 * setPower(on, still) · power · showsPicture() · setTheme(name) · onDirty
 * (lo llama cuando hay que volver a dibujar) · dispose().
 */
export function createStage(canvas, { picture, keys: keyEls = {} }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  // una sola sombra, suave, y solo se rehace cuando algo se mueve
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = studio();
  let env = pmrem.fromScene(room.scene, 0.02);
  scene.environment = env.texture;

  // la luz: principal cálida arriba a la izquierda (la de la sombra), relleno
  // frío y bajo a la derecha, y un contraluz frío que dibuja el costado y el techo
  const keyLight = new DirectionalLight(0xfff0dd, 2.6);
  keyLight.position.set(-2.4, 6.2, 3);
  keyLight.target.position.set(0, -0.25, -0.1);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.radius = 6;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.012;
  Object.assign(keyLight.shadow.camera, { left: -1.55, right: 1.55, top: 1.55, bottom: -1.55, near: 3, far: 10 });
  const fill = new DirectionalLight(0xeef1f8, 0.8);
  fill.position.set(3.6, 0.8, 3.6);
  const rim = new DirectionalLight(0xdfe7ff, 2.2);
  rim.position.set(3.2, 3.6, -3.6);
  scene.add(keyLight, keyLight.target, fill, rim);

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
  tv.setEnvironment(env.texture);
  let dirty = true;
  const paint = () => {
    const p = tv.setPalette(themeNow());
    scene.environmentIntensity = p.env;
    dirty = true;
  };
  paint();
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
  const presses = { prev: -1, next: -1, power: -1 }; // segundos desde que se apretó; -1, quieta
  let powerOn = true;
  let powerT = Infinity; // segundos desde el último encendido o apagado
  tv.setLed(true);
  let spillTick = 0;
  const lightAt = [0, 0, 0]; // la luz medida del cuadro
  const lightNow = [0, 0, 0]; // la que se ve, amortiguada

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

  const place = (d, tx, ty) => {
    camera.position.set(tx, ty + d * Math.sin(ELEVATION), d * Math.cos(ELEVATION));
    camera.lookAt(tx, ty, 0);
    camera.updateMatrixWorld(true);
  };

  // encuadre: el aparato a BODY_FILL del alto y, si no entra todo, más lejos;
  // centrado entero (de tres cuartos no es simétrico), en la pose quieta
  const fit = () => {
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    pose(0, 0);
    const half = Math.tan((FOV * Math.PI) / 360);
    let d = 6;
    let tx = 0;
    let ty = 0;
    for (let i = 0; i < 6; i++) {
      place(d, tx, ty);
      const body = extent(tv.bodyPoints);
      const all = extent(tv.points);
      tx += ((all.x0 + all.x1) / 2) * d * half * camera.aspect;
      ty += ((all.y0 + all.y1) / 2) * d * half;
      d *= Math.max(body.h / (2 * BODY_FILL), all.h / (2 * SAFE), all.w / (2 * SAFE));
    }
    place(d, tx, ty);
    dirty = true;
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

  // la caja en px css de una tecla, con la pose de este cuadro
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

  // los botones siguen a las teclas (solo se tocan si se movieron)
  const KEYS = ['prev', 'next', 'power'];
  const placeKeys = () => {
    const boxes = KEYS.map((w) => keyBox(tv.keys[w]));
    const at = boxes.join(';');
    if (at === keyAt) return;
    keyAt = at;
    KEYS.forEach((w, i) => {
      const el = keyEls[w];
      if (!el) return;
      const [x, y, bw, bh] = boxes[i];
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = `${bw}px`;
      el.style.height = `${bh}px`;
    });
  };

  const themes = new MutationObserver(() => {
    paint();
    api.onDirty?.();
  });
  themes.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const onRestored = () => {
    // el entorno vivía en la GPU: se rehace
    env.dispose();
    env = pmrem.fromScene(room.scene, 0.02);
    scene.environment = env.texture;
    tv.setEnvironment(env.texture);
    dirty = true;
  };
  canvas.addEventListener('webglcontextrestored', onRestored);

  const api = {
    onDirty: null,
    // para las pruebas de desarrollo; en producción no existe
    debug: import.meta.env.DEV
      ? {
          scene,
          tv,
          renderer,
          camera,
          // congela el encendido o el apagado en t segundos (para las capturas)
          seek: (t) => {
            powerT = t;
          },
        }
      : undefined,

    resize(w, h, dpr) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      renderer.setPixelRatio(Math.min(dpr || 1, 2));
      renderer.setSize(W, H, false);
      fit();
      api.onDirty?.();
      const pic = pictureSize();
      return { w: pic.w, h: pic.h, dpr: Math.min(dpr || 1, PICTURE_MAX / pic.w) };
    },

    /**
     * Un cuadro de la escena. `fresh`: el renderer acaba de dibujar (el buffer
     * no se conserva: se sube en este mismo rAF); `cells`: la grilla, para la
     * luz que el cuadro echa hacia adelante; `flash`: el destello blanco.
     */
    render(dt, { still = false, fresh = false, cells = null, flash = 0 } = {}) {
      // el aparato mira hacia el puntero, amortiguado; quieto con movimiento reducido
      const k = still ? 1 : 1 - Math.exp(-DAMP * dt);
      const gx = still ? 0 : aimAt.x;
      const gy = still ? 0 : aimAt.y;
      const was = aimNow.x + aimNow.y * 7;
      aimNow.x += (gx - aimNow.x) * k;
      aimNow.y += (gy - aimNow.y) * k;
      let moved = Math.abs(aimNow.x + aimNow.y * 7 - was) > 1e-6;
      let busy = Math.abs(gx - aimNow.x) + Math.abs(gy - aimNow.y) > 1e-4;
      pose(aimNow.x * AIM_YAW, aimNow.y * AIM_PITCH);
      for (const which of KEYS) {
        const t = presses[which];
        if (t < 0) continue;
        const nt = t + dt;
        // baja rápido y vuelve más despacio
        const p = nt < 0.06 ? nt / 0.06 : Math.max(0, 1 - (nt - 0.06) / (PRESS_S - 0.06));
        tv.press(which, p);
        presses[which] = nt >= PRESS_S ? -1 : nt;
        moved = true;
        busy = true;
      }
      // el tubo: la imagen que se cierra o se abre
      if (powerT < (powerOn ? POWER_ON_S : POWER_OFF_S)) {
        powerT += dt;
        busy = true;
      }
      const c = powerCurve(powerT, powerOn);
      tv.setPower(c);
      // la luz del cuadro: medida cada tantos cuadros en la grilla, más el destello
      if (fresh && cells && spillTick++ % SPILL_EVERY === 0) {
        const l = pictureLight(cells.data, cells.cols, cells.rows, 2);
        for (let i = 0; i < 3; i++) lightAt[i] = l[i];
      }
      const kl = still ? 1 : 1 - Math.exp(-10 * dt);
      for (let i = 0; i < 3; i++) lightNow[i] += (lightAt[i] - lightNow[i]) * kl;
      const shown = lightNow.map((l, i) => l + (FLASH[i] * 0.6 - l) * flash);
      tv.setSpill(shown, c.beam * c.sx * c.sy + 0.04 * c.halo);
      // el cuadro recién dibujado
      if (picture.width !== texW || picture.height !== texH) {
        texture.dispose();
        texW = picture.width;
        texH = picture.height;
      }
      if (fresh) texture.needsUpdate = true;
      if (moved || dirty) renderer.shadowMap.needsUpdate = true;
      dirty = false;
      renderer.render(scene, camera);
      placeKeys();
      return busy;
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

    /** Una tecla se hunde un momento: la CH del lado de dir, o 'power' (nada con movimiento reducido). */
    press(dir, still = false) {
      if (still) return;
      presses[dir === 'power' ? 'power' : dir > 0 ? 'next' : 'prev'] = 0;
    },

    /** Prende o apaga el tubo: la imagen se cierra en una raya y un punto, o se abre (corte seco con `still`). */
    setPower(on, still = false) {
      on = !!on;
      if (on === powerOn) return;
      powerOn = on;
      powerT = still ? Infinity : 0;
      tv.setLed(on);
      dirty = true;
    },

    get power() {
      return powerOn;
    },

    /** ¿Hace falta el cuadro? Encendido, o al apagar mientras todavía se ve la imagen. */
    showsPicture() {
      return powerOn || powerT < PICTURE_S;
    },

    setTheme(name) {
      const p = tv.setPalette(name);
      scene.environmentIntensity = p.env;
      dirty = true;
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
  return api;
}
