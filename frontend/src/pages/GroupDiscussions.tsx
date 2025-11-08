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
  const [groupSearch, setGroupSearch] = useState('')

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

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups
    const lowered = groupSearch.trim().toLowerCase()
    return groups.filter(group =>
      group.name.toLowerCase().includes(lowered) ||
      (group.description ?? '').toLowerCase().includes(lowered)
    )
  }, [groups, groupSearch])

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

  const selectedGroupMembers = useMemo(() => {
    if (!selectedGroup) return []
    const ids = new Set<string>()
    ids.add(selectedGroup.createdBy)
    selectedGroup.members.forEach(id => ids.add(id))
    return Array.from(ids).map(userId => ({ userId }))
  }, [selectedGroup])

  function handleSelectGroup(groupId: string) {
    setSelectedGroupId(groupId)
    setSearchParams({ group: groupId })
  }

  function goToDashboard() {
    navigate(role === 'professor' ? '/professor' : '/student')
  }

  return (
    <Layout role={role}>
      <div className="discussions-layout">
        <header className="discussions-header">
          <div className="discussions-header-left">
            <div className="discussions-breadcrumb">
              <button type="button" onClick={goToDashboard}>← Dashboard</button>
              <span>/</span>
              <span>Discussions</span>
            </div>
            <h1>{role === 'professor' ? 'Professor Discussions' : 'Student Discussions'}</h1>
            <p>
              Switch between collaboration groups, monitor activity and keep the conversation aligned with coursework.
            </p>
          </div>
          <div className="discussions-header-right">
            <div className="header-indicator">
              <span className="indicator-dot"></span>
              Live sync enabled
            </div>
            <div className="header-meta">
              <strong>{groups.length}</strong>
              <span>Active groups</span>
            </div>
          </div>
        </header>

        {groupsError && <div className="discussion-error">{groupsError}</div>}

        <div className="discussions-shell">
          <aside className="group-column">
            <div className="group-column-header">
              <div>
                <h2>Groups</h2>
                <span>{groups.length ? `${groups.length} total` : 'No groups yet'}</span>
              </div>
              <button
                type="button"
                className="group-refresh"
                onClick={() => setGroups(prev => [...prev])}
                title="Refresh groups"
              >
                ⟳
              </button>
            </div>

            <div className="group-search">
              <input
                type="search"
                placeholder="Search group or description"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
              />
            </div>

            <div className="group-list">
              {groupsLoading && filteredGroups.length === 0 ? (
                <div className="group-empty">Loading groups…</div>
              ) : filteredGroups.length === 0 ? (
                <div className="group-empty">
                  {groupSearch
                    ? 'No groups match your search.'
                    : role === 'professor'
                      ? 'When students create teams they will appear here automatically.'
                      : 'Create a collaboration group from your dashboard to start chatting.'}
                </div>
              ) : (
                filteredGroups.map(group => {
                  const isSelected = group.id === selectedGroupId
                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`group-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectGroup(group.id)}
                    >
                      <div className="group-avatar">
                        {group.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="group-row-body">
                        <div className="group-row-title">
                          <span>{group.name}</span>
                          <time>
                            {new Date(group.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </time>
                        </div>
                        <div className="group-row-subtitle">
                          <span>{group.members.length} member{group.members.length === 1 ? '' : 's'}</span>
                          {group.description && <span className="group-row-description">{group.description}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          <section className="conversation-column">
            {selectedGroup ? (
              <GroupDiscussionPanel
                key={selectedGroup.id}
                group={selectedGroup}
                open
                submissions={submissions.filter(sub => sub.groupId === selectedGroup.id)}
                title={selectedGroup.name}
                members={selectedGroupMembers}
              />
            ) : (
              <div className="conversation-empty">
                {groupsLoading
                  ? 'Preparing workspace…'
                  : 'Select a group from the left column to open its conversation.'}
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  )
}


