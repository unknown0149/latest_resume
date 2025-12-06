import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardList, Filter, RefreshCw, CheckCircle2, Timer, Briefcase, Award, AlertCircle } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { applicationsAPI } from '../services/api'

const statusFilters = [
  { id: 'all', label: 'All stages' },
  { id: 'applied', label: 'Applied' },
  { id: 'screening', label: 'Screening' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview_scheduled', label: 'Interviewing' },
  { id: 'offer_extended', label: 'Offers' },
  { id: 'rejected', label: 'Rejected' },
]

const sortOptions = [
  { id: 'recent', label: 'Most recent' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'match', label: 'Best matches' },
]

const statusTokens = {
  applied: 'bg-slate-100 text-slate-700 border-slate-200',
  screening: 'bg-amber-50 text-amber-700 border-amber-100',
  shortlisted: 'bg-blue-50 text-blue-700 border-blue-100',
  interview_scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  interview_completed: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  offer_extended: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  offer_accepted: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  offer_declined: 'bg-rose-50 text-rose-600 border-rose-100',
  rejected: 'bg-rose-50 text-rose-600 border-rose-100',
  withdrawn: 'bg-slate-100 text-slate-600 border-slate-200',
}

const statusLabels = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  interview_completed: 'Interview completed',
  offer_extended: 'Offer extended',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ status: 'all', sort: 'recent' })
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [decisionModal, setDecisionModal] = useState({ open: false, application: null })
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)
  const navigate = useNavigate()

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        page,
        limit: 10,
        sort: filters.sort,
      }

      if (filters.status !== 'all') {
        params.status = filters.status
      }

      const [applicationsResponse, statsResponse] = await Promise.all([
        applicationsAPI.list(params),
        applicationsAPI.stats(),
      ])

      setApplications(applicationsResponse.applications || [])
      setPagination(applicationsResponse.pagination || { page: 1, pages: 1 })
      setStats(statsResponse.stats || null)
    } catch (err) {
      console.error('Unable to load applications', err)
      setError('Unable to load applications right now. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const refreshData = () => {
    fetchApplications()
  }

  const handleStatusChange = (status) => {
    setFilters((prev) => ({ ...prev, status }))
    setPage(1)
  }

  const handleSortChange = (sort) => {
    setFilters((prev) => ({ ...prev, sort }))
    setPage(1)
  }

  const openApplicationDetails = async (applicationId) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setSelectedApplication(null)

    try {
      const response = await applicationsAPI.details(applicationId)
      setSelectedApplication(response.application || null)
    } catch (err) {
      console.error('Failed to load application detail', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const openWithdrawModal = (application) => {
    setDecisionModal({ open: true, application })
    setDecisionNote('')
  }

  const handleWithdrawConfirm = async () => {
    if (!decisionModal.application) return
    setDecisionLoading(true)
    try {
      await applicationsAPI.withdraw(decisionModal.application.id, decisionNote)
      setDecisionModal({ open: false, application: null })
      setDecisionNote('')
      refreshData()
    } catch (err) {
      console.error('Failed to withdraw application', err)
      setError('Unable to withdraw the application. Please retry.')
    } finally {
      setDecisionLoading(false)
    }
  }

  const statusSummary = useMemo(() => ([
    {
      id: 'active',
      label: 'Active applications',
      value: stats?.active ?? 0,
      hint: 'In review or shortlist',
      icon: <ClipboardList className="w-5 h-5 text-slate-400" />,
    },
    {
      id: 'interviewing',
      label: 'Interviewing',
      value: stats?.interviewing ?? 0,
      hint: 'Scheduled conversations',
      icon: <Timer className="w-5 h-5 text-indigo-500" />,
    },
    {
      id: 'offers',
      label: 'Offers in play',
      value: stats?.offers ?? 0,
      hint: 'Need response',
      icon: <Award className="w-5 h-5 text-emerald-500" />,
    },
    {
      id: 'total',
      label: 'Total submitted',
      value: stats?.total ?? 0,
      hint: 'Lifetime applications',
      icon: <Briefcase className="w-5 h-5 text-slate-400" />,
    },
  ]), [stats])

  const disableWithdraw = (status) => ['offer_accepted', 'offer_declined', 'withdrawn', 'rejected'].includes(status)

  const renderTimelineDetails = (event) => {
    if (!event?.details) return null

    if (event.type === 'interview') {
      const { type, scheduledAt, meetingLink, location, status } = event.details
      return (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
          <div className="flex flex-wrap gap-3">
            {type && <span className="font-medium text-slate-700">Format: {type}</span>}
            {status && <span className="text-indigo-600">Status: {status.replace(/_/g, ' ')}</span>}
          </div>
          {scheduledAt && <p className="mt-2">Scheduled for {formatDateTime(scheduledAt)}</p>}
          {location && <p className="mt-1">Location: {location}</p>}
          {meetingLink && (
            <button
              type="button"
              onClick={() => window.open(meetingLink, '_blank', 'noopener,noreferrer')}
              className="mt-2 text-sm font-semibold text-indigo-600 underline"
            >
              Open meeting link
            </button>
          )}
        </div>
      )
    }

    if (event.type === 'offer') {
      const { salary, joiningDate, validUntil } = event.details
      return (
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          {salary && <p>Package: {salary?.toLocaleString?.() || salary}</p>}
          {joiningDate && <p>Proposed joining: {formatDateTime(joiningDate)}</p>}
          {validUntil && <p>Respond by: {formatDateTime(validUntil)}</p>}
        </div>
      )
    }

    if (typeof event.details === 'object') {
      return (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-600">
          <pre className="whitespace-pre-wrap text-left">{JSON.stringify(event.details, null, 2)}</pre>
        </div>
      )
    }

    return null
  }

  return (
    <div className="page-shell">
      <Navbar />
      <main className="pt-24 pb-20 space-y-12">
        <section className="section-shell">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="card-base rounded-[32px] p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3 max-w-3xl">
                <p className="text-sm text-[var(--rg-text-secondary)]">Pipeline overview</p>
                <h1 className="text-3xl font-semibold text-[var(--rg-text-primary)]">Stay on top of every application</h1>
                <p className="text-[var(--rg-text-secondary)]">
                  One clean board for matching roles, recruiter updates, and follow-ups. Use the filters to focus on what needs action today.
                </p>
                {error && (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-2 text-sm text-rose-700">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={refreshData} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
                <Button onClick={() => setFilters({ status: 'all', sort: 'recent' })} variant="secondary">
                  <Filter className="w-4 h-4 mr-2" /> Reset filters
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statusSummary.map((stat) => (
              <div key={stat.id} className="card-base rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--rg-text-secondary)]">{stat.label}</p>
                    <p className="text-3xl font-semibold text-[var(--rg-text-primary)]">{stat.value}</p>
                    <p className="text-sm text-[var(--rg-text-secondary)]">{stat.hint}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--rg-surface-alt)] p-3 text-[var(--rg-text-secondary)]">
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell">
          <div className="card-base rounded-[32px]">
            <div className="flex flex-col gap-4 border-b border-[var(--rg-border)] p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((option) => (
                  <button
                    key={option.id}
                    className={`chip ${filters.status === option.id ? 'is-active' : ''}`}
                    onClick={() => handleStatusChange(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--rg-text-secondary)]">
                <span>Sort</span>
                <div className="flex flex-wrap gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      className={`chip text-xs ${filters.sort === option.id ? 'is-active' : ''}`}
                      onClick={() => handleSortChange(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--rg-border)]">
              {loading ? (
                <div className="py-16 text-center text-[var(--rg-text-secondary)]">Loading your applications…</div>
              ) : applications.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center gap-4">
                  <ClipboardList className="h-12 w-12 text-[var(--rg-text-secondary)]/40" />
                  <div>
                    <p className="text-xl font-semibold text-[var(--rg-text-primary)]">No applications yet</p>
                    <p className="mt-1 text-sm text-[var(--rg-text-secondary)]">As soon as you apply, recruiters will update each stage right here.</p>
                  </div>
                  <Button onClick={() => navigate('/jobs')}>
                    Browse live roles
                  </Button>
                  <p className="text-xs text-[var(--rg-text-secondary)]">Verified recruiter postings and public listings now appear side-by-side.</p>
                </div>
              ) : (
                applications.map((application) => {
                  const statusClass = statusTokens[application.status] || statusTokens.applied
                  const statusLabel = statusLabels[application.status] || application.status
                  const nextInterview = application.nextInterview
                  const hasOffer = application.hasOffer
                  const companyLabel = application.job?.company?.name || application.job?.company || 'Confidential company'

                  return (
                    <article
                      key={application.id}
                      className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between bg-[var(--rg-surface)] rounded-2xl border border-[var(--rg-border)] shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-[var(--rg-text-secondary)]">{companyLabel}</p>
                          <h3 className="text-2xl font-semibold text-[var(--rg-text-primary)]">{application.job?.title || 'Role details syncing'}</h3>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-[var(--rg-text-secondary)]">
                          {application.job?.location && <span>{application.job.location}</span>}
                          {application.job?.type && (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-4 w-4" />
                              {application.job.type}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-4 w-4" />
                            Match {application.matchScore ?? 0}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-[var(--rg-text-secondary)]">
                          <span className="inline-flex items-center gap-2">
                            <Timer className="h-4 w-4" />
                            Applied {formatDateTime(application.appliedAt)}
                          </span>
                          {nextInterview && (
                            <span className="inline-flex items-center gap-2 text-indigo-600">
                              <Award className="h-4 w-4" />
                              Interview {formatDateTime(nextInterview.scheduledAt)}
                            </span>
                          )}
                          {hasOffer && application.offer && (
                            <span className="inline-flex items-center gap-2 text-emerald-600 font-semibold">
                              <CheckCircle2 className="h-4 w-4" /> 
                              Offer: {application.offer.salary ? `${new Intl.NumberFormat('en-US', { style: 'currency', currency: application.offer.currency || 'USD', maximumFractionDigits: 0 }).format(application.offer.salary)}` : 'Details available'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:items-end">
                        <span className={`chip justify-center ${statusClass} w-full sm:w-auto`}>
                          {statusLabel}
                        </span>
                        <div className="flex gap-2">
                          {application.status === 'offer_extended' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => {
                                  if (window.confirm('Accept this job offer?')) {
                                    applicationsAPI.respondToOffer(application.id, 'accept', '')
                                      .then(() => {
                                        refreshData();
                                      })
                                      .catch(err => console.error('Failed to accept offer:', err));
                                  }
                                }}
                              >
                                Accept Offer
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openWithdrawModal(application)}
                              >
                                Decline
                              </Button>
                            </>
                          )}
                          <Button size="sm" onClick={() => openApplicationDetails(application.id)}>
                            View timeline
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableWithdraw(application.status)}
                            onClick={() => openWithdrawModal(application)}
                          >
                            Withdraw
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>

            {applications.length > 0 && !loading && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rg-border)] px-6 py-5 text-sm text-[var(--rg-text-secondary)]">
                <span>
                  Page {pagination.page || page} of {pagination.pages || 1}
                </span>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(pagination.page || page) <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(pagination.page || page) >= (pagination.pages || 1)}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedApplication(null)
        }}
        title="Application timeline"
        size="lg"
      >
        {detailLoading ? (
          <div className="py-10 text-center text-slate-500">Fetching details…</div>
        ) : !selectedApplication ? (
          <div className="py-10 text-center text-slate-500">Unable to load this application.</div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{selectedApplication.job?.company || 'Company'}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{selectedApplication.job?.title}</h3>
              <p className="mt-2 text-sm text-slate-600">Current status: {statusLabels[selectedApplication.status] || selectedApplication.status}</p>
            </div>
            <div className="space-y-4">
              {selectedApplication.timeline?.map((event, index) => {
                const statusText = (event.event || event.status || '').toString().replace(/_/g, ' ')
                const eventStatusClass = event.status ? (statusTokens[event.status] || 'bg-slate-100 text-slate-600 border-slate-200') : 'bg-slate-100 text-slate-600 border-slate-200'
                return (
                  <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900" />
                    {index < selectedApplication.timeline.length - 1 && <div className="w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{statusText}</p>
                        {event.status && (
                          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${eventStatusClass}`}>
                            {statusLabels[event.status] || event.status}
                          </span>
                        )}
                        {event.actor && (
                          <span className="text-xs text-slate-500">by {event.actor}</span>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{event.event}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(event.date)}</p>
                    {event.note && <p className="mt-2 text-sm text-slate-600">{event.note}</p>}
                    {renderTimelineDetails(event)}
                  </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={decisionModal.open}
        onClose={() => setDecisionModal({ open: false, application: null })}
        title="Withdraw application"
        size="sm"
      >
        <p className="text-sm text-slate-500">
          Share a short note for the recruiter (optional). We will send the withdrawal immediately.
        </p>
        <textarea
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          rows={4}
          placeholder="Reason for withdrawal"
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDecisionModal({ open: false, application: null })}>
            Cancel
          </Button>
          <Button variant="danger" isLoading={decisionLoading} onClick={handleWithdrawConfirm}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default ApplicationsPage
