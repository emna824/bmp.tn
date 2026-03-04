import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import DashboardLayout from './DashboardLayout'

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter']

const MENU_ITEMS = [
  { key: 'actions', label: 'Actions', subtitle: 'Projects & journals' },
  { key: 'tracking', label: 'Tracking', subtitle: 'Project overview' },
  { key: 'artisans', label: 'Artisans', subtitle: 'Invite professionals' },
]

function ExpertProfile({ user, onLogout }) {
  const [activeView, setActiveView] = useState('actions')
  const [projects, setProjects] = useState([])
  const [artisans, setArtisans] = useState([])
  const [toast, setToast] = useState({ show: false, type: '', text: '' })
  const [projectForm, setProjectForm] = useState({ name: '', description: '', totalBudget: '' })
  const [chantierForm, setChantierForm] = useState({
    projectId: '',
    name: '',
    description: '',
    jobAssignments: {},
  })
  const [journalForm, setJournalForm] = useState({
    projectId: '',
    chantierId: '',
    activityDate: new Date().toISOString().slice(0, 10),
    activitiesText: '',
    artisanRecipientIds: [],
  })

  const assignments = useMemo(
    () =>
      Object.entries(chantierForm.jobAssignments || {})
        .filter(([, entry]) => entry?.selected)
        .map(([artisanId, entry]) => ({
          artisanId,
          jobTitle: entry.jobTitle || JOB_OPTIONS[0],
        })),
    [chantierForm.jobAssignments],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const [overviewRes, artisansRes] = await Promise.all([
          api.get(`/experts/overview/${user.id}`),
          api.get('/experts/artisans'),
        ])
        setProjects(overviewRes.data?.projects || [])
        setArtisans(artisansRes.data?.artisans || [])
      } catch (error) {
        setToast({ show: true, type: 'error', text: 'Failed to load dashboard' })
      }
    }
    load()
  }, [user.id])

  useEffect(() => {
    if (!toast.show) return undefined
    const timer = setTimeout(() => setToast({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const notify = (type, text) => setToast({ show: true, type, text })

  const toggleAssignment = (artisanId) => {
    setChantierForm((prev) => {
      const next = { ...(prev.jobAssignments || {}) }
      const entry = next[artisanId] || { selected: false, jobTitle: JOB_OPTIONS[0] }
      next[artisanId] = { ...entry, selected: !entry.selected }
      return { ...prev, jobAssignments: next }
    })
  }

  const handleCreateProject = async (event) => {
    event.preventDefault()
    if (!projectForm.name || !projectForm.totalBudget) {
      return notify('error', 'Project name and budget required')
    }
    await api.post('/experts/projects', {
      expertId: user.id,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
      totalBudget: Number(projectForm.totalBudget),
    })
    setProjectForm({ name: '', description: '', totalBudget: '' })
    notify('success', 'Project created')
  }

  const handleCreateChantier = async (event) => {
    event.preventDefault()
    if (!chantierForm.projectId || !chantierForm.name) {
      return notify('error', 'Project and chantier name are required')
    }
    await api.post(`/experts/projects/${chantierForm.projectId}/chantiers`, {
      expertId: user.id,
      name: chantierForm.name,
      description: chantierForm.description,
      assignments,
    })
    setChantierForm({ ...chantierForm, name: '', description: '', jobAssignments: {} })
    notify('success', 'Chantier created and invites sent')
  }

  const handleSendJournal = async (event) => {
    event.preventDefault()
    if (!journalForm.projectId || !journalForm.chantierId || !journalForm.activitiesText) {
      return notify('error', 'Project, chantier and activities are required')
    }
    await api.post('/experts/journals', {
      expertId: user.id,
      projectId: journalForm.projectId,
      chantierId: journalForm.chantierId,
      activityDate: journalForm.activityDate,
      activities: journalForm.activitiesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      artisanRecipientIds: journalForm.artisanRecipientIds,
    })
    setJournalForm((prev) => ({ ...prev, activitiesText: '' }))
    notify('success', 'Journal sent')
  }

  const renderArtisanTable = () => (
    <div className="table-wrap">
      <table className="artisan-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Name</th>
            <th>Email</th>
            <th>Job</th>
          </tr>
        </thead>
        <tbody>
          {artisans.map((artisan) => {
            const assignment = chantierForm.jobAssignments?.[artisan._id] || { selected: false, jobTitle: JOB_OPTIONS[0] }
            return (
              <tr key={artisan._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={assignment.selected}
                    onChange={() => toggleAssignment(artisan._id)}
                  />
                </td>
                <td>{artisan.name}</td>
                <td>{artisan.email}</td>
                <td>
                  <select
                    value={assignment.jobTitle}
                    onChange={(event) =>
                      setChantierForm((prev) => ({
                        ...prev,
                        jobAssignments: {
                          ...(prev.jobAssignments || {}),
                          [artisan._id]: { ...assignment, jobTitle: event.target.value },
                        },
                      }))
                    }
                  >
                    {JOB_OPTIONS.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const projectChantiers = useMemo(
    () =>
      projects
        .flatMap((projectItem) => projectItem.chantiers || [])
        .filter((chantier) => chantier.projectId === journalForm.projectId),
    [projects, journalForm.projectId],
  )

  return (
    <div className="expert-profile">
      <div className={`notification ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.text}</div>
      <DashboardLayout
        user={user}
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
      >
        {activeView === 'actions' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Create project & chantier</h3>
              <p className="subtitle">Kick off work and invite artisans.</p>
            </div>
            <form onSubmit={handleCreateProject}>
              <label>
                Name
                <input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label>
                Description
                <input
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
              <label>
                Budget
                <input
                  type="number"
                  min="0"
                  value={projectForm.totalBudget}
                  onChange={(e) => setProjectForm((p) => ({ ...p, totalBudget: e.target.value }))}
                />
              </label>
              <button type="submit">Create Project</button>
            </form>

            <form onSubmit={handleCreateChantier}>
              <label>
                Project
                <select
                  value={chantierForm.projectId}
                  onChange={(e) => setChantierForm((p) => ({ ...p, projectId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {projects.map((projectItem) => (
                    <option key={projectItem._id} value={projectItem._id}>
                      {projectItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chantier Name
                <input
                  value={chantierForm.name}
                  onChange={(e) => setChantierForm((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label>
                Description
                <input
                  value={chantierForm.description}
                  onChange={(e) => setChantierForm((p) => ({ ...p, description: e.target.value }))}
                />
              </label>
              {renderArtisanTable()}
              <button type="submit">Create Chantier + Invite</button>
            </form>

            <div className="section-header" style={{ marginTop: 24 }}>
              <h3>Send journal</h3>
              <p className="subtitle">Keep artisans informed about daily activities.</p>
            </div>
            <form onSubmit={handleSendJournal}>
              <label>
                Project
                <select
                  value={journalForm.projectId}
                  onChange={(e) => setJournalForm((p) => ({ ...p, projectId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {projects.map((projectItem) => (
                    <option key={projectItem._id} value={projectItem._id}>
                      {projectItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Chantier
                <select
                  value={journalForm.chantierId}
                  onChange={(e) => setJournalForm((p) => ({ ...p, chantierId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {projectChantiers.map((chantier) => (
                    <option key={chantier._id} value={chantier._id}>
                      {chantier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={journalForm.activityDate}
                  onChange={(e) => setJournalForm((p) => ({ ...p, activityDate: e.target.value }))}
                />
              </label>
              <label>
                Activities
                <textarea
                  value={journalForm.activitiesText}
                  onChange={(e) => setJournalForm((p) => ({ ...p, activitiesText: e.target.value }))}
                />
              </label>
              <label>
                Recipients
                <select
                  multiple
                  value={journalForm.artisanRecipientIds}
                  onChange={(e) =>
                    setJournalForm((p) => ({
                      ...p,
                      artisanRecipientIds: Array.from(e.target.selectedOptions, (option) => option.value),
                    }))
                  }
                >
                  {artisans.map((artisan) => (
                    <option key={artisan._id} value={artisan._id}>
                      {artisan.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Send Journal</button>
            </form>
          </section>
        )}

        {activeView === 'tracking' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Tracking</h3>
              <p className="subtitle">Monitor your projects at a glance.</p>
            </div>
            <div className="projects-grid">
              {projects.map((projectItem) => (
                <article key={projectItem._id} className="project-tile">
                  <h4>{projectItem.name}</h4>
                  <p>
                    <strong>Budget:</strong> ${projectItem.totalBudget?.toLocaleString() || 0}
                  </p>
                  <p>
                    <strong>Chantiers:</strong> {(projectItem.chantiers || []).length}
                  </p>
                  <div className="project-metrics">
                    <p>
                      <strong>Progress:</strong> {projectItem.progressPercentage ?? 0}%
                    </p>
                    <p>
                      <strong>Spent:</strong> ${projectItem.spentBudget ?? 0}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'artisans' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Artisans</h3>
              <p className="subtitle">Browse registered artisans.</p>
            </div>
            <div className="table-wrap">
              <table className="artisan-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Job</th>
                  </tr>
                </thead>
                <tbody>
                  {artisans.map((artisan) => (
                    <tr key={artisan._id}>
                      <td>{artisan.name}</td>
                      <td>{artisan.email}</td>
                      <td>{artisan.job || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </DashboardLayout>
    </div>
  )
}

export default ExpertProfile
