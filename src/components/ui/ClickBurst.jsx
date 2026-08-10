import { useEffect } from 'react';
import './ClickBurst.css';

const CHARS = '@%#*+=<>/[]:';

/**
 * Cada click detona una ráfaga de caracteres ASCII desde el puntero.
 * Sin estado de React: nodos efímeros animados con la Web Animations API.
 */
export default function ClickBurst() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const spawn = (x, y) => {
      const css = getComputedStyle(document.documentElement);
      const ink = css.getPropertyValue('--graphite').trim() || '#232327';
      const steel = css.getPropertyValue('--steel-600').trim() || '#75767f';
      const COLORS = [ink, '#e10600', '#6d0f16', steel];
      const count = 10 + ((Math.random() * 5) | 0);
      const root = document.createElement('div');
      root.className = 'click-burst';
      root.style.left = `${x}px`;
      root.style.top = `${y}px`;
      document.body.appendChild(root);

      const anims = [];
      for (let i = 0; i < count; i++) {
        const span = document.createElement('span');
        span.textContent = CHARS[(Math.random() * CHARS.length) | 0];
        span.style.color = COLORS[(Math.random() * COLORS.length) | 0];
        root.appendChild(span);

        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.7;
        const dist = 26 + Math.random() * 46;
        anims.push(
          span.animate(
            [
              { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
              {
                transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) rotate(${(Math.random() - 0.5) * 220}deg)`,
                opacity: 0,
              },
            ],
            { duration: 420 + Math.random() * 260, easing: 'cubic-bezier(0.19, 1, 0.22, 1)', fill: 'forwards' }
          )
        );
      }

      // Limpieza robusta: finalizadas O canceladas, más un tope temporal
      Promise.allSettled(anims.map((a) => a.finished)).then(() => root.remove());
      setTimeout(() => {
        if (root.isConnected) root.remove();
      }, 900);
    };

    // pointerdown para mouse/lápiz; en touch cada gesto de scroll dispara
    // pointerdown, así que ahí se usa click (solo taps reales)
    const onPointerDown = (e) => {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      spawn(e.clientX, e.clientY);
    };
    const onClick = (e) => {
      if (e.pointerType !== 'touch') return;
      spawn(e.clientX, e.clientY);
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('click', onClick);
      document.querySelectorAll('.click-burst').forEach((n) => n.remove());
    };
  }, []);

  return null;
}
