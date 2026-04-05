import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { withUserHeaders } from '../api'
import {
  CalendarIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  ClockIcon,
  FolderIcon,
  LayersIcon,
  PlusIcon,
  SparkIcon,
  TargetIcon,
  UsersIcon,
} from '../components/ExecutionIcons'
import MilestoneCard from '../components/MilestoneCard'
import ProjectCard from '../components/ProjectCard'
import StatusBadge from '../components/StatusBadge'
import {
  formatExecutionDate,
  formatStatusLabel,
  normalizeExecutionMilestone,
  normalizeExecutionProject,
} from '../utils/execution'

const INITIAL_FORM = {
  artisanId: '',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
}

function formatRoleLabel(value) {
  return String(value || 'role')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeApplication(application = {}) {
  return {
    id: application._id || application.id || '',
    job: application.job || '',
    status: application.status || 'pending',
    proposedDailySalary: Number(application.proposedDailySalary ?? 0),
    createdAt: application.createdAt || '',
    artisan: {
      id: application.artisanId?._id || application.artisanId?.id || '',
      name: application.artisanId?.name || 'Artisan',
      email: application.artisanId?.email || '',
      job: application.artisanId?.job || '',
      profileImage: application.artisanId?.profileImage || '',
    },
  }
}

function ProjectDetails({
  userId,
  projects = [],
  loadingProjects = false,
  onRefreshProjects,
  showNotification,
  selectedProjectId,
  onProjectSelect,
}) {
  const [milestones, setMilestones] = useState([])
  const [applications, setApplications] = useState([])
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [creatingMilestone, setCreatingMilestone] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [reviewingApplicationId, setReviewingApplicationId] = useState('')
  const [form, setForm] = useState(INITIAL_FORM)

  const normalizedProjects = useMemo(
    () => projects.map((project) => normalizeExecutionProject(project)),
    [projects],
  )

  useEffect(() => {
    if (!normalizedProjects.length) return

    if (!selectedProjectId || !normalizedProjects.some((project) => project.id === selectedProjectId)) {
      onProjectSelect?.(normalizedProjects[0]?.id || '')
    }
  }, [normalizedProjects, onProjectSelect, selectedProjectId])

  const selectedProject = useMemo(
    () => normalizedProjects.find((project) => project.id === selectedProjectId) || null,
    [normalizedProjects, selectedProjectId],
  )

  useEffect(() => {
    if (!selectedProject?.assignedArtisans?.length) {
      setForm((current) => ({ ...current, artisanId: '' }))
      return
    }

    setForm((current) => ({
      ...current,
      artisanId:
        current.artisanId && selectedProject.assignedArtisans.some((artisan) => artisan.id === current.artisanId)
          ? current.artisanId
          : selectedProject.assignedArtisans[0]?.id || '',
    }))
  }, [selectedProject])

  const loadMilestones = useCallback(async () => {
    if (!selectedProjectId || !userId) return

    setLoadingMilestones(true)
    try {
      const response = await api.get(
        `/milestones/project/${selectedProjectId}`,
        withUserHeaders(userId),
      )
      setMilestones((response.data?.milestones || []).map((milestone) => normalizeExecutionMilestone(milestone)))
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to load milestones')
    } finally {
      setLoadingMilestones(false)
    }
  }, [selectedProjectId, showNotification, userId])

  const loadApplications = useCallback(async () => {
    if (!selectedProjectId || !userId) return

    setLoadingApplications(true)
    try {
      const response = await api.get(
        `/projects/${selectedProjectId}/applications`,
        withUserHeaders(userId, {
          params: { expertId: userId },
        }),
      )
      setApplications((response.data?.applications || []).map((application) => normalizeApplication(application)))
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to load applications')
    } finally {
      setLoadingApplications(false)
    }
  }, [selectedProjectId, showNotification, userId])

  useEffect(() => {
    loadMilestones()
  }, [loadMilestones])

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  const milestoneStats = useMemo(() => {
    const completed = milestones.filter((milestone) => milestone.status === 'done').length
    return {
      total: milestones.length,
      completed,
      assigned: selectedProject?.assignedArtisans?.length || 0,
    }
  }, [milestones, selectedProject])

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === 'pending'),
    [applications],
  )

  const teamProgress = useMemo(() => {
    const requirements = Array.isArray(selectedProject?.teamRequirements) ? selectedProject.teamRequirements : []

    const items = requirements.length
      ? requirements.map((requirement) => ({
          job: requirement.job,
          required: Number(requirement.required || 0),
          assigned: Number(requirement.assigned || 0),
          pending: pendingApplications.filter((application) => application.job === requirement.job).length,
        }))
      : []

    return {
      items,
      complete: items.length ? items.every((item) => item.required > 0 && item.assigned >= item.required) : false,
    }
  }, [pendingApplications, selectedProject])

  const handleCloseProject = async () => {
    if (!selectedProjectId) return

    setUpdatingStatus(true)
    try {
      await api.put(
        `/projects/status/${selectedProjectId}`,
        { status: 'closed' },
        withUserHeaders(userId),
      )
      await Promise.all([onRefreshProjects?.(), loadApplications()])
      showNotification?.('success', 'Project closed')
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to close project')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleReviewApplication = async (applicationId, action) => {
    if (!applicationId) return

    setReviewingApplicationId(applicationId)
    try {
      const response = await api.patch(
        `/applications/${applicationId}/review`,
        {
          expertId: userId,
          action,
        },
        withUserHeaders(userId),
      )

      await Promise.all([loadApplications(), onRefreshProjects?.()])
      showNotification?.('success', response.data?.message || `Application ${action}ed`)
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || `Failed to ${action} application`)
    } finally {
      setReviewingApplicationId('')
    }
  }

  const handleCreateMilestone = async (event) => {
    event.preventDefault()
    if (!selectedProjectId) return

    setCreatingMilestone(true)
    try {
      await api.post(
        '/milestones',
        {
          projectId: selectedProjectId,
          artisanId: form.artisanId,
          title: form.title.trim(),
          description: form.description.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
        },
        withUserHeaders(userId),
      )

      await loadMilestones()
      setForm((current) => ({
        ...INITIAL_FORM,
        artisanId: current.artisanId || selectedProject?.assignedArtisans?.[0]?.id || '',
      }))
      showNotification?.('success', 'Milestone created')
    } catch (error) {
      showNotification?.('error', error.response?.data?.message || 'Failed to create milestone')
    } finally {
      setCreatingMilestone(false)
    }
  }

  if (loadingProjects) {
    return <section className="rounded-2xl border border-white/35 bg-white/50 p-6 text-sm text-slate-500 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300 dark:shadow-slate-950/35">Loading projects...</section>
  }

  if (!normalizedProjects.length) {
    return <section className="rounded-2xl border border-white/35 bg-white/50 p-6 text-sm text-slate-500 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300 dark:shadow-slate-950/35">No projects available yet.</section>
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 p-6 text-white shadow-xl shadow-slate-300/60 dark:border-slate-700 dark:shadow-slate-950/30">
        <div className="pointer-events-none absolute -right-10 top-6 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-8 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80 backdrop-blur">
              <SparkIcon className="h-4 w-4" />
              Expert execution board
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Project Details</h1>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Review artisan applications, let the project start automatically once the team is complete, and assign milestones after recruitment is locked in.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {selectedProject?.status !== 'closed' ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
                onClick={handleCloseProject}
                disabled={updatingStatus}
              >
                <TargetIcon className="h-4 w-4" />
                {updatingStatus ? 'Saving...' : 'Close Project'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-white/35 bg-white/50 p-5 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
              <FolderIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Projects</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Switch between execution boards.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {normalizedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isActive={project.id === selectedProjectId}
                onClick={() => onProjectSelect?.(project.id)}
                actionLabel="View details"
              />
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {selectedProject ? (
            <>
              <section className="rounded-[28px] border border-white/35 bg-white/50 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200/70">
                      <LayersIcon className="h-5 w-5" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{selectedProject.projectName}</h2>
                        <StatusBadge status={selectedProject.status} />
                      </div>
                      <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">{selectedProject.description || 'Project execution board.'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <CalendarIcon className="h-4 w-4" />
                        Start
                      </div>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(selectedProject.startDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <ClockIcon className="h-4 w-4" />
                        End
                      </div>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{formatExecutionDate(selectedProject.endDate)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <TargetIcon className="h-4 w-4" />
                        Milestones
                      </div>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{milestoneStats.completed}/{milestoneStats.total} done</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                        <UsersIcon className="h-4 w-4" />
                        Team
                      </div>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{milestoneStats.assigned} artisan(s)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/30 bg-white/35 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-100">Recruitment rule</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        The project starts automatically once every required role is filled. If the team is still incomplete on the start date, the project closes automatically.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={teamProgress.complete ? 'accepted' : 'pending'} />
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                        {pendingApplications.length} pending
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProject.assignedArtisans.length ? (
                  <div className="mt-6 rounded-2xl border border-white/30 bg-white/35 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
                      <UsersIcon className="h-4 w-4" />
                      Assigned artisans
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.assignedArtisans.map((artisan) => (
                        <span key={artisan.id} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                          {artisan.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-500 dark:text-slate-300">Assign artisans to this project before creating milestones.</p>
                )}
              </section>

              <section className="rounded-[28px] border border-white/35 bg-white/50 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
                      <ClipboardListIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Recruitment</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">Track team completion and accept or reject artisans from this project.</p>
                    </div>
                  </div>
                  {loadingApplications ? <span className="text-sm text-slate-400 dark:text-slate-500">Loading...</span> : null}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {teamProgress.items.length ? (
                    teamProgress.items.map((item) => (
                      <article key={item.job} className="rounded-2xl border border-white/30 bg-white/40 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Role</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">{formatRoleLabel(item.job)}</h4>
                          </div>
                          <StatusBadge status={item.assigned >= item.required ? 'accepted' : 'pending'} />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/30 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Assigned</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{item.assigned}/{item.required}</p>
                          </div>
                          <div className="rounded-xl border border-white/30 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Pending</p>
                            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{item.pending}</p>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 lg:col-span-3">
                      No team requirements configured for this project.
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  {applications.length ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {applications.map((application) => {
                        const isPending = application.status === 'pending'
                        const canReview = isPending && selectedProject.status === 'recruiting'
                        const initials = application.artisan.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join('') || 'A'

                        return (
                          <article key={application.id} className="rounded-2xl border border-white/30 bg-white/45 p-5 shadow-lg shadow-slate-100/35 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:shadow-slate-950/20">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex min-w-0 items-start gap-3">
                                {application.artisan.profileImage ? (
                                  <img
                                    src={application.artisan.profileImage}
                                    alt={application.artisan.name}
                                    className="h-11 w-11 rounded-2xl object-cover"
                                  />
                                ) : (
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                                    {initials}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{application.artisan.name}</h4>
                                  <p className="truncate text-sm text-slate-500 dark:text-slate-300">{application.artisan.email || application.artisan.job || 'Artisan applicant'}</p>
                                </div>
                              </div>
                              <StatusBadge status={application.status} />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Role</p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{formatRoleLabel(application.job)}</p>
                              </div>
                              <div className="rounded-xl border border-white/30 bg-white/40 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/25">
                                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Daily salary</p>
                                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{application.proposedDailySalary} TND/day</p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm text-slate-500 dark:text-slate-300">
                                Applied {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'recently'}
                              </p>

                              {canReview ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                                    disabled={reviewingApplicationId === application.id}
                                    onClick={() => handleReviewApplication(application.id, 'accept')}
                                  >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    {reviewingApplicationId === application.id ? 'Saving...' : 'Accept'}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                    disabled={reviewingApplicationId === application.id}
                                    onClick={() => handleReviewApplication(application.id, 'reject')}
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                                  {isPending ? 'Recruitment is closed for this project.' : `Application ${formatStatusLabel(application.status).toLowerCase()}.`}
                                </p>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      No applications yet for this project.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-white/35 bg-white/50 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
                    <PlusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Create Milestone</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Assign a task window to one artisan at a time.</p>
                  </div>
                </div>

                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateMilestone}>
                  <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                    Artisan
                    <select
                      value={form.artisanId}
                      onChange={(event) => setForm((current) => ({ ...current, artisanId: event.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      disabled={
                        !selectedProject.assignedArtisans.length ||
                        ['closed', 'finished'].includes(selectedProject.status)
                      }
                    >
                      {selectedProject.assignedArtisans.length ? (
                        selectedProject.assignedArtisans.map((artisan) => (
                          <option key={artisan.id} value={artisan.id}>
                            {artisan.name}
                          </option>
                        ))
                      ) : (
                        <option value="">No assigned artisans</option>
                      )}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                    Title
                    <input
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Install wiring"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
                    Description
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Short task brief"
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                    Start date
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm text-slate-600 dark:text-slate-300">
                    End date
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      required
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      disabled={
                        creatingMilestone ||
                        !selectedProject.assignedArtisans.length ||
                        ['closed', 'finished'].includes(selectedProject.status)
                      }
                    >
                      <PlusIcon className="h-4 w-4" />
                      {creatingMilestone ? 'Saving...' : 'Create Milestone'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-[28px] border border-white/35 bg-white/50 p-6 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200/70">
                      <LayersIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Milestones</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">Execution tasks assigned to the selected project team.</p>
                    </div>
                  </div>
                  {loadingMilestones ? <span className="text-sm text-slate-400 dark:text-slate-500">Loading...</span> : null}
                </div>

                <div className="mt-5">
                  {milestones.length ? (
                    <div className="grid gap-4">
                      {milestones.map((milestone) => (
                        <MilestoneCard key={milestone.id} milestone={milestone} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                      No milestones yet for this project.
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default ProjectDetails
