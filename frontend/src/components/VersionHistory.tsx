import React, { useEffect, useState } from 'react'
import { getAuth } from '../pages/Login'

type SubmissionVersion = {
  version: number
  contentRef: string
  notes?: string
  createdAt: string
  createdBy: string
  changes?: string
}

type VersionHistoryProps = {
  submissionId: string
  currentVersion: number
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

export default function VersionHistory({ submissionId, currentVersion }: VersionHistoryProps) {
  const [versions, setVersions] = useState<SubmissionVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (expanded && submissionId) {
      fetchVersions()
    }
  }, [expanded, submissionId])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const headers = getHeaders()
      const res = await fetch(`${API}/api/submissions/${submissionId}/versions`, { headers })
      if (!res.ok) throw new Error('Failed to fetch versions')
      const data = await res.json()
      setVersions(data.versions || [])
    } catch (err) {
      console.error('Failed to fetch versions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!expanded) {
    return (
      <button
        className="btn-view-versions"
        onClick={() => setExpanded(true)}
      >
        📚 View Version History ({currentVersion} version{currentVersion !== 1 ? 's' : ''})
      </button>
    )
  }

  return (
    <div className="version-history">
      <div className="version-history-header">
        <h4 className="version-history-title">📚 Version History</h4>
        <button
          className="btn-close-versions"
          onClick={() => setExpanded(false)}
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="version-history-loading">Loading versions...</div>
      ) : versions.length === 0 ? (
        <div className="version-history-empty">No version history available</div>
      ) : (
        <div className="version-history-list">
          {versions
            .sort((a, b) => b.version - a.version)
            .map(version => (
              <div
                key={version.version}
                className={`version-item ${version.version === currentVersion ? 'current' : ''}`}
              >
                <div className="version-header">
                  <div className="version-number">
                    <span className="version-badge">v{version.version}</span>
                    {version.version === currentVersion && (
                      <span className="version-current-label">Current</span>
                    )}
                  </div>
                  <div className="version-date">
                    {new Date(version.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {version.changes && (
                  <div className="version-changes">
                    <strong>Changes:</strong> {version.changes}
                  </div>
                )}
                <div className="version-actions">
                  <a
                    href={version.contentRef.startsWith('http') ? version.contentRef : `${API}${version.contentRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-download-version"
                  >
                    📥 Download
                  </a>
                  {version.notes && (
                    <div className="version-notes">
                      <strong>Notes:</strong> {version.notes}
                    </div>
                  )}
                </div>
                <div className="version-author">
                  Created by: {version.createdBy}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

