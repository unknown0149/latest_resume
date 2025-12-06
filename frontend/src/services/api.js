import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds for resume processing (NER can take 30-45s)
  headers: {
    'Content-Type': 'application/json',
  },
})

const clearAuthState = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    return null
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    if (response.data?.success && response.data?.token) {
      localStorage.setItem('auth_token', response.data.token)
      return response.data.token
    }
  } catch (error) {
    console.error('❌ Token refresh failed:', error)
  }

  return null
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Simple 401 handler - just redirect to login without token refresh complexity
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true

      const newToken = await refreshAccessToken()

      if (newToken) {
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      }

      clearAuthState()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

// API functions
export const resumeAPI = {
  // Upload resume
  uploadResume: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Parse resume (Phase 2)
  parseResume: async (resumeId, mode = 'deep') => {
    const response = await api.post(`/resume/${resumeId}/parse`, { mode })
    return response.data
  },

  // Analyze role (Phase 2)
  analyzeRole: async (resumeId) => {
    console.log('🔍 API Call: analyzeRole', { resumeId, url: `/resume/${resumeId}/analyze-role` })
    try {
      const response = await api.post(`/resume/${resumeId}/analyze-role`)
      console.log('✅ analyzeRole response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ analyzeRole error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
      throw error
    }
  },

  // Get matching jobs (Phase 2)
  getMatchingJobs: async (resumeId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      minMatchScore: options.minMatchScore || 50,
      includeRemote: options.includeRemote !== false,
      generateAISummaries: options.generateAISummaries !== false,
      useEmbeddings: options.useEmbeddings || false, // Phase 3
    })
    const response = await api.get(`/jobs/match/${resumeId}?${params}`)
    return response.data
  },

  // Get semantic job matches (Phase 3)
  getSemanticMatches: async (resumeId, threshold = 0.70, limit = 20) => {
    const params = new URLSearchParams({ threshold, limit })
    const response = await api.get(`/jobs/semantic-match/${resumeId}?${params}`)
    return response.data
  },

  // Get job details
  getJobDetails: async (jobId, resumeId = null) => {
    const params = resumeId ? `?resumeId=${resumeId}` : ''
    const response = await api.get(`/jobs/${jobId}${params}`)
    return response.data
  },

  // Get similar jobs (Phase 3)
  getSimilarJobs: async (jobId, limit = 5) => {
    const params = new URLSearchParams({ limit })
    const response = await api.get(`/jobs/${jobId}/similar?${params}`)
    return response.data
  },

  // Track job interaction
  trackJobInteraction: async (jobId, resumeId, action) => {
    const response = await api.post(`/jobs/${jobId}/track`, { resumeId, action })
    return response.data
  },

  // Get saved jobs
  getSavedJobs: async (resumeId) => {
    const response = await api.get(`/jobs/saved/${resumeId}`)
    return response.data
  },

  // Get applied jobs
  getAppliedJobs: async (resumeId) => {
    const response = await api.get(`/jobs/applied/${resumeId}`)
    return response.data
  },

  // Generate embedding manually (Phase 3)
  generateEmbedding: async (resumeId) => {
    const response = await api.post(`/resume/${resumeId}/generate-embedding`)
    return response.data
  },

  // Predict job roles (legacy - for backward compatibility)
  predictRoles: async (resumeId) => {
    return resumeAPI.analyzeRole(resumeId)
  },

  // Get skill gaps (legacy)
  getSkillGaps: async (resumeId, roleId) => {
    const response = await api.post('/analysis/skill-gaps', { resumeId, roleId })
    return response.data
  },

  // Get career roadmap (legacy)
  getRoadmap: async (resumeId, roleId) => {
    const response = await api.post('/analysis/roadmap', { resumeId, roleId })
    return response.data
  },

  // Get learning resources (legacy)
  getResources: async (skills) => {
    const response = await api.post('/analysis/resources', { skills })
    return response.data
  },

  // Get salary boost suggestions (legacy)
  getSalaryBoost: async (resumeId, roleId) => {
    const response = await api.post('/analysis/salary-boost', { resumeId, roleId })
    return response.data
  },

  // Import jobs from JSON file (admin)
  importJobsJSON: async (filePath) => {
    const response = await api.post('/admin/import-jobs-json', { filePath })
    return response.data
  },

  // Import jobs from CSV file (admin)
  importJobsCSV: async (filePath) => {
    const response = await api.post('/admin/import-jobs-csv', { filePath })
    return response.data
  },

  // List jobs with filters and pagination
  listJobs: async (params = {}) => {
    const queryParams = new URLSearchParams(params)
    const response = await api.get(`/jobs/list?${queryParams}`)
    return response.data
  },

  // Generate MCQ questions for skill verification
  generateMCQQuestions: async (skill, count = 5) => {
    const response = await api.post('/resume/generate-mcq', { skill, count })
    return response.data
  },

  // Save skill verification result
  saveSkillVerification: async (resumeId, skill, score, correct, total) => {
    const response = await api.post(`/resume/${resumeId}/verify-skill`, {
      skill,
      score,
      correct,
      total,
      timestamp: new Date().toISOString()
    })
    return response.data
  },

  // Generate learning resources for skills
  generateResources: async (skills, limit = 10) => {
    const response = await api.post('/resume/generate-resources', { skills, limit })
    return response.data
  },
}

