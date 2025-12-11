import AsciiCube from '../ascii/AsciiCube';
import Dither from '../backgrounds/Dither';
import DecryptedText from '../ui/DecryptedText';
import './Hero.css';

export default function Hero() {
  // Terracotta color converted to RGB 0-1 range: #9c4635 = (156, 70, 53)
  const ditherColor = [0.61, 0.27, 0.21];

  return (
    <section id="hero" className="hero">
      {/* Dither background */}
      <div className="hero__dither-bg">
        <Dither
          waveColor={ditherColor}
          waveSpeed={0.02}
          waveFrequency={2}
          waveAmplitude={0.25}
          colorNum={3}
          pixelSize={3}
          enableMouseInteraction={true}
          mouseRadius={0.4}
        />
      </div>
      <div className="hero__content">
        <div className="hero__text">
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
        <div className="hero__ascii">
          <AsciiCube width={65} height={30} />
        </div>
        <a href="#projects" className="hero__cta">
          Ver proyectos
          <span className="hero__cta-arrow">&#8599;</span>
        </a>
      </div>
      <div className="hero__scroll-indicator">
        <span>SCROLL</span>
        <div className="hero__scroll-line" />
      </div>
    </section>
  );
}