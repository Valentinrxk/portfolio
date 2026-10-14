import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { jumpTo } from '../../hooks/useSmoothScroll';
import { asciiCut } from './AsciiCut';
import { useLang, EMAIL } from '../../i18n';
import { useTheme } from '../../theme';
import MonkeyMark from '../ui/MonkeyMark';
import './Hud.css';

const SECTION_IDS = ['hero', 'experience', 'projects', 'skills', 'contact'];

// Secciones cuyo contenido emerge con el scrub: aterrizar en el inicio
// exacto las muestra vacías o en ruido, así que el nav apunta más adentro
const LANDING_FRACTION = { contact: 0.55 };

/**
 * Marco industrial: arriba el monograma, el idioma, el tema y el mail;
 * abajo la navegación en palabras y el playhead.
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

  // El centro del botón tocado: de ahí sale la ola del corte
  const originOf = (e) => {
    const r = e?.currentTarget?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined;
  };

  // Navegar es un corte de montaje: la ola ASCII tapa, salta y destapa
  const goTo = (id, e) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const inset = (LANDING_FRACTION[id] ?? 0) * el.offsetHeight;
    asciiCut(() => jumpTo(top + inset + 2), originOf(e));
  };

  return (
    <>
      <header className={`hud hud--top ${live ? 'is-live' : ''}`}>
        <button type="button" className="hud__brand" onClick={(e) => asciiCut(() => jumpTo(0), originOf(e))} aria-label="volver arriba">
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

          <button
            type="button"
            className="hud__theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-pressed={theme === 'dark'}
            aria-label={t.theme.dark}
          >
            <span className="hud__theme-bracket" aria-hidden="true">[</span>
            <span className="hud__theme-dot" aria-hidden="true" />
            <span className="hud__theme-bracket" aria-hidden="true">]</span>
          </button>

          <a
            className="hud__mail"
            href={`mailto:${EMAIL}`}
            aria-label={t.projects.write}
          >
            <span className="hud__mail-bracket">[</span><span className="hud__mail-at">@</span><span className="hud__mail-bracket">]</span>
          </a>
        </div>
      </header>

      <nav className={`hud hud--bottom ${live ? 'is-live' : ''}`} aria-label={lang === 'es' ? 'secciones' : 'sections'}>
        <ul className="hud__nav">
          {SECTION_IDS.map((id, i) => (
            <li key={id}>
              <button
                type="button"
                className={`hud__link label ${i === active ? 'is-active' : ''}`}
                onClick={(e) => goTo(id, e)}
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
