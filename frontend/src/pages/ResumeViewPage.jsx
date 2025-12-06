import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import ResumeSummaryView from '../components/dashboard/ResumeSummaryView'
import { useAuth } from '../hooks/useAuth'

export default function ResumeViewPage() {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (resumeId) {
      fetchResumeData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId])

  const fetchResumeData = async () => {
    try {
      setLoading(true)
      setError('')

      // Try to fetch parsed resume data with job analysis and profile
      const response = await api.get(`/resume/${resumeId}/parsed`)
      
      if (response.data && response.data.parsed_resume) {
        setResume({
          resumeId: response.data.resumeId,
          parsed_resume: response.data.parsed_resume,
          metadata: response.data.metadata,
          parsed_data: response.data.parsed_data,
          job_analysis: response.data.job_analysis,
          profile: response.data.profile
        })
      } else {
        throw new Error('Resume data not found')
      }
    } catch (err) {
      console.error('Failed to fetch resume:', err)
      const message = err.response?.data?.message || 'Failed to load resume'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    // Navigate back based on user role
    if (user?.role === 'recruiter' || user?.role === 'admin') {
      navigate(-1) // Go back to previous page (likely JobApplicantsPage)
    } else {
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
          <p className="text-white/60 text-sm">Loading resume...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Resume</h3>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),transparent_55%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/80 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                {resume?.parsed_resume?.name || 'Resume Details'}
              </h1>
              <p className="text-white/60 mt-1">
                {user?.role === 'recruiter' || user?.role === 'admin' 
                  ? 'Candidate resume and analysis'
                  : 'Your resume details'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-4 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {resume && (
            <ResumeSummaryView 
              resume={resume}
              watsonSummary={resume.job_analysis?.watson_summary || null}
              skills={resume.profile?.customSkills || resume.parsed_resume?.skills || []}
            />
          )}
        </div>
      </div>
    </div>
  )
}
