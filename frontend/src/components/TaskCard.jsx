import StatusBadge from './StatusBadge'
import TaskCategoryBadge from './TaskCategoryBadge'
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
    <article className="artisan-task-card">
      <div className="artisan-task-card-layout">
        <input
          type="checkbox"
          className="artisan-task-checkbox"
          checked={task?.status === 'done'}
          disabled={disabled}
          onChange={(event) => onToggle?.(event.target.checked ? 'done' : 'not_done')}
        />
        <div className="artisan-task-card-main">
          <div className="artisan-task-card-top">
            <div className="artisan-task-title-block">
              <h4>{task?.title || t('task.dailyTask')}</h4>
              {task?.dateLabel ? <p>{task.dateLabel}</p> : null}
              <div className="artisan-task-category">
                <TaskCategoryBadge title={task?.title} description={task?.description} categoryHint={task?.categoryHint} />
              </div>
            </div>
            <StatusBadge status={task?.status} />
          </div>
          <textarea
            value={task?.description || ''}
            disabled={disabled}
            onChange={(event) => onDescriptionChange?.(event.target.value)}
            placeholder={t('task.addUpdate')}
            rows={2}
            className="artisan-task-editor"
          />
          <div className="artisan-task-actions">
            <button
              type="button"
              disabled={disabled}
              onClick={onSave}
              className="artisan-task-save-btn"
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
