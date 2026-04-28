import { useMemo } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { HomeIcon, InvoiceIcon, MarketplaceIcon, UserIcon } from '../components/Icons'
import { MANUFACTURER_ROUTES } from '../utils/roleRoutes'

function ManufacturerLayout({
  user,
  activePath,
  onNavigate,
  onLogout,
  onCancelSubscription,
  cancellingSubscription = false,
  children,
}) {
  const menuItems = useMemo(
    () => [
      {
        key: MANUFACTURER_ROUTES.dashboard,
        label: 'Dashboard',
        subtitle: 'Overview',
        icon: HomeIcon,
      },
      {
        key: MANUFACTURER_ROUTES.products,
        label: 'Products',
        subtitle: 'Catalog',
        icon: MarketplaceIcon,
      },
      {
        key: MANUFACTURER_ROUTES.orders,
        label: 'Orders',
        subtitle: 'Operations',
        icon: InvoiceIcon,
      },
      {
        key: MANUFACTURER_ROUTES.profile,
        label: 'Profile',
        subtitle: 'Workspace',
        icon: UserIcon,
      },
    ],
    [],
  )

  return (
    <DashboardLayout
      user={user}
      menuItems={menuItems}
      activeView={activePath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onCancelSubscription={onCancelSubscription}
      cancellingSubscription={cancellingSubscription}
      settingsTarget={MANUFACTURER_ROUTES.profile}
    >
      {children}
    </DashboardLayout>
  )
}

export default ManufacturerLayout
