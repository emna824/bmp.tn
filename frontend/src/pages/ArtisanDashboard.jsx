import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import api, { withUserHeaders } from '../api'
import {
  CalendarIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  FolderIcon,
  RefreshIcon,
  SparkIcon,
} from '../components/ExecutionIcons'
import ProjectCard from '../components/ProjectCard'
import TaskCard from '../components/TaskCard'
import CalendarPage from './CalendarPage'
import {
  normalizeExecutionLog,
  normalizeExecutionMilestone,
  normalizeExecutionProject,
  normalizeExecutionTask,
} from '../utils/execution'

function ArtisanDashboard({ userId, projects = [], loadingProjects = false, onRefreshProjects, showNotification }) {
  const [viewMode, setViewMode] = useState('cards')
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [loadingExecution, setLoadingExecution] = useState(false)
  const [savingTaskId, setSavingTaskId] = useState('')
  const [tasks, setTasks] = useState([])
  const [logs, setLogs] = useState([])
  const [milestones, setMilestones] = useState([])

  const normalizedProjects = useMemo(
    () => projects.map((project) => normalizeExecutionProject(project)),
    [projects],
  )

  const selectedDateLabel = useMemo(() => {
    const parsed = new Date(selectedDate)
    return Number.isNaN(parsed.getTime()) ? 'Selected date' : format(parsed, 'MMM d, yyyy')
  }, [selectedDate])

  const loadExecutionData = useCallback(async () => {
    if (!userId) return

    setLoadingExecution(true)
    try {
      const response = await api.get(
        '/worklog/artisan',
        withUserHeaders(userId, {
          params: { date: selectedDate },
        }),
      )

      setTasks((response.data?.tasks || []).map((task) => normalizeExecutionTask(task)))
      setLogs((response.data?.logs || []).map((log) => normalizeExecutionLog(log)))
      setMilestones((response.data?.milestones || []).map((milestone) => normalizeExecutionMilestone(milestone)))
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to load artisan execution data')
    } finally {
      setLoadingExecution(false)
    }
  }, [selectedDate, showNotification, userId])

  useEffect(() => {
    loadExecutionData()
  }, [loadExecutionData])

  const stats = useMemo(() => {
    const activeProjects = normalizedProjects.filter((project) => project.status === 'in_progress').length
    const finishedProjects = normalizedProjects.filter((project) => project.status === 'finished').length
    const doneTasks = tasks.filter((task) => task.status === 'done').length

    return [
      {
        label: 'Projects',
        value: normalizedProjects.length,
        note: 'Assigned right now',
        icon: FolderIcon,
      },
      {
        label: 'Active',
        value: activeProjects,
        note: 'Currently in progress',
        icon: SparkIcon,
      },
      {
        label: 'Done today',
        value: doneTasks,
        note: 'Work logs completed',
        icon: CheckCircleIcon,
      },
      {
        label: 'Finished',
        value: finishedProjects,
        note: 'Projects wrapped up',
        icon: CalendarIcon,
      },
    ]
  }, [normalizedProjects, tasks])

  const handleToggleTask = async (task, checked) => {
    if (!task?.milestoneId) return

    setSavingTaskId(task.milestoneId)
    try {
      await api.post(
        '/worklog',
        {
          milestoneId: task.milestoneId,
          date: selectedDate,
          description: task.description,
          status: checked ? 'done' : 'not_done',
        },
        withUserHeaders(userId),
      )

      await Promise.all([loadExecutionData(), onRefreshProjects?.()])
      showNotification?.('success', 'Daily work updated')
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to update daily work')
    } finally {
      setSavingTaskId('')
    }
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 p-6 text-white shadow-xl shadow-slate-300/60 dark:border-slate-700 dark:shadow-slate-950/30">
        <div className="pointer-events-none absolute -right-12 top-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur">
                <SparkIcon className="h-4 w-4" />
                Execution workspace
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">My Projects</h1>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Track assigned projects, update daily work, and switch to the calendar when you want the full timeline.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-3 w-full rounded-xl border border-white/15 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">View</span>
                <div className="mt-3 inline-flex w-full rounded-xl bg-slate-950/40 p-1">
                  <button
                    type="button"
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70'}`}
                    onClick={() => setViewMode('cards')}
                  >
                    <FolderIcon className="h-4 w-4" />
                    Dashboard
                  </button>
                  <button
                    type="button"
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-white/70'}`}
                    onClick={() => setViewMode('calendar')}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon

              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/70">{stat.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-200">{stat.note}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarPage projects={normalizedProjects} milestones={milestones} logs={logs} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
          <div className="rounded-[28px] border border-white/35 bg-white/50 p-5 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
                  <FolderIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Assigned projects</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">A clean view of the work currently assigned to you.</p>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700/70"
                onClick={onRefreshProjects}
                disabled={loadingProjects}
              >
                <RefreshIcon className={`h-4 w-4 ${loadingProjects ? 'animate-spin' : ''}`.trim()} />
                {loadingProjects ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="mt-5">
              {loadingProjects ? (
                <div className="rounded-2xl border border-white/30 bg-white/35 p-6 text-sm text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
                  Loading assigned projects...
                </div>
              ) : normalizedProjects.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {normalizedProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/30 bg-white/35 p-6 text-sm text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
                  No assigned projects yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/35 bg-white/50 p-5 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200/70">
                  <ClipboardListIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Daily Tasks</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300">Tasks scheduled for the selected day.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-right backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Selected day</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedDateLabel}</p>
                {loadingExecution ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Loading tasks...</p> : null}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {tasks.length ? (
                tasks.map((task) => (
                  <TaskCard
                    key={task.milestoneId}
                    task={task}
                    saving={savingTaskId === task.milestoneId}
                    onToggle={(checked) => handleToggleTask(task, checked)}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/30 bg-white/35 p-5 text-sm text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:text-slate-300">
                  No tasks scheduled for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ArtisanDashboard
