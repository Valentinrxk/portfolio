import { useState, useEffect } from 'react';
import AsciiCube from '../ascii/AsciiCube';
import Dither from '../backgrounds/Dither';
import DecryptedText from '../ui/DecryptedText';
import MagneticButton from '../ui/MagneticButton';
import './Hero.css';

export default function Hero() {
  const [scrollY, setScrollY] = useState(0);
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  // Detect theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Terracotta color adjusted for theme
  // Light mode: use light base color for better visibility
  // Dark mode: use dark base color
  const ditherColor = theme === 'dark'
    ? [0.78, 0.36, 0.29]  // #c75d4a - lighter terracotta for dark mode
    : [0.61, 0.27, 0.21]; // #9c4635 - darker terracotta for light mode

  const baseColor = theme === 'dark'
    ? [0.0, 0.0, 0.0]     // Black base for dark mode
    : [0.91, 0.90, 0.89]; // #E8E6E3 - light bg color for light mode

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate parallax values
  const parallaxText = scrollY * 0.3;
  const parallaxAscii = scrollY * -0.2;
  const opacity = Math.max(0, 1 - scrollY / 500);

  return (
    <section id="hero" className="hero">
      {/* Dither background */}
      <div
        className="hero__dither-bg"
        style={{ transform: `translateY(${scrollY * 0.5}px)` }}
      >
        <Dither
          waveColor={ditherColor}
          baseColor={baseColor}
          waveSpeed={0.012}
          waveFrequency={1.2}
          waveAmplitude={0.2}
          colorNum={3}
          pixelSize={3}
          enableMouseInteraction={true}
          mouseRadius={0.25}
        />
      </div>
      <div className="hero__content">
        <div
          className="hero__text"
          style={{
            transform: `translateY(${parallaxText}px)`,
            opacity
          }}
        >
          <span className="hero__label">Valentín Romero</span>
          <h1 className="hero__title">
            <span className="hero__title-line">
              <DecryptedText
                text="FRONTEND"
                animateOn="view"
                speed={60}
                maxIterations={15}
                characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ01<>/{}[]"
                revealDirection="start"
                sequential={true}
                className="hero__char--revealed"
                encryptedClassName="hero__char--encrypted"
              />
            </span>
            <span className="hero__title-line hero__title-line--outline">
              <DecryptedText
                text="DEVELOPER"
                animateOn="view"
                speed={50}
                maxIterations={20}
                characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ01<>/{}[]"
                revealDirection="end"
                sequential={true}
                className="hero__char--revealed"
                encryptedClassName="hero__char--encrypted"
              />
            </span>
          </h1>
          <div className="hero__line" />
          <p className="hero__subtitle">
            Creando experiencias digitales donde el código se encuentra con el diseño.
            Fullstack por necesidad, frontend por pasión.
          </p>
        </div>
        <div
          className="hero__ascii"
          style={{ transform: `translateY(${parallaxAscii}px)` }}
        >
          <AsciiCube width={65} height={40} />
        </div>
        <MagneticButton
          href="#projects"
          className="hero__cta"
          strength={0.5}
        >
          Ver proyectos
          <span className="hero__cta-arrow">&#8599;</span>
        </MagneticButton>
      </div>
      <div
        className="hero__scroll-indicator"
        style={{ opacity }}
      >
        <span>SCROLL</span>
        <div className="hero__scroll-line" />
      </div>
    </section>
  );
}