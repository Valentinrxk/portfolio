import { createContext, useContext, useEffect, useState } from 'react';

export const EMAIL = 'hi@valentinromero.com';

// Dominio de producción: canonical y og:url apuntan siempre acá, aunque el
// sitio se esté viendo en un preview de Vercel
const SITE = 'https://valentinromero.com';

// Metadatos por idioma: lo que muestran Google y las previews al compartir
const META = {
  es: {
    title: 'Valentín Romero — Desarrollador frontend en Buenos Aires',
    description:
      'Valentín Romero, desarrollador frontend y full stack en Buenos Aires. Sitios con animación, React, Vue, Laravel y SaaS en producción desde 2023.',
    locale: 'es_AR',
  },
  en: {
    title: 'Valentín Romero — Frontend Developer in Buenos Aires',
    description:
      'Valentín Romero, frontend and full stack developer in Buenos Aires. Animated websites, React, Vue, Laravel and production SaaS since 2023.',
    locale: 'en_US',
  },
};

const DICT = {
  es: {
    nav:{ hero: 'inicio', experience: 'oficio', projects: 'obras', skills: 'adn', contact: 'contacto' },
    theme: { dark: 'noche' },
    intro: { sign: 'valentín romero' },
    hero: {
      kicker: 'valentín romero, desarrollador en buenos aires',
      statement: 'el criterio no se descarga',
    },
    experience: {
      title: 'oficio',
      lead: 'desde 2023 haciendo software que se usa todos los días: clínicas, estudios contables, una agencia de diseño y un club de primera.',
      roles: {
        oclu: {
          when: 'may 2025 — hoy',
          role: 'full stack developer',
          note: 'ia en producción: servidores mcp y presupuestos dictados por voz.',
        },
        grip: {
          when: '2025 — hoy',
          role: 'frontend developer',
        },
        taxes: {
          when: '2023 — hoy',
          role: 'full stack developer',
        },
      },
    },
    tv: {
      title: 'cosas que forjaron mi criterio',
      hint: 'deslizá para cambiar de canal',
      hintDesktop: '← → cambiar de canal',
      prev: 'canal anterior',
      next: 'canal siguiente',
      film: 'ver en letterboxd',
      alt: 'un televisor viejo que pasa ascii, de noche. canal 1, 回路 (kairo, de kiyoshi kurosawa): puntos que se buscan cuando están solos y mueren cuando se tocan; el dedo es un punto que no muere. canal 2, キュア (cure, de kiyoshi kurosawa): la llama de un encendedor sobre agua derramada; el dedo lo sostiene y, quieto, entra en trance; a veces, una x roja dura un solo cuadro. canal 3, リリイ・シュシュのすべて (all about lily chou-chou, de shunji iwai): un arrozal verde que el viento peina, una figura lejana con auriculares y un foro que se escribe solo; inclinar el teléfono o arrastrar de costado hace soplar el viento.',
      channels: [
        { name: 'pulse', director: 'kiyoshi kurosawa', year: '2001', url: 'https://letterboxd.com/film/pulse-2001/' },
        { name: 'cure', director: 'kiyoshi kurosawa', year: '1997', url: 'https://letterboxd.com/film/cure/' },
        { name: 'all about lily chou-chou', director: 'shunji iwai', year: '2001', url: 'https://letterboxd.com/film/all-about-lily-chou-chou/' },
      ],
    },
    projects: {
      title: 'obras',
      view: 'ver ⟶',
      missing: 'falta la tuya.',
      write: 'escribime',
      kinds: {
        riestra: 'sitio + panel de prensa',
        oclucrm: 'saas multi-tenant',
        grip: 'landing + branding',
        taxes: 'saas + app móvil',
      },
      items: {
        oclucrm: 'crm para clínicas: pacientes, turnos y administración en una sola pantalla.',
        grip: 'landing para grip®, agencia de marketing de buenos aires.',
        taxes: 'facturación electrónica, sueldos e impuestos para estudios y pymes, con app móvil.',
        riestra: 'sitio del club deportivo riestra, de la d a primera. la página es la camiseta: escudo, sponsor y el partido en vivo.',
      },
    },
    skills: {
      lines: ['nunca', 'lo mismo', 'dos veces.'],
    },
    contact: {
      kicker: '¿tenés un proyecto?',
      status: 'disponible para proyectos',
    },
  },
  en: {
    nav: { hero: 'home', experience: 'career', projects: 'works', skills: 'dna', contact: 'contact' },
    theme: { dark: 'night' },
    intro: { sign: 'valentín romero' },
    hero: {
      kicker: 'valentín romero, developer in buenos aires',
      statement: "taste can't be downloaded",
    },
    experience: {
      title: 'career',
      lead: 'shipping software people use every day since 2023: clinics, accounting firms, a design agency and a top-flight football club.',
      roles: {
        oclu: {
          when: 'may 2025 — now',
          role: 'full stack developer',
          note: 'ai in production: mcp servers and voice-dictated quotes.',
        },
        grip: {
          when: '2025 — now',
          role: 'frontend developer',
        },
        taxes: {
          when: '2023 — now',
          role: 'full stack developer',
        },
      },
    },
    tv: {
      title: 'things that forged my taste',
      hint: 'swipe to change channel',
      hintDesktop: '← → change channel',
      prev: 'previous channel',
      next: 'next channel',
      film: 'see on letterboxd',
      alt: 'an old television showing ascii, late at night. channel 1, 回路 (kairo, by kiyoshi kurosawa): dots that seek each other when alone and die when they touch; your finger is a dot that never dies. channel 2, キュア (cure, by kiyoshi kurosawa): a lighter flame over spilled water; your finger holds it and, held still, falls into a trance; now and then a red x lasts a single frame. channel 3, リリイ・シュシュのすべて (all about lily chou-chou, by shunji iwai): a green rice field combed by the wind, a distant figure with headphones and a forum that writes itself; tilting the phone or dragging sideways makes the wind blow.',
      channels: [
        { name: 'pulse', director: 'kiyoshi kurosawa', year: '2001', url: 'https://letterboxd.com/film/pulse-2001/' },
        { name: 'cure', director: 'kiyoshi kurosawa', year: '1997', url: 'https://letterboxd.com/film/cure/' },
        { name: 'all about lily chou-chou', director: 'shunji iwai', year: '2001', url: 'https://letterboxd.com/film/all-about-lily-chou-chou/' },
      ],
    },
    projects: {
      title: 'works',
      view: 'view ⟶',
      missing: 'yours is missing.',
      write: 'write me',
      kinds: {
        riestra: 'site + press panel',
        oclucrm: 'multi-tenant saas',
        grip: 'landing + branding',
        taxes: 'saas + mobile app',
      },
      items: {
        oclucrm: 'clinic crm: patients, appointments and admin on a single screen.',
        grip: 'landing for grip®, a buenos aires marketing agency.',
        taxes: 'e-invoicing, payroll and taxes for accounting firms and smes, with a mobile app.',
        riestra: 'site for club deportivo riestra, from the fifth division to the top flight. the page is the jersey: crest, sponsor, live match.',
      },
    },
    skills: {
      lines: ['never', 'the same', 'thing twice.'],
    },
    contact: {
      kicker: 'got a project?',
      status: 'available for projects',
    },
  },
};

