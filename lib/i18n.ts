import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';

i18n
  .use(LanguageDetector) // Detecta el idioma del teléfono/navegador
  .use(initReactI18next) // Pasa la instancia a react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations }
    },
    fallbackLng: 'en', // Idioma por defecto si no es inglés ni español
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React ya se encarga de prevenir XSS
    }
  });

export default i18n;