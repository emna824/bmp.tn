import { ARTISAN_ROUTES, EXPERT_ROUTES, MANUFACTURER_ROUTES } from './roleRoutes'

export const ASSISTANT_CLASSIFIER_PROMPT = `
Classify the user's message into one assistant intent.

Available intents:
- open_dashboard
- open_offers
- open_projects
- open_marketplace
- open_invoices
- open_settings
- open_calendar
- create_project
- open_quotes
- open_products
- add_product
- open_orders
- check_permissions
- smalltalk
- help
- unknown

Intent training examples for open_offers:
- offers
- show offers
- open offers
- available offers
- job opportunities
- missions
- chantier opportunities
- available projects

Return only the intent id.
`.trim()

export const ASSISTANT_INTENTS = {
  open_dashboard: {
    id: 'open_dashboard',
    keywords: ['dashboard', 'overview', 'home'],
  },
  open_offers: {
    id: 'open_offers',
    allowedRoles: ['artisan'],
    route: ARTISAN_ROUTES.offers,
    keywords: [
      'offer',
      'offers',
      'show offers',
      'open offers',
      'available offers',
      'job opportunities',
      'mission',
      'missions',
      'chantier opportunities',
      'available projects',
    ],
    loading: 'Searching available offers...',
    done: 'Opening available offers...',
    alreadyDone: 'Available offers are already open.',
    deniedByRole: {
      expert: 'Offers are only available for artisans.',
      manufacturer: 'You cannot access artisan offers.',
      admin: 'Offers are only available for artisans.',
      default: 'Offers are only available for artisans.',
    },
  },
  open_projects: {
    id: 'open_projects',
    keywords: ['project', 'projects', 'task', 'tasks', 'milestone', 'milestones', 'workspace'],
  },
  open_marketplace: {
    id: 'open_marketplace',
    keywords: ['marketplace', 'market', 'catalog', 'product', 'products', 'product catalog', 'materials', 'shop'],
  },
  open_invoices: {
    id: 'open_invoices',
    keywords: ['invoice', 'invoices', 'payment', 'payments', 'billing', 'bill'],
  },
  open_settings: {
    id: 'open_settings',
    keywords: ['settings', 'profile', 'account', 'password', 'security'],
  },
  open_calendar: {
    id: 'open_calendar',
    keywords: ['calendar', 'schedule', 'planning'],
  },
  create_project: {
    id: 'create_project',
    keywords: ['create project', 'new project', 'start project', 'solo project', 'launch project'],
  },
  open_quotes: {
    id: 'open_quotes',
    keywords: ['quote', 'quotes', 'requests'],
  },
  open_products: {
    id: 'open_products',
    keywords: ['product', 'products', 'catalog', 'marketplace', 'inventory', 'stock'],
  },
  add_product: {
    id: 'add_product',
    keywords: ['add product', 'new product', 'create product'],
  },
  open_orders: {
    id: 'open_orders',
    keywords: ['order', 'orders', 'purchase', 'purchases', 'sales'],
  },
  check_permissions: {
    id: 'check_permissions',
    keywords: ['premium', 'upgrade', 'subscription', 'plan', 'permission', 'permissions', 'access'],
  },
  smalltalk: {
    id: 'smalltalk',
    keywords: ['hello', 'hi', 'hey', 'salam'],
  },
  help: {
    id: 'help',
    keywords: ['help', 'what can you do', 'commands'],
  },
  unknown: {
    id: 'unknown',
    keywords: [],
  },
}

export const QUICK_ACTIONS = {
  artisan: ['Offers', 'Calendar', 'Projects', 'Marketplace', 'Invoices'],
  expert: ['New project', 'Projects', 'Quotes', 'Invoices'],
  manufacturer: ['Products', 'Add product', 'Orders', 'Profile'],
  admin: ['Dashboard', 'Reports', 'Users'],
}

