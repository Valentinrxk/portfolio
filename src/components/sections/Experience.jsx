import { motion, useReducedMotion } from 'motion/react';
import { useLang } from '../../i18n';
import './Experience.css';

// Orden del más reciente al más viejo; los textos viven en i18n
const ROLES = [
  { key: 'oclu', org: 'oclü' },
  { key: 'grip', org: 'grip studio®' },
  { key: 'taxes', org: 'taxes software' },
  { key: 'uade', org: 'uade' },
];

const EASE = [0.19, 1, 0.22, 1];

/**
 * Oficio: la trayectoria como un libro de registro — cuándo, dónde y
 * qué quedó andando — y aparte, la IA que ya corre en producción.
 */
export default function Experience() {
  const reduced = useReducedMotion();
  const { t } = useLang();
  const x = t.experience;

  // Cada pieza entra una sola vez al cruzar el cuadro
  const reveal = (i = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 28 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: '0px 0px -12% 0px' },
          transition: { duration: 0.8, ease: EASE, delay: i * 0.06 },
        };

  return (
    <section id="experience" className="xp">
      <motion.header className="xp__head" {...reveal()}>
        <span className="section-slash" aria-hidden="true">///</span>
        <h2 className="xp__title">{x.title}</h2>
        <p className="xp__lead">{x.lead}</p>
      </motion.header>

      <ol className="xp__list">
        {ROLES.map((role, i) => {
          const r = x.roles[role.key];
          return (
            <motion.li key={role.key} className="xp__row" {...reveal(i)}>
              <span className="xp__when label tnum">{r.when}</span>
              <div className="xp__who">
                <h3 className="xp__org">{role.org}</h3>
                <p className="xp__role label">
                  {r.role}
                  <span className="xp__kind"> · {r.kind}</span>
                </p>
              </div>
              {r.points.length > 0 && (
                <ul className="xp__points">
                  {r.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </motion.li>
          );
        })}
      </ol>

      <motion.aside className="xp__ai" {...reveal()}>
        <span className="xp__ai-label label">{x.ai.label}</span>
        <ul className="xp__points">
          {x.ai.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </motion.aside>

      <p className="xp__langs label">{x.langs}</p>
    </section>
  );
}
