import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import SubscriptionStatusBadge from './SubscriptionStatusBadge'
import ThemeToggle from './ThemeToggle'
import { BmpLogo, LogoutIcon, SettingsIcon } from './Icons'
import NotificationBell from './NotificationBell'

function DashboardLayout({
  user,
  menuItems,
  activeView,
  onNavigate,
  onLogout,
  onCancelSubscription,
  cancellingSubscription = false,
  children,
}) {
  const { t } = useTranslation()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const userInitials = useMemo(() => {
    const raw = user?.name || t('common.guest')
    const parts = raw.trim().split(/\s+/).slice(0, 2)
    const letters = parts.map((part) => part.charAt(0).toUpperCase()).join('')
    return letters || 'U'
  }, [t, user?.name])

  const handleNavigate = (key) => {
    onNavigate(key)
    setIsUserMenuOpen(false)
  }

  const handleLogout = () => {
    setIsUserMenuOpen(false)
    onLogout()
  }

  const handleSettings = () => {
    handleNavigate('settings')
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <BmpLogo className="sidebar-brand-icon" />
          <div>
            <strong>BMP.tn</strong>
            <p>{t('dashboardUi.constructionPlatform')}</p>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label={t('nav.dashboardSections')}>
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
            {t('logout')}
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left" />
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell user={user} />
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
                  <strong>{user?.name || t('common.guest')}</strong>
                  <small>{(user?.role || t('dashboardUi.roleFallback')).toUpperCase()}</small>
                  <SubscriptionStatusBadge isPremium={user?.isPremium} />
                </div>
                <span className="header-caret" aria-hidden="true">
                  {isUserMenuOpen ? '▴' : '▾'}
                </span>
              </button>
              <div className="header-user-menu" role="menu">
                <button type="button" onClick={handleSettings} className="header-menu-item" role="menuitem">
                  <SettingsIcon className="icon tiny" />
                  {t('common.settings')}
                </button>
                {user?.isPremium ? (
                  <button
                    type="button"
                    onClick={onCancelSubscription}
                    className="header-menu-item"
                    role="menuitem"
                    disabled={cancellingSubscription}
                  >
                    <SettingsIcon className="icon tiny" />
                    {cancellingSubscription
                      ? t('premium.cancelling', { defaultValue: 'Cancelling...' })
                      : t('premium.cancelButton', { defaultValue: 'Cancel subscription' })}
                  </button>
                ) : null}
                <button type="button" onClick={handleLogout} className="header-menu-item" role="menuitem">
                  <LogoutIcon className="icon tiny" />
                  {t('logout')}
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
