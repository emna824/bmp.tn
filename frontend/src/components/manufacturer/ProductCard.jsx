import { formatProductPrice } from '../../utils/adminDashboard'

function ProductCard({ product, onEdit, onDelete, deleting }) {
  return (
    <article className="manufacturer-product-card">
      <div className="manufacturer-product-media">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <span>{product.name?.charAt(0)?.toUpperCase() || 'P'}</span>
        )}
      </div>

      <div className="manufacturer-product-copy">
        <h3>{product.name}</h3>
        <p>{product.description || 'No description provided.'}</p>
      </div>

      <div className="manufacturer-product-meta">
        <div>
          <span>Price</span>
          <strong>
            {product.price !== null && product.price !== undefined
              ? formatProductPrice(product.price)
              : 'Not set'}
          </strong>
        </div>
        <div>
          <span>Posted</span>
          <strong>
            {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Unknown'}
          </strong>
        </div>
        <div>
          <span>Stock</span>
          <strong>{Number.isInteger(product.stock) ? product.stock : 0}</strong>
        </div>
      </div>

      <div className="manufacturer-product-actions">
        <button type="button" className="secondary-btn mini-btn" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="mini-btn manufacturer-danger-btn"
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
