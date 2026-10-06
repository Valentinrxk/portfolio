import { createContext, useContext, useEffect, useState } from 'react';

export const EMAIL = 'hi@valentinromero.com';

const DICT = {
  es: {
    nav: { hero: 'inicio', about: 'perfil', experience: 'oficio', projects: 'obras', skills: 'adn', contact: 'contacto' },
    theme: { light: 'día', dark: 'noche' },
    intro: { sign: 'valentín romero' },
    hero: {
      kicker: 'valentín romero, desarrollador en buenos aires',
      statement: 'el criterio no se descarga',
      sub: 'código, estética y la obsesión por no parecerse a nada.',
    },
    about: {
      ghost: 'perfil',
      takes: [
        { text: 'no soy una fábrica de features: soy la persona que dice que no cuando el brief pide otra plantilla.', em: 'la persona que dice que no' },
        { text: 'lo técnico es el piso — php, laravel, java, node, vue, react. el techo es el criterio: saber qué sobra.', em: 'el criterio' },
        { text: 'si algo de acá te hizo ruido, perfecto. lo genérico no hace ruido.', em: 'lo genérico no hace ruido' },
      ],
    },
    experience: {
      title: 'oficio',
      lead: 'desde 2023 haciendo software que se usa todos los días: clínicas, estudios contables, una agencia de diseño y un club de primera.',
      roles: {
        oclu: {
          when: 'may 2025 — hoy',
          role: 'full stack developer',
          kind: 'crm multi-tenant para clínicas dentales',
          points: [
            'agenda, historias clínicas, presupuestos, tesorería y laboratorio, en vue 3, laravel, mysql y redis.',
            'presupuestos dictados por voz con openai whisper y campañas masivas por whatsapp y mail.',
            'el pipeline que migra clínicas desde su software anterior: pacientes, historia clínica y deudas desde excel, csv y vcf.',
          ],
        },
        grip: {
          when: '2025 — hoy',
          role: 'frontend developer',
          kind: 'agencia de marketing y diseño',
          points: [
            'los sitios y landings de la agencia, de punta a punta: del diseño al deploy, con animaciones guiadas por scroll y foco en performance.',
          ],
        },
        taxes: {
          when: '2023 — hoy',
          role: 'full stack developer',
          kind: 'saas contable para estudios y pymes',
          points: [
            'plataforma en laravel 12 y vue con facturación electrónica afip y sueldos.',
            'dos apps en react native: watax, el inbox de whatsapp del soporte (google play y testflight), y taxes app para facturar desde el celular.',
            'soporte de primera línea: escucho el problema antes de que sea un ticket.',
          ],
        },
        uade: {
          when: '2024 — hoy',
          role: 'tecnicatura en desarrollo de software',
          kind: 'formación',
          points: [],
        },
      },
      ai: {
        label: 'ia en producción',
        statement: 'la ia no es un demo acá: ya trabaja en producción.',
        mcp: {
          count: '03',
          title: 'servidores mcp',
          nodes: [
            ['clínicas', 'claude con los datos de cada clínica, oauth por tenant'],
            ['equipo', 'un asistente del negocio para el equipo'],
            ['taxes', 'el asistente operativo: datos, reportes y logs'],
          ],
        },
        voice: { title: 'openai whisper', text: 'presupuestos dictados por voz, adentro del producto.' },
        daily: { title: 'claude code', text: 'código con claude code y apis de llm, todos los días.' },
      },
      langs: 'español nativo · inglés c1',
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
        oclucrm: 'crm para clínicas: pacientes, turnos y administración en una pantalla que no te pelea.',
        grip: 'landing para grip®, agencia de marketing de buenos aires. marcas que se te pegan, cero chamuyo corporativo.',
        taxes: 'impuestos y declaraciones sin laberinto. números claros para gente que odia los números.',
        riestra: 'sitio del club deportivo riestra, de la d a primera. la página es la camiseta: escudo, sponsor y el partido en vivo.',
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
    nav: { hero: 'home', about: 'profile', experience: 'career', projects: 'works', skills: 'dna', contact: 'contact' },
    theme: { light: 'day', dark: 'night' },
    intro: { sign: 'valentín romero' },
    hero: {
      kicker: 'valentín romero, developer in buenos aires',
      statement: "taste can't be downloaded",
      sub: 'code, aesthetics, and an obsession with looking like nothing else.',
    },
    about: {
      ghost: 'profile',
      takes: [
        { text: "i'm not a feature factory: i'm the person who says no when the brief asks for another template.", em: 'the person who says no' },
        { text: 'the tech is the floor — php, laravel, java, node, vue, react. taste is the ceiling: knowing what to cut.', em: 'taste' },
        { text: 'if something here made noise in your head — good. generic is silent.', em: 'generic is silent' },
      ],
    },
    experience: {
      title: 'career',
      lead: 'shipping software people use every day since 2023: clinics, accounting firms, a design agency and a top-flight football club.',
      roles: {
        oclu: {
          when: 'may 2025 — now',
          role: 'full stack developer',
          kind: 'multi-tenant crm for dental clinics',
          points: [
            'scheduling, patient records, budgets, treasury and lab orders, in vue 3, laravel, mysql and redis.',
            'voice-dictated budgets with openai whisper and bulk whatsapp and email campaigns.',
            'the pipeline that migrates clinics from their old software: patients, clinical history and debts from excel, csv and vcf.',
          ],
        },
        grip: {
          when: '2025 — now',
          role: 'frontend developer',
          kind: 'marketing and design agency',
          points: [
            "the agency's websites and landing pages, end to end: from design to deploy, with scroll-driven animation and a focus on performance.",
          ],
        },
        taxes: {
          when: '2023 — now',
          role: 'full stack developer',
          kind: 'accounting saas for firms and smes',
          points: [
            'laravel 12 and vue platform with afip e-invoicing and payroll.',
            "two react native apps: watax, the support team's whatsapp inbox (google play and testflight), and taxes app for invoicing from your phone.",
            'first-line support: i hear the problem before it becomes a ticket.',
          ],
        },
        uade: {
          when: '2024 — now',
          role: 'associate degree in software development',
          kind: 'education',
          points: [],
        },
      },
      ai: {
        label: 'ai in production',
        statement: "ai isn't a demo here: it already works in production.",
        mcp: {
          count: '03',
          title: 'mcp servers',
          nodes: [
            ['clinics', "claude on each clinic's data, per-tenant oauth"],
            ['team', 'a business assistant for the team'],
            ['taxes', 'the operations assistant: data, reports and logs'],
          ],
        },
        voice: { title: 'openai whisper', text: 'voice-dictated budgets, inside the product.' },
        daily: { title: 'claude code', text: 'shipping with claude code and llm apis, every day.' },
      },
      langs: 'spanish, native · english, c1',
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
        oclucrm: "clinic crm: patients, appointments and admin in one screen that doesn't fight back.",
        grip: 'landing for grip®, a buenos aires marketing agency. brands that stick, zero corporate small talk.',
        taxes: 'taxes and filings without the maze. clear numbers for people who hate numbers.',
        riestra: 'site for club deportivo riestra, from the fifth division to the top flight. the page is the jersey: crest, sponsor, live match.',
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
