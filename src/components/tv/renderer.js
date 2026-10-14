// Renderer del televisor (WebGL2), portado del de 砂:
//   1 · escena: cada píxel busca su celda y su letra en el atlas (texelFetch)
//   2 · fósforo: lo brillante, a un cuarto, desenfocado
//   3 · tubo: curvatura, barrido, máscara, aberración, viñeta, parpadeo, rollo
import { GLYPHS, PALETTE } from './cells.js';

const FONT = "ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace";
const CJK = "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', 'Noto Sans CJK JP', 'Noto Sans JP', sans-serif";
const ATLAS_COLS = 16;
const XH = 0.46; // altura de la x, en celdas
const STROKES = '|/\\';
const BG = [0.062, 0.068, 0.07]; // el vidrio encendido nunca es negro
const BLOOM = 0.95;

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PAL = new Float32Array(48);
PALETTE.forEach((h, i) => PAL.set(rgb(h), i * 3));

const QUAD_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const SCENE_FS = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uData;   // cols × rows: letra, brillo, tono, fondo
uniform sampler2D uAtlas;  // casilleros de cw × ch
uniform ivec2 uGrid;
uniform ivec2 uCell;
uniform ivec2 uOrigin;
uniform float uHeight;
uniform vec3 uBg;
uniform vec3 uPalette[16];
out vec4 outColor;
void main() {
  ivec2 p = ivec2(int(gl_FragCoord.x), int(uHeight - gl_FragCoord.y));
  ivec2 q = p - uOrigin;
  vec3 c = uBg;
  ivec2 size = uGrid * uCell;
  if (q.x >= 0 && q.y >= 0 && q.x < size.x && q.y < size.y) {
    ivec2 cell = q / uCell;
    vec4 d = texelFetch(uData, cell, 0);
    // el fondo de las celdas, interpolado: las manchas son suaves, no bloques
    vec2 fc = (vec2(q) + 0.5) / vec2(uCell) - 0.5;
    ivec2 i0 = ivec2(floor(fc));
    vec2 fr = fc - vec2(i0);
    ivec2 hi = uGrid - 1;
    float s00 = texelFetch(uData, clamp(i0, ivec2(0), hi), 0).a;
    float s10 = texelFetch(uData, clamp(i0 + ivec2(1, 0), ivec2(0), hi), 0).a;
    float s01 = texelFetch(uData, clamp(i0 + ivec2(0, 1), ivec2(0), hi), 0).a;
    float s11 = texelFetch(uData, clamp(i0 + ivec2(1, 1), ivec2(0), hi), 0).a;
    fr = fr * fr * (3.0 - 2.0 * fr);
    c = uBg * mix(mix(s00, s10, fr.x), mix(s01, s11, fr.x), fr.y);
    // letra de 12 bits: 8 en r y 4 arriba del tono, en b
    int tb = int(d.b * 255.0 + 0.5);
    int g = int(d.r * 255.0 + 0.5) | ((tb >> 4) << 8);
    if (g > 0) {
      ivec2 local = q - cell * uCell;
      float a = texelFetch(uAtlas, ivec2(g % ${ATLAS_COLS}, g / ${ATLAS_COLS}) * uCell + local, 0).a;
      float b = d.g * 2.0;
      vec3 lit = uPalette[tb & 15] * b;
      // más allá de 1, el fósforo se satura hacia el blanco
      lit += vec3(max(b - 1.0, 0.0) * 0.4);
      c += lit * a;
    }
  }
  outColor = vec4(c, 1.0);
}`;

const BRIGHT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uOut;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec3 c = texture(uSrc, uv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, -1.0)).rgb
         + texture(uSrc, uv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, uv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  outColor = vec4(c * smoothstep(0.22, 0.8, l), 1.0);
}`;

