import { useEffect, useState } from 'react'
import api from '../api'
import ReportCard from '../components/ReportCard'
import { normalizeReport, withAdminHeaders } from '../utils/adminDashboard'

function ReportsPage({ user }) {
  const [reports, setReports] = useState([])
  const [filters, setFilters] = useState({ status: '', targetType: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeReportId, setActiveReportId] = useState('')

  const loadReports = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(
        '/reports',
        withAdminHeaders(user, {
          params: {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.targetType ? { targetType: filters.targetType } : {}),
          },
        }),
      )

      const nextReports = (response.data?.reports || []).map((item) => normalizeReport(item))
      setReports(nextReports)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [filters.status, filters.targetType])

  const updateSingleReport = (nextReport) => {
    setReports((current) =>
      current.map((item) => (item.id === nextReport.id ? normalizeReport(nextReport) : item)),
    )
  }

  const handleAccept = async (report) => {
    const promptText =
      report.targetType === 'user'
        ? 'Accept this report and permanently ban the reported user?'
        : 'Accept this report and delete the reported product?'

    if (!window.confirm(promptText)) return

    setActiveReportId(report.id)
    try {
      const response = await api.put(
        `/reports/${report.id}/resolve`,
        report.targetType === 'user' ? { banType: 'permanent' } : {},
        withAdminHeaders(user),
      )

      updateSingleReport(response.data?.report || { ...report, status: 'resolved' })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to resolve report')
    } finally {
      setActiveReportId('')
    }
  }

  const handleReject = async (report) => {
    if (!window.confirm('Reject this report?')) return

    setActiveReportId(report.id)
    try {
      const response = await api.put(`/reports/${report.id}/reject`, {}, withAdminHeaders(user))
      updateSingleReport(response.data?.report || { ...report, status: 'reviewed' })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to reject report')
    } finally {
      setActiveReportId('')
    }
  }

  const pendingReports = reports.filter((report) => report.status === 'pending').length

  return (
    <section className="admin-page-stack">
      <div className="admin-panel admin-panel-header">
        <div>
          <p className="admin-eyebrow">Reports</p>
          <h2>Moderate reported content</h2>
          <p>Review profile and product reports, then accept or reject each case.</p>
        </div>
        <div className="admin-summary-inline">
          <strong>{reports.length}</strong>
          <span>{pendingReports} pending</span>
        </div>
      </div>

      <div className="admin-panel admin-toolbar">
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={filters.targetType}
          onChange={(event) =>
            setFilters((current) => ({ ...current, targetType: event.target.value }))
          }
        >
          <option value="">All targets</option>
          <option value="user">Users</option>
          <option value="product">Products</option>
        </select>

        <button type="button" className="admin-action-btn admin-action-neutral" onClick={loadReports}>
          Refresh
        </button>
      </div>

      {error ? <div className="admin-banner error">{error}</div> : null}

      {loading ? (
        <div className="admin-empty-state">Loading reports...</div>
      ) : reports.length ? (
        <div className="admin-card-grid">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isBusy={activeReportId === report.id}
              onAccept={() => handleAccept(report)}
              onReject={() => handleReject(report)}
            />
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">No reports match the selected filters.</div>
      )}
    </section>
  )
}

export default ReportsPage
