import { useMemo } from 'react'
import { formatProductPrice } from '../../utils/adminDashboard'

function OrdersPage({ products = [] }) {
  const summary = useMemo(() => {
    const activeProducts = products.filter((product) => Number(product.stock || 0) > 0)
    const estimatedValue = activeProducts.reduce(
      (sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0),
      0,
    )

    return {
      activeProducts: activeProducts.length,
      estimatedValue,
    }
  }, [products])

  return (
    <section className="manufacturer-page-stack">
      <div className="manufacturer-page-panel manufacturer-page-header">
        <div>
          <p className="manufacturer-page-eyebrow">Orders</p>
          <h2>Order operations workspace</h2>
          <p>Keep an eye on catalog readiness while the rest of the product workflow stays unchanged.</p>
        </div>
      </div>

      <div className="manufacturer-stats-grid">
        <article className="manufacturer-stat-card">
          <span>Active products</span>
          <strong>{summary.activeProducts}</strong>
          <p>Listings with stock available for future order flow.</p>
        </article>

        <article className="manufacturer-stat-card">
          <span>Catalog value</span>
          <strong>{formatProductPrice(summary.estimatedValue)}</strong>
          <p>Estimated sellable value based on your current stock.</p>
        </article>
      </div>

      <div className="manufacturer-page-panel">
        <div className="manufacturer-section-head">
          <div>
            <p className="manufacturer-page-eyebrow">Routing Ready</p>
            <h3>Orders page is separated from product management</h3>
          </div>
        </div>
        <div className="manufacturer-empty-state">
          Order-specific backend actions are not implemented in this checkout, so this route is reserved without
          changing your existing business logic.
        </div>
      </div>
    </section>
  )
}

export default OrdersPage
