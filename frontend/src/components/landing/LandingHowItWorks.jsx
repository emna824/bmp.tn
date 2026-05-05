import { memo } from 'react'
import { useTranslation } from 'react-i18next'

function LandingHowItWorks() {
  const { t } = useTranslation()
  const steps = [
    {
      number: '01',
      title: t('landing.steps.step1Title'),
      description: t('landing.steps.step1Description'),
    },
    {
      number: '02',
      title: t('landing.steps.step2Title'),
      description: t('landing.steps.step2Description'),
    },
    {
      number: '03',
      title: t('landing.steps.step3Title'),
      description: t('landing.steps.step3Description'),
    },
  ]

  return (
    <section className="landing-section landing-steps-section" id="steps">
      <div className="landing-section-head centered">
        <p className="landing-section-eyebrow">{t('landing.steps.eyebrow')}</p>
        <h2>{t('landing.steps.title')}</h2>
        <p>{t('landing.steps.subtitle')}</p>
      </div>

      <div className="landing-step-grid">
        {steps.map((step) => (
          <article key={step.number} className="landing-step-card">
            <span className="landing-step-number">{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default memo(LandingHowItWorks)
