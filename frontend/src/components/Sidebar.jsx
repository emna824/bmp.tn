import { BmpLogo } from './Icons'

function Sidebar({ items, activeView, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-head">
        <div className="admin-brand">
          <BmpLogo className="admin-brand-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>Admin moderation</p>
          </div>
        </div>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin sections">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              className={`admin-sidebar-link ${activeView === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="admin-sidebar-link-icon">
                <Icon className="icon" />
              </span>
              <span className="admin-sidebar-link-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="admin-sidebar-note">
        <p>Moderation tools for reports, accounts, and marketplace listings.</p>
      </div>
    </aside>
  )
}

export default Sidebar
