import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import SubscriptionStatusBadge from '../SubscriptionStatusBadge'
import ThemeToggle from '../ThemeToggle'
import { LogoutIcon } from '../Icons'

function Topbar({
  manufacturerName,
  isPremium = false,
  onCancelSubscription,
  cancellingSubscription = false,
  onLogout,
}) {
  const { t } = useTranslation()

  return (
    <header className="manufacturer-shell-topbar">
      <div>
        <p className="manufacturer-shell-eyebrow">{t('manufacturer.dashboardTitle')}</p>
        <h1>{manufacturerName || t('manufacturer.manufacturer')}</h1>
      </div>

      <div className="manufacturer-shell-topbar-actions">
        <LanguageSwitcher />
        <ThemeToggle />
        <div className="manufacturer-shell-user flex flex-col items-start gap-1">
          <span>{manufacturerName || t('manufacturer.manufacturer')}</span>
          <SubscriptionStatusBadge isPremium={isPremium} />
        </div>
        {isPremium ? (
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancelSubscription}
            disabled={cancellingSubscription}
          >
            {cancellingSubscription
              ? t('premium.cancelling', { defaultValue: 'Cancelling...' })
              : t('premium.cancelButton', { defaultValue: 'Cancel subscription' })}
          </button>
        ) : null}
        <button type="button" className="manufacturer-logout-btn" onClick={onLogout}>
          <LogoutIcon className="icon tiny" />
          {t('logout')}
        </button>
      </div>
    </header>
  )
}

export default Topbar
