import { createContext, useContext, useEffect, useState } from 'react';

export const EMAIL = 'hi@valentinromero.com';

const DICT = {
  es: {
    nav: { hero: 'inicio', about: 'perfil', projects: 'obras', skills: 'adn', contact: 'contacto' },
    intro: { sign: 'valentín romero — portfolio' },
    hero: {
      kicker: 'valentín romero — buenos aires',
      statement: 'el criterio no se descarga',
      sub: 'código, estética y la obsesión por no parecerse a nada.',
    },
    about: {
      takes: [
        'no soy una fábrica de features: soy la persona que dice que no cuando el brief pide otra plantilla.',
        'lo técnico es el piso — react, vue, node. el techo es el criterio: saber qué sobra.',
        'si algo de acá te hizo ruido, perfecto. lo genérico no hace ruido.',
      ],
    },
    projects: {
      title: 'obras',
      view: 'ver ⟶',
      missing: 'falta la tuya.',
      write: 'escribime',
      items: {
        oclucrm: 'crm para clínicas: pacientes, turnos y administración en una pantalla que no te pelea.',
        grip: 'landing para grip®, agencia de marketing de buenos aires. marcas que se te pegan, cero chamuyo corporativo.',
        taxes: 'impuestos y declaraciones sin laberinto. números claros para gente que odia los números.',
      },
    },
    skills: {
      lines: ['nunca', 'lo mismo', 'dos veces.'],
      cards: { wave: 'onda', noise: 'ruido', flow: 'flujo' },
    },
    contact: {
      kicker: '¿tenés algo que no quiere ser genérico?',
      status: 'disponible para proyectos',
    },
  },
  en: {
    nav: { hero: 'home', about: 'profile', projects: 'works', skills: 'dna', contact: 'contact' },
    intro: { sign: 'valentín romero — portfolio' },
    hero: {
      kicker: 'valentín romero — buenos aires',
      statement: "taste can't be downloaded",
      sub: 'code, aesthetics, and an obsession with looking like nothing else.',
    },
    about: {
      takes: [
        "i'm not a feature factory: i'm the person who says no when the brief asks for another template.",
        'the tech is the floor — react, vue, node. taste is the ceiling: knowing what to cut.',
        'if something here made noise in your head — good. generic is silent.',
      ],
    },
    projects: {
      title: 'works',
      view: 'view ⟶',
      missing: 'yours is missing.',
      write: 'write me',
      items: {
        oclucrm: "clinic crm: patients, appointments and admin in one screen that doesn't fight back.",
        grip: 'landing for grip®, a buenos aires marketing agency. brands that stick, zero corporate small talk.',
        taxes: 'taxes and filings without the maze. clear numbers for people who hate numbers.',
      },
    },
    skills: {
      lines: ['never', 'the same', 'thing twice.'],
      cards: { wave: 'wave', noise: 'noise', flow: 'flow' },
    },
    contact: {
      kicker: 'got something that refuses to be generic?',
      status: 'available for projects',
    },
  },
};

const LangContext = createContext({ lang: 'es', setLang: () => {}, t: DICT.es });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('vr.lang');
      if (saved === 'es' || saved === 'en') return saved;
    } catch { /* modo privado */ }
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
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
