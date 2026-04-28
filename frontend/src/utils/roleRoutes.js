export const ARTISAN_ROUTES = {
  dashboard: '/artisan/dashboard',
  offers: '/artisan/offers',
  projects: '/artisan/projects',
  marketplace: '/artisan/marketplace',
  invoices: '/artisan/invoices',
  settings: '/artisan/settings',
}

export const EXPERT_ROUTES = {
  dashboard: '/expert/dashboard',
  create: '/expert/create',
  projects: '/expert/projects',
  quotes: '/expert/quotes',
  invoices: '/expert/invoices',
  settings: '/expert/settings',
}

export const MANUFACTURER_ROUTES = {
  dashboard: '/manufacturer/dashboard',
  products: '/manufacturer/products',
  addProduct: '/manufacturer/products/new',
  orders: '/manufacturer/orders',
  profile: '/manufacturer/profile',
}

export const ROLE_HOME_PATHS = {
  artisan: ARTISAN_ROUTES.dashboard,
  expert: EXPERT_ROUTES.dashboard,
  manufacturer: MANUFACTURER_ROUTES.dashboard,
}

const MANUFACTURER_EDIT_PRODUCT_PATTERN = /^\/manufacturer\/products\/([^/]+)\/edit\/?$/

export function getCurrentPath() {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname || '/'
}

export function getHomePathForRole(role) {
  return ROLE_HOME_PATHS[role] || '/'
}

export function navigateToPath(path, { replace = false } = {}) {
  if (typeof window === 'undefined' || !path) return

  const currentPath = window.location.pathname
  if (currentPath === path) return

  if (replace) {
    window.history.replaceState({}, document.title, path)
  } else {
    window.history.pushState({}, document.title, path)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function isRolePathAllowed(role, pathname) {
  if (!role) return false

  if (role === 'artisan') {
    return pathname.startsWith('/artisan/')
  }

  if (role === 'expert') {
    return pathname.startsWith('/expert/')
  }

  if (role === 'manufacturer') {
    return pathname.startsWith('/manufacturer/')
  }

  return false
}

export function resolveArtisanRoute(pathname) {
  if (pathname === ARTISAN_ROUTES.offers) return ARTISAN_ROUTES.offers
  if (pathname === ARTISAN_ROUTES.projects) return ARTISAN_ROUTES.projects
  if (pathname === ARTISAN_ROUTES.marketplace) return ARTISAN_ROUTES.marketplace
  if (pathname === ARTISAN_ROUTES.invoices) return ARTISAN_ROUTES.invoices
  if (pathname === ARTISAN_ROUTES.settings) return ARTISAN_ROUTES.settings
  return ARTISAN_ROUTES.dashboard
}

export function resolveExpertRoute(pathname) {
  if (pathname === EXPERT_ROUTES.create) return EXPERT_ROUTES.create
  if (pathname === EXPERT_ROUTES.projects) return EXPERT_ROUTES.projects
  if (pathname === EXPERT_ROUTES.quotes) return EXPERT_ROUTES.quotes
  if (pathname === EXPERT_ROUTES.invoices) return EXPERT_ROUTES.invoices
  if (pathname === EXPERT_ROUTES.settings) return EXPERT_ROUTES.settings
  return EXPERT_ROUTES.dashboard
}

export function extractManufacturerEditProductId(pathname) {
  const match = pathname.match(MANUFACTURER_EDIT_PRODUCT_PATTERN)
  return match?.[1] || ''
}

export function resolveManufacturerRoute(pathname) {
  if (pathname === MANUFACTURER_ROUTES.addProduct) return MANUFACTURER_ROUTES.addProduct
  if (pathname === MANUFACTURER_ROUTES.orders) return MANUFACTURER_ROUTES.orders
  if (pathname === MANUFACTURER_ROUTES.profile) return MANUFACTURER_ROUTES.profile
  if (extractManufacturerEditProductId(pathname)) return 'manufacturer-edit-product'
  if (pathname === MANUFACTURER_ROUTES.products) return MANUFACTURER_ROUTES.products
  return MANUFACTURER_ROUTES.dashboard
}

export function getManufacturerNavRoute(pathname) {
  const resolvedRoute = resolveManufacturerRoute(pathname)

  if (resolvedRoute === 'manufacturer-edit-product' || resolvedRoute === MANUFACTURER_ROUTES.addProduct) {
    return MANUFACTURER_ROUTES.products
  }

  return resolvedRoute
}
