import { useMemo, useState } from 'react'
import ProductCard from '../../components/manufacturer/ProductCard'

function ProductsPage({ products, loading, deletingProductId, onEdit, onDelete, onAddProduct }) {
  const [search, setSearch] = useState('')

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return products

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
      )
    })
  }, [products, search])

  return (
    <section className="manufacturer-page-stack">
      <div className="manufacturer-page-panel manufacturer-page-header">
        <div>
          <p className="manufacturer-page-eyebrow">My Products</p>
          <h2>Manage your catalog</h2>
          <p>Review your listings, update product details, or remove old catalog entries.</p>
        </div>
        <button type="button" onClick={onAddProduct}>
          Add Product
        </button>
      </div>

      <div className="manufacturer-page-panel manufacturer-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by product name or description"
        />
      </div>

      {loading ? (
        <div className="manufacturer-empty-state">Loading products...</div>
      ) : filteredProducts.length ? (
        <div className="manufacturer-products-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              deleting={deletingProductId === product.id}
              onEdit={() => onEdit(product)}
              onDelete={() => onDelete(product)}
            />
          ))}
        </div>
      ) : (
        <div className="manufacturer-empty-state">No products found yet.</div>
      )}
    </section>
  )
}

export default ProductsPage
