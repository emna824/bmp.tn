import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import { LogoutIcon } from '../Icons'

function Topbar({ manufacturerName, onLogout }) {
  const { t } = useTranslation()

  return (
    <header className="manufacturer-shell-topbar">
      <div>
        <p className="manufacturer-shell-eyebrow">{t('manufacturer.dashboardTitle')}</p>
        <h1>{manufacturerName || t('manufacturer.manufacturer')}</h1>
      </div>

      <div className="manufacturer-shell-topbar-actions">
        <LanguageSwitcher />
        <div className="manufacturer-shell-user">
          <span>{manufacturerName || t('manufacturer.manufacturer')}</span>
        </div>
        <button type="button" className="manufacturer-logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          {t('logout')}
        </button>
      </div>
    </header>
  )
}

export default Topbar
