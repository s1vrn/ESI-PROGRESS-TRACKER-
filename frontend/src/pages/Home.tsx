import React from 'react'
import { Link } from 'react-router-dom'
import { getAuth } from './Login'
import ESILogo from '../components/ESILogo'

export default function Home() {
  const auth = getAuth()

  return (
    <div className="home-page">
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
            <span className="hero-pill">Academic Excellence • Powered by ESI</span>
            <h1>Organize, evaluate and celebrate every academic milestone.</h1>
            <p>
              From first draft to final defense, ESI Progress Tracker connects students and professors in a single, elegant workspace.
              Upload deliverables, collect feedback, track milestones and surface insights without leaving the platform.
            </p>
            <div className="hero-buttons">
              {auth ? (
                <Link to={auth.role === 'student' ? '/student' : '/professor'} className="btn btn-primary-large">
                  Open my dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login?mode=register" className="btn btn-primary-large">Sign up with ESI email</Link>
                  <Link to="/login?mode=login" className="btn btn-secondary-large">I already have an account</Link>
                </>
              )}
            </div>
            <div className="hero-metrics">
              <div className="metric-card">
                <span className="metric-value">+120</span>
                <span className="metric-label">Projects tracked this semester</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">94%</span>
                <span className="metric-label">Submissions reviewed on time</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">Real-time</span>
                <span className="metric-label">Notifications & analytics</span>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-illustration">
              <div className="hero-glass-card">
                <h4>Next Milestone</h4>
                <p>Submit Sprint Review</p>
                <div className="hero-progress">
                  <div className="hero-progress-bar"><span style={{ width: '72%' }} /></div>
                  <span>72% complete</span>
                </div>
                <div className="hero-mini-list">
                  <div className="mini-item">
                    <div className="mini-icon">✅</div>
                    <div>
                      <p>Professor feedback loop</p>
                      <small>Average turnaround 12h</small>
                    </div>
                  </div>
                  <div className="mini-item">
                    <div className="mini-icon">📎</div>
                    <div>
                      <p>Attach files & versions</p>
                      <small>PDF, ZIP, links supported</small>
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
            <div className="highlight-icon">🔐</div>
            <h3>Verified campus access</h3>
            <p>Only @esi.ac.ma accounts gain entry. Email verification keeps the workspace secure and professor assignments accurate.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon">🧭</div>
            <h3>Guided academic journey</h3>
            <p>Plan milestones, collect professor feedback, version files and keep every deliverable traceable in one timeline.</p>
          </div>
          <div className="highlight-card">
            <div className="highlight-icon">📈</div>
            <h3>Insights at a glance</h3>
            <p>Dashboards summarize progress for the whole class or a single student with trends, distribution charts and performance metrics.</p>
          </div>
        </section>

        <section className="home-split">
          <div className="split-card">
            <h2>The student experience</h2>
            <ul>
              <li>Drag & drop documents, reports and code references.</li>
              <li>Keep personal notes, milestones and version history.</li>
              <li>Follow professor feedback threads with instant notifications.</li>
            </ul>
          </div>
          <div className="split-card">
            <h2>The professor cockpit</h2>
            <ul>
              <li>Compact submission cards with drill-down reviews.</li>
              <li>Approve, request resubmission or grade with one click.</li>
              <li>Peek at student profiles, team compositions and analytics.</li>
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
              <p>Set objectives, attach templates and organize teams before work begins.</p>
            </div>
            <div className="workflow-step">
              <span className="step-number">3</span>
              <h3>Collaborate in real time</h3>
              <p>Submit versions, comment, approve or request changes with transparent logs for every stakeholder.</p>
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
            <p>Submission trends, performance distribution and template engagement help mentors focus where it counts.</p>
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
                <p>of submissions use milestone planning</p>
              </div>
              <div className="stat-item">
                <span>42 teams</span>
                <p>collaborating with shared repositories</p>
              </div>
              <div className="stat-item">
                <span>15 templates</span>
                <p>curated by professors for recurring projects</p>
              </div>
            </div>
            <div className="insight-preview">
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
              <p>Every element on this page mirrors the refined dashboards—ensuring continuity once you sign in.</p>
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
    </div>
  )
}


