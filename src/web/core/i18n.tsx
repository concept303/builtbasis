import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Lang } from '../../domain';
interface Language { lang: Lang; setLang(lang: Lang): void; t(en: string, el: string): string }
const Context = createContext<Language | null>(null);
export function LanguageProvider({ children, shared = false }: { children: ReactNode; shared?: boolean }) {
  const [lang, set] = useState<Lang>(() => {
    if (shared) return 'el';
    try { return localStorage.getItem('bb-language') === 'el' ? 'el' : 'en'; } catch { return 'en'; }
  });
  const setLang = (next: Lang) => { set(next); if (!shared) { try { localStorage.setItem('bb-language', next); } catch { /* Preference storage is optional. */ } } };
  return <Context.Provider value={{ lang, setLang, t: (en, el) => lang === 'en' ? en : el }}>{children}</Context.Provider>;
}
export function useI18n(): Language { const value = useContext(Context); if (!value) throw new Error('LanguageProvider required'); return value; }
