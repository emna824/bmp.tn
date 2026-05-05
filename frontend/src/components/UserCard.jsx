import { memo } from 'react'
import { formatDashboardDate, getInitials } from '../utils/adminDashboard'
import { getSafeImageSrc } from '../utils/safeImageSrc'

const UserCard = memo(function UserCard({ user, isBusy, onBan, onUnban }) {
  const avatarSrc = getSafeImageSrc(user.profileImage)

  return (
    <article className="admin-card user-card">
      <div className="admin-user-row">
        <div className="admin-user-avatar large">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user.name} loading="lazy" decoding="async" />
          ) : (
            <span>{getInitials(user.name)}</span>
          )}
        </div>
        <div className="admin-user-copy">
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
        <span className={`admin-chip admin-chip-${user.isBanned ? 'resolved' : 'pending'}`}>
          {user.isBanned ? 'Banned' : 'Active'}
        </span>
      </div>

      <div className="admin-meta-grid">
        <div>
          <span>Role</span>
          <strong>{user.role}</strong>
        </div>
        <div>
          <span>Ban type</span>
          <strong>{user.banType || 'Not banned'}</strong>
        </div>
      </div>

      {user.isBanned && user.banExpiresAt ? (
        <p className="admin-inline-note">Temporary ban until {formatDashboardDate(user.banExpiresAt)}</p>
      ) : null}

      <div className="admin-card-actions">
        <button
          type="button"
          className="admin-action-btn admin-action-reject"
          disabled={user.isBanned || isBusy}
          onClick={onBan}
        >
          {isBusy ? 'Updating...' : 'Ban'}
        </button>
        <button
          type="button"
          className="admin-action-btn admin-action-neutral"
          disabled={!user.isBanned || isBusy}
          onClick={onUnban}
        >
          {isBusy ? 'Updating...' : 'Unban'}
        </button>
      </div>
    </article>
  )
})

export default UserCard
