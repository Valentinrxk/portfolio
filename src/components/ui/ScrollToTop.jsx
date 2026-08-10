import { useEffect, useState } from 'react';
import { smoothScrollTo } from '../../hooks/useSmoothScroll';
import { useLang } from '../../i18n';
import './ScrollToTop.css';

/**
 * [↑] — vuelta arriba en el idioma del monograma. Glitchea cada tanto
 * en reposo, al hover la flecha despega con escape de caracteres y al
 * click el botón entero sale volando mientras la página vuelve.
 */
export default function ScrollToTop() {
  const [show, setShow] = useState(false);
  const [launching, setLaunching] = useState(false);
  const { lang } = useLang();

  useEffect(() => {
    let raf = null;

    const check = () => {
      raf = null;
      setShow(window.scrollY > window.innerHeight);
    };

    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(check);
    };

    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const launch = () => {
    setLaunching(true);
    smoothScrollTo(0);
    setTimeout(() => setLaunching(false), 700);
  };

  return (
    <button
      type="button"
      className={`totop ${show ? 'is-live' : ''} ${launching ? 'is-launching' : ''}`}
      onClick={launch}
      aria-label={lang === 'es' ? 'volver arriba' : 'back to top'}
      tabIndex={show ? 0 : -1}
    >
      <span className="totop__bracket" aria-hidden="true">[</span>
      <span className="totop__well" aria-hidden="true">
        <span className="totop__arrow">↑</span>
        <span className="totop__exhaust">
          <i>*</i>
          <i>:</i>
          <i>.</i>
        </span>
      </span>
      <span className="totop__bracket" aria-hidden="true">]</span>
    </button>
  );
}
