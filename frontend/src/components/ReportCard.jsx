import { formatDashboardDate } from '../utils/adminDashboard'

function ReportCard({ report, isBusy, onAccept, onReject }) {
  const isPending = report.status === 'pending'

  return (
    <article className="admin-card report-card">
      <div className="admin-card-top">
        <div className="admin-chip-row">
          <span className={`admin-chip admin-chip-${report.targetType}`}>{report.targetType}</span>
          <span className={`admin-chip admin-chip-status admin-chip-${report.status}`}>
            {report.status}
          </span>
        </div>
        <span className="admin-date">{formatDashboardDate(report.createdAt)}</span>
      </div>

      <div className="admin-card-body">
        <div className="admin-card-section">
          <p className="admin-card-label">Reason</p>
          <h3>{report.reason}</h3>
        </div>

        <div className="admin-card-section">
          <p className="admin-card-label">Description</p>
          <p>{report.description || 'No additional description was provided for this report.'}</p>
        </div>

        <div className="admin-meta-grid">
          <div>
            <span>Reporter</span>
            <strong>{report.reporter?.name || report.reporter?.email || 'Unknown reporter'}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{report.targetLabel || 'Reported target'}</strong>
          </div>
        </div>

        {report.targetType === 'product' ? (
          <div className="admin-card-section">
            <p className="admin-card-label">Product details</p>
            <p>{report.target?.description || 'No product description is available for this report.'}</p>
            <div className="admin-meta-grid">
              <div>
                <span>Price</span>
                <strong>{report.target?.price !== null && report.target?.price !== undefined ? `${Number(report.target.price).toFixed(2)} TND` : 'Not available'}</strong>
              </div>
              <div>
                <span>Document</span>
                <strong>{report.target?.documentName || 'No document linked'}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="admin-card-actions">
        <button
          type="button"
          className="admin-action-btn admin-action-accept"
          disabled={!isPending || isBusy}
          onClick={onAccept}
        >
          {isBusy ? 'Processing...' : 'Accept'}
        </button>
        <button
          type="button"
          className="admin-action-btn admin-action-reject"
          disabled={!isPending || isBusy}
          onClick={onReject}
        >
          {isBusy ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </article>
  )
}

export default ReportCard
