import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../api'
import { HomeIcon, LockIcon, LogoutIcon, SettingsIcon, UserIcon } from './Icons'

function ArtisanProfile({ user, onLogout, onProfileUpdate }) {
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const menuRef = useRef(null)
  const [invitations, setInvitations] = useState([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [respondingChantier, setRespondingChantier] = useState(null)

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return
      setLoadingProfile(true)
      try {
        const response = await api.get(`/users/${user.id}/profile`)
        const apiUser = response.data?.user || user
        const resolvedProfile = {
          ...profile,
          ...apiUser,
          profileImage:
            typeof apiUser?.profileImage === 'string' ? apiUser.profileImage : profile?.profileImage || '',
        }
        setProfile(resolvedProfile)
        setName(resolvedProfile.name || '')
        setProfileImage(resolvedProfile.profileImage || '')
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load profile'
        showNotification('error', message)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [user, profile, showNotification])

  useEffect(() => {
    const loadInvitations = async () => {
      if (!user?.id) return
      setLoadingInvitations(true)
      try {
        const response = await api.get(`/assignments/invitations/${user.id}`)
        setInvitations(response.data?.invitations || [])
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load invitations'
        showNotification('error', message)
      } finally {
        setLoadingInvitations(false)
      }
    }

    loadInvitations()
  }, [user?.id, showNotification])

  const handleSaveName = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      showNotification('error', 'Name is required')
      return
    }

    setSavingName(true)
    try {
      const response = await api.put(`/users/${user.id}/profile`, { name: name.trim() })
      const nextProfile = response.data?.user || { ...profile, name: name.trim() }
      setProfile(nextProfile)
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile updated')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile'
      showNotification('error', message)
    } finally {
      setSavingName(false)
    }
  }

  const handleImagePick = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isAllowedType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    const maxBytes = 2 * 1024 * 1024

    if (!isAllowedType) {
      showNotification('error', 'Only PNG, JPG and WEBP are allowed')
      return
    }

    if (file.size > maxBytes) {
      showNotification('error', 'Image must be 2MB or less')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setProfileImage(result)
    }
    reader.onerror = () => {
      showNotification('error', 'Failed to read selected image')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveImage = async () => {
    setSavingImage(true)
    try {
      const safeName = (name || profile?.name || '').trim()
      const response = await api.put(`/users/${user.id}/profile`, {
        name: safeName,
        profileImage,
      })
      const apiUser = response.data?.user || {}
      const nextProfile = {
        ...profile,
        ...apiUser,
        profileImage: typeof apiUser.profileImage === 'string' ? apiUser.profileImage : profileImage,
      }
      setProfile(nextProfile)
      setProfileImage(nextProfile.profileImage || '')
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile image updated')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update image'
      showNotification('error', message)
    } finally {
      setSavingImage(false)
    }
  }

  const handleAssignmentResponse = async (chantierId, responseText) => {
    if (!chantierId) return
    setRespondingChantier(chantierId)
    try {
      await api.post('/assignments/respond', {
        artisanId: user.id,
        chantierId,
        response: responseText,
      })
      setInvitations((prev) =>
        prev.map((inv) =>
          String(inv.chantierId) === String(chantierId)
            ? { ...inv, status: responseText, respondedAt: new Date().toISOString() }
            : inv,
        ),
      )
      showNotification('success', `Assignment ${responseText}`)
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send response'
      showNotification('error', message)
    } finally {
      setRespondingChantier(null)
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (!currentPassword || !newPassword) {
      showNotification('error', 'Current and new password are required')
      return
    }
    if (newPassword.length < 8) {
      showNotification('error', 'New password must be at least 8 characters')
      return
    }

    setSavingPassword(true)
    try {
      const response = await api.put(`/users/${user.id}/password`, {
        currentPassword,
        newPassword,
      })
      showNotification('success', response.data?.message || 'Password updated')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update password'
      showNotification('error', message)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="dashboard-page">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <header className="dashboard-topbar">
        <h2 className="brand-title">
          <HomeIcon className="icon tiny" />
          Artisan Dashboard
        </h2>
        <div className="profile-menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {profile?.profileImage ? (
              <img src={profile.profileImage} alt="Profile" className="avatar-image" />
            ) : (
              profile?.name?.charAt(0)?.toUpperCase() || 'A'
            )}
          </button>
          {menuOpen ? (
            <div className="profile-menu" role="menu">
              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setSettingsOpen(true)
                  setMenuOpen(false)
                }}
              >
                <SettingsIcon className="icon tiny" />
                Settings
              </button>
              <button type="button" className="profile-menu-item logout-item" onClick={onLogout}>
                <LogoutIcon className="icon tiny" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-card">
          <div className="section-header">
            <h3>Chantier invitations</h3>
            <p className="subtitle">See which experts need you and respond to their invitations.</p>
          </div>
          {loadingInvitations ? (
            <p className="subtitle">Loading invitations...</p>
          ) : invitations.length ? (
            <div className="table-wrap">
              <table className="artisan-table invitations-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Chantier</th>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={`${invite.chantierId}-${invite.jobTitle}`}>
                      <td>{invite.projectName || '—'}</td>
                      <td>
                        <strong>{invite.chantierName}</strong>
                        <p className="subtitle small">{invite.chantierDescription}</p>
                      </td>
                      <td>{invite.jobTitle}</td>
                      <td>
                        <span className={`status-pill status-${invite.status}`}>{invite.status}</span>
                      </td>
                      <td>
                        <div className="invitation-actions">
                          <button
                            type="button"
                            className="mini-btn"
                            disabled={
                              invite.status !== 'pending' || respondingChantier === invite.chantierId
                            }
                            onClick={() => handleAssignmentResponse(invite.chantierId, 'accepted')}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="secondary-btn mini-btn"
                            disabled={
                              invite.status !== 'pending' || respondingChantier === invite.chantierId
                            }
                            onClick={() => handleAssignmentResponse(invite.chantierId, 'declined')}
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="subtitle">You have no pending invitations right now.</p>
          )}
        </section>

        <section className="dashboard-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button type="button" className="secondary-btn" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon className="icon tiny" />
              Open Settings
            </button>
            <button type="button" className="secondary-btn" onClick={onLogout}>
              <LogoutIcon className="icon tiny" />
              Log out
            </button>
          </div>
        </section>
      </main>

      {settingsOpen ? (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Profile settings">
          <section className="settings-modal">
            <div className="settings-header">
              <h3>Profile Settings</h3>
              <button type="button" className="text-btn close-btn" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </div>

            <form onSubmit={handleSaveName} noValidate>
              <label>
                <span className="label-with-icon">
                  <UserIcon className="icon tiny" />
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                />
              </label>
              <button type="submit" disabled={savingName}>
                {savingName ? 'Saving...' : 'Save name'}
              </button>
            </form>

            <div className="image-settings-block">
              <label>
                <span className="label-with-icon">
                  <UserIcon className="icon tiny" />
                  Profile Image
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} />
              </label>

              {profileImage ? <img src={profileImage} alt="Profile preview" className="profile-preview" /> : null}

              <div className="image-actions">
                <button type="button" onClick={handleSaveImage} disabled={savingImage}>
                  <UserIcon className="icon tiny" />
                  {savingImage ? 'Uploading...' : 'Save image'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setProfileImage('')}
                  disabled={savingImage}
                >
                  Remove selected
                </button>
              </div>
            </div>

            <form onSubmit={handleChangePassword} noValidate>
              <label>
                <span className="label-with-icon">
                  <LockIcon className="icon tiny" />
                  Current Password
                </span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Current password"
                />
              </label>
              <label>
                <span className="label-with-icon">
                  <LockIcon className="icon tiny" />
                  New Password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </label>
              <button type="submit" disabled={savingPassword}>
                <LockIcon className="icon tiny" />
                {savingPassword ? 'Updating...' : 'Change password'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default ArtisanProfile
