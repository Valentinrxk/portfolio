import { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// El default es oscuro. Solo se guarda lo que la persona elige con [◐]:
// así el default puede cambiar sin pisar una elección real.
// (index.html lee la misma clave antes del primer paint)
const KEY = 'vr.theme-choice';
const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} });

// el tema en el documento: atributo, fondo del html y color de la barra del navegador
function paint(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.dataset.theme = 'dark';
    root.style.background = '#141416';
  } else {
    delete root.dataset.theme;
    root.style.background = '#bfc0c7';
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#141416' : '#bfc0c7'
  );
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* modo privado */ }
    return 'dark';
  });

  const setTheme = (next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch { /* modo privado */ }
    // el cambio tiene que estar en el DOM dentro del callback de la transición
    const swap = () => {
      paint(next);
      flushSync(() => setThemeState(next));
    };
    // fundido sutil entre temas; sin soporte o con movimiento reducido, corte seco
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || still) swap();
    else document.startViewTransition(swap);
  };

  useEffect(() => paint(theme), [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
