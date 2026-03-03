import { useState } from 'react'
import SignInForm from './components/SignInForm'
import SignUpForm from './components/SignUpForm'
import ArtisanProfile from './components/ArtisanProfile'
import { LockIcon, UserIcon } from './components/Icons'
import './App.css'

function App() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('authUser')
    return raw ? JSON.parse(raw) : null
  })
  const [mode, setMode] = useState('signin')

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser)
    localStorage.setItem('authUser', JSON.stringify(loggedInUser))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('authUser')
    setMode('signin')
  }

  const handleProfileUpdate = (nextUser) => {
    setUser(nextUser)
    localStorage.setItem('authUser', JSON.stringify(nextUser))
  }

  if (user?.role === 'artisan') {
    return <ArtisanProfile user={user} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />
  }

  return (
    <>
      <div className="auth-toggle" role="tablist" aria-label="Authentication forms">
        <button
          type="button"
          className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => setMode('signin')}
          role="tab"
          aria-selected={mode === 'signin'}
        >
          <LockIcon className="icon tiny" />
          Sign In
        </button>
        <button
          type="button"
          className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => setMode('signup')}
          role="tab"
          aria-selected={mode === 'signup'}
        >
          <UserIcon className="icon tiny" />
          Sign Up
        </button>
      </div>

      {mode === 'signin' ? <SignInForm onLoginSuccess={handleLoginSuccess} /> : <SignUpForm />}
    </>
  )
}

export default App
