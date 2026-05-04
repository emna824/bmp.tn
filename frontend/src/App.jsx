import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from './api'
import { getCurrentPath, getHomePathForRole, isRolePathAllowed, navigateToPath } from './utils/roleRoutes'
import PremiumAssistantGate from './components/PremiumAssistantGate'
import './App.css'

const ArtisanProfile = lazy(() => import('./components/ArtisanProfile'))
const ExpertProfile = lazy(() => import('./components/ExpertProfile'))
const ManufacturerProfile = lazy(() => import('./components/ManufacturerProfile'))
const PremiumModal = lazy(() => import('./components/PremiumModal'))
const PremiumAssistant = lazy(() => import('./components/PremiumAssistant'))
const LandingPage = lazy(() => import('./components/landing/LandingPage'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const SelectTradePage = lazy(() => import('./pages/SelectTradePage'))

function normalizeUser(user) {
  if (!user) return null

  const trade = String(user.trade || user.job || '').trim().toLowerCase()
  const job =
    String(user.job || '').trim() ||
    (trade ? trade.charAt(0).toUpperCase() + trade.slice(1) : '')

  return {
    ...user,
    trade,
    job,
    isPremium: Boolean(user.isPremium),
    subscriptionType: user.subscriptionType || null,
  }
}

function shouldPromptForPremium(user) {
  return Boolean(user && user.role === 'artisan' && !user.isPremium)
}

function persistUser(nextUser) {
  const serialized = JSON.stringify(nextUser)

  if (localStorage.getItem('authUser')) {
    localStorage.setItem('authUser', serialized)
    return
  }

  if (sessionStorage.getItem('authUser')) {
    sessionStorage.setItem('authUser', serialized)
    return
  }

  sessionStorage.setItem('authUser', serialized)
}

function App() {
  const { t } = useTranslation()
  const [currentPath, setCurrentPath] = useState(() => getCurrentPath())
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser')
    return raw ? normalizeUser(JSON.parse(raw)) : null
  })
  const [mode, setMode] = useState('signin')
  const [navOpen, setNavOpen] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [processingPremium, setProcessingPremium] = useState(false)
  const [premiumPromptDismissed, setPremiumPromptDismissed] = useState(false)
  const [cancellingPremium, setCancellingPremium] = useState(false)
  const [premiumNotice, setPremiumNotice] = useState({ type: '', text: '' })
  const [assistantBundleLoaded, setAssistantBundleLoaded] = useState(false)

  const applyUserUpdate = useCallback((nextUser) => {
    const normalizedUser = normalizeUser(nextUser)
    setUser(normalizedUser)
    persistUser(normalizedUser)
    return normalizedUser
  }, [])

  const refreshCurrentUser = useCallback(async (userId) => {
    if (!userId) return null

    const response = await api.get(`/users/${userId}/profile`, { skipApiCache: true })
    const refreshedUser = response.data?.user ? applyUserUpdate(response.data.user) : null

    if (refreshedUser?.role !== 'artisan') {
      return refreshedUser
    }

    try {
      const subscriptionResponse = await api.get(
        '/payments/subscription-status',
        { ...withUserHeaders(refreshedUser.id), skipApiCache: true },
      )
      if (subscriptionResponse.data?.user) {
        return applyUserUpdate(subscriptionResponse.data.user)
      }
    } catch (error) {
      console.warn('[premium] subscription status refresh failed', error)
    }

    return refreshedUser
  }, [applyUserUpdate])

  useEffect(() => {
    if (!premiumNotice.text) return undefined
    const timer = window.setTimeout(() => setPremiumNotice({ type: '', text: '' }), 3500)
    return () => window.clearTimeout(timer)
  }, [premiumNotice])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handlePopState = () => {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!user?.role || user.role === 'admin') return

    if (!isRolePathAllowed(user.role, currentPath)) {
      navigateToPath(getHomePathForRole(user.role), { replace: true })
    }
  }, [currentPath, user?.role])

  const handleLoginSuccess = (loggedInUser, staySignedIn = false) => {
    const normalizedUser = normalizeUser(loggedInUser)
    setPremiumPromptDismissed(false)
    setUser(normalizedUser)
    if (staySignedIn) {
      localStorage.setItem('authUser', JSON.stringify(normalizedUser))
      sessionStorage.removeItem('authUser')
    } else {
      sessionStorage.setItem('authUser', JSON.stringify(normalizedUser))
      localStorage.removeItem('authUser')
    }

    if (normalizedUser?.role && normalizedUser.role !== 'admin') {
      navigateToPath(getHomePathForRole(normalizedUser.role), { replace: true })
    }
  }

  const handleLogout = () => {
    setUser(null)
    setPremiumPromptDismissed(false)
    setShowPremiumModal(false)
    localStorage.removeItem('authUser')
    sessionStorage.removeItem('authUser')
    setMode('signin')
    setNavOpen(false)
    navigateToPath('/', { replace: true })
  }

  const handleProfileUpdate = (nextUser) => {
    applyUserUpdate(nextUser)
  }

  const handleToggleNav = useCallback(() => {
    setNavOpen((prev) => !prev)
  }, [])

  const handleSelectMode = useCallback((nextMode) => {
    setMode(nextMode)
    setNavOpen(false)
  }, [])

  const handleOpenPremiumModal = () => {
    setPremiumPromptDismissed(false)
    setShowPremiumModal(true)
  }

  const handleClosePremiumModal = () => {
    setPremiumPromptDismissed(true)
    setShowPremiumModal(false)
  }

  const handleCancelPremium = async () => {
    if (!user?.id) return

    const confirmed = window.confirm(
      t('premium.cancelConfirm', {
        defaultValue: 'Are you sure you want to cancel your premium subscription now?',
      }),
    )

    if (!confirmed) return

    setCancellingPremium(true)

    try {
      const response = await api.post('/payments/cancel-premium', {}, withUserHeaders(user.id))
      applyUserUpdate({ ...user, ...(response.data?.user || {}) })
      setPremiumPromptDismissed(true)
      setShowPremiumModal(false)
      setPremiumNotice({
        type: 'success',
        text: response.data?.message || t('premium.cancelSuccess'),
      })
    } catch (error) {
      setPremiumNotice({
        type: 'error',
        text: error.response?.data?.message || t('premium.cancelFailed'),
      })
    } finally {
      setCancellingPremium(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return undefined

    const url = new URL(window.location.href)
    const subscriptionStatus = url.searchParams.get('subscription')
    const sessionId = url.searchParams.get('session_id')

    if (!subscriptionStatus) {
      return undefined
    }

    let active = true

    const clearSubscriptionParams = () => {
      url.searchParams.delete('subscription')
      url.searchParams.delete('subscriptionType')
      url.searchParams.delete('session_id')
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
    }

    const confirmPremium = async () => {
      setProcessingPremium(true)
      console.info('[premium] checkout return detected', {
        subscriptionStatus,
        hasSessionId: Boolean(sessionId),
      })

      try {
        if (subscriptionStatus === 'success' && sessionId) {
          console.info('[premium] confirming checkout session', { sessionId })
          const response = await api.post(
            '/payments/confirm-premium',
            { sessionId },
            withUserHeaders(user.id),
          )

          if (!active) return

          if (response.data?.user) {
            applyUserUpdate(response.data.user)
          }
          await refreshCurrentUser(user.id)
          setShowPremiumModal(false)
          setPremiumNotice({
            type: 'success',
            text: response.data?.message || t('premium.upgradeSuccess'),
          })
        } else if (subscriptionStatus === 'success') {
          throw new Error('Stripe returned without a checkout session id. Please contact support if payment was charged.')
        } else if (subscriptionStatus === 'cancelled') {
          if (!active) return
          setPremiumPromptDismissed(true)
          setShowPremiumModal(false)
          setPremiumNotice({
            type: 'error',
            text: t('premium.checkoutCancelled'),
          })
        }
      } catch (error) {
        console.error('[premium] checkout confirmation failed', error)
        if (!active) return
        setShowPremiumModal(true)
        setPremiumNotice({
          type: 'error',
          text: error.response?.data?.message || t('premium.confirmationFailed'),
        })
      } finally {
        clearSubscriptionParams()
        if (active) {
          setProcessingPremium(false)
        }
      }
    }

    confirmPremium()

    return () => {
      active = false
    }
  }, [applyUserUpdate, refreshCurrentUser, t, user?.id])

  useEffect(() => {
    if (processingPremium) return

    if (shouldPromptForPremium(user) && !premiumPromptDismissed) {
      setShowPremiumModal(true)
      return
    }

    if (user?.isPremium || premiumPromptDismissed || !user) {
      setShowPremiumModal(false)
    }
  }, [premiumPromptDismissed, processingPremium, user])

  useEffect(() => {
    if (!user?.id) return undefined

    const refreshUser = async () => {
      try {
        await refreshCurrentUser(user.id)
      } catch (error) {
        console.warn('[premium] profile refresh failed', error)
        // Keep the stored session usable if the profile refresh is temporarily unavailable.
      }
    }

    refreshUser()
  }, [refreshCurrentUser, user?.id])

  const shouldShowAssistant = useMemo(
    () => Boolean(user?.role && !(user.role === 'artisan' && !user.trade)),
    [user?.role, user?.trade],
  )

  useEffect(() => {
    if (!shouldShowAssistant) {
      setAssistantBundleLoaded(false)
    }
  }, [shouldShowAssistant])

  let content = null

  if (user?.role === 'artisan' && !user?.trade) {
    content = (
      <SelectTradePage
        user={user}
        onTradeSaved={(nextUser) => {
          handleProfileUpdate(nextUser)
          navigateToPath(getHomePathForRole('artisan'), { replace: true })
        }}
        onLogout={handleLogout}
      />
    )
  } else if (user?.role === 'artisan') {
    content = (
      <ArtisanProfile
        user={user}
        currentPath={currentPath}
        onNavigate={navigateToPath}
        isPremium={Boolean(user?.isPremium)}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onCancelSubscription={handleCancelPremium}
        cancellingSubscription={cancellingPremium}
        onRequirePremium={handleOpenPremiumModal}
      />
    )
  } else if (user?.role === 'expert') {
    content = (
      <ExpertProfile
        user={user}
        currentPath={currentPath}
        onNavigate={navigateToPath}
        isPremium={Boolean(user?.isPremium)}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onCancelSubscription={handleCancelPremium}
        cancellingSubscription={cancellingPremium}
        onRequirePremium={handleOpenPremiumModal}
      />
    )
  } else if (user?.role === 'manufacturer') {
    content = (
      <ManufacturerProfile
        user={user}
        currentPath={currentPath}
        onNavigate={navigateToPath}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onCancelSubscription={handleCancelPremium}
        cancellingSubscription={cancellingPremium}
      />
    )
  } else if (user?.role === 'admin') {
    content = <AdminDashboard user={user} onLogout={handleLogout} />
  } else {
    content = (
      <LandingPage
        mode={mode}
        navOpen={navOpen}
        onToggleNav={handleToggleNav}
        onSelectMode={handleSelectMode}
        onLoginSuccess={handleLoginSuccess}
      />
    )
  }

  return (
    <>
      {premiumNotice.text ? (
        <div
          className={`fixed right-4 top-4 z-[130] rounded-2xl px-4 py-3 text-sm font-medium shadow-xl transition-all duration-300 ${
            premiumNotice.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          }`}
          role="status"
          aria-live="polite"
        >
          {premiumNotice.text}
        </div>
      ) : null}

      <Suspense fallback={null}>{content}</Suspense>

      {shouldShowAssistant && !assistantBundleLoaded ? (
        <PremiumAssistantGate onActivate={() => setAssistantBundleLoaded(true)} />
      ) : null}

      {shouldShowAssistant && assistantBundleLoaded ? (
        <Suspense fallback={null}>
          <PremiumAssistant
            user={user}
            currentPath={currentPath}
            onNavigate={navigateToPath}
            onRequirePremium={handleOpenPremiumModal}
            defaultOpen
          />
        </Suspense>
      ) : null}

      {showPremiumModal && user?.role === 'artisan' && !user.isPremium ? (
        <Suspense fallback={null}>
          <PremiumModal isOpen onClose={handleClosePremiumModal} user={user} />
        </Suspense>
      ) : null}

    </>
  )
}

export default App
