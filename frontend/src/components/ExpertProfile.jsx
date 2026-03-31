import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import DashboardLayout from './DashboardLayout'
import CreateProjectForm from './CreateProjectForm'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Recruitment snapshot' },
  { key: 'create', label: 'Create Project', subtitle: 'Project + chantier' },
  { key: 'projects', label: 'Projects', subtitle: 'Offers and applications' },
  { key: 'settings', label: 'Settings', subtitle: 'Account summary' },
]

function normalizeProject(project) {
  return {
    ...project,
    id: project?._id || project?.id,
    title: project?.projectName || project?.title || project?.name || 'Untitled project',
    budget: Number(project?.estimatedBudget ?? project?.budget ?? project?.totalBudget ?? 0),
    category: project?.category || '',
    startDate: project?.startDate || '',
    endDate: project?.endDate || project?.deadline || '',
    job: project?.job || project?.teamRequirements?.[0]?.job || '',
    dailySalary: Number(project?.dailySalary ?? 0),
    location: project?.location || { address: '', latitude: null, longitude: null },
    teamRequirements: Array.isArray(project?.teamRequirements) ? project.teamRequirements : [],
  }
}

function ExpertProfile({ user, onLogout }) {
  const userId = user?.id || user?._id || ''
  const [activeView, setActiveView] = useState('overview')
  const [projects, setProjects] = useState([])
  const [offersByProject, setOffersByProject] = useState({})
  const [applicationsByProject, setApplicationsByProject] = useState({})
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [reviewingId, setReviewingId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [notification, setNotification] = useState({ type: '', text: '' })

  const showNotification = (type, text) => {
    setNotification({ type, text })
  }

  useEffect(() => {
    if (!notification.text) return undefined
    const timer = setTimeout(() => setNotification({ type: '', text: '' }), 3200)
    return () => clearTimeout(timer)
  }, [notification])

  const loadProjects = async () => {
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
  }

  useEffect(() => {
    loadProjects()
  }, [userId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  useEffect(() => {
    const loadProjectDetails = async () => {
      if (!selectedProjectId || !userId) return

      try {
        const [offersResponse, applicationsResponse] = await Promise.all([
          api.get(`/projects/${selectedProjectId}/offers`),
          api.get(`/projects/${selectedProjectId}/applications`, { params: { expertId: userId } }),
        ])

        setOffersByProject((current) => ({
          ...current,
          [selectedProjectId]: offersResponse.data?.offers || [],
        }))
        setApplicationsByProject((current) => ({
          ...current,
          [selectedProjectId]: applicationsResponse.data?.applications || [],
        }))
      } catch (error) {
        showNotification('error', error.response?.data?.message || 'Failed to load project recruitment data')
      }
    }

    loadProjectDetails()
  }, [selectedProjectId, userId])

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

  const handleReviewApplication = async (applicationId, action) => {
    setReviewingId(applicationId)
    try {
      await api.patch(`/applications/${applicationId}/review`, {
        expertId: userId,
        action,
      })

      await loadProjects()

      if (selectedProjectId) {
        const [offersResponse, applicationsResponse] = await Promise.all([
          api.get(`/projects/${selectedProjectId}/offers`),
          api.get(`/projects/${selectedProjectId}/applications`, { params: { expertId: userId } }),
        ])

        setOffersByProject((current) => ({
          ...current,
          [selectedProjectId]: offersResponse.data?.offers || [],
        }))
        setApplicationsByProject((current) => ({
          ...current,
          [selectedProjectId]: applicationsResponse.data?.applications || [],
        }))
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
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
      >
        {activeView === 'overview' && (
          <section className="expert-dash-card">
            <div className="expert-dash-hero">
              <div>
                <p className="eyebrow">Expert recruitment</p>
                <h2>Launch projects, publish offers, and review artisan applications in one place.</h2>
                <p className="subtitle">Each new project creates its chantier automatically and opens the required job offers.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveView('create')}>
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
                  <span>Projects</span>
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
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Create project</h3>
              <p className="subtitle">Set the project details, map location, trade, and salary in one clean form.</p>
            </div>
            <CreateProjectForm expertId={userId} onCreated={handleProjectCreated} />
          </section>
        )}

        {activeView === 'projects' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Project recruitment pipeline</h3>
              <p className="subtitle">Track offers, available slots, and artisan applications by project.</p>
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
          </section>
        )}
      </DashboardLayout>
    </div>
  )
}

export default ExpertProfile
