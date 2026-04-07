import { useTranslation } from 'react-i18next'
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
      className={`inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/70 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xl shadow-slate-200/35 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 dark:shadow-slate-950/35 ${className}`.trim()}
      aria-label={actionLabel}
      title={actionLabel}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/40 bg-white/65 text-base shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/70">
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export default ThemeToggle
