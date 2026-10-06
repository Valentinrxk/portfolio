import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from 'motion/react';
import AsciiPortraitLive from '../ascii/AsciiPortraitLive';
import { useLang } from '../../i18n';
import { useTheme } from '../../theme';
import './About.css';

// Ventanas de scrub [entra-a, llega, empieza-a-salir, sale] por bloque
const WINDOWS = [
  [0.05, 0.14, 0.32, 0.38],
  [0.38, 0.46, 0.62, 0.68],
  [0.68, 0.76, 0.96, 1],
];

/** La idea clave de cada declaración va en rojo. */
function Emphasis({ text, em }) {
  const at = em ? text.indexOf(em) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <em className="about__em">{em}</em>
      {text.slice(at + em.length)}
    </>
  );
}

function Take({ progress, window: w, take }) {
  const opacity = useTransform(progress, w, [0, 1, 1, 0]);
  const y = useTransform(progress, w, [38, 0, 0, -38]);

  return (
    <motion.p className="about__take" style={{ opacity, y }}>
      <Emphasis {...take} />
    </motion.p>
  );
}

/** Barra de avance de una declaración: se llena mientras dura su ventana. */
function Tick({ progress, window: w }) {
  const scaleX = useTransform(progress, [w[0], w[3]], [0, 1]);
  return (
    <span className="about__tick">
      <motion.i style={{ scaleX }} />
    </span>
  );
}

/**
 * Perfil: el retrato ASCII sostiene la escena en su monitor, con el marco
 * rojo y la palabra de fondo en otras capas de profundidad, mientras las
 * declaraciones pasan de a una, empujadas por el scroll.
 */
export default function About() {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();
  const { theme } = useTheme();
  const a = t.about;
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(v < WINDOWS[1][0] ? 0 : v < WINDOWS[2][0] ? 1 : 2);
  });

  // Tres velocidades: la palabra de fondo, el marco y el monitor
  const ghostX = useTransform(scrollYProgress, [0, 1], ['6%', '-16%']);
  const offsetY = useTransform(scrollYProgress, [0, 1], [46, -18]);
  const panelY = useTransform(scrollYProgress, [0, 1], [18, -26]);

  return (
    <section id="about" ref={sectionRef} className="about">
      <div className="about__frame">
        <motion.span
          className="about__ghost"
          style={reduced ? undefined : { x: ghostX }}
          aria-hidden="true"
        >
          {a.ghost}
        </motion.span>

        <span className="section-slash about__slash" aria-hidden="true">///</span>

        <div className="about__grid">
          <div className="about__shape">
            <div className="about__stage">
              <motion.span
                className="about__offset"
                style={reduced ? undefined : { y: offsetY }}
                aria-hidden="true"
              />
              <motion.div className="about__panel" style={reduced ? undefined : { y: panelY }}>
                <div className="about__hud about__hud--top" aria-hidden="true">
                  <span><i className="about__rec" />{a.hud.rec}</span>
                  <span>{a.hud.file}</span>
                </div>
                {/* contenedor propio: el retrato se mide contra su padre */}
                <div className="about__portrait">
                  <AsciiPortraitLive
                    progressValue={reduced ? null : scrollYProgress}
                    // el monitor es grafito: la tinta va clara (y al revés en modo noche)
                    dark={theme !== 'dark'}
                    className="about__portrait-canvas"
                  />
                </div>
                <div className="about__hud about__hud--bottom" aria-hidden="true">
                  <span>{a.hud.name}</span>
                  <span>{a.hud.place}</span>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="about__copy">
            <div className="about__meta" aria-hidden={reduced ? undefined : 'true'}>
              <span className="about__kicker label">{a.kicker}</span>
              {!reduced && (
                <>
                  <span className="about__count label tnum">
                    0{active + 1} <i>/ 0{a.takes.length}</i>
                  </span>
                  <span className="about__ticks">
                    {WINDOWS.map((w, i) => (
                      <Tick key={i} progress={scrollYProgress} window={w} />
                    ))}
                  </span>
                </>
              )}
            </div>

            <div className="about__screen">
              {reduced
                ? a.takes.map((take, i) => (
                    <p key={i} className="about__take about__take--static">
                      <Emphasis {...take} />
                    </p>
                  ))
                : a.takes.map((take, i) => (
                    <Take key={i} progress={scrollYProgress} window={WINDOWS[i]} take={take} />
                  ))}
            </div>
          </div>
        </div>

        <dl className="about__facts">
          {a.facts.map(([label, value]) => (
            <div key={label} className="about__fact">
              <dt className="label">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
