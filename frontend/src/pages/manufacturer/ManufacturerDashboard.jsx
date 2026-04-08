import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import Sidebar from '../../components/manufacturer/Sidebar'
import Topbar from '../../components/manufacturer/Topbar'
import ProductCard from '../../components/manufacturer/ProductCard'
import AddProductPage from './AddProductPage'
import EditProductPage from './EditProductPage'
import ProductsPage from './ProductsPage'
import ProfilePage from './ProfilePage'
import { formatProductPrice } from '../../utils/adminDashboard'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'My Products' },
  { key: 'add', label: 'Add Product' },
  { key: 'profile', label: 'Profile' },
]

function normalizeProduct(product = {}) {
  return {
    id: product.id || product._id || '',
    name: product.name || 'Unnamed product',
    description: product.description || '',
    price: product.price ?? null,
    stock: Number.isInteger(product.stock) ? product.stock : 1,
    image: product.image || '',
    document: product.document || product.documentation || '',
    documentName: product.documentName || '',
    createdAt: product.createdAt || null,
  }
}

async function fetchManufacturerProducts(manufacturerId) {
  try {
    const response = await api.get(`/products/manufacturer/${manufacturerId}`)
    return response.data?.products || []
  } catch (error) {
    if (error.response?.status && error.response.status !== 404) {
      throw error
    }
  }

  try {
    const response = await api.get('/products', {
      params: { manufacturerId },
      headers: { 'x-user-id': manufacturerId },
    })
    return response.data?.products || []
  } catch (error) {
    if (error.response?.status && error.response.status !== 404) {
      throw error
    }
  }

  const fallbackResponse = await api.get('/manufacturers/products', {
    params: { manufacturerId },
  })
  return fallbackResponse.data?.products || []
}

