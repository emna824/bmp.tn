import { useMemo, useState } from 'react'
import { BellIcon, BmpLogo, CloseIcon, LogoutIcon, MarketplaceIcon, MenuIcon, SettingsIcon } from './Icons'

function DashboardLayout({ user, menuItems, activeView, onNavigate, onLogout, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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

  const handleMarketplace = () => {
    handleNavigate('marketplace')
  }

  const notificationCount = user?.notificationCount ?? user?.notifications ?? 0

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
          <div className={`sidebar-user-card ${isUserMenuOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="sidebar-user"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
            >
              <div className="sidebar-avatar">
                {user?.profileImage ? <img src={user.profileImage} alt="Profile" /> : <span>{userInitials}</span>}
              </div>
              <div className="sidebar-user-meta">
                <strong>{user?.name || 'Guest'}</strong>
                <small>{user?.email || 'Tap for options'}</small>
              </div>
              <span className="sidebar-caret" aria-hidden="true">
                {isUserMenuOpen ? '▴' : '▾'}
              </span>
            </button>
            <div className="sidebar-user-menu" role="menu">
              <button type="button" className="sidebar-item small" onClick={handleSettings} role="menuitem">
                <SettingsIcon className="icon tiny" />
                Settings
              </button>
              <button type="button" className="sidebar-item small" onClick={handleLogout} role="menuitem">
                <LogoutIcon className="icon tiny" />
                Log out
              </button>
            </div>
          </div>
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
            <button
              type="button"
              className="header-icon-btn"
              onClick={handleMarketplace}
              aria-label="Go to marketplace"
            >
              <MarketplaceIcon className="icon" />
            </button>
            <button
              type="button"
              className="header-icon-btn has-badge"
              aria-label={notificationCount ? `${notificationCount} notifications` : 'Notifications'}
            >
              <BellIcon className="icon" />
              <span className={`header-badge ${notificationCount ? 'show' : ''}`}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </button>
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
