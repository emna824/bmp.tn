import { useTranslation } from 'react-i18next'

function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation()

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 ${className}`}>
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={i18n.resolvedLanguage || i18n.language || 'en'}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        aria-label={t('language.switcher')}
        className="rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/40 outline-none backdrop-blur-md transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:shadow-slate-950/20 dark:focus:border-orange-400 dark:focus:ring-orange-500/20"
      >
        <option value="en">🇬🇧 {t('language.english')}</option>
        <option value="fr">🇫🇷 {t('language.french')}</option>
        <option value="ar">🇸🇦 {t('language.arabic')}</option>
      </select>
    </label>
  )
}

export default LanguageSwitcher
