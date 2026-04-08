import ProductForm from '../../components/manufacturer/ProductForm'

function EditProductPage({ product, submitting, onSubmit, onCancel, userId = '' }) {
  return (
    <section className="manufacturer-page-stack">
      <div className="manufacturer-page-panel manufacturer-page-header">
        <div>
          <p className="manufacturer-page-eyebrow">Edit Product</p>
          <h2>{product?.name || 'Update product'}</h2>
          <p>Adjust product details, pricing, AI-generated documentation PDF, and imagery.</p>
        </div>
      </div>

      <div className="manufacturer-page-panel">
        <ProductForm
          initialValues={product}
          mode="edit"
          submitting={submitting}
          onSubmit={onSubmit}
          onCancel={onCancel}
          userId={userId}
        />
      </div>
    </section>
  )
}

export default EditProductPage
