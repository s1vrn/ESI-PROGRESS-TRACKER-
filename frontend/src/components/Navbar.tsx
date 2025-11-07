import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAuth, clearAuth } from '../pages/Login'
import ESILogo from './ESILogo'
import NotificationCenter from './NotificationCenter'
import ThemeToggle from './ThemeToggle'

type NavbarProps = {
  role?: 'student' | 'professor'
}

export default function Navbar({ role }: NavbarProps) {
  const auth = getAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  function isActive(path: string): boolean {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="esi-logo">
            <ESILogo width={120} height={36} variant="horizontal" />
          </div>
          <div className="brand-text">
            <span className="brand-title">ESI Progress Tracker</span>
            <span className="brand-subtitle">Academic Management</span>
          </div>
        </Link>
        
        <button 
          className={`menu-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          <div className="navbar-inner-bar">
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <span>Home</span>
            </Link>
            {auth && (
              <>
                <Link 
                  to={auth.role === 'student' ? '/student' : '/professor'} 
                  className={`nav-link ${isActive('/student') || isActive('/professor') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Dashboard</span>
                </Link>
                <Link 
                  to="/profile" 
                  className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Profile</span>
                </Link>
                <Link 
                  to="/analytics" 
                  className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>Analytics</span>
                </Link>
              </>
            )}
          </div>
          {auth && (
            <div className="navbar-actions">
              <ThemeToggle />
              <div className="navbar-notification-wrapper">
                <NotificationCenter />
              </div>
            </div>
          )}
          {auth ? (
            <button className="btn-nav-danger" onClick={handleLogout}>
              <span>Logout</span>
            </button>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-nav">
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

