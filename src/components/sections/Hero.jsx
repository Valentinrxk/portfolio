import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiGif from '../ascii/AsciiGif';
import Scramble from '../ui/Scramble';
import { useLang, EMAIL } from '../../i18n';
import { useTheme } from '../../theme';
import './Hero.css';

/**
 * El hero es la animación ASCII: el gorila saltando en la cama elástica,
 * gigante, protagonista. La tipografía acompaña desde el margen izquierdo
 * con la declaración de principios; al scrollear, la señal se desarma.
 */
export default function Hero({ play }) {
  const sectionRef = useRef(null);
  const typeRef = useRef(null);
  const reduced = useReducedMotion();
  const { t } = useLang();
  const { theme } = useTheme();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // El desarme acompaña todo el recorrido pero nunca completa: quedan
  // jirones en pantalla hasta que oficio entra en cuadro — sin vacío
  const tear = useTransform(scrollYProgress, [0.08, 0.95], [0, 0.78]);
  const typeOpacity = useTransform(scrollYProgress, [0.3, 0.7], [1, 0]);
  const typeY = useTransform(scrollYProgress, [0.3, 0.75], [0, -80]);

  const typeStyle = reduced ? undefined : { opacity: typeOpacity, y: typeY };

  return (
    <section id="hero" ref={sectionRef} className={`hero ${play ? 'is-playing' : ''}`}>
      <div className="hero__frame">
        <div className="hero__portrait">
          {/* los colores salen de las variables del tema; theme solo avisa que cambiaron */}
          {/* en móvil el gorila termina antes del texto: clearRef marca dónde empieza */}
          <AsciiGif progressValue={reduced ? null : tear} theme={theme} clearRef={typeRef} className="hero__canvas" />
        </div>

        <motion.div ref={typeRef} className="hero__type" style={typeStyle}>
          <p className="hero__kicker label">
            <span className="hero__kicker-slash" aria-hidden="true">///</span>
            {t.hero.kicker}
          </p>
          {/* la declaración sale del ruido junto con el recorte de entrada */}
          <h1 className="hero__statement" aria-label={t.hero.statement}>
            <Scramble text={t.hero.statement} trigger="play" play={play} delay={0.3} labelled={false} />
            <span className="hero__caret" aria-hidden="true">_</span>
          </h1>
          <a className="hero__cta" href={`mailto:${EMAIL}`}>
            {EMAIL}
            <span className="hero__cta-arrow" aria-hidden="true">⟶</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