const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uOut;
uniform vec2 uDir;
out vec4 outColor;
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec3 c = texture(uSrc, uv).rgb * 0.2270270;
  c += (texture(uSrc, uv + uDir * 1.3846154).rgb + texture(uSrc, uv - uDir * 1.3846154).rgb) * 0.3162162;
  c += (texture(uSrc, uv + uDir * 3.2307692).rgb + texture(uSrc, uv - uDir * 3.2307692).rgb) * 0.0702703;
  outColor = vec4(c, 1.0);
}`;

const POST_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform sampler2D uOsd;
uniform vec4 uOsdRect;
uniform float uOsdAlpha;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uRoll;
uniform float uJitter;
uniform float uFlash;
uniform float uFlicker;
uniform float uBand;
uniform float uK;
uniform float uScan;
uniform float uRadius;
out vec4 outColor;
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
// lo que dibuja el televisor encima (el número): no rueda con la señal
vec3 osd(vec3 c, sampler2D t, vec4 rect, float alpha, vec2 p) {
  vec2 o = (p - rect.xy) / rect.zw;
  if (o.x > -0.1 && o.y > -0.1 && o.x < 1.1 && o.y < 1.1) {
    vec2 px = 1.0 / rect.zw;
    vec4 k = texture(t, o);
    float halo = (texture(t, o + px * vec2(4.0, 0.0)).a + texture(t, o - px * vec2(4.0, 0.0)).a
                + texture(t, o + px * vec2(0.0, 4.0)).a + texture(t, o - px * vec2(0.0, 4.0)).a) * 0.25;
    float ink = dot(k.rgb, vec3(0.333)) * k.a;
    c = mix(c, k.rgb, k.a * alpha);
    c += vec3(0.16) * halo * ink * alpha + vec3(0.05) * halo * alpha * (1.0 - k.a);
  }
  return c;
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 cc = uv * 2.0 - 1.0;
  // curvatura: el centro se acerca, las esquinas se van
  vec2 dc = cc * (1.0 + uK * dot(cc, cc)) / (1.0 + uK);
  float aspect = uRes.x / uRes.y;
  float edge = box(dc * vec2(aspect, 1.0), vec2(aspect, 1.0), uRadius);
  float inside = 1.0 - smoothstep(-1.5 / uRes.y, 1.5 / uRes.y, edge);
  vec2 suv = dc * 0.5 + 0.5;
  float y = 1.0 - suv.y;
  // rollo vertical (se suelta el sincronismo)
  float seam = fract(y - uRoll);
  float row = floor(y * uRes.y / (4.0 * uDpr));
  float jx = (hash(vec2(row, floor(uTime * 60.0))) - 0.5) * uJitter + sin(y * 37.0 + uTime * 41.0) * uJitter * 0.2;
  vec2 s = vec2(suv.x + jx, 1.0 - seam);
  float off = 0.5 * uDpr / uRes.x;
  vec3 c;
  c.r = texture(uScene, s + vec2(off, 0.0)).r;
  c.g = texture(uScene, s).g;
  c.b = texture(uScene, s - vec2(off, 0.0)).b;
  vec3 glow = texture(uBloom, s).rgb;
  c += glow * ${BLOOM};
  if (uRoll != 0.0) c *= mix(0.04, 1.0, smoothstep(0.0, 0.04, seam) * smoothstep(1.0, 0.985, seam));
  // el número de canal
  if (uOsdAlpha > 0.0) c = osd(c, uOsd, uOsdRect, uOsdAlpha, vec2(suv.x, y) * uRes);
  // barrido: las líneas siguen la curva; lo brillante las ensancha
  float sl = 0.5 + 0.5 * cos(y * uRes.y / uScan * 6.2831853);
  float l = max(c.r, max(c.g, c.b));
  c *= 1.0 - 0.3 * sl * (1.0 - 0.45 * clamp(l, 0.0, 1.0));
  // máscara de apertura, apenas
  float m = mod(gl_FragCoord.x, 3.0);
  c *= vec3(m < 1.0 ? 1.0 : 0.94, (m >= 1.0 && m < 2.0) ? 1.0 : 0.94, m >= 2.0 ? 1.0 : 0.94) * 1.04;
  // viñeta
  c *= 1.0 - 0.45 * pow(clamp(length(dc * vec2(0.9, 1.0)) / 1.35, 0.0, 1.0), 2.4);
  // parpadeo (≤ 2 %) y una banda clara que baja despacio
  float fl = 1.0 + uFlicker * (0.011 * sin(uTime * 59.0) + 0.008 * (hash(vec2(floor(uTime * 24.0), 7.0)) - 0.5));
  float d = fract(y - uTime * 0.045 + 0.5) - 0.5;
  c *= fl * (1.0 + uBand * 0.05 * exp(-d * d / 0.005));
  // un cuadro blanco
  c = mix(c, vec3(1.0, 0.985, 0.97) * (0.9 + 0.1 * (1.0 - sl)), uFlash);
  // el vidrio: un reflejo apenas, arriba a la izquierda
  c += vec3(0.016) * smoothstep(1.0, 0.0, length((dc - vec2(-0.55, 0.62)) * vec2(0.8, 1.2)));
  c = mix(vec3(0.006), c, inside);
  outColor = vec4(c, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function program(gl, vs, fs, names) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p));
  return { p, u: Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) };
}

// Atlas al tamaño exacto de la celda: un casillero cw × ch por letra; las
// anchas se dibujan en dos casilleros seguidos
function atlas({ cw, ch }) {
  const rows = Math.ceil(GLYPHS.length / ATLAS_COLS);
  const c = document.createElement('canvas');
  c.width = ATLAS_COLS * cw;
  c.height = rows * ch;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = `700 100px ${FONT}`;
  const advance = g.measureText('M').width / 100;
  const size = Math.min((cw * 1.04) / advance, ch * 0.86);
  g.font = `700 ${size}px ${FONT}`;
  const xh = g.measureText('x').actualBoundingBoxAscent || size * 0.5;
  const tall = Math.max(0.9, Math.min(1.25, (ch * XH) / xh));
  const wide = document.createElement('canvas');
  wide.width = cw * 2;
  wide.height = ch;
  const wg = wide.getContext('2d');
  wg.fillStyle = '#fff';
  wg.textAlign = 'center';
  wg.textBaseline = 'alphabetic';
  wg.font = `500 ${Math.round(ch * 0.8)}px ${CJK}`;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  GLYPHS.forEach(({ ch: char, half }, i) => {
    if (i === 0) return;
    const x = (i % ATLAS_COLS) * cw;
    const y = Math.floor(i / ATLAS_COLS) * ch;
    if (half === 0) {
      g.save();
      g.beginPath();
      g.rect(x, y, cw, ch);
      g.clip();
      if (STROKES.includes(char)) {
        // los trazos ocupan toda la altura: las líneas se tocan entre filas
        // y las diagonales, todo el ancho: empalman en la fila siguiente
        const m = g.measureText(char);
        const sy = (ch * 1.04) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
        const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        const sx = char === '|' ? 1 : (cw * 1.02) / ink;
        const mid = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        g.setTransform(sx, 0, 0, sy, x + cw / 2 - mid * sx, y - ch * 0.02 + m.actualBoundingBoxAscent * sy);
      } else {
        // la x centrada en la celda: o, @, -, = quedan al medio
        g.setTransform(1, 0, 0, tall, x + cw / 2, y + ch / 2 + (xh * tall) / 2);
      }
      g.fillText(char, 0, 0);
      g.restore();
    } else if (half === 1) {
      wg.clearRect(0, 0, cw * 2, ch);
      const m = wg.measureText(char);
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      wg.fillText(char, cw, ch / 2 + h / 2 - m.actualBoundingBoxDescent);
      g.drawImage(wide, 0, 0, cw, ch, x, y, cw, ch);
      const j = i + 1;
      g.drawImage(wide, cw, 0, cw, ch, (j % ATLAS_COLS) * cw, Math.floor(j / ATLAS_COLS) * ch, cw, ch);
    }
  });
  return c;
}

/**
 * createRenderer(canvas) → null sin WebGL2; si no:
 * layout(grid) · osd({ canvas, x, y, w, h } | null) · draw(frame) · dispose().
 */
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  let res = null; // recursos de GL (se rehacen si se pierde el contexto)
  let lost = false;
  let grid = null;
  let osd = null; // el número de canal

  const texture = (filter) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };

  const target = (w, h) => {
    const tex = texture(gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  };

  const init = () => {
    const scene = program(gl, QUAD_VS, SCENE_FS, ['uData', 'uAtlas', 'uGrid', 'uCell', 'uOrigin', 'uHeight', 'uBg', 'uPalette']);
    const bright = program(gl, QUAD_VS, BRIGHT_FS, ['uSrc', 'uOut', 'uTexel']);
    const blur = program(gl, QUAD_VS, BLUR_FS, ['uSrc', 'uOut', 'uDir']);
    const post = program(gl, QUAD_VS, POST_FS, ['uScene', 'uBloom', 'uOsd', 'uOsdRect', 'uOsdAlpha', 'uRes', 'uDpr', 'uTime', 'uRoll', 'uJitter', 'uFlash', 'uFlicker', 'uBand', 'uK', 'uScan', 'uRadius']);
    gl.useProgram(scene.p);
    gl.uniform1i(scene.u.uData, 0);
    gl.uniform1i(scene.u.uAtlas, 1);
    gl.uniform3fv(scene.u.uPalette, PAL);
    gl.uniform3fv(scene.u.uBg, BG);
    gl.useProgram(post.p);
    gl.uniform1i(post.u.uScene, 0);
    gl.uniform1i(post.u.uBloom, 1);
    gl.uniform1i(post.u.uOsd, 2);
    res = {
      scene,
      bright,
      blur,
      post,
      vao: gl.createVertexArray(),
      dataTex: texture(gl.NEAREST),
      atlasTex: texture(gl.NEAREST),
      osdTex: texture(gl.LINEAR),
      sceneT: null,
      bloomA: null,
      bloomB: null,
    };
    // OSD vacío de 1×1 hasta que llegue el primero
    gl.bindTexture(gl.TEXTURE_2D, res.osdTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  };

  const freeTargets = () => {
    for (const t of [res.sceneT, res.bloomA, res.bloomB]) {
      if (!t) continue;
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
  };

  const uploadOsd = () => {
    if (!osd) return;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.bindTexture(gl.TEXTURE_2D, res.osdTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, osd.canvas);
  };

  const applyLayout = () => {
    const { width, height, cols, rows } = grid;
    canvas.width = width;
    canvas.height = height;
    freeTargets();
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, res.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas(grid));
    gl.bindTexture(gl.TEXTURE_2D, res.dataTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    res.sceneT = target(width, height);
    const bw = Math.max(1, Math.round(width / 4));
    const bh = Math.max(1, Math.round(height / 4));
    res.bloomA = target(bw, bh);
    res.bloomB = target(bw, bh);
    uploadOsd();
  };

  const onLost = (e) => {
    e.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    lost = false;
    init();
    if (grid) applyLayout();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  init();

  const pass = (t, prog) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
    gl.viewport(0, 0, t ? t.w : grid.width, t ? t.h : grid.height);
    gl.useProgram(prog.p);
    return prog.u;
  };

  return {
    layout(next) {
      grid = next;
      if (!lost) applyLayout();
    },

    /** Lo ya dibujado en osd.js, o null. */
    osd(next) {
      osd = next;
      if (!lost && res) uploadOsd();
    },

    draw({ data, time = 0, roll = 0, jitter = 0, flash = 0, flicker = 1, band = 1, osdAlpha = 0, barrel = 0.08 }) {
      if (lost || !grid) return;
      const { cols, rows, width: W, height: H } = grid;
      gl.bindVertexArray(res.vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, res.dataTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA, gl.UNSIGNED_BYTE, data);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, res.atlasTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, res.osdTex);

      // 1 · escena
      let u = pass(res.sceneT, res.scene);
      gl.uniform2i(u.uGrid, cols, rows);
      gl.uniform2i(u.uCell, grid.cw, grid.ch);
      gl.uniform2i(u.uOrigin, grid.ox, grid.oy);
      gl.uniform1f(u.uHeight, H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2 · fósforo: lo brillante, a un cuarto, desenfocado
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, res.sceneT.tex);
      u = pass(res.bloomA, res.bright);
      gl.uniform1i(u.uSrc, 0);
      gl.uniform2f(u.uOut, res.bloomA.w, res.bloomA.h);
      gl.uniform2f(u.uTexel, 1 / W, 1 / H);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const spread = 1.5;
      for (const [src, dst, dx, dy] of [[res.bloomA, res.bloomB, spread, 0], [res.bloomB, res.bloomA, 0, spread]]) {
        gl.bindTexture(gl.TEXTURE_2D, src.tex);
        u = pass(dst, res.blur);
        gl.uniform1i(u.uSrc, 0);
        gl.uniform2f(u.uOut, dst.w, dst.h);
        gl.uniform2f(u.uDir, dx / dst.w, dy / dst.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // 3 · el tubo
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, res.sceneT.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, res.bloomA.tex);
      u = pass(null, res.post);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform1f(u.uDpr, grid.dpr);
      gl.uniform1f(u.uTime, time);
      gl.uniform1f(u.uRoll, roll);
      gl.uniform1f(u.uJitter, jitter);
      gl.uniform1f(u.uFlash, flash);
      gl.uniform1f(u.uFlicker, flicker);
      gl.uniform1f(u.uBand, band);
      gl.uniform1f(u.uK, barrel);
      gl.uniform1f(u.uScan, grid.ch / 5);
      gl.uniform1f(u.uRadius, grid.mobile ? 0.085 : 0.075);
      const o = osd && osdAlpha > 0 ? osd : null;
      gl.uniform4f(u.uOsdRect, o ? o.x : 0, o ? o.y : 0, o ? o.w : 1, o ? o.h : 1);
      gl.uniform1f(u.uOsdAlpha, o ? osdAlpha : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    },

    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (res && !lost) {
        freeTargets();
        [res.dataTex, res.atlasTex, res.osdTex].forEach((t) => gl.deleteTexture(t));
        gl.deleteVertexArray(res.vao);
        [res.scene, res.bright, res.blur, res.post].forEach((p) => gl.deleteProgram(p.p));
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
