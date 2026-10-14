import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsapIfReady, loadGsap } from '../../lib/gsap';

// El ruido sale de la escala ASCII del sitio, pero cada glifo se elige
// con un ancho parecido al de la letra que tapa: así el texto corta en
// los mismos lugares que el final y nada salta de línea al resolverse
const NARROW = '.:-';
const MID = '=+*#';
const WIDE = '%@';
const pick = (set) => set[(Math.random() * set.length) | 0];
const glyph = (ch) => {
  if (/\s/.test(ch)) return ch;
  if (/[iljtfr.,:;'’!|()[\]¡¿?]/i.test(ch)) return pick(NARROW);
  if (/[mwMW@%]/.test(ch)) return pick(WIDE);
  return pick(MID);
};
const noise = (text) => [...text].map(glyph).join('');

const REFRESH = 55; // ms entre re-sorteos del ruido: legible, no frenético
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const durationFor = (text) => Math.min(1.6, 0.55 + text.length * 0.025);

/**
 * Texto que se sintoniza: aparece decodificándose desde la escala ASCII
 * (al asomar en pantalla, o cuando `play` se enciende) y, si el texto
 * cambia (es ↔ en), se re-sintoniza en vez de saltar.
 *
 * GSAP lleva el tiempo (delay, curva, cortes); el contenido del span
 * interno se escribe a mano y React nunca lo toca. El primer pintado ya
 * trae el texto real (buscadores y lectores de pantalla) y no depende de
 * GSAP, que llega después.
 */
export default function Scramble({
  text,
  as: Tag = 'span',
  className,
  trigger = 'view',
  play = true,
  delay = 0,
  labelled = true,
  ...rest
}) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const shown = useRef(false);
  const current = useRef(null);
  const tween = useRef(null);

  // Mientras dura el ruido el bloque no achica: lo de abajo no se mueve
  const lockHeight = () => {
    const outer = outerRef.current;
    // un span en línea no acepta min-height: se fija el bloque que lo contiene
    const box = getComputedStyle(outer).display === 'inline' ? outer.parentElement : outer;
    box.style.minHeight = `${box.offsetHeight}px`;
    return () => {
      box.style.minHeight = '';
    };
  };

  const stop = () => {
    tween.current?.kill();
    tween.current = null;
  };

  const tune = (gsap, target, { fromNoise }) => {
    const el = innerRef.current;
    if (!el) return;
    stop();
    const release = lockHeight();
    const chars = [...target];
    let veil = noise(target);
    let lastShuffle = 0;
    el.textContent = veil;
    const state = { p: 0 };
    tween.current = gsap.to(state, {
      p: 1,
      duration: durationFor(target),
      delay: fromNoise ? delay : 0,
      ease: 'power1.in',
      onUpdate() {
        const now = performance.now();
        if (now - lastShuffle > REFRESH) {
          veil = noise(target);
          lastShuffle = now;
        }
        // la señal gana de izquierda a derecha; lo que falta sigue siendo ruido
        const solved = Math.floor(state.p * chars.length);
        el.textContent = chars.slice(0, solved).join('') + [...veil].slice(solved).join('');
      },
      onComplete() {
        el.textContent = target;
        release();
      },
      onInterrupt: release,
    });
  };

  // Texto: el primero se pinta tal cual; los cambios se re-sintonizan
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (current.current === text) return;
    const first = current.current == null;
    current.current = text;
    const gsap = gsapIfReady();
    if (first || !shown.current || !gsap || prefersReduced()) {
      stop();
      el.textContent = text;
      return;
    }
    tune(gsap, text, { fromNoise: false });
  }, [text]);

  // Entrada: del ruido a la señal, una sola vez
  useEffect(() => {
    if (shown.current || prefersReduced()) return undefined;
    loadGsap();
    const decode = () => {
      if (shown.current) return;
      shown.current = true;
      loadGsap().then((gsap) => tune(gsap, current.current, { fromNoise: true }));
    };
    if (trigger === 'play') {
      if (play) decode();
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      decode();
    });
    io.observe(outerRef.current);
    return () => io.disconnect();
  }, [trigger, play]);

  useEffect(() => stop, []);

  return (
    <Tag ref={outerRef} className={className} aria-label={labelled ? text : undefined} {...rest}>
      <span ref={innerRef} aria-hidden="true" />
    </Tag>
  );
}
