import { useEffect, useState } from 'react'

function ProfilePage({ profile, saving, onSave }) {
  const [form, setForm] = useState({ name: '', companyName: '' })

  useEffect(() => {
    setForm({
      name: profile?.name || '',
      companyName: profile?.companyName || profile?.name || '',
    })
  }, [profile])

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({
      name: form.name.trim(),
      companyName: form.companyName.trim(),
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
          <form className="manufacturer-profile-form" onSubmit={handleSubmit}>
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Manufacturer name"
              />
            </label>

            <label>
              Company name
              <input
                value={form.companyName}
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
