import { useState, useEffect } from 'react';
import './ScrollToTop.css';

// Sections with inverse background (dark)
const INVERSE_SECTIONS = ['projects', 'contact'];

const NAV_ITEMS = [
  { label: 'Inicio', href: '#hero', num: '00' },
  { label: 'Sobre mí', href: '#about', num: '01' },
  { label: 'Proyectos', href: '#projects', num: '02' },
  { label: 'Skills', href: '#skills', num: '03' },
  { label: 'Contacto', href: '#contact', num: '04' },
];

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isInverseBg, setIsInverseBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Mostrar el botón después de hacer scroll (menos en mobile)
      const threshold = window.innerWidth <= 768 ? 200 : 300;
      setIsVisible(window.scrollY > threshold);

      // Detect current section background - same logic as Navigation
      const sections = NAV_ITEMS.map(item => item.href.slice(1));
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Check if section is in viewport (similar to Navigation logic)
          if (rect.top <= 150) {
            setIsInverseBg(INVERSE_SECTIONS.includes(section));
            break;
          }
        }
      }
    };

    // Initial check
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      className={`scroll-to-top ${isInverseBg ? 'scroll-to-top--inverse' : ''}`}
      onClick={scrollToTop}
      aria-label="Volver arriba"
      title="Volver arriba"
    >
      <span className="scroll-to-top__arrow">↑</span>
      <span className="scroll-to-top__bracket">[</span>
      <span className="scroll-to-top__text">TOP</span>
      <span className="scroll-to-top__bracket">]</span>
    </button>
  );
}

