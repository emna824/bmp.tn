import { Suspense, lazy, useCallback } from 'react'
import SignInForm from '../SignInForm'
import SignUpForm from '../SignUpForm'
import LanguageSwitcher from '../LanguageSwitcher'
import ThemeToggle from '../ThemeToggle'
import { BmpLogo, LockIcon, UserIcon } from '../Icons'
import LandingHero from './LandingHero'
import { useTranslation } from 'react-i18next'

const LandingFeatures = lazy(() => import('./LandingFeatures'))
const LandingActors = lazy(() => import('./LandingActors'))
const LandingHowItWorks = lazy(() => import('./LandingHowItWorks'))
const LandingFooter = lazy(() => import('./LandingFooter'))

function scrollToSection(sectionId) {
  if (typeof document === 'undefined') return
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function LandingPage({ mode, navOpen, onToggleNav, onSelectMode, onLoginSuccess }) {
  const { t } = useTranslation()

  const handleModeChange = useCallback(
    (nextMode) => {
      onSelectMode(nextMode)
      scrollToSection('auth')
    },
    [onSelectMode],
  )

  return (
    <div className="landing-shell">
      <a className="skip-link" href="#landing-main">
        {t('common.skipToContent', { defaultValue: 'Skip to content' })}
      </a>
      <header className={`landing-navbar ${navOpen ? 'open' : ''}`}>
        <div className="landing-nav-brand">
          <BmpLogo className="landing-nav-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>{t('landing.brandSubtitle')}</p>
          </div>
        </div>

        <button
          type="button"
          className="landing-nav-burger"
          aria-label={navOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={navOpen}
          onClick={onToggleNav}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`landing-nav-links ${navOpen ? 'show' : ''}`} aria-label={t('nav.mainNavigation')}>
          <a href="#features">{t('nav.features')}</a>
          <a href="#roles">{t('nav.actors')}</a>
          <a href="#steps">{t('nav.howItWorks')}</a>
          <a href="#auth">{t('nav.access')}</a>
          <a href="#contact">{t('nav.contact')}</a>
        </nav>

        <div className={`landing-nav-actions ${navOpen ? 'show' : ''}`}>
          <LanguageSwitcher />
          <ThemeToggle />
          <button type="button" className="secondary-btn nav-btn" onClick={() => handleModeChange('signin')}>
            {t('login')}
          </button>
          <button type="button" className="nav-btn" onClick={() => handleModeChange('signup')}>
            {t('landing.auth.signUp')}
          </button>
        </div>
      </header>

      <main id="landing-main" className="landing-main" tabIndex={-1}>
        <div className="landing-container">
          <LandingHero onSignUp={() => handleModeChange('signup')} onLogin={() => handleModeChange('signin')} />
          <Suspense fallback={null}>
            <LandingFeatures />
          </Suspense>
          <Suspense fallback={null}>
            <LandingActors />
          </Suspense>
          <Suspense fallback={null}>
            <LandingHowItWorks />
          </Suspense>

          <section className="landing-section landing-auth-section" id="auth">
            <div className="landing-auth-copy">
              <p className="landing-section-eyebrow">{t('landing.auth.eyebrow')}</p>
              <h2>{t('landing.auth.title')}</h2>
              <p>{t('landing.auth.subtitle')}</p>

              <div className="landing-auth-points">
                <article>
                  <UserIcon className="icon" />
                  <div>
                    <strong>{t('landing.auth.roleBasedTitle')}</strong>
                    <span>{t('landing.auth.roleBasedDescription')}</span>
                  </div>
                </article>
                <article>
                  <LockIcon className="icon" />
                  <div>
                    <strong>{t('landing.auth.fastAccessTitle')}</strong>
                    <span>{t('landing.auth.fastAccessDescription')}</span>
                  </div>
                </article>
              </div>
            </div>

            <div className="home-auth-panel landing-auth-panel">
              <div className="auth-toggle" role="tablist" aria-label={t('landing.auth.formsLabel')}>
                <button
                  type="button"
                  className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
                  onClick={() => onSelectMode('signin')}
                  role="tab"
                  aria-selected={mode === 'signin'}
                >
                  <LockIcon className="icon tiny" />
                  {t('login')}
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => onSelectMode('signup')}
                  role="tab"
                  aria-selected={mode === 'signup'}
                >
                  <UserIcon className="icon tiny" />
                  {t('landing.auth.signUp')}
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

      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>
    </div>
  )
}

export default LandingPage
