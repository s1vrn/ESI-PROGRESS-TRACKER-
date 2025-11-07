import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getAuth } from './Login'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

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

type OverviewData = {
  total: number
  byStatus: Record<string, number>
  avgGrade: number | null
  gradeDistribution: number[]
  gradedCount: number
  ungradedCount: number
}

type TrendsData = {
  trends: Array<{ month: string; count: number }>
}

type PerformanceData = {
  avgGrade?: number | null
  bestGrade?: number | null
  worstGrade?: number | null
  totalSubmissions?: number
  approvedCount?: number
  pendingCount?: number
  resubmitCount?: number
  avgTimeToApproval?: number | null
  uniqueStudents?: number
  avgGradingTime?: number | null
  topStudents?: Array<{ studentId: string; name: string; avgGrade: number; submissionCount: number }>
}

type TypeDistribution = {
  distribution: Record<string, number>
}

const COLORS = {
  approved: '#10b981',
  submitted: '#6366f1',
  resubmit: '#f59e0b',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
}

const GRADE_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981']

export default function Analytics() {
  const navigate = useNavigate()
  const auth = getAuth()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [typeDistribution, setTypeDistribution] = useState<TypeDistribution | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      navigate('/login')
      return
    }

    const fetchData = async () => {
      try {
        const headers = getHeaders()
        const [overviewRes, trendsRes, performanceRes, typeRes] = await Promise.all([
          fetch(`${API}/api/analytics/overview`, { headers }),
          fetch(`${API}/api/analytics/submission-trends`, { headers }),
          fetch(`${API}/api/analytics/performance`, { headers }),
          fetch(`${API}/api/analytics/type-distribution`, { headers }),
        ])

        if (!overviewRes.ok) {
          throw new Error(`Overview API error: ${overviewRes.status}`)
        }
        if (!trendsRes.ok) {
          throw new Error(`Trends API error: ${trendsRes.status}`)
        }
        if (!performanceRes.ok) {
          throw new Error(`Performance API error: ${performanceRes.status}`)
        }
        if (!typeRes.ok) {
          throw new Error(`Type distribution API error: ${typeRes.status}`)
        }

        const [overviewData, trendsData, performanceData, typeData] = await Promise.all([
          overviewRes.json(),
          trendsRes.json(),
          performanceRes.json(),
          typeRes.json(),
        ])

        console.log('Analytics data loaded:', { overviewData, trendsData, performanceData, typeData })

        setOverview(overviewData)
        setTrends(trendsData)
        setPerformance(performanceData)
        setTypeDistribution(typeData)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
        // Set empty data to prevent crashes
        setOverview({ total: 0, byStatus: {}, avgGrade: null, gradeDistribution: [0, 0, 0, 0, 0], gradedCount: 0, ungradedCount: 0 })
        setTrends({ trends: [] })
        setPerformance({})
        setTypeDistribution({ distribution: {} })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [auth, navigate])

  if (!auth) return null

  if (loading) {
    return (
      <Layout role={auth.role}>
        <div className="analytics-container">
          <div className="analytics-loading">Loading analytics...</div>
        </div>
      </Layout>
    )
  }

  const statusData = overview && overview.byStatus
    ? Object.entries(overview.byStatus)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count,
          color: COLORS[status as keyof typeof COLORS] || COLORS.primary,
        }))
    : []

  const gradeDistributionData = overview && overview.gradeDistribution
    ? [
        { name: '0-20', value: overview.gradeDistribution[0] || 0 },
        { name: '21-40', value: overview.gradeDistribution[1] || 0 },
        { name: '41-60', value: overview.gradeDistribution[2] || 0 },
        { name: '61-80', value: overview.gradeDistribution[3] || 0 },
        { name: '81-100', value: overview.gradeDistribution[4] || 0 },
      ].filter(item => item.value > 0)
    : []

  const typeData = typeDistribution && typeDistribution.distribution
    ? Object.entries(typeDistribution.distribution)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          name: type.toUpperCase(),
          value: count,
        }))
    : []

  return (
    <Layout role={auth.role}>
      <div className="analytics-container">
        <div className="analytics-header">
          <h1 className="analytics-title">📊 Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            Comprehensive insights into your {auth.role === 'student' ? 'academic' : 'teaching'}{' '}
            performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="analytics-metrics-grid">
          <div className="analytics-metric-card">
            <div className="metric-icon">📋</div>
            <div className="metric-content">
              <div className="metric-value">{overview?.total || 0}</div>
              <div className="metric-label">Total Submissions</div>
            </div>
          </div>
          <div className="analytics-metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <div className="metric-value">{overview?.byStatus.approved || 0}</div>
              <div className="metric-label">Approved</div>
            </div>
          </div>
          <div className="analytics-metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <div className="metric-value">
                {overview?.avgGrade !== null && overview?.avgGrade !== undefined
                  ? overview.avgGrade.toFixed(1)
                  : 'N/A'}
              </div>
              <div className="metric-label">Average Grade</div>
            </div>
          </div>
          {auth.role === 'student' ? (
            <>
              {performance?.bestGrade !== null && performance?.bestGrade !== undefined && (
                <div className="analytics-metric-card">
                  <div className="metric-icon">⭐</div>
                  <div className="metric-content">
                    <div className="metric-value">{performance.bestGrade}</div>
                    <div className="metric-label">Best Grade</div>
                  </div>
                </div>
              )}
              {performance?.avgTimeToApproval !== null &&
                performance?.avgTimeToApproval !== undefined && (
                  <div className="analytics-metric-card">
                    <div className="metric-icon">⏱️</div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {performance.avgTimeToApproval.toFixed(1)} days
                      </div>
                      <div className="metric-label">Avg Approval Time</div>
                    </div>
                  </div>
                )}
            </>
          ) : (
            <>
              <div className="analytics-metric-card">
                <div className="metric-icon">👥</div>
                <div className="metric-content">
                  <div className="metric-value">{performance?.uniqueStudents || 0}</div>
                  <div className="metric-label">Students</div>
                </div>
              </div>
              {performance?.avgGradingTime !== null &&
                performance?.avgGradingTime !== undefined && (
                  <div className="analytics-metric-card">
                    <div className="metric-icon">⏱️</div>
                    <div className="metric-content">
                      <div className="metric-value">
                        {performance.avgGradingTime.toFixed(1)} days
                      </div>
                      <div className="metric-label">Avg Grading Time</div>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Charts Grid */}
        <div className="analytics-charts-grid">
          {/* Submission Trends */}
          <div className="analytics-chart-card">
            <h3 className="chart-title">📈 Submission Trends (Last 6 Months)</h3>
            {trends && trends.trends && trends.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    name="Submissions"
                    dot={{ fill: COLORS.primary, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No submission data available</div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="analytics-chart-card">
            <h3 className="chart-title">📊 Status Distribution</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No status data available</div>
            )}
          </div>

          {/* Grade Distribution */}
          <div className="analytics-chart-card">
            <h3 className="chart-title">🎯 Grade Distribution</h3>
            {overview && overview.gradedCount > 0 && gradeDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={gradeDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {gradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={GRADE_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No grade data available</div>
            )}
          </div>

          {/* Type Distribution */}
          <div className="analytics-chart-card">
            <h3 className="chart-title">📁 Submission Types</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">No type data available</div>
            )}
          </div>
        </div>

        {/* Performance Details */}
        {auth.role === 'professor' && performance?.topStudents && performance.topStudents.length > 0 && (
          <div className="analytics-chart-card">
            <h3 className="chart-title">🏆 Top Performing Students</h3>
            <div className="top-students-list">
              {performance.topStudents.map((student, index) => (
                <div key={student.studentId} className="top-student-item">
                  <div className="student-rank">#{index + 1}</div>
                  <div className="student-info">
                    <div className="student-name">{student.name}</div>
                    <div className="student-details">
                      {student.submissionCount} submission{student.submissionCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="student-grade">{student.avgGrade.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Stats */}
        <div className="analytics-stats-grid">
          {auth.role === 'student' && (
            <>
              <div className="stat-box">
                <div className="stat-label">Pending Review</div>
                <div className="stat-value">{performance?.pendingCount || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Needs Resubmission</div>
                <div className="stat-value">{performance?.resubmitCount || 0}</div>
              </div>
              {performance?.worstGrade !== null && performance?.worstGrade !== undefined && (
                <div className="stat-box">
                  <div className="stat-label">Lowest Grade</div>
                  <div className="stat-value">{performance.worstGrade}</div>
                </div>
              )}
            </>
          )}
          {auth.role === 'professor' && (
            <>
              <div className="stat-box">
                <div className="stat-label">Pending Review</div>
                <div className="stat-value">{performance?.pendingCount || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Approved</div>
                <div className="stat-value">{performance?.approvedCount || 0}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Needs Resubmission</div>
                <div className="stat-value">{performance?.resubmitCount || 0}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

