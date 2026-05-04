import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'
import NotificationBell from './NotificationBell'
import { BrandMark, CloseIcon, LogoutIcon, MenuIcon, SearchIcon, SettingsIcon } from './Icons'

function getUserPlanLabel(user, t) {
  if (user?.role === 'artisan') {
    return user?.isPremium
      ? t('premium.premiumArtisanLabel', { defaultValue: 'Premium Artisan Plan' })
      : t('premium.standardArtisanLabel', { defaultValue: 'Standard Artisan Plan' })
  }

  if (user?.role === 'expert') {
    return t('expert.workspaceLabel', { defaultValue: 'Expert Workspace' })
  }

  if (user?.role === 'manufacturer') {
    return t('manufacturer.workspaceLabel', { defaultValue: 'Manufacturer Workspace' })
  }

  return t('dashboardUi.roleFallback', { defaultValue: 'Workspace' })
}

function DashboardLayout({
  user,
  menuItems,
  activeView,
  onNavigate,
  onLogout,
  onCancelSubscription,
  cancellingSubscription = false,
  settingsTarget = '',
  children,
}) {
  const { t } = useTranslation()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const menuRef = useRef(null)

  const userInitials = useMemo(() => {
    const raw = user?.name || t('common.guest')
    const parts = raw.trim().split(/\s+/).slice(0, 2)
    const letters = parts.map((part) => part.charAt(0).toUpperCase()).join('')
    return letters || 'U'
  }, [t, user?.name])

  const userPlanLabel = useMemo(() => getUserPlanLabel(user, t), [t, user])

  useEffect(() => {
    if (!isUserMenuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isUserMenuOpen])

  const handleNavigate = (key) => {
    onNavigate?.(key)
    setIsUserMenuOpen(false)
    setIsSidebarOpen(false)
  }

  const handleLogout = () => {
    setIsUserMenuOpen(false)
    onLogout?.()
  }

  const handleSettings = () => {
    const fallbackTarget = menuItems.find((item) => item.key === settingsTarget)?.key || settingsTarget || activeView
    handleNavigate(fallbackTarget)
  }

  return (
    <div className={`dashboard-shell ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        onClick={() => setIsSidebarOpen(false)}
        aria-label={t('common.close', { defaultValue: 'Close' })}
      />

      <aside className="dashboard-sidebar">
        <div className="sidebar-brand-row">
          <div className="sidebar-brand">
            <BrandMark className="sidebar-brand-mark" />
            <div className="sidebar-brand-copy">
              <strong>BMP</strong>
              <p>Industrial Elegance</p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label={t('common.close', { defaultValue: 'Close' })}
          >
            <CloseIcon className="icon tiny" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label={t('nav.dashboardSections', { defaultValue: 'Dashboard sections' })}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.key

            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavigate(item.key)}
              >
                <span className="sidebar-item-inner">
                  <span className="sidebar-item-icon">{Icon ? <Icon className="icon" /> : null}</span>
                  <span className="sidebar-item-copy">
                    <span>{item.label}</span>
                    {item.subtitle ? <small>{item.subtitle}</small> : null}
                  </span>
                </span>
              </button>
            )
          })}
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
          <div className="header-left">
            <button
              type="button"
              className="sidebar-burger-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t('nav.openMenu', { defaultValue: 'Open menu' })}
              aria-expanded={isSidebarOpen}
            >
              <MenuIcon className="icon" />
            </button>

            <label className="dashboard-search">
              <SearchIcon className="icon" />
              <input
                type="search"
                className="dashboard-search-input"
                placeholder={t('dashboardUi.searchPlaceholder', {
                  defaultValue: 'Search projects, quotes, invoices...',
                })}
                aria-label={t('dashboardUi.searchPlaceholder', {
                  defaultValue: 'Search projects, quotes, invoices...',
                })}
              />
            </label>
          </div>

          <div className="header-actions">
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationBell user={user} />

            <div ref={menuRef} className={`header-user ${isUserMenuOpen ? 'open' : ''}`}>
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
                  <small>{userPlanLabel}</small>
                </div>

                <span className="header-caret" aria-hidden="true">
                  {isUserMenuOpen ? '^' : 'v'}
                </span>
              </button>

              <div className="header-user-menu" role="menu">
                <button type="button" onClick={handleSettings} className="header-menu-item" role="menuitem">
                  <SettingsIcon className="icon tiny" />
                  {t('common.settings')}
                </button>

                {user?.role === 'artisan' && user?.isPremium ? (
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
