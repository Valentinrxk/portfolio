import { motion, useReducedMotion } from 'motion/react';
import { useLang } from '../../i18n';
import Scramble from '../ui/Scramble';
import './Experience.css';

// Orden del más reciente al más viejo; los textos viven en i18n
const ROLES = [
  { key: 'oclu', org: 'oclü' },
  { key: 'grip', org: 'grip studio®' },
  { key: 'taxes', org: 'taxes software' },
];

const EASE = [0.19, 1, 0.22, 1];

/**
 * Oficio: la trayectoria como un libro de registro, una línea por rol:
 * cuándo, dónde y qué. El detalle vive en las obras.
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
        <Scramble as="h2" className="xp__title" text={x.title} />
        <p className="xp__lead">{x.lead}</p>
      </motion.header>

      <ol className="xp__list">
        {ROLES.map((role, i) => {
          const r = x.roles[role.key];
          return (
            <motion.li key={role.key} className="xp__row" {...reveal(i)}>
              <span className="xp__when label tnum">{r.when}</span>
              <h3 className="xp__org">{role.org}</h3>
              <div className="xp__what">
                <p className="xp__role label">{r.role}</p>
                {r.note && <p className="xp__note">{r.note}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
