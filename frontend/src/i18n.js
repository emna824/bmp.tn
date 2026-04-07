import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'

const LANGUAGE_STORAGE_KEY = 'appLanguage'
const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar']

function resolveInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (SUPPORTED_LANGUAGES.includes(storedLanguage || '')) {
    return storedLanguage
  }

  return 'en'
}

function getDirection(language) {
  return language === 'ar' ? 'rtl' : 'ltr'
}

function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.lang = language
  document.documentElement.dir = getDirection(language)
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: resolveInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
})

applyDocumentLanguage(i18n.resolvedLanguage || i18n.language || 'en')

i18n.on('languageChanged', (language) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }

  applyDocumentLanguage(language)
})

export { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES }
export default i18n
