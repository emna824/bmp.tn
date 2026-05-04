import { useEffect, useRef, useState } from 'react'
import api from '../api'

const REPORT_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate content', label: 'Inappropriate content' },
  { value: 'fake account', label: 'Fake account' },
  { value: 'other', label: 'Other' },
]

function ReportModal({
  isOpen,
  currentUserId,
  targetType,
  targetId,
  targetLabel,
  onClose,
  onSuccess,
}) {
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setReason('')
      setDescription('')
      setError('')
      setLoading(false)
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => modalRef.current?.querySelector('select, button')?.focus(), 0)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!reason) {
      setError('Please choose a reason before submitting.')
      return
    }

    if (!currentUserId || !targetId) {
      setError('Missing report target or user information.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post(
        '/reports',
        {
          reporterId: currentUserId,
          targetType,
          targetId,
          reason,
          description: description.trim(),
        },
        {
          headers: {
            'x-user-id': currentUserId,
          },
        },
      )

      onSuccess?.(response.data?.message || 'Report submitted successfully')
      onClose?.()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="report-modal-title" aria-describedby="report-modal-description">
      <section ref={modalRef} className="settings-modal report-modal">
        <div className="settings-header">
          <div>
            <h3 id="report-modal-title">Report {targetType}</h3>
            <p id="report-modal-description" className="subtitle small">
              {targetLabel ? `You are reporting ${targetLabel}.` : 'Tell us why this should be reviewed.'}
            </p>
          </div>
          <button type="button" className="text-btn close-btn" onClick={onClose} disabled={loading} aria-label="Cancel report and close dialog">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-modal-form">
          <label>
            Reason
            <select value={reason} onChange={(event) => setReason(event.target.value)} disabled={loading} aria-label="Report reason">
              {REPORT_REASONS.map((option) => (
                <option key={option.value || 'empty'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description
            <textarea
              rows="4"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional details to help moderation review this case."
              disabled={loading}
              aria-label="Report description"
            />
          </label>

          {error ? <p className="report-form-error" role="alert">{error}</p> : null}

          <div className="report-modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !reason}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ReportModal
