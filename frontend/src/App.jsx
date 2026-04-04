import { useState } from 'react'
import ArtisanProfile from './components/ArtisanProfile'
import ExpertProfile from './components/ExpertProfile'
import ManufacturerProfile from './components/ManufacturerProfile'
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
  }
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
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser')
    return raw ? normalizeUser(JSON.parse(raw)) : null
  })
  const [mode, setMode] = useState('signin')
  const [navOpen, setNavOpen] = useState(false)

  const handleLoginSuccess = (loggedInUser, staySignedIn = false) => {
    const normalizedUser = normalizeUser(loggedInUser)
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

  if (user?.role === 'artisan' && !user?.trade) {
    return <SelectTradePage user={user} onTradeSaved={handleProfileUpdate} onLogout={handleLogout} />
  }
  if (user?.role === 'artisan') {
    return <ArtisanProfile user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />
  }
  if (user?.role === 'expert') {
    return <ExpertProfile user={user} onLogout={handleLogout} />
  }
  if (user?.role === 'manufacturer') {
    return <ManufacturerProfile user={user} onLogout={handleLogout} />
  }
  if (user?.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  return (
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

export default App
