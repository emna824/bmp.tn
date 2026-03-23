import { useMemo, useState } from 'react'
import DashboardLayout from './DashboardLayout'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'At a glance' },
  { key: 'projects', label: 'Projects', subtitle: 'Active builds' },
  { key: 'team', label: 'Team', subtitle: 'Your artisans' },
  { key: 'timeline', label: 'Timeline', subtitle: 'Upcoming' },
]

const SAMPLE_PROJECTS = [
  { id: 'p1', name: 'Medina Residences', budget: 420000, progress: 68, chantiers: 3, risk: 'On track' },
  { id: 'p2', name: 'Lac Business Park', budget: 780000, progress: 42, chantiers: 2, risk: 'Watch scope' },
  { id: 'p3', name: 'Sahel Clinic', budget: 315000, progress: 81, chantiers: 4, risk: 'On track' },
]

const SAMPLE_TEAM = [
  { id: 'a1', name: 'Amine G.', trade: 'Electrician', status: 'On site' },
  { id: 'a2', name: 'Sonia B.', trade: 'Painter', status: 'Available' },
  { id: 'a3', name: 'Mehdi K.', trade: 'Mason', status: 'On site' },
  { id: 'a4', name: 'Nidhal L.', trade: 'Plumber', status: 'Standby' },
]

const SAMPLE_EVENTS = [
  { id: 'e1', title: 'Lac Park — slab inspection', date: '2026-03-24', owner: 'You' },
  { id: 'e2', title: 'Sahel Clinic — HVAC delivery', date: '2026-03-26', owner: 'Logistics' },
  { id: 'e3', title: 'Medina Residences — paint phase', date: '2026-03-29', owner: 'Sonia B.' },
]

function ExpertDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview')

  const totals = useMemo(() => {
    const budget = SAMPLE_PROJECTS.reduce((sum, p) => sum + p.budget, 0)
    const avgProgress = Math.round(
      SAMPLE_PROJECTS.reduce((sum, p) => sum + p.progress, 0) / SAMPLE_PROJECTS.length,
    )
    return {
      projects: SAMPLE_PROJECTS.length,
      artisans: SAMPLE_TEAM.length,
      budget,
      progress: avgProgress,
    }
  }, [])

  return (
    <div className="expert-dashboard-shell">
      <DashboardLayout
        user={{ ...user, notificationCount: user?.notificationCount ?? 0 }}
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
      >
        {activeView === 'overview' && (
          <section className="expert-dash-card">
            <div className="expert-dash-hero">
              <div>
                <p className="eyebrow">Expert Command</p>
                <h2>Everything you need to steer builds in one place.</h2>
                <p className="subtitle">This view is self-contained—no backend calls required.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveView('projects')}>
                    Open projects
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setActiveView('team')}>
                    View team
                  </button>
                </div>
              </div>
              <div className="hero-metrics">
                <div className="summary-pill">
                  <strong>{totals.projects}</strong>
                  <span>Projects</span>
                  <small>{totals.progress}% avg progress</small>
                </div>
                <div className="summary-pill">
                  <strong>{totals.artisans}</strong>
                  <span>Artisans</span>
                  <small>Active roster</small>
                </div>
                <div className="summary-pill">
                  <strong>${totals.budget.toLocaleString()}</strong>
                  <span>Total budget</span>
                  <small>Planned</small>
                </div>
              </div>
            </div>
            <div className="expert-panels">
              <div className="expert-panel">
                <div className="section-header">
                  <h3>Focus projects</h3>
                  <p className="subtitle">Static sample data to keep this view reliable.</p>
                </div>
                <div className="expert-list">
                  {SAMPLE_PROJECTS.map((proj) => (
                    <article key={proj.id} className="expert-list-item">
                      <div>
                        <strong>{proj.name}</strong>
                        <p className="subtitle small">
                          {proj.chantiers} chantiers · ${proj.budget.toLocaleString()}
                        </p>
                      </div>
                      <div className="expert-list-meta">
                        <span className="chip">{proj.progress}%</span>
                        <span className="chip ghost">{proj.risk}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="expert-panel">
                <div className="section-header">
                  <h3>Upcoming</h3>
                  <p className="subtitle">Dates to watch.</p>
                </div>
                <ul className="timeline">
                  {SAMPLE_EVENTS.map((evt) => (
                    <li key={evt.id}>
                      <div className="dot" />
                      <div>
                        <strong>{evt.title}</strong>
                        <p className="subtitle small">
                          {evt.date} · {evt.owner}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {activeView === 'projects' && (
          <section className="expert-dash-card">
            <div className="section-header">
              <h3>Projects</h3>
              <p className="subtitle">Static showcase cards (offline-safe).</p>
            </div>
            <div className="projects-grid">
              {SAMPLE_PROJECTS.map((proj) => (
                <article key={proj.id} className="project-tile">
                  <h4>{proj.name}</h4>
                  <p className="subtitle small">${proj.budget.toLocaleString()} · {proj.chantiers} chantiers</p>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${proj.progress}%` }} />
                  </div>
                  <div className="project-metrics">
                    <p><strong>Progress:</strong> {proj.progress}%</p>
                    <p><strong>Risk:</strong> {proj.risk}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'team' && (
          <section className="expert-dash-card">
            <div className="section-header">
              <h3>Team</h3>
              <p className="subtitle">Artisan roster (sample data).</p>
            </div>
            <div className="table-wrap">
              <table className="artisan-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Trade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_TEAM.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.trade}</td>
                      <td><span className="chip ghost">{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeView === 'timeline' && (
          <section className="expert-dash-card">
            <div className="section-header">
              <h3>Timeline</h3>
              <p className="subtitle">Upcoming milestones.</p>
            </div>
            <ul className="timeline large">
              {SAMPLE_EVENTS.map((evt) => (
                <li key={evt.id}>
                  <div className="dot" />
                  <div>
                    <strong>{evt.title}</strong>
                    <p className="subtitle small">
                      {evt.date} · {evt.owner}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DashboardLayout>
    </div>
  )
}

export default ExpertDashboard
