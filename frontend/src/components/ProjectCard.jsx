import StatusBadge, { formatDisplayDate, getStatusProgress } from './StatusBadge'
import { useTranslation } from 'react-i18next'

function ProjectCard({ project, isSelected = false, onSelect, onOpenDetails }) {
  const { t } = useTranslation()
  const progress = getStatusProgress(project?.status)

  return (
    <article
      className={`rounded-xl border p-4 shadow-md transition-all duration-300 ${
        isSelected ? 'border-orange-300 bg-orange-50/60' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{project?.projectName || t('project.untitled')}</h3>
          <p className="mt-1 text-sm text-slate-500">{project?.job || t('project.generalAssignment')}</p>
        </div>
        <StatusBadge status={project?.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.startDate')}</p>
          <p className="mt-1 font-medium text-slate-800">{formatDisplayDate(project?.startDate)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.endDate')}</p>
          <p className="mt-1 font-medium text-slate-800">{formatDisplayDate(project?.endDate || project?.startDate)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{t('project.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
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
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50"
        >
          {isSelected ? t('project.selected') : t('project.select')}
        </button>
        <button
          type="button"
          onClick={onOpenDetails}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800"
        >
          {t('project.openDetails')}
        </button>
      </div>
    </article>
  )
}

export default ProjectCard
