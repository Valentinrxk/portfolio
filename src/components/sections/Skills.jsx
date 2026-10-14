import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import Trasnoche from './Trasnoche';
import { useLang } from '../../i18n';
import './Skills.css';

/**
 * adn — la declaración en zigzag: tres palabras que derivan a ritmos
 * distintos. Cierra con el televisor: lo que moldeó el criterio.
 */
export default function Skills() {
  const statementRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();

  // el scroll se mide solo sobre la declaración: el televisor no estira la deriva
  const { scrollYProgress } = useScroll({
    target: statementRef,
    offset: ['start end', 'end start'],
  });

  const wordDrifts = [
    useTransform(scrollYProgress, [0, 1], [30, -30]),
    useTransform(scrollYProgress, [0, 1], [-20, 20]),
    useTransform(scrollYProgress, [0, 1], [40, -40]),
  ];

  return (
    <section id="skills" className="dna">
      <div ref={statementRef} className="dna__statement">
        <span className="section-slash dna__slash" aria-hidden="true">///</span>

        <div className="dna__grid">
          {t.skills.lines.map((line, i) => (
            <div key={i} className={`dna__row dna__row--${i + 1}`}>
              <motion.h2
                className={`dna__word dna__word--${i + 1}`}
                style={reduced ? undefined : { y: wordDrifts[i] }}
                initial={reduced ? false : 'hidden'}
                whileInView="shown"
                viewport={{ once: true, margin: '-12% 0px' }}
              >
                <span className="dna__mask">
                  {/* el lift vive recortado por la máscara: el observer va
                      en el h2 (nunca recortado) y el hijo hereda el estado */}
                  <motion.span
                    className="dna__lift"
                    variants={reduced ? undefined : {
                      hidden: { y: '112%' },
                      shown: {
                        y: '0%',
                        transition: { duration: 0.85, ease: [0.19, 1, 0.22, 1], delay: i * 0.14 },
                      },
                    }}
                  >
                    <span className="dna__word-inner" style={{ '--gd': `${2.8 + i * 1.7}s` }}>
                      {line}
                    </span>
                  </motion.span>
                </span>
              </motion.h2>
            </div>
          ))}
        </div>
      </div>

      <Trasnoche />
    </section>
  );
}
