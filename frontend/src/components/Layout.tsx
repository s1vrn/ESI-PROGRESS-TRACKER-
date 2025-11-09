import React, { useState } from 'react'
import Navbar from './Navbar'
import DashboardSidebar from './DashboardSidebar'
import Footer from './Footer'

type LayoutProps = {
  right?: React.ReactNode
  children: React.ReactNode
  role?: 'student' | 'professor'
  showSidebar?: boolean
}

export default function Layout({ right, children, role = 'student', showSidebar = true }: LayoutProps) {
  const themeClass = role === 'student' ? 'theme-student' : 'theme-professor'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarOpen(prev => !prev)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }
  
  return (
    <div className={`${themeClass}${sidebarOpen ? ' sidebar-open' : ''}`}>
      <Navbar role={role} />
      <div className="dashboard-shell">
        {showSidebar && (
          <DashboardSidebar role={role} isOpen={sidebarOpen} onClose={closeSidebar} />
        )}
        <main className="dashboard-main">
          {showSidebar && (
            <button 
              className="sidebar-mobile-toggle" 
              onClick={toggleSidebar}
              type="button"
            >
              ☰ Menu
            </button>
          )}
          {children}
        </main>
        {right}
      </div>
      <Footer />
    </div>
  )
}