// Candidate applications & offers
export const applicationsAPI = {
  list: async (filters = {}) => {
    // Try new endpoint first, fallback to old
    try {
      const response = await api.get('/jobs/applications', { params: filters })
      return response.data
    } catch (error) {
      const response = await api.get('/applications', { params: filters })
      return response.data
    }
  },
  apply: async (jobId, payload) => {
    const response = await api.post(`/applications/apply/${jobId}`, payload)
    return response.data
  },
  details: async (applicationId) => {
    const response = await api.get(`/applications/${applicationId}`)
    return response.data
  },
  withdraw: async (applicationId, reason) => {
    const response = await api.put(`/applications/${applicationId}/withdraw`, { reason })
    return response.data
  },
  stats: async () => {
    // Try new endpoint first, fallback to old
    try {
      const response = await api.get('/jobs/applications', { params: { limit: 1 } })
      return { data: response.data?.stats || {} }
    } catch (error) {
      const response = await api.get('/applications/user/stats')
      return response.data
    }
  },
  getOffers: async () => {
    const response = await api.get('/applications/offers')
    return response.data
  },
  respondToOffer: async (applicationId, action, message) => {
    const response = await api.put(`/applications/${applicationId}/offer/respond`, { action, message })
    return response.data
  },
}

// Interview API functions
export const interviewAPI = {
  // Generate interview questions
  generateInterview: async (resumeId, skills, options = {}) => {
    const response = await api.post('/interview/generate', {
      resumeId,
      skills,
      ...options
    })
    return response.data
  },

  // Submit interview answers
  submitInterview: async (sessionId, answers) => {
    const response = await api.post('/interview/submit', {
      sessionId,
      answers
    })
    return response.data
  },

  // Get verification status
  getVerificationStatus: async (resumeId) => {
    const response = await api.get(`/interview/status/${resumeId}`)
    return response.data
  },

  // Generate job-specific interview
  generateJobInterview: async (resumeId, jobId, options = {}) => {
    const response = await api.post('/interview/job-apply', {
      resumeId,
      jobId,
      ...options
    })
    return response.data
  },

  // Candidate interview tracking
  getScheduledInterviews: async (params = {}) => {
    const response = await api.get('/interviews', { params })
    return response.data
  },
  getInterviewDetails: async (interviewId) => {
    const response = await api.get(`/interviews/${interviewId}`)
    return response.data
  },
  respondToInterview: async (interviewId, payload) => {
    const response = await api.put(`/interviews/${interviewId}/respond`, payload)
    return response.data
  }
}

// Recruiter API functions
export const recruiterAPI = {
  // Dashboard stats
  getDashboard: async (orgSlug) => {
    const response = await api.get(`/recruiter/${orgSlug}/dashboard`)
    return response.data
  },

  // Job management
  createJob: async (orgSlug, jobData) => {
    const response = await api.post(`/recruiter/${orgSlug}/jobs`, jobData)
    return response.data
  },
  getJobs: async (orgSlug, params = {}) => {
    const response = await api.get(`/recruiter/${orgSlug}/jobs`, { params })
    return response.data
  },
  getJob: async (orgSlug, jobId) => {
    const response = await api.get(`/recruiter/${orgSlug}/jobs/${jobId}`)
    return response.data
  },
  updateJob: async (orgSlug, jobId, jobData) => {
    const response = await api.put(`/recruiter/${orgSlug}/jobs/${jobId}`, jobData)
    return response.data
  },
  closeJob: async (orgSlug, jobId) => {
    const response = await api.delete(`/recruiter/${orgSlug}/jobs/${jobId}`)
    return response.data
  },
  cloneJob: async (orgSlug, jobId) => {
    const response = await api.post(`/recruiter/${orgSlug}/jobs/${jobId}/clone`)
    return response.data
  },

  // Application management
  getApplications: async (orgSlug, params = {}) => {
    const response = await api.get(`/recruiter/${orgSlug}/applications`, { params })
    return response.data
  },
  getApplication: async (orgSlug, applicationId) => {
    const response = await api.get(`/recruiter/${orgSlug}/applications/${applicationId}`)
    return response.data
  },
  updateApplicationStatus: async (orgSlug, applicationId, status, note) => {
    const response = await api.put(`/recruiter/${orgSlug}/applications/${applicationId}/status`, { status, note })
    return response.data
  },
  bulkUpdateStatus: async (orgSlug, applicationIds, status) => {
    const response = await api.post(`/recruiter/${orgSlug}/applications/bulk-status`, { applicationIds, status })
    return response.data
  },
  bulkReject: async (orgSlug, applicationIds, reason) => {
    const response = await api.post(`/recruiter/${orgSlug}/applications/bulk-reject`, { applicationIds, reason })
    return response.data
  },

  // Interview scheduling
  scheduleInterview: async (orgSlug, applicationId, interviewData) => {
    const response = await api.post(`/recruiter/${orgSlug}/applications/${applicationId}/interview`, interviewData)
    return response.data
  },

  // Offer management
  sendOffer: async (orgSlug, applicationId, offerData) => {
    const response = await api.post(`/recruiter/${orgSlug}/applications/${applicationId}/offer`, offerData)
    return response.data
  },

  // Notes
  addNote: async (orgSlug, applicationId, note) => {
    const response = await api.post(`/recruiter/${orgSlug}/applications/${applicationId}/notes`, { note })
    return response.data
  },

  // Candidate search
  searchCandidates: async (orgSlug, params = {}) => {
    const response = await api.get(`/recruiter/${orgSlug}/candidates/search`, { params })
    return response.data
  }
}

export default api
