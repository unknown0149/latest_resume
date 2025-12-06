import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Briefcase,
  Filter,
  RefreshCcw,
  Loader2,
  Search,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Star,
  Target,
  ClipboardList,
  LineChart,
  Sparkles,
  ArrowUpRight,
  BarChart3
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../hooks/useAuth'
import RecruiterNav from '../components/ui/RecruiterNav'

const ACTIVE_ORG_KEY = 'active_org_slug'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All stages' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interview_completed', label: 'Interview Completed' },
  { value: 'offer_extended', label: 'Offer Extended' },
  { value: 'offer_accepted', label: 'Offer Accepted' },
  { value: 'offer_declined', label: 'Offer Declined' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' }
]

const STAGE_ORDER = [
  'applied',
  'screening',
  'shortlisted',
  'interview_scheduled',
  'interview_completed',
  'offer_extended',
  'offer_accepted',
  'offer_declined',
  'rejected'
]

const statusClasses = {
  applied: 'bg-blue-50 text-blue-700',
  screening: 'bg-indigo-50 text-indigo-700',
  shortlisted: 'bg-cyan-50 text-cyan-700',
  interview_scheduled: 'bg-purple-50 text-purple-700',
  interview_completed: 'bg-purple-100 text-purple-800',
  offer_extended: 'bg-emerald-50 text-emerald-700',
  offer_accepted: 'bg-green-50 text-green-700',
  offer_declined: 'bg-orange-50 text-orange-700',
  rejected: 'bg-red-50 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700'
}

const formatStatus = (status = 'applied') => status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const SummaryCard = ({ icon: Icon, label, value, caption }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
    <div className="relative">
      <div className="flex items-center justify-between text-sm text-white/70 font-medium">
        <span>{label}</span>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/60">{caption}</p>
    </div>
  </div>
)

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debounced
}

