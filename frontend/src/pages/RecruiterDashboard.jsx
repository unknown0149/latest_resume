import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  LineChart,
  Sparkles,
  Users,
  XCircle
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import RecruiterNav from '../components/ui/RecruiterNav'

const pipelineStages = [
  'applied',
  'screening',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'offer_accepted'
]

const stageLabels = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  offer_extended: 'Offer Extended',
  offer_accepted: 'Offer Accepted'
}

export default function RecruiterDashboard() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentApplications, setRecentApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/jobs/recruiter/overview')
      setStats(response.data.stats || {})
      setRecentApplications(response.data.recentApplications || [])
      setError('')
    } catch (err) {
      console.error('Failed to load recruiter overview:', err)
      setError(err.response?.data?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Failed to logout recruiter:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const pipelineBreakdown = useMemo(() => {
    const base = pipelineStages.reduce((acc, stage) => ({ ...acc, [stage]: 0 }), {})
    recentApplications.forEach((application) => {
      const stage = application.status || 'applied'
      if (base[stage] !== undefined) {
        base[stage] += 1
      }
    })
    const total = Object.values(base).reduce((sum, value) => sum + value, 0)
    return {
      total,
      stages: pipelineStages.map((stage) => ({
        key: stage,
        label: stageLabels[stage],
        count: base[stage],
        percent: total ? Math.round((base[stage] / total) * 100) : 0
      })),
      byStatus: base
    }
  }, [recentApplications])

  const applicationTrend = useMemo(() => {
    const daysBack = 7
    const counts = Array(daysBack)
      .fill(0)
      .map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (daysBack - 1 - index))
        return {
          key: date.toISOString().split('T')[0],
          label: date.toLocaleDateString(undefined, { weekday: 'short' }),
          count: 0
        }
      })

    recentApplications.forEach((application) => {
      if (!application.appliedAt) return
      const key = new Date(application.appliedAt).toISOString().split('T')[0]
      const match = counts.find((item) => item.key === key)
      if (match) {
        match.count += 1
      }
    })

    return counts
  }, [recentApplications])

  const getStatusIcon = (status = 'applied') => {
    switch (status) {
      case 'shortlisted':
      case 'offer_extended':
      case 'offer_accepted':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'interview_scheduled':
      case 'interview_completed':
        return <Calendar className="w-5 h-5 text-indigo-500" />
      case 'rejected':
      case 'withdrawn':
        return <XCircle className="w-5 h-5 text-rose-500" />
      default:
        return <Clock className="w-5 h-5 text-amber-500" />
    }
  }

  const getStatusColor = (status = 'applied') => {
    switch (status) {
      case 'shortlisted':
      case 'offer_extended':
      case 'offer_accepted':
        return 'bg-emerald-50 text-emerald-700'
      case 'interview_scheduled':
      case 'interview_completed':
        return 'bg-indigo-50 text-indigo-700'
      case 'rejected':
      case 'withdrawn':
        return 'bg-rose-50 text-rose-700'
      default:
        return 'bg-amber-50 text-amber-700'
    }
  }

  const formatStatusLabel = (status = 'applied') =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

  const safeStats = stats || {}
  const interviewsPerJob = safeStats.totalJobs
    ? (safeStats.interviewsScheduled || 0) / safeStats.totalJobs
    : 0
  const offerMomentum = pipelineBreakdown.total
    ? Math.round(
        ((pipelineBreakdown.byStatus.offer_extended + pipelineBreakdown.byStatus.offer_accepted) /
          pipelineBreakdown.total) *
          100
      )
    : 0

  const trendMax = useMemo(() => {
    if (!applicationTrend.length) return 1
    return Math.max(1, ...applicationTrend.map((item) => item.count))
  }, [applicationTrend])

  const insightCards = [
    {
      title: 'Active Mandates',
      value: safeStats.totalJobs || 0,
      change: `+${safeStats.newJobsThisMonth || 0} new roles`,
      icon: Briefcase,
      accent: 'from-sky-500/20 to-sky-500/0'
    },
    {
      title: 'Pipeline Volume',
      value: safeStats.totalApplications || 0,
      change: `${safeStats.newApplicationsToday || 0} landed today`,
      icon: Users,
      accent: 'from-emerald-500/20 to-emerald-500/0'
    },
    {
      title: 'Interviews / Role',
      value: interviewsPerJob ? interviewsPerJob.toFixed(1) : '0.0',
      change: `${safeStats.interviewsThisWeek || 0} this week`,
      icon: Calendar,
      accent: 'from-indigo-500/20 to-indigo-500/0'
    },
    {
      title: 'Offer Momentum',
      value: `${offerMomentum}%`,
      change: 'Based on recent applicants',
      icon: Activity,
      accent: 'from-amber-500/20 to-amber-500/0'
    }
  ]

  const upcomingActions = [
    {
      title: 'Confirm interview logistics',
      metric: `${safeStats.interviewsThisWeek || 0} interviews in 7 days`,
      icon: Calendar,
      action: () => navigate('/recruiter/applications')
    },
    {
      title: 'Review fresh applicants',
      metric: `${safeStats.newApplicationsToday || 0} submissions today`,
      icon: Users,
      action: () => navigate('/recruiter/applications')
    },
    {
      title: 'Launch a new search',
      metric: 'Keep requisitions warm',
      icon: Sparkles,
      action: () => navigate('/recruiter/post-job')
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-b-2 border-white/70 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <RecruiterNav />
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.4em] uppercase text-white/60">Enterprise hiring console</p>
              <div className="mt-3 flex items-center gap-3 text-white/80 text-sm">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1">
                  <Sparkles className="w-4 h-4" />
                  Live insights
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1">
                  <Layers className="w-4 h-4" />
                  Multi-role view
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold text-white tracking-tight">
                Recruiter Control Tower
              </h1>
              <p className="mt-3 text-base text-white/70 max-w-2xl">
                Track funnel velocity, unblock interviews, and keep offers moving. Everything you need for an
                enterprise-grade hiring ritual lives here.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/recruiter/applications')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
              >
                Pipeline
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/recruiter/jobs')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Jobs
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/recruiter/post-job')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-5 py-3 text-sm font-semibold shadow-lg"
              >
                Post role
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-60"
              >
                {isLoggingOut ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {insightCards.map(({ title, value, change, icon: Icon, accent }) => (
              <div key={title} className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
                <div className="relative">
                  <div className="flex items-center justify-between text-white/70 text-sm font-medium">
                    <span>{title}</span>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">{change}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">{error}</div>
        </div>
      )}

      <div className="relative z-10 -mt-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Pipeline pulse</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Stage distribution</h2>
                  </div>
                  <LineChart className="w-6 h-6 text-slate-400" />
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pipelineBreakdown.stages.map((stage) => (
                    <div key={stage.key} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>{stage.label}</span>
                        <span>{stage.count}</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500"
                          style={{ width: `${stage.percent}%` }}
                        ></div>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{stage.percent}% of current flow</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Application velocity</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Last 7 days</h2>
                  </div>
                  <BarChart3 className="w-6 h-6 text-slate-400" />
                </div>
                <div className="mt-8 flex items-end gap-3">
                  {applicationTrend.map((day) => {
                    const height = (day.count / trendMax) * 120
                    return (
                      <div key={day.key} className="flex flex-col items-center text-xs text-slate-400">
                        <div
                          className="flex flex-col items-center justify-end rounded-full bg-gradient-to-t from-slate-200 via-slate-100 to-white px-2"
                          style={{ height: 130 }}
                        >
                          <div
                            className="w-6 rounded-full bg-gradient-to-t from-sky-500 via-emerald-400 to-emerald-300"
                            style={{ height: Math.max(6, height) }}
                          ></div>
                        </div>
                        <span className="mt-2">{day.label}</span>
                        <span className="font-semibold text-slate-600">{day.count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Actions</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">What needs you now</h2>
                <div className="mt-4 space-y-4">
                  {upcomingActions.map(({ title, metric, icon: Icon, action }) => (
                    <button
                      key={title}
                      onClick={action}
                      className="group w-full rounded-2xl border border-slate-100 p-4 text-left transition hover:border-slate-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                          <Icon className="w-5 h-5" />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">{title}</p>
                          <p className="text-sm text-slate-500">{metric}</p>
                        </div>
                        <ArrowUpRight className="ml-auto text-slate-400 group-hover:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Team health</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Operational metrics</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex items-center justify-between">
                    <span>Avg. time to hire</span>
                    <span className="font-semibold text-slate-900">{safeStats.avgTimeToHire || 0} days</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Interviews scheduled</span>
                    <span className="font-semibold text-slate-900">{safeStats.interviewsScheduled || 0}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Interviews this week</span>
                    <span className="font-semibold text-slate-900">{safeStats.interviewsThisWeek || 0}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Total applications</span>
                    <span className="font-semibold text-slate-900">{safeStats.totalApplications || 0}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Recent activity</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Candidate movement</h2>
              </div>
              <button
                onClick={() => navigate('/recruiter/applications')}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                View full pipeline
              </button>
            </div>

            {recentApplications.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                No applications yet
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Candidate</th>
                      <th className="px-4 py-3 text-left font-semibold">Role</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Applied</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {recentApplications.map((application) => (
                      <tr key={application._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold">
                              {application.candidateName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{application.candidateName || 'Unknown'}</p>
                              <p className="text-xs text-slate-500">{application.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{application.jobTitle}</p>
                          <p className="text-xs text-slate-500">{application.department || '—'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                              application.status
                            )}`}
                          >
                            {getStatusIcon(application.status)}
                            <span>{formatStatusLabel(application.status || 'applied')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Review
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
