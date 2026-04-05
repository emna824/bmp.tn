import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/ThemeProvider'

function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/85 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/70 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:shadow-slate-950/30 dark:hover:border-slate-600 dark:hover:bg-slate-800 ${className}`.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition dark:bg-slate-700 dark:text-amber-300">
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
      <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}

export default ThemeToggle
