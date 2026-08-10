import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

/**
 * Retícula de puntería: núcleo rojo + cruz grafito con borde plateado
 * (legible sobre plata, grafito o bordó). Sobre elementos interactivos
 * despliega corchetes de encuadre. Solo existe con puntero fino.
 */
export default function CustomCursor() {
  const cursorRef = useRef(null);
  const [enabled, setEnabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  );

  // Híbridos (tablet + mouse): la media query cambia en vivo y el CSS
  // que oculta el cursor nativo la sigue — el componente también debe
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const onChange = (e) => setEnabled(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = cursorRef.current;
    let targetX = -100;
    let targetY = -100;
    let x = targetX;
    let y = targetY;
    let raf = null;

    const loop = () => {
      x += (targetX - x) * 0.3;
      y += (targetY - y) * 0.3;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const onOver = (e) => {
      el.classList.toggle('is-target', Boolean(e.target.closest('a, button')));
    };

    const onDown = () => el.classList.add('is-down');
    const onUp = () => el.classList.remove('is-down');

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={cursorRef} className="vf-cursor" aria-hidden="true">
      <i className="vf-cursor__line vf-cursor__line--h" />
      <i className="vf-cursor__line vf-cursor__line--v" />
      <i className="vf-cursor__dot" />
      <i className="vf-cursor__corner vf-cursor__corner--tl" />
      <i className="vf-cursor__corner vf-cursor__corner--tr" />
      <i className="vf-cursor__corner vf-cursor__corner--bl" />
      <i className="vf-cursor__corner vf-cursor__corner--br" />
    </div>
  );
}
