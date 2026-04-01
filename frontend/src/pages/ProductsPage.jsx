import { useEffect, useState } from 'react'
import api from '../api'
import ProductCard from '../components/ProductCard'
import { normalizeProduct, withAdminHeaders } from '../utils/adminDashboard'

function ProductsPage({ user }) {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeProductId, setActiveProductId] = useState('')

  const loadProducts = async () => {
    setLoading(true)
    setError('')

    try {
      let response

      try {
        response = await api.get('/products', withAdminHeaders(user))
      } catch (requestError) {
        if (requestError.response?.status !== 404) {
          throw requestError
        }

        response = await api.get('/manufacturers/products', withAdminHeaders(user))
      }

      setProducts((response.data?.products || response.data || []).map((item) => normalizeProduct(item)))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return

    setActiveProductId(product.id)
    try {
      await api.delete(`/products/${product.id}`, withAdminHeaders(user))
      setProducts((current) => current.filter((item) => item.id !== product.id))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete product')
    } finally {
      setActiveProductId('')
    }
  }

  const filteredProducts = products.filter((entry) => {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return (
      entry.name.toLowerCase().includes(query) ||
      entry.manufacturerName.toLowerCase().includes(query) ||
      entry.description.toLowerCase().includes(query)
    )
  })

  return (
    <section className="admin-page-stack">
      <div className="admin-panel admin-panel-header">
        <div>
          <p className="admin-eyebrow">Products</p>
          <h2>Moderate marketplace listings</h2>
          <p>Inspect listings and remove products that violate platform rules.</p>
        </div>
        <div className="admin-summary-inline">
          <strong>{products.length}</strong>
          <span>listed products</span>
        </div>
      </div>

      <div className="admin-panel admin-toolbar">
        <input
          type="search"
          placeholder="Search by product or manufacturer"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" className="admin-action-btn admin-action-neutral" onClick={loadProducts}>
          Refresh
        </button>
      </div>

      {error ? <div className="admin-banner error">{error}</div> : null}

      {loading ? (
        <div className="admin-empty-state">Loading products...</div>
      ) : filteredProducts.length ? (
        <div className="admin-card-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isBusy={activeProductId === product.id}
              onDelete={() => handleDelete(product)}
            />
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">No products match your search.</div>
      )}
    </section>
  )
}

export default ProductsPage
