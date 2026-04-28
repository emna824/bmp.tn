import { useTranslation } from 'react-i18next'
import { MoonIcon, SunIcon } from './Icons'
import { useTheme } from '../theme/ThemeProvider'

function ThemeToggle({ className = '' }) {
  const { t } = useTranslation()
  const { isDark, toggleTheme } = useTheme()
  const label = isDark
    ? t('theme.light', { defaultValue: 'Light' })
    : t('theme.dark', { defaultValue: 'Dark' })
  const actionLabel = isDark
    ? t('theme.switchToLight', { defaultValue: 'Switch to light mode' })
    : t('theme.switchToDark', { defaultValue: 'Switch to dark mode' })

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`header-icon-btn theme-toggle-btn ${className}`.trim()}
      aria-label={actionLabel}
      title={actionLabel}
    >
      {isDark ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}
      <span className="sr-only">{label}</span>
    </button>
  )
}

export default ThemeToggle
