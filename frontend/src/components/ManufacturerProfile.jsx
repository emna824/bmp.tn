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
  const [form, setForm] = useState({ name: '', description: '' })
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [selectedDocumentName, setSelectedDocumentName] = useState('')
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })
  const [downloadingProductId, setDownloadingProductId] = useState(null)
  const [filters, setFilters] = useState({ search: '' })

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

    setCreatingProduct(true)
    try {
      const documentData = await readFileAsDataUrl(selectedDocument)
      await api.post('/manufacturers/products', {
        manufacturerId: user.id,
        name: form.name.trim(),
        description: form.description.trim(),
        document: documentData,
        documentName: selectedDocumentName || selectedDocument.name,
      })
      setForm({ name: '', description: '' })
      setSelectedDocument(null)
      setSelectedDocumentName('')
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
                        <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                        <td>
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
  )
}

export default ManufacturerProfile
