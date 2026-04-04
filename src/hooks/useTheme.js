import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('studio65-theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('studio65-theme', theme);
  }, [theme]);

  const setTheme = (t) => setThemeState(t);

  return { theme, setTheme };
}