const ROLE_ACTIONS = {
  artisan: {
    open_dashboard: {
      route: ARTISAN_ROUTES.dashboard,
      loading: 'Opening your dashboard...',
      done: 'Dashboard is ready.',
      alreadyDone: 'You are already on the dashboard.',
    },
    open_offers: {
      route: ARTISAN_ROUTES.offers,
      loading: ASSISTANT_INTENTS.open_offers.loading,
      done: ASSISTANT_INTENTS.open_offers.done,
      alreadyDone: ASSISTANT_INTENTS.open_offers.alreadyDone,
    },
    open_projects: {
      route: ARTISAN_ROUTES.projects,
      loading: 'Redirecting to projects...',
      done: 'Projects workspace is ready.',
      alreadyDone: 'You are already in projects.',
    },
    open_marketplace: {
      route: ARTISAN_ROUTES.marketplace,
      loading: 'Opening marketplace...',
      done: 'Marketplace is open.',
      alreadyDone: 'Marketplace is already open.',
    },
    open_invoices: {
      route: ARTISAN_ROUTES.invoices,
      loading: 'Opening invoices...',
      done: 'Invoices are ready.',
      alreadyDone: 'You are already viewing invoices.',
    },
    open_settings: {
      route: ARTISAN_ROUTES.settings,
      loading: 'Opening account settings...',
      done: 'Settings are open.',
      alreadyDone: 'Settings are already open.',
    },
  },
  expert: {
    open_dashboard: {
      route: EXPERT_ROUTES.dashboard,
      loading: 'Opening your dashboard...',
      done: 'Dashboard is ready.',
      alreadyDone: 'You are already on the dashboard.',
    },
    create_project: {
      route: EXPERT_ROUTES.create,
      loading: 'Opening project creation...',
      done: 'Project creation is ready.',
      alreadyDone: 'Project creation is already open.',
    },
    open_projects: {
      route: EXPERT_ROUTES.projects,
      loading: 'Redirecting to projects...',
      done: 'Projects workspace is ready.',
      alreadyDone: 'You are already in projects.',
    },
    open_quotes: {
      route: EXPERT_ROUTES.quotes,
      loading: 'Opening quotes...',
      done: 'Quotes are ready.',
      alreadyDone: 'Quotes are already open.',
    },
    open_invoices: {
      route: EXPERT_ROUTES.invoices,
      loading: 'Opening invoices...',
      done: 'Invoices are ready.',
      alreadyDone: 'You are already viewing invoices.',
    },
    open_settings: {
      route: EXPERT_ROUTES.settings,
      loading: 'Opening account settings...',
      done: 'Settings are open.',
      alreadyDone: 'Settings are already open.',
    },
  },
  manufacturer: {
    open_dashboard: {
      route: MANUFACTURER_ROUTES.dashboard,
      loading: 'Opening your dashboard...',
      done: 'Dashboard is ready.',
      alreadyDone: 'You are already on the dashboard.',
    },
    open_products: {
      route: MANUFACTURER_ROUTES.products,
      loading: 'Opening products...',
      done: 'Product catalog is ready.',
      alreadyDone: 'Products are already open.',
    },
    add_product: {
      route: MANUFACTURER_ROUTES.addProduct,
      loading: 'Opening product form...',
      done: 'Product form is ready.',
      alreadyDone: 'Product form is already open.',
    },
    open_orders: {
      route: MANUFACTURER_ROUTES.orders,
      loading: 'Opening orders...',
      done: 'Orders are ready.',
      alreadyDone: 'Orders are already open.',
    },
    open_settings: {
      route: MANUFACTURER_ROUTES.profile,
      loading: 'Opening profile settings...',
      done: 'Profile settings are open.',
      alreadyDone: 'Profile settings are already open.',
    },
  },
}

export function normalizeAssistantText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function textHasKeyword(text, keywords = []) {
  return keywords.some((keyword) => text.includes(keyword))
}

function getFirstName(user) {
  return String(user?.name || '').trim().split(/\s+/)[0] || 'there'
}

function buildPermissionAction(user, onDoneText = '') {
  return {
    id: 'premium-permissions',
    type: 'modal',
    loading: 'Checking permissions...',
    done:
      onDoneText ||
      (user?.isPremium
        ? 'Premium access is active on your workspace.'
        : 'Premium access details are open.'),
  }
}

function buildDeniedAction(intent, role) {
  return {
    id: `${intent.id}-denied`,
    type: 'denied',
    loading: 'Checking permissions...',
    done: intent.deniedByRole?.[role] || intent.deniedByRole?.default || 'You cannot access this area.',
  }
}

