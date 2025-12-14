import { useRef, useState } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import TechnicalGrid from '../backgrounds/TechnicalGrid';
import MagneticButton from '../ui/MagneticButton';
import { SiLinkedin, SiGithub } from 'react-icons/si';
import './Contact.css';

export default function Contact() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.3 });
  const [hoveredSocial, setHoveredSocial] = useState(null);

  return (
    <section id="contact" className="contact" ref={sectionRef}>
      {/* Technical Grid Background */}
      <TechnicalGrid opacity={0.06} gridSize={50} accentLineEvery={4} />

      <div className="contact__bg-pattern" aria-hidden="true" />

      {/* Ambient Gradient */}
      <div className="contact__ambient-gradient" aria-hidden="true" />

      <div className={`contact__content ${isVisible ? 'is-visible' : ''}`}>
        {/* Pretitle */}
        <div className="contact__pretitle">
          <span className="contact__pretitle-line" />
          <span className="contact__pretitle-text">Disponible para nuevos proyectos</span>
          <span className="contact__pretitle-line" />
        </div>

        <h2 className="contact__title">
          <span className="contact__title-line">TRABAJEMOS</span>
          <span className="contact__title-line contact__title-line--accent">JUNTOS</span>
        </h2>

        <p className="contact__description">
          ¿Tienes un proyecto en mente? Me encantaría escucharlo.
          Diseñemos algo memorable.
        </p>

        {/* Email CTA */}
        <div className="contact__cta-wrapper">
          <MagneticButton
            href="mailto:plasticvalentin@gmail.com"
            className="contact__email-cta"
            strength={0.4}
          >
            <span className="contact__email-icon">✉</span>
            <span className="contact__email-text">plasticvalentin@gmail.com</span>
          </MagneticButton>
        </div>

        {/* Social Cards */}
        <div className="contact__social-cards">
          <a
            href="https://www.linkedin.com/in/valentin-romero-61b089139/"
            className={`contact__social-card ${hoveredSocial === 'linkedin' ? 'is-hovered' : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredSocial('linkedin')}
            onMouseLeave={() => setHoveredSocial(null)}
          >
            <div className="contact__social-card-header">
              <span className="contact__social-card-number">01</span>
              <svg className="contact__social-card-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="contact__social-card-body">
              <span className="contact__social-card-label">Conecta</span>
              <SiLinkedin className="contact__social-card-icon" />
            </div>
          </a>

          <a
            href="https://github.com/valentinrxk"
            className={`contact__social-card ${hoveredSocial === 'github' ? 'is-hovered' : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredSocial('github')}
            onMouseLeave={() => setHoveredSocial(null)}
          >
            <div className="contact__social-card-header">
              <span className="contact__social-card-number">02</span>
              <svg className="contact__social-card-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="contact__social-card-body">
              <span className="contact__social-card-label">Explora</span>
              <SiGithub className="contact__social-card-icon" />
            </div>
          </a>
        </div>
      </div>

      <footer className="contact__footer">
        <span className="contact__copyright">
          &copy; {new Date().getFullYear()} — Diseñado y desarrollado por Valentín Romero
        </span>
      </footer>
    </section>
  );
}
