import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from '../api'
import DashboardLayout from './DashboardLayout'
import CreateProjectForm from './CreateProjectForm'
import { LockIcon } from './Icons'
import ReportModal from './ReportModal'
import ProjectDetails from '../pages/ProjectDetails'

function normalizeProject(project) {
  return {
    ...project,
    id: project?._id || project?.id,
    projectName: project?.projectName || project?.title || project?.name || 'Untitled project',
    title: project?.projectName || project?.title || project?.name || 'Untitled project',
    budget: Number(project?.estimatedBudget ?? project?.budget ?? project?.totalBudget ?? 0),
    category: project?.category || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || project?.deadline || '',
    job: project?.job || project?.teamRequirements?.[0]?.job || '',
    dailySalary: Number(project?.dailySalary ?? 0),
    totalSpent: Number(project?.totalSpent ?? 0),
    type: project?.type || 'expert',
    ownerId: project?.ownerId || project?.expertId || '',
    location: project?.location || { address: '', latitude: null, longitude: null },
    teamRequirements: Array.isArray(project?.teamRequirements) ? project.teamRequirements : [],
    assignedArtisans: Array.isArray(project?.assignedArtisans) ? project.assignedArtisans : [],
    status: project?.status || 'recruiting',
    description: project?.description || '',
  }
}

function normalizeMilestone(milestone) {
  return {
    ...milestone,
    _id: milestone?._id || milestone?.id || '',
    status: milestone?.status || 'pending',
  }
}

