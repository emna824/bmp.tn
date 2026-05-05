import { Suspense, lazy, useState } from 'react'

const FaceEnrollmentCard = lazy(() => import('../../components/FaceEnrollmentCard'))

function ProfilePage({ profile, saving, onSave }) {
  const [form, setForm] = useState({ name: '', companyName: '' })
  const nameValue = form.name || profile?.name || ''
  const companyNameValue = form.companyName || profile?.companyName || profile?.name || ''

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      name: nameValue.trim(),
      companyName: companyNameValue.trim(),
    })
  }

  return (
    <section className="manufacturer-page-stack">
      <div className="manufacturer-page-panel manufacturer-page-header">
        <div>
          <p className="manufacturer-page-eyebrow">Profile</p>
          <h2>Company information</h2>
          <p>Keep your manufacturer profile accurate and easy for partners to trust.</p>
        </div>
      </div>

      <div className="manufacturer-profile-grid">
        <div className="manufacturer-page-panel">
          <div className="manufacturer-profile-card">
            <span>Email</span>
            <strong>{profile?.email || 'Not available'}</strong>
          </div>
          <div className="manufacturer-profile-card">
            <span>Company name</span>
            <strong>{profile?.companyName || profile?.name || 'Not provided'}</strong>
          </div>
          <div className="manufacturer-profile-card">
            <span>Patent</span>
            <strong>{profile?.patent || 'Not provided'}</strong>
          </div>
          <div className="manufacturer-profile-card">
            <span>Address</span>
            <strong>{profile?.address || 'Not provided'}</strong>
          </div>
        </div>

        <div className="manufacturer-page-panel">
          <Suspense fallback={null}>
            <FaceEnrollmentCard user={profile} />
          </Suspense>
          <form className="manufacturer-profile-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                value={nameValue}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Manufacturer name"
              />
            </label>

            <label>
              Company name
              <input
                value={companyNameValue}
                onChange={(event) =>
                  setForm((current) => ({ ...current, companyName: event.target.value }))
                }
                placeholder="Company name"
              />
            </label>

            <label>
              Email
              <input value={profile?.email || ''} disabled />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Update profile'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default ProfilePage