export function classifyAssistantIntent(rawText, role = '') {
  const text = normalizeAssistantText(rawText)

  if (!text) {
    return ASSISTANT_INTENTS.unknown.id
  }

  if (textHasKeyword(text, ASSISTANT_INTENTS.open_offers.keywords)) {
    return ASSISTANT_INTENTS.open_offers.id
  }

  if (role === 'manufacturer') {
    if (textHasKeyword(text, ASSISTANT_INTENTS.add_product.keywords)) {
      return ASSISTANT_INTENTS.add_product.id
    }

    if (
      textHasKeyword(text, ASSISTANT_INTENTS.open_products.keywords) ||
      textHasKeyword(text, ASSISTANT_INTENTS.open_marketplace.keywords)
    ) {
      return ASSISTANT_INTENTS.open_products.id
    }
  }

  if (role === 'artisan' && textHasKeyword(text, ASSISTANT_INTENTS.open_marketplace.keywords)) {
    return ASSISTANT_INTENTS.open_marketplace.id
  }

  const matchedIntent = Object.values(ASSISTANT_INTENTS).find((intent) => {
    if (intent.id === ASSISTANT_INTENTS.open_offers.id) return false
    return textHasKeyword(text, intent.keywords)
  })

  return matchedIntent?.id || ASSISTANT_INTENTS.unknown.id
}

export function validateAssistantPermission(intentId, user) {
  const intent = ASSISTANT_INTENTS[intentId]
  if (!intent?.allowedRoles?.length) {
    return { allowed: true }
  }

  const role = user?.role || ''
  if (intent.allowedRoles.includes(role)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    message: intent.deniedByRole?.[role] || intent.deniedByRole?.default || 'You cannot access this area.',
  }
}

export function resolveAssistantAction(rawText, user) {
  const role = user?.role || ''
  const intentId = classifyAssistantIntent(rawText, role)

  if (!role) {
    return null
  }

  if (intentId === ASSISTANT_INTENTS.smalltalk.id) {
    return {
      id: 'smalltalk',
      type: 'reply',
      done: `Hi ${getFirstName(user)}. I am online and ready.`,
    }
  }

  if (intentId === ASSISTANT_INTENTS.help.id) {
    const actions = QUICK_ACTIONS[role] || ['Dashboard', 'Projects', 'Settings']
    return {
      id: 'help',
      type: 'reply',
      done: `I can open ${actions.join(', ')}.`,
    }
  }

  if (role === 'admin') {
    if (
      intentId === ASSISTANT_INTENTS.open_dashboard.id ||
      textHasKeyword(normalizeAssistantText(rawText), ['report', 'reports', 'user', 'users'])
    ) {
      return {
        id: 'admin-dashboard',
        type: 'noop',
        loading: 'Opening your admin workspace...',
        done: 'Admin workspace is ready.',
      }
    }

    if (intentId === ASSISTANT_INTENTS.open_offers.id) {
      return buildDeniedAction(ASSISTANT_INTENTS.open_offers, role)
    }

    return null
  }

  if (intentId === ASSISTANT_INTENTS.open_offers.id) {
    const permission = validateAssistantPermission(intentId, user)
    if (!permission.allowed) {
      return buildDeniedAction(ASSISTANT_INTENTS.open_offers, role)
    }
  }

  if (role === 'artisan' && intentId === ASSISTANT_INTENTS.open_calendar.id) {
    if (!user?.isPremium) {
      return buildPermissionAction(user, 'Calendar access is a premium feature. I opened the upgrade dialog.')
    }

    return {
      id: 'artisan-calendar',
      route: ARTISAN_ROUTES.projects,
      eventAction: 'artisan-open-calendar',
      loading: 'Opening your calendar...',
      done: 'Calendar view is open.',
      alreadyDone: 'Calendar view is open.',
    }
  }

  if (role === 'artisan' && intentId === ASSISTANT_INTENTS.create_project.id) {
    if (!user?.isPremium) {
      return buildPermissionAction(user, 'Project creation needs premium access. I opened the upgrade dialog.')
    }

    return {
      id: 'artisan-create-project',
      route: ARTISAN_ROUTES.projects,
      eventAction: 'artisan-open-create-project',
      loading: 'Checking permissions...',
      done: 'Project creation is ready.',
    }
  }

  if (intentId === ASSISTANT_INTENTS.check_permissions.id) {
    return buildPermissionAction(user)
  }

  const roleAction = ROLE_ACTIONS[role]?.[intentId]
  if (roleAction) {
    return {
      id: `${role}-${intentId}`,
      ...roleAction,
    }
  }

  if (intentId === ASSISTANT_INTENTS.open_offers.id) {
    return buildDeniedAction(ASSISTANT_INTENTS.open_offers, role)
  }

  return null
}

export function getFallbackReply(rawText, user) {
  const intentId = classifyAssistantIntent(rawText, user?.role || '')

  if (intentId === ASSISTANT_INTENTS.smalltalk.id || intentId === ASSISTANT_INTENTS.help.id) {
    return resolveAssistantAction(rawText, user)?.done || ''
  }

  return 'I can help with workspace navigation, project actions, invoices, settings, and premium checks.'
}
