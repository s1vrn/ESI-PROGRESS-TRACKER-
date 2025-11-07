import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getAuth } from './Login'

type UserProfile = {
  id: string
  userId: string
  role: 'student' | 'professor'
  email: string
  name?: string
  profilePicture?: string
  branch?: string
  year?: 'freshman' | 'second year' | 'third year'
  verified: boolean
  createdAt: string
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

export default function Profile() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [year, setYear] = useState<'freshman' | 'second year' | 'third year' | ''>('')
  const [profilePicture, setProfilePicture] = useState('')
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!auth) {
      navigate('/login')
      return
    }
    const headers = getHeaders()
    fetch(`${API}/api/user/profile`, { headers })
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setName(data.name || '')
        setBranch(data.branch || '')
        setYear(data.year || '')
        setProfilePicture(data.profilePicture || '')
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [auth, navigate])

  function handleSave() {
    setError('')
    setSuccess('')
    setSaving(true)
    
    const headers = getHeaders()
    const body: any = { 
      name: name.trim() || undefined, 
      profilePicture: profilePicture.trim() || undefined 
    }
    if (auth?.role === 'student') {
      body.branch = branch.trim() || undefined
      body.year = year || undefined
    }
    
    console.log('Saving profile with data:', body)
    console.log('Current state - name:', name, 'branch:', branch, 'year:', year)
    
    fetch(`${API}/api/user/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body)
    })
      .then(async (r) => {
        if (!r.ok) {
          const errorData = await r.json().catch(() => ({ error: 'Failed to update profile' }))
          throw new Error(errorData.error || `Failed to update profile (status ${r.status})`)
        }
        return r.json()
      })
      .then(data => {
        console.log('Profile updated successfully:', data)
        setProfile(data)
        // Update local state with saved values
        setName(data.name || '')
        setBranch(data.branch || '')
        setYear(data.year || '')
        setProfilePicture(data.profilePicture || '')
        setEditing(false)
        setSuccess('Profile updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
        setSaving(false)
      })
      .catch(err => {
        console.error('Save error:', err)
        setError(err instanceof Error ? err.message : 'Failed to update profile')
        setSaving(false)
      })
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      console.log('No file selected')
      return
    }
    
    console.log('File selected:', file.name, file.type, file.size)
    
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, GIF, etc.)')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploadingPicture(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('Reading file as base64...')
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = String(reader.result)
          console.log('File read successfully, base64 length:', result.length)
          resolve(result)
        }
        reader.onerror = (error) => {
          console.error('FileReader error:', error)
          reject(new Error('Failed to read file'))
        }
        reader.readAsDataURL(file)
      })
      
      const headers = getHeaders()
      console.log('Uploading to server...')
      const uploadRes = await fetch(`${API}/api/uploads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: file.name, data: base64 })
      })
      
      console.log('Upload response status:', uploadRes.status)
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({ error: 'Upload failed' }))
        console.error('Upload failed:', errorData)
        throw new Error(errorData.error || `Upload failed with status ${uploadRes.status}`)
      }
      
      const uploadData = await uploadRes.json()
      console.log('Upload successful:', uploadData)
      
      if (!uploadData.url) {
        throw new Error('Invalid response from server: missing URL')
      }
      
      // Save just the path, not the full URL
      const pictureUrl = uploadData.url
      setProfilePicture(pictureUrl)
      
      // Auto-save the profile picture
      console.log('Saving profile picture URL to profile...')
      const saveRes = await fetch(`${API}/api/user/profile`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ profilePicture: pictureUrl })
      })
      
      console.log('Save response status:', saveRes.status)
      
      if (saveRes.ok) {
        const updatedProfile = await saveRes.json()
        setProfile(updatedProfile)
        setSuccess('Profile picture updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const errorData = await saveRes.json().catch(() => ({ error: 'Failed to save profile picture' }))
        throw new Error(errorData.error || 'Failed to save profile picture')
      }
      
      setUploadingPicture(false)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload profile picture')
      setUploadingPicture(false)
    }
  }

  if (!auth || loading) return null

  return (
    <Layout role={auth.role}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px' }}>
        {error && (
          <div className="profile-alert profile-alert-error">
            {error}
          </div>
        )}
        {success && (
          <div className="profile-alert profile-alert-success">
            {success}
          </div>
        )}

        {profile && (
          <>
            {/* Profile Header Card */}
            <div className="profile-header-card">
              <div className="profile-header-content">
                <div className="profile-picture-section">
                  <div className="profile-picture-wrapper-large">
                    {(profilePicture || profile.profilePicture) ? (
                      <img 
                        src={(profilePicture || profile.profilePicture || '').startsWith('http') 
                          ? (profilePicture || profile.profilePicture || '')
                          : `${API}${profilePicture || profile.profilePicture || ''}`} 
                        alt="Profile" 
                        className="profile-picture-large"
                        onError={(e) => {
                          console.error('Failed to load profile picture:', profilePicture || profile.profilePicture)
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="profile-picture-placeholder-large">
                        {profile.name ? profile.name.charAt(0).toUpperCase() : profile.userId.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="profile-picture-overlay">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handlePictureUpload(e)
                          e.target.value = ''
                        }}
                        style={{ display: 'none' }}
                        id="profile-picture-upload"
                        disabled={uploadingPicture}
                      />
                      <label htmlFor="profile-picture-upload" className="profile-picture-upload-label">
                        <span className="profile-picture-upload-icon">📷</span>
                        <span>{uploadingPicture ? 'Uploading...' : 'Change'}</span>
                      </label>
                    </div>
                  </div>
                  {(profilePicture || profile.profilePicture) && (
                    <button
                      type="button"
                      className="profile-picture-remove-btn"
                      onClick={async () => {
                        setProfilePicture('')
                        setError('')
                        const headers = getHeaders()
                        try {
                          const res = await fetch(`${API}/api/user/profile`, {
                            method: 'PATCH',
                            headers,
                            body: JSON.stringify({ profilePicture: '' })
                          })
                          if (res.ok) {
                            const updated = await res.json()
                            setProfile(updated)
                            setSuccess('Profile picture removed')
                            setTimeout(() => setSuccess(''), 3000)
                          } else {
                            const errorData = await res.json().catch(() => ({ error: 'Failed to remove picture' }))
                            setError(errorData.error || 'Failed to remove picture')
                          }
                        } catch (err) {
                          setError('Failed to remove picture')
                        }
                      }}
                      disabled={uploadingPicture}
                    >
                      Remove Picture
                    </button>
                  )}
                </div>
                <div className="profile-header-info">
                  <h1 className="profile-name-large">{profile.name || profile.userId}</h1>
                  <p className="profile-role-badge">{profile.role === 'student' ? '👨‍🎓 Student' : '👨‍🏫 Professor'}</p>
                  <p className="profile-email">{profile.email}</p>
                  <div className="profile-status-row">
                    <span className={`profile-status-badge ${profile.verified ? 'verified' : 'unverified'}`}>
                      {profile.verified ? '✓ Verified Account' : '⚠ Not Verified'}
                    </span>
                    <span className="profile-member-since">
                      Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="profile-header-actions">
                  {!editing ? (
                    <button 
                      className="btn profile-edit-btn" 
                      onClick={() => {
                        setEditing(true)
                        setError('')
                        setSuccess('')
                      }}
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <button 
                      className="btn btn-ghost profile-cancel-btn" 
                      onClick={() => {
                        setEditing(false)
                        setName(profile.name || '')
                        setBranch(profile.branch || '')
                        setYear(profile.year || '')
                        setProfilePicture(profile.profilePicture || '')
                        setError('')
                        setSuccess('')
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Content Grid */}
            <div className="profile-content-grid">
              {/* Personal Information Card */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h2 className="profile-section-title">👤 Personal Information</h2>
                </div>
                <div className="profile-section-body">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Full Name</label>
                    {editing ? (
                      <input
                        type="text"
                        className="profile-input"
                        value={name}
                        onChange={(e) => {
                          console.log('Name changed:', e.target.value)
                          setName(e.target.value)
                        }}
                        placeholder="Your full name"
                        disabled={saving}
                        autoFocus
                      />
                    ) : (
                      <div className="profile-field-value">{name || 'Not set'}</div>
                    )}
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">User ID</label>
                    <div className="profile-field-value profile-field-disabled">{profile.userId}</div>
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Email</label>
                    <div className="profile-field-value profile-field-disabled">{profile.email}</div>
                    <small className="profile-field-hint">Email cannot be changed</small>
                  </div>
                </div>
              </div>

              {/* Academic Information Card (Students only) */}
              {profile.role === 'student' && (
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <h2 className="profile-section-title">🎓 Academic Information</h2>
                  </div>
                  <div className="profile-section-body">
                    <div className="profile-field-group">
                      <label className="profile-field-label">Branch</label>
                      {editing ? (
                        <input
                          type="text"
                          className="profile-input"
                          value={branch}
                          onChange={(e) => {
                            console.log('Branch changed:', e.target.value)
                            setBranch(e.target.value)
                          }}
                          placeholder="e.g., Computer Science, Software Engineering"
                          disabled={saving}
                        />
                      ) : (
                        <div className="profile-field-value">{branch || 'Not set'}</div>
                      )}
                    </div>
                    <div className="profile-field-group">
                      <label className="profile-field-label">Year</label>
                      {editing ? (
                        <select
                          className="profile-input"
                          value={year}
                          onChange={(e) => {
                            console.log('Year changed:', e.target.value)
                            setYear(e.target.value as 'freshman' | 'second year' | 'third year')
                          }}
                          disabled={saving}
                        >
                          <option value="">-- Select your year --</option>
                          <option value="freshman">Freshman</option>
                          <option value="second year">Second Year</option>
                          <option value="third year">Third Year</option>
                        </select>
                      ) : (
                        <div className="profile-field-value">
                          {year ? year.charAt(0).toUpperCase() + year.slice(1) : 'Not set'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information Card */}
              <div className="profile-section-card">
                <div className="profile-section-header">
                  <h2 className="profile-section-title">⚙️ Account Information</h2>
                </div>
                <div className="profile-section-body">
                  <div className="profile-field-group">
                    <label className="profile-field-label">Role</label>
                    <div className="profile-field-value profile-field-disabled">
                      {profile.role === 'student' ? 'Student' : 'Professor'}
                    </div>
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Account Status</label>
                    <div className="profile-field-value">
                      <span className={`profile-status-badge-inline ${profile.verified ? 'verified' : 'unverified'}`}>
                        {profile.verified ? '✓ Verified' : '⚠ Not Verified'}
                      </span>
                    </div>
                  </div>
                  <div className="profile-field-group">
                    <label className="profile-field-label">Member Since</label>
                    <div className="profile-field-value profile-field-disabled">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button (when editing) */}
            {editing && (
              <div className="profile-save-section">
                <button className="btn profile-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setEditing(false)
                    setName(profile.name || '')
                    setBranch(profile.branch || '')
                    setYear(profile.year || '')
                    setProfilePicture(profile.profilePicture || '')
                    setError('')
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Back to Dashboard */}
            <div className="profile-back-section">
              <button
                className="btn btn-ghost profile-back-btn"
                onClick={() => navigate(auth.role === 'student' ? '/student' : '/professor')}
              >
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

