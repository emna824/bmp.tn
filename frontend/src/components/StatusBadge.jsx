import { formatStatusLabel } from '../utils/execution'

const STATUS_STYLES = {
  recruiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  finished: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
  closed: 'bg-gray-200 text-gray-700 dark:bg-slate-700/70 dark:text-slate-200',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
  done: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200',
  not_done: 'bg-gray-200 text-gray-700 dark:bg-slate-700/70 dark:text-slate-200',
}

function StatusBadge({ status, className = '' }) {
  const normalizedStatus = String(status || '').trim().toLowerCase()
  const styles = STATUS_STYLES[normalizedStatus] || 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-inset ring-black/5 dark:ring-white/10 ${styles} ${className}`.trim()}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {formatStatusLabel(normalizedStatus)}
    </span>
  )
}

export default StatusBadge