export default function RecruiterApplicationsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [orgSlug, setOrgSlug] = useState(localStorage.getItem(ACTIVE_ORG_KEY) || '')
  const [organization, setOrganization] = useState(null)
  const [applications, setApplications] = useState([])
  const [jobs, setJobs] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput)
  const [loading, setLoading] = useState(false)
  const [orgLoading, setOrgLoading] = useState(!orgSlug)
  const [error, setError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Load organization either from cache or via API
  useEffect(() => {
    const initializeOrganization = async () => {
      setOrgLoading(true)
      try {
        const { data } = await api.get('/organizations')
        const orgs = data.organizations || []
        if (!orgs.length) {
          setError('Create an organization before viewing applicants.')
          setOrganization(null)
          setOrgLoading(false)
          return
        }
        const defaultOrg = orgs[0]
        setOrganization(defaultOrg)
        setOrgSlug(defaultOrg.slug)
        localStorage.setItem(ACTIVE_ORG_KEY, defaultOrg.slug)
        setError('')
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load organization info')
      } finally {
        setOrgLoading(false)
      }
    }

    const fetchOrgBySlug = async () => {
      setOrgLoading(true)
      try {
        const { data } = await api.get(`/organizations/${orgSlug}`)
        setOrganization(data.organization)
        localStorage.setItem(ACTIVE_ORG_KEY, orgSlug)
        setError('')
      } catch (err) {
        console.error('Failed to load cached organization, refetching list', err)
        localStorage.removeItem(ACTIVE_ORG_KEY)
        setOrgSlug('')
        initializeOrganization()
      } finally {
        setOrgLoading(false)
      }
    }

    if (!orgSlug) {
      initializeOrganization()
    } else {
      fetchOrgBySlug()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch recruiter jobs for filters
  useEffect(() => {
    if (!orgSlug) return

    const fetchJobs = async () => {
      try {
        const { data } = await api.get(`/recruiter/${orgSlug}/jobs`, {
          params: { page: 1, limit: 200 }
        })
        setJobs(data.jobs || [])
      } catch (err) {
        console.error('Failed to load recruiter jobs', err)
      }
    }

    fetchJobs()
  }, [orgSlug])

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, jobFilter, debouncedSearch])

  // Fetch applications when dependencies change
  useEffect(() => {
    if (!orgSlug) return

    const fetchApplications = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page, limit: 20 })
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (jobFilter !== 'all') params.append('jobId', jobFilter)
        if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())

        const { data } = await api.get(`/recruiter/${orgSlug}/applications?${params.toString()}`)
        setApplications(data.applications || [])
        setPagination(data.pagination || { page, pages: 1, total: data.applications?.length || 0 })
        setError('')
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [orgSlug, page, statusFilter, jobFilter, debouncedSearch])

  const pipelineSummary = useMemo(() => {
    const summary = {
      applied: 0,
      screening: 0,
      shortlisted: 0,
      interview_scheduled: 0,
      interview_completed: 0,
      offer_extended: 0,
      offer_accepted: 0,
      rejected: 0,
      offer_declined: 0,
      withdrawn: 0
    }

    applications.forEach((application) => {
      const key = application.status || 'applied'
      summary[key] = (summary[key] || 0) + 1
    })

    return summary
  }, [applications])

  const stageRows = useMemo(() => {
    const total = Object.values(pipelineSummary).reduce((sum, value) => sum + value, 0)
    return STAGE_ORDER.map((stage) => ({
      key: stage,
      label: formatStatus(stage),
      count: pipelineSummary[stage] || 0,
      percent: total ? Math.round(((pipelineSummary[stage] || 0) / total) * 100) : 0
    }))
  }, [pipelineSummary])

  const sourceBreakdown = useMemo(() => {
    const breakdown = {}
    applications.forEach((application) => {
      const source = application.source || 'direct'
      breakdown[source] = (breakdown[source] || 0) + 1
    })
    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0)
    return Object.entries(breakdown)
      .map(([source, count]) => ({
        source,
        count,
        percent: total ? Math.round((count / total) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
  }, [applications])

  const avgMatchScore = useMemo(() => {
    const scores = applications
      .map((application) => getMatchScore(application))
      .filter((score) => typeof score === 'number')
    if (!scores.length) return 0
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
  }, [applications])

  const highlightCandidates = useMemo(() => {
    const priorityStatuses = new Set([
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_extended'
    ])
    return applications.filter((application) => priorityStatuses.has(application.status)).slice(0, 3)
  }, [applications])

  const handleRefresh = () => {
    if (!orgSlug) return
    setPage(1)
    setStatusFilter('all')
    setJobFilter('all')
    setSearchInput('')
  }

  const totalPages = pagination.pages || 1
  const canGoPrev = page > 1
  const canGoNext = page < totalPages

  const getCandidateName = (application) =>
    application.userId?.name || application.resumeId?.parsed_resume?.name || 'Unnamed Candidate'

  const getCandidateEmail = (application) =>
    application.userId?.email || application.resumeId?.parsed_resume?.emails?.[0] || 'No email'

  const getCandidatePhone = (application) =>
    application.userId?.phone || application.resumeId?.parsed_resume?.phones?.[0] || '—'

  const getCandidateLocation = (application) =>
    application.resumeId?.parsed_resume?.location || application.userId?.location || '—'

  const getMatchScore = (application) =>
    application.matchScore ?? application.aiAnalysis?.skillMatch?.percentage ?? null

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

  return (
    <div className="min-h-screen bg-slate-950">
      <RecruiterNav />
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.25),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Recruiter pipeline</p>
                <h1 className="mt-3 text-4xl font-semibold text-white tracking-tight">Applications HQ</h1>
                {organization && (
                  <p className="mt-2 text-base text-white/70">
                    {organization.name} · {organization.slug}
                  </p>
                )}
                <p className="mt-2 text-sm text-white/60 max-w-2xl">
                  Inspect funnel health, prioritize conversations, and see every candidate touchpoint in one calm surface.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/recruiter')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  Dashboard
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/recruiter/jobs')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
                >
                  Jobs
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white text-slate-900 px-4 py-2 text-sm font-semibold"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Reset filters
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white disabled:opacity-60"
                >
                  {isLoggingOut ? 'Signing out…' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mt-10 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-rose-700">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {orgLoading ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-2xl shadow-slate-900/5 border border-slate-100">
                <Loader2 className="w-10 h-10 text-slate-900 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading organization data…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <SummaryCard
                    icon={Users}
                    label="Total applicants"
                    value={pagination.total || applications.length}
                    caption="Across current lens"
                  />
                  <SummaryCard
                    icon={Calendar}
                    label="Interviews scheduled"
                    value={pipelineSummary.interview_scheduled || 0}
                    caption="Upcoming touchpoints"
                  />
                  <SummaryCard
                    icon={Star}
                    label="Avg. match score"
                    value={`${avgMatchScore || 0}%`}
                    caption="Based on visible candidates"
                  />
                  <SummaryCard
                    icon={Target}
                    label="Offers out"
                    value={(pipelineSummary.offer_extended || 0) + (pipelineSummary.offer_accepted || 0)}
                    caption="Awaiting decisions"
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Pipeline progress</p>
                        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Stage distribution</h2>
                      </div>
                      <LineChart className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="mt-6 space-y-4">
                      {stageRows.map((stage) => (
                        <div key={stage.key}>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>{stage.label}</span>
                            <span>{stage.count}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400"
                              style={{ width: `${stage.percent}%` }}
                            ></div>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{stage.percent}% of current flow</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Quality signal</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Match insight</h2>
                        </div>
                        <Sparkles className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="mt-4 text-4xl font-semibold text-slate-900">{avgMatchScore || 0}%</p>
                      <p className="text-sm text-slate-500">Average of candidates in the current view</p>
                      <div className="mt-4 flex gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <Star className="w-4 h-4 text-amber-500" />
                          {pipelineSummary.shortlisted || 0} shortlisted
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          {pipelineSummary.interview_completed || 0} completed interviews
                        </span>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Source mix</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Top channels</h2>
                        </div>
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {sourceBreakdown.length === 0 ? (
                          <p className="text-sm text-slate-500">No source data captured yet.</p>
                        ) : (
                          sourceBreakdown.map((entry) => (
                            <div key={entry.source} className="flex items-center justify-between text-sm text-slate-600">
                              <span className="capitalize">{entry.source}</span>
                              <span className="font-semibold text-slate-900">{entry.count} · {entry.percent}%</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Priority queue</p>
                          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Follow up next</h2>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {highlightCandidates.length === 0 ? (
                          <p className="text-sm text-slate-500">No priority candidates right now.</p>
                        ) : (
                          highlightCandidates.map((application) => (
                            <div key={application._id} className="flex items-center justify-between text-sm text-slate-600">
                              <div>
                                <p className="font-semibold text-slate-900">{getCandidateName(application)}</p>
                                <p className="text-xs text-slate-500">{formatStatus(application.status)}</p>
                              </div>
                              <button
                                onClick={() => {
                                  const jobIdentifier = application.jobId?.jobId || application.jobId?._id
                                  if (jobIdentifier) navigate(`/recruiter/job/${jobIdentifier}/candidates`)
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                View
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/5 border border-slate-100">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                      <Filter className="w-4 h-4" />
                      <span>Filter pipeline</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                          className="w-full md:w-48 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Job</label>
                        <select
                          value={jobFilter}
                          onChange={(event) => setJobFilter(event.target.value)}
                          className="w-full md:w-56 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        >
                          <option value="all">All openings</option>
                          {jobs.map((job) => (
                            <option key={job._id || job.jobId} value={job._id || job.jobId}>
                              {job.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wide text-slate-500 block mb-1">Search</label>
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search candidates or roles"
                            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white shadow-2xl shadow-slate-900/5 border border-slate-100">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Pipeline detail</p>
                      <p className="text-xs text-slate-500">{applications.length} results on this page</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      Page {page} of {totalPages}
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center">
                      <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
                      <p className="text-slate-600">Fetching the latest applicants…</p>
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="p-12 text-center">
                      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-lg font-semibold text-slate-900">No applicants found</p>
                      <p className="text-sm text-slate-500 mt-1">Adjust filters or come back after new submissions.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Candidate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Job</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Match</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Applied</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                      {applications.map((application) => {
                        const id = application._id || application.applicationId
                        const candidateName = getCandidateName(application)
                        const candidateEmail = getCandidateEmail(application)
                        const jobTitle = application.jobId?.title || '—'
                        const jobLocation = application.jobId?.location?.city || application.jobId?.location?.country || '—'
                        const matchScore = getMatchScore(application)
                        const status = application.status || 'applied'
                        const jobIdentifier = application.jobId?.jobId || application.jobId?._id

                        return (
                          <tr key={id} className="hover:bg-slate-50/70">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center">
                                  {candidateName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{candidateName}</p>
                                  <p className="text-xs text-slate-500">{getCandidateLocation(application)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm font-medium text-slate-900">{jobTitle}</p>
                              <p className="text-xs text-slate-500">{jobLocation}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {matchScore ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">{Math.round(matchScore)}%</span>
                                  <Star className="w-4 h-4 text-amber-500" />
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Pending</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[status] || 'bg-slate-100 text-slate-700'}`}>
                                {formatStatus(status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-slate-900">{formatDate(application.createdAt || application.appliedAt)}</p>
                              <p className="text-xs text-slate-500">ID: {application.resumeId?.resumeId || application.resumeId?._id || '—'}</p>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col text-sm text-slate-700">
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="w-4 h-4 text-slate-400" />
                                  {candidateEmail}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Phone className="w-4 h-4 text-slate-400" />
                                  {getCandidatePhone(application)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex flex-col gap-2 items-end">
                                <button
                                  onClick={() => jobIdentifier && navigate(`/recruiter/job/${jobIdentifier}/candidates`)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                                >
                                  <ClipboardList className="w-4 h-4" />
                                  Pipeline
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {applications.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, pagination.total || page * 20)} of {pagination.total || 'many'} candidates
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={!canGoPrev}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className={`px-4 py-2 text-sm font-semibold rounded-2xl border ${
                        canGoPrev
                          ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          : 'border-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      disabled={!canGoNext}
                      onClick={() => setPage((prev) => prev + 1)}
                      className={`px-4 py-2 text-sm font-semibold rounded-2xl border ${
                        canGoNext
                          ? 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          : 'border-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
