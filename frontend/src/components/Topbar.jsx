import { LogoutIcon, MenuIcon, ShieldIcon } from './Icons'
import ThemeToggle from './ThemeToggle'
import { getInitials } from '../utils/adminDashboard'

function Topbar({ user, onLogout, onMenuToggle }) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open sidebar"
        >
          <MenuIcon className="icon" />
        </button>
        <div>
          <p className="admin-eyebrow">Control center</p>
          <h1 className="admin-page-title">Admin Dashboard</h1>
        </div>
      </div>

      <div className="admin-topbar-right">
        <ThemeToggle />
        <div className="admin-user-chip">
          <div className="admin-user-avatar">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user?.name || 'Admin'} />
            ) : (
              <span>{getInitials(user?.name)}</span>
            )}
          </div>
          <div>
            <strong>{user?.name || 'Admin user'}</strong>
            <small>
              <ShieldIcon className="icon tiny" />
              Administrator
            </small>
          </div>
        </div>

        <button type="button" className="admin-logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          Logout
        </button>
      </div>
    </header>
  )
}

export default Topbar
