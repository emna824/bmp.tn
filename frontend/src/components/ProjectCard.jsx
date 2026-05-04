import StatusBadge, { formatDisplayDate, getStatusProgress } from './StatusBadge'
import { useTranslation } from 'react-i18next'

function ProjectCard({ project, isSelected = false, onSelect, onOpenDetails }) {
  const { t } = useTranslation()
  const progress = getStatusProgress(project?.status)

  return (
    <article
      className={`artisan-workspace-project-card ${isSelected ? 'selected' : ''}`}
    >
      <div className="artisan-project-card-top">
        <div className="artisan-project-card-copy">
          <h3>{project?.projectName || t('project.untitled')}</h3>
          <p>{project?.job || t('project.generalAssignment')}</p>
        </div>
        <StatusBadge status={project?.status} />
      </div>

      <div className="artisan-project-card-meta-grid">
        <div className="artisan-project-card-meta">
          <span>{t('common.startDate')}</span>
          <strong>{formatDisplayDate(project?.startDate)}</strong>
        </div>
        <div className="artisan-project-card-meta">
          <span>{t('common.endDate')}</span>
          <strong>{formatDisplayDate(project?.endDate || project?.startDate)}</strong>
        </div>
      </div>

      <div className="artisan-project-progress">
        <div className="artisan-project-progress-head">
          <span>{t('project.progress')}</span>
          <span>{progress}%</span>
        </div>
        <div className="artisan-project-progress-track">
          <div
            className="artisan-project-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="artisan-project-card-actions">
        <button
          type="button"
          onClick={onSelect}
          className="artisan-project-card-btn artisan-project-card-btn-secondary"
        >
          {isSelected ? t('project.selected') : t('project.select')}
        </button>
        <button
          type="button"
          onClick={onOpenDetails}
          className="artisan-project-card-btn artisan-project-card-btn-primary"
        >
          {t('project.openDetails')}
        </button>
      </div>
    </article>
  )
}

export default ProjectCard
