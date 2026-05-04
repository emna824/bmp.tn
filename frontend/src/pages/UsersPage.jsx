import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import UserCard from '../components/UserCard'
import { normalizeUser, withAdminHeaders } from '../utils/adminDashboard'

function UsersPage({ user }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeUserId, setActiveUserId] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/users', { ...withAdminHeaders(user), skipApiCache: true })
      setUsers((response.data || []).map((item) => normalizeUser(item)))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 220)
    return () => window.clearTimeout(timer)
  }, [search])

  const patchUserState = (userId, patch) => {
    setUsers((current) =>
      current.map((item) => (item.id === userId ? { ...item, ...patch } : item)),
    )
  }

  const handleBan = async (selectedUser) => {
    if (!window.confirm(`Ban ${selectedUser.name}?`)) return

    setActiveUserId(selectedUser.id)
    try {
      const response = await api.put(
        `/users/ban/${selectedUser.id}`,
        { banType: 'permanent' },
        withAdminHeaders(user),
      )

      const nextUser = response.data?.user ? normalizeUser(response.data.user) : null
      patchUserState(selectedUser.id, nextUser || { isBanned: true, banType: 'permanent' })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to ban user')
    } finally {
      setActiveUserId('')
    }
  }

  const handleUnban = async (selectedUser) => {
    if (!window.confirm(`Unban ${selectedUser.name}?`)) return

    setActiveUserId(selectedUser.id)
    try {
      const response = await api.put(
        `/users/ban/${selectedUser.id}`,
        { isBanned: false, banType: null, banExpiresAt: null },
        withAdminHeaders(user),
      )

      const nextUser = response.data?.user ? normalizeUser(response.data.user) : null
      patchUserState(selectedUser.id, nextUser || { isBanned: false, banType: null, banExpiresAt: null })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to unban user')
    } finally {
      setActiveUserId('')
    }
  }

  const filteredUsers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    if (!query) return users

    return users.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.role.toLowerCase().includes(query),
    )
  }, [debouncedSearch, users])

  const bannedCount = useMemo(() => users.filter((entry) => entry.isBanned).length, [users])

  return (
    <section className="admin-page-stack">
      <div className="admin-panel admin-panel-header">
        <div>
          <p className="admin-eyebrow">Users</p>
          <h2>Manage platform accounts</h2>
          <p>Review account status and take quick ban or unban actions.</p>
        </div>
        <div className="admin-summary-inline">
          <strong>{users.length}</strong>
          <span>{bannedCount} banned</span>
        </div>
      </div>

      <div className="admin-panel admin-toolbar">
        <input
          type="search"
          placeholder="Search by name, email, or role"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button type="button" className="admin-action-btn admin-action-neutral" onClick={loadUsers}>
          Refresh
        </button>
      </div>

      {error ? <div className="admin-banner error">{error}</div> : null}

      {loading ? (
        <div className="admin-empty-state">Loading users...</div>
      ) : filteredUsers.length ? (
        <div className="admin-card-grid">
          {filteredUsers.map((entry) => (
            <UserCard
              key={entry.id}
              user={entry}
              isBusy={activeUserId === entry.id}
              onBan={() => handleBan(entry)}
              onUnban={() => handleUnban(entry)}
            />
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">No users match your search.</div>
      )}
    </section>
  )
}

export default UsersPage
