import { memo } from 'react'
import { HomeIcon, MarketplaceIcon, ShieldIcon, UserIcon } from '../Icons'
import { useTranslation } from 'react-i18next'

function LandingFeatures() {
  const { t } = useTranslation()
  const features = [
    {
      title: t('landing.features.projectManagementTitle'),
      description: t('landing.features.projectManagementDescription'),
      Icon: HomeIcon,
    },
    {
      title: t('landing.features.marketplaceTitle'),
      description: t('landing.features.marketplaceDescription'),
      Icon: MarketplaceIcon,
    },
    {
      title: t('landing.features.validationTitle'),
      description: t('landing.features.validationDescription'),
      Icon: ShieldIcon,
    },
    {
      title: t('landing.features.collaborationTitle'),
      description: t('landing.features.collaborationDescription'),
      Icon: UserIcon,
    },
  ]

  return (
    <section className="landing-section" id="features">
      <div className="landing-section-head centered">
        <p className="landing-section-eyebrow">{t('landing.features.eyebrow')}</p>
        <h2>{t('landing.features.title')}</h2>
        <p>{t('landing.features.subtitle')}</p>
      </div>

      <div className="landing-feature-grid">
        {features.map(({ title, description, Icon: IconComponent }) => (
          <article key={title} className="landing-feature-card">
            <div className="landing-feature-icon">
              <IconComponent className="icon" />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default memo(LandingFeatures)
