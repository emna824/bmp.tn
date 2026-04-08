import { useEffect, useState } from 'react'
import api, { withUserHeaders } from '../../api'
import { buildPdfDataUrlFromText, downloadDataUrlFile, readFileAsDataUrl } from '../../utils/fileHelpers'

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

function normalizeErrorMessage(value) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeErrorMessage(item)).filter(Boolean).join(' | ').trim()
  }

  if (value && typeof value === 'object') {
    return (
      String(value.message || value.error || value.detail || value.type || '').trim() ||
      JSON.stringify(value)
    )
  }

  return ''
}

function toPdfFileName(productName) {
  const slug = String(productName || 'product')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'product'}-documentation.pdf`
}

function ProductForm({ initialValues, mode = 'create', submitting, onSubmit, onCancel, userId = '' }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [selectedDocumentName, setSelectedDocumentName] = useState('')
  const [selectedImageName, setSelectedImageName] = useState('')
  const [generatedDocumentation, setGeneratedDocumentation] = useState('')
  const [generatingDocumentation, setGeneratingDocumentation] = useState(false)
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
    setGeneratedDocumentation('')
    setError('')
  }, [initialValues])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
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

  const generateDocumentationPdf = async ({ silent = false } = {}) => {
    if (!form.name.trim()) {
      setError('Product name is required before generating documentation.')
      return null
    }

    if (!form.description.trim()) {
      setError('Description is required before generating documentation.')
      return null
    }

    if (!userId) {
      setError('Manufacturer account is required to generate AI documentation.')
      return null
    }

    setGeneratingDocumentation(true)
    if (!silent) {
      setError('')
    }

    try {
      const response = await api.post(
        '/ai/generate-doc',
        {
          productName: form.name.trim(),
          description: form.description.trim(),
        },
        withUserHeaders(userId),
      )

      const documentationText = String(response.data?.documentation || '').trim()
      if (!documentationText) {
        throw new Error('AI documentation was empty.')
      }

      const documentName = toPdfFileName(form.name)
      const document = buildPdfDataUrlFromText(`${form.name.trim()} Documentation`, documentationText)

      setGeneratedDocumentation(documentationText)
      setForm((current) => ({
        ...current,
        document,
        documentName,
      }))
      setSelectedDocumentName(documentName)
      setError('')

      return {
        document,
        documentName,
      }
    } catch (requestError) {
      const message =
        normalizeErrorMessage(requestError.response?.data?.message) ||
        normalizeErrorMessage(requestError.response?.data?.error) ||
        normalizeErrorMessage(requestError.message) ||
        'Failed to generate AI documentation.'

      setError(message)
      return null
    } finally {
      setGeneratingDocumentation(false)
    }
  }

  const handleSubmit = async (event) => {
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

    if (mode === 'create' && !form.image) {
      setError('Product image is required.')
      return
    }

    let nextDocument = form.document
    let nextDocumentName = form.documentName

    if (!nextDocument) {
      const generated = await generateDocumentationPdf({ silent: true })
      if (!generated?.document) {
        return
      }
      nextDocument = generated.document
      nextDocumentName = generated.documentName
    }

    setError('')
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      document: nextDocument,
      documentName: nextDocumentName,
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

      <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 shadow-sm dark:border-orange-500/30 dark:bg-orange-500/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <strong className="block text-sm text-slate-900 dark:text-white">Documentation PDF</strong>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              AI generates the documentation automatically from the product name and description, then saves it as a PDF.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDocumentName || form.documentName || 'No PDF generated yet.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-orange-500 to-yellow-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => generateDocumentationPdf()}
              disabled={generatingDocumentation || submitting}
            >
              {generatingDocumentation
                ? 'Generating PDF...'
                : form.document
                  ? 'Regenerate PDF'
                  : 'Generate PDF'}
            </button>

            {form.document ? (
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                onClick={() => downloadDataUrlFile(form.document, form.documentName || toPdfFileName(form.name))}
              >
                Download PDF
              </button>
            ) : null}
          </div>
        </div>

        {generatedDocumentation ? (
          <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-white/70 bg-white p-4 text-sm leading-6 text-slate-700 shadow-inner dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
            <strong className="mb-2 block text-slate-900 dark:text-white">Generated content preview</strong>
            <pre className="whitespace-pre-wrap font-sans">{generatedDocumentation}</pre>
          </div>
        ) : null}
      </div>

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
        <button type="submit" disabled={submitting || generatingDocumentation}>
          {submitting ? 'Saving...' : mode === 'create' ? 'Add product' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export default ProductForm
