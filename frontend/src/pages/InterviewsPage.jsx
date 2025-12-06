import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck2, Clock, RefreshCw, MapPin, Video, Users, Share2, AlarmPlus } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { interviewAPI } from '../services/api'

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const interviewStatusStyles = {
  scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-amber-50 text-amber-700 border-amber-100',
}

const interviewStatusLabels = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Rescheduling',
}

const formatDateTime = (value) => {
  if (!value) return 'TBD'
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

const InterviewsPage = () => {
  const [filters, setFilters] = useState({ status: 'scheduled', upcoming: true })
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [rescheduleModal, setRescheduleModal] = useState({ open: false, interview: null })
  const [rescheduleForm, setRescheduleForm] = useState({ reason: '', suggestedTimes: '' })

  const fetchInterviews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await interviewAPI.getScheduledInterviews({
        status: filters.status,
        upcoming: filters.upcoming ? 'true' : 'false',
      })
      setInterviews(response.interviews || [])
    } catch (err) {
      console.error('Unable to load interviews', err)
      setError('Unable to load interviews right now. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  const stats = useMemo(() => {
    const now = new Date()
    const upcoming = interviews.filter((interview) => interview.status === 'scheduled' && new Date(interview.scheduledAt) > now)
    const completed = interviews.filter((interview) => interview.status === 'completed')
    const cancelled = interviews.filter((interview) => interview.status === 'cancelled')

    return [
      { id: 'upcoming', label: 'Upcoming', value: upcoming.length, hint: 'Next 30 days', icon: <CalendarCheck2 className="w-5 h-5 text-emerald-500" /> },
      { id: 'completed', label: 'Completed', value: completed.length, hint: 'Awaiting feedback', icon: <Clock className="w-5 h-5 text-slate-500" /> },
      { id: 'cancelled', label: 'Changes', value: cancelled.length, hint: 'Rescheduled or cancelled', icon: <Share2 className="w-5 h-5 text-amber-500" /> },
    ]
  }, [interviews])

  const handleConfirm = async (interviewId) => {
    setProcessingId(interviewId)
    try {
      await interviewAPI.respondToInterview(interviewId, { response: 'accept' })
      fetchInterviews()
    } catch (err) {
      console.error('Failed to confirm interview', err)
      setError('Unable to confirm this interview just yet.')
    } finally {
      setProcessingId(null)
    }
  }

  const openRescheduleModal = (interview) => {
    setRescheduleModal({ open: true, interview })
    setRescheduleForm({ reason: '', suggestedTimes: '' })
  }

  const handleReschedule = async () => {
    if (!rescheduleModal.interview) return
    setProcessingId(rescheduleModal.interview.id)
    try {
      const suggestedTimes = rescheduleForm.suggestedTimes
        .split('\n')
        .map((slot) => slot.trim())
        .filter(Boolean)

      await interviewAPI.respondToInterview(rescheduleModal.interview.id, {
        response: 'reschedule',
        reason: rescheduleForm.reason,
        suggestedTimes,
      })

      setRescheduleModal({ open: false, interview: null })
      fetchInterviews()
    } catch (err) {
      console.error('Failed to request reschedule', err)
      setError('Unable to request a reschedule. Please try again later.')
    } finally {
      setProcessingId(null)
    }
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
                <p className="text-sm text-[var(--rg-text-secondary)]">Interview runway</p>
                <h1 className="text-3xl font-semibold text-[var(--rg-text-primary)]">Prepare, confirm, and reschedule with ease</h1>
                <p className="text-[var(--rg-text-secondary)]">
                  Keep every recruiter touchpoint in one place. Confirm attendance, suggest new times, and revisit completed conversations.
                </p>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={fetchInterviews} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button onClick={() => setFilters({ status: 'scheduled', upcoming: true })} variant="secondary">
                  <AlarmPlus className="mr-2 h-4 w-4" /> Upcoming focus
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {stats.map((stat) => (
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
                    onClick={() => setFilters((prev) => ({ ...prev, status: option.id }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                className={`chip ${filters.upcoming ? 'is-active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, upcoming: !prev.upcoming }))}
              >
                Upcoming only
              </button>
            </div>

            <div className="divide-y divide-[var(--rg-border)]">
              {loading ? (
                <div className="py-16 text-center text-[var(--rg-text-secondary)]">Syncing your interviews…</div>
              ) : interviews.length === 0 ? (
                <div className="py-16 text-center">
                  <Video className="mx-auto h-10 w-10 text-[var(--rg-text-secondary)]/40" />
                  <p className="mt-4 text-lg font-semibold text-[var(--rg-text-primary)]">No interviews in this view</p>
                  <p className="text-sm text-[var(--rg-text-secondary)]">Adjust filters or keep applying — we will post new invites here.</p>
                </div>
              ) : (
                interviews.map((interview) => (
                  <article key={interview.id} className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--rg-text-secondary)]">{interview.job?.company || 'Company confidential'}</p>
                        <h3 className="text-2xl font-semibold text-[var(--rg-text-primary)]">{interview.job?.title || 'Role details syncing'}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-[var(--rg-text-secondary)]">
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {formatDateTime(interview.scheduledAt)}
                        </span>
                        {interview.location && (
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {interview.location}
                          </span>
                        )}
                        {interview.meetingLink && (
                          <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-indigo-600">
                            <Video className="h-4 w-4" /> Join call
                          </a>
                        )}
                      </div>
                      {interview.notes && <p className="text-sm text-[var(--rg-text-secondary)]">Notes: {interview.notes}</p>}

                      <div className="rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rg-text-secondary)]">Interview panel</p>
                        <ul className="mt-2 space-y-1 text-sm text-[var(--rg-text-secondary)]">
                          {(interview.interviewers || []).length === 0 && <li>Details coming soon</li>}
                          {(interview.interviewers || []).map((member) => (
                            <li key={member._id || member.email} className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-[var(--rg-text-secondary)]" />
                              {member.name || member.email}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-end">
                      <span className={`chip ${interviewStatusStyles[interview.status] || ''}`}>
                        {interviewStatusLabels[interview.status] || interview.status}
                      </span>
                      {interview.status === 'scheduled' && (
                        <div className="flex flex-wrap gap-3">
                          <Button size="sm" onClick={() => handleConfirm(interview.id)} isLoading={processingId === interview.id}>
                            Confirm attendance
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRescheduleModal(interview)}
                            disabled={processingId === interview.id}
                          >
                            Request reschedule
                          </Button>
                        </div>
                      )}
                      {interview.status === 'completed' && (
                        <span className="text-sm text-[var(--rg-text-secondary)]">Completed — awaiting recruiter feedback</span>
                      )}
                      {interview.status === 'cancelled' && (
                        <span className="text-sm text-[var(--rg-text-secondary)]">Recruiter will share a new slot shortly</span>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <Modal
        isOpen={rescheduleModal.open}
        onClose={() => setRescheduleModal({ open: false, interview: null })}
        title="Request reschedule"
        size="sm"
      >
        <p className="text-sm text-slate-500">
          Let the recruiter know why you need a different slot and offer two or three alternatives.
        </p>
        <textarea
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          rows={3}
          placeholder="Reason for reschedule"
          value={rescheduleForm.reason}
          onChange={(event) => setRescheduleForm((prev) => ({ ...prev, reason: event.target.value }))}
        />
        <textarea
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          rows={4}
          placeholder={"Suggested times\nExample: Tue 4pm, Wed 11am"}
          value={rescheduleForm.suggestedTimes}
          onChange={(event) => setRescheduleForm((prev) => ({ ...prev, suggestedTimes: event.target.value }))}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRescheduleModal({ open: false, interview: null })}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} isLoading={processingId === rescheduleModal.interview?.id}>
            Send request
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default InterviewsPage
