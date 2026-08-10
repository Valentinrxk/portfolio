import { useEffect, useRef } from 'react';
import { useMotionValue, animate } from 'motion/react';
import AsciiField from '../ascii/AsciiField';
import { useLang } from '../../i18n';
import './Intro.css';

const DURATION_MS = 2100;

/**
 * Apertura: estática ASCII pura que "sintoniza" — el ruido decae hasta
 * volverse señal, el monograma [V/R] entra con glitch y el nombre firma
 * abajo. Corte seco al hero. No se saltea: dura lo que dura.
 */
export default function Intro({ onDone }) {
  const turbulence = useMotionValue(1);
  const doneRef = useRef(false);
  const { t } = useLang();

  useEffect(() => {
    document.body.classList.add('intro-lock');
    return () => document.body.classList.remove('intro-lock');
  }, []);

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
    };

    const tuning = animate(turbulence, 0.05, { duration: 1.5, ease: [0.19, 1, 0.22, 1] });
    const timer = setTimeout(finish, DURATION_MS);

    return () => {
      tuning.stop();
      clearTimeout(timer);
    };
  }, [onDone, turbulence]);

  return (
    <div className="intro" role="presentation" aria-hidden="true">
      <div className="intro__field">
        <AsciiField
          ink="rgba(35, 35, 39, 0.5)"
          accent="#e10600"
          accent2="#6d0f16"
          cell={13}
          fontSize={11}
          fps={30}
          turbulenceValue={turbulence}
          interactive={false}
        />
      </div>

      <div className="intro__lockup">
        <p className="intro__logo">
          <span className="intro__bracket">[</span>V<span className="intro__slash">/</span>R<span className="intro__bracket">]</span>
        </p>
        <span className="intro__rule" />
        <p className="intro__name caps">{t.intro.sign}</p>
      </div>
    </div>
  );
}
