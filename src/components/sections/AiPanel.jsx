import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { useTheme } from '../../theme';
import AiScene from './AiScene';
import './AiPanel.css';

const EASE = [0.19, 1, 0.22, 1];

/**
 * IA en producción: a la izquierda lo que ya corre, en tres líneas; a la
 * derecha la escena 3D. Pasar por una línea enciende su parte de la escena.
 */
export default function AiPanel({ copy }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const entered = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const { theme } = useTheme();
  const [focus, setFocus] = useState(null);

  const reveal = (i) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: entered ? { opacity: 1, y: 0 } : {},
          transition: { duration: 0.9, ease: EASE, delay: 0.1 + i * 0.1 },
        };

  return (
    <aside ref={ref} className="ai" aria-label={copy.label}>
      <div className="ai__copy">
        <motion.span className="ai__live label" {...reveal(0)}>
          <i className="ai__dot" aria-hidden="true" />
          {copy.label}
        </motion.span>
        <motion.p className="ai__statement" {...reveal(1)}>{copy.statement}</motion.p>
        <ol className="ai__list">
          {copy.items.map((item, i) => (
            <motion.li
              key={item.key}
              className={`ai__item${focus === item.key ? ' is-focus' : ''}`}
              onPointerEnter={() => setFocus(item.key)}
              onPointerLeave={() => setFocus(null)}
              {...reveal(2 + i)}
            >
              <span className="ai__num tnum">0{i + 1}</span>
              <div>
                <h4 className="ai__title">{item.title}</h4>
                <p className="ai__text">{item.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <motion.div
        className="ai__scene"
        initial={reduced ? undefined : { opacity: 0 }}
        animate={reduced || !entered ? undefined : { opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
      >
        <AiScene focus={focus} nodes={copy.nodes} theme={theme} reduced={reduced} active={entered} />
      </motion.div>
    </aside>
  );
}
