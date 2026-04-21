import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api, { withUserHeaders } from './api'
import ArtisanProfile from './components/ArtisanProfile'
import ExpertProfile from './components/ExpertProfile'
import ManufacturerProfile from './components/ManufacturerProfile'
import PremiumModal from './components/PremiumModal'
import LandingPage from './components/landing/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import SelectTradePage from './pages/SelectTradePage'
import './App.css'

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

  useEffect(() => {
    if (!premiumNotice.text) return undefined
    const timer = window.setTimeout(() => setPremiumNotice({ type: '', text: '' }), 3500)
    return () => window.clearTimeout(timer)
  }, [premiumNotice])

  const applyUserUpdate = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser)
    setUser(normalizedUser)
    persistUser(normalizedUser)
    return normalizedUser
  }

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
  }

  const handleLogout = () => {
    setUser(null)
    setPremiumPromptDismissed(false)
    setShowPremiumModal(false)
    localStorage.removeItem('authUser')
    sessionStorage.removeItem('authUser')
    setMode('signin')
    setNavOpen(false)
  }

  const handleProfileUpdate = (nextUser) => {
    const normalizedUser = normalizeUser(nextUser)
    setUser(normalizedUser)
    persistUser(normalizedUser)
  }

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

      try {
        if (subscriptionStatus === 'success' && sessionId) {
          const response = await api.post(
            '/payments/confirm-premium',
            { sessionId },
            withUserHeaders(user.id),
          )

          if (!active) return

          applyUserUpdate({ ...user, ...(response.data?.user || {}) })
          setShowPremiumModal(false)
          setPremiumNotice({
            type: 'success',
            text: response.data?.message || t('premium.upgradeSuccess'),
          })
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
  }, [t, user])

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

  let content = null

  if (user?.role === 'artisan' && !user?.trade) {
    content = <SelectTradePage user={user} onTradeSaved={handleProfileUpdate} onLogout={handleLogout} />
  } else if (user?.role === 'artisan') {
    content = (
      <ArtisanProfile
        user={user}
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
        onToggleNav={() => setNavOpen((prev) => !prev)}
        onSelectMode={(nextMode) => {
          setMode(nextMode)
          setNavOpen(false)
        }}
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

      {content}

      <PremiumModal
        isOpen={Boolean(showPremiumModal && user?.role === 'artisan' && !user.isPremium)}
        user={user}
        onClose={handleClosePremiumModal}
      />
    </>
  )
}

export default App
