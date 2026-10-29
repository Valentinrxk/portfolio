import { useEffect, useRef } from 'react';
import { anime, loadAnime } from '../../lib/anime';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiField from '../ascii/AsciiField';
import Scramble from '../ui/Scramble';
import { useLang, EMAIL } from '../../i18n';
import { useTheme } from '../../theme';
import './Contact.css';

/* Las marcas de LinkedIn y GitHub: heredan el color del enlace */
const SOCIAL = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/valentin-romero-61b089139/',
    d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.948 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    name: 'GitHub',
    href: 'https://github.com/valentinrxk',
    d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
];

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
  const { theme } = useTheme();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // El CTA emerge mientras la sección entra en cuadro y ya está entero cuando
  // el cuadro se fija: no hay que scrollear en el vacío para ver el mail
  const { scrollYProgress: entering } = useScroll({
    target: sectionRef,
    offset: ['start end', 'start start'],
  });

  const turbulence = useTransform(scrollYProgress, [0, 0.45], [1, 0.05]);
  const opacity = useTransform(entering, [0.35, 0.85], [0, 1]);
  const y = useTransform(entering, [0.35, 0.95], [46, 0]);

  const contentStyle = reduced ? undefined : { opacity, y };

  return (
    <section id="contact" ref={sectionRef} className="contact">
      <div className="contact__frame">
        <div className="contact__field">
          <AsciiField
            ink={theme === 'dark' ? 'rgba(207, 208, 214, 0.16)' : 'rgba(35, 35, 39, 0.16)'}
            accent="#e10600"
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

          <div className="contact__meta">
            {SOCIAL.map(({ name, href, d }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}>
                <svg className="contact__icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={d} fill="currentColor" />
                </svg>
              </a>
            ))}
          </div>
        </motion.div>

        <footer className="contact__footer label">
          <span>© {new Date().getFullYear()} valentín romero</span>
        </footer>
      </div>
    </section>
  );
}
