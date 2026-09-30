import { Fragment, useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import AsciiPlayer from '../ascii/AsciiPlayer';
import { useLang, EMAIL } from '../../i18n';
import { useTheme } from '../../theme';
import './Projects.css';

// El reel de cada obra, pre-renderizado a ASCII.
// Import dinámico: cada uno viaja en su propio chunk.
const WORK_FRAMES = {
  riestra: () => import('../../assets/works/riestra-frames.json'),
  oclucrm: () => import('../../assets/works/oclucrm-frames.json'),
  grip: () => import('../../assets/works/grip-frames.json'),
  taxes: () => import('../../assets/works/taxes-frames.json'),
};

// Porción visible que necesita la pieza para cobrar vida: apenas por encima
// de la mitad del ancho de pantalla medido en piezas, así dos nunca la
// alcanzan a la vez (escritorio ≈ 0.83, celular ≈ 0.63)
const liveRatio = (width) => Math.min(0.9, window.innerWidth / (2 * width) + 0.05);
const RATIO_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

function WorkAscii({ workKey, dark, paused }) {
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
      ink={dark ? 'rgba(35, 35, 39, 0.82)' : 'rgba(230, 231, 235, 0.8)'}
      accent="#e10600"
      className="frame__ascii"
      paused={paused}
    />
  );
}

/**
 * Pantalla de la pieza: el reel en ASCII hasta que la pieza llega al centro
 * de la banda (o le pasan el puntero); ahí arranca el video real desde el
 * principio y los caracteres se disuelven. Al salir, vuelve el ASCII.
 */
function WorkScreen({ project, dark, view, onFocus }) {
  const screenRef = useRef(null);
  const videoRef = useRef(null);
  const [live, setLive] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const screen = screenRef.current;
    const video = videoRef.current;
    if (!screen || !video || reduced) return undefined;

    let inStage = false;
    let hovered = false;
    let rewind = null;

    const sync = () => {
      if (inStage || hovered) {
        clearTimeout(rewind);
        video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
        setLive(false);
        // Rebobinar cuando el fundido ya lo tapó: cada entrada arranca de cero
        rewind = setTimeout(() => {
          video.currentTime = 0;
        }, 700);
      }
    };

    const onPlaying = () => setLive(true);
    video.addEventListener('playing', onPlaying);

    // La banda se mueve con transform: el observer lo registra igual
    const io = new IntersectionObserver(
      ([entry]) => {
        // Apenas asoma, que empiece a bajar; a escena completa, que corra
        if (entry.isIntersecting && video.preload === 'none') {
          video.preload = 'auto';
          video.load();
        }
        inStage = entry.intersectionRatio >= liveRatio(entry.boundingClientRect.width);
        sync();
      },
      { threshold: RATIO_STEPS },
    );
    io.observe(screen);

    const enter = () => {
      hovered = true;
      sync();
    };
    const leave = () => {
      hovered = false;
      sync();
    };
    screen.addEventListener('pointerenter', enter);
    screen.addEventListener('pointerleave', leave);

    return () => {
      clearTimeout(rewind);
      io.disconnect();
      video.removeEventListener('playing', onPlaying);
      screen.removeEventListener('pointerenter', enter);
      screen.removeEventListener('pointerleave', leave);
    };
  }, [reduced]);

  return (
    <a
      ref={screenRef}
      className={`frame__screen${live ? ' is-live' : ''}`}
      href={project.link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={project.title}
      onFocus={onFocus}
    >
      <WorkAscii workKey={project.key} dark={dark} paused={live} />
      <video
        ref={videoRef}
        className="frame__video"
        src={project.video}
        poster={project.poster}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        tabIndex={-1}
      />
      <span className="frame__play caps" aria-hidden="true">{view}</span>
    </a>
  );
}

// Ficha técnica por capa, el back primero: lo que no se ve en el reel
const PROJECTS = [
  {
    key: 'riestra',
    title: 'deportivo riestra',
    domain: 'deportivoriestra.com.ar',
    stack: [
      ['back', 'postgresql + rls · supabase · cloudflare workers · astro ssr'],
      ['front', 'astro · gsap · lenis'],
      ['infra', 'vercel · cloudflare'],
    ],
    video: '/works/riestra.mp4',
    poster: '/works/riestra.jpg',
    link: 'https://deportivoriestra.com.ar/',
  },
  {
    key: 'oclucrm',
    title: 'oclucrm',
    domain: 'oclucrm.com',
    stack: [
      ['back', 'php 8 · laravel · mysql · redis · multi-tenant · api rest · afip · openai'],
      ['front', 'vue 3 · three.js · dicom'],
      ['infra', 'docker · aws s3 · sentry · bitbucket ci'],
    ],
    video: '/works/oclucrm.mp4',
    poster: '/works/oclucrm.jpg',
    link: 'https://www.oclucrm.com/',
  },
  {
    key: 'grip',
    title: 'grip studio',
    domain: 'gripppp.com',
    stack: [['front', 'vite · javascript']],
    video: '/works/grip.mp4',
    poster: '/works/grip.jpg',
    link: 'https://gripppp.com/',
  },
  {
    key: 'taxes',
    title: 'taxes software',
    domain: 'taxes.com.ar',
    stack: [
      ['back', 'php 8 · laravel · mysql · jobs + supervisor · afip ws · openai · mcp (node)'],
      ['front', 'vue'],
      ['app', 'react native · expo · typescript'],
      ['infra', 'docker · sendgrid'],
    ],
    video: '/works/taxes.mp4',
    poster: '/works/taxes.jpg',
    link: 'https://www.taxes.com.ar/',
  },
];

/**
 * Obras: el scroll vertical arrastra la banda en horizontal.
 * Cada pieza vive en ASCII y cobra vida —el reel real del sitio—
 * cuando llega al centro de la banda.
 */
export default function Projects() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [maxShift, setMaxShift] = useState(0);
  const reduced = useReducedMotion();
  const { t } = useLang();
  const { theme } = useTheme();

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

  // La banda llega al final en 0.82: el cierre queda clavado ~una pantalla
  // de scroll antes de que la escena suelte — tiempo real de lectura
  const x = useTransform(scrollYProgress, [0.05, 0.82], [0, -maxShift]);

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
    const progress = 0.05 + (Math.min(Math.max(shift, 0), maxShift) / maxShift) * 0.77;
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
                <span className="frame__meta">{t.projects.kinds[project.key]}</span>
              </div>

              <WorkScreen
                project={project}
                dark={theme === 'dark'}
                view={t.projects.view}
                onFocus={bringIntoView}
              />

              <div className="frame__info">
                <h3 className="frame__name">{project.title}</h3>
                <div className="frame__about">
                  <p className="frame__description">{t.projects.items[project.key]}</p>
                  <dl className="frame__stack caps">
                    {project.stack.map(([layer, tech]) => (
                      <div key={layer} className={`frame__stack-row frame__stack-row--${layer}`}>
                        <dt>{layer}</dt>
                        <dd>
                          {tech.split(' · ').map((item, i, all) => (
                            <Fragment key={item}>
                              <span className="frame__tech">{item}</span>
                              {/* el punto se queda con la anterior: el corte cae después */}
                              {i < all.length - 1 ? ' · ' : ''}
                            </Fragment>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </article>
          ))}

          <footer className="projects__cta">
            <span className="section-slash" aria-hidden="true">///</span>
            <p className="projects__cta-line">{t.projects.missing}</p>
            <a className="projects__cta-mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
              <span aria-hidden="true"> ⟶</span>
            </a>
          </footer>
        </motion.div>
      </div>
    </section>
  );
}
