import { LogoutIcon } from '../Icons'

function Topbar({ manufacturerName, onLogout }) {
  return (
    <header className="manufacturer-shell-topbar">
      <div>
        <p className="manufacturer-shell-eyebrow">Manufacturer Dashboard</p>
        <h1>{manufacturerName || 'Manufacturer'}</h1>
      </div>

      <div className="manufacturer-shell-topbar-actions">
        <div className="manufacturer-shell-user">
          <span>{manufacturerName || 'Manufacturer'}</span>
        </div>
        <button type="button" className="manufacturer-logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          Logout
        </button>
      </div>
    </header>
  )
}

export default Topbar
