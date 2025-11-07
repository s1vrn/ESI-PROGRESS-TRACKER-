import React, { useEffect, useState } from 'react'
import { getAuth } from '../pages/Login'

type Group = {
  id: string
  name: string
  description?: string
  createdBy: string
  members: string[]
  createdAt: string
  updatedAt: string
}

type User = {
  userId: string
  name?: string
  email: string
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

export default function GroupManagement() {
  const auth = getAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<User[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [addMemberId, setAddMemberId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auth) return
    fetchGroups()
    fetchStudents()
  }, [auth])

  const fetchGroups = async () => {
    try {
      const headers = getHeaders()
      const res = await fetch(`${API}/api/groups`, { headers })
      const data = await res.json()
      setGroups(data)
    } catch (err) {
      console.error('Failed to fetch groups:', err)
    }
  }

  const fetchStudents = async () => {
    try {
      const headers = getHeaders()
      const res = await fetch(`${API}/api/user/all-students`, { headers })
      if (res.ok) {
        const data = await res.json()
        setStudents(data)
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Group name is required')
      return
    }
    try {
      setLoading(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newGroupName.trim(), description: newGroupDescription.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create group')
      const newGroup = await res.json()
      setGroups(prev => [...prev, newGroup])
      setNewGroupName('')
      setNewGroupDescription('')
      setShowCreateForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const addMember = async (groupId: string) => {
    if (!addMemberId.trim()) {
      alert('Please enter a student ID')
      return
    }
    try {
      setLoading(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/groups/${groupId}/members`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ studentId: addMemberId.trim() }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add member')
      }
      const updatedGroup = await res.json()
      setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g))
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(updatedGroup)
      }
      setAddMemberId('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setLoading(false)
    }
  }

  const removeMember = async (groupId: string, studentId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      setLoading(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/groups/${groupId}/members/${studentId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove member')
      }
      const updatedGroup = await res.json()
      setGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g))
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(updatedGroup)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group-management">
      <div className="group-management-header">
        <h2 className="group-management-title">👥 My Groups</h2>
        <button
          className="btn-create-group"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Group'}
        </button>
      </div>

      {showCreateForm && (
        <div className="group-create-form">
          <div className="form-field">
            <label className="form-label">Group Name *</label>
            <input
              className="form-input"
              placeholder="Enter group name"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Enter group description (optional)"
              value={newGroupDescription}
              onChange={e => setNewGroupDescription(e.target.value)}
              rows={3}
            />
          </div>
          <button
            className="btn-submit"
            onClick={createGroup}
            disabled={loading || !newGroupName.trim()}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      )}

      <div className="groups-list">
        {groups.length === 0 ? (
          <div className="groups-empty">
            <div className="groups-empty-icon">👥</div>
            <p>No groups yet. Create your first group to collaborate!</p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} className="group-card">
              <div className="group-card-header">
                <div className="group-card-info">
                  <h3 className="group-card-name">{group.name}</h3>
                  {group.description && (
                    <p className="group-card-description">{group.description}</p>
                  )}
                  <div className="group-card-meta">
                    <span>Created by: {group.createdBy === auth?.userId ? 'You' : group.createdBy}</span>
                    <span>•</span>
                    <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                {group.createdBy === auth?.userId && (
                  <span className="group-creator-badge">Creator</span>
                )}
              </div>

              <div className="group-members-section">
                <div className="group-members-header">
                  <h4 className="group-members-title">Members</h4>
                  {group.createdBy === auth?.userId && (
                    <div className="group-add-member">
                      <input
                        className="group-member-input"
                        placeholder="Enter student ID"
                        value={addMemberId}
                        onChange={e => setAddMemberId(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addMember(group.id)}
                      />
                      <button
                        className="btn-add-member"
                        onClick={() => addMember(group.id)}
                        disabled={loading || !addMemberId.trim()}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
                <div className="group-members-list">
                  {group.members.map(memberId => {
                    const member = students.find(s => s.userId === memberId)
                    const isCreator = memberId === group.createdBy
                    const canRemove = group.createdBy === auth?.userId || memberId === auth?.userId
                    return (
                      <div key={memberId} className="group-member-item">
                        <div className="group-member-info">
                          <span className="group-member-name">
                            {member?.name || memberId}
                            {isCreator && <span className="group-member-creator"> (Creator)</span>}
                          </span>
                          {member?.email && (
                            <span className="group-member-email">{member.email}</span>
                          )}
                        </div>
                        {canRemove && !isCreator && (
                          <button
                            className="btn-remove-member"
                            onClick={() => removeMember(group.id, memberId)}
                            disabled={loading}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

