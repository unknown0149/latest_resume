import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, Star, Mail, Phone, MapPin, Award, Eye, UserCheck, Calendar, Gift, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import RecruiterNav from '../components/ui/RecruiterNav'

export default function JobApplicantsPage() {
  const { jobId } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [appliedCandidates, setAppliedCandidates] = useState([])
  const [suggestedCandidates, setSuggestedCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState('match')
  const [selectedCandidates, setSelectedCandidates] = useState(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [interviewData, setInterviewData] = useState({
    type: 'video',
    scheduledAt: '',
    duration: 60,
    meetingLink: '',
    location: '',
    notes: ''
  })

  useEffect(() => {
    fetchJobAndCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const fetchJobAndCandidates = async () => {
    try {
      setLoading(true)
      setError('')

      const jobResponse = await api.get(`/jobs/${jobId}`)
      const jobData = jobResponse.data.job || jobResponse.data.data?.job
      setJob(jobData)

      const candidatesResponse = await api.get(`/jobs/${jobId}/candidates`)
      if (candidatesResponse.data.success) {
        setAppliedCandidates(candidatesResponse.data.appliedCandidates || [])
        setSuggestedCandidates(candidatesResponse.data.suggestedCandidates || [])
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load job applicants'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const sortCandidates = (list) => {
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return (b.matchScore || 0) - (a.matchScore || 0)
        case 'date':
          return new Date(b.appliedAt || b.createdAt) - new Date(a.appliedAt || a.createdAt)
        case 'experience':
          return (b.resume?.parsed_resume?.years_experience || 0) - (a.resume?.parsed_resume?.years_experience || 0)
        default:
          return 0
      }
    })
  }

  const getMatchColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getMatchLabel = (score) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Strong Match'
    if (score >= 40) return 'Fair Match'
    return 'Low Match'
  }

  const handleSelectCandidate = async (candidate) => {
    try {
      await api.post(`/jobs/${jobId}/select-candidate`, {
        resumeId: candidate.resumeId,
        userId: candidate.userId
      })
      toast.success('Candidate shortlisted')
      await fetchJobAndCandidates()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to shortlist candidate'
      toast.error(message)
    }
  }

  const handleRejectCandidate = async (candidate) => {
    if (!window.confirm('Reject this candidate?')) return

    try {
      await api.post(`/jobs/${jobId}/reject-candidate`, {
        resumeId: candidate.resumeId,
        userId: candidate.userId
      })
      toast.success('Candidate rejected')
      await fetchJobAndCandidates()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reject candidate'
      toast.error(message)
    }
  }

  const openScheduleModal = (candidate) => {
    setSelectedCandidate(candidate)
    setShowScheduleModal(true)
  }

  const closeScheduleModal = () => {
    setShowScheduleModal(false)
    setSelectedCandidate(null)
    setInterviewData({
      type: 'video',
      scheduledAt: '',
      duration: 60,
      meetingLink: '',
      location: '',
      notes: ''
    })
  }

  const handleScheduleInterview = async (event) => {
    event.preventDefault()

    if (!selectedCandidate || !interviewData.scheduledAt) {
      toast.error('Select a candidate and time')
      return
    }

    try {
      await api.post(`/jobs/${jobId}/schedule-interview`, {
        resumeId: selectedCandidate.resumeId,
        userId: selectedCandidate.userId,
        interview: {
          ...interviewData,
          scheduledAt: new Date(interviewData.scheduledAt).toISOString()
        }
      })
      toast.success('Interview scheduled')
      await fetchJobAndCandidates()
      closeScheduleModal()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to schedule interview'
      toast.error(message)
    }
  }

  const handleExtendOffer = async (candidate) => {
    if (!window.confirm('Extend an offer to this candidate?')) return

    try {
      await api.post(`/jobs/${jobId}/extend-offer`, {
        resumeId: candidate.resumeId,
        userId: candidate.userId,
        offer: {
          extendedAt: new Date().toISOString()
        }
      })
      toast.success('Offer extended successfully!')
      await fetchJobAndCandidates()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to extend offer'
      toast.error(message)
    }
  }

  const toggleCandidateSelection = (candidateId) => {
    const newSelected = new Set(selectedCandidates)
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId)
    } else {
      newSelected.add(candidateId)
    }
    setSelectedCandidates(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedCandidates.size === appliedCandidates.length) {
      setSelectedCandidates(new Set())
    } else {
      const allIds = new Set(appliedCandidates.map(c => c.resumeId))
      setSelectedCandidates(allIds)
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedCandidates.size === 0) {
      toast.error('Please select candidates first')
      return
    }

    const selectedList = appliedCandidates.filter(c => selectedCandidates.has(c.resumeId))
    const confirmMessage = action === 'shortlist' 
      ? `Shortlist ${selectedCandidates.size} candidate(s)?`
      : `Reject ${selectedCandidates.size} candidate(s)?`

    if (!window.confirm(confirmMessage)) return

    setBulkActionLoading(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const candidate of selectedList) {
        try {
          if (action === 'shortlist') {
            await api.post(`/jobs/${jobId}/select-candidate`, {
              resumeId: candidate.resumeId,
              userId: candidate.userId
            })
          } else if (action === 'reject') {
            await api.post(`/jobs/${jobId}/reject-candidate`, {
              resumeId: candidate.resumeId,
              userId: candidate.userId
            })
          }
          successCount++
        } catch (err) {
          failCount++
          console.error(`Failed to ${action} candidate:`, err)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} candidate(s) ${action === 'shortlist' ? 'shortlisted' : 'rejected'} successfully`)
      }
      if (failCount > 0) {
        toast.error(`Failed to process ${failCount} candidate(s)`)
      }

      setSelectedCandidates(new Set())
      await fetchJobAndCandidates()
    } finally {
      setBulkActionLoading(false)
    }
  }

  const renderCandidateCard = (candidate) => {
    const cardKey = candidate.applicationId || candidate.resumeId
    const status = candidate.status || (candidate.source === 'suggested' ? 'suggested' : '')
    const isSelected = selectedCandidates.has(candidate.resumeId)

    const statusClasses = {
      shortlisted: 'bg-blue-100 text-blue-700',
      interview_scheduled: 'bg-purple-100 text-purple-700',
      rejected: 'bg-red-100 text-red-700',
      suggested: 'bg-amber-100 text-amber-700'
    }

    const statusLabels = {
      shortlisted: 'Shortlisted',
      interview_scheduled: 'Interview Scheduled',
      rejected: 'Rejected',
      suggested: 'Recommended'
    }

    return (
      <div key={cardKey} className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-4">
              {candidate.source === 'applied' && (
                <button
                  onClick={() => toggleCandidateSelection(candidate.resumeId)}
                  className="mt-1 focus:outline-none"
                >
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              )}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {candidate.resume?.parsed_resume?.name?.charAt(0)?.toUpperCase() || candidate.user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {candidate.resume?.parsed_resume?.name || candidate.user?.name || 'Anonymous Candidate'}
                </h3>
                {candidate.resume?.parsed_resume?.desired_job_title && (
                  <p className="text-gray-600 mt-1">{candidate.resume.parsed_resume.desired_job_title}</p>
                )}
                {candidate.source === 'suggested' && (
                  <p className="text-xs text-green-600 mt-1 inline-flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Open to recruiter contact
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${getMatchColor(candidate.matchScore || 0)}`}>
                    <Star className="w-4 h-4 fill-current" />
                    <span>{Math.round(candidate.matchScore || 0)}% Match</span>
                  </div>
                  <span className="text-sm text-gray-600">{getMatchLabel(candidate.matchScore || 0)}</span>
                </div>

                {candidate.matchingSkills?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Matching Skills ({candidate.matchingSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.matchingSkills.slice(0, 8).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                      {candidate.matchingSkills.length > 8 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{candidate.matchingSkills.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {candidate.missingSkills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Missing Skills ({candidate.missingSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {candidate.missingSkills.slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                          {skill}
                        </span>
                      ))}
                      {candidate.missingSkills.length > 5 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{candidate.missingSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                  {candidate.resume?.parsed_resume?.years_experience && (
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      <span>{candidate.resume.parsed_resume.years_experience} years experience</span>
                    </div>
                  )}
                  {/* Only show contact info for applied candidates or opted-in suggested candidates */}
                  {(candidate.source === 'applied' || (candidate.source === 'suggested' && candidate.resume?.privacy?.visibleToRecruiters)) && (
                    <>
                      {candidate.resume?.parsed_resume?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{candidate.resume.parsed_resume.email}</span>
                        </div>
                      )}
                      {candidate.resume?.parsed_resume?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{candidate.resume.parsed_resume.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                  {candidate.resume?.parsed_resume?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{candidate.resume.parsed_resume.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => navigate(`/resume/${candidate.resumeId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View Resume
            </button>
            <button
              onClick={() => handleSelectCandidate(candidate)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <UserCheck className="w-4 h-4" />
              Shortlist
            </button>
            <button
              onClick={() => openScheduleModal(candidate)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm"
            >
              <Calendar className="w-4 h-4" />
              Schedule Interview
            </button>
            <button
              onClick={() => handleExtendOffer(candidate)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm"
            >
              <Gift className="w-4 h-4" />
              Extend Offer
            </button>
            <button
              onClick={() => handleRejectCandidate(candidate)}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RecruiterNav />
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/recruiter/jobs')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Jobs
          </button>

          {job && (
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="mt-1 text-gray-600">{job.company?.name}</p>
              <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{appliedCandidates.length} applicant{appliedCandidates.length !== 1 ? 's' : ''}</span>
                </div>
                {job.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {job.location.isRemote
                        ? 'Remote'
                        : `${job.location.city || 'Location'}, ${job.location.state || job.location.country}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {appliedCandidates.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {selectedCandidates.size === appliedCandidates.length ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  {selectedCandidates.size === appliedCandidates.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedCandidates.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedCandidates.size} candidate(s) selected
                  </span>
                )}
              </div>
              {selectedCandidates.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkAction('shortlist')}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    <UserCheck className="w-4 h-4" />
                    Shortlist Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    Reject Selected
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">\n
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="match">Best Match</option>
                <option value="date">Most Recent</option>
                <option value="experience">Experience Level</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {appliedCandidates.length} applicants · {suggestedCandidates.length} suggested
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Applicants</h3>
            <p className="text-sm text-gray-600">People who have applied to this job</p>
          </div>
          <span className="text-sm text-gray-500">{appliedCandidates.length} total</span>
        </div>

        {appliedCandidates.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No applicants yet</h3>
            <p className="text-gray-600">Encourage applicants to apply or review the suggested matches below.</p>
          </div>
        ) : (
          <div className="space-y-4">{sortCandidates(appliedCandidates).map(renderCandidateCard)}</div>
        )}

        {suggestedCandidates.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Suggested best fits</h3>
                <p className="text-sm text-gray-600">High-match candidates who have opted-in to be visible to recruiters</p>
                <p className="text-xs text-green-600 mt-1">✓ These candidates have enabled recruiter visibility in their privacy settings</p>
              </div>
              <span className="text-sm text-gray-500">{suggestedCandidates.length} recommended</span>
            </div>
            <div className="space-y-4">
              {sortCandidates(suggestedCandidates).map((candidate) =>
                renderCandidateCard({ ...candidate, status: candidate.status || 'suggested' })
              )}
            </div>
          </div>
        )}
      </div>

      {showScheduleModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Schedule Interview</h2>
              <p className="text-gray-600 mt-1">
                {selectedCandidate.resume?.parsed_resume?.name || 'Candidate'}
              </p>
            </div>
            <form onSubmit={handleScheduleInterview} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type *</label>
                <select
                  value={interviewData.type}
                  onChange={(event) => setInterviewData({ ...interviewData, type: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="phone">Phone Interview</option>
                  <option value="video">Video Interview</option>
                  <option value="onsite">On-site Interview</option>
                  <option value="technical">Technical Interview</option>
                  <option value="hr">HR Interview</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={interviewData.scheduledAt}
                  onChange={(event) => setInterviewData({ ...interviewData, scheduledAt: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={interviewData.duration}
                  onChange={(event) =>
                    setInterviewData({ ...interviewData, duration: parseInt(event.target.value, 10) || 60 })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="15"
                  step="15"
                />
              </div>
              {(interviewData.type === 'video' || interviewData.type === 'technical') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link</label>
                  <input
                    type="url"
                    value={interviewData.meetingLink}
                    onChange={(event) => setInterviewData({ ...interviewData, meetingLink: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              )}
              {interviewData.type === 'onsite' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    value={interviewData.location}
                    onChange={(event) => setInterviewData({ ...interviewData, location: event.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interview Notes / Instructions</label>
                <textarea
                  value={interviewData.notes}
                  onChange={(event) => setInterviewData({ ...interviewData, notes: event.target.value })}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share any prep guidance or internal notes"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Schedule Interview
                </button>
                <button
                  type="button"
                  onClick={closeScheduleModal}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
