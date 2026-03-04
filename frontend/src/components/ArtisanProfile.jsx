import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import { LockIcon, SettingsIcon, UserIcon } from './Icons'
import DashboardLayout from './DashboardLayout'
import { downloadDataUrlFile } from '../utils/fileHelpers'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Snapshot' },
  { key: 'invitations', label: 'Invitations', subtitle: 'Respond to experts' },
  { key: 'marketplace', label: 'Marketplace', subtitle: 'Manufacturer docs' },
  { key: 'settings', label: 'Settings', subtitle: 'Profile & security' },
]

function ArtisanProfile({ user, onLogout, onProfileUpdate }) {
  const [activeView, setActiveView] = useState('overview')
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [invitations, setInvitations] = useState([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [respondingChantier, setRespondingChantier] = useState(null)
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '', manufacturer: '' })

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  const fetchMarketplace = useCallback(async () => {
    setLoadingMarketplace(true)
    try {
      const response = await api.get('/manufacturers/products')
      setMarketplaceProducts(response.data?.products || [])
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load marketplace'
      showNotification('error', message)
    } finally {
      setLoadingMarketplace(false)
    }
  }, [showNotification])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      setLoadingProfile(true)
      try {
        const response = await api.get(`/users/${user.id}/profile`)
        const apiUser = response.data?.user
        if (apiUser) {
          const resolvedProfile = {
            ...apiUser,
            profileImage: typeof apiUser.profileImage === 'string' ? apiUser.profileImage : '',
          }
          setProfile(resolvedProfile)
          setName(resolvedProfile.name || '')
          setProfileImage(resolvedProfile.profileImage || '')
        }
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load profile'
        showNotification('error', message)
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [user?.id, showNotification])

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

  useEffect(() => {
    fetchMarketplace()
  }, [fetchMarketplace])

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

  const handleDownloadMarketplaceDocument = async (productId, fallbackName) => {
    if (!productId) return
    setDownloadingProductId(productId)
    try {
      const response = await api.get(`/manufacturers/products/${productId}/document`)
      const { document, documentName } = response.data || {}
      if (!document) {
        throw new Error('Document unavailable')
      }
      downloadDataUrlFile(document, documentName || fallbackName || 'product.pdf')
      showNotification('success', 'Document downloaded')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to download document'
      showNotification('error', message)
    } finally {
      setDownloadingProductId(null)
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

  const pendingInvitations = invitations.filter((invite) => invite.status === 'pending').length
  const acceptedInvitations = invitations.filter((invite) => invite.status === 'accepted').length
  const declinedInvitations = invitations.filter((invite) => invite.status === 'declined').length

  const filteredMarketplaceProducts = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return marketplaceProducts.filter((product) => {
      const matchesManufacturer =
        !filters.manufacturer ||
        product.manufacturer?.name?.toLowerCase() === filters.manufacturer.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      return matchesManufacturer && matchesSearch
    })
  }, [filters, marketplaceProducts])

  const manufacturerOptions = useMemo(() => {
    const names = new Set()
    marketplaceProducts.forEach((product) => {
      if (product.manufacturer?.name) {
        names.add(product.manufacturer.name)
      }
    })
    return Array.from(names)
  }, [marketplaceProducts])

  const overviewStats = [
    {
      label: 'Invitations',
      value: invitations.length || 0,
      detail: `${pendingInvitations} pending`,
    },
    {
      label: 'Accepted',
      value: acceptedInvitations,
      detail: `${declinedInvitations} declined`,
    },
    {
      label: 'Marketplace docs',
      value: marketplaceProducts.length,
      detail: `${filteredMarketplaceProducts.length} showing`,
    },
  ]

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="artisan-profile">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <DashboardLayout
        user={profile}
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
      >
        {activeView === 'overview' && (
          <>
            <div className="dashboard-overview">
              {overviewStats.map((stat) => (
                <div key={stat.label} className="summary-pill">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                  <small>{stat.detail}</small>
                </div>
              ))}
            </div>
            <section className="dashboard-card">
              <div className="section-header">
                <h3>Quick actions</h3>
                <p className="subtitle">Jump straight to what matters</p>
              </div>
              <div className="quick-actions">
                <button type="button" className="secondary-btn" onClick={() => setActiveView('invitations')}>
                  Review invitations
                </button>
                <button type="button" className="secondary-btn" onClick={() => setActiveView('marketplace')}>
                  Browse marketplace
                </button>
                <button type="button" className="secondary-btn" onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon className="icon tiny" />
                  Edit profile
                </button>
              </div>
            </section>
          </>
        )}

        {activeView === 'invitations' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Chantier invitations</h3>
              <p className="subtitle">Respond to expert requests for new work.</p>
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
                              disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
                              onClick={() => handleAssignmentResponse(invite.chantierId, 'accepted')}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="secondary-btn mini-btn"
                              disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
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
        )}

        {activeView === 'marketplace' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Marketplace</h3>
              <p className="subtitle">Filter published PDFs before downloading.</p>
            </div>
            <div className="dashboard-filters">
              <input
                placeholder="Search by product or description"
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
              />
              <select
                value={filters.manufacturer}
                onChange={(event) => handleFilterChange('manufacturer', event.target.value)}
              >
                <option value="">All manufacturers</option>
                {manufacturerOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  handleFilterChange('search', '')
                  handleFilterChange('manufacturer', '')
                }}
              >
                Clear filters
              </button>
              <button type="button" className="secondary-btn" onClick={fetchMarketplace}>
                Refresh
              </button>
            </div>
            {loadingMarketplace ? (
              <p className="subtitle">Loading marketplace...</p>
            ) : filteredMarketplaceProducts.length ? (
              <div className="table-wrap">
                <table className="artisan-table invitations-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Description</th>
                      <th>Manufacturer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMarketplaceProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                          <p className="subtitle small">{product.documentName}</p>
                        </td>
                        <td>{product.description || '—'}</td>
                        <td>
                          {product.manufacturer?.name || '—'}
                          {product.manufacturer?.companyPhone ? (
                            <p className="subtitle small">{product.manufacturer.companyPhone}</p>
                          ) : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary-btn mini-btn"
                            disabled={downloadingProductId === product.id}
                            onClick={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                          >
                            {downloadingProductId === product.id ? 'Downloading...' : 'Download PDF'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtitle">No marketplace listings match your filters.</p>
            )}
          </section>
        )}

        {activeView === 'settings' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Profile settings</h3>
              <p className="subtitle">Edit your information securely.</p>
            </div>
            <div className="settings-content">
              <p>
                <strong>Name:</strong> {profile?.name || '—'}
              </p>
              <p>
                <strong>Email:</strong> {profile?.email || '—'}
              </p>
              <p>
                <strong>Role:</strong> Artisan
              </p>
              <div className="quick-actions">
                <button type="button" className="secondary-btn" onClick={() => setSettingsOpen(true)}>
                  <SettingsIcon className="icon tiny" />
                  Manage profile
                </button>
                <button type="button" className="secondary-btn" onClick={() => setActiveView('overview')}>
                  Back to overview
                </button>
              </div>
            </div>
          </section>
        )}
      </DashboardLayout>

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
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
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
