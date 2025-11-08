import React, { useEffect, useState } from 'react'
import { getAuth } from '../pages/Login'

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

export default function TemplateManagement() {
  const auth = getAuth()
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'pdf' | 'zip' | 'link' | 'report' | 'other'>('pdf')
  const [instructions, setInstructions] = useState('')
  const [requirements, setRequirements] = useState<string[]>([''])
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (!auth) return
    fetchTemplates()
  }, [auth])

  const fetchTemplates = async () => {
    try {
      const headers = getHeaders()
      const res = await fetch(`${API}/api/templates`, { headers })
      const data = await res.json()
      setTemplates(data)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setType('pdf')
    setInstructions('')
    setRequirements([''])
    setDueDate('')
    setShowCreateForm(false)
    setEditingId(null)
    setExpandedAssignmentId(null)
  }

  const startEdit = (template: AssignmentTemplate) => {
    setEditingId(template.id)
    setTitle(template.title)
    setDescription(template.description || '')
    setType(template.type)
    setInstructions(template.instructions || '')
    setRequirements(template.requirements && template.requirements.length > 0 ? template.requirements : [''])
    setDueDate(template.dueDate || '')
    setShowCreateForm(true)
    setExpandedAssignmentId(template.id)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }
    try {
      setLoading(true)
      const headers = getHeaders()
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        instructions: instructions.trim() || undefined,
        requirements: requirements.filter(r => r.trim()).length > 0 ? requirements.filter(r => r.trim()) : undefined,
        dueDate: dueDate || undefined,
      }
      
      let res
      if (editingId) {
        res = await fetch(`${API}/api/templates/${editingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`${API}/api/templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      }
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save template')
      }
      
      await fetchTemplates()
      resetForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      setLoading(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/templates/${id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete template')
      }
      await fetchTemplates()
      setExpandedAssignmentId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete template')
    } finally {
      setLoading(false)
    }
  }

  const addRequirement = () => {
    setRequirements([...requirements, ''])
  }

  const updateRequirement = (index: number, value: string) => {
    const updated = [...requirements]
    updated[index] = value
    setRequirements(updated)
  }

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter((_, i) => i !== index))
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedAssignmentId(prev => (prev === id ? null : id))
  }

  return (
    <div className="template-management">
      <div className="template-management-header">
        <div className="template-management-title-group">
          <h2 className="template-management-title">Assignments</h2>
          <p className="template-management-subtitle">
            Curate ready-to-use briefs students can start from instantly.
          </p>
        </div>
        <button
          className="btn-create-template"
          onClick={() => {
            resetForm()
            setShowCreateForm(true)
          }}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Assignment'}
        </button>
      </div>

      {showCreateForm && (
        <div className="template-form">
          <div className="form-field">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              placeholder="Enter template title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Enter template description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Type *</label>
            <select className="form-select" value={type} onChange={e => setType(e.target.value as any)}>
              <option value="pdf">PDF Document</option>
              <option value="zip">ZIP Archive</option>
              <option value="link">External Link</option>
              <option value="report">Report</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Instructions</label>
            <textarea
              className="form-textarea"
              placeholder="Enter assignment instructions"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              rows={4}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Requirements</label>
            {requirements.map((req, index) => (
              <div key={index} className="requirement-item">
                <input
                  className="form-input"
                  placeholder={`Requirement ${index + 1}`}
                  value={req}
                  onChange={e => updateRequirement(index, e.target.value)}
                />
                {requirements.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove-requirement"
                    onClick={() => removeRequirement(index)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn-add-requirement"
              onClick={addRequirement}
            >
              + Add Requirement
            </button>
          </div>
          <div className="form-field">
            <label className="form-label">Due Date (Optional)</label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
          >
            {loading ? 'Saving...' : editingId ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      )}

      <div className="templates-list">
        {templates.length === 0 ? (
          <div className="templates-empty">
            <div className="templates-empty-icon">📋</div>
            <p>No assignments yet. Draft one above to get students started quickly.</p>
          </div>
        ) : (
          templates.map(template => (
            <div
              key={template.id}
              className={`assignment-card ${expandedAssignmentId === template.id ? 'expanded' : ''}`}
            >
              <button
                type="button"
                className="assignment-card-compact"
                onClick={() => toggleExpanded(template.id)}
              >
                <div className="assignment-card-top">
                  <div className="assignment-card-title-group">
                    <h3 className="assignment-card-title">{template.title}</h3>
                    <div className="assignment-card-meta">
                      <span className={`assignment-type-chip type-${template.type}`}>
                        {template.type.toUpperCase()}
                      </span>
                      {template.dueDate && (
                        <span className="assignment-date">Due {new Date(template.dueDate).toLocaleDateString()}</span>
                      )}
                      <span className="assignment-date">Created {new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="assignment-expand-icon">
                    {expandedAssignmentId === template.id ? '▼' : '▶'}
                  </span>
                </div>
                {template.description && (
                  <p className="assignment-card-description">{template.description}</p>
                )}
              </button>

              {expandedAssignmentId === template.id && (
                <div className="assignment-card-details">
                  {template.createdBy === auth?.userId && (
                    <div className="assignment-card-actions">
                      <button
                        className="btn-edit-template"
                        onClick={() => startEdit(template)}
                        disabled={loading}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn-delete-template"
                        onClick={() => handleDelete(template.id)}
                        disabled={loading}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}

                  {template.instructions && (
                    <div className="assignment-detail-block">
                      <h4>Instructions</h4>
                      <p>{template.instructions}</p>
                    </div>
                  )}

                  {template.requirements && template.requirements.length > 0 && (
                    <div className="assignment-detail-block">
                      <h4>Requirements</h4>
                      <ul>
                        {template.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

