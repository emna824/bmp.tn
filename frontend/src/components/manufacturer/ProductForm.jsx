import { useEffect, useState } from 'react'
import { readFileAsDataUrl } from '../../utils/fileHelpers'

const MAX_DOCUMENT_BYTES = 6 * 1024 * 1024
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const INITIAL_FORM = {
  name: '',
  description: '',
  price: '',
  stock: 0,
  document: '',
  documentName: '',
  image: '',
}

function ProductForm({ initialValues, mode = 'create', submitting, onSubmit, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [selectedDocumentName, setSelectedDocumentName] = useState('')
  const [selectedImageName, setSelectedImageName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const nextValues = initialValues || INITIAL_FORM
    setForm({
      name: nextValues.name || '',
      description: nextValues.description || '',
      price: nextValues.price ?? '',
      stock: nextValues.stock ?? 0,
      document: nextValues.document || '',
      documentName: nextValues.documentName || '',
      image: nextValues.image || '',
    })
    setSelectedDocumentName(nextValues.documentName || '')
    setSelectedImageName('')
    setError('')
  }, [initialValues])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleDocumentPick = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Documentation must be a PDF file.')
      return
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('Documentation must be 6 MB or less.')
      return
    }

    try {
      const document = await readFileAsDataUrl(file)
      setForm((current) => ({
        ...current,
        document,
        documentName: file.name,
      }))
      setSelectedDocumentName(file.name)
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Failed to read the selected PDF.')
    }
  }

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Image must be PNG, JPG, or WEBP.')
      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be 2 MB or less.')
      return
    }

    try {
      const image = await readFileAsDataUrl(file)
      setForm((current) => ({ ...current, image }))
      setSelectedImageName(file.name)
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Failed to read the selected image.')
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError('Product name is required.')
      return
    }

    if (form.price === '' || Number(form.price) < 0) {
      setError('Price must be a non-negative number.')
      return
    }

    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      setError('Stock must be a non-negative whole number.')
      return
    }

    if (mode === 'create' && !form.document) {
      setError('Documentation PDF is required.')
      return
    }

    if (mode === 'create' && !form.image) {
      setError('Product image is required.')
      return
    }

    setError('')
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      document: form.document,
      documentName: form.documentName,
      image: form.image,
    })
  }

  return (
    <form className="manufacturer-product-form" onSubmit={handleSubmit}>
      <label>
        Product name
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Cement block, steel beam, etc."
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          rows="4"
          value={form.description}
          onChange={handleChange}
          placeholder="Short product description"
        />
      </label>

      <label>
        Price
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="120"
        />
      </label>

      <label>
        Stock
        <input
          name="stock"
          type="number"
          min="0"
          step="1"
          value={form.stock}
          onChange={handleChange}
          placeholder="0"
        />
      </label>

      <label>
        Documentation (PDF)
        <input type="file" accept="application/pdf" onChange={handleDocumentPick} />
      </label>
      <p className="subtitle small">
        {selectedDocumentName || form.documentName || 'Select a PDF specification document.'}
      </p>

      <label>
        Image
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImagePick} />
      </label>
      <p className="subtitle small">
        {selectedImageName || (form.image ? 'Image ready' : 'Select a PNG, JPG, or WEBP image.')}
      </p>

      {form.image ? (
        <div className="manufacturer-product-preview-image">
          <img src={form.image} alt={form.name || 'Product preview'} />
        </div>
      ) : null}

      {error ? <p className="manufacturer-form-error">{error}</p> : null}

      <div className="manufacturer-form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : mode === 'create' ? 'Add product' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default ProductForm
