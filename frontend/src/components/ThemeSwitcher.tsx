import React, { useState, useEffect } from 'react';
import { Moon, Sun, Palette } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('abes-theme') || 'cyber-dark');

  const changeTheme = (newTheme: 'cyber-dark' | 'light' | 'corporate-abes') => {
    setTheme(newTheme);
    document.body.classList.remove('theme-light', 'theme-corporate');
    if (newTheme === 'light') document.body.classList.add('theme-light');
    if (newTheme === 'corporate-abes') document.body.classList.add('theme-corporate');
    localStorage.setItem('abes-theme', newTheme);
  };

  useEffect(() => {
    const activeTheme = (localStorage.getItem('abes-theme') as 'cyber-dark' | 'light' | 'corporate-abes') || 'cyber-dark';
    setTheme(activeTheme);
    document.body.classList.remove('theme-light', 'theme-corporate');
    if (activeTheme === 'light') document.body.classList.add('theme-light');
    if (activeTheme === 'corporate-abes') document.body.classList.add('theme-corporate');
  }, []);

  return (
    <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5 shadow-inner shrink-0">
      <button
        onClick={() => changeTheme('cyber-dark')}
        className={`p-1.5 rounded-lg transition ${
          theme === 'cyber-dark' 
            ? 'bg-brand-500 text-white shadow-glow' 
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Cyber Dark"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => changeTheme('light')}
        className={`p-1.5 rounded-lg transition ${
          theme === 'light' 
            ? 'bg-brand-500 text-white shadow-glow' 
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Vibrant Light"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => changeTheme('corporate-abes')}
        className={`p-1.5 rounded-lg transition ${
          theme === 'corporate-abes' 
            ? 'bg-brand-500 text-white shadow-glow' 
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="ABES Corporate"
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
