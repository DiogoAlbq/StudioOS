import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from '../locales/pt.json';
import en from '../locales/en.json';

const savedLang = localStorage.getItem('studioos-lang') || 'pt';

i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
});

export const setLanguage = (lang: 'pt' | 'en') => {
  i18n.changeLanguage(lang);
  localStorage.setItem('studioos-lang', lang);
};

export default i18n;
