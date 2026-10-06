import { useEffect, useRef, useState } from 'react';
import { useMotionValue, animate } from 'motion/react';
import AsciiField from '../ascii/AsciiField';
import MonkeyMark from '../ui/MonkeyMark';
import { useLang } from '../../i18n';
import { useTheme } from '../../theme';
import './Intro.css';

const DURATION_MS = 2350;

// El monito se despierta mientras la señal sintoniza: dormido →
// despierto → guiño → sonrisa. Animación ASCII por swap de caracteres.
const EXPRESSIONS = [
  { at: 450, eyes: '-   -', mouth: '.---.' },
  { at: 1000, eyes: 'o   o', mouth: '.===.' },
  { at: 1500, eyes: 'o   -', mouth: '\\===/' },
  { at: 1950, eyes: 'o   o', mouth: '\\===/' },
];

/**
 * Apertura: estática ASCII pura que "sintoniza" — el ruido decae hasta
 * volverse señal, el monograma [V/R] entra con glitch y el nombre firma
 * abajo. Corte seco al hero. No se saltea: dura lo que dura.
 */
export default function Intro({ onDone }) {
  const turbulence = useMotionValue(1);
  const doneRef = useRef(false);
  const { t } = useLang();
  const { theme } = useTheme();
  const [face, setFace] = useState(EXPRESSIONS[0]);

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
    const faceTimers = EXPRESSIONS.map((expr) =>
      setTimeout(() => setFace(expr), expr.at)
    );

    return () => {
      tuning.stop();
      clearTimeout(timer);
      faceTimers.forEach(clearTimeout);
    };
  }, [onDone, turbulence]);

  return (
    <div className="intro" role="presentation" aria-hidden="true">
      <div className="intro__field">
        <AsciiField
          ink={theme === 'dark' ? 'rgba(231, 231, 236, 0.5)' : 'rgba(35, 35, 39, 0.5)'}
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
        <div className="intro__logo">
          <MonkeyMark size={168} eyes={face.eyes} mouth={face.mouth} className="intro__monkey" />
        </div>
        <span className="intro__rule" />
        <p className="intro__name label">{t.intro.sign}</p>
      </div>
    </div>
  );
}
