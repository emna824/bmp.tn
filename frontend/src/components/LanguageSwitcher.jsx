import { useTranslation } from 'react-i18next'
import { TranslateIcon } from './Icons'

function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation()

  return (
    <label className={`header-lang-switcher ${className}`.trim()}>
      <span className="sr-only">{t('language.label')}</span>
      <TranslateIcon className="icon" />
      <select
        value={i18n.resolvedLanguage || i18n.language || 'en'}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        aria-label={t('language.switcher')}
        className="header-lang-select"
      >
        <option value="en">EN</option>
        <option value="fr">FR</option>
        <option value="ar">AR</option>
      </select>
    </label>
  )
}

export default LanguageSwitcher
