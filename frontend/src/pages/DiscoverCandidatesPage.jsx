import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Star,
  Eye,
  Loader2,
  AlertCircle,
  Target,
  Award,
  Calendar,
  RefreshCcw
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import RecruiterNav from '../components/ui/RecruiterNav'

export default function DiscoverCandidatesPage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [experienceFilter, setExperienceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchCandidates()
  }, [page, searchTerm, skillFilter, experienceFilter])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (skillFilter) params.append('skills', skillFilter)
      if (experienceFilter !== 'all') params.append('experience', experienceFilter)

      const response = await api.get(`/recruiter/discover-candidates?${params.toString()}`)
      
      if (response.data.success) {
        setCandidates(response.data.candidates || [])
        setTotalPages(response.data.pagination?.pages || 1)
      } else {
        setError(response.data.message || 'Failed to load candidates')
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err)
      const errorMessage = err.response?.data?.message || 'Failed to load candidates'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSearchTerm('')
    setSkillFilter('')
    setExperienceFilter('all')
    setPage(1)
  }

  const formatSkills = (skills) => {
    if (!skills || !Array.isArray(skills)) return []
    return skills.slice(0, 5)
  }

  const getExperience = (resume) => {
    return resume?.parsed_resume?.years_experience || resume?.parsed_data?.years_of_experience || 0
  }

  const getCandidateName = (candidate) => {
    return candidate.userId?.name || 
           candidate.parsed_resume?.name || 
           candidate.parsed_resume?.full_name || 
           'Unnamed Candidate'
  }

  const getCandidateEmail = (candidate) => {
    return candidate.userId?.email || 
           candidate.parsed_resume?.emails?.[0] || 
           'No email'
  }

  const getCandidatePhone = (candidate) => {
    return candidate.userId?.phone || 
           candidate.parsed_resume?.phones?.[0] || 
           '—'
  }

  const getCandidateLocation = (candidate) => {
    return candidate.parsed_resume?.location || 
           candidate.userId?.location || 
           '—'
  }

  const handleViewResume = (candidate) => {
    const resumeId = candidate.resumeId || candidate._id
    if (resumeId) {
      navigate(`/resume/${resumeId}`)
    } else {
      toast.error('Resume ID not found')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <RecruiterNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-slate-500 text-sm mb-2">
            <Users className="w-4 h-4" />
            <span>Talent Discovery</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Discover Candidates</h1>
          <p className="mt-2 text-slate-600">
            Browse candidates who have made their profiles visible to recruiters
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, location, title..."
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
              <input
                type="text"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="e.g., React, Python"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Experience</label>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
              >
                <option value="all">All levels</option>
                <option value="0-2">0-2 years</option>
                <option value="3-5">3-5 years</option>
                <option value="6-10">6-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                <RefreshCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="rounded-2xl bg-white shadow-md border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Available Candidates</h2>
                <p className="text-sm text-slate-500">{candidates.length} candidates found</p>
              </div>
              <div className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
              <p className="text-slate-600">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">No candidates found</p>
              <p className="text-sm text-slate-500 mt-1">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {candidates.map((candidate) => {
                const name = getCandidateName(candidate)
                const email = getCandidateEmail(candidate)
                const phone = getCandidatePhone(candidate)
                const location = getCandidateLocation(candidate)
                const skills = formatSkills(candidate.parsed_resume?.skills || [])
                const experience = getExperience(candidate)
                const title = candidate.parsed_resume?.current_role || 
                             candidate.parsed_resume?.title || 
                             'Job Seeker'

                return (
                  <div key={candidate._id || candidate.resumeId} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-lg flex-shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                              <Briefcase className="w-4 h-4" />
                              {title}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {experience} years exp.
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {email}
                              </span>
                              {phone !== '—' && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {phone}
                                </span>
                              )}
                            </div>
                            
                            {skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {skills.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
                        <button
                          onClick={() => handleViewResume(candidate)}
                          className="flex-1 lg:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-semibold transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Profile
                        </button>
                        {candidate.privacy?.openToWork && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                            <Target className="w-3 h-3" />
                            Open to Work
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {candidates.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, candidates.length)} candidates
              </p>
              <div className="flex items-center gap-3">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className={`px-4 py-2 rounded-xl border font-semibold text-sm ${
                    page === 1
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className={`px-4 py-2 rounded-xl border font-semibold text-sm ${
                    page >= totalPages
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
