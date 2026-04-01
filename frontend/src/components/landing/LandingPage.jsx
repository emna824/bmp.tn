import SignInForm from '../SignInForm'
import SignUpForm from '../SignUpForm'
import { BmpLogo, LockIcon, UserIcon } from '../Icons'
import LandingActors from './LandingActors'
import LandingFeatures from './LandingFeatures'
import LandingFooter from './LandingFooter'
import LandingHero from './LandingHero'
import LandingHowItWorks from './LandingHowItWorks'

function scrollToSection(sectionId) {
  if (typeof document === 'undefined') return
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function LandingPage({ mode, navOpen, onToggleNav, onSelectMode, onLoginSuccess }) {
  const handleModeChange = (nextMode) => {
    onSelectMode(nextMode)
    scrollToSection('auth')
  }

  return (
    <div className="landing-shell">
      <header className={`landing-navbar ${navOpen ? 'open' : ''}`}>
        <div className="landing-nav-brand">
          <BmpLogo className="landing-nav-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>Construction operations platform</p>
          </div>
        </div>

        <button
          type="button"
          className="landing-nav-burger"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={onToggleNav}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`landing-nav-links ${navOpen ? 'show' : ''}`} aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#roles">Actors</a>
          <a href="#steps">How it works</a>
          <a href="#auth">Access</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className={`landing-nav-actions ${navOpen ? 'show' : ''}`}>
          <button type="button" className="secondary-btn nav-btn" onClick={() => handleModeChange('signin')}>
            Login
          </button>
          <button type="button" className="nav-btn" onClick={() => handleModeChange('signup')}>
            Sign Up
          </button>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-container">
          <LandingHero onSignUp={() => handleModeChange('signup')} onLogin={() => handleModeChange('signin')} />
          <LandingFeatures />
          <LandingActors />
          <LandingHowItWorks />

          <section className="landing-section landing-auth-section" id="auth">
            <div className="landing-auth-copy">
              <p className="landing-section-eyebrow">Access</p>
              <h2>Start with the role that fits your work</h2>
              <p>
                Join the platform to publish projects, apply for work, manage product catalogs, and
                collaborate across the construction lifecycle.
              </p>

              <div className="landing-auth-points">
                <article>
                  <UserIcon className="icon" />
                  <div>
                    <strong>Role-based experience</strong>
                    <span>Each actor sees tools tailored to their responsibilities.</span>
                  </div>
                </article>
                <article>
                  <LockIcon className="icon" />
                  <div>
                    <strong>Fast access</strong>
                    <span>Create an account or log in from the same modern entry point.</span>
                  </div>
                </article>
              </div>
            </div>

            <div className="home-auth-panel landing-auth-panel">
              <div className="auth-toggle" role="tablist" aria-label="Authentication forms">
                <button
                  type="button"
                  className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => onSelectMode('signin')}
                  role="tab"
                  aria-selected={mode === 'signin'}
                >
                  <LockIcon className="icon tiny" />
                  Login
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => onSelectMode('signup')}
                  role="tab"
                  aria-selected={mode === 'signup'}
                >
                  <UserIcon className="icon tiny" />
                  Sign Up
                </button>
              </div>

              {mode === 'signin' ? (
                <SignInForm onLoginSuccess={onLoginSuccess} />
              ) : (
                <SignUpForm onRegisterSuccess={() => onSelectMode('signin')} />
              )}
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}

export default LandingPage
