import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import { LogoutIcon, ShieldIcon } from './Icons'
import { getInitials } from '../utils/adminDashboard'
import { getSafeImageSrc } from '../utils/safeImageSrc'

function Topbar({ user, onLogout }) {
  const { t } = useTranslation()
  const avatarSrc = getSafeImageSrc(user?.profileImage)

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <div>
          <p className="admin-eyebrow">{t('admin.controlCenter')}</p>
          <h1 className="admin-page-title">{t('admin.dashboardTitle')}</h1>
        </div>
      </div>

      <div className="admin-topbar-right">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="admin-user-chip">
          <div className="admin-user-avatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name || t('admin.adminUser')} loading="lazy" decoding="async" />
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
