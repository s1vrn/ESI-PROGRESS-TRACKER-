import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

type AuthInfo = {
  userId: string
  role: 'student' | 'professor'
}

export function saveAuth(auth: AuthInfo) {
  localStorage.setItem('auth', JSON.stringify(auth))
}

export function getAuth(): AuthInfo | null {
  const stored = localStorage.getItem('auth')
  return stored ? JSON.parse(stored) : null
}

export function clearAuth() {
  localStorage.removeItem('auth')
}

const API = 'http://localhost:4000'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState<'student' | 'professor'>('student')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [branch, setBranch] = useState('')
  const [year, setYear] = useState<'freshman' | 'second year' | 'third year' | ''>('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'register') {
      setIsRegistering(true)
    } else if (mode === 'login') {
      setIsRegistering(false)
    }
  }, [searchParams])

  function isValidESIEmail(email: string): boolean {
    return /^[a-zA-Z0-9._-]+@esi\.ac\.ma$/.test(email)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!userId.trim() || !password.trim()) {
      setError('Please enter user ID and password')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId.trim(), password })
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresVerification) {
          // Redirect to verification page
          navigate(`/verify?email=${encodeURIComponent(data.email)}`)
          return
        }
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }
      saveAuth({ userId: data.userId, role: data.role })
      navigate(data.role === 'student' ? '/student' : '/professor')
    } catch (err) {
      setError('Network error. Make sure the backend is running.')
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!userId.trim() || !password.trim() || !email.trim()) {
      setError('Please fill all fields')
      return
    }
    if (!isValidESIEmail(email.trim())) {
      setError('Email must be an ESI institutional email (@esi.ac.ma)')
      return
    }
    // Validate student-specific fields
    if (role === 'student') {
      if (!branch.trim() || !year) {
        setError('Branch and year are required for students')
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userId.trim(), 
          password, 
          role, 
          email: email.trim(),
          branch: role === 'student' ? branch.trim() : undefined,
          year: role === 'student' ? year : undefined
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }
      // Redirect to verification page with code
      navigate(`/verify?email=${encodeURIComponent(data.email)}${data.verificationCode ? `&code=${data.verificationCode}` : ''}`)
    } catch (err) {
      setError('Network error. Make sure the backend is running.')
      setLoading(false)
    }
  }

  return (
    <div className="login-hero">
      <div className="card login-card">
        <div className="card-body">
          <h2 style={{ textAlign: 'center', marginBottom: 6 }}>ESI Progress Tracker</h2>
          <p className="muted" style={{ textAlign: 'center', marginBottom: 24 }}>
            {isRegistering ? 'Create an account' : 'Sign in to continue'}
          </p>

          {error && (
            <div style={{ padding: 12, background: '#fee', color: '#c33', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="grid">
            <div className="field">
              <label>I am a</label>
              <div className="row">
                <button type="button" className="btn btn-ghost" onClick={() => setRole('student')} style={{ borderColor: role === 'student' ? 'var(--primary)' : 'var(--border)', color: role === 'student' ? 'var(--primary)' : 'var(--muted)', flex: 1 }}>Student</button>
                <button type="button" className="btn btn-ghost" onClick={() => setRole('professor')} style={{ borderColor: role === 'professor' ? 'var(--primary)' : 'var(--border)', color: role === 'professor' ? 'var(--primary)' : 'var(--muted)', flex: 1 }}>Professor</button>
              </div>
            </div>

            <div className="field">
              <label>User ID</label>
              <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={role === 'student' ? 'e.g., student_alex' : 'e.g., prof_samira'} autoFocus disabled={loading} />
            </div>

            {isRegistering && (
              <div className="field">
                <label>ESI Institutional Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="your.name@esi.ac.ma" 
                  disabled={loading}
                />
                <small>Must be an @esi.ac.ma email address</small>
              </div>
            )}

            {isRegistering && role === 'student' && (
              <>
                <div className="field">
                  <label>Branch *</label>
                  <input 
                    type="text" 
                    value={branch} 
                    onChange={(e) => setBranch(e.target.value)} 
                    placeholder="e.g., Computer Science, Software Engineering" 
                    disabled={loading}
                  />
                  <small>Your field of study or major</small>
                </div>
                <div className="field">
                  <label>Year *</label>
                  <select 
                    value={year} 
                    onChange={(e) => setYear(e.target.value as 'freshman' | 'second year' | 'third year')} 
                    disabled={loading}
                  >
                    <option value="">-- Select your year --</option>
                    <option value="freshman">Freshman</option>
                    <option value="second year">Second Year</option>
                    <option value="third year">Third Year</option>
                  </select>
                </div>
              </>
            )}

            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" disabled={loading} />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Sign In')}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setError('') }}
                className="btn btn-ghost"
                style={{ fontSize: 14, padding: '6px 12px' }}
                disabled={loading}
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

