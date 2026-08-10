import { motion, useReducedMotion } from 'motion/react';
import { useLang } from '../../i18n';
import './Skills.css';

const GROUPS = [
  { key: 'js', skills: ['react', 'vue', 'next.js', 'astro'] },
  { key: 'backend', skills: ['python', 'php', 'node.js'] },
  { key: 'design', skills: ['ui/ux', 'figma'] },
];

const MARQUEE = '/ = + * # % @ # * + = ';

const rowVariants = {
  hidden: { opacity: 0, y: 42, clipPath: 'inset(0 0 100% 0)' },
  shown: (i) => ({
    opacity: 1,
    y: 0,
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.7, ease: [0.19, 1, 0.22, 1], delay: i * 0.06 },
  }),
};

function AsciiMarquee() {
  const text = MARQUEE.repeat(24);
  return (
    <div className="skills__marquee" aria-hidden="true">
      <span>{text}</span>
      <span>{text}</span>
    </div>
  );
}

/**
 * Arsenal: placas tipográficas separadas por marquesinas ASCII.
 * Sin iconos, sin barras de nivel, sin numeración.
 */
export default function Skills() {
  const reduced = useReducedMotion();
  const { t } = useLang();
  let rowIndex = 0;

  return (
    <section id="skills" className="skills">
      <header className="skills__header">
        <span className="section-slash" aria-hidden="true">///</span>
        <h2 className="skills__title">{t.skills.title}</h2>
      </header>

      <div className="skills__list">
        {GROUPS.map((group) => (
          <div key={group.key} className="skills__group">
            <AsciiMarquee />
            <h3 className="skills__category caps">{t.skills.groups[group.key]}</h3>
            <ul>
              {group.skills.map((skill) => {
                const i = rowIndex++;
                return (
                  <motion.li
                    key={skill}
                    className="skills__row"
                    custom={i % 4}
                    initial={reduced ? false : 'hidden'}
                    whileInView="shown"
                    viewport={{ once: true, margin: '-12% 0px' }}
                    variants={reduced ? undefined : rowVariants}
                  >
                    <span className="skills__bullet" aria-hidden="true">/</span>
                    <span className="skills__name">{skill}</span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        ))}
        <AsciiMarquee />
      </div>
    </section>
  );
}
