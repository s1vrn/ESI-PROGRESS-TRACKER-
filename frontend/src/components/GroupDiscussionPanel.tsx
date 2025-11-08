import React, { useEffect, useMemo, useState } from 'react'
import { getAuth } from '../pages/Login'

type Group = {
  id: string
  name: string
  description?: string
  members: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

type SubmissionSummary = {
  id: string
  title: string
  groupId?: string
  status?: string
  updatedAt?: string
}

type GroupMessage = {
  id: string
  threadId: string
  groupId: string
  authorId: string
  body: string
  createdAt: string
}

type GroupThread = {
  id: string
  groupId: string
  title: string
  createdBy: string
  relatedSubmissionId: string | null
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessageAt?: string
  lastMessage: GroupMessage | null
}

type ThreadWithMessages = {
  thread: GroupThread
  messages: GroupMessage[]
}

const API = 'http://localhost:4000'

function initialsFor(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return '??'
  const parts = trimmed.split(/\s+/).slice(0, 2)
  const initials = parts.map(part => part.charAt(0).toUpperCase()).join('')
  return initials || trimmed.slice(0, 2).toUpperCase()
}

type GroupDiscussionPanelProps = {
  group: Group
  open: boolean
  submissions?: SubmissionSummary[]
  title?: string
  members?: Array<{ userId: string; name?: string }>
}

export default function GroupDiscussionPanel({ group, open, submissions = [], title, members = [] }: GroupDiscussionPanelProps) {
  const auth = getAuth()
  const [threads, setThreads] = useState<GroupThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [threadsError, setThreadsError] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messagesState, setMessagesState] = useState<Record<string, GroupMessage[]>>({})
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)
  const [newThreadTitle, setNewThreadTitle] = useState('')
  const [newThreadSubmissionId, setNewThreadSubmissionId] = useState('')
  const [initialMessage, setInitialMessage] = useState('')
  const [creatingThread, setCreatingThread] = useState(false)
  const [newMessageDraft, setNewMessageDraft] = useState('')
  const [postingMessage, setPostingMessage] = useState(false)
  const [threadSearch, setThreadSearch] = useState('')
  const [userDirectory, setUserDirectory] = useState<Record<string, { name?: string; initials: string }>>({})

  const groupSubmissions = useMemo(() => {
    return submissions.filter(sub => sub.groupId === group.id)
  }, [submissions, group.id])

  const filteredThreads = useMemo(() => {
    if (!threadSearch.trim()) return threads
    const lowered = threadSearch.trim().toLowerCase()
    return threads.filter(thread => {
      const submissionTitle = getSubmissionTitle(thread.relatedSubmissionId)
      return (
        thread.title.toLowerCase().includes(lowered) ||
        (submissionTitle ? submissionTitle.toLowerCase().includes(lowered) : false)
      )
    })
  }, [threads, threadSearch])

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return filteredThreads[0] || null
    const existing = threads.find(thread => thread.id === selectedThreadId)
    if (existing) return existing
    return filteredThreads[0] || null
  }, [threads, filteredThreads, selectedThreadId])

  useEffect(() => {
    const directory: Record<string, { name?: string; initials: string }> = {}
    const sourceMembers: Array<{ userId: string; name?: string }> = members.length
      ? members
      : Array.from(new Set([group.createdBy, ...group.members])).map(userId => ({ userId }))

    sourceMembers.forEach(member => {
      const displayName = member.name || member.userId
      directory[member.userId] = {
        name: member.name,
        initials: initialsFor(displayName),
      }
    })

    if (auth?.userId && !directory[auth.userId]) {
      directory[auth.userId] = {
        name: auth.userId,
        initials: initialsFor(auth.userId),
      }
    }

    setUserDirectory(directory)
  }, [members, group, auth?.userId])

  useEffect(() => {
    if (selectedThreadId && !threads.some(thread => thread.id === selectedThreadId)) {
      setSelectedThreadId(threads.length ? threads[0].id : null)
    }
  }, [threads, selectedThreadId])

  useEffect(() => {
    setSelectedThreadId(null)
    setMessagesState({})
  }, [group.id])

  useEffect(() => {
    if (!filteredThreads.length) {
      if (selectedThreadId !== null) {
        setSelectedThreadId(null)
      }
      return
    }
    if (!selectedThreadId || !filteredThreads.some(thread => thread.id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].id)
    }
  }, [filteredThreads, selectedThreadId])

  useEffect(() => {
    if (!open) return
    fetchThreads()
    const interval = setInterval(() => {
      fetchThreads(true)
    }, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group.id])

  useEffect(() => {
    if (!open || !selectedThreadId) return
    fetchThreadMessages(selectedThreadId)
    const interval = setInterval(() => {
      fetchThreadMessages(selectedThreadId, true)
    }, 3000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedThreadId, group.id])

  async function fetchThreads(silent = false) {
    if (!auth) return
    if (!silent) {
      setLoadingThreads(true)
      setThreadsError(null)
    }
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/threads`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': auth.userId,
          'x-role': auth.role,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load threads')
      }
      const data = (await res.json()) as GroupThread[]
      setThreads(data)
      if (data.length && !selectedThreadId) {
        setSelectedThreadId(data[0].id)
      }
    } catch (err) {
      setThreadsError(err instanceof Error ? err.message : 'Failed to load threads')
    } finally {
      if (!silent) {
        setLoadingThreads(false)
      }
    }
  }

  async function fetchThreadMessages(threadId: string, silent = false) {
    if (!auth) return
    if (!silent) {
      setLoadingMessages(true)
      setMessageError(null)
    }
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/threads/${threadId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': auth.userId,
          'x-role': auth.role,
        },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load thread')
      }
      const data = (await res.json()) as ThreadWithMessages
      setThreads(prev => {
        const existing = prev.filter(t => t.id !== data.thread.id)
        return [data.thread, ...existing].sort((a, b) => {
          const aTime = a.lastMessageAt || a.updatedAt
          const bTime = b.lastMessageAt || b.updatedAt
          return bTime.localeCompare(aTime)
        })
      })
      setMessagesState(prev => ({ ...prev, [threadId]: data.messages }))
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Failed to load thread messages')
    } finally {
      if (!silent) {
        setLoadingMessages(false)
      }
    }
  }

  async function handleCreateThread(event: React.FormEvent) {
    event.preventDefault()
    if (!auth) return
    if (!newThreadTitle.trim()) {
      setThreadsError('Thread title is required')
      return
    }
    setCreatingThread(true)
    setThreadsError(null)
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': auth.userId,
          'x-role': auth.role,
        },
        body: JSON.stringify({
          title: newThreadTitle.trim(),
          relatedSubmissionId: newThreadSubmissionId || undefined,
          initialMessage: initialMessage.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create thread')
      }
      const data = (await res.json()) as ThreadWithMessages
      setThreads(prev => [data.thread, ...prev.filter(t => t.id !== data.thread.id)])
      if (data.messages.length) {
        setMessagesState(prev => ({ ...prev, [data.thread.id]: data.messages }))
      } else {
        setMessagesState(prev => ({ ...prev, [data.thread.id]: [] }))
      }
      setSelectedThreadId(data.thread.id)
      setShowNewThreadForm(false)
      setNewThreadTitle('')
      setNewThreadSubmissionId('')
      setInitialMessage('')
    } catch (err) {
      setThreadsError(err instanceof Error ? err.message : 'Failed to create thread')
    } finally {
      setCreatingThread(false)
    }
  }

  async function handlePostMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!auth || !selectedThread) return
    if (!newMessageDraft.trim()) {
      setMessageError('Message cannot be empty')
      return
    }
    setPostingMessage(true)
    setMessageError(null)
    try {
      const res = await fetch(`${API}/api/groups/${group.id}/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': auth.userId,
          'x-role': auth.role,
        },
        body: JSON.stringify({ body: newMessageDraft.trim() }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to post message')
      }
      const data = (await res.json()) as { message: GroupMessage; thread: GroupThread }
      setMessagesState(prev => {
        const existing = prev[selectedThread.id] || []
        return { ...prev, [selectedThread.id]: [...existing, data.message] }
      })
      setThreads(prev => {
        const others = prev.filter(t => t.id !== data.thread.id)
        return [data.thread, ...others]
      })
      setNewMessageDraft('')
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Failed to post message')
    } finally {
      setPostingMessage(false)
    }
  }

  function getSubmissionTitle(submissionId: string | null) {
    if (!submissionId) return null
    const submission = submissions.find(sub => sub.id === submissionId)
    return submission?.title || null
  }

  const renderThreadMeta = (thread: GroupThread) => {
    const submissionTitle = getSubmissionTitle(thread.relatedSubmissionId)
    const lastMessage = thread.lastMessage
    const lastActivity = new Date(thread.lastMessageAt || thread.updatedAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const preview = lastMessage
      ? `${lastMessage.authorId === auth?.userId ? 'You' : lastMessage.authorId}: ${lastMessage.body}`
      : submissionTitle
        ? `Linked to ${submissionTitle}`
        : 'No messages yet'
    return (
      <>
        <div className="thread-item-top">
          <span className="thread-item-title">{thread.title}</span>
          <span className="thread-item-time">{lastActivity}</span>
        </div>
        <div className="thread-item-bottom">
          <span className="thread-item-preview">
            {preview.length > 70 ? `${preview.slice(0, 67)}…` : preview}
          </span>
          <span className="thread-item-count">{thread.messageCount}</span>
        </div>
        {submissionTitle && (
          <span className="thread-item-tag">
            {submissionTitle}
          </span>
        )}
      </>
    )
  }

  const currentMessages = selectedThreadId ? messagesState[selectedThreadId] || [] : []

  return (
    <div className="conversation-pane">
      <header className="conversation-header">
        <div className="conversation-title">
          <div className="conversation-avatar">{group.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <h2>{title || group.name}</h2>
            <p>
              {group.members.length} member{group.members.length === 1 ? '' : 's'} · {threads.length} thread{threads.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="conversation-actions">
          <button type="button" onClick={() => setShowNewThreadForm(prev => !prev)}>
            {showNewThreadForm ? 'Close' : 'New thread'}
          </button>
        </div>
      </header>

      {showNewThreadForm && (
        <form className="thread-form" onSubmit={handleCreateThread}>
          <div className="thread-form-grid">
            <label>
              Title *
              <input
                value={newThreadTitle}
                onChange={e => setNewThreadTitle(e.target.value)}
                placeholder="e.g. Sprint planning"
              />
            </label>
            <label>
              Linked submission
              <select
                value={newThreadSubmissionId}
                onChange={e => setNewThreadSubmissionId(e.target.value)}
              >
                <option value="">None</option>
                {groupSubmissions.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Opening message
            <textarea
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              rows={3}
              placeholder="Add context and next steps for the group."
            />
          </label>
          <div className="thread-form-actions">
            <button type="submit" className="primary" disabled={creatingThread}>
              {creatingThread ? 'Creating…' : 'Create thread'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewThreadForm(false)
                setNewThreadTitle('')
                setNewThreadSubmissionId('')
                setInitialMessage('')
              }}
              disabled={creatingThread}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {threadsError && <div className="discussion-error">{threadsError}</div>}

      <section className="thread-strip">
        <div className="thread-strip-head">
          <div className="thread-strip-title">
            <span>Threads</span>
            <span className="badge">{threads.length}</span>
          </div>
          <input
            type="search"
            placeholder="Search threads"
            value={threadSearch}
            onChange={e => setThreadSearch(e.target.value)}
          />
        </div>
        {loadingThreads && !threads.length ? (
          <div className="thread-empty">Loading threads…</div>
        ) : filteredThreads.length === 0 ? (
          <div className="thread-empty">
            {threadSearch ? 'No threads match your search.' : 'No threads yet. Start the first one!'}
          </div>
        ) : (
          <div className="thread-carousel">
            {filteredThreads.map(thread => (
              <button
                key={thread.id}
                type="button"
                className={`thread-card ${thread.id === selectedThreadId ? 'active' : ''}`}
                onClick={() => setSelectedThreadId(thread.id)}
              >
                {renderThreadMeta(thread)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="chat-section">
        {selectedThread ? (
          <>
            <header className="chat-thread-header">
              <div>
                <h3>{selectedThread.title}</h3>
                <p>
                  Started {new Date(selectedThread.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  by {selectedThread.createdBy === auth?.userId ? 'you' : selectedThread.createdBy}
                </p>
              </div>
              {selectedThread.relatedSubmissionId && (
                <span className="linked-pill">
                  Linked: {getSubmissionTitle(selectedThread.relatedSubmissionId) || selectedThread.relatedSubmissionId}
                </span>
              )}
            </header>

            <div className="chat-log">
              {loadingMessages && !currentMessages.length ? (
                <div className="chat-empty">Loading messages…</div>
              ) : currentMessages.length === 0 ? (
                <div className="chat-empty">
                  No messages yet. Be the first to contribute.
                </div>
              ) : (
                currentMessages.map(message => {
                  const authorInfo = userDirectory[message.authorId] || {
                    name: message.authorId,
                    initials: initialsFor(message.authorId),
                  }
                  const authorName = authorInfo.name || message.authorId
                  return (
                    <div
                      key={message.id}
                      className={`chat-bubble ${message.authorId === auth?.userId ? 'mine' : ''}`}
                    >
                      <div className="chat-bubble-header">
                        <div className="chat-bubble-avatar">{authorInfo.initials}</div>
                        <div className="chat-bubble-meta">
                          <span className="chat-bubble-name">{authorName}</span>
                          <time>
                            {new Date(message.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                      </div>
                      <p>{message.body}</p>
                    </div>
                  )
                })
              )}
            </div>

            <form className="chat-composer" onSubmit={handlePostMessage}>
              <textarea
                value={newMessageDraft}
                onChange={e => setNewMessageDraft(e.target.value)}
                placeholder="Write a message to the group…"
                rows={2}
              />
              {messageError && <div className="discussion-error">{messageError}</div>}
              <button type="submit" disabled={postingMessage}>
                {postingMessage ? 'Sending…' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty large">Select a thread above to view conversation history.</div>
        )}
      </section>
    </div>
  )
}


