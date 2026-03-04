import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { HomeIcon, LogoutIcon, MenuIcon } from './Icons'

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter']

function ExpertProfile({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    [chantierForm.jobAssignments]
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
      activities: journalForm.activitiesText.split('\n').map((line) => line.trim()).filter(Boolean),
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
                  <input type="checkbox" checked={assignment.selected} onChange={() => toggleAssignment(artisan._id)} />
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

  const menu = [
    ['actions', 'Actions'],
    ['tracking', 'Tracking'],
    ['artisans', 'Artisans'],
  ]

  return (
    <div className="dashboard-page expert-dashboard">
      <div className={`notification ${toast.show ? 'show' : ''} ${toast.type}`}>{toast.text}</div>
      <header className="dashboard-topbar">
        <div className="expert-topbar-left">
          <button type="button" className="burger-btn" onClick={() => setSidebarOpen((prev) => !prev)}>
            <MenuIcon className="icon tiny" />
          </button>
          <h2 className="brand-title">
            <HomeIcon className="icon tiny" />
            Expert Dashboard
          </h2>
        </div>
        <button type="button" className="secondary-btn logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          Log out
        </button>
      </header>

      <div className="expert-shell">
        <aside className={`expert-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <h3>Navigation</h3>
          {menu.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`sidebar-item ${activeView === key ? 'active' : ''}`}
              onClick={() => {
                setActiveView(key)
                setSidebarOpen(false)
              }}
            >
              {label}
            </button>
          ))}
        </aside>

        <main className="expert-main">
          {activeView === 'actions' ? (
            <section className="dashboard-card">
              <h3>Create Project</h3>
              <form onSubmit={handleCreateProject}>
                <label>
                  Name
                  <input value={projectForm.name} onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label>
                  Description
                  <input value={projectForm.description} onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))} />
                </label>
                <label>
                  Budget
                  <input type="number" min="0" value={projectForm.totalBudget} onChange={(e) => setProjectForm((p) => ({ ...p, totalBudget: e.target.value }))} />
                </label>
                <button type="submit">Create Project</button>
              </form>
              <h3>Create Chantier & Invite Artisans</h3>
              <form onSubmit={handleCreateChantier}>
                <label>
                  Project
                  <select value={chantierForm.projectId} onChange={(e) => setChantierForm((p) => ({ ...p, projectId: e.target.value }))}>
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
                  <input value={chantierForm.name} onChange={(e) => setChantierForm((p) => ({ ...p, name: e.target.value }))} />
                </label>
                <label>
                  Description
                  <input value={chantierForm.description} onChange={(e) => setChantierForm((p) => ({ ...p, description: e.target.value }))} />
                </label>
                {renderArtisanTable()}
                <button type="submit">Create Chantier + Invite</button>
              </form>
              <h3>Send Journal</h3>
              <form onSubmit={handleSendJournal}>
                <label>
                  Project
                  <select value={journalForm.projectId} onChange={(e) => setJournalForm((p) => ({ ...p, projectId: e.target.value }))}>
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
                  <select value={journalForm.chantierId} onChange={(e) => setJournalForm((p) => ({ ...p, chantierId: e.target.value }))}>
                    <option value="">Select</option>
                    {projects
                      .flatMap((projectItem) => projectItem.chantiers || [])
                      .filter((chantier) => chantier.projectId === journalForm.projectId)
                      .map((chantier) => (
                        <option key={chantier._id} value={chantier._id}>
                          {chantier.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Date
                  <input type="date" value={journalForm.activityDate} onChange={(e) => setJournalForm((p) => ({ ...p, activityDate: e.target.value }))} />
                </label>
                <label>
                  Activities
                  <textarea value={journalForm.activitiesText} onChange={(e) => setJournalForm((p) => ({ ...p, activitiesText: e.target.value }))} />
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
          ) : null}

          {activeView === 'tracking' ? (
            <section className="dashboard-card">
              <h3>Tracking</h3>
              <div className="projects-grid">
                {projects.map((projectItem) => (
                  <article key={projectItem._id} className="project-tile">
                    <h4>{projectItem.name}</h4>
                    <p>
                      <strong>Chantiers:</strong> {(projectItem.chantiers || []).length}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === 'artisans' ? (
            <section className="dashboard-card">
              <h3>Artisans</h3>
              <div className="table-wrap">
                <table className="artisan-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artisans.map((artisan) => (
                      <tr key={artisan._id}>
                        <td>{artisan.name}</td>
                        <td>{artisan.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default ExpertProfile
