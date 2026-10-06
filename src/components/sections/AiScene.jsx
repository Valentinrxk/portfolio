import { useEffect, useRef } from 'react';

// Órbitas de los tres servidores MCP: radio, inclinación, velocidad y fase
const ORBITS = [
  { r: 1.85, tilt: [1.12, 0.1, 0.38], speed: 0.21, phase: 0.6 },
  { r: 2.3, tilt: [1.38, -0.2, -0.52], speed: -0.15, phase: 2.4 },
  { r: 2.75, tilt: [0.96, 0.15, 0.92], speed: 0.11, phase: 4.3 },
];
const CORE_R = 0.85;
const BARS = 96;
const BAR_R = 1.24;

const ease = (x) => 1 - Math.pow(1 - x, 3);
const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;

/**
 * Escena 3D de "ia en producción": claude como núcleo de cromo, los tres
 * servidores MCP en órbita con pulsos de datos hacia el centro, y Whisper
 * como un anillo ecualizador alrededor. Three.js se carga recién acá.
 */
export default function AiScene({ focus, nodes, theme, reduced, active }) {
  const hostRef = useRef(null);
  const state = useRef({ focus, active, setInk: null, start: null });
  state.current.focus = focus;
  state.current.active = active;

  useEffect(() => {
    let disposed = false;
    let teardown = () => {};

    // three pesa ~190 KB: se pide recién cuando el panel se acerca al cuadro
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        init();
      },
      { rootMargin: '600px 0px' },
    );
    if (hostRef.current) near.observe(hostRef.current);

    const init = async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const host = hostRef.current;
      if (disposed || !host) return;

      const canvas = host.querySelector('canvas');
      const labels = [...host.querySelectorAll('[data-node]')];

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;

      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      const root = new THREE.Group();
      scene.add(root);

      const RED = new THREE.Color('#e10600');
      const readInk = () => new THREE.Color(getComputedStyle(host).getPropertyValue('--ai-ink').trim() || '#e6e7eb');
      let ink = readInk();

      const disposables = [];
      const keep = (x) => (disposables.push(x), x);

      // ——— Núcleo: claude, cromo pulido con una línea roja en el ecuador ———
      const chrome = keep(new THREE.MeshPhysicalMaterial({
        color: 0xdedfe4, metalness: 1, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12,
      }));
      const coreMat = keep(chrome.clone());
      coreMat.emissive = RED.clone();
      coreMat.emissiveIntensity = 0;
      const core = new THREE.Mesh(keep(new THREE.SphereGeometry(CORE_R, 96, 96)), coreMat);
      root.add(core);

      const band = new THREE.Mesh(
        keep(new THREE.TorusGeometry(CORE_R + 0.012, 0.0055, 8, 256)),
        keep(new THREE.MeshBasicMaterial({ color: RED })),
      );
      band.rotation.x = Math.PI / 2;
      root.add(band);

      // ——— Whisper: anillo ecualizador alrededor del núcleo ———
      const barMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const bars = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.02, 1, 0.02)), barMat, BARS);
      const barColor = new THREE.Color();
      const paintBars = () => {
        for (let i = 0; i < BARS; i++) {
          const a = i / BARS;
          // un tramo de la frase "habla" en rojo; el resto, en la tinta del panel
          bars.setColorAt(i, a > 0.58 && a < 0.8 ? RED : barColor.copy(ink));
        }
        bars.instanceColor.needsUpdate = true;
      };
      paintBars();
      root.add(bars);
      const dummy = new THREE.Object3D();

      // ——— MCP: órbitas, satélites, enlaces y pulsos ———
      const ringMat = keep(new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.2 }));
      const satGeo = keep(new THREE.SphereGeometry(0.15, 48, 48));
      const pulseGeo = keep(new THREE.SphereGeometry(0.04, 16, 16));
      const pulseMat = keep(new THREE.MeshBasicMaterial({ color: RED, transparent: true }));
      const sats = ORBITS.map((o) => {
        const pivot = new THREE.Group();
        pivot.rotation.set(...o.tilt);
        root.add(pivot);
        pivot.add(new THREE.Mesh(keep(new THREE.TorusGeometry(o.r, 0.004, 6, 360)), ringMat));
        const sat = new THREE.Mesh(satGeo, chrome);
        pivot.add(sat);
        const linkGeo = keep(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]));
        const linkMat = keep(new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.22 }));
        root.add(new THREE.Line(linkGeo, linkMat));
        const pulse = new THREE.Mesh(pulseGeo, pulseMat.clone());
        disposables.push(pulse.material);
        root.add(pulse);
        return { o, sat, linkGeo, linkMat, pulse };
      });

      // Luces: el entorno da los reflejos; un contraluz rojo firma el cromo
      const rim = new THREE.DirectionalLight(RED, 1.4);
      rim.position.set(-4, 2, -3);
      scene.add(rim);
      const key = new THREE.DirectionalLight(0xffffff, 0.6);
      key.position.set(3, 4, 5);
      scene.add(key);

      state.current.setInk = () => {
        ink = readInk();
        ringMat.color.copy(ink);
        sats.forEach((s) => s.linkMat.color.copy(ink));
        paintBars();
      };

      // ——— Tamaño ———
      let W = 1;
      let H = 1;
      const resize = () => {
        const r = host.getBoundingClientRect();
        W = Math.max(1, r.width);
        H = Math.max(1, r.height);
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        // en pantallas angostas la cámara se aleja hasta que la órbita mayor
        // (radio 2.75 + aire) entra en el ancho de campo horizontal
        const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        const dist = camera.aspect < 1.05 ? Math.max(8.4, 3.05 / halfW) : 8.4;
        camera.position.set(0, 1.05, dist);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(host);

      // ——— Puntero: la escena se inclina hacia donde mira el visitante ———
      const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
      const onPointer = (e) => {
        const r = host.getBoundingClientRect();
        tilt.tx = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
        tilt.ty = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      };
      const onLeave = () => {
        tilt.tx = 0;
        tilt.ty = 0;
      };
      host.addEventListener('pointermove', onPointer);
      host.addEventListener('pointerleave', onLeave);

      // ——— Cuadro ———
      const mix = { mcp: 0, voice: 0, code: 0 };
      const v = new THREE.Vector3();
      const coreDir = new THREE.Vector3();
      const ndc = new THREE.Vector3();
      const camPos = new THREE.Vector3();

      const frame = (now) => {
        const t = reduced ? 2.2 : now * 0.001;
        const s = state.current;
        if (s.active && s.start == null) s.start = now;
        const intro = reduced ? 1 : s.start == null ? 0 : ease(Math.min(1, (now - s.start) / 1400));
        const k = reduced ? 1 : 0.08;
        mix.mcp = lerp(mix.mcp, s.focus === 'mcp' ? 1 : 0, k);
        mix.voice = lerp(mix.voice, s.focus === 'voice' ? 1 : 0, k);
        mix.code = lerp(mix.code, s.focus === 'code' ? 1 : 0, k);

        tilt.x = lerp(tilt.x, tilt.tx, 0.05);
        tilt.y = lerp(tilt.y, tilt.ty, 0.05);
        root.rotation.set(0.18 + tilt.x, t * 0.08 + tilt.y, 0);
        root.scale.setScalar(0.72 + 0.28 * intro);

        // núcleo: con "claude code" en foco, respira en rojo
        coreMat.emissiveIntensity = mix.code * (0.18 + 0.1 * Math.sin(t * 2.4));

        // anillo de voz: suave, nunca aleatorio
        const amp = 0.07 + 0.38 * mix.voice;
        for (let i = 0; i < BARS; i++) {
          const a = (i / BARS) * Math.PI * 2;
          const h = 0.03 + amp * intro
            * (0.5 + 0.5 * Math.sin(a * 3 + t * 2.1))
            * (0.55 + 0.45 * Math.sin(a * 7 - t * 3.2));
          dummy.position.set(Math.cos(a) * BAR_R, 0, Math.sin(a) * BAR_R);
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          bars.setMatrixAt(i, dummy.matrix);
        }
        bars.instanceMatrix.needsUpdate = true;

        camera.getWorldPosition(camPos);
        const coreDist = camPos.length();

        sats.forEach(({ o, sat, linkGeo, linkMat, pulse }, i) => {
          const ang = o.phase + t * o.speed;
          sat.position.set(Math.cos(ang) * o.r, Math.sin(ang) * o.r, 0);
          sat.scale.setScalar(1 + 0.35 * mix.mcp);

          // enlace satélite → superficie del núcleo, en coordenadas de root
          sat.getWorldPosition(v);
          root.worldToLocal(v);
          coreDir.copy(v).normalize().multiplyScalar(CORE_R);
          const pos = linkGeo.attributes.position;
          pos.setXYZ(0, v.x, v.y, v.z);
          pos.setXYZ(1, coreDir.x, coreDir.y, coreDir.z);
          pos.needsUpdate = true;
          linkMat.opacity = (0.16 + 0.5 * mix.mcp) * intro;

          // pulso de datos que viaja hacia claude
          const p = (t * (0.32 + 0.45 * mix.mcp) + i / 3) % 1;
          pulse.position.lerpVectors(v, coreDir, smooth(p));
          pulse.material.opacity = Math.sin(p * Math.PI) * intro;
          pulse.scale.setScalar(1 + mix.mcp * 0.6);

          // etiqueta HTML sobre el satélite; atenuada si pasa detrás del núcleo
          const label = labels[i];
          if (label) {
            sat.getWorldPosition(ndc);
            const behind = ndc.distanceTo(camPos) > coreDist + 0.4;
            ndc.project(camera);
            // a la derecha del satélite; si no entra, salta al otro lado
            const lx = ((ndc.x + 1) / 2) * W;
            const lw = (label.dataset.w ||= String(label.offsetWidth)) * 1;
            const x = lx + 30 + lw > W - 6 ? lx - 30 - lw : lx + 30;
            label.style.transform = `translate(${x}px, ${((1 - ndc.y) / 2) * H - 8}px)`;
            label.style.opacity = String((behind ? 0.35 : 1) * intro);
          }
        });

        const coreLabel = labels[3];
        if (coreLabel) {
          ndc.set(0, -(CORE_R + 0.35) * root.scale.x, 0).project(camera);
          coreLabel.style.transform = `translate(calc(${((ndc.x + 1) / 2) * W}px - 50%), ${((1 - ndc.y) / 2) * H}px)`;
          coreLabel.style.opacity = String(intro);
        }

        ringMat.opacity = 0.2 * intro;
        renderer.render(scene, camera);
      };

      // Solo anima en pantalla; con movimiento reducido, un cuadro quieto
      let raf = null;
      let onScreen = false;
      const loop = (now) => {
        frame(now);
        raf = onScreen ? requestAnimationFrame(loop) : null;
      };
      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        if (reduced) {
          if (onScreen) frame(0);
          return;
        }
        if (onScreen && raf == null) raf = requestAnimationFrame(loop);
      });
      io.observe(host);

      teardown = () => {
        if (raf != null) cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        host.removeEventListener('pointermove', onPointer);
        host.removeEventListener('pointerleave', onLeave);
        bars.dispose();
        disposables.forEach((d) => d.dispose());
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        state.current.setInk = null;
      };
    };

    return () => {
      disposed = true;
      near.disconnect();
      teardown();
    };
  }, [reduced]);

  // El panel se invierte con el tema: la tinta de líneas y barras lo acompaña
  useEffect(() => {
    const id = requestAnimationFrame(() => state.current.setInk?.());
    return () => cancelAnimationFrame(id);
  }, [theme]);

  return (
    <div ref={hostRef} className="ai-scene" aria-hidden="true">
      <canvas className="ai-scene__canvas" />
      {[...nodes, 'claude'].map((name, i) => (
        <span key={name} data-node={i} className={`ai-scene__label${i === nodes.length ? ' is-core' : ''}`}>
          {name}
        </span>
      ))}
    </div>
  );
}
