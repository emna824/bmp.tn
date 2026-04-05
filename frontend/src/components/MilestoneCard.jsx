import StatusBadge from './StatusBadge'
import { CalendarIcon, CheckCircleIcon, LayersIcon, TargetIcon } from './ExecutionIcons'
import { formatExecutionDate } from '../utils/execution'

function MilestoneCard({ milestone }) {
  return (
    <article className="rounded-2xl border border-white/35 bg-white/55 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/45 dark:shadow-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
            <LayersIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{milestone.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">{milestone.artisan?.name || 'Assigned artisan'}</p>
          </div>
        </div>
        <StatusBadge status={milestone.status} />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{milestone.description || 'No description provided.'}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <TargetIcon className="h-4 w-4" />
            Progress
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{milestone.progressPercent}%</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <CheckCircleIcon className="h-4 w-4" />
            Done days
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{milestone.doneDays}</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <LayersIcon className="h-4 w-4" />
            Total days
          </div>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{milestone.totalDays}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
          <span>Completion track</span>
          <span>{milestone.progressPercent}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/45 dark:bg-slate-700/70">
          <div
            className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, milestone.progressPercent))}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <CalendarIcon className="h-4 w-4" />
            Start
          </div>
          <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(milestone.startDate)}</p>
        </div>
        <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <CalendarIcon className="h-4 w-4" />
            End
          </div>
          <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(milestone.endDate)}</p>
        </div>
      </div>
    </article>
  )
}

export default MilestoneCard
