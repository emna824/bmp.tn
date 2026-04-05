import StatusBadge from './StatusBadge'
import { ArrowRightIcon, CalendarIcon, FolderIcon, UsersIcon } from './ExecutionIcons'
import { formatExecutionDate } from '../utils/execution'

function ProjectCard({ project, onClick, isActive = false, actionLabel = 'Open' }) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[26px] border bg-white/55 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-md transition dark:bg-slate-800/45 dark:shadow-slate-950/35 ${isActive ? 'border-blue-300/70 ring-2 ring-blue-100/70 dark:border-blue-500/50 dark:ring-blue-500/20' : 'border-white/35 dark:border-white/10'} ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-[1.03] hover:shadow-xl hover:shadow-slate-300/60 dark:hover:shadow-slate-950/45' : ''}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      } : undefined}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-white/80 via-white/20 to-blue-100/60 opacity-0 transition group-hover:opacity-100 dark:from-slate-700/40 dark:via-slate-800/10 dark:to-slate-700/50" />

      <div className="relative z-10 flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
              <FolderIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Project</p>
              <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{project.projectName}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">{project.job || 'General assignment'}</p>
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/30 bg-white/45 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/35">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CalendarIcon className="h-4 w-4" />
              Start
            </div>
            <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(project.startDate)}</p>
          </div>
          <div className="rounded-2xl border border-white/30 bg-white/45 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/35">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <CalendarIcon className="h-4 w-4" />
              End
            </div>
            <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(project.endDate || project.startDate)}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/35 px-3.5 py-3 text-sm text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            <span>{project.assignedArtisans?.length ? `${project.assignedArtisans.length} artisan(s) assigned` : 'No artisans assigned yet'}</span>
          </div>
          {onClick ? (
            <div className="flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              <span>{actionLabel}</span>
              <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default ProjectCard
