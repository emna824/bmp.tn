import { useMemo, useState } from 'react'
import DashboardLayout from './DashboardLayout'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'At a glance' },
  { key: 'team', label: 'Team', subtitle: 'Your artisans' },
  { key: 'timeline', label: 'Timeline', subtitle: 'Upcoming' },
]

const SAMPLE_TEAM = [
  { id: 'a1', name: 'Amine G.', trade: 'Electrician', status: 'On site' },
  { id: 'a2', name: 'Sonia B.', trade: 'Painter', status: 'Available' },
  { id: 'a3', name: 'Mehdi K.', trade: 'Mason', status: 'On site' },
  { id: 'a4', name: 'Nidhal L.', trade: 'Plumber', status: 'Standby' },
]

const SAMPLE_EVENTS = [
  { id: 'e1', title: 'Lac Park - slab inspection', date: '2026-03-24', owner: 'You' },
  { id: 'e2', title: 'Sahel Clinic - HVAC delivery', date: '2026-03-26', owner: 'Logistics' },
  { id: 'e3', title: 'Medina Residences - paint phase', date: '2026-03-29', owner: 'Sonia B.' },
]

function ExpertDashboard({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview')

  const totals = useMemo(
    () => ({
      artisans: SAMPLE_TEAM.length,
      upcoming: SAMPLE_EVENTS.length,
    }),
    [],
  )

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
                <h2>Coordinate your team and stay ahead of the schedule.</h2>
                <p className="subtitle">Project management is disabled for experts; focus on people and timing.</p>
                <div className="hero-actions">
                  <button type="button" onClick={() => setActiveView('team')}>
                    View team
                  </button>
                  <button type="button" className="secondary-btn" onClick={() => setActiveView('timeline')}>
                    View timeline
                  </button>
                </div>
              </div>
              <div className="hero-metrics">
                <div className="summary-pill">
                  <strong>{totals.artisans}</strong>
                  <span>Artisans</span>
                  <small>Active roster</small>
                </div>
                <div className="summary-pill">
                  <strong>{totals.upcoming}</strong>
                  <span>Upcoming</span>
                  <small>Milestones</small>
                </div>
              </div>
            </div>
            <div className="expert-panels">
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
                          {evt.date} - {evt.owner}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
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
                      <td>
                        <span className="chip ghost">{a.status}</span>
                      </td>
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
                      {evt.date} - {evt.owner}
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
