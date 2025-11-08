import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import GroupDiscussionPanel from '../components/GroupDiscussionPanel'
import { getAuth } from './Login'

type Group = {
  id: string
  name: string
  description?: string
  createdBy: string
  members: string[]
  createdAt: string
  updatedAt: string
}

type Submission = {
  id: string
  title: string
  groupId?: string
  status?: string
  updatedAt?: string
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

type GroupDiscussionsPageProps = {
  role: 'student' | 'professor'
}

export default function GroupDiscussionsPage({ role }: GroupDiscussionsPageProps) {
  const auth = getAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) return
    async function loadGroups() {
      setGroupsLoading(true)
      setGroupsError(null)
      try {
        const headers = getHeaders()
        const res = await fetch(`${API}/api/groups`, { headers })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load groups')
        }
        const data = (await res.json()) as Group[]
        setGroups(data)
      } catch (err) {
        setGroupsError(err instanceof Error ? err.message : 'Failed to load groups')
      } finally {
        setGroupsLoading(false)
      }
    }
    loadGroups()
  }, [auth])

  useEffect(() => {
    if (!auth) return
    async function loadSubmissions() {
      try {
        const headers = getHeaders()
        const res = await fetch(`${API}/api/submissions`, { headers })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load submissions')
        }
        const data = await res.json()
        setSubmissions(data)
      } catch (err) {
        // Silent failure; submissions are optional for discussion display
        console.error('Failed to load submissions', err)
      }
    }
    loadSubmissions()
  }, [auth])

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null)
      if (searchParams.toString()) {
        setSearchParams({})
      }
      return
    }
    const paramGroup = searchParams.get('group')
    if (paramGroup && groups.some(g => g.id === paramGroup)) {
      if (selectedGroupId !== paramGroup) {
        setSelectedGroupId(paramGroup)
      }
      return
    }
    const fallback = groups[0].id
    if (selectedGroupId !== fallback) {
      setSelectedGroupId(fallback)
    }
    if (paramGroup !== fallback) {
      setSearchParams({ group: fallback })
    }
  }, [groups, searchParams, selectedGroupId, setSearchParams])

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null
    return groups.find(g => g.id === selectedGroupId) || null
  }, [groups, selectedGroupId])

  function handleSelectGroup(groupId: string) {
    setSelectedGroupId(groupId)
    setSearchParams({ group: groupId })
  }

  function goToDashboard() {
    navigate(role === 'professor' ? '/professor' : '/student')
  }

  return (
    <Layout role={role}>
      <div className="discussions-page">
        <div className="discussions-hero">
          <div>
            <h1>{role === 'professor' ? 'Group Discussions Control Center' : 'Group Discussions Workspace'}</h1>
            <p>
              Coordinate deliverables, align milestones, and keep every message tied to coursework—all without leaving
              this dedicated space.
            </p>
          </div>
          <button type="button" className="btn-discussion" onClick={goToDashboard}>
            ← Back to dashboard
          </button>
        </div>

        {groupsError && <div className="discussion-error">{groupsError}</div>}

        <div className="discussions-grid">
          <aside className="discussions-group-column">
            <div className="discussions-group-header">
              <h2>Your groups</h2>
              {groupsLoading ? (
                <span className="discussions-group-meta">Loading…</span>
              ) : (
                <span className="discussions-group-meta">
                  {groups.length} group{groups.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="discussions-group-list">
              {groupsLoading && groups.length === 0 ? (
                <div className="discussion-placeholder">Fetching your groups…</div>
              ) : groups.length === 0 ? (
                <div className="discussion-placeholder">
                  {role === 'professor'
                    ? 'No groups yet. Students will appear here once they create collaboration groups.'
                    : 'No groups yet. Create a group from your dashboard to start collaborating.'}
                </div>
              ) : (
                groups.map(group => {
                  const isSelected = group.id === selectedGroupId
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`discussions-group-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectGroup(group.id)}
                    >
                      <div className="discussions-group-card-header">
                        <h3>{group.name}</h3>
                        <span>{group.members.length} member{group.members.length === 1 ? '' : 's'}</span>
                      </div>
                      {group.description && <p>{group.description}</p>}
                      <div className="discussions-group-card-meta">
                        <span>
                          Created{' '}
                          {new Date(group.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>Owner: {group.createdBy === auth?.userId ? 'You' : group.createdBy}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="discussions-thread-column">
            {selectedGroup ? (
              <GroupDiscussionPanel
                key={selectedGroup.id}
                group={selectedGroup}
                open
                submissions={submissions.filter(sub => sub.groupId === selectedGroup.id)}
                title={`${selectedGroup.name} • Threads`}
              />
            ) : (
              <div className="discussion-placeholder">
                {groupsLoading
                  ? 'Preparing workspace…'
                  : 'Select or create a group to begin collaborating.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}


