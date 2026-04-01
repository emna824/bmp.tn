import { MarketplaceIcon, ShieldIcon, UserIcon } from '../Icons'

const ACTORS = [
  {
    title: 'Artisan',
    description: 'Apply for jobs, manage assigned work, and stay connected to project teams in real time.',
    Icon: UserIcon,
  },
  {
    title: 'Expert',
    description: 'Create projects, review progress, and validate key construction decisions with confidence.',
    Icon: ShieldIcon,
  },
  {
    title: 'Manufacturer',
    description: 'Publish product catalogs, manage documentation, and reach construction professionals directly.',
    Icon: MarketplaceIcon,
  },
]

function LandingActors() {
  return (
    <section className="landing-section" id="roles">
      <div className="landing-section-head">
        <p className="landing-section-eyebrow">Actors</p>
        <h2>Built around the people who keep projects moving</h2>
        <p>
          Each role gets a focused experience while staying connected to the rest of the construction
          ecosystem.
        </p>
      </div>

      <div className="landing-actor-grid">
        {ACTORS.map(({ title, description, Icon }) => (
          <article key={title} className="landing-actor-card">
            <div className="landing-actor-icon">
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

export default LandingActors
