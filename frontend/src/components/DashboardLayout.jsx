import { useState } from 'react'
import { BmpLogo, CloseIcon, LogoutIcon, MenuIcon } from './Icons'

function DashboardLayout({ user, menuItems, activeView, onNavigate, onLogout, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleNavigate = (key) => {
    onNavigate(key)
    setIsSidebarOpen(false)
  }

  const handleLogout = () => {
    setIsSidebarOpen(false)
    onLogout()
  }

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <button type="button" className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu">
          <CloseIcon className="icon" />
        </button>
        <div className="sidebar-brand">
          <BmpLogo className="sidebar-brand-icon" />
          <div>
            <strong>BMP.tn</strong>
            <p>Construction platform</p>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${activeView === item.key ? 'active' : ''}`}
              onClick={() => handleNavigate(item.key)}
            >
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogoutIcon className="icon tiny" />
            Log out
          </button>
        </div>
      </aside>
      {isSidebarOpen ? <button type="button" className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} aria-label="Close menu overlay" /> : null}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="header-eyebrow">Welcome back</p>
            <h1 className="header-title">BMP.tn Dashboard</h1>
          </div>
          <div className="header-actions">
            <div className="header-user-chip">
              <span>{user?.name || 'Guest'}</span>
              <strong>{(user?.role || 'Role').toUpperCase()}</strong>
            </div>
            <button type="button" className="sidebar-burger-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open menu">
              <MenuIcon className="icon" />
            </button>
          </div>
        </header>
        <div className="dashboard-main-content">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
