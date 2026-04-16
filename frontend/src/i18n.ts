import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enLocale from './locales/en.json'
import esLocale from './locales/es.json'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enLocale },
    es: { translation: esLocale },
  },
  lng: localStorage.getItem('language') || 'es',
  fallbackLng: 'es',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
