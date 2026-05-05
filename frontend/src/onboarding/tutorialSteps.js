import { ARTISAN_ROUTES } from '../utils/roleRoutes'

export const ARTISAN_TUTORIAL_STORAGE_KEY = 'bmp:onboarding:artisan:completed'

export const artisanTutorialSteps = [
  {
    target: '[data-tour="artisan-overview"]',
    title: 'Dashboard overview',
    content: 'See your workspace activity, project status, offers, marketplace updates, and plan details in one place.',
    placement: 'bottom',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-projects-panel"]',
    title: 'Projects',
    content: 'This section allows you to manage your active construction projects and daily work.',
    placement: 'right',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-marketplace-panel"]',
    title: 'Marketplace',
    content: 'Browse products from manufacturers and find materials for your projects.',
    placement: 'right',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-quotes-panel"]',
    title: 'Quotes',
    content: 'Review open offers and submit your proposed daily salary for matching opportunities.',
    placement: 'right',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-invoices-nav"]',
    title: 'Invoices',
    content: 'Use invoices to review project purchases and keep payment records organized.',
    placement: 'right',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-calendar"]',
    title: 'Calendar',
    content: 'Plan deadlines, schedules, and work logs from the project workspace.',
    placement: 'top',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-assistant"]',
    title: 'AI assistant',
    content: 'Ask the assistant for help or use quick actions to move around the platform faster.',
    placement: 'left',
    route: ARTISAN_ROUTES.dashboard,
  },
  {
    target: '[data-tour="artisan-premium"]',
    title: 'Premium features',
    content: 'Premium unlocks advanced tools like solo projects, calendar access, and richer project management.',
    placement: 'left',
    route: ARTISAN_ROUTES.dashboard,
  },
]

export function markArtisanTutorialCompleted() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ARTISAN_TUTORIAL_STORAGE_KEY, 'true')
}

export function resetArtisanTutorialCompletion() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ARTISAN_TUTORIAL_STORAGE_KEY)
}
