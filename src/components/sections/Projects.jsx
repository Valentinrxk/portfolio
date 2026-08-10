import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiPlayer from '../ascii/AsciiPlayer';
import { useLang } from '../../i18n';
import './Projects.css';

// Recorridos grabados de cada obra, pre-renderizados a ASCII.
// Import dinámico: cada uno viaja en su propio chunk.
const WORK_FRAMES = {
  oclucrm: () => import('../../assets/works/oclucrm-frames.json'),
  grip: () => import('../../assets/works/grip-frames.json'),
  taxes: () => import('../../assets/works/taxes-frames.json'),
};

function WorkAscii({ workKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    WORK_FRAMES[workKey]().then((m) => {
      if (alive) setData(m.default ?? m);
    });
    return () => {
      alive = false;
    };
  }, [workKey]);

  if (!data) return null;
  return (
    <AsciiPlayer
      data={data}
      ink="rgba(230, 231, 235, 0.8)"
      accent="#e10600"
      className="frame__ascii"
    />
  );
}

const PROJECTS = [
  {
    key: 'oclucrm',
    title: 'oclucrm',
    domain: 'oclucrm.com',
    tech: 'vue · laravel · tailwindcss · mysql',
    image: '/oclucrm.png',
    link: 'https://www.oclucrm.com/',
  },
  {
    key: 'grip',
    title: 'grip studio',
    domain: 'gripppp.com',
    tech: 'vite · javascript · branding',
    image: '/gripppp.png',
    link: 'https://gripppp.com/',
  },
  {
    key: 'taxes',
    title: 'taxes software',
    domain: 'taxes.com.ar',
    tech: 'vue · express · postgresql',
    image: '/taxes.png',
    link: 'https://www.taxes.com.ar/',
  },
];

/**
 * Obras: el scroll vertical arrastra la banda en horizontal.
 * Cada screenshot vive renderizado en ASCII; el puntero revela
 * la captura real debajo de los caracteres.
 */
export default function Projects() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [maxShift, setMaxShift] = useState(0);
  const reduced = useReducedMotion();
  const { t } = useLang();

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const measure = () => {
      setMaxShift(Math.max(0, track.scrollWidth - window.innerWidth));
    };

    measure();
    const settle = setTimeout(measure, 600);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -maxShift]);

  // Teclado: el transform no es scrolleable por el navegador, así que al
  // enfocar una pieza llevamos el scroll vertical al punto que la encuadra
  const bringIntoView = (e) => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || maxShift === 0) return;
    const shift =
      e.currentTarget.getBoundingClientRect().left -
      track.getBoundingClientRect().left +
      e.currentTarget.offsetWidth / 2 -
      window.innerWidth / 2;
    const progress = 0.05 + (Math.min(Math.max(shift, 0), maxShift) / maxShift) * 0.9;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + progress * (section.offsetHeight - window.innerHeight), behavior: 'auto' });
  };

  return (
    <section id="projects" ref={sectionRef} className="projects">
      <div className="projects__viewport">
        <motion.div
          ref={trackRef}
          className="projects__track"
          style={reduced ? undefined : { x }}
        >
          <header className="projects__opener">
            <span className="section-slash" aria-hidden="true">///</span>
            <h2 className="projects__title">{t.projects.title}</h2>
            <span className="projects__opener-arrow" aria-hidden="true">⟶</span>
          </header>

          {PROJECTS.map((project) => (
            <article key={project.key} className="frame">
              <div className="frame__head caps">
                <span className="frame__domain">{project.domain}</span>
                <span className="frame__meta">{project.tech}</span>
              </div>

              <a
                className="frame__screen"
                href={project.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={project.title}
                onFocus={bringIntoView}
              >
                <WorkAscii workKey={project.key} />
                <img
                  className="frame__real"
                  src={project.image}
                  alt={`screenshot — ${project.title}`}
                  loading="eager"
                  decoding="async"
                />
                <span className="frame__play caps" aria-hidden="true">{t.projects.view}</span>
              </a>

              <div className="frame__info">
                <h3 className="frame__name">{project.title}</h3>
                <p className="frame__description">{t.projects.items[project.key]}</p>
              </div>
            </article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
