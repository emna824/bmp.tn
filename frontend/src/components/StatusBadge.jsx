import { useTranslation } from 'react-i18next'

function labelizeStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const STATUS_STYLES = {
  recruiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  finished: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  closed: 'bg-gray-200 text-gray-700 dark:bg-slate-700/70 dark:text-slate-200',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200',
  done: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  not_done: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
}

function StatusBadge({ status, className = '' }) {
  const { t } = useTranslation()
  const tone = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200'
  const label = t(`status.${status}`, { defaultValue: labelizeStatus(status) })

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone} ${className}`}>
      {label}
    </span>
  )
}

export function getStatusProgress(status) {
  if (status === 'finished' || status === 'done' || status === 'closed') return 100
  if (status === 'in_progress') return 65
  if (status === 'recruiting' || status === 'pending') return 25
  return 0
}

export function formatDisplayDate(value) {
  if (!value) return 'Not scheduled'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled'

  return parsed.toLocaleDateString()
}

export default StatusBadge
