import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiGif from '../ascii/AsciiGif';
import { useLang } from '../../i18n';
import './Hero.css';

/**
 * El hero es la animación ASCII: el gorila saltando en la cama elástica,
 * gigante, protagonista. La tipografía acompaña desde el margen izquierdo
 * con la declaración de principios; al scrollear, la señal se desarma.
 */
export default function Hero({ play }) {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // El retrato se rompe en bandas durante el primer tramo del scroll
  const tear = useTransform(scrollYProgress, [0.05, 0.7], [0, 1]);
  const typeOpacity = useTransform(scrollYProgress, [0.2, 0.55], [1, 0]);
  const typeY = useTransform(scrollYProgress, [0.2, 0.6], [0, -80]);

  const typeStyle = reduced ? undefined : { opacity: typeOpacity, y: typeY };

  return (
    <section id="hero" ref={sectionRef} className={`hero ${play ? 'is-playing' : ''}`}>
      <div className="hero__frame">
        <div className="hero__portrait">
          <AsciiGif progressValue={reduced ? null : tear} className="hero__canvas" />
        </div>

        <motion.div className="hero__type" style={typeStyle}>
          <p className="hero__kicker caps">
            <span className="hero__kicker-slash" aria-hidden="true">///</span>
            {t.hero.kicker}
          </p>
          <h1 className="hero__statement">
            {t.hero.statement}
            <span className="hero__caret" aria-hidden="true">_</span>
          </h1>
          <p className="hero__sub">{t.hero.sub}</p>
        </motion.div>
      </div>
    </section>
  );
}
