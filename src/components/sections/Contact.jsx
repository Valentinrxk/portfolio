import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiField from '../ascii/AsciiField';
import MonkeyMark from '../ui/MonkeyMark';
import { useLang } from '../../i18n';
import './Contact.css';

const EMAIL = 'hi@valentinromero.com';

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
          <p className="contact__kicker">{t.contact.kicker}</p>

          <a className="contact__email" href={`mailto:${EMAIL}`}>
            {EMAIL.split('@')[0]}
            <span className="contact__email-at">@</span>
            {EMAIL.split('@')[1]}
          </a>

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
          <span className="contact__mark" aria-hidden="true">
            <MonkeyMark size={30} />
          </span>
          <span>© {new Date().getFullYear()} valentín romero</span>
        </footer>
      </div>
    </section>
  );
}
