import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { LogoutIcon, MenuIcon, ShieldIcon } from './Icons'
import { getInitials } from '../utils/adminDashboard'

function Topbar({ user, onLogout, onMenuToggle }) {
  const { t } = useTranslation()

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-menu-btn"
          onClick={onMenuToggle}
          aria-label={t('nav.openSidebar')}
        >
          <MenuIcon className="icon" />
        </button>
        <div>
          <p className="admin-eyebrow">{t('admin.controlCenter')}</p>
          <h1 className="admin-page-title">{t('admin.dashboardTitle')}</h1>
        </div>
      </div>

      <div className="admin-topbar-right">
        <LanguageSwitcher />
        <div className="admin-user-chip">
          <div className="admin-user-avatar">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user?.name || t('admin.adminUser')} />
            ) : (
              <span>{getInitials(user?.name)}</span>
            )}
          </div>
          <div>
            <strong>{user?.name || t('admin.adminUser')}</strong>
            <small>
              <ShieldIcon className="icon tiny" />
              {t('admin.administrator')}
            </small>
          </div>
        </div>

        <button type="button" className="admin-logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          {t('logout')}
        </button>
      </div>
    </header>
  )
}

export default Topbar
