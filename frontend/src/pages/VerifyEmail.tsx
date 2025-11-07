import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getAuth } from './Login'

const API = 'http://localhost:4000'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const initialCode = searchParams.get('code') || ''
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!email) {
      navigate('/login')
      return
    }
    // Fetch verification code from backend (development mode)
    fetch(`${API}/api/auth/verification-code?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.verificationCode) {
          setDevCode(data.verificationCode)
        }
      })
      .catch(() => {})
  }, [email, navigate])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!code.trim() || code.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setLoading(false)
        return
      }
      setSuccess('Email verified successfully! Redirecting...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError('Network error. Make sure the backend is running.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResending(true)
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to resend code')
        setResending(false)
        return
      }
      setSuccess('Verification code resent! Check your email.')
      if (data.verificationCode) {
        setDevCode(data.verificationCode)
        setCode(data.verificationCode)
      }
      setResending(false)
    } catch (err) {
      setError('Network error. Make sure the backend is running.')
      setResending(false)
    }
  }

  return (
    <div className="login-hero">
      <div className="card login-card">
        <div className="card-body">
          <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Verify Your Email</h2>
          <p className="muted" style={{ textAlign: 'center', marginBottom: 24 }}>
            We sent a verification code to <strong>{email}</strong>
          </p>

          {error && (
            <div style={{ padding: 12, background: '#fee', color: '#c33', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: 12, background: '#efe', color: '#3c3', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {success}
            </div>
          )}

          <form onSubmit={handleVerify} className="grid">
            {devCode && (
              <div style={{ padding: 16, background: '#e0f2fe', border: '2px solid #0284c7', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#0369a1' }}>🔑 Development Mode - Your Verification Code:</div>
                <div style={{ fontSize: '32px', fontWeight: '700', letterSpacing: '4px', textAlign: 'center', color: '#0284c7', fontFamily: 'monospace' }}>
                  {devCode}
                </div>
                <div style={{ fontSize: 12, color: '#075985', marginTop: 8, textAlign: 'center' }}>
                  Copy this code or check the backend console
                </div>
              </div>
            )}

            <div className="field">
              <label>Verification Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(val)
                }}
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: '600' }}
                autoFocus
                disabled={loading || resending}
              />
              <small className="muted">Enter the 6-digit code sent to your email</small>
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading || resending || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={handleResend}
                className="btn btn-ghost"
                style={{ fontSize: 14, padding: '6px 12px' }}
                disabled={loading || resending}
              >
                {resending ? 'Sending...' : "Didn't receive code? Resend"}
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-ghost"
                style={{ fontSize: 14, padding: '6px 12px' }}
                disabled={loading || resending}
              >
                Back to Login
              </button>
            </div>
          </form>

          <div style={{ marginTop: 24, padding: 12, background: '#f0f4ff', borderRadius: 8, fontSize: 12, color: '#334155' }}>
            <strong>Note:</strong> In development mode, the verification code is displayed above and also logged in the backend console.
            <br />In production, you will receive the code via email at <strong>{email}</strong>.
          </div>
        </div>
      </div>
    </div>
  )
}

