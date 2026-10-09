import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from '../data/translations';

const LANGUAGE_STORAGE_KEY = 'medassist_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  languages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && ['en', 'ta', 'hi'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Could not read stored language:', e);
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    if (['en', 'ta', 'hi'].includes(newLang)) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      } catch (e) {
        console.warn('Could not persist language to localStorage:', e);
      }
    }
  }, []);

  const t = useCallback(
    (key, fallback = '') => {
      const activeDict = TRANSLATIONS[language] || TRANSLATIONS['en'];
      if (activeDict && activeDict[key] !== undefined) {
        return activeDict[key];
      }
      const englishDict = TRANSLATIONS['en'];
      if (englishDict && englishDict[key] !== undefined) {
        return englishDict[key];
      }
      return fallback || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
