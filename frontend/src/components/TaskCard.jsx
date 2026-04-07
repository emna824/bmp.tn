import StatusBadge from './StatusBadge'
import { useTranslation } from 'react-i18next'

function TaskCard({
  task,
  disabled = false,
  onToggle,
  onDescriptionChange,
  onSave,
}) {
  const { t } = useTranslation()

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:bg-gray-100">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
          checked={task?.status === 'done'}
          disabled={disabled}
          onChange={(event) => onToggle?.(event.target.checked ? 'done' : 'not_done')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{task?.title || t('task.dailyTask')}</h4>
              {task?.dateLabel ? <p className="text-xs text-slate-500">{task.dateLabel}</p> : null}
            </div>
            <StatusBadge status={task?.status} />
          </div>
          <textarea
            value={task?.description || ''}
            disabled={disabled}
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            placeholder={t('task.addUpdate')}
            rows={2}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={disabled}
              onClick={onSave}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('task.saveTask')}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default TaskCard
