import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuth } from './Login'
import ESILogo from '../components/ESILogo'
import Footer from '../components/Footer'

export default function Home() {
  const auth = getAuth()
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('esi-home-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  useEffect(() => {
    localStorage.setItem('esi-home-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return (
    <div className={`home-page${darkMode ? ' dark' : ''}`}>
      <nav className="home-navbar">
        <div className="home-navbar-inner">
          <div className="home-brand">
            <ESILogo width={140} height={40} variant="horizontal" />
            <span className="home-brand-title">ESI Progress Tracker</span>
          </div>
          <div className="home-links">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#insights">Analytics</a>
            <a href="#cta">Join us</a>
          </div>
          <div className="home-actions">
            <button
              type="button"
              className="home-theme-toggle"
              onClick={() => setDarkMode(prev => !prev)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀ Light' : '🌙 Dark'}
            </button>
            {auth ? (
              <>
                <Link to={auth.role === 'student' ? '/student' : '/professor'} className="btn-nav subtle">
                  Dashboard
                </Link>
                <Link to="/profile" className="btn-nav ghost">Profile</Link>
                <button
                  className="btn-nav danger"
                  onClick={() => {
                    localStorage.removeItem('auth')
                    window.location.href = '/login'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login?mode=login" className="btn-nav ghost">Log In</Link>
                <Link to="/login?mode=register" className="btn-nav">Create Account</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="home-main">
        <section className="home-hero">
          <div className="hero-left">
            <span className="hero-pill">All-in-one academic workspace • Made for ESI</span>
            <h1>Plan milestones, spark discussions and deliver with clarity.</h1>
            <p>
              ESI Progress Tracker blends dashboards, group conversations, analytics and assignment templates into a single, elegant workflow for students and professors.
            </p>
            <div className="hero-buttons">
              {auth ? (
                <Link to={auth.role === 'student' ? '/student' : '/professor'} className="btn btn-primary-large">
                  Open my dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login?mode=register" className="btn btn-primary-large">Create an account</Link>
                  <Link to="/login?mode=login" className="btn btn-secondary-large">Preview the workspace</Link>
                </>
              )}
            </div>
            <div className="hero-metrics">
              <div className="metric-card">
                <span className="metric-value">+45k</span>
                <span className="metric-label">Messages synced across cohorts</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">98%</span>
                <span className="metric-label">Submissions reviewed on schedule</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">Live</span>
                <span className="metric-label">Announcements, analytics & templates</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-illustration">
              <div className="hero-glass-card">
                <h4>Upcoming milestone</h4>
                <p>Group sprint review</p>
                <div className="hero-progress">
                  <div className="hero-progress-bar"><span style={{ width: '72%' }} /></div>
                  <span>72% complete</span>
                </div>
                <div className="hero-mini-list">
                  <div className="mini-item">
                    <div className="mini-icon">✅</div>
                    <div>
                      <p>Professor feedback</p>
                      <small>Turnaround in under 12 hours</small>
                    </div>
                  </div>
                  <div className="mini-item">
                    <div className="mini-icon">💬</div>
                    <div>
                      <p>Group discussions</p>
                      <small>Auto-sync threads & alerts</small>
                    </div>
                  </div>
                </div>
                <div className="hero-tag">Designed for ESI</div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-highlight" id="features">
          <div className="highlight-card">
            <div className="highlight-icon">🌐</div>
            <h3>Unified workspace</h3>
            <p>Dashboards, analytics, templates and inboxes all share the same design language—no context switching required.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon">💬</div>
            <h3>Real-time collaboration</h3>
            <p>Discussion threads auto-scroll on fresh messages, support avatars, and keep announcements checked off.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon">🔐</div>
            <h3>ESI-secured login</h3>
            <p>Our redesigned two-panel sign-in flow verifies institutional emails and guides new users with clarity.</p>
          </div>
        </section>

        <section className="home-split">
          <div className="split-card">
            <h2>The student experience</h2>
            <ul>
              <li>Drag & drop documents, reports and code references.</li>
              <li>Keep personal notes, milestones, version history and discussion archives.</li>
              <li>Follow professor feedback and announcements with instant notifications.</li>
            </ul>
          </div>
          <div className="split-card">
            <h2>The professor cockpit</h2>
            <ul>
              <li>Compact submission cards with drill-down reviews & per-thread forms.</li>
              <li>Approve, request resubmission or grade with a streamlined form.</li>
              <li>Peek at student profiles, team compositions, analytics and templates.</li>
            </ul>
          </div>
        </section>

        <section className="home-workflow" id="workflow">
          <div className="workflow-header">
            <h2>From idea to evaluation in four simple steps.</h2>
            <p>Every interaction mirrors the dashboards you already use daily, creating a seamless bridge between the public home and private experience.</p>
          </div>
          <div className="workflow-grid">
            <div className="workflow-step">
              <span className="step-number">1</span>
              <h3>Register with ESI identity</h3>
              <p>Students and professors activate accounts through institutional emails and verification codes.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">2</span>
              <h3>Plan deliverables & milestones</h3>
              <p>Set objectives, attach assignment templates, invite teammates and get aligned faster.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">3</span>
              <h3>Collaborate in real time</h3>
              <p>Submit versions, discuss feedback, post announcements and approve or request changes with transparent logs.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">4</span>
              <h3>Track impact with analytics</h3>
              <p>Performance dashboards surface trends, grades and workload so each term starts smarter than the last.</p>
            </div>
          </div>
        </section>

        <section className="home-insights" id="insights">
          <div className="insights-card">
            <h2>Advanced analytics keep cohorts aligned.</h2>
            <p>Submission trends, performance distribution and template engagement keep mentors focused where it counts.</p>
            <div className="insight-tags">
              <span>Real-time charts</span>
              <span>Team submissions</span>
              <span>Version history</span>
              <span>Notification center</span>
            </div>
          </div>
          <div className="insights-grid">
            <div className="insight-stats">
              <h4>Across the platform</h4>
              <div className="stat-item">
                <span>68%</span>
                <p>of submissions follow milestone planning</p>
              </div>
              <div className="stat-item">
                <span>42 teams</span>
                <p>collaborating with shared discussions & repos</p>
              </div>
              <div className="stat-item">
                <span>15 templates</span>
                <p>curated by professors for recurring projects</p>
              </div>
            </div>
            <div className="insight-preview">
              <div className="preview-subhead">
                <p>Last week, professor feedback loops cut turnaround time by 28% while template adoption grew steadily.</p>
              </div>
              <div className="preview-header">
                <span className="dot dot-green" />
                <span className="dot dot-amber" />
                <span className="dot dot-rose" />
                <span>Analytics Snapshot</span>
              </div>
              <div className="preview-body">
                <div className="preview-chart">
                  <div className="preview-bar" style={{ height: '80%' }} />
                  <div className="preview-bar" style={{ height: '56%' }} />
                  <div className="preview-bar" style={{ height: '68%' }} />
                  <div className="preview-bar" style={{ height: '42%' }} />
                  <div className="preview-bar" style={{ height: '92%' }} />
                </div>
                <ul className="preview-legend">
                  <li><span className="legend-dot teal" /> Approved</li>
                  <li><span className="legend-dot rose" /> Resubmit</li>
                  <li><span className="legend-dot amber" /> Pending</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="home-testimonial">
          <div className="testimonial-quote">
            <p>
              “Since adopting ESI Progress Tracker, our faculty reduced feedback loops dramatically.
              Students understand expectations earlier, and our analytics keep every cohort improving.”
            </p>
            <div className="testimonial-meta">
              <span>Dr. Laila Aït Taleb</span>
              <small>Professor & Project Mentor – ESI</small>
            </div>
          </div>
          <div className="testimonial-cards">
            <div className="testimonial-card">
              <h4>Built for the dashboard era</h4>
              <p>Every element on this page mirrors the refined dashboards, threads and analytics once you sign in.</p>
            </div>
            <div className="testimonial-card">
              <h4>Dark mode ready</h4>
              <p>Toggle themes anytime; the design adapts to late-night submissions and review sessions.</p>
            </div>
          </div>
        </section>

        <section className="home-cta" id="cta">
          <div className="cta-content">
            <h2>Bring clarity to your academic workflow.</h2>
            <p>Sign in with your institutional account and experience the same polished dashboards showcased across the platform.</p>
          </div>
          <div className="cta-actions">
            {auth ? (
              <Link to={auth.role === 'student' ? '/student' : '/professor'} className="btn btn-primary-large">
                Continue to dashboard
              </Link>
            ) : (
              <>
                <Link to="/login?mode=register" className="btn btn-primary-large">Join ESI Progress Tracker</Link>
                <Link to="/login?mode=login" className="btn btn-secondary-large">Log in</Link>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}


