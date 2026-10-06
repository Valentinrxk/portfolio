import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { smoothScrollTo } from '../../hooks/useSmoothScroll';
import { useLang, EMAIL } from '../../i18n';
import { useTheme } from '../../theme';
import MonkeyMark from '../ui/MonkeyMark';
import './Hud.css';

const SECTION_IDS = ['hero', 'about', 'experience', 'projects', 'skills', 'contact'];

// Secciones cuyo contenido emerge con el scrub: aterrizar en el inicio
// exacto las muestra vacías o en ruido, así que el nav apunta más adentro
const LANDING_FRACTION = { about: 0.16, contact: 0.55 };

/** Medidor de señal: barras que reaccionan a la velocidad del scroll. */
function SignalMeter({ dark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const barInk = dark ? 'rgba(231, 231, 236, 0.5)' : 'rgba(35, 35, 39, 0.5)';
    const W = 96;
    const H = 16;
    const BARS = 20;

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const vals = new Array(BARS).fill(0.12);
    let vel = 0;
    let lastY = window.scrollY;
    let last = 0;
    let raf = null;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      vals.forEach((v, i) => {
        const h = Math.max(2, v * H);
        ctx.fillStyle = v > 0.55 ? '#e10600' : barInk;
        ctx.fillRect(i * (W / BARS), H - h, W / BARS - 1.5, h);
      });
    };

    setup();
    window.addEventListener('resize', setup);

    if (reduced) {
      draw();
      return () => window.removeEventListener('resize', setup);
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 66) return; // ~15 fps: cascada legible
      last = now;
      const dy = Math.abs(window.scrollY - lastY);
      lastY = window.scrollY;
      vel = vel * 0.72 + Math.min(1, dy * 0.012);
      vals.shift();
      vals.push(Math.min(1, 0.08 + vel + Math.random() * 0.07));
      draw();
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', setup);
    };
  }, [dark]);

  return <canvas ref={canvasRef} className="hud__meter" aria-hidden="true" />;
}

/**
 * Marco industrial: arriba el monograma [v/r], el switch de idioma y el
 * medidor de señal; abajo la navegación en palabras y el playhead.
 */
export default function Hud({ live }) {
  const [active, setActive] = useState(0);
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();

  const { scrollYProgress } = useScroll();
  const playhead = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  // Sección activa: la última cuyo inicio pasó la mitad del encuadre
  useEffect(() => {
    let raf = null;

    const measure = () => {
      raf = null;
      const half = window.innerHeight * 0.5;
      let idx = 0;
      SECTION_IDS.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= half) {
          idx = i;
        }
      });
      setActive((prev) => (prev === idx ? prev : idx));
    };

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const goTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const inset = (LANDING_FRACTION[id] ?? 0) * el.offsetHeight;
    smoothScrollTo(top + inset + 2);
  };

  return (
    <>
      <header className={`hud hud--top ${live ? 'is-live' : ''}`}>
        <button type="button" className="hud__brand" onClick={() => smoothScrollTo(0)} aria-label="volver arriba">
          <MonkeyMark size={34} className="hud__brand-mark" />
        </button>

        <div className="hud__right">
          <div className="hud__lang label" role="group" aria-label="idioma / language">
            <button
              type="button"
              className={`hud__lang-opt ${lang === 'es' ? 'is-active' : ''}`}
              onClick={() => setLang('es')}
              aria-pressed={lang === 'es'}
            >
              es
            </button>
            <span className="hud__lang-slash" aria-hidden="true">/</span>
            <button
              type="button"
              className={`hud__lang-opt ${lang === 'en' ? 'is-active' : ''}`}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
            >
              en
            </button>
          </div>

          <div className="hud__lang label" role="group" aria-label="tema / theme">
            <button
              type="button"
              className={`hud__lang-opt ${theme === 'light' ? 'is-active' : ''}`}
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
            >
              {t.theme.light}
            </button>
            <span className="hud__lang-slash" aria-hidden="true">/</span>
            <button
              type="button"
              className={`hud__lang-opt ${theme === 'dark' ? 'is-active' : ''}`}
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
            >
              {t.theme.dark}
            </button>
          </div>

          <a
            className="hud__mail"
            href={`mailto:${EMAIL}`}
            aria-label={t.projects.write}
          >
            <span className="hud__mail-bracket">[</span><span className="hud__mail-at">@</span><span className="hud__mail-bracket">]</span>
          </a>

          <SignalMeter dark={theme === 'dark'} />
        </div>
      </header>

      <nav className={`hud hud--bottom ${live ? 'is-live' : ''}`} aria-label={lang === 'es' ? 'secciones' : 'sections'}>
        <ul className="hud__nav">
          {SECTION_IDS.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                className={`hud__link label ${i === active ? 'is-active' : ''}`}
                onClick={() => goTo(id)}
                aria-current={i === active ? 'true' : undefined}
              >
                {t.nav[id]}
              </button>
            </li>
          ))}
        </ul>

        <div className="hud__timeline" aria-hidden="true">
          <motion.div className="hud__playhead" style={{ scaleX: playhead }} />
        </div>
      </nav>
    </>
  );
}
