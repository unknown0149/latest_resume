import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Briefcase,
  MapPin,
  Clock,
  Eye,
  Edit,
  Trash2,
  Users,
  TrendingUp,
  Filter,
  Target,
  Sparkles,
  Globe,
  CalendarDays,
  ArrowUpRight
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import RecruiterNav from '../components/ui/RecruiterNav'

export default function RecruiterJobsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/jobs/recruiter')
      
      if (response.data.success) {
        setJobs(response.data.jobs || [])
      } else {
        setError(response.data.message || 'Failed to load jobs')
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
      const errorMessage = err.response?.data?.message || 'Failed to load jobs'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      await api.delete(`/jobs/${jobId}`)
      toast.success('Job deleted successfully')
      setJobs((prev) => prev.filter((job) => job.jobId !== jobId))
    } catch (err) {
      console.error('Failed to delete job:', err)
      toast.error('Failed to delete job')
    }
  }

  const toInr = (value, currency) => {
    if (!value) return 0
    if (currency && currency.toUpperCase() === 'USD') {
      return Math.round(value * 83)
    }
    return value
  }

  const formatSalary = (salary) => {
    if (!salary || (!salary.min && !salary.max)) return 'Not specified'
    const min = toInr(salary.min, salary.currency)
    const max = toInr(salary.max, salary.currency)
    const format = (val) => (val ? `₹${val.toLocaleString('en-IN')}` : null)
    if (min && max) return `${format(min)} - ${format(max)}`
    if (min) return `From ${format(min)}`
    if (max) return `Up to ${format(max)}`
    return 'Not specified'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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

  const getDaysOpen = (createdAt) => {
    if (!createdAt) return 0
    const posted = new Date(createdAt)
    const diff = Date.now() - posted.getTime()
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)))
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === 'all' ? true : job.status === statusFilter
      const search = searchTerm.trim().toLowerCase()
      const matchesSearch = !search
        ? true
        : job.title.toLowerCase().includes(search) || job.company?.name?.toLowerCase().includes(search)
      return matchesStatus && matchesSearch
    })
  }, [jobs, statusFilter, searchTerm])

  const jobInsights = useMemo(() => {
    if (!jobs.length) {
      return {
        active: 0,
        remote: 0,
        averageDays: 0,
        averageSkills: 0
      }
    }
    const active = jobs.filter((job) => job.status === 'active').length
    const remote = jobs.filter((job) => job.location?.isRemote).length
    const averageDays = Math.round(
      jobs.reduce((sum, job) => sum + getDaysOpen(job.createdAt), 0) / jobs.length
    )
    const averageSkills = Math.round(
      jobs.reduce((sum, job) => sum + (job.skills?.required?.length || 0), 0) / jobs.length
    )
    return { active, remote, averageDays, averageSkills }
  }, [jobs])

  const getJobHealth = (job) => {
    const applicants = job.applications || 0
    const target = job.targetApplicants || 20
    const fillRate = Math.min(100, Math.round((applicants / target) * 100))
    const daysOpen = getDaysOpen(job.createdAt)
    const attention = daysOpen > 45 ? 'Aging role' : daysOpen > 30 ? 'Monitor' : 'On track'
    return { applicants, target, fillRate, daysOpen, attention, views: job.views || 0 }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-b-2 border-white/80 animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <RecruiterNav />
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Talent supply line</p>
              <h1 className="mt-3 text-4xl font-semibold text-white tracking-tight">Job Portfolio</h1>
              <p className="mt-3 text-base text-white/70 max-w-2xl">
                Monitor every requisition, spot roles that need a push, and launch new searches in one clean view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/recruiter/post-job')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-6 py-3 text-sm font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Post role
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-60"
              >
                {isLoggingOut ? 'Signing out…' : 'Logout'}
              </button>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightPill
              icon={Briefcase}
              label="Active searches"
              value={jobInsights.active}
              caption={`${jobs.length} total requisitions`}
            />
            <InsightPill
              icon={Globe}
              label="Remote friendly"
              value={jobInsights.remote}
              caption="Roles open anywhere"
            />
            <InsightPill
              icon={CalendarDays}
              label="Avg. days open"
              value={jobInsights.averageDays || 0}
              caption="Across posted roles"
            />
            <InsightPill
              icon={Target}
              label="Skills per role"
              value={jobInsights.averageSkills || 0}
              caption="Required stack depth"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 -mt-10 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-rose-700">{error}</div>
          )}

          <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Control board</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">Filters & health</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {['all', 'active', 'draft', 'closed'].map((value) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold border transition ${
                      statusFilter === value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {value === 'all' ? 'All roles' : value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by title or company"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
                <Filter className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {filteredJobs.length} roles in view
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5">
                  <Users className="w-4 h-4 text-sky-500" />
                  {jobs.reduce((sum, job) => sum + (job.applications || 0), 0)} applicants total
                </span>
              </div>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-2xl shadow-slate-900/5 border border-slate-100">
              <Briefcase className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900">No jobs posted yet</h3>
              <p className="mt-2 text-slate-500">Launch your first role to unlock the recruiter console.</p>
              <button
                onClick={() => navigate('/recruiter/post-job')}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
              >
                <Plus className="w-4 h-4" />
                Post your first job
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-2xl shadow-slate-900/5 border border-slate-100">
              <Filter className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900">No roles match these filters</h3>
              <p className="mt-2 text-slate-500">Adjust filters or clear the search to see more jobs.</p>
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setSearchTerm('')
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredJobs.map((job) => {
                const health = getJobHealth(job)
                return (
                  <div key={job.jobId} className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col gap-2">
                          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                            {job.company?.name}
                            {job.location?.isRemote && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                Remote ready
                              </span>
                            )}
                          </div>
                          <h3 className="text-2xl font-semibold text-slate-900">{job.title}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                            {job.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location.isRemote
                                  ? 'Remote'
                                  : job.location.city
                                  ? `${job.location.city}, ${job.location.state || job.location.country}`
                                  : 'Location TBD'}
                              </span>
                            )}
                            {job.employmentType && (
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="w-4 h-4" />
                                {job.employmentType.replace('-', ' ')}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {health.daysOpen} days open
                            </span>
                          </div>
                        </div>

                        {job.salary && (job.salary.min || job.salary.max) && (
                          <p className="mt-3 text-sm font-semibold text-emerald-600">{formatSalary(job.salary)}</p>
                        )}

                        {job.skills?.required?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {job.skills.required.slice(0, 6).map((skill, index) => (
                              <span key={index} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                {skill}
                              </span>
                            ))}
                            {job.skills.required.length > 6 && (
                              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">
                                +{job.skills.required.length - 6} more
                              </span>
                            )}
                          </div>
                        ) : null}

                        <div className="mt-6">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Pipeline fill</span>
                            <span>
                              {health.fillRate}% · goal {health.target} applicants
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-slate-900 via-sky-500 to-emerald-400"
                              style={{ width: `${health.fillRate}%` }}
                            ></div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-500">
                            <Metric label="Applicants" value={health.applicants} icon={Users} />
                            <Metric label="Views" value={health.views} icon={Eye} />
                            <Metric label="Status" value={health.attention} icon={TrendingUp} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 lg:items-end">
                        <StatusBadge status={job.status} />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigate(`/recruiter/job/${job.jobId}/candidates`)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Pipeline
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/jobs/${job.jobId}`)}
                            className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/recruiter/edit-job/${job.jobId}`)}
                            className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.jobId)}
                            className="rounded-2xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const InsightPill = ({ icon: Icon, label, value, caption }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6">
    <div className="relative">
      <div className="flex items-center justify-between text-white/70 text-sm font-medium">
        <span>{label}</span>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">{caption}</p>
    </div>
  </div>
)

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-slate-100 px-3 py-2">
    <div className="flex items-center gap-1 text-xs text-slate-400">
      <Icon className="w-4 h-4" />
      {label}
    </div>
    <p className="text-sm font-semibold text-slate-900">{value}</p>
  </div>
)

const StatusBadge = ({ status }) => {
  const statusMap = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    draft: { label: 'Draft', className: 'bg-amber-50 text-amber-700 border-amber-100' },
    closed: { label: 'Closed', className: 'bg-slate-50 text-slate-600 border-slate-100' }
  }
  const state = statusMap[status] || statusMap.closed
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${state.className}`}>
      {state.label}
    </span>
  )
}
