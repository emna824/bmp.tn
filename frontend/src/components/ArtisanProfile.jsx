import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import { LockIcon, SettingsIcon, UserIcon } from './Icons'
import DashboardLayout from './DashboardLayout'
import ProductCard from './ProductCard'
import ReportModal from './ReportModal'
import { downloadFileReference } from '../utils/fileHelpers'
import { formatProductPrice, normalizeProduct } from '../utils/adminDashboard'
import { getStripeClient } from '../utils/stripe'

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Snapshot' },
  { key: 'offers', label: 'Offers', subtitle: 'Apply to projects' },
  { key: 'marketplace', label: 'Marketplace', subtitle: 'Manufacturer docs' },
  { key: 'settings', label: 'Settings', subtitle: 'Profile & security' },
]

const JOB_OPTIONS = ['Painter', 'Mason', 'Electrician', 'Plumber', 'Carpenter', 'Metalworker', 'Laborer']

function normalizeQuantity(value, max = 99) {
  const limit = Number.isInteger(max) && max > 0 ? Math.min(max, 99) : 99
  const parsed = Number.parseInt(String(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, limit) : 1
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
  const [offers, setOffers] = useState([])
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [applyingOfferId, setApplyingOfferId] = useState(null)
  const [salaryByOffer, setSalaryByOffer] = useState({})
  const [offerJobFilter, setOfferJobFilter] = useState(user?.job || '')
  const [marketplaceProducts, setMarketplaceProducts] = useState([])
  const [loadingMarketplace, setLoadingMarketplace] = useState(false)
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [payingProductId, setPayingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '', manufacturer: '' })
  const [offerSearch, setOfferSearch] = useState('')
  const [previewProduct, setPreviewProduct] = useState(null)
  const [marketplaceQuantities, setMarketplaceQuantities] = useState({})
  const [reportTarget, setReportTarget] = useState(null)

  const getMarketplaceQuantity = useCallback(
    (productId, stock) => normalizeQuantity(marketplaceQuantities[productId], stock),
    [marketplaceQuantities],
  )

  const handleMarketplaceQuantityChange = useCallback((productId, value, stock) => {
    if (!productId) return
    setMarketplaceQuantities((current) => ({
      ...current,
      [productId]: normalizeQuantity(value, stock),
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
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const paymentStatus = url.searchParams.get('payment')
    const view = url.searchParams.get('view')

    if (!paymentStatus) return

    if (view === 'marketplace') {
      setActiveView('marketplace')
    }

    if (paymentStatus === 'success') {
      showNotification('success', 'Payment completed successfully')
    } else if (paymentStatus === 'cancelled') {
      showNotification('error', 'Payment was cancelled')
    }

    url.searchParams.delete('payment')
    url.searchParams.delete('view')
    url.searchParams.delete('productId')
    url.searchParams.delete('session_id')
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  }, [showNotification])

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
      let response

      try {
        response = await api.get('/products')
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error
        }

        response = await api.get('/manufacturers/products')
      }

      setMarketplaceProducts((response.data?.products || []).map((product) => normalizeProduct(product)))
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load marketplace'
      showNotification('error', message)
    } finally {
      setLoadingMarketplace(false)
    }
  }, [showNotification])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])

  useEffect(() => {
    loadMarketplace()
  }, [loadMarketplace])

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
    {
      label: 'Marketplace docs',
      value: marketplaceProducts.length,
      detail: `${filteredMarketplaceProducts.length} showing`,
    },
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
      let response

      try {
        response = await api.get(`/products/${productId}/document`)
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error
        }

        response = await api.get(`/manufacturers/products/${productId}/document`)
      }

      const { document, documentName } = response.data || {}
      if (!document) {
        throw new Error('Document unavailable')
      }
      downloadFileReference(document, documentName || fallbackName || 'product.pdf')
      showNotification('success', 'Document downloaded')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to download document'
      showNotification('error', message)
    } finally {
      setDownloadingProductId(null)
    }
  }

  const handleCheckout = async (product) => {
    if (!product?.id) return
    if (!product.price || Number(product.price) <= 0) {
      showNotification('error', 'This product is not available for payment yet')
      return
    }

    if (Number(product.stock ?? 0) <= 0) {
      showNotification('error', 'This product is currently out of stock')
      return
    }

    const quantity = getMarketplaceQuantity(product.id, product.stock)

    setPayingProductId(product.id)
    try {
      const response = await api.post(
        '/payments/checkout-session',
        {
          productId: product.id,
          quantity,
        },
        {
          headers: {
            'x-user-id': userId,
          },
        },
      )

      if (!response.data?.url) {
        throw new Error('Checkout URL is missing')
      }

      if (typeof window !== 'undefined') {
        const stripe = await getStripeClient()

        if (stripe && response.data?.sessionId) {
          const result = await stripe.redirectToCheckout({ sessionId: response.data.sessionId })
          if (result?.error?.message) {
            throw new Error(result.error.message)
          }
          return
        }

        window.location.assign(response.data.url)
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to start payment'
      showNotification('error', message)
      setPayingProductId(null)
    }
  }

  const openReportModal = useCallback((targetType, targetId, targetLabel) => {
    if (!targetId) return
    setReportTarget({ targetType, targetId, targetLabel })
  }, [])

  const closeReportModal = useCallback(() => {
    setReportTarget(null)
  }, [])

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
                placeholder="Search offers or products..."
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
                            {Number(offer.projectId?.budget || offer.projectId?.estimatedBudget || 0).toLocaleString()} TND budget -
                            {' '}
                            {offer.availableSlots} slots left
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
                  <h3>Marketplace spotlight</h3>
                  <button type="button" className="text-btn" onClick={() => setActiveView('marketplace')}>
                    Browse
                  </button>
                </div>
                <div className="product-cards">
                  {filteredMarketplaceProducts.slice(0, 4).map((product) => (
                    <ProductCard
                      key={product.id}
                      variant="spotlight"
                      product={product}
                      downloading={downloadingProductId === product.id}
                      onDownload={() => handleDownloadMarketplaceDocument(product.id, product.documentName)}
                      onOpenReport={() =>
                        openReportModal('product', product.id, product.name || product.documentName || 'this product')
                      }
                    />
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
                        ? ` - Deadline ${new Date(offer.projectId?.endDate || offer.projectId?.deadline).toLocaleDateString()}`
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
                    <ProductCard
                      key={product.id}
                      variant="marketplace"
                      product={product}
                      paying={payingProductId === product.id}
                      quantity={getMarketplaceQuantity(product.id, product.stock)}
                      onQuantityChange={(value) =>
                        handleMarketplaceQuantityChange(product.id, value, product.stock)
                      }
                      onPayNow={() => handleCheckout(product)}
                      onViewDetails={() => setPreviewProduct(product)}
                      onOpenReport={() =>
                        openReportModal('product', product.id, product.name || product.documentName || 'this product')
                      }
                    />
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
            <div className="report-profile-cta">
              <div>
                <strong>Need moderation review?</strong>
                <p className="subtitle small">Submit a report for this profile if something looks wrong.</p>
              </div>
              <button
                type="button"
                className="secondary-btn report-trigger-btn"
                disabled={!userId}
                onClick={() => openReportModal('user', userId, profile?.name || profile?.email || 'this profile')}
              >
                Report profile
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
                  {previewProduct.price ? formatProductPrice(previewProduct.price) : '-'}
                </p>
                <p>
                  <strong>Stock: </strong>
                  {Number.isInteger(previewProduct.stock) ? previewProduct.stock : 0}
                </p>
                <label className="market-qty-field preview">
                  <span>Quantity</span>
                  <input
                    type="number"
                    min="1"
                    max={Number(previewProduct.stock ?? 0) > 0 ? previewProduct.stock : undefined}
                    step="1"
                    value={getMarketplaceQuantity(previewProduct.id, previewProduct.stock)}
                    disabled={Number(previewProduct.stock ?? 0) <= 0}
                    onChange={(event) =>
                      handleMarketplaceQuantityChange(previewProduct.id, event.target.value, previewProduct.stock)
                    }
                  />
                </label>
                {previewProduct.price && Number(previewProduct.stock ?? 0) > 0 ? (
                  <p className="subtitle small preview-total">
                    Total: {formatProductPrice(
                      Number(previewProduct.price || 0) *
                        getMarketplaceQuantity(previewProduct.id, previewProduct.stock),
                    )}
                  </p>
                ) : (
                  <p className="subtitle small preview-total">This product is currently out of stock.</p>
                )}
                <p className="subtitle small">Document: {previewProduct.documentName}</p>
                <div className="product-preview-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={
                      payingProductId === previewProduct.id ||
                      !previewProduct.price ||
                      Number(previewProduct.stock ?? 0) <= 0
                    }
                    onClick={() => handleCheckout(previewProduct)}
                  >
                    {payingProductId === previewProduct.id ? 'Redirecting...' : 'Pay now'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn mini-btn"
                    disabled={downloadingProductId === previewProduct.id}
                    onClick={() => handleDownloadMarketplaceDocument(previewProduct.id, previewProduct.documentName)}
                  >
                    {downloadingProductId === previewProduct.id ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    className="secondary-btn mini-btn report-trigger-btn"
                    onClick={() =>
                      openReportModal(
                        'product',
                        previewProduct.id,
                        previewProduct.name || previewProduct.documentName || 'this product',
                      )
                    }
                  >
                    Report
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

      <ReportModal
        isOpen={Boolean(reportTarget)}
        currentUserId={userId}
        targetType={reportTarget?.targetType || 'product'}
        targetId={reportTarget?.targetId || ''}
        targetLabel={reportTarget?.targetLabel || ''}
        onClose={closeReportModal}
        onSuccess={(message) => showNotification('success', message)}
      />
    </div>
  )
}

export default ArtisanProfile
