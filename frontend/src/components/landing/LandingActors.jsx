import { memo } from 'react'
import { MarketplaceIcon, ShieldIcon, UserIcon } from '../Icons'
import { useTranslation } from 'react-i18next'

function LandingActors() {
  const { t } = useTranslation()
  const actors = [
    {
      title: t('landing.actors.artisanTitle'),
      description: t('landing.actors.artisanDescription'),
      Icon: UserIcon,
    },
    {
      title: t('landing.actors.expertTitle'),
      description: t('landing.actors.expertDescription'),
      Icon: ShieldIcon,
    },
    {
      title: t('landing.actors.manufacturerTitle'),
      description: t('landing.actors.manufacturerDescription'),
      Icon: MarketplaceIcon,
    },
  ]

  return (
    <section className="landing-section" id="roles">
      <div className="landing-section-head">
        <p className="landing-section-eyebrow">{t('landing.actors.eyebrow')}</p>
        <h2>{t('landing.actors.title')}</h2>
        <p>{t('landing.actors.subtitle')}</p>
      </div>

      <div className="landing-actor-grid">
        {actors.map(({ title, description, Icon: IconComponent }) => (
          <article key={title} className="landing-actor-card">
            <div className="landing-actor-icon">
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

export default memo(LandingActors)
