import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getAuth } from './Login'
import StudentProfilePopup from '../components/StudentProfilePopup'
import TemplateManagement from '../components/TemplateManagement'

type Submission = {
  id: string
  studentId: string
  groupId?: string
  title: string
  type: string
  contentRef: string
  createdAt: string
  updatedAt: string
  status: 'submitted' | 'approved' | 'resubmit'
  grade?: number
  feedback?: { by: string; text: string; date: string }[]
  milestones?: { label: string; date: string; done: boolean }[]
  notes?: string
}

type Group = {
  id: string
  name: string
  description?: string
  createdBy: string
  members: string[]
  createdAt: string
  updatedAt: string
}

type Announcement = {
  id: string
  title: string
  message: string
  pinned: boolean
  createdBy: string
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

export default function ProfessorDashboard() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [subs, setSubs] = useState<Submission[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [filterStudent, setFilterStudent] = useState('')
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'submitted' | 'approved' | 'resubmit'>('submitted')
  const [grade, setGrade] = useState<string>('')
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 })
  const studentNameRefs = useRef<Record<string, HTMLSpanElement | null>>({})
  const [showTemplates, setShowTemplates] = useState(false)
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null)
  const [activeSubmissionComment, setActiveSubmissionComment] = useState<Record<string, string>>({})
  const [activeSubmissionStatus, setActiveSubmissionStatus] = useState<Record<string, 'submitted' | 'approved' | 'resubmit'>>({})
  const [activeSubmissionGrade, setActiveSubmissionGrade] = useState<Record<string, string>>({})
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [announcementPinned, setAnnouncementPinned] = useState(true)
  const [announcementSaving, setAnnouncementSaving] = useState(false)

  useEffect(() => {
    if (!auth) {
      navigate('/login')
      return
    }
    const headers = getHeaders()
    fetch(`${API}/api/submissions`, { headers })
      .then(r => r.json()).then(setSubs).catch(() => {})
    fetch(`${API}/api/groups`, { headers })
      .then(r => r.json()).then(setGroups).catch(() => {})
    fetch(`${API}/api/announcements`, { headers })
      .then(r => r.json()).then(setAnnouncements).catch(() => {})
  }, [auth, navigate])

  const filtered = useMemo(() => {
    if (!filterStudent) return subs
    return subs.filter(s => {
      const studentMatch = s.studentId.includes(filterStudent)
      if (s.groupId) {
        const group = groups.find(g => g.id === s.groupId)
        const groupMatch = group?.name.toLowerCase().includes(filterStudent.toLowerCase())
        const memberMatch = group?.members.some(m => m.includes(filterStudent))
        return studentMatch || groupMatch || memberMatch
      }
      return studentMatch
    })
  }, [subs, filterStudent, groups])

  const counts = useMemo(() => {
    return filtered.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    }, {})
  }, [filtered])

  function act(id: string) {
    const headers = getHeaders()
    const commentText = activeSubmissionComment[id] || ''
    const submissionStatus = activeSubmissionStatus[id] || 'submitted'
    const gradeValue = activeSubmissionGrade[id] || ''
    const body: any = { 
      text: commentText || undefined, 
      status: submissionStatus, 
      grade: gradeValue === '' ? undefined : Number(gradeValue) 
    }
    fetch(`${API}/api/submissions/${id}/feedback`, { method: 'POST', headers, body: JSON.stringify(body) })
      .then(r => r.json()).then(updated => {
        setSubs(prev => prev.map(p => p.id === id ? updated : p))
        setActiveSubmissionComment(prev => ({ ...prev, [id]: '' }))
        setActiveSubmissionGrade(prev => ({ ...prev, [id]: '' }))
        setActiveSubmissionStatus(prev => ({ ...prev, [id]: 'submitted' }))
        setExpandedSubmissionId(null)
      })
  }

  function toggleSubmission(id: string) {
    setExpandedSubmissionId(prev => prev === id ? null : id)
    // Initialize form values when expanding
    if (expandedSubmissionId !== id) {
      const sub = subs.find(s => s.id === id)
      if (sub) {
        setActiveSubmissionStatus(prev => ({ ...prev, [id]: sub.status }))
        setActiveSubmissionGrade(prev => ({ ...prev, [id]: sub.grade?.toString() || '' }))
      }
    }
  }

  function refreshAnnouncements() {
    const headers = getHeaders()
    fetch(`${API}/api/announcements`, { headers })
      .then(r => r.json())
      .then(setAnnouncements)
      .catch(() => {})
  }

  function resetAnnouncementForm() {
    setAnnouncementTitle('')
    setAnnouncementMessage('')
    setAnnouncementPinned(true)
  }

  async function createAnnouncement(event?: React.FormEvent) {
    if (event) event.preventDefault()
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      alert('Please provide both a title and message for the announcement.')
      return
    }
    try {
      setAnnouncementSaving(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/announcements`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
          pinned: announcementPinned,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create announcement')
      }
      const created = await res.json()
      setAnnouncements(prev => [created, ...prev])
      resetAnnouncementForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create announcement')
    } finally {
      setAnnouncementSaving(false)
    }
  }

  async function toggleAnnouncementPin(id: string, pinned: boolean) {
    try {
      const headers = getHeaders()
      const res = await fetch(`${API}/api/announcements/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ pinned }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update announcement')
      }
      const updated = await res.json()
      setAnnouncements(prev => prev.map(a => a.id === id ? updated : a))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update announcement')
    }
  }

  async function deleteAnnouncementEntry(id: string) {
    if (!confirm('Delete this announcement for all students?')) return
    try {
      const headers = getHeaders()
      const res = await fetch(`${API}/api/announcements/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete announcement')
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement')
    }
  }

  if (!auth) return null

  const totalSubmissions = subs.length
  const uniqueStudents = useMemo(() => {
    const students = new Set(subs.map(s => s.studentId))
    return students.size
  }, [subs])

  return (
    <Layout role="professor">
        <div className="dashboard-container">
        {/* Dashboard Header */}
        <div className="dashboard-header" id="dashboard-overview">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Professor Dashboard</h1>
            <p className="dashboard-subtitle">Review and manage student submissions</p>
          </div>
          
          {/* Template Management Toggle */}
          <div className="dashboard-section-toggle" id="professor-templates">
            <button
              className="btn-toggle-section"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              {showTemplates ? '✕ Close Templates' : '📋 Manage Templates'}
            </button>
          </div>
          <div className="dashboard-stats-grid">
            <div className="stat-card stat-card-primary">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <div className="stat-value">{totalSubmissions}</div>
                <div className="stat-label">Total Submissions</div>
              </div>
            </div>
            <div className="stat-card stat-card-warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{counts['submitted'] || 0}</div>
                <div className="stat-label">Pending Review</div>
              </div>
            </div>
            <div className="stat-card stat-card-success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{counts['approved'] || 0}</div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
            <div className="stat-card stat-card-info">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{uniqueStudents}</div>
                <div className="stat-label">Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Management */}
        <div className="dashboard-announcements-card" id="professor-announcements">
          <div className="announcements-header">
            <h2>📢 Alerts & Announcements</h2>
            <p>Share important updates with every student. Pinned messages appear on their dashboards instantly.</p>
          </div>
          <form className="announcement-form" onSubmit={createAnnouncement}>
            <div className="announcement-form-grid">
              <div className="announcement-field">
                <label htmlFor="announcement-title">Title</label>
                <input
                  id="announcement-title"
                  className="announcement-input"
                  placeholder="Upcoming review session, assignment reminder..."
                  value={announcementTitle}
                  onChange={e => setAnnouncementTitle(e.target.value)}
                />
              </div>
              <div className="announcement-field">
                <label htmlFor="announcement-pinned">Pin status</label>
                <label className="announcement-toggle">
                  <input
                    id="announcement-pinned"
                    type="checkbox"
                    checked={announcementPinned}
                    onChange={e => setAnnouncementPinned(e.target.checked)}
                  />
                  <span>{announcementPinned ? 'Pinned for all students' : 'Save as unpinned draft'}</span>
                </label>
              </div>
            </div>
            <div className="announcement-field">
              <label htmlFor="announcement-message">Message</label>
              <textarea
                id="announcement-message"
                className="announcement-textarea"
                placeholder="Provide details or action steps. Students will see this at the top of their dashboard."
                value={announcementMessage}
                onChange={e => setAnnouncementMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="announcement-form-actions">
              <button 
                type="submit" 
                className="btn btn-primary-large"
                disabled={announcementSaving}
              >
                {announcementSaving ? 'Posting...' : 'Post Announcement'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary-large"
                onClick={resetAnnouncementForm}
                disabled={announcementSaving}
              >
                Clear
              </button>
            </div>
          </form>
          <div className="announcements-list">
            {announcements.length === 0 ? (
              <div className="announcements-empty">
                <span className="announcements-empty-icon">🗒️</span>
                <p>No announcements yet. Use the form above to pin your first alert.</p>
              </div>
            ) : (
              announcements.map(a => (
                <article key={a.id} className={`announcement-card professor ${a.pinned ? 'is-pinned' : ''}`}>
                  <header className="announcement-card-header">
                    <div>
                      <h3>{a.title}</h3>
                      <span className="announcement-meta">
                        Posted {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="announcement-actions">
                      <button
                        type="button"
                        className="announcement-pill actionable"
                        onClick={() => toggleAnnouncementPin(a.id, !a.pinned)}
                      >
                        {a.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        className="announcement-pill danger"
                        onClick={() => deleteAnnouncementEntry(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </header>
                  <p className="announcement-message">{a.message}</p>
                </article>
              ))
            )}
          </div>
        </div>

        {/* Template Management Section */}
        {showTemplates && (
          <div className="dashboard-template-section" id="professor-templates-panel">
            <TemplateManagement />
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="dashboard-filter-card" id="professor-filters">
          <div className="filter-section">
            <div className="filter-input-wrapper">
              <span className="filter-icon">🔍</span>
              <input 
                className="filter-input" 
                placeholder="Search by student name or ID..." 
                value={filterStudent} 
                onChange={e => setFilterStudent(e.target.value)} 
              />
              {filterStudent && (
                <button 
                  className="filter-clear-btn" 
                  onClick={() => setFilterStudent('')}
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="filter-stats">
              <span className="filter-stat-item">
                <span className="filter-stat-label">Pending:</span>
                <span className="filter-stat-value">{counts['submitted'] || 0}</span>
              </span>
              <span className="filter-stat-item">
                <span className="filter-stat-label">Approved:</span>
                <span className="filter-stat-value">{counts['approved'] || 0}</span>
              </span>
              <span className="filter-stat-item">
                <span className="filter-stat-label">Resubmit:</span>
                <span className="filter-stat-value">{counts['resubmit'] || 0}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="dashboard-submissions-section" id="professor-submissions">
          <div className="submissions-section-header">
            <h2 className="submissions-section-title">📚 Student Submissions ({filtered.length})</h2>
            {filtered.length === 0 && (
              <p className="submissions-empty-message">
                {filterStudent ? 'No submissions match your search.' : 'No submissions assigned yet.'}
              </p>
            )}
          </div>
          <div className="submissions-grid-compact">
            {filtered.map(s => (
              <div key={s.id} className={`submission-card-compact status-${s.status} ${expandedSubmissionId === s.id ? 'expanded' : ''}`}>
                {/* Compact View */}
                <div className="submission-compact-view" onClick={() => toggleSubmission(s.id)}>
                  <div className="submission-compact-header">
                    <div className="submission-compact-title-section">
                      <h3 className="submission-compact-title">{s.title}</h3>
                      <span className={`status-badge-compact status-${s.status}`}>{s.status}</span>
                    </div>
                    <div className="submission-compact-meta">
                      <span className="submission-compact-student">
                        {s.groupId 
                          ? `👥 ${groups.find(g => g.id === s.groupId)?.name || 'Group'}`
                          : `👤 ${s.studentId}`
                        }
                      </span>
                      <span className="submission-compact-date">
                        {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {s.grade !== undefined && (
                        <span className="submission-compact-grade">Grade: {s.grade}/100</span>
                      )}
                    </div>
                    <div className="submission-compact-actions">
                      <span className="submission-expand-icon">
                        {expandedSubmissionId === s.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detail View */}
                {expandedSubmissionId === s.id && (
                  <div className="submission-expanded-view" onClick={(e) => e.stopPropagation()}>
                    {/* Submission Details */}
                    <div className="submission-details-new">
                      <div className="submission-info-grid-new">
                        <div className="info-item-new">
                          <span className="info-label-new">
                            {s.groupId ? 'Group' : 'Student'}
                          </span>
                          {s.groupId ? (
                            <span className="info-value-new group-badge-new">
                              {groups.find(g => g.id === s.groupId)?.name || 'Group Submission'}
                            </span>
                          ) : (
                            <span
                              ref={el => studentNameRefs.current[s.studentId] = el}
                              className="student-name-hoverable-new"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const popupWidth = 420
                                const popupHeight = 500
                                const padding = 10
                                
                                let x = rect.right + padding
                                let y = rect.top
                                
                                if (x + popupWidth > window.innerWidth) {
                                  x = rect.left - popupWidth - padding
                                }
                                
                                if (y + popupHeight > window.innerHeight) {
                                  y = window.innerHeight - popupHeight - padding
                                }
                                
                                if (y < padding) {
                                  y = padding
                                }
                                
                                if (x < padding) {
                                  x = padding
                                }
                                
                                setPopupPosition({ x, y })
                                setHoveredStudentId(s.studentId)
                              }}
                              onMouseLeave={() => {
                                setTimeout(() => {
                                  const popup = document.querySelector('.student-profile-popup')
                                  if (!popup || !popup.matches(':hover')) {
                                    setHoveredStudentId(null)
                                  }
                                }, 150)
                              }}
                            >
                              {s.studentId}
                            </span>
                          )}
                        </div>
                        {s.groupId && (
                          <div className="info-item-new">
                            <span className="info-label-new">Creator</span>
                            <span
                              ref={el => studentNameRefs.current[s.studentId] = el}
                              className="student-name-hoverable-new"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const popupWidth = 420
                                const popupHeight = 500
                                const padding = 10
                                
                                let x = rect.right + padding
                                let y = rect.top
                                
                                if (x + popupWidth > window.innerWidth) {
                                  x = rect.left - popupWidth - padding
                                }
                                
                                if (y + popupHeight > window.innerHeight) {
                                  y = window.innerHeight - popupHeight - padding
                                }
                                
                                if (y < padding) {
                                  y = padding
                                }
                                
                                if (x < padding) {
                                  x = padding
                                }
                                
                                setPopupPosition({ x, y })
                                setHoveredStudentId(s.studentId)
                              }}
                              onMouseLeave={() => {
                                setTimeout(() => {
                                  const popup = document.querySelector('.student-profile-popup')
                                  if (!popup || !popup.matches(':hover')) {
                                    setHoveredStudentId(null)
                                  }
                                }, 150)
                              }}
                            >
                              {s.studentId}
                            </span>
                          </div>
                        )}
                        <div className="info-item-new">
                          <span className="info-label-new">Type</span>
                          <span className="info-value-new">{s.type.toUpperCase()}</span>
                        </div>
                        <div className="info-item-new">
                          <span className="info-label-new">Reference</span>
                          <a className="info-link-new" href={s.contentRef} target="_blank" rel="noopener noreferrer">
                            {s.contentRef.length > 40 ? s.contentRef.substring(0, 40) + '...' : s.contentRef}
                          </a>
                        </div>
                        <div className="info-item-new">
                          <span className="info-label-new">Submitted</span>
                          <span className="info-value-new">{new Date(s.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                        {s.grade !== undefined && (
                          <div className="info-item-new">
                            <span className="info-label-new">Grade</span>
                            <span className="info-value-new grade-value-new">{s.grade}/100</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Student Notes */}
                    {s.notes && (
                      <div className="submission-section-new">
                        <div className="section-header-new">
                          <span className="section-icon-new">📝</span>
                          <h4 className="section-title-new">Student Notes</h4>
                        </div>
                        <div className="section-content-new">
                          <div className="submission-notes-content-new">{s.notes}</div>
                        </div>
                      </div>
                    )}

                    {/* Milestones Section */}
                    {!!(s.milestones && s.milestones.length) && (
                      <div className="submission-section-new">
                        <div className="section-header-new">
                          <span className="section-icon-new">🎯</span>
                          <h4 className="section-title-new">Student Milestones</h4>
                        </div>
                        <div className="section-content-new">
                          <div className="milestones-list-new">
                            {s.milestones.map((milestone, idx) => (
                              <div key={idx} className={`milestone-item-new ${milestone.done ? 'done' : ''}`}>
                                <input 
                                  type="checkbox" 
                                  className="milestone-checkbox-new"
                                  checked={milestone.done} 
                                  disabled
                                />
                                <div className="milestone-content-new">
                                  <div className="milestone-label-new">{milestone.label}</div>
                                  <div className="milestone-date-text-new">{new Date(milestone.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Previous Feedback */}
                    {!!(s.feedback && s.feedback.length) && (
                      <div className="submission-section-new submission-feedback-section-new">
                        <div className="section-header-new">
                          <span className="section-icon-new">💬</span>
                          <h4 className="section-title-new">Previous Feedback & Comments ({s.feedback.length})</h4>
                        </div>
                        <div className="section-content-new">
                          <div className="feedback-list-new">
                            {s.feedback!.slice(-3).map((f, i) => {
                              const isStudentComment = f.by === s.studentId
                              return (
                                <div key={i} className={`feedback-item-new ${isStudentComment ? 'student-comment' : 'professor-feedback'}`}>
                                  <div className="feedback-date-new">{new Date(f.date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                  <div className="feedback-text-new">{f.text}</div>
                                  {f.by && (
                                    <div className="feedback-author-new">
                                      — {isStudentComment ? s.studentId : f.by}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Professor Actions */}
                    <div className="submission-actions-new">
                      <div className="actions-section-new">
                        <div className="action-field-new">
                          <label className="action-label-new">💬 Add Comment</label>
                          <textarea 
                            className="action-textarea-new"
                            placeholder="Write your feedback..." 
                            value={activeSubmissionComment[s.id] || ''} 
                            onChange={e => setActiveSubmissionComment(prev => ({ ...prev, [s.id]: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="action-controls-new">
                          <div className="action-field-new">
                            <label className="action-label-new">Status</label>
                            <select 
                              className="action-select-new" 
                              value={activeSubmissionStatus[s.id] || s.status} 
                              onChange={e => setActiveSubmissionStatus(prev => ({ ...prev, [s.id]: e.target.value as any }))}
                            >
                              <option value="submitted">Submitted</option>
                              <option value="approved">Approve</option>
                              <option value="resubmit">Request Resubmit</option>
                            </select>
                          </div>
                          <div className="action-field-new">
                            <label className="action-label-new">Grade</label>
                            <input 
                              className="action-grade-new"
                              type="number" 
                              placeholder="0-100" 
                              value={activeSubmissionGrade[s.id] || ''} 
                              onChange={e => setActiveSubmissionGrade(prev => ({ ...prev, [s.id]: e.target.value }))} 
                              min="0"
                              max="100"
                            />
                          </div>
                          <button className="btn-apply-feedback-new" onClick={() => act(s.id)}>✓ Apply Feedback</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Student Profile Popup */}
        {hoveredStudentId && (
          <StudentProfilePopup
            studentId={hoveredStudentId}
            position={popupPosition}
            onClose={() => setHoveredStudentId(null)}
          />
        )}
      </div>
    </Layout>
  )
}


