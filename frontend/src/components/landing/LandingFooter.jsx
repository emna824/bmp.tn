import { useTranslation } from 'react-i18next'
import { BmpLogo } from '../Icons'

function LandingFooter() {
  const { t } = useTranslation()

  return (
    <footer className="landing-footer" id="contact">
      <div className="landing-footer-main">
        <div className="landing-footer-brand">
          <BmpLogo className="landing-footer-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>{t('landing.footer.subtitle')}</p>
          </div>
        </div>

        <div className="landing-footer-links">
          <div>
            <h3>{t('landing.footer.platform')}</h3>
            <a href="#features">{t('nav.features')}</a>
            <a href="#roles">{t('nav.actors')}</a>
            <a href="#steps">{t('nav.howItWorks')}</a>
          </div>
          <div>
            <h3>{t('landing.footer.access')}</h3>
            <a href="#auth">{t('landing.auth.signUp')}</a>
            <a href="#auth">{t('login')}</a>
            <a href="#contact">{t('nav.contact')}</a>
          </div>
          <div>
            <h3>{t('landing.footer.contact')}</h3>
            <a href="mailto:contact@bmp.tn">contact@bmp.tn</a>
            <span>Tunis, Tunisia</span>
            <span>{t('landing.footer.builtForTeams')}</span>
          </div>
        </div>
      </div>

      <div className="landing-footer-bottom">
        <p>&copy; {new Date().getFullYear()} BMP.tn. {t('landing.footer.rights')}</p>
        <p>{t('landing.footer.bottom')}</p>
      </div>
    </footer>
  )
}

export default LandingFooter
