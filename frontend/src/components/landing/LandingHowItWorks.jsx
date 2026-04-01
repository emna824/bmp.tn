const STEPS = [
  {
    number: '01',
    title: 'Create project',
    description: 'Set up a construction project, define needs, and organize the work structure from day one.',
  },
  {
    number: '02',
    title: 'Apply for jobs',
    description: 'Artisans discover open opportunities while experts and managers review the right candidates.',
  },
  {
    number: '03',
    title: 'Manage progress',
    description: 'Track work, coordinate stakeholders, and keep documentation and supply activity aligned.',
  },
]

function LandingHowItWorks() {
  return (
    <section className="landing-section landing-steps-section" id="steps">
      <div className="landing-section-head centered">
        <p className="landing-section-eyebrow">How It Works</p>
        <h2>A clear flow from kickoff to delivery</h2>
        <p>Simple steps keep the platform easy to adopt while still supporting serious project execution.</p>
      </div>

      <div className="landing-step-grid">
        {STEPS.map((step) => (
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

export default LandingHowItWorks
