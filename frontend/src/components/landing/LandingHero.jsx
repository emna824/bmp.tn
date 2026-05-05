import { memo } from 'react'
import { BmpLogo, HomeIcon, MarketplaceIcon, ShieldIcon } from '../Icons'
import { useTranslation } from 'react-i18next'

function LandingHero({ onSignUp, onLogin }) {
  const { t } = useTranslation()
  const heroMetrics = [
    { label: t('landing.hero.metrics.activeProjects'), value: '120+', Icon: HomeIcon },
    { label: t('landing.hero.metrics.marketplaceItems'), value: '850+', Icon: MarketplaceIcon },
    { label: t('landing.hero.metrics.validatedWorkflows'), value: '24/7', Icon: ShieldIcon },
  ]

  return (
    <section className="landing-hero" id="about">
      <div className="landing-hero-copy">
        <div className="landing-badge">
          <BmpLogo className="landing-badge-logo" />
          <span>{t('landing.hero.badge')}</span>
        </div>

        <h1>{t('landing.hero.title')}</h1>
        <p className="landing-hero-subtitle">{t('landing.hero.subtitle')}</p>

        <div className="landing-hero-actions">
          <button type="button" onClick={onSignUp}>
            {t('landing.auth.signUp')}
          </button>
          <button type="button" className="secondary-btn" onClick={onLogin}>
            {t('login')}
          </button>
        </div>

        <div className="landing-hero-tags" aria-label={t('landing.hero.highlightsLabel')}>
          <span>{t('landing.hero.tag1')}</span>
          <span>{t('landing.hero.tag2')}</span>
          <span>{t('landing.hero.tag3')}</span>
          <span>{t('landing.hero.tag4')}</span>
        </div>
      </div>

      <div className="landing-hero-visual">
        <div className="landing-hero-panel">
          <div className="landing-hero-panel-top">
            <div>
              <p className="landing-panel-eyebrow">{t('landing.hero.snapshotEyebrow')}</p>
              <h2>{t('landing.hero.snapshotTitle')}</h2>
            </div>
            <span className="landing-status-pill">{t('landing.hero.livePlatform')}</span>
          </div>

          <div
            className="landing-hero-image landing-hero-dashboard-frame"
            role="img"
            aria-label={t('landing.hero.imageAlt')}
          />

          <div className="landing-metric-grid">
            {heroMetrics.map(({ label, value, Icon: IconComponent }) => (
              <article key={label} className="landing-metric-card">
                <div className="landing-metric-icon">
                  <IconComponent className="icon" />
                </div>
                <strong>{value}</strong>
                <span>{label}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default memo(LandingHero)
