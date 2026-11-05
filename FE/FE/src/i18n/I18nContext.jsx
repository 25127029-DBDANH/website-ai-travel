import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

const STORAGE_KEY = 'hcmc_lang';
const I18nContext = createContext(null);

function getInitialLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi')) {
      return 'vi';
    }
  } catch {
    // localStorage can be unavailable in private contexts.
  }
  return 'vi';
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key])
  );
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage failures.
    }
  }, [lang]);

  const t = useCallback(
    (key, values = {}) => {
      const template = translations[lang]?.[key] ?? translations.en[key] ?? key;
      return interpolate(template, values);
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      toggleLanguage: () => setLang((current) => (current === 'en' ? 'vi' : 'en'))
    }),
    [lang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
