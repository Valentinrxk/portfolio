import { useRef } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import './Contact.css';

export default function Contact() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.3 });

  return (
    <section id="contact" className="contact" ref={sectionRef}>
      <div className="contact__bg-pattern" aria-hidden="true" />
      <div className={`contact__content ${isVisible ? 'is-visible' : ''}`}>
        <h2 className="contact__title">
          <span className="contact__title-line">TRABAJEMOS</span>
          <span className="contact__title-line contact__title-line--accent">JUNTOS</span>
        </h2>
        <div className="contact__terminal">
          <span className="contact__prompt">&gt;</span>
          <a href="mailto:plasticvalentin@gmail.com" className="contact__email">
              plasticvalentin@gmail.com
          </a>
          <span className="contact__cursor">_</span>
        </div>
        <div className="contact__social">
          <a href="https://www.linkedin.com/in/valentin-romero-61b089139/" className="contact__link" target="_blank" rel="noopener noreferrer">
            [LINKEDIN]
          </a>
          <a href="https://github.com/plasticvalentin" className="contact__link" target="_blank" rel="noopener noreferrer">
            [GITHUB]
          </a>
        </div>
      </div>
      <footer className="contact__footer">
        <span className="contact__copyright">
          &copy; {new Date().getFullYear()} — Diseñado y desarrollado con pasión
        </span>
      </footer>
    </section>
  );
}
