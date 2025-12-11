import { useRef } from 'react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import { HiArrowTopRightOnSquare } from 'react-icons/hi2';
import './Projects.css';

const PROJECTS = [
  {
    id: 1,
    title: 'OcluCRM',
    description: 'Sistema CRM completo para gestión de pacientes y clínicas. Interfaz intuitiva con funcionalidades avanzadas de seguimiento y administración.',
    tech: ['Vue', 'Laravel', 'TailwindCSS', 'MySQL'],
    size: 'large',
    image: '/oclucrm.png',
    link: 'https://www.oclucrm.com/',
  },
  {
    id: 2,
    title: 'Alcaraz Contador',
    description: 'Sitio web profesional para estudio contable. Diseño moderno y funcional para servicios contables.',
    tech: ['Next.js', 'Tailwind', 'CMS'],
    size: 'medium',
    image: '/alcarazcontador.png',
    link: 'https://www.alcarazcontador.com/',
  },
  {
    id: 3,
    title: 'Taxes',
    description: 'Aplicación para gestión de impuestos y declaraciones. Interfaz clara y eficiente para usuarios.',
    tech: ['Vue', 'Express', 'PostgreSQL'],
    size: 'small',
    image: '/taxes.png',
    link: 'https://www.taxes.com.ar/',
  },
];

export default function Projects() {
  const sectionRef = useRef(null);
  const isVisible = useScrollAnimation(sectionRef, { threshold: 0.1 });

  return (
    <section id="projects" className="projects" ref={sectionRef}>
      <div className={`projects__container ${isVisible ? 'is-visible' : ''}`}>
        <div className="projects__header">
          <h2 className="projects__title">PROYECTOS</h2>
          <p className="projects__subtitle">Trabajos seleccionados</p>
        </div>
        <div className="projects__grid">
          {PROJECTS.map((project, index) => (
            <article
              key={project.id}
              className={`project-card project-card--${project.size}`}
              style={{ '--delay': `${index * 0.1}s` }}
            >
              <span className="project-card__number">
                {String(project.id).padStart(2, '0')}
              </span>
              <div className="project-card__image">
                <img 
                  src={project.image} 
                  alt={project.title}
                  loading="lazy"
                  decoding="async"
                  width="800"
                  height="500"
                />
              </div>
              <div className="project-card__content">
                <h3 className="project-card__title">{project.title}</h3>
                <p className="project-card__description">{project.description}</p>
                <div className="project-card__tech">
                  {project.tech.map((t) => (
                    <span key={t} className="project-card__tag">{t}</span>
                  ))}
                </div>
              </div>
              <a href={project.link} className="project-card__link" aria-label={`Ver ${project.title}`} target="_blank" rel="noopener noreferrer">
                <HiArrowTopRightOnSquare className="project-card__link-icon" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
