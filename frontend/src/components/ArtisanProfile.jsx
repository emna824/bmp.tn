import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import { LockIcon, SettingsIcon, UserIcon } from './Icons'
import DashboardLayout from './DashboardLayout'
import { downloadDataUrlFile } from '../utils/fileHelpers'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Snapshot' },
  { key: 'offers', label: 'Offers', subtitle: 'Apply to projects' },
  { key: 'invitations', label: 'Invitations', subtitle: 'Respond to experts' },
  { key: 'marketplace', label: 'Marketplace', subtitle: 'Manufacturer docs' },
  { key: 'settings', label: 'Settings', subtitle: 'Profile & security' },
]

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter', 'Metalworker', 'Laborer']

function normalizeQuantity(value) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function ArtisanProfile({ user, onLogout, onProfileUpdate }) {
  const userId = user?.id || user?._id || ''
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
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [invitations, setInvitations] = useState([])
  const [loadingInvitations, setLoadingInvitations] = useState(false)
  const [respondingChantier, setRespondingChantier] = useState(null)
  const [offers, setOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [applyingOfferId, setApplyingOfferId] = useState(null)
  const [salaryByOffer, setSalaryByOffer] = useState({})
  const [offerJobFilter, setOfferJobFilter] = useState(user?.job || '')
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '', manufacturer: '' })
  const [invitationSearch, setInvitationSearch] = useState('')
  const [offerSearch, setOfferSearch] = useState('')
  const [previewProduct, setPreviewProduct] = useState(null)
  const [marketplaceQuantities, setMarketplaceQuantities] = useState({})

  const getMarketplaceQuantity = useCallback(
    (productId) => normalizeQuantity(marketplaceQuantities[productId]),
    [marketplaceQuantities],
  )

  const handleMarketplaceQuantityChange = useCallback((productId, value) => {
    if (!productId) return
    setMarketplaceQuantities((current) => ({
      ...current,
      [productId]: normalizeQuantity(value),
    }))
  }, [])

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [notification])

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return
      setLoadingProfile(true)
      try {
        const response = await api.get(`/users/${userId}/profile`)
        const apiUser = response.data?.user
        if (apiUser) {
          const nextProfile = {
            ...apiUser,
            profileImage: typeof apiUser.profileImage === 'string' ? apiUser.profileImage : '',
          }
          setProfile(nextProfile)
          setName(nextProfile.name || '')
          setProfileImage(nextProfile.profileImage || '')
          setJob(nextProfile.job || '')
          if (!offerJobFilter && nextProfile.job) {
            setOfferJobFilter(nextProfile.job)
          }
        }
      } catch (error) {
        showNotification('error', error.response?.data?.message || 'Failed to load profile')
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [userId, onProfileUpdate, offerJobFilter, showNotification])

  const loadInvitations = useCallback(async () => {
    if (!userId) return
    setLoadingInvitations(true)
    try {
      const response = await api.get(`/assignments/invitations/${userId}`)
      setInvitations(response.data?.invitations || [])
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load invitations'
      showNotification('error', message)
    } finally {
      setLoadingInvitations(false)
    }
  }, [userId, showNotification])

  const loadOffers = useCallback(async () => {
    setLoadingOffers(true)
    try {
      const response = await api.get('/offers', {
        params: {
          status: 'open',
          ...(offerJobFilter ? { job: offerJobFilter } : {}),
        },
      })
      setOffers(response.data?.offers || [])
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load offers'
      showNotification('error', message)
    } finally {
      setLoadingOffers(false)
    }
  }, [offerJobFilter, showNotification])

  const loadMarketplace = useCallback(async () => {
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
    loadInvitations()
  }, [loadInvitations])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])

  useEffect(() => {
    loadMarketplace()
  }, [loadMarketplace])

  const pendingInvitations = invitations.filter((invite) => invite.status === 'pending').length
  const acceptedInvitations = invitations.filter((invite) => invite.status === 'accepted').length
  const declinedInvitations = invitations.filter((invite) => invite.status === 'declined').length

  const filteredInvitations = useMemo(() => {
    const term = invitationSearch.trim().toLowerCase()
    if (!term) return invitations
    return invitations.filter((inv) =>
      [inv.projectName, inv.chantierName, inv.jobTitle].some((value) => String(value || '').toLowerCase().includes(term)),
    )
  }, [invitationSearch, invitations])

  const filteredOffers = useMemo(() => {
    const term = offerSearch.trim().toLowerCase()
    return offers.filter((offer) => {
      if (!term) return true
      return [offer.job, offer.projectId?.projectName, offer.projectId?.title, offer.projectId?.description]
        .some((value) => String(value || '').toLowerCase().includes(term))
    })
  }, [offerSearch, offers])

  const filteredMarketplaceProducts = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase()
    return marketplaceProducts.filter((product) => {
      const matchesManufacturer =
        !filters.manufacturer ||
        product.manufacturer?.name?.toLowerCase() === filters.manufacturer.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        product.name?.toLowerCase().includes(searchTerm) ||
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

  const availableOfferJobs = useMemo(() => {
    const jobs = new Set()
    offers.forEach((offer) => {
      if (offer.job) jobs.add(offer.job)
    })
    if (profile?.job) jobs.add(profile.job)
    return Array.from(jobs)
  }, [offers, profile?.job])

  const overviewStats = [
    { label: 'Offers', value: offers.length, detail: offerJobFilter ? `Filtered by ${offerJobFilter}` : 'Open now' },
    { label: 'Invitations', value: invitations.length, detail: `${pendingInvitations} pending` },
    { label: 'Marketplace docs', value: marketplaceProducts.length, detail: `${filteredMarketplaceProducts.length} showing` },
    { label: 'Trade', value: profile?.job || 'Unset', detail: 'Your artisan role' },
  ]

  const handleSaveName = async (event) => {
    event.preventDefault()
    if (!name.trim()) {
      showNotification('error', 'Name is required')
      return
    }

    setSavingName(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, { name: name.trim() })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
      }
      setProfile(nextProfile)
      setName(nextProfile.name || '')
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile updated')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update profile')
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
      setProfileImage(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      showNotification('error', 'Failed to read selected image')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveImage = async () => {
    setSavingImage(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, {
        name: (name || profile?.name || '').trim(),
        profileImage,
      })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
        profileImage,
      }
      setProfile(nextProfile)
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', response.data?.message || 'Profile image updated')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update image')
    } finally {
      setSavingImage(false)
    }
  }

  const handleSaveJob = async (event) => {
    event.preventDefault()
    if (!job) {
      showNotification('error', 'Please select your trade')
      return
    }

    setSavingJob(true)
    try {
      const response = await api.put(`/users/${userId}/profile`, {
        name: (name || profile?.name || '').trim(),
        job,
      })
      const nextProfile = {
        ...profile,
        ...(response.data?.user || {}),
        job,
      }
      setProfile(nextProfile)
      setOfferJobFilter(job)
      if (onProfileUpdate) {
        onProfileUpdate(nextProfile)
      }
      showNotification('success', 'Trade saved')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update trade')
    } finally {
      setSavingJob(false)
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
      const response = await api.put(`/users/${userId}/password`, {
        currentPassword,
        newPassword,
      })
      showNotification('success', response.data?.message || 'Password updated')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleAssignmentResponse = async (chantierId, responseText) => {
    if (!chantierId) return
    setRespondingChantier(chantierId)
    try {
      await api.post('/assignments/respond', {
        artisanId: userId,
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
      showNotification('success', `Invitation ${responseText}`)
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to send response')
    } finally {
      setRespondingChantier(null)
    }
  }

  const handleApply = async (offerId) => {
    const salary = Number(salaryByOffer[offerId])
    if (Number.isNaN(salary) || salary < 0) {
      showNotification('error', 'Enter a valid daily salary before applying')
      return
    }

    setApplyingOfferId(offerId)
    try {
      await api.post(`/offers/${offerId}/apply`, {
        artisanId: userId,
        proposedDailySalary: salary,
      })
      setOffers((current) => current.filter((offer) => offer._id !== offerId))
      setSalaryByOffer((current) => ({ ...current, [offerId]: '' }))
      showNotification('success', 'Application sent successfully')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to apply to offer')
    } finally {
      setApplyingOfferId(null)
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
          <div className="artisan-dashboard">
            <div className="dash-top">
              <input
                className="dash-search"
                type="search"
                placeholder="Search offers, invitations, or products..."
                value={offerSearch}
                onChange={(event) => setOfferSearch(event.target.value)}
              />
              <div className="dash-actions">
                <button type="button" className="secondary-btn" onClick={() => setActiveView('offers')}>
                  Offers
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
                  <h3>Open offers</h3>
                  <button type="button" className="text-btn" onClick={() => setActiveView('offers')}>
                    View all
                  </button>
                </div>
                <div className="invitation-list">
                  {filteredOffers.slice(0, 4).map((offer) => (
                    <article key={offer._id} className="invitation-card">
                      <div className="inv-meta">
                        <div>
                          <p className="inv-title">{offer.projectId?.projectName || offer.projectId?.title || 'Project'}</p>
                          <p className="inv-subtitle">{offer.job}</p>
                          <p className="inv-desc">
                            {(offer.projectId?.budget || 0).toLocaleString()} TND budget · {offer.availableSlots} slots left
                          </p>
                          <div className="inv-tags">
                            <span className="badge">{offer.job}</span>
                            <span className={`pill status-${offer.status}`}>{offer.status}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!offers.length ? <p className="subtitle">No open offers right now.</p> : null}
                </div>
              </section>

              <section className="card-panel">
                <div className="panel-header">
                  <h3>Recent invitations</h3>
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
                          <p className="inv-desc">{invite.jobTitle}</p>
                          <div className="inv-tags">
                            <span className="badge">{invite.jobTitle}</span>
                            <span className={`pill status-${invite.status}`}>{invite.status}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!invitations.length ? <p className="subtitle">No invitations yet.</p> : null}
                </div>
              </section>

              <section className="card-panel">
                <div className="panel-header">
                  <h3>Marketplace spotlight</h3>
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
                        <p className="product-desc">{product.description || '-'}</p>
                      </div>
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={downloadingProductId === product.id}
                        onClick={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                      >
                        {downloadingProductId === product.id ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </article>
                  ))}
                  {!filteredMarketplaceProducts.length ? <p className="subtitle">No marketplace items.</p> : null}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === 'offers' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Open offers</h3>
              <p className="subtitle">Apply to expert job offers with your proposed daily salary.</p>
            </div>
            <div className="dash-filter-row">
              <input
                type="search"
                placeholder="Search offers..."
                value={offerSearch}
                onChange={(event) => setOfferSearch(event.target.value)}
              />
              <select value={offerJobFilter} onChange={(event) => setOfferJobFilter(event.target.value)}>
                <option value="">All trades</option>
                {availableOfferJobs.map((offerJob) => (
                  <option key={offerJob} value={offerJob}>
                    {offerJob}
                  </option>
                ))}
              </select>
            </div>
            {loadingOffers ? (
              <p className="subtitle">Loading offers...</p>
            ) : filteredOffers.length ? (
              <div className="offer-grid">
                {filteredOffers.map((offer) => (
                  <article key={offer._id} className="offer-card">
                    <div className="offer-card-head">
                      <div>
                        <h4>{offer.job}</h4>
                        <p className="subtitle small">{offer.projectId?.projectName || offer.projectId?.title || 'Project'}</p>
                      </div>
                      <span className="status-pill status-open">{offer.availableSlots} open</span>
                    </div>
                    <p className="subtitle">
                      Budget: {Number(offer.projectId?.estimatedBudget || offer.projectId?.budget || 0).toLocaleString()} TND
                      {offer.projectId?.endDate || offer.projectId?.deadline
                        ? ` · Deadline ${new Date(offer.projectId?.endDate || offer.projectId?.deadline).toLocaleDateString()}`
                        : ''}
                    </p>
                    <label>
                      Proposed daily salary
                      <input
                        type="number"
                        min="0"
                        value={salaryByOffer[offer._id] || ''}
                        onChange={(event) =>
                          setSalaryByOffer((current) => ({
                            ...current,
                            [offer._id]: event.target.value,
                          }))
                        }
                        placeholder="80"
                      />
                    </label>
                    <button type="button" disabled={applyingOfferId === offer._id} onClick={() => handleApply(offer._id)}>
                      {applyingOfferId === offer._id ? 'Applying...' : 'Apply now'}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <p className="subtitle">No offers match your filters right now.</p>
            )}
          </section>
        )}

        {activeView === 'invitations' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Chantier invitations</h3>
              <p className="subtitle">Respond to expert requests for chantier assignments.</p>
            </div>
            <div className="dash-filter-row">
              <input
                type="search"
                placeholder="Search invitations..."
                value={invitationSearch}
                onChange={(event) => setInvitationSearch(event.target.value)}
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
              <p className="subtitle">
                {acceptedInvitations || declinedInvitations
                  ? 'No invitations match this search.'
                  : 'You have no invitations right now.'}
              </p>
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
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <div className="market-filters">
                <select
                  value={filters.manufacturer}
                  onChange={(event) => setFilters((prev) => ({ ...prev, manufacturer: event.target.value }))}
                >
                  <option value="">All manufacturers</option>
                  {manufacturerOptions.map((manufacturerName) => (
                    <option key={manufacturerName} value={manufacturerName}>
                      {manufacturerName}
                    </option>
                  ))}
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
                        {product.image ? (
                          <img src={product.image} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="market-img-fallback">{product.name?.charAt(0) || 'P'}</div>
                        )}
                      </div>
                      <div className="market-card-body">
                        <p className="market-title">{product.name}</p>
                        <p className="market-subtitle">{product.manufacturer?.name || 'Manufacturer'}</p>
                        <p className="market-desc">{product.description || 'No description provided.'}</p>
                        <div className="market-meta">
                          <span className="meta-chip">{product.documentName || 'PDF'}</span>
                          {product.price ? (
                            <span className="meta-chip price-chip">
                              {product.price} {product.priceUnit || 'TND'}
                            </span>
                          ) : null}
                        </div>
                        <label className="market-qty-field">
                          <span>Quantity</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={getMarketplaceQuantity(product.id)}
                            onChange={(event) => handleMarketplaceQuantityChange(product.id, event.target.value)}
                          />
                        </label>
                        {product.price ? (
                          <p className="subtitle small">
                            Total: {(Number(product.price || 0) * getMarketplaceQuantity(product.id)).toFixed(2)}{' '}
                            {product.priceUnit || 'TND'}
                          </p>
                        ) : null}
                      </div>
                      <div className="market-card-actions">
                        <button type="button" className="mini-btn" onClick={() => setPreviewProduct(product)}>
                          View details
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
              <p className="subtitle">Manage your artisan profile and account security.</p>
            </div>
            {loadingProfile ? <p className="subtitle">Refreshing profile...</p> : null}

            <div className="settings-content">
              <p><strong>Email:</strong> {profile?.email || '-'}</p>
              <p><strong>Trade:</strong> {profile?.job || 'Not set'}</p>
              <p><strong>Artisan ID:</strong> {userId || 'Missing'}</p>
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
                  Profile image
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} />
              </label>

              {profileImage ? <img src={profileImage} alt="Profile preview" className="profile-preview" /> : null}

              <div className="image-actions">
                <button type="button" onClick={handleSaveImage} disabled={savingImage}>
                  {savingImage ? 'Uploading...' : 'Save image'}
                </button>
                <button type="button" className="secondary-btn" onClick={() => setProfileImage('')} disabled={savingImage}>
                  Remove selected
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveJob} noValidate>
              <label>
                <span className="label-with-icon">
                  <SettingsIcon className="icon tiny" />
                  Your trade
                </span>
                <select value={job} onChange={(event) => setJob(event.target.value)}>
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
                  Current password
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
                  New password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </label>
              <button type="submit" disabled={savingPassword}>
                {savingPassword ? 'Updating...' : 'Change password'}
              </button>
            </form>
          </section>
        )}
      </DashboardLayout>

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
                  {previewProduct.manufacturer?.name || '-'}
                </p>
                <p>
                  <strong>Price: </strong>
                  {previewProduct.price ? `${previewProduct.price} ${previewProduct.priceUnit || 'TND'}` : '-'}
                </p>
                <label className="market-qty-field preview">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={getMarketplaceQuantity(previewProduct.id)}
                    onChange={(event) => handleMarketplaceQuantityChange(previewProduct.id, event.target.value)}
                  />
                </label>
                {previewProduct.price ? (
                  <p className="subtitle small preview-total">
                    Total: {(Number(previewProduct.price || 0) * getMarketplaceQuantity(previewProduct.id)).toFixed(2)}{' '}
                    {previewProduct.priceUnit || 'TND'}
                  </p>
                ) : null}
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
    </div>
  )
}

export default ArtisanProfile
