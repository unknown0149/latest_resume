import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  IndianRupee,
  ExternalLink,
  X,
  Award,
  Star,
  Sparkles,
  Users,
  BadgeCheck
} from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import api from '../services/api'
import { useResumeContext } from '../hooks/useResumeContext'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const PAGE_SIZE = 9

const JobsListingPage = () => {
  const [searchParams] = useSearchParams()
  const { parsedResume, skillGaps } = useResumeContext()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMatched, setShowMatched] = useState(searchParams.get('matched') === 'true')
  const [page, setPage] = useState(1)
  const [searchMeta, setSearchMeta] = useState({ total: 0, returned: 0, nextOffset: null })
  const offsetHistoryRef = useRef([0])
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [applyingJobId, setApplyingJobId] = useState(null)
  const [appliedJobIds, setAppliedJobIds] = useState(() => new Set())
  
  // Filters
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [isRemote, setIsRemote] = useState('')
  const [tag, setTag] = useState('')
  const [company, setCompany] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [sortBy, setSortBy] = useState('postedDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  const verifiedSkillNames = useMemo(() => {
    const collected = []
    const pushSkill = (rawSkill) => {
      if (!rawSkill || typeof rawSkill !== 'string') {
        return
      }
      const normalized = rawSkill.trim()
      if (!normalized) {
        return
      }
      if (!collected.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
        collected.push(normalized)
      }
    }

    const ownedSkills = Array.isArray(skillGaps?.skillsHave) ? skillGaps.skillsHave : []
    ownedSkills
      .filter((skill) => skill?.verified)
      .forEach((skill) => pushSkill(skill.skill || skill.name || skill.title))

    const verificationStatusSkills = parsedResume?.parsed_resume?.verification_status?.verifiedSkills || []
    verificationStatusSkills.forEach((skill) => pushSkill(skill.skill || skill.name || skill.title))

    return collected
  }, [skillGaps, parsedResume])

  const verifiedSkillSet = useMemo(() => new Set(verifiedSkillNames.map((skill) => skill.toLowerCase())), [verifiedSkillNames])
  const hasVerifiedSkills = verifiedSkillNames.length > 0

  const getVerifiedSkillMatches = useCallback((job) => {
    if (!verifiedSkillSet.size) {
      return []
    }

    const aggregateSkills = []
    if (Array.isArray(job.skills?.allSkills)) {
      aggregateSkills.push(...job.skills.allSkills)
    }
    if (Array.isArray(job.skills?.required)) {
      aggregateSkills.push(...job.skills.required)
    }

    const uniqueSkills = []
    aggregateSkills.forEach((skill) => {
      if (!skill || typeof skill !== 'string') {
        return
      }
      const normalized = skill.trim().toLowerCase()
      if (normalized && !uniqueSkills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
        uniqueSkills.push(skill)
      }
    })

    return uniqueSkills.filter((skill) => verifiedSkillSet.has(skill.toLowerCase()))
  }, [verifiedSkillSet])

  const fetchJobs = useCallback(
    async (targetPage = 1, { resetCursor = false } = {}) => {
      try {
        setLoading(true)
        setError('')

        if (showMatched && parsedResume?.resumeId) {
          const response = await api.get(
            `/jobs/match/${parsedResume.resumeId}?limit=120&useEmbeddings=true&generateAISummaries=true`
          )
          const matches = response.data?.data?.matches || []
          const normalized = matches.map((match) => ({
            ...match.job,
            matchScore: match.matchScore,
            matchingSkills: match.matchedSkills || [],
            missingSkills: match.missingSkills || []
          }))
          setJobs(normalized)
          setSearchMeta({
            total: normalized.length,
            returned: normalized.length,
            nextOffset: null
          })
          offsetHistoryRef.current = [0]
          setPage(targetPage)
          return
        }

        if (resetCursor) {
          offsetHistoryRef.current = [0]
        }

        const offsets = offsetHistoryRef.current
        const cursor = offsets[targetPage - 1] ?? 0

        const params = new URLSearchParams()
        params.set('limit', PAGE_SIZE.toString())
        params.set('offset', cursor.toString())
        if (search) params.set('q', search)
        if (location) params.set('location', location)
        if (employmentType) params.set('employmentType', employmentType)
        if (experienceLevel) params.set('experienceLevel', experienceLevel)
        if (isRemote) params.set('isRemote', isRemote)
        if (tag) params.set('tag', tag)
        if (company) params.set('company', company)
        if (salaryMin) params.set('salaryMin', salaryMin)
        if (salaryMax) params.set('salaryMax', salaryMax)
        if (sortBy) params.set('sortBy', sortBy)
        if (sortOrder) params.set('sortOrder', sortOrder)

        // Use /all endpoint to get jobs from all recruiters
        const response = await api.get(`/jobs/all?${params.toString()}`)
        const data = response.data || {}
        const fetchedJobs = data.jobs || []

        setJobs(fetchedJobs)
        setSearchMeta({
          total: data.pagination?.total ?? fetchedJobs.length,
          returned: fetchedJobs.length,
          nextOffset: data.pagination?.page < data.pagination?.pages ? data.pagination.page + 1 : null
        })

        const nextOffsets = [...offsets]
        nextOffsets[targetPage - 1] = cursor
        if (data.pagination && data.pagination.page < data.pagination.pages) {
          nextOffsets[targetPage] = data.pagination.page * PAGE_SIZE
        }
        offsetHistoryRef.current = nextOffsets
        setPage(targetPage)
      } catch (err) {
        console.error('Failed to fetch jobs:', err)
        setError('Unable to load jobs right now. Please try again in a moment.')
      } finally {
        setLoading(false)
      }
    },
    [
      showMatched,
      parsedResume?.resumeId,
      search,
      location,
      employmentType,
      experienceLevel,
      isRemote,
      tag,
      company,
      salaryMin,
      salaryMax,
      sortBy,
      sortOrder
    ]
  )

  useEffect(() => {
    fetchJobs(1, { resetCursor: true })
  }, [fetchJobs])

  const markJobAsApplied = useCallback((jobIdentifier) => {
    if (!jobIdentifier) return

    setAppliedJobIds((prev) => {
      const next = new Set(prev)
      next.add(jobIdentifier)
      return next
    })

    setJobs((prev) =>
      prev.map((job) =>
        (job.jobId || job.id) === jobIdentifier
          ? { ...job, applicationStatus: 'applied' }
          : job
      )
    )
  }, [])

  useEffect(() => {
    if (!parsedResume?.resumeId || !isAuthenticated) {
      setAppliedJobIds(new Set())
      return
    }

    let isCancelled = false

    const loadAppliedJobs = async () => {
      try {
        const response = await api.get(`/jobs/applied/${parsedResume.resumeId}`)
        if (isCancelled) return

        const appliedEntries = response.data?.data || []
        const jobIds = new Set(
          appliedEntries
            .map((entry) => entry.job?.jobId)
            .filter(Boolean)
        )

        setAppliedJobIds(jobIds)

        if (jobIds.size) {
          setJobs((prev) =>
            prev.map((job) =>
              jobIds.has(job.jobId || job.id)
                ? { ...job, applicationStatus: 'applied' }
                : job
            )
          )
        }
      } catch (err) {
        console.error('Failed to load applied jobs:', err)
      }
    }

    loadAppliedJobs()

    return () => {
      isCancelled = true
    }
  }, [parsedResume?.resumeId, isAuthenticated])

  const handleApply = useCallback(async (job) => {
    const jobIdentifier = job.jobId || job.id
    if (!jobIdentifier) {
      toast.error('Unable to apply to this job. Missing job identifier.')
      return
    }

    // For external/live jobs with an applicationUrl and no organization (not recruiter-owned), open the link directly
    if (job.applicationUrl && !job.organizationId) {
      window.open(job.applicationUrl, '_blank', 'noopener,noreferrer')
      return
    }

    if (!isAuthenticated) {
      toast.error('Please log in to apply for jobs.')
      navigate('/login?redirect=/jobs')
      return
    }

    if (!parsedResume?.resumeId) {
      toast.error('Upload your resume before applying to jobs.')
      navigate('/upload')
      return
    }

    try {
      setApplyingJobId(jobIdentifier)
      await api.post(`/jobs/${jobIdentifier}/apply`, {
        resumeId: parsedResume.resumeId
      })
      toast.success('Application submitted!')
      markJobAsApplied(jobIdentifier)
    } catch (err) {
      console.error('Failed to apply for job:', err)
      const message = err.response?.data?.message || 'Failed to submit your application'
      toast.error(message)
    } finally {
      setApplyingJobId(null)
    }
  }, [isAuthenticated, parsedResume?.resumeId, navigate, markJobAsApplied])

  const clearFilters = () => {
    setSearch('')
    setLocation('')
    setEmploymentType('')
    setExperienceLevel('')
    setIsRemote('')
    setTag('')
    setCompany('')
    setSalaryMin('')
    setSalaryMax('')
    setPage(1)
  }

  const toInr = (value, currency) => {
    if (!value) return 0
    if (currency && currency.toUpperCase() === 'USD') {
      return Math.round(value * 83)
    }
    return value
  }

  const formatSalary = (min, max, currency) => {
    if (!min && !max) return 'Not specified'
    const minInr = toInr(min, currency)
    const maxInr = toInr(max, currency)
    const format = (val) => (val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${val.toLocaleString('en-IN')}`)
    if (min && max) return `${format(minInr)} - ${format(maxInr)}`
    if (min) return `From ${format(minInr)}`
    if (max) return `Up to ${format(maxInr)}`
    return 'Not specified'
  }

  const formatDate = (date) => {
    const now = new Date()
    const posted = new Date(date)
    const diffDays = Math.floor((now - posted) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const sortJobs = useCallback((list) => {
    if (showMatched) {
      return [...list].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    }

    const sorted = [...list]
    sorted.sort((a, b) => {
      const getCompany = (job) => (job.company?.name || job.company || '').toLowerCase()
      const salaryA = a.salary?.max ?? a.salary?.min ?? 0
      const salaryB = b.salary?.max ?? b.salary?.min ?? 0

      let result = 0
      switch (sortBy) {
        case 'salary':
          result = salaryA - salaryB
          break
        case 'title':
          result = (a.title || '').localeCompare(b.title || '')
          break
        case 'company':
          result = getCompany(a).localeCompare(getCompany(b))
          break
        default:
          result = new Date(a.postedDate || Date.now()) - new Date(b.postedDate || Date.now())
          break
      }

      return sortOrder === 'asc' ? result : -result
    })

    return sorted
  }, [sortBy, sortOrder, showMatched])

  const filterPredicate = useCallback((job) => {
    const companyLower = company.toLowerCase()
    const companyName = (job.company?.name || job.company || '').toLowerCase()
    const minSalary = Number(salaryMin || 0)
    const maxSalary = Number(salaryMax || 0)
    const jobSalaryMin = Number(job.salary?.min || 0)
    const jobSalaryMax = Number(job.salary?.max || jobSalaryMin)

    if (company && !companyName.includes(companyLower)) {
      return false
    }

    if (salaryMin && jobSalaryMax < minSalary) {
      return false
    }

    if (salaryMax && jobSalaryMin > maxSalary) {
      return false
    }

    if (!showMatched) {
      return true
    }

    const searchLower = search.toLowerCase()
    const locationLower = location.toLowerCase()
    const jobLocation = job.location?.city?.toLowerCase() || ''
    const jobDescription = job.description?.toLowerCase() || ''

    if (search && !(`${job.title?.toLowerCase() || ''} ${companyName} ${jobDescription}`).includes(searchLower)) {
      return false
    }

    if (location && !jobLocation.includes(locationLower)) {
      return false
    }

    if (employmentType && job.employmentType !== employmentType) {
      return false
    }

    if (experienceLevel && job.experienceLevel !== experienceLevel) {
      return false
    }

    if (isRemote === 'true' && !job.location?.isRemote) {
      return false
    }

    if (isRemote === 'false' && job.location?.isRemote) {
      return false
    }

    if (tag && job.tag !== tag) {
      return false
    }

    return true
  }, [company, salaryMin, salaryMax, showMatched, search, location, employmentType, experienceLevel, isRemote, tag])

  const processedJobs = useMemo(() => {
    const sorted = sortJobs(jobs)
    return sorted.filter(filterPredicate)
  }, [jobs, sortJobs, filterPredicate])

  const totalPages = showMatched
    ? Math.max(1, Math.ceil(processedJobs.length / PAGE_SIZE))
    : Math.max(1, Math.ceil((searchMeta.total || 0) / PAGE_SIZE))
  const paginatedJobs = showMatched
    ? processedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : processedJobs
  const activeCount = showMatched ? processedJobs.length : (searchMeta.total || processedJobs.length)
  const rangeStart = activeCount === 0 ? 0 : (showMatched ? (page - 1) * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + 1)
  const rangeEnd = activeCount === 0
    ? 0
    : showMatched
      ? Math.min(page * PAGE_SIZE, processedJobs.length)
      : (page - 1) * PAGE_SIZE + processedJobs.length
  const displayRangeEnd = activeCount === 0 ? 0 : Math.min(rangeEnd, activeCount)
  const canGoPrev = page > 1
  const canGoNext = showMatched ? page < totalPages : searchMeta.nextOffset !== null && searchMeta.nextOffset !== undefined
  const shouldShowPagination = showMatched ? processedJobs.length > PAGE_SIZE : canGoPrev || canGoNext

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const renderJobCard = (job) => {
    const jobIdentifier = job.jobId || job.id
    const alreadyApplied = appliedJobIds.has(jobIdentifier)
    const sourcePlatform = (job.source?.platform || '').toLowerCase()
    const useInternalApply = !job.applicationUrl || ['manual', 'direct', 'real'].includes(sourcePlatform)
    const isApplyingCurrent = applyingJobId === jobIdentifier
    const verifiedMatches = getVerifiedSkillMatches(job)

    return (
      <motion.article
        key={jobIdentifier}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6 }}
        className="group relative rounded-3xl border border-[var(--rg-border)] bg-[var(--rg-surface)]/90 backdrop-blur shadow-soft overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10 flex flex-col h-full p-6 gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-secondary mb-1">{job.company?.name || job.company}</p>
              <h3 className="text-xl font-semibold text-primary leading-snug line-clamp-2">{job.title}</h3>
            </div>
            <div className="flex flex-col items-end gap-2">
              {showMatched && job.matchScore && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700">
                  {Math.round(job.matchScore)}% match
                </span>
              )}
              {job.tag && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900/5 text-slate-600">
                  {job.tag}
                </span>
              )}
              {job.isVerified && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 inline-flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified role
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              <span>{job.location?.city || 'Remote'}{job.location?.isRemote ? ' · Remote' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-500" />
              <span>
                {formatSalary(job.salary?.min, job.salary?.max, job.salary?.currency)}
                {job.salary?.period ? ` / ${job.salary.period === 'hourly' ? 'hr' : 'yr'}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary-500" />
              <span className="capitalize">{job.employmentType}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary-500" />
              <span className="capitalize">{job.experienceLevel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" />
              <span>{job.applications || 0} applications</span>
            </div>
          </div>

          <p className="text-sm text-secondary/90 leading-relaxed line-clamp-3">
            {job.description}
          </p>

          {job.compatibility && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Watson verified
                </span>
                <span className="font-semibold">
                  {Math.round((job.compatibility.confidence || 0) * 100)}% confidence
                </span>
              </div>
              {job.compatibility.reason && (
                <p className="text-[11px] text-emerald-800/80 mb-2 line-clamp-2">
                  {job.compatibility.reason}
                </p>
              )}
              {job.compatibility.matchedSkills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {job.compatibility.matchedSkills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-full bg-white/80 text-[11px] font-medium capitalize"
                    >
                      {skill}
                    </span>
                  ))}
                  {job.compatibility.matchedSkills.length > 4 && (
                    <span className="text-[11px] text-emerald-700">
                      +{job.compatibility.matchedSkills.length - 4} more
                    </span>
                  )}
                </div>
              )}
              {job.compatibility.missingSkills?.length > 0 && (
                <p className="text-[11px] text-rose-600">
                  Missing: {job.compatibility.missingSkills.slice(0, 3).join(', ')}
                  {job.compatibility.missingSkills.length > 3 ? '…' : ''}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
              <BadgeCheck className="w-3.5 h-3.5 text-primary-500" />
              Verified skills
            </div>
            {hasVerifiedSkills ? (
              verifiedMatches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {verifiedMatches.slice(0, 6).map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 capitalize border border-emerald-100"
                    >
                      {skill}
                    </span>
                  ))}
                  {verifiedMatches.length > 6 && (
                    <span className="px-3 py-1 text-xs text-secondary">
                      +{verifiedMatches.length - 6} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-secondary/80">
                  None of your verified skills align with this role yet. Add more badges to unlock matches.
                </p>
              )
            ) : (
              <p className="text-xs text-secondary/80">
                Verify your skills from the dashboard to compare them directly against job requirements.
              </p>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-[var(--rg-border)] pt-4">
            <div className="flex flex-col gap-1 text-xs text-secondary">
              <div className="flex items-center gap-2">
                <span>{formatDate(job.postedDate)}</span>
                {alreadyApplied && (
                  <span className="px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700">
                    Applied
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-secondary/80">
                <Users className="w-3.5 h-3.5" />
                <span>{job.applications || 0} total applicant{(job.applications || 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
            {useInternalApply ? (
              <Button
                className="gap-2"
                onClick={() => handleApply(job)}
                disabled={alreadyApplied || isApplyingCurrent}
              >
                {alreadyApplied ? 'Applied' : isApplyingCurrent ? 'Applying...' : 'Apply'}
              </Button>
            ) : (
              <a
                href={job.applicationUrl || job.source?.sourceUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button className="gap-2">
                  <ExternalLink className="w-4 h-4" /> Apply
                </Button>
              </a>
            )}
          </div>
        </div>
      </motion.article>
    )
  }

  const handlePageChange = (direction) => {
    if (direction === 'next') {
      const targetPage = page + 1
      if (showMatched) {
        if (targetPage <= totalPages) {
          setPage(targetPage)
        }
        return
      }

      if (searchMeta.nextOffset !== null && searchMeta.nextOffset !== undefined) {
        fetchJobs(targetPage)
      }
      return
    }

    const targetPage = page - 1
    if (targetPage < 1) {
      return
    }

    if (showMatched) {
      setPage(targetPage)
    } else {
      fetchJobs(targetPage)
    }
  }

  return (
    <div className="min-h-screen page-shell">
      <Navbar />

      <div className="pt-20 pb-12">
        <div className="bg-[var(--rg-surface)] border-b border-[var(--rg-border)] py-16 px-4 shadow-soft">
          <div className="max-w-7xl mx-auto section-shell px-0">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <p className="text-xs uppercase tracking-[0.5em] text-[var(--rg-text-secondary)] mb-4">opportunities</p>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-3 text-[var(--rg-text-primary)]">Explore Job Opportunities</h1>
              <p className="text-[var(--rg-text-secondary)] text-lg mb-6">
                {activeCount} curated {showMatched ? 'matches' : 'listings'} streaming from the CSV feed
              </p>

              {parsedResume?.resumeId && (
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    onClick={() => setShowMatched((prev) => !prev)}
                    className={`px-5 py-3 rounded-2xl font-medium inline-flex items-center gap-2 transition ${
                      showMatched ? 'bg-[var(--rg-accent)] text-white shadow-soft' : 'bg-[var(--rg-surface-alt)] text-[var(--rg-text-primary)] border border-[var(--rg-border)]'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    {showMatched ? 'Showing matched jobs' : 'Use my resume to sort by match'}
                  </button>
                  {showMatched && (
                    <span className="text-sm text-[var(--rg-text-secondary)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Match score prioritized
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--rg-text-secondary)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by job title, company, skills..."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)] text-[var(--rg-text-primary)] placeholder-[var(--rg-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--rg-accent)]"
                  />
                </div>
                <Button onClick={() => setShowFilters(!showFilters)} variant="secondary" className="px-6 py-4">
                  <Filter className="w-4 h-4 mr-2" /> Filters
                </Button>
              </div>

              {hasVerifiedSkills && (
                <div className="mt-8 rounded-3xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] p-6">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-[var(--rg-text-secondary)]">
                    <BadgeCheck className="w-4 h-4 text-[var(--rg-text-primary)]" />
                    Verified skill badges
                  </div>
                  <p className="mt-2 text-[var(--rg-text-secondary)] text-sm">
                    Recruiters will only see the skills you have verified. Highlighted below are the ones linked to your profile.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {verifiedSkillNames.slice(0, 10).map((skill) => (
                      <span key={skill} className="px-4 py-2 rounded-2xl bg-white text-slate-900 text-sm font-semibold shadow-sm">
                        {skill}
                      </span>
                    ))}
                    {verifiedSkillNames.length > 10 && (
                      <span className="px-4 py-2 rounded-2xl border border-white/50 text-white/80 text-sm">
                        +{verifiedSkillNames.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-b border-gray-200 overflow-hidden"
            >
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      placeholder="City or state"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Employment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                      <option value="freelance">Freelance</option>
                    </select>
                  </div>

                  {/* Experience Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Levels</option>
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="lead">Lead</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>

                  {/* Remote */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                    <select
                      value={isRemote}
                      onChange={(e) => setIsRemote(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All</option>
                      <option value="true">Remote</option>
                      <option value="false">On-site</option>
                    </select>
                  </div>

                  {/* Tag */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                    <select
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Tags</option>
                      <option value="internship">Internship</option>
                      <option value="job">Job</option>
                    </select>
                  </div>

                  {/* Salary Min */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                    <input
                      type="number"
                      placeholder="₹0"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="postedDate">Date Posted</option>
                      <option value="salary">Salary</option>
                      <option value="title">Job Title</option>
                      <option value="company">Company Name</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={clearFilters} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters */}
        {(search || location || employmentType || experienceLevel || isRemote || tag) && (
          <div className="max-w-7xl mx-auto px-4 mt-6">
            <div className="flex flex-wrap gap-2">
              {search && (
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                  Search: {search}
                  <X className="w-4 h-4 cursor-pointer" onClick={() => setSearch('')} />
                </span>
              )}
              {location && (
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                  Location: {location}
                  <X className="w-4 h-4 cursor-pointer" onClick={() => setLocation('')} />
                </span>
              )}
              {employmentType && (
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2">
                  Type: {employmentType}
                  <X className="w-4 h-4 cursor-pointer" onClick={() => setEmploymentType('')} />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Jobs Grid */}
        <div className="max-w-7xl mx-auto px-4 mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl border border-dashed border-[var(--rg-border)] bg-white/40 backdrop-blur p-6 animate-pulse space-y-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-9 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Card className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{error}</h3>
              <Button onClick={fetchJobs}>Retry</Button>
            </Card>
          ) : processedJobs.length === 0 ? (
            <Card className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs match your filters</h3>
              <p className="text-gray-600 mb-4">Try broadening your filters or reset them to view all jobs.</p>
              <Button onClick={clearFilters}>Reset filters</Button>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 text-sm text-secondary">
                <span>{activeCount} roles</span>
                <span>
                  {activeCount === 0
                    ? 'No results'
                    : `Showing ${rangeStart} - ${displayRangeEnd}`}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedJobs.map(renderJobCard)}
              </div>
            </>
          )}

          {shouldShowPagination && (
            <div className="flex justify-center items-center gap-4 mt-12">
              <Button onClick={() => handlePageChange('prev')} disabled={!canGoPrev} variant="outline">
                Previous
              </Button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button onClick={() => handlePageChange('next')} disabled={!canGoNext} variant="outline">
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default JobsListingPage
