import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAuth } from '../pages/Login'

type DashboardSidebarProps = {
  role?: 'student' | 'professor'
  isOpen: boolean
  onClose: () => void
}

type SidebarLink = {
  label: string
  icon: string
  sectionId?: string
  path?: string
}

const studentLinks: SidebarLink[] = [
  { label: 'Overview', icon: '🏠', sectionId: 'dashboard-overview' },
  { label: 'Alerts & Announcements', icon: '📢', sectionId: 'student-announcements' },
  { label: 'New Submission', icon: '📝', sectionId: 'new-submission' },
  { label: 'Assignments', icon: '📂', sectionId: 'templates-section' },
  { label: 'My Submissions', icon: '📚', sectionId: 'student-submissions' },
  { label: 'Discussions', icon: '💬', path: '/student/discussions' },
  { label: 'Analytics', icon: '📊', path: '/analytics' },
  { label: 'Profile', icon: '👤', path: '/profile' },
]

const professorLinks: SidebarLink[] = [
  { label: 'Overview', icon: '🏠', sectionId: 'dashboard-overview' },
  { label: 'Alerts', icon: '📢', sectionId: 'professor-announcements' },
  { label: 'Filters', icon: '🔍', sectionId: 'professor-filters' },
  { label: 'Templates', icon: '📄', sectionId: 'professor-templates' },
  { label: 'Submissions', icon: '📚', sectionId: 'professor-submissions' },
  { label: 'Discussions', icon: '💬', path: '/professor/discussions' },
  { label: 'Analytics', icon: '📊', path: '/analytics' },
  { label: 'Profile', icon: '👤', path: '/profile' },
]

export default function DashboardSidebar({ role = 'student', isOpen, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = getAuth()

  const links = role === 'professor' ? professorLinks : studentLinks

  function handleLinkClick(link: SidebarLink) {
    if (link.sectionId) {
      const el = document.getElementById(link.sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        onClose()
      } else if (location.pathname !== (role === 'professor' ? '/professor' : '/student')) {
        // Navigate to dashboard first, then scroll on next tick
        navigate(role === 'professor' ? '/professor' : '/student')
        setTimeout(() => {
          const target = document.getElementById(link.sectionId!)
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 250)
        onClose()
      }
      return
    }
    if (link.path) {
      navigate(link.path)
      onClose()
    }
  }

  const dashboardTitle = role === 'professor' ? 'Professor Workspace' : 'Student Workspace'
  const welcomeName = auth?.name || auth?.userId || (role === 'professor' ? 'Professor' : 'Student')

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">{dashboardTitle}</span>
        <span className="sidebar-subtitle">Welcome back, {welcomeName}</span>
      </div>
      <nav className="sidebar-nav">
        {links.map(link => (
          <button
            key={link.label}
            className="sidebar-nav-item"
            onClick={() => handleLinkClick(link)}
            type="button"
          >
            <span className="sidebar-nav-icon">{link.icon}</span>
            <span className="sidebar-nav-label">{link.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Need help? Reach out to your academic mentor or contact support.</p>
      </div>
    </aside>
  )
}

