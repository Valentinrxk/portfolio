import { createContext, useContext, useEffect, useState } from 'react';

// El default es oscuro. Solo se guarda lo que la persona elige con [◐]:
// así el default puede cambiar sin pisar una elección real.
// (index.html lee la misma clave antes del primer paint)
const KEY = 'vr.theme-choice';
const ThemeContext = createContext({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* modo privado */ }
    return 'dark';
  });

  const setTheme = (next) => {
    setThemeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch { /* modo privado */ }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.dataset.theme = 'dark';
      root.style.background = '#343439';
    } else {
      delete root.dataset.theme;
      root.style.background = '#cfd0d6';
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#343439' : '#cfd0d6'
    );
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
