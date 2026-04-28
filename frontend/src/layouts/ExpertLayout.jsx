import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardLayout from '../components/DashboardLayout'
import { HomeIcon, InvoiceIcon, ProjectIcon, QuoteIcon, SettingsIcon } from '../components/Icons'
import { EXPERT_ROUTES } from '../utils/roleRoutes'

function ExpertLayout({
  user,
  currentPath,
  onNavigate,
  onLogout,
  onCancelSubscription,
  cancellingSubscription = false,
  children,
}) {
  const { t } = useTranslation()

  const menuItems = useMemo(
    () => [
      {
        key: EXPERT_ROUTES.dashboard,
        label: t('expert.menu.overview'),
        subtitle: t('expert.menu.overviewSubtitle'),
        icon: HomeIcon,
      },
      {
        key: EXPERT_ROUTES.create,
        label: t('expert.menu.create'),
        subtitle: t('expert.menu.createSubtitle'),
        icon: ProjectIcon,
      },
      {
        key: EXPERT_ROUTES.projects,
        label: t('expert.menu.projects'),
        subtitle: t('expert.menu.projectsSubtitle'),
        icon: ProjectIcon,
      },
      {
        key: EXPERT_ROUTES.quotes,
        label: 'Quotes',
        subtitle: 'Validate requests',
        icon: QuoteIcon,
      },
      {
        key: EXPERT_ROUTES.invoices,
        label: 'Invoices',
        subtitle: 'Track purchases',
        icon: InvoiceIcon,
      },
      {
        key: EXPERT_ROUTES.settings,
        label: t('expert.menu.settings'),
        subtitle: t('expert.menu.settingsSubtitle'),
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
      settingsTarget={EXPERT_ROUTES.settings}
    >
      {children}
    </DashboardLayout>
  )
}

export default ExpertLayout
