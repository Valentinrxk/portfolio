import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiPortraitLive from '../ascii/AsciiPortraitLive';
import { useLang } from '../../i18n';
import './About.css';

// Ventanas de scrub [entra-a, llega, empieza-a-salir, sale] por bloque
const WINDOWS = [
  [0.05, 0.14, 0.32, 0.38],
  [0.38, 0.46, 0.62, 0.68],
  [0.68, 0.76, 0.96, 1],
];

function Take({ progress, window: w, children }) {
  const opacity = useTransform(progress, w, [0, 1, 1, 0]);
  const y = useTransform(progress, w, [38, 0, 0, -38]);

  return (
    <motion.p className="about__take" style={{ opacity, y }}>
      {children}
    </motion.p>
  );
}

/**
 * Perfil: el retrato ASCII sostiene la escena mientras las declaraciones
 * pasan de a una, empujadas por el scroll.
 */
export default function About() {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section id="about" ref={sectionRef} className="about">
      <div className="about__frame">
        <span className="section-slash about__slash" aria-hidden="true">///</span>

        <div className="about__grid">
          <div className="about__shape">
            <div className="about__panel">
              <AsciiPortraitLive
                progressValue={reduced ? null : scrollYProgress}
                className="about__portrait-canvas"
              />
            </div>
          </div>

          <div className="about__screen">
            {reduced ? (
              t.about.takes.map((text, i) => (
                <p key={i} className="about__take about__take--static">{text}</p>
              ))
            ) : (
              t.about.takes.map((text, i) => (
                <Take key={i} progress={scrollYProgress} window={WINDOWS[i]}>{text}</Take>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
