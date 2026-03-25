import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import es from '../locales/es.json'

// Language priority: explicit localStorage key → language in stored user object → browser language → 'es'
const storedLang = localStorage.getItem('i18n-lang')
const storedUser = localStorage.getItem('user')
const userLang = storedUser
  ? (JSON.parse(storedUser) as { language?: string }).language ?? null
  : null
const browserLang = navigator.language.slice(0, 2)
const supportedLangs = ['es', 'en']
const lang =
  storedLang ??
  userLang ??
  (supportedLangs.includes(browserLang) ? browserLang : 'es')

void i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: lang,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18next
