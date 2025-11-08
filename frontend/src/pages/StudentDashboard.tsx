import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getAuth } from './Login'
import GroupManagement from '../components/GroupManagement'
import VersionHistory from '../components/VersionHistory'

type AssignmentTemplate = {
  id: string
  title: string
  description?: string
  type: 'pdf' | 'zip' | 'link' | 'report' | 'other'
  instructions?: string
  requirements?: string[]
  dueDate?: string
  createdBy: string
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

type Submission = {
  id: string
  title: string
  type: string
  contentRef: string
  notes?: string
  milestones?: { label: string; date: string; done: boolean }[]
  createdAt: string
  updatedAt: string
  status: 'submitted' | 'approved' | 'resubmit'
  grade?: number
  feedback?: { by: string; text: string; date: string }[]
  groupId?: string
  versions?: Array<{
    version: number
    contentRef: string
    notes?: string
    createdAt: string
    createdBy: string
    changes?: string
  }>
  currentVersion?: number
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

type Professor = {
  id: string
  userId: string
  name: string
  email: string
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [subs, setSubs] = useState<Submission[]>([])
  const [professors, setProfessors] = useState<Professor[]>([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState('pdf')
  const [contentRef, setContentRef] = useState('')
  const [notes, setNotes] = useState('')
  const [professorId, setProfessorId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [showGroups, setShowGroups] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) {
      navigate('/login')
      return
    }
    const headers = getHeaders()
    fetch(`${API}/api/submissions`, { headers })
      .then(r => r.json()).then(setSubs).catch(() => {})
    fetch(`${API}/api/professors`, { headers })
      .then(r => r.json()).then(setProfessors).catch(() => {})
    fetch(`${API}/api/groups`, { headers })
      .then(r => r.json()).then(setGroups).catch(() => {})
    fetch(`${API}/api/templates`, { headers })
      .then(r => r.json()).then(setTemplates).catch(() => {})
    fetch(`${API}/api/announcements`, { headers })
      .then(r => r.json()).then(setAnnouncements).catch(() => {})
  }, [auth, navigate])

  function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    setTitle(template.title)
    setType(template.type)
    const sections: string[] = []
    if (template.instructions) {
      sections.push(`Instructions:\n${template.instructions}`)
    }
    if (template.requirements && template.requirements.length) {
      const requirementsText = template.requirements.map((req, idx) => `${idx + 1}. ${req}`).join('\n')
      sections.push(`Requirements:\n${requirementsText}`)
    }
    setNotes(sections.join('\n\n'))
    setSelectedTemplate(templateId)
  }

  function submit() {
    if (!professorId) {
      alert('Please select a professor')
      return
    }
    const headers = getHeaders()
    fetch(`${API}/api/submissions`, {
      method: 'POST', 
      headers, 
      body: JSON.stringify({ 
        title, 
        type, 
        contentRef, 
        notes, 
        professorId,
        groupId: groupId || undefined
      })
    }).then(r => r.json()).then(s => {
      setSubs(prev => [s, ...prev]);
      setTitle(''); setType('pdf'); setContentRef(''); setNotes(''); setProfessorId(''); setGroupId(''); setSelectedTemplate('')
    }).catch(err => {
      alert(err.message || 'Failed to submit')
    })
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('pdf')
  const [editContentRef, setEditContentRef] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMilestones, setEditMilestones] = useState<{ label: string; date: string; done: boolean }[]>([])
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [studentComment, setStudentComment] = useState('')
  const [commentingId, setCommentingId] = useState<string | null>(null)

  function startEdit(submission: Submission) {
    setExpandedSubmissionId(submission.id)
    setEditingId(submission.id)
    setEditTitle(submission.title)
    setEditType(submission.type)
    setEditContentRef(submission.contentRef)
    setEditNotes(submission.notes || '')
    setEditMilestones(submission.milestones || [])
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditType('pdf')
    setEditContentRef('')
    setEditNotes('')
    setEditMilestones([])
    setNewMilestoneLabel('')
    setNewMilestoneDate('')
  }

  function updateSubmission(id: string) {
    const headers = getHeaders()
    fetch(`${API}/api/submissions/${id}`, {
      method: 'PATCH', 
      headers, 
      body: JSON.stringify({ 
        title: editTitle, 
        type: editType, 
        contentRef: editContentRef, 
        notes: editNotes,
        milestones: editMilestones
      })
    }).then(r => r.json()).then(s => {
      setSubs(prev => prev.map(p => p.id === id ? s : p))
      cancelEdit()
    }).catch(err => {
      alert(err.message || 'Failed to update submission')
    })
  }

  function updateNotes(id: string, newNotes: string) {
    const headers = getHeaders()
    fetch(`${API}/api/submissions/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ notes: newNotes })
    }).then(r => r.json()).then(s => {
      setSubs(prev => prev.map(p => p.id === id ? s : p))
    })
  }

  function addMilestone() {
    if (!newMilestoneLabel.trim() || !newMilestoneDate) {
      alert('Please enter milestone label and date')
      return
    }
    setEditMilestones([...editMilestones, { label: newMilestoneLabel, date: newMilestoneDate, done: false }])
    setNewMilestoneLabel('')
    setNewMilestoneDate('')
  }

  function toggleMilestone(index: number) {
    setEditMilestones(prev => prev.map((m, i) => i === index ? { ...m, done: !m.done } : m))
  }

  function removeMilestone(index: number) {
    setEditMilestones(prev => prev.filter((_, i) => i !== index))
  }

  function toggleSubmission(id: string) {
    setExpandedSubmissionId(prev => {
      if (prev === id) {
        if (editingId === id) cancelEdit()
        if (commentingId === id) {
          setCommentingId(null)
          setStudentComment('')
        }
        return null
      }
      if (editingId && editingId !== id) {
        cancelEdit()
      }
      if (commentingId && commentingId !== id) {
        setCommentingId(null)
        setStudentComment('')
      }
      return id
    })
  }

  function addStudentComment(id: string) {
    if (!studentComment.trim()) {
      alert('Please enter a comment')
      return
    }
    const headers = getHeaders()
    fetch(`${API}/api/submissions/${id}/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: studentComment.trim() })
    }).then(r => r.json()).then(updated => {
      setSubs(prev => prev.map(p => p.id === id ? updated : p))
      setStudentComment('')
      setCommentingId(null)
    }).catch(err => {
      alert(err.message || 'Failed to add comment')
    })
  }

  const progress = useMemo(() => {
    if (!subs.length) return 0
    const approved = subs.filter(s => s.status === 'approved').length
    return Math.round((approved / subs.length) * 100)
  }, [subs])

  if (!auth) return null

  const stats = useMemo(() => {
    const total = subs.length
    const approved = subs.filter(s => s.status === 'approved').length
    const submitted = subs.filter(s => s.status === 'submitted').length
    const resubmit = subs.filter(s => s.status === 'resubmit').length
    const avgGrade = subs.filter(s => s.grade !== undefined).reduce((sum, s) => sum + (s.grade || 0), 0) / subs.filter(s => s.grade !== undefined).length || 0
    return { total, approved, submitted, resubmit, avgGrade: Math.round(avgGrade) }
  }, [subs])

  const pinnedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [announcements])

  return (
    <Layout role="student">
      <div className="dashboard-container">
        {/* Dashboard Header with Stats */}
        <div className="dashboard-header" id="dashboard-overview">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">My Dashboard</h1>
            <p className="dashboard-subtitle">Track your academic submissions and progress</p>
          </div>
          <div className="dashboard-stats-grid">
            <div className="stat-card stat-card-primary">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Submissions</div>
              </div>
            </div>
            <div className="stat-card stat-card-success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.approved}</div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
            <div className="stat-card stat-card-warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.submitted}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
            <div className="stat-card stat-card-info">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">{stats.avgGrade || 'N/A'}</div>
                <div className="stat-label">Avg Grade</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="dashboard-progress-card" id="student-progress">
          <div className="progress-card-header">
            <h2 className="progress-card-title">📈 Overall Progress</h2>
            <span className="progress-percentage">{progress}%</span>
          </div>
          <div className="progress-card-body">
            <div className="progress-bar-large">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-stats">
              <span>{stats.approved} of {stats.total} submissions approved</span>
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="dashboard-announcements-card" id="student-announcements">
          <div className="announcements-header">
            <h2>📢 Alerts & Announcements</h2>
            <p>Messages pinned by your professors appear here.</p>
          </div>
          {pinnedAnnouncements.length === 0 ? (
            <div className="announcements-empty">
              <span className="announcements-empty-icon">🌤️</span>
              <p>No alerts right now. We’ll let you know when something important is posted.</p>
            </div>
          ) : (
            <div className="announcements-list">
              {pinnedAnnouncements.map(a => (
                <article key={a.id} className="announcement-card student">
                  <header className="announcement-card-header">
                    <div>
                      <h3>{a.title}</h3>
                      <span className="announcement-meta">
                        Posted {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="announcement-pill">Pinned</span>
                  </header>
                  <p className="announcement-message">{a.message}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Group Management Section */}
        <div className="dashboard-section-toggle">
          <button
            className="btn-toggle-section"
            onClick={() => setShowGroups(!showGroups)}
          >
            {showGroups ? '✕ Close Groups' : '👥 Manage Groups'}
          </button>
        </div>

        {showGroups && (
          <div className="dashboard-group-section" id="student-groups">
            <GroupManagement />
          </div>
        )}

        {/* New Submission Card */}
        <div className="dashboard-new-submission-card" id="new-submission">
          <div className="new-submission-header">
            <h2 className="new-submission-title">➕ Create New Submission</h2>
            <p className="new-submission-subtitle">Submit your work to your assigned professor</p>
          </div>
          <div className="new-submission-body">
            <div className="submission-form-grid">
              <div className="form-field">
                <label className="form-label">Use Template (Optional)</label>
                <select 
                  className="form-select" 
                  value={selectedTemplate} 
                  onChange={e => {
                    setSelectedTemplate(e.target.value)
                    if (e.target.value) {
                      applyTemplate(e.target.value)
                    }
                  }}
                >
                  <option value="">-- Select a template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.type.toUpperCase()})</option>
                  ))}
                </select>
                <small className="form-hint">Select a template to pre-fill the form</small>
              </div>
              <div className="form-field">
                <label className="form-label">Select Professor *</label>
                <select 
                  className="form-select" 
                  value={professorId} 
                  onChange={e => setProfessorId(e.target.value)} 
                  required
                >
                  <option value="">-- Select a professor --</option>
                  {professors.map(p => (
                    <option key={p.id} value={p.userId}>{p.name || p.userId} ({p.email})</option>
                  ))}
                </select>
                {professors.length === 0 && <small className="form-hint">No professors available. Please contact an administrator.</small>}
              </div>
              <div className="form-field">
                <label className="form-label">Group (Optional)</label>
                <select 
                  className="form-select" 
                  value={groupId} 
                  onChange={e => setGroupId(e.target.value)}
                >
                  <option value="">-- Individual submission --</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <small className="form-hint">Select a group for collaborative submission</small>
              </div>
              <div className="form-field">
                <label className="form-label">Title</label>
                <input 
                  className="form-input" 
                  placeholder="Enter submission title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>
              <div className="form-field">
                <label className="form-label">Type</label>
                <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                  <option value="pdf">PDF Document</option>
                  <option value="zip">ZIP Archive</option>
                  <option value="link">External Link</option>
                  <option value="report">Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Content URL or Reference</label>
                <input 
                  className="form-input" 
                  placeholder="https://..." 
                  value={contentRef} 
                  onChange={e => setContentRef(e.target.value)} 
                />
              </div>
              <div className="form-field form-field-full">
                <label className="form-label">Notes</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Add any additional notes..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={3}
                />
              </div>
              <div className="form-field form-field-full">
                <button 
                  className="btn btn-submit" 
                  onClick={submit} 
                  disabled={!title || !contentRef || !professorId}
                >
                  📤 Submit Work
                </button>
              </div>
            </div>
            <div
              className={`dashboard-dropzone${isDragging ? ' dragover' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={async (e) => {
                e.preventDefault(); setIsDragging(false)
                if (!professorId) {
                  alert('Please select a professor first')
                  return
                }
                const files = Array.from(e.dataTransfer.files || [])
                for (const file of files) {
                  const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(String(reader.result))
                    reader.onerror = () => reject(new Error('read fail'))
                    reader.readAsDataURL(file)
                  })
                  const headers = getHeaders()
                  const up = await fetch(`${API}/api/uploads`, { method: 'POST', headers, body: JSON.stringify({ filename: file.name, data: base64 }) }).then(r => r.json())
                  const ext = (file.name.split('.').pop() || '').toLowerCase()
                  const inferred: string = ext === 'pdf' ? 'pdf' : ext === 'zip' ? 'zip' : 'other'
                  const created = await fetch(`${API}/api/submissions`, {
                    method: 'POST', headers,
                    body: JSON.stringify({ 
                      title: file.name, 
                      type: inferred, 
                      contentRef: up.url, 
                      notes: '', 
                      professorId,
                      groupId: groupId || undefined
                    })
                  }).then(r => r.json())
                  setSubs(prev => [created, ...prev])
                }
              }}
            >
              <div className="dropzone-icon">📁</div>
              <div className="dropzone-text">
                <strong>Drag & drop files here</strong>
                <span>or click to browse (select a professor first)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments */}
        <div className="dashboard-templates-section" id="templates-section">
          <div className="templates-section-header">
            <div>
              <h2 className="templates-section-title">📂 Assignments</h2>
              <p className="templates-section-subtitle">Browse the curated assignments and click to pre-fill your submission.</p>
            </div>
            <button
              className="btn-refresh-templates"
              onClick={async () => {
                try {
                  const headers = getHeaders()
                  const res = await fetch(`${API}/api/templates`, { headers })
                  if (!res.ok) throw new Error('Failed to refresh templates')
                  const data = await res.json()
                  setTemplates(data)
                } catch (err) {
                  console.error(err)
                  alert('Unable to refresh templates right now.')
                }
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="templates-empty-state">
              <div className="templates-empty-icon">🗂️</div>
              <p>No templates available yet. Check back later or ask your professor to publish templates.</p>
            </div>
          ) : (
            <div className="student-template-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`student-template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="student-template-header">
                    <h3>{template.title}</h3>
                    <span className={`student-template-type type-${template.type}`}>{template.type.toUpperCase()}</span>
                  </div>
                  {template.description && (
                    <p className="student-template-description">{template.description}</p>
                  )}
                  {template.instructions && (
                    <div className="student-template-section">
                      <span className="student-template-label">Instructions</span>
                      <p>{template.instructions}</p>
                    </div>
                  )}
                  {template.requirements && template.requirements.length > 0 && (
                    <div className="student-template-section">
                      <span className="student-template-label">Requirements</span>
                      <ul>
                        {template.requirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="student-template-footer">
                    <div className="student-template-meta">
                      <span>Created by <strong>{template.createdBy}</strong></span>
                      <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                      {template.dueDate && (
                        <span>Due {new Date(template.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-template-apply"
                      onClick={(event) => {
                        event.stopPropagation()
                        applyTemplate(template.id)
                      }}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions List */}
        <div className="dashboard-submissions-section" id="student-submissions">
          <div className="submissions-section-header">
            <h2 className="submissions-section-title">📚 My Submissions ({subs.length})</h2>
            {subs.length === 0 && (
              <p className="submissions-empty-message">No submissions yet. Create your first submission above!</p>
            )}
          </div>
          <div className="submissions-grid-compact">
            {subs.map(s => {
              const isExpanded = expandedSubmissionId === s.id
              const isEditing = editingId === s.id
              const groupName = s.groupId ? (groups.find(g => g.id === s.groupId)?.name || 'Group Submission') : null
              const submittedDate = new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

              return (
                <div 
                  key={s.id} 
                  className={`submission-card-compact status-${s.status} ${isExpanded ? 'expanded' : ''}`}
                >
                  <div className="submission-compact-view" onClick={() => toggleSubmission(s.id)}>
                    <div className="submission-compact-header">
                      <div className="submission-compact-title-section">
                        <h3 className="submission-compact-title">{s.title}</h3>
                        <span className={`status-badge-compact status-${s.status}`}>{s.status}</span>
                      </div>
                      <div className="submission-compact-meta">
                        <span className="submission-compact-date">{submittedDate}</span>
                        <span className="submission-compact-pill">{s.type.toUpperCase()}</span>
                        {groupName && <span className="submission-compact-pill">{groupName}</span>}
                        {s.currentVersion && s.currentVersion > 1 && (
                          <span className="submission-compact-pill">v{s.currentVersion}</span>
                        )}
                        {typeof s.grade === 'number' && (
                          <span className="submission-compact-grade">Grade {s.grade}/100</span>
                        )}
                      </div>
                      <div className="submission-compact-actions">
                        <span className="submission-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      className="submission-expanded-view student-expanded-view" 
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="student-expanded-top">
                        <div className="student-expanded-title">
                          {isEditing ? (
                            <input 
                              className="submission-title-input-new"
                              value={editTitle} 
                              onChange={e => setEditTitle(e.target.value)} 
                              placeholder="Submission title"
                            />
                          ) : (
                            <h3>{s.title}</h3>
                          )}
                        </div>
                        <div className="student-expanded-actions">
                          {isEditing ? (
                            <div className="edit-actions-new">
                              <button 
                                className="btn-save-new" 
                                onClick={e => {
                                  e.stopPropagation()
                                  updateSubmission(s.id)
                                }}
                              >
                                Save
                              </button>
                              <button 
                                className="btn-cancel-new" 
                                onClick={e => {
                                  e.stopPropagation()
                                  cancelEdit()
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="btn-edit-new" 
                              onClick={e => {
                                e.stopPropagation()
                                startEdit(s)
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="student-expanded-meta">
                        <span className={`status-badge-compact status-${s.status}`}>{s.status}</span>
                        <span className="student-expanded-chip">{s.type.toUpperCase()}</span>
                        <span className="student-expanded-chip">Submitted {submittedDate}</span>
                        {typeof s.grade === 'number' && (
                          <span className="student-expanded-chip grade-chip">{s.grade}/100</span>
                        )}
                        {s.currentVersion && s.currentVersion > 1 && (
                          <span className="student-expanded-chip">v{s.currentVersion}</span>
                        )}
                        {groupName && <span className="student-expanded-chip">{groupName}</span>}
                      </div>

                      <div className="student-expanded-body">
                        <div className="submission-details-new">
                          {isEditing ? (
                            <div className="submission-edit-form-new">
                              <div className="edit-field-new">
                                <label className="edit-label-new">Type</label>
                                <select className="edit-input-new" value={editType} onChange={e => setEditType(e.target.value)}>
                                  <option value="pdf">PDF Document</option>
                                  <option value="zip">ZIP Archive</option>
                                  <option value="link">External Link</option>
                                  <option value="report">Report</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div className="edit-field-new">
                                <label className="edit-label-new">Content URL or Reference</label>
                                <input 
                                  className="edit-input-new"
                                  value={editContentRef} 
                                  onChange={e => setEditContentRef(e.target.value)} 
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="submission-info-grid-new">
                              {groupName && (
                                <div className="info-item-new">
                                  <span className="info-label-new">Group</span>
                                  <span className="info-value-new group-badge-new">{groupName}</span>
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
                            </div>
                          )}
                        </div>

                        {s.currentVersion && s.currentVersion > 1 && (
                          <div className="submission-section-new">
                            <VersionHistory 
                              submissionId={s.id} 
                              currentVersion={s.currentVersion || 1}
                            />
                          </div>
                        )}

                        <div className="submission-section-new">
                          <div className="section-header-new">
                            <span className="section-icon-new">📝</span>
                            <h4 className="section-title-new">NOTES</h4>
                          </div>
                          <div className="section-content-new">
                            {isEditing ? (
                              <textarea 
                                className="notes-textarea-new"
                                value={editNotes} 
                                onChange={e => setEditNotes(e.target.value)} 
                                placeholder="Add your notes here..."
                                rows={3}
                              />
                            ) : (
                              <textarea 
                                className="notes-textarea-new"
                                value={s.notes || ''} 
                                onChange={e => updateNotes(s.id, e.target.value)} 
                                placeholder="Add your notes here..."
                                rows={3}
                              />
                            )}
                          </div>
                        </div>

                        <div className="submission-section-new">
                          <div className="section-header-new">
                            <span className="section-icon-new">🎯</span>
                            <h4 className="section-title-new">Milestones</h4>
                            {isEditing && (
                              <div className="milestone-add-form-new">
                                <input 
                                  type="text" 
                                  className="milestone-input-new"
                                  placeholder="Milestone label" 
                                  value={newMilestoneLabel}
                                  onChange={e => setNewMilestoneLabel(e.target.value)}
                                />
                                <input 
                                  type="date" 
                                  className="milestone-date-new"
                                  value={newMilestoneDate}
                                  onChange={e => setNewMilestoneDate(e.target.value)}
                                />
                                <button className="btn-add-milestone-new" onClick={addMilestone}>Add</button>
                              </div>
                            )}
                          </div>
                          <div className="section-content-new">
                            <div className="milestones-list-new">
                              {(isEditing ? editMilestones : (s.milestones || [])).map((milestone, idx) => (
                                <div key={idx} className={`milestone-item-new ${milestone.done ? 'done' : ''}`}>
                                  <input 
                                    type="checkbox" 
                                    className="milestone-checkbox-new"
                                    checked={milestone.done} 
                                    onChange={() => isEditing ? toggleMilestone(idx) : undefined}
                                    disabled={!isEditing}
                                  />
                                  <div className="milestone-content-new">
                                    <div className="milestone-label-new">{milestone.label}</div>
                                    <div className="milestone-date-text-new">{new Date(milestone.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                  </div>
                                  {isEditing && (
                                    <button 
                                      className="milestone-remove-btn-new" 
                                      onClick={() => removeMilestone(idx)}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                              {(!s.milestones || s.milestones.length === 0) && !isEditing && (
                                <div className="milestones-empty-new">No milestones added. Click "Edit" to add milestones.</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="submission-section-new">
                          <div className="section-header-new">
                            <span className="section-icon-new">💬</span>
                            <h4 className="section-title-new">Add a Comment</h4>
                          </div>
                          <div className="section-content-new">
                            {commentingId === s.id ? (
                              <div className="comment-form-new">
                                <textarea
                                  className="comment-textarea-new"
                                  placeholder="Write your comment..."
                                  value={studentComment}
                                  onChange={e => setStudentComment(e.target.value)}
                                  rows={3}
                                />
                                <div className="comment-actions-new">
                                  <button className="btn-post-comment-new" onClick={() => addStudentComment(s.id)}>Post Comment</button>
                                  <button className="btn-cancel-comment-new" onClick={() => { setCommentingId(null); setStudentComment('') }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                className="btn-add-comment-new" 
                                onClick={e => {
                                  e.stopPropagation()
                                  setExpandedSubmissionId(s.id)
                                  setCommentingId(s.id)
                                }}
                              >
                                Add Comment
                              </button>
                            )}
                          </div>
                        </div>

                        {!!(s.feedback && s.feedback.length) && (
                          <div className="submission-section-new submission-feedback-section-new">
                            <div className="section-header-new">
                              <span className="section-icon-new">💬</span>
                              <h4 className="section-title-new">Feedback & Comments ({s.feedback.length})</h4>
                            </div>
                            <div className="section-content-new">
                              <div className="feedback-list-new">
                                {s.feedback!.map((f, i) => {
                                  const isStudentComment = f.by === auth?.userId
                                  return (
                                    <div key={i} className={`feedback-item-new ${isStudentComment ? 'student-comment' : 'professor-feedback'}`}>
                                      <div className="feedback-date-new">{new Date(f.date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                      <div className="feedback-text-new">{f.text}</div>
                                      {f.by && (
                                        <div className="feedback-author-new">
                                          — {isStudentComment ? 'You' : f.by}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}


