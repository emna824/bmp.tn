import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../components/DashboardLayout'
import { HomeIcon, InvoiceIcon, MarketplaceIcon, ProjectIcon, QuoteIcon, SettingsIcon } from '../components/Icons'
import { ARTISAN_ROUTES } from '../utils/roleRoutes'

function ArtisanLayout({
  user,
  currentPath,
  onNavigate,
  onLogout,
  onCancelSubscription,
  cancellingSubscription = false,
  onStartGuide,
  children,
}) {
  const { t } = useTranslation()

  const menuItems = useMemo(
    () => [
      {
        key: ARTISAN_ROUTES.dashboard,
        label: t('artisan.menu.overview'),
        subtitle: t('artisan.menu.overviewSubtitle'),
        icon: HomeIcon,
      },
      {
        key: ARTISAN_ROUTES.offers,
        label: t('artisan.menu.offers'),
        subtitle: t('artisan.menu.offersSubtitle'),
        icon: QuoteIcon,
      },
      {
        key: ARTISAN_ROUTES.projects,
        label: t('artisan.menu.projects'),
        subtitle: t('artisan.menu.projectsSubtitle'),
        icon: ProjectIcon,
      },
      {
        key: ARTISAN_ROUTES.marketplace,
        label: 'Marketplace',
        subtitle: 'Browse manufacturers',
        icon: MarketplaceIcon,
      },
      {
        key: ARTISAN_ROUTES.invoices,
        label: 'Invoices',
        subtitle: 'Track purchases',
        icon: InvoiceIcon,
      },
      {
        key: ARTISAN_ROUTES.settings,
        label: t('artisan.menu.settings'),
        subtitle: t('artisan.menu.settingsSubtitle'),
        icon: SettingsIcon,
      },
    ],
    [t],
  )

  return (
    <DashboardLayout
      user={user}
      menuItems={menuItems}
      activeView={currentPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCancelSubscription={onCancelSubscription}
      cancellingSubscription={cancellingSubscription}
      onStartGuide={onStartGuide}
      settingsTarget={ARTISAN_ROUTES.settings}
    >
      {children}
    </DashboardLayout>
  )
}

export default ArtisanLayout
