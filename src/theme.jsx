import { createContext, useContext, useEffect, useState } from 'react';

// La identidad es plateado-primero: el default es claro siempre,
// la preferencia guardada gana.
const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('vr.theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* modo privado */ }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.dataset.theme = 'dark';
      root.style.background = '#232328';
    } else {
      delete root.dataset.theme;
      root.style.background = '#cfd0d6';
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      theme === 'dark' ? '#232328' : '#cfd0d6'
    );
    try {
      localStorage.setItem('vr.theme', theme);
    } catch { /* modo privado */ }
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
