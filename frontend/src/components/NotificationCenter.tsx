import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth } from '../pages/Login'

type Notification = {
  id: string
  userId: string
  type: 'feedback' | 'status_change' | 'grade' | 'new_submission' | 'milestone_reminder'
  title: string
  message: string
  relatedId?: string
  read: boolean
  createdAt: string
  link?: string
}

const API = 'http://localhost:4000'

function getHeaders() {
  const auth = getAuth()
  if (!auth) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'x-user-id': auth.userId,
    'x-role': auth.role,
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const headers = getHeaders()
      const [notifsRes, countRes] = await Promise.all([
        fetch(`${API}/api/notifications`, { headers }),
        fetch(`${API}/api/notifications/unread-count`, { headers }),
      ])
      const notifs = await notifsRes.json()
      const count = await countRes.json()
      setNotifications(notifs)
      setUnreadCount(count.count)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const markAsRead = async (id: string) => {
    try {
      const headers = getHeaders()
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      setLoading(true)
      const headers = getHeaders()
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'PATCH',
        headers,
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'feedback':
        return '💬'
      case 'status_change':
        return '🔄'
      case 'grade':
        return '📊'
      case 'new_submission':
        return '📝'
      case 'milestone_reminder':
        return '⏰'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'feedback':
        return '#6366f1'
      case 'status_change':
        return '#8b5cf6'
      case 'grade':
        return '#10b981'
      case 'new_submission':
        return '#f59e0b'
      case 'milestone_reminder':
        return '#ec4899'
      default:
        return '#64748b'
    }
  }

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3 className="notification-title">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all"
                onClick={markAllAsRead}
                disabled={loading}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">🔕</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className="notification-icon"
                    style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-item-header">
                      <h4 className="notification-item-title">{notification.title}</h4>
                      {!notification.read && <span className="notification-dot" />}
                    </div>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

