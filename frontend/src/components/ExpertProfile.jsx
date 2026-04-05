import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import DashboardLayout from './DashboardLayout'
import CreateProjectForm from './CreateProjectForm'
import ProjectDetails from '../pages/ProjectDetails'
import ReportModal from './ReportModal'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Recruitment snapshot' },
  { key: 'create', label: 'Create Project', subtitle: 'Project + chantier' },
  { key: 'projects', label: 'Projects', subtitle: 'Execution system' },
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
    assignedArtisans: Array.isArray(project?.assignedArtisans) ? project.assignedArtisans : [],
    status: project?.status || 'recruiting',
    description: project?.description || '',
  }
}

function ExpertProfile({ user, onLogout }) {
  const userId = user?.id || user?._id || ''
  const [activeView, setActiveView] = useState('overview')
  const [projects, setProjects] = useState([])
  const [offersByProject, setOffersByProject] = useState({})
  const [applicationsByProject, setApplicationsByProject] = useState({})
  const [loadingProjects, setLoadingProjects] = useState(false)
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
                <h2>Launch projects, assign artisans, and move projects into execution with clear milestones.</h2>
                <p className="subtitle">Recruitment stays visible until you start the project, then milestones drive delivery.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveView('create')}>
                    New project
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setActiveView('projects')}>
                    Open execution
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
                  <small>Still recruiting</small>
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
                  <p className="subtitle">Your latest recruitment boards and execution workspaces.</p>
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
                      <button
                        type="button"
                        className="mini-btn secondary-btn"
                        onClick={() => {
                          setSelectedProjectId(project.id)
                          setActiveView('projects')
                        }}
                      >
                        Open
                      </button>
                    </article>
                  ))}
                  {!projects.length && <p className="subtitle">No projects yet. Create your first recruitment board.</p>}
                </div>
              </div>

              <div className="expert-panel">
                <div className="section-header">
                  <h3>Recruitment snapshot</h3>
                  <p className="subtitle">Offers and pending applications still waiting for action.</p>
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
          <ProjectDetails
            userId={userId}
            projects={projects}
            loadingProjects={loadingProjects}
            onRefreshProjects={loadProjects}
            showNotification={showNotification}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setSelectedProjectId}
          />
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
