import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, useVelocity, useSpring } from 'motion/react';
import AsciiVariation from '../ascii/AsciiVariation';
import { useLang } from '../../i18n';
import { useTheme } from '../../theme';
import './Skills.css';

const MODES = ['wave', 'noise', 'flow'];

const HEX = '0123456789abcdef';
const randomSeed = () =>
  Array.from({ length: 4 }, () => HEX[(Math.random() * 16) | 0]).join('');

/** Id de variación que muta: nunca vas a ver el mismo dos veces. */
function SeedTag() {
  const [seed, setSeed] = useState(randomSeed);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setSeed(randomSeed()), 900);
    return () => clearInterval(timer);
  }, []);

  return <span className="dna__card-seed tnum">{seed}</span>;
}

function Card({ progress, drift, rotate, skew, title, mode, reduced, dark }) {
  const y = useTransform(progress, [0, 1], drift);

  return (
    <motion.article
      className="dna__card"
      style={reduced ? undefined : { y, rotate, skewY: skew }}
    >
      <header className="dna__card-bar">
        <span className="dna__card-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="dna__card-title caps">{title}</span>
        <SeedTag />
      </header>
      <div className="dna__card-canvas">
        <AsciiVariation mode={mode} dark={dark} className="dna__card-field" />
      </div>
    </motion.article>
  );
}

/**
 * adn — la declaración en zigzag acompañada por tres piezas generativas
 * que la encarnan: onda, ruido y flujo mutando sin repetirse jamás.
 */
export default function Skills() {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();
  const { theme } = useTheme();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const wordDrifts = [
    useTransform(scrollYProgress, [0, 1], [30, -30]),
    useTransform(scrollYProgress, [0, 1], [-20, 20]),
    useTransform(scrollYProgress, [0, 1], [40, -40]),
  ];

  // El envión del scroll inclina las tarjetas; el spring las endereza
  const progressVelocity = useVelocity(scrollYProgress);
  const skewRaw = useTransform(progressVelocity, [-1.5, 1.5], [6, -6]);
  const skew = useSpring(skewRaw, { stiffness: 280, damping: 34 });

  const cardDrifts = [
    [70, -90],
    [-50, 90],
    [50, -110],
  ];

  const rotations = [-2.5, 2, -1.5];

  return (
    <section id="skills" ref={sectionRef} className="dna">
      <span className="section-slash dna__slash" aria-hidden="true">///</span>

      <div className="dna__grid">
        {t.skills.lines.map((line, i) => {
          const mode = MODES[i];
          return (
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
              <Card
                progress={scrollYProgress}
                drift={cardDrifts[i]}
                rotate={rotations[i]}
                skew={skew}
                title={t.skills.cards[mode]}
                mode={mode}
                reduced={reduced}
                dark={theme === 'dark'}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
