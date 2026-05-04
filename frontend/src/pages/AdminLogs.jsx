import { useCallback, useEffect, useState } from 'react'
import api from '../api'
import { formatDashboardDate, normalizeLog, withAdminHeaders } from '../utils/adminDashboard'

const ACTION_OPTIONS = [
  'login',
  'project_created',
  'quote_requested',
  'quote_accepted',
  'invoice_created',
  'subscription_payment',
]

function formatActionLabel(value) {
  return String(value || 'Unknown action').replace(/_/g, ' ')
}

function formatEntity(log) {
  const entityType = String(log.entityType || 'entity')
  const entityId = String(log.entityId || '')
  return entityId ? `${entityType} #${entityId.slice(-6)}` : entityType
}

function AdminLogs({ user }) {
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({ action: '', date: '', search: '' })
  const [draftSearch, setDraftSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadLogs = useCallback(async (nextPage = 1) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(
        '/admin/logs',
        withAdminHeaders(user, {
          params: {
            page: nextPage,
            limit: pagination.limit,
            ...(filters.action ? { action: filters.action } : {}),
            ...(filters.date ? { date: filters.date } : {}),
            ...(filters.search ? { search: filters.search } : {}),
          },
        }),
      )

      setLogs((response.data?.logs || []).map((item) => normalizeLog(item)))
      setPagination(response.data?.pagination || { page: nextPage, limit: 20, total: 0, pages: 0 })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [filters.action, filters.date, filters.search, pagination.limit, user])

  useEffect(() => {
    loadLogs(1)
  }, [loadLogs])

  const applySearch = (event) => {
    event.preventDefault()
    setFilters((current) => ({ ...current, search: draftSearch.trim() }))
  }

  const clearFilters = () => {
    setDraftSearch('')
    setFilters({ action: '', date: '', search: '' })
  }

  const goToPage = (nextPage) => {
    if (nextPage < 1 || (pagination.pages && nextPage > pagination.pages)) return
    loadLogs(nextPage)
  }

  return (
    <section className="admin-page-stack">
      <div className="admin-panel admin-panel-header">
        <div>
          <p className="admin-eyebrow">Audit trail</p>
          <h2>System activity logs</h2>
          <p>Track key platform actions across login, projects, quotes, invoices, and subscriptions.</p>
        </div>
        <div className="admin-summary-inline">
          <strong>{loading ? '...' : pagination.total}</strong>
          <span>log entries</span>
        </div>
      </div>

      <form className="admin-panel admin-toolbar" onSubmit={applySearch}>
        <select
          value={filters.action}
          onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((action) => (
            <option key={action} value={action}>
              {formatActionLabel(action)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
        />

        <input
          type="search"
          placeholder="Search user name, email, or role"
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
        />

        <div className="admin-filter-actions">
          <button type="submit" className="admin-action-btn admin-action-neutral">
            Search
          </button>
          <button type="button" className="admin-action-btn admin-action-neutral" onClick={clearFilters}>
            Reset
          </button>
        </div>
      </form>

      {error ? <div className="admin-banner error">{error}</div> : null}

      <div className="admin-panel admin-table-panel">
        {loading ? (
          <div className="admin-empty-state">Loading audit logs...</div>
        ) : logs.length ? (
          <div className="admin-table-wrap">
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="admin-log-user">
                        <strong>{log.user.name}</strong>
                        <span>{log.user.email || log.user.role || 'Unknown user'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-log-action">{formatActionLabel(log.action)}</span>
                    </td>
                    <td>
                      <div className="admin-log-entity">
                        <strong>{formatEntity(log)}</strong>
                        {log.description ? <span>{log.description}</span> : null}
                      </div>
                    </td>
                    <td>{formatDashboardDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">No logs match the selected filters.</div>
        )}
      </div>

      <div className="admin-pagination">
        <button
          type="button"
          className="admin-action-btn admin-action-neutral"
          disabled={pagination.page <= 1 || loading}
          onClick={() => goToPage(pagination.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {pagination.page || 1} of {pagination.pages || 1}
        </span>
        <button
          type="button"
          className="admin-action-btn admin-action-neutral"
          disabled={loading || Boolean(pagination.pages && pagination.page >= pagination.pages)}
          onClick={() => goToPage(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default AdminLogs