function ExpertProfile({
  user,
  onLogout,
  onRequirePremium,
  onCancelSubscription,
  cancellingSubscription = false,
}) {
  const { t } = useTranslation()
  const userId = user?.id || user?._id || ''
  const isPremiumUser = true
  const [activeView, setActiveView] = useState('overview')
  const [projects, setProjects] = useState([])
  const [offersByProject, setOffersByProject] = useState({})
  const [applicationsByProject, setApplicationsByProject] = useState({})
  const [milestonesByProject, setMilestonesByProject] = useState({})
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [loadingMilestones, setLoadingMilestones] = useState(false)
  const [creatingMilestone, setCreatingMilestone] = useState(false)
  const [projectActionLoading, setProjectActionLoading] = useState(false)
  const [reviewingId, setReviewingId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notification, setNotification] = useState({ type: '', text: '' })
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const showNotification = useCallback((type, text) => {
    setNotification({ type, text })
  }, [])

  useEffect(() => {
    if (!notification.text) return undefined
    const timer = setTimeout(() => setNotification({ type: '', text: '' }), 3200)
    return () => clearTimeout(timer)
  }, [notification])

  const loadProjects = useCallback(async () => {
    if (!userId) return

    setLoadingProjects(true)
    try {
      const response = await api.get(`/projects/expert/${userId}`)
      const nextProjects = (response.data?.projects || []).map(normalizeProject)
      setProjects(nextProjects)
      setSelectedProjectId((current) => {
        if (current && nextProjects.some((project) => project.id === current)) {
          return current
        }
        return nextProjects[0]?.id || ''
      })
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [showNotification, userId])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  const loadProjectDetails = useCallback(async (projectId = selectedProjectId) => {
    if (!projectId || !userId) return

    setLoadingMilestones(true)
    try {
      const [offersResponse, applicationsResponse, milestonesResponse] = await Promise.all([
        api.get(`/projects/${projectId}/offers`),
        api.get(`/projects/${projectId}/applications`, { params: { expertId: userId } }),
        api.get(`/milestones/project/${projectId}`, withUserHeaders(userId)),
      ])

      setOffersByProject((current) => ({
        ...current,
        [projectId]: offersResponse.data?.offers || [],
      }))
      setApplicationsByProject((current) => ({
        ...current,
        [projectId]: applicationsResponse.data?.applications || [],
      }))
      setMilestonesByProject((current) => ({
        ...current,
        [projectId]: (milestonesResponse.data?.milestones || []).map((milestone) => normalizeMilestone(milestone)),
      }))
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load project execution data')
    } finally {
      setLoadingMilestones(false)
    }
  }, [selectedProjectId, showNotification, userId])

  useEffect(() => {
    loadProjectDetails(selectedProjectId)
  }, [loadProjectDetails, selectedProjectId])

  const openOffers = useMemo(
    () => Object.values(offersByProject).flat().filter((offer) => offer.status === 'open').length,
    [offersByProject],
  )

  const pendingApplications = useMemo(
    () => Object.values(applicationsByProject).flat().filter((application) => application.status === 'pending').length,
    [applicationsByProject],
  )

  const acceptedApplications = useMemo(
    () => Object.values(applicationsByProject).flat().filter((application) => application.status === 'accepted').length,
    [applicationsByProject],
  )

  const menuItems = useMemo(
    () => [
      { key: 'overview', label: t('expert.menu.overview'), subtitle: t('expert.menu.overviewSubtitle') },
      {
        key: 'create',
        label: `${t('expert.menu.create')}${isPremiumUser ? '' : ' 🔒'}`,
        subtitle: t('expert.menu.createSubtitle'),
      },
      { key: 'projects', label: t('expert.menu.projects'), subtitle: t('expert.menu.projectsSubtitle') },
      { key: 'settings', label: t('expert.menu.settings'), subtitle: t('expert.menu.settingsSubtitle') },
    ],
    [isPremiumUser, t],
  )

  const openCreateView = useCallback(() => {
    if (isPremiumUser) {
      setActiveView('create')
      return
    }

    onRequirePremium?.()
    showNotification('error', t('premium.projectCreationLocked'))
  }, [isPremiumUser, onRequirePremium, showNotification, t])

  const handleNavigate = useCallback((nextView) => {
    if (nextView === 'create' && !isPremiumUser) {
      onRequirePremium?.()
      showNotification('error', t('premium.projectCreationLocked'))
      return
    }

    setActiveView(nextView)
  }, [isPremiumUser, onRequirePremium, showNotification, t])

  const selectedMilestones = milestonesByProject[selectedProjectId] || []

  const handleProjectCreated = (payload) => {
    const createdProject = normalizeProject(payload?.project || {})
    setProjects((current) => [createdProject, ...current])
    setOffersByProject((current) => ({
      ...current,
      [createdProject.id]: payload?.offers || [],
    }))
    setApplicationsByProject((current) => ({
      ...current,
      [createdProject.id]: [],
    }))
    setSelectedProjectId(createdProject.id)
    setActiveView('projects')
    showNotification('success', 'Project, chantier, and offer created successfully')
  }

  const handleCreateMilestone = async (payload) => {
    if (!selectedProjectId) return

    setCreatingMilestone(true)
    try {
      await api.post(
        '/milestones',
        {
          projectId: selectedProjectId,
          artisanId: payload.artisanId,
          title: payload.title,
          description: payload.description,
          startDate: payload.startDate,
          endDate: payload.endDate,
        },
        withUserHeaders(userId),
      )
      await loadProjectDetails(selectedProjectId)
      showNotification('success', 'Milestone created successfully')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to create milestone')
    } finally {
      setCreatingMilestone(false)
    }
  }

  const handleProjectStatusAction = async (action) => {
    if (!selectedProjectId) return

    setProjectActionLoading(true)
    try {
      if (action === 'start') {
        await api.post(`/projects/start/${selectedProjectId}`, {}, withUserHeaders(userId))
      } else {
        await api.put(`/projects/status/${selectedProjectId}`, { status: action }, withUserHeaders(userId))
      }

      await Promise.all([loadProjects(), loadProjectDetails(selectedProjectId)])
      showNotification('success', action === 'start' ? 'Project started successfully' : `Project ${action} successfully`)
    } catch (error) {
      showNotification('error', error.response?.data?.message || `Failed to ${action} project`)
    } finally {
      setProjectActionLoading(false)
    }
  }

  const handleReviewApplication = async (applicationId, action) => {
    setReviewingId(applicationId)
    try {
      await api.patch(`/applications/${applicationId}/review`, {
        expertId: userId,
        action,
      })

      await loadProjects()

      if (selectedProjectId) {
        await loadProjectDetails(selectedProjectId)
      }

      showNotification('success', `Application ${action}ed successfully`)
    } catch (error) {
      showNotification('error', error.response?.data?.message || `Failed to ${action} application`)
    } finally {
      setReviewingId('')
    }
  }

  const selectedOffers = offersByProject[selectedProjectId] || []
  const selectedApplications = applicationsByProject[selectedProjectId] || []

  return (
    <div className="expert-profile">
      <div className={`notification ${notification.text ? 'show' : ''} ${notification.type || ''}`} role="status">
        {notification.text}
      </div>

      <DashboardLayout
        user={user}
        menuItems={menuItems}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        onCancelSubscription={onCancelSubscription}
        cancellingSubscription={cancellingSubscription}
      >
        {activeView === 'overview' && (
          <section className="expert-dash-card">
            <div className="expert-dash-hero">
              <div>
                <p className="eyebrow">Expert recruitment</p>
                <h2>Launch projects, publish offers, and review artisan applications in one place.</h2>
                <p className="subtitle">Each new project creates its chantier automatically and opens the required job offers.</p>
                <div className="hero-actions">
                  <button type="button" onClick={openCreateView} className="inline-flex items-center gap-2">
                    {!isPremiumUser ? <LockIcon className="icon tiny" /> : null}
                    New project
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setActiveView('projects')}>
                    Review pipeline
                  </button>
                </div>
              </div>
              <div className="hero-metrics">
                <div className="summary-pill">
                  <strong>{projects.length}</strong>
                  <span>{t('projects')}</span>
                  <small>Managed by you</small>
                </div>
                <div className="summary-pill">
                  <strong>{openOffers}</strong>
                  <span>Open offers</span>
                  <small>Ready for artisans</small>
                </div>
                <div className="summary-pill">
                  <strong>{pendingApplications}</strong>
                  <span>Pending</span>
                  <small>{acceptedApplications} accepted</small>
                </div>
              </div>
            </div>

            <div className="expert-panels two">
              <div className="expert-panel">
                <div className="section-header">
                  <h3>Recent projects</h3>
                  <p className="subtitle">Your latest recruitment boards.</p>
                </div>
                <div className="expert-list">
                  {projects.slice(0, 4).map((project) => (
                    <article key={project.id} className="expert-list-item">
                      <div>
                        <strong>{project.title}</strong>
                        <p className="subtitle small">
                          {project.teamRequirements.length} roles · {project.budget.toLocaleString()} TND
                        </p>
                      </div>
                      <button type="button" className="mini-btn secondary-btn" onClick={() => {
                        setSelectedProjectId(project.id)
                        setActiveView('projects')
                      }}>
                        Open
                      </button>
                    </article>
                  ))}
                  {!projects.length && <p className="subtitle">No projects yet. Create your first recruitment board.</p>}
                </div>
              </div>

              <div className="expert-panel">
                <div className="section-header">
                  <h3>Pending applications</h3>
                  <p className="subtitle">Artisans waiting for your decision.</p>
                </div>
                <div className="expert-list">
                  {Object.values(applicationsByProject)
                    .flat()
                    .filter((application) => application.status === 'pending')
                    .slice(0, 4)
                    .map((application) => (
                      <article key={application._id} className="expert-list-item">
                        <div>
                          <strong>{application.artisanId?.name || 'Artisan'}</strong>
                          <p className="subtitle small">
                            {application.job} · {application.proposedDailySalary} TND/day
                          </p>
                        </div>
                        <span className="chip">{application.status}</span>
                      </article>
                    ))}
                  {!pendingApplications && <p className="subtitle">No pending applications right now.</p>}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeView === 'create' && (
          isPremiumUser ? (
            <section className="dashboard-card">
              <div className="section-header">
                <h3>{t('expert.menu.create')}</h3>
                <p className="subtitle">Set the project details, map location, trade, and salary in one clean form.</p>
              </div>
              <CreateProjectForm userId={userId} role="expert" onCreated={handleProjectCreated} />
            </section>
          ) : (
            <section className="dashboard-card">
              <div className="section-header">
                <h3>{t('expert.menu.create')}</h3>
                <p className="subtitle">{t('premium.projectCreationLocked')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-orange-100 p-2 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                    <LockIcon className="h-4 w-4" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {t('premium.unlockProjectCreation')}
                    </p>
                    <button
                      type="button"
                      className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200/50 transition-all duration-300 hover:scale-[1.02] hover:brightness-105 dark:shadow-orange-950/25"
                      onClick={() => onRequirePremium?.()}
                    >
                      {t('premium.modalTitle')}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )
        )}

        {activeView === 'projects' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>{t('projects')}</h3>
              <p className="subtitle">Manage recruiting, execution, milestones, and artisan applications by project.</p>
            </div>

            {loadingProjects ? (
              <p className="subtitle">Loading projects...</p>
            ) : projects.length ? (
              <>
                <div className="project-toolbar">
                  <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)}>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject ? (
                  <div className="space-y-6">
                    <ProjectDetails
                      role="expert"
                      userId={userId}
                      project={selectedProject}
                      milestones={selectedMilestones}
                      workLogs={[]}
                      loading={loadingMilestones}
                      creatingMilestone={creatingMilestone}
                      projectActionLoading={projectActionLoading}
                      onBack={() => setActiveView('overview')}
                      onCreateMilestone={handleCreateMilestone}
                      onStartProject={() => handleProjectStatusAction('start')}
                      onCloseProject={() => handleProjectStatusAction('closed')}
                      onFinishProject={() => handleProjectStatusAction('finished')}
                      onProjectRefresh={() => Promise.all([loadProjects(), loadProjectDetails(selectedProjectId)])}
                    />

                    <div className="project-board">
                    <div className="project-summary-card">
                      <h4>{selectedProject.title}</h4>
                      <p className="subtitle">
                        {selectedProject.category || 'project'} · {selectedProject.location?.address || 'No address provided.'}
                      </p>
                      <div className="chip-row">
                        <span className="chip ghost">{selectedProject.budget.toLocaleString()} TND</span>
                        <span className="chip ghost">
                          Start {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'TBD'}
                        </span>
                        <span className="chip ghost">
                          End {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'TBD'}
                        </span>
                        <span className="chip ghost">{selectedProject.job || 'no trade'} · {selectedProject.dailySalary || 0} TND/day</span>
                      </div>
                    </div>

                    <div className="expert-panels two">
                      <div className="expert-panel">
                        <div className="section-header">
                          <h3>Offers</h3>
                          <p className="subtitle">Slots available for artisans.</p>
                        </div>
                        <div className="projects-grid">
                          {selectedOffers.map((offer) => (
                            <article key={offer._id} className="project-tile">
                              <h4>{offer.job}</h4>
                              <p className="subtitle small">
                                {offer.availableSlots}/{offer.requiredSlots} slots available
                              </p>
                              <div className="chip-row">
                                <span className={`chip ${offer.status === 'open' ? '' : 'ghost'}`}>{offer.status}</span>
                              </div>
                            </article>
                          ))}
                          {!selectedOffers.length && <p className="subtitle">No offers found for this project.</p>}
                        </div>
                      </div>

                      <div className="expert-panel">
                        <div className="section-header">
                          <h3>Applications</h3>
                          <p className="subtitle">Accept or reject artisan candidates.</p>
                        </div>
                        <div className="application-stack">
                          {selectedApplications.map((application) => (
                            <article key={application._id} className="application-card">
                              <div>
                                <strong>{application.artisanId?.name || 'Artisan'}</strong>
                                <p className="subtitle small">
                                  {(application.artisanId?.job || application.job || '').toUpperCase()} · {application.proposedDailySalary} TND/day
                                </p>
                                <p className="subtitle small">{application.artisanId?.email || ''}</p>
                              </div>
                              <div className="application-side">
                                <span className={`status-pill status-${application.status}`}>{application.status}</span>
                                {application.status === 'pending' ? (
                                  <div className="inline-actions">
                                    <button
                                      type="button"
                                      className="secondary-btn mini-btn"
                                      disabled={reviewingId === application._id}
                                      onClick={() => handleReviewApplication(application._id, 'reject')}
                                    >
                                      Reject
                                    </button>
                                    <button
                                      type="button"
                                      className="mini-btn"
                                      disabled={reviewingId === application._id}
                                      onClick={() => handleReviewApplication(application._id, 'accept')}
                                    >
                                      {reviewingId === application._id ? 'Saving...' : 'Accept'}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          ))}
                          {!selectedApplications.length && <p className="subtitle">No applications yet for this project.</p>}
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="subtitle">No projects yet. Create one to start publishing offers.</p>
            )}
          </section>
        )}

        {activeView === 'settings' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Expert account</h3>
              <p className="subtitle">Current signed-in profile used for project ownership.</p>
            </div>
            <div className="settings-content">
              <p><strong>Name:</strong> {user?.name || 'Guest'}</p>
              <p><strong>Email:</strong> {user?.email || 'Not available'}</p>
              <p><strong>Role:</strong> Expert</p>
              <p><strong>Expert ID:</strong> {userId || 'Missing'}</p>
            </div>
            <div className="report-profile-cta">
              <div>
                <strong>Report this profile</strong>
                <p className="subtitle small">Send this profile to moderation if it violates platform rules.</p>
              </div>
              <button
                type="button"
                className="secondary-btn report-trigger-btn"
                disabled={!userId}
                onClick={() => setIsReportModalOpen(true)}
              >
                Report profile
              </button>
            </div>
          </section>
        )}
      </DashboardLayout>

      <ReportModal
        isOpen={isReportModalOpen}
        currentUserId={userId}
        targetType="user"
        targetId={userId}
        targetLabel={user?.name || user?.email || 'this profile'}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={(message) => showNotification('success', message)}
      />
    </div>
  )
}

export default ExpertProfile
