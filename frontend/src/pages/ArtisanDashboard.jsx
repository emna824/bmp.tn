import ProjectCard from '../components/ProjectCard'
import TaskCard from '../components/TaskCard'
import { LockIcon } from '../components/Icons'
import { useTranslation } from 'react-i18next'

function ArtisanDashboard({
  projects,
  selectedProjectId,
  loading,
  tasks,
  savingTaskId,
  isPremium,
  onSelectProject,
  onCreateProject,
  onOpenDetails,
  onOpenCalendar,
  onTaskChange,
  onSaveTask,
}) {
  const { t } = useTranslation()
  const quickMetrics = [
    {
      label: t('artisan.assignedProjects'),
      value: projects.length,
    },
    {
      label: t('artisan.dailyTasks'),
      value: tasks.length,
    },
    {
      label: t('common.plan', { defaultValue: 'Plan' }),
      value: isPremium ? 'Premium' : 'Standard',
    },
  ]

  return (
    <section className="artisan-execution-dashboard" data-tour="artisan-projects">
      <div className="artisan-execution-hero" data-tour="artisan-overview">
        <div className="artisan-execution-layout">
          <div className="artisan-hero-copy">
            <p className="artisan-hero-eyebrow">{t('artisan.execution')}</p>
            <h2>{t('artisan.myProjects')}</h2>
            <p>{t('artisan.myProjectsDescription')}</p>
          </div>
          <div className="artisan-hero-actions">
            <button
              type="button"
              onClick={onCreateProject}
              title={!isPremium ? t('premium.featureTooltip') : undefined}
              className="artisan-hero-btn artisan-hero-btn-secondary"
            >
              {!isPremium ? <LockIcon className="icon tiny" /> : null}
              {t('artisan.createMyProject', { defaultValue: 'Create My Project' })}
            </button>
            <button
              type="button"
              onClick={onOpenCalendar}
              title={!isPremium ? t('premium.featureTooltip') : undefined}
              className="artisan-hero-btn artisan-hero-btn-primary"
              data-tour="artisan-calendar"
            >
              {!isPremium ? <LockIcon className="icon tiny" /> : null}
              {t('artisan.openCalendar')}
            </button>
          </div>
        </div>
        <div className="artisan-hero-metrics" aria-label={t('artisan.workspaceDashboard')}>
          {quickMetrics.map((metric) => (
            <div key={metric.label} className="artisan-hero-metric">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="artisan-workspace-grid">
        <div className="artisan-workspace-panel artisan-workspace-panel-projects">
          <div className="artisan-workspace-panel-head">
            <div>
              <h3>{t('artisan.assignedProjects')}</h3>
              <p>{t('artisan.myProjectsDescription')}</p>
            </div>
            <span className="artisan-workspace-count">
              {t('artisan.totalCount', { count: projects.length })}
            </span>
          </div>

          {loading ? (
            <p className="artisan-workspace-empty">{t('artisan.loadingProjects')}</p>
          ) : projects.length ? (
            <div className="artisan-workspace-project-grid">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedProjectId === project.id}
                  onSelect={() => onSelectProject(project.id)}
                  onOpenDetails={() => {
                    onSelectProject(project.id)
                    onOpenDetails()
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="artisan-workspace-empty">{t('artisan.noAssignedProjects')}</p>
          )}
        </div>

        <div className="artisan-workspace-panel artisan-workspace-panel-tasks">
          <div className="artisan-workspace-panel-head">
            <div>
              <h3>{t('artisan.dailyTasks')}</h3>
              <p>{t('artisan.dailyTasksDescription')}</p>
            </div>
            <span className="artisan-workspace-count">
              {t('artisan.totalCount', { count: tasks.length })}
            </span>
          </div>

          <div className="artisan-task-stack">
            {tasks.length ? (
              tasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  disabled={savingTaskId === task.id}
                  onToggle={(status) => onTaskChange(task.id, { status })}
                  onDescriptionChange={(description) => onTaskChange(task.id, { description })}
                  onSave={() => onSaveTask(task.id)}
                />
              ))
            ) : (
              <div className="artisan-workspace-empty">
                {t('artisan.selectProjectForTasks')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ArtisanDashboard
