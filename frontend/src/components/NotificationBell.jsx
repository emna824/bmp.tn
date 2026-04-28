import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../api'
import { BellIcon } from './Icons'
import NotificationDropdown from './NotificationDropdown'

function NotificationBell({ user }) {
  const bellRef = useRef(null)
  const artisanId = useMemo(() => user?.id || user?._id || '', [user])
  const isArtisan = user?.role === 'artisan'

  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(Number(user?.notificationCount) || 0)

  const loadNotifications = useCallback(
    async (showLoader = false) => {
      if (!isArtisan || !artisanId) return

      if (showLoader) {
        setLoading(true)
      }

      try {
        const response = await api.get('/notifications', {
          headers: {
            'x-user-id': artisanId,
          },
        })

        setNotifications(response.data?.notifications || [])
        setUnreadCount(Number(response.data?.unreadCount) || 0)
        setError('')
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load notifications')
      } finally {
        if (showLoader) {
          setLoading(false)
        }
      }
    },
    [artisanId, isArtisan],
  )

  useEffect(() => {
    setUnreadCount(Number(user?.notificationCount) || 0)
  }, [user?.notificationCount])

  useEffect(() => {
    loadNotifications(true)
  }, [loadNotifications])

  useEffect(() => {
    if (!isArtisan || !artisanId) return undefined

    const interval = window.setInterval(() => {
      loadNotifications(false)
    }, 10000)

    return () => window.clearInterval(interval)
  }, [artisanId, isArtisan, loadNotifications])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!bellRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const handleToggle = async () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)

    if (nextOpen) {
      await loadNotifications(!notifications.length)
    }
  }

  const handleMarkAsRead = async (notificationId, alreadyRead) => {
    if (!notificationId || alreadyRead || !artisanId) return

    try {
      const response = await api.put(
        `/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            'x-user-id': artisanId,
          },
        },
      )

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? { ...notification, isRead: true } : notification,
        ),
      )
      setUnreadCount(Number(response.data?.unreadCount) || 0)
      setError('')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update notification')
    }
  }

  if (!isArtisan || !artisanId) {
    return (
      <button
        type="button"
        className="header-icon-btn notification-trigger"
        aria-label="Notifications"
        title="Notifications"
      >
        <BellIcon className="icon" />
      </button>
    )
  }

  return (
    <div ref={bellRef} className={`notification-bell ${isOpen ? 'open' : ''}`}>
      <button
        type="button"
        className={`header-icon-btn notification-trigger ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
        aria-expanded={isOpen}
      >
        <BellIcon className="icon" />
        <span className={`header-badge ${unreadCount > 0 ? 'show' : ''}`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        error={error}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  )
}

export default NotificationBell
