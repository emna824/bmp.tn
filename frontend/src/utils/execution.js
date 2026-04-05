export function formatExecutionDate(value) {
  if (!value) return 'Not scheduled'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled'

  return parsed.toLocaleDateString()
}

export function formatStatusLabel(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeArtisan(artisan = {}) {
  if (!artisan || typeof artisan !== 'object') {
    return null
  }

  return {
    id: artisan._id || artisan.id || '',
    name: artisan.name || 'Artisan',
    job: artisan.job || '',
    email: artisan.email || '',
    profileImage: artisan.profileImage || '',
  }
}

export function normalizeExecutionProject(project = {}) {
  return {
    id: project._id || project.id || '',
    projectName: project.projectName || project.title || 'Untitled project',
    startDate: project.startDate || '',
    endDate: project.endDate || '',
    status: project.status || 'recruiting',
    job: project.job || project.teamRequirements?.[0]?.job || '',
    description: project.description || '',
    assignedArtisans: Array.isArray(project.assignedArtisans)
      ? project.assignedArtisans.map((artisan) => normalizeArtisan(artisan)).filter(Boolean)
      : [],
    teamRequirements: Array.isArray(project.teamRequirements) ? project.teamRequirements : [],
  }
}

export function normalizeExecutionMilestone(milestone = {}) {
  const project =
    milestone.projectId && typeof milestone.projectId === 'object'
      ? milestone.projectId
      : null

  return {
    id: milestone._id || milestone.id || '',
    projectId: project?._id || project?.id || milestone.projectId || '',
    projectName: project?.projectName || milestone.projectName || 'Project',
    artisan: normalizeArtisan(milestone.artisanId),
    title: milestone.title || 'Untitled milestone',
    description: milestone.description || '',
    startDate: milestone.startDate || '',
    endDate: milestone.endDate || '',
    status: milestone.status || 'pending',
    progressPercent: Number(milestone.progressPercent ?? 0),
    totalDays: Number(milestone.totalDays ?? 0),
    doneDays: Number(milestone.doneDays ?? 0),
    workLogs: Array.isArray(milestone.workLogs) ? milestone.workLogs : [],
  }
}

export function normalizeExecutionTask(task = {}) {
  return {
    milestoneId: task.milestoneId || '',
    projectId: task.projectId || '',
    projectName: task.projectName || 'Project',
    title: task.title || 'Task',
    description: task.description || '',
    date: task.date || '',
    status: task.status || 'not_done',
  }
}

export function normalizeExecutionLog(log = {}) {
  const milestone =
    log.milestoneId && typeof log.milestoneId === 'object'
      ? log.milestoneId
      : null

  const project =
    milestone?.projectId && typeof milestone.projectId === 'object'
      ? milestone.projectId
      : null

  return {
    id: log._id || log.id || '',
    milestoneId: milestone?._id || milestone?.id || log.milestoneId || '',
    milestoneTitle: milestone?.title || 'Milestone',
    projectId: project?._id || project?.id || '',
    projectName: project?.projectName || 'Project',
    description: log.description || milestone?.description || '',
    date: log.date || '',
    status: log.status || 'not_done',
  }
}

function parseExecutionDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function buildCalendarEvents({ projects = [], milestones = [], logs = [] }) {
  const projectEvents = projects
    .map((project) => {
      const start = parseExecutionDate(project.startDate)
      const end = parseExecutionDate(project.endDate || project.startDate)

      if (!start || !end) return null

      return {
        id: `project-${project.id}`,
        title: project.projectName,
        start,
        end,
        allDay: true,
        resource: {
          kind: 'project',
          status: project.status,
        },
      }
    })
    .filter(Boolean)

  const milestoneEvents = milestones
    .map((milestone) => {
      const start = parseExecutionDate(milestone.startDate)
      const end = parseExecutionDate(milestone.endDate || milestone.startDate)

      if (!start || !end) return null

      return {
        id: `milestone-${milestone.id}`,
        title: milestone.title,
        start,
        end,
        allDay: true,
        resource: {
          kind: 'milestone',
          status: milestone.status,
        },
      }
    })
    .filter(Boolean)

  const workLogEvents = logs
    .filter((log) => log.status === 'done')
    .map((log) => {
      const start = parseExecutionDate(log.date)
      if (!start) return null

      return {
        id: `worklog-${log.id}`,
        title: `Done: ${log.milestoneTitle}`,
        start,
        end: start,
        allDay: true,
        resource: {
          kind: 'worklog',
          status: log.status,
        },
      }
    })
    .filter(Boolean)

  return [...projectEvents, ...milestoneEvents, ...workLogEvents]
}
