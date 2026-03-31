import { useMemo, useState } from 'react'
import { BmpLogo, LogoutIcon, MenuIcon, SettingsIcon } from './Icons'

function DashboardLayout({
  user,
  menuItems,
  activeView,
  onNavigate,
  onLogout,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const userInitials = useMemo(() => {
    const raw = user?.name || 'User'
    const parts = raw.trim().split(/\s+/).slice(0, 2)
    const letters = parts.map((part) => part.charAt(0).toUpperCase()).join('')
    return letters || 'U'
  }, [user?.name])

  const handleNavigate = (key) => {
    onNavigate(key)
    setIsSidebarOpen(false)
    setIsUserMenuOpen(false)
  }

  const handleLogout = () => {
    setIsSidebarOpen(false)
    setIsUserMenuOpen(false)
    onLogout()
  }

  const handleSettings = () => {
    handleNavigate('settings')
  }

  const shellClass = `dashboard-shell ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`

  return (
    <div className={shellClass}>
      <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
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
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <LogoutIcon className="icon tiny" />
            Log out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <button
              type="button"
              className={`sidebar-burger-btn ${isSidebarOpen ? 'is-open' : ''}`}
              onClick={() => setIsSidebarOpen((open) => !open)}
              aria-label={isSidebarOpen ? 'Collapse menu' : 'Open menu'}
            >
              <MenuIcon className="icon" />
            </button>
            <div>
           
            </div>
          </div>
          <div className="header-actions">
            <div className={`header-user ${isUserMenuOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="header-user-btn"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
              >
                <div className="header-avatar">
                  {user?.profileImage ? <img src={user.profileImage} alt="Profile" /> : <span>{userInitials}</span>}
                </div>
                <div className="header-user-meta">
                  <strong>{user?.name || 'Guest'}</strong>
                  <small>{(user?.role || 'Role').toUpperCase()}</small>
                </div>
                <span className="header-caret" aria-hidden="true">
                  {isUserMenuOpen ? '▴' : '▾'}
                </span>
              </button>
              <div className="header-user-menu" role="menu">
                <button type="button" onClick={handleSettings} className="header-menu-item" role="menuitem">
                  <SettingsIcon className="icon tiny" />
                  Settings
                </button>
                <button type="button" onClick={handleLogout} className="header-menu-item" role="menuitem">
                  <LogoutIcon className="icon tiny" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </header>
        <div className="dashboard-main-content">{children}</div>
      </div>
    </div>
  )
}

export default DashboardLayout
