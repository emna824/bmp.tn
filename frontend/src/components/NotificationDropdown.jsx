import { BellIcon, CheckCircleIcon, ProjectIcon, XCircleIcon } from './Icons'

function formatNotificationTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000))

  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

function getNotificationMeta(type) {
  switch (type) {
    case 'new_project':
      return {
        label: 'New project',
        accentClass: 'project',
        Icon: ProjectIcon,
      }
    case 'application_accepted':
      return {
        label: 'Accepted',
        accentClass: 'accepted',
        Icon: CheckCircleIcon,
      }
    case 'application_rejected':
      return {
        label: 'Rejected',
        accentClass: 'rejected',
        Icon: XCircleIcon,
      }
    default:
      return {
        label: 'Update',
        accentClass: 'default',
        Icon: BellIcon,
      }
  }
}

function NotificationDropdown({
  isOpen,
  notifications,
  unreadCount,
  loading,
  error,
  onMarkAsRead,
}) {
  if (!isOpen) return null

  return (
    <div className="notification-dropdown" role="dialog" aria-label="Notifications">
      <div className="notification-dropdown-header">
        <div className="notification-dropdown-heading">
          <div className="notification-dropdown-heading-icon">
            <BellIcon className="icon tiny" />
          </div>
          <div>
            <strong>Notifications</strong>
            <p>Artisan updates delivered as they happen</p>
          </div>
        </div>
        <div className={`notification-dropdown-summary ${unreadCount > 0 ? 'has-unread' : ''}`}>
          <span>{unreadCount > 0 ? unreadCount : 0}</span>
          <p>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
      </div>

      <div className="notification-dropdown-body">
        {loading ? <p className="notification-dropdown-state">Loading notifications...</p> : null}
        {!loading && error ? <p className="notification-dropdown-state error">{error}</p> : null}
        {!loading && !error && !notifications.length ? (
          <p className="notification-dropdown-state">No notifications yet.</p>
        ) : null}

        {!loading && !error && notifications.length ? (
          <ul className="notification-dropdown-list">
            {notifications.map((notification) => {
              const { label, accentClass, Icon } = getNotificationMeta(notification.type)

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={`notification-dropdown-item ${notification.isRead ? '' : 'unread'} ${accentClass}`}
                    onClick={() => onMarkAsRead(notification.id, notification.isRead)}
                  >
                    <span className={`notification-dropdown-icon ${accentClass}`} aria-hidden="true">
                      <Icon className="icon tiny" />
                    </span>
                    <span className="notification-dropdown-copy">
                      <span className="notification-dropdown-topline">
                        <span className={`notification-dropdown-chip ${accentClass}`}>{label}</span>
                        <span className="notification-dropdown-time">{formatNotificationTime(notification.createdAt)}</span>
                      </span>
                      <span className="notification-dropdown-message">{notification.message}</span>
                      {!notification.isRead ? (
                        <span className="notification-dropdown-action">Click to mark as read</span>
                      ) : null}
                    </span>
                    {!notification.isRead ? (
                      <span className={`notification-dropdown-dot ${accentClass}`} aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

export default NotificationDropdown
