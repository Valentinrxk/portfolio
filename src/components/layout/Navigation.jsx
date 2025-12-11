import { useState, useEffect } from 'react';
import useTheme from '../../hooks/useTheme';
import { FaSun, FaMoon } from 'react-icons/fa';
import './Navigation.css';

const NAV_ITEMS = [
  { label: 'Inicio', href: '#hero', num: '00' },
  { label: 'Sobre mí', href: '#about', num: '01' },
  { label: 'Proyectos', href: '#projects', num: '02' },
  { label: 'Skills', href: '#skills', num: '03' },
  { label: 'Contacto', href: '#contact', num: '04' },
];

// Sections with inverse background (dark)
const INVERSE_SECTIONS = ['projects', 'contact'];

export default function Navigation() {
  const { theme, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isInverseBg, setIsInverseBg] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Calculate scroll progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / docHeight) * 100;
      setScrollProgress(progress);

      const sections = NAV_ITEMS.map(item => item.href.slice(1));
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section);
            // Check if current section has inverse background
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

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const activeIndex = NAV_ITEMS.findIndex(item => item.href.slice(1) === activeSection);

  return (
    <nav className={`nav ${isScrolled ? 'nav--scrolled' : ''} ${isInverseBg ? 'nav--inverse' : ''}`}>
      {/* Progress bar */}
      <div className="nav__progress" style={{ width: `${scrollProgress}%` }} />

      <div className="nav__container">
        {/* Logo con marco */}
        <a href="#hero" className="nav__logo" onClick={(e) => handleNavClick(e, '#hero')}>
          <span className="nav__logo-bracket">[</span>
          <span className="nav__logo-v">V</span>
          <span className="nav__logo-slash">/</span>
          <span className="nav__logo-r">R</span>
          <span className="nav__logo-bracket">]</span>
          <span className="nav__logo-cursor">_</span>
        </a>

        {/* Status indicator */}
        <div className="nav__status">
          <span className="nav__status-label">SEC:</span>
          <span className="nav__status-num">{NAV_ITEMS[activeIndex]?.num || '00'}</span>
          <span className="nav__status-dot" />
        </div>

        {/* Theme toggle */}
        <button
          className="nav__theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <span className="nav__theme-icon">
            {theme === 'light' ? <FaSun /> : <FaMoon />}
          </span>
        </button>

        <button
          className={`nav__toggle ${isMobileMenuOpen ? 'is-active' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="nav__toggle-line" />
          <span className="nav__toggle-line" />
          <span className="nav__toggle-line" />
        </button>

        <ul className={`nav__list ${isMobileMenuOpen ? 'is-open' : ''}`}>
          {NAV_ITEMS.map((item, index) => (
            <li key={item.href} className="nav__item">
              <a
                href={item.href}
                className={`nav__link ${activeSection === item.href.slice(1) ? 'is-active' : ''}`}
                onClick={(e) => handleNavClick(e, item.href)}
              >
                <span className="nav__link-num">{item.num}</span>
                <span className="nav__link-text">{item.label}</span>
                <span className="nav__link-arrow">→</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
