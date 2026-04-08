import ProductForm from '../../components/manufacturer/ProductForm'

function AddProductPage({ submitting, onSubmit, onCancel, userId = '' }) {
  return (
    <section className="manufacturer-page-stack">
      <div className="manufacturer-page-panel manufacturer-page-header">
        <div>
          <p className="manufacturer-page-eyebrow">Add Product</p>
          <h2>Create a new catalog item</h2>
          <p>Add a product with clean metadata, AI-generated documentation PDF, and a product image.</p>
        </div>
      </div>

      <div className="manufacturer-page-panel">
        <ProductForm
          mode="create"
          submitting={submitting}
          onSubmit={onSubmit}
          onCancel={onCancel}
          userId={userId}
        />
      </div>
    </section>
  )
}

export default AddProductPage
