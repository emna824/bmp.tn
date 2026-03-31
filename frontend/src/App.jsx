import { useState } from 'react'
import SignInForm from './components/SignInForm'
import SignUpForm from './components/SignUpForm'
import ArtisanProfile from './components/ArtisanProfile'
import ExpertProfile from './components/ExpertProfile'
import ManufacturerProfile from './components/ManufacturerProfile'
import { BmpLogo, LockIcon, UserIcon } from './components/Icons'
import './App.css'

function App() {
  const [user, setUser] = useState(() => {
    const raw =
      localStorage.getItem('authUser') ||
      sessionStorage.getItem('authUser')
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

  return (
    <div className="home-page-shell">
      <header className={`home-navbar ${navOpen ? 'open' : ''}`}>
        <div className="nav-brand">
          <BmpLogo className="nav-logo" />
          <strong>BMP.tn</strong>
        </div>
        <button
          type="button"
          className="nav-burger"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`nav-links ${navOpen ? 'show' : ''}`} aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#auth">Access</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className={`nav-actions ${navOpen ? 'show' : ''}`}>
          <button type="button" className="secondary-btn nav-btn" onClick={() => setMode('signin')}>
            Sign In
          </button>
          <button type="button" className="nav-btn" onClick={() => setMode('signup')}>
            Sign Up
          </button>
        </div>
      </header>

      <div className="home-page">
        <section className="home-hero" id="about">
        <div className="hero-brand">
          <BmpLogo className="hero-logo" />
          <strong>BMP.tn</strong>
        </div>
        <h1>The digital platform for construction in Tunisia</h1>
        <p>
          Connect experts, artisans, and manufacturers in one workspace to manage construction
          sites, share technical documents, and collaborate faster.
        </p>
        <div className="hero-tags">
          <span>Construction Sites</span>
          <span>Marketplace</span>
          <span>Professional Collaboration</span>
        </div>
        <figure className="hero-photo-frame">
          <img
            className="hero-photo"
            src="https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Construction site with cranes and workers"
            loading="lazy"
          />
        </figure>
      </section>

      <section className="home-auth-panel" id="auth">
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

        {mode === 'signin' ? (
          <SignInForm onLoginSuccess={handleLoginSuccess} />
        ) : (
          <SignUpForm onRegisterSuccess={() => setMode('signin')} />
        )}
      </section>
      </div>

      <footer className="home-footer" id="contact">
        <p>© {new Date().getFullYear()} BMP.tn. All rights reserved.</p>
        <p>Built for experts, artisans, and manufacturers.</p>
      </footer>
    </div>
  )
}

export default App
