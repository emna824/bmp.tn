import { LogoutIcon } from './Icons'

function DashboardLayout({ user, menuItems, activeView, onNavigate, onLogout, children }) {
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" aria-hidden="true" />
          <div>
            <strong>BuildMarket</strong>
            <p>Crafted dashboard</p>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${activeView === item.key ? 'active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="sidebar-item-label">{item.label}</span>
              {item.subtitle ? <small>{item.subtitle}</small> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            <LogoutIcon className="icon tiny" />
            Log out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="header-eyebrow">Welcome back</p>
            <h1 className="header-title">Dashboard</h1>
          </div>
          <div className="header-user-chip">
            <span>{user?.name || 'Guest'}</span>
            <strong>{(user?.role || 'Role').toUpperCase()}</strong>
          </div>
        </header>
        <div className="dashboard-main-content">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
