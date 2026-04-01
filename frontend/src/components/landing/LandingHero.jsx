import { BmpLogo, HomeIcon, MarketplaceIcon, ShieldIcon } from '../Icons'

const HERO_METRICS = [
  { label: 'Active projects', value: '120+', Icon: HomeIcon },
  { label: 'Marketplace items', value: '850+', Icon: MarketplaceIcon },
  { label: 'Validated workflows', value: '24/7', Icon: ShieldIcon },
]

function LandingHero({ onSignUp, onLogin }) {
  return (
    <section className="landing-hero" id="about">
      <div className="landing-hero-copy">
        <div className="landing-badge">
          <BmpLogo className="landing-badge-logo" />
          <span>BMP.tn for modern construction teams</span>
        </div>

        <h1>Manage Construction Projects Smarter</h1>
        <p className="landing-hero-subtitle">
          Coordinate projects, hire the right specialists, validate deliverables, and source materials
          from one professional workspace built for construction management.
        </p>

        <div className="landing-hero-actions">
          <button type="button" onClick={onSignUp}>
            Sign Up
          </button>
          <button type="button" className="secondary-btn" onClick={onLogin}>
            Login
          </button>
        </div>

        <div className="landing-hero-tags" aria-label="Platform highlights">
          <span>Project oversight</span>
          <span>Expert-backed validation</span>
          <span>Supplier marketplace</span>
          <span>Team coordination</span>
        </div>
      </div>

      <div className="landing-hero-visual">
        <div className="landing-hero-panel">
          <div className="landing-hero-panel-top">
            <div>
              <p className="landing-panel-eyebrow">Operations snapshot</p>
              <h2>One view for planning, staffing, and supply</h2>
            </div>
            <span className="landing-status-pill">Live platform</span>
          </div>

          <img
            className="landing-hero-image"
            src="https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1400"
            alt="Construction planning session with project documents"
            loading="lazy"
          />

          <div className="landing-metric-grid">
            {HERO_METRICS.map(({ label, value, Icon }) => (
              <article key={label} className="landing-metric-card">
                <div className="landing-metric-icon">
                  <Icon className="icon" />
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

export default LandingHero
