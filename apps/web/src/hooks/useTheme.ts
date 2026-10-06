import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
function resolveTheme(mode: ThemeMode) {
  return mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('finora-theme');
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  });
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(mode);
    };
    localStorage.setItem('finora-theme', mode);
    apply();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode]);
  return { mode, setMode };
}
