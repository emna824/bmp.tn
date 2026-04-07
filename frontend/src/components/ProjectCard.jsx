import StatusBadge, { formatDisplayDate, getStatusProgress } from './StatusBadge'
import { useTranslation } from 'react-i18next'

function ProjectCard({ project, isSelected = false, onSelect, onOpenDetails }) {
  const { t } = useTranslation()
  const progress = getStatusProgress(project?.status)

  return (
    <article
      className={`rounded-xl border p-4 shadow-md transition-all duration-300 ${
        isSelected
          ? 'border-orange-300 bg-orange-50/70 shadow-orange-100/60 dark:border-orange-500/60 dark:bg-orange-500/10 dark:shadow-orange-950/10'
          : 'border-slate-200 bg-white/90 shadow-slate-200/50 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/75 dark:shadow-slate-950/20 dark:hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{project?.projectName || t('project.untitled')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{project?.job || t('project.generalAssignment')}</p>
        </div>
        <StatusBadge status={project?.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2 transition-colors duration-300 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.startDate')}</p>
          <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatDisplayDate(project?.startDate)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 transition-colors duration-300 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('common.endDate')}</p>
          <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatDisplayDate(project?.endDate || project?.startDate)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{t('project.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900/80">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
        >
          {isSelected ? t('project.selected') : t('project.select')}
        </button>
        <button
          type="button"
          onClick={onOpenDetails}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('project.openDetails')}
        </button>
      </div>
    </article>
  )
}

export default ProjectCard
