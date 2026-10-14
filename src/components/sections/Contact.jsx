import { useEffect, useRef } from 'react';
import { anime, loadAnime } from '../../lib/anime';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiField from '../ascii/AsciiField';
import Scramble from '../ui/Scramble';
import { useLang, EMAIL } from '../../i18n';
import './Contact.css';

/* Flecha diagonal en SVG: el carácter ↗ tiene variante emoji y iOS
   la renderiza como sticker — esto hereda color y es idéntico en todo OS */
function ArrowOut() {
  return (
    <svg className="contact__arrow" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 9.5 L9.5 2.5 M4.5 2.5 H9.5 V7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * El mail resuena: la letra que tocás sube y le pasa la onda a sus
 * vecinas, que vuelven a su lugar con resorte. Al entrar en cuadro, una
 * onda lo recorre de punta a punta una sola vez.
 */
function ResonantEmail({ email, reduced }) {
  const ref = useRef(null);
  const last = useRef(-1);

  // Onda desde la letra `from`: solo se mueven las vecinas que alcanza
  const wave = (from, { reach = 6, strength = 1, from: origin } = {}) => {
    const a = anime();
    if (!a) return;
    const { animate, stagger, spring } = a;
    const all = [...(ref.current?.querySelectorAll('.contact__char') ?? [])];
    if (!all.length) return;
    const lo = origin === 'first' ? 0 : Math.max(0, from - reach);
    const hi = origin === 'first' ? all.length : Math.min(all.length, from + reach + 1);
    const chars = all.slice(lo, hi);
    const center = origin === 'first' ? 'first' : from - lo;
    const fontSize = parseFloat(getComputedStyle(ref.current).fontSize);
    const lift = (i) => {
      if (origin === 'first') return -fontSize * 0.16 * strength;
      const k = Math.max(0, 1 - Math.abs(i - center) / reach);
      return -fontSize * 0.26 * strength * k ** 1.4;
    };
    animate(chars, {
      y: [
        { to: (_, i) => lift(i), duration: 140, ease: 'outQuad' },
        { to: 0, ease: spring({ bounce: 0.55, duration: 780 }) },
      ],
      delay: stagger(origin === 'first' ? 30 : 24, { from: center }),
    });
  };

  // anime.js se pide cuando el contacto se acerca; la primera vez que el
  // mail queda bien a la vista, lo recorre una onda
  useEffect(() => {
    if (reduced) return undefined;
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        near.disconnect();
        loadAnime();
      },
      { rootMargin: '600px 0px' },
    );
    near.observe(ref.current);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        loadAnime().then(() => wave(0, { from: 'first' }));
      },
      { threshold: 1, rootMargin: '0px 0px -15% 0px' },
    );
    io.observe(ref.current);
    return () => {
      near.disconnect();
      io.disconnect();
    };
  }, [reduced]);

  const onPointerMove = (e) => {
    if (reduced) return;
    const char = e.target.closest?.('.contact__char');
    if (!char) return;
    const i = Number(char.dataset.i);
    if (i === last.current) return;
    last.current = i;
    wave(i);
  };

  return (
    <a
      ref={ref}
      className="contact__email"
      href={`mailto:${email}`}
      aria-label={email}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        last.current = -1;
      }}
    >
      {[...email].map((c, i) => (
        <span
          key={i}
          data-i={i}
          className={`contact__char${c === '@' ? ' contact__email-at' : ''}`}
          aria-hidden="true"
        >
          {c}
        </span>
      ))}
    </a>
  );
}

/**
 * Contacto: la pared de estática se resuelve en señal y del ruido
 * emerge el único llamado que importa — el mail, gigante.
 */
export default function Contact() {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const turbulence = useTransform(scrollYProgress, [0, 0.45], [1, 0.05]);
  // Rango temprano: llegar por el nav también tiene que mostrar el CTA
  const opacity = useTransform(scrollYProgress, [0.05, 0.3], [0, 1]);
  const y = useTransform(scrollYProgress, [0.05, 0.35], [46, 0]);

  const contentStyle = reduced ? undefined : { opacity, y };

  return (
    <section id="contact" ref={sectionRef} className="contact">
      <div className="contact__frame">
        <div className="contact__field">
          <AsciiField
            ink="rgba(207, 208, 214, 0.2)"
            accent="#e10600"
            accent2="#a6a7af"
            cell={13}
            fontSize={11}
            fps={24}
            turbulence={reduced ? 0.05 : undefined}
            turbulenceValue={reduced ? null : turbulence}
            interactive
          />
        </div>

        <span className="section-slash contact__slash" aria-hidden="true">///</span>

        <motion.div className="contact__content" style={contentStyle}>
          <Scramble as="p" className="contact__kicker" text={t.contact.kicker} />

          <ResonantEmail email={EMAIL} reduced={reduced} />

          <div className="contact__meta label">
            <span className="contact__status">
              <i aria-hidden="true" />
              {t.contact.status}
            </span>
            <a href="https://www.linkedin.com/in/valentin-romero-61b089139/" target="_blank" rel="noopener noreferrer">
              linkedin <ArrowOut />
            </a>
            <a href="https://github.com/valentinrxk" target="_blank" rel="noopener noreferrer">
              github <ArrowOut />
            </a>
          </div>
        </motion.div>

        <footer className="contact__footer label">
          <span>© {new Date().getFullYear()} valentín romero</span>
        </footer>
      </div>
    </section>
  );
}
