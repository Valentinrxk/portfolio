import { useRef } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import AsciiPortrait from '../ascii/AsciiPortrait';
import './About.css';

export default function About() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.15 });

  return (
    <section id="about" className="about" ref={sectionRef}>
      <span className="about__bg-number" aria-hidden="true">01</span>
      <div className={`about__container ${isVisible ? 'is-visible' : ''}`}>
        <h2 className="about__title">SOBRE MÍ</h2>
        <div className="about__content">
          <div className="about__image-wrapper">
            <AsciiPortrait isVisible={isVisible} />
            <div className="about__image-accent" aria-hidden="true" />
          </div>
          <div className="about__text">
            <p className="about__paragraph about__paragraph--lead">
              Desarrollador frontend con experiencia creando interfaces que no solo funcionan,
              sino que cuentan historias y generan impacto.
            </p>
            <p className="about__paragraph">
              Mi enfoque combina precisión técnica con sensibilidad de diseño.
              Trabajo como fullstack pero mi corazón late por el frontend —
              donde cada pixel importa y cada interacción debe sentirse intencional.
            </p>
            <p className="about__paragraph about__paragraph--accent">
              Creo en el código limpio, el diseño arriesgado, y las experiencias
              que se quedan grabadas en la memoria.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