const LangContext = createContext({ lang: 'es', setLang: () => {}, t: DICT.es });

const isLang = (v) => v === 'es' || v === 'en';
const langFromUrl = () => new URLSearchParams(window.location.search).get('lang');

const setMeta = (selector, attr, value) => {
  document.head.querySelector(selector)?.setAttribute(attr, value);
};

/** Título, descripción, canonical y Open Graph en el idioma visible. */
function syncHead(lang) {
  const m = META[lang];
  // con ?lang= la URL es la versión de ese idioma; sin él, la raíz (x-default)
  const url = isLang(langFromUrl()) ? `${SITE}/?lang=${lang}` : `${SITE}/`;
  document.documentElement.lang = lang;
  document.title = m.title;
  setMeta('meta[name="description"]', 'content', m.description);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[property="og:title"]', 'content', m.title);
  setMeta('meta[property="og:description"]', 'content', m.description);
  setMeta('meta[property="og:locale"]', 'content', m.locale);
  setMeta('meta[property="og:locale:alternate"]', 'content', META[lang === 'es' ? 'en' : 'es'].locale);
  setMeta('meta[name="twitter:title"]', 'content', m.title);
  setMeta('meta[name="twitter:description"]', 'content', m.description);
}

export function LangProvider({ children }) {
  // Orden: la URL manda (así Google indexa cada idioma en su dirección),
  // después la elección guardada, después el idioma del navegador
  const [lang, setLangState] = useState(() => {
    const fromUrl = langFromUrl();
    if (isLang(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem('vr.lang');
      if (isLang(saved)) return saved;
    } catch { /* modo privado */ }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  });

  // Elegir idioma a mano lo deja en la URL: el link compartido abre igual
  const setLang = (next) => {
    if (!isLang(next)) return;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState(window.history.state, '', url);
    setLangState(next);
  };

  useEffect(() => {
    syncHead(lang);
    try {
      localStorage.setItem('vr.lang', lang);
    } catch { /* modo privado */ }
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: DICT[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
