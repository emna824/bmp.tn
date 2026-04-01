import { HomeIcon, MarketplaceIcon, ShieldIcon, UserIcon } from '../Icons'

const FEATURES = [
  {
    title: 'Project management',
    description: 'Organize construction tasks, track milestones, and keep every chantier on schedule.',
    Icon: HomeIcon,
  },
  {
    title: 'Marketplace',
    description: 'Browse manufacturer catalogs, compare product offers, and access documentation quickly.',
    Icon: MarketplaceIcon,
  },
  {
    title: 'Expert validation',
    description: 'Bring expert oversight into the workflow to review progress and validate key decisions.',
    Icon: ShieldIcon,
  },
  {
    title: 'Team collaboration',
    description: 'Connect artisans, experts, and manufacturers in one shared space for smoother coordination.',
    Icon: UserIcon,
  },
]

function LandingFeatures() {
  return (
    <section className="landing-section" id="features">
      <div className="landing-section-head centered">
        <p className="landing-section-eyebrow">Features</p>
        <h2>Everything needed to run construction work with clarity</h2>
        <p>
          The platform brings operations, hiring, material sourcing, and review into a single reliable
          workspace.
        </p>
      </div>

      <div className="landing-feature-grid">
        {FEATURES.map(({ title, description, Icon }) => (
          <article key={title} className="landing-feature-card">
            <div className="landing-feature-icon">
              <Icon className="icon" />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default LandingFeatures
