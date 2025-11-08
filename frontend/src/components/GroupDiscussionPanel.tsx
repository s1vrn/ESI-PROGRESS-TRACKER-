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

type GroupDiscussionPanelProps = {
  group: Group
  open: boolean
  submissions?: SubmissionSummary[]
  title?: string
}

export default function GroupDiscussionPanel({ group, open, submissions = [], title }: GroupDiscussionPanelProps) {
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

  const groupSubmissions = useMemo(() => {
    return submissions.filter(sub => sub.groupId === group.id)
  }, [submissions, group.id])

  const selectedThread = useMemo(() => {
    return threads.find(thread => thread.id === selectedThreadId) || null
  }, [threads, selectedThreadId])

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
    return (
      <>
        {submissionTitle && (
          <span className="discussion-thread-tag">
            📄 {submissionTitle}
          </span>
        )}
        <span className="discussion-thread-count">
          💬 {thread.messageCount}
        </span>
        <span className="discussion-thread-updated">
          {new Date(thread.lastMessageAt || thread.updatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {lastMessage && (
          <span className="discussion-thread-preview">
            <strong>{lastMessage.authorId === auth?.userId ? 'You' : lastMessage.authorId}:</strong>{' '}
            {lastMessage.body.slice(0, 60)}
            {lastMessage.body.length > 60 ? '…' : ''}
          </span>
        )}
      </>
    )
  }

  const currentMessages = selectedThreadId ? messagesState[selectedThreadId] || [] : []

  return (
    <div className="group-discussion-panel">
      <div className="discussion-header">
        <div>
          <h3>{title || 'Discussion Threads'}</h3>
          <p>Collaborate with your group and keep conversations tied to deliverables.</p>
        </div>
        <button
          type="button"
          className="btn-discussion"
          onClick={() => setShowNewThreadForm(prev => !prev)}
        >
          {showNewThreadForm ? 'Cancel' : '➕ New Thread'}
        </button>
      </div>

      {showNewThreadForm && (
        <form className="discussion-new-thread" onSubmit={handleCreateThread}>
          <div className="discussion-field">
            <label>Thread title *</label>
            <input
              value={newThreadTitle}
              onChange={e => setNewThreadTitle(e.target.value)}
              placeholder="e.g. Sprint 3 deliverables review"
            />
          </div>
          <div className="discussion-field">
            <label>Link to submission (optional)</label>
            <select
              value={newThreadSubmissionId}
              onChange={e => setNewThreadSubmissionId(e.target.value)}
            >
              <option value="">-- General discussion --</option>
              {groupSubmissions.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.title}
                </option>
              ))}
            </select>
          </div>
          <div className="discussion-field">
            <label>Initial message</label>
            <textarea
              value={initialMessage}
              onChange={e => setInitialMessage(e.target.value)}
              rows={3}
              placeholder="Provide context and next steps for this thread."
            />
          </div>
          <div className="discussion-actions">
            <button type="submit" className="btn btn-primary" disabled={creatingThread}>
              {creatingThread ? 'Creating...' : 'Create thread'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
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

      <div className="discussion-content">
        <aside className="discussion-sidebar">
          {loadingThreads && !threads.length ? (
            <div className="discussion-placeholder">Loading threads…</div>
          ) : threads.length === 0 ? (
            <div className="discussion-placeholder">
              No threads yet. Start the first conversation for this group.
            </div>
          ) : (
            <ul className="discussion-thread-list">
              {threads.map(thread => (
                <li key={thread.id}>
                  <button
                    type="button"
                    className={`discussion-thread-item ${thread.id === selectedThreadId ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedThreadId(thread.id)
                    }}
                  >
                    <span className="discussion-thread-title">{thread.title}</span>
                    {renderThreadMeta(thread)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="discussion-main">
          {selectedThread ? (
            <>
              <header className="discussion-thread-header">
                <div>
                  <h4>{selectedThread.title}</h4>
                  {selectedThread.relatedSubmissionId && (
                    <span className="discussion-thread-linked">
                      Linked submission: {getSubmissionTitle(selectedThread.relatedSubmissionId) || selectedThread.relatedSubmissionId}
                    </span>
                  )}
                </div>
                <span className="discussion-thread-meta">
                  Started {new Date(selectedThread.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  by {selectedThread.createdBy === auth?.userId ? 'you' : selectedThread.createdBy}
                </span>
              </header>

              <div className="discussion-messages">
                {loadingMessages && !currentMessages.length ? (
                  <div className="discussion-placeholder">Loading messages…</div>
                ) : currentMessages.length === 0 ? (
                  <div className="discussion-placeholder">
                    No messages yet. Be the first to contribute.
                  </div>
                ) : (
                  currentMessages.map(message => (
                    <article
                      key={message.id}
                      className={`discussion-message ${message.authorId === auth?.userId ? 'is-own' : ''}`}
                    >
                      <header>
                        <span className="discussion-message-author">
                          {message.authorId === auth?.userId ? 'You' : message.authorId}
                        </span>
                        <span className="discussion-message-time">
                          {new Date(message.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </header>
                      <p>{message.body}</p>
                    </article>
                  ))
                )}
              </div>

              <form className="discussion-reply" onSubmit={handlePostMessage}>
                <textarea
                  value={newMessageDraft}
                  onChange={e => setNewMessageDraft(e.target.value)}
                  placeholder="Write a message to the group..."
                  rows={3}
                />
                {messageError && <div className="discussion-error">{messageError}</div>}
                <div className="discussion-actions">
                  <button type="submit" className="btn btn-primary" disabled={postingMessage}>
                    {postingMessage ? 'Sending…' : 'Send message'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="discussion-placeholder">
              Select a thread to view conversation history.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


