import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    invoke<string>('get_theme')
      .then(t => setThemeState(t as 'dark' | 'light'))
      .catch(() => {});
  }, []);

  const setTheme = async (t: 'dark' | 'light') => {
    await invoke('set_theme', { theme: t });
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggleTheme };
}
