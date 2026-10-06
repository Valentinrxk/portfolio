import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import './AiPanel.css';

const GLYPHS = '.:-=+*#%@';
const EASE = [0.19, 1, 0.22, 1];

const noise = (text) =>
  text.replace(/\S/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);

/** Señal que emerge del ruido: cada carácter se resuelve de izquierda a derecha. */
function useDecode(text, run, duration = 1100) {
  const [out, setOut] = useState(() => (run === null ? text : noise(text)));

  useEffect(() => {
    if (run === null) {
      setOut(text);
      return undefined;
    }
    if (!run) {
      setOut(noise(text));
      return undefined;
    }
    let raf;
    let start;
    const tick = (now) => {
      start ??= now;
      const p = Math.min(1, (now - start) / duration);
      const solved = Math.floor(p * p * text.length * 1.15);
      setOut(
        text
          .split('')
          .map((ch, i) => (i < solved || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(''),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, run, duration]);

  return out;
}

/** Tipeo de terminal, una sola vez al entrar. */
function useTypewriter(text, run, delay = 600, speed = 26) {
  const [n, setN] = useState(run === null ? text.length : 0);

  useEffect(() => {
    if (run === null) {
      setN(text.length);
      return undefined;
    }
    if (!run) {
      setN(0);
      return undefined;
    }
    let i = 0;
    let timer = setTimeout(function step() {
      i += 1;
      setN(i);
      if (i < text.length) timer = setTimeout(step, speed + Math.random() * 40);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, run, delay, speed]);

  return text.slice(0, n);
}

// Alturas base de la onda: una frase dicha, no ruido parejo
const WAVE = [0.18, 0.32, 0.55, 0.4, 0.72, 0.9, 0.62, 0.35, 0.5, 0.78, 1, 0.84, 0.58, 0.3, 0.46,
  0.7, 0.88, 0.66, 0.42, 0.24, 0.38, 0.6, 0.8, 0.52, 0.3, 0.2, 0.34, 0.16];

/**
 * IA en producción: tres piezas que muestran lo que ya corre —
 * los servidores MCP como red, Whisper como voz, Claude Code como terminal.
 */
export default function AiPanel({ copy }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const entered = useInView(ref, { once: true, margin: '0px 0px -18% 0px' });
  const onScreen = useInView(ref);
  const run = reduced ? null : entered;

  const statement = useDecode(copy.statement, run);
  const count = useDecode(copy.mcp.count, run, 700);
  const typed = useTypewriter(copy.daily.text, run, 900);

  const reveal = (i) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: entered ? { opacity: 1, y: 0 } : {},
          transition: { duration: 0.9, ease: EASE, delay: 0.25 + i * 0.12 },
        };

  return (
    <motion.aside
      ref={ref}
      className={`ai ${onScreen ? '' : 'is-paused'}`}
      aria-label={copy.label}
      initial={reduced ? undefined : { clipPath: 'inset(0 0 100% 0)' }}
      animate={reduced || !entered ? undefined : { clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 1.1, ease: EASE }}
    >
      <div className="ai__scan" aria-hidden="true" />

      <header className="ai__head">
        <span className="ai__live label">
          <i className="ai__dot" aria-hidden="true" />
          {copy.label}
        </span>
        <span className="ai__tag label" aria-hidden="true">mcp · whisper · claude code</span>
      </header>

      <p className="ai__statement">
        <span className="sr-only">{copy.statement}</span>
        <span aria-hidden="true">{statement}</span>
      </p>

      <div className="ai__grid">
        {/* ——— Servidores MCP: claude en el centro, los datos viajan ——— */}
        <motion.section className="ai__cell ai__cell--mcp" {...reveal(0)}>
          <div className="ai__cell-head">
            <span className="ai__count tnum" aria-hidden="true">{count}</span>
            <h4 className="ai__title">
              <span className="sr-only">{copy.mcp.count} </span>
              {copy.mcp.title}
            </h4>
          </div>
          <ul className="ai__net">
            {copy.mcp.nodes.map(([node, desc], i) => (
              <li key={node} className="ai__route" style={{ '--i': i }}>
                <span className="ai__hub label" aria-hidden="true">claude</span>
                <span className="ai__wire" aria-hidden="true"><i /></span>
                <span className="ai__node">
                  <b>{node}</b>
                  <span>{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ——— Whisper: la voz que se vuelve presupuesto ——— */}
        <motion.section className="ai__cell ai__cell--voice" {...reveal(1)}>
          <div className="ai__cell-head">
            <span className="ai__rec label" aria-hidden="true"><i className="ai__dot" />rec</span>
            <h4 className="ai__title">{copy.voice.title}</h4>
          </div>
          <div className="ai__wave" aria-hidden="true">
            {WAVE.map((h, i) => (
              <i key={i} style={{ '--h': h, '--d': `${(i % 7) * 0.09}s`, '--t': `${0.9 + (i % 5) * 0.13}s` }} />
            ))}
          </div>
          <p className="ai__text">{copy.voice.text}</p>
        </motion.section>

        {/* ——— Claude Code: la terminal de todos los días ——— */}
        <motion.section className="ai__cell ai__cell--term" {...reveal(2)}>
          <div className="ai__cell-head">
            <span className="ai__dots" aria-hidden="true"><i /><i /><i /></span>
            <h4 className="ai__title">{copy.daily.title}</h4>
          </div>
          <div className="ai__term">
            <p className="ai__prompt" aria-hidden="true">
              <span className="ai__sigil">$</span> claude
            </p>
            <p className="ai__out">
              <span className="sr-only">{copy.daily.text}</span>
              <span aria-hidden="true">
                <span className="ai__sigil">›</span> {typed}
                <i className="ai__caret" />
              </span>
            </p>
          </div>
        </motion.section>
      </div>
    </motion.aside>
  );
}
