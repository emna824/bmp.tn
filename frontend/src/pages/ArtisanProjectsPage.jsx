function formatProjectDate(value) {
  if (!value) return 'Not scheduled'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not scheduled'

  return parsed.toLocaleDateString()
}

function formatProjectStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ArtisanProjectsPage({ projects, loading, onRetry }) {
  return (
    <section className="dashboard-card artisan-projects-card">
      <div className="section-header">
        <div>
          <h3>Assigned projects</h3>
          <p className="subtitle">Review the projects you are currently scheduled to work on.</p>
        </div>
        <span className="projects-count-badge">{projects.length} total</span>
      </div>

      {loading ? (
        <p className="subtitle">Loading assigned projects...</p>
      ) : projects.length ? (
        <div className="artisan-projects-list">
          {projects.map((project) => (
            <article key={project.id} className="artisan-assigned-project-card">
              <div className="artisan-project-card-head">
                <div>
                  <h4>{project.projectName}</h4>
                  <p className="subtitle small">{project.job || 'General assignment'}</p>
                </div>
                <span className={`project-status-chip status-${project.status || 'unknown'}`}>
                  {formatProjectStatus(project.status)}
                </span>
              </div>

              <div className="artisan-project-meta-grid">
                <div>
                  <span className="project-meta-label">Start date</span>
                  <strong>{formatProjectDate(project.startDate)}</strong>
                </div>
                <div>
                  <span className="project-meta-label">End date</span>
                  <strong>{formatProjectDate(project.endDate || project.startDate)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-dashboard-state">
          <h4>No assigned projects yet</h4>
          <p className="subtitle">Accepted project assignments will appear here automatically.</p>
          <button type="button" className="secondary-btn" onClick={onRetry}>
            Refresh
          </button>
        </div>
      )}
    </section>
  )
}

export default ArtisanProjectsPage
