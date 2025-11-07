import React, { useEffect, useState, useRef } from 'react'

type StudentProfile = {
  id: string
  userId: string
  name?: string
  email: string
  branch?: string
  year?: 'freshman' | 'second year' | 'third year'
  profilePicture?: string
  role: 'student' | 'professor'
  verified: boolean
  createdAt: string
}

type StudentProfilePopupProps = {
  studentId: string
  position: { x: number; y: number }
  onClose: () => void
}

const API = 'http://localhost:4000'

function getHeaders() {
  const auth = JSON.parse(localStorage.getItem('auth') || '{}')
  if (!auth.userId) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'x-user-id': auth.userId,
    'x-role': auth.role,
  }
}

export default function StudentProfilePopup({ studentId, position, onClose }: StudentProfilePopupProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const headers = getHeaders()
    fetch(`${API}/api/user/${studentId}`, { headers })
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [studentId])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  if (loading) {
    return (
      <div
        ref={popupRef}
        className="student-profile-popup"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="student-profile-loading">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div
        ref={popupRef}
        className="student-profile-popup"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div className="student-profile-error">Student not found</div>
      </div>
    )
  }

  const yearLabels: Record<string, string> = {
    'freshman': 'Freshman',
    'second year': 'Second Year',
    'third year': 'Third Year'
  }

  return (
    <div
      ref={popupRef}
      className="student-profile-popup"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseEnter={() => {
        // Keep popup open when hovering over it
      }}
      onMouseLeave={() => {
        // Close when mouse leaves popup
        onClose()
      }}
    >
      <div className="student-profile-header">
        <div className="student-profile-picture-wrapper">
          {profile.profilePicture ? (
            <img 
              src={profile.profilePicture.startsWith('http') ? profile.profilePicture : `${API}${profile.profilePicture}`}
              alt={profile.name || profile.userId}
              className="student-profile-picture"
            />
          ) : (
            <div className="student-profile-picture-placeholder">
              {(profile.name || profile.userId).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="student-profile-name-section">
          <h3 className="student-profile-name">{profile.name || profile.userId}</h3>
          <div className="student-profile-id">{profile.userId}</div>
        </div>
      </div>
      
      <div className="student-profile-body">
        <div className="student-profile-section">
          <h4 className="student-profile-section-title">Personal Information</h4>
          <div className="student-profile-info-item">
            <span className="student-profile-label">👤 Full Name:</span>
            <span className="student-profile-value">{profile.name || 'Not provided'}</span>
          </div>
          <div className="student-profile-info-item">
            <span className="student-profile-label">🆔 User ID:</span>
            <span className="student-profile-value">{profile.userId}</span>
          </div>
          <div className="student-profile-info-item">
            <span className="student-profile-label">📧 Email:</span>
            <span className="student-profile-value">{profile.email}</span>
          </div>
        </div>

        <div className="student-profile-section">
          <h4 className="student-profile-section-title">Academic Information</h4>
          {profile.branch ? (
            <div className="student-profile-info-item">
              <span className="student-profile-label">🏫 Branch:</span>
              <span className="student-profile-value">{profile.branch}</span>
            </div>
          ) : (
            <div className="student-profile-info-item">
              <span className="student-profile-label">🏫 Branch:</span>
              <span className="student-profile-value student-profile-value-missing">Not specified</span>
            </div>
          )}
          {profile.year ? (
            <div className="student-profile-info-item">
              <span className="student-profile-label">📚 Year:</span>
              <span className="student-profile-value">{yearLabels[profile.year] || profile.year}</span>
            </div>
          ) : (
            <div className="student-profile-info-item">
              <span className="student-profile-label">📚 Year:</span>
              <span className="student-profile-value student-profile-value-missing">Not specified</span>
            </div>
          )}
        </div>

        <div className="student-profile-section">
          <h4 className="student-profile-section-title">Account Information</h4>
          <div className="student-profile-info-item">
            <span className="student-profile-label">✅ Status:</span>
            <span className={`student-profile-value ${profile.verified ? 'student-profile-verified' : 'student-profile-unverified'}`}>
              {profile.verified ? '✓ Verified' : '⚠ Not Verified'}
            </span>
          </div>
          <div className="student-profile-info-item">
            <span className="student-profile-label">📅 Member Since:</span>
            <span className="student-profile-value">
              {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          <div className="student-profile-info-item">
            <span className="student-profile-label">🆔 Account ID:</span>
            <span className="student-profile-value student-profile-value-small">{profile.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

