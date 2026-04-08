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
  onOpenDetails,
  onOpenCalendar,
  onTaskChange,
  onSaveTask,
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-6 transition-colors duration-300">
      <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">{t('artisan.execution')}</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{t('artisan.myProjects')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300">{t('artisan.myProjectsDescription')}</p>
          </div>
          <button
            type="button"
            onClick={onOpenCalendar}
            title={!isPremium ? t('premium.featureTooltip') : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200/60 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 dark:shadow-orange-950/25"
          >
            {!isPremium ? <LockIcon className="h-4 w-4" /> : null}
            {t('artisan.openCalendar')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('artisan.assignedProjects')}</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t('artisan.totalCount', { count: projects.length })}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('artisan.loadingProjects')}</p>
          ) : projects.length ? (
            <div className="grid gap-4 md:grid-cols-2">
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
            <p className="text-sm text-slate-500 dark:text-slate-300">{t('artisan.noAssignedProjects')}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-slate-950/20">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('artisan.dailyTasks')}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t('artisan.dailyTasksDescription')}</p>
          </div>

          <div className="space-y-3">
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
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
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
