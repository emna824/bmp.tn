import { formatDashboardDate, formatProductPrice } from '../utils/adminDashboard'

function ProductCard({
  product,
  variant = 'admin',
  isBusy = false,
  downloading = false,
  paying = false,
  quantity = 1,
  onQuantityChange,
  onDelete,
  onDownload,
  onPayNow,
  onViewDetails,
  onOpenReport,
}) {
  if (variant === 'marketplace') {
    const isOutOfStock = Number(product.stock ?? 0) <= 0

    return (
      <article className="market-card">
        <div className="market-card-image">
          {product.image ? (
            <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
          ) : (
            <div className="market-img-fallback">{product.name?.charAt(0) || 'P'}</div>
          )}
        </div>
        <div className="market-card-body">
          <p className="market-title">{product.name}</p>
          <p className="market-subtitle">{product.manufacturer?.name || product.manufacturerName || 'Manufacturer'}</p>
          <p className="market-desc">{product.description || 'No description provided.'}</p>
          <div className="market-meta">
            <span className="meta-chip">{product.documentName || 'PDF'}</span>
            {product.price ? (
              <span className="meta-chip price-chip">
                {formatProductPrice(product.price)}
              </span>
            ) : null}
            <span className={`meta-chip ${isOutOfStock ? 'danger-chip' : ''}`}>
              {isOutOfStock ? 'Out of stock' : `Stock: ${product.stock}`}
            </span>
          </div>
          <label className="market-qty-field">
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              max={Number(product.stock ?? 0) > 0 ? product.stock : undefined}
              step="1"
              value={quantity}
              disabled={isOutOfStock}
              onChange={(event) => onQuantityChange?.(event.target.value)}
            />
          </label>
          {product.price && !isOutOfStock ? (
            <p className="subtitle small">
              Total: {formatProductPrice(Number(product.price || 0) * Number(quantity || 1))}
            </p>
          ) : isOutOfStock ? (
            <p className="subtitle small">Restock this product before starting checkout.</p>
          ) : null}
        </div>
        <div className="market-card-actions">
          {onDownload ? (
            <button
              type="button"
              className="secondary-btn mini-btn"
              disabled={downloading}
              onClick={onDownload}
            >
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          ) : null}
          {onPayNow ? (
            <button
              type="button"
              className="mini-btn"
              disabled={paying || !product.price || isOutOfStock}
              onClick={onPayNow}
            >
              {paying ? 'Redirecting...' : 'Pay now'}
            </button>
          ) : null}
          {onOpenReport ? (
            <button type="button" className="secondary-btn mini-btn report-trigger-btn" onClick={onOpenReport}>
              Report
            </button>
          ) : null}
          <button type="button" className="secondary-btn mini-btn" onClick={onViewDetails}>
            View details
          </button>
        </div>
      </article>
    )
  }

  if (variant === 'spotlight') {
    const isOutOfStock = Number(product.stock ?? 0) <= 0

    return (
      <article className="product-card">
        <div className="product-meta">
          <h4>{product.name}</h4>
          <p className="subtitle small">{product.manufacturer?.name || product.manufacturerName || 'Manufacturer'}</p>
          <p className="product-desc">{product.description || '-'}</p>
          <p className="subtitle small">{isOutOfStock ? 'Out of stock' : `Stock: ${product.stock}`}</p>
        </div>
        <div className="spotlight-card-actions">
          <button
            type="button"
            className="mini-btn"
            disabled={downloading}
            onClick={onDownload}
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          <button type="button" className="secondary-btn mini-btn report-trigger-btn" onClick={onOpenReport}>
            Report
          </button>
        </div>
      </article>
    )
  }

  return (
    <article className="admin-card product-card">
      <div className="admin-product-media">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <span>{product.name.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="admin-card-body">
        <div className="admin-card-section">
          <p className="admin-card-label">Product</p>
          <h3>{product.name}</h3>
          <p>{product.description || 'No description provided.'}</p>
        </div>

        <div className="admin-meta-grid">
          <div>
            <span>Manufacturer</span>
            <strong>{product.manufacturerName}</strong>
          </div>
          <div>
            <span>Price</span>
            <strong>
              {product.price !== null && product.price !== undefined
                ? formatProductPrice(product.price)
                : 'Not set'}
            </strong>
          </div>
          <div>
            <span>Stock</span>
            <strong>{Number.isInteger(product.stock) ? product.stock : 0}</strong>
          </div>
        </div>

        <p className="admin-inline-note">Listed {formatDashboardDate(product.createdAt)}</p>
      </div>

      <div className="admin-card-actions">
        <button
          type="button"
          className="admin-action-btn admin-action-reject"
          disabled={isBusy}
          onClick={onDelete}
        >
          {isBusy ? 'Deleting...' : 'Delete product'}
        </button>
      </div>
    </article>
  )
}

export default ProductCard
