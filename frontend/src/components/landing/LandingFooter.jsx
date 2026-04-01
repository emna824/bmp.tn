import { BmpLogo } from '../Icons'

function LandingFooter() {
  return (
    <footer className="landing-footer" id="contact">
      <div className="landing-footer-main">
        <div className="landing-footer-brand">
          <BmpLogo className="landing-footer-logo" />
          <div>
            <strong>BMP.tn</strong>
            <p>Construction management, sourcing, and collaboration in one platform.</p>
          </div>
        </div>

        <div className="landing-footer-links">
          <div>
            <h3>Platform</h3>
            <a href="#features">Features</a>
            <a href="#roles">Actors</a>
            <a href="#steps">How it works</a>
          </div>
          <div>
            <h3>Access</h3>
            <a href="#auth">Sign up</a>
            <a href="#auth">Login</a>
            <a href="#contact">Contact</a>
          </div>
          <div>
            <h3>Contact</h3>
            <a href="mailto:contact@bmp.tn">contact@bmp.tn</a>
            <span>Tunis, Tunisia</span>
            <span>Built for connected construction teams</span>
          </div>
        </div>
      </div>

      <div className="landing-footer-bottom">
        <p>© {new Date().getFullYear()} BMP.tn. All rights reserved.</p>
        <p>Experts, artisans, and manufacturers working smarter together.</p>
      </div>
    </footer>
  )
}

export default LandingFooter