function ManufacturerDashboard({
  user,
  onLogout,
  onProfileUpdate,
  onCancelSubscription,
  cancellingSubscription = false,
}) {
  const manufacturerId = user?.id || user?._id || ''
  const [activeView, setActiveView] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [profile, setProfile] = useState({
    ...user,
    companyName: user?.companyName || user?.name || '',
  })
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submittingProduct, setSubmittingProduct] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [editingProductId, setEditingProductId] = useState('')
  const [notification, setNotification] = useState({ show: false, type: '', text: '' })

  const showNotification = useCallback((type, text) => {
    setNotification({ show: true, type, text })
  }, [])

  useEffect(() => {
    if (!notification.show) return undefined
    const timer = setTimeout(() => setNotification({ show: false, type: '', text: '' }), 3200)
    return () => clearTimeout(timer)
  }, [notification])

  const loadProfile = useCallback(async () => {
    if (!manufacturerId) return

    try {
      const response = await api.get(`/users/${manufacturerId}/profile`)
      const nextProfile = response.data?.user
      if (nextProfile) {
        setProfile({
          ...nextProfile,
          companyName: nextProfile.companyName || nextProfile.name || '',
        })
      }
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load profile')
    }
  }, [manufacturerId, showNotification])

  const loadProducts = useCallback(async () => {
    if (!manufacturerId) return
    setLoadingProducts(true)

    try {
      const responseProducts = await fetchManufacturerProducts(manufacturerId)
      setProducts(responseProducts.map((product) => normalizeProduct(product)))
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to load products')
    } finally {
      setLoadingProducts(false)
    }
  }, [manufacturerId, showNotification])

  useEffect(() => {
    loadProfile()
    loadProducts()
  }, [loadProfile, loadProducts])

  useEffect(() => {
    if (!user) return

    setProfile((current) => ({
      ...current,
      ...user,
      companyName: current?.companyName || user?.companyName || user?.name || '',
    }))
  }, [user])

  const handleCreateProduct = async (payload) => {
    setSubmittingProduct(true)
    try {
      let response

      try {
        response = await api.post(
          '/products',
          {
            manufacturerId,
            ...payload,
          },
          {
            headers: {
              'x-user-id': manufacturerId,
            },
          },
        )
      } catch (error) {
        if (error.response?.status && ![404, 405].includes(error.response.status)) {
          throw error
        }

        response = await api.post('/manufacturers/products', {
          manufacturerId,
          ...payload,
        })
      }

      const nextProduct = response.data?.product
      if (nextProduct) {
        setProducts((current) => [normalizeProduct(nextProduct), ...current])
      } else {
        await loadProducts()
      }

      showNotification('success', response.data?.message || 'Product added successfully')
      setActiveView('products')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to add product')
    } finally {
      setSubmittingProduct(false)
    }
  }

  const handleUpdateProduct = async (payload) => {
    if (!editingProductId) return

    setSubmittingProduct(true)
    try {
      const response = await api.put(
        `/products/${editingProductId}`,
        {
          manufacturerId,
          ...payload,
        },
        {
          headers: {
            'x-user-id': manufacturerId,
          },
        },
      )

      const updatedProduct = normalizeProduct(response.data?.product || { id: editingProductId, ...payload })
      setProducts((current) =>
        current.map((product) => (product.id === editingProductId ? updatedProduct : product)),
      )
      showNotification('success', response.data?.message || 'Product updated successfully')
      setEditingProductId('')
      setActiveView('products')
    } catch (error) {
      showNotification(
        'error',
        error.response?.data?.message || 'Failed to update product. Check that the backend update route exists.',
      )
    } finally {
      setSubmittingProduct(false)
    }
  }

  const handleDeleteProduct = async (product) => {
    if (!product?.id) return
    if (!window.confirm(`Delete ${product.name}?`)) return

    setDeletingProductId(product.id)
    try {
      await api.delete(`/products/${product.id}`, {
        headers: {
          'x-user-id': manufacturerId,
        },
      })
      setProducts((current) => current.filter((entry) => entry.id !== product.id))
      showNotification('success', 'Product deleted successfully')
    } catch (error) {
      showNotification(
        'error',
        error.response?.data?.message || 'Failed to delete product. Check backend permissions for manufacturers.',
      )
    } finally {
      setDeletingProductId('')
    }
  }

  const handleSaveProfile = async ({ name, companyName }) => {
    if (!name) {
      showNotification('error', 'Name is required')
      return
    }

    setSavingProfile(true)
    try {
      const response = await api.put(`/users/${manufacturerId}/profile`, { name })
      const nextProfile = {
        ...(profile || {}),
        ...(response.data?.user || {}),
        companyName: companyName || name,
      }
      setProfile(nextProfile)
      onProfileUpdate?.(nextProfile)
      showNotification('success', response.data?.message || 'Profile updated successfully')
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const latestProducts = useMemo(() => products.slice(0, 3), [products])
  const totalUnitsInStock = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    [products],
  )
  const totalCatalogValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0),
    [products],
  )
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === editingProductId) || null,
    [products, editingProductId],
  )

  const quickStats = [
    {
      label: 'Total products',
      value: products.length,
      detail: 'Items currently listed',
    },
    {
      label: 'Units in stock',
      value: totalUnitsInStock,
      detail: 'Available quantity across your catalog',
    },
    {
      label: 'Latest upload',
      value: latestProducts[0]?.name || 'None',
      detail: latestProducts[0]?.createdAt
        ? new Date(latestProducts[0].createdAt).toLocaleDateString()
        : 'Add your first item',
    },
    {
      label: 'Catalog value',
      value: formatProductPrice(totalCatalogValue),
      detail: 'Combined value across listed stock',
    },
  ]

  const renderContent = () => {
    if (activeView === 'products') {
      return (
        <ProductsPage
          products={products}
          loading={loadingProducts}
          deletingProductId={deletingProductId}
          onEdit={(product) => {
            setEditingProductId(product.id)
            setActiveView('edit')
          }}
          onDelete={handleDeleteProduct}
          onAddProduct={() => setActiveView('add')}
        />
      )
    }

    if (activeView === 'add') {
      return (
        <AddProductPage
          submitting={submittingProduct}
          onSubmit={handleCreateProduct}
          onCancel={() => setActiveView('products')}
          userId={manufacturerId}
        />
      )
    }

    if (activeView === 'edit') {
      return (
        <EditProductPage
          product={selectedProduct}
          submitting={submittingProduct}
          onSubmit={handleUpdateProduct}
          onCancel={() => {
            setEditingProductId('')
            setActiveView('products')
          }}
          userId={manufacturerId}
        />
      )
    }

    if (activeView === 'profile') {
      return <ProfilePage profile={profile} saving={savingProfile} onSave={handleSaveProfile} />
    }

    return (
      <section className="manufacturer-page-stack">
        <div className="manufacturer-page-panel manufacturer-page-header">
          <div>
            <p className="manufacturer-page-eyebrow">Dashboard</p>
            <h2>Professional catalog overview</h2>
            <p>Track your product activity, review recent items, and jump quickly into catalog management.</p>
          </div>
        </div>

        <div className="manufacturer-stats-grid">
          {quickStats.map((stat) => (
            <article key={stat.label} className="manufacturer-stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          ))}
        </div>

        <div className="manufacturer-page-panel">
          <div className="manufacturer-section-head">
            <div>
              <p className="manufacturer-page-eyebrow">Latest Products</p>
              <h3>Recently added items</h3>
            </div>
            <button type="button" className="secondary-btn" onClick={() => setActiveView('products')}>
              View all products
            </button>
          </div>

          {loadingProducts ? (
            <div className="manufacturer-empty-state">Loading products...</div>
          ) : latestProducts.length ? (
            <div className="manufacturer-products-grid compact">
              {latestProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  deleting={deletingProductId === product.id}
                  onEdit={() => {
                    setEditingProductId(product.id)
                    setActiveView('edit')
                  }}
                  onDelete={() => handleDeleteProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="manufacturer-empty-state">No products yet. Start by adding your first item.</div>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="manufacturer-shell">
      <div
        className={`notification ${notification.show ? 'show' : ''} ${notification.type || ''}`}
        role="status"
        aria-live="polite"
      >
        {notification.text}
      </div>

      <Sidebar items={NAV_ITEMS} activeView={activeView} onNavigate={setActiveView} />

      <div className="manufacturer-shell-main">
        <Topbar
          manufacturerName={profile?.name || user?.name}
          isPremium={profile?.isPremium ?? user?.isPremium}
          onCancelSubscription={onCancelSubscription}
          cancellingSubscription={cancellingSubscription}
          onLogout={onLogout}
        />
        <main className="manufacturer-shell-content">{renderContent()}</main>
      </div>
    </div>
  )
}

export default ManufacturerDashboard
