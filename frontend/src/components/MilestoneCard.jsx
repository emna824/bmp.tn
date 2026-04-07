import StatusBadge, { formatDisplayDate, getStatusProgress } from './StatusBadge'
import { useTranslation } from 'react-i18next'

function MilestoneCard({ milestone }) {
  const { t } = useTranslation()
  const progress = getStatusProgress(milestone?.status)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{milestone?.title || t('project.milestoneTitle')}</h4>
          <p className="mt-1 text-sm text-slate-500">{milestone?.description || t('project.noDescription')}</p>
        </div>
        <StatusBadge status={milestone?.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">{formatDisplayDate(milestone?.startDate)}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{formatDisplayDate(milestone?.endDate)}</span>
        {milestone?.artisanId?.name ? (
          <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">{milestone.artisanId.name}</span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{t('project.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  )
}

export default MilestoneCard
