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

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter', 'Metalworker', 'Laborer']

function ArtisanProfile({ user, onLogout, onProfileUpdate }) {
  const [activeView, setActiveView] = useState('overview')
  const [profile, setProfile] = useState(user)
  const [name, setName] = useState(user?.name || '')
  const [profileImage, setProfileImage] = useState(user?.profileImage || '')
  const [job, setJob] = useState(user?.job || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [savingImage, setSavingImage] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingJob, setSavingJob] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [invitations, setInvitations] = useState([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [respondingChantier, setRespondingChantier] = useState(null)
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '', manufacturer: '' })
  const [invitationSearch, setInvitationSearch] = useState('')
  const [notificationCount, setNotificationCount] = useState(user?.notificationCount || 0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsList, setNotificationsList] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [previewProduct, setPreviewProduct] = useState(null)

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
          setJob(resolvedProfile.job || '')
          setNotificationCount(resolvedProfile.notificationCount || 0)
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

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await api.get(`/notifications/${user.id}?unreadOnly=true`)
      const unread = res.data?.unreadCount ?? 0
      setNotificationCount(unread)
      setProfile((prev) => ({ ...prev, notificationCount: unread }))
    } catch (err) {
      // non-blocking: ignore
    }
  }, [user?.id])

  const loadNotificationsList = useCallback(async () => {
    if (!user?.id) return
    setLoadingNotifications(true)
    try {
      const res = await api.get(`/notifications/${user.id}`)
      setNotificationsList(res.data?.notifications || [])
    } catch (err) {
      // silent fail
    } finally {
      setLoadingNotifications(false)
    }
  }, [user?.id])

  useEffect(() => {
    refreshNotifications()
    const interval = setInterval(refreshNotifications, 20000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  useEffect(() => {
    if (notificationsOpen) {
      // Mark badge as cleared
      setNotificationCount(0)
      setProfile((prev) => ({ ...prev, notificationCount: 0 }))
      loadNotificationsList()
    }
  }, [notificationsOpen, loadNotificationsList])

  const handleNavigate = (view) => {
    setActiveView(view)
  }

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

  const handleSaveJob = async (event) => {
    if (event) {
      event.preventDefault()
    }
    if (!job) {
      showNotification('error', 'Please select your role/trade')
      return
    }
    setSavingJob(true)
    try {
      await api.put(`/users/${user.id}/profile`, {
        name: (name || profile?.name || '').trim(),
        job,
      })

      const refreshed = await api.get(`/users/${user.id}/profile`)
      const apiUser = refreshed.data?.user || {}
      const nextProfile = { ...profile, ...apiUser, job: apiUser.job || job }
      setProfile(nextProfile)
      setJob(nextProfile.job || '')
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', 'Trade saved')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update role'
      showNotification('error', message)
    } finally {
      setSavingJob(false)
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

  const openProductPreview = (product) => {
    setPreviewProduct(product)
  }

  const closeProductPreview = () => {
    setPreviewProduct(null)
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

  const filteredInvitations = useMemo(() => {
    const term = invitationSearch.trim().toLowerCase()
    if (!term) return invitations
    return invitations.filter((inv) => {
      return (
        inv.projectName?.toLowerCase().includes(term) ||
        inv.chantierName?.toLowerCase().includes(term) ||
        inv.jobTitle?.toLowerCase().includes(term)
      )
    })
  }, [invitationSearch, invitations])

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
    {
      label: 'Unread',
      value: notificationCount,
      detail: 'Notifications',
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
        user={{ ...profile, notificationCount }}
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        onToggleNotifications={() => setNotificationsOpen((open) => !open)}
        notificationsOpen={notificationsOpen}
      >
        {activeView === 'overview' && (
          <div className="artisan-dashboard">
            <div className="dash-top">
              <input
                className="dash-search"
                type="search"
                placeholder="Search invitations, jobs or products..."
                value={invitationSearch}
                onChange={(e) => setInvitationSearch(e.target.value)}
              />
              <div className="dash-actions">
                <button type="button" className="secondary-btn" onClick={() => setActiveView('invitations')}>
                  Invitations
                </button>
                <button type="button" className="secondary-btn" onClick={() => setActiveView('marketplace')}>
                  Marketplace
                </button>
              </div>
            </div>

            <div className="stat-grid">
              {overviewStats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-detail">{stat.detail}</div>
                  <div className="stat-bar" />
                </div>
              ))}
            </div>

            <div className="cards-grid">
              <section className="card-panel">
                <div className="panel-header">
                  <h3>Recent Invitations</h3>
                  <button type="button" className="text-btn" onClick={() => setActiveView('invitations')}>
                    View all
                  </button>
                </div>
                <div className="invitation-list">
                  {invitations.slice(0, 4).map((invite) => (
                    <article key={`${invite.chantierId}-${invite.jobTitle}`} className="invitation-card">
                      <div className="inv-meta">
                        <div>
                          <p className="inv-title">{invite.projectName || 'Project'}</p>
                          <p className="inv-subtitle">{invite.chantierName}</p>
                          <p className="inv-desc">{invite.chantierDescription}</p>
                          <div className="inv-tags">
                            <span className="badge">{invite.jobTitle}</span>
                            <span className={`pill status-${invite.status}`}>{invite.status}</span>
                          </div>
                        </div>
                        <div className="inv-actions">
                          <button
                            type="button"
                            className="secondary-btn mini-btn"
                            disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
                            onClick={() => handleAssignmentResponse(invite.chantierId, 'declined')}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            className="mini-btn"
                            disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
                            onClick={() => handleAssignmentResponse(invite.chantierId, 'accepted')}
                          >
                            {respondingChantier === invite.chantierId ? 'Sending...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!invitations.length ? <p className="subtitle">No invitations yet.</p> : null}
                </div>
              </section>

              <section className="card-panel">
                <div className="panel-header">
                  <h3>Marketplace Spotlight</h3>
                  <button type="button" className="text-btn" onClick={() => setActiveView('marketplace')}>
                    Browse
                  </button>
                </div>
                <div className="product-cards">
                  {filteredMarketplaceProducts.slice(0, 4).map((product) => (
                    <article key={product.id} className="product-card">
                      <div className="product-meta">
                        <h4>{product.name}</h4>
                        <p className="subtitle small">{product.manufacturer?.name || 'Manufacturer'}</p>
                        <p className="product-desc">{product.description || '—'}</p>
                      </div>
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={downloadingProductId === product.id}
                        onClick={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                      >
                        {downloadingProductId === product.id ? 'Downloading...' : 'View Details'}
                      </button>
                    </article>
                  ))}
                  {!filteredMarketplaceProducts.length ? <p className="subtitle">No marketplace items.</p> : null}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === 'invitations' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Chantier invitations</h3>
              <p className="subtitle">Respond to expert requests for new work.</p>
            </div>
            <div className="dash-filter-row">
              <input
                type="search"
                placeholder="Search invitations..."
                value={invitationSearch}
                onChange={(e) => setInvitationSearch(e.target.value)}
              />
            </div>
            {loadingInvitations ? (
              <p className="subtitle">Loading invitations...</p>
            ) : filteredInvitations.length ? (
              <div className="invitation-list grid">
                {filteredInvitations.map((invite) => (
                  <article key={`${invite.chantierId}-${invite.jobTitle}`} className="invitation-card">
                    <div className="inv-meta">
                      <div>
                        <p className="inv-title">{invite.projectName || 'Project'}</p>
                        <p className="inv-subtitle">{invite.chantierName}</p>
                        <p className="inv-desc">{invite.chantierDescription}</p>
                        <div className="inv-tags">
                          <span className="badge">{invite.jobTitle}</span>
                          <span className={`pill status-${invite.status}`}>{invite.status}</span>
                        </div>
                      </div>
                      <div className="inv-actions">
                        <button
                          type="button"
                          className="secondary-btn mini-btn"
                          disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
                          onClick={() => handleAssignmentResponse(invite.chantierId, 'declined')}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          className="mini-btn"
                          disabled={invite.status !== 'pending' || respondingChantier === invite.chantierId}
                          onClick={() => handleAssignmentResponse(invite.chantierId, 'accepted')}
                        >
                          {respondingChantier === invite.chantierId ? 'Sending...' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="subtitle">You have no pending invitations right now.</p>
            )}
          </section>
        )}

        {activeView === 'marketplace' && (
          <section className="dashboard-card marketplace-card">
            <div className="market-top">
              <input
                type="search"
                className="market-search"
                placeholder="Search products..."
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
              />
              <div className="market-filters">
                <select
                  value={filters.manufacturer}
                  onChange={(event) => handleFilterChange('manufacturer', event.target.value)}
                >
                  <option value="">All Categories</option>
                  {manufacturerOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select disabled>
                  <option>Location</option>
                </select>
                <select disabled>
                  <option>Price Range</option>
                </select>
                <select disabled>
                  <option>Sort: Newest</option>
                </select>
              </div>
            </div>

            {loadingMarketplace ? (
              <p className="subtitle">Loading marketplace...</p>
            ) : (
              <div className="market-grid">
                {filteredMarketplaceProducts.length ? (
                  filteredMarketplaceProducts.map((product) => (
                    <article key={product.id} className="market-card">
                      <div className="market-card-image">
                        {product.image || product.imageUrl || product.thumbnail ? (
                          <img
                            src={product.image || product.imageUrl || product.thumbnail}
                            alt={product.name}
                            loading="lazy"
                          />
                        ) : (
                          <div className="market-img-fallback">{product.name?.charAt(0) || 'P'}</div>
                        )}
                      </div>
                      <div className="market-card-body">
                        <p className="market-title">{product.name}</p>
                        <p className="market-subtitle">{product.manufacturer?.name || 'Manufacturer'}</p>
                        <p className="market-desc">{product.description || 'No description provided.'}</p>
                        <div className="market-meta">
                          <span className="meta-chip">{product.manufacturer?.city || 'Location'}</span>
                          <span className="meta-chip">{product.documentName || 'PDF'}</span>
                          {product.price ? (
                            <span className="meta-chip price-chip">
                              {product.price} {product.priceUnit || 'TND'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="market-card-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => openProductPreview(product)}
                        >
                          View Details
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="subtitle">No marketplace listings match your filters.</p>
                )}
              </div>
            )}
          </section>
        )}

        {activeView === 'settings' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Profile settings</h3>
              <p className="subtitle">Edit your information securely.</p>
            </div>
            {requireTrade ? (
              <div className="notice warning">
                <strong>First-time setup:</strong> choose your trade to continue. Profile photo is optional.
              </div>
            ) : null}
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
              <p>
                <strong>Trade:</strong> {profile?.job || 'Not set'}
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

            <form onSubmit={handleSaveJob} noValidate>
              <label>
                <span className="label-with-icon">
                  <UserIcon className="icon tiny" />
                  Your trade / role
                </span>
                <select
                  name="trade"
                  id="settings-trade"
                  value={job}
                  onChange={(event) => setJob(event.target.value)}
                >
                  <option value="">Select a trade</option>
                  {JOB_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={savingJob}>
                {savingJob ? 'Saving...' : 'Save trade'}
              </button>
            </form>

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

      {previewProduct ? (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Product details">
          <section className="settings-modal product-preview">
            <div className="settings-header">
              <h3>{previewProduct.name}</h3>
              <button type="button" className="text-btn close-btn" onClick={() => setPreviewProduct(null)}>
                Close
              </button>
            </div>
            <div className="product-preview-body">
              <div className="product-preview-media">
                {previewProduct.image ? (
                  <img src={previewProduct.image} alt={previewProduct.name} />
                ) : (
                  <div className="market-img-fallback">{previewProduct.name?.charAt(0) || 'P'}</div>
                )}
              </div>
              <div className="product-preview-meta">
                <p className="subtitle">{previewProduct.description || 'No description provided.'}</p>
                <p>
                  <strong>Manufacturer: </strong>
                  {previewProduct.manufacturer?.name || '—'}
                </p>
                <p>
                  <strong>Price: </strong>
                  {previewProduct.price ? `${previewProduct.price} ${previewProduct.priceUnit || 'TND'}` : '—'}
                </p>
                <p className="subtitle small">Document: {previewProduct.documentName}</p>
                <div className="product-preview-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={downloadingProductId === previewProduct.id}
                    onClick={() => handleDownloadMarketplaceDocument(previewProduct.id, previewProduct.documentName)}
                  >
                    {downloadingProductId === previewProduct.id ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button type="button" className="secondary-btn mini-btn" onClick={() => setPreviewProduct(null)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {notificationsOpen ? (
        <div className="notifications-sider" role="dialog" aria-modal="true" aria-label="Notifications panel">
          <div className="notifications-sider-header">
            <h3>Notifications</h3>
            <button type="button" className="text-btn close-btn" onClick={() => setNotificationsOpen(false)}>
              Close
            </button>
          </div>
          <div className="notifications-sider-body">
            {loadingNotifications ? (
              <p className="subtitle">Loading...</p>
            ) : notificationsList.length ? (
              <ul className="notifications-list">
                {notificationsList.map((n) => (
                  <li key={n._id || `${n.type}-${n.title}`}>
                    <div className="notif-title">{n.title || n.type || 'Notification'}</div>
                    <div className="notif-message">{n.message || ''}</div>
                    <div className="notif-meta">
                      <span>{new Date(n.createdAt || n.date || Date.now()).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="subtitle">No notifications.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ArtisanProfile

