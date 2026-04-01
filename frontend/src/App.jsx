import { useState } from 'react'
import ArtisanProfile from './components/ArtisanProfile'
import ExpertProfile from './components/ExpertProfile'
import ManufacturerProfile from './components/ManufacturerProfile'
import LandingPage from './components/landing/LandingPage'
import AdminDashboard from './pages/AdminDashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser')
    return raw ? JSON.parse(raw) : null
  })
  const [mode, setMode] = useState('signin')
  const [navOpen, setNavOpen] = useState(false)

  const handleLoginSuccess = (loggedInUser, staySignedIn = false) => {
    setUser(loggedInUser)
    if (staySignedIn) {
      localStorage.setItem('authUser', JSON.stringify(loggedInUser))
      sessionStorage.removeItem('authUser')
    } else {
      sessionStorage.setItem('authUser', JSON.stringify(loggedInUser))
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
    setUser(nextUser)
    localStorage.setItem('authUser', JSON.stringify(nextUser))
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
