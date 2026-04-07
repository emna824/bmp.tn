import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MilestoneCard from '../components/MilestoneCard'
import StatusBadge, { formatDisplayDate } from '../components/StatusBadge'
import TaskCard from '../components/TaskCard'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function defaultTaskForMilestone(milestone) {
  return {
    id: milestone?._id || milestone?.id,
    title: milestone?.title || 'Daily task',
    description: '',
    status: 'not_done',
    date: todayKey(),
    dateLabel: 'Today',
  }
}

function ProjectDetails({
  role,
  project,
  milestones,
  workLogs,
  loading,
  savingTaskId,
  creatingMilestone,
  projectActionLoading,
  onBack,
  onTaskChange,
  onSaveTask,
  onCreateMilestone,
  onStartProject,
  onCloseProject,
  onFinishProject,
}) {
  const { t } = useTranslation()
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    artisanId: '',
    startDate: '',
    endDate: '',
  })

  const workLogByMilestone = useMemo(() => {
    const entries = {}

    workLogs.forEach((workLog) => {
      const dateValue = String(workLog?.date || '').slice(0, 10)
      if (dateValue === todayKey()) {
        entries[workLog?.milestoneId?._id || workLog?.milestoneId?.id || workLog?.milestoneId] = workLog
      }
    })

    return entries
  }, [workLogs])

  const assignedArtisans = useMemo(() => {
    const map = new Map()

    ;(project?.assignedArtisans || []).forEach((artisan) => {
      const artisanId = artisan?._id || artisan?.id || artisan
      if (artisanId && artisan?.name && !map.has(artisanId)) {
        map.set(artisanId, artisan)
      }
    })

    milestones.forEach((milestone) => {
      const artisan = milestone?.artisanId
      const artisanId = artisan?._id || artisan?.id
      if (artisanId && artisan?.name && !map.has(artisanId)) {
        map.set(artisanId, artisan)
      }
    })
    return Array.from(map.values())
  }, [milestones])

  const handleCreateMilestone = async (event) => {
    event.preventDefault()
    await onCreateMilestone?.(milestoneForm)
    setMilestoneForm({
      title: '',
      description: '',
      artisanId: '',
      startDate: '',
      endDate: '',
    })
  }

  if (!project) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-md">
        <p className="text-sm text-slate-500">{t('project.detailsEmpty')}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50"
            >
              {t('common.back')}
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-slate-900">{project.projectName || project.title}</h2>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-3 max-w-3xl text-sm text-slate-500">
              {project.description || t('project.noDescription')}
            </p>
          </div>

          {role === 'expert' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={projectActionLoading || project.status !== 'recruiting'}
                onClick={onStartProject}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('project.startProject')}
              </button>
              <button
                type="button"
                disabled={projectActionLoading || project.status === 'closed'}
                onClick={onCloseProject}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('project.closeProject')}
              </button>
              <button
                type="button"
                disabled={projectActionLoading || project.status === 'finished'}
                onClick={onFinishProject}
                className="rounded-xl border border-green-200 px-4 py-2 text-sm font-semibold text-green-700 transition-all duration-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('project.markFinished')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.startDate')}</p>
            <p className="mt-1 font-medium text-slate-900">{formatDisplayDate(project.startDate)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.endDate')}</p>
            <p className="mt-1 font-medium text-slate-900">{formatDisplayDate(project.endDate || project.startDate)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.trade')}</p>
            <p className="mt-1 font-medium text-slate-900">{project.job || t('project.general')}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('common.milestones')}</p>
            <p className="mt-1 font-medium text-slate-900">{milestones.length}</p>
          </div>
        </div>
      </div>

      {role === 'expert' ? (
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">{t('project.createMilestone')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('project.createMilestoneDescription')}</p>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateMilestone}>
            <input
              type="text"
              value={milestoneForm.title}
              onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={t('project.milestoneTitle')}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <select
              value={milestoneForm.artisanId}
              onChange={(event) => setMilestoneForm((current) => ({ ...current, artisanId: event.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">{t('project.selectArtisan')}</option>
              {assignedArtisans.map((artisan) => (
                <option key={artisan._id || artisan.id} value={artisan._id || artisan.id}>
                  {artisan.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={milestoneForm.startDate}
              onChange={(event) => setMilestoneForm((current) => ({ ...current, startDate: event.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <input
              type="date"
              value={milestoneForm.endDate}
              onChange={(event) => setMilestoneForm((current) => ({ ...current, endDate: event.target.value }))}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <textarea
              rows={3}
              value={milestoneForm.description}
              onChange={(event) => setMilestoneForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={t('project.shortDescription')}
              className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={creatingMilestone}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingMilestone ? t('common.saving') : t('project.createMilestone')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-6 shadow-md">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('common.milestones')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'expert' ? t('project.reviewTasks') : t('project.trackTasks')}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">{t('project.loadingMilestones')}</p>
        ) : milestones.length ? (
          <div className="space-y-4">
            {milestones.map((milestone) => {
              const workLog = workLogByMilestone[milestone._id] || defaultTaskForMilestone(milestone)

              return (
                <div key={milestone._id} className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                  <MilestoneCard milestone={milestone} />
                  {role === 'artisan' ? (
                    <TaskCard
                      task={{
                        id: milestone._id,
                        title: milestone.title,
                        description: workLog.description || '',
                        status: workLog.status || 'not_done',
                        dateLabel: t('common.today'),
                      }}
                      disabled={savingTaskId === milestone._id}
                      onToggle={(status) => onTaskChange?.(milestone._id, { status })}
                      onDescriptionChange={(description) => onTaskChange?.(milestone._id, { description })}
                      onSave={() => onSaveTask?.(milestone._id)}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('project.noMilestones')}</p>
        )}
      </div>
    </section>
  )
}

export default ProjectDetails
