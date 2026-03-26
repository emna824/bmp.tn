import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import DashboardLayout from './DashboardLayout'
import { readFileAsDataUrl, downloadDataUrlFile } from '../utils/fileHelpers'

const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', subtitle: 'Create and publish' },
  { key: 'catalog', label: 'Catalog', subtitle: 'Filter listings' },
  { key: 'settings', label: 'Settings', subtitle: 'Company info' },
]

function ManufacturerProfile({ user, onLogout }) {
  const [activeView, setActiveView] = useState('overview')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', priceUnit: 'TND', image: '' })
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedDocumentName, setSelectedDocumentName] = useState('')
  const [selectedImageName, setSelectedImageName] = useState('')
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [previewProduct, setPreviewProduct] = useState(null)

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3000)
    return () => clearTimeout(timer)
  }, [notification])

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const response = await api.get('/manufacturers/products')
      setProducts(response.data?.products || [])
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load products'
      showNotification('error', message)
    } finally {
      setLoadingProducts(false)
    }
  }, [showNotification])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleDocumentPick = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedDocument(null)
      setSelectedDocumentName('')
      return
    }

    if (file.type !== 'application/pdf') {
      showNotification('error', 'Only PDF files are allowed as documentation')
      return
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      showNotification('error', 'Document must be 6 MB or less')
      return
    }

    setSelectedDocument(file)
    setSelectedDocumentName(file.name)
  }

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      setForm((prev) => ({ ...prev, image: '' }))
      setSelectedImageName('')
      return
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    const maxBytes = 2 * 1024 * 1024
    if (!allowed.includes(file.type)) {
      showNotification('error', 'Image must be PNG, JPG or WEBP')
      return
    }
    if (file.size > maxBytes) {
      showNotification('error', 'Image must be 2 MB or less')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      setForm((prev) => ({ ...prev, image: dataUrl }))
      setSelectedImageName(file.name)
    } catch (err) {
      showNotification('error', 'Failed to read image')
    }
  }

  const handleCreateProduct = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      showNotification('error', 'Product name is required')
      return
    }
    if (!selectedDocument) {
      showNotification('error', 'Please attach a PDF for the product')
      return
    }
    if (!form.image) {
      showNotification('error', 'Please add a product image')
      return
    }
    if (form.price === '' || Number(form.price) < 0) {
      showNotification('error', 'Please enter a valid price')
      return
    }

    setCreatingProduct(true)
    try {
      const documentData = await readFileAsDataUrl(selectedDocument)
      const numericPrice = form.price === '' ? null : Number(form.price)
      await api.post('/manufacturers/products', {
        manufacturerId: user.id,
        name: form.name.trim(),
        description: form.description.trim(),
        document: documentData,
        documentName: selectedDocumentName || selectedDocument.name,
        price: Number.isFinite(numericPrice) ? numericPrice : null,
        priceUnit: form.priceUnit || 'TND',
        image: form.image,
      })
      setForm({ name: '', description: '', price: '', priceUnit: 'TND', image: '' })
      setSelectedDocument(null)
      setSelectedDocumentName('')
      setSelectedImageName('')
      setFilters({ search: '' })
      showNotification('success', 'Product added to marketplace')
      fetchProducts()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to create product'
      showNotification('error', message)
    } finally {
      setCreatingProduct(false)
    }
  }

  const handleDownloadDocument = async (productId, fallbackName) => {
    if (!productId) return
    setDownloadingProductId(productId)
    try {
      const response = await api.get(`/manufacturers/products/${productId}/document`)
      const { document, documentName } = response.data || {}
      if (!document) {
        throw new Error('Document missing')
      }
      downloadDataUrlFile(document, documentName || fallbackName || 'document.pdf')
      showNotification('success', 'Document ready for download')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to download document'
      showNotification('error', message)
    } finally {
      setDownloadingProductId(null)
    }
  }

  const openPreview = (product) => {
    setPreviewProduct(product)
  }

  const closePreview = () => {
    setPreviewProduct(null)
  }

  const filteredProducts = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return products.filter(
      (product) =>
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term),
    )
  }, [filters.search, products])

  const productStats = [
    {
      label: 'Published products',
      value: products.length || 0,
      detail: `${filteredProducts.length} shown`,
    },
    {
      label: 'Upload ready',
      value: creatingProduct ? 'Uploading' : 'Idle',
      detail: 'PDF per listing',
    },
  ]

  return (
    <>
    <div className="manufacturer-profile">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <DashboardLayout
        user={user}
        menuItems={MENU_ITEMS}
        activeView={activeView}
        onNavigate={setActiveView}
        onLogout={onLogout}
      >
        {activeView === 'overview' && (
          <>
            <div className="dashboard-overview">
              {productStats.map((stat) => (
                <div key={stat.label} className="summary-pill">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                  <small>{stat.detail}</small>
                </div>
              ))}
            </div>
            <section className="dashboard-card">
              <div className="section-header">
                <h3>Create product listing</h3>
                <p className="subtitle">Attach a PDF specification for artisans to review.</p>
              </div>
              <form onSubmit={handleCreateProduct}>
                <label>
                  <span className="label-with-icon">Name</span>
                  <input name="name" value={form.name} onChange={handleFormChange} placeholder="Product name" />
                </label>
                <label>
                  <span className="label-with-icon">Description</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Optional description"
                    rows="3"
                  />
                </label>
                <label>
                  <span className="label-with-icon">Documentation (PDF)</span>
                  <input type="file" accept="application/pdf" onChange={handleDocumentPick} />
                </label>
                {selectedDocument ? (
                  <p className="subtitle small">Selected file: {selectedDocumentName}</p>
                ) : (
                  <p className="subtitle small">Maximum file size 6 MB.</p>
                )}
                <label>
                  <span className="label-with-icon">Image (PNG/JPG/WEBP)</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} />
                </label>
                {form.image ? (
                  <p className="subtitle small">Selected image: {selectedImageName || 'Preview ready'}</p>
                ) : (
                  <p className="subtitle small">Optional thumbnail, max 2 MB.</p>
                )}
                <label>
                  <span className="label-with-icon">Price</span>
                  <div className="price-row">
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={handleFormChange}
                      placeholder="e.g. 120"
                    />
                    <input
                      name="priceUnit"
                      value={form.priceUnit}
                      onChange={handleFormChange}
                      placeholder="TND"
                      className="price-unit"
                    />
                  </div>
                </label>
                <button type="submit" disabled={creatingProduct}>
                  {creatingProduct ? 'Uploading...' : 'Publish product'}
                </button>
              </form>
            </section>
          </>
        )}

        {activeView === 'catalog' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Your marketplace listings</h3>
              <p className="subtitle">Use filters to find a document quickly.</p>
            </div>
            <div className="dashboard-filters">
              <input
                placeholder="Search title or description"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
              <button type="button" className="secondary-btn" onClick={() => setFilters({ search: '' })}>
                Clear search
              </button>
            </div>
            {loadingProducts ? (
              <p className="subtitle">Loading listings...</p>
            ) : filteredProducts.length ? (
              <div className="table-wrap">
                <table className="artisan-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Description</th>
                      <th>Price</th>
                      <th>Uploaded</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.name}</strong>
                          <p className="subtitle small">{product.documentName}</p>
                        </td>
                        <td>{product.description || '—'}</td>
                        <td>{product.price ? `${product.price} ${product.priceUnit || 'TND'}` : '—'}</td>
                        <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button type="button" className="mini-btn" onClick={() => openPreview(product)}>
                            View details
                          </button>
                          <button
                            type="button"
                            className="secondary-btn mini-btn"
                            disabled={downloadingProductId === product.id}
                            onClick={() => handleDownloadDocument(product.id, product.documentName)}
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
              <p className="subtitle">No products published yet.</p>
            )}
          </section>
        )}

        {activeView === 'settings' && (
          <section className="dashboard-card">
            <div className="section-header">
              <h3>Company profile</h3>
              <p className="subtitle">Keep your manufacturing credentials visible.</p>
            </div>
            <div className="settings-content">
              <p>
                <strong>Name:</strong> {user?.name || '—'}
              </p>
              <p>
                <strong>Patent:</strong> {user?.patent || '—'}
              </p>
              <p>
                <strong>Address:</strong> {user?.address || '—'}
              </p>
              <p>
                <strong>Phone:</strong> {user?.companyPhone || '—'}
              </p>
              <button type="button" className="secondary-btn" onClick={() => setActiveView('overview')}>
                Back to overview
              </button>
            </div>
          </section>
        )}
      </DashboardLayout>
    </div>

    {previewProduct ? (
      <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Product details">
        <section className="settings-modal product-preview">
          <div className="settings-header">
            <h3>{previewProduct.name}</h3>
            <button type="button" className="text-btn close-btn" onClick={closePreview}>
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
                <strong>Price: </strong>
                {previewProduct.price ? `${previewProduct.price} ${previewProduct.priceUnit || 'TND'}` : '—'}
              </p>
              <p className="subtitle small">Document: {previewProduct.documentName}</p>
              <div className="product-preview-actions">
                <button
                  type="button"
                  className="mini-btn"
                  disabled={downloadingProductId === previewProduct.id}
                  onClick={() => handleDownloadDocument(previewProduct.id, previewProduct.documentName)}
                >
                  {downloadingProductId === previewProduct.id ? 'Downloading...' : 'Download PDF'}
                </button>
                <button type="button" className="secondary-btn mini-btn" onClick={closePreview}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    ) : null}
    </>
  )
}

export default ManufacturerProfile
