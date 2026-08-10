import { useEffect, useRef, useState } from 'react';
import './CustomCursor.css';

/**
 * Cursor ASCII-nativo: un caret de terminal (▮ rojo, parpadeo seco).
 * Sobre lo interactivo se abre en corchetes — [▮] — la familia del
 * monograma. Al click, el bloque se aplasta a guión bajo: tecleás.
 * Solo existe con puntero fino.
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
      <span className="vf-cursor__bracket vf-cursor__bracket--l">[</span>
      <span className="vf-cursor__caret">▮</span>
      <span className="vf-cursor__bracket vf-cursor__bracket--r">]</span>
    </div>
  );
}